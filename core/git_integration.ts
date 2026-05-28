import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from './logger.js';

const execFileAsync = promisify(execFile);

export interface GitCommitResult {
  success: boolean;
  commitHash?: string;
  message: string;
  error?: string;
}

export class GitIntegration {
  private isRepo = false;

  async init(): Promise<void> {
    try {
      await execFileAsync('git', ['rev-parse', '--is-inside-work-tree']);
      this.isRepo = true;
      logger.info('Git', 'Git repository detected');
    } catch {
      this.isRepo = false;
      logger.info('Git', 'No git repository — creating one');
      await this.initRepo();
    }
  }

  private async initRepo(): Promise<void> {
    try {
      await execFileAsync('git', ['init']);
      await execFileAsync('git', ['add', '-A']);
      await execFileAsync('git', ['commit', '-m', 'Initial commit: ULTIMATE bootstrap']);
      this.isRepo = true;
      logger.info('Git', 'Repository initialized');
    } catch (err) {
      logger.error('Git', 'Failed to init repo: ' + (err as Error).message);
    }
  }

  async commit(message: string, files?: string[]): Promise<GitCommitResult> {
    if (!this.isRepo) {
      return { success: false, message, error: 'Not a git repository' };
    }

    try {
      if (files && files.length > 0) {
        // Validate file names to prevent injection
        const safeFiles = files.filter(f => !f.includes(';') && !f.includes('|') && !f.includes('&'));
        await execFileAsync('git', ['add', ...safeFiles]);
      } else {
        await execFileAsync('git', ['add', '-A']);
      }

      try {
        const { stdout } = await execFileAsync('git', ['commit', '-m', message]);
        const hashMatch = stdout.match(/\[[\w]+ ([a-f0-9]+)\]/);
        const commitHash = hashMatch?.[1] || '';
        logger.info('Git', 'Committed: ' + message.substring(0, 50) + ' (' + commitHash.substring(0, 7) + ')');
        return { success: true, commitHash, message };
      } catch (err) {
        const error = (err as Error).message;
        if (error.includes('nothing to commit')) {
          logger.info('Git', 'Nothing to commit');
          return { success: true, commitHash: '', message: 'Nothing to commit' };
        }
        return { success: false, message, error };
      }
    } catch (err) {
      logger.error('Git', 'Commit failed: ' + (err as Error).message);
      return { success: false, message, error: (err as Error).message };
    }
  }

  async commitTransformation(form: string, summary: string): Promise<GitCommitResult> {
    const message = 'transform: ' + form + '\n\n' + summary;
    return this.commit(message);
  }

  async commitRollback(snapshotId: string): Promise<GitCommitResult> {
    return this.commit('rollback: restore from ' + snapshotId);
  }

  async getStatus(): Promise<{ clean: boolean; files: string[] }> {
    if (!this.isRepo) return { clean: true, files: [] };
    try {
      const { stdout } = await execFileAsync('git', ['status', '--porcelain']);
      const files = stdout.split('\n').filter(l => l.trim()).map(l => l.substring(3));
      return { clean: files.length === 0, files };
    } catch {
      return { clean: true, files: [] };
    }
  }

  async getLog(limit = 10): Promise<Array<{ hash: string; message: string; date: string }>> {
    if (!this.isRepo) return [];
    try {
      const { stdout } = await execFileAsync('git', ['log', '--oneline', '-' + limit, '--format=%H|%s|%ai']);
      return stdout.split('\n').filter(l => l.trim()).map(line => {
        const [hash, message, date] = line.split('|');
        return { hash, message, date };
      });
    } catch {
      return [];
    }
  }

  async stashChanges(): Promise<boolean> {
    if (!this.isRepo) return false;
    try { await execFileAsync('git', ['stash']); return true; } catch { return false; }
  }

  async popStash(): Promise<boolean> {
    if (!this.isRepo) return false;
    try { await execFileAsync('git', ['stash', 'pop']); return true; } catch { return false; }
  }

  async diffstat(): Promise<string> {
    if (!this.isRepo) return '';
    try { const { stdout } = await execFileAsync('git', ['diff', '--stat']); return stdout; } catch { return ''; }
  }

  isGitRepo(): boolean {
    return this.isRepo;
  }
}
