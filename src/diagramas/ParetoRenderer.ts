import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un diagrama de Pareto: barras de frecuencia ordenadas de mayor a menor
 * y línea de porcentaje acumulado.
 */
export class ParetoRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "pareto";
  /** Esquema de datos: entre 2 y 12 causas con su frecuencia. */
  readonly schema = '{"causas":[{"nombre":"texto","valor":número}]} (entre 2 y 12 causas; se ordenan de mayor a menor)';

  /** Espacio reservado a las marcas de frecuencia. */
  private static readonly MARGEN_IZQ = 130;
  /** Espacio reservado a las marcas de porcentaje. */
  private static readonly MARGEN_DER = 110;
  /** Espacio reservado a la leyenda. */
  private static readonly MARGEN_SUP = 110;
  /** Espacio reservado a las etiquetas de las causas. */
  private static readonly MARGEN_INF = 110;
  /** Cantidad de divisiones de los ejes. */
  private static readonly DIVISIONES = 5;
  /** Porcentaje de referencia de la regla de Pareto. */
  private static readonly REFERENCIA = 80;

  /**
   * Dibuja ejes, barras, línea acumulada y línea de referencia del 80%.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const causas = this.ordenadas(data.causas ?? []);
    if (causas.length === 0) return;
    const total = causas.reduce((suma, c) => suma + Math.max(0, c.valor ?? 0), 0) || 1;
    const maximo = Math.max(1, ...causas.map((c) => Math.max(0, c.valor ?? 0)));
    this.drawEjes(ctx, maximo);
    this.drawBarras(ctx, causas, maximo);
    this.drawAcumulado(ctx, causas, total);
    this.drawReferencia(ctx);
    this.drawLeyenda(ctx);
  }

  /**
   * Ordena las causas de mayor a menor frecuencia.
   * @param causas Causas con `nombre` y `valor`.
   * @returns Causas ordenadas descendentemente.
   */
  private ordenadas(causas: any[]): any[] {
    return [...causas].sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
  }

  /**
   * Dibuja las líneas de referencia, ambas escalas y las etiquetas de las causas.
   * @param ctx Contexto 2D del canvas.
   * @param maximo Frecuencia máxima de las causas.
   */
  private drawEjes(ctx: SKRSContext2D, maximo: number): void {
    const x0 = ParetoRenderer.MARGEN_IZQ;
    const y0 = ParetoRenderer.MARGEN_SUP;
    const derecha = this.w - ParetoRenderer.MARGEN_DER;
    const alto = this.h - y0 - ParetoRenderer.MARGEN_INF;
    for (let i = 0; i <= ParetoRenderer.DIVISIONES; i++) {
      const y = y0 + (alto * i) / ParetoRenderer.DIVISIONES;
      this.line(ctx, x0, y, derecha, y);
      const frecuencia = (maximo * (ParetoRenderer.DIVISIONES - i)) / ParetoRenderer.DIVISIONES;
      const porcentaje = (100 * (ParetoRenderer.DIVISIONES - i)) / ParetoRenderer.DIVISIONES;
      this.smallText(ctx, this.formato(frecuencia), x0 - 16, y, "right", 14, "#555555");
      this.smallText(ctx, `${this.formato(porcentaje)}%`, derecha + 16, y, "left", 14, "#555555");
    }
    this.line(ctx, x0, y0, x0, y0 + alto);
    this.line(ctx, derecha, y0, derecha, y0 + alto);
  }

  /**
   * Dibuja las barras y el nombre de cada causa.
   * @param ctx Contexto 2D del canvas.
   * @param causas Causas ordenadas.
   * @param maximo Frecuencia máxima de las causas.
   */
  private drawBarras(ctx: SKRSContext2D, causas: any[], maximo: number): void {
    const ancho = this.anchoBarra(causas.length);
    causas.forEach((causa, i) => {
      const x = this.centro(i, causas.length) - ancho / 2;
      const base = this.h - ParetoRenderer.MARGEN_INF;
      const alto = (this.base(causa.valor ?? 0, maximo));
      ctx.fillStyle = "#5b9bd5";
      ctx.fillRect(x, base - alto, ancho, alto);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, base - alto, ancho, alto);
      this.smallText(ctx, this.formato(causa.valor ?? 0), x + ancho / 2, base - alto - 14, "center", 13);
      this.etiquetaCausa(ctx, String(causa.nombre ?? ""), x + ancho / 2, ancho);
    });
  }

  /**
   * Dibuja el nombre de una causa bajo su barra, ajustado en varias líneas.
   * @param ctx Contexto 2D del canvas.
   * @param nombre Nombre de la causa.
   * @param cx Coordenada X del centro de la barra.
   * @param ancho Ancho de la barra.
   */
  private etiquetaCausa(ctx: SKRSContext2D, nombre: string, cx: number, ancho: number): void {
    const lineas = this.wrap(ctx, nombre, ancho + 20);
    const base = this.h - ParetoRenderer.MARGEN_INF + 24;
    lineas.forEach((linea, j) => this.smallText(ctx, linea, cx, base + j * 19, "center", 14, "#555555"));
  }

  /**
   * Dibuja la línea de porcentaje acumulado con sus marcadores.
   * @param ctx Contexto 2D del canvas.
   * @param causas Causas ordenadas.
   * @param total Suma de frecuencias.
   */
  private drawAcumulado(ctx: SKRSContext2D, causas: any[], total: number): void {
    let acumulado = 0;
    const puntos = causas.map((causa, i) => {
      acumulado += Math.max(0, causa.valor ?? 0);
      return { x: this.centro(i, causas.length), y: this.alturaPorcentaje((acumulado / total) * 100), porcentaje: (acumulado / total) * 100 };
    });
    ctx.beginPath();
    puntos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = "#db4437";
    ctx.lineWidth = 3;
    ctx.stroke();
    puntos.forEach((p) => {
      this.drawPunto(ctx, p);
      this.smallText(ctx, `${Math.round(p.porcentaje)}%`, p.x, p.y - 16, "center", 13, "#db4437");
    });
  }

  /**
   * Dibuja el marcador de un punto de la línea acumulada.
   * @param ctx Contexto 2D del canvas.
   * @param p Punto con coordenadas y porcentaje.
   */
  private drawPunto(ctx: SKRSContext2D, p: { x: number; y: number }): void {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "#db4437";
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  /**
   * Dibuja la línea punteada de referencia del 80%.
   * @param ctx Contexto 2D del canvas.
   */
  private drawReferencia(ctx: SKRSContext2D): void {
    const y = this.alturaPorcentaje(ParetoRenderer.REFERENCIA);
    ctx.save();
    ctx.setLineDash([10, 8]);
    this.line(ctx, ParetoRenderer.MARGEN_IZQ, y, this.w - ParetoRenderer.MARGEN_DER, y);
    ctx.restore();
  }

  /**
   * Dibuja la leyenda de barras y línea acumulada.
   * @param ctx Contexto 2D del canvas.
   */
  private drawLeyenda(ctx: SKRSContext2D): void {
    ctx.fillStyle = "#5b9bd5";
    this.roundRect(ctx, 60, 60, 22, 22, 5);
    ctx.fill();
    this.smallText(ctx, "Frecuencia", 92, 71, "left", 16);
    ctx.fillStyle = "#db4437";
    this.roundRect(ctx, 260, 60, 22, 22, 5);
    ctx.fill();
    this.smallText(ctx, "Acumulado", 292, 71, "left", 16);
  }

  /**
   * Ancho de barra disponible según la cantidad de causas.
   * @param n Cantidad de causas.
   * @returns Ancho en píxeles.
   */
  private anchoBarra(n: number): number {
    return Math.min(160, Math.max(20, ((this.w - ParetoRenderer.MARGEN_IZQ - ParetoRenderer.MARGEN_DER) / Math.max(n, 1)) * 0.6));
  }

  /**
   * Coordenada X del centro de la barra i.
   * @param i Índice de la barra.
   * @param n Cantidad de causas.
   * @returns Coordenada X en píxeles.
   */
  private centro(i: number, n: number): number {
    const ancho = (this.w - ParetoRenderer.MARGEN_IZQ - ParetoRenderer.MARGEN_DER) / Math.max(n, 1);
    return ParetoRenderer.MARGEN_IZQ + ancho * (i + 0.5);
  }

  /**
   * Alto de una barra según su frecuencia.
   * @param valor Frecuencia de la causa.
   * @param maximo Frecuencia máxima.
   * @returns Alto en píxeles.
   */
  private base(valor: number, maximo: number): number {
    return (this.altoGrafico() * Math.max(0, valor)) / maximo;
  }

  /**
   * Coordenada Y de un porcentaje acumulado.
   * @param porcentaje Porcentaje entre 0 y 100.
   * @returns Coordenada Y en píxeles.
   */
  private alturaPorcentaje(porcentaje: number): number {
    return this.h - ParetoRenderer.MARGEN_INF - (this.altoGrafico() * porcentaje) / 100;
  }

  /**
   * Alto útil del área del gráfico.
   * @returns Alto en píxeles.
   */
  private altoGrafico(): number {
    return this.h - ParetoRenderer.MARGEN_SUP - ParetoRenderer.MARGEN_INF;
  }

  /**
   * Formatea un valor quitando decimales innecesarios.
   * @param valor Valor a formatear.
   * @returns Valor como texto.
   */
  private formato(valor: number): string {
    return Number.isInteger(valor) ? String(valor) : valor.toFixed(1);
  }
}
