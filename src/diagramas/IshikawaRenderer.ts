import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

export class IshikawaRenderer extends DiagramRenderer {
  readonly type = "ishikawa";
  readonly schema = '{"problema":"texto","causas":[{"categoria":"texto","causas":["texto"]}]} (máximo 8 categorías y 6 causas por categoría)';

  private static readonly ESPINA_MIN = 1090;
  private static readonly INICIO = 120;

  protected override ancho(data: any): number {
    const top = Math.ceil((data.causas?.length ?? 0) / 2);
    return Math.max(1600, IshikawaRenderer.INICIO + Math.max(IshikawaRenderer.ESPINA_MIN, 300 * top) + 340);
  }

  protected override alto(data: any): number {
    const maxCausas = Math.max(1, ...(data.causas ?? []).map((c: any) => (c.causas ?? []).length));
    return Math.max(900, 2 * (44 + maxCausas * 24 + 60) + 80);
  }

  protected draw(ctx: SKRSContext2D, data: any): void {
    const midY = this.h / 2;
    const causas: any[] = data.causas ?? [];
    const largoEspina = Math.max(IshikawaRenderer.ESPINA_MIN, 300 * Math.ceil(causas.length / 2));
    this.drawSpine(ctx, midY, largoEspina);
    this.drawHead(ctx, data.problema ?? "", midY, largoEspina);
    causas.forEach((c, i) => {
      const bx = IshikawaRenderer.INICIO + (largoEspina * (i + 1)) / (causas.length + 1);
      this.drawBone(ctx, c, i, bx, midY);
    });
  }

  private drawSpine(ctx: SKRSContext2D, midY: number, largo: number): void {
    this.arrow(ctx, IshikawaRenderer.INICIO, midY, IshikawaRenderer.INICIO + largo, midY);
  }

  private drawHead(ctx: SKRSContext2D, problema: string, midY: number, largo: number): void {
    this.box(ctx, IshikawaRenderer.INICIO + largo + 20, midY - 55, 300, 110, problema, "#ffd9d9");
  }

  private drawBone(ctx: SKRSContext2D, categoria: any, i: number, bx: number, midY: number): void {
    const superior = i % 2 === 0;
    const list: string[] = categoria.causas ?? [];
    const h = 44 + list.length * 24;
    const cx = bx - 110;
    const boxY = superior ? midY - 60 - h : midY + 60;
    this.line(ctx, bx, midY, cx, superior ? boxY + h : boxY);
    this.drawCategory(ctx, categoria, list, cx, boxY);
  }

  private drawCategory(ctx: SKRSContext2D, categoria: any, list: string[], cx: number, boxY: number): void {
    const h = 44 + list.length * 24;
    ctx.fillStyle = "#eef4ff";
    this.roundRect(ctx, cx - 130, boxY, 260, h);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#111111";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(categoria.categoria ?? ""), cx, boxY + 22);
    list.forEach((causa, j) => this.smallText(ctx, `• ${causa}`, cx, boxY + 48 + j * 24, "center", 13));
  }
}
