import type { Agent } from "@mastra/core/agent";
import { Contexto } from "../Contexto";

/**
 * Reduce un texto que no cabe en la ventana del modelo, encadenando fragmentos
 * con el resumen previo. Es interno del agente resumidor: lo usa su tool `resumir`.
 */
export class Compresor {
  /** Margen de tokens reservado a la instrucción y al resumen previo. */
  private static readonly RESERVA = 512;

  /** Ventana de contexto del modelo. */
  private readonly contexto = new Contexto();

  /**
   * @param agente Agente del resumidor, usado para comprimir cada fragmento.
   */
  constructor(private readonly agente: Agent) {}

  /**
   * Comprime el texto solo si excede el contexto; si cabe, lo devuelve igual.
   * @param texto Texto a comprimir.
   * @returns Texto original o el resumen acumulado del último fragmento.
   */
  async comprimir(texto: string): Promise<string> {
    const limite = await this.contexto.detectarLimite();
    if (Contexto.contarTokens(texto) < limite) return texto;
    const acarreo: string[] = [];
    for (const trozo of Contexto.dividir(texto, limite - Compresor.RESERVA)) {
      const previo = acarreo.length > 0 ? `Resumen previo: ${acarreo[acarreo.length - 1]}\n\n` : "";
      acarreo.push((await this.agente.generate(`${previo}Continúa el resumen con el siguiente fragmento:\n${trozo}`, { toolChoice: "none" })).text.trim());
    }
    return acarreo[acarreo.length - 1] ?? "";
  }
}
