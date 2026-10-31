import { validateSkillContent } from "@mastra/core/skills";
import { createTool } from "@mastra/core/tools";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

/**
 * Skills del usuario en `~/.koalacowork`, en formato Agent Skills de Mastra:
 * una carpeta por skill con su `SKILL.md` (frontmatter + instrucciones en Markdown).
 */
export class SkillsStore {
  /** Raíz de las skills, leída por el agente como contexto. */
  static readonly DIR = join(homedir(), ".koalacowork");

  /**
   * Guarda una skill validando el formato oficial antes de escribirla.
   * @param nombre Nombre único en minúsculas, números y guiones.
   * @param descripcion Cuándo y para qué usar la skill.
   * @param instrucciones Instrucciones en Markdown.
   * @returns Ruta del `SKILL.md` escrito.
   * @throws Error si el contenido no cumple la especificación de skills.
   */
  static escribir(nombre: string, descripcion: string, instrucciones: string): string {
    const contenido = `---\nname: ${nombre}\ndescription: ${JSON.stringify(descripcion)}\n---\n\n${instrucciones}\n`;
    const validacion = validateSkillContent({ content: contenido, directoryName: nombre });
    if (!validacion.valid) throw new Error(`Skill inválida: ${validacion.errors.join("; ")}`);
    const carpeta = join(SkillsStore.DIR, nombre);
    mkdirSync(carpeta, { recursive: true });
    const archivo = join(carpeta, "SKILL.md");
    writeFileSync(archivo, contenido);
    return archivo;
  }

  /**
   * Crea la herramienta que permite al agente escribir una skill.
   * @returns Herramienta `escribir_skill` con entrada `{ nombre, descripcion, instrucciones }`.
   */
  static herramienta() {
    return createTool({
      id: "escribir_skill",
      description: "Guarda una skill en ~/.koalacowork para regular cómo se resumen los textos",
      inputSchema: z.object({
        nombre: z.string().describe("Nombre único en minúsculas, números y guiones (ej. tono-formal)"),
        descripcion: z.string().describe("Cuándo y para qué debe usarse la skill"),
        instrucciones: z.string().describe("Instrucciones en Markdown que el resumidor aplicará"),
      }),
      execute: async (input) => ({ archivo: SkillsStore.escribir(input.nombre, input.descripcion, input.instrucciones) }),
    });
  }
}
