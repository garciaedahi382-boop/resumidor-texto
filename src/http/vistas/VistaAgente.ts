import { Router } from "express";
import { CtrlAgente } from "../../controladores/CtrlAgente";

/**
 * Vista del agente: declara los endpoints de resumen, archivos y descargas.
 */
export class VistaAgente {
  /**
   * Registra los endpoints del agente.
   * @returns Router listo para montar en la aplicación.
   */
  static registrar(): Router {
    const router = Router();
    router.post("/api/procesar", CtrlAgente.procesar);
    router.post("/resumen", CtrlAgente.resumir);
    router.post("/diagrama", CtrlAgente.enviarDiagrama);
    router.post("/documento", CtrlAgente.enviarDocumento);
    router.post("/ejecutar", CtrlAgente.ejecutar);
    router.get("/download/*ruta", CtrlAgente.descargar);
    return router;
  }
}
