import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un flujo de actualización: fases en fila con su estado, detalle y flechas.
 */
export class FlujoActualizacionRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "flujo-actualizacion";
  /** Esquema de datos: entre 2 y 10 fases con estado y detalle. */
  readonly schema = '{"fases":[{"nombre":"texto","estado":"completado|en-curso|pendiente|fallido","detalle":"texto"}]} (entre 2 y 10 fases)';

  /** Margen horizontal del flujo. */
  private static readonly MARGEN = 80;
  /** Ancho mínimo de cada fase. */
  private static readonly FASE_W = 240;
  /** Alto de cada fase. */
  private static readonly FASE_H = 160;
  /** Separación horizontal entre fases. */
  private static readonly GAP = 70;
  /** Alto de la franja de estado. */
  private static readonly FRANJA_H = 30;
  /** Colores por estado de la fase. */
  private static readonly ESTADOS: Record<string, { fondo: string; franja: string; texto: string }> = {
    completado: { fondo: "#e6f4ea", franja: "#34a853", texto: "#ffffff" },
    "en-curso": { fondo: "#fef7e0", franja: "#f4b400", texto: "#111111" },
    pendiente: { fondo: "#f4f4f4", franja: "#cccccc", texto: "#111111" },
    fallido: { fondo: "#fce8e6", franja: "#db4437", texto: "#ffffff" },
  };

  /**
   * Expande el lienzo según la cantidad de fases.
   * @param data Datos del diagrama.
   * @returns Ancho del lienzo en píxeles.
   */
  protected override ancho(data: any): number {
    const n = (data.fases ?? []).length;
    return Math.max(1600, 2 * FlujoActualizacionRenderer.MARGEN + n * FlujoActualizacionRenderer.FASE_W + Math.max(0, n - 1) * FlujoActualizacionRenderer.GAP);
  }

  /**
   * Dibuja las fases en fila y las flechas entre ellas.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const fases: any[] = data.fases ?? [];
    if (fases.length === 0) return;
    const total = fases.length * FlujoActualizacionRenderer.FASE_W + (fases.length - 1) * FlujoActualizacionRenderer.GAP;
    const x0 = (this.w - total) / 2;
    const y = this.h / 2 - FlujoActualizacionRenderer.FASE_H / 2;
    fases.forEach((fase, i) => {
      const x = x0 + i * (FlujoActualizacionRenderer.FASE_W + FlujoActualizacionRenderer.GAP);
      this.drawFase(ctx, fase, x, y);
      if (i < fases.length - 1) this.drawFlecha(ctx, x + FlujoActualizacionRenderer.FASE_W, y + FlujoActualizacionRenderer.FASE_H / 2);
    });
  }

  /**
   * Dibuja una fase con su franja de estado, nombre y detalle.
   * @param ctx Contexto 2D del canvas.
   * @param fase Fase con `nombre`, `estado` y `detalle`.
   * @param x Coordenada X de la fase.
   * @param y Coordenada Y de la fase.
   */
  private drawFase(ctx: SKRSContext2D, fase: any, x: number, y: number): void {
    const colores = FlujoActualizacionRenderer.ESTADOS[fase.estado] ?? FlujoActualizacionRenderer.ESTADOS.pendiente!;
    const w = FlujoActualizacionRenderer.FASE_W;
    const h = FlujoActualizacionRenderer.FASE_H;
    ctx.fillStyle = colores.fondo;
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();
    this.franja(ctx, colores, fase.estado ?? "pendiente", x, y, w);
    this.texto(ctx, fase.nombre ?? "", x + w / 2, y + FlujoActualizacionRenderer.FRANJA_H + 34, w - 30, 16, "#111111");
    this.texto(ctx, fase.detalle ?? "", x + w / 2, y + FlujoActualizacionRenderer.FRANJA_H + 84, w - 30, 13, "#555555");
  }

  /**
   * Dibuja la franja superior con el estado de la fase.
   * @param ctx Contexto 2D del canvas.
   * @param colores Colores del estado.
   * @param estado Nombre del estado.
   * @param x Coordenada X de la fase.
   * @param y Coordenada Y de la fase.
   * @param w Ancho de la fase.
   */
  private franja(ctx: SKRSContext2D, colores: { franja: string; texto: string }, estado: string, x: number, y: number, w: number): void {
    ctx.fillStyle = colores.franja;
    this.roundRect(ctx, x, y, w, FlujoActualizacionRenderer.FRANJA_H, 12);
    ctx.fill();
    this.smallText(ctx, estado, x + w / 2, y + FlujoActualizacionRenderer.FRANJA_H / 2, "center", 13, colores.texto);
  }

  /**
   * Dibuja el texto de la fase ajustado en varias líneas.
   * @param ctx Contexto 2D del canvas.
   * @param texto Texto a dibujar.
   * @param cx Coordenada X del centro.
   * @param cy Coordenada Y del centro.
   * @param max Ancho máximo del texto.
   * @param size Tamaño de fuente.
   * @param color Color del texto.
   */
  private texto(ctx: SKRSContext2D, texto: string, cx: number, cy: number, max: number, size: number, color: string): void {
    if (!texto) return;
    ctx.fillStyle = color;
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lineas = this.wrap(ctx, texto, max);
    lineas.forEach((linea, i) => ctx.fillText(linea, cx, cy + (i - (lineas.length - 1) / 2) * (size + 5)));
  }

  /**
   * Dibuja la flecha entre dos fases.
   * @param ctx Contexto 2D del canvas.
   * @param x Coordenada X del borde derecho de la fase anterior.
   * @param cy Coordenada Y del centro de la fila.
   */
  private drawFlecha(ctx: SKRSContext2D, x: number, cy: number): void {
    this.arrow(ctx, x + 12, cy, x + FlujoActualizacionRenderer.GAP - 12, cy);
  }
}
