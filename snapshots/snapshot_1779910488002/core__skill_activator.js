import { LLMEngine } from './llm_engine.js';
import { DNA } from './dna.js';
import { SystemTools } from './system_tools.js';

const llm = new LLMEngine();
const sys = new SystemTools();

export class SkillActivator {
  activeSkillPrompts = [];

  async identifyRequired(intent) {
    return intent.requiredSkills || [];
  }

  async activate(skillName, intent) {
    const dna = DNA.getInstance();

    let skillDef = await this.loadFromRegistry(skillName);

    if (!skillDef) {
      console.log(`🔬 Synthèse du nouveau skill : ${skillName}`);
      skillDef = await this.synthesizeSkill(skillName, intent);
      await this.saveToRegistry(skillDef);
    }

    this.activeSkillPrompts.push(skillDef.systemPromptAddition);
    await dna.addActiveSkill(skillName);

    console.log(`✓ Skill activé : ${skillName}`);
    return skillDef;
  }

  async synthesizeSkill(skillName, context) {

    try {
      const prompt = llm.buildSkillSynthesisPrompt(skillName, context);
      const raw = await llm.generate({
        systemPrompt: 'Tu crées des définitions de skills. Réponds uniquement en JSON valide.',
        userPrompt: prompt,
        maxTokens: 2000
      });
      return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      return {
        name: skillName,
        domains: [skillName],
        systemPromptAddition: `Tu maîtrises maintenant le domaine : ${skillName}. Produis des résultats experts dans ce domaine.`,
        capabilities: [`Expert en ${skillName}`],
        executionPatterns: ['Réponse directe et experte'],
        qualityMetrics: ['Précision', 'Pertinence'],
        relatedSkills: []
      };
    }
  }

  getActiveContext() {
    return this.activeSkillPrompts.join('\n\n');
  }

  async loadFromRegistry(skillName) {
    try {
      const registry = JSON.parse(await sys.readFile('skills/registry.json'));
      return registry.skills.find((s) => s.name === skillName) || null;
    } catch {
      return null;
    }
  }

  async saveToRegistry(skillDef) {
    try {
      const registry = JSON.parse(await sys.readFile('skills/registry.json'));
      registry.skills.push({ ...skillDef, status: 'synthesized' });
      await sys.writeFile('skills/registry.json', JSON.stringify(registry, null, 2));
    } catch {
    }
  }
}
