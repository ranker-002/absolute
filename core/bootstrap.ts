import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DNAData } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

export async function bootstrap(): Promise<{ isFirstLaunch: boolean; dnaPath: string }> {
  const dnaPath = path.join(ROOT, 'core', 'dna.json');
  const memoryDir = path.join(ROOT, 'memory');
  const skillsDir = path.join(ROOT, 'skills');
  const snapshotsDir = path.join(ROOT, 'snapshots');
  const formsDir = path.join(ROOT, 'forms', 'history');

  for (const dir of [memoryDir, skillsDir, snapshotsDir, formsDir]) {
    await fs.mkdir(dir, { recursive: true });
  }

  const isFirstLaunch = !(await fileExists(dnaPath));
  if (isFirstLaunch) {
    await createInitialDNA(dnaPath);
    await createSkillsRegistry(skillsDir);
  }

  return { isFirstLaunch, dnaPath };
}

async function createInitialDNA(dnaPath: string): Promise<void> {
  const initialDNA: DNAData = {
    identity: {
      name: 'ULTIMATE',
      version: '1.0.0',
      birth: Date.now(),
      currentForm: 'terminal-cli'
    },
    mutations: 0,
    evolution_log: [],
    memory: {
      user_preferences: {},
      learned_patterns: [],
      active_skills: [],
      transformation_history: [],
      interaction_count: 0
    },
    capabilities: {
      self_modify: true,
      learn_in_realtime: true,
      skill_acquisition: 'unlimited',
      form_limit: 'none'
    }
  };
  await fs.writeFile(dnaPath, JSON.stringify(initialDNA, null, 2), 'utf-8');
}

async function createSkillsRegistry(skillsDir: string): Promise<void> {
  const registry = {
    skills: [
      { name: 'software_development', status: 'dormant', domains: ['js', 'python', 'rust', 'go', 'all'], systemPromptAddition: '', capabilities: [], executionPatterns: [], qualityMetrics: [], relatedSkills: [] },
      { name: 'music_composition', status: 'dormant', domains: ['midi', 'audio', 'theory'], systemPromptAddition: '', capabilities: [], executionPatterns: [], qualityMetrics: [], relatedSkills: [] },
      { name: 'graphic_design', status: 'dormant', domains: ['svg', 'ui', 'branding'], systemPromptAddition: '', capabilities: [], executionPatterns: [], qualityMetrics: [], relatedSkills: [] },
      { name: 'data_science', status: 'dormant', domains: ['ml', 'stats', 'visualization'], systemPromptAddition: '', capabilities: [], executionPatterns: [], qualityMetrics: [], relatedSkills: [] },
      { name: 'cybersecurity', status: 'dormant', domains: ['pentest', 'analysis', 'hardening'], systemPromptAddition: '', capabilities: [], executionPatterns: [], qualityMetrics: [], relatedSkills: [] },
      { name: 'algorithmic_trading', status: 'dormant', domains: ['strategy', 'backtest', 'execution'], systemPromptAddition: '', capabilities: [], executionPatterns: [], qualityMetrics: [], relatedSkills: [] },
      { name: 'creative_writing', status: 'dormant', domains: ['fiction', 'copywriting', 'poetry'], systemPromptAddition: '', capabilities: [], executionPatterns: [], qualityMetrics: [], relatedSkills: [] },
      { name: 'science_research', status: 'dormant', domains: ['physics', 'chemistry', 'biology'], systemPromptAddition: '', capabilities: [], executionPatterns: [], qualityMetrics: [], relatedSkills: [] },
      { name: 'game_development', status: 'dormant', domains: ['logic', 'assets', 'engine'], systemPromptAddition: '', capabilities: [], executionPatterns: [], qualityMetrics: [], relatedSkills: [] },
      { name: 'meta_skill_creation', status: 'always_active', domains: ['synthesis', 'learning'], systemPromptAddition: '', capabilities: [], executionPatterns: [], qualityMetrics: [], relatedSkills: [] }
    ]
  };
  await fs.writeFile(path.join(skillsDir, 'registry.json'), JSON.stringify(registry, null, 2), 'utf-8');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (_e) {
    return false;
  }
}
