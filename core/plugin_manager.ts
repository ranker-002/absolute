import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PLUGINS_DIR = path.join(ROOT, 'plugins');

export interface Plugin {
  name: string;
  version: string;
  description: string;
  author: string;
  hooks: {
    beforeTransform?: (input: string) => Promise<string> | string;
    afterTransform?: (result: string) => Promise<string> | string;
    beforeGenerate?: (messages: unknown[]) => Promise<unknown[]> | unknown[];
    afterGenerate?: (response: string) => Promise<string> | string;
    onInteraction?: (input: string, output: string) => Promise<void> | void;
    onStartup?: () => Promise<void> | void;
    onShutdown?: () => Promise<void> | void;
  };
  enabled: boolean;
}

export interface PluginRegistry {
  plugins: Array<{
    name: string;
    path: string;
    enabled: boolean;
  }>;
}

export class PluginManager {
  private plugins: Plugin[] = [];
  private registry: PluginRegistry = { plugins: [] };

  async init(): Promise<void> {
    await fs.mkdir(PLUGINS_DIR, { recursive: true });
    await this.loadRegistry();
    await this.loadAllPlugins();
    logger.info('PluginManager', `Loaded ${this.plugins.length} plugins`);
  }

  private async loadRegistry(): Promise<void> {
    try {
      const raw = await fs.readFile(path.join(PLUGINS_DIR, 'registry.json'), 'utf-8');
      this.registry = JSON.parse(raw) as PluginRegistry;
    } catch {
      this.registry = { plugins: [] };
      await this.saveRegistry();
    }
  }

  private async saveRegistry(): Promise<void> {
    await fs.writeFile(
      path.join(PLUGINS_DIR, 'registry.json'),
      JSON.stringify(this.registry, null, 2),
      'utf-8'
    );
  }

  private async loadAllPlugins(): Promise<void> {
    for (const entry of this.registry.plugins) {
      if (!entry.enabled) continue;
      try {
        const pluginPath = path.join(PLUGINS_DIR, entry.path);
        const mod = await import(pluginPath);
        const plugin: Plugin = mod.default || mod;
        if (plugin.name && plugin.hooks) {
          this.plugins.push({ ...plugin, enabled: true });
          logger.info('PluginManager', `Loaded plugin: ${plugin.name} v${plugin.version}`);
          if (plugin.hooks.onStartup) await plugin.hooks.onStartup();
        }
      } catch (err) {
        logger.error('PluginManager', `Failed to load plugin ${entry.name}: ${(err as Error).message}`);
      }
    }
  }

  async register(name: string, pluginPath: string): Promise<void> {
    const existing = this.registry.plugins.find(p => p.name === name);
    if (existing) {
      existing.enabled = true;
    } else {
      this.registry.plugins.push({ name, path: pluginPath, enabled: true });
    }
    await this.saveRegistry();
  }

  async unregister(name: string): Promise<void> {
    this.registry.plugins = this.registry.plugins.filter(p => p.name !== name);
    this.plugins = this.plugins.filter(p => p.name !== name);
    await this.saveRegistry();
  }

  getPlugins(): Array<{ name: string; enabled: boolean }> {
    return this.registry.plugins;
  }

  async executeHook<K extends keyof Plugin['hooks']>(
    hook: K,
    ...args: Parameters<NonNullable<Plugin['hooks'][K]>>
  ): Promise<ReturnType<NonNullable<Plugin['hooks'][K]>> | undefined> {
    let result: unknown = args.length === 1 ? args[0] : args;

    for (const plugin of this.plugins) {
      if (!plugin.enabled) continue;
      const hookFn = plugin.hooks[hook];
      if (!hookFn) continue;

      try {
        const hookResult = await (hookFn as Function).apply(plugin, Array.isArray(result) ? result : [result]);
        result = hookResult ?? result;
      } catch (err) {
        logger.error('PluginManager', `Hook ${hook} failed in ${plugin.name}: ${(err as Error).message}`);
      }
    }

    return result as ReturnType<NonNullable<Plugin['hooks'][K]>>;
  }

  async shutdown(): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.hooks.onShutdown) {
        try {
          await plugin.hooks.onShutdown();
        } catch (err) {
          logger.error('PluginManager', `Shutdown hook failed for ${plugin.name}: ${(err as Error).message}`);
        }
      }
    }
  }
}

export const pluginManager = new PluginManager();
