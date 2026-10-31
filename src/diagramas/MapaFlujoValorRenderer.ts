import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un mapa de flujo de valor (VSM): pasos del proceso, esperas entre ellos
 * y la línea de tiempo con tiempo de valor y desperdicio.
 */
export class MapaFlujoValorRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "mapa-flujo-valor";
  /** Esquema de datos: pasos con tiempo de proceso, espera y tipo de valor. */
  readonly schema = '{"pasos":[{"nombre":"texto","tiempo":número,"espera":número,"valor":"valor|desperdicio"}]} (entre 2 y 10 pasos; espera es el tiempo muerto antes del paso siguiente)';

  /** Margen horizontal del mapa. */
  private static readonly MARGEN = 70;
  /** Ancho de cada paso. */
  private static readonly PASO_W = 230;
  /** Alto de cada paso. */
  private static readonly PASO_H = 100;
  /** Separación horizontal entre pasos. */
  private static readonly GAP = 90;
  /** Coordenada Y de la fila de pasos. */
  private static readonly TOP = 260;
  /** Alto de la franja de la línea de tiempo. */
  private static readonly LINEA_H = 34;
  /** Separación entre pasos y línea de tiempo. */
  private static readonly LINEA_GAP = 150;

  /**
   * Expande el lienzo según la cantidad de pasos.
   * @param data Datos del diagrama.
   * @returns Ancho del lienzo en píxeles.
   */
  protected override ancho(data: any): number {
    const n = (data.pasos ?? []).length;
    return Math.max(1600, 2 * MapaFlujoValorRenderer.MARGEN + n * MapaFlujoValorRenderer.PASO_W + Math.max(0, n - 1) * MapaFlujoValorRenderer.GAP);
  }

  /**
   * Dibuja los pasos, las esperas y la línea de tiempo con sus totales.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const pasos: any[] = data.pasos ?? [];
    if (pasos.length === 0) return;
    const x0 = this.centro(pasos);
    pasos.forEach((paso, i) => this.drawPaso(ctx, paso, x0 + i * (MapaFlujoValorRenderer.PASO_W + MapaFlujoValorRenderer.GAP)));
    this.drawLinea(ctx, pasos, x0);
  }

  /**
   * Coordenada X del primer paso para centrar la secuencia.
   * @param pasos Pasos del proceso.
   * @returns Coordenada X inicial en píxeles.
   */
  private centro(pasos: any[]): number {
    const total = pasos.length * MapaFlujoValorRenderer.PASO_W + (pasos.length - 1) * MapaFlujoValorRenderer.GAP;
    return (this.w - total) / 2;
  }

  /**
   * Dibuja un paso con su tiempo, la flecha siguiente y el triángulo de espera.
   * @param ctx Contexto 2D del canvas.
   * @param paso Paso con `nombre`, `tiempo`, `espera` y `valor`.
   * @param x Coordenada X del paso.
   */
  private drawPaso(ctx: SKRSContext2D, paso: any, x: number): void {
    const y = MapaFlujoValorRenderer.TOP;
    const fill = paso.valor === "desperdicio" ? "#fce8e6" : "#e6f4ea";
    this.box(ctx, x, y, MapaFlujoValorRenderer.PASO_W, MapaFlujoValorRenderer.PASO_H, paso.nombre ?? "", fill, 15);
    this.smallText(ctx, `T: ${this.formato(paso.tiempo)}`, x + MapaFlujoValorRenderer.PASO_W / 2, y + MapaFlujoValorRenderer.PASO_H + 22, "center", 14, "#555555");
    if (paso.espera === undefined) return;
    const xFin = x + MapaFlujoValorRenderer.PASO_W;
    this.arrow(ctx, xFin + 6, y + MapaFlujoValorRenderer.PASO_H / 2, xFin + MapaFlujoValorRenderer.GAP - 20, y + MapaFlujoValorRenderer.PASO_H / 2);
    this.drawEspera(ctx, paso.espera, xFin + MapaFlujoValorRenderer.GAP / 2, y - 40);
  }

  /**
   * Dibuja el triángulo de inventario con el tiempo de espera.
   * @param ctx Contexto 2D del canvas.
   * @param espera Tiempo de espera.
   * @param cx Coordenada X del centro del triángulo.
   * @param cy Coordenada Y de la base del triángulo.
   */
  private drawEspera(ctx: SKRSContext2D, espera: number, cx: number, cy: number): void {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 40);
    ctx.lineTo(cx + 32, cy);
    ctx.lineTo(cx - 32, cy);
    ctx.closePath();
    ctx.fillStyle = "#fff2cc";
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();
    this.smallText(ctx, `E: ${this.formato(espera)}`, cx, cy + 18, "center", 14, "#555555");
  }

  /**
   * Dibuja la línea de tiempo con los segmentos de valor y desperdicio, y sus totales.
   * @param ctx Contexto 2D del canvas.
   * @param pasos Pasos del proceso.
   * @param x0 Coordenada X del primer paso.
   */
  private drawLinea(ctx: SKRSContext2D, pasos: any[], x0: number): void {
    const total = this.total(pasos);
    const disponible = pasos.length * MapaFlujoValorRenderer.PASO_W + (pasos.length - 1) * MapaFlujoValorRenderer.GAP;
    const escala = disponible / Math.max(total, 1);
    const y = MapaFlujoValorRenderer.TOP + MapaFlujoValorRenderer.LINEA_GAP;
    let x = x0;
    pasos.forEach((paso) => {
      const tiempo = paso.valor === "desperdicio" ? "#db4437" : "#34a853";
      x = this.segmento(ctx, x, y, (paso.tiempo ?? 0) * escala, paso.tiempo, tiempo);
      x = this.segmento(ctx, x, y, (paso.espera ?? 0) * escala, paso.espera, "#db4437");
    });
    this.totales(ctx, pasos, total, y);
  }

  /**
   * Dibuja un segmento de la línea de tiempo.
   * @param ctx Contexto 2D del canvas.
   * @param x Coordenada X inicial del segmento.
   * @param y Coordenada Y del segmento.
   * @param ancho Ancho del segmento en píxeles.
   * @param valor Tiempo representado por el segmento.
   * @param color Color del segmento.
   * @returns Coordenada X del final del segmento.
   */
  private segmento(ctx: SKRSContext2D, x: number, y: number, ancho: number, valor: number, color: string): number {
    if (ancho <= 0) return x;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, ancho, MapaFlujoValorRenderer.LINEA_H);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, ancho, MapaFlujoValorRenderer.LINEA_H);
    if (ancho >= 44) this.smallText(ctx, this.formato(valor), x + ancho / 2, y + MapaFlujoValorRenderer.LINEA_H / 2, "center", 13, "#ffffff");
    return x + ancho;
  }

  /**
   * Dibuja los totales de valor, espera y eficiencia de la línea de tiempo.
   * @param ctx Contexto 2D del canvas.
   * @param pasos Pasos del proceso.
   * @param total Tiempo total del proceso.
   * @param y Coordenada Y de la línea de tiempo.
   */
  private totales(ctx: SKRSContext2D, pasos: any[], total: number, y: number): void {
    const valor = pasos.reduce((suma, paso) => suma + (paso.valor === "desperdicio" ? 0 : paso.tiempo ?? 0), 0);
    const eficiencia = total > 0 ? (valor / total) * 100 : 0;
    const texto = `Tiempo de valor: ${this.formato(valor)}  ·  Tiempo total: ${this.formato(total)}  ·  Eficiencia: ${Math.round(eficiencia)}%`;
    this.smallText(ctx, texto, this.w / 2, y + MapaFlujoValorRenderer.LINEA_H + 34, "center", 16);
  }

  /**
   * Tiempo total sumando procesos y esperas.
   * @param pasos Pasos del proceso.
   * @returns Tiempo total.
   */
  private total(pasos: any[]): number {
    return pasos.reduce((suma, paso) => suma + (paso.tiempo ?? 0) + (paso.espera ?? 0), 0);
  }

  /**
   * Formatea un tiempo quitando decimales innecesarios.
   * @param valor Tiempo a formatear.
   * @returns Tiempo como texto.
   */
  private formato(valor: number | undefined): string {
    const numero = valor ?? 0;
    return Number.isInteger(numero) ? String(numero) : numero.toFixed(1);
  }
}
