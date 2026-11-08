import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ModelrConfig } from "./ConfigStore";

/**
 * Configuración de un proveedor guardada por Oselotl Cowork.
 */
export interface ProveedorOselotl {
  /** API key del proveedor. */
  apiKey?: string;
  /** Modelo a usar. */
  model?: string;
  /** URL base del proveedor. */
  baseUrl?: string;
}

/**
 * Lee la configuración de modelos que guarda Oselotl Cowork en `~/.oselotl/providers.json`
 * y la traduce al formato que consume el resumidor.
 */
export class OselotlConfig {
  /** Carpeta de configuración de Oselotl Cowork. */
  private static readonly DIR = join(homedir(), ".oselotl");
  /** Archivo con la configuración por proveedor. */
  private static readonly FILE = join(OselotlConfig.DIR, "providers.json");

  /**
   * Resuelve la configuración del primer proveedor con API key y modelo definidos.
   * @returns Configuración traducida, o `null` si Oselotl Cowork no tiene configuración guardada.
   */
  static resolver(): ModelrConfig | null {
    if (!existsSync(OselotlConfig.FILE)) return null;
    let archivo: Record<string, ProveedorOselotl>;
    try {
      archivo = JSON.parse(readFileSync(OselotlConfig.FILE, "utf8")) as Record<string, ProveedorOselotl>;
    } catch {
      return null;
    }
    const slug = Object.keys(archivo).find((s) => archivo[s]?.apiKey && archivo[s]?.model);
    const proveedor = slug ? archivo[slug] : undefined;
    if (!proveedor?.apiKey || !proveedor?.model) return null;
    return {
      provider: "openai",
      url: proveedor.baseUrl,
      apiKey: proveedor.apiKey,
      model: proveedor.model,
    };
  }
}
