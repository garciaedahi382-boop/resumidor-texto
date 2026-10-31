import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EntradaBuilder } from "./EntradaBuilder";

/** Pieza de contenido que se entrega. */
export type Pieza = "infografia" | "presentacion";

/**
 * Entrega la entrada de contenido: escribe el JSON y produce la pieza en HTML.
 */
export class Contenido {
  /** Directorio de salida de las piezas. */
  static readonly dir = "contenido";
  /** Piezas de contenido disponibles. */
  static readonly piezas: Pieza[] = ["infografia", "presentacion"];

  /**
   * Ejecutable que procesa la entrada; se puede fijar con `CONTENIDO_BIN`.
   * @returns Comando a ejecutar.
   */
  private static get bin(): string {
    return process.env.CONTENIDO_BIN ?? "maquetador_contenido";
  }

  /**
   * Ruta del HTML que produce una pieza.
   * @param pieza Pieza solicitada.
   * @returns Ruta del archivo HTML.
   */
  static archivo(pieza: Pieza): string {
    return join(Contenido.dir, `${pieza}.html`);
  }

  /**
   * Ruta del JSON de entrada de una pieza.
   * @param pieza Pieza solicitada.
   * @returns Ruta del archivo JSON.
   */
  static entrada(pieza: Pieza): string {
    return join(Contenido.dir, `${pieza}.json`);
  }

  /**
   * Entrega una pieza a partir de la entrada y devuelve el HTML generado.
   * @param pieza Pieza solicitada.
   * @param diseno Nombre del diseño en el catálogo.
   * @param entrada Builder con el contenido de la pieza.
   * @returns Ruta del HTML generado.
   * @throws Error si el ejecutable no está disponible o termina con error.
   */
  static render(pieza: Pieza, diseno: string, entrada: EntradaBuilder): string {
    const archivo = Contenido.archivo(pieza);
    const json = Contenido.entrada(pieza);
    mkdirSync(Contenido.dir, { recursive: true });
    writeFileSync(json, JSON.stringify(entrada.construir(), null, 2));
    const resultado = spawnSync(Contenido.bin, [pieza, diseno, json, archivo], { encoding: "utf8" });
    if (resultado.error) throw new Error(`No se pudo procesar la entrada: ${resultado.error.message}`);
    if (resultado.status !== 0) throw new Error(`No se pudo procesar la entrada: ${resultado.stderr.trim() || resultado.status}`);
    return archivo;
  }
}
