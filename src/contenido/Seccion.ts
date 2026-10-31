/** Datos de una sección tal como llegan en la entrada. */
export type DatosSeccion = Record<string, unknown>;

/** Punto de una lista: texto o sus subpuntos. */
export type Punto = string | Punto[];

/**
 * Base de las secciones de la entrada: cada subclase normaliza los datos de su
 * tipo y el decorador `Seccion.tipo` la registra para resolverla por nombre.
 */
export abstract class Seccion {
  /** Secciones registradas, indexadas por el tipo que declaran. */
  private static readonly registro = new Map<string, Seccion>();

  /**
   * Decorador que registra una sección para un tipo de la entrada.
   * @param tipo Tipo de sección (`resumen`, `lista`, `tabla`).
   * @returns Decorador de clase.
   */
  static tipo(tipo: string) {
    return (clase: new () => Seccion): void => {
      Seccion.registro.set(tipo, new clase());
    };
  }

  /**
   * Lista los tipos de sección soportados.
   * @returns Nombres de tipo registrados.
   */
  static tipos(): string[] {
    return [...Seccion.registro.keys()];
  }

  /**
   * Normaliza una sección según el tipo que declara; las incompletas se omiten.
   * @param datos Datos de la sección tal como llegan en la entrada.
   * @returns Sección normalizada, o `null` si el tipo no existe o falta información.
   */
  static de(datos: DatosSeccion): DatosSeccion | null {
    const tipo = String(datos.tipo ?? "");
    const normalizada = Seccion.registro.get(tipo)?.normalizar(datos);
    return normalizada ? { tipo, ...normalizada } : null;
  }

  /**
   * Convierte un valor de la entrada en texto.
   * @param valor Valor recibido.
   * @returns Texto, o `undefined` si el valor no es texto, número ni booleano.
   */
  static texto(valor: unknown): string | undefined {
    if (typeof valor === "string") return valor;
    if (typeof valor === "number" || typeof valor === "boolean") return String(valor);
    return undefined;
  }

  /**
   * Normaliza los datos de la sección sin la clave `tipo`.
   * @param datos Datos de la sección tal como llegan en la entrada.
   * @returns Datos válidos de la sección, o `null` si está incompleta.
   */
  protected abstract normalizar(datos: DatosSeccion): DatosSeccion | null;
}
