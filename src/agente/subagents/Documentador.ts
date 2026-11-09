import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { DiagramRenderer } from "../../diagramas/DiagramRenderer";
import { TablaCambiosDocx } from "../../documentos/TablaCambiosDocx";
import { Archivos } from "../../utilerias/Archivos";
import { Registro } from "../../utilerias/Registro";
import type { Modelo } from "../ModeloLlm";

/**
 * Agente de documentos: registra los tipos disponibles y genera el DOCX
 * delegando en su herramienta `renderizar_documento`.
 */
export class Documentador {
  /** Documentos disponibles indexados por tipo. */
  static readonly DOCUMENTOS = new Registro<TablaCambiosDocx>({
    "tabla-cambios": new TablaCambiosDocx(),
  });

  /** Agente de Mastra que decide los datos del documento. */
  private readonly agente: Agent;

  /**
   * @param model Configuración de modelo resuelta por `ModeloLlm`.
   */
  constructor(model: Modelo) {
    this.agente = new Agent({
      id: "documentador",
      name: "documentador",
      instructions: "Eres un generador de documentos. Ante cada petición llama la herramienta renderizar_documento con los datos JSON del documento solicitado. Nunca respondas solo con texto.",
      model,
      tools: { renderizar_documento: Documentador.renderizarDocumento() },
    });
  }

  /** Agente subyacente, para registrarlo en `Mastra`. */
  get instancia(): Agent {
    return this.agente;
  }

  /**
   * Crea la herramienta Mastra que genera un documento Word.
   * @returns Herramienta `renderizar_documento` con entrada `{ tipo, datos }`.
   */
  private static renderizarDocumento() {
    return createTool({
      id: "renderizar_documento",
      description: "Genera un documento Word a partir de sus datos JSON",
      inputSchema: z.object({
        tipo: z.string().describe(`Tipo de documento: ${Documentador.DOCUMENTOS.tipos.join(", ")}`),
        datos: z.record(z.string(), z.any()).describe("Datos JSON del documento según su estructura"),
      }),
      execute: async ({ tipo, datos }) => Archivos.escribir(Documentador.DOCUMENTOS, tipo, datos),
    });
  }

  /**
   * Genera el DOCX de un tipo a partir de un texto.
   * @param tipo Tipo de documento registrado.
   * @param texto Texto del que el agente extrae los datos.
   * @returns Ruta del documento generado.
   * @throws Error si el agente no escribió el archivo esperado.
   */
  async generar(tipo: string, texto: string): Promise<string> {
    const archivo = Archivos.preparar(Documentador.DOCUMENTOS.calcularRuta(tipo));
    await this.agente.generate(DiagramRenderer.prompt(Documentador.DOCUMENTOS.tomar(tipo), texto, "renderizar_documento"));
    Archivos.verificar(archivo, `El agente no generó el documento ${tipo}`);
    return archivo;
  }
}
