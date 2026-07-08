# ZES System — Agent Guide (v3)

## Core Stack

```
You (NL) → Codex (superpowers) → 9Router (:20128) → 18 AI Providers
                                        ↘
           ┌──────────────────────────────────────────────────┐
           │ ZES Control Center Dashboard (:8083)             │
           │  • Services Monitor · Agent Chat · Models Browser│
           │  • Auth Manager · Event History · Cron Dashboard │
           └──────────────────────────────────────────────────┘
                                        ↘
           ┌─────────── MCP Layer (:5901) ─────────────┐
           │ zesChrome — browse, screenshot, click,     │
           │ type, extract, wait, auth, run_task         │
           └────────────────────────────────────────────┘
                                        ↘
     Hermes (cron/scheduler) · VS Code (:8000) · OpenCode (:9876)
```

## Services

| Service | Port | Runsv | Purpose |
|---------|------|-------|---------|
| **9Router** | 20128 | — | AI provider router, 18 providers |
| **Dashboard v3** | 8083 | `dashboard8083` | ZES Control Center — services, chat, models, auth, cron, history |
| **Hermes Gateway** | — | `hermes-gateway` | Cron, scheduler, agent backend |
| **zesChrome MCP** | 5901 | `zeschrome-mcp` | Codex ↔ Chrome bridge via CDP, 8 tools |
| **OpenCode** | 9876 | `opencode` | AI coding agent |
| **VS Code Server** | 8000 | `vscode-server` | Browser VS Code (Cline + Continue) |
| **Codex Server** | 5900 | — | AI API proxy + Zen gateway |
| **Headless Chrome** | 9222 | `chromium-cdp` | Browser automation (CDP) |
| **ttyd** | 7173 | `ttyd` | Web terminal |
| **Tor** | 9050 | `tor` | SOCKS5 proxy |
| **SSH** | 8022 | — | Remote access |

## Dashboard API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Full system status with providers |
| `/api/history` | GET | 2h uptime history (60s intervals) |
| `/api/agent/chat` | POST | Chat with AI via 9Router |
| `/api/agent/action` | POST | Execute browser action via MCP |
| `/api/agent/task` | POST | Schedule or run a task |
| `/api/agent/history` | GET | Agent conversation history |
| `/api/models` | GET | Available models from 9Router |
| `/api/services` | GET | Service auth status |
| `/api/services/auth` | POST | Trigger OAuth flow for a service |
| `/api/mcp` | GET | MCP server health + available tools |

## Hermes Cron Jobs (4 active)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `daily-health-check` | every 360m | Check all services, report issues |
| `log-cleanup` | every 1440m | Clean stale logs and history |
| `model-rotation` | 0 0 * * 0 (weekly) | Rotate AI provider models |
| `dashboard-snapshot` | */30 * * * * | Save service status snapshot |

## Dashboard UI Tabs

| Tab | Features |
|-----|----------|
| **Services** | Live service monitor, sparklines, provider table, env info |
| **Agent Chat** | Chat with AI via 9Router, model selector, conversation history |
| **AI Models** | Browser all 9Router providers/models with status |
| **Services Auth** | Composio, Gmail, Hermes — OAuth status and re-auth |
| **Event Log** | Agent action history with timestamps and models |
| **Cron** | Hermes cron job overview |

## 9Router — 18 Providers

### OAuth
- GitHub Copilot, Cline, Codex (OpenAI), Gemini CLI, Qoder, Kiro

### API Key
- NVIDIA NIM, Groq, Gemini, DeepSeek, Cerebras, OpenRouter, Anthropic, Cloudflare AI, Mistral AI

### OpenAI-Compatible Nodes
| Prefix | Endpoint | Proxy |
|--------|----------|-------|
| `oz` | :5900/codex-api/zen-proxy/v1 | Direct |
| `he` | :8787 | Tor |
| `oc` | :4040/v1 | Tor |

## Quick Reference

```bash
# Service management
sv status /data/data/com.termux/files/usr/var/service/*
sv restart <name>

# 9Router CLI token
TOKEN=$(python3 -c "import hashlib;d=open('$HOME/.9router/machine-id').read().strip();s=open('$HOME/.9router/auth/cli-secret').read().strip();print(hashlib.sha256((d+'9r-cli-auth'+s).encode()).hexdigest()[:16])")

# Dashboard API
curl -s http://localhost:8083/api/status
curl -s -X POST http://localhost:8083/api/agent/chat -H "Content-Type: application/json" -d '{"message":"Hello"}'
curl -s http://localhost:8083/api/mcp

# MCP Server
curl -s http://localhost:5901/health

# Hermes cron
hermes cron list
hermes cron run <job-id>

# Dashboard v3 source
cat ~/dashboard_v3.py
```

## Known Issues

1. **Kiro** — OAuth expired (AWS Builder ID). Re-auth via Chrome at 9Router dashboard
2. **OpenCode** — Root path returns 404 (API server, normal)
3. **Hermes daily-health-check** — Previous delivery failure resolved (now using `local` delivery)
