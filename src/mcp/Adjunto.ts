import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Convierte un archivo generado en contenido MCP embebido en base64.
 */
export class Adjunto {
  /** Tipos MIME de los archivos generados, indexados por extensión. */
  private static readonly MIME: Record<string, string> = {
    png: "image/png",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  /**
   * Adjunta el archivo en base64: imagen para PNG y recurso para el resto.
   * @param archivo Ruta del archivo generado.
   * @returns Contenido MCP con el archivo embebido.
   */
  static de(archivo: string) {
    const extension = extname(archivo).slice(1);
    const mimeType = Adjunto.MIME[extension] ?? "application/octet-stream";
    const blob = readFileSync(archivo).toString("base64");
    if (extension === "png") return { type: "image" as const, data: blob, mimeType };
    return { type: "resource" as const, resource: { uri: pathToFileURL(archivo).href, mimeType, blob } };
  }
}
