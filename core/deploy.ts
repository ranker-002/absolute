import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';
import { LLMEngine } from './llm_engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const llm = new LLMEngine();

// ============ Deploy Manager ============
export interface DeployTarget {
  name: string;
  type: 'docker' | 'kubernetes' | 'vercel' | 'netlify' | 'aws' | 'railway' | 'flyio' | 'heroku' | 'manual';
  config: Record<string, string>;
  status: 'configured' | 'deploying' | 'deployed' | 'failed';
  lastDeploy?: number;
}

export class DeployManager {
  private targets: DeployTarget[] = [];

  async generateDockerfile(appName: string, tech: string): Promise<string> {
    const dockerfiles: Record<string, string> = {
      node: `FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]`,
      python: `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "main.py"]`,
      go: `FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o server .
FROM alpine:latest
COPY --from=builder /app/server /server
EXPOSE 8080
CMD ["/server"]`,
      rust: `FROM rust:1.77-slim AS builder
WORKDIR /app
COPY . .
RUN cargo build --release
FROM debian:bookworm-slim
COPY --from=builder /app/target/release/server /server
EXPOSE 8080
CMD ["/server"]`,
      static: `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
`
    };
    return dockerfiles[tech] || dockerfiles.node;
  }

  async generateDockerCompose(services: Array<{ name: string; port: number; env?: Record<string, string> }>): Promise<string> {
    let compose = 'version: "3.8"\nservices:\n';
    for (const svc of services) {
      compose += '  ' + svc.name + ':\n';
      compose += '    build: .\n';
      compose += '    ports:\n';
      compose += '      - "' + svc.port + ':' + svc.port + '"\n';
      if (svc.env) {
        compose += '    environment:\n';
        for (const [k, v] of Object.entries(svc.env)) {
          compose += '      - ' + k + '=' + v + '\n';
        }
      }
    }
    return compose;
  }

  async generateK8sManifest(appName: string, port: number): Promise<string> {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appName}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${appName}
  template:
    metadata:
      labels:
        app: ${appName}
    spec:
      containers:
      - name: ${appName}
        image: ${appName}:latest
        ports:
        - containerPort: ${port}
---
apiVersion: v1
kind: Service
metadata:
  name: ${appName}
spec:
  selector:
    app: ${appName}
  ports:
  - port: 80
    targetPort: ${port}
  type: LoadBalancer`;
  }

  async generateCIWorkflow(name: string, steps: string[]): Promise<string> {
    let yaml = `name: ${name}\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n`;
    for (const step of steps) {
      yaml += `      - run: ${step}\n`;
    }
    return yaml;
  }

  async generateNginxConfig(domain: string, port: number): Promise<string> {
    return `server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://localhost:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;
  }

  addTarget(target: DeployTarget): void {
    this.targets.push(target);
  }

  getTargets(): DeployTarget[] { return [...this.targets]; }
}

// ============ SaaS Mode ============
export interface Tenant {
  id: string;
  name: string;
  apiKey: string;
  quota: { requests: number; tokens: number };
  usage: { requests: number; tokens: number };
  createdAt: number;
  active: boolean;
}

export class SaaSServer {
  private tenants: Map<string, Tenant> = new Map();

  async createTenant(name: string, quota?: Partial<Tenant['quota']>): Promise<Tenant> {
    const tenant: Tenant = {
      id: 'tenant_' + Date.now(),
      name,
      apiKey: 'sk-ult-' + Math.random().toString(36).substring(2, 30),
      quota: { requests: 1000, tokens: 100000, ...quota },
      usage: { requests: 0, tokens: 0 },
      createdAt: Date.now(),
      active: true
    };
    this.tenants.set(tenant.id, tenant);
    logger.info('SaaS', 'Created tenant: ' + name);
    return tenant;
  }

  validateRequest(apiKey: string): Tenant | null {
    const tenant = Array.from(this.tenants.values()).find(t => t.apiKey === apiKey && t.active);
    if (!tenant) return null;
    if (tenant.usage.requests >= tenant.quota.requests) return null;
    return tenant;
  }

  recordUsage(tenantId: string, requests: number, tokens: number): void {
    const tenant = this.tenants.get(tenantId);
    if (tenant) {
      tenant.usage.requests += requests;
      tenant.usage.tokens += tokens;
    }
  }

  getTenants(): Tenant[] { return Array.from(this.tenants.values()); }
  getTenant(id: string): Tenant | undefined { return this.tenants.get(id); }
}

// ============ Webhook Handler ============
export interface WebhookConfig {
  id: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  lastTriggered?: number;
}

export class WebhookManager {
  private webhooks: WebhookConfig[] = [];

  async register(url: string, events: string[]): Promise<WebhookConfig> {
    const webhook: WebhookConfig = {
      id: 'wh_' + Date.now(),
      url,
      secret: Math.random().toString(36).substring(2, 20),
      events,
      enabled: true
    };
    this.webhooks.push(webhook);
    logger.info('Webhooks', 'Registered: ' + url);
    return webhook;
  }

  async trigger(event: string, data: Record<string, unknown>): Promise<void> {
    const targets = this.webhooks.filter(w => w.enabled && w.events.includes(event));
    for (const wh of targets) {
      try {
        await fetch(wh.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': wh.secret },
          body: JSON.stringify({ event, data, timestamp: Date.now() })
        });
        wh.lastTriggered = Date.now();
        logger.info('Webhooks', 'Triggered: ' + wh.url + ' for ' + event);
      } catch (err) {
        logger.error('Webhooks', 'Failed: ' + wh.url + ' - ' + (err as Error).message);
      }
    }
  }

  getWebhooks(): WebhookConfig[] { return [...this.webhooks]; }
  async remove(id: string): Promise<boolean> {
    const idx = this.webhooks.findIndex(w => w.id === id);
    if (idx === -1) return false;
    this.webhooks.splice(idx, 1);
    return true;
  }
}

// ============ Plugin SDK ============
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  entryPoint: string;
  hooks: string[];
  permissions: string[];
}

export class PluginSDK {
  private pluginsDir: string;

  constructor() {
    this.pluginsDir = path.join(ROOT, 'plugins');
  }

  async createScaffold(name: string): Promise<string> {
    const dir = path.join(this.pluginsDir, name);
    await fs.mkdir(dir, { recursive: true });

    const manifest: PluginManifest = {
      name,
      version: '1.0.0',
      description: 'A ULTIMATE plugin',
      author: 'unknown',
      entryPoint: 'index.ts',
      hooks: ['onStartup', 'onShutdown'],
      permissions: []
    };

    await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    const entry = `import { logger } from '../../core/logger.js';

export default {
  name: '${name}',
  hooks: {
    onStartup: async () => {
      logger.info('Plugin[${name}]', 'Started');
    },
    onShutdown: async () => {
      logger.info('Plugin[${name}]', 'Stopped');
    }
  }
};
`;
    await fs.writeFile(path.join(dir, 'index.ts'), entry, 'utf-8');

    logger.info('PluginSDK', 'Created scaffold: ' + dir);
    return dir;
  }

  async listPlugins(): Promise<PluginManifest[]> {
    try {
      const entries = await fs.readdir(this.pluginsDir);
      const plugins: PluginManifest[] = [];
      for (const entry of entries) {
        try {
          const raw = await fs.readFile(path.join(this.pluginsDir, entry, 'manifest.json'), 'utf-8');
          plugins.push(JSON.parse(raw) as PluginManifest);
        } catch (_e) { /* skip */ }
      }
      return plugins;
    } catch (_e) { return []; }
  }
}
