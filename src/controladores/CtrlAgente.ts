import type { Request, Response } from "express";
import { basename, join } from "node:path";
import { KoalaAgente } from "../agente/KoalaAgente";
import { Peticion } from "./Peticion";

/**
 * Controlador del agente: valida la entrada y expone resumen, archivos y descargas.
 */
export class CtrlAgente {
  /**
   * POST /api/procesar — resumen simple o flujo completo.
   * @param req Petición con `{ texto, nivel?, conDiagramas? }`.
   * @param res Respuesta HTTP.
   */
  static async procesar(req: Request, res: Response): Promise<void> {
    const { texto, nivel, conDiagramas } = Peticion.leerCuerpo(req);
    if (!texto) {
      res.status(400).json({ error: "Indica el texto a procesar" });
      return;
    }
    const nivelFinal = nivel && Number.isInteger(nivel) && nivel >= 1 && nivel <= 4 ? nivel : 1;
    try {
      if (!conDiagramas) {
        const resumen = await KoalaAgente.getInstance().resumidor.resumir(texto, nivelFinal);
        res.json({ niveles: [`Nivel ${nivelFinal}: ${resumen}`], archivos: [] });
        return;
      }
      res.json(await KoalaAgente.getInstance().procesar(texto, true));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Error al procesar" });
    }
  }

  /**
   * POST /resumen — resume un texto en el nivel pedido.
   * @param req Petición con `{ texto, nivel? }`.
   * @param res Respuesta HTTP.
   */
  static async resumir(req: Request, res: Response): Promise<void> {
    const { texto, nivel } = Peticion.leerCuerpo(req);
    if (!texto) {
      res.status(400).json({ error: "Indica el texto a resumir" });
      return;
    }
    if (nivel !== undefined && (!Number.isInteger(nivel) || nivel < 1 || nivel > 4)) {
      res.status(400).json({ error: "El nivel debe ser un entero entre 1 y 4" });
      return;
    }
    const efectivo = nivel ?? 1;
    const resumen = await KoalaAgente.getInstance().resumidor.resumir(texto, efectivo);
    res.json({ nivel: efectivo, resumen });
  }

  /**
   * POST /diagrama — genera un diagrama y lo entrega como PNG.
   * @param req Petición con `{ tipo, texto }`.
   * @param res Respuesta HTTP.
   */
  static async enviarDiagrama(req: Request, res: Response): Promise<void> {
    await CtrlAgente.entregar(req, res, "diagrama");
  }

  /**
   * POST /documento — genera un documento y lo entrega como DOCX.
   * @param req Petición con `{ tipo, texto }`.
   * @param res Respuesta HTTP.
   */
  static async enviarDocumento(req: Request, res: Response): Promise<void> {
    await CtrlAgente.entregar(req, res, "documento");
  }

  /**
   * POST /ejecutar — ejecuta el flujo completo del agente.
   * @param req Petición con `{ texto, conDiagramas? }`.
   * @param res Respuesta HTTP.
   */
  static async ejecutar(req: Request, res: Response): Promise<void> {
    const { texto, conDiagramas } = Peticion.leerCuerpo(req);
    if (!texto) {
      res.status(400).json({ error: "Indica el texto a procesar" });
      return;
    }
    res.json(await KoalaAgente.getInstance().procesar(texto, conDiagramas ?? true));
  }

  /**
   * GET /download/:ruta — descarga un archivo generado dentro del proyecto.
   * @param req Petición con la ruta en la URL.
   * @param res Respuesta HTTP.
   */
  static descargar(req: Request, res: Response): void {
    const params = req.params.ruta;
    const rutaRelativa = Array.isArray(params) ? params.join("/") : (params ?? "");
    if (!rutaRelativa) {
      res.status(400).json({ error: "Indica la ruta del archivo" });
      return;
    }
    const rutaAbsoluta = join(process.cwd(), rutaRelativa);
    if (!rutaAbsoluta.startsWith(process.cwd())) {
      res.status(400).json({ error: "Ruta invalida" });
      return;
    }
    res.sendFile(rutaAbsoluta);
  }

  /**
   * Valida el tipo contra su registro, genera el archivo y lo envía como descarga.
   * @param req Petición con `{ tipo, texto }`.
   * @param res Respuesta HTTP.
   * @param clase Registro contra el que se valida: `diagrama` o `documento`.
   */
  private static async entregar(req: Request, res: Response, clase: "diagrama" | "documento"): Promise<void> {
    const { texto, tipo } = Peticion.leerCuerpo(req);
    if (!texto || !tipo) {
      res.status(400).json({ error: `Indica el tipo de ${clase} y el texto` });
      return;
    }
    const agente = KoalaAgente.getInstance();
    const tipos = clase === "diagrama" ? agente.tiposDiagrama : agente.tiposDocumento;
    if (!tipos.includes(tipo)) {
      res.status(400).json({ error: `Tipo de ${clase} no soportado: ${tipo}`, tipos });
      return;
    }
    const archivo = clase === "diagrama" ? await agente.diagramador.generar(tipo, texto) : await agente.documentador.generar(tipo, texto);
    res.sendFile(join(process.cwd(), archivo), { headers: { "Content-Disposition": `attachment; filename="${basename(archivo)}"` } });
  }
}
