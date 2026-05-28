import blessed from 'blessed';

type SubmitHandler = (value: string) => Promise<void> | void;
type ExitHandler = () => void;

export interface Theme {
  name: string;
  primary: string;
  secondary: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  user: string;
  assistant: string;
  system: string;
  border: string;
  background: string;
  text: string;
  accent: string;
  muted: string;
  glow: string;
}

const themes: Record<string, Theme> = {
  default: {
    name: 'Default', primary: 'magenta', secondary: 'cyan', success: 'green',
    error: 'red', warning: 'yellow', info: 'blue', user: 'green', assistant: 'magenta',
    system: 'gray', border: 'white', background: 'black', text: 'white',
    accent: '#ff79c6', muted: '#6272a4', glow: '#bd93f9'
  },
  matrix: {
    name: 'Matrix', primary: 'green', secondary: 'green', success: 'green',
    error: 'red', warning: 'yellow', info: 'green', user: 'green', assistant: 'green',
    system: 'darkgreen', border: 'green', background: 'black', text: 'green',
    accent: '#00ff41', muted: '#003300', glow: '#00ff41'
  },
  drake: {
    name: 'Drake', primary: 'purple', secondary: 'pink', success: 'cyan',
    error: 'red', warning: 'yellow', info: 'blue', user: 'purple', assistant: 'pink',
    system: 'gray', border: 'purple', background: 'black', text: 'white',
    accent: '#ff79c6', muted: '#6272a4', glow: '#bd93f9'
  },
  nord: {
    name: 'Nord', primary: '#88c0d0', secondary: '#81a1c1', success: '#a3be8c',
    error: '#bf616a', warning: '#ebcb8b', info: '#5e81ac', user: '#a3be8c',
    assistant: '#88c0d0', system: '#d8dee9', border: '#4c566a', background: '#2e3440',
    text: '#d8dee9', accent: '#b48ead', muted: '#4c566a', glow: '#88c0d0'
  },
  solarized: {
    name: 'Solarized Dark', primary: '#268bd2', secondary: '#6c71c4', success: '#859900',
    error: '#dc322f', warning: '#b58900', info: '#268bd2', user: '#859900',
    assistant: '#268bd2', system: '#93a1a1', border: '#073642', background: '#002b36',
    text: '#93a1a1', accent: '#cb4b16', muted: '#586e75', glow: '#268bd2'
  },
  cyberpunk: {
    name: 'Cyberpunk', primary: '#f97583', secondary: '#79c0ff', success: '#56d364',
    error: '#f85149', warning: '#e3b341', info: '#58a6ff', user: '#56d364',
    assistant: '#f97583', system: '#8b949e', border: '#f97583', background: '#0d1117',
    text: '#c9d1d9', accent: '#bc8cff', muted: '#484f58', glow: '#f97583'
  },
  dracula: {
    name: 'Dracula', primary: '#ff79c6', secondary: '#bd93f9', success: '#50fa7b',
    error: '#ff5555', warning: '#f1fa8c', info: '#8be9fd', user: '#50fa7b',
    assistant: '#ff79c6', system: '#6272a4', border: '#bd93f9', background: '#282a36',
    text: '#f8f8f2', accent: '#ffb86c', muted: '#6272a4', glow: '#ff79c6'
  },
  monokai: {
    name: 'Monokai', primary: '#f92672', secondary: '#a6e22e', success: '#a6e22e',
    error: '#f92672', warning: '#e6db74', info: '#66d9ef', user: '#a6e22e',
    assistant: '#f92672', system: '#75715e', border: '#49483e', background: '#272822',
    text: '#f8f8f2', accent: '#ae81ff', muted: '#75715e', glow: '#f92672'
  },
  gruvbox: {
    name: 'Gruvbox', primary: '#fabd2f', secondary: '#fe8019', success: '#b8bb26',
    error: '#fb4934', warning: '#fabd2f', info: '#83a598', user: '#b8bb26',
    assistant: '#fabd2f', system: '#928374', border: '#504945', background: '#282828',
    text: '#ebdbb2', accent: '#d3869b', muted: '#665c54', glow: '#fabd2f'
  },
  tokyo: {
    name: 'Tokyo Night', primary: '#bb9af7', secondary: '#7dcfff', success: '#9ece6a',
    error: '#f7768e', warning: '#e0af68', info: '#7aa2f7', user: '#9ece6a',
    assistant: '#bb9af7', system: '#565f89', border: '#414868', background: '#1a1b26',
    text: '#c0caf5', accent: '#ff9e64', muted: '#565f89', glow: '#bb9af7'
  },
  aurora: {
    name: 'Aurora', primary: '#c084fc', secondary: '#22d3ee', success: '#4ade80',
    error: '#f87171', warning: '#fbbf24', info: '#60a5fa', user: '#4ade80',
    assistant: '#c084fc', system: '#94a3b8', border: '#475569', background: '#0f172a',
    text: '#e2e8f0', accent: '#f472b6', muted: '#64748b', glow: '#c084fc'
  },
  ocean: {
    name: 'Ocean', primary: '#0ea5e9', secondary: '#06b6d4', success: '#10b981',
    error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', user: '#10b981',
    assistant: '#0ea5e9', system: '#94a3b8', border: '#334155', background: '#020617',
    text: '#e2e8f0', accent: '#8b5cf6', muted: '#64748b', glow: '#0ea5e9'
  },
  ember: {
    name: 'Ember', primary: '#f97316', secondary: '#ef4444', success: '#22c55e',
    error: '#dc2626', warning: '#eab308', info: '#f97316', user: '#22c55e',
    assistant: '#f97316', system: '#a8a29e', border: '#57534e', background: '#1c1917',
    text: '#fafaf9', accent: '#fb923c', muted: '#78716c', glow: '#f97316'
  }
};

const SLASH_COMMANDS = [
  '/status', '/clear', '/theme', '/help', '/exit', '/quit',
  '/memory', '/recall', '/snapshots', '/snapshot', '/skills',
  '/deactivate', '/model', '/config', '/export', '/import',
  '/log', '/errors', '/plugin', '/diff', '/rollback',
  '/tests', '/health', '/evolution', '/git', '/knowledge',
  '/templates', '/template', '/sessions', '/cache', '/autorecover',
  '/marketplace', '/install', '/patterns', '/users', '/user',
  '/voice', '/sandbox', '/run', '/integrations',
  '/agent', '/task', '/tasks', '/reflect',
  '/ingest', '/search', '/docs', '/deploy', '/webhooks',
  '/webhook', '/saas', '/tenant', '/optimize', '/compose',
  '/strategy', '/failures'
];

export interface DashboardData {
  theme: string;
  version: string;
  form: string;
  mutations: number;
  skills: string[];
  interactionCount: number;
  memoryCount: number;
  memoryUsage: string;
  snapshotCount: number;
  uptime: string;
  currentModel: string;
  rateLimited: boolean;
  rateLimitRemaining: string;
  recentErrors: number;
}

export class TerminalUI {
  private screen!: blessed.Widgets.Screen;
  private header!: blessed.Widgets.BoxElement;
  private status!: blessed.Widgets.BoxElement;
  private dashboard!: blessed.Widgets.BoxElement;
  private log!: blessed.Widgets.Log;
  private input!: blessed.Widgets.TextboxElement;
  private onSubmit: SubmitHandler;
  private onExit: ExitHandler;
  private theme!: Theme;
  private currentThemeIndex: number = 0;
  private themeNames: string[];
  private isLoading: boolean = false;
  private loadingFrame: number = 0;
  private loadingChars: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private history: string[] = [];
  private historyIndex: number = -1;
  private startTime: number = Date.now();
  private dashboardData: DashboardData = {
    theme: 'Default', version: '1.0.0', form: 'terminal-cli', mutations: 0,
    skills: [], interactionCount: 0, memoryCount: 0, memoryUsage: '0 B',
    snapshotCount: 0, uptime: '0s', currentModel: 'deepseek/deepseek-v4-flash:free',
    rateLimited: false, rateLimitRemaining: '', recentErrors: 0
  };
  private loadingInterval: ReturnType<typeof setInterval> | null = null;
  private conversationLog: Array<{ role: string; text: string; timestamp: number }> = [];
  private streamingBuffer = '';
  private isStreaming = false;

  constructor(onSubmit: SubmitHandler, onExit: ExitHandler) {
    this.onSubmit = onSubmit;
    this.onExit = onExit;
    this.theme = themes.default;
    this.themeNames = Object.keys(themes);
    this.initScreen();
    this.createLayout();
    this.bindKeys();
    this.focusInput();
    this.startLoadingAnimation();
    this.startUptimeTimer();
    this.screen.render();
  }

  private initScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'ABSOLUTE — Living Intelligence',
      dockBorders: true,
      fullUnicode: true,
      cursor: { shape: 'line', blink: true, color: this.theme.primary, artificial: false } as any,
      style: { bg: this.theme.background, fg: this.theme.text }
    });
    this.screen.key(['escape', 'C-c'], () => this.onExit());
    this.screen.key(['C-d'], () => process.exit(0));
  }

  private createLayout(): void {
    const t = this.theme;

    // Header — slim, elegant
    this.header = blessed.box({
      parent: this.screen, top: 0, left: 0, width: '100%', height: 3,
      tags: true, align: 'center', valign: 'middle', border: 'line',
      style: { border: { fg: t.primary }, bg: t.background, fg: t.primary },
      content: this.getHeaderContent()
    });

    // Dashboard (right panel)
    this.dashboard = blessed.box({
      parent: this.screen, top: 3, right: 0, width: '32%', height: '100%-8',
      tags: true, border: 'line',
      label: ` {${t.secondary}-fg} ⚡ Dashboard {/${t.secondary}-fg} `,
      style: { border: { fg: t.secondary }, bg: t.background, fg: t.text },
      scrollable: true, alwaysScroll: true
    });

    // Status (bottom right)
    this.status = blessed.box({
      parent: this.screen, bottom: 5, right: 0, width: '32%', height: 5,
      tags: true, border: 'line',
      label: ` {${t.accent}-fg} 📊 Status {/${t.accent}-fg} `,
      style: { border: { fg: t.accent }, bg: t.background, fg: t.text },
      content: '{cyan-fg}Initializing...{/cyan-fg}'
    });

    // Log (left panel — conversation)
    this.log = blessed.log({
      parent: this.screen, top: 3, left: 0, width: '68%', height: '100%-8',
      tags: true, border: 'line',
      label: ` {${t.info}-fg} 💬 Conversation {/${t.info}-fg} `,
      scrollable: true, alwaysScroll: true,
      scrollbar: { ch: '█', style: { bg: t.primary } },
      style: { border: { fg: t.info }, bg: t.background, fg: t.text }
    });

    // Input
    this.input = blessed.textbox({
      parent: this.screen, bottom: 0, left: 0, width: '100%', height: 5,
      inputOnFocus: true, keys: true, mouse: true, border: 'line',
      label: ` {${t.success}-fg} ✏ Input {/${t.success}-fg} `,
      style: { border: { fg: t.success }, bg: t.background, fg: t.text },
      censor: false
    });

    // Info bar (shortcuts)
    blessed.box({
      parent: this.screen, bottom: 5, left: 0, width: '68%', height: 5,
      tags: true, border: 'line',
      label: ` {${t.muted}-fg} ⌨ Shortcuts {/${t.muted}-fg} `,
      style: { border: { fg: t.muted }, bg: t.background, fg: t.muted },
      content: this.getShortcutsContent()
    });

    this.updateDashboard();
  }

  private getHeaderContent(): string {
    const t = this.theme;
    return `{bold}{${t.primary}-fg}⚡ ABSOLUTE{/${t.primary}-fg}{/bold} {${t.muted}-fg}— Living Intelligence{/${t.muted}-fg}`;
  }

  private getShortcutsContent(): string {
    const t = this.theme;
    return [
      `{${t.muted}-fg}Ctrl+T Theme │ Ctrl+H History │ Ctrl+L Clear │ Tab Focus │ Ctrl+S Bottom{/${t.muted}-fg}`,
      `{${t.muted}-fg}/help All commands │ /status System │ /theme Themes │ /exit Quit{/${t.muted}-fg}`
    ].join('\n');
  }

  private startLoadingAnimation(): void {
    if (this.loadingInterval) clearInterval(this.loadingInterval);
    this.loadingInterval = setInterval(() => {
      if (this.isLoading) {
        this.loadingFrame = (this.loadingFrame + 1) % this.loadingChars.length;
        this.updateDashboard();
      }
    }, 80);
  }

  private startUptimeTimer(): void {
    setInterval(() => {
      this.dashboardData.uptime = this.formatUptime(Date.now() - this.startTime);
      this.updateDashboard();
    }, 1000);
  }

  private formatUptime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return h + 'h ' + (m % 60) + 'm';
    if (m > 0) return m + 'm ' + (s % 60) + 's';
    return s + 's';
  }

  private updateDashboard(): void {
    const t = this.theme;
    const d = this.dashboardData;

    const loadingLine = this.isLoading
      ? `{${t.warning}-fg}${this.loadingChars[this.loadingFrame]} Processing...{/${t.warning}-fg}`
      : `{${t.success}-fg}● Ready{/${t.success}-fg}`;

    const rateLine = d.rateLimited
      ? `\n{${t.error}-fg}⚠ Rate limited: ${d.rateLimitRemaining}{/${t.error}-fg}`
      : '';

    const sections = [
      `{${t.secondary}-fg}━━━ System ━━━{/${t.secondary}-fg}`,
      '  {bold}Version:{/bold} {${t.primary}-fg}' + d.version + '{/${t.primary}-fg}',
      '  {bold}Form:{/bold} {${t.info}-fg}' + d.form + '{/${t.info}-fg}',
      '  {bold}Model:{/bold} {${t.accent}-fg}' + d.currentModel.split('/').pop() + '{/${t.accent}-fg}',
      '  {bold}Uptime:{/bold} {${t.success}-fg}' + d.uptime + '{/${t.success}-fg}',
      '  ' + loadingLine + rateLine,
      '',
      `{${t.secondary}-fg}━━━ Metrics ━━━{/${t.secondary}-fg}`,
      '  {bold}Mutations:{/bold} {${t.warning}-fg}' + d.mutations + '{/${t.warning}-fg}',
      '  {bold}Interactions:{/bold} {${t.info}-fg}' + d.interactionCount + '{/${t.info}-fg}',
      '  {bold}Snapshots:{/bold} {${t.accent}-fg}' + d.snapshotCount + '{/${t.accent}-fg}',
      '',
      `{${t.secondary}-fg}━━━ Memory ━━━{/${t.secondary}-fg}`,
      '  {bold}Entries:{/bold} {${t.success}-fg}' + d.memoryCount + '{/${t.success}-fg}',
      '  {bold}Size:{/bold} {${t.info}-fg}' + d.memoryUsage + '{/${t.info}-fg}',
      '',
      `{${t.secondary}-fg}━━━ Skills ━━━{/${t.secondary}-fg}`,
    ];

    if (d.skills.length > 0) {
      for (const skill of d.skills.slice(0, 4)) {
        sections.push('  {${t.success}-fg}✓{/${t.success}-fg} {bold}' + skill + '{/bold}');
      }
      if (d.skills.length > 4) sections.push('  {${t.muted}-fg}+' + (d.skills.length - 4) + ' more{/${t.muted}-fg}');
    } else {
      sections.push('  {${t.muted}-fg}No active skills{/${t.muted}-fg}');
    }

    sections.push(
      '',
      `{${t.muted}-fg}Theme: ${d.theme}{/${t.muted}-fg}`
    );

    this.dashboard.setContent(sections.join('\n'));
    this.screen.render();
  }

  private bindKeys(): void {
    this.screen.key(['C-t'], () => this.cycleTheme());
    this.screen.key(['C-h'], () => this.showHistory());
    this.screen.key(['C-l'], () => this.clearConversation());
    this.screen.key(['tab', 'i'], (_ch: string, key: { name: string }) => {
      if (key.name === 'tab') this.focusInput();
    });
    this.screen.key(['C-s'], () => { this.log.setScrollPerc(100); this.screen.render(); });

    this.input.key('enter', async () => {
      this.input.readInput(async (_err, value) => {
        const text = (value || '').trim();
        this.input.clearValue();
        this.focusInput();
        if (!text) return;
        if (text.startsWith('/')) {
          const completed = this.autocompleteCommand(text);
          if (completed !== text) { this.input.setValue(completed); this.screen.render(); return; }
        }
        this.appendUser(text);
        this.history.push(text);
        this.historyIndex = -1;
        this.setLoading(true);
        await this.onSubmit(text);
        this.setLoading(false);
      });
    });

    this.input.key('up', () => {
      if (this.history.length === 0) return;
      this.historyIndex = this.historyIndex === -1 ? this.history.length - 1 : Math.max(0, this.historyIndex - 1);
      this.input.setValue(this.history[this.historyIndex]);
      this.screen.render();
    });

    this.input.key('down', () => {
      if (this.historyIndex >= 0) {
        this.historyIndex = this.historyIndex < this.history.length - 1 ? this.historyIndex + 1 : -1;
        this.input.setValue(this.historyIndex === -1 ? '' : this.history[this.historyIndex]);
      }
      this.screen.render();
    });

    this.input.key('C-backspace', () => { this.input.setValue(''); this.screen.render(); });
  }

  private autocompleteCommand(input: string): string {
    const matches = SLASH_COMMANDS.filter(cmd => cmd.startsWith(input.toLowerCase()));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) { this.appendInfo('Commands: ' + matches.join(', ')); return input; }
    return input;
  }

  cycleTheme(): void {
    this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themeNames.length;
    this.theme = themes[this.themeNames[this.currentThemeIndex]];
    this.applyTheme();
    this.appendSuccess('Theme: {bold}' + this.theme.name + '{/bold}');
  }

  setTheme(themeName: string): void {
    if (themes[themeName]) {
      this.currentThemeIndex = this.themeNames.indexOf(themeName);
      this.theme = themes[themeName];
      this.applyTheme();
    }
  }

  private applyTheme(): void {
    const t = this.theme;
    this.header.style.border.fg = t.primary;
    this.header.style.fg = t.primary;
    this.header.setContent(this.getHeaderContent());
    this.dashboard.style.border.fg = t.secondary;
    this.dashboard.style.fg = t.text;
    this.dashboard.setLabel(` {${t.secondary}-fg} ⚡ Dashboard {/${t.secondary}-fg} `);
    this.status.style.border.fg = t.accent;
    this.status.style.fg = t.text;
    this.status.setLabel(` {${t.accent}-fg} 📊 Status {/${t.accent}-fg} `);
    this.log.style.border.fg = t.info;
    this.log.style.fg = t.text;
    this.log.style.bg = t.background;
    this.log.setLabel(` {${t.info}-fg} 💬 Conversation {/${t.info}-fg} `);
    this.input.style.border.fg = t.success;
    this.input.style.fg = t.text;
    this.input.style.bg = t.background;
    this.input.setLabel(` {${t.success}-fg} ✏ Input {/${t.success}-fg} `);
    this.dashboardData.theme = t.name;
    this.screen.render();
    this.updateDashboard();
  }

  private showHistory(): void {
    if (this.history.length === 0) { this.appendInfo('No history yet.'); return; }
    const last5 = this.history.slice(-5);
    this.appendSystem('{bold}History{/' + '} (' + this.history.length + ' commands)');
    for (let i = 0; i < last5.length; i++) {
      this.appendInfo('  ' + (this.history.length - last5.length + i + 1) + '. ' + last5[i]);
    }
  }

  clearConversation(): void {
    this.log.setLabel(` {${this.theme.info}-fg} 💬 Conversation {/${this.theme.info}-fg} `);
    this.log.setContent('');
    this.conversationLog = [];
    this.appendSuccess('Conversation cleared');
  }

  setLoading(loading: boolean): void { this.isLoading = loading; this.updateDashboard(); this.screen.render(); }

  setStatus(lines: string[]): void {
    const formattedLines = lines.map(line => {
      line = line.replace(/\{yellow-fg\}/g, '{' + this.theme.warning + '-fg}');
      line = line.replace(/\{\/yellow-fg\}/g, '{/' + this.theme.warning + '-fg}');
      line = line.replace(/\{green-fg\}/g, '{' + this.theme.success + '-fg}');
      line = line.replace(/\{\/green-fg\}/g, '{/' + this.theme.success + '-fg}');
      return line;
    });
    this.status.setContent(formattedLines.join('\n'));
    this.screen.render();
  }

  updateDashboardData(data: Partial<DashboardData>): void {
    Object.assign(this.dashboardData, data);
    this.updateDashboard();
  }

  appendSystem(text: string): void {
    const ts = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.log.add('{' + this.theme.muted + '-fg}[' + ts + ']{/' + this.theme.muted + '-fg} {' + this.theme.system + '-fg}⚙ ' + text + '{/' + this.theme.system + '-fg}');
    this.screen.render();
  }

  appendUser(text: string): void {
    const ts = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.conversationLog.push({ role: 'user', text, timestamp: Date.now() });
    this.log.add('{' + this.theme.muted + '-fg}[' + ts + ']{/' + this.theme.muted + '-fg} {' + this.theme.user + '-fg}YOU ➜{/' + this.theme.user + '-fg} ' + text);
    this.screen.render();
  }

  appendAssistant(text: string): void {
    const formatted = this.formatMessage(text);
    const ts = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.conversationLog.push({ role: 'assistant', text, timestamp: Date.now() });
    this.log.add('{' + this.theme.muted + '-fg}[' + ts + ']{/' + this.theme.muted + '-fg} {' + this.theme.assistant + '-fg}ABS ➜{/' + this.theme.assistant + '-fg} ' + formatted);
    this.screen.render();
  }

  startStreaming(): void { this.isStreaming = true; this.streamingBuffer = ''; const ts = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); this.log.add('{' + this.theme.muted + '-fg}[' + ts + ']{/' + this.theme.muted + '-fg} {' + this.theme.assistant + '-fg}ABS ➜{/' + this.theme.assistant + '-fg} '); this.screen.render(); }

  appendStreamToken(token: string): void { this.streamingBuffer += token; this.screen.render(); }

  finishStreaming(): string {
    const text = this.streamingBuffer;
    const formatted = this.formatMessage(text);
    this.conversationLog.push({ role: 'assistant', text, timestamp: Date.now() });
    this.log.add(formatted);
    this.isStreaming = false;
    this.streamingBuffer = '';
    this.screen.render();
    return text;
  }

  appendError(text: string): void {
    const ts = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.log.add('{' + this.theme.muted + '-fg}[' + ts + ']{/' + this.theme.muted + '-fg} {' + this.theme.error + '-fg}✗ ERROR:{/' + this.theme.error + '-fg} ' + text);
    this.screen.render();
  }

  appendWarning(text: string): void {
    const ts = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.log.add('{' + this.theme.muted + '-fg}[' + ts + ']{/' + this.theme.muted + '-fg} {' + this.theme.warning + '-fg}⚡ WARN:{/' + this.theme.warning + '-fg} ' + text);
    this.screen.render();
  }

  appendInfo(text: string): void {
    const ts = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.log.add('{' + this.theme.muted + '-fg}[' + ts + ']{/' + this.theme.muted + '-fg} {' + this.theme.info + '-fg}ℹ ' + text + '{/' + this.theme.info + '-fg}');
    this.screen.render();
  }

  appendSuccess(text: string): void {
    const ts = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.log.add('{' + this.theme.muted + '-fg}[' + ts + ']{/' + this.theme.muted + '-fg} {' + this.theme.success + '-fg}✓ ' + text + '{/' + this.theme.success + '-fg}');
    this.screen.render();
  }

  appendDivider(): void {
    this.log.add('{' + this.theme.muted + '-fg}────────────────────────────────────────────────{/' + this.theme.muted + '-fg}');
    this.screen.render();
  }

  appendBanner(text: string): void {
    const lines = text.split('\n');
    const maxLen = Math.max(...lines.map(l => l.replace(/\{[^}]+\}/g, '').length));
    const border = '═'.repeat(maxLen + 4);
    this.log.add('{' + this.theme.primary + '-fg}╔' + border + '╗{/' + this.theme.primary + '-fg}');
    for (const line of lines) {
      const pad = maxLen - line.replace(/\{[^}]+\}/g, '').length;
      this.log.add('{' + this.theme.primary + '-fg}║{/' + this.theme.primary + '-fg} ' + line + ' '.repeat(pad) + ' {' + this.theme.primary + '-fg}║{/' + this.theme.primary + '-fg}');
    }
    this.log.add('{' + this.theme.primary + '-fg}╚' + border + '╝{/' + this.theme.primary + '-fg}');
    this.screen.render();
  }

  showSnapshotList(snapshots: Array<{ snapshotId: string; reason: string; timestamp: number }>): void {
    if (!snapshots.length) { this.appendInfo('No snapshots.'); return; }
    this.appendDivider();
    this.appendSystem('{bold}Snapshots{/bold}');
    for (const s of snapshots.slice(-10)) {
      const date = new Date(s.timestamp).toLocaleString('fr-FR');
      this.appendInfo('  {' + this.theme.primary + '-fg}' + s.snapshotId + '{/' + this.theme.primary + '-fg}');
      this.appendInfo('    ' + s.reason + ' — ' + date);
    }
    this.appendDivider();
  }

  showSkillList(skills: Array<{ name: string; status?: string; domains: string[] }>): void {
    if (!skills.length) { this.appendInfo('No skills.'); return; }
    this.appendDivider();
    this.appendSystem('{bold}Skills{/bold}');
    for (const s of skills) {
      const st = s.status || 'dormant';
      const color = st === 'synthesized' ? this.theme.success : st === 'always_active' ? this.theme.warning : this.theme.muted;
      this.appendInfo('  {' + color + '-fg}● ' + s.name + '{/' + color + '-fg} [' + st + ']');
    }
    this.appendDivider();
  }

  showMemoryStats(stats: { shortTerm: number; longTerm: number; totalSize: string; patterns: number }): void {
    this.appendDivider();
    this.appendSystem('{bold}Memory{/bold}');
    this.appendInfo('  Short-term: {' + this.theme.info + '-fg}' + stats.shortTerm + ' entries{/' + this.theme.info + '-fg}');
    this.appendInfo('  Long-term: {' + this.theme.success + '-fg}' + stats.longTerm + ' keys{/' + this.theme.success + '-fg}');
    this.appendInfo('  Patterns: {' + this.theme.warning + '-fg}' + stats.patterns + '{/' + this.theme.warning + '-fg}');
    this.appendInfo('  Size: {' + this.theme.accent + '-fg}' + stats.totalSize + '{/' + this.theme.accent + '-fg}');
    this.appendDivider();
  }

  showErrorLog(errors: Array<{ timestamp: number; module: string; message: string }>): void {
    this.appendDivider();
    this.appendSystem('{bold}Error Log{/bold}');
    if (!errors.length) { this.appendSuccess('No errors ✓'); }
    else { for (const e of errors.slice(-10)) { this.appendError('[' + new Date(e.timestamp).toLocaleTimeString('fr-FR') + '] [' + e.module + '] ' + e.message); } }
    this.appendDivider();
  }

  showConfig(config: Record<string, unknown>): void {
    this.appendDivider();
    this.appendSystem('{bold}Configuration{/bold}');
    for (const [k, v] of Object.entries(config)) { this.appendInfo('  {' + this.theme.muted + '-fg}' + k + ':{/' + this.theme.muted + '-fg} {' + this.theme.primary + '-fg}' + v + '{/' + this.theme.primary + '-fg}'); }
    this.appendDivider();
  }

  showDiffPreview(diffs: Array<{ file: string; existedBefore: boolean; existedAfter: boolean; sizeBefore: number; sizeAfter: number }>): void {
    this.appendDivider();
    this.appendSystem('{bold}Rollback Preview{/bold}');
    for (const d of diffs) {
      const status = !d.existedAfter ? '{green-fg}NEW{' : d.sizeBefore !== d.sizeAfter ? '{yellow-fg}MODIFIED{' : '{muted-fg}UNCHANGED{';
      this.appendInfo('  {' + this.theme.primary + '-fg}' + d.file + '{/' + this.theme.primary + '-fg} ' + status + '}');
    }
    this.appendDivider();
  }

  showPluginList(plugins: Array<{ name: string; enabled: boolean }>): void {
    this.appendDivider();
    this.appendSystem('{bold}Plugins{/bold}');
    if (!plugins.length) { this.appendInfo('  No plugins installed'); }
    else { for (const p of plugins) { const c = p.enabled ? this.theme.success : this.theme.muted; this.appendInfo('  {' + c + '-fg}' + (p.enabled ? '✓' : '○') + ' ' + p.name + '{/' + c + '-fg}'); } }
    this.appendDivider();
  }

  private formatMessage(text: string): string {
    const t = this.theme;
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
      return '\n{' + t.muted + '-fg}┌─ ' + (lang || 'code') + ' ─────────────────────┐{/' + t.muted + '-fg}\n{' + t.info + '-fg}  ' + code.trim().replace(/\n/g, '\n  ') + '{/' + t.info + '-fg}\n{' + t.muted + '-fg}└──────────────────────────────────┘{/' + t.muted + '-fg}';
    });
    text = text.replace(/`([^`]+)`/g, '{' + t.accent + '-fg}`' + '$1' + '`{/' + t.accent + '-fg}');
    text = text.replace(/\*\*([^*]+)\*\*/g, '{bold}{' + t.primary + '-fg}$1{/' + t.primary + '-fg}{/bold}');
    text = text.replace(/\*([^*]+)\*/g, '{italic}$1{/italic}');
    text = text.replace(/^### (.+)$/gm, '{bold}{' + t.secondary + '-fg}▎ $1{/' + t.secondary + '-fg}{/bold}');
    text = text.replace(/^## (.+)$/gm, '{bold}{' + t.primary + '-fg}■ $1{/' + t.primary + '-fg}{/bold}');
    text = text.replace(/^# (.+)$/gm, '{bold}{' + t.accent + '-fg}◆ $1{/' + t.accent + '-fg}{/bold}');
    text = text.replace(/^- (.+)$/gm, '  {' + t.success + '-fg}•{/' + t.success + '-fg} $1');
    text = text.replace(/^(\d+)\. (.+)$/gm, '  {' + t.warning + '-fg}$1.{/' + t.warning + '-fg} $2');
    text = text.replace(/(https?:\/\/[^\s]+)/g, '{' + t.info + '-fg}$1{/' + t.info + '-fg}');
    return text;
  }

  private focusInput(): void { this.input.focus(); this.screen.render(); }
  getCurrentTheme(): Theme { return this.theme; }
  getAvailableThemes(): string[] { return this.themeNames; }
  getConversationLog(): Array<{ role: string; text: string; timestamp: number }> { return [...this.conversationLog]; }

  exportConversationMarkdown(): string {
    const lines = ['# ABSOLUTE Conversation Export', 'Date: ' + new Date().toISOString(), ''];
    for (const e of this.conversationLog) {
      const date = new Date(e.timestamp).toLocaleString('fr-FR');
      const role = e.role === 'user' ? '**You**' : '**ABSOLUTE**';
      lines.push('### ' + date);
      lines.push(role + ': ' + e.text);
      lines.push('');
    }
    return lines.join('\n');
  }
}
