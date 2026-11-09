import { Mastra } from "@mastra/core/mastra";
import { Agent } from "@mastra/core/agent";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { ConfigStore } from "../config/ConfigStore";
import { Contexto } from "./Contexto";
import { ModeloLlm, type Modelo } from "./ModeloLlm";
import { Diagramador } from "./subagents/Diagramador";
import { Documentador } from "./subagents/Documentador";
import { Resumidor } from "./subagents/Resumidor";

/** Entrada del workflow: texto fuente y si se generan diagramas y documentos. */
const EsquemaEntrada = z.object({ texto: z.string(), conDiagramas: z.boolean() });

/** Salida del workflow: los 4 niveles y los archivos generados. */
const EsquemaResumen = z.object({
  niveles: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  archivos: z.array(z.string()),
  conDiagramas: z.boolean(),
});

/**
 * Agente unificado de Koala Cowork: fachada única sobre los sub-agentes
 * (resumidor, diagramador, documentador), el agente de chat y el workflow
 * de resumen, registrados todos en una sola instancia de `Mastra`.
 */
export class KoalaAgente {
  /** Instancia única del agente unificado. */
  private static instancia: KoalaAgente | null = null;

  /** Ventana de contexto del modelo para recortar el historial de chat. */
  private readonly contexto = new Contexto();

  /** Instrucciones del chat: orquesta los subagentes y toma sus resultados. */
  private static readonly INSTRUCCIONES = [
    "Eres Koala Cowork, un asistente de análisis de textos dentro de una conversación continua.",
    "Orquestas a tus subagentes y tomas sus resultados: el resumidor resume textos; el diagramador genera un PNG del tipo que le pidas; el documentador genera un DOCX del tipo que le pidas.",
    `Tipos de diagrama disponibles: ${Diagramador.RENDERERS.tipos.join(", ")}. Tipos de documento disponibles: ${Documentador.DOCUMENTOS.tipos.join(", ")}.`,
    "Para un resumen, pídeselo al resumidor indicando el nivel (1 detallado, 2 medio, 3 breve, 4 síntesis); para un archivo, al diagramador o al documentador con el texto y el tipo.",
    "Si el usuario se refiere a texto o archivos anteriores de la conversación, úsalos directamente sin pedir que los repita.",
    "Responde en el idioma del usuario y sé directo.",
  ].join("\n");

  /** Agente responsable de los 4 niveles de resumen. */
  readonly resumidor: Resumidor;
  /** Agente responsable de los diagramas. */
  readonly diagramador: Diagramador;
  /** Agente responsable de los documentos. */
  readonly documentador: Documentador;

  /** Instancia de Mastra con todos los agentes y el workflow registrados. */
  readonly mastra: Mastra;
  /** Agente principal de Koala. */
  readonly agent: Agent;
  /** Tipos de diagrama soportados. */
  readonly tiposDiagrama = Diagramador.RENDERERS.tipos;
  /** Tipos de documento soportados. */
  readonly tiposDocumento = Documentador.DOCUMENTOS.tipos;

  private constructor(model: Modelo) {
    this.resumidor = new Resumidor(model);
    this.diagramador = new Diagramador(model);
    this.documentador = new Documentador(model);

    this.mastra = new Mastra({
      agents: {
        resumidor: this.resumidor.instancia,
        diagramador: this.diagramador.instancia,
        documentador: this.documentador.instancia,
        koala: new Agent({
          id: "koala",
          name: "Koala Cowork",
          instructions: KoalaAgente.INSTRUCCIONES,
          model,
          agents: {
            resumidor: this.resumidor.instancia,
            diagramador: this.diagramador.instancia,
            documentador: this.documentador.instancia,
          },
        }),
      },
      workflows: { "flujo-resumen": KoalaAgente.armarFlujo(this).commit() },
    });

    this.agent = this.mastra.getAgent("koala");
  }

  /**
   * Arma el workflow resumir -> diagramas -> documentos.
   * @param agente Fachada con los sub-agentes que ejecutan cada paso.
   * @returns Workflow sin confirmar.
   */
  private static armarFlujo(agente: KoalaAgente) {
    const nodoResumen = createStep({
      id: "resumir",
      inputSchema: EsquemaEntrada,
      outputSchema: EsquemaResumen,
      execute: async ({ inputData }) => ({ niveles: await agente.resumidor.resumirNiveles(inputData.texto), archivos: [], conDiagramas: inputData.conDiagramas }),
    });

    const paso = (id: string, generar: (tipo: string, texto: string) => Promise<string>) => (tipo: string) =>
      createStep({
        id: `${id}-${tipo}`,
        inputSchema: EsquemaResumen,
        outputSchema: EsquemaResumen,
        execute: async ({ inputData }) => {
          if (!inputData.conDiagramas) return inputData;
          const archivo = await generar(tipo, inputData.niveles[0]);
          return { niveles: inputData.niveles, archivos: [...inputData.archivos, archivo], conDiagramas: true };
        },
      });

    const nodos = [
      ...Diagramador.RENDERERS.tipos.map(paso("diagrama", (tipo, texto) => agente.diagramador.generar(tipo, texto))),
      ...Documentador.DOCUMENTOS.tipos.map(paso("documento", (tipo, texto) => agente.documentador.generar(tipo, texto))),
    ];

    let flujo = createWorkflow({
      id: "flujo-resumen",
      inputSchema: EsquemaEntrada,
      outputSchema: EsquemaResumen,
      steps: [nodoResumen, ...nodos],
    }).then(nodoResumen);
    for (const nodo of nodos) flujo = flujo.then(nodo);
    return flujo;
  }

  /**
   * Devuelve la instancia única del agente unificado.
   * @returns Instancia de KoalaAgente.
   */
  static getInstance(): KoalaAgente {
    if (!KoalaAgente.instancia) KoalaAgente.instancia = new KoalaAgente(ModeloLlm.resolver(ConfigStore.load()));
    return KoalaAgente.instancia;
  }

  /**
   * Responde la conversación con el historial recibido (recortado a la ventana de contexto).
   * @param mensajes Mensajes de la conversación en orden, con rol user/assistant.
   * @returns Respuesta del agente.
   */
  async responder(mensajes: { rol: "user" | "assistant"; contenido: string }[]): Promise<string> {
    const presupuesto = (await this.contexto.detectarLimite()) - 512;
    const lista = [...mensajes];
    while (lista.length > 1 && Contexto.contarTokens(lista.map((m) => m.contenido).join("\n")) > presupuesto) lista.shift();
    const salida = await this.agent.generate(
      lista.map((m) => (m.rol === "user" ? { role: "user" as const, content: m.contenido } : { role: "assistant" as const, content: m.contenido })),
    );
    return salida.text;
  }

  /**
   * Procesa el texto completo (resumen + diagramas + documentos) sin pasar por el LLM.
   * @param texto Texto a procesar.
   * @param conDiagramas Si es `true`, genera diagramas y documentos.
   * @returns Los 4 niveles y las rutas de los archivos generados.
   * @throws Error si el workflow falla o termina en un estado inesperado.
   */
  async procesar(texto: string, conDiagramas = true): Promise<{ niveles: [string, string, string, string]; archivos: string[] }> {
    const run = await this.mastra.getWorkflow("flujo-resumen").createRun();
    const resultado = await run.start({ inputData: { texto, conDiagramas } });
    if (resultado.status === "success") return resultado.result;
    if (resultado.status === "failed") throw new Error(`El flujo falló: ${resultado.error.message}`);
    throw new Error(`El flujo terminó con estado: ${resultado.status}`);
  }
}
