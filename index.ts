import readline from 'node:readline';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrap } from './core/bootstrap.js';
import { DNA } from './core/dna.js';
import { IntentEngine } from './core/intent_engine.js';
import { Transformer } from './core/transformer.js';
import { UniversalMemory } from './memory/store.js';
import { SkillActivator } from './core/skill_activator.js';
import { EvolutionLoop } from './core/evolution_loop.js';
import { LLMEngine } from './core/llm_engine.js';
import { SnapshotManager } from './core/snapshot.js';
import { logger } from './core/logger.js';
import { config } from './core/config.js';
import { rateLimiter } from './core/rate_limiter.js';
import { pluginManager } from './core/plugin_manager.js';
import { CrashRecovery } from './core/crash_recovery.js';
import { SessionPersistence } from './core/session.js';
import { TestRunner } from './core/test_runner.js';
import { EvolutionMemory } from './core/evolution_memory.js';
import { GitIntegration } from './core/git_integration.js';
import { KnowledgeBase } from './core/knowledge.js';
import { TemplateManager } from './core/templates.js';
import { ResponseCache } from './core/response_cache.js';
import { MultiModelManager } from './core/multi_model.js';
import { ApiServer } from './api/server.js';
import { Marketplace } from './core/marketplace.js';
import { Integrations } from './core/integrations.js';
import { Sandbox } from './core/sandbox.js';
import { EmbeddingsMemory } from './core/embeddings.js';
import { MultiUserManager } from './core/multi_user.js';
import { AutoSkillGenerator } from './core/auto_skills.js';
import { VoiceInterface } from './core/voice.js';
import { WebDashboard } from './web/dashboard.js';
import { AgentRuntime } from './core/agent_runtime.js';
import { FileOps, ShellOps, HttpOps, ProcessManager, Database } from './core/world_tools.js';
import { KnowledgeEngine } from './core/knowledge_engine.js';
import { PromptOptimizer, SkillComposer, StrategySelector, FailureAnalyzer } from './core/meta_evolution.js';
import { DeployManager, SaaSServer, WebhookManager, PluginSDK } from './core/deploy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m', dim: '\x1b[2m', italic: '\x1b[3m', underline: '\x1b[4m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m', gray: '\x1b[90m',
  bg: { red: '\x1b[41m', green: '\x1b[42m', yellow: '\x1b[43m', blue: '\x1b[44m', magenta: '\x1b[45m' }
};

class Ultimate {
  private intent = new IntentEngine();
  private transformer = new Transformer();
  private memory = new UniversalMemory();
  private skills = new SkillActivator();
  private evolution = new EvolutionLoop();
  private llm = new LLMEngine();
  private snapshots = new SnapshotManager();
  private crashRecovery = new CrashRecovery();
  private sessionPersistence = new SessionPersistence();
  private testRunner = new TestRunner();
  private evolutionMemory = new EvolutionMemory();
  private gitIntegration = new GitIntegration();
  private knowledgeBase = new KnowledgeBase();
  private templateManager = new TemplateManager();
  private responseCache = new ResponseCache();
  private multiModelManager = new MultiModelManager();
  private apiServer = new ApiServer(parseInt(process.env.ULTIMATE_API_PORT || '3000'));
  private marketplace = new Marketplace();
  private integrations = new Integrations();
  private sandbox = new Sandbox();
  private embeddings = new EmbeddingsMemory();
  private multiUser = new MultiUserManager();
  private autoSkills = new AutoSkillGenerator();
  private voice = new VoiceInterface();
  private dashboard = new WebDashboard(parseInt(process.env.ULTIMATE_DASHBOARD_PORT || '3001'));
  private agentRuntime = new AgentRuntime();
  private fileOps = new FileOps();
  private shellOps = new ShellOps();
  private httpOps = new HttpOps();
  private processManager = new ProcessManager();
  private database = new Database();
  private knowledgeEngine = new KnowledgeEngine();
  private promptOptimizer = new PromptOptimizer();
  private skillComposer = new SkillComposer();
  private strategySelector = new StrategySelector();
  private failureAnalyzer = new FailureAnalyzer();
  private deployManager = new DeployManager();
  private saasServer = new SaaSServer();
  private webhookManager = new WebhookManager();
  private pluginSDK = new PluginSDK();
  private dna!: DNA;
  private busy = false;

  async boot(): Promise<void> {
    await bootstrap();
    await config.load();
    logger.setLevel(config.get('logLevel'));
    await this.ensureApiKey();
    this.dna = await DNA.load();
    await this.memory.restore();
    await pluginManager.init();
    await this.transformer.init();
    await this.crashRecovery.init();
    await this.sessionPersistence.init();
    await this.knowledgeBase.init();
    await this.templateManager.init();
    this.multiModelManager.init();
    this.responseCache.clear();
    await this.marketplace.init();
    await this.integrations.init();
    await this.multiUser.init();
    await this.voice.init();
    await this.agentRuntime.init();
    await this.database.init();
    await this.knowledgeEngine.init();
    if (process.env.ULTIMATE_API === '1') this.startApiServer();
    if (process.env.ULTIMATE_DASHBOARD === '1') this.startDashboard();
    this.showBanner();
    this.startRepl();
  }

  private async ensureApiKey(): Promise<void> {
    const hasKey = Boolean(process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY);
    if (hasKey) return;
    console.log('');
    console.log(C.magenta + C.bold + '  ⚡ ABSOLUTE — Living Intelligence' + C.reset);
    console.log(C.dim + '  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + C.reset);
    console.log('');
    console.log(C.yellow + '  Get your FREE API key at:' + C.reset);
    console.log(C.cyan + '  https://openrouter.ai/keys' + C.reset);
    console.log('');
    try {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise<string>(r => rl.question(C.cyan + '  🔑 API key: ' + C.reset, a => { rl.close(); r(a.trim()); }));
      if (answer) {
        await fs.writeFile(path.join(ROOT, '.env'), 'OPENROUTER_API_KEY=' + answer + '\n', 'utf-8');
        process.env.OPENROUTER_API_KEY = answer;
        console.log(C.green + '  ✓ Saved!' + C.reset);
      } else {
        console.log(C.yellow + '  ⚠ Set it later: nano .env' + C.reset);
      }
    } catch (_e) {}
    console.log('');
  }

  private showBanner(): void {
    console.log('');
    console.log(C.magenta + C.bold + '  ╔═══════════════════════════════════════════╗' + C.reset);
    console.log(C.magenta + '  ║' + C.reset + C.bold + '  ⚡ ABSOLUTE — Living Intelligence  ' + C.reset + C.magenta + '      ║' + C.reset);
    console.log(C.magenta + '  ║' + C.reset + C.dim + '  Self-evolving AI with auto-recovery     ' + C.reset + C.magenta + '║' + C.reset);
    console.log(C.magenta + '  ╚═══════════════════════════════════════════╝' + C.reset);
    console.log('');
    console.log(C.dim + '  Type ' + C.cyan + '/help' + C.dim + ' for commands | ' + C.cyan + '/exit' + C.dim + ' to quit' + C.reset);
    console.log('');
  }

  private log(type: 'info' | 'success' | 'error' | 'warning' | 'system', msg: string): void {
    const ts = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const colors: Record<string, string> = { info: C.cyan, success: C.green, error: C.red, warning: C.yellow, system: C.gray };
    const labels: Record<string, string> = { info: 'ℹ', success: '✓', error: '✗', warning: '⚡', system: '⚙' };
    console.log(C.gray + '  ' + ts + C.reset + ' ' + (colors[type] || '') + labels[type] + ' ' + msg + C.reset);
  }

  private showHelp(): void {
    console.log('');
    console.log(C.bold + '  Commands:' + C.reset);
    const cmds: Array<[string, string]> = [
      ['/help', 'Show this help'], ['/status', 'System status'], ['/clear', 'Clear screen'],
      ['/exit', 'Exit'], ['/memory', 'Memory stats'], ['/recall <q>', 'Search memory'],
      ['/snapshots', 'List snapshots'], ['/snapshot', 'Create snapshot'],
      ['/skills', 'List skills'], ['/knowledge', 'Knowledge base'],
      ['/tests', 'Run tests'], ['/health', 'System health'],
      ['/evolution', 'Evolution history'], ['/git', 'Git log'],
      ['/templates', 'Templates'], ['/config', 'Configuration'],
      ['/marketplace', 'Skill marketplace'], ['/deploy', 'Deploy targets'],
      ['/agent', 'Agent status'], ['/task <desc>', 'Create task'],
      ['/failures', 'Failure reports'], ['/optimize', 'Optimize prompts'],
      ['/log', 'Show logs'], ['/errors', 'Show errors'],
    ];
    for (const [cmd, desc] of cmds) {
      console.log('    ' + C.cyan + cmd.padEnd(16) + C.reset + C.dim + desc + C.reset);
    }
    console.log('');
  }

  private async handleCommand(input: string): Promise<boolean> {
    const cmd = input.trim().toLowerCase();
    const args = input.trim().substring(input.indexOf(' ') + 1);

    if (cmd === '/help' || cmd === '/h') { this.showHelp(); return true; }
    if (cmd === '/exit' || cmd === '/quit') { await this.shutdown(); process.exit(0); }
    if (cmd === '/clear') { console.clear(); this.showBanner(); return true; }
    if (cmd === '/status') { this.showStatus(); return true; }
    if (cmd === '/memory') { const s = this.memory.getStats(); this.log('info', 'Memory: ' + s.shortTerm + ' short-term, ' + s.longTerm + ' long-term, ' + s.patterns + ' patterns, ' + s.totalSize); return true; }
    if (cmd.startsWith('/recall ')) { const r = await this.memory.recall(args); this.log('info', 'Found ' + r.length + ' results'); for (const e of r.slice(-5)) { console.log('    ' + C.gray + new Date(e.timestamp).toLocaleTimeString('fr-FR') + C.reset + ' ' + String(e.value).substring(0, 100)); } return true; }
    if (cmd === '/snapshots') { const s = await this.snapshots.listSnapshots(); s.slice(-10).forEach(x => this.log('info', x.snapshotId + ' — ' + x.reason)); return true; }
    if (cmd === '/snapshot') { const id = await this.snapshots.createSnapshot('manual'); this.log('success', 'Created: ' + id); return true; }
    if (cmd === '/skills') { const s = await this.skills.loadAllFromRegistry(); s.forEach(x => this.log('info', x.name + ' [' + (x.status || 'dormant') + ']')); return true; }
    if (cmd === '/knowledge') { const d = await this.knowledgeEngine.getAll(); this.log('info', d.length + ' documents'); return true; }
    if (cmd === '/tests') { this.log('system', 'Running tests...'); const r = await this.testRunner.runAll(); this.log(r.passed ? 'success' : 'error', r.passedTests + '/' + r.totalTests + ' passed (' + r.duration + 'ms)'); return true; }
    if (cmd === '/health') { const h = this.crashRecovery.getHealth(); this.log('info', 'Status: ' + h.status + ' | Boots: ' + h.bootCount + ' | Crashes: ' + h.crashCount); return true; }
    if (cmd === '/evolution') { const s = this.evolutionMemory.getStats(); this.log('info', 'Attempts: ' + s.totalAttempts + ' | Success: ' + (s.successRate * 100).toFixed(1) + '% | Trend: ' + s.recentTrend); return true; }
    if (cmd === '/git') { const log = await this.gitIntegration.getLog(5); log.forEach(c => this.log('info', c.hash.substring(0, 7) + ' ' + c.message)); return true; }
    if (cmd === '/templates') { const t = this.templateManager.getAllTemplates(); t.forEach(x => this.log('info', x.name + ' → ' + x.form + ': ' + x.description)); return true; }
    if (cmd === '/config') { const c = config.getAll(); Object.entries(c).forEach(([k, v]) => this.log('info', k + ': ' + v)); return true; }
    if (cmd === '/marketplace') { const s = await this.marketplace.list(); s.forEach(x => this.log('info', x.name + ' v' + x.version + ' — ' + x.description)); return true; }
    if (cmd === '/deploy') { this.log('info', 'Targets: docker, kubernetes, vercel, netlify, railway, flyio'); return true; }
    if (cmd === '/agent') { const s = this.agentRuntime.getState(); this.log('info', 'Queue: ' + s.taskQueue.length + ' | Done: ' + s.completedTasks.length + ' | Failed: ' + s.failedTasks.length); return true; }
    if (cmd.startsWith('/task ')) { const t = await this.agentRuntime.decomposeGoal(args); this.log('success', 'Decomposed into ' + t.length + ' tasks'); return true; }
    if (cmd === '/tasks') { const t = this.agentRuntime.getAllTasks(); t.slice(-10).forEach(x => this.log('info', x.status + ' — ' + x.description.substring(0, 60))); return true; }
    if (cmd === '/failures') { const r = this.failureAnalyzer.getReports(5); r.forEach(x => this.log('error', x.task.substring(0, 50) + ': ' + x.rootCause)); return true; }
    if (cmd === '/optimize') { await this.promptOptimizer.optimize('general', 'Be helpful', [{ input: 'hi', expected: 'Hello!' }]); this.log('success', 'Optimized'); return true; }
    if (cmd === '/log') { logger.getEntries().slice(-10).forEach(e => console.log('    ' + C.gray + e.timestamp + ' [' + e.level + '] [' + e.module + '] ' + e.message + C.reset)); return true; }
    if (cmd === '/errors') { logger.getRecentErrors().slice(-10).forEach(e => this.log('error', '[' + e.module + '] ' + e.message)); return true; }
    if (cmd === '/users') { this.multiUser.getUsers().forEach(u => this.log('info', u.id + ' — ' + u.name + ' [' + u.role + ']')); return true; }
    if (cmd === '/webhooks') { const w = this.webhookManager.getWebhooks(); w.forEach(x => this.log('info', x.url + ' [' + x.events.join(', ') + ']')); return true; }
    if (cmd === '/saas') { const t = this.saasServer.getTenants(); this.log('info', t.length + ' tenants'); return true; }
    if (cmd === '/patterns') { const p = this.autoSkills.getPatterns(); p.slice(0, 10).forEach(x => this.log('info', '"' + x.trigger + '" → ' + x.suggestedSkill + ' (x' + x.frequency + ')')); return true; }
    if (cmd === '/optimize') { await this.promptOptimizer.optimize('general', 'Be helpful', []); this.log('success', 'Prompt optimized'); return true; }
    if (cmd.startsWith('/ingest ')) { const c = await this.fileOps.readFile(args); const d = await this.knowledgeEngine.ingestDocument(args, c); this.log('success', 'Ingested: ' + d.title); return true; }
    if (cmd.startsWith('/search ')) { const r = await this.knowledgeEngine.search(args); r.forEach(x => this.log('info', '[' + x.score.toFixed(2) + '] ' + x.doc.title)); return true; }
    if (cmd.startsWith('/run ')) { const r = await this.sandbox.executeCode(args, 'javascript'); this.log(r.success ? 'success' : 'error', 'Exit ' + r.exitCode + ' (' + r.duration + 'ms)'); if (r.stdout) console.log(r.stdout); if (r.stderr) console.log(C.red + r.stderr + C.reset); return true; }
    if (cmd.startsWith('/rollback ')) { await this.snapshots.rollback(args); this.log('success', 'Rolled back to: ' + args); return true; }
    if (cmd.startsWith('/user ')) { const u = await this.multiUser.switchUser(args); if (u) this.log('success', 'Switched to: ' + u.name); else this.log('error', 'User not found'); return true; }
    if (cmd.startsWith('/tenant ')) { const t = await this.saasServer.createTenant(args); this.log('success', 'Tenant: ' + t.name + ' — Key: ' + t.apiKey); return true; }
    if (cmd.startsWith('/webhook ')) { const w = await this.webhookManager.register(args, ['transformation']); this.log('success', 'Webhook: ' + w.url); return true; }
    if (cmd.startsWith('/plugin ')) { const d = await this.pluginSDK.createScaffold(args); this.log('success', 'Plugin: ' + d); return true; }
    if (cmd.startsWith('/deploy ')) { const f = await this.deployManager.generateDockerfile(args, 'node'); await this.fileOps.writeFile('Dockerfile.' + args, f); this.log('success', 'Generated Dockerfile.' + args); return true; }
    return false;
  }

  private showStatus(): void {
    const rl = rateLimiter.getState();
    console.log('');
    console.log(C.bold + '  Status:' + C.reset);
    console.log('    Version: ' + C.magenta + this.dna.data.identity.version + C.reset);
    console.log('    Form: ' + C.cyan + this.dna.currentForm + C.reset);
    console.log('    Model: ' + C.green + this.llm.getModel() + C.reset);
    console.log('    Mutations: ' + C.yellow + this.dna.mutations + C.reset);
    console.log('    Skills: ' + (this.dna.activeSkills.length ? this.dna.activeSkills.join(', ') : 'none'));
    console.log('    Rate: ' + (rl.isLimited ? C.red + 'limited' + C.reset : C.green + 'ok' + C.reset));
    console.log('');
  }

  private startRepl(): void {
    const rl = readline.createInterface({
      input: process.stdin, output: process.stdout,
      prompt: C.green + 'YOU → ' + C.reset,
      completer: (line: string) => {
        const cmds = ['/help', '/status', '/clear', '/exit', '/memory', '/recall', '/snapshots', '/snapshot', '/skills', '/knowledge', '/tests', '/health', '/evolution', '/git', '/templates', '/config', '/marketplace', '/deploy', '/agent', '/task', '/tasks', '/failures', '/optimize', '/log', '/errors', '/users', '/webhooks', '/saas', '/patterns', '/ingest', '/search', '/run', '/rollback', '/user', '/tenant', '/webhook', '/plugin', '/deploy', '/cache'];
        const hits = cmds.filter(c => c.startsWith(line));
        return [hits.length ? hits : cmds, line];
      }
    });

    rl.prompt();
    rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) { rl.prompt(); return; }
      if (await this.handleCommand(input)) { rl.prompt(); return; }
      await this.handleInput(input);
      rl.prompt();
    });

    rl.on('close', () => process.exit(0));
  }

  private async handleInput(userMessage: string): Promise<void> {
    if (this.busy) { this.log('error', 'Request in progress...'); return; }
    this.busy = true;
    try {
      const output = await this.processInput(userMessage);
      if (output) console.log('\n' + C.magenta + C.bold + 'ABS →' + C.reset + ' ' + output + '\n');
    } catch (err) {
      this.log('error', (err as Error).message);
    } finally {
      this.busy = false;
    }
  }

  async processInput(userMessage: string): Promise<string | null> {
    const memoryContext = this.memory.getRecentContext(5);
    const intent = await this.intent.perceive(userMessage, memoryContext);
    if (intent.transformationNeeded && intent.targetForm) {
      this.log('warning', 'Transformation → ' + intent.targetForm);
      await this.transformer.transformSelf(intent.targetForm, intent);
      return null;
    }
    for (const skill of intent.requiredSkills) {
      await this.skills.activate(skill, intent);
      this.log('info', 'Skill: ' + skill);
    }
    const systemPrompt = this.llm.buildDefaultSystemPrompt() + (this.skills.getActiveContext() ? '\n\nSKILLS:\n' + this.skills.getActiveContext() : '');
    const recentMemory = this.memory.getRecentContext(8);
    const messages = [
      ...recentMemory.filter(m => m.key === 'interaction').flatMap(m => {
        const v = m.value as { input: string; output: string };
        return [{ role: 'user' as const, content: v.input }, { role: 'assistant' as const, content: v.output }];
      }),
      { role: 'user' as const, content: userMessage }
    ];
    const response = await this.llm.generate({ systemPrompt, messages, maxTokens: config.get('maxTokens') });
    await this.memory.remember('interaction', { input: userMessage, output: response });
    await this.dna.logInteraction();
    this.evolution.analyze({ input: userMessage, output: response, skills: intent.requiredSkills }).catch(() => {});
    this.autoSkills.analyzeAndGenerate({ input: userMessage, output: response }).catch(() => {});
    this.embeddings.add(userMessage).catch(() => {});
    this.multiUser.recordInteraction().catch(() => {});
    return response;
  }

  private startApiServer(): void {
    this.apiServer.init({
      health: () => ({ version: '2.0.0', form: this.dna.currentForm }),
      chat: async (msg: string) => { const r = await this.processInput(msg); return r || '(processing)'; },
      status: () => ({ form: this.dna.currentForm, mutations: this.dna.mutations }),
      snapshots: async () => await this.snapshots.listSnapshots(),
      skills: async () => await this.skills.loadAllFromRegistry(),
      memory: async (q?: string) => q ? await this.memory.recall(q) : this.memory.getStats(),
      evolution: () => this.evolutionMemory.getStats() as unknown as Record<string, unknown>,
      config: () => config.getAll() as unknown as Record<string, unknown>,
      users: () => this.multiUser.getUsers(),
      patterns: () => this.autoSkills.getPatterns()
    });
    this.apiServer.start().catch(e => this.log('error', 'API: ' + e.message));
  }

  private startDashboard(): void {
    this.dashboard.start(
      async () => ({ mutations: this.dna.mutations, interactions: this.dna.data.memory.interaction_count, skills: this.dna.activeSkills.length, memory: this.memory.getStats().shortTerm, snapshots: await this.snapshots.countSnapshots(), form: this.dna.currentForm, model: this.llm.getModel() }),
      async (msg: string) => { const r = await this.processInput(msg); return r || '(processing)'; }
    ).catch(e => this.log('error', 'Dashboard: ' + e.message));
  }

  private async shutdown(): Promise<void> {
    await this.sessionPersistence.endSession();
    await pluginManager.shutdown();
    await this.crashRecovery.shutdown();
  }
}

const app = new Ultimate();
app.boot().catch(err => { console.error(C.red + 'Fatal: ' + err.message + C.reset); process.exit(1); });
process.on('SIGINT', async () => { await app['shutdown'](); process.exit(0); });
process.on('SIGTERM', async () => { await app['shutdown'](); process.exit(0); });
