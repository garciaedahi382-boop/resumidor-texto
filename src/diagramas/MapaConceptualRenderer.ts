import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un mapa conceptual: nodo central y satélites enlazados con etiquetas.
 */
export class MapaConceptualRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "mapa-conceptual";
  /** Esquema de datos: entre 4 y 10 nodos y sus enlaces. */
  readonly schema = '{"nodos":[{"id":"a","texto":"..."}],"enlaces":[{"desde":"a","hacia":"b","etiqueta":"palabra de enlace"}]} (entre 4 y 10 nodos, máximo 2 enlaces de salida por nodo)';

  /** Ancho de cada nodo. */
  private static readonly NODE_W = 170;
  /** Alto de cada nodo. */
  private static readonly NODE_H = 54;

  /**
   * Expande el lienzo según el anillo de satélites.
   * @param data Datos del diagrama.
   * @returns Ancho del lienzo en píxeles.
   */
  protected override ancho(data: any): number {
    const satelites = Math.max((data.nodos ?? []).length - 1, 1);
    return Math.max(1600, 2 * (MapaConceptualRenderer.radio(satelites) + MapaConceptualRenderer.NODE_W / 2 + 60));
  }

  /**
   * Expande el lienzo según el anillo de satélites.
   * @param data Datos del diagrama.
   * @returns Alto del lienzo en píxeles.
   */
  protected override alto(data: any): number {
    const satelites = Math.max((data.nodos ?? []).length - 1, 1);
    return Math.max(900, 210 + 2 * MapaConceptualRenderer.radio(satelites) + 120);
  }

  /**
   * Radio del anillo que ocupan los satélites.
   * @param satelites Cantidad de nodos satélite.
   * @returns Radio en píxeles.
   */
  private static radio(satelites: number): number {
    return Math.max(280, satelites * 60);
  }

  /**
   * Calcula posiciones y dibuja enlaces y nodos.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const nodes: any[] = data.nodos ?? [];
    const links: any[] = data.enlaces ?? [];
    const pos = this.positions(nodes);
    this.drawLinks(ctx, links, pos);
    this.drawNodes(ctx, nodes, pos);
  }

  /**
   * Asigna a cada nodo una posición: el primero arriba al centro y el resto en anillo.
   * @param nodes Nodos del diagrama.
   * @returns Posiciones indexadas por id de nodo.
   */
  private positions(nodes: any[]): Map<string, { x: number; y: number }> {
    const pos = new Map<string, { x: number; y: number }>();
    const satelites = Math.max(nodes.length - 1, 1);
    const paso = (2 * Math.PI) / satelites;
    const cy = 210 + MapaConceptualRenderer.radio(satelites);
    nodes.forEach((n, i) => {
      const p = i === 0
        ? { x: this.w / 2, y: 130 }
        : { x: this.w / 2 + MapaConceptualRenderer.radio(satelites) * Math.cos((i - 1) * paso + paso / 2), y: cy + MapaConceptualRenderer.radio(satelites) * Math.sin((i - 1) * paso + paso / 2) };
      pos.set(n.id, p);
    });
    return pos;
  }

  /**
   * Dibuja las líneas de enlace con su etiqueta.
   * @param ctx Contexto 2D del canvas.
   * @param links Enlaces con `desde`, `hacia` y `etiqueta`.
   * @param pos Posiciones de los nodos.
   */
  private drawLinks(ctx: SKRSContext2D, links: any[], pos: Map<string, { x: number; y: number }>): void {
    links.forEach((l) => {
      const a = pos.get(l.desde), b = pos.get(l.hacia);
      if (!a || !b) return;
      this.line(ctx, a.x, a.y, b.x, b.y);
      this.smallText(ctx, String(l.etiqueta ?? ""), (a.x + b.x) / 2, (a.y + b.y) / 2 - 10, "center", 13, "#555555");
    });
  }

  /**
   * Dibuja las cajas de los nodos.
   * @param ctx Contexto 2D del canvas.
   * @param nodes Nodos con `id` y `texto`.
   * @param pos Posiciones de los nodos.
   */
  private drawNodes(ctx: SKRSContext2D, nodes: any[], pos: Map<string, { x: number; y: number }>): void {
    nodes.forEach((n) => {
      const p = pos.get(n.id)!;
      this.box(ctx, p.x - MapaConceptualRenderer.NODE_W / 2, p.y - MapaConceptualRenderer.NODE_H / 2, MapaConceptualRenderer.NODE_W, MapaConceptualRenderer.NODE_H, n.texto ?? "", "#ffffff", 14);
    });
  }
}
