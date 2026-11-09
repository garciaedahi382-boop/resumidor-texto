import { validateSkillContent } from "@mastra/core/skills";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Skills del usuario en `~/.koalacowork`, en formato Agent Skills de Mastra:
 * una carpeta por skill con su `SKILL.md` (frontmatter + instrucciones en Markdown).
 * Las skills se leen como contexto para los agentes.
 */
export class SkillsStore {
  /** Raíz de las skills, leída por el agente como contexto. */
  static readonly DIR = join(homedir(), ".koalacowork");

  /**
   * Guarda una skill en formato oficial.
   * @param nombre Nombre único en minúsculas, números y guiones.
   * @param descripcion Cuándo y para qué usar la skill.
   * @param instrucciones Instrucciones en Markdown.
   * @returns Ruta del `SKILL.md` escrito.
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
   * Lista las skills del usuario.
   * @returns Nombres de skills disponibles.
   */
  static listar(): string[] {
    if (!existsSync(SkillsStore.DIR)) return [];
    return readdirSync(SkillsStore.DIR, { withFileTypes: true })
      .filter((entrada) => entrada.isDirectory())
      .map((entrada) => entrada.name);
  }

  /**
   * Lee las instrucciones de una skill.
   * @param nombre Nombre de la skill.
   * @returns Instrucciones Markdown de la skill.
   */
  static instrucciones(nombre: string): string | null {
    const archivo = join(SkillsStore.DIR, nombre, "SKILL.md");
    if (!existsSync(archivo)) return null;
    const contenido = readFileSync(archivo, "utf8");
    return contenido.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
  }
}
