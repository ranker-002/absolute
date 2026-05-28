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
}

const themes: Record<string, Theme> = {
  default: {
    name: 'Default',
    primary: 'magenta',
    secondary: 'cyan',
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
    user: 'green',
    assistant: 'magenta',
    system: 'gray',
    border: 'white',
    background: 'black',
    text: 'white',
    accent: '#ff79c6',
    muted: '#6272a4'
  },
  matrix: {
    name: 'Matrix',
    primary: 'green',
    secondary: 'green',
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'green',
    user: 'green',
    assistant: 'green',
    system: 'darkgreen',
    border: 'green',
    background: 'black',
    text: 'green',
    accent: '#00ff41',
    muted: '#003300'
  },
  drake: {
    name: 'Drake',
    primary: 'purple',
    secondary: 'pink',
    success: 'cyan',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
    user: 'purple',
    assistant: 'pink',
    system: 'gray',
    border: 'purple',
    background: 'black',
    text: 'white',
    accent: '#ff79c6',
    muted: '#6272a4'
  },
  nord: {
    name: 'Nord',
    primary: '#88c0d0',
    secondary: '#81a1c1',
    success: '#a3be8c',
    error: '#bf616a',
    warning: '#ebcb8b',
    info: '#5e81ac',
    user: '#a3be8c',
    assistant: '#88c0d0',
    system: '#d8dee9',
    border: '#4c566a',
    background: '#2e3440',
    text: '#d8dee9',
    accent: '#b48ead',
    muted: '#4c566a'
  },
  solarized: {
    name: 'Solarized Dark',
    primary: '#268bd2',
    secondary: '#6c71c4',
    success: '#859900',
    error: '#dc322f',
    warning: '#b58900',
    info: '#268bd2',
    user: '#859900',
    assistant: '#268bd2',
    system: '#93a1a1',
    border: '#073642',
    background: '#002b36',
    text: '#93a1a1',
    accent: '#cb4b16',
    muted: '#586e75'
  },
  cyberpunk: {
    name: 'Cyberpunk',
    primary: '#f97583',
    secondary: '#79c0ff',
    success: '#56d364',
    error: '#f85149',
    warning: '#e3b341',
    info: '#58a6ff',
    user: '#56d364',
    assistant: '#f97583',
    system: '#8b949e',
    border: '#f97583',
    background: '#0d1117',
    text: '#c9d1d9',
    accent: '#bc8cff',
    muted: '#484f58'
  },
  dracula: {
    name: 'Dracula',
    primary: '#ff79c6',
    secondary: '#bd93f9',
    success: '#50fa7b',
    error: '#ff5555',
    warning: '#f1fa8c',
    info: '#8be9fd',
    user: '#50fa7b',
    assistant: '#ff79c6',
    system: '#6272a4',
    border: '#bd93f9',
    background: '#282a36',
    text: '#f8f8f2',
    accent: '#ffb86c',
    muted: '#6272a4'
  },
  monokai: {
    name: 'Monokai',
    primary: '#f92672',
    secondary: '#a6e22e',
    success: '#a6e22e',
    error: '#f92672',
    warning: '#e6db74',
    info: '#66d9ef',
    user: '#a6e22e',
    assistant: '#f92672',
    system: '#75715e',
    border: '#49483e',
    background: '#272822',
    text: '#f8f8f2',
    accent: '#ae81ff',
    muted: '#75715e'
  },
  gruvbox: {
    name: 'Gruvbox',
    primary: '#fabd2f',
    secondary: '#fe8019',
    success: '#b8bb26',
    error: '#fb4934',
    warning: '#fabd2f',
    info: '#83a598',
    user: '#b8bb26',
    assistant: '#fabd2f',
    system: '#928374',
    border: '#504945',
    background: '#282828',
    text: '#ebdbb2',
    accent: '#d3869b',
    muted: '#665c54'
  },
  tokyo: {
    name: 'Tokyo Night',
    primary: '#bb9af7',
    secondary: '#7dcfff',
    success: '#9ece6a',
    error: '#f7768e',
    warning: '#e0af68',
    info: '#7aa2f7',
    user: '#9ece6a',
    assistant: '#bb9af7',
    system: '#565f89',
    border: '#414868',
    background: '#1a1b26',
    text: '#c0caf5',
    accent: '#ff9e64',
    muted: '#565f89'
  }
};

const LOGO_LINES = [
  '╔══════════════════════════════════════════════════════════╗',
  '║  ████████╗██╗   ██╗██████╗  ██████╗ ███╗   ██╗        ║',
  '║  ╚══██╔══╝██║   ██║██╔══██╗██╔═══██╗████╗  ██║        ║',
  '║     ██║   ██║   ██║██████╔╝██║   ██║██╔██╗ ██║        ║',
  '║     ██║   ██║   ██║██╔══██╗██║   ██║██║╚██╗██║        ║',
  '║     ██║   ╚██████╔╝██████╔╝╚██████╔╝██║ ╚████║        ║',
  '║     ╚═╝    ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝        ║',
  '║         LIVING INTELLIGENCE ENTITY v2.0                 ║',
  '╚══════════════════════════════════════════════════════════╝'
];

const SLASH_COMMANDS = [
  '/status', '/clear', '/theme', '/help', '/exit', '/quit',
  '/memory', '/recall', '/snapshots', '/snapshot', '/skills',
  '/deactivate', '/model', '/config', '/export', '/import',
  '/log', '/errors', '/plugin', '/diff', '/rollback',
  '/tests', '/health', '/evolution', '/git', '/knowledge',
  '/templates', '/template', '/sessions', '/cache', '/autorecover',
  '/marketplace', '/install', '/patterns', '/users', '/user',
  '/voice', '/sandbox', '/run', '/integrations'
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
    theme: 'Default',
    version: '1.0.0',
    form: 'terminal-cli',
    mutations: 0,
    skills: [],
    interactionCount: 0,
    memoryCount: 0,
    memoryUsage: '0 B',
    snapshotCount: 0,
    uptime: '0s',
    currentModel: 'claude-sonnet-4-20250514',
    rateLimited: false,
    rateLimitRemaining: '',
    recentErrors: 0
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
      title: 'ABSOLUTE — Living Intelligence TUI',
      dockBorders: true,
      fullUnicode: true,
      cursor: {
        shape: 'line',
        blink: true,
        color: this.theme.primary,
        artificial: false
      } as any,
      style: {
        bg: this.theme.background,
        fg: this.theme.text
      }
    });

    this.screen.key(['escape', 'C-c'], () => this.onExit());
    this.screen.key(['C-d'], () => process.exit(0));
  }

  private createLayout(): void {
    this.header = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 5,
      tags: true,
      align: 'center',
      valign: 'middle',
      border: 'line',
      style: {
        border: { fg: this.theme.primary },
        bg: this.theme.background,
        fg: this.theme.primary
      },
      content: this.getHeaderContent()
    });

    this.dashboard = blessed.box({
      parent: this.screen,
      top: 5,
      right: 0,
      width: '35%',
      height: '100%-10',
      tags: true,
      border: 'line',
      label: ` {${this.theme.secondary}-fg} ⚡ Dashboard {/${this.theme.secondary}-fg} `,
      style: {
        border: { fg: this.theme.secondary },
        bg: this.theme.background,
        fg: this.theme.text
      },
      scrollable: true,
      alwaysScroll: true
    });

    this.status = blessed.box({
      parent: this.screen,
      bottom: 5,
      right: 0,
      width: '35%',
      height: 5,
      tags: true,
      border: 'line',
      label: ` {${this.theme.accent}-fg} 📊 Status {/${this.theme.accent}-fg} `,
      style: {
        border: { fg: this.theme.accent },
        bg: this.theme.background,
        fg: this.theme.text
      },
      content: '{cyan-fg}Initializing...{/cyan-fg}'
    });

    this.log = blessed.log({
      parent: this.screen,
      top: 5,
      left: 0,
      width: '65%',
      height: '100%-10',
      tags: true,
      border: 'line',
      label: ` {${this.theme.info}-fg} 💬 Conversation {/${this.theme.info}-fg} `,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '█',
        style: { bg: this.theme.primary }
      },
      style: {
        border: { fg: this.theme.info },
        bg: this.theme.background,
        fg: this.theme.text
      }
    });

    this.input = blessed.textbox({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 5,
      inputOnFocus: true,
      keys: true,
      mouse: true,
      border: 'line',
      label: ` {${this.theme.success}-fg} ✏ Input {/${this.theme.success}-fg} `,
      style: {
        border: { fg: this.theme.success },
        bg: this.theme.background,
        fg: this.theme.text
      },
      censor: false
    });

    blessed.box({
      parent: this.screen,
      bottom: 5,
      left: 0,
      width: '65%',
      height: 5,
      tags: true,
      border: 'line',
      label: ` {${this.theme.muted}-fg} ⌨ Shortcuts {/${this.theme.muted}-fg} `,
      style: {
        border: { fg: this.theme.muted },
        bg: this.theme.background,
        fg: this.theme.muted
      },
      content: this.getShortcutsContent()
    });

    this.updateDashboard();
  }

  private getHeaderContent(): string {
    const logoStr = LOGO_LINES.join('\n');
    return `{bold}{${this.theme.primary}-fg}${logoStr}{/${this.theme.primary}-fg}{/bold}`;
  }

  private getShortcutsContent(): string {
    const t = this.theme;
    return [
      `{${t.muted}-fg}Ctrl+T:Theme  Ctrl+H:History  Ctrl+L:Clear  Tab:Focus  Ctrl+S:Bottom{/${t.muted}-fg}`,
      `{${t.muted}-fg}/help  /status  /memory  /snapshots  /skills  /model  /export  /exit{/${t.muted}-fg}`
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
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }

  private updateDashboard(): void {
    const t = this.theme;
    const d = this.dashboardData;

    const loadingLine = this.isLoading
      ? `{${t.warning}-fg}${this.loadingChars[this.loadingFrame]} Processing...{/${t.warning}-fg}\n`
      : `{${t.success}-fg}● Ready{/${t.success}-fg}\n`;

    const rateLimitLine = d.rateLimited
      ? `\n{${t.error}-fg}⚠ Rate limited: ${d.rateLimitRemaining}{/${t.error}-fg}`
      : '';

    const errorLine = d.recentErrors > 0
      ? `\n{${t.error}-fg}✗ ${d.recentErrors} recent errors{/${t.error}-fg}`
      : '';

    const sections = [
      `{${t.secondary}-fg}━━━ System ━━━{/${t.secondary}-fg}`,
      `  {${t.muted}-fg}Version:{/${t.muted}-fg} {${t.primary}-fg}${d.version}{/${t.primary}-fg}`,
      `  {${t.muted}-fg}Form:{/${t.muted}-fg} {${t.info}-fg}${d.form}{/${t.info}-fg}`,
      `  {${t.muted}-fg}Model:{/${t.muted}-fg} {${t.accent}-fg}${d.currentModel.split('/').pop()}{/${t.accent}-fg}`,
      `  {${t.muted}-fg}Uptime:{/${t.muted}-fg} {${t.success}-fg}${d.uptime}{/${t.success}-fg}`,
      `  ${loadingLine}${rateLimitLine}${errorLine}`,
      '',
      `{${t.secondary}-fg}━━━ Stats ━━━{/${t.secondary}-fg}`,
      `  {${t.muted}-fg}Mutations:{/${t.muted}-fg} {${t.warning}-fg}${d.mutations}{/${t.warning}-fg}`,
      `  {${t.muted}-fg}Interactions:{/${t.muted}-fg} {${t.info}-fg}${d.interactionCount}{/${t.info}-fg}`,
      `  {${t.muted}-fg}Snapshots:{/${t.muted}-fg} {${t.accent}-fg}${d.snapshotCount}{/${t.accent}-fg}`,
      '',
      `{${t.secondary}-fg}━━━ Memory ━━━{/${t.secondary}-fg}`,
      `  {${t.muted}-fg}Entries:{/${t.muted}-fg} {${t.success}-fg}${d.memoryCount}{/${t.success}-fg}`,
      `  {${t.muted}-fg}Usage:{/${t.muted}-fg} {${t.info}-fg}${d.memoryUsage}{/${t.info}-fg}`,
      '',
      `{${t.secondary}-fg}━━━ Skills ━━━{/${t.secondary}-fg}`,
    ];

    if (d.skills.length > 0) {
      for (const skill of d.skills.slice(0, 5)) {
        sections.push(`  {${t.success}-fg}✓{/${t.success}-fg} {${t.primary}-fg}${skill}{/${t.primary}-fg}`);
      }
      if (d.skills.length > 5) {
        sections.push(`  {${t.muted}-fg}+${d.skills.length - 5} more...{/${t.muted}-fg}`);
      }
    } else {
      sections.push(`  {${t.muted}-fg}No active skills{/${t.muted}-fg}`);
    }

    sections.push(
      '',
      `{${t.secondary}-fg}━━━━━━━━━━━━━━{/${t.secondary}-fg}`,
      `{${t.muted}-fg}Theme: ${d.theme}{/${t.muted}-fg}`
    );

    this.dashboard.setContent(sections.join('\n'));
    this.screen.render();
  }

  private bindKeys(): void {
    this.screen.key(['C-t'], () => this.cycleTheme());
    this.screen.key(['C-h'], () => this.showHistory());
    this.screen.key(['C-l'], () => this.clearConversation());

    this.screen.key(['tab', 'i'], (ch: string, key: { name: string }) => {
      if (key.name === 'tab') this.focusInput();
    });

    this.screen.key(['C-s'], () => {
      this.log.setScrollPerc(100);
      this.screen.render();
    });

    this.input.key('enter', async () => {
      this.input.readInput(async (_err, value) => {
        const text = (value || '').trim();
        this.input.clearValue();
        this.focusInput();
        if (!text) return;

        if (text.startsWith('/')) {
          const completed = this.autocompleteCommand(text);
          if (completed !== text) {
            this.input.setValue(completed);
            this.screen.render();
            return;
          }
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
      if (this.historyIndex === -1) {
        this.historyIndex = this.history.length - 1;
      } else if (this.historyIndex > 0) {
        this.historyIndex--;
      }
      this.input.setValue(this.history[this.historyIndex]);
      this.screen.render();
    });

    this.input.key('down', () => {
      if (this.historyIndex >= 0) {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.input.setValue(this.history[this.historyIndex]);
        } else {
          this.historyIndex = -1;
          this.input.setValue('');
        }
      }
      this.screen.render();
    });

    this.input.key('C-backspace', () => {
      this.input.setValue('');
      this.screen.render();
    });
  }

  private autocompleteCommand(input: string): string {
    const matches = SLASH_COMMANDS.filter(cmd => cmd.startsWith(input.toLowerCase()));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      this.appendInfo(`Commands: ${matches.join(', ')}`);
      return input;
    }
    return input;
  }

  cycleTheme(): void {
    this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themeNames.length;
    this.theme = themes[this.themeNames[this.currentThemeIndex]];
    this.applyTheme();
    this.appendSystem(`Theme changed to: {bold}${this.theme.name}{/bold}`);
  }

  setTheme(themeName: string): void {
    if (themes[themeName]) {
      this.currentThemeIndex = this.themeNames.indexOf(themeName);
      this.theme = themes[themeName];
      this.applyTheme();
    }
  }

  private applyTheme(): void {
    this.header.style.border.fg = this.theme.primary;
    this.header.style.fg = this.theme.primary;
    this.header.setContent(this.getHeaderContent());

    this.dashboard.style.border.fg = this.theme.secondary;
    this.dashboard.style.fg = this.theme.text;
    this.dashboard.setLabel(` {${this.theme.secondary}-fg} ⚡ Dashboard {/${this.theme.secondary}-fg} `);

    this.status.style.border.fg = this.theme.accent;
    this.status.style.fg = this.theme.text;
    this.status.setLabel(` {${this.theme.accent}-fg} 📊 Status {/${this.theme.accent}-fg} `);

    this.log.style.border.fg = this.theme.info;
    this.log.style.fg = this.theme.text;
    this.log.style.bg = this.theme.background;
    this.log.setLabel(` {${this.theme.info}-fg} 💬 Conversation {/${this.theme.info}-fg} `);

    this.input.style.border.fg = this.theme.success;
    this.input.style.fg = this.theme.text;
    this.input.style.bg = this.theme.background;
    this.input.setLabel(` {${this.theme.success}-fg} ✏ Input {/${this.theme.success}-fg} `);

    this.dashboardData.theme = this.theme.name;
    this.screen.render();
    this.updateDashboard();
  }

  private showHistory(): void {
    if (this.history.length === 0) {
      this.appendInfo('No command history yet.');
      return;
    }
    const last5 = this.history.slice(-5);
    const items = last5.map((cmd, i) =>
      `  {${this.theme.muted}-fg}${this.history.length - last5.length + i + 1}.{/${this.theme.muted}-fg} ${cmd}`
    ).join('\n');
    this.appendSystem(`{bold}Command History{/${this.theme.muted}-fg}{/bold} (${this.history.length} total):\n${items}`);
  }

  clearConversation(): void {
    this.log.setLabel(` {${this.theme.info}-fg} 💬 Conversation {/${this.theme.info}-fg} `);
    this.log.setContent('');
    this.conversationLog = [];
    this.appendSystem('Conversation cleared.');
  }

  setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.updateDashboard();
    this.screen.render();
  }

  setStatus(lines: string[]): void {
    const formattedLines = lines.map(line => {
      line = line.replace(/\{yellow-fg\}/g, `{${this.theme.warning}-fg}`);
      line = line.replace(/\{\/yellow-fg\}/g, `{/${this.theme.warning}-fg}`);
      line = line.replace(/\{green-fg\}/g, `{${this.theme.success}-fg}`);
      line = line.replace(/\{\/green-fg\}/g, `{/${this.theme.success}-fg}`);
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
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.log.add(`{${this.theme.muted}-fg}[${timestamp}]{/${this.theme.muted}-fg} {${this.theme.system}-fg}⚙ ${text}{/${this.theme.system}-fg}`);
    this.screen.render();
  }

  appendUser(text: string): void {
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.conversationLog.push({ role: 'user', text, timestamp: Date.now() });
    this.log.add(`{${this.theme.muted}-fg}[${timestamp}]{/${this.theme.muted}-fg} {${this.theme.user}-fg}YOU ➜{/${this.theme.user}-fg} ${text}`);
    this.screen.render();
  }

  appendAssistant(text: string): void {
    const formattedText = this.formatMessage(text);
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.conversationLog.push({ role: 'assistant', text, timestamp: Date.now() });
    this.log.add(`{${this.theme.muted}-fg}[${timestamp}]{/${this.theme.muted}-fg} {${this.theme.assistant}-fg}ULT ➜{/${this.theme.assistant}-fg} ${formattedText}`);
    this.screen.render();
  }

  startStreaming(): void {
    this.isStreaming = true;
    this.streamingBuffer = '';
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.log.add(`{${this.theme.muted}-fg}[${timestamp}]{/${this.theme.muted}-fg} {${this.theme.assistant}-fg}ULT ➜{/${this.theme.assistant}-fg} `);
    this.screen.render();
  }

  appendStreamToken(token: string): void {
    this.streamingBuffer += token;
    const formatted = this.formatMessage(this.streamingBuffer);
    const lines = formatted.split('\n');
    const lastLine = lines[lines.length - 1] || '';
    this.log.add(`  ${lastLine}`);
    this.screen.render();
  }

  finishStreaming(): string {
    const fullText = this.streamingBuffer;
    this.conversationLog.push({ role: 'assistant', text: fullText, timestamp: Date.now() });
    this.isStreaming = false;
    this.streamingBuffer = '';
    this.screen.render();
    return fullText;
  }

  appendError(text: string): void {
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.log.add(`{${this.theme.muted}-fg}[${timestamp}]{/${this.theme.muted}-fg} {${this.theme.error}-fg}✗ ERROR:{/${this.theme.error}-fg} ${text}`);
    this.screen.render();
  }

  appendWarning(text: string): void {
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.log.add(`{${this.theme.muted}-fg}[${timestamp}]{/${this.theme.muted}-fg} {${this.theme.warning}-fg}⚡ WARN:{/${this.theme.warning}-fg} ${text}`);
    this.screen.render();
  }

  appendInfo(text: string): void {
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.log.add(`{${this.theme.muted}-fg}[${timestamp}]{/${this.theme.muted}-fg} {${this.theme.info}-fg}ℹ ${text}{/${this.theme.info}-fg}`);
    this.screen.render();
  }

  appendSuccess(text: string): void {
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.log.add(`{${this.theme.muted}-fg}[${timestamp}]{/${this.theme.muted}-fg} {${this.theme.success}-fg}✓ ${text}{/${this.theme.success}-fg}`);
    this.screen.render();
  }

  appendDivider(): void {
    this.log.add(`{${this.theme.muted}-fg}${'─'.repeat(58)}{/${this.theme.muted}-fg}`);
    this.screen.render();
  }

  appendBanner(text: string): void {
    const lines = text.split('\n');
    const maxLen = Math.max(...lines.map(l => l.replace(/\{[^}]+\}/g, '').length));
    const border = '═'.repeat(maxLen + 4);
    this.log.add(`{${this.theme.primary}-fg}╔${border}╗{/${this.theme.primary}-fg}`);
    for (const line of lines) {
      const pad = maxLen - line.replace(/\{[^}]+\}/g, '').length;
      this.log.add(`{${this.theme.primary}-fg}║{/${this.theme.primary}-fg} ${line}${' '.repeat(pad)} {${this.theme.primary}-fg}║{/${this.theme.primary}-fg}`);
    }
    this.log.add(`{${this.theme.primary}-fg}╚${border}╝{/${this.theme.primary}-fg}`);
    this.screen.render();
  }

  showSnapshotList(snapshots: Array<{ snapshotId: string; reason: string; timestamp: number }>): void {
    if (snapshots.length === 0) {
      this.appendInfo('No snapshots available.');
      return;
    }
    this.appendDivider();
    this.appendSystem(`{bold}Snapshot Registry{/${this.theme.muted}-fg}{/bold}`);
    for (const snap of snapshots.slice(-10)) {
      const date = new Date(snap.timestamp).toLocaleString('fr-FR');
      this.log.add(`  {${this.theme.muted}-fg}●{/${this.theme.muted}-fg} {${this.theme.primary}-fg}${snap.snapshotId}{/${this.theme.primary}-fg}`);
      this.log.add(`    {${this.theme.muted}-fg}Reason:{/${this.theme.muted}-fg} ${snap.reason}`);
      this.log.add(`    {${this.theme.muted}-fg}Date:{/${this.theme.muted}-fg} ${date}`);
    }
    this.appendDivider();
    this.screen.render();
  }

  showSkillList(skills: Array<{ name: string; status?: string; domains: string[] }>): void {
    if (skills.length === 0) {
      this.appendInfo('No skills loaded.');
      return;
    }
    this.appendDivider();
    this.appendSystem(`{bold}Skill Registry{/${this.theme.muted}-fg}{/bold}`);
    for (const skill of skills) {
      const status = skill.status || 'dormant';
      const statusColor = status === 'synthesized' ? this.theme.success
        : status === 'always_active' ? this.theme.warning
        : this.theme.muted;
      this.log.add(`  {${statusColor}-fg}● ${skill.name}{/${statusColor}-fg} {${this.theme.muted}-fg}[${status}]{/${this.theme.muted}-fg}`);
      if (skill.domains.length > 0) {
        this.log.add(`    {${this.theme.muted}-fg}Domains: ${skill.domains.join(', ')}{/${this.theme.muted}-fg}`);
      }
    }
    this.appendDivider();
    this.screen.render();
  }

  showMemoryStats(stats: { shortTerm: number; longTerm: number; totalSize: string; patterns: number }): void {
    this.appendDivider();
    this.appendSystem(`{bold}Memory Status{/${this.theme.muted}-fg}{/bold}`);
    this.log.add(`  {${this.theme.muted}-fg}Short-term:{/${this.theme.muted}-fg} {${this.theme.info}-fg}${stats.shortTerm} entries{/${this.theme.info}-fg}`);
    this.log.add(`  {${this.theme.muted}-fg}Long-term:{/${this.theme.muted}-fg} {${this.theme.success}-fg}${stats.longTerm} keys{/${this.theme.success}-fg}`);
    this.log.add(`  {${this.theme.muted}-fg}Patterns:{/${this.theme.muted}-fg} {${this.theme.warning}-fg}${stats.patterns}{/${this.theme.warning}-fg}`);
    this.log.add(`  {${this.theme.muted}-fg}Total size:{/${this.theme.muted}-fg} {${this.theme.accent}-fg}${stats.totalSize}{/${this.theme.accent}-fg}`);
    this.appendDivider();
    this.screen.render();
  }

  showErrorLog(errors: Array<{ timestamp: number; module: string; message: string }>): void {
    this.appendDivider();
    this.appendSystem(`{bold}Recent Errors{/${this.theme.error}-fg}{/bold}`);
    if (errors.length === 0) {
      this.log.add(`  {${this.theme.success}-fg}No recent errors ✓{/${this.theme.success}-fg}`);
    } else {
      for (const err of errors.slice(-10)) {
        const date = new Date(err.timestamp).toLocaleTimeString('fr-FR');
        this.log.add(`  {${this.theme.error}-fg}[${date}] [${err.module}]{/${this.theme.error}-fg}`);
        this.log.add(`    ${err.message}`);
      }
    }
    this.appendDivider();
    this.screen.render();
  }

  showConfig(config: Record<string, unknown>): void {
    this.appendDivider();
    this.appendSystem(`{bold}Configuration{/${this.theme.accent}-fg}{/bold}`);
    for (const [key, value] of Object.entries(config)) {
      this.log.add(`  {${this.theme.muted}-fg}${key}:{/${this.theme.muted}-fg} {${this.theme.primary}-fg}${value}{/${this.theme.primary}-fg}`);
    }
    this.appendDivider();
    this.screen.render();
  }

  showDiffPreview(diffs: Array<{ file: string; existedBefore: boolean; existedAfter: boolean; sizeBefore: number; sizeAfter: number }>): void {
    this.appendDivider();
    this.appendSystem(`{bold}Rollback Preview{/${this.theme.warning}-fg}{/bold}`);
    for (const diff of diffs) {
      const status = !diff.existedAfter ? '{green-fg}NEW{/' :
        diff.sizeBefore !== diff.sizeAfter ? '{yellow-fg}MODIFIED{/' : '{muted-fg}UNCHANGED{/';
      this.log.add(`  {${this.theme.primary}-fg}${diff.file}{/${this.theme.primary}-fg} ${status}`);
    }
    this.appendDivider();
    this.screen.render();
  }

  showPluginList(plugins: Array<{ name: string; enabled: boolean }>): void {
    this.appendDivider();
    this.appendSystem(`{bold}Plugins{/${this.theme.accent}-fg}{/bold}`);
    if (plugins.length === 0) {
      this.log.add(`  {${this.theme.muted}-fg}No plugins installed{/${this.theme.muted}-fg}`);
    } else {
      for (const p of plugins) {
        const color = p.enabled ? this.theme.success : this.theme.muted;
        const icon = p.enabled ? '✓' : '○';
        this.log.add(`  {${color}-fg}${icon} ${p.name}{/${color}-fg}`);
      }
    }
    this.appendDivider();
    this.screen.render();
  }

  private formatMessage(text: string): string {
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, lang, code) => {
      const formattedCode = code.trim().replace(/\n/g, '\n  ');
      return `\n{${this.theme.muted}-fg}┌─ ${lang || 'code'} ─────────────────────┐{/${this.theme.muted}-fg}\n{${this.theme.info}-fg}  ${formattedCode}{/${this.theme.info}-fg}\n{${this.theme.muted}-fg}└──────────────────────────────────┘{/${this.theme.muted}-fg}`;
    });

    text = text.replace(/`([^`]+)`/g, `{${this.theme.accent}-fg}\`${'$1'}\`{/${this.theme.accent}-fg}`);
    text = text.replace(/\*\*([^*]+)\*\*/g, `{bold}{${this.theme.primary}-fg}$1{/${this.theme.primary}-fg}{/bold}`);
    text = text.replace(/\*([^*]+)\*/g, `{italic}$1{/italic}`);
    text = text.replace(/^### (.+)$/gm, `{bold}{${this.theme.secondary}-fg}▎ $1{/${this.theme.secondary}-fg}{/bold}`);
    text = text.replace(/^## (.+)$/gm, `{bold}{${this.theme.primary}-fg}■ $1{/${this.theme.primary}-fg}{/bold}`);
    text = text.replace(/^# (.+)$/gm, `{bold}{${this.theme.accent}-fg}◆ $1{/${this.theme.accent}-fg}{/bold}`);
    text = text.replace(/^- (.+)$/gm, `  {${this.theme.success}-fg}•{/${this.theme.success}-fg} $1`);
    text = text.replace(/^(\d+)\. (.+)$/gm, `  {${this.theme.warning}-fg}$1.{/${this.theme.warning}-fg} $2`);
    text = text.replace(/(https?:\/\/[^\s]+)/g, `{${this.theme.info}-fg}$1{/${this.theme.info}-fg}`);

    return text;
  }

  private focusInput(): void {
    this.input.focus();
    this.screen.render();
  }

  getCurrentTheme(): Theme {
    return this.theme;
  }

  getAvailableThemes(): string[] {
    return this.themeNames;
  }

  getConversationLog(): Array<{ role: string; text: string; timestamp: number }> {
    return [...this.conversationLog];
  }

  exportConversationMarkdown(): string {
    const lines = ['# ABSOLUTE Conversation Export', `Date: ${new Date().toISOString()}`, ''];
    for (const entry of this.conversationLog) {
      const date = new Date(entry.timestamp).toLocaleString('fr-FR');
      const role = entry.role === 'user' ? '**You**' : '**ABSOLUTE**';
      lines.push(`### ${date}`);
      lines.push(`${role}: ${entry.text}`);
      lines.push('');
    }
    return lines.join('\n');
  }
}
