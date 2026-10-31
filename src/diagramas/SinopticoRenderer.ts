import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un cuadro sinóptico: raíz a la izquierda y ramas con hojas a la derecha.
 */
export class SinopticoRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "cuadro-sinoptico";
  /** Esquema de datos: raíz y hasta 10 ramas con 5 hojas cada una. */
  readonly schema = '{"raiz":"texto","ramas":[{"titulo":"texto","hojas":["texto"]}]} (máximo 10 ramas y 5 hojas por rama)';

  /** Alto mínimo reservado a cada rama. */
  private static readonly FILA_MIN = 64;

  /**
   * Expande el lienzo según ramas y hojas.
   * @param data Datos del diagrama.
   * @returns Alto del lienzo en píxeles.
   */
  protected override alto(data: any): number {
    const ramas: any[] = data.ramas ?? [];
    const hojasMax = Math.max(0, ...ramas.map((r) => (r.hojas ?? []).length));
    return Math.max(900, 120 + ramas.length * SinopticoRenderer.FILA_MIN, 160 + hojasMax * 26);
  }

  /**
   * Dibuja la raíz y todas las ramas.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const ramas: any[] = data.ramas ?? [];
    const rowH = (this.h - 120) / Math.max(ramas.length, 1);
    this.drawRoot(ctx, data.raiz ?? "");
    ramas.forEach((r, i) => this.drawBranch(ctx, r, 60 + i * rowH + rowH / 2));
  }

  /**
   * Dibuja la caja de la raíz al centro izquierdo.
   * @param ctx Contexto 2D del canvas.
   * @param raiz Texto de la raíz.
   */
  private drawRoot(ctx: SKRSContext2D, raiz: string): void {
    this.box(ctx, 70, this.h / 2 - 45, 280, 90, raiz, "#dbe9ff");
  }

  /**
   * Dibuja una rama y la línea que la une con la raíz.
   * @param ctx Contexto 2D del canvas.
   * @param rama Rama con `titulo` y `hojas`.
   * @param cy Coordenada Y del centro de la rama.
   */
  private drawBranch(ctx: SKRSContext2D, rama: any, cy: number): void {
    this.line(ctx, 350, this.h / 2, 560, cy);
    this.box(ctx, 560, cy - 25, 260, 50, rama.titulo ?? "", "#eef4ff");
    this.drawLeaves(ctx, rama.hojas ?? [], cy);
  }

  /**
   * Dibuja las hojas de una rama en columna.
   * @param ctx Contexto 2D del canvas.
   * @param hojas Textos de las hojas.
   * @param cy Coordenada Y del centro de la rama.
   */
  private drawLeaves(ctx: SKRSContext2D, hojas: string[], cy: number): void {
    hojas.forEach((hoja, j) => {
      const ly = cy - ((hojas.length - 1) * 26) / 2 + j * 26;
      this.smallText(ctx, `• ${hoja}`, 860, ly, "left", 14);
    });
  }
}
