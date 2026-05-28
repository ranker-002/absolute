import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SystemTools } from './system_tools.js';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const sys = new SystemTools();

export interface TestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errors: string[];
  duration: number;
  timestamp: number;
}

export class TestRunner {
  async runAll(): Promise<TestResult> {
    const start = Date.now();
    const errors: string[] = [];
    let totalTests = 0;
    let passedTests = 0;

    logger.info('TestRunner', 'Starting test suite...');

    // 1. TypeScript compilation check
    const tsResult = await this.runTypeCheck();
    totalTests += tsResult.total;
    passedTests += tsResult.passed;
    errors.push(...tsResult.errors);

    // 2. Import validation
    const importResult = await this.validateImports();
    totalTests += importResult.total;
    passedTests += importResult.passed;
    errors.push(...importResult.errors);

    // 3. DNA integrity check
    const dnaResult = await this.validateDNA();
    totalTests += dnaResult.total;
    passedTests += dnaResult.passed;
    errors.push(...dnaResult.errors);

    // 4. Memory integrity check
    const memResult = await this.validateMemory();
    totalTests += memResult.total;
    passedTests += memResult.passed;
    errors.push(...memResult.errors);

    // 5. Skills registry check
    const skillResult = await this.validateSkillsRegistry();
    totalTests += skillResult.total;
    passedTests += skillResult.passed;
    errors.push(...skillResult.errors);

    // 6. Config check
    const configResult = await this.validateConfig();
    totalTests += configResult.total;
    passedTests += configResult.passed;
    errors.push(...configResult.errors);

    const duration = Date.now() - start;
    const passed = errors.length === 0;

    const result: TestResult = {
      passed,
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      errors,
      duration,
      timestamp: Date.now()
    };

    logger.info('TestRunner', `Tests: ${passedTests}/${totalTests} passed in ${duration}ms`);
    if (!passed) {
      logger.error('TestRunner', `FAILED: ${errors.length} errors`);
      for (const e of errors) logger.error('TestRunner', `  ✗ ${e}`);
    }

    return result;
  }

  private async runTypeCheck(): Promise<{ total: number; passed: number; errors: string[] }> {
    const errors: string[] = [];
    const result = await sys.exec('npx tsc --noEmit', { timeout: 60000 });
    if (!result.success) {
      errors.push(`TypeScript: ${result.error?.substring(0, 200) || 'compilation failed'}`);
    }
    return { total: 1, passed: result.success ? 1 : 0, errors };
  }

  private async validateImports(): Promise<{ total: number; passed: number; errors: string[] }> {
    const errors: string[] = [];
    const coreFiles = [
      'core/dna.ts', 'core/llm_engine.ts', 'core/intent_engine.ts',
      'core/transformer.ts', 'core/skill_activator.ts', 'core/evolution_loop.ts',
      'core/snapshot.ts', 'core/system_tools.ts', 'core/bootstrap.ts',
      'core/logger.ts', 'core/config.ts', 'core/rate_limiter.ts',
      'core/plugin_manager.ts', 'ui/terminal_ui.ts', 'memory/store.ts', 'index.ts'
    ];

    let passed = 0;
    for (const file of coreFiles) {
      const fullPath = path.join(ROOT, file);
      try {
        await fs.access(fullPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        const imports = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
        for (const imp of imports) {
          const match = imp.match(/from\s+['"]([^'"]+)['"]/);
          if (match && match[1].startsWith('.')) {
            const resolvedPath = path.join(path.dirname(fullPath), match[1]);
            const extensions = ['.ts', '.js', '.json'];
            const found = extensions.some(ext => {
              try { fsSync.accessSync(resolvedPath + ext); return true; } catch { return false; }
            });
            if (!found) {
              errors.push(`Import not found: ${file} → ${match[1]}`);
            }
          }
        }
        passed++;
      } catch {
        errors.push(`Missing file: ${file}`);
      }
    }
    return { total: coreFiles.length, passed, errors };
  }

  private async validateDNA(): Promise<{ total: number; passed: number; errors: string[] }> {
    const errors: string[] = [];
    const dnaPath = path.join(ROOT, 'core', 'dna.json');
    try {
      const raw = await fs.readFile(dnaPath, 'utf-8');
      const dna = JSON.parse(raw);
      if (!dna.identity?.name) errors.push('DNA: missing identity.name');
      if (!dna.identity?.version) errors.push('DNA: missing identity.version');
      if (typeof dna.mutations !== 'number') errors.push('DNA: mutations is not a number');
      if (!dna.memory?.active_skills) errors.push('DNA: missing memory.active_skills');
      if (!dna.capabilities) errors.push('DNA: missing capabilities');
    } catch (err) {
      errors.push(`DNA: ${err instanceof Error ? err.message : 'invalid JSON'}`);
    }
    return { total: 1, passed: errors.length === 0 ? 1 : 0, errors };
  }

  private async validateMemory(): Promise<{ total: number; passed: number; errors: string[] }> {
    const errors: string[] = [];
    const memPath = path.join(ROOT, 'memory', 'memory.json');
    try {
      const raw = await fs.readFile(memPath, 'utf-8');
      const mem = JSON.parse(raw);
      if (!Array.isArray(mem.shortTerm)) errors.push('Memory: shortTerm is not an array');
      if (typeof mem.longTerm !== 'object') errors.push('Memory: longTerm is not an object');
    } catch {
      // Memory file may not exist on first run — that's OK
    }
    return { total: 1, passed: errors.length === 0 ? 1 : 0, errors };
  }

  private async validateSkillsRegistry(): Promise<{ total: number; passed: number; errors: string[] }> {
    const errors: string[] = [];
    const regPath = path.join(ROOT, 'skills', 'registry.json');
    try {
      const raw = await fs.readFile(regPath, 'utf-8');
      const reg = JSON.parse(raw);
      if (!Array.isArray(reg.skills)) errors.push('Skills: skills is not an array');
      else if (reg.skills.length === 0) errors.push('Skills: registry is empty');
    } catch {
      errors.push('Skills: registry.json not found');
    }
    return { total: 1, passed: errors.length === 0 ? 1 : 0, errors };
  }

  private async validateConfig(): Promise<{ total: number; passed: number; errors: string[] }> {
    const errors: string[] = [];
    const configPath = path.join(ROOT, 'ultimate.config.json');
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      const cfg = JSON.parse(raw);
      if (!cfg.theme) errors.push('Config: missing theme');
      if (!cfg.model) errors.push('Config: missing model');
    } catch {
      // Config file may not exist — will be created on first load
    }
    return { total: 1, passed: errors.length === 0 ? 1 : 0, errors };
  }

  async runQuickSyntaxCheck(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const result = await sys.exec('npx tsc --noEmit --pretty false 2>&1', { timeout: 60000 });
    if (!result.success && result.stdout) {
      const lines = result.stdout.split('\n').filter(l => l.includes('error TS'));
      for (const line of lines.slice(0, 10)) {
        errors.push(line.trim());
      }
    }
    return { valid: errors.length === 0, errors };
  }
}
