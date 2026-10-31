import { createCanvas } from "@napi-rs/canvas";
import type { SKRSContext2D } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";

/**
 * Base de todos los renderizadores: define el tipo, el esquema de datos y el
 * dibujo sobre un canvas PNG de tamaño mínimo fijo.
 */
export abstract class DiagramRenderer {
  /** Ancho mínimo del lienzo en píxeles. */
  private static readonly W_MIN = 1600;
  /** Alto mínimo del lienzo en píxeles. */
  private static readonly H_MIN = 900;

  /** Ancho actual del lienzo. */
  protected w = DiagramRenderer.W_MIN;
  /** Alto actual del lienzo. */
  protected h = DiagramRenderer.H_MIN;

  /** Tipo de diagrama (`ishikawa`, `venn`, ...). */
  abstract readonly type: string;
  /** Extensión del archivo generado. */
  readonly extension = "png";
  /** Directorio de salida del archivo generado. */
  readonly dir = "diagramas";
  /** Descripción textual de los datos que espera `draw`. */
  abstract readonly schema: string;

  /**
   * Dibuja los datos del diagrama sobre el contexto ya preparado.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos JSON del diagrama.
   */
  protected abstract draw(ctx: SKRSContext2D, data: any): void;

  /**
   * Cada renderizador puede expandir el lienzo según sus datos (sin límites).
   * @param data Datos JSON del diagrama.
   * @returns Ancho del lienzo en píxeles.
   */
  protected ancho(data: any): number {
    return DiagramRenderer.W_MIN;
  }

  /**
   * Cada renderizador puede expandir el lienzo según sus datos (sin límites).
   * @param data Datos JSON del diagrama.
   * @returns Alto del lienzo en píxeles.
   */
  protected alto(data: any): number {
    return DiagramRenderer.H_MIN;
  }

  /**
   * Construye la instrucción que pide al agente los datos de un diagrama o documento.
   * @param entidad Entidad que define el tipo y el esquema de datos.
   * @param texto Texto del que se extraen los datos.
   * @param herramienta Nombre de la herramienta que el agente debe llamar.
   * @returns Prompt para el agente.
   */
  static prompt(entidad: { type: string; schema: string }, texto: string, herramienta = "renderizar_diagrama"): string {
    return `A partir del siguiente texto, genera los datos del elemento de tipo "${entidad.type}" con esta estructura exacta: ${entidad.schema}\n\nLlama la herramienta ${herramienta} con tipo="${entidad.type}" y esos datos. Texto: ${texto}`;
  }

  /**
   * Calcula el tamaño del lienzo, dibuja el título y los datos, y escribe el PNG.
   * @param file Ruta del archivo PNG a escribir.
   * @param data Datos JSON del diagrama.
   */
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

  /**
   * Traza el camino de un rectángulo redondeado.
   * @param ctx Contexto 2D del canvas.
   * @param x Coordenada X de la esquina superior izquierda.
   * @param y Coordenada Y de la esquina superior izquierda.
   * @param w Ancho del rectángulo.
   * @param h Alto del rectángulo.
   * @param r Radio de las esquinas.
   */
  protected roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r = 10): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /**
   * Dibuja una caja con borde y texto ajustado al ancho.
   * @param ctx Contexto 2D del canvas.
   * @param x Coordenada X de la esquina superior izquierda.
   * @param y Coordenada Y de la esquina superior izquierda.
   * @param w Ancho de la caja.
   * @param h Alto de la caja.
   * @param text Texto a mostrar.
   * @param fill Color de relleno.
   * @param size Tamaño de fuente en píxeles.
   */
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

  /**
   * Ajusta un texto en líneas que caben en un ancho dado.
   * @param ctx Contexto 2D del canvas.
   * @param text Texto a ajustar.
   * @param max Ancho máximo en píxeles.
   * @returns Líneas resultantes.
   */
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

  /**
   * Dibuja una flecha entre dos puntos.
   * @param ctx Contexto 2D del canvas.
   * @param x1 Coordenada X del origen.
   * @param y1 Coordenada Y del origen.
   * @param x2 Coordenada X de la punta.
   * @param y2 Coordenada Y de la punta.
   */
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

  /**
   * Dibuja una línea recta.
   * @param ctx Contexto 2D del canvas.
   * @param x1 Coordenada X del inicio.
   * @param y1 Coordenada Y del inicio.
   * @param x2 Coordenada X del final.
   * @param y2 Coordenada Y del final.
   */
  protected line(ctx: SKRSContext2D, x1: number, y1: number, x2: number, y2: number): void {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * Dibuja texto simple con alineación y estilo configurables.
   * @param ctx Contexto 2D del canvas.
   * @param text Texto a mostrar.
   * @param x Coordenada X del punto de anclaje.
   * @param y Coordenada Y del punto de anclaje.
   * @param align Alineación horizontal del texto.
   * @param size Tamaño de fuente en píxeles.
   * @param color Color del texto.
   */
  protected smallText(ctx: SKRSContext2D, text: string, x: number, y: number, align: "left" | "center" | "right" = "left", size = 14, color = "#111111"): void {
    ctx.fillStyle = color;
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }
}
