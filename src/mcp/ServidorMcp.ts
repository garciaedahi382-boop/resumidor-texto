import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AgenteResumen } from "../agente/AgenteResumen";
import { Herramientas } from "../agente/Herramientas";
import { SkillsStore } from "../skills/SkillsStore";
import { Adjunto } from "./Adjunto";
import { Contenido } from "../contenido/Contenido";
import { EntradaBuilder } from "../contenido/EntradaBuilder";
import { ESQUEMA_ENTRADA } from "../contenido/EsquemaEntrada";
import { Seccion } from "../contenido/Secciones";

/**
 * Servidor MCP sobre stdio: resumen por niveles, diagramas, documentos y piezas
 * de contenido (infografía y presentación).
 * Los archivos se devuelven embebidos en base64 (imagen o recurso).
 */
export class ServidorMcp {
  /** Servidor MCP con los tools registrados. */
  private readonly server = new McpServer({ name: "koala-cowork", version: "1.0.0" });

  constructor() {
    this.registrarResumen();
    this.registrarDiagramas();
    this.registrarDocumentos();
    this.registrarContenido();
  }

  /**
   * Registra el tool de resumen de un nivel.
   */
  private registrarResumen(): void {
    this.server.registerTool(
      "resumir",
      {
        description: "Resume un texto en 4 niveles: 1 detallado, 2 medio, 3 breve, 4 síntesis",
        inputSchema: {
          texto: z.string().describe("Texto a resumir"),
          nivel: z.number().int().min(1).max(4).optional().describe("Nivel de resumen (1 detallado, 2 medio, 3 breve, 4 síntesis); si se omite se usa el que fijen las skills"),
        },
      },
      async ({ texto, nivel }) => {
        const efectivo = nivel ?? SkillsStore.nivel("resumen") ?? 1;
        const resumen = await AgenteResumen.getInstance().resumir(texto, efectivo);
        return { content: [{ type: "text" as const, text: `Nivel ${efectivo}:\n${resumen}` }] };
      },
    );
  }

  /**
   * Registra un tool por cada tipo de diagrama soportado.
   */
  private registrarDiagramas(): void {
    for (const tipo of Herramientas.tipos()) {
      const renderer = Herramientas.renderer(tipo);
      this.server.registerTool(
        `diagrama_${tipo.replace(/-/g, "_")}`,
        {
          description: `Genera un diagrama "${renderer.type}" a partir de un texto. Estructura de datos: ${renderer.schema}`,
          inputSchema: { texto: z.string().describe("Texto del que se extraen los datos del diagrama") },
        },
        async ({ texto }) => {
          const archivo = await AgenteResumen.getInstance().diagramar(tipo, texto);
          return {
            content: [
              { type: "text" as const, text: `Diagrama generado: ${archivo}` },
              Adjunto.de(archivo),
            ],
          };
        },
      );
    }
  }

  /**
   * Registra un tool por cada tipo de documento soportado.
   */
  private registrarDocumentos(): void {
    for (const tipo of Herramientas.tiposDocumento()) {
      const documento = Herramientas.documento(tipo);
      this.server.registerTool(
        `documento_${tipo.replace(/-/g, "_")}`,
        {
          description: `Genera un documento "${documento.type}" a partir de un texto. Estructura de datos: ${documento.schema}`,
          inputSchema: { texto: z.string().describe("Texto del que se extraen los datos del documento") },
        },
        async ({ texto }) => {
          const archivo = await AgenteResumen.getInstance().documentar(tipo, texto);
          return {
            content: [
              { type: "text" as const, text: `Documento generado: ${archivo}` },
              Adjunto.de(archivo),
            ],
          };
        },
      );
    }
  }

  /**
   * Registra un tool por cada pieza de contenido: infografía y presentación.
   */
  private registrarContenido(): void {
    for (const pieza of Contenido.piezas) {
      const fijo = SkillsStore.diseno(pieza);
      const criterios = SkillsStore.considerar(pieza);
      const notas = [
        fijo ? `Diseño fijado por una skill: ${fijo}.` : "",
        criterios.length > 0 ? `Ten en cuenta al armar el contenido:\n${criterios.map((criterio) => `- ${criterio}`).join("\n")}` : "",
      ]
        .filter((nota) => nota)
        .join(" ");
      this.server.registerTool(
        pieza,
        {
          description: `Entrega el JSON de entrada de una ${pieza}: título, subtítulo, pie y secciones. Esquema de la entrada: ${JSON.stringify(ESQUEMA_ENTRADA)}${notas ? ` ${notas}` : ""}`,
          inputSchema: {
            diseno: z.string().optional().describe("Nombre del diseño del catálogo; una skill puede fijarlo"),
            titulo: z.string().optional().describe("Título del documento y de la portada"),
            subtitulo: z.string().optional().describe("Texto que acompaña al título"),
            pie: z.string().optional().describe("Pie de la infografía; las presentaciones no lo usan"),
            secciones: z.array(z.record(z.string(), z.any())).optional().describe(`Secciones en orden: ${Seccion.tipos().join(", ")}`),
          },
        },
        async ({ diseno, titulo, subtitulo, pie, secciones }) => {
          if (!SkillsStore.permite(pieza, pieza)) return this.aviso(`Una skill vigente no permite generar la ${pieza}`);
          const elegido = SkillsStore.diseno(pieza) ?? diseno;
          if (!elegido) return this.aviso("Indica el diseño o fíjalo con una skill");
          const archivo = Contenido.render(pieza, elegido, EntradaBuilder.de({ titulo, subtitulo, pie, secciones }));
          return { content: [{ type: "text" as const, text: `JSON de entrada: ${Contenido.entrada(pieza)}` }, Adjunto.de(archivo)] };
        },
      );
    }
  }

  /**
   * Arma una respuesta de solo texto, sin archivo adjunto.
   * @param texto Mensaje para quien consulta el tool.
   * @returns Contenido MCP con el mensaje.
   */
  private aviso(texto: string) {
    return { content: [{ type: "text" as const, text: texto }] };
  }

  /**
   * Conecta el servidor al transporte stdio y queda a la espera de peticiones.
   */
  async iniciar(): Promise<void> {
    await this.server.connect(new StdioServerTransport());
  }
}
