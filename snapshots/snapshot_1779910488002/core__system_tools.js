import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

export class SystemTools {
  async exec(command, options = {}) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: options.cwd || ROOT,
        timeout: options.timeout || 30000,
        env: { ...process.env, ...options.env }
      });
      return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (err) {
      return { success: false, error: err.message, stdout: err.stdout, stderr: err.stderr };
    }
  }

  async readFile(filePath) {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    return await fs.readFile(fullPath, 'utf-8');
  }

  async writeFile(filePath, content) {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async readEntireCodebase(maxChars = 150000) {
    const extensions = ['.js', '.json', '.md'];
    const excludeDirs = ['node_modules', 'snapshots', '.git', 'memory'];
    const files = await this.getCodebaseFiles(ROOT, extensions, excludeDirs);

    let totalChars = 0;
    const fileMap = {};

    for (const file of files) {
      const relativePath = path.relative(ROOT, file);
      try {
        const content = await fs.readFile(file, 'utf-8');
        fileMap[relativePath] = content;
        totalChars += content.length;
      } catch {
      }
    }

    if (totalChars > maxChars) {
      return this.chunkCodebase(fileMap, maxChars);
    }

    return { files: fileMap, chunked: false, totalChars };
  }

  chunkCodebase(fileMap, maxChars) {
    const priority = ['core/', 'index.js', 'skills/', 'memory/'];
    const prioritized = [];
    const rest = [];

    for (const [p, content] of Object.entries(fileMap)) {
      if (priority.some((pref) => p.startsWith(pref) || p === pref)) {
        prioritized.push([p, content]);
      } else {
        rest.push([p, content]);
      }
    }

    const result = {};
    let chars = 0;

    for (const [p, c] of [...prioritized, ...rest]) {
      if (chars + c.length <= maxChars) {
        result[p] = c;
        chars += c.length;
      } else {
        const remaining = maxChars - chars;
        if (remaining > 500 && p.startsWith('core/')) {
          result[p] = c.substring(0, remaining) + '\n// [TRONQUÉ]';
          chars = maxChars;
        }
        break;
      }
    }

    return { files: result, chunked: true, totalChars: chars };
  }

  async getCodebaseFiles(dir, extensions, excludeDirs) {
    const results = [];
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

  async installDependencies(packages) {
    console.log(`📦 Installation : ${packages.join(', ')}`);
    const result = await this.exec(`npm install ${packages.join(' ')}`, { timeout: 120000 });
    if (!result.success) throw new Error(`npm install échoué : ${result.error}`);
    console.log('✓ Dépendances installées');
    return result;
  }

  async relaunchSelf(newEntryPoint = 'index.js') {
    console.log("🔄 Relancement d'ULTIMATE sous la nouvelle forme...");

    await new Promise((r) => setTimeout(r, 500));

    const child = spawn(process.execPath, [path.join(ROOT, newEntryPoint)], {
      detached: true,
      stdio: 'inherit',
      cwd: ROOT,
      env: { ...process.env, ULTIMATE_RELAUNCH: 'true' }
    });

    child.unref();
    setTimeout(() => process.exit(0), 200);
  }

  async validateJavaScript(code) {
    const tempFile = path.join(ROOT, '.temp_validate.js');
    try {
      await fs.writeFile(tempFile, code);
      const result = await this.exec(`node --check ${tempFile}`);
      await fs.unlink(tempFile).catch(() => {});
      return result.success;
    } catch {
      await fs.unlink(tempFile).catch(() => {});
      return false;
    }
  }
}
