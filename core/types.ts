export type Role = 'user' | 'assistant';

export interface Message {
  role: Role;
  content: string;
}

export interface Intent {
  surface: string;
  deep: string;
  requiredSkills: string[];
  transformationNeeded: boolean;
  targetForm: string | null;
  urgency: 'low' | 'medium' | 'high';
  emotionalTone: string;
}

export interface SkillDefinition {
  name: string;
  status?: string;
  domains: string[];
  systemPromptAddition: string;
  capabilities: string[];
  executionPatterns: string[];
  qualityMetrics: string[];
  relatedSkills: string[];
}

export interface DNAData {
  identity: {
    name: string;
    version: string;
    birth: number;
    currentForm: string;
  };
  mutations: number;
  evolution_log: Record<string, unknown>[];
  memory: {
    user_preferences: Record<string, unknown>;
    learned_patterns: unknown[];
    active_skills: string[];
    transformation_history: Array<{ timestamp: number; from: string; to: string }>;
    interaction_count: number;
  };
  capabilities: {
    self_modify: boolean;
    learn_in_realtime: boolean;
    skill_acquisition: string;
    form_limit: string;
  };
}

export interface Interaction {
  input: string;
  output?: string;
  skills: string[];
}

export type UltimateConfig = {
  theme: string;
  model: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  maxTokens: number;
  streamEnabled: boolean;
  historySize: number;
  autoSaveHistory: boolean;
  language: 'fr' | 'en' | 'auto';
};
