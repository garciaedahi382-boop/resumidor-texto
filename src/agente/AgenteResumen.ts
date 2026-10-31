import { Mastra } from "@mastra/core/mastra";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { ConfigStore } from "../config/ConfigStore";
import { Diagramador } from "./Diagramador";
import { Documentador } from "./Documentador";
import { ModeloLlm } from "./ModeloLlm";
import { Resumidor } from "./Resumidor";
import { Herramientas } from "./Herramientas";
import { SkillsStore } from "../skills/SkillsStore";
import type { Tarea } from "../skills/SkillsStore";

/** Entrada del workflow: texto fuente y si se generan diagramas y documentos. */
const EsquemaEntrada = z.object({ texto: z.string(), conDiagramas: z.boolean() });

/** Salida del workflow: los 4 niveles y los archivos generados. */
const EsquemaResumen = z.object({
  niveles: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  archivos: z.array(z.string()),
  conDiagramas: z.boolean(),
});

/**
 * Fachada singleton que orquesta el workflow resumir -> diagramar -> documentar.
 */
export class AgenteResumen {
  /** Instancia única de la fachada. */
  private static instancia: AgenteResumen | null = null;

  /** Registro de agentes y workflows de Mastra. */
  private readonly mastra: Mastra;
  /** Agente responsable de los 4 niveles de resumen. */
  private readonly resumidor: Resumidor;
  /** Agente responsable de los diagramas. */
  private readonly diagramador: Diagramador;
  /** Agente responsable de los documentos. */
  private readonly documentador: Documentador;

  private constructor() {
    const model = ModeloLlm.configuracion(ConfigStore.load());
    this.resumidor = new Resumidor(model);
    this.diagramador = new Diagramador(model);
    this.documentador = new Documentador(model);

    const nodoResumen = createStep({
      id: "resumir",
      inputSchema: EsquemaEntrada,
      outputSchema: EsquemaResumen,
      execute: async ({ inputData }) => ({ niveles: await this.resumidor.niveles(inputData.texto), archivos: [], conDiagramas: inputData.conDiagramas }),
    });

    const nodosDiagrama = Herramientas.tipos().map((tipo) =>
      createStep({
        id: `diagrama-${tipo}`,
        inputSchema: EsquemaResumen,
        outputSchema: EsquemaResumen,
        execute: async ({ inputData }) => {
          if (!inputData.conDiagramas || !SkillsStore.permite("diagrama", "renderizar_diagrama")) return { niveles: inputData.niveles, archivos: inputData.archivos, conDiagramas: inputData.conDiagramas };
          const archivo = await this.diagramador.diagramar(tipo, this.fuente(inputData.niveles, "diagrama"));
          return { niveles: inputData.niveles, archivos: [...inputData.archivos, archivo], conDiagramas: true };
        },
      }),
    );

    const nodosDocumento = Herramientas.tiposDocumento().map((tipo) =>
      createStep({
        id: `documento-${tipo}`,
        inputSchema: EsquemaResumen,
        outputSchema: EsquemaResumen,
        execute: async ({ inputData }) => {
          if (!inputData.conDiagramas || !SkillsStore.permite("documento", "renderizar_documento")) return { niveles: inputData.niveles, archivos: inputData.archivos, conDiagramas: inputData.conDiagramas };
          const archivo = await this.documentador.documentar(tipo, this.fuente(inputData.niveles, "documento"));
          return { niveles: inputData.niveles, archivos: [...inputData.archivos, archivo], conDiagramas: true };
        },
      }),
    );

    const nodos = [...nodosDiagrama, ...nodosDocumento];
    let flujo = createWorkflow({
      id: "flujo-resumen",
      inputSchema: EsquemaEntrada,
      outputSchema: EsquemaResumen,
      steps: [nodoResumen, ...nodos],
    }).then(nodoResumen);
    for (const nodo of nodos) flujo = flujo.then(nodo);

    this.mastra = new Mastra({
      agents: { resumidor: this.resumidor.instancia, diagramador: this.diagramador.instancia, documentador: this.documentador.instancia },
      workflows: { "flujo-resumen": flujo.commit() },
    });
  }

  /**
   * Devuelve la instancia única, creándola en la primera llamada.
   * @returns Fachada configurada.
   */
  static getInstance(): AgenteResumen {
    if (!AgenteResumen.instancia) AgenteResumen.instancia = new AgenteResumen();
    return AgenteResumen.instancia;
  }

  /**
   * Ejecuta el workflow completo de resumen, diagramas y documentos.
   * @param texto Texto fuente a procesar.
   * @param conDiagramas Si es `true`, genera todos los diagramas y documentos con el nivel que fijen las skills.
   * @returns Los 4 niveles y las rutas de los archivos generados.
   * @throws Error si el workflow falla o termina en un estado inesperado.
   */
  async ejecutar(texto: string, conDiagramas = true): Promise<{ niveles: [string, string, string, string]; archivos: string[] }> {
    const run = await this.mastra.getWorkflow("flujo-resumen").createRun();
    const resultado = await run.start({ inputData: { texto, conDiagramas } });
    if (resultado.status === "success") return resultado.result;
    if (resultado.status === "failed") throw new Error(`El flujo falló: ${resultado.error.message}`);
    throw new Error(`El flujo terminó con estado: ${resultado.status}`);
  }

  /**
   * Texto de origen de una tarea según el nivel fijado por las skills.
   * @param niveles Los 4 niveles de resumen.
   * @param tarea Tarea que consume el texto.
   * @returns Nivel de resumen correspondiente (nivel 1 si ninguna skill lo fija).
   */
  private fuente(niveles: [string, string, string, string], tarea: Tarea): string {
    const nivel = SkillsStore.nivel(tarea) ?? 1;
    return niveles[nivel - 1] ?? niveles[0];
  }

  /**
   * Genera un único nivel de resumen sin pasar por el workflow.
   * @param texto Texto a resumir.
   * @param nivel Nivel de resumen, entre 1 y 4; si se omite se usa el de las skills.
   * @returns Resumen del nivel pedido.
   */
  resumir(texto: string, nivel?: number): Promise<string> {
    return this.resumidor.resumir(texto, nivel ?? SkillsStore.nivel("resumen") ?? 1);
  }

  /**
   * Genera un diagrama de un tipo a partir de un texto, sin pasar por el workflow.
   * @param tipo Tipo de diagrama registrado en {@link Herramientas}.
   * @param texto Texto del que se extraen los datos.
   * @returns Ruta del PNG generado.
   */
  diagramar(tipo: string, texto: string): Promise<string> {
    return this.diagramador.diagramar(tipo, texto);
  }

  /**
   * Genera un documento de un tipo a partir de un texto, sin pasar por el workflow.
   * @param tipo Tipo de documento registrado en {@link Herramientas}.
   * @param texto Texto del que se extraen los datos.
   * @returns Ruta del documento generado.
   */
  documentar(tipo: string, texto: string): Promise<string> {
    return this.documentador.documentar(tipo, texto);
  }
}
