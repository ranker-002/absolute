import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MARKETPLACE_DIR = path.join(ROOT, 'marketplace');

export interface MarketplaceSkill {
  name: string;
  author: string;
  version: string;
  description: string;
  domains: string[];
  systemPromptAddition: string;
  capabilities: string[];
  downloads: number;
  rating: number;
  createdAt: number;
}

export class Marketplace {
  async init(): Promise<void> {
    await fs.mkdir(MARKETPLACE_DIR, { recursive: true });
    await this.seedPopular();
  }

  private async seedPopular(): Promise<void> {
    const popular: MarketplaceSkill[] = [
      {
        name: 'web-developer',
        author: 'community',
        version: '1.0.0',
        description: 'Full-stack web development expert',
        domains: ['html', 'css', 'javascript', 'react', 'node'],
        systemPromptAddition: 'You are an expert web developer. Write clean, performant, accessible code.',
        capabilities: ['HTML/CSS', 'React', 'Node.js', 'TypeScript', 'APIs'],
        downloads: 1520,
        rating: 4.8,
        createdAt: Date.now()
      },
      {
        name: 'python-expert',
        author: 'community',
        version: '1.0.0',
        description: 'Python development and data science',
        domains: ['python', 'data', 'ml', 'automation'],
        systemPromptAddition: 'You are a Python expert. Write Pythonic, well-documented code.',
        capabilities: ['Python', 'Pandas', 'NumPy', 'FastAPI', 'CLI tools'],
        downloads: 1340,
        rating: 4.7,
        createdAt: Date.now()
      },
      {
        name: 'devops-engineer',
        author: 'community',
        version: '1.0.0',
        description: 'DevOps, Docker, CI/CD, and infrastructure',
        domains: ['docker', 'kubernetes', 'ci-cd', 'cloud'],
        systemPromptAddition: 'You are a DevOps expert. Write infrastructure-as-code, Dockerfiles, CI/CD pipelines.',
        capabilities: ['Docker', 'Kubernetes', 'GitHub Actions', 'Terraform', 'AWS'],
        downloads: 980,
        rating: 4.6,
        createdAt: Date.now()
      },
      {
        name: 'ui-designer',
        author: 'community',
        version: '1.0.0',
        description: 'UI/UX design and frontend architecture',
        domains: ['design', 'ui', 'ux', 'css', 'animation'],
        systemPromptAddition: 'You are a UI/UX designer. Create beautiful, accessible, responsive interfaces.',
        capabilities: ['Design systems', 'Tailwind', 'Framer Motion', 'Accessibility', 'Responsive design'],
        downloads: 870,
        rating: 4.5,
        createdAt: Date.now()
      },
      {
        name: 'security-analyst',
        author: 'community',
        version: '1.0.0',
        description: 'Cybersecurity and code auditing',
        domains: ['security', 'pentest', 'audit', 'crypto'],
        systemPromptAddition: 'You are a security expert. Analyze code for vulnerabilities, suggest fixes, follow OWASP.',
        capabilities: ['OWASP', 'Static analysis', 'Cryptography', 'Penetration testing', 'Security auditing'],
        downloads: 760,
        rating: 4.9,
        createdAt: Date.now()
      }
    ];

    for (const skill of popular) {
      const filePath = path.join(MARKETPLACE_DIR, skill.name + '.json');
      try { await fs.access(filePath); } catch (_e) {
        await fs.writeFile(filePath, JSON.stringify(skill, null, 2), 'utf-8');
      }
    }
  }

  async list(): Promise<MarketplaceSkill[]> {
    const files = await fs.readdir(MARKETPLACE_DIR);
    const skills: MarketplaceSkill[] = [];
    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const raw = await fs.readFile(path.join(MARKETPLACE_DIR, file), 'utf-8');
        skills.push(JSON.parse(raw) as MarketplaceSkill);
      } catch (_e) { /* skip */ }
    }
    return skills.sort((a, b) => b.downloads - a.downloads);
  }

  async search(query: string): Promise<MarketplaceSkill[]> {
    const all = await this.list();
    const q = query.toLowerCase();
    return all.filter(s =>
      s.name.includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.domains.some(d => d.includes(q)) ||
      s.capabilities.some(c => c.toLowerCase().includes(q))
    );
  }

  async install(name: string): Promise<boolean> {
    const skills = await this.list();
    const skill = skills.find(s => s.name === name);
    if (!skill) return false;

    // Register in skills registry
    const regPath = path.join(ROOT, 'skills', 'registry.json');
    const registry = JSON.parse(await fs.readFile(regPath, 'utf-8')) as { skills: Array<{ name: string }> };
    if (!registry.skills.find(s => s.name === name)) {
      registry.skills.push({
        name: skill.name,
        status: 'marketplace',
        domains: skill.domains,
        systemPromptAddition: skill.systemPromptAddition,
        capabilities: skill.capabilities,
        executionPatterns: [],
        qualityMetrics: [],
        relatedSkills: []
      } as any);
      await fs.writeFile(regPath, JSON.stringify(registry, null, 2), 'utf-8');
    }

    skill.downloads++;
    await fs.writeFile(path.join(MARKETPLACE_DIR, name + '.json'), JSON.stringify(skill, null, 2), 'utf-8');

    logger.info('Marketplace', 'Installed: ' + name);
    return true;
  }

  async publish(skill: Omit<MarketplaceSkill, 'downloads' | 'rating' | 'createdAt'>): Promise<void> {
    const entry: MarketplaceSkill = {
      ...skill,
      downloads: 0,
      rating: 0,
      createdAt: Date.now()
    };
    await fs.writeFile(
      path.join(MARKETPLACE_DIR, entry.name + '.json'),
      JSON.stringify(entry, null, 2),
      'utf-8'
    );
    logger.info('Marketplace', 'Published: ' + entry.name);
  }
}
