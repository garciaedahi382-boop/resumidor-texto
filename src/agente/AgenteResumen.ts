import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import axios from "axios";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ConfigStore } from "../config/ConfigStore";
import type { ModelrConfig } from "../config/ConfigStore";
import { DiagramRenderer } from "../diagramas/DiagramRenderer";
import { Herramientas } from "./Herramientas";

const EsquemaEntrada = z.object({ texto: z.string(), conDiagramas: z.boolean() });

const EsquemaResumen = z.object({
  niveles: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  archivos: z.array(z.string()),
  conDiagramas: z.boolean(),
});

export class AgenteResumen {
  private static instancia: AgenteResumen | null = null;
  private static readonly OUT_DIR = "diagramas";
  private static readonly RESERVA = 512;

  private readonly mastra: Mastra;
  private readonly resumidor: Agent;
  private limiteTokens = 0;

  private constructor() {
    const cfg = ConfigStore.load();
    const model = AgenteResumen.modelo(cfg);

    const resumidor = new Agent({
      id: "resumidor",
      name: "resumidor",
      instructions: "Eres un resumidor de textos. Responde únicamente con el resumen del texto recibido, sin saludos, prefacios, despedidas ni explicaciones adicionales.",
      model,
    });
    this.resumidor = resumidor;

    const diagramador = new Agent({
      id: "diagramador",
      name: "diagramador",
      instructions: 'Eres un generador de diagramas. Ante cada petición llama la herramienta renderizar_diagrama con los datos JSON del diagrama solicitado. Nunca respondas solo con texto.',
      model,
      tools: { renderizar_diagrama: Herramientas.renderizarDiagrama(AgenteResumen.OUT_DIR) },
    });

    const nodoResumen = createStep({
      id: "resumir",
      inputSchema: EsquemaEntrada,
      outputSchema: EsquemaResumen,
      execute: async ({ inputData }) => ({ niveles: await this.resumirNiveles(inputData.texto), archivos: [], conDiagramas: inputData.conDiagramas }),
    });

    const nodosDiagrama = Herramientas.tipos().map((tipo) =>
      createStep({
        id: `diagrama-${tipo}`,
        inputSchema: EsquemaResumen,
        outputSchema: EsquemaResumen,
        execute: async ({ inputData }) => {
          if (!inputData.conDiagramas) return { niveles: inputData.niveles, archivos: inputData.archivos, conDiagramas: false };
          const archivo = join(AgenteResumen.OUT_DIR, `${tipo}.png`);
          await diagramador.generate(AgenteResumen.promptDiagrama(Herramientas.renderer(tipo), inputData.niveles[0]));
          if (!existsSync(archivo)) throw new Error(`El agente no generó el diagrama ${tipo}`);
          return { niveles: inputData.niveles, archivos: [...inputData.archivos, archivo], conDiagramas: true };
        },
      }),
    );

    let flujo = createWorkflow({
      id: "flujo-resumen",
      inputSchema: EsquemaEntrada,
      outputSchema: EsquemaResumen,
      steps: [nodoResumen, ...nodosDiagrama],
    }).then(nodoResumen);
    for (const nodo of nodosDiagrama) flujo = flujo.then(nodo);

    this.mastra = new Mastra({
      agents: { resumidor, diagramador },
      workflows: { "flujo-resumen": flujo.commit() },
    });
  }

  static getInstance(): AgenteResumen {
    if (!AgenteResumen.instancia) AgenteResumen.instancia = new AgenteResumen();
    return AgenteResumen.instancia;
  }

  async ejecutar(texto: string, conDiagramas = true): Promise<{ niveles: [string, string, string, string]; archivos: string[] }> {
    if (conDiagramas) mkdirSync(AgenteResumen.OUT_DIR, { recursive: true });
    const run = await this.mastra.getWorkflow("flujo-resumen").createRun();
    const resultado = await run.start({ inputData: { texto, conDiagramas } });
    if (resultado.status === "success") return resultado.result;
    if (resultado.status === "failed") throw new Error(`El flujo falló: ${resultado.error.message}`);
    throw new Error(`El flujo terminó con estado: ${resultado.status}`);
  }

  private static promptDiagrama(renderer: DiagramRenderer, resumen: string): string {
    return `A partir del siguiente resumen, genera los datos para un diagrama de tipo "${renderer.type}" con esta estructura exacta: ${renderer.schema}\n\nLlama la herramienta renderizar_diagrama con tipo="${renderer.type}" y esos datos. Resumen: ${resumen}`;
  }

  private static modelo(cfg: ModelrConfig) {
    if (cfg.provider === "openai") {
      if (!cfg.url || !cfg.apiKey || !cfg.model) {
        throw new Error('Configura el proveedor openai: config --provider openai --url <url> --key <apikey> --model <modelo>');
      }
      return { providerId: "openai", modelId: cfg.model, url: cfg.url, apiKey: cfg.apiKey, api: "chat" as const };
    }
    if (!cfg.apiKey) throw new Error("Falta la API key de OpenRouter (config --provider openrouter --key <apikey> o variable OPENROUTER_API_KEY)");
    return { providerId: "openrouter", modelId: cfg.model ?? "openai/gpt-4o-mini", url: "https://openrouter.ai/api/v1", apiKey: cfg.apiKey, api: "chat" as const };
  }

  private static tokens(texto: string): number {
    return Math.ceil(texto.length / 4);
  }

  // Cada nivel se genera desde el texto fuente con su propio objetivo de extensión,
  // así todos toman toda la información. Solo si el texto no cabe en el contexto
  // (se fragmentó), los niveles se derivan del resumen por fragmentos ya completo.
  private static readonly EXTENSIONES = [
    "Resume el siguiente texto de forma detallada:",
    "Resume el siguiente texto conservando aproximadamente la mitad de su extensión:",
    "Resume el siguiente texto conservando aproximadamente la cuarta parte de su extensión:",
    "Sintetiza el siguiente texto en una sola oración:",
  ];

  private async resumirNiveles(texto: string): Promise<[string, string, string, string]> {
    const limite = await this.limiteEntrada();
    const fuente = AgenteResumen.tokens(texto) < limite ? texto : await this.resumirTexto(texto);
    const niveles: string[] = [];
    for (const instruccion of AgenteResumen.EXTENSIONES) {
      niveles.push((await this.resumidor.generate(`${instruccion}\n\n${fuente}`)).text.trim());
    }
    return [niveles[0]!, niveles[1]!, niveles[2]!, niveles[3]!];
  }

  private async resumirTexto(texto: string): Promise<string> {
    const limite = await this.limiteEntrada();
    if (AgenteResumen.tokens(texto) < limite) {
      return (await this.resumidor.generate(texto)).text.trim();
    }
    const acarreo: string[] = [];
    for (const trozo of AgenteResumen.dividir(texto, limite - AgenteResumen.RESERVA)) {
      const previo = acarreo.length > 0 ? `Resumen previo: ${acarreo[acarreo.length - 1]}\n\n` : "";
      acarreo.push((await this.resumidor.generate(`${previo}Continúa el resumen con el siguiente fragmento:\n${trozo}`)).text.trim());
    }
    return acarreo[acarreo.length - 1] ?? "";
  }

  private async limiteEntrada(): Promise<number> {
    if (this.limiteTokens > 0) return this.limiteTokens;
    const cfg = ConfigStore.load();
    const base = cfg.provider === "openai" ? cfg.url! : "https://openrouter.ai/api/v1";
    try {
      const res = await axios.get(`${base.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });
      const info = (res.data.data ?? []).find((m: any) => m.id === cfg.model);
      this.limiteTokens = info?.top_provider?.context_length ?? info?.context_length ?? info?.max_model_len ?? 8192;
    } catch {
      this.limiteTokens = 8192;
    }
    return this.limiteTokens;
  }

  private static dividir(texto: string, presupuesto: number): string[] {
    const trozos: string[] = [];
    let actual = "";
    const empujar = (): void => {
      if (actual) trozos.push(actual);
      actual = "";
    };
    for (const palabra of texto.split(/\s+/)) {
      if (AgenteResumen.tokens(palabra) > presupuesto) {
        empujar();
        const tamano = presupuesto * 4;
        for (let i = 0; i < palabra.length; i += tamano) trozos.push(palabra.slice(i, i + tamano));
        continue;
      }
      const candidato = actual ? `${actual} ${palabra}` : palabra;
      if (actual && AgenteResumen.tokens(candidato) > presupuesto) {
        empujar();
        actual = palabra;
      } else {
        actual = candidato;
      }
    }
    empujar();
    return trozos;
  }
}
