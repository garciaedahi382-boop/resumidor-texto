import express from "express";
import type { NextFunction, Request, Response } from "express";
import { VistaAgente } from "./vistas/VistaAgente";
import { VistaConversaciones } from "./vistas/VistaConversaciones";

/**
 * Exposición HTTP de la API: monta las vistas y arranca Express.
 */
export class ServidorHttp {
  /** Puerto por defecto del servidor. */
  static readonly PUERTO = 3000;

  /**
   * Monta las vistas, registra el manejo de errores y arranca el servidor.
   * @param puerto Puerto donde escuchar (por defecto 3000).
   */
  iniciar(puerto: number = ServidorHttp.PUERTO): void {
    const app = express();
    app.use(express.json());
    app.use(VistaConversaciones.registrar());
    app.use(VistaAgente.registrar());
    app.use(ServidorHttp.responderError);
    app.listen(puerto, () => console.log(`Servidor HTTP escuchando en http://localhost:${puerto}`));
  }

  /**
   * Devuelve los errores de las rutas como JSON con su estado HTTP.
   */
  private static responderError = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    const estado = (err as Error & { status?: number }).status ?? 500;
    console.error(err.message);
    if (!res.headersSent) res.status(estado).json({ error: err.message });
  };
}
