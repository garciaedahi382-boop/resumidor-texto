import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Configuración persistida del proveedor y modelo de lenguaje.
 */
export interface ModelrConfig {
  /** Proveedor del modelo: `openrouter` u `openai`. */
  provider?: "openrouter" | "openai";
  /** URL base de la API del proveedor. */
  url?: string;
  /** API key del proveedor. */
  apiKey?: string;
  /** Identificador del modelo a usar. */
  model?: string;
}

/**
 * Lee y escribe la configuración en `~/.secti_addons/modelr.json`.
 */
export class ConfigStore {
  /** Directorio de configuración dentro del home del usuario. */
  private static readonly DIR = join(homedir(), ".secti_addons");
  /** Ruta del archivo de configuración. */
  private static readonly FILE = join(ConfigStore.DIR, "modelr.json");

  /**
   * Carga la configuración guardada.
   * @returns Configuración leída o un objeto vacío si el archivo no existe.
   */
  static load(): ModelrConfig {
    if (!existsSync(ConfigStore.FILE)) return {};
    return JSON.parse(readFileSync(ConfigStore.FILE, "utf8")) as ModelrConfig;
  }

  /**
   * Guarda la configuración, creando el directorio si hace falta.
   * @param config Configuración completa a persistir.
   */
  static save(config: ModelrConfig): void {
    if (!existsSync(ConfigStore.DIR)) mkdirSync(ConfigStore.DIR);
    writeFileSync(ConfigStore.FILE, JSON.stringify(config, null, 2));
  }
}
