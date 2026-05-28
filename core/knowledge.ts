import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const KNOWLEDGE_DIR = path.join(ROOT, 'knowledge');

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export class KnowledgeBase {
  async init(): Promise<void> {
    await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
    await this.createDefaultKnowledge();
  }

  private async createDefaultKnowledge(): Promise<void> {
    const files = await fs.readdir(KNOWLEDGE_DIR).catch(() => []);
    if (files.length > 0) return;

    await this.addEntry({
      title: 'ULTIMATE Architecture',
      content: `ULTIMATE is a self-evolving AI entity built in TypeScript.
Core modules: DNA, IntentEngine, Transformer, SkillActivator, EvolutionLoop, LLMEngine, SnapshotManager.
UI: blessed-based TUI with 10 themes.
Memory: short-term (50 entries) + long-term (200 keys) + patterns.
Skills: synthesizable on-the-fly via LLM.
Self-transformation: snapshot → LLM codegen → validate → write → relaunch.`,
      tags: ['architecture', 'typescript', 'self-evolution']
    });

    await this.addEntry({
      title: 'Transformation Best Practices',
      content: `When transforming ULTIMATE:
1. Always create a snapshot first
2. Validate TypeScript syntax before writing
3. Keep core/dna.json, core/dna.ts, core/snapshot.ts, memory/ untouched
4. Run tests after transformation
5. Auto-rollback if tests fail
6. Commit to git after successful transformation
7. Record lessons learned in evolution memory`,
      tags: ['transformation', 'best-practices', 'safety']
    });

    await this.addEntry({
      title: 'French Intent Patterns',
      content: `French transformation triggers:
- "deviens X" → become X
- "transforme-toi en X" → transform into X
- "je veux une app X" → I want an X app
- "crée-toi X" → create yourself X
- "change de forme" → change form`,
      tags: ['intent', 'french', 'patterns']
    });
  }

  async addEntry(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeEntry> {
    const full: KnowledgeEntry = {
      id: `kb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...entry
    };

    const filePath = path.join(KNOWLEDGE_DIR, `${full.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(full, null, 2), 'utf-8');
    logger.debug('Knowledge', `Added: ${full.title}`);
    return full;
  }

  async updateEntry(id: string, updates: Partial<KnowledgeEntry>): Promise<void> {
    const filePath = path.join(KNOWLEDGE_DIR, `${id}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const entry = JSON.parse(raw) as KnowledgeEntry;
      Object.assign(entry, updates, { updatedAt: Date.now() });
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    } catch (_e) {
      logger.error('Knowledge', `Entry not found: ${id}`);
    }
  }

  async getEntry(id: string): Promise<KnowledgeEntry | null> {
    try {
      const raw = await fs.readFile(path.join(KNOWLEDGE_DIR, `${id}.json`), 'utf-8');
      return JSON.parse(raw) as KnowledgeEntry;
    } catch (_e) {
      return null;
    }
  }

  async search(query: string): Promise<KnowledgeEntry[]> {
    const files = await fs.readdir(KNOWLEDGE_DIR);
    const results: Array<{ entry: KnowledgeEntry; score: number }> = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const raw = await fs.readFile(path.join(KNOWLEDGE_DIR, file), 'utf-8');
        const entry = JSON.parse(raw) as KnowledgeEntry;
        let score = 0;

        for (const word of queryWords) {
          if (entry.title.toLowerCase().includes(word)) score += 3;
          if (entry.content.toLowerCase().includes(word)) score += 1;
          if (entry.tags.some(t => t.includes(word))) score += 2;
        }

        if (score > 0) results.push({ entry, score });
      } catch (_e) {
        // skip
      }
    }

    return results.sort((a, b) => b.score - a.score).map(r => r.entry);
  }

  async getAll(): Promise<KnowledgeEntry[]> {
    const files = await fs.readdir(KNOWLEDGE_DIR);
    const entries: KnowledgeEntry[] = [];

    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const raw = await fs.readFile(path.join(KNOWLEDGE_DIR, file), 'utf-8');
        entries.push(JSON.parse(raw) as KnowledgeEntry);
      } catch (_e) {
        // skip
      }
    }

    return entries.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteEntry(id: string): Promise<boolean> {
    try {
      await fs.rm(path.join(KNOWLEDGE_DIR, `${id}.json`), { force: true });
      return true;
    } catch (_e) {
      return false;
    }
  }

  async toPromptContext(query: string, maxEntries = 5): Promise<string> {
    const entries = await this.search(query);
    if (entries.length === 0) return '';

    const context = entries.slice(0, maxEntries).map(e =>
      `[${e.title}]\n${e.content}`
    ).join('\n\n');

    return `RELEVANT KNOWLEDGE:\n${context}`;
  }
}
