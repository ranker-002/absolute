import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../core/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORY_FILE = path.join(__dirname, 'memory.json');

type MemoryEntry = {
  key: string;
  value: unknown;
  timestamp: number;
};

type MemoryData = {
  shortTerm: MemoryEntry[];
  longTerm: Record<string, unknown>;
  longTermTimestamps: Record<string, number>;
  patterns: string[];
};

export class UniversalMemory {
  private data: MemoryData = {
    shortTerm: [],
    longTerm: {},
    longTermTimestamps: {},
    patterns: []
  };
  private maxShortTerm = 50;
  private maxLongTerm = 200;
  private maxPatterns = 300;

  async restore(): Promise<void> {
    try {
      const raw = await fs.readFile(MEMORY_FILE, 'utf-8');
      const loaded = JSON.parse(raw) as Partial<MemoryData>;
      this.data = {
        shortTerm: loaded.shortTerm || [],
        longTerm: loaded.longTerm || {},
        longTermTimestamps: loaded.longTermTimestamps || {},
        patterns: loaded.patterns || []
      };
    } catch {
      logger.info('Memory', 'No existing memory found — starting fresh');
    }
  }

  async remember(key: string, value: unknown): Promise<void> {
    const entry: MemoryEntry = { key, value, timestamp: Date.now() };
    this.data.shortTerm.push(entry);

    if (this.data.shortTerm.length > this.maxShortTerm) {
      this.data.shortTerm = this.data.shortTerm.slice(-this.maxShortTerm);
    }

    this.data.longTerm[key] = value;
    this.data.longTermTimestamps[key] = Date.now();

    if (Object.keys(this.data.longTerm).length > this.maxLongTerm) {
      await this.pruneLongTerm();
    }

    if (key === 'interaction') {
      const val = value as { input?: string; output?: string };
      if (val.input) this.extractPattern(val.input);
    }

    await this.persist();
  }

  private async pruneLongTerm(): Promise<void> {
    const entries = Object.entries(this.data.longTermTimestamps);
    if (entries.length <= this.maxLongTerm) return;

    entries.sort((a, b) => a[1] - b[1]);
    const toRemove = entries.slice(0, entries.length - this.maxLongTerm);

    for (const [key] of toRemove) {
      delete this.data.longTerm[key];
      delete this.data.longTermTimestamps[key];
    }

    logger.info('Memory', `Pruned ${toRemove.length} old long-term entries`);
  }

  private extractPattern(text: string): void {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const stopWords = new Set([
      'this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'them',
      'your', 'about', 'would', 'could', 'should', 'there', 'their', 'what',
      'when', 'where', 'which', 'will', 'just', 'like', 'very', 'really',
      'some', 'more', 'than', 'also', 'into', 'does', 'dont', 'want', 'need'
    ]);

    const significantWords = words.filter(w => !stopWords.has(w));
    for (const word of significantWords.slice(0, 3)) {
      if (!this.data.patterns.includes(word)) {
        this.data.patterns.push(word);
      }
    }
    if (this.data.patterns.length > this.maxPatterns) {
      this.data.patterns = this.data.patterns.slice(-this.maxPatterns);
    }
  }

  async recall(query: string): Promise<MemoryEntry[]> {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length === 0) return this.getRecentContext(5);

    const scored = this.data.shortTerm.map(entry => {
      const entryStr = JSON.stringify(entry).toLowerCase();
      let score = 0;

      for (const word of queryWords) {
        const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
        const matches = entryStr.match(regex);
        if (matches) score += matches.length * 2;
      }

      if (entry.key === 'interaction') score += 1;
      if (entry.key === query.toLowerCase()) score += 5;

      const age = Date.now() - entry.timestamp;
      const recencyBoost = Math.max(0, 1 - age / (24 * 60 * 60 * 1000));
      score += recencyBoost * 0.5;

      return { entry, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(s => s.entry);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getRecentContext(n = 10): MemoryEntry[] {
    return this.data.shortTerm.slice(-n);
  }

  getStats(): { shortTerm: number; longTerm: number; totalSize: string; patterns: number } {
    const shortTerm = this.data.shortTerm.length;
    const longTerm = Object.keys(this.data.longTerm).length;
    const patterns = this.data.patterns.length;
    const jsonStr = JSON.stringify(this.data);
    const bytes = new TextEncoder().encode(jsonStr).length;
    return { shortTerm, longTerm, totalSize: this.formatBytes(bytes), patterns };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async persist(): Promise<void> {
    await fs.writeFile(MEMORY_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  async clear(): Promise<void> {
    this.data = { shortTerm: [], longTerm: {}, longTermTimestamps: {}, patterns: [] };
    await this.persist();
  }

  async exportToMarkdown(): Promise<string> {
    const lines = ['# ULTIMATE Memory Export', `Date: ${new Date().toISOString()}`, ''];

    lines.push('## Recent Interactions');
    for (const entry of this.data.shortTerm.filter(e => e.key === 'interaction')) {
      const val = entry.value as { input?: string; output?: string };
      const date = new Date(entry.timestamp).toLocaleString('fr-FR');
      lines.push(`### ${date}`);
      lines.push(`**User:** ${val.input || 'N/A'}`);
      lines.push(`**ULTIMATE:** ${val.output || 'N/A'}`);
      lines.push('');
    }

    lines.push('## Long-term Memory');
    for (const [key, value] of Object.entries(this.data.longTerm)) {
      lines.push(`- **${key}:** ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);
    }

    lines.push(`\n## Learned Patterns (${this.data.patterns.length})`);
    lines.push(this.data.patterns.join(', '));

    return lines.join('\n');
  }
}
