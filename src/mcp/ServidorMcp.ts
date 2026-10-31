import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AgenteResumen } from "../agente/AgenteResumen";
import { Herramientas } from "../agente/Herramientas";
import { Adjunto } from "./Adjunto";

/**
 * Servidor MCP sobre stdio: resumen por niveles, diagramas y documentos.
 * Los archivos se devuelven embebidos en base64 (imagen o recurso).
 */
export class ServidorMcp {
  /** Servidor MCP con los tools registrados. */
  private readonly server = new McpServer({ name: "koala-cowork", version: "1.0.0" });

  constructor() {
    this.registrarResumen();
    this.registrarDiagramas();
    this.registrarDocumentos();
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
          nivel: z.number().int().min(1).max(4).describe("Nivel de resumen a generar (1 detallado, 2 medio, 3 breve, 4 síntesis)"),
        },
      },
      async ({ texto, nivel }) => {
        const resumen = await AgenteResumen.getInstance().resumir(texto, nivel);
        return { content: [{ type: "text" as const, text: `Nivel ${nivel}:\n${resumen}` }] };
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
   * Conecta el servidor al transporte stdio y queda a la espera de peticiones.
   */
  async iniciar(): Promise<void> {
    await this.server.connect(new StdioServerTransport());
  }
}
