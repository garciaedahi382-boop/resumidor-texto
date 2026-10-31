import { Agent } from "@mastra/core/agent";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DiagramRenderer } from "../diagramas/DiagramRenderer";
import { Herramientas } from "./Herramientas";
import type { Modelo } from "./ModeloLlm";

/**
 * Genera documentos Word (tablas) delegando en el agente y su herramienta de documento.
 */
export class Documentador {
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
      tools: { renderizar_documento: Herramientas.renderizarDocumento() },
    });
  }

  /** Agente subyacente, para registrarlo en `Mastra`. */
  get instancia(): Agent {
    return this.agente;
  }

  /**
   * Genera el archivo de un tipo de documento (`documentos/*.docx`) a partir de un texto.
   * @param tipo Tipo registrado en {@link Herramientas}.
   * @param texto Texto del que el agente extrae los datos.
   * @returns Ruta del documento generado.
   * @throws Error si el agente no escribió el archivo esperado.
   */
  async documentar(tipo: string, texto: string): Promise<string> {
    const documento = Herramientas.documento(tipo);
    const archivo = Herramientas.archivo(tipo);
    mkdirSync(dirname(archivo), { recursive: true });
    await this.agente.generate(DiagramRenderer.prompt(documento, texto, "renderizar_documento"));
    if (!existsSync(archivo)) throw new Error(`El agente no generó el documento ${tipo}`);
    return archivo;
  }
}
