import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";
import type { Browser, Page } from "puppeteer";
import { Contenido } from "../src/contenido/Contenido";
import type { Pieza } from "../src/contenido/Contenido";
import { EntradaBuilder } from "../src/contenido/EntradaBuilder";

/**
 * Pruebas de las piezas de contenido: arma el JSON y su HTML, y abre el HTML en
 * un navegador real para comprobar que se ve lo que se entregó.
 */
class Piezas {
  /** Diseños del catálogo con los que se arma cada pieza. */
  static readonly DISENOS: Record<Pieza, string> = { infografia: "bento", presentacion: "pres_bento" };
  /** Entrada de prueba con subpuntos anidados, coordenadas en minúscula y secciones inválidas. */
  static readonly ENTRADA: Record<string, any> = {
    titulo: "Reforma educativa",
    subtitulo: "Resumen del periodo",
    pie: "Fuente de prueba",
    secciones: [
      { tipo: "resumen", titulo: "Contexto", texto: "Texto del contexto." },
      { tipo: "lista", titulo: "Puntos", elementos: ["Uno", ["Sub uno", ["Sub dos"]], "Dos"] },
      { tipo: "tabla", titulo: "Datos", celdas: { a1: "Nombre", B1: "Valor", a2: "x", b2: 1 } },
      { tipo: "resumen", titulo: "Incompleta" },
      { tipo: "desconocida" },
    ],
  };
  /** Fragmentos que cada pieza debe mostrar: la portada solo muestra el título y el subtítulo. */
  static readonly ESPERADO: Record<Pieza, string[]> = {
    infografia: ["Resumen del periodo", "Contexto", "Texto del contexto.", "Puntos", "Uno", "Sub uno", "Sub dos", "Dos", "Datos", "Nombre", "Valor", "Fuente de prueba"],
    presentacion: ["Resumen del periodo"],
  };
  /** Selector de las secciones visibles de cada pieza. */
  static readonly SECCIONES: Record<Pieza, string> = { infografia: ".ig-seccion", presentacion: ".slide.is-active" };
  /** Directorio de las capturas de pantalla. */
  static readonly CAPTURAS = join("debug", "pruebas");
  /** Ejecutable de las piezas, usado si el entorno no define `CONTENIDO_BIN`. */
  private static readonly BIN_POR_DEFECTO = "D:/Proyectos/partes/maquetador_contenido/target/release/maquetador_contenido.exe";
  /** Navegador compartido por las pruebas. */
  private static navegador: Browser | null = null;

  /**
   * Abre el navegador una sola vez y fija el ejecutable de las piezas.
   * @returns Navegador listo para usarse.
   */
  static async abrir(): Promise<Browser> {
    process.env.CONTENIDO_BIN ??= Piezas.BIN_POR_DEFECTO;
    mkdirSync(Piezas.CAPTURAS, { recursive: true });
    if (!Piezas.navegador) Piezas.navegador = await puppeteer.launch({ headless: true });
    return Piezas.navegador;
  }

  /**
   * Cierra el navegador si quedó abierto.
   */
  static async cerrar(): Promise<void> {
    await Piezas.navegador?.close();
    Piezas.navegador = null;
  }

  /**
   * Entrada de prueba, normalizada por el builder.
   * @returns Builder con el contenido de la pieza.
   */
  static entrada(): EntradaBuilder {
    return EntradaBuilder.de(Piezas.ENTRADA);
  }

  /**
   * Abre un HTML en el navegador y junta los errores de consola y de página.
   * @param archivo Ruta del HTML generado.
   * @returns Página cargada y los errores encontrados.
   */
  static async cargar(archivo: string): Promise<{ pagina: Page; errores: string[] }> {
    const navegador = await Piezas.abrir();
    const pagina = await navegador.newPage();
    const errores: string[] = [];
    pagina.on("console", (mensaje) => {
      if (mensaje.type() === "error") errores.push(mensaje.text());
    });
    pagina.on("pageerror", (error) => errores.push(error instanceof Error ? error.message : String(error)));
    await pagina.goto(pathToFileURL(archivo).href, { waitUntil: "load" });
    await Piezas.animaciones(pagina);
    return { pagina, errores };
  }

  /**
   * Espera a que terminen las animaciones y transiciones de la página.
   * @param pagina Página cargada.
   */
  static async animaciones(pagina: Page): Promise<void> {
    await pagina.evaluate(() => Promise.all((globalThis as any).document.getAnimations().map((animacion: any) => animacion.finished)));
  }

  /**
   * Mide las secciones pedidas: texto, opacidad y alto ya con las animaciones terminadas.
   * @param pagina Página cargada.
   * @param selector Selector de las secciones.
   * @returns Texto, opacidad y alto de cada sección.
   */
  static secciones(pagina: Page, selector: string): Promise<{ texto: string; opacidad: number; alto: number }[]> {
    return pagina.$$eval(selector, (nodos) =>
      nodos.map((nodo) => {
        const estilo = (globalThis as any).getComputedStyle(nodo);
        return { texto: String((nodo as any).innerText ?? ""), opacidad: Number(estilo.opacity), alto: Math.round(nodo.getBoundingClientRect().height) };
      }),
    );
  }
}

describe("piezas de contenido", () => {
  beforeAll(async () => {
    await Piezas.abrir();
  });

  afterAll(async () => {
    await Piezas.cerrar();
  });

  for (const pieza of Contenido.piezas) {
    test(`${pieza}: escribe el JSON y el HTML`, () => {
      const archivo = Contenido.render(pieza, Piezas.DISENOS[pieza], Piezas.entrada());
      expect(existsSync(archivo)).toBe(true);
      expect(existsSync(Contenido.entrada(pieza))).toBe(true);
      const json = JSON.parse(readFileSync(Contenido.entrada(pieza), "utf8"));
      expect(json.titulo).toBe("Reforma educativa");
      expect(json.secciones.map((seccion: any) => seccion.tipo)).toEqual(["resumen", "lista", "tabla"]);
      expect(json.secciones[1].elementos).toEqual(["Uno", ["Sub uno", ["Sub dos"]], "Dos"]);
      expect(json.secciones[2].celdas).toEqual({ A1: "Nombre", B1: "Valor", A2: "x", B2: "1" });
    });

    test(`${pieza}: se ve en el navegador`, async () => {
      const { pagina, errores } = await Piezas.cargar(Contenido.archivo(pieza));
      const texto = await pagina.evaluate(() => (globalThis as any).document.body.innerText as string);
      const alto = await pagina.evaluate(() => (globalThis as any).document.body.scrollHeight as number);
      const secciones = await Piezas.secciones(pagina, Piezas.SECCIONES[pieza]);
      const estilos = await pagina.evaluate(() => (globalThis as any).document.styleSheets.length as number);
      const cajas = await pagina.evaluate(() => (globalThis as any).document.body.querySelectorAll("*").length as number);
      await pagina.screenshot({ path: join(Piezas.CAPTURAS, `${pieza}.png`), fullPage: true });
      await pagina.close();
      for (const fragmento of ["Reforma educativa", ...Piezas.ESPERADO[pieza]]) expect(texto).toContain(fragmento);
      expect(secciones.length).toBeGreaterThan(0);
      for (const seccion of secciones) {
        expect(seccion.opacidad).toBeGreaterThan(0.99);
        expect(seccion.alto).toBeGreaterThan(10);
        expect(seccion.texto.length).toBeGreaterThan(0);
      }
      if (pieza === "infografia") {
        expect(secciones.length).toBe(3);
        expect(secciones.map((seccion) => seccion.texto).join(" ")).toContain("Datos");
      }
      expect(alto).toBeGreaterThan(200);
      expect(estilos).toBeGreaterThan(0);
      expect(cajas).toBeGreaterThan(10);
      expect(errores).toEqual([]);
    });
  }

  test("presentacion: cada lámina muestra su contenido", async () => {
    const { pagina, errores } = await Piezas.cargar(Contenido.archivo("presentacion"));
    const laminas = await pagina.$$eval(".slide", (nodos) => nodos.length);
    const vistas: string[] = [];
    for (let indice = 0; indice < laminas; indice += 1) {
      vistas.push(await pagina.evaluate(() => (globalThis as any).document.body.innerText as string));
      const activa = await Piezas.secciones(pagina, Piezas.SECCIONES["presentacion"]);
      expect(activa.length).toBe(1);
      expect(activa[0]?.opacidad ?? 0).toBeGreaterThan(0.99);
      if (indice < laminas - 1) {
        await pagina.click("#nav-siguiente");
        await Piezas.animaciones(pagina);
      }
    }
    await pagina.screenshot({ path: join(Piezas.CAPTURAS, "presentacion-ultima.png"), fullPage: true });
    await pagina.close();
    expect(laminas).toBe(3);
    expect(vistas[0]).toContain("Resumen del periodo");
    expect(vistas[1]).toContain("Contexto");
    expect(vistas[2]).toContain("Sub uno");
    expect(vistas[2]).toContain("Dos");
    expect(errores).toEqual([]);
  });
});
