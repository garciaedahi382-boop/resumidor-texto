import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

export class VennRenderer extends DiagramRenderer {
  readonly type = "venn";
  readonly schema = '{"conjuntos":[{"etiqueta":"texto","elementos":["texto"]}]} (entre 2 y 5 conjuntos, máximo 6 elementos por conjunto)';

  private static readonly R_CIRCULO = 200;

  protected override ancho(data: any): number {
    const n = (data.conjuntos ?? []).length;
    return Math.max(1600, 2 * (VennRenderer.radioAnillo(n) + VennRenderer.R_CIRCULO + 150));
  }

  protected override alto(data: any): number {
    const n = (data.conjuntos ?? []).length;
    return Math.max(900, 2 * (VennRenderer.radioAnillo(n) + VennRenderer.R_CIRCULO + 150));
  }

  private static radioAnillo(n: number): number {
    return n <= 3 ? 150 : Math.max(150, n * 60);
  }

  protected draw(ctx: SKRSContext2D, data: any): void {
    const sets: any[] = data.conjuntos ?? [];
    const anillo = VennRenderer.radioAnillo(sets.length);
    const cx = this.w / 2, cy = this.h / 2;
    const r = VennRenderer.R_CIRCULO;
    const colores = ["rgba(66,133,244,0.30)", "rgba(219,68,55,0.30)", "rgba(244,180,0,0.30)", "rgba(52,168,83,0.30)", "rgba(171,71,188,0.30)"];
    sets.forEach((s, i) => {
      const ang = (2 * Math.PI * i) / Math.max(sets.length, 1);
      const c = sets.length === 1 ? { x: cx, y: cy } : { x: cx + anillo * Math.cos(ang), y: cy + anillo * Math.sin(ang) };
      const dir = { x: Math.cos(ang), y: Math.sin(ang) };
      this.drawCirculo(ctx, c, r, colores[i % colores.length] ?? "rgba(66,133,244,0.30)");
      this.drawEtiqueta(ctx, s, c, dir, r);
      this.drawElementos(ctx, s, c, dir, r);
    });
  }

  private drawCirculo(ctx: SKRSContext2D, c: { x: number; y: number }, r: number, fill: string): void {
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawEtiqueta(ctx: SKRSContext2D, set: any, c: { x: number; y: number }, dir: { x: number; y: number }, r: number): void {
    this.smallText(ctx, String(set.etiqueta ?? ""), c.x + dir.x * r * 0.62, c.y + dir.y * r * 0.62 - (dir.y === 0 ? 60 : 0), "center", 18);
  }

  private drawElementos(ctx: SKRSContext2D, set: any, c: { x: number; y: number }, dir: { x: number; y: number }, r: number): void {
    const elems: string[] = set.elementos ?? [];
    const sx = c.x + dir.x * r * 0.3;
    const sy = c.y + dir.y * r * 0.3;
    elems.forEach((e, j) => this.smallText(ctx, `• ${e}`, sx, sy - ((elems.length - 1) * 24) / 2 + j * 24, "center", 14));
  }
}
