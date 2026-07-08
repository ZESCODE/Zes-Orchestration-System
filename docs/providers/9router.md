# 9Router — AI Provider Router

**Version:** 0.5.20 | **Port:** 20128 | **DB:** `~/.9router/db/data.sqlite`

## Overview

9Router is an AI provider router that manages multiple LLM provider connections, handles token rotation, proxies requests through Tor, and provides a unified OpenAI-compatible API endpoint.

## Auth

Access the 9router API requires a CLI token:

```python
import hashlib
mid = open("~/.9router/machine-id").read().strip()
sec = open("~/.9router/auth/cli-secret").read().strip()
token = hashlib.sha256((mid + "9r-cli-auth" + sec).encode()).hexdigest()[:16]
# Use as: x-9r-cli-token header
```

## Provider Connections (17 total, 16 active)

### OAuth Providers
| Provider | Account | Type | Status |
|----------|---------|------|--------|
| GitHub Copilot | arfaXdev | OAuth (GitHub) | Active |
| Cline | arfaxtrade@gmail.com | OAuth (WorkOS) | Active |
| Codex (OpenAI) | arfaxtrade@gmail.com | OAuth (OpenAI) | Active |
| Gemini CLI | arfaxtrade@gmail.com | OAuth (Google) | Active |
| Qoder | arfaxtrade@gmail.com | OAuth (Device) | Active |
| Kiro | Account 1 | OAuth | Unavailable |

### API Key Providers
| Provider | Status | Notes |
|----------|--------|-------|
| NVIDIA NIM | Active | nvapi- key |
| Groq | Active | gsk- key, fastest inference |
| Gemini | Active | Google AI Studio key |
| DeepSeek | Active | Competitive open models |
| Cerebras | Active | High-throughput inference |
| OpenRouter | Active | Session-based routing |
| Anthropic | Active | Claude models |
| Cloudflare AI | Active | Workers AI |

### OpenAI-Compatible Nodes
| Prefix | Name | Endpoint | Proxy |
|--------|------|----------|-------|
| oz | Zen OpenCode | :5900/codex-api/zen-proxy/v1 | Direct |
| he | Hermes AI | :8787 | Tor SOCKS5 |
| oc | OpenClaw Proxy | :4040/v1 | Tor SOCKS5 |

## Proxy Pool

- **Name:** Tor SOCKS5 Pool
- **Type:** HTTP proxy via SOCKS5
- **Endpoint:** `socks5://127.0.0.1:9050`
- **Excludes:** localhost, 127.0.0.1

## Database Schema

The 9Router SQLite DB (`~/.9router/db/data.sqlite`) contains:

- `providerConnections` — All provider credentials and status
- `providerNodes` — OpenAI-compatible endpoint definitions
- `proxyPools` — Proxy configurations (Tor pool)
- `usageDaily` / `usageHistory` — Token usage tracking
- `apiKeys` — API key management
- `combos` — Provider combinations
- `kv` — Key-value store
- `settings` — Global settings

## API Endpoints

All endpoints require `x-9r-cli-token` header:

```bash
GET  /api/providers          # List all provider connections
GET  /api/provider-nodes     # List OpenAI-compatible nodes
GET  /api/providers/client   # List OAuth-connected providers
POST /api/providers          # Add provider connection
GET  /api/status             # Server status
```

## Usage

### Route requests through 9router

```bash
# Use as OpenAI-compatible endpoint
curl http://localhost:20128/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "cf/@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Access 9router UI

Open http://localhost:20128 in a browser to access the web dashboard.
