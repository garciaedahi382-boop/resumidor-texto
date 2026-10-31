import { validateSkillContent } from "@mastra/core/skills";
import { createTool } from "@mastra/core/tools";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

/** Tarea del flujo que una skill puede regular. */
export type Tarea = "resumen" | "diagrama" | "documento" | "infografia" | "presentacion" | "todas";

/** Campos de regulación que declara una skill. */
export type CampoRegulado = "herramientas" | "nivel" | "considerar" | "diseno";

/** Política declarada por una skill para una tarea. */
export interface PoliticaSkill {
  /** Nombre de la skill que declara la política. */
  nombre: string;
  /** Tarea a la que aplica. */
  tarea: Tarea;
  /** Herramientas permitidas para esa tarea; si se omite no restringe. */
  herramientas?: string[];
  /** Nivel de resumen que debe usarse en esa tarea (1 detallado a 4 síntesis). */
  nivel?: number;
  /** Qué debe tomarse en cuenta al generar los diagramas o el contenido de esa tarea. */
  considerar?: string;
  /** Diseño del catálogo que debe usarse en la infografía o presentación de esa tarea. */
  diseno?: string;
}

/** Regulación que se guarda junto a la skill. */
export interface PoliticaOpcional {
  /** Tarea que regula la skill. */
  tarea?: Tarea;
  /** Herramientas permitidas; si se omite no restringe. */
  herramientas?: string[];
  /** Nivel de resumen a usar en esa tarea (1 a 4). */
  nivel?: number;
  /** Qué debe tenerse en cuenta al construir los diagramas o el contenido. */
  considerar?: string;
  /** Diseño del catálogo a usar en la infografía o presentación de esa tarea. */
  diseno?: string;
}

/**
 * Skills del usuario en `~/.koalacowork`, en formato Agent Skills de Mastra:
 * una carpeta por skill con su `SKILL.md` (frontmatter + instrucciones en Markdown).
 * El frontmatter regula qué herramientas, nivel y criterios usa cada tarea.
 */
export class SkillsStore {
  /** Raíz de las skills, leída por el agente como contexto. */
  static readonly DIR = join(homedir(), ".koalacowork");
  /** Campos que una sola skill puede regular por tarea. */
  private static readonly CAMPOS: CampoRegulado[] = ["herramientas", "nivel", "considerar", "diseno"];

  /**
   * Guarda una skill validando el formato oficial y que no pise la regulación de otra.
   * @param nombre Nombre único en minúsculas, números y guiones.
   * @param descripcion Cuándo y para qué usar la skill.
   * @param instrucciones Instrucciones en Markdown.
   * @param politica Tarea, herramientas, nivel y criterios (opcional).
   * @returns Ruta del `SKILL.md` escrito.
   * @throws Error si el contenido no cumple la especificación o si la regulación se solapa.
   */
  static escribir(nombre: string, descripcion: string, instrucciones: string, politica: PoliticaOpcional = {}): string {
    SkillsStore.validarPolitica(nombre, politica);
    const contenido = `---\n${SkillsStore.frontmatter(nombre, descripcion, politica)}\n---\n\n${instrucciones}\n`;
    const validacion = validateSkillContent({ content: contenido, directoryName: nombre });
    if (!validacion.valid) throw new Error(`Skill inválida: ${validacion.errors.join("; ")}`);
    const carpeta = join(SkillsStore.DIR, nombre);
    mkdirSync(carpeta, { recursive: true });
    const archivo = join(carpeta, "SKILL.md");
    writeFileSync(archivo, contenido);
    return archivo;
  }

  /**
   * Indica si una herramienta está permitida para una tarea según las skills.
   * Sin skills que restrinjan la tarea, la herramienta queda permitida.
   * @param tarea Tarea del flujo.
   * @param herramienta Nombre de la herramienta a comprobar.
   * @returns `true` si todas las skills que restringen la tarea la permiten.
   */
  static permite(tarea: Tarea, herramienta: string): boolean {
    const restrictivas = SkillsStore.porTarea(tarea)
      .map((politica) => politica.herramientas)
      .filter((herramientas): herramientas is string[] => herramientas !== undefined);
    if (restrictivas.length === 0) return true;
    return restrictivas.every((herramientas) => herramientas.includes(herramienta));
  }

  /**
   * Nivel de resumen que las skills fijan para una tarea.
   * @param tarea Tarea del flujo.
   * @returns Nivel entre 1 y 4, o `undefined` si ninguna skill lo fija.
   */
  static nivel(tarea: Tarea): number | undefined {
    return SkillsStore.porTarea(tarea).find((politica) => politica.nivel !== undefined)?.nivel;
  }

  /**
   * Diseño del catálogo que las skills fijan para una tarea.
   * @param tarea Tarea del flujo.
   * @returns Nombre del diseño, o `undefined` si ninguna skill lo fija.
   */
  static diseno(tarea: Tarea): string | undefined {
    return SkillsStore.porTarea(tarea).find((politica) => politica.diseno !== undefined)?.diseno;
  }

  /**
   * Criterios que las skills piden tener en cuenta al generar diagramas o contenido.
   * @param tarea Tarea del flujo.
   * @returns Textos de criterios aplicables.
   */
  static considerar(tarea: Tarea): string[] {
    return SkillsStore.porTarea(tarea)
      .map((politica) => politica.considerar)
      .filter((criterio): criterio is string => criterio !== undefined);
  }

  /**
   * Lee las políticas declaradas en las skills guardadas.
   * @returns Políticas encontradas en los frontmatter.
   */
  static politicas(): PoliticaSkill[] {
    if (!existsSync(SkillsStore.DIR)) return [];
    return readdirSync(SkillsStore.DIR, { withFileTypes: true })
      .filter((entrada) => entrada.isDirectory())
      .map((entrada) => join(SkillsStore.DIR, entrada.name, "SKILL.md"))
      .filter((archivo) => existsSync(archivo))
      .map((archivo) => SkillsStore.politica(readFileSync(archivo, "utf8")))
      .filter((politica): politica is PoliticaSkill => politica !== null);
  }

  /**
   * Crea la herramienta que permite al agente escribir una skill.
   * @returns Herramienta `escribir_skill` con la regulación por tarea.
   */
  static herramienta() {
    return createTool({
      id: "escribir_skill",
      description: "Guarda una skill en ~/.koalacowork para regular cómo se resumen los textos, qué herramientas, nivel y diseño usa cada tarea y qué considerar al diagramar o armar el contenido",
      inputSchema: z.object({
        nombre: z.string().describe("Nombre único en minúsculas, números y guiones (ej. tono-formal)"),
        descripcion: z.string().describe("Cuándo y para qué debe usarse la skill"),
        instrucciones: z.string().describe("Instrucciones en Markdown que el resumidor aplicará"),
        tarea: z.enum(["resumen", "diagrama", "documento", "infografia", "presentacion", "todas"]).optional().describe("Tarea que regula la skill"),
        herramientas: z.array(z.string()).optional().describe("Herramientas permitidas para esa tarea; vacío significa ninguna"),
        nivel: z.number().int().min(1).max(4).optional().describe("Nivel de resumen a usar en esa tarea (1 detallado, 4 síntesis)"),
        considerar: z.string().optional().describe("Qué debe tenerse en cuenta al construir los diagramas o el contenido de esa tarea"),
        diseno: z.string().optional().describe("Diseño del catálogo que debe usarse en la infografía o presentación de esa tarea"),
      }),
      execute: async (input) => {
        if (!SkillsStore.permite("resumen", "escribir_skill")) {
          return { archivo: "", error: "Una skill vigente no permite escribir nuevas skills en la tarea resumen" };
        }
        const politica = { tarea: input.tarea, herramientas: input.herramientas, nivel: input.nivel, considerar: input.considerar, diseno: input.diseno };
        try {
          return { archivo: SkillsStore.escribir(input.nombre, input.descripcion, input.instrucciones, politica) };
        } catch (error) {
          return { archivo: "", error: error instanceof Error ? error.message : String(error) };
        }
      },
    });
  }

  /**
   * Filtra las políticas que aplican a una tarea (incluidas las de `todas`).
   * @param tarea Tarea del flujo.
   * @returns Políticas aplicables.
   */
  private static porTarea(tarea: Tarea): PoliticaSkill[] {
    return SkillsStore.politicas().filter((politica) => politica.tarea === tarea || politica.tarea === "todas");
  }

  /**
   * Verifica que la regulación pedida no se solape con la de otra skill.
   * @param nombre Nombre de la skill que se guarda.
   * @param politica Regulación que se quiere declarar.
   * @throws Error si se regula un campo sin tarea o si otra skill ya lo regula.
   */
  private static validarPolitica(nombre: string, politica: PoliticaOpcional): void {
    const campos = SkillsStore.CAMPOS.filter((campo) => politica[campo] !== undefined);
    if (campos.length === 0) return;
    if (!politica.tarea) throw new Error(`La skill "${nombre}" regula ${campos.join(", ")} pero no declara tarea`);
    const otras = SkillsStore.politicas().filter((existente) => existente.nombre !== nombre);
    for (const campo of SkillsStore.CAMPOS) {
      if (politica[campo] === undefined) continue;
      const choque = otras.find((existente) => existente[campo] !== undefined && SkillsStore.aplicanJuntas(existente.tarea, politica.tarea!));
      if (choque) {
        throw new Error(`La skill "${choque.nombre}" ya regula "${campo}" para la tarea ${choque.tarea}; edita esa skill en lugar de crear otra`);
      }
    }
  }

  /**
   * Indica si dos tareas comparten regulación.
   * @param una Primera tarea.
   * @param otra Segunda tarea.
   * @returns `true` si son la misma tarea o alguna es `todas`.
   */
  private static aplicanJuntas(una: Tarea, otra: Tarea): boolean {
    return una === otra || una === "todas" || otra === "todas";
  }

  /**
   * Arma el frontmatter YAML de una skill.
   * @param nombre Nombre de la skill.
   * @param descripcion Descripción de uso.
   * @param politica Tarea, herramientas, nivel y criterios.
   * @returns Líneas del frontmatter.
   */
  private static frontmatter(nombre: string, descripcion: string, politica: PoliticaOpcional): string {
    const lineas = [`name: ${nombre}`, `description: ${JSON.stringify(descripcion)}`];
    if (politica.tarea) lineas.push(`tarea: ${politica.tarea}`);
    if (politica.herramientas) lineas.push(`herramientas: [${politica.herramientas.join(", ")}]`);
    if (politica.nivel) lineas.push(`nivel: ${politica.nivel}`);
    if (politica.considerar) lineas.push(`considerar: ${JSON.stringify(politica.considerar)}`);
    if (politica.diseno) lineas.push(`diseno: ${politica.diseno}`);
    return lineas.join("\n");
  }

  /**
   * Extrae la política de un `SKILL.md` a partir de su frontmatter.
   * @param contenido Contenido completo del archivo.
   * @returns Política encontrada o `null` si la skill no declara regulación.
   */
  private static politica(contenido: string): PoliticaSkill | null {
    const bloque = contenido.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    if (!bloque) return null;
    const nombre = bloque.match(/^name:\s*(\S+)\s*$/m)?.[1];
    const tarea = bloque.match(/^tarea:\s*(\S+)\s*$/m)?.[1] as Tarea | undefined;
    if (!nombre || !tarea) return null;
    const lista = bloque.match(/^herramientas:\s*\[(.*)\]\s*$/m)?.[1];
    const nivel = Number(bloque.match(/^nivel:\s*(\d+)\s*$/m)?.[1]);
    const considerar = bloque.match(/^considerar:\s*(.+)\s*$/m)?.[1];
    const diseno = bloque.match(/^diseno:\s*(\S+)\s*$/m)?.[1];
    return {
      nombre,
      tarea,
      herramientas: lista === undefined ? undefined : SkillsStore.lista(lista),
      nivel: Number.isInteger(nivel) && nivel >= 1 && nivel <= 4 ? nivel : undefined,
      considerar: considerar === undefined ? undefined : SkillsStore.texto(considerar),
      diseno,
    };
  }

  /**
   * Convierte una lista YAML en línea (`[a, b]`) en un arreglo de nombres.
   * @param lista Contenido entre corchetes.
   * @returns Nombres de herramientas.
   */
  private static lista(lista: string): string[] {
    return lista
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter((item) => item.length > 0);
  }

  /**
   * Interpreta un texto YAML en línea, admitiendo comillas dobles o texto plano.
   * @param valor Valor tal como aparece en el frontmatter.
   * @returns Texto sin comillas.
   */
  private static texto(valor: string): string {
    try {
      const parseado = JSON.parse(valor);
      return typeof parseado === "string" ? parseado : valor;
    } catch {
      return valor.replace(/^["']|["']$/g, "");
    }
  }
}
