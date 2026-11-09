import type { Request, Response } from "express";
import { KoalaAgente } from "../agente/KoalaAgente";
import { Historial, type Conversacion, type Mensaje } from "../modelos/Historial";
import { Peticion } from "./Peticion";

/** Conversación con sus mensajes, como la devuelve la API. */
type ConversacionCompleta = Conversacion & { mensajes: Mensaje[] };

/**
 * Controlador de conversaciones: valida la entrada y orquesta el modelo `Historial` con el agente.
 */
export class CtrlConversaciones {
  /**
   * GET /api/conversaciones — lista las conversaciones.
   * @param _req Petición entrante.
   * @param res Respuesta HTTP.
   */
  static listar(_req: Request, res: Response): void {
    res.json(Historial.listar());
  }

  /**
   * POST /api/conversaciones — crea una conversación con el primer mensaje y su respuesta.
   * @param req Petición con `{ mensaje }`.
   * @param res Respuesta HTTP.
   */
  static async crear(req: Request, res: Response): Promise<void> {
    const { mensaje } = Peticion.leerCuerpo(req);
    if (!mensaje) {
      res.status(400).json({ error: "Indica el mensaje" });
      return;
    }
    const conversacion = await CtrlConversaciones.responder(null, mensaje);
    if (!conversacion) {
      res.status(404).json({ error: "Conversación no encontrada" });
      return;
    }
    res.status(201).json(conversacion);
  }

  /**
   * GET /api/conversaciones/:id — conversación con sus mensajes.
   * @param req Petición con el id en la URL.
   * @param res Respuesta HTTP.
   */
  static obtener(req: Request, res: Response): void {
    const conversacion = Historial.obtener(Peticion.leerId(req));
    if (!conversacion) {
      res.status(404).json({ error: "Conversación no encontrada" });
      return;
    }
    res.json({ ...conversacion, mensajes: Historial.mensajesDe(conversacion.id) });
  }

  /**
   * PATCH /api/conversaciones/:id — edita el título.
   * @param req Petición con `{ titulo }` y el id en la URL.
   * @param res Respuesta HTTP.
   */
  static renombrar(req: Request, res: Response): void {
    const { titulo } = Peticion.leerCuerpo(req);
    if (!titulo || !titulo.trim()) {
      res.status(400).json({ error: "Indica un titulo" });
      return;
    }
    const conversacion = Historial.obtener(Peticion.leerId(req));
    if (!conversacion) {
      res.status(404).json({ error: "Conversación no encontrada" });
      return;
    }
    Historial.renombrar(conversacion.id, titulo.trim().slice(0, 120));
    res.json(Historial.obtener(conversacion.id));
  }

  /**
   * DELETE /api/conversaciones/:id — borra la conversación y sus mensajes.
   * @param req Petición con el id en la URL.
   * @param res Respuesta HTTP.
   */
  static borrar(req: Request, res: Response): void {
    const id = Peticion.leerId(req);
    if (!Historial.obtener(id)) {
      res.status(404).json({ error: "Conversación no encontrada" });
      return;
    }
    Historial.borrar(id);
    res.status(204).end();
  }

  /**
   * POST /api/conversaciones/:id/mensajes — agrega un mensaje y devuelve la conversación con la respuesta.
   * @param req Petición con `{ mensaje }` y el id en la URL.
   * @param res Respuesta HTTP.
   */
  static async mandarMensaje(req: Request, res: Response): Promise<void> {
    const { mensaje } = Peticion.leerCuerpo(req);
    if (!mensaje) {
      res.status(400).json({ error: "Indica el mensaje" });
      return;
    }
    const conversacion = await CtrlConversaciones.responder(Peticion.leerId(req), mensaje);
    if (!conversacion) {
      res.status(404).json({ error: "Conversación no encontrada" });
      return;
    }
    res.json(conversacion);
  }

  /**
   * Guarda el mensaje del usuario (creando la conversación si es nueva), consulta el agente y guarda la respuesta.
   * @param id Identificador de la conversación, o `null` para crear una nueva.
   * @param mensaje Nuevo mensaje del usuario.
   * @returns Conversación con sus mensajes, o `null` si no existe.
   */
  private static async responder(id: string | null, mensaje: string): Promise<ConversacionCompleta | null> {
    const conversacion = id ? Historial.obtener(id) : Historial.crear(CtrlConversaciones.calcularTitulo(mensaje));
    if (!conversacion) return null;
    Historial.agregar(conversacion.id, "user", mensaje);
    const respuesta = await KoalaAgente.getInstance().responder(Historial.mensajesDe(conversacion.id));
    Historial.agregar(conversacion.id, "assistant", respuesta);
    return { ...conversacion, mensajes: Historial.mensajesDe(conversacion.id) };
  }

  /**
   * Deriva el título de una conversación de su primer mensaje.
   * @param mensaje Primer mensaje del usuario.
   * @returns Título (primera línea, acotado a 50 caracteres).
   */
  private static calcularTitulo(mensaje: string): string {
    const linea = (mensaje.split("\n")[0] ?? "").trim();
    return linea.length > 50 ? `${linea.slice(0, 50)}…` : linea || "Nueva conversación";
  }
}
