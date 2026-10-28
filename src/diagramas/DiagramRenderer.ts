import { createCanvas } from "@napi-rs/canvas";
import type { SKRSContext2D } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";

export abstract class DiagramRenderer {
  private static readonly W_MIN = 1600;
  private static readonly H_MIN = 900;

  protected w = DiagramRenderer.W_MIN;
  protected h = DiagramRenderer.H_MIN;

  abstract readonly type: string;
  abstract readonly schema: string;
  protected abstract draw(ctx: SKRSContext2D, data: any): void;

  // Cada renderizador puede expandir el lienzo según sus datos (sin límites)
  protected ancho(data: any): number {
    return DiagramRenderer.W_MIN;
  }

  protected alto(data: any): number {
    return DiagramRenderer.H_MIN;
  }

  static prompt(renderer: DiagramRenderer, resumen: string): string {
    return `A partir del siguiente resumen, genera los datos para un diagrama de tipo "${renderer.type}" con esta estructura exacta: ${renderer.schema}\n\nLlama la herramienta renderizar_diagrama con tipo="${renderer.type}" y esos datos. Resumen: ${resumen}`;
  }

  render(file: string, data: any): void {
    this.w = Math.max(DiagramRenderer.W_MIN, this.ancho(data));
    this.h = Math.max(DiagramRenderer.H_MIN, this.alto(data));
    const canvas = createCanvas(this.w, this.h);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.fillStyle = "#111111";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.type, this.w / 2, 32);
    this.draw(ctx, data);
    writeFileSync(file, canvas.toBuffer("image/png"));
  }

  // ---------- helpers de dibujo compartidos (DRY) ----------

  protected roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r = 10): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  protected box(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, text: string, fill = "#ffffff", size = 15): void {
    ctx.fillStyle = fill;
    this.roundRect(ctx, x, y, w, h);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#111111";
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = this.wrap(ctx, String(text), w - 14);
    const startY = y + h / 2 - ((lines.length - 1) * (size + 4)) / 2;
    lines.forEach((l, i) => ctx.fillText(l, x + w / 2, startY + i * (size + 4)));
  }

  protected wrap(ctx: SKRSContext2D, text: string, max: number): string[] {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > max) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  protected arrow(ctx: SKRSContext2D, x1: number, y1: number, x2: number, y2: number): void {
    this.line(ctx, x1, y1, x2, y2);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 11 * Math.cos(ang - Math.PI / 6), y2 - 11 * Math.sin(ang - Math.PI / 6));
    ctx.lineTo(x2 - 11 * Math.cos(ang + Math.PI / 6), y2 - 11 * Math.sin(ang + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
  }

  protected line(ctx: SKRSContext2D, x1: number, y1: number, x2: number, y2: number): void {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  protected smallText(ctx: SKRSContext2D, text: string, x: number, y: number, align: "left" | "center" | "right" = "left", size = 14, color = "#111111"): void {
    ctx.fillStyle = color;
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }
}
