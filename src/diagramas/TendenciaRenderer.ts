import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un gráfico de tendencia: ejes, rejilla y una o varias series de líneas.
 */
export class TendenciaRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "tendencia";
  /** Esquema de datos: etiquetas del eje X y hasta 4 series de valores. */
  readonly schema = '{"etiquetas":["texto"],"series":[{"nombre":"texto","valores":[número]}]} (entre 2 y 12 etiquetas, máximo 4 series con un valor por etiqueta)';

  /** Espacio reservado a las marcas del eje Y. */
  private static readonly MARGEN_IZQ = 130;
  /** Espacio reservado a la leyenda. */
  private static readonly MARGEN_SUP = 110;
  /** Margen derecho. */
  private static readonly MARGEN_DER = 70;
  /** Espacio reservado a las etiquetas del eje X. */
  private static readonly MARGEN_INF = 90;
  /** Cantidad de líneas horizontales de referencia. */
  private static readonly DIVISIONES = 5;
  /** Colores de las series. */
  private static readonly COLORES = ["#4285f4", "#db4437", "#f4b400", "#34a853"];

  /**
   * Dibuja rejilla, ejes, etiquetas, series y leyenda.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const etiquetas: string[] = data.etiquetas ?? [];
    const series: any[] = data.series ?? [];
    if (etiquetas.length === 0 || series.length === 0) return;
    const escala = this.escala(series);
    this.drawRejilla(ctx, escala);
    this.drawEtiquetasX(ctx, etiquetas);
    series.forEach((s, i) => this.drawSerie(ctx, s, etiquetas.length, escala, i));
    this.drawLeyenda(ctx, series);
  }

  /**
   * Máximo de todas las series, redondeado hacia arriba para la escala.
   * @param series Series con `valores`.
   * @returns Valor máximo del eje Y, mínimo 1.
   */
  private escala(series: any[]): number {
    const maximo = Math.max(1, ...series.flatMap((s) => (s.valores ?? []).map((v: number) => v ?? 0)));
    const magnitud = Math.pow(10, Math.max(0, String(Math.ceil(maximo)).length - 2));
    return Math.ceil(maximo / magnitud) * magnitud;
  }

  /**
   * Dibuja las líneas horizontales de referencia y sus valores.
   * @param ctx Contexto 2D del canvas.
   * @param escala Valor máximo del eje Y.
   */
  private drawRejilla(ctx: SKRSContext2D, escala: number): void {
    const x0 = TendenciaRenderer.MARGEN_IZQ;
    const y0 = TendenciaRenderer.MARGEN_SUP;
    const alto = this.h - y0 - TendenciaRenderer.MARGEN_INF;
    for (let i = 0; i <= TendenciaRenderer.DIVISIONES; i++) {
      const y = y0 + (alto * i) / TendenciaRenderer.DIVISIONES;
      this.line(ctx, x0, y, this.w - TendenciaRenderer.MARGEN_DER, y);
      this.smallText(ctx, this.formato((escala * (TendenciaRenderer.DIVISIONES - i)) / TendenciaRenderer.DIVISIONES), x0 - 16, y, "right", 14, "#555555");
    }
    this.line(ctx, x0, y0, x0, y0 + alto);
  }

  /**
   * Dibuja las etiquetas del eje X.
   * @param ctx Contexto 2D del canvas.
   * @param etiquetas Etiquetas de cada punto.
   */
  private drawEtiquetasX(ctx: SKRSContext2D, etiquetas: string[]): void {
    const x0 = TendenciaRenderer.MARGEN_IZQ;
    const paso = (this.w - x0 - TendenciaRenderer.MARGEN_DER) / Math.max(etiquetas.length, 1);
    const y = this.h - TendenciaRenderer.MARGEN_INF + 26;
    etiquetas.forEach((etiqueta, i) => {
      this.smallText(ctx, etiqueta, x0 + paso * (i + 0.5), y, "center", 14, "#555555");
    });
  }

  /**
   * Dibuja la línea y los puntos de una serie.
   * @param ctx Contexto 2D del canvas.
   * @param serie Serie con `nombre` y `valores`.
   * @param n Cantidad de etiquetas del eje X.
   * @param escala Valor máximo del eje Y.
   * @param indice Índice de la serie, usado para elegir el color.
   */
  private drawSerie(ctx: SKRSContext2D, serie: any, n: number, escala: number, indice: number): void {
    const valores: number[] = serie.valores ?? [];
    if (valores.length !== n) return;
    const color = TendenciaRenderer.COLORES[indice % TendenciaRenderer.COLORES.length] ?? "#4285f4";
    ctx.beginPath();
    valores.forEach((valor, i) => {
      const { x, y } = this.punto(i, valor ?? 0, n, escala);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    valores.forEach((valor, i) => this.drawPunto(ctx, this.punto(i, valor ?? 0, n, escala), color));
  }

  /**
   * Coordenadas de un punto de la serie.
   * @param i Índice del punto.
   * @param valor Valor del punto.
   * @param n Cantidad de etiquetas del eje X.
   * @param escala Valor máximo del eje Y.
   * @returns Coordenadas del punto en el canvas.
   */
  private punto(i: number, valor: number, n: number, escala: number): { x: number; y: number } {
    const x0 = TendenciaRenderer.MARGEN_IZQ;
    const y0 = TendenciaRenderer.MARGEN_SUP;
    const ancho = this.w - x0 - TendenciaRenderer.MARGEN_DER;
    const alto = this.h - y0 - TendenciaRenderer.MARGEN_INF;
    return {
      x: x0 + (ancho * (i + 0.5)) / Math.max(n, 1),
      y: y0 + alto - (alto * Math.max(0, valor)) / escala,
    };
  }

  /**
   * Dibuja el marcador de un punto de la serie.
   * @param ctx Contexto 2D del canvas.
   * @param p Coordenadas del punto.
   * @param color Color de la serie.
   */
  private drawPunto(ctx: SKRSContext2D, p: { x: number; y: number }, color: string): void {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  /**
   * Dibuja el nombre de cada serie con su color.
   * @param ctx Contexto 2D del canvas.
   * @param series Series del diagrama.
   */
  private drawLeyenda(ctx: SKRSContext2D, series: any[]): void {
    series.forEach((s, i) => {
      const x = 60 + i * 260;
      ctx.fillStyle = TendenciaRenderer.COLORES[i % TendenciaRenderer.COLORES.length] ?? "#4285f4";
      this.roundRect(ctx, x, 60, 22, 22, 5);
      ctx.fill();
      this.smallText(ctx, String(s.nombre ?? ""), x + 32, 71, "left", 16);
    });
  }

  /**
   * Formatea un valor del eje Y quitando decimales innecesarios.
   * @param valor Valor a formatear.
   * @returns Valor como texto.
   */
  private formato(valor: number): string {
    return Number.isInteger(valor) ? String(valor) : valor.toFixed(1);
  }
}
