import { AgenteResumen } from "./src/agente/AgenteResumen";
import { ConfigStore } from "./src/config/ConfigStore";
import type { ModelrConfig } from "./src/config/ConfigStore";
import { ServidorMcp } from "./src/mcp/ServidorMcp";

/**
 * Punto de entrada de línea de comandos.
 */
class Cli {
  /** Argumentos recibidos después del nombre del script. */
  private readonly args: string[] = process.argv.slice(2);

  /**
   * Despacha el comando recibido (`config`, `summarize` o `mcp`).
   */
  async run(): Promise<void> {
    const [cmd, ...rest] = this.args;
    if (cmd === "config") return this.config(rest);
    if (cmd === "summarize") return this.summarize(rest);
    if (cmd === "mcp") return new ServidorMcp().iniciar();
    console.log(
      'Uso:\n  bun index.ts config --provider <openrouter|openai> [--url <url>] [--key <apikey>] [--model <modelo>]\n  bun index.ts summarize "texto a resumir" [--solo-resumen]\n  bun index.ts mcp',
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
   * Resume un texto e imprime los 4 niveles y los diagramas generados.
   * @param rest Texto a resumir y flag opcional `--solo-resumen`.
   */
  private async summarize(rest: string[]): Promise<void> {
    const soloResumen = rest.includes("--solo-resumen");
    const texto = rest.filter((a) => a !== "--solo-resumen").join(" ");
    const resultado = await AgenteResumen.getInstance().ejecutar(texto, !soloResumen);
    const etiquetas = ["Nivel 1 (detallado)", "Nivel 2 (medio)", "Nivel 3 (breve)", "Nivel 4 (síntesis)"];
    resultado.niveles.forEach((n, i) => console.log(`${etiquetas[i]}:\n${n}\n`));
    resultado.archivos.forEach((a) => console.log(`Diagrama generado: ${a}`));
  }
}

new Cli().run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
