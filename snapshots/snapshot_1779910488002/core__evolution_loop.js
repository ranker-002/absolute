import { LLMEngine } from './llm_engine.js';
import { DNA } from './dna.js';

const llm = new LLMEngine();
const EVOLUTION_THRESHOLD = 0.7;

export class EvolutionLoop {
  async analyze(interaction) {
    const dna = DNA.getInstance();

    try {
      const raw = await llm.generate({
        systemPrompt: 'Tu analyses des interactions IA. Réponds uniquement en JSON.',
        userPrompt: `Analyse cette interaction :
Input: "${interaction.input}"
Output: "${interaction.output?.substring(0, 500)}"
Skills utilisés: ${JSON.stringify(interaction.skills)}

Retourne ce JSON :
{
  "quality": 0.0 à 1.0,
  "improvements": [{"type": "skill|algorithm|memory", "description": "...", "priority": 0.0-1.0}],
  "newCapabilities": ["capacités que cet échange a révélées"],
  "userInsights": {"préférences détectées": "..."}
}`,
        maxTokens: 800
      });

      const analysis = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

      const highPriority = (analysis.improvements || []).filter((i) => i.priority > EVOLUTION_THRESHOLD);

      if (highPriority.length > 0) {
        await dna.incrementMutations({
          type: 'micro_evolution',
          improvements: highPriority,
          quality: analysis.quality
        });
        console.log(`\n🧬 Micro-évolution : ${highPriority.length} amélioration(s) enregistrée(s)`);
      }

      if (analysis.userInsights) {
        for (const [key, value] of Object.entries(analysis.userInsights)) {
          await dna.updatePreference(key, value);
        }
      }
    } catch {
    }
  }
}
