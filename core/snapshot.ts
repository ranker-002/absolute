import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SNAPSHOTS_DIR = path.join(ROOT, 'snapshots');
const FORMS_HISTORY_DIR = path.join(ROOT, 'forms', 'history');
const MAX_SNAPSHOTS = 10;

export interface SnapshotMeta {
  timestamp: number;
  reason: string;
  snapshotId: string;
  copiedFiles?: number;
  files?: string[];
}

export interface SnapshotDiff {
  file: string;
  existedBefore: boolean;
  existedAfter: boolean;
  sizeBefore: number;
  sizeAfter: number;
}

export class SnapshotManager {
  async createSnapshot(reason = 'pre-transformation'): Promise<string> {
    const timestamp = Date.now();
    const snapshotId = `snapshot_${timestamp}`;
    const snapshotPath = path.join(SNAPSHOTS_DIR, snapshotId);
    await fs.mkdir(snapshotPath, { recursive: true });

    const filesToSnapshot = [
      'core/dna.json',
      'core/dna.ts',
      'core/intent_engine.ts',
      'core/transformer.ts',
      'core/skill_activator.ts',
      'core/evolution_loop.ts',
      'core/llm_engine.ts',
      'core/snapshot.ts',
      'core/system_tools.ts',
      'core/bootstrap.ts',
      'core/logger.ts',
      'core/config.ts',
      'core/rate_limiter.ts',
      'core/plugin_manager.ts',
      'index.ts',
      'package.json',
      'skills/registry.json'
    ];

    const copiedFiles: string[] = [];
    for (const file of filesToSnapshot) {
      const src = path.join(ROOT, file);
      const dst = path.join(snapshotPath, file.replace(/\//g, '__'));
      try {
        await fs.copyFile(src, dst);
        copiedFiles.push(file);
      } catch {
        // File may not exist yet — skip
      }
    }

    const meta: SnapshotMeta = {
      timestamp,
      reason,
      snapshotId,
      copiedFiles: copiedFiles.length,
      files: copiedFiles
    };

    await fs.writeFile(
      path.join(snapshotPath, 'meta.json'),
      JSON.stringify(meta, null, 2),
      'utf-8'
    );

    await this.recordTransformation(reason);
    await this.pruneOldSnapshots();
    logger.info('Snapshot', `Created ${snapshotId} (${copiedFiles.length} files)`);
    return snapshotId;
  }

  async rollback(snapshotId: string | null = null): Promise<string> {
    const targetId = snapshotId ?? (await this.getLatestSnapshotId());
    if (!targetId) throw new Error('No snapshot available for rollback');

    const snapshotPath = path.join(SNAPSHOTS_DIR, targetId);
    const files = await fs.readdir(snapshotPath);
    let restoredCount = 0;
    const restored: string[] = [];

    for (const file of files) {
      if (file === 'meta.json') continue;
      const src = path.join(snapshotPath, file);
      const originalPath = file.replace(/__/g, '/');
      const dst = path.join(ROOT, originalPath);
      await fs.mkdir(path.dirname(dst), { recursive: true });
      await fs.copyFile(src, dst);
      restoredCount++;
      restored.push(originalPath);
    }

    logger.info('Snapshot', `Restored ${restoredCount} files from ${targetId}`);
    return targetId;
  }

  async previewRollback(snapshotId: string): Promise<SnapshotDiff[]> {
    const snapshotPath = path.join(SNAPSHOTS_DIR, snapshotId);
    const files = await fs.readdir(snapshotPath);
    const diffs: SnapshotDiff[] = [];

    for (const file of files) {
      if (file === 'meta.json') continue;
      const originalPath = file.replace(/__/g, '/');
      const snapshotFile = path.join(snapshotPath, file);
      const currentFile = path.join(ROOT, originalPath);

      const snapshotStat = await fs.stat(snapshotFile).catch(() => null);
      let currentStat = await fs.stat(currentFile).catch(() => null);

      diffs.push({
        file: originalPath,
        existedBefore: true,
        existedAfter: currentStat !== null,
        sizeBefore: snapshotStat?.size || 0,
        sizeAfter: currentStat?.size || 0
      });
    }

    return diffs;
  }

  async getLatestSnapshotId(): Promise<string | null> {
    const entries = await fs.readdir(SNAPSHOTS_DIR);
    const snapshots = entries.filter((e) => e.startsWith('snapshot_')).sort().reverse();
    return snapshots[0] ?? null;
  }

  async listSnapshots(): Promise<SnapshotMeta[]> {
    const entries = await fs.readdir(SNAPSHOTS_DIR);
    const snapshots: SnapshotMeta[] = [];
    for (const entry of entries) {
      if (!entry.startsWith('snapshot_')) continue;
      try {
        const metaRaw = await fs.readFile(path.join(SNAPSHOTS_DIR, entry, 'meta.json'), 'utf-8');
        snapshots.push(JSON.parse(metaRaw) as SnapshotMeta);
      } catch {
        snapshots.push({ timestamp: 0, reason: 'unknown', snapshotId: entry });
      }
    }
    return snapshots.sort((a, b) => a.timestamp - b.timestamp);
  }

  async countSnapshots(): Promise<number> {
    const entries = await fs.readdir(SNAPSHOTS_DIR);
    return entries.filter((e) => e.startsWith('snapshot_')).length;
  }

  async pruneOldSnapshots(): Promise<void> {
    const entries = await fs.readdir(SNAPSHOTS_DIR);
    const snapshots = entries.filter((e) => e.startsWith('snapshot_')).sort();
    while (snapshots.length > MAX_SNAPSHOTS) {
      const old = snapshots.shift();
      if (old) {
        await fs.rm(path.join(SNAPSHOTS_DIR, old), { recursive: true, force: true });
        logger.info('Snapshot', `Pruned old snapshot: ${old}`);
      }
    }
  }

  private async recordTransformation(reason: string): Promise<void> {
    try {
      await fs.mkdir(FORMS_HISTORY_DIR, { recursive: true });
      const record = {
        timestamp: Date.now(),
        reason,
        type: 'snapshot_created'
      };
      const historyFile = path.join(FORMS_HISTORY_DIR, `form_${Date.now()}.json`);
      await fs.writeFile(historyFile, JSON.stringify(record, null, 2), 'utf-8');
    } catch (err) {
      logger.error('Snapshot', `Failed to record transformation: ${(err as Error).message}`);
    }
  }
}
