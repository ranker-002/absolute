import 'dotenv/config';
import { logger } from './logger.js';

export interface ModelConfig {
  name: string;
  provider: 'openrouter' | 'anthropic' | 'openai' | 'ollama';
  apiKey?: string;
  baseUrl: string;
  maxTokens: number;
  enabled: boolean;
}

export class MultiModelManager {
  private models: ModelConfig[] = [];
  private currentModelIndex = 0;
  private fallbackEnabled = true;

  init(): void {
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    // Primary: OpenRouter
    if (openrouterKey) {
      this.models.push({
        name: process.env.ULTIMATE_MODEL || 'deepseek/deepseek-v4-flash:free',
        provider: 'openrouter',
        apiKey: openrouterKey,
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        maxTokens: 8192,
        enabled: true
      });

      // Add popular free/cheap models as fallbacks
      const fallbackModels = [
        'deepseek/deepseek-chat:free',
        'meta-llama/llama-4-maverick:free',
        'google/gemini-2.0-flash-exp:free',
        'qwen/qwen3-235b-a22b:free'
      ];

      for (const model of fallbackModels) {
        if (model !== this.models[0].name) {
          this.models.push({
            name: model,
            provider: 'openrouter',
            apiKey: openrouterKey,
            baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
            maxTokens: 8192,
            enabled: true
          });
        }
      }
    }

    // Fallback: Anthropic direct (if no OpenRouter)
    if (!openrouterKey && (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY)) {
      this.models.push({
        name: 'claude-sonnet-4-20250514',
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
        baseUrl: 'https://api.anthropic.com/v1/messages',
        maxTokens: 8192,
        enabled: true
      });
    }

    // Fallback: Ollama local
    if (process.env.OLLAMA_URL || process.env.OLLAMA_BASE_URL) {
      this.models.push({
        name: process.env.OLLAMA_MODEL || 'llama3',
        provider: 'ollama',
        baseUrl: process.env.OLLAMA_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        maxTokens: 4096,
        enabled: true
      });
    }

    logger.info('MultiModel', 'Loaded ' + this.models.length + ' models');
  }

  getCurrentModel(): ModelConfig {
    return this.models[this.currentModelIndex] || {
      name: 'deepseek/deepseek-v4-flash:free',
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
      maxTokens: 8192,
      enabled: true
    };
  }

  async generateWithFallback(
    generateFn: (model: ModelConfig) => Promise<string>
  ): Promise<string> {
    const startIndex = this.currentModelIndex;

    for (let i = 0; i < this.models.length; i++) {
      const modelIndex = (startIndex + i) % this.models.length;
      const model = this.models[modelIndex];

      if (!model.enabled || !model.apiKey) continue;

      try {
        const result = await generateFn(model);
        if (result) {
          this.currentModelIndex = modelIndex;
          return result;
        }
      } catch (err) {
        logger.warn('MultiModel', 'Model ' + model.name + ' failed: ' + (err as Error).message);
        if (!this.fallbackEnabled) throw err;
      }
    }

    throw new Error('All models failed');
  }

  setModel(modelName: string): boolean {
    const idx = this.models.findIndex(m => m.name === modelName);
    if (idx === -1) return false;
    this.currentModelIndex = idx;
    logger.info('MultiModel', 'Switched to: ' + modelName);
    return true;
  }

  getModels(): ModelConfig[] {
    return [...this.models];
  }

  getAvailableModels(): string[] {
    return this.models.filter(m => m.enabled && m.apiKey).map(m => m.name);
  }

  setFallbackEnabled(enabled: boolean): void {
    this.fallbackEnabled = enabled;
  }

  isFallbackEnabled(): boolean {
    return this.fallbackEnabled;
  }
}
