import { LLMEngine } from './llm_engine.js';
import { logger } from './logger.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const llm = new LLMEngine();

// ============ Prompt Optimizer ============
export interface PromptVersion {
  id: string;
  prompt: string;
  score: number;
  usageCount: number;
  createdAt: number;
}

export class PromptOptimizer {
  private prompts: Map<string, PromptVersion[]> = new Map();

  async optimize(category: string, basePrompt: string, examples: Array<{ input: string; expected: string }>): Promise<string> {
    const versions = this.prompts.get(category) || [];

    // Generate optimized version
    const raw = await llm.generate({
      systemPrompt: 'You optimize prompts for better results. Improve this prompt based on the examples.',
      userPrompt: 'Original prompt:\n' + basePrompt + '\n\nExamples:\n' +
        examples.map(e => 'Input: ' + e.input + '\nExpected: ' + e.expected).join('\n\n') +
        '\n\nReturn the improved prompt text only.',
      maxTokens: 1000
    });

    const optimized = raw.trim();
    const score = this.estimateQuality(optimized, examples);

    const version: PromptVersion = {
      id: 'pv_' + Date.now(),
      prompt: optimized,
      score,
      usageCount: 0,
      createdAt: Date.now()
    };

    versions.push(version);
    this.prompts.set(category, versions);

    logger.info('PromptOptimizer', 'Optimized ' + category + ': score ' + score.toFixed(2));
    return optimized;
  }

  getBest(category: string): string | null {
    const versions = this.prompts.get(category) || [];
    if (versions.length === 0) return null;
    return versions.sort((a, b) => b.score - a.score)[0].prompt;
  }

  recordUsage(category: string, promptId: string, success: boolean): void {
    const versions = this.prompts.get(category) || [];
    const v = versions.find(p => p.id === promptId);
    if (v) {
      v.usageCount++;
      v.score = v.score * 0.9 + (success ? 0.1 : 0);
    }
  }

  private estimateQuality(prompt: string, examples: Array<{ input: string; expected: string }>): number {
    // Simple heuristic: longer prompts with more structure tend to work better
    let score = 0.5;
    if (prompt.length > 200) score += 0.1;
    if (prompt.includes('JSON') || prompt.includes('format')) score += 0.1;
    if (prompt.includes('Example') || prompt.includes('example')) score += 0.1;
    if (prompt.includes('Step') || prompt.includes('step')) score += 0.05;
    return Math.min(score, 1);
  }

  getStats(category: string): { versions: number; bestScore: number; totalUsage: number } {
    const versions = this.prompts.get(category) || [];
    return {
      versions: versions.length,
      bestScore: versions.length > 0 ? Math.max(...versions.map(v => v.score)) : 0,
      totalUsage: versions.reduce((s, v) => s + v.usageCount, 0)
    };
  }
}

// ============ Skill Composer ============
export interface ComposedSkill {
  name: string;
  components: string[];
  systemPromptAddition: string;
  capabilities: string[];
  composedAt: number;
}

export class SkillComposer {
  async compose(baseSkills: Array<{ name: string; systemPromptAddition: string; capabilities: string[] }>, targetName: string): Promise<ComposedSkill> {
    const raw = await llm.generate({
      systemPrompt: 'You compose multiple skills into one unified skill. Reply with JSON.',
      userPrompt: 'Compose these skills into one called "' + targetName + '":\n' +
        baseSkills.map(s => '- ' + s.name + ': ' + s.systemPromptAddition + ' (capabilities: ' + s.capabilities.join(', ') + ')').join('\n') +
        '\n\nReturn JSON: {"systemPromptAddition": "...", "capabilities": [...]}',
      maxTokens: 1000
    });

    try {
      const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      return {
        name: targetName,
        components: baseSkills.map(s => s.name),
        systemPromptAddition: result.systemPromptAddition || '',
        capabilities: result.capabilities || [],
        composedAt: Date.now()
      };
    } catch (_e) {
      return {
        name: targetName,
        components: baseSkills.map(s => s.name),
        systemPromptAddition: baseSkills.map(s => s.systemPromptAddition).join('\n'),
        capabilities: baseSkills.flatMap(s => s.capabilities),
        composedAt: Date.now()
      };
    }
  }
}

// ============ Strategy Selector ============
export type Strategy = 'direct' | 'decompose' | 'research' | 'iterate' | 'collaborate';

export class StrategySelector {
  async select(task: string, context: string, availableTools: string[]): Promise<{ strategy: Strategy; reasoning: string }> {
    const raw = await llm.generate({
      systemPrompt: 'You select the best strategy for a task. Reply with JSON: {"strategy": "...", "reasoning": "..."}\nStrategies: direct (do it simply), decompose (break into parts), research (learn first), iterate (try and refine), collaborate (use multiple tools).',
      userPrompt: 'Task: "' + task + '"\nContext: ' + context + '\nAvailable tools: ' + availableTools.join(', '),
      maxTokens: 200
    });

    try {
      return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch (_e) {
      return { strategy: 'direct', reasoning: 'Fallback: direct approach' };
    }
  }

  async analyzeFailure(task: string, error: string, attempts: number): Promise<{ newStrategy: Strategy; changes: string }> {
    const raw = await llm.generate({
      systemPrompt: 'Analyze a failed task and suggest a new strategy. Reply with JSON.',
      userPrompt: 'Task: "' + task + '"\nError: "' + error + '"\nAttempts: ' + attempts + '\n\nWhat went wrong and what strategy should we try next?',
      maxTokens: 300
    });

    try {
      return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch (_e) {
      return { newStrategy: 'iterate', changes: 'Try with different approach' };
    }
  }
}

// ============ Failure Analyzer ============
export interface FailureReport {
  taskId: string;
  task: string;
  error: string;
  attempts: number;
  rootCause: string;
  suggestedFix: string;
  timestamp: number;
}

export class FailureAnalyzer {
  private reports: FailureReport[] = [];

  async analyze(taskId: string, task: string, error: string, attempts: number): Promise<FailureReport> {
    const raw = await llm.generate({
      systemPrompt: 'Analyze why this task failed. Reply with JSON: {"rootCause": "...", "suggestedFix": "..."}',
      userPrompt: 'Task: "' + task + '"\nError: "' + error + '"\nAttempts: ' + attempts,
      maxTokens: 300
    });

    let rootCause = 'Unknown';
    let suggestedFix = 'Retry with different approach';

    try {
      const result = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      rootCause = result.rootCause || rootCause;
      suggestedFix = result.suggestedFix || suggestedFix;
    } catch (_e) { /* */ }

    const report: FailureReport = { taskId, task, error, attempts, rootCause, suggestedFix, timestamp: Date.now() };
    this.reports.push(report);
    logger.info('FailureAnalyzer', 'Task ' + taskId + ': ' + rootCause);
    return report;
  }

  getReports(limit = 20): FailureReport[] {
    return this.reports.slice(-limit);
  }

  getCommonCauses(): Array<{ cause: string; count: number }> {
    const causes = new Map<string, number>();
    for (const r of this.reports) {
      causes.set(r.rootCause, (causes.get(r.rootCause) || 0) + 1);
    }
    return Array.from(causes.entries())
      .map(([cause, count]) => ({ cause, count }))
      .sort((a, b) => b.count - a.count);
  }
}
