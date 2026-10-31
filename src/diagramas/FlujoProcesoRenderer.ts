import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un diagrama de flujo de procesos: inicio, procesos, decisiones y fin,
 * colocados en columna y unidos por flechas con etiqueta opcional.
 */
export class FlujoProcesoRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "flujo-proceso";
  /** Esquema de datos: pasos tipados y conexiones entre ellos. */
  readonly schema = '{"pasos":[{"id":"1","tipo":"inicio|proceso|decision|fin","texto":"..."}],"conexiones":[{"desde":"1","hacia":"2","etiqueta":"sí"}]} (entre 2 y 12 pasos; las conexiones son opcionales y siguen el orden de los pasos)';

  /** Alto de cada nodo. */
  private static readonly NODO_H = 90;
  /** Separación vertical entre nodos. */
  private static readonly GAP = 90;
  /** Alto reservado sobre el primer nodo. */
  private static readonly TOP = 100;
  /** Ancho de los nodos rectangulares. */
  private static readonly NODO_W = 420;
  /** Ancho del rombo de decisión. */
  private static readonly ROMBO_W = 420;
  /** Alto del rombo de decisión. */
  private static readonly ROMBO_H = 150;

  /**
   * Expande el lienzo según la cantidad de pasos.
   * @param data Datos del diagrama.
   * @returns Alto del lienzo en píxeles.
   */
  protected override alto(data: any): number {
    const n = (data.pasos ?? []).length;
    return Math.max(900, FlujoProcesoRenderer.TOP + n * (FlujoProcesoRenderer.NODO_H + FlujoProcesoRenderer.GAP) + 60);
  }

  /**
   * Dibuja primero las conexiones y luego los nodos encima.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const pasos: any[] = data.pasos ?? [];
    if (pasos.length === 0) return;
    const posiciones = this.posiciones(pasos);
    this.drawConexiones(ctx, this.conexiones(data, pasos), posiciones);
    pasos.forEach((paso) => this.drawNodo(ctx, paso, posiciones.get(paso.id)!));
  }

  /**
   * Posición vertical de cada nodo en columna.
   * @param pasos Pasos del diagrama.
   * @returns Centro de cada nodo indexado por id.
   */
  private posiciones(pasos: any[]): Map<string, { x: number; y: number }> {
    const posiciones = new Map<string, { x: number; y: number }>();
    pasos.forEach((paso, i) => {
      posiciones.set(paso.id, {
        x: this.w / 2,
        y: FlujoProcesoRenderer.TOP + i * (FlujoProcesoRenderer.NODO_H + FlujoProcesoRenderer.GAP) + FlujoProcesoRenderer.NODO_H / 2,
      });
    });
    return posiciones;
  }

  /**
   * Usa las conexiones declaradas o, si faltan, encadena los pasos en orden.
   * @param data Datos del diagrama.
   * @param pasos Pasos del diagrama.
   * @returns Conexiones con origen, destino y etiqueta.
   */
  private conexiones(data: any, pasos: any[]): { desde: string; hacia: string; etiqueta?: string }[] {
    if ((data.conexiones ?? []).length > 0) return data.conexiones;
    return pasos.slice(0, -1).map((paso, i) => ({ desde: paso.id, hacia: pasos[i + 1]!.id }));
  }

  /**
   * Dibuja las flechas entre nodos con su etiqueta.
   * @param ctx Contexto 2D del canvas.
   * @param conexiones Conexiones del diagrama.
   * @param posiciones Centros de los nodos indexados por id.
   */
  private drawConexiones(ctx: SKRSContext2D, conexiones: any[], posiciones: Map<string, { x: number; y: number }>): void {
    conexiones.forEach((conexion) => {
      const desde = posiciones.get(conexion.desde);
      const hacia = posiciones.get(conexion.hacia);
      if (!desde || !hacia) return;
      const y1 = desde.y + FlujoProcesoRenderer.NODO_H / 2 + 10;
      const y2 = hacia.y - FlujoProcesoRenderer.NODO_H / 2 - 10;
      this.arrow(ctx, desde.x, y1, hacia.x, y2);
      if (conexion.etiqueta) {
        this.smallText(ctx, String(conexion.etiqueta), desde.x + 16, (y1 + y2) / 2, "left", 14, "#555555");
      }
    });
  }

  /**
   * Dibuja un nodo según su tipo: inicio, fin, proceso o decisión.
   * @param ctx Contexto 2D del canvas.
   * @param paso Paso con `tipo` y `texto`.
   * @param p Centro del nodo.
   */
  private drawNodo(ctx: SKRSContext2D, paso: any, p: { x: number; y: number }): void {
    if (paso.tipo === "decision") return this.drawRombo(ctx, paso.texto ?? "", p);
    const colores: Record<string, string> = { inicio: "#d9ead3", fin: "#f4cccc" };
    const w = FlujoProcesoRenderer.NODO_W;
    const h = FlujoProcesoRenderer.NODO_H;
    if (paso.tipo === "inicio" || paso.tipo === "fin") {
      return this.drawEstadio(ctx, paso.texto ?? "", p, colores[paso.tipo]!, w, h);
    }
    this.box(ctx, p.x - w / 2, p.y - h / 2, w, h, paso.texto ?? "", "#eef4ff");
  }

  /**
   * Dibuja un nodo con extremos redondeados (inicio o fin).
   * @param ctx Contexto 2D del canvas.
   * @param texto Texto del nodo.
   * @param p Centro del nodo.
   * @param fill Color de relleno.
   * @param w Ancho del nodo.
   * @param h Alto del nodo.
   */
  private drawEstadio(ctx: SKRSContext2D, texto: string, p: { x: number; y: number }, fill: string, w: number, h: number): void {
    ctx.fillStyle = fill;
    this.roundRect(ctx, p.x - w / 2, p.y - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();
    this.textoCentrado(ctx, texto, p, w - 60);
  }

  /**
   * Dibuja un rombo de decisión con su texto.
   * @param ctx Contexto 2D del canvas.
   * @param texto Texto de la decisión.
   * @param p Centro del rombo.
   */
  private drawRombo(ctx: SKRSContext2D, texto: string, p: { x: number; y: number }): void {
    const w = FlujoProcesoRenderer.ROMBO_W / 2;
    const h = FlujoProcesoRenderer.ROMBO_H / 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - h);
    ctx.lineTo(p.x + w, p.y);
    ctx.lineTo(p.x, p.y + h);
    ctx.lineTo(p.x - w, p.y);
    ctx.closePath();
    ctx.fillStyle = "#fff2cc";
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();
    this.textoCentrado(ctx, texto, p, FlujoProcesoRenderer.ROMBO_W - 150);
  }

  /**
   * Dibuja texto centrado en varias líneas.
   * @param ctx Contexto 2D del canvas.
   * @param texto Texto a dibujar.
   * @param p Centro del nodo.
   * @param max Ancho máximo del texto.
   */
  private textoCentrado(ctx: SKRSContext2D, texto: string, p: { x: number; y: number }, max: number): void {
    ctx.fillStyle = "#111111";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lineas = this.wrap(ctx, texto, max);
    lineas.forEach((linea, i) => {
      ctx.fillText(linea, p.x, p.y + (i - (lineas.length - 1) / 2) * 21);
    });
  }
}
