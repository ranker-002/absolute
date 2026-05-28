import { LLMEngine } from './llm_engine.js';
import { DNA } from './dna.js';
import { SystemTools } from './system_tools.js';
import { logger } from './logger.js';
import type { SkillDefinition } from './types.js';

const llm = new LLMEngine();
const sys = new SystemTools();

export interface SkillPattern {
  trigger: string;
  frequency: number;
  lastSeen: number;
  suggestedSkill: string;
}

export class AutoSkillGenerator {
  private patterns: SkillPattern[] = [];
  private maxPatterns = 100;

  async analyzeAndGenerate(interaction: { input: string; output: string }): Promise<SkillDefinition | null> {
    const detectedPatterns = this.detectPatterns(interaction.input);

    for (const pattern of detectedPatterns) {
      const existing = this.patterns.find(p => p.trigger === pattern.trigger);
      if (existing) {
        existing.frequency++;
        existing.lastSeen = Date.now();
      } else {
        this.patterns.push({
          trigger: pattern.trigger,
          frequency: 1,
          lastSeen: Date.now(),
          suggestedSkill: pattern.suggestedSkill
        });
      }
    }

    // Clean old patterns
    this.patterns = this.patterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, this.maxPatterns);

    // Generate skill if pattern is frequent enough
    const hotPattern = this.patterns.find(p => p.frequency >= 3);
    if (hotPattern) {
      logger.info('AutoSkills', 'Hot pattern detected: ' + hotPattern.trigger + ' (freq: ' + hotPattern.frequency + ')');
      const skill = await this.generateSkill(hotPattern.suggestedSkill, hotPattern.trigger);
      if (skill) {
        hotPattern.frequency = 0; // Reset after generation
        return skill;
      }
    }

    return null;
  }

  private detectPatterns(input: string): Array<{ trigger: string; suggestedSkill: string }> {
    const patterns: Array<{ trigger: string; suggestedSkill: string }> = [];
    const lower = input.toLowerCase();

    const rulePatterns: Array<[RegExp, string]> = [
      [/create\s+a?\s*website/i, 'web-developer'],
      [/build\s+a?\s*website/i, 'web-developer'],
      [/design\s+a?\s*website/i, 'ui-designer'],
      [/write\s+python/i, 'python-expert'],
      [/write\s+a?\s*script/i, 'script-writer'],
      [/review\s+(my\s+)?code/i, 'code-reviewer'],
      [/explain\s+(this\s+)?code/i, 'code-explainer'],
      [/fix\s+(this\s+)?bug/i, 'bug-fixer'],
      [/deploy\s+(to|on)/i, 'devops-engineer'],
      [/docker/i, 'devops-engineer'],
      [/security\s+(check|audit|review)/i, 'security-analyst'],
      [/test\s+(this|my)/i, 'test-writer'],
      [/api\s+endpoint/i, 'api-developer'],
      [/database/i, 'database-expert'],
      [/machine\s+learning|ml\s+model/i, 'ml-engineer'],
      [/mobile\s+app/i, 'mobile-developer']
    ];

    for (const [regex, skill] of rulePatterns) {
      if (regex.test(lower)) {
        const match = lower.match(regex);
        patterns.push({ trigger: match?.[0] || lower.substring(0, 30), suggestedSkill: skill });
      }
    }

    return patterns;
  }

  private async generateSkill(skillName: string, trigger: string): Promise<SkillDefinition | null> {
    try {
      const raw = await llm.generate({
        systemPrompt: 'You create skill definitions. Reply only in valid JSON.',
        userPrompt: 'Create a skill for ULTIMATE called "' + skillName + '" triggered by "' + trigger + '". Reply with JSON: { "name": "...", "domains": [...], "systemPromptAddition": "...", "capabilities": [...], "executionPatterns": [...], "qualityMetrics": [...], "relatedSkills": [...] }',
        maxTokens: 2000
      });

      const skill = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()) as SkillDefinition;
      logger.info('AutoSkills', 'Generated skill: ' + skill.name);
      return skill;
    } catch (err) {
      logger.error('AutoSkills', 'Generation failed: ' + (err as Error).message);
      return null;
    }
  }

  getPatterns(): SkillPattern[] {
    return [...this.patterns].sort((a, b) => b.frequency - a.frequency);
  }

  async getTopSuggestions(): Promise<string[]> {
    return this.patterns
      .filter(p => p.frequency >= 2)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5)
      .map(p => p.suggestedSkill);
  }
}
