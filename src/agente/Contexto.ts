import axios from "axios";
import { ConfigStore } from "../config/ConfigStore";

/**
 * Ventana de contexto del modelo y utilidades de tamaño de texto.
 */
export class Contexto {
  /** Contexto asumido cuando no se puede consultar el modelo. */
  private static readonly DEFECTO = 8192;
  /** Contexto cacheado tras la primera consulta. */
  private limiteTokens = 0;

  /**
   * Estima los tokens de un texto.
   * @param texto Texto a medir.
   * @returns Tokens estimados (4 caracteres por token).
   */
  static tokens(texto: string): number {
    return Math.ceil(texto.length / 4);
  }

  /**
   * Divide un texto en trozos que caben en un presupuesto de tokens,
   * cortando por palabras y partiendo las palabras que exceden el presupuesto.
   * @param texto Texto a dividir.
   * @param presupuesto Tokens máximos por trozo.
   * @returns Trozos en orden de aparición.
   */
  static dividir(texto: string, presupuesto: number): string[] {
    const trozos: string[] = [];
    let actual = "";
    const empujar = (): void => {
      if (actual) trozos.push(actual);
      actual = "";
    };
    for (const palabra of texto.split(/\s+/)) {
      if (Contexto.tokens(palabra) > presupuesto) {
        empujar();
        const tamano = presupuesto * 4;
        for (let i = 0; i < palabra.length; i += tamano) trozos.push(palabra.slice(i, i + tamano));
        continue;
      }
      const candidato = actual ? `${actual} ${palabra}` : palabra;
      if (actual && Contexto.tokens(candidato) > presupuesto) {
        empujar();
        actual = palabra;
      } else {
        actual = candidato;
      }
    }
    empujar();
    return trozos;
  }

  /**
   * Consulta la ventana de contexto del modelo configurado en `/models` y la cachea.
   * @returns Tokens de contexto disponibles, o {@link Contexto.DEFECTO} si la consulta falla.
   */
  async limite(): Promise<number> {
    if (this.limiteTokens > 0) return this.limiteTokens;
    const cfg = ConfigStore.load();
    const base = cfg.provider === "openai" ? cfg.url! : "https://openrouter.ai/api/v1";
    try {
      const res = await axios.get(`${base.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });
      const info = (res.data.data ?? []).find((m: any) => m.id === cfg.model);
      this.limiteTokens = info?.top_provider?.context_length ?? info?.context_length ?? info?.max_model_len ?? Contexto.DEFECTO;
    } catch {
      this.limiteTokens = Contexto.DEFECTO;
    }
    return this.limiteTokens;
  }
}
