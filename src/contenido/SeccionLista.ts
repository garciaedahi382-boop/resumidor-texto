import { Seccion } from "./Seccion";
import type { DatosSeccion, Punto } from "./Seccion";

/**
 * Sección de lista: un título con puntos y subpuntos opcionales.
 */
@Seccion.tipo("lista")
export class SeccionLista extends Seccion {
  /**
   * Exige título y al menos un punto, y conserva la figura opcional.
   * @param datos Datos de la sección.
   * @returns Lista válida de la sección, o `null` si falta el título o los puntos.
   */
  protected normalizar(datos: DatosSeccion): DatosSeccion | null {
    const titulo = Seccion.texto(datos.titulo);
    const elementos = this.puntos(datos.elementos);
    const figura = Seccion.texto(datos.figura);
    if (!titulo || elementos.length === 0) return null;
    return { titulo, elementos, ...(figura ? { figura } : {}) };
  }

  /**
   * Normaliza los puntos y sus subpuntos a cualquier profundidad: un arreglo que
   * aparece después de un texto son sus subpuntos, y el que aparece al inicio se ignora.
   * @param elementos Lista recibida en la entrada.
   * @returns Puntos válidos, sin valores que no sean texto ni lista.
   */
  private puntos(elementos: unknown): Punto[] {
    const puntos: Punto[] = [];
    for (const elemento of Array.isArray(elementos) ? elementos : []) {
      if (typeof elemento === "string") {
        if (elemento.trim()) puntos.push(elemento);
        continue;
      }
      if (!Array.isArray(elemento)) continue;
      const subpuntos = this.puntos(elemento);
      const ultimo = puntos.at(-1);
      if (subpuntos.length === 0 || ultimo === undefined) continue;
      if (typeof ultimo === "string") puntos.push(subpuntos);
      else ultimo.push(...subpuntos);
    }
    return puntos;
  }
}
