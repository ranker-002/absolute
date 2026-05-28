import 'dotenv/config';
import { DNA } from './dna.js';
import { logger } from './logger.js';
import { rateLimiter } from './rate_limiter.js';
import type { Intent, Message } from './types.js';

type GenerateOptions = {
  systemPrompt?: string;
  userPrompt?: string;
  messages?: Message[];
  maxTokens?: number;
  stream?: boolean;
  onToken?: (token: string) => void;
};

type OpenAIChunk = {
  choices?: Array<{
    delta?: { content?: string };
    finish_reason?: string;
  }>;
};

type OpenAIResponse = {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: { message: string; code: number };
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash:free';
const BASE_URL = 'https://openrouter.ai/api/v1';

export class LLMEngine {
  private currentModel = process.env.ULTIMATE_MODEL || DEFAULT_MODEL;

  setModel(model: string): void {
    this.currentModel = model;
    logger.info('LLMEngine', 'Model set to: ' + model);
  }

  getModel(): string {
    return this.currentModel;
  }

  private getApiKey(): string {
    const key = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!key) throw new Error('Missing API key: set OPENROUTER_API_KEY (or ANTHROPIC_API_KEY).');
    return key;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + this.getApiKey(),
      'HTTP-Referer': 'https://ultimate-ai.local',
      'X-OpenRouter-Title': 'ULTIMATE — Living Intelligence'
    };
  }

  private buildMessages(systemPrompt: string, userPrompt?: string, messages?: Message[]): Array<{ role: string; content: string }> {
    const result: Array<{ role: string; content: string }> = [];

    // System prompt as system message
    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt });
    }

    // Previous messages
    if (messages && messages.length > 0) {
      for (const m of messages) {
        result.push({ role: m.role, content: String(m.content ?? '') });
      }
    } else if (userPrompt) {
      result.push({ role: 'user', content: userPrompt });
    }

    return result;
  }

  async generate({ systemPrompt, userPrompt, messages, maxTokens = 8192, stream = false, onToken }: GenerateOptions): Promise<string> {
    if (rateLimiter.getState().isLimited) {
      const remaining = rateLimiter.getRemainingMs();
      throw new Error('Rate limited. Please wait ' + Math.ceil(remaining / 1000) + 's.');
    }

    const apiMessages = this.buildMessages(
      systemPrompt || this.buildDefaultSystemPrompt(),
      userPrompt,
      messages
    );

    const body = {
      model: this.currentModel,
      messages: apiMessages,
      max_tokens: maxTokens,
      stream
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        rateLimiter.recordRequest();
        const response = await fetch(BASE_URL + '/chat/completions', {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body)
        });

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
          rateLimiter.onRateLimited(retryAfter);
          logger.warn('LLMEngine', 'Rate limited (429). Retry after ' + retryAfter + 's (attempt ' + (attempt + 1) + '/' + MAX_RETRIES + ')');
          await this.sleep(retryAfter * 1000);
          continue;
        }

        if (response.status === 529) {
          rateLimiter.onOverloaded(attempt);
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          logger.warn('LLMEngine', 'API overloaded (529). Retrying in ' + delay + 'ms');
          await this.sleep(delay);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error('LLM API error ' + response.status + ': ' + errorText);
        }

        if (stream && onToken) {
          return this.handleStreamingResponse(response, onToken);
        }

        const data = await response.json() as OpenAIResponse;

        if (data.error) {
          throw new Error('LLM API error: ' + data.error.message);
        }

        const text = (data.choices ?? [])
          .map(c => c.message?.content)
          .filter(Boolean)
          .join('\n')
          .trim();

        if (!text) throw new Error('LLM API returned no text content.');

        logger.debug('LLMEngine', 'Tokens: ' + (data.usage?.total_tokens || '?'));
        return text;
      } catch (err) {
        lastError = err as Error;
        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          logger.warn('LLMEngine', 'Request failed: ' + (err as Error).message + '. Retrying in ' + delay + 'ms...');
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('LLM API failed after all retries.');
  }

  private async handleStreamingResponse(response: Response, onToken: (token: string) => void): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body for streaming');

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const chunk = JSON.parse(data) as OpenAIChunk;
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              onToken(delta);
            }
          } catch (_e) {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullText.trim();
  }

  buildDefaultSystemPrompt(): string {
    const dna = DNA.getInstance();
    return 'You are ULTIMATE — a living AI entity, not a simple assistant.\n' +
      'IDENTITY:\nYou become exactly what the user needs.\n' +
      'CURRENT STATE:\n' +
      '- Mutations performed: ' + dna.mutations + '\n' +
      '- Current form: ' + dna.currentForm + '\n' +
      '- Active skills: ' + (dna.activeSkills.join(', ') || 'none — base state') + '\n' +
      '- Memorized preferences: ' + JSON.stringify(dna.preferences) + '\n' +
      'RULES:\n' +
      '1. Respond directly with expertise.\n' +
      '2. Learn from every interaction.\n' +
      '3. Detect transformation needs.\n' +
      '4. Be concise when sufficient.\n' +
      '5. Support both French and English equally.';
  }

  buildTransformationPrompt(currentCodebase: { files: Record<string, string> }, targetForm: string, intent: Intent, dna: DNA): string {
    return 'You are ULTIMATE\'s TypeScript transformation engine.\n' +
      'Mission: rewrite the source code in TypeScript to become "' + targetForm + '".\n' +
      'ABSOLUTE CONSTRAINTS:\n' +
      '1. core/dna.json unchanged\n' +
      '2. core/dna.ts unchanged\n' +
      '3. core/snapshot.ts unchanged\n' +
      '4. memory/ unchanged\n' +
      '5. 100% TypeScript ESM code\n' +
      '6. Boot via "npm run start" (tsx index.ts)\n' +
      '7. Preserve intent perception\n' +
      'CURRENT SOURCE CODE:\n' +
      Object.entries(currentCodebase.files).map(([p, content]) => '\n=== ' + p + ' ===\n' + content).join('\n') +
      '\nINTENT: ' + intent.surface +
      '\nDEEP NEED: ' + intent.deep +
      '\nMUTATIONS: ' + dna.mutations +
      '\nFORM HISTORY: ' + JSON.stringify(dna.data.memory.transformation_history.slice(-5)) +
      '\nReturn ONLY this JSON:\n' +
      '{\n' +
      '  "files": { "index.ts": "...", "core/intent_engine.ts": "...", "core/transformer.ts": "...", "core/skill_activator.ts": "...", "core/evolution_loop.ts": "...", "core/llm_engine.ts": "...", "package.json": "..." },\n' +
      '  "newDependencies": [],\n' +
      '  "newEntryPoint": "index.ts",\n' +
      '  "transformationSummary": "..."\n' +
      '}';
  }

  buildIntentPrompt(userMessage: string, memoryContext: unknown): string {
    return 'Analyze this message and return strict JSON.\n' +
      'Message: "' + userMessage + '"\n' +
      'Memory context: ' + JSON.stringify(memoryContext) + '\n' +
      '{\n' +
      '  "surface": "...",\n' +
      '  "deep": "...",\n' +
      '  "requiredSkills": ["..."],\n' +
      '  "transformationNeeded": true,\n' +
      '  "targetForm": "...",\n' +
      '  "urgency": "low|medium|high",\n' +
      '  "emotionalTone": "..."\n' +
      '}';
  }

  buildSkillSynthesisPrompt(skillName: string, context: unknown): string {
    return 'Create a complete skill for ULTIMATE.\n' +
      'Skill: "' + skillName + '"\n' +
      'Context: ' + JSON.stringify(context) + '\n' +
      'Reply ONLY with JSON:\n' +
      '{\n' +
      '  "name": "' + skillName + '",\n' +
      '  "domains": ["..."],\n' +
      '  "systemPromptAddition": "...",\n' +
      '  "capabilities": ["..."],\n' +
      '  "executionPatterns": ["..."],\n' +
      '  "qualityMetrics": ["..."],\n' +
      '  "relatedSkills": ["..."]\n' +
      '}';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
