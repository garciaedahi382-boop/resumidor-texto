import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un diagrama de Gantt con eje temporal y barras por tarea.
 */
export class GanttRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "gantt";
  /** Esquema de datos: entre 2 y 15 tareas con inicio y duración. */
  readonly schema = '{"tareas":[{"nombre":"texto","inicio":0,"duracion":5}]} (entre 2 y 15 tareas)';

  /** Alto mínimo de cada fila. */
  private static readonly FILA_MIN = 44;
  /** Coordenada Y donde empieza la primera fila. */
  private static readonly TOP = 90;

  /**
   * Expande el lienzo según la cantidad de tareas.
   * @param data Datos del diagrama.
   * @returns Alto del lienzo en píxeles.
   */
  protected override alto(data: any): number {
    return Math.max(900, this.ejeY((data.tareas ?? []).length) + 70);
  }

  /**
   * Calcula el alto de fila para que quepan las tareas.
   * @param count Cantidad de tareas.
   * @returns Alto de fila en píxeles.
   */
  private filas(count: number): number {
    return Math.max(GanttRenderer.FILA_MIN, Math.min(72, 640 / Math.max(count, 1)));
  }

  /**
   * Coordenada Y del eje temporal.
   * @param count Cantidad de tareas.
   * @returns Coordenada Y en píxeles.
   */
  private ejeY(count: number): number {
    return GanttRenderer.TOP + count * this.filas(count) + 30;
  }

  /**
   * Dibuja el eje temporal y las barras de cada tarea.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const tareas: any[] = data.tareas ?? [];
    const maxT = Math.max(...tareas.map((t) => (t.inicio ?? 0) + (t.duracion ?? 0)), 1);
    const scale = (this.w - 260 - 80) / maxT;
    this.drawAxis(ctx, maxT, scale, tareas.length);
    tareas.forEach((t, i) => this.drawBar(ctx, t, i, tareas.length, scale));
  }

  /**
   * Dibuja las líneas guía y las marcas del eje temporal.
   * @param ctx Contexto 2D del canvas.
   * @param maxT Tiempo máximo de la escala.
   * @param scale Píxeles por unidad de tiempo.
   * @param count Cantidad de tareas.
   */
  private drawAxis(ctx: SKRSContext2D, maxT: number, scale: number, count: number): void {
    const x0 = 260;
    const top = GanttRenderer.TOP;
    const axisY = this.ejeY(count);
    const step = Math.ceil(maxT / 10);
    for (let t = 0; t <= maxT; t += step) {
      this.line(ctx, x0 + t * scale, top - 10, x0 + t * scale, axisY);
      this.smallText(ctx, String(t), x0 + t * scale, axisY + 16, "center", 13, "#555555");
    }
    this.line(ctx, x0, top - 10, x0, axisY);
  }

  /**
   * Dibuja el nombre y la barra de una tarea.
   * @param ctx Contexto 2D del canvas.
   * @param t Tarea con `nombre`, `inicio` y `duracion`.
   * @param i Índice de la tarea.
   * @param count Cantidad total de tareas.
   * @param scale Píxeles por unidad de tiempo.
   */
  private drawBar(ctx: SKRSContext2D, t: any, i: number, count: number, scale: number): void {
    const x0 = 260;
    const rowH = this.filas(count);
    const y = GanttRenderer.TOP + i * rowH + (rowH - 40) / 2;
    this.smallText(ctx, String(t.nombre ?? ""), x0 - 20, y + 20, "right", 15);
    const bx = x0 + (t.inicio ?? 0) * scale;
    const bw = Math.max((t.duracion ?? 0) * scale, 4);
    ctx.fillStyle = "#5b9bd5";
    this.roundRect(ctx, bx, y, bw, 40, 8);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
