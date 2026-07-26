# ZES Orchestration System — Unified Personal AI

**Version:** 3.8.0  
**Repo:** https://github.com/ZESCODE/Zes-Orchestration-System  
**Dashboard:** https://zes-dashboard.vercel.app  

ZES orchestrates **three AI agents** (Codex CLI, Claude Code, Hermes) plus supporting services on Termux Android — a unified personal AI ecosystem with shared memory, skills, and infrastructure.

---

## Architecture

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Codex   │  │  Hermes  │  │ Claude   │
│  CLI     │  │  Agent   │  │  Code    │
│ (coder)  │  │(orchestr)│  │ (review) │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────┬───┴─────────────┘
               ▼
     ┌──────────────────┐
     │  ZES Memory Hub   │
     │  224 memories      │
     │  FTS5+embeddings   │
     └──────────────────┘
```

| Agent | Role | Soul | Tools |
|-------|------|------|-------|
| **Codex CLI** | Primary coder — execution & engineering | `docs/agents/codex-soul.md` | 82+ skills, CDP, power agent MCP |
| **Claude Code** | Reviewer & parallel worker | `docs/agents/claude-soul.md` | amux, review workflows, a11y |
| **Hermes** | Memory curator & orchestrator | `docs/agents/hermes-soul.md` | memory hub, self-improvement |

See `docs/agents/trinity.md` for full interaction model.

---

## Key Components

| Component | Path/URL | Description |
|-----------|----------|-------------|
| **AGENTS.md** | `AGENTS.md` (this file) | Unified ZES agent instructions (v3.8.0) |
| **Power Agent** | `power-agent/` | MCP server — 38 tools across 6 skills |
| **Dashboard** | `zes-dashboard.vercel.app` | Frost Edition glassmorphic UI |
| **Memory Hub** | `~/.zes/memory_hub.sqlite` | 224 shared memories |
| **Skills** | `~/.codex/skills/` | 82+ shared skills |
| **Config Samples** | `docs/configs/` | Codex/Claude/Hermes config templates |
| **Agent Souls** | `docs/agents/` | Identity docs for each agent |

---

## Quick Start

```bash
# Read the unified instructions
cat AGENTS.md

# Read agent souls
cat docs/agents/codex-soul.md
cat docs/agents/claude-soul.md
cat docs/agents/hermes-soul.md

# View trinity interaction model
cat docs/agents/trinity.md

# Check memory hub
sqlite3 ~/.zes/memory_hub.sqlite "SELECT count(*) FROM memories;"

# Test power agent
cd power-agent && POWER_AGENT_PORT=3099 node server.js &
curl http://localhost:3099/health
```

---

## Related Repositories

| Repo | URL |
|------|-----|
| **ZES Orchestration System** | https://github.com/ZESCODE/Zes-Orchestration-System |
| **ZES Dashboard** | https://github.com/ZESCODE/Zes-Dashboard |
| **Hermes Agent** | https://github.com/ZESCODE/hermes-agent |
| **ZES Skills** | https://github.com/ZESCODE/ZES-Skills |
