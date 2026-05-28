import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'ultimate.config.json');

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

class Logger {
  private level: LogLevel = 'info';
  private entries: LogEntry[] = [];
  private maxEntries = 500;
  private outputToFile = false;
  private logFile = '';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  enableFileOutput(filePath: string): void {
    this.outputToFile = true;
    this.logFile = filePath;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];
    return levels.indexOf(level) >= levels.indexOf(this.level) && this.level !== 'silent';
  }

  private formatEntry(entry: LogEntry): string {
    const date = new Date(entry.timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const prefix = `[${date}] [${entry.level.toUpperCase()}] [${entry.module}]`;
    return `${prefix} ${entry.message}`;
  }

  private addEntry(level: LogLevel, module: string, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = { timestamp: Date.now(), level, module, message, data };
    this.entries.push(entry);

    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    const formatted = this.formatEntry(entry);
    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    if (this.outputToFile && this.logFile) {
      fs.appendFile(this.logFile, formatted + '\n').catch(() => {});
    }
  }

  debug(module: string, message: string, data?: unknown): void {
    this.addEntry('debug', module, message, data);
  }

  info(module: string, message: string, data?: unknown): void {
    this.addEntry('info', module, message, data);
  }

  warn(module: string, message: string, data?: unknown): void {
    this.addEntry('warn', module, message, data);
  }

  error(module: string, message: string, data?: unknown): void {
    this.addEntry('error', module, message, data);
  }

  getEntries(level?: LogLevel, limit = 50): LogEntry[] {
    const filtered = level ? this.entries.filter(e => e.level === level) : this.entries;
    return filtered.slice(-limit);
  }

  getRecentErrors(limit = 20): LogEntry[] {
    return this.getEntries('error', limit);
  }

  getStats(): { total: number; byLevel: Record<LogLevel, number> } {
    const byLevel: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0, silent: 0 };
    for (const entry of this.entries) {
      byLevel[entry.level]++;
    }
    return { total: this.entries.length, byLevel };
  }

  clear(): void {
    this.entries = [];
  }
}

export const logger = new Logger();
