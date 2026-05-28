import { LLMEngine } from './llm_engine.js';
import { logger } from './logger.js';
import type { Intent } from './types.js';

const llm = new LLMEngine();

const TRANSFORMATION_PATTERNS = [
  { pattern: /deviens?\s+(.+)/i },
  { pattern: /transforme.?toi\s+en\s+(.+)/i },
  { pattern: /change\s+de\s+forme/i },
  { pattern: /je\s+veux\s+une?\s+app\s+(.+)/i },
  { pattern: /crée.?toi\s+(.+)/i },
  { pattern: /become\s+(.+)/i },
  { pattern: /transform\s+(?:yourself\s+)?(?:into\s+)?(.+)/i },
  { pattern: /i\s+want\s+(?:you\s+to\s+be\s+)?(?:an?\s+)?(.+)/i },
  { pattern: /switch\s+to\s+(?:being\s+)?(.+)/i },
  { pattern: /turn\s+(?:yourself\s+)?into\s+(.+)/i },
  { pattern: /act\s+like\s+(?:a\s+)?(.+)/i },
  { pattern: /behave\s+as\s+(?:a\s+)?(.+)/i }
];

export class IntentEngine {
  async perceive(userMessage: string, memoryContext: unknown = {}): Promise<Intent> {
    const quickTransform = this.quickTransformDetect(userMessage);
    if (quickTransform) {
      logger.info('IntentEngine', `Quick transform detected: ${quickTransform}`);
      return {
        surface: userMessage,
        deep: `The user wants ULTIMATE to become: ${quickTransform}`,
        requiredSkills: [],
        transformationNeeded: true,
        targetForm: quickTransform,
        urgency: 'high',
        emotionalTone: 'enthusiastic'
      };
    }

    try {
      const raw = await llm.generate({
        systemPrompt: "You are an intent analyzer. Respond only in valid JSON.",
        userPrompt: llm.buildIntentPrompt(userMessage, memoryContext),
        maxTokens: 500
      });
      const intent = JSON.parse(this.cleanJSON(raw)) as Intent;
      logger.debug('IntentEngine', `LLM intent: surface="${intent.surface}", deep="${intent.deep}"`);
      return intent;
    } catch (err) {
      logger.warn('IntentEngine', `LLM analysis failed: ${(err as Error).message} — using fallback`);
      return {
        surface: userMessage,
        deep: userMessage,
        requiredSkills: ['general'],
        transformationNeeded: false,
        targetForm: null,
        urgency: 'medium',
        emotionalTone: 'neutral'
      };
    }
  }

  quickTransformDetect(message: string): string | null {
    for (const { pattern } of TRANSFORMATION_PATTERNS) {
      const match = message.match(pattern);
      if (match) return match[1]?.trim() || match[0];
    }
    return null;
  }

  cleanJSON(raw: string): string {
    return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }
}
