import { LLMEngine } from './llm_engine.js';
import { DNA } from './dna.js';
import { SystemTools } from './system_tools.js';
import { logger } from './logger.js';
import type { Intent, SkillDefinition } from './types.js';

const llm = new LLMEngine();
const sys = new SystemTools();

export interface SkillVersion {
  version: string;
  updatedAt: number;
  changes: string[];
}

export interface SkillWithMeta extends SkillDefinition {
  activatedAt?: number;
  version?: SkillVersion;
  dependencies?: string[];
  conflicts?: string[];
}

const SKILL_DEPENDENCIES: Record<string, string[]> = {
  data_science: ['software_development'],
  algorithmic_trading: ['data_science'],
  game_development: ['software_development'],
  cybersecurity: ['software_development'],
  graphic_design: ['creative_writing']
};

const SKILL_CONFLICTS: Record<string, string[]> = {
  creative_writing: ['science_research'],
  science_research: ['creative_writing']
};

export class SkillActivator {
  private activeSkills: Map<string, SkillWithMeta> = new Map();
  private activationHistory: Array<{ skill: string; action: 'activate' | 'deactivate'; timestamp: number }> = [];

  async identifyRequired(intent: Intent): Promise<string[]> {
    return intent.requiredSkills || [];
  }

  async activate(skillName: string, intent: Intent): Promise<SkillWithMeta> {
    const dna = DNA.getInstance();

    if (this.activeSkills.has(skillName)) {
      const existing = this.activeSkills.get(skillName)!;
      logger.info('SkillActivator', `Skill already active: ${skillName}`);
      return existing;
    }

    const conflicts = this.checkConflicts(skillName);
    if (conflicts.length > 0) {
      logger.warn('SkillActivator', `Skill ${skillName} conflicts with: ${conflicts.join(', ')}`);
    }

    let skillDef = await this.loadFromRegistry(skillName);
    if (!skillDef) {
      skillDef = await this.synthesizeSkill(skillName, intent);
      await this.saveToRegistry(skillDef);
    }

    const meta: SkillWithMeta = {
      ...skillDef,
      activatedAt: Date.now(),
      version: { version: '1.0.0', updatedAt: Date.now(), changes: ['Initial activation'] },
      dependencies: SKILL_DEPENDENCIES[skillName] || [],
      conflicts: SKILL_CONFLICTS[skillName] || []
    };

    this.activeSkills.set(skillName, meta);
    this.activationHistory.push({ skill: skillName, action: 'activate', timestamp: Date.now() });

    await dna.addActiveSkill(skillName);
    logger.info('SkillActivator', `Activated skill: ${skillName}`);

    for (const dep of meta.dependencies || []) {
      if (!this.activeSkills.has(dep)) {
        logger.info('SkillActivator', `Auto-activating dependency: ${dep}`);
        await this.activate(dep, intent);
      }
    }

    return meta;
  }

  deactivate(skillName: string): boolean {
    if (!this.activeSkills.has(skillName)) return false;

    const dependents = Array.from(this.activeSkills.entries())
      .filter(([_, meta]) => meta.dependencies?.includes(skillName))
      .map(([name]) => name);

    if (dependents.length > 0) {
      logger.warn('SkillActivator', `Cannot deactivate ${skillName}: required by ${dependents.join(', ')}`);
      return false;
    }

    this.activeSkills.delete(skillName);
    this.activationHistory.push({ skill: skillName, action: 'deactivate', timestamp: Date.now() });
    logger.info('SkillActivator', `Deactivated skill: ${skillName}`);
    return true;
  }

  deactivateAll(): void {
    const names = Array.from(this.activeSkills.keys());
    for (const name of names) {
      this.deactivate(name);
    }
  }

  getActiveSkills(): string[] {
    return Array.from(this.activeSkills.keys());
  }

  getActiveSkillDetails(): SkillWithMeta[] {
    return Array.from(this.activeSkills.values());
  }

  private checkConflicts(skillName: string): string[] {
    const conflicts = SKILL_CONFLICTS[skillName] || [];
    return conflicts.filter(c => this.activeSkills.has(c));
  }

  getActiveContext(): string {
    return Array.from(this.activeSkills.values())
      .map(s => s.systemPromptAddition)
      .filter(Boolean)
      .join('\n\n');
  }

  async synthesizeSkill(skillName: string, context: Intent): Promise<SkillDefinition> {
    try {
      const raw = await llm.generate({
        systemPrompt: 'You create skill definitions. Reply only in valid JSON.',
        userPrompt: llm.buildSkillSynthesisPrompt(skillName, context),
        maxTokens: 2000
      });
      return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()) as SkillDefinition;
    } catch (err) {
      logger.error('SkillActivator', `Synthesis failed for "${skillName}": ${(err as Error).message}`);
      return {
        name: skillName,
        domains: [skillName],
        systemPromptAddition: `You are now skilled in: ${skillName}. Produce expert results in this domain.`,
        capabilities: [`Expert in ${skillName}`],
        executionPatterns: ['Direct and expert response'],
        qualityMetrics: ['Accuracy', 'Relevance'],
        relatedSkills: []
      };
    }
  }

  async loadFromRegistry(skillName: string): Promise<SkillDefinition | null> {
    try {
      const registry = JSON.parse(await sys.readFile('skills/registry.json')) as { skills: SkillDefinition[] };
      return registry.skills.find((s) => s.name === skillName) ?? null;
    } catch (err) {
      logger.error('SkillActivator', `Failed to load skill "${skillName}": ${(err as Error).message}`);
      return null;
    }
  }

  async saveToRegistry(skillDef: SkillDefinition): Promise<void> {
    try {
      const registry = JSON.parse(await sys.readFile('skills/registry.json')) as { skills: SkillDefinition[] };
      registry.skills.push({ ...skillDef, status: 'synthesized' });
      await sys.writeFile('skills/registry.json', JSON.stringify(registry, null, 2));
    } catch (err) {
      logger.error('SkillActivator', `Failed to save to registry: ${(err as Error).message}`);
    }
  }

  async loadAllFromRegistry(): Promise<SkillDefinition[]> {
    try {
      const registry = JSON.parse(await sys.readFile('skills/registry.json')) as { skills: SkillDefinition[] };
      return registry.skills;
    } catch (_e) {
      return [];
    }
  }

  getActivationHistory(): Array<{ skill: string; action: string; timestamp: number }> {
    return [...this.activationHistory];
  }
}
