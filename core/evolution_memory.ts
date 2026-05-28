import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const EVOLUTION_FILE = path.join(ROOT, 'memory', 'evolution_log.json');

export interface TransformationAttempt {
  id: string;
  timestamp: number;
  targetForm: string;
  status: 'success' | 'failure' | 'rolled_back' | 'partial';
  duration: number;
  error?: string;
  snapshotId?: string;
  testsPassed?: boolean;
  filesChanged: number;
  qualityScore?: number;
  lessons: string[];
  retryCount: number;
}

export interface EvolutionStats {
  totalAttempts: number;
  successes: number;
  failures: number;
  rolledBack: number;
  successRate: number;
  averageDuration: number;
  bestForm: string;
  worstForm: string;
  recentTrend: 'improving' | 'stable' | 'declining';
}

export class EvolutionMemory {
  private attempts: TransformationAttempt[] = [];
  private maxAttempts = 200;

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(EVOLUTION_FILE, 'utf-8');
      this.attempts = JSON.parse(raw) as TransformationAttempt[];
    } catch (_e) {
      this.attempts = [];
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(EVOLUTION_FILE), { recursive: true });
    await fs.writeFile(EVOLUTION_FILE, JSON.stringify(this.attempts, null, 2), 'utf-8');
  }

  async recordAttempt(attempt: Omit<TransformationAttempt, 'id' | 'timestamp'>): Promise<TransformationAttempt> {
    const record: TransformationAttempt = {
      id: `evo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      ...attempt
    };

    this.attempts.push(record);
    if (this.attempts.length > this.maxAttempts) {
      this.attempts = this.attempts.slice(-this.maxAttempts);
    }

    await this.save();
    logger.info('EvolutionMemory', `Recorded: ${record.id} [${record.status}] → ${record.targetForm}`);
    return record;
  }

  async updateAttempt(id: string, updates: Partial<TransformationAttempt>): Promise<void> {
    const attempt = this.attempts.find(a => a.id === id);
    if (attempt) {
      Object.assign(attempt, updates);
      await this.save();
    }
  }

  getAttempts(limit = 50): TransformationAttempt[] {
    return this.attempts.slice(-limit);
  }

  getSuccessfulAttempts(): TransformationAttempt[] {
    return this.attempts.filter(a => a.status === 'success');
  }

  getFailedAttempts(): TransformationAttempt[] {
    return this.attempts.filter(a => a.status === 'failure' || a.status === 'rolled_back');
  }

  getAttemptsForForm(form: string): TransformationAttempt[] {
    return this.attempts.filter(a => a.targetForm === form);
  }

  getStats(): EvolutionStats {
    const total = this.attempts.length;
    const successes = this.attempts.filter(a => a.status === 'success').length;
    const failures = this.attempts.filter(a => a.status === 'failure').length;
    const rolledBack = this.attempts.filter(a => a.status === 'rolled_back').length;
    const successRate = total > 0 ? successes / total : 0;
    const avgDuration = total > 0
      ? this.attempts.reduce((sum, a) => sum + a.duration, 0) / total
      : 0;

    // Find best/worst form by success rate
    const formStats = new Map<string, { successes: number; total: number }>();
    for (const a of this.attempts) {
      const stats = formStats.get(a.targetForm) || { successes: 0, total: 0 };
      stats.total++;
      if (a.status === 'success') stats.successes++;
      formStats.set(a.targetForm, stats);
    }

    let bestForm = '';
    let worstForm = '';
    let bestRate = -1;
    let worstRate = 2;

    for (const [form, stats] of formStats) {
      const rate = stats.total > 0 ? stats.successes / stats.total : 0;
      if (rate > bestRate) { bestRate = rate; bestForm = form; }
      if (rate < worstRate) { worstRate = rate; worstForm = form; }
    }

    // Calculate trend from last 10 attempts
    const recent = this.attempts.slice(-10);
    const recentSuccessRate = recent.length > 0
      ? recent.filter(a => a.status === 'success').length / recent.length
      : 0;
    const older = this.attempts.slice(-20, -10);
    const olderSuccessRate = older.length > 0
      ? older.filter(a => a.status === 'success').length / older.length
      : 0;

    let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentSuccessRate > olderSuccessRate + 0.1) recentTrend = 'improving';
    else if (recentSuccessRate < olderSuccessRate - 0.1) recentTrend = 'declining';

    return {
      totalAttempts: total,
      successes,
      failures,
      rolledBack,
      successRate,
      averageDuration: avgDuration,
      bestForm,
      worstForm,
      recentTrend
    };
  }

  getLessonsForForm(form: string): string[] {
    return this.attempts
      .filter(a => a.targetForm === form && a.lessons.length > 0)
      .flatMap(a => a.lessons);
  }

  shouldRetry(form: string): boolean {
    const formAttempts = this.getAttemptsForForm(form);
    if (formAttempts.length === 0) return true;
    const lastAttempt = formAttempts[formAttempts.length - 1];
    if (lastAttempt.retryCount >= 3) return false;
    if (lastAttempt.status === 'success') return false;
    return true;
  }

  getMaxRetryCount(form: string): number {
    const formAttempts = this.getAttemptsForForm(form);
    if (formAttempts.length === 0) return 0;
    return Math.max(...formAttempts.map(a => a.retryCount));
  }
}
