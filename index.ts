import { KoalaAgente } from "./src/agente/KoalaAgente";
import { ConfigStore } from "./src/config/ConfigStore";
import { Diagramador } from "./src/agente/subagents/Diagramador";
import { Documentador } from "./src/agente/subagents/Documentador";
import { ServidorHttp } from "./src/http/ServidorHttp";
import type { ModelrConfig } from "./src/config/ConfigStore";

/**
 * Punto de entrada de línea de comandos.
 */
class Cli {
  /** Argumentos recibidos después del nombre del script. */
  private readonly args: string[] = process.argv.slice(2);

  /**
   * Despacha el comando recibido (`config`, `summarize` o `serve`).
   */
  async run(): Promise<void> {
    const [cmd, ...rest] = this.args;
    if (cmd === "config") return this.config(rest);
    if (cmd === "summarize") return this.summarize(rest);
    if (cmd === "serve") return this.serve(rest);
    console.log(
      'Uso:\n  koala-cowork config --provider <openrouter|openai> [--url <url>] [--key <apikey>] [--model <modelo>]\n  koala-cowork summarize "texto a resumir" [--solo-resumen] [--diagramas <dir>] [--documentos <dir>]\n  koala-cowork serve [--puerto <puerto>]',
    );
  }

  /**
   * Lee el valor de un flag `--nombre valor`.
   * @param rest Argumentos posteriores al comando.
   * @param name Nombre del flag sin los guiones.
   * @returns Valor del flag o `undefined` si no está presente.
   */
  private flag(rest: string[], name: string): string | undefined {
    const i = rest.indexOf(`--${name}`);
    return i !== -1 ? rest[i + 1] : undefined;
  }

  /**
   * Guarda la configuración del proveedor y modelo combinando flags con lo ya guardado.
   * @param rest Flags del comando `config`.
   */
  private config(rest: string[]): void {
    const cfg = ConfigStore.load();
    const next: ModelrConfig = {
      provider: this.flag(rest, "provider") as ModelrConfig["provider"] ?? cfg.provider,
      url: this.flag(rest, "url") ?? cfg.url,
      apiKey: this.flag(rest, "key") ?? cfg.apiKey,
      model: this.flag(rest, "model") ?? cfg.model,
    };
    if (next.provider !== "openrouter" && next.provider !== "openai") {
      throw new Error("--provider debe ser openrouter u openai");
    }
    ConfigStore.save(next);
    console.log(`Configuración guardada en ~/.secti_addons/modelr.json:`, JSON.stringify(next, null, 2));
  }

  /**
   * Arranca el servidor HTTP con los endpoints del agente.
   * @param rest Flags del comando `serve` (`--puerto <puerto>`).
   */
  private serve(rest: string[]): void {
    const puerto = this.flag(rest, "puerto") ? Number(this.flag(rest, "puerto")) : ServidorHttp.PUERTO;
    new ServidorHttp().iniciar(puerto);
  }

  /**
   * Resume un texto e imprime los 4 niveles y los archivos generados.
   * @param rest Texto a resumir, flag opcional `--solo-resumen` y directorios `--diagramas`/`--documentos`.
   */
  private async summarize(rest: string[]): Promise<void> {
    const soloResumen = rest.includes("--solo-resumen");
    const dirDiagramas = this.flag(rest, "diagramas");
    const dirDocumentos = this.flag(rest, "documentos");
    if (dirDiagramas || dirDocumentos) {
      Diagramador.RENDERERS.ajustarDirectorio(dirDiagramas ?? "diagramas");
      Documentador.DOCUMENTOS.ajustarDirectorio(dirDocumentos ?? "documentos");
    }
    const texto = rest.filter((a) => !a.startsWith("--")).join(" ");
    const resultado = await KoalaAgente.getInstance().procesar(texto, !soloResumen);
    const etiquetas = ["Nivel 1 (detallado)", "Nivel 2 (medio)", "Nivel 3 (breve)", "Nivel 4 (síntesis)"];
    resultado.niveles.forEach((n, i) => console.log(`${etiquetas[i]}:\n${n}\n`));
    resultado.archivos.forEach((a) => console.log(`Archivo generado: ${a}`));
  }
}

new Cli().run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
