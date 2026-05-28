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
import { TerminalUI } from './ui/terminal_ui.js';
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
import { ImageAnalyzer, DocumentGenerator, DataViz, VoiceConversation } from './core/multimodal.js';
import { PromptOptimizer, SkillComposer, StrategySelector, FailureAnalyzer } from './core/meta_evolution.js';
import { DeployManager, SaaSServer, WebhookManager, PluginSDK } from './core/deploy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

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
  private imageAnalyzer = new ImageAnalyzer();
  private docGenerator = new DocumentGenerator();
  private dataViz = new DataViz();
  private voiceConversation = new VoiceConversation();
  private promptOptimizer = new PromptOptimizer();
  private skillComposer = new SkillComposer();
  private strategySelector = new StrategySelector();
  private failureAnalyzer = new FailureAnalyzer();
  private deployManager = new DeployManager();
  private saasServer = new SaaSServer();
  private webhookManager = new WebhookManager();
  private pluginSDK = new PluginSDK();
  private dna!: DNA;
  private ui: TerminalUI | null = null;
  private busy = false;

  async boot(): Promise<void> {
    await bootstrap();
    await config.load();
    logger.setLevel(config.get('logLevel'));

    // Check for API key — prompt if missing
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

    // Start API server if enabled
    if (process.env.ULTIMATE_API === '1') {
      this.startApiServer();
    }

    // Start web dashboard if enabled
    if (process.env.ULTIMATE_DASHBOARD === '1') {
      this.startDashboard();
    }

    const health = this.crashRecovery.getHealth();
    if (health.crashCount > 0) {
      logger.warn('Boot', 'Previous crash detected — auto-rollback available');
    }

    if (process.stdout.isTTY && !process.env.ULTIMATE_PLAIN) {
      this.startTui();
    } else {
      this.startPlainLoop();
    }
  }

  private preflightWarning(): string | null {
    const hasKey = Boolean(process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY);
    if (!hasKey) return 'API key missing: set OPENROUTER_API_KEY (.env supported). Get yours at https://openrouter.ai/keys';
    return null;
  }

  private async ensureApiKey(): Promise<void> {
    const hasKey = Boolean(process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY);
    if (hasKey) return;

    console.log('');
    console.log('\x1b[35m╔════════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[35m║                                                            ║\x1b[0m');
    console.log('\x1b[35m║  \x1b[1m⚡ ABSOLUTE — Living Intelligence\x1b[0m\x1b[35m                       ║\x1b[0m');
    console.log('\x1b[35m║  \x1b[2mSelf-evolving AI entity with auto-recovery\x1b[0m\x1b[35m              ║\x1b[0m');
    console.log('\x1b[35m║                                                            ║\x1b[0m');
    console.log('\x1b[35m╚════════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');
    console.log('\x1b[2m  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
    console.log('');
    console.log('\x1b[33m  \x1b[1mSetup required:\x1b[0m');
    console.log('');
    console.log('\x1b[36m  1.\x1b[0m Go to \x1b[4mhttps://openrouter.ai/keys\x1b[0m');
    console.log('\x1b[36m  2.\x1b[0m Create a free account (no credit card)');
    console.log('\x1b[36m  3.\x1b[0m Copy your API key below');
    console.log('');
    console.log('\x1b[2m  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
    console.log('');

    try {
      const readline = await import('node:readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      const answer = await new Promise<string>((resolve) => {
        rl.question('\x1b[36m  🔑 Paste your API key:\x1b[0m \x1b[2m(or press Enter to skip)\x1b[0m\n  \x1b[36m❯\x1b[0m ', (ans) => {
          rl.close();
          resolve(ans.trim());
        });
      });

      if (answer) {
        const envPath = path.join(ROOT, '.env');
        const envContent = `# ABSOLUTE — Living Intelligence Entity
# API Key configured on first launch

OPENROUTER_API_KEY=${answer}

# Model (default: deepseek/deepseek-v4-flash:free)
# ULTIMATE_MODEL=deepseek/deepseek-v4-flash:free

# Force plain console mode
# ULTIMATE_PLAIN=1
`;
        await fs.writeFile(envPath, envContent, 'utf-8');
        process.env.OPENROUTER_API_KEY = answer;
        console.log('');
        console.log('\x1b[32m  ✓ Key saved! Starting ABSOLUTE...\x1b[0m');
        console.log('');
        return;
      }
    } catch (_e) { /* prompt failed */ }

    console.log('');
    console.log('\x1b[33m  ⚠ No key provided. Set it later:\x1b[0m');
    console.log('\x1b[2m    nano ~/.ultimate/.env\x1b[0m');
    console.log('');
    process.exit(1);
  }

  private startApiServer(): void {
    this.apiServer.init({
      health: () => ({ version: '2.0.0', uptime: Date.now(), form: this.dna.currentForm }),
      chat: async (message: string, userId?: string) => {
        if (userId) await this.multiUser.switchUser(userId);
        const result = await this.processInput(message);
        return result || '(streaming response)';
      },
      status: () => this.renderStatus().reduce((obj, line) => {
        const [k, ...v] = line.replace(/\{[^}]+\}/g, '').split(': ');
        if (k) obj[k.trim()] = v.join(': ');
        return obj;
      }, {} as Record<string, string>),
      snapshots: async () => await this.snapshots.listSnapshots(),
      skills: async () => await this.skills.loadAllFromRegistry(),
      memory: async (query?: string) => query ? await this.memory.recall(query) : this.memory.getStats(),
      evolution: () => this.evolutionMemory.getStats() as unknown as Record<string, unknown>,
      config: () => config.getAll() as unknown as Record<string, unknown>,
      users: () => this.multiUser.getUsers(),
      patterns: () => this.autoSkills.getPatterns()
    });
    this.apiServer.start().catch(err => logger.error('Boot', 'API failed: ' + err.message));
  }

  private startDashboard(): void {
    this.dashboard.start(
      async () => ({
        mutations: this.dna.mutations,
        interactions: this.dna.data.memory.interaction_count,
        skills: this.dna.activeSkills.length,
        memory: this.memory.getStats().shortTerm,
        snapshots: await this.snapshots.countSnapshots(),
        form: this.dna.currentForm,
        model: this.llm.getModel(),
        uptime: Date.now()
      }),
      async (message: string) => {
        const result = await this.processInput(message);
        return result || '(processing...)';
      }
    ).catch(err => logger.error('Boot', 'Dashboard failed: ' + err.message));
  }

  private renderStatus(): string[] {
    const rl = rateLimiter.getState();
    const remaining = rateLimiter.getRemainingMs();
    const modeText = this.busy
      ? '{yellow-fg}processing{/yellow-fg}'
      : rl.isLimited
        ? '{red-fg}rate limited ' + Math.ceil(remaining / 1000) + 's{/red-fg}'
        : '{green-fg}idle{/green-fg}';

    return [
      '{bold}ULTIMATE{/bold}',
      'Version: ' + this.dna.data.identity.version,
      'Form: ' + this.dna.currentForm,
      'Model: ' + this.llm.getModel().split('/').pop(),
      'Mutations: ' + this.dna.mutations,
      'Skills: ' + (this.dna.activeSkills.length ? this.dna.activeSkills.join(', ') : 'base state'),
      'Mode: ' + modeText
    ];
  }

  private async refreshDashboardData(): Promise<void> {
    try {
      const snapCount = await this.snapshots.countSnapshots();
      const memStats = this.memory.getStats();
      const rl = rateLimiter.getState();
      this.ui?.updateDashboardData({
        version: this.dna.data.identity.version,
        form: this.dna.currentForm,
        mutations: this.dna.mutations,
        skills: this.dna.activeSkills,
        interactionCount: this.dna.data.memory.interaction_count,
        memoryCount: memStats.shortTerm,
        memoryUsage: memStats.totalSize,
        snapshotCount: snapCount,
        currentModel: this.llm.getModel(),
        rateLimited: rl.isLimited,
        rateLimitRemaining: rl.isLimited ? Math.ceil(rateLimiter.getRemainingMs() / 1000) + 's' : '',
        recentErrors: logger.getRecentErrors().length
      });
    } catch (_e) { /* ignore */ }
  }

  private async refreshSnapshotCount(): Promise<void> {
    try {
      const count = await this.snapshots.countSnapshots();
      this.ui?.updateDashboardData({ snapshotCount: count });
    } catch (_e) { /* */ }
  }

  private startTui(): void {
    this.ui = new TerminalUI(
      async (input: string) => {
        if (input === '/exit' || input === '/quit') {
          await this.sessionPersistence.endSession();
          await pluginManager.shutdown();
          await this.crashRecovery.shutdown();
          process.exit(0);
        }
        if (input === '/status') { this.ui?.setStatus(this.renderStatus()); return; }
        if (input === '/clear') { this.ui?.clearConversation(); return; }
        if (input === '/theme') {
          this.ui?.cycleTheme();
          const theme = this.ui?.getCurrentTheme().name.toLowerCase() || 'default';
          await config.set('theme', theme);
          return;
        }
        if (input === '/help') { this.showHelp(); return; }
        if (input === '/memory') { await this.showMemory(); return; }
        if (input.startsWith('/recall ')) { await this.recallMemory(input.slice(8).trim()); return; }
        if (input === '/snapshots') { await this.showSnapshots(); return; }
        if (input === '/snapshot') { await this.createSnapshot('manual'); return; }
        if (input === '/skills') { await this.showSkills(); return; }
        if (input.startsWith('/deactivate ')) { this.deactivateSkill(input.slice(12).trim()); return; }
        if (input.startsWith('/model ')) { this.switchModel(input.slice(7).trim()); return; }
        if (input === '/model') { this.ui?.appendInfo('Current model: ' + this.llm.getModel()); return; }
        if (input === '/config') { this.ui?.showConfig(config.getAll() as unknown as Record<string, unknown>); return; }
        if (input.startsWith('/config ')) { await this.updateConfig(input.slice(8).trim()); return; }
        if (input === '/export') { await this.exportConversation(); return; }
        if (input.startsWith('/import ')) { await this.importConversation(input.slice(8).trim()); return; }
        if (input === '/log') { this.showLog(); return; }
        if (input === '/errors') { this.showErrors(); return; }
        if (input === '/plugin') { this.ui?.showPluginList(pluginManager.getPlugins()); return; }
        if (input.startsWith('/rollback ')) { await this.rollbackSnapshot(input.slice(10).trim()); return; }
        if (input === '/rollback') { await this.rollbackSnapshot(); return; }
        if (input.startsWith('/diff ')) { await this.previewDiff(input.slice(6).trim()); return; }
        if (input === '/tests') { await this.runTests(); return; }
        if (input === '/health') { this.showHealth(); return; }
        if (input === '/evolution') { this.showEvolution(); return; }
        if (input === '/git') { await this.showGitLog(); return; }
        if (input.startsWith('/knowledge ')) { await this.searchKnowledge(input.slice(11).trim()); return; }
        if (input === '/knowledge') { await this.showKnowledge(); return; }
        if (input.startsWith('/template ')) { await this.showTemplate(input.slice(10).trim()); return; }
        if (input === '/templates') { this.showTemplates(); return; }
        if (input === '/sessions') { await this.showSessions(); return; }
        if (input === '/cache') { this.showCache(); return; }
        if (input === '/autorecover') { await this.autoRecover(); return; }
        if (input === '/marketplace') { await this.showMarketplace(); return; }
        if (input.startsWith('/install ')) { await this.installMarketplace(input.slice(9).trim()); return; }
        if (input === '/users') { this.showUsers(); return; }
        if (input.startsWith('/user ')) { await this.switchUser(input.slice(6).trim()); return; }
        if (input === '/voice') { this.showVoice(); return; }
        if (input === '/sandbox') { this.showSandboxHelp(); return; }
        if (input.startsWith('/run ')) { await this.runInSandbox(input.slice(5).trim()); return; }
        if (input === '/patterns') { this.showPatterns(); return; }
        if (input === '/integrations') { this.showIntegrations(); return; }
        if (input === '/agent') { this.showAgentStatus(); return; }
        if (input.startsWith('/task ')) { await this.createAgentTask(input.slice(6).trim()); return; }
        if (input === '/tasks') { this.showAgentTasks(); return; }
        if (input === '/reflect') { this.showReflections(); return; }
        if (input.startsWith('/ingest ')) { await this.ingestDocument(input.slice(8).trim()); return; }
        if (input.startsWith('/search ')) { await this.searchKnowledge(input.slice(8).trim()); return; }
        if (input === '/docs') { this.showDocuments(); return; }
        if (input.startsWith('/deploy ')) { await this.deployApp(input.slice(8).trim()); return; }
        if (input === '/deploy') { this.showDeployTargets(); return; }
        if (input.startsWith('/webhook ')) { await this.addWebhook(input.slice(9).trim()); return; }
        if (input === '/webhooks') { this.showWebhooks(); return; }
        if (input.startsWith('/plugin ')) { await this.createPlugin(input.slice(8).trim()); return; }
        if (input === '/optimize') { await this.optimizePrompts(); return; }
        if (input === '/compose') { this.showCompositionHelp(); return; }
        if (input === '/strategy') { this.showStrategyHelp(); return; }
        if (input === '/failures') { this.showFailures(); return; }
        if (input === '/saas') { this.showSaaS(); return; }
        if (input.startsWith('/tenant ')) { await this.createTenant(input.slice(8).trim()); return; }
        await this.handleInput(input);
      },
      () => process.exit(0)
    );

    const warning = this.preflightWarning();
    if (warning) this.ui.appendError(warning);

    const savedTheme = config.get('theme');
    if (savedTheme && savedTheme !== 'default') this.ui.setTheme(savedTheme);

    this.sessionPersistence.startSession(this.dna.currentForm, this.llm.getModel());
    this.refreshDashboardData();
    this.ui.setStatus(this.renderStatus());

    this.ui.appendSystem('╔══════════════════════════════════════════════════════════╗');
    this.ui.appendSystem('║         ABSOLUTE — Living Intelligence Entity          ║');
    this.ui.appendSystem('║       Self-evolving AI with auto-recovery              ║');
    this.ui.appendSystem('╚══════════════════════════════════════════════════════════╝');
    this.ui.appendSystem('');
    this.ui.appendSystem('Type /help for available commands.');
    this.ui.appendSystem('Type a message to interact with ULTIMATE.');
    this.refreshSnapshotCount();
  }

  private showHelp(): void {
    const lines = [
      '═══ Core ═══',
      '  /status           Show system status',
      '  /clear            Clear conversation',
      '  /theme            Cycle themes (10 available)',
      '  /help             Show this help',
      '  /exit             Exit application',
      '═══ Memory & History ═══',
      '  /memory           Show memory statistics',
      '  /recall <query>   Search memory',
      '  /export           Export conversation',
      '  /import <file>    Import conversation',
      '  /sessions         List past sessions',
      '═══ Evolution ═══',
      '  /snapshots        List all snapshots',
      '  /snapshot         Create manual snapshot',
      '  /rollback [id]    Rollback to snapshot',
      '  /diff <id>        Preview rollback changes',
      '  /evolution        Show transformation history',
      '  /tests            Run test suite',
      '  /health           Show system health',
      '  /autorecover      Auto-recover from crash',
      '═══ Marketplace ═══',
      '  /marketplace      Browse installable skills',
      '  /install <name>   Install skill from marketplace',
      '  /patterns         Show usage patterns',
      '═══ Multi-User ═══',
      '  /users            List users',
      '  /user <id>        Switch user',
      '═══ Voice & Sandbox ═══',
      '  /voice            Voice status',
      '  /sandbox          Sandbox help',
      '  /run <code>       Run code in sandbox',
      '═══ Agent Runtime ═══',
      '  /agent            Agent status',
      '  /task <desc>      Create a task',
      '  /tasks            Show all tasks',
      '  /reflect          Show reflections',
      '═══ Knowledge ═══',
      '  /ingest <file>    Ingest a document',
      '  /search <query>   Search knowledge',
      '  /docs             List documents',
      '═══ Deployment ═══',
      '  /deploy           Show deploy targets',
      '  /deploy <target>  Deploy to target',
      '  /webhooks         List webhooks',
      '  /webhook <url>    Register webhook',
      '  /saas             SaaS status',
      '  /tenant <name>    Create tenant',
      '═══ Meta ═══',
      '  /optimize         Optimize prompts',
      '  /compose          Skill composition',
      '  /strategy         Strategy help',
      '  /failures         Failure reports',
      '  /plugin <name>    Create plugin scaffold',
      '═══ System ═══',
      '  /model [name]     Show/set model',
      '  /config           Show config',
      '  /config k=v       Update config',
      '  /log              Show all logs',
      '  /errors           Show recent errors',
      '  /git              Show git log',
      '  /plugin           List plugins',
      '  /cache            Show cache stats',
      '═══ Shortcuts ═══',
      '  Ctrl+T Theme | Ctrl+H History | Ctrl+L Clear',
      '  Ctrl+S Bottom | Tab Focus/AutoComplete | Ctrl+C Exit'
    ];
    for (const line of lines) this.ui?.appendSystem(line);
  }

  private async showMemory(): Promise<void> {
    const stats = this.memory.getStats();
    this.ui?.showMemoryStats(stats);
    this.ui?.setStatus(this.renderStatus());
  }

  private async recallMemory(query: string): Promise<void> {
    const results = await this.memory.recall(query);
    if (!results.length) { this.ui?.appendInfo('No matches for "' + query + '".'); return; }
    this.ui?.appendDivider();
    this.ui?.appendSystem('Memory: "' + query + '" — ' + results.length + ' results');
    for (const entry of results.slice(-5)) {
      const date = new Date(entry.timestamp).toLocaleString('fr-FR');
      const val = typeof entry.value === 'object' ? JSON.stringify(entry.value).substring(0, 120) : String(entry.value).substring(0, 120);
      this.ui?.appendInfo('[' + date + '] {bold}' + entry.key + '{/bold}: ' + val);
    }
    this.ui?.appendDivider();
  }

  private async showSnapshots(): Promise<void> {
    const snapshots = await this.snapshots.listSnapshots();
    this.ui?.showSnapshotList(snapshots);
    this.ui?.setStatus(this.renderStatus());
  }

  private async createSnapshot(reason: string): Promise<void> {
    this.ui?.appendSystem('Creating snapshot...');
    try {
      const id = await this.snapshots.createSnapshot(reason);
      this.ui?.appendSuccess('Snapshot: ' + id);
      await this.refreshSnapshotCount();
    } catch (e) { this.ui?.appendError('Failed: ' + (e as Error).message); }
  }

  private async rollbackSnapshot(snapshotId?: string): Promise<void> {
    const targetId = snapshotId || (await this.snapshots.getLatestSnapshotId());
    if (!targetId) { this.ui?.appendWarning('No snapshots.'); return; }
    this.ui?.showDiffPreview(await this.snapshots.previewRollback(targetId));
    this.ui?.appendSystem('Rolling back to ' + targetId + '...');
    try {
      await this.snapshots.rollback(targetId);
      this.ui?.appendSuccess('Rolled back: ' + targetId);
      await this.gitIntegration.commitRollback(targetId);
    } catch (e) { this.ui?.appendError('Failed: ' + (e as Error).message); }
  }

  private async previewDiff(snapshotId: string): Promise<void> {
    try { this.ui?.showDiffPreview(await this.snapshots.previewRollback(snapshotId)); }
    catch (e) { this.ui?.appendError((e as Error).message); }
  }

  private async showSkills(): Promise<void> {
    const skills = await this.skills.loadAllFromRegistry();
    this.ui?.showSkillList(skills);
    this.ui?.setStatus(this.renderStatus());
  }

  private deactivateSkill(name: string): void {
    if (this.skills.deactivate(name)) this.ui?.appendSuccess('Deactivated: ' + name);
    else this.ui?.appendWarning('Not active or has dependents: ' + name);
    this.ui?.setStatus(this.renderStatus());
  }

  private switchModel(model: string): void {
    this.llm.setModel(model);
    this.ui?.appendSuccess('Model: ' + model);
    this.ui?.updateDashboardData({ currentModel: model });
    config.set('model', model);
  }

  private async updateConfig(setting: string): Promise<void> {
    const parts = setting.split('=');
    const key = parts[0];
    const value = parts.slice(1).join('=');
    if (!key || !value) { this.ui?.appendWarning('Usage: /config key=value'); return; }
    const numVal = Number(value);
    const boolVal = value === 'true' ? true : value === 'false' ? false : undefined;
    await config.update({ [key]: boolVal ?? (isNaN(numVal) ? value : numVal) });
    this.ui?.appendSuccess('Config: ' + key + ' = ' + value);
    if (key === 'theme') this.ui?.setTheme(value);
    if (key === 'logLevel') logger.setLevel(value as 'debug' | 'info' | 'warn' | 'error' | 'silent');
  }

  private async exportConversation(): Promise<void> {
    try {
      const md = this.ui?.exportConversationMarkdown() || '';
      const mem = await this.memory.exportToMarkdown();
      const filePath = path.join(ROOT, 'export_' + Date.now() + '.md');
      await fs.writeFile(filePath, md + '\n\n' + mem, 'utf-8');
      this.ui?.appendSuccess('Exported: ' + path.basename(filePath));
    } catch (e) { this.ui?.appendError((e as Error).message); }
  }

  private async importConversation(filePath: string): Promise<void> {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      this.ui?.appendSuccess('Imported ' + content.length + ' bytes');
    } catch (e) { this.ui?.appendError((e as Error).message); }
  }

  private showLog(): void {
    const entries = logger.getEntries().map(e => ({ timestamp: e.timestamp, module: e.module, message: e.message }));
    this.ui?.showErrorLog(entries);
  }

  private showErrors(): void {
    const entries = logger.getRecentErrors().map(e => ({ timestamp: e.timestamp, module: e.module, message: e.message }));
    this.ui?.showErrorLog(entries);
  }

  private async runTests(): Promise<void> {
    this.ui?.appendSystem('Running test suite...');
    const result = await this.testRunner.runAll();
    if (result.passed) this.ui?.appendSuccess('All ' + result.totalTests + ' tests passed (' + result.duration + 'ms)');
    else this.ui?.appendError(result.failedTests + '/' + result.totalTests + ' tests failed (' + result.duration + 'ms)');
    for (const err of result.errors) this.ui?.appendError('  ✗ ' + err);
  }

  private showHealth(): void {
    const h = this.crashRecovery.getHealth();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}System Health{/bold}');
    this.ui?.appendInfo('Status: ' + h.status);
    this.ui?.appendInfo('PID: ' + h.pid);
    this.ui?.appendInfo('Boot count: ' + h.bootCount);
    this.ui?.appendInfo('Crash count: ' + h.crashCount);
    this.ui?.appendInfo('Uptime: ' + Math.floor((Date.now() - h.startedAt) / 1000) + 's');
    if (h.lastCrashError) this.ui?.appendWarning('Last crash: ' + h.lastCrashError);
    this.ui?.appendDivider();
  }

  private showEvolution(): void {
    const s = this.evolutionMemory.getStats();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Evolution History{/bold}');
    this.ui?.appendInfo('Total attempts: ' + s.totalAttempts);
    this.ui?.appendSuccess('Successes: ' + s.successes);
    this.ui?.appendError('Failures: ' + s.failures);
    this.ui?.appendWarning('Rolled back: ' + s.rolledBack);
    this.ui?.appendInfo('Success rate: ' + (s.successRate * 100).toFixed(1) + '%');
    this.ui?.appendInfo('Avg duration: ' + s.averageDuration.toFixed(0) + 'ms');
    this.ui?.appendInfo('Best form: ' + (s.bestForm || 'N/A'));
    this.ui?.appendInfo('Worst form: ' + (s.worstForm || 'N/A'));
    this.ui?.appendInfo('Trend: ' + s.recentTrend);
    this.ui?.appendDivider();
  }

  private async showGitLog(): Promise<void> {
    const log = await this.gitIntegration.getLog(10);
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Git Log{/bold}');
    for (const c of log) this.ui?.appendInfo(c.hash.substring(0, 7) + ' ' + c.message + ' (' + c.date + ')');
    if (!log.length) this.ui?.appendInfo('No commits yet');
    this.ui?.appendDivider();
  }

  private async showKnowledge(): Promise<void> {
    const entries = await this.knowledgeBase.getAll();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Knowledge Base{/bold} — ' + entries.length + ' entries');
    for (const e of entries.slice(0, 10)) {
      this.ui?.appendInfo('  ' + e.title + ' [' + e.tags.join(', ') + ']');
    }
    this.ui?.appendDivider();
  }

  private async showTemplate(name: string): Promise<void> {
    const t = this.templateManager.getTemplate(name);
    if (!t) { this.ui?.appendWarning('Template not found: ' + name); return; }
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Template: ' + t.name + '{/bold}');
    this.ui?.appendInfo('Description: ' + t.description);
    this.ui?.appendInfo('Form: ' + t.form);
    this.ui?.appendInfo('Domains: ' + t.domains.join(', '));
    this.ui?.appendInfo('Key features: ' + t.keyFeatures.join(', '));
    this.ui?.appendInfo('Suggested skills: ' + t.suggestedSkills.join(', '));
    this.ui?.appendDivider();
  }

  private showTemplates(): void {
    const templates = this.templateManager.getAllTemplates();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Transformation Templates{/bold}');
    for (const t of templates) {
      this.ui?.appendInfo('  {bold}' + t.name + '{/bold} → ' + t.form + ': ' + t.description);
    }
    this.ui?.appendDivider();
  }

  private async showSessions(): Promise<void> {
    const sessions = await this.sessionPersistence.getRecentSessions(10);
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Recent Sessions{/bold}');
    for (const s of sessions) {
      const date = new Date(s.startedAt).toLocaleString('fr-FR');
      this.ui?.appendInfo('  ' + s.id + ' — ' + date + ' — ' + s.entries.length + ' entries — ' + s.form);
    }
    this.ui?.appendDivider();
  }

  private showCache(): void {
    const s = this.responseCache.getStats();
    this.ui?.appendInfo('Cache: ' + s.size + '/' + s.maxEntries + ' entries, ' + s.totalHits + ' hits');
  }

  private async autoRecover(): Promise<void> {
    this.ui?.appendSystem('Attempting auto-recovery...');
    const rolled = await this.crashRecovery.autoRollback();
    if (rolled) this.ui?.appendSuccess('Auto-recovered from: ' + rolled);
    else this.ui?.appendWarning('No recovery needed or no snapshots available');
  }

  private async showMarketplace(): Promise<void> {
    const skills = await this.marketplace.list();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Skill Marketplace{/bold}');
    for (const s of skills.slice(0, 15)) {
      const rating = '★'.repeat(Math.round(s.rating));
      this.ui?.appendInfo('  {bold}' + s.name + '{/bold} v' + s.version + ' — ' + s.description);
      this.ui?.appendInfo('    ' + rating + ' (' + s.rating.toFixed(1) + ') · ' + s.downloads + ' downloads · by ' + s.author);
    }
    this.ui?.appendDivider();
  }

  private async installMarketplace(name: string): Promise<void> {
    this.ui?.appendSystem('Installing ' + name + '...');
    const ok = await this.marketplace.install(name);
    if (ok) this.ui?.appendSuccess('Installed: ' + name);
    else this.ui?.appendWarning('Skill not found: ' + name);
  }

  private showUsers(): void {
    const users = this.multiUser.getUsers();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Users{/bold}');
    for (const u of users) {
      const current = this.multiUser.getCurrentUser()?.id === u.id ? ' (current)' : '';
      this.ui?.appendInfo('  ' + u.id + ' — ' + u.name + ' [' + u.role + ']' + current + ' — ' + u.interactionCount + ' interactions');
    }
    this.ui?.appendDivider();
  }

  private async switchUser(userId: string): Promise<void> {
    const user = await this.multiUser.switchUser(userId);
    if (user) this.ui?.appendSuccess('Switched to: ' + user.name);
    else this.ui?.appendWarning('User not found: ' + userId);
  }

  private showVoice(): void {
    const v = this.voice.getConfig();
    this.ui?.appendInfo('Voice: ' + (v.enabled ? 'enabled' : 'disabled') + ' — engine: ' + v.engine + ' — language: ' + v.language);
  }

  private showSandboxHelp(): void {
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Sandbox Execution{/bold}');
    this.ui?.appendInfo('  /run <code> — Execute code safely in sandbox');
    this.ui?.appendInfo('  Supported: TypeScript, JavaScript, Python, Shell');
    this.ui?.appendInfo('  Timeout: 10s | Max output: 50KB');
    this.ui?.appendDivider();
  }

  private async runInSandbox(code: string): Promise<void> {
    this.ui?.appendSystem('Running in sandbox...');
    const lang = code.includes('import ') || code.includes(': ') ? 'typescript'
      : code.includes('def ') || code.includes('import ') ? 'python'
      : code.includes('#!/') ? 'shell' : 'javascript';
    const result = await this.sandbox.executeCode(code, lang);
    if (result.success) {
      this.ui?.appendSuccess('Exit 0 (' + result.duration + 'ms)');
      if (result.stdout) this.ui?.appendInfo(result.stdout);
    } else {
      this.ui?.appendError('Exit ' + result.exitCode + ' (' + result.duration + 'ms)');
      if (result.stderr) this.ui?.appendError(result.stderr);
      if (result.timedOut) this.ui?.appendWarning('Timed out');
    }
  }

  private showPatterns(): void {
    const patterns = this.autoSkills.getPatterns();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Usage Patterns{/bold}');
    if (patterns.length === 0) {
      this.ui?.appendInfo('  No patterns detected yet — keep chatting!');
    } else {
      for (const p of patterns.slice(0, 10)) {
        this.ui?.appendInfo('  "' + p.trigger + '" → ' + p.suggestedSkill + ' (freq: ' + p.frequency + ')');
      }
    }
    this.ui?.appendDivider();
  }

  private showIntegrations(): void {
    const active = this.integrations.getActive();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Integrations{/bold}');
    if (active.length === 0) {
      this.ui?.appendInfo('  No integrations configured');
      this.ui?.appendInfo('  Set env vars: GITHUB_TOKEN, DISCORD_BOT_TOKEN, SLACK_BOT_TOKEN, etc.');
    } else {
      for (const i of active) {
        this.ui?.appendSuccess('  ✓ ' + i.type + ' (' + i.name + ')');
      }
    }
    this.ui?.appendDivider();
  }

  private showAgentStatus(): void {
    const state = this.agentRuntime.getState();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Agent Runtime{/bold}');
    this.ui?.appendInfo('  Current task: ' + (state.currentTaskId || 'none'));
    this.ui?.appendInfo('  Queue: ' + state.taskQueue.length + ' pending');
    this.ui?.appendInfo('  Completed: ' + state.completedTasks.length);
    this.ui?.appendInfo('  Failed: ' + state.failedTasks.length);
    this.ui?.appendInfo('  Active goals: ' + state.activeGoals.length);
    this.ui?.appendInfo('  Reflections: ' + state.reflectionHistory.length);
    this.ui?.appendInfo('  Uptime: ' + Math.floor((Date.now() - state.startTime) / 1000) + 's');
    this.ui?.appendDivider();
  }

  private async createAgentTask(description: string): Promise<void> {
    this.ui?.appendSystem('Creating task: ' + description);
    const tasks = await this.agentRuntime.decomposeGoal(description);
    this.ui?.appendSuccess('Decomposed into ' + tasks.length + ' sub-tasks');
    for (const t of tasks) {
      this.ui?.appendInfo('  [' + t.priority + '] ' + t.description);
    }
  }

  private showAgentTasks(): void {
    const all = this.agentRuntime.getAllTasks();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Agent Tasks{/bold}');
    if (all.length === 0) {
      this.ui?.appendInfo('  No tasks');
    } else {
      for (const t of all.slice(-15)) {
        const statusIcon = t.status === 'success' ? '✓' : t.status === 'failed' ? '✗' : t.status === 'running' ? '⟳' : '○';
        this.ui?.appendInfo('  ' + statusIcon + ' ' + t.description.substring(0, 60) + ' [' + t.status + ']');
      }
    }
    this.ui?.appendDivider();
  }

  private showReflections(): void {
    const reflections = this.agentRuntime.getReflections();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Reflections{/bold}');
    if (reflections.length === 0) {
      this.ui?.appendInfo('  No reflections yet');
    } else {
      for (const r of reflections.slice(-10)) {
        this.ui?.appendInfo('  ' + r.lesson.substring(0, 80));
      }
    }
    this.ui?.appendDivider();
  }

  private async ingestDocument(filePath: string): Promise<void> {
    this.ui?.appendSystem('Ingesting: ' + filePath);
    try {
      const content = await this.fileOps.readFile(filePath);
      const title = path.basename(filePath);
      const doc = await this.knowledgeEngine.ingestDocument(title, content, filePath);
      this.ui?.appendSuccess('Ingested: ' + doc.title + ' (' + doc.tags.join(', ') + ')');
    } catch (err) {
      this.ui?.appendError('Failed: ' + (err as Error).message);
    }
  }

  private async searchKnowledge(query: string): Promise<void> {
    const results = await this.knowledgeEngine.search(query, 5);
    this.ui?.appendDivider();
    this.ui?.appendSystem('Knowledge: "' + query + '" — ' + results.length + ' results');
    for (const { doc, score } of results) {
      this.ui?.appendInfo('  [' + score.toFixed(2) + '] ' + doc.title + ': ' + doc.summary.substring(0, 80));
    }
    this.ui?.appendDivider();
  }

  private showDocuments(): void {
    const docs = this.knowledgeEngine.getAll();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Knowledge Documents{/bold} — ' + docs.length + ' total');
    for (const d of docs.slice(0, 15)) {
      this.ui?.appendInfo('  ' + d.title + ' [' + d.tags.join(', ') + '] (used ' + d.accessCount + 'x)');
    }
    this.ui?.appendDivider();
  }

  private async deployApp(target: string): Promise<void> {
    this.ui?.appendSystem('Deploying to ' + target + '...');
    this.ui?.appendInfo('Generating deployment files...');
    const dockerfile = await this.deployManager.generateDockerfile('ultimate', 'node');
    await this.fileOps.writeFile('Dockerfile.deploy', dockerfile);
    this.ui?.appendSuccess('Generated Dockerfile.deploy');
    this.ui?.appendInfo('Run: docker build -f Dockerfile.deploy -t ' + target + ' .');
  }

  private showDeployTargets(): void {
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Deploy Targets{/bold}');
    this.ui?.appendInfo('  docker     — Docker container');
    this.ui?.appendInfo('  kubernetes — K8s manifests');
    this.ui?.appendInfo('  vercel     — Vercel deployment');
    this.ui?.appendInfo('  netlify    — Netlify deployment');
    this.ui?.appendInfo('  railway    — Railway deployment');
    this.ui?.appendInfo('  flyio      — Fly.io deployment');
    this.ui?.appendInfo('  manual     — Manual deployment');
    this.ui?.appendDivider();
  }

  private async addWebhook(url: string): Promise<void> {
    const wh = await this.webhookManager.register(url, ['transformation', 'interaction', 'error']);
    this.ui?.appendSuccess('Webhook registered: ' + wh.url + ' (secret: ' + wh.secret + ')');
  }

  private showWebhooks(): void {
    const webhooks = this.webhookManager.getWebhooks();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Webhooks{/bold}');
    if (webhooks.length === 0) {
      this.ui?.appendInfo('  No webhooks registered');
    } else {
      for (const w of webhooks) {
        this.ui?.appendInfo('  ' + w.url + ' [' + w.events.join(', ') + '] ' + (w.enabled ? '✓' : '○'));
      }
    }
    this.ui?.appendDivider();
  }

  private async createPlugin(name: string): Promise<void> {
    const dir = await this.pluginSDK.createScaffold(name);
    this.ui?.appendSuccess('Plugin scaffold created: ' + dir);
  }

  private async optimizePrompts(): Promise<void> {
    this.ui?.appendSystem('Optimizing prompts...');
    const optimized = await this.promptOptimizer.optimize('general', 'Be helpful and concise.', [
      { input: 'Hello', expected: 'Hi! How can I help?' }
    ]);
    this.ui?.appendSuccess('Prompt optimized (' + optimized.length + ' chars)');
  }

  private showCompositionHelp(): void {
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Skill Composition{/bold}');
    this.ui?.appendInfo('  Compose multiple skills into one unified skill');
    this.ui?.appendInfo('  Use /skills to see available skills');
    this.ui?.appendInfo('  Skills are auto-composed when patterns emerge');
    this.ui?.appendDivider();
  }

  private showStrategyHelp(): void {
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Strategy Selection{/bold}');
    this.ui?.appendInfo('  direct    — Do it simply');
    this.ui?.appendInfo('  decompose — Break into parts');
    this.ui?.appendInfo('  research  — Learn first');
    this.ui?.appendInfo('  iterate   — Try and refine');
    this.ui?.appendInfo('  collaborate — Use multiple tools');
    this.ui?.appendDivider();
  }

  private showFailures(): void {
    const reports = this.failureAnalyzer.getReports(10);
    const causes = this.failureAnalyzer.getCommonCauses();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}Failure Reports{/bold}');
    if (reports.length === 0) {
      this.ui?.appendInfo('  No failures recorded');
    } else {
      for (const r of reports.slice(-5)) {
        this.ui?.appendError('  ' + r.task.substring(0, 50) + ': ' + r.rootCause);
      }
      if (causes.length > 0) {
        this.ui?.appendInfo('  Common causes:');
        for (const c of causes.slice(0, 3)) {
          this.ui?.appendInfo('    ' + c.cause + ' (' + c.count + 'x)');
        }
      }
    }
    this.ui?.appendDivider();
  }

  private showSaaS(): void {
    const tenants = this.saasServer.getTenants();
    this.ui?.appendDivider();
    this.ui?.appendSystem('{bold}SaaS Mode{/bold}');
    this.ui?.appendInfo('  Tenants: ' + tenants.length);
    for (const t of tenants) {
      this.ui?.appendInfo('    ' + t.name + ' — ' + t.usage.requests + '/' + t.quota.requests + ' requests');
    }
    this.ui?.appendDivider();
  }

  private async createTenant(name: string): Promise<void> {
    const tenant = await this.saasServer.createTenant(name);
    this.ui?.appendSuccess('Tenant: ' + tenant.name);
    this.ui?.appendInfo('  API Key: ' + tenant.apiKey);
    this.ui?.appendInfo('  Quota: ' + tenant.quota.requests + ' requests, ' + tenant.quota.tokens + ' tokens');
  }

  private async handleInput(userMessage: string): Promise<void> {
    if (this.busy) { this.ui?.appendError('Request in progress...'); return; }
    this.busy = true;
    this.ui?.setStatus(this.renderStatus());

    try {
      await this.sessionPersistence.addEntry('user', userMessage);
      const output = await this.processInput(userMessage);

      if (output && output !== 'STREAMING') {
        this.ui?.appendAssistant(output);
        await this.sessionPersistence.addEntry('assistant', output);
      } else if (output === 'STREAMING' && this.ui) {
        this.ui.startStreaming();
        const systemPrompt = this.buildCurrentSystemPrompt();
        const messages = this.buildCurrentMessages(userMessage);
        const streamed = await this.llm.generate({
          systemPrompt,
          messages,
          maxTokens: config.get('maxTokens'),
          stream: true,
          onToken: (token: string) => this.ui?.appendStreamToken(token)
        });
        this.ui.finishStreaming();
        await this.sessionPersistence.addEntry('assistant', streamed);
        await this.memory.remember('interaction', { input: userMessage, output: streamed });
        await this.dna.logInteraction();
        this.refreshDashboardData();
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (this.ui) this.ui.appendError(msg);
      else console.error('Error: ' + msg);
      this.ui?.updateDashboardData({ recentErrors: logger.getRecentErrors().length });
    } finally {
      this.busy = false;
      this.ui?.setStatus(this.renderStatus());
      const rl = rateLimiter.getState();
      const remaining = rateLimiter.getRemainingMs();
      this.ui?.updateDashboardData({
        rateLimited: rl.isLimited,
        rateLimitRemaining: rl.isLimited ? Math.ceil(remaining / 1000) + 's' : ''
      });
    }
  }

  async processInput(userMessage: string): Promise<string | null> {
    const memoryContext = this.memory.getRecentContext(5);
    const intent = await this.intent.perceive(userMessage, memoryContext);

    if (intent.transformationNeeded && intent.targetForm) {
      this.ui?.appendSystem('Transformation → ' + intent.targetForm);
      await this.transformer.transformSelf(intent.targetForm, intent);
      return null;
    }

    for (const skill of intent.requiredSkills) {
      await this.skills.activate(skill, intent);
      this.ui?.appendSystem('Skill: ' + skill);
    }

    if (!config.get('streamEnabled')) {
      const systemPrompt = this.buildCurrentSystemPrompt();
      const messages = this.buildCurrentMessages(userMessage);

      const cached = this.responseCache.get(systemPrompt, messages);
      if (cached) {
        this.ui?.appendInfo('(cached response)');
        return cached;
      }

      const response = await this.llm.generate({
        systemPrompt,
        messages,
        maxTokens: config.get('maxTokens')
      });
      this.responseCache.set(systemPrompt, messages, response);

      await this.memory.remember('interaction', { input: userMessage, output: response });
      await this.dna.logInteraction();
      this.refreshDashboardData();

      this.evolution
        .analyze({ input: userMessage, output: response, skills: intent.requiredSkills })
        .catch(() => {});

      // Auto-skill generation
      this.autoSkills.analyzeAndGenerate({ input: userMessage, output: response }).catch(() => {});

      // Embeddings
      this.embeddings.add(userMessage).catch(() => {});

      // Multi-user tracking
      this.multiUser.recordInteraction().catch(() => {});

      // Integrations
      this.integrations.notify({
        type: 'interaction',
        source: 'tui',
        data: { input: userMessage, output: response.substring(0, 200) },
        timestamp: Date.now()
      }).catch(() => {});

      return response;
    }

    return 'STREAMING';
  }

  private buildCurrentSystemPrompt(): string {
    const skillContext = this.skills.getActiveContext();
    return this.llm.buildDefaultSystemPrompt()
      + (skillContext ? '\n\nACTIVE SKILLS:\n' + skillContext : '');
  }

  private buildCurrentMessages(userMessage: string): Array<{ role: 'user' | 'assistant'; content: string }> {
    const recentMemory = this.memory.getRecentContext(8);
    return [
      ...recentMemory
        .filter((m) => m.key === 'interaction')
        .flatMap((m) => {
          const value = m.value as { input: string; output: string };
          return [
            { role: 'user' as const, content: value.input },
            { role: 'assistant' as const, content: value.output }
          ];
        }),
      { role: 'user' as const, content: userMessage }
    ];
  }

  private startPlainLoop(): void {
    const warning = this.preflightWarning();
    if (warning) console.log('⚠ ' + warning);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'YOU → '
    });

    rl.prompt();
    rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) return rl.prompt();

      if (input === '/quit' || input === '/exit') {
        await this.sessionPersistence.endSession();
        await pluginManager.shutdown();
        await this.crashRecovery.shutdown();
        process.exit(0);
      }
      if (input === '/status') {
        console.log(this.renderStatus().join('\n').replace(/\{[^}]+\}/g, ''));
        return rl.prompt();
      }
      if (input === '/memory') {
        const s = this.memory.getStats();
        console.log('Memory: ' + s.shortTerm + ' short, ' + s.longTerm + ' long, ' + s.patterns + ' patterns, ' + s.totalSize);
        return rl.prompt();
      }
      if (input === '/tests') {
        const r = await this.testRunner.runAll();
        console.log('Tests: ' + r.passedTests + '/' + r.totalTests + ' ' + (r.passed ? 'PASSED' : 'FAILED'));
        return rl.prompt();
      }
      if (input === '/health') {
        const h = this.crashRecovery.getHealth();
        console.log('Health: ' + h.status + ' | boots: ' + h.bootCount + ' | crashes: ' + h.crashCount);
        return rl.prompt();
      }
      if (input === '/evolution') {
        const s = this.evolutionMemory.getStats();
        console.log('Evolution: ' + s.totalAttempts + ' attempts, ' + (s.successRate * 100).toFixed(1) + '% success, trend: ' + s.recentTrend);
        return rl.prompt();
      }
      if (input === '/help') {
        console.log('Commands: /status /clear /theme /help /exit /memory /snapshots /skills /tests /health /evolution /git /knowledge /templates /sessions /cache');
        return rl.prompt();
      }

      await this.handleInput(input);
      rl.prompt();
    });
  }
}

const ultimate = new Ultimate();
ultimate.boot().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  logger.info('System', 'SIGINT received');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('System', 'SIGTERM received');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error('System', 'Uncaught: ' + err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('System', 'Unhandled rejection: ' + reason);
});
