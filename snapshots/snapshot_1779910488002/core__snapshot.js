import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SNAPSHOTS_DIR = path.join(ROOT, 'snapshots');
const MAX_SNAPSHOTS = 10;

export class SnapshotManager {
  async createSnapshot(reason = 'pre-transformation') {
    const timestamp = Date.now();
    const snapshotId = `snapshot_${timestamp}`;
    const snapshotPath = path.join(SNAPSHOTS_DIR, snapshotId);

    await fs.mkdir(snapshotPath, { recursive: true });

    const filesToSnapshot = [
      'core/dna.json',
      'core/dna.js',
      'core/intent_engine.js',
      'core/transformer.js',
      'core/skill_activator.js',
      'core/evolution_loop.js',
      'core/llm_engine.js',
      'core/snapshot.js',
      'core/system_tools.js',
      'core/bootstrap.js',
      'index.js',
      'package.json',
      'skills/registry.json'
    ];

    for (const file of filesToSnapshot) {
      const src = path.join(ROOT, file);
      const dst = path.join(snapshotPath, file.replace(/\//g, '__'));
      try {
        await fs.copyFile(src, dst);
      } catch {
      }
    }

    await fs.writeFile(
      path.join(snapshotPath, 'meta.json'),
      JSON.stringify({ timestamp, reason, snapshotId }, null, 2)
    );

    await this.pruneOldSnapshots();

    console.log(`📸 Snapshot créé : ${snapshotId}`);
    return snapshotId;
  }

  async rollback(snapshotId = null) {
    const targetId = snapshotId || (await this.getLatestSnapshotId());
    if (!targetId) throw new Error('Aucun snapshot disponible pour rollback');

    const snapshotPath = path.join(SNAPSHOTS_DIR, targetId);
    const files = await fs.readdir(snapshotPath);

    for (const file of files) {
      if (file === 'meta.json') continue;
      const src = path.join(snapshotPath, file);
      const originalPath = file.replace(/__/g, '/');
      const dst = path.join(ROOT, originalPath);

      await fs.mkdir(path.dirname(dst), { recursive: true });
      await fs.copyFile(src, dst);
    }

    console.log(`⏪ Rollback effectué depuis : ${targetId}`);
    return targetId;
  }

  async getLatestSnapshotId() {
    const entries = await fs.readdir(SNAPSHOTS_DIR);
    const snapshots = entries
      .filter((e) => e.startsWith('snapshot_'))
      .sort()
      .reverse();
    return snapshots[0] || null;
  }

  async pruneOldSnapshots() {
    const entries = await fs.readdir(SNAPSHOTS_DIR);
    const snapshots = entries.filter((e) => e.startsWith('snapshot_')).sort();
    while (snapshots.length > MAX_SNAPSHOTS) {
      const old = snapshots.shift();
      await fs.rm(path.join(SNAPSHOTS_DIR, old), { recursive: true, force: true });
    }
  }
}
