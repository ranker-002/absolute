import { LLMEngine } from './llm_engine.js';

const llm = new LLMEngine();

const TRANSFORMATION_PATTERNS = [
  { pattern: /deviens?\s+(.+)/i, type: 'become' },
  { pattern: /transforme.?toi\s+en\s+(.+)/i, type: 'transform' },
  { pattern: /change\s+de\s+forme/i, type: 'transform' },
  { pattern: /je\s+veux\s+une?\s+app\s+(.+)/i, type: 'become' },
  { pattern: /crée.?toi\s+(.+)/i, type: 'become' }
];

export class IntentEngine {
  async perceive(userMessage, memoryContext = {}) {
    const quickTransform = this.quickTransformDetect(userMessage);

    if (quickTransform) {
      return {
        surface: userMessage,
        deep: `L'utilisateur veut qu'ULTIMATE devienne : ${quickTransform}`,
        requiredSkills: [],
        transformationNeeded: true,
        targetForm: quickTransform,
        urgency: 'high',
        emotionalTone: 'enthousiaste'
      };
    }

    try {
      const prompt = llm.buildIntentPrompt(userMessage, memoryContext);
      const raw = await llm.generate({
        systemPrompt: "Tu es un analyseur d'intention. Réponds uniquement en JSON valide.",
        userPrompt: prompt,
        maxTokens: 500
      });

      const intent = JSON.parse(this.cleanJSON(raw));
      return intent;
    } catch (err) {
      return {
        surface: userMessage,
        deep: userMessage,
        requiredSkills: ['general'],
        transformationNeeded: false,
        targetForm: null,
        urgency: 'medium',
        emotionalTone: 'neutre'
      };
    }
  }

  quickTransformDetect(message) {
    for (const { pattern } of TRANSFORMATION_PATTERNS) {
      const match = message.match(pattern);
      if (match) return match[1] || match[0];
    }
    return null;
  }

  cleanJSON(raw) {
    return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }
}
