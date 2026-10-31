import { DiagramRenderer } from "./DiagramRenderer";
import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Renderiza un árbol de decisión: preguntas en rombos, resultados en cajas y
 * ramas etiquetadas que bajan por niveles.
 */
export class ArbolDecisionRenderer extends DiagramRenderer {
  /** Tipo de diagrama. */
  readonly type = "arbol-decision";
  /** Esquema de datos: nodos y ramas etiquetadas entre ellos. */
  readonly schema = '{"nodos":[{"id":"1","texto":"¿...?"}],"ramas":[{"desde":"1","hacia":"2","etiqueta":"sí"}]} (entre 2 y 20 nodos; un nodo sin ramas de salida se dibuja como resultado)';

  /** Ancho reservado a cada hoja del árbol. */
  private static readonly HOJA_W = 260;
  /** Separación vertical entre niveles. */
  private static readonly NIVEL_H = 220;
  /** Margen izquierdo del árbol. */
  private static readonly MARGEN = 80;
  /** Espacio reservado sobre el primer nivel. */
  private static readonly TOP = 180;
  /** Ancho de una caja de resultado. */
  private static readonly CAJA_W = 220;
  /** Alto de una caja de resultado. */
  private static readonly CAJA_H = 90;
  /** Ancho de un rombo de decisión. */
  private static readonly ROMBO_W = 250;
  /** Alto de un rombo de decisión. */
  private static readonly ROMBO_H = 150;

  /**
   * Expande el lienzo según la cantidad de hojas del árbol.
   * @param data Datos del diagrama.
   * @returns Ancho del lienzo en píxeles.
   */
  protected override ancho(data: any): number {
    const { ancho } = this.disposicion(data);
    return Math.max(1600, ancho);
  }

  /**
   * Expande el lienzo según la profundidad del árbol.
   * @param data Datos del diagrama.
   * @returns Alto del lienzo en píxeles.
   */
  protected override alto(data: any): number {
    const { profundidad } = this.disposicion(data);
    return Math.max(900, ArbolDecisionRenderer.TOP + (profundidad + 1) * ArbolDecisionRenderer.NIVEL_H);
  }

  /**
   * Dibuja primero las ramas y luego los nodos.
   * @param ctx Contexto 2D del canvas.
   * @param data Datos del diagrama.
   */
  protected draw(ctx: SKRSContext2D, data: any): void {
    const nodos: any[] = data.nodos ?? [];
    if (nodos.length === 0) return;
    const { pos, ancho } = this.disposicion(data);
    const offset = (this.w - ancho) / 2;
    const conHijos = this.conHijos(data.ramas ?? []);
    this.drawRamas(ctx, data.ramas ?? [], pos, offset);
    nodos.forEach((nodo) => this.drawNodo(ctx, nodo, this.centro(nodo, pos, offset), conHijos.has(nodo.id)));
  }

  /**
   * Calcula la posición de cada nodo por niveles: las hojas ocupan columnas y los
   * padres se centran sobre sus hijos.
   * @param data Datos del diagrama.
   * @returns Posiciones relativas, ancho necesario y profundidad máxima.
   */
  private disposicion(data: any): { pos: Map<string, { x: number; y: number }>; ancho: number; profundidad: number } {
    const nodos: any[] = data.nodos ?? [];
    const hijos = this.hijos(data.ramas ?? []);
    const conPadre = new Set((data.ramas ?? []).map((r: any) => r.hacia));
    const pos = new Map<string, { x: number; y: number }>();
    let columna = 0;
    let profundidad = 0;
    const ubicar = (id: string, nivel: number): number => {
      profundidad = Math.max(profundidad, nivel);
      const ramas = hijos.get(id) ?? [];
      if (pos.has(id) || ramas.length === 0) {
        const x = ArbolDecisionRenderer.MARGEN + columna * ArbolDecisionRenderer.HOJA_W + ArbolDecisionRenderer.HOJA_W / 2;
        if (!pos.has(id)) columna++;
        pos.set(id, { x, y: ArbolDecisionRenderer.TOP + nivel * ArbolDecisionRenderer.NIVEL_H });
        return x;
      }
      const xs = ramas.map((rama) => ubicar(rama.hacia, nivel + 1));
      const x = (Math.min(...xs) + Math.max(...xs)) / 2;
      pos.set(id, { x, y: ArbolDecisionRenderer.TOP + nivel * ArbolDecisionRenderer.NIVEL_H });
      return x;
    };
    nodos.filter((nodo) => !conPadre.has(nodo.id)).forEach((nodo) => ubicar(nodo.id, 0));
    nodos.filter((nodo) => !pos.has(nodo.id)).forEach((nodo) => ubicar(nodo.id, 0));
    return { pos, ancho: ArbolDecisionRenderer.MARGEN + columna * ArbolDecisionRenderer.HOJA_W, profundidad };
  }

  /**
   * Agrupa las ramas de salida por nodo de origen.
   * @param ramas Ramas con `desde`, `hacia` y `etiqueta`.
   * @returns Ramas indexadas por id de origen.
   */
  private hijos(ramas: any[]): Map<string, any[]> {
    const hijos = new Map<string, any[]>();
    ramas.forEach((rama) => {
      hijos.set(rama.desde, [...(hijos.get(rama.desde) ?? []), rama]);
    });
    return hijos;
  }

  /**
   * Identifica los nodos que tienen ramas de salida (se dibujan como decisión).
   * @param ramas Ramas del árbol.
   * @returns Conjunto de ids con hijos.
   */
  private conHijos(ramas: any[]): Set<string> {
    return new Set(ramas.map((rama) => rama.desde));
  }

  /**
   * Centro de un nodo aplicando el desplazamiento de centrado.
   * @param nodo Nodo del árbol.
   * @param pos Posiciones relativas.
   * @param offset Desplazamiento horizontal aplicado al dibujo.
   * @returns Centro del nodo en el canvas.
   */
  private centro(nodo: any, pos: Map<string, { x: number; y: number }>, offset: number): { x: number; y: number } {
    const p = pos.get(nodo.id) ?? { x: 0, y: 0 };
    return { x: p.x + offset, y: p.y };
  }

  /**
   * Dibuja los conectores en codo con su etiqueta.
   * @param ctx Contexto 2D del canvas.
   * @param ramas Ramas con `desde`, `hacia` y `etiqueta`.
   * @param pos Posiciones relativas.
   * @param offset Desplazamiento horizontal aplicado al dibujo.
   */
  private drawRamas(ctx: SKRSContext2D, ramas: any[], pos: Map<string, { x: number; y: number }>, offset: number): void {
    const conHijos = this.conHijos(ramas);
    ramas.forEach((rama) => {
      const desde = pos.get(rama.desde);
      const hacia = pos.get(rama.hacia);
      if (!desde || !hacia) return;
      const p = { x: desde.x + offset, y: desde.y };
      const c = { x: hacia.x + offset, y: hacia.y };
      const y1 = p.y + (conHijos.has(rama.desde) ? ArbolDecisionRenderer.ROMBO_H : ArbolDecisionRenderer.CAJA_H) / 2;
      const y2 = c.y - (conHijos.has(rama.hacia) ? ArbolDecisionRenderer.ROMBO_H : ArbolDecisionRenderer.CAJA_H) / 2;
      const medio = (y1 + y2) / 2;
      this.line(ctx, p.x, y1, p.x, medio);
      this.line(ctx, p.x, medio, c.x, medio);
      this.arrow(ctx, c.x, medio, c.x, y2);
      if (rama.etiqueta) this.smallText(ctx, String(rama.etiqueta), (p.x + c.x) / 2, medio - 14, "center", 14, "#555555");
    });
  }

  /**
   * Dibuja un nodo: rombo si tiene ramas de salida, caja si es resultado.
   * @param ctx Contexto 2D del canvas.
   * @param nodo Nodo con `id` y `texto`.
   * @param p Centro del nodo.
   * @param esDecision Si el nodo tiene ramas de salida.
   */
  private drawNodo(ctx: SKRSContext2D, nodo: any, p: { x: number; y: number }, esDecision: boolean): void {
    if (esDecision) return this.drawRombo(ctx, nodo.texto ?? "", p);
    this.box(ctx, p.x - ArbolDecisionRenderer.CAJA_W / 2, p.y - ArbolDecisionRenderer.CAJA_H / 2, ArbolDecisionRenderer.CAJA_W, ArbolDecisionRenderer.CAJA_H, nodo.texto ?? "", "#e8f5e9");
  }

  /**
   * Dibuja el rombo de una pregunta con su texto.
   * @param ctx Contexto 2D del canvas.
   * @param texto Texto de la pregunta.
   * @param p Centro del rombo.
   */
  private drawRombo(ctx: SKRSContext2D, texto: string, p: { x: number; y: number }): void {
    const w = ArbolDecisionRenderer.ROMBO_W / 2;
    const h = ArbolDecisionRenderer.ROMBO_H / 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - h);
    ctx.lineTo(p.x + w, p.y);
    ctx.lineTo(p.x, p.y + h);
    ctx.lineTo(p.x - w, p.y);
    ctx.closePath();
    ctx.fillStyle = "#fff2cc";
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#111111";
    ctx.font = "15px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lineas = this.wrap(ctx, texto, ArbolDecisionRenderer.ROMBO_W - 140);
    lineas.forEach((linea, i) => ctx.fillText(linea, p.x, p.y + (i - (lineas.length - 1) / 2) * 20));
  }
}
