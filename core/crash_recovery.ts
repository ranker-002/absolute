import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SnapshotManager } from './snapshot.js';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CRASH_MARKER = path.join(ROOT, '.crash_marker');
const HEALTH_FILE = path.join(ROOT, 'memory', 'health.json');

export interface HealthData {
  lastHeartbeat: number;
  pid: number;
  startedAt: number;
  status: 'running' | 'crashed' | 'shutdown';
  lastForm: string;
  bootCount: number;
  crashCount: number;
  lastCrash?: number;
  lastCrashError?: string;
}

export class CrashRecovery {
  private snapshots = new SnapshotManager();
  private healthData: HealthData = {
    lastHeartbeat: 0,
    pid: process.pid,
    startedAt: Date.now(),
    status: 'running',
    lastForm: 'terminal-cli',
    bootCount: 0,
    crashCount: 0
  };
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<boolean> {
    await this.loadHealth();
    const crashed = await this.detectCrash();

    this.healthData.lastHeartbeat = Date.now();
    this.healthData.pid = process.pid;
    this.healthData.startedAt = Date.now();
    this.healthData.status = 'running';
    this.healthData.bootCount++;

    await this.createCrashMarker();
    await this.saveHealth();
    this.startHeartbeat();

    if (crashed) {
      logger.warn('CrashRecovery', `Crash detected! Last crash: ${this.healthData.lastCrashError || 'unknown'}`);
      return true;
    }
    return false;
  }

  private async detectCrash(): Promise<boolean> {
    try {
      await fs.access(CRASH_MARKER);
      const markerContent = await fs.readFile(CRASH_MARKER, 'utf-8');
      const marker = JSON.parse(markerContent) as { pid: number; timestamp: number };

      if (marker.pid !== process.pid) {
        this.healthData.crashCount++;
        this.healthData.lastCrash = marker.timestamp;
        this.healthData.lastCrashError = 'Process did not shut down gracefully';
        await this.saveHealth();
        return true;
      }
    } catch (_e) {
      // No marker — clean start
    }
    return false;
  }

  private async createCrashMarker(): Promise<void> {
    await fs.writeFile(CRASH_MARKER, JSON.stringify({
      pid: process.pid,
      timestamp: Date.now()
    }), 'utf-8');
  }

  private async removeCrashMarker(): Promise<void> {
    try {
      await fs.rm(CRASH_MARKER, { force: true });
    } catch (_e) {
      // ignore
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      this.healthData.lastHeartbeat = Date.now();
      await this.saveHealth();
    }, 10000);
  }

  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.healthData.status = 'shutdown';
    await this.saveHealth();
    await this.removeCrashMarker();
  }

  async autoRollback(): Promise<string | null> {
    try {
      const latestSnapshot = await this.snapshots.getLatestSnapshotId();
      if (!latestSnapshot) {
        logger.error('CrashRecovery', 'No snapshot available for auto-rollback');
        return null;
      }

      logger.warn('CrashRecovery', `Auto-rolling back to: ${latestSnapshot}`);
      await this.snapshots.rollback(latestSnapshot);
      logger.info('CrashRecovery', `Auto-rollback complete: ${latestSnapshot}`);
      return latestSnapshot;
    } catch (err) {
      logger.error('CrashRecovery', `Auto-rollback failed: ${(err as Error).message}`);
      return null;
    }
  }

  private async loadHealth(): Promise<void> {
    try {
      const raw = await fs.readFile(HEALTH_FILE, 'utf-8');
      const loaded = JSON.parse(raw) as Partial<HealthData>;
      this.healthData = { ...this.healthData, ...loaded };
    } catch (_e) {
      // First run
    }
  }

  private async saveHealth(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(HEALTH_FILE), { recursive: true });
      await fs.writeFile(HEALTH_FILE, JSON.stringify(this.healthData, null, 2), 'utf-8');
    } catch (_e) {
      // ignore
    }
  }

  getHealth(): HealthData {
    return { ...this.healthData };
  }

  getUptime(): number {
    return Date.now() - this.healthData.startedAt;
  }
}
