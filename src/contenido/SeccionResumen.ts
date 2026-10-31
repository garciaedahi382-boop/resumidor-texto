import { Seccion } from "./Seccion";
import type { DatosSeccion } from "./Seccion";

/**
 * Sección de resumen: un título con un párrafo.
 */
@Seccion.tipo("resumen")
export class SeccionResumen extends Seccion {
  /**
   * Exige título y texto, y conserva la figura opcional.
   * @param datos Datos de la sección.
   * @returns Resumen válido de la sección, o `null` si falta el título o el texto.
   */
  protected normalizar(datos: DatosSeccion): DatosSeccion | null {
    const titulo = Seccion.texto(datos.titulo);
    const texto = Seccion.texto(datos.texto);
    const figura = Seccion.texto(datos.figura);
    if (!titulo || !texto) return null;
    return { titulo, texto, ...(figura ? { figura } : {}) };
  }
}
