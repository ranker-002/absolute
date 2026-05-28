import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

type ExecOptions = {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
};

export class SystemTools {
  async exec(command: string, options: ExecOptions = {}): Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: options.cwd ?? ROOT,
        timeout: options.timeout ?? 30000,
        env: { ...process.env, ...options.env }
      });
      return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (err) {
      const e = err as Error & { stdout?: string; stderr?: string };
      return { success: false, error: e.message, stdout: e.stdout, stderr: e.stderr };
    }
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async readEntireCodebase(maxChars = 150000): Promise<{ files: Record<string, string>; chunked: boolean; totalChars: number }> {
    const extensions = ['.ts', '.json', '.md'];
    const excludeDirs = ['node_modules', 'snapshots', '.git'];
    const files = await this.getCodebaseFiles(ROOT, extensions, excludeDirs);

    let totalChars = 0;
    const fileMap: Record<string, string> = {};
    for (const file of files) {
      const relativePath = path.relative(ROOT, file);
      try {
        const content = await fs.readFile(file, 'utf-8');
        fileMap[relativePath] = content;
        totalChars += content.length;
      } catch (err) {
        console.error(`[SystemTools] Failed to read ${relativePath}:`, (err as Error).message);
      }
    }

    if (totalChars > maxChars) return this.chunkCodebase(fileMap, maxChars);
    return { files: fileMap, chunked: false, totalChars };
  }

  chunkCodebase(fileMap: Record<string, string>, maxChars: number): { files: Record<string, string>; chunked: boolean; totalChars: number } {
    const priority = ['core/', 'index.ts', 'ui/', 'skills/', 'memory/'];
    const prioritized: Array<[string, string]> = [];
    const rest: Array<[string, string]> = [];

    for (const [p, content] of Object.entries(fileMap)) {
      if (priority.some((pref) => p.startsWith(pref) || p === pref)) prioritized.push([p, content]);
      else rest.push([p, content]);
    }

    const result: Record<string, string> = {};
    let chars = 0;
    for (const [p, c] of [...prioritized, ...rest]) {
      if (chars + c.length <= maxChars) {
        result[p] = c;
        chars += c.length;
      } else {
        const remaining = maxChars - chars;
        if (remaining > 500 && p.startsWith('core/')) {
          result[p] = `${c.substring(0, remaining)}\n// [TRUNCATED]`;
          chars = maxChars;
        }
        break;
      }
    }

    return { files: result, chunked: true, totalChars: chars };
  }

  async getCodebaseFiles(dir: string, extensions: string[], excludeDirs: string[]): Promise<string[]> {
    const results: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          results.push(...(await this.getCodebaseFiles(fullPath, extensions, excludeDirs)));
        }
      } else if (extensions.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
    return results;
  }

  async installDependencies(packages: string[]): Promise<void> {
    if (!packages.length) return;
    // Sanitize package names — only allow valid npm package chars
    const sanitized = packages.filter(p => /^[a-z0-9@\/\-\._~]+$/.test(p));
    if (sanitized.length === 0) throw new Error('No valid package names provided');
    const result = await this.exec(`npm install ${sanitized.join(' ')}`, { timeout: 120000 });
    if (!result.success) throw new Error(`npm install failed: ${result.error}`);
  }

  async relaunchSelf(newEntryPoint = 'index.ts'): Promise<void> {
    await new Promise((r) => setTimeout(r, 500));
    const child = spawn('npx', ['tsx', path.join(ROOT, newEntryPoint)], {
      detached: true,
      stdio: 'inherit',
      cwd: ROOT,
      env: { ...process.env, ULTIMATE_RELAUNCH: 'true' }
    });
    child.unref();
    setTimeout(() => process.exit(0), 200);
  }

  async validateJavaScript(code: string): Promise<boolean> {
    const tempFile = path.join(ROOT, '.temp_validate.js');
    try {
      await fs.writeFile(tempFile, code, 'utf-8');
      const result = await this.exec(`node --check ${tempFile}`);
      await fs.unlink(tempFile).catch(() => {});
      return result.success;
    } catch (_e) {
      await fs.unlink(tempFile).catch(() => {});
      return false;
    }
  }

  async validateTypeScript(code: string): Promise<boolean> {
    const tempFile = path.join(ROOT, '.temp_validate.ts');
    try {
      await fs.writeFile(tempFile, code, 'utf-8');
      const result = await this.exec(`npx tsc --noEmit --pretty false ${tempFile}`);
      await fs.unlink(tempFile).catch(() => {});
      return result.success;
    } catch (_e) {
      await fs.unlink(tempFile).catch(() => {});
      return false;
    }
  }
}
