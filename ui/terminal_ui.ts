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
  muted: string;
}

const themes: Record<string, Theme> = {
  default: { name: 'Default', primary: 'magenta', secondary: 'cyan', success: 'green', error: 'red', warning: 'yellow', info: 'blue', user: 'green', assistant: 'magenta', system: 'gray', muted: '#6272a4' },
  matrix: { name: 'Matrix', primary: 'green', secondary: 'green', success: 'green', error: 'red', warning: 'yellow', info: 'green', user: 'green', assistant: 'green', system: 'darkgreen', muted: '#003300' },
  nord: { name: 'Nord', primary: '#88c0d0', secondary: '#81a1c1', success: '#a3be8c', error: '#bf616a', warning: '#ebcb8b', info: '#5e81ac', user: '#a3be8c', assistant: '#88c0d0', system: '#d8dee9', muted: '#4c566a' },
  dracula: { name: 'Dracula', primary: '#ff79c6', secondary: '#bd93f9', success: '#50fa7b', error: '#ff5555', warning: '#f1fa8c', info: '#8be9fd', user: '#50fa7b', assistant: '#ff79c6', system: '#6272a4', muted: '#6272a4' },
  cyberpunk: { name: 'Cyberpunk', primary: '#f97583', secondary: '#79c0ff', success: '#56d364', error: '#f85149', warning: '#e3b341', info: '#58a6ff', user: '#56d364', assistant: '#f97583', system: '#8b949e', muted: '#484f58' },
  tokyo: { name: 'Tokyo Night', primary: '#bb9af7', secondary: '#7dcfff', success: '#9ece6a', error: '#f7768e', warning: '#e0af68', info: '#7aa2f7', user: '#9ece6a', assistant: '#bb9af7', system: '#565f89', muted: '#565f89' },
  aurora: { name: 'Aurora', primary: '#c084fc', secondary: '#22d3ee', success: '#4ade80', error: '#f87171', warning: '#fbbf24', info: '#60a5fa', user: '#4ade80', assistant: '#c084fc', system: '#94a3b8', muted: '#64748b' },
  ember: { name: 'Ember', primary: '#f97316', secondary: '#ef4444', success: '#22c55e', error: '#dc2626', warning: '#eab308', info: '#f97316', user: '#22c55e', assistant: '#f97316', system: '#a8a29e', muted: '#78716c' }
};

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
  private screen: blessed.Widgets.Screen;
  private headerBox: blessed.Widgets.BoxElement;
  private statusBox: blessed.Widgets.BoxElement;
  private dashBox: blessed.Widgets.BoxElement;
  private logBox: blessed.Widgets.Log;
  private inputBox: blessed.Widgets.TextboxElement;
  private infoBox: blessed.Widgets.BoxElement;
  private onSubmit: SubmitHandler;
  private onExit: ExitHandler;
  private theme: Theme;
  private themeIndex = 0;
  private themeNames: string[];
  private isLoading = false;
  private loadFrame = 0;
  private loadChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private history: string[] = [];
  private histIdx = -1;
  private startTime = Date.now();
  private dashData: DashboardData = {
    theme: 'Default', version: '1.0.0', form: 'terminal-cli', mutations: 0,
    skills: [], interactionCount: 0, memoryCount: 0, memoryUsage: '0 B',
    snapshotCount: 0, uptime: '0s', currentModel: 'deepseek/deepseek-v4-flash:free',
    rateLimited: false, rateLimitRemaining: '', recentErrors: 0
  };
  private loadTimer: ReturnType<typeof setInterval> | null = null;
  private log: Array<{ role: string; text: string; ts: number }> = [];

  constructor(onSubmit: SubmitHandler, onExit: ExitHandler) {
    this.onSubmit = onSubmit;
    this.onExit = onExit;
    this.theme = themes.default;
    this.themeNames = Object.keys(themes);

    this.screen = blessed.screen({ smartCSR: true, title: 'ABSOLUTE', dockBorders: true, fullUnicode: true });
    this.screen.key(['escape', 'C-c', 'q'], () => this.onExit());

    this.headerBox = blessed.box({
      parent: this.screen, top: 0, left: 0, width: '100%', height: 3,
      tags: true, border: 'line', align: 'center', valign: 'middle',
      style: { border: { fg: this.theme.primary }, fg: this.theme.primary }
    });

    this.dashBox = blessed.box({
      parent: this.screen, top: 3, right: 0, width: '30%', height: '100%-8',
      tags: true, border: 'line',
      label: ' Dashboard ',
      style: { border: { fg: this.theme.secondary }, fg: this.theme.secondary }
    });

    this.statusBox = blessed.box({
      parent: this.screen, bottom: 5, right: 0, width: '30%', height: 5,
      tags: true, border: 'line', label: ' Status ',
      style: { border: { fg: this.theme.info }, fg: this.theme.info }
    });

    this.logBox = blessed.log({
      parent: this.screen, top: 3, left: 0, width: '70%', height: '100%-8',
      tags: true, border: 'line', label: ' Conversation ',
      scrollable: true, alwaysScroll: true,
      scrollbar: { ch: ' ', style: { bg: this.theme.primary } },
      style: { border: { fg: this.theme.info }, fg: '#c9d1d9', bg: '#0d1117' }
    });

    this.inputBox = blessed.textbox({
      parent: this.screen, bottom: 0, left: 0, width: '100%', height: 3,
      inputOnFocus: true, keys: true, mouse: true, border: 'line',
      label: ' Input ',
      style: { border: { fg: this.theme.success }, fg: '#c9d1d9', bg: '#0d1117' }
    });

    this.infoBox = blessed.box({
      parent: this.screen, bottom: 3, left: 0, width: '70%', height: 2,
      tags: true,
      style: { fg: this.theme.muted }
    });

    this.setHeader();
    this.setInfo();
    this.setDash();
    this.bindKeys();
    this.inputBox.focus();
    this.startLoader();
    this.startTimer();
    this.screen.render();
  }

  private setHeader(): void {
    this.headerBox.setContent('{bold}{' + this.theme.primary + '-fg} ABSOLUTE — Living Intelligence {/' + this.theme.primary + '-fg}{/bold}');
  }

  private setInfo(): void {
    this.infoBox.setContent(' {' + this.theme.muted + '-fg}Ctrl+T Theme | Ctrl+H History | Ctrl+L Clear | Tab Focus | /help Commands{/' + this.theme.muted + '-fg}');
  }

  private startLoader(): void {
    this.loadTimer = setInterval(() => {
      if (this.isLoading) {
        this.loadFrame = (this.loadFrame + 1) % this.loadChars.length;
        this.setDash();
      }
    }, 100);
  }

  private startTimer(): void {
    setInterval(() => {
      const s = Math.floor((Date.now() - this.startTime) / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      this.dashData.uptime = h > 0 ? h + 'h ' + (m % 60) + 'm' : m > 0 ? m + 'm ' + (s % 60) + 's' : s + 's';
      this.setDash();
    }, 1000);
  }

  private setDash(): void {
    const t = this.theme;
    const d = this.dashData;
    const loading = this.isLoading
      ? '{' + t.warning + '-fg}' + this.loadChars[this.loadFrame] + ' Working...{/' + t.warning + '-fg}'
      : '{' + t.success + '-fg}Ready{/' + this.theme.success + '-fg}';

    let skills = '  {gray-fg}none{/' + 'gray-fg}';
    if (d.skills.length > 0) {
      skills = d.skills.slice(0, 3).map(s => '  {' + t.success + '-fg}+ ' + s + '{/' + t.success + '-fg}').join('\n');
      if (d.skills.length > 3) skills += '\n  {' + t.muted + '-fg}+' + (d.skills.length - 3) + ' more{/' + t.muted + '-fg}';
    }

    this.dashBox.setContent([
      '{' + t.muted + '-fg}--- System ---{/' + t.muted + '-fg}',
      '  {' + t.primary + '-fg}v' + d.version + '{/' + t.primary + '-fg}',
      '  Form: {' + t.info + '-fg}' + d.form + '{/' + t.info + '-fg}',
      '  Model: {' + t.secondary + '-fg}' + d.currentModel.split('/').pop() + '{/' + t.secondary + '-fg}',
      '  Uptime: {' + t.success + '-fg}' + d.uptime + '{/' + t.success + '-fg}',
      '  Status: ' + loading,
      '',
      '{' + t.muted + '-fg}--- Stats ---{/' + t.muted + '-fg}',
      '  Mutations: {' + t.warning + '-fg}' + d.mutations + '{/' + t.warning + '-fg}',
      '  Interactions: {' + t.info + '-fg}' + d.interactionCount + '{/' + t.info + '-fg}',
      '  Snapshots: {' + t.secondary + '-fg}' + d.snapshotCount + '{/' + t.secondary + '-fg}',
      '',
      '{' + t.muted + '-fg}--- Memory ---{/' + t.muted + '-fg}',
      '  Entries: {' + t.success + '-fg}' + d.memoryCount + '{/' + t.success + '-fg}',
      '  Size: {' + t.info + '-fg}' + d.memoryUsage + '{/' + t.info + '-fg}',
      '',
      '{' + t.muted + '-fg}--- Skills ---{/' + t.muted + '-fg}',
      skills,
      '',
      '{' + t.muted + '-fg}Theme: ' + d.theme + '{/' + t.muted + '-fg}'
    ].join('\n'));
  }

  private bindKeys(): void {
    this.screen.key(['C-t'], () => this.cycleTheme());
    this.screen.key(['C-h'], () => this.showHistory());
    this.screen.key(['C-l'], () => this.clear());
    this.screen.key(['tab'], () => this.inputBox.focus());
    this.screen.key(['C-s'], () => { this.logBox.setScrollPerc(100); this.screen.render(); });

    this.inputBox.key('enter', async () => {
      this.inputBox.readInput(async (_err, val) => {
        const text = (val || '').trim();
        this.inputBox.clearValue();
        this.inputBox.focus();
        if (!text) return;

        // Autocomplete
        if (text.startsWith('/')) {
          const cmds = ['/status', '/clear', '/theme', '/help', '/exit', '/memory', '/recall', '/snapshots', '/snapshot', '/skills', '/model', '/config', '/log', '/errors', '/tests', '/health', '/evolution', '/git', '/knowledge', '/templates', '/sessions', '/cache', '/agent', '/task', '/tasks', '/marketplace', '/deploy', '/webhooks', '/saas', '/failures', '/plugin'];
          const matches = cmds.filter(c => c.startsWith(text));
          if (matches.length === 1) { this.inputBox.setValue(matches[0]); this.screen.render(); return; }
          if (matches.length > 1) { this.msg('info', 'Commands: ' + matches.join(', ')); return; }
        }

        this.msg('user', text);
        this.history.push(text);
        this.histIdx = -1;
        this.isLoading = true;
        this.setDash();
        await this.onSubmit(text);
        this.isLoading = false;
        this.setDash();
      });
    });

    this.inputBox.key('up', () => {
      if (!this.history.length) return;
      this.histIdx = this.histIdx === -1 ? this.history.length - 1 : Math.max(0, this.histIdx - 1);
      this.inputBox.setValue(this.history[this.histIdx]);
      this.screen.render();
    });

    this.inputBox.key('down', () => {
      if (this.histIdx >= 0) {
        this.histIdx = this.histIdx < this.history.length - 1 ? this.histIdx + 1 : -1;
        this.inputBox.setValue(this.histIdx === -1 ? '' : this.history[this.histIdx]);
        this.screen.render();
      }
    });
  }

  cycleTheme(): void {
    this.themeIndex = (this.themeIndex + 1) % this.themeNames.length;
    this.theme = themes[this.themeNames[this.themeIndex]];
    this.applyTheme();
    this.msg('success', 'Theme: ' + this.theme.name);
  }

  setTheme(name: string): void {
    if (themes[name]) { this.themeIndex = this.themeNames.indexOf(name); this.theme = themes[name]; this.applyTheme(); }
  }

  private applyTheme(): void {
    const t = this.theme;
    this.headerBox.style.border.fg = t.primary;
    this.headerBox.style.fg = t.primary;
    this.setHeader();
    this.dashBox.style.border.fg = t.secondary;
    this.dashBox.setLabel(' {' + t.secondary + '-fg}Dashboard{/' + t.secondary + '-fg} ');
    this.statusBox.style.border.fg = t.info;
    this.statusBox.setLabel(' {' + t.info + '-fg}Status{/' + t.info + '-fg} ');
    this.logBox.style.border.fg = t.info;
    this.logBox.setLabel(' {' + t.info + '-fg}Conversation{/' + t.info + '-fg} ');
    this.inputBox.style.border.fg = t.success;
    this.inputBox.setLabel(' {' + t.success + '-fg}Input{/' + t.success + '-fg} ');
    this.setInfo();
    this.dashData.theme = t.name;
    this.screen.render();
    this.setDash();
  }

  private showHistory(): void {
    if (!this.history.length) { this.msg('info', 'No history.'); return; }
    const last = this.history.slice(-5);
    this.msg('system', '--- History (' + this.history.length + ' commands) ---');
    last.forEach((c, i) => this.msg('system', '  ' + (this.history.length - last.length + i + 1) + '. ' + c));
  }

  clear(): void {
    this.logBox.setContent('');
    this.log = [];
    this.msg('success', 'Conversation cleared');
  }

  setLoading(on: boolean): void { this.isLoading = on; this.setDash(); this.screen.render(); }

  setStatus(lines: string[]): void {
    this.statusBox.setContent(lines.join('\n'));
    this.screen.render();
  }

  updateDashboardData(data: Partial<DashboardData>): void {
    Object.assign(this.dashData, data);
    this.setDash();
  }

  private ts(): string {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  msg(type: 'user' | 'assistant' | 'system' | 'error' | 'warning' | 'info' | 'success', text: string): void {
    const t = this.theme;
    const time = this.ts();
    const colorMap: Record<string, string> = {
      user: t.user, assistant: t.assistant, system: t.system,
      error: t.error, warning: t.warning, info: t.info, success: t.success
    };
    const prefixMap: Record<string, string> = {
      user: 'YOU', assistant: 'ABS', system: 'SYS',
      error: 'ERR', warning: 'WARN', info: 'INFO', success: 'OK'
    };
    const c = colorMap[type] || t.system;
    const p = prefixMap[type] || 'SYS';
    this.logBox.add('{' + t.muted + '-fg}' + time + '{/' + t.muted + '-fg} {' + c + '-fg}' + p + '>{/' + c + '-fg} ' + text);
    this.screen.render();
  }

  // Public API
  appendSystem(t: string) { this.msg('system', t); }
  appendUser(t: string) { this.log.push({ role: 'user', text: t, ts: Date.now() }); this.msg('user', t); }
  appendAssistant(t: string) { this.log.push({ role: 'assistant', text: t, ts: Date.now() }); this.msg('assistant', this.fmt(t)); }
  appendError(t: string) { this.msg('error', t); }
  appendWarning(t: string) { this.msg('warning', t); }
  appendInfo(t: string) { this.msg('info', t); }
  appendSuccess(t: string) { this.msg('success', t); }
  appendDivider() { this.logBox.add('{' + this.theme.muted + '-fg}' + '─'.repeat(50) + '{/' + this.theme.muted + '-fg}'); this.screen.render(); }

  startStreaming() { this.msg('assistant', '...'); }
  appendStreamToken(_t: string) {}
  finishStreaming(): string { return ''; }

  showSnapshotList(s: Array<{ snapshotId: string; reason: string; timestamp: number }>) {
    this.appendDivider(); this.msg('system', '--- Snapshots ---');
    s.slice(-10).forEach(x => this.msg('info', '  ' + x.snapshotId + ' — ' + x.reason));
    this.appendDivider();
  }

  showSkillList(s: Array<{ name: string; status?: string }>) {
    this.appendDivider(); this.msg('system', '--- Skills ---');
    s.forEach(x => this.msg('info', '  ' + x.name + ' [' + (x.status || 'dormant') + ']'));
    this.appendDivider();
  }

  showMemoryStats(st: { shortTerm: number; longTerm: number; totalSize: string }) {
    this.appendDivider(); this.msg('system', '--- Memory ---');
    this.msg('info', '  Short-term: ' + st.shortTerm + ' | Long-term: ' + st.longTerm + ' | Size: ' + st.totalSize);
    this.appendDivider();
  }

  showErrorLog(e: Array<{ timestamp: number; module: string; message: string }>) {
    this.appendDivider(); this.msg('system', '--- Errors ---');
    e.slice(-10).forEach(x => this.msg('error', '  [' + x.module + '] ' + x.message));
    this.appendDivider();
  }

  showConfig(c: Record<string, unknown>) {
    this.appendDivider(); this.msg('system', '--- Config ---');
    Object.entries(c).forEach(([k, v]) => this.msg('info', '  ' + k + ': ' + v));
    this.appendDivider();
  }

  showDiffPreview(d: Array<{ file: string }>) {
    this.appendDivider(); this.msg('system', '--- Diff Preview ---');
    d.forEach(x => this.msg('info', '  ' + x.file));
    this.appendDivider();
  }

  showPluginList(p: Array<{ name: string; enabled: boolean }>) {
    this.appendDivider(); this.msg('system', '--- Plugins ---');
    p.forEach(x => this.msg('info', '  ' + (x.enabled ? '✓' : '○') + ' ' + x.name));
    this.appendDivider();
  }

  private fmt(text: string): string {
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m: string, _l: string, code: string) => '\n  ' + code.trim().replace(/\n/g, '\n  ') + '\n');
    text = text.replace(/`([^`]+)`/g, '$1');
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    return text;
  }

  getConversationLog() { return [...this.log]; }
  clearConversation() { this.clear(); }
  getCurrentTheme(): Theme { return this.theme; }

  exportConversationMarkdown(): string {
    let md = '# ABSOLUTE Conversation\n\n';
    this.log.forEach(e => { md += '**' + (e.role === 'user' ? 'You' : 'ABSOLUTE') + '**: ' + e.text + '\n\n'; });
    return md;
  }
}
