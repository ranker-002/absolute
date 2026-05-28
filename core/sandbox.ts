import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../core/logger.js';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  timedOut: boolean;
}

export class Sandbox {
  private timeoutMs = 10000;
  private maxOutputSize = 50000;

  async executeCode(code: string, language: 'typescript' | 'javascript' | 'python' | 'shell'): Promise<SandboxResult> {
    const start = Date.now();
    const tempDir = path.join(ROOT, '.sandbox');
    await fs.mkdir(tempDir, { recursive: true });

    try {
      let command: string;
      let tempFile: string;

      switch (language) {
        case 'typescript':
          tempFile = path.join(tempDir, 'exec_' + Date.now() + '.ts');
          await fs.writeFile(tempFile, code, 'utf-8');
          command = `npx tsx ${tempFile}`;
          break;
        case 'javascript':
          tempFile = path.join(tempDir, 'exec_' + Date.now() + '.js');
          await fs.writeFile(tempFile, code, 'utf-8');
          command = `node ${tempFile}`;
          break;
        case 'python':
          tempFile = path.join(tempDir, 'exec_' + Date.now() + '.py');
          await fs.writeFile(tempFile, code, 'utf-8');
          command = `python3 ${tempFile}`;
          break;
        case 'shell':
          tempFile = path.join(tempDir, 'exec_' + Date.now() + '.sh');
          await fs.writeFile(tempFile, code, 'utf-8');
          command = `bash ${tempFile}`;
          break;
        default:
          throw new Error('Unsupported language: ' + language);
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: ROOT,
        timeout: this.timeoutMs,
        maxBuffer: this.maxOutputSize
      });

      const duration = Date.now() - start;
      await fs.rm(tempFile, { force: true });

      return { success: true, stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0, duration, timedOut: false };
    } catch (err: unknown) {
      const duration = Date.now() - start;
      const e = err as { stdout?: string; stderr?: string; code?: number; killed?: boolean };
      return {
        success: false,
        stdout: (e.stdout || '').trim(),
        stderr: (e.stderr || err as string).trim(),
        exitCode: e.code || 1,
        duration,
        timedOut: e.killed || false
      };
    }
  }

  async validateCode(code: string): Promise<{ valid: boolean; errors: string[] }> {
    const result = await this.executeCode(code, 'typescript');
    return { valid: result.success, errors: result.stderr ? [result.stderr] : [] };
  }

  setTimeout(ms: number): void {
    this.timeoutMs = ms;
  }
}
