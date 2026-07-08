# ZES System — Simplified Agent Guide

## Core Stack

```
You (NL) → Codex (superpowers) → 9Router → Models · zesChrome (:5901)
                                        ↘                 ↘
                              Hermes · VS Code (Cline)   Browser Control
```

## Services

| Service | Port | Runsv | Purpose |
|---------|------|-------|---------|
| **9Router** | 20128 | — | AI provider router, 18 providers |
| **Dashboard** | 8083 | `dashboard8083` | ZES Control Center |
| **Hermes Gateway** | — | `hermes-gateway` | Cron, scheduler, agent backend |
| **OpenCode** | 9876 | `opencode` | AI coding agent |
| **VS Code Server** | 8000 | `vscode-server` | Browser VS Code |
| **Codex** | 5900 | — | AI API proxy + Zen gateway |
| **Headless Chrome** | 9222 | `chromium-cdp` | Browser automation |
| **ttyd** | 7173 | `ttyd` | Web terminal |
| **Tor** | 9050 | `tor` | SOCKS5 proxy |
| **zesChrome MCP** | 5901 | `zeschrome-mcp` | Codex ↔ Chrome bridge via CDP |
| **SSH** | 8022 | — | Remote access |

## Codex Config
- **Model**: `groq/llama-3.3-70b-versatile` (fast, routed through 9Router)
- **Subagent**: `gh/gpt-5.4-mini-free-auto` (GitHub Copilot free tier)
- **Provider**: 9Router at `http://localhost:20128/v1`
- **OPENAI_API_KEY**: Cleared (was conflicting with 9Router routing)

## 9Router — 18 Providers

### OAuth
- GitHub Copilot, Cline, Codex (OpenAI), Gemini CLI, Qoder, Kiro (⚠️ needs re-auth)

### API Key
- NVIDIA NIM, Groq, Gemini, DeepSeek, Cerebras, OpenRouter, Anthropic, Cloudflare AI, **Mistral AI**

### OpenAI-Compatible Nodes
| Prefix | Endpoint | Proxy |
|--------|----------|-------|
| `oz` | :5900/codex-api/zen-proxy/v1 | Direct |
| `he` | :8787 | Tor |
| `oc` | :4040/v1 | Tor |

## Common Commands

```bash
# Service management
sv status /data/data/com.termux/files/usr/var/service/*
sv restart <name>

# 9Router API
TOKEN=$(python3 -c "import hashlib;d=open('$HOME/.9router/machine-id').read().strip();s=open('$HOME/.9router/auth/cli-secret').read().strip();print(hashlib.sha256((d+'9r-cli-auth'+s).encode()).hexdigest()[:16])")
curl -H "x-9r-cli-token: $TOKEN" http://localhost:20128/api/providers

# Dashboard
curl -s http://localhost:8083/api/status
