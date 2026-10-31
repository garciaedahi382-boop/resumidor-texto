import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { DiagramRenderer } from "../diagramas/DiagramRenderer";
import { IshikawaRenderer } from "../diagramas/IshikawaRenderer";
import { VennRenderer } from "../diagramas/VennRenderer";
import { SinopticoRenderer } from "../diagramas/SinopticoRenderer";
import { MapaConceptualRenderer } from "../diagramas/MapaConceptualRenderer";
import { FlujoRenderer } from "../diagramas/FlujoRenderer";
import { ArbolRenderer } from "../diagramas/ArbolRenderer";
import { PertRenderer } from "../diagramas/PertRenderer";
import { GanttRenderer } from "../diagramas/GanttRenderer";
import { RadarRenderer } from "../diagramas/RadarRenderer";
import { MapaCalorRenderer } from "../diagramas/MapaCalorRenderer";
import { TendenciaRenderer } from "../diagramas/TendenciaRenderer";
import { ParetoRenderer } from "../diagramas/ParetoRenderer";
import { FlujoProcesoRenderer } from "../diagramas/FlujoProcesoRenderer";
import { ArbolDecisionRenderer } from "../diagramas/ArbolDecisionRenderer";
import { FlujoActualizacionRenderer } from "../diagramas/FlujoActualizacionRenderer";
import { SipocRenderer } from "../diagramas/SipocRenderer";
import { MapaFlujoValorRenderer } from "../diagramas/MapaFlujoValorRenderer";
import { TablaCambiosDocx } from "../documentos/TablaCambiosDocx";
import { SkillsStore } from "../skills/SkillsStore";

/**
 * Registro de diagramas, documentos y sus herramientas de render para los agentes.
 */
export class Herramientas {
  /** Renderizadores de diagramas disponibles indexados por tipo. */
  private static readonly renderers: Record<string, DiagramRenderer> = {
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
  };

  /** Documentos disponibles indexados por tipo. */
  private static readonly documentos: Record<string, TablaCambiosDocx> = {
    "tabla-cambios": new TablaCambiosDocx(),
  };

  /**
   * Lista los tipos de diagrama soportados.
   * @returns Nombres de tipo registrados.
   */
  static tipos(): string[] {
    return Object.keys(Herramientas.renderers);
  }

  /**
   * Lista los tipos de documento soportados.
   * @returns Nombres de tipo registrados.
   */
  static tiposDocumento(): string[] {
    return Object.keys(Herramientas.documentos);
  }

  /**
   * Obtiene el renderizador de un tipo de diagrama.
   * @param tipo Tipo de diagrama registrado.
   * @returns Instancia del renderizador.
   * @throws Error si el tipo no está soportado.
   */
  static renderer(tipo: string): DiagramRenderer {
    const renderer = Herramientas.renderers[tipo];
    if (!renderer) throw new Error(`Diagrama no soportado: ${tipo}`);
    return renderer;
  }

  /**
   * Obtiene el generador de un tipo de documento.
   * @param tipo Tipo de documento registrado.
   * @returns Instancia del documento.
   * @throws Error si el tipo no está soportado.
   */
  static documento(tipo: string): TablaCambiosDocx {
    const documento = Herramientas.documentos[tipo];
    if (!documento) throw new Error(`Documento no soportado: ${tipo}`);
    return documento;
  }

  /**
   * Ruta del archivo generado para un tipo de diagrama o documento.
   * @param tipo Tipo registrado en {@link Herramientas}.
   * @returns Ruta del archivo generado.
   * @throws Error si el tipo no está registrado.
   */
  static archivo(tipo: string): string {
    const entidad = Herramientas.renderers[tipo] ?? Herramientas.documentos[tipo];
    if (!entidad) throw new Error(`Tipo no soportado: ${tipo}`);
    return join(entidad.dir, `${tipo}.${entidad.extension}`);
  }

  /**
   * Crea la herramienta Mastra que renderiza un diagrama a PNG.
   * @returns Herramienta `renderizar_diagrama` con entrada `{ tipo, datos }`.
   */
  static renderizarDiagrama() {
    return createTool({
      id: "renderizar_diagrama",
      description: "Renderiza un diagrama a PNG a partir de sus datos JSON",
      inputSchema: z.object({
        tipo: z.string().describe(`Tipo de diagrama: ${Herramientas.tipos().join(", ")}`),
        datos: z.record(z.string(), z.any()).describe("Datos JSON del diagrama según su estructura"),
      }),
      execute: async (input) => {
        if (!SkillsStore.permite("diagrama", "renderizar_diagrama")) return { archivo: "", error: "Una skill vigente no permite generar diagramas" };
        const renderer = Herramientas.renderers[input.tipo];
        if (!renderer) return { archivo: "", error: `Tipo no soportado: ${input.tipo}` };
        const archivo = Herramientas.archivo(input.tipo);
        mkdirSync(dirname(archivo), { recursive: true });
        await renderer.render(archivo, input.datos);
        return { archivo };
      },
    });
  }

  /**
   * Crea la herramienta Mastra que genera un documento Word.
   * @returns Herramienta `renderizar_documento` con entrada `{ tipo, datos }`.
   */
  static renderizarDocumento() {
    return createTool({
      id: "renderizar_documento",
      description: "Genera un documento Word a partir de sus datos JSON",
      inputSchema: z.object({
        tipo: z.string().describe(`Tipo de documento: ${Herramientas.tiposDocumento().join(", ")}`),
        datos: z.record(z.string(), z.any()).describe("Datos JSON del documento según su estructura"),
      }),
      execute: async (input) => {
        if (!SkillsStore.permite("documento", "renderizar_documento")) return { archivo: "", error: "Una skill vigente no permite generar documentos" };
        const documento = Herramientas.documentos[input.tipo];
        if (!documento) return { archivo: "", error: `Tipo no soportado: ${input.tipo}` };
        const archivo = Herramientas.archivo(input.tipo);
        mkdirSync(dirname(archivo), { recursive: true });
        await documento.render(archivo, input.datos);
        return { archivo };
      },
    });
  }
}
