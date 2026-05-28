import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TEMPLATES_DIR = path.join(ROOT, 'templates');

export interface TransformationTemplate {
  name: string;
  description: string;
  form: string;
  domains: string[];
  systemPrompt: string;
  keyFeatures: string[];
  suggestedSkills: string[];
  packageDependencies: string[];
  entryPoint: string;
}

const BUILTIN_TEMPLATES: TransformationTemplate[] = [
  {
    name: 'blog',
    description: 'Transform into a blog engine',
    form: 'blog-engine',
    domains: ['content', 'markdown', 'rss'],
    systemPrompt: 'You are a blog engine. Transform ULTIMATE into a markdown-powered blog with RSS feed support.',
    keyFeatures: ['Markdown rendering', 'RSS feed', 'Post management', 'Tags/categories'],
    suggestedSkills: ['creative_writing', 'software_development'],
    packageDependencies: [],
    entryPoint: 'index.ts'
  },
  {
    name: 'ecommerce',
    description: 'Transform into an e-commerce assistant',
    form: 'ecommerce-assistant',
    domains: ['products', 'cart', 'payments'],
    systemPrompt: 'You are an e-commerce assistant. Help users manage products, carts, and orders.',
    keyFeatures: ['Product catalog', 'Cart management', 'Order tracking', 'Price comparison'],
    suggestedSkills: ['software_development', 'data_science'],
    packageDependencies: [],
    entryPoint: 'index.ts'
  },
  {
    name: 'dashboard',
    description: 'Transform into a data dashboard',
    form: 'data-dashboard',
    domains: ['charts', 'analytics', 'metrics'],
    systemPrompt: 'You are a data dashboard. Visualize data with charts and provide real-time analytics.',
    keyFeatures: ['Real-time charts', 'Metric tracking', 'Data visualization', 'Export reports'],
    suggestedSkills: ['data_science', 'software_development'],
    packageDependencies: [],
    entryPoint: 'index.ts'
  },
  {
    name: 'code-reviewer',
    description: 'Transform into a code review assistant',
    form: 'code-reviewer',
    domains: ['code-quality', 'security', 'best-practices'],
    systemPrompt: 'You are an expert code reviewer. Analyze code for quality, security, and best practices.',
    keyFeatures: ['Code analysis', 'Security scanning', 'Best practices', 'Refactoring suggestions'],
    suggestedSkills: ['software_development', 'cybersecurity'],
    packageDependencies: [],
    entryPoint: 'index.ts'
  },
  {
    name: 'chatbot',
    description: 'Transform into a customer support chatbot',
    form: 'support-chatbot',
    domains: ['support', 'faq', 'ticketing'],
    systemPrompt: 'You are a customer support chatbot. Help users with their questions and create support tickets.',
    keyFeatures: ['FAQ matching', 'Ticket creation', 'Escalation logic', 'Sentiment analysis'],
    suggestedSkills: ['creative_writing', 'data_science'],
    packageDependencies: [],
    entryPoint: 'index.ts'
  },
  {
    name: 'research',
    description: 'Transform into a research assistant',
    form: 'research-assistant',
    domains: ['research', 'analysis', 'synthesis'],
    systemPrompt: 'You are a research assistant. Help users find, analyze, and synthesize information.',
    keyFeatures: ['Information gathering', 'Analysis', 'Citation management', 'Report generation'],
    suggestedSkills: ['science_research', 'data_science'],
    packageDependencies: [],
    entryPoint: 'index.ts'
  },
  {
    name: 'api-gateway',
    description: 'Transform into an API gateway/proxy',
    form: 'api-gateway',
    domains: ['api', 'proxy', 'routing'],
    systemPrompt: 'You are an API gateway. Route requests, transform payloads, and manage API keys.',
    keyFeatures: ['Request routing', 'Payload transformation', 'Rate limiting', 'API key management'],
    suggestedSkills: ['software_development', 'cybersecurity'],
    packageDependencies: [],
    entryPoint: 'index.ts'
  },
  {
    name: 'automation',
    description: 'Transform into an automation engine',
    form: 'automation-engine',
    domains: ['automation', 'workflows', 'scheduling'],
    systemPrompt: 'You are an automation engine. Create and manage automated workflows and scheduled tasks.',
    keyFeatures: ['Workflow creation', 'Task scheduling', 'Conditional logic', 'Integration hooks'],
    suggestedSkills: ['software_development', 'meta_skill_creation'],
    packageDependencies: [],
    entryPoint: 'index.ts'
  }
];

export class TemplateManager {
  private templates: TransformationTemplate[] = [...BUILTIN_TEMPLATES];

  async init(): Promise<void> {
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    await this.loadCustomTemplates();
    await this.saveBuiltins();
  }

  private async loadCustomTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(TEMPLATES_DIR);
      for (const file of files.filter(f => f.endsWith('.json'))) {
        try {
          const raw = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf-8');
          const template = JSON.parse(raw) as TransformationTemplate;
          if (template.name && template.form) {
            this.templates.push(template);
          }
        } catch {
          // skip corrupted
        }
      }
    } catch {
      // first run
    }
  }

  private async saveBuiltins(): Promise<void> {
    for (const template of BUILTIN_TEMPLATES) {
      const filePath = path.join(TEMPLATES_DIR, `${template.name}.json`);
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8');
      }
    }
  }

  async addCustomTemplate(template: TransformationTemplate): Promise<void> {
    this.templates.push(template);
    const filePath = path.join(TEMPLATES_DIR, `${template.name}.json`);
    await fs.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8');
    logger.info('Templates', `Added custom template: ${template.name}`);
  }

  getTemplate(name: string): TransformationTemplate | undefined {
    return this.templates.find(t => t.name === name || t.form === name);
  }

  getAllTemplates(): TransformationTemplate[] {
    return [...this.templates];
  }

  getByDomain(domain: string): TransformationTemplate[] {
    return this.templates.filter(t => t.domains.includes(domain));
  }

  search(query: string): TransformationTemplate[] {
    const q = query.toLowerCase();
    return this.templates.filter(t =>
      t.name.includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.form.includes(q) ||
      t.domains.some(d => d.includes(q))
    );
  }

  async deleteTemplate(name: string): Promise<boolean> {
    const idx = this.templates.findIndex(t => t.name === name);
    if (idx === -1) return false;
    this.templates.splice(idx, 1);
    try {
      await fs.rm(path.join(TEMPLATES_DIR, `${name}.json`), { force: true });
    } catch {
      // ignore
    }
    return true;
  }
}
