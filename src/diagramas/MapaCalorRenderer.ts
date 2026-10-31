import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un mapa de calor o matriz de riesgos: celdas coloreadas por intensidad
 * y textos opcionales dentro de cada celda.
 */
export class MapaCalorRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "mapa-calor";
  /** Esquema de datos: filas, columnas y celdas con valor 0..100 y texto opcional. */
  readonly schema = '{"filas":["texto"],"columnas":["texto"],"ejeX":"texto","ejeY":"texto","celdas":[{"fila":0,"columna":0,"valor":0..100,"texto":"opcional"}]} (máximo 8 filas y 8 columnas)';

  /** Espacio reservado a las etiquetas de fila. */
  private static readonly MARGEN_IZQ = 220;
  /** Espacio reservado a las etiquetas de columna. */
  private static readonly MARGEN_SUP = 110;
  /** Margen derecho. */
  private static readonly MARGEN_DER = 60;
  /** Espacio reservado a los títulos de los ejes. */
  private static readonly MARGEN_INF = 90;

  /**
   * Dibuja etiquetas, celdas y títulos de los ejes.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const filas: string[] = data.filas ?? [];
    const columnas: string[] = data.columnas ?? [];
    const celdas: any[] = data.celdas ?? [];
    if (filas.length === 0 || columnas.length === 0) return;
    const ancho = (this.w - MapaCalorRenderer.MARGEN_IZQ - MapaCalorRenderer.MARGEN_DER) / columnas.length;
    const alto = (this.h - MapaCalorRenderer.MARGEN_SUP - MapaCalorRenderer.MARGEN_INF) / filas.length;
    this.drawEtiquetas(ctx, filas, columnas, ancho, alto);
    this.drawCeldas(ctx, filas.length, columnas.length, celdas, ancho, alto);
    this.drawTitulos(ctx, data.ejeX ?? "", data.ejeY ?? "");
  }

  /**
   * Dibuja las etiquetas de filas (izquierda) y columnas (arriba).
   * @param ctx Contexto 2D del canvas.
   * @param filas Etiquetas de las filas.
   * @param columnas Etiquetas de las columnas.
   * @param ancho Ancho de cada celda.
   * @param alto Alto de cada celda.
   */
  private drawEtiquetas(ctx: SKRSContext2D, filas: string[], columnas: string[], ancho: number, alto: number): void {
    const x0 = MapaCalorRenderer.MARGEN_IZQ;
    const y0 = MapaCalorRenderer.MARGEN_SUP;
    filas.forEach((fila, i) => {
      ctx.fillStyle = "#111111";
      ctx.font = "15px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      this.wrap(ctx, fila, x0 - 24).forEach((linea, j, lineas) => {
        ctx.fillText(linea, x0 - 16, y0 + i * alto + alto / 2 + (j - (lineas.length - 1) / 2) * 19);
      });
    });
    columnas.forEach((columna, i) => {
      ctx.fillStyle = "#111111";
      ctx.font = "15px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const lineas = this.wrap(ctx, columna, ancho - 16);
      lineas.forEach((linea, j) => {
        ctx.fillText(linea, x0 + i * ancho + ancho / 2, y0 - 12 - (lineas.length - 1 - j) * 19);
      });
    });
  }

  /**
   * Dibuja las celdas con relleno según su valor y su texto opcional.
   * @param ctx Contexto 2D del canvas.
   * @param filas Cantidad de filas de la matriz.
   * @param columnas Cantidad de columnas de la matriz.
   * @param celdas Celdas con `fila`, `columna`, `valor` y `texto` opcional.
   * @param ancho Ancho de cada celda.
   * @param alto Alto de cada celda.
   */
  private drawCeldas(ctx: SKRSContext2D, filas: number, columnas: number, celdas: any[], ancho: number, alto: number): void {
    const x0 = MapaCalorRenderer.MARGEN_IZQ;
    const y0 = MapaCalorRenderer.MARGEN_SUP;
    const porCelda = new Map(celdas.map((celda) => [`${celda.fila}:${celda.columna}`, celda]));
    for (let fila = 0; fila < filas; fila++) {
      for (let columna = 0; columna < columnas; columna++) {
        const celda = porCelda.get(`${fila}:${columna}`);
        const x = x0 + columna * ancho;
        const y = y0 + fila * alto;
        ctx.fillStyle = celda ? this.color(celda.valor ?? 0) : "#f8f8f8";
        ctx.fillRect(x, y, ancho, alto);
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, ancho, alto);
        if (celda?.texto) {
          this.smallText(ctx, String(celda.texto), x + ancho / 2, y + alto / 2, "center", 14);
        }
      }
    }
  }

  /**
   * Dibuja los títulos opcionales de los ejes.
   * @param ctx Contexto 2D del canvas.
   * @param ejeX Título del eje horizontal.
   * @param ejeY Título del eje vertical.
   */
  private drawTitulos(ctx: SKRSContext2D, ejeX: string, ejeY: string): void {
    if (ejeX) this.smallText(ctx, ejeX, this.w / 2, this.h - 28, "center", 16);
    if (!ejeY) return;
    ctx.save();
    ctx.translate(34, this.h / 2);
    ctx.rotate(-Math.PI / 2);
    this.smallText(ctx, ejeY, 0, 0, "center", 16);
    ctx.restore();
  }

  /**
   * Color de relleno según el valor: verde (0) a rojo (100), con transparencia.
   * @param valor Valor de la celda entre 0 y 100.
   * @returns Color en formato `hsla`.
   */
  private color(valor: number): string {
    const v = Math.max(0, Math.min(100, valor));
    return `hsla(${(1 - v / 100) * 120}, 80%, 55%, 0.55)`;
  }
}
