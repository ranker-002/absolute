import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LLMEngine } from './llm_engine.js';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const KB_DIR = path.join(ROOT, 'knowledge');

const llm = new LLMEngine();

export interface DocEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  tags: string[];
  summary: string;
  embedding: number[];
  createdAt: number;
  accessCount: number;
}

export class KnowledgeEngine {
  private docs: Map<string, DocEntry> = new Map();

  async init(): Promise<void> {
    await fs.mkdir(KB_DIR, { recursive: true });
    await this.loadAll();
  }

  private async loadAll(): Promise<void> {
    try {
      const files = await fs.readdir(KB_DIR);
      for (const file of files.filter(f => f.endsWith('.json'))) {
        try {
          const raw = await fs.readFile(path.join(KB_DIR, file), 'utf-8');
          const doc = JSON.parse(raw) as DocEntry;
          this.docs.set(doc.id, doc);
        } catch { /* skip */ }
      }
    } catch { /* */ }
  }

  async ingestDocument(title: string, content: string, source: string = 'manual'): Promise<DocEntry> {
    // Auto-summarize
    let summary = content.substring(0, 200);
    if (content.length > 200) {
      try {
        const raw = await llm.generate({
          systemPrompt: 'Summarize this document in 1-2 sentences.',
          userPrompt: content.substring(0, 3000),
          maxTokens: 100
        });
        summary = raw;
      } catch { /* fallback to truncation */ }
    }

    // Auto-tag
    let tags: string[] = [];
    try {
      const raw = await llm.generate({
        systemPrompt: 'Extract 3-5 relevant tags as JSON array. Reply ONLY with the array.',
        userPrompt: 'Title: ' + title + '\nContent: ' + content.substring(0, 1000),
        maxTokens: 100
      });
      tags = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      tags = title.toLowerCase().split(/\s+/).slice(0, 3);
    }

    const doc: DocEntry = {
      id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title,
      content,
      source,
      tags,
      summary,
      embedding: this.computeEmbedding(title + ' ' + content),
      createdAt: Date.now(),
      accessCount: 0
    };

    this.docs.set(doc.id, doc);
    await this.saveDoc(doc);
    logger.info('Knowledge', 'Ingested: ' + title);
    return doc;
  }

  async ingestUrl(url: string): Promise<DocEntry | null> {
    try {
      const resp = await fetch(url);
      const text = await resp.text();
      // Extract title from HTML or use URL
      const titleMatch = text.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch?.[1] || url.split('/').pop() || url;
      // Strip HTML tags for content
      const content = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 10000);
      return await this.ingestDocument(title, content, url);
    } catch (err) {
      logger.error('Knowledge', 'Failed to ingest URL: ' + (err as Error).message);
      return null;
    }
  }

  async ingestCodebase(dir: string): Promise<DocEntry[]> {
    const entries: DocEntry[] = [];
    const files = await fs.readdir(path.join(ROOT, dir), { withFileTypes: true });

    for (const file of files) {
      if (file.isDirectory() || !file.name.endsWith('.ts')) continue;
      const filePath = path.join(dir, file.name);
      try {
        const content = await fs.readFile(path.join(ROOT, filePath), 'utf-8');
        const doc = await this.ingestDocument(file.name, content, filePath);
        entries.push(doc);
      } catch { /* skip */ }
    }

    logger.info('Knowledge', 'Ingested codebase: ' + entries.length + ' files');
    return entries;
  }

  async search(query: string, topK = 5): Promise<Array<{ doc: DocEntry; score: number }>> {
    const queryEmbedding = this.computeEmbedding(query);
    const results: Array<{ doc: DocEntry; score: number }> = [];

    for (const doc of this.docs.values()) {
      const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
      // Also boost for keyword matches
      const queryLower = query.toLowerCase();
      let keywordBoost = 0;
      if (doc.title.toLowerCase().includes(queryLower)) keywordBoost += 0.3;
      if (doc.tags.some(t => queryLower.includes(t))) keywordBoost += 0.2;
      if (doc.summary.toLowerCase().includes(queryLower)) keywordBoost += 0.1;

      results.push({ doc, score: score + keywordBoost });
    }

    // Update access counts
    for (const r of results.slice(0, topK)) {
      r.doc.accessCount++;
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  async getContext(query: string, maxChars = 3000): Promise<string> {
    const results = await this.search(query, 5);
    if (results.length === 0) return '';

    const parts: string[] = [];
    let totalChars = 0;

    for (const { doc, score } of results) {
      if (score < 0.1) continue;
      const text = '[' + doc.title + '] ' + doc.summary;
      if (totalChars + text.length > maxChars) break;
      parts.push(text);
      totalChars += text.length;
    }

    return parts.length > 0 ? 'RELEVANT KNOWLEDGE:\n' + parts.join('\n\n') : '';
  }

  async summarizeConversation(entries: Array<{ role: string; content: string }>): Promise<string> {
    if (entries.length === 0) return '';
    const text = entries.map(e => e.role + ': ' + e.content).join('\n');
    try {
      return await llm.generate({
        systemPrompt: 'Summarize this conversation in key points. Be concise.',
        userPrompt: text.substring(0, 5000),
        maxTokens: 500
      });
    } catch {
      return text.substring(0, 500);
    }
  }

  async crossSessionRecall(query: string): Promise<string> {
    // Search across all sessions
    const sessionsDir = path.join(ROOT, 'memory', 'sessions');
    try {
      const files = await fs.readdir(sessionsDir);
      const results: string[] = [];

      for (const file of files.filter(f => f.endsWith('.json'))) {
        try {
          const raw = await fs.readFile(path.join(sessionsDir, file), 'utf-8');
          const session = JSON.parse(raw) as { entries?: Array<{ content: string; role: string }> };
          if (!session.entries) continue;

          for (const entry of session.entries) {
            if (entry.content.toLowerCase().includes(query.toLowerCase())) {
              results.push(entry.content.substring(0, 200));
            }
          }
        } catch { /* skip */ }
      }

      return results.slice(-5).join('\n---\n');
    } catch {
      return '';
    }
  }

  private computeEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const dims = 64;
    const vec = new Array(dims).fill(0);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(j);
        hash = hash & hash;
      }
      vec[Math.abs(hash) % dims] += 1;
      vec[Math.abs(hash * 31) % dims] += 0.5;
    }

    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (norm > 0) for (let i = 0; i < vec.length; i++) vec[i] /= norm;
    return vec;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10);
  }

  private async saveDoc(doc: DocEntry): Promise<void> {
    await fs.writeFile(path.join(KB_DIR, doc.id + '.json'), JSON.stringify(doc, null, 2), 'utf-8');
  }

  getAll(): DocEntry[] { return Array.from(this.docs.values()); }
  get(id: string): DocEntry | undefined { return this.docs.get(id); }
  count(): number { return this.docs.size; }

  async delete(id: string): Promise<boolean> {
    if (!this.docs.has(id)) return false;
    this.docs.delete(id);
    try { await fs.rm(path.join(KB_DIR, id + '.json'), { force: true }); } catch { /* */ }
    return true;
  }
}
