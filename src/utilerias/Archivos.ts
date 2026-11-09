import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Entidad, Registro } from "./Registro";

/**
 * Utileria que prepara, escribe y verifica los archivos generados por los agentes.
 */
export class Archivos {
  /**
   * Crea el directorio del archivo si no existe.
   * @param archivo Ruta del archivo a escribir.
   * @returns La misma ruta, ya con su directorio creado.
   */
  static preparar(archivo: string): string {
    mkdirSync(dirname(archivo), { recursive: true });
    return archivo;
  }

  /**
   * Renderiza la entidad de un tipo en su archivo.
   * @param registro Registro con las entidades disponibles.
   * @param tipo Tipo registrado.
   * @param datos Datos JSON de la entidad.
   * @returns Ruta del archivo generado.
   * @throws Error si el tipo no está registrado.
   */
  static async escribir<T extends Entidad>(registro: Registro<T>, tipo: string, datos: Record<string, unknown>): Promise<{ archivo: string }> {
    const archivo = Archivos.preparar(registro.calcularRuta(tipo));
    await registro.tomar(tipo).render(archivo, datos);
    return { archivo };
  }

  /**
   * Exige que el archivo exista.
   * @param archivo Ruta del archivo generado.
   * @param mensaje Error a lanzar si no existe.
   * @throws Error si el archivo no existe.
   */
  static verificar(archivo: string, mensaje: string): void {
    if (!existsSync(archivo)) throw new Error(mensaje);
  }
}
