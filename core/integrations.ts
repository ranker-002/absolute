import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';
import { SystemTools } from './system_tools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const sys = new SystemTools();

export interface IntegrationConfig {
  name: string;
  type: 'github' | 'discord' | 'slack' | 'email' | 'webhook' | 'telegram';
  enabled: boolean;
  config: Record<string, string>;
}

export interface IntegrationEvent {
  type: string;
  source: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export class Integrations {
  private integrations: IntegrationConfig[] = [];
  private configPath = path.join(ROOT, 'integrations.json');

  async init(): Promise<void> {
    await this.load();
    this.detectEnvIntegrations();
  }

  private async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.configPath, 'utf-8');
      this.integrations = JSON.parse(raw) as IntegrationConfig[];
    } catch {
      this.integrations = [];
    }
  }

  private async save(): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(this.integrations, null, 2), 'utf-8');
  }

  private detectEnvIntegrations(): void {
    if (process.env.GITHUB_TOKEN) {
      this.addIfMissing({ name: 'github', type: 'github', enabled: true, config: { token: process.env.GITHUB_TOKEN } });
    }
    if (process.env.DISCORD_BOT_TOKEN) {
      this.addIfMissing({ name: 'discord', type: 'discord', enabled: true, config: { token: process.env.DISCORD_BOT_TOKEN, channel: process.env.DISCORD_CHANNEL || '' } });
    }
    if (process.env.SLACK_BOT_TOKEN) {
      this.addIfMissing({ name: 'slack', type: 'slack', enabled: true, config: { token: process.env.SLACK_BOT_TOKEN, channel: process.env.SLACK_CHANNEL || '' } });
    }
    if (process.env.TELEGRAM_BOT_TOKEN) {
      this.addIfMissing({ name: 'telegram', type: 'telegram', enabled: true, config: { token: process.env.TELEGRAM_BOT_TOKEN, chat_id: process.env.TELEGRAM_CHAT_ID || '' } });
    }
    if (process.env.WEBHOOK_URL) {
      this.addIfMissing({ name: 'webhook', type: 'webhook', enabled: true, config: { url: process.env.WEBHOOK_URL } });
    }
  }

  private addIfMissing(integration: IntegrationConfig): void {
    if (!this.integrations.find(i => i.name === integration.name)) {
      this.integrations.push(integration);
      this.save();
      logger.info('Integrations', 'Detected: ' + integration.type);
    }
  }

  getActive(): IntegrationConfig[] {
    return this.integrations.filter(i => i.enabled);
  }

  async notify(event: IntegrationEvent): Promise<void> {
    for (const integration of this.getActive()) {
      try {
        await this.sendToIntegration(integration, event);
      } catch (err) {
        logger.error('Integrations', 'Failed to notify ' + integration.name + ': ' + (err as Error).message);
      }
    }
  }

  private async sendToIntegration(integration: IntegrationConfig, event: IntegrationEvent): Promise<void> {
    const message = `[ULTIMATE] ${event.type}: ${JSON.stringify(event.data).substring(0, 500)}`;

    switch (integration.type) {
      case 'github':
        await this.notifyGitHub(integration.config.token, event);
        break;
      case 'discord':
        await this.notifyDiscord(integration.config.token, integration.config.channel, message);
        break;
      case 'slack':
        await this.notifySlack(integration.config.token, integration.config.channel, message);
        break;
      case 'webhook':
        await this.notifyWebhook(integration.config.url, event);
        break;
      case 'telegram':
        await this.notifyTelegram(integration.config.token, integration.config.chat_id, message);
        break;
    }
  }

  private async notifyGitHub(token: string, event: IntegrationEvent): Promise<void> {
    if (event.type === 'transformation') {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);
      try {
        await execAsync('git add -A && git commit -m "auto: ' + (event.data.summary || 'update') + '"', { cwd: ROOT });
      } catch { /* nothing to commit */ }
    }
  }

  private async notifyDiscord(token: string, channel: string, message: string): Promise<void> {
    if (!channel) return;
    await fetch('https://discord.com/api/v10/channels/' + channel + '/messages', {
      method: 'POST',
      headers: { 'Authorization': 'Bot ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message.substring(0, 2000) })
    });
  }

  private async notifySlack(token: string, channel: string, message: string): Promise<void> {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, text: message })
    });
  }

  private async notifyWebhook(url: string, event: IntegrationEvent): Promise<void> {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  }

  private async notifyTelegram(token: string, chatId: string, message: string): Promise<void> {
    if (!chatId) return;
    await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message })
    });
  }
}
