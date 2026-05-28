# ULTIMATE — Living Intelligence Entity

> A self-evolving AI entity that transforms its own source code, learns from every interaction, and autonomously improves over time.

## Quick Start

```bash
# Clone
git clone https://github.com/ranker-002/absolute.git
cd absolute

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your OpenRouter API key: https://openrouter.ai/keys

# Run
npm start
```

## Features

- **Self-Transformation** — Ask ULTIMATE to "become X" and it rewrites its own code
- **Streaming Responses** — Token-by-token display in the TUI
- **Auto-Evolution Cycle** — Transform → validate → test → self-correct → commit
- **Crash Recovery** — Heartbeat monitoring + auto-rollback on crash
- **10 Themes** — Default, Matrix, Drake, Nord, Solarized, Cyberpunk, Dracula, Monokai, Gruvbox, Tokyo Night
- **OpenRouter Provider** — Default model: `deepseek/deepseek-v4-flash:free`
- **Multi-Model Fallback** — Claude → GPT → Ollama auto-switch
- **Plugin System** — Extend with custom hooks
- **Knowledge Base** — Persistent searchable knowledge
- **Session Persistence** — Conversations survive restarts
- **Git Auto-Commit** — Every successful transformation is committed
- **30+ Slash Commands** — Full control from the TUI

## Architecture

```
ultimate/
├── index.ts                    # Main entry point
├── core/
│   ├── llm_engine.ts          # OpenRouter API client (streaming)
│   ├── transformer.ts         # Self-modification engine
│   ├── intent_engine.ts       # Intent detection (FR/EN)
│   ├── skill_activator.ts     # Skill management
│   ├── evolution_loop.ts      # Post-interaction analysis
│   ├── evolution_memory.ts    # Transformation success tracking
│   ├── snapshot.ts            # Snapshot/rollback system
│   ├── crash_recovery.ts      # Crash detection + auto-recovery
│   ├── test_runner.ts         # Post-transform validation
│   ├── git_integration.ts     # Auto-commit system
│   ├── knowledge.ts           # Knowledge base
│   ├── templates.ts           # Transformation templates
│   ├── session.ts             # Conversation persistence
│   ├── logger.ts              # Structured logging
│   ├── config.ts              # Persistent configuration
│   ├── rate_limiter.ts        # API rate limit tracking
│   ├── response_cache.ts      # Response caching
│   ├── multi_model.ts         # Multi-provider fallback
│   ├── plugin_manager.ts      # Plugin lifecycle
│   ├── sandbox.ts             # Safe code execution
│   ├── embeddings.ts          # Semantic memory search
│   ├── marketplace.ts         # Skill sharing
│   ├── integrations.ts        # External tool integrations
│   ├── voice.ts               # Speech-to-text
│   ├── multi_user.ts          # Multi-user support
│   ├── auto_skills.ts         # Auto skill generation
│   ├── system_tools.ts        # Shell/file utilities
│   ├── bootstrap.ts           # First-launch setup
│   ├── dna.ts                 # Identity management
│   └── types.ts               # TypeScript interfaces
├── ui/
│   └── terminal_ui.ts         # Blessed TUI (10 themes)
├── memory/
│   └── store.ts               # Universal memory
├── api/
│   └── server.ts              # REST API + WebSocket
├── web/
│   └── dashboard.ts           # Web dashboard
├── skills/
│   └── registry.json          # Skill definitions
├── tests/
│   └── *.test.ts              # Unit tests
├── Dockerfile                 # Container support
├── docker-compose.yml         # Multi-container setup
└── .github/workflows/ci.yml   # GitHub Actions CI
```

## Slash Commands

| Category | Commands |
|----------|----------|
| Core | `/status` `/clear` `/theme` `/help` `/exit` |
| Memory | `/memory` `/recall` `/export` `/import` `/sessions` |
| Evolution | `/snapshots` `/snapshot` `/rollback` `/diff` `/evolution` `/tests` `/health` `/autorecover` |
| Skills | `/skills` `/deactivate` `/knowledge` `/templates` `/template` |
| System | `/model` `/config` `/log` `/errors` `/git` `/plugin` `/cache` |
| API | `/api` `/users` `/voice` `/marketplace` |

## Transformation Triggers

Say any of these to trigger a self-transformation:

**English:** "become X", "transform into X", "I want you to be X", "act like X", "switch to being X"

**French:** "deviens X", "transforme-toi en X", "je veux une app X", "crée-toi X", "change de forme"

## Configuration

Edit `ultimate.config.json` or use `/config key=value`:

```json
{
  "theme": "cyberpunk",
  "model": "deepseek/deepseek-v4-flash:free",
  "logLevel": "info",
  "maxTokens": 4096,
  "streamEnabled": true,
  "historySize": 100,
  "language": "auto"
}
```

## REST API

Start with `npm run api` or set `ULTIMATE_API=1`:

```bash
# Health check
curl http://localhost:3000/health

# Send a message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello ULTIMATE"}'

# Get status
curl http://localhost:3000/api/status

# List snapshots
curl http://localhost:3000/api/snapshots

# List skills
curl http://localhost:3000/api/skills
```

## Docker

```bash
# Build and run
docker build -t ultimate .
docker run -e OPENROUTER_API_KEY=sk-or-... ultimate

# Or use docker-compose
docker-compose up
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | Required |
| `ULTIMATE_MODEL` | Model to use | `deepseek/deepseek-v4-flash:free` |
| `ULTIMATE_PLAIN` | Force plain console mode | `false` |
| `ULTIMATE_API` | Enable REST API | `false` |
| `ULTIMATE_API_PORT` | API server port | `3000` |
| `ANTHROPIC_API_KEY` | Fallback to Anthropic | Optional |

## Development

```bash
npm run dev          # Watch mode with hot reload
npm run typecheck    # Type check
npm run test         # Run tests
npm run api          # Start with REST API
```

## License

MIT
