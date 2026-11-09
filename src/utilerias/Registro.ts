import { join } from "node:path";

/** Entidad que genera un archivo: extensión, directorio de salida y render. */
export type Entidad = { dir: string; extension: string; render(archivo: string, datos: any): void | Promise<void> };

/**
 * Utileria con el comportamiento común de los registros de entidades generadoras de archivos.
 */
export class Registro<T extends Entidad> {
  /** Tipos registrados. */
  readonly tipos: string[];

  /**
   * @param entidades Entidades disponibles indexadas por tipo.
   */
  constructor(private readonly entidades: Record<string, T>) {
    this.tipos = Object.keys(entidades);
  }

  /**
   * Obtiene la entidad de un tipo.
   * @param tipo Tipo registrado.
   * @returns Instancia de la entidad.
   * @throws Error si el tipo no está registrado.
   */
  tomar(tipo: string): T {
    const entidad = this.entidades[tipo];
    if (!entidad) throw new Error(`Tipo no soportado: ${tipo}`);
    return entidad;
  }

  /**
   * Calcula la ruta del archivo generado para un tipo.
   * @param tipo Tipo registrado.
   * @returns Ruta del archivo.
   * @throws Error si el tipo no está registrado.
   */
  calcularRuta(tipo: string): string {
    const entidad = this.tomar(tipo);
    return join(entidad.dir, `${tipo}.${entidad.extension}`);
  }

  /**
   * Cambia el directorio de salida de todas las entidades.
   * @param directorio Ruta del directorio de salida.
   */
  ajustarDirectorio(directorio: string): void {
    for (const entidad of Object.values(this.entidades)) entidad.dir = directorio;
  }
}
