import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un diagrama de flujo vertical con pasos encadenados.
 */
export class FlujoRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "flujo";
  /** Esquema de datos: entre 3 y 15 pasos. */
  readonly schema = '{"pasos":["texto"]} (entre 3 y 15 pasos)';

  /** Separación vertical mínima entre pasos. */
  private static readonly GAP_MIN = 48;

  /**
   * Expande el lienzo según la cantidad de pasos.
   * @param data Datos del diagrama.
   * @returns Alto del lienzo en píxeles.
   */
  protected override alto(data: any): number {
    return Math.max(900, 80 + (data.pasos ?? []).length * FlujoRenderer.GAP_MIN + 60);
  }

  /**
   * Dibuja los pasos y sus conectores.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const steps: string[] = data.pasos ?? [];
    const gap = Math.min(110, Math.max(FlujoRenderer.GAP_MIN, 800 / Math.max(steps.length, 1)));
    const h = Math.min(64, gap - 20);
    steps.forEach((s, i) => {
      this.drawStep(ctx, s, gap, h, i);
      if (i < steps.length - 1) this.drawConnector(ctx, gap, h, i);
    });
  }

  /**
   * Dibuja la caja de un paso.
   * @param ctx Contexto 2D del canvas.
   * @param text Texto del paso.
   * @param gap Separación vertical entre pasos.
   * @param h Alto de la caja.
   * @param i Índice del paso.
   */
  private drawStep(ctx: SKRSContext2D, text: string, gap: number, h: number, i: number): void {
    this.box(ctx, (this.w - 420) / 2, 80 + i * gap, 420, h, text);
  }

  /**
   * Dibuja la flecha entre un paso y el siguiente.
   * @param ctx Contexto 2D del canvas.
   * @param gap Separación vertical entre pasos.
   * @param h Alto de la caja.
   * @param i Índice del paso de origen.
   */
  private drawConnector(ctx: SKRSContext2D, gap: number, h: number, i: number): void {
    this.arrow(ctx, this.w / 2, 80 + i * gap + h, this.w / 2, 80 + (i + 1) * gap - 8);
  }
}
