import { LLMEngine } from './llm_engine.js';
import { DNA } from './dna.js';
import { logger } from './logger.js';
import type { Interaction } from './types.js';

const llm = new LLMEngine();
const EVOLUTION_THRESHOLD = 0.7;

export class EvolutionLoop {
  async analyze(interaction: Interaction): Promise<void> {
    const dna = DNA.getInstance();
    try {
      const raw = await llm.generate({
        systemPrompt: 'You analyze AI interactions. Reply only in JSON.',
        userPrompt: `Analyze this interaction:
Input: "${interaction.input}"
Output: "${interaction.output?.substring(0, 500)}"
Skills used: ${JSON.stringify(interaction.skills)}
Return this JSON:
{
  "quality": 0.0,
  "improvements": [{"type": "skill|algorithm|memory", "description": "...", "priority": 0.0}],
  "newCapabilities": [],
  "userInsights": {}
}`,
        maxTokens: 800
      });

      const analysis = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()) as {
        quality?: number;
        improvements?: Array<{ priority: number; [k: string]: unknown }>;
        userInsights?: Record<string, unknown>;
      };

      const highPriority = (analysis.improvements || []).filter((i) => i.priority > EVOLUTION_THRESHOLD);
      if (highPriority.length > 0) {
        await dna.incrementMutations({
          type: 'micro_evolution',
          improvements: highPriority,
          quality: analysis.quality
        });
        logger.info('Evolution', `Micro-evolution triggered: ${highPriority.length} improvements`);
      }

      if (analysis.userInsights) {
        for (const [key, value] of Object.entries(analysis.userInsights)) {
          await dna.updatePreference(key, value);
        }
      }

      logger.debug('Evolution', `Analysis complete: quality=${analysis.quality}`);
    } catch (err) {
      logger.error('Evolution', `Analysis failed: ${(err as Error).message}`);
    }
  }
}
