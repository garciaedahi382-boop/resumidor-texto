import type { Request } from "express";

/** Campos que la API acepta en el cuerpo JSON. */
export type Cuerpo = {
  /** Texto a procesar, resumir o convertir en archivo. */
  texto?: string;
  /** Tipo de diagrama o documento pedido. */
  tipo?: string;
  /** Nivel de resumen (1..4). */
  nivel?: number;
  /** Si se generan diagramas y documentos. */
  conDiagramas?: boolean;
  /** Mensaje de chat. */
  mensaje?: string;
  /** Título de la conversación. */
  titulo?: string;
};

/**
 * Lectura de los datos que llegan en la petición.
 */
export class Peticion {
  /**
   * Lee el cuerpo JSON.
   * @param req Petición entrante.
   * @returns Campos del cuerpo, o vacío si no hay.
   */
  static leerCuerpo(req: Request): Cuerpo {
    return (typeof req.body === "object" && req.body !== null ? req.body : {}) as Cuerpo;
  }

  /**
   * Lee el identificador de la conversación desde la URL.
   * @param req Petición entrante.
   * @returns Identificador, o cadena vacía si no es válido.
   */
  static leerId(req: Request): string {
    return typeof req.params.id === "string" ? req.params.id : "";
  }
}
