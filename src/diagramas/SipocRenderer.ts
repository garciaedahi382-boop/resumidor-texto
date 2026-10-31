import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un diagrama SIPOC: proveedores, entradas, proceso, salidas y clientes.
 */
export class SipocRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "sipoc";
  /** Esquema de datos: cinco columnas con sus elementos. */
  readonly schema = '{"proveedores":["texto"],"entradas":["texto"],"proceso":["texto"],"salidas":["texto"],"clientes":["texto"]} (máximo 8 elementos por columna)';

  /** Margen horizontal del diagrama. */
  private static readonly MARGEN = 60;
  /** Espacio reservado sobre los encabezados. */
  private static readonly TOP = 110;
  /** Alto del encabezado de cada columna. */
  private static readonly ENCABEZADO_H = 56;
  /** Separación horizontal entre columnas. */
  private static readonly GAP = 24;
  /** Alto de cada elemento. */
  private static readonly ITEM_H = 46;
  /** Separación vertical entre elementos. */
  private static readonly ITEM_GAP = 14;
  /** Separación entre encabezado y primer elemento. */
  private static readonly SEPARACION = 26;

  /**
   * Expande el lienzo según la columna con más elementos.
   * @param data Datos del diagrama.
   * @returns Alto del lienzo en píxeles.
   */
  protected override alto(data: any): number {
    const maximo = Math.max(1, ...this.columnas(data).map((columna) => columna.items.length));
    return Math.max(
      900,
      SipocRenderer.TOP + SipocRenderer.ENCABEZADO_H + SipocRenderer.SEPARACION + maximo * (SipocRenderer.ITEM_H + SipocRenderer.ITEM_GAP) + 80,
    );
  }

  /**
   * Dibuja las cinco columnas con su encabezado y elementos.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const columnas = this.columnas(data);
    const ancho = this.anchoColumna(columnas.length);
    const x0 = (this.w - (columnas.length * ancho + (columnas.length - 1) * SipocRenderer.GAP)) / 2;
    columnas.forEach((columna, i) => {
      this.drawColumna(ctx, columna, x0 + i * (ancho + SipocRenderer.GAP), ancho);
    });
  }

  /**
   * Arma las cinco columnas del SIPOC con su título, color y elementos.
   * @param data Datos del diagrama.
   * @returns Columnas en orden SIPOC.
   */
  private columnas(data: any): { titulo: string; fill: string; items: string[] }[] {
    return [
      { titulo: "Proveedores", fill: "#dbe9ff", items: data.proveedores ?? [] },
      { titulo: "Entradas", fill: "#e6f4ea", items: data.entradas ?? [] },
      { titulo: "Proceso", fill: "#fff2cc", items: data.proceso ?? [] },
      { titulo: "Salidas", fill: "#fce8e6", items: data.salidas ?? [] },
      { titulo: "Clientes", fill: "#eef4ff", items: data.clientes ?? [] },
    ];
  }

  /**
   * Dibuja una columna completa: encabezado y elementos.
   * @param ctx Contexto 2D del canvas.
   * @param columna Columna con título, color y elementos.
   * @param x Coordenada X de la columna.
   * @param ancho Ancho de la columna.
   */
  private drawColumna(ctx: SKRSContext2D, columna: { titulo: string; fill: string; items: string[] }, x: number, ancho: number): void {
    ctx.fillStyle = columna.fill;
    this.roundRect(ctx, x, SipocRenderer.TOP, ancho, SipocRenderer.ENCABEZADO_H, 10);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();
    this.smallText(ctx, columna.titulo, x + ancho / 2, SipocRenderer.TOP + SipocRenderer.ENCABEZADO_H / 2, "center", 17);
    columna.items.forEach((item, i) => this.drawItem(ctx, columna, item, i, x, ancho));
  }

  /**
   * Dibuja un elemento de la columna; en el proceso los elementos se numeran y se conectan.
   * @param ctx Contexto 2D del canvas.
   * @param columna Columna a la que pertenece el elemento.
   * @param item Texto del elemento.
   * @param i Índice del elemento.
   * @param x Coordenada X de la columna.
   * @param ancho Ancho de la columna.
   */
  private drawItem(ctx: SKRSContext2D, columna: { titulo: string; fill: string; items: string[] }, item: string, i: number, x: number, ancho: number): void {
    const proceso = columna.titulo === "Proceso";
    const y = this.yItem(i);
    const texto = proceso ? `${i + 1}. ${item}` : item;
    this.box(ctx, x + 10, y, ancho - 20, SipocRenderer.ITEM_H, texto, columna.fill, 14);
    if (proceso && i < columna.items.length - 1) {
      this.arrow(ctx, x + ancho / 2, y + SipocRenderer.ITEM_H, x + ancho / 2, y + SipocRenderer.ITEM_H + SipocRenderer.ITEM_GAP);
    }
  }

  /**
   * Coordenada Y de un elemento según su índice.
   * @param i Índice del elemento.
   * @returns Coordenada Y en píxeles.
   */
  private yItem(i: number): number {
    return SipocRenderer.TOP + SipocRenderer.ENCABEZADO_H + SipocRenderer.SEPARACION + i * (SipocRenderer.ITEM_H + SipocRenderer.ITEM_GAP);
  }

  /**
   * Ancho de cada columna repartiendo el espacio disponible.
   * @param n Cantidad de columnas.
   * @returns Ancho en píxeles.
   */
  private anchoColumna(n: number): number {
    return (this.w - 2 * SipocRenderer.MARGEN - (n - 1) * SipocRenderer.GAP) / n;
  }
}
