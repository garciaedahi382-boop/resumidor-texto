import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

export class MapaConceptualRenderer extends DiagramRenderer {
  readonly type = "mapa-conceptual";
  readonly schema = '{"nodos":[{"id":"a","texto":"..."}],"enlaces":[{"desde":"a","hacia":"b","etiqueta":"palabra de enlace"}]} (entre 4 y 10 nodos, máximo 2 enlaces de salida por nodo)';

  private static readonly NODE_W = 170;
  private static readonly NODE_H = 54;

  protected override ancho(data: any): number {
    const satelites = Math.max((data.nodos ?? []).length - 1, 1);
    return Math.max(1600, 2 * (MapaConceptualRenderer.radio(satelites) + MapaConceptualRenderer.NODE_W / 2 + 60));
  }

  protected override alto(data: any): number {
    const satelites = Math.max((data.nodos ?? []).length - 1, 1);
    return Math.max(900, 210 + 2 * MapaConceptualRenderer.radio(satelites) + 120);
  }

  private static radio(satelites: number): number {
    return Math.max(280, satelites * 60);
  }

  protected draw(ctx: SKRSContext2D, data: any): void {
    const nodes: any[] = data.nodos ?? [];
    const links: any[] = data.enlaces ?? [];
    const pos = this.positions(nodes);
    this.drawLinks(ctx, links, pos);
    this.drawNodes(ctx, nodes, pos);
  }

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

  private drawLinks(ctx: SKRSContext2D, links: any[], pos: Map<string, { x: number; y: number }>): void {
    links.forEach((l) => {
      const a = pos.get(l.desde), b = pos.get(l.hacia);
      if (!a || !b) return;
      this.line(ctx, a.x, a.y, b.x, b.y);
      this.smallText(ctx, String(l.etiqueta ?? ""), (a.x + b.x) / 2, (a.y + b.y) / 2 - 10, "center", 13, "#555555");
    });
  }

  private drawNodes(ctx: SKRSContext2D, nodes: any[], pos: Map<string, { x: number; y: number }>): void {
    nodes.forEach((n) => {
      const p = pos.get(n.id)!;
      this.box(ctx, p.x - MapaConceptualRenderer.NODE_W / 2, p.y - MapaConceptualRenderer.NODE_H / 2, MapaConceptualRenderer.NODE_W, MapaConceptualRenderer.NODE_H, n.texto ?? "", "#ffffff", 14);
    });
  }
}
