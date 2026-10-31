import { Seccion } from "./Seccion";
import type { DatosSeccion } from "./Seccion";

/**
 * Sección de tabla: coordenadas de hoja de cálculo (`A1`, `B2`, ...) con su texto.
 */
@Seccion.tipo("tabla")
export class SeccionTabla extends Seccion {
  /** Coordenada válida: letras de columna y número de fila desde 1. */
  private static readonly COORDENADA = /^([A-Za-z]+)([0-9]+)$/;

  /**
   * Exige celdas; el título y la figura son opcionales.
   * @param datos Datos de la sección.
   * @returns Tabla válida de la sección, o `null` si no hay celdas.
   */
  protected normalizar(datos: DatosSeccion): DatosSeccion | null {
    const celdas = this.celdas(datos.celdas);
    const titulo = Seccion.texto(datos.titulo);
    const figura = Seccion.texto(datos.figura);
    if (Object.keys(celdas).length === 0) return null;
    return { ...(titulo ? { titulo } : {}), celdas, ...(figura ? { figura } : {}) };
  }

  /**
   * Pone las letras de la coordenada en mayúscula y convierte los valores en texto.
   * @param celdas Celdas recibidas en la entrada.
   * @returns Celdas válidas indexadas por coordenada.
   */
  private celdas(celdas: unknown): Record<string, string> {
    if (celdas === null || typeof celdas !== "object" || Array.isArray(celdas)) return {};
    const normalizadas: Record<string, string> = {};
    for (const [coordenada, valor] of Object.entries(celdas)) {
      const partes = SeccionTabla.COORDENADA.exec(coordenada.trim());
      const texto = Seccion.texto(valor);
      if (!partes || texto === undefined) continue;
      const letras = partes[1];
      const fila = Number(partes[2]);
      if (!letras || fila < 1) continue;
      normalizadas[`${letras.toUpperCase()}${fila}`] = texto;
    }
    return normalizadas;
  }
}
