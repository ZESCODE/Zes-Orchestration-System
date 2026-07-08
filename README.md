# ZES System

> **ZES Control Center** — Self-hosted AI infrastructure: provider router, agent orchestration, and service management on Android/Termux.

## Dashboard

**URL:** http://localhost:8083

The ZES Control Center shows all services, AI provider status, system environment, and sparkline history — with a mobile-responsive left drawer nav.

## Architecture

```
Termux (Android aarch64) + Debian proot
├── 9Router v0.5.20       — AI provider router (:20128, 17 providers)
├── Hermes Agent          — AI agent gateway (:8787)
├── OpenCode              — AI coding agent (:9876)
├── VS Code Server        — Web VS Code with Cline/Continue (:8000)
├── Codex App Server      — AI API proxy + Zen gateway (:5900)
├── Composio SDK          — Gmail/API integrations
├── Dashboard             — ZES Control Center (:8083)
├── Tor                   — Anonymizing proxy (:9050)
├── Headless Chromium     — Browser automation (:9222)
└── runsv (runit)         — Service supervision
```

## Quick Links

| Service | URL |
|---------|-----|
| ZES Dashboard | http://localhost:8083 |
| 9Router | http://localhost:20128 |
| Hermes WebUI | http://localhost:8787 |
| Codex Server | http://localhost:5900 |
| Web Terminal | http://localhost:7173 |
| OpenCode Server | http://localhost:9876 |
| VS Code Server | http://localhost:8000 |

## 9Router Providers (17)

### OAuth
- **GitHub Copilot** — `arfaXdev`, free Copilot tier
- **Cline** — `arfaxtrade@gmail.com` via WorkOS
- **Codex (OpenAI)** — `arfaxtrade@gmail.com` free tier
- **Gemini CLI** — `arfaxtrade@gmail.com` Google Cloud
- **Qoder** — Device auth, 30-day session
- **Kiro** — AWS Builder ID (needs re-auth)

### API Key
- NVIDIA NIM, Groq, Gemini, DeepSeek, Cerebras, OpenRouter, Anthropic, Cloudflare AI

### OpenAI-Compatible Nodes
| Prefix | Name | Endpoint | Proxy |
|--------|------|----------|-------|
| `oz` | Zen OpenCode | :5900/codex-api/zen-proxy/v1 | Direct |
| `he` | Hermes AI | :8787 | Tor SOCKS5 |
| `oc` | OpenClaw Proxy | :4040/v1 | Tor SOCKS5 |

## Running Services

| Service | Port | Status |
|---------|------|--------|
| Dashboard | 8083 | ✅ |
| 9Router | 20128 | ✅ |
| VS Code Server | 8000 | ✅ |
| Hermes Gateway | 8787 | ✅ |
| OpenCode | 9876 | ✅ |
| Codex Server | 5900 | ✅ |
| Headless Chrome | 9222 | ✅ |
| Tor | 9050 | ✅ |
| SSH | 8022 | ✅ |
| Socat | 8090 | ✅ |

## Common Commands

```bash
# Service management
sv status /data/data/com.termux/files/usr/var/service/*
sv restart dashboard8083

# 9Router CLI
TOKEN=$(python3 -c "import hashlib;d=open('$HOME/.9router/machine-id').read().strip();s=open('$HOME/.9router/auth/cli-secret').read().strip();print(hashlib.sha256((d+'9r-cli-auth'+s).encode()).hexdigest()[:16])")
curl -H "x-9r-cli-token: $TOKEN" http://localhost:20128/api/providers

# Dashboard API
curl -s http://localhost:8083/api/status

# Proot access
proot-distro login debian

# Hermes cron
hermes cron list
```

## Gmail Integration

- **Composio SDK** — Gmail OAuth (`arfaxtrade@gmail.com`)
- **IMAP/SMTP** — Alternative email client via `gmail-tool`
