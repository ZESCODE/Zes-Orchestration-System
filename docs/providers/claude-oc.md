# claude-oc Provider Guide (v2 — replaces 9Router)

## Overview

`claude-oc` is the multi-transport proxy for the ZES system. It replaces the deprecated 9Router gateway.

**Port:** `:5905`
**Service:** `runsv claude-proxy`
**Source:** `~/.local/bin/claude-oc` (also in `scripts/zes-claude-oc`)

## Architecture

```
Claude Code → claude-oc :5905 → Model Router
  ├── Hermes  → deepseek-v4-flash-free  → 1VPN (Singapore)
  ├── Codex   → nemotron-3-ultra-free   → 1VPN (Los Angeles)
  ├── Claude  → deepseek-v4-flash-free  → 1VPN (Singapore)
  ├── Premium → ling-3.0-flash-free     → 1VPN (Singapore)
  ├── Fallback→ gemini-3.6-flash        → Tor
  └── Direct  → any model               → No proxy (testing)
```

## Transports

| Transport | Speed | Privacy | VPN Slot | Use Case |
|-----------|-------|---------|----------|----------|
| **1VPN** | 1-7s | Medium | No | Default — HTTPS proxy from 1VPN Chrome extension (reverse-engineered) |
| **Tor** | 3-35s | High | No | Private routing, IP rotation. Fallback when 1VPN blocked |
| **Direct** | 0.5-3s | Low | No | Testing, emergency |

### 1VPN Servers (reverse-engineered)
- **Singapore**: `free-singapore-https-1.cloudburstcdn.com:443` (fastest, ~1.4s)
- **Los Angeles**: `free-los-angeles-https-1.cloudburstcdn.com:443` (~2.0s)
- **Amsterdam**: `free-amsterdam-https-1.cloudburstcdn.com:443` (~7.3s)
- Shared credentials embedded in PAC script

## Model Routing Table

| Agent | Claude Model | Backend Model | Transport | Typical Latency |
|-------|-------------|---------------|-----------|----------------|
| Hermes | claude-sonnet-5 | deepseek-v4-flash-free | 1VPN SGP | 1-7s |
| Codex | claude-haiku-4-5 | nemotron-3-ultra-free | 1VPN LAX | 2-8s |
| Claude | claude-opus-5 | deepseek-v4-flash-free | 1VPN SGP | 1-7s |
| Premium | claude-4-sonnet-* | ling-3.0-flash-free | 1VPN SGP | 2-8s |
| Fallback | claude-3-5-haiku | gemini-3.6-flash | Tor | 5-35s |

## Rate Limit Protection

- **85% threshold** triggers transport rotation
- Auto-failover chain: 1VPN → Tor → Direct
- Each transport+model pair has isolated rate-limit pools
- Sub-agent pipeline (`zes-subagent`) fans out across different pools

## Key Commands

```bash
# Check health
curl -s http://127.0.0.1:5905/health

# List available models
curl -s http://127.0.0.1:5905/v1/models

# Override transport for a command
CLAUDE_OC_TRANSPORT=tor claude --print "Hello"

# Restart proxy
sv restart claude-proxy
```

## Sub-Agent Pipeline

The `zes-subagent` tool uses claude-oc for multi-agent parallel execution:

```bash
# 3-agent parallel research with auto-synthesis
zes-subagent research --topic "Deep learning advances"

# Build + review cycle
zes-subagent build --spec "Create a user auth API"

# Multi-model code review
zes-subagent review --files "src/main.py"
```

## Migration from 9Router

| Old (9Router) | New (claude-oc) |
|--------------|-----------------|
| Port :20128 | Port :5905 |
| Provider: Groq/OpenRouter | Provider: OpenCode Free |
| Transport: Direct | Transport: 1VPN/Tor/Direct |
| Models: Various paid | Models: DeepSeek/Nemotron/Ling/Gemini Free |
| Gateway: Node.js | Gateway: Python |
| Degraded: crashes | Stable: runsv auto-restart + threading |

## Tech Details

- **Language**: Python 3 (single-file, ~600 lines)
- **Threading**: ThreadingMixIn (concurrent requests)
- **Model config**: `MODEL_ROUTES` dict in file header
- **Transport config**: `CLAUDE_OC_TRANSPORT` env var
- **File**: `~/.local/bin/claude-oc`
- **Service**: `~/.local/share/runsv/claude-proxy/run`
