import { Router } from "express";
import { CtrlConversaciones } from "../../controladores/CtrlConversaciones";

/**
 * Vista de conversaciones: declara los endpoints y los conecta con su controlador.
 */
export class VistaConversaciones {
  /**
   * Registra los endpoints de conversaciones.
   * @returns Router listo para montar en la aplicación.
   */
  static registrar(): Router {
    const router = Router();
    router.get("/api/conversaciones", CtrlConversaciones.listar);
    router.post("/api/conversaciones", CtrlConversaciones.crear);
    router.get("/api/conversaciones/:id", CtrlConversaciones.obtener);
    router.patch("/api/conversaciones/:id", CtrlConversaciones.renombrar);
    router.delete("/api/conversaciones/:id", CtrlConversaciones.borrar);
    router.post("/api/conversaciones/:id/mensajes", CtrlConversaciones.mandarMensaje);
    return router;
  }
}
