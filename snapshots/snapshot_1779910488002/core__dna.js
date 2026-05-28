import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DNA_PATH = path.join(__dirname, 'dna.json');

let _instance = null;

export class DNA {
  constructor(data) {
    this.data = data;
  }

  static async load() {
    if (_instance) return _instance;
    const raw = await fs.readFile(DNA_PATH, 'utf-8');
    _instance = new DNA(JSON.parse(raw));
    return _instance;
  }

  static getInstance() {
    if (!_instance) throw new Error('DNA non chargé. Appelle DNA.load() en premier.');
    return _instance;
  }

  async save() {
    await fs.writeFile(DNA_PATH, JSON.stringify(this.data, null, 2));
  }

  async incrementMutations(transformationDetails) {
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

  async addActiveSkill(skillName) {
    if (!this.data.memory.active_skills.includes(skillName)) {
      this.data.memory.active_skills.push(skillName);
      await this.save();
    }
  }

  async updatePreference(key, value) {
    this.data.memory.user_preferences[key] = value;
    await this.save();
  }

  async logInteraction() {
    this.data.memory.interaction_count++;
    await this.save();
  }

  generateVersion() {
    const m = this.data.mutations;
    return `${Math.floor(m / 100)}.${Math.floor((m % 100) / 10)}.${m % 10}`;
  }

  get mutations() {
    return this.data.mutations;
  }
  get currentForm() {
    return this.data.identity.currentForm;
  }
  get activeSkills() {
    return this.data.memory.active_skills;
  }
  get preferences() {
    return this.data.memory.user_preferences;
  }
}
