import type { ModelrConfig } from "../config/ConfigStore";

/**
 * Traduce la configuración persistida al modelo que consumen los agentes.
 */
export class ModeloLlm {
  /**
   * Construye la configuración de modelo para Mastra.
   * @param cfg Configuración del proveedor y modelo.
   * @returns Configuración del modelo para `openai` u `openrouter`.
   * @throws Error si falta configuración obligatoria del proveedor.
   */
  static configuracion(cfg: ModelrConfig) {
    if (cfg.provider === "openai") {
      if (!cfg.url || !cfg.apiKey || !cfg.model) {
        throw new Error('Configura el proveedor openai: config --provider openai --url <url> --key <apikey> --model <modelo>');
      }
      return { providerId: "openai", modelId: cfg.model, url: cfg.url, apiKey: cfg.apiKey, api: "chat" as const };
    }
    if (!cfg.apiKey) throw new Error("Falta la API key de OpenRouter (config --provider openrouter --key <apikey> o variable OPENROUTER_API_KEY)");
    return { providerId: "openrouter", modelId: cfg.model ?? "openai/gpt-4o-mini", url: "https://openrouter.ai/api/v1", apiKey: cfg.apiKey, api: "chat" as const };
  }
}

/**
 * Configuración de modelo producida por {@link ModeloLlm.configuracion}.
 */
export type Modelo = ReturnType<typeof ModeloLlm.configuracion>;
