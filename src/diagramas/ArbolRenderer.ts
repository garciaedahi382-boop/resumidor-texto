import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un diagrama de árbol: una raíz y sus hijos en una fila inferior.
 */
export class ArbolRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "arbol";
  /** Esquema de datos: raíz y entre 2 y 10 hijos. */
  readonly schema = '{"raiz":"texto","hijos":["texto"]} (entre 2 y 10 hijos)';

  /** Ancho reservado a cada hijo. */
  private static readonly HIJO_W = 280;
  /** Separación horizontal entre hijos. */
  private static readonly HIJO_GAP = 40;

  /**
   * Expande el lienzo si los hijos no caben en el ancho mínimo.
   * @param data Datos del diagrama.
   * @returns Ancho del lienzo en píxeles.
   */
  protected override ancho(data: any): number {
    const hijos: string[] = data.hijos ?? [];
    return Math.max(1600, hijos.length * ArbolRenderer.HIJO_W + (hijos.length - 1) * ArbolRenderer.HIJO_GAP + 100);
  }

  /**
   * Dibuja la raíz y sus hijos.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const hijos: string[] = data.hijos ?? [];
    this.drawRoot(ctx, data.raiz ?? "");
    hijos.forEach((s, i) => this.drawChild(ctx, s, i, hijos.length));
  }

  /**
   * Dibuja la caja de la raíz centrada arriba.
   * @param ctx Contexto 2D del canvas.
   * @param raiz Texto de la raíz.
   */
  private drawRoot(ctx: SKRSContext2D, raiz: string): void {
    this.box(ctx, (this.w - 460) / 2, 90, 460, 70, raiz, "#dbe9ff");
  }

  /**
   * Dibuja un hijo y su línea desde la raíz.
   * @param ctx Contexto 2D del canvas.
   * @param text Texto del hijo.
   * @param i Índice del hijo.
   * @param count Total de hijos.
   */
  private drawChild(ctx: SKRSContext2D, text: string, i: number, count: number): void {
    const total = count * ArbolRenderer.HIJO_W + (count - 1) * ArbolRenderer.HIJO_GAP;
    const x = (this.w - total) / 2 + i * (ArbolRenderer.HIJO_W + ArbolRenderer.HIJO_GAP);
    this.line(ctx, this.w / 2, 160, x + ArbolRenderer.HIJO_W / 2, 560);
    this.box(ctx, x, 560, ArbolRenderer.HIJO_W, 70, text);
  }
}
