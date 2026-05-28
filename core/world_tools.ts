import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from './logger.js';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ============ File Operations ============
export class FileOps {
  async readFile(filePath: string): Promise<string> {
    const full = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    return fs.readFile(full, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const full = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, 'utf-8');
  }

  async appendFile(filePath: string, content: string): Promise<void> {
    const full = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    await fs.appendFile(full, content, 'utf-8');
  }

  async deleteFile(filePath: string): Promise<void> {
    const full = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    await fs.rm(full, { force: true });
  }

  async mkdir(dirPath: string): Promise<void> {
    const full = path.isAbsolute(dirPath) ? dirPath : path.join(ROOT, dirPath);
    await fs.mkdir(full, { recursive: true });
  }

  async listDir(dirPath: string): Promise<string[]> {
    const full = path.isAbsolute(dirPath) ? dirPath : path.join(ROOT, dirPath);
    const entries = await fs.readdir(full, { withFileTypes: true });
    return entries.map(e => e.name + (e.isDirectory() ? '/' : ''));
  }

  async exists(filePath: string): Promise<boolean> {
    const full = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    try { await fs.access(full); return true; } catch { return false; }
  }

  async copy(src: string, dst: string): Promise<void> {
    const srcFull = path.isAbsolute(src) ? src : path.join(ROOT, src);
    const dstFull = path.isAbsolute(dst) ? dst : path.join(ROOT, dst);
    await fs.mkdir(path.dirname(dstFull), { recursive: true });
    await fs.copyFile(srcFull, dstFull);
  }

  async move(src: string, dst: string): Promise<void> {
    const srcFull = path.isAbsolute(src) ? src : path.join(ROOT, src);
    const dstFull = path.isAbsolute(dst) ? dst : path.join(ROOT, dst);
    await fs.mkdir(path.dirname(dstFull), { recursive: true });
    await fs.rename(srcFull, dstFull);
  }

  async stat(filePath: string): Promise<{ size: number; modified: number; isDir: boolean } | null> {
    const full = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    try {
      const s = await fs.stat(full);
      return { size: s.size, modified: s.mtimeMs, isDir: s.isDirectory() };
    } catch { return null; }
  }

  async find(pattern: string, dir = '.'): Promise<string[]> {
    const full = path.isAbsolute(dir) ? dir : path.join(ROOT, dir);
    const results: string[] = [];
    try {
      const entries = await fs.readdir(full, { withFileTypes: true });
      for (const entry of entries) {
        const fp = path.join(full, entry.name);
        const rel = path.relative(ROOT, fp);
        if (entry.isDirectory()) {
          if (!['node_modules', 'snapshots', '.git'].includes(entry.name)) {
            results.push(...(await this.find(pattern, rel)));
          }
        } else if (rel.includes(pattern)) {
          results.push(rel);
        }
      }
    } catch { /* */ }
    return results;
  }
}

// ============ Shell Execution ============
export class ShellOps {
  async exec(command: string, cwd?: string, timeout = 30000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || ROOT,
        timeout,
        maxBuffer: 1024 * 1024
      });
      return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; code?: number };
      return { stdout: e.stdout || '', stderr: e.stderr || (err as Error).message, exitCode: e.code || 1 };
    }
  }

  async execDetached(command: string, args: string[]): Promise<void> {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.unref();
  }

  async which(cmd: string): Promise<boolean> {
    try {
      await execAsync('which ' + cmd);
      return true;
    } catch { return false; }
  }

  async killPid(pid: number, signal = 'SIGTERM'): Promise<void> {
    try { process.kill(pid, signal); } catch { /* */ }
  }
}

// ============ HTTP Client ============
export class HttpOps {
  async get(url: string, headers: Record<string, string> = {}): Promise<{ status: number; body: string; headers: Record<string, string> }> {
    const resp = await fetch(url, { headers });
    const body = await resp.text();
    const respHeaders: Record<string, string> = {};
    resp.headers.forEach((v, k) => { respHeaders[k] = v; });
    return { status: resp.status, body, headers: respHeaders };
  }

  async post(url: string, data: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data)
    });
    return { status: resp.status, body: await resp.text() };
  }

  async put(url: string, data: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data)
    });
    return { status: resp.status, body: await resp.text() };
  }

  async delete(url: string, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
    const resp = await fetch(url, { method: 'DELETE', headers });
    return { status: resp.status, body: await resp.text() };
  }

  async download(url: string, destPath: string): Promise<void> {
    const resp = await fetch(url);
    const buffer = Buffer.from(await resp.arrayBuffer());
    const full = path.isAbsolute(destPath) ? destPath : path.join(ROOT, destPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
  }
}

// ============ Process Manager ============
export interface ManagedProcess {
  id: string;
  command: string;
  args: string[];
  pid: number | null;
  status: 'running' | 'stopped' | 'crashed';
  startedAt: number;
  output: string[];
  exitCode: number | null;
}

export class ProcessManager {
  private processes: Map<string, ManagedProcess> = new Map();

  async start(id: string, command: string, args: string[] = []): Promise<ManagedProcess> {
    const proc: ManagedProcess = {
      id, command, args, pid: null, status: 'running',
      startedAt: Date.now(), output: [], exitCode: null
    };

    const child = spawn(command, args, { cwd: ROOT, stdio: 'pipe' });
    proc.pid = child.pid || null;

    child.stdout?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      proc.output.push(line);
      if (proc.output.length > 1000) proc.output = proc.output.slice(-500);
      logger.debug('Process[' + id + ']', line);
    });

    child.stderr?.on('data', (data: Buffer) => {
      proc.output.push('[stderr] ' + data.toString().trim());
    });

    child.on('exit', (code) => {
      proc.status = code === 0 ? 'stopped' : 'crashed';
      proc.exitCode = code;
      logger.info('Process[' + id + ']', 'Exited with code ' + code);
    });

    this.processes.set(id, proc);
    logger.info('Process[' + id + ']', 'Started: ' + command + ' ' + args.join(' '));
    return proc;
  }

  async stop(id: string): Promise<boolean> {
    const proc = this.processes.get(id);
    if (!proc || !proc.pid) return false;
    try { process.kill(proc.pid, 'SIGTERM'); proc.status = 'stopped'; return true; }
    catch { return false; }
  }

  get(id: string): ManagedProcess | undefined { return this.processes.get(id); }
  getAll(): ManagedProcess[] { return Array.from(this.processes.values()); }
  getRunning(): ManagedProcess[] { return this.getAll().filter(p => p.status === 'running'); }
}

// ============ Database (SQLite-like with JSON) ============
export interface DBRecord {
  id: string;
  collection: string;
  data: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export class Database {
  private collections: Map<string, DBRecord[]> = new Map();
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(ROOT, 'memory', 'database.json');
  }

  async init(): Promise<void> {
    try {
      const raw = await fs.readFile(this.dbPath, 'utf-8');
      const data = JSON.parse(raw) as Record<string, DBRecord[]>;
      for (const [k, v] of Object.entries(data)) this.collections.set(k, v);
    } catch { /* first run */ }
  }

  private async save(): Promise<void> {
    const data: Record<string, DBRecord[]> = {};
    for (const [k, v] of this.collections) data[k] = v;
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async insert(collection: string, data: Record<string, unknown>): Promise<DBRecord> {
    const record: DBRecord = {
      id: 'db_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      collection,
      data,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (!this.collections.has(collection)) this.collections.set(collection, []);
    this.collections.get(collection)!.push(record);
    await this.save();
    return record;
  }

  async find(collection: string, query?: Record<string, unknown>): Promise<DBRecord[]> {
    const records = this.collections.get(collection) || [];
    if (!query) return [...records];
    return records.filter(r => {
      for (const [k, v] of Object.entries(query)) {
        if (JSON.stringify(r.data[k]) !== JSON.stringify(v)) return false;
      }
      return true;
    });
  }

  async findById(collection: string, id: string): Promise<DBRecord | null> {
    const records = this.collections.get(collection) || [];
    return records.find(r => r.id === id) || null;
  }

  async update(collection: string, id: string, data: Record<string, unknown>): Promise<boolean> {
    const records = this.collections.get(collection) || [];
    const record = records.find(r => r.id === id);
    if (!record) return false;
    Object.assign(record.data, data);
    record.updatedAt = Date.now();
    await this.save();
    return true;
  }

  async delete(collection: string, id: string): Promise<boolean> {
    const records = this.collections.get(collection) || [];
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return false;
    records.splice(idx, 1);
    await this.save();
    return true;
  }

  async count(collection: string): Promise<number> {
    return (this.collections.get(collection) || []).length;
  }

  async collections_list(): Promise<string[]> {
    return Array.from(this.collections.keys());
  }
}
