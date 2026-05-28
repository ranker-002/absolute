import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'ultimate.config.json');

export interface UltimateConfig {
  theme: string;
  model: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  maxTokens: number;
  streamEnabled: boolean;
  historySize: number;
  autoSaveHistory: boolean;
  language: 'fr' | 'en' | 'auto';
  customPrompt?: string;
}

const DEFAULT_CONFIG: UltimateConfig = {
  theme: 'default',
  model: 'deepseek/deepseek-v4-flash:free',
  logLevel: 'info',
  maxTokens: 4096,
  streamEnabled: true,
  historySize: 100,
  autoSaveHistory: true,
  language: 'auto'
};

export class ConfigManager {
  private config: UltimateConfig = { ...DEFAULT_CONFIG };
  private configPath = CONFIG_PATH;

  async load(): Promise<UltimateConfig> {
    try {
      const raw = await fs.readFile(this.configPath, 'utf-8');
      const loaded = JSON.parse(raw) as Partial<UltimateConfig>;
      this.config = { ...DEFAULT_CONFIG, ...loaded };
    } catch {
      await this.save();
    }
    return this.config;
  }

  async save(): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  getAll(): UltimateConfig {
    return { ...this.config };
  }

  async update(partial: Partial<UltimateConfig>): Promise<void> {
    Object.assign(this.config, partial);
    await this.save();
  }

  async set<K extends keyof UltimateConfig>(key: K, value: UltimateConfig[K]): Promise<void> {
    this.config[key] = value;
    await this.save();
  }

  get<K extends keyof UltimateConfig>(key: K): UltimateConfig[K] {
    return this.config[key];
  }

  async reset(): Promise<void> {
    this.config = { ...DEFAULT_CONFIG };
    await this.save();
  }
}

export const config = new ConfigManager();
