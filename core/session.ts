import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SESSIONS_DIR = path.join(ROOT, 'memory', 'sessions');

export interface SessionEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt: number | null;
  entries: SessionEntry[];
  form: string;
  model: string;
}

export class SessionPersistence {
  private currentSession: Session | null = null;
  private maxEntriesPerSession = 500;

  async init(): Promise<void> {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
    await this.cleanupOldSessions();
  }

  async startSession(form: string, model: string): Promise<Session> {
    this.currentSession = {
      id: `session_${Date.now()}`,
      startedAt: Date.now(),
      endedAt: null,
      entries: [],
      form,
      model
    };
    logger.info('Session', `Started: ${this.currentSession.id}`);
    return this.currentSession;
  }

  async addEntry(role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.entries.push({
      role,
      content,
      timestamp: Date.now()
    });

    if (this.currentSession.entries.length > this.maxEntriesPerSession) {
      await this.saveSession();
      this.currentSession.entries = [];
      this.currentSession.startedAt = Date.now();
    }
  }

  async endSession(): Promise<void> {
    if (!this.currentSession) return;
    this.currentSession.endedAt = Date.now();
    await this.saveSession();
    logger.info('Session', `Ended: ${this.currentSession.id} (${this.currentSession.entries.length} entries)`);
    this.currentSession = null;
  }

  private async saveSession(): Promise<void> {
    if (!this.currentSession || this.currentSession.entries.length === 0) return;
    const filePath = path.join(SESSIONS_DIR, `${this.currentSession.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(this.currentSession, null, 2), 'utf-8');
  }

  async getRecentSessions(limit = 10): Promise<Session[]> {
    const files = await fs.readdir(SESSIONS_DIR);
    const sessions: Session[] = [];

    for (const file of files.filter(f => f.endsWith('.json')).slice(-limit)) {
      try {
        const raw = await fs.readFile(path.join(SESSIONS_DIR, file), 'utf-8');
        sessions.push(JSON.parse(raw) as Session);
      } catch {
        // skip corrupted
      }
    }

    return sessions.sort((a, b) => b.startedAt - a.startedAt);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const raw = await fs.readFile(path.join(SESSIONS_DIR, `${sessionId}.json`), 'utf-8');
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }

  async searchSessions(query: string): Promise<SessionEntry[]> {
    const results: SessionEntry[] = [];
    const files = await fs.readdir(SESSIONS_DIR);
    const queryLower = query.toLowerCase();

    for (const file of files.filter(f => f.endsWith('.json'))) {
      try {
        const raw = await fs.readFile(path.join(SESSIONS_DIR, file), 'utf-8');
        const session = JSON.parse(raw) as Session;
        for (const entry of session.entries) {
          if (entry.content.toLowerCase().includes(queryLower)) {
            results.push(entry);
          }
        }
      } catch {
        // skip
      }
    }

    return results.slice(-20);
  }

  async exportSessionMarkdown(sessionId: string): Promise<string | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const lines = [
      `# ULTIMATE Session Export`,
      `ID: ${session.id}`,
      `Started: ${new Date(session.startedAt).toISOString()}`,
      `Ended: ${session.endedAt ? new Date(session.endedAt).toISOString() : 'ongoing'}`,
      `Form: ${session.form}`,
      `Model: ${session.model}`,
      `Entries: ${session.entries.length}`,
      '',
      '---',
      ''
    ];

    for (const entry of session.entries) {
      const date = new Date(entry.timestamp).toLocaleString('fr-FR');
      const role = entry.role === 'user' ? '**You**' : entry.role === 'assistant' ? '**ULTIMATE**' : '⚙ System';
      lines.push(`### ${date}`);
      lines.push(`${role}: ${entry.content}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private async cleanupOldSessions(): Promise<void> {
    try {
      const files = await fs.readdir(SESSIONS_DIR);
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
      const maxSessions = 50;

      if (jsonFiles.length > maxSessions) {
        const toDelete = jsonFiles.slice(0, jsonFiles.length - maxSessions);
        for (const file of toDelete) {
          await fs.rm(path.join(SESSIONS_DIR, file), { force: true });
        }
        logger.info('Session', `Cleaned up ${toDelete.length} old sessions`);
      }
    } catch {
      // ignore
    }
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }
}
