import { Agent } from "@mastra/core/agent";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DiagramRenderer } from "../diagramas/DiagramRenderer";
import { SkillsStore } from "../skills/SkillsStore";
import { Herramientas } from "./Herramientas";
import type { Modelo } from "./ModeloLlm";

/**
 * Genera un diagrama de cualquier tipo delegando en el agente y su herramienta de render.
 */
export class Diagramador {
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
      tools: { renderizar_diagrama: Herramientas.renderizarDiagrama() },
    });
  }

  /** Agente subyacente, para registrarlo en `Mastra`. */
  get instancia(): Agent {
    return this.agente;
  }

  /**
   * Arma el prompt del diagrama sumando los criterios que fijan las skills.
   * @param renderer Renderizador con tipo y esquema.
   * @param texto Texto del que se extraen los datos.
   * @returns Prompt para el agente.
   */
  private prompt(renderer: DiagramRenderer, texto: string): string {
    const base = DiagramRenderer.prompt(renderer, texto);
    const criterios = SkillsStore.considerar("diagrama");
    if (criterios.length === 0) return base;
    return `${base}\n\nTen en cuenta al construir el diagrama:\n${criterios.map((criterio) => `- ${criterio}`).join("\n")}`;
  }

  /**
   * Genera el archivo de un tipo (`diagramas/*.png` o `documentos/*.docx`) a partir de un texto.
   * @param tipo Tipo registrado en {@link Herramientas}.
   * @param texto Texto del que el agente extrae los datos.
   * @returns Ruta del archivo generado (PNG o DOCX).
   * @throws Error si el agente no escribió el archivo esperado.
   */
  async diagramar(tipo: string, texto: string): Promise<string> {
    const renderer = Herramientas.renderer(tipo);
    const archivo = Herramientas.archivo(tipo);
    mkdirSync(dirname(archivo), { recursive: true });
    await this.agente.generate(this.prompt(renderer, texto));
    if (!existsSync(archivo)) throw new Error(`El agente no generó el diagrama ${tipo}`);
    return archivo;
  }
}
