import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { Modelo } from "../ModeloLlm";
import { Compresor } from "./Compresor";

/**
 * Genera los 4 niveles de resumen a partir de un texto que ya cabe en el contexto.
 */
export class Resumidor {
  /**
   * Cada nivel se genera desde el texto fuente con su propio objetivo de extensión,
   * así todos toman toda la información.
   */
  private static readonly EXTENSIONES = [
    "Resume el siguiente texto de forma detallada:",
    "Resume el siguiente texto conservando aproximadamente la mitad de su extensión:",
    "Resume el siguiente texto conservando aproximadamente la cuarta parte de su extensión:",
    "Sintetiza el siguiente texto en una sola oración:",
  ];

  /** Agente de Mastra que ejecuta las llamadas al modelo. */
  private readonly agente: Agent;
  /** Compresor interno que ajusta el texto a la ventana del modelo. */
  private readonly compresor: Compresor;

  /**
   * @param model Configuración de modelo resuelta por `ModeloLlm`.
   */
  constructor(model: Modelo) {
    this.agente = new Agent({
      id: "resumidor",
      name: "resumidor",
      instructions: "Eres un resumidor de textos. Responde únicamente con el resumen del texto recibido, sin saludos, prefacios, despedidas ni explicaciones adicionales.",
      model,
      tools: { resumir: Resumidor.crearHerramienta(this) },
    });
    this.compresor = new Compresor(this.agente);
  }

  /** Agente subyacente, para registrarlo en `Mastra`. */
  get instancia(): Agent {
    return this.agente;
  }

  /**
   * Crea la herramienta Mastra que resume un texto en un nivel.
   * @param resumidor Instancia que ejecuta la llamada al modelo.
   * @returns Herramienta `resumir` con entrada `{ texto, nivel }`.
   */
  private static crearHerramienta(resumidor: Resumidor) {
    return createTool({
      id: "resumir",
      description: "Resume un texto en el nivel pedido (1 detallado, 2 medio, 3 breve, 4 síntesis) y devuelve el resumen.",
      inputSchema: z.object({
        texto: z.string().describe("Texto que se va a resumir"),
        nivel: z.number().int().min(1).max(4).optional().describe("Nivel de detalle, entre 1 y 4; por defecto 1"),
      }),
      execute: async ({ texto, nivel }) => ({ resumen: await resumidor.resumir(texto, nivel ?? 1) }),
    });
  }

  /**
   * Un solo nivel (1..4): comprime el texto y hace una única llamada al modelo.
   * @param texto Texto a resumir.
   * @param nivel Nivel de resumen, entre 1 (detallado) y 4 (síntesis).
   * @returns Resumen del nivel pedido.
   * @throws Error si el nivel está fuera de 1..4.
   */
  async resumir(texto: string, nivel: number): Promise<string> {
    return this.redactar(await this.compresor.comprimir(texto), nivel);
  }

  /**
   * Genera los 4 niveles de resumen en orden sobre la misma fuente comprimida.
   * @param texto Texto a resumir.
   * @returns Tupla con los niveles 1 a 4.
   */
  async resumirNiveles(texto: string): Promise<[string, string, string, string]> {
    const fuente = await this.compresor.comprimir(texto);
    const salida: string[] = [];
    for (const nivel of [1, 2, 3, 4]) salida.push(await this.redactar(fuente, nivel));
    return [salida[0]!, salida[1]!, salida[2]!, salida[3]!];
  }

  /**
   * Redacta un nivel a partir de un texto que ya cabe en el contexto.
   * @param texto Texto comprimido.
   * @param nivel Nivel de resumen, entre 1 y 4.
   * @returns Resumen del nivel pedido.
   * @throws Error si el nivel está fuera de 1..4.
   */
  private async redactar(texto: string, nivel: number): Promise<string> {
    const instruccion = Resumidor.EXTENSIONES[nivel - 1];
    if (!instruccion) throw new Error("El nivel debe estar entre 1 y 4");
    return (await this.agente.generate(`${instruccion}\n\n${texto}`, { toolChoice: "none" })).text.trim();
  }
}
