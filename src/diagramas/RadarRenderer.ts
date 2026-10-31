import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un gráfico de radar: ejes concéntricos y una o varias series de valores.
 */
export class RadarRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "radar";
  /** Esquema de datos: entre 3 y 8 ejes y hasta 4 series con valores de 0 a 100. */
  readonly schema = '{"ejes":["texto"],"series":[{"nombre":"texto","valores":[0..100]}]} (entre 3 y 8 ejes, máximo 4 series, valores de 0 a 100)';

  /** Radio máximo de la telaraña. */
  private static readonly RADIO = 320;
  /** Cantidad de anillos de la rejilla. */
  private static readonly ANILLOS = 4;
  /** Colores de relleno de las series. */
  private static readonly COLORES = ["rgba(66,133,244,0.30)", "rgba(219,68,55,0.30)", "rgba(244,180,0,0.30)", "rgba(52,168,83,0.30)"];

  /**
   * Dibuja rejilla, ejes, etiquetas y series.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const ejes: string[] = data.ejes ?? [];
    const series: any[] = data.series ?? [];
    const cx = this.w / 2;
    const cy = this.h / 2 + 20;
    this.drawGrid(ctx, ejes.length, cx, cy);
    this.drawLabels(ctx, ejes, cx, cy);
    series.forEach((s, i) => this.drawSerie(ctx, s, ejes.length, cx, cy, i));
    this.drawLeyenda(ctx, series);
  }

  /**
   * Dibuja los anillos concéntricos y los radios de los ejes.
   * @param ctx Contexto 2D del canvas.
   * @param n Cantidad de ejes.
   * @param cx Coordenada X del centro.
   * @param cy Coordenada Y del centro.
   */
  private drawGrid(ctx: SKRSContext2D, n: number, cx: number, cy: number): void {
    if (n < 3) return;
    for (let anillo = 1; anillo <= RadarRenderer.ANILLOS; anillo++) {
      this.trazo(ctx, n, cx, cy, (RadarRenderer.RADIO * anillo) / RadarRenderer.ANILLOS);
      ctx.strokeStyle = anillo === RadarRenderer.ANILLOS ? "#1a1a1a" : "#cccccc";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (let i = 0; i < n; i++) {
      const ang = this.angulo(i, n);
      this.line(ctx, cx, cy, cx + RadarRenderer.RADIO * Math.cos(ang), cy + RadarRenderer.RADIO * Math.sin(ang));
    }
  }

  /**
   * Dibuja la etiqueta de cada eje fuera de la telaraña.
   * @param ctx Contexto 2D del canvas.
   * @param ejes Etiquetas de los ejes.
   * @param cx Coordenada X del centro.
   * @param cy Coordenada Y del centro.
   */
  private drawLabels(ctx: SKRSContext2D, ejes: string[], cx: number, cy: number): void {
    ejes.forEach((eje, i) => {
      const ang = this.angulo(i, ejes.length);
      const x = cx + (RadarRenderer.RADIO + 30) * Math.cos(ang);
      const y = cy + (RadarRenderer.RADIO + 30) * Math.sin(ang);
      const align = Math.abs(Math.cos(ang)) < 0.2 ? "center" : Math.cos(ang) > 0 ? "left" : "right";
      this.smallText(ctx, eje, x, y, align, 16);
    });
  }

  /**
   * Dibuja el polígono de una serie con sus vértices.
   * @param ctx Contexto 2D del canvas.
   * @param serie Serie con `nombre` y `valores`.
   * @param n Cantidad de ejes.
   * @param cx Coordenada X del centro.
   * @param cy Coordenada Y del centro.
   * @param indice Índice de la serie, usado para elegir el color.
   */
  private drawSerie(ctx: SKRSContext2D, serie: any, n: number, cx: number, cy: number, indice: number): void {
    const valores: number[] = serie.valores ?? [];
    if (n < 3 || valores.length !== n) return;
    ctx.beginPath();
    valores.forEach((valor, i) => {
      const ang = this.angulo(i, n);
      const r = (RadarRenderer.RADIO * Math.max(0, Math.min(100, valor ?? 0))) / 100;
      const x = cx + r * Math.cos(ang);
      const y = cy + r * Math.sin(ang);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = RadarRenderer.COLORES[indice % RadarRenderer.COLORES.length] ?? "rgba(66,133,244,0.30)";
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();
    valores.forEach((valor, i) => {
      const ang = this.angulo(i, n);
      const r = (RadarRenderer.RADIO * Math.max(0, Math.min(100, valor ?? 0))) / 100;
      this.punto(ctx, cx + r * Math.cos(ang), cy + r * Math.sin(ang), indice);
    });
  }

  /**
   * Dibuja el nombre de cada serie con su color.
   * @param ctx Contexto 2D del canvas.
   * @param series Series del diagrama.
   */
  private drawLeyenda(ctx: SKRSContext2D, series: any[]): void {
    series.forEach((s, i) => {
      const y = 70 + i * 30;
      ctx.fillStyle = RadarRenderer.COLORES[i % RadarRenderer.COLORES.length] ?? "rgba(66,133,244,0.30)";
      this.roundRect(ctx, 60, y - 10, 22, 22, 5);
      ctx.fill();
      this.smallText(ctx, String(s.nombre ?? ""), 92, y + 1, "left", 16);
    });
  }

  /**
   * Traza el camino del polígono de un anillo.
   * @param ctx Contexto 2D del canvas.
   * @param n Cantidad de ejes.
   * @param cx Coordenada X del centro.
   * @param cy Coordenada Y del centro.
   * @param radio Radio del anillo.
   */
  private trazo(ctx: SKRSContext2D, n: number, cx: number, cy: number, radio: number): void {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const ang = this.angulo(i, n);
      const x = cx + radio * Math.cos(ang);
      const y = cy + radio * Math.sin(ang);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  /**
   * Dibuja el vértice de una serie.
   * @param ctx Contexto 2D del canvas.
   * @param x Coordenada X del vértice.
   * @param y Coordenada Y del vértice.
   * @param indice Índice de la serie, usado para elegir el color.
   */
  private punto(ctx: SKRSContext2D, x: number, y: number, indice: number): void {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = RadarRenderer.COLORES[indice % RadarRenderer.COLORES.length] ?? "rgba(66,133,244,0.30)";
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  /**
   * Ángulo del eje i, empezando arriba y repartido en sentido horario.
   * @param i Índice del eje.
   * @param n Cantidad de ejes.
   * @returns Ángulo en radianes.
   */
  private angulo(i: number, n: number): number {
    return -Math.PI / 2 + (2 * Math.PI * i) / n;
  }
}
