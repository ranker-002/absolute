import { logger } from './logger.js';

interface CacheEntry {
  key: string;
  value: string;
  timestamp: number;
  hits: number;
}

export class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxEntries = 200;
  private maxAgeMs = 30 * 60 * 1000; // 30 minutes

  private generateKey(systemPrompt: string, messages: Array<{ role: string; content: string }>): string {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const promptHash = this.simpleHash(systemPrompt.substring(0, 200));
    const msgHash = this.simpleHash(lastUserMsg.substring(0, 200));
    return `${promptHash}_${msgHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  get(systemPrompt: string, messages: Array<{ role: string; content: string }>): string | null {
    const key = this.generateKey(systemPrompt, messages);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.maxAgeMs) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    logger.debug('Cache', `Hit for key ${key.substring(0, 8)} (${entry.hits} hits)`);
    return entry.value;
  }

  set(systemPrompt: string, messages: Array<{ role: string; content: string }>, value: string): void {
    const key = this.generateKey(systemPrompt, messages);

    if (this.cache.size >= this.maxEntries) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }

    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
      hits: 0
    });

    logger.debug('Cache', `Stored key ${key.substring(0, 8)}`);
  }

  has(systemPrompt: string, messages: Array<{ role: string; content: string }>): boolean {
    return this.get(systemPrompt, messages) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxEntries: number; totalHits: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }
    return { size: this.cache.size, maxEntries: this.maxEntries, totalHits };
  }

  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.maxAgeMs) {
        this.cache.delete(key);
      }
    }
  }
}
