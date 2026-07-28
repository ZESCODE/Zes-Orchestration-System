# ZES Orchestration System — Unified Personal AI

**Version:** 4.0.0  
**Repo:** https://github.com/ZESCODE/Zes-Orchestration-System  
**Dashboard:** https://zes-dashboard.vercel.app  

ZES orchestrates **three AI agents** (Codex CLI, Claude Code, Hermes) on Termux Android — with multi-transport proxy, sub-agent pipeline, shared memory, and commercial-grade system prompts.

---

## Architecture v4

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Codex   │  │  Hermes  │  │ Claude   │
│  CLI     │  │  Agent   │  │  Code    │
│ (coder)  │  │(orchestr)│  │ (face)   │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────┬───┴─────────────┘
               ▼
     ┌──────────────────┐
     │  claude-oc :5905  │  Multi-transport proxy
     │  Model Router     │  (replaces 9Router)
     └────────┬─────────┘
              │
     ┌────────┴────────┐
     │  1VPN  │  Tor   │
     │  1-7s  │ 3-35s  │
     └────────┴────────┘
              │
     ┌────────┴────────┐
     │  OpenCode Free   │
     │  deepseek-v4     │
     │  nemotron-3      │
     │  ling-3.0        │
     │  gemini-3.6      │
     └─────────────────┘
              │
     ┌────────┴────────┐
     │  ZES Memory Hub  │
     │  224+ memories    │
     └─────────────────┘
```

| Agent | Role | Model | Transport | Latency |
|-------|------|-------|-----------|---------|
| **Codex CLI** | Primary coder | nemotron-3-ultra-free | 1VPN LA | 2-8s |
| **Claude Code** | Reviewer & parallel | deepseek-v4-flash-free | 1VPN SGP | 1-7s |
| **Hermes** | Orchestrator & memory | deepseek-v4-flash-free | 1VPN SGP | 1-7s |

## Key Components

| Component | Path/URL | Description |
|-----------|----------|-------------|
| **AGENTS.md** | `AGENTS.md` | Unified ZES agent instructions (v4.0.0) |
| **claude-oc** | `scripts/zes-claude-oc` | Multi-transport proxy (:5905) |
| **zes-subagent** | `scripts/zes-subagent` | Sub-agent pipeline orchestrator |
| **Power Agent** | `power-agent/` | MCP server — 38 tools |
| **Dashboard** | `zes-dashboard.vercel.app` | Frost Edition UI |
| **Memory Hub** | `~/.zes/memory_hub.sqlite` | Shared memories |
| **Skills** | `~/.codex/skills/` | 85+ shared skills |
| **Agent Souls** | `docs/agents/` | Identity docs for each agent |

## Provider Strategy

- **All models free** — OpenCode Free tier, no API keys needed
- **Multi-transport** — 1VPN for speed, Tor for privacy, Direct for testing
- **Rate-limit isolation** — each transport+model pair = separate pool
- **Auto-failover** — 1VPN → Tor → Direct on 85% threshold

## Quick Start

```bash
# Read unified agent instructions
cat AGENTS.md

# Check proxy health
curl -s http://127.0.0.1:5905/health

# Run sub-agent pipeline
zes-subagent research --topic "Topic"

# Read agent souls
cat docs/agents/hermes-soul.md
cat docs/agents/codex-soul.md
cat docs/agents/claude-soul.md
```

## Provider Migration

| Old (v3) | New (v4) |
|----------|----------|
| 9Router :20128 | claude-oc :5905 |
| Groq/OpenRouter/BitRouter | OpenCode Free |
| Direct-only transport | 1VPN/Tor/Direct multi-transport |
| Sequential agent chain | True threaded parallel sub-agents |
| Single model per task | 5-agent routing table |

## Related Repositories

| Repo | URL |
|------|-----|
| **ZES Orchestration System** | https://github.com/ZESCODE/Zes-Orchestration-System |
| **ZES Dashboard** | https://github.com/ZESCODE/Zes-Dashboard |
| **Hermes Agent** | https://github.com/ZESCODE/hermes-agent |
| **ZES Skills** | https://github.com/ZESCODE/ZES-Skills |
