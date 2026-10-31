import { Seccion } from "./Secciones";
import type { DatosSeccion } from "./Secciones";

/**
 * Entrada de contenido normalizada, lista para escribirse en JSON.
 */
export interface Entrada {
  /** Título del documento y de la portada. */
  titulo?: string;
  /** Texto que acompaña al título. */
  subtitulo?: string;
  /** Pie de la infografía; las presentaciones no lo usan. */
  pie?: string;
  /** Secciones completas, en el orden en que aparecen. */
  secciones: DatosSeccion[];
}

/**
 * Arma la entrada de contenido paso a paso: las secciones se guardan tal como
 * llegan y se normalizan al construir.
 */
export class EntradaBuilder {
  /** Entrada en construcción. */
  private readonly entrada: Entrada = { secciones: [] };

  /**
   * Carga una entrada ya armada, descartando lo que no sea texto.
   * @param datos Entrada recibida en la herramienta.
   * @returns Builder listo para completarse o construirse.
   */
  static de(datos: DatosSeccion): EntradaBuilder {
    const builder = new EntradaBuilder().titulo(datos.titulo).subtitulo(datos.subtitulo).pie(datos.pie);
    for (const seccion of Array.isArray(datos.secciones) ? datos.secciones : []) {
      if (seccion !== null && typeof seccion === "object" && !Array.isArray(seccion)) builder.seccion(seccion);
    }
    return builder;
  }

  /**
   * Fija el título del documento y de la portada.
   * @param titulo Título recibido; se ignora si no es texto.
   * @returns El mismo builder.
   */
  titulo(titulo: unknown): this {
    return this.fijar("titulo", titulo);
  }

  /**
   * Fija el texto que acompaña al título.
   * @param subtitulo Subtítulo recibido; se ignora si no es texto.
   * @returns El mismo builder.
   */
  subtitulo(subtitulo: unknown): this {
    return this.fijar("subtitulo", subtitulo);
  }

  /**
   * Fija el pie de la infografía.
   * @param pie Pie recibido; se ignora si no es texto.
   * @returns El mismo builder.
   */
  pie(pie: unknown): this {
    return this.fijar("pie", pie);
  }

  /**
   * Agrega una sección en el orden en que aparece.
   * @param datos Sección tal como llega (resumen, lista o tabla).
   * @returns El mismo builder.
   */
  seccion(datos: DatosSeccion): this {
    this.entrada.secciones.push(datos);
    return this;
  }

  /**
   * Construye la entrada normalizada, omitiendo las secciones incompletas.
   * @returns Entrada lista para escribirse en JSON.
   */
  construir(): Entrada {
    const secciones = this.entrada.secciones
      .map((datos) => Seccion.de(datos))
      .filter((seccion): seccion is DatosSeccion => seccion !== null);
    return { ...this.entrada, secciones };
  }

  /**
   * Asigna una clave de texto de la raíz si el valor es texto.
   * @param clave Clave de la entrada.
   * @param valor Valor recibido.
   * @returns El mismo builder.
   */
  private fijar(clave: "titulo" | "subtitulo" | "pie", valor: unknown): this {
    const texto = Seccion.texto(valor);
    if (texto !== undefined) this.entrada[clave] = texto;
    return this;
  }
}
