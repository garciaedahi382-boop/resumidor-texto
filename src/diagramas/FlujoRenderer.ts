import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

export class FlujoRenderer extends DiagramRenderer {
  readonly type = "flujo";
  readonly schema = '{"pasos":["texto"]} (entre 3 y 15 pasos)';

  private static readonly GAP_MIN = 48;

  protected override alto(data: any): number {
    return Math.max(900, 80 + (data.pasos ?? []).length * FlujoRenderer.GAP_MIN + 60);
  }

  protected draw(ctx: SKRSContext2D, data: any): void {
    const steps: string[] = data.pasos ?? [];
    const gap = Math.min(110, Math.max(FlujoRenderer.GAP_MIN, 800 / Math.max(steps.length, 1)));
    const h = Math.min(64, gap - 20);
    steps.forEach((s, i) => {
      this.drawStep(ctx, s, gap, h, i);
      if (i < steps.length - 1) this.drawConnector(ctx, gap, h, i);
    });
  }

  private drawStep(ctx: SKRSContext2D, text: string, gap: number, h: number, i: number): void {
    this.box(ctx, (this.w - 420) / 2, 80 + i * gap, 420, h, text);
  }

  private drawConnector(ctx: SKRSContext2D, gap: number, h: number, i: number): void {
    this.arrow(ctx, this.w / 2, 80 + i * gap + h, this.w / 2, 80 + (i + 1) * gap - 8);
  }
}
