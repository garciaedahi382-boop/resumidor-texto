import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un diagrama de Ishikawa: espina central, categorías en huesos y problema en la cabeza.
 */
export class IshikawaRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "ishikawa";
  /** Esquema de datos: problema y hasta 8 categorías con 6 causas cada una. */
  readonly schema = '{"problema":"texto","causas":[{"categoria":"texto","causas":["texto"]}]} (máximo 8 categorías y 6 causas por categoría)';

  /** Largo mínimo de la espina central. */
  private static readonly ESPINA_MIN = 1090;
  /** Coordenada X donde comienza la espina. */
  private static readonly INICIO = 120;

  /**
   * Expande el lienzo según la cantidad de categorías.
   * @param data Datos del diagrama.
   * @returns Ancho del lienzo en píxeles.
   */
  protected override ancho(data: any): number {
    const top = Math.ceil((data.causas?.length ?? 0) / 2);
    return Math.max(1600, IshikawaRenderer.INICIO + Math.max(IshikawaRenderer.ESPINA_MIN, 300 * top) + 340);
  }

  /**
   * Expande el lienzo según la categoría con más causas.
   * @param data Datos del diagrama.
   * @returns Alto del lienzo en píxeles.
   */
  protected override alto(data: any): number {
    const maxCausas = Math.max(1, ...(data.causas ?? []).map((c: any) => (c.causas ?? []).length));
    return Math.max(900, 2 * (44 + maxCausas * 24 + 60) + 80);
  }

  /**
   * Dibuja la espina, la cabeza y los huesos de cada categoría.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
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

  /**
   * Dibuja la espina central con punta de flecha.
   * @param ctx Contexto 2D del canvas.
   * @param midY Coordenada Y de la espina.
   * @param largo Largo de la espina.
   */
  private drawSpine(ctx: SKRSContext2D, midY: number, largo: number): void {
    this.arrow(ctx, IshikawaRenderer.INICIO, midY, IshikawaRenderer.INICIO + largo, midY);
  }

  /**
   * Dibuja la caja del problema al final de la espina.
   * @param ctx Contexto 2D del canvas.
   * @param problema Texto del problema.
   * @param midY Coordenada Y de la espina.
   * @param largo Largo de la espina.
   */
  private drawHead(ctx: SKRSContext2D, problema: string, midY: number, largo: number): void {
    this.box(ctx, IshikawaRenderer.INICIO + largo + 20, midY - 55, 300, 110, problema, "#ffd9d9");
  }

  /**
   * Dibuja el hueso y la caja de una categoría, alternando arriba y abajo.
   * @param ctx Contexto 2D del canvas.
   * @param categoria Categoría con `categoria` y `causas`.
   * @param i Índice de la categoría.
   * @param bx Coordenada X del hueso sobre la espina.
   * @param midY Coordenada Y de la espina.
   */
  private drawBone(ctx: SKRSContext2D, categoria: any, i: number, bx: number, midY: number): void {
    const superior = i % 2 === 0;
    const list: string[] = categoria.causas ?? [];
    const h = 44 + list.length * 24;
    const cx = bx - 110;
    const boxY = superior ? midY - 60 - h : midY + 60;
    this.line(ctx, bx, midY, cx, superior ? boxY + h : boxY);
    this.drawCategory(ctx, categoria, list, cx, boxY);
  }

  /**
   * Dibuja la caja de la categoría con su lista de causas.
   * @param ctx Contexto 2D del canvas.
   * @param categoria Categoría con `categoria` y `causas`.
   * @param list Causas de la categoría.
   * @param cx Coordenada X del centro de la caja.
   * @param boxY Coordenada Y de la parte superior de la caja.
   */
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
