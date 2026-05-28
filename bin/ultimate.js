#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
ULTIMATE — Living Intelligence Entity

Usage:
  ultimate              Start the TUI
  ultimate --plain      Start in plain console mode
  ultimate --api        Start with REST API
  ultimate --dashboard  Start with web dashboard
  ultimate --test       Run tests
  ultimate --typecheck  Type check
  ultimate --version    Show version

Environment:
  OPENROUTER_API_KEY    Required: your API key
  ULTIMATE_MODEL        Model to use (default: deepseek/deepseek-v4-flash:free)
`);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log('ultimate v2.0.0');
  process.exit(0);
}

const env = Object.assign({}, process.env);

if (args.includes('--plain')) env.ULTIMATE_PLAIN = '1';
if (args.includes('--api')) env.ULTIMATE_API = '1';
if (args.includes('--dashboard')) env.ULTIMATE_DASHBOARD = '1';

const child = spawn('npx', ['tsx', path.join(root, 'index.ts')], {
  cwd: root,
  env,
  stdio: 'inherit'
});

child.on('exit', (code) => process.exit(code || 0));
