import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DNAData } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DNA_PATH = path.join(__dirname, 'dna.json');
let _instance: DNA | null = null;

export class DNA {
  public data: DNAData;

  constructor(data: DNAData) {
    this.data = data;
  }

  static async load(): Promise<DNA> {
    if (_instance) return _instance;
    const raw = await fs.readFile(DNA_PATH, 'utf-8');
    _instance = new DNA(JSON.parse(raw) as DNAData);
    return _instance;
  }

  static getInstance(): DNA {
    if (!_instance) throw new Error('DNA non chargé. Appelle DNA.load() en premier.');
    return _instance;
  }

  async save(): Promise<void> {
    await fs.writeFile(DNA_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  async incrementMutations(transformationDetails: Record<string, unknown>): Promise<void> {
    this.data.mutations++;
    this.data.identity.version = this.generateVersion();
    this.data.evolution_log.push({
      timestamp: Date.now(),
      mutation: this.data.mutations,
      ...transformationDetails
    });
    if (this.data.evolution_log.length > 100) {
      this.data.evolution_log = this.data.evolution_log.slice(-100);
    }
    await this.save();
  }

  async addActiveSkill(skillName: string): Promise<void> {
    if (!this.data.memory.active_skills.includes(skillName)) {
      this.data.memory.active_skills.push(skillName);
      await this.save();
    }
  }

  async updatePreference(key: string, value: unknown): Promise<void> {
    this.data.memory.user_preferences[key] = value;
    await this.save();
  }

  async logInteraction(): Promise<void> {
    this.data.memory.interaction_count++;
    await this.save();
  }

  generateVersion(): string {
    const m = this.data.mutations;
    return `${Math.floor(m / 100)}.${Math.floor((m % 100) / 10)}.${m % 10}`;
  }

  get mutations(): number {
    return this.data.mutations;
  }
  get currentForm(): string {
    return this.data.identity.currentForm;
  }
  get activeSkills(): string[] {
    return this.data.memory.active_skills;
  }
  get preferences(): Record<string, unknown> {
    return this.data.memory.user_preferences;
  }
}
