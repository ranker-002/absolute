import { logger } from './logger.js';

export interface Embedding {
  vector: number[];
  text: string;
  timestamp: number;
}

export class EmbeddingsMemory {
  private embeddings: Embedding[] = [];
  private dimensions = 128;

  async add(text: string): Promise<void> {
    const vector = this.simpleHashEmbedding(text);
    this.embeddings.push({ vector, text, timestamp: Date.now() });

    if (this.embeddings.length > 500) {
      this.embeddings = this.embeddings.slice(-500);
    }
  }

  async search(query: string, topK = 5): Promise<Array<{ text: string; score: number }>> {
    const queryVector = this.simpleHashEmbedding(query);

    const scored = this.embeddings.map(entry => ({
      text: entry.text,
      score: this.cosineSimilarity(queryVector, entry.vector)
    }));

    return scored
      .filter(s => s.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private simpleHashEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(this.dimensions).fill(0);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(j);
        hash = hash & hash;
      }
      const idx = Math.abs(hash) % this.dimensions;
      vector[idx] += 1;
      const idx2 = Math.abs(hash * 31) % this.dimensions;
      vector[idx2] += 0.5;
    }

    // Normalize
    const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) vector[i] /= norm;
    }

    return vector;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
  }

  getCount(): number {
    return this.embeddings.length;
  }

  clear(): void {
    this.embeddings = [];
  }
}
