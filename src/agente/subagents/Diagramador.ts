import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { DiagramRenderer } from "../../diagramas/DiagramRenderer";
import { IshikawaRenderer } from "../../diagramas/IshikawaRenderer";
import { VennRenderer } from "../../diagramas/VennRenderer";
import { SinopticoRenderer } from "../../diagramas/SinopticoRenderer";
import { MapaConceptualRenderer } from "../../diagramas/MapaConceptualRenderer";
import { FlujoRenderer } from "../../diagramas/FlujoRenderer";
import { ArbolRenderer } from "../../diagramas/ArbolRenderer";
import { PertRenderer } from "../../diagramas/PertRenderer";
import { GanttRenderer } from "../../diagramas/GanttRenderer";
import { RadarRenderer } from "../../diagramas/RadarRenderer";
import { MapaCalorRenderer } from "../../diagramas/MapaCalorRenderer";
import { TendenciaRenderer } from "../../diagramas/TendenciaRenderer";
import { ParetoRenderer } from "../../diagramas/ParetoRenderer";
import { FlujoProcesoRenderer } from "../../diagramas/FlujoProcesoRenderer";
import { ArbolDecisionRenderer } from "../../diagramas/ArbolDecisionRenderer";
import { FlujoActualizacionRenderer } from "../../diagramas/FlujoActualizacionRenderer";
import { SipocRenderer } from "../../diagramas/SipocRenderer";
import { MapaFlujoValorRenderer } from "../../diagramas/MapaFlujoValorRenderer";
import { Archivos } from "../../utilerias/Archivos";
import { Registro } from "../../utilerias/Registro";
import type { Modelo } from "../ModeloLlm";

/**
 * Agente de diagramas: registra los tipos disponibles y genera el PNG
 * delegando en su herramienta `renderizar_diagrama`.
 */
export class Diagramador {
  /** Diagramas disponibles indexados por tipo. */
  static readonly RENDERERS = new Registro<DiagramRenderer>({
    ishikawa: new IshikawaRenderer(),
    venn: new VennRenderer(),
    "cuadro-sinoptico": new SinopticoRenderer(),
    "mapa-conceptual": new MapaConceptualRenderer(),
    flujo: new FlujoRenderer(),
    arbol: new ArbolRenderer(),
    pert: new PertRenderer(),
    gantt: new GanttRenderer(),
    radar: new RadarRenderer(),
    "mapa-calor": new MapaCalorRenderer(),
    tendencia: new TendenciaRenderer(),
    pareto: new ParetoRenderer(),
    "flujo-proceso": new FlujoProcesoRenderer(),
    "arbol-decision": new ArbolDecisionRenderer(),
    "flujo-actualizacion": new FlujoActualizacionRenderer(),
    sipoc: new SipocRenderer(),
    "mapa-flujo-valor": new MapaFlujoValorRenderer(),
  });

  /** Agente de Mastra que decide los datos del diagrama. */
  private readonly agente: Agent;

  /**
   * @param model Configuración de modelo resuelta por `ModeloLlm`.
   */
  constructor(model: Modelo) {
    this.agente = new Agent({
      id: "diagramador",
      name: "diagramador",
      instructions: 'Eres un generador de diagramas. Ante cada petición llama la herramienta renderizar_diagrama con los datos JSON del diagrama solicitado. Nunca respondas solo con texto.',
      model,
      tools: { renderizar_diagrama: Diagramador.renderizarDiagrama() },
    });
  }

  /** Agente subyacente, para registrarlo en `Mastra`. */
  get instancia(): Agent {
    return this.agente;
  }

  /**
   * Crea la herramienta Mastra que renderiza un diagrama a PNG.
   * @returns Herramienta `renderizar_diagrama` con entrada `{ tipo, datos }`.
   */
  private static renderizarDiagrama() {
    return createTool({
      id: "renderizar_diagrama",
      description: "Renderiza un diagrama a PNG a partir de sus datos JSON",
      inputSchema: z.object({
        tipo: z.string().describe(`Tipo de diagrama: ${Diagramador.RENDERERS.tipos.join(", ")}`),
        datos: z.record(z.string(), z.any()).describe("Datos JSON del diagrama según su estructura"),
      }),
      execute: async ({ tipo, datos }) => Archivos.escribir(Diagramador.RENDERERS, tipo, datos),
    });
  }

  /**
   * Genera el PNG de un tipo a partir de un texto.
   * @param tipo Tipo de diagrama registrado.
   * @param texto Texto del que el agente extrae los datos.
   * @returns Ruta del PNG generado.
   * @throws Error si el agente no escribió el archivo esperado.
   */
  async generar(tipo: string, texto: string): Promise<string> {
    const archivo = Archivos.preparar(Diagramador.RENDERERS.calcularRuta(tipo));
    await this.agente.generate(DiagramRenderer.prompt(Diagramador.RENDERERS.tomar(tipo), texto));
    Archivos.verificar(archivo, `El agente no generó el diagrama ${tipo}`);
    return archivo;
  }
}
