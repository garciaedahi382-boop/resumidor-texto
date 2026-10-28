import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { join } from "node:path";
import { DiagramRenderer } from "../diagramas/DiagramRenderer";
import { IshikawaRenderer } from "../diagramas/IshikawaRenderer";
import { VennRenderer } from "../diagramas/VennRenderer";
import { SinopticoRenderer } from "../diagramas/SinopticoRenderer";
import { MapaConceptualRenderer } from "../diagramas/MapaConceptualRenderer";
import { FlujoRenderer } from "../diagramas/FlujoRenderer";
import { ArbolRenderer } from "../diagramas/ArbolRenderer";
import { PertRenderer } from "../diagramas/PertRenderer";
import { GanttRenderer } from "../diagramas/GanttRenderer";

export class Herramientas {
  private static readonly renderers: Record<string, DiagramRenderer> = {
    ishikawa: new IshikawaRenderer(),
    venn: new VennRenderer(),
    "cuadro-sinoptico": new SinopticoRenderer(),
    "mapa-conceptual": new MapaConceptualRenderer(),
    flujo: new FlujoRenderer(),
    arbol: new ArbolRenderer(),
    pert: new PertRenderer(),
    gantt: new GanttRenderer(),
  };

  static tipos(): string[] {
    return Object.keys(Herramientas.renderers);
  }

  static renderer(tipo: string): DiagramRenderer {
    const renderer = Herramientas.renderers[tipo];
    if (!renderer) throw new Error(`Diagrama no soportado: ${tipo}`);
    return renderer;
  }

  static renderizarDiagrama(outDir: string) {
    return createTool({
      id: "renderizar_diagrama",
      description: "Renderiza un diagrama a PNG a partir de sus datos JSON",
      inputSchema: z.object({
        tipo: z.string().describe(`Tipo de diagrama: ${Herramientas.tipos().join(", ")}`),
        datos: z.record(z.string(), z.any()).describe("Datos JSON del diagrama según su estructura"),
      }),
      execute: async (input) => {
        const renderer = Herramientas.renderers[input.tipo];
        if (!renderer) return { archivo: "", error: `Tipo no soportado: ${input.tipo}` };
        const archivo = join(outDir, `${input.tipo}.png`);
        renderer.render(archivo, input.datos);
        return { archivo };
      },
    });
  }
}
