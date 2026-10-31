import { Agent } from "@mastra/core/agent";
import { Contexto } from "./Contexto";
import type { Modelo } from "./ModeloLlm";

/**
 * Genera los 4 niveles de resumen y fragmenta el texto si no cabe en el contexto.
 */
export class Resumidor {
  /** Margen de tokens reservado a la instrucción y al resumen previo al fragmentar. */
  private static readonly RESERVA = 512;

  /**
   * Cada nivel se genera desde el texto fuente con su propio objetivo de extensión,
   * así todos toman toda la información. Solo si el texto no cabe en el contexto
   * (se fragmentó), los niveles se derivan del resumen por fragmentos ya completo.
   */
  private static readonly EXTENSIONES = [
    "Resume el siguiente texto de forma detallada:",
    "Resume el siguiente texto conservando aproximadamente la mitad de su extensión:",
    "Resume el siguiente texto conservando aproximadamente la cuarta parte de su extensión:",
    "Sintetiza el siguiente texto en una sola oración:",
  ];

  /** Agente de Mastra que ejecuta las llamadas al modelo. */
  private readonly agente: Agent;
  /** Ventana de contexto del modelo configurado. */
  private readonly contexto = new Contexto();

  /**
   * @param model Configuración de modelo resuelta por `ModeloLlm`.
   */
  constructor(model: Modelo) {
    this.agente = new Agent({
      id: "resumidor",
      name: "resumidor",
      instructions: "Eres un resumidor de textos. Responde únicamente con el resumen del texto recibido, sin saludos, prefacios, despedidas ni explicaciones adicionales.",
      model,
    });
  }

  /** Agente subyacente, para registrarlo en `Mastra`. */
  get instancia(): Agent {
    return this.agente;
  }

  /**
   * Un solo nivel (1..4): una única llamada al modelo.
   * @param texto Texto a resumir.
   * @param nivel Nivel de resumen, entre 1 (detallado) y 4 (síntesis).
   * @returns Resumen del nivel pedido.
   * @throws Error si el nivel está fuera de 1..4.
   */
  async resumir(texto: string, nivel: number): Promise<string> {
    const instruccion = Resumidor.EXTENSIONES[nivel - 1];
    if (!instruccion) throw new Error("El nivel debe estar entre 1 y 4");
    return (await this.resumirCon([instruccion], texto))[0]!;
  }

  /**
   * Genera los 4 niveles de resumen en orden.
   * @param texto Texto a resumir.
   * @returns Tupla con los niveles 1 a 4.
   */
  async niveles(texto: string): Promise<[string, string, string, string]> {
    const niveles = await this.resumirCon(Resumidor.EXTENSIONES, texto);
    return [niveles[0]!, niveles[1]!, niveles[2]!, niveles[3]!];
  }

  /**
   * Aplica una instrucción por cada nivel sobre una única fuente.
   * @param instrucciones Instrucciones de resumen a ejecutar.
   * @param texto Texto original.
   * @returns Resúmenes en el mismo orden que las instrucciones.
   */
  private async resumirCon(instrucciones: string[], texto: string): Promise<string[]> {
    const limite = await this.contexto.limite();
    const fuente = Contexto.tokens(texto) < limite ? texto : await this.resumirTexto(texto);
    const salida: string[] = [];
    for (const instruccion of instrucciones) {
      salida.push((await this.agente.generate(`${instruccion}\n\n${fuente}`)).text.trim());
    }
    return salida;
  }

  /**
   * Resume un texto que excede el contexto, encadenando fragmentos con el resumen previo.
   * @param texto Texto original.
   * @returns Resumen acumulado del último fragmento.
   */
  private async resumirTexto(texto: string): Promise<string> {
    const limite = await this.contexto.limite();
    if (Contexto.tokens(texto) < limite) {
      return (await this.agente.generate(texto)).text.trim();
    }
    const acarreo: string[] = [];
    for (const trozo of Contexto.dividir(texto, limite - Resumidor.RESERVA)) {
      const previo = acarreo.length > 0 ? `Resumen previo: ${acarreo[acarreo.length - 1]}\n\n` : "";
      acarreo.push((await this.agente.generate(`${previo}Continúa el resumen con el siguiente fragmento:\n${trozo}`)).text.trim());
    }
    return acarreo[acarreo.length - 1] ?? "";
  }
}
