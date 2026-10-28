import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface ModelrConfig {
  provider?: "openrouter" | "openai";
  url?: string;
  apiKey?: string;
  model?: string;
}

export class ConfigStore {
  private static readonly DIR = join(homedir(), ".secti_addons");
  private static readonly FILE = join(ConfigStore.DIR, "modelr.json");

  static load(): ModelrConfig {
    if (!existsSync(ConfigStore.FILE)) return {};
    return JSON.parse(readFileSync(ConfigStore.FILE, "utf8")) as ModelrConfig;
  }

  static save(config: ModelrConfig): void {
    if (!existsSync(ConfigStore.DIR)) mkdirSync(ConfigStore.DIR);
    writeFileSync(ConfigStore.FILE, JSON.stringify(config, null, 2));
  }
}
