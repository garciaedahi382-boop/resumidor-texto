import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un diagrama PERT: tareas ubicadas por profundidad de dependencias.
 */
export class PertRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "pert";
  /** Esquema de datos: hasta 12 tareas con duración y dependencias. */
  readonly schema = '{"tareas":[{"id":"A","duracion":3,"dependencias":[]}]} (máximo 12 tareas)';

  /**
   * Expande el lienzo según la profundidad máxima de dependencias.
   * @param data Datos del diagrama.
   * @returns Ancho del lienzo en píxeles.
   */
  protected override ancho(data: any): number {
    return Math.max(1600, 180 + (this.profundidadMax(data.tareas ?? []) + 1) * 300 + 120);
  }

  /**
   * Expande el lienzo según la cantidad de tareas por nivel.
   * @param data Datos del diagrama.
   * @returns Alto del lienzo en píxeles.
   */
  protected override alto(data: any): number {
    const filas = new Map<number, number>();
    const depths = this.depths(data.tareas ?? []);
    (data.tareas ?? []).forEach((t: any) => {
      const d = depths.get(t.id)!;
      filas.set(d, (filas.get(d) ?? 0) + 1);
    });
    const maxFilas = Math.max(0, ...filas.values());
    return Math.max(900, 220 + maxFilas * 160 + 100);
  }

  /**
   * Calcula profundidades y dibuja flechas y tareas.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const tareas: any[] = data.tareas ?? [];
    const depths = this.depths(tareas);
    const pos = this.positions(tareas, depths);
    this.drawArrows(ctx, tareas, pos);
    this.drawTasks(ctx, tareas, pos);
  }

  /**
   * Calcula la profundidad de cada tarea según sus dependencias (memoizado).
   * @param tareas Tareas con `id` y `dependencias`.
   * @returns Profundidad indexada por id de tarea.
   */
  private depths(tareas: any[]): Map<string, number> {
    const memo = new Map<string, number>();
    const depth = (t: any): number => {
      if (memo.has(t.id)) return memo.get(t.id)!;
      const deps: string[] = t.dependencias ?? [];
      const d = deps.length === 0 ? 0 : 1 + Math.max(...deps.map((id) => {
        const dep = tareas.find((x) => x.id === id);
        return dep ? depth(dep) : -1;
      }));
      memo.set(t.id, d);
      return d;
    };
    tareas.forEach(depth);
    return memo;
  }

  /**
   * Profundidad máxima entre todas las tareas.
   * @param tareas Tareas del diagrama.
   * @returns Profundidad máxima.
   */
  private profundidadMax(tareas: any[]): number {
    return Math.max(0, ...this.depths(tareas).values());
  }

  /**
   * Asigna posición a cada tarea: columna por profundidad y fila dentro del nivel.
   * @param tareas Tareas del diagrama.
   * @param depths Profundidades ya calculadas.
   * @returns Posiciones indexadas por id de tarea.
   */
  private positions(tareas: any[], depths: Map<string, number>): Map<string, { x: number; y: number }> {
    const filas = new Map<number, number>();
    const pos = new Map<string, { x: number; y: number }>();
    tareas.forEach((t) => {
      const d = depths.get(t.id)!;
      const fila = filas.get(d) ?? 0;
      pos.set(t.id, { x: 180 + d * 300, y: 220 + fila * 160 });
      filas.set(d, fila + 1);
    });
    return pos;
  }

  /**
   * Dibuja las flechas de dependencia entre tareas.
   * @param ctx Contexto 2D del canvas.
   * @param tareas Tareas con `id` y `dependencias`.
   * @param pos Posiciones de las tareas.
   */
  private drawArrows(ctx: SKRSContext2D, tareas: any[], pos: Map<string, { x: number; y: number }>): void {
    tareas.forEach((t) => {
      (t.dependencias ?? []).forEach((dep: string) => {
        const a = pos.get(dep), b = pos.get(t.id);
        if (a && b) this.arrow(ctx, a.x + 70, a.y + 32, b.x - 70, b.y + 32);
      });
    });
  }

  /**
   * Dibuja las cajas de las tareas con id y duración.
   * @param ctx Contexto 2D del canvas.
   * @param tareas Tareas con `id` y `duracion`.
   * @param pos Posiciones de las tareas.
   */
  private drawTasks(ctx: SKRSContext2D, tareas: any[], pos: Map<string, { x: number; y: number }>): void {
    tareas.forEach((t) => {
      const p = pos.get(t.id)!;
      this.box(ctx, p.x - 70, p.y, 140, 64, `${t.id} (${t.duracion ?? "?"})`, "#e8f5e9");
    });
  }
}
