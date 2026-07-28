<!--
╔══════════════════════════════════════════════════════════════╗
║             WELCOME TO ZES ORCHESTRATION SYSTEM              ║
║                                                              ║
║  👋 New agent? Start here:                                   ║
║                                                              ║
║  1. Read this file → `cat ~/Zes-System/AGENTS.md`            ║
║  2. Read your soul → `cat ~/Zes-System/docs/agents/*-soul.md`║
║  3. Check memory   → `sqlite3 ~/.zes/memory_hub.sqlite`      ║
║  4. See the trinity → `cat ~/Zes-System/docs/agents/trinity` ║
║  5. Full onboarding → `cat ~/Zes-System/WELCOME.md`          ║
║                                                              ║
║  Key ref: AGENTS.md = unified rules for ALL agents            ║
║           docs/agents/*-soul.md = YOUR identity               ║
║           docs/configs/ = sample configs for each agent       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
-->
# ZES Orchestration System — Unified Agent Instructions

**Version:** 3.8.0  
**Scope:** This file governs all agents operating within the ZES Orchestration System environment. It supersedes individual AGENTS.md files where conflicts exist.

---

## 1. System Overview

ZES Orchestration System is a unified personal AI system running on Termux (Android). It orchestrates three primary agents — **Codex CLI**, **Hermes Agent**, and **Claude Code** — plus supporting services (BitRouter AI Gateway, AI-Proxy, ZES Power Agent, Vercel Dashboard).

```
┌───────────────────────────────────────────────────────────┐
│                    ZES System v3.8                          │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │  Codex   │  │  Hermes  │  │ Claude   │                │
│  │  CLI     │  │  Agent   │  │  Code    │                │
│  │ (coder)  │  │(orchestr)│  │ (review) │                │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                │
│       │             │             │                       │
│       └─────────┬───┴─────────────┘                       │
│                 ▼                                          │
│       ┌──────────────────┐                                │
│       │  ZES Memory Hub   │  224 memories                  │
│       │  ~/.zes/memory   │  FTS5 + embeddings              │
│       └──────────────────┘                                │
│                                                           │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │BitRouter │  │  ZES Power   │  │ ZES CLI Toolkit   │     │
│  │ :4356    │  │  Agent (MCP) │  │ research|batch     │     │
│  │GPT+Gemini│  │  38 tools    │  │ consolidate|debug  │     │
│  └──────────┘  │ 6 skills     │  └──────────────────┘     │
│                └──────────────┘                            │
│  ┌──────────────────────────────────────┐                  │
│  │  zes-dashboard.vercel.app (Vercel)   │                  │
│  │  Frost Edition glassmorphic theme    │                  │
│  └──────────────────────────────────────┘                  │
└───────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Codex is the primary coder** — Execution, planning, file editing, repo work, CDP diagnostics
2. **Claude Code is the secondary coder** — Code review, parallel tasks, accessibility, user-facing UI
3. **Hermes is the memory hub & orchestrator** — All memories flow through ZESMemoryProvider (224 entries)
4. **BitRouter** routes OpenAI + Gemini. AI-Proxy routes Groq, OpenRouter, Mistral, NVIDIA.
5. **ZES Power Agent** provides 38 MCP tools across 6 skills (CDP, FS, API, DB, SSH, System)
6. **Vercel Dashboard** hosts the Frost Edition glassmorphic UI at `zes-dashboard.vercel.app`
7. **Skills are shared** — 82+ skills across 14 categories at `~/.codex/skills/`

---

## 2. The Trinity

| Agent | Role | Saying | Config | Soul |
|-------|------|--------|--------|------|
| **Codex** | Primary coder — the sharp scalpel | *"Unverified code is broken code"* | `~/.codex/AGENTS.md` | `docs/agents/codex-soul.md` |
| **Claude Code** | Secondary coder — the face & bridge | *"Code it right, test it clean"* | `~/.claude/AGENTS.md` | `docs/agents/claude-soul.md` |
| **Hermes** | Orchestrator & memory curator | *"I build to create continuity"* | `~/.hermes/SOUL.md` | `docs/agents/hermes-soul.md` |

See `docs/agents/trinity.md` for full interaction model and conflict resolution.

---

## 3. Component Roles

### Codex CLI
- **AGENTS.md:** `~/.codex/AGENTS.md` (v1.2.0)
- **WORKFLOW.md:** `~/.codex/WORKFLOW.md` (4-Phase QC)
- **Skills:** 82+ at `~/.codex/skills/`
- **Key tools:** CDP audit, Power Agent MCP, TDD, memory ops, frost design system
- **Domain:** Files, repos, builds, tests, deployments, browser diagnostics

### Claude Code
- **AGENTS.md:** `~/.claude/AGENTS.md`
- **Role:** Secondary coder, reviewer, parallel worker
- **Key tools:** amux for parallel sessions, review workflows, accessibility checks
- **Domain:** Code review, UI polish, parallel tasks, user communication

### Hermes Agent
- **Config:** `~/.hermes/config.yaml`, `~/.hermes/SOUL.md`
- **Memory Hub:** `~/.zes/memory_hub.sqlite` (224 memories, FTS5 + embeddings)
- **Decision files:** `~/.zes/memories/*.md`
- **Key tools:** ZES-memory-ops, ZES-memory-consolidator, nightly self-review
- **Domain:** Memory curation, cross-session continuity, self-improvement

### ZES Power Agent
- **Server:** `~/Zes-System/power-agent/server.js`
- **Managed by:** runsv (`zes-power-agent`)
- **38 MCP tools across 6 skills:**
  - `cdp` (13): navigate, screenshot, evaluate, console, network, a11y, DOM, click, viewport, performance trace
  - `fs` (10): read, write, append, list, delete, mkdir, exists, stat, search, grep
  - `api` (5): GET, POST, PUT, PATCH, DELETE
  - `db` (4): query, execute, tables, describe (read-only)
  - `ssh` (1): remote command execution
  - `sys` (5): exec, spawn, env, which, pidof (command allowlist)
- **Transports:** stdio (default) or SSE (`POWER_AGENT_PORT=3099`)

### ZES Dashboard (Vercel)
- **URL:** `https://zes-dashboard.vercel.app`
- **Source:** `ZESCODE/Zes-Dashboard` on GitHub
- **Stack:** Next.js 16.2.11, Turbopack, pnpm
- **Theme:** ZES Frost Edition — 4-color glassmorphic (blue/green/orange/red)
- **Deployment:** Vercel Production (arfaxdevs-projects team)

---

## 4. Memory Hub Architecture

```
Codex (self-review) ──→ zes-self-review ──→ ZES Memory Hub ←── Hermes (holographic)
Claude (decisions) ──→ decision .md files ──→ ZES Memory Hub ←── Nightly consolidation
                                                    │
                                              ┌─────┴─────┐
                                              │ 224 memories │
                                              │ (facts/      │
                                              │  decisions/  │
                                              │  patterns/   │
                                              │  preferences/│
                                              │  bugfixes/   │
                                              │  sessions)   │
                                              └─────────────┘
```

### Memory Types
| Type | Example |
|------|---------|
| `fact` | "Dashboard deployed on Vercel at zes-dashboard.vercel.app" |
| `decision` | "Use JS runtime CSS injection to bypass Turbopack stripping" |
| `pattern` | "Vercel deploy: git push → npx vercel deploy --prod" |
| `preference` | "User prefers Frost 4-color glassmorphic design" |
| `bugfix` | "Memory graph height too small — fixed with calc(100vh - 280px)" |
| `session` | "Dashboard frost redesign + power agent build session" |

---

## 5. Port & Service Reference

| Service | Port | Status | Managed By |
|---------|------|--------|------------|
| **claude-oc Proxy** | `:5905` | ✅ | runsv (claude-proxy) |
| **Tor SOCKS5** | `:9050` | ✅ | runsv (tor) |
| **Sub-Agent Pipeline** | CLI | ✅ | `zes-subagent` tool |
| **BitRouter AI Gateway** | `:4356` | ❌ Deprecated | Use claude-oc instead |
| **ZES Power Agent** | `:3099` | ✅ | runsv (zes-power-agent) |
| **amux Sessions** | `:8822` | ✅ | amux |
| **ZES Dashboard** | Vercel | ✅ | zes-dashboard.vercel.app |

### Provider Evolution

```
v1 (deprecated):   Claude Code → 9Router :20128 → Groq/OpenRouter → Various models
v2 (current):      Claude Code → claude-oc :5905 → 1VPN/Tor → OpenCode Free
```

**Key differences:**
- claude-oc is a Python single-file proxy (~600 lines), replaces 9Router
- Multi-transport: 1VPN (fast, 1-7s), Tor (private, 3-35s), Direct (testing)
- Agent-aware model routing: each of 5 agents gets a different backend model
- Threaded server handles concurrent requests from parallel sub-agents
| ZES Dashboard (Vite, local) | `:5050` | ✅ | runsv (zes-dashboard) |
| ZES Power Agent (MCP) | stdio/:3099 | ✅ | runsv (zes-power-agent) |
| Flask API | `:5002` | ✅ | runsv (zes-flask-api) |
| amux Control Plane | `:8822` | ✅ | runsv (amux) |
| Hermes Dashboard | `:9119` | ✅ | runsv (hermes-dashboard) |
| Hermes Gateway | — | ✅ | runsv (hermes-gateway) |
| Tor SOCKS5 | `:9050` | ✅ | runsv (tor) |
| Tor Control | `:9051` | ✅ | runsv (tor) |
| iprotate (Tor IP rotation) | — | ✅ | runsv (zes-ip-rotator) |
| CDP Chrome Debug | `:9222` | ✅ | runsv (chromium-cdp) |
| CDP Viewer | `:9223` | ✅ | runsv (cdp-viewer) |
| Control Center | `:8083` | ✅ | legacy |
| ZES Memory Sync | — | ✅ | runsv (zes-memory-sync) |
| ttyd web terminal | `:7173` | ✅ | runsv |

### Vercel (Cloud)
| Service | URL | Status |
|---------|-----|--------|
| ZES Dashboard | `https://zes-dashboard.vercel.app` | ✅ Production |

---

## 6. Skills

**82+ skills across 14 categories** at `~/.codex/skills/`. Shared across all agents.

| Category | Count | Skills |
|----------|-------|--------|
| **ZES** | 29+ | agentic-core, brainstorming, dashboard, design, memory-ops, provider-manager, frost-edition, mcp-power-agent, feature-workflow, etc. |
| **Core Workflow** | 8 | tdd-workflow, verification-loop, coding-standards, error-handling, ecc-integration, etc. |
| **Backend** | 8 | backend-patterns, api-design, fastapi-patterns, postgres-patterns, python-patterns, etc. |
| **Integration** | 6 | composio-cli, flightclaw, search-codex-chats, telegram-bridge, 9router, etc. |
| **Frontend** | 6 | frontend-patterns, react-patterns, react-performance, vite-patterns, dashboard-builder, etc. |
| **Project Workflow** | 5 | plan-orchestrate, delivery-gate, context-budget, cost-tracking, repo-scan |
| **Security** | 4 | security-review, security-scan, gateguard, safety-guard |
| **Testing & QA** | 5 | browser-qa, python-testing, e2e-testing, benchmark, cdp-audit |
| **Research** | 3 | deep-research, documentation-lookup, exa-search |
| **System** | 2 | imagegen, system-orchestrator |
| **Agent** | 2 | agentic-engineering, knowledge-ops |
| **Discovery** | 2 | skill-scout, skill-stocktake |
| **Design** | 2 | designmd, ZES-frost-edition |
| **Free AI** | 1 | freellm |

---

## 7. MCP Servers

| Server | Purpose | Status |
|--------|---------|--------|
| GitHub | Repo management, PRs, issues | ✅ |
| Context7 | Documentation lookup | ✅ |
| Exa | Neural search | ✅ |
| Memory | ZES Memory Hub integration | ✅ |
| Playwright | Browser automation | ✅ |
| CDP | Chrome DevTools Protocol (`ws://127.0.0.1:9222`) | ✅ |
| Sequential Thinking | Structured reasoning | ✅ |
| DesignMD | Design system | ✅ |
| Notion | Knowledge base | ✅ |
| ZES Power Agent | Unified MCP server (38 tools, 6 skills) | ✅ |

---

## 8. Service Management (runit)

```bash
sv start/stop/restart/status <service>

# Core services
sv status bitrouter          # AI Gateway (:4356)
sv status ai-proxy           # AI Proxy (:20129)
sv status zes-dashboard      # Vite Dashboard (:5050)
sv status zes-power-agent    # MCP Power Agent
sv status amux               # amux Control Plane (:8822)
sv status hermes-gateway     # Hermes gateway
sv status hermes-dashboard   # Hermes WebUI (:9119)
sv status zes-memory-sync    # Memory hub sync
sv status chromium-cdp       # Headless Chrome (:9222)
sv status cdp-viewer         # CDP Viewer (:9223)
```

---

## 9. Common Commands

```bash
# System Health
curl http://127.0.0.1:5002/api/health      # System health
curl http://127.0.0.1:5002/api/services    # All services

# Memory Hub
sqlite3 ~/.zes/memory_hub.sqlite "SELECT count(*) FROM memories;"  # Total memories
sqlite3 ~/.zes/memory_hub.sqlite "SELECT id, type, substr(content,1,60) FROM memories ORDER BY id DESC LIMIT 10;"

# Power Agent (if SSE mode)
curl http://127.0.0.1:3099/health          # Power Agent health

# CDP Diagnostics
curl -s http://127.0.0.1:9222/json/version | python3 -m json.tool  # CDP status
curl -s http://127.0.0.1:9222/json         # Open browser targets

# Dashboard
open https://zes-dashboard.vercel.app      # Vercel production
open http://127.0.0.1:5050                 # Local dev

# Git Operations
cd ~/zes-system-repo && git pull           # Update system docs
cd ~/Zes-Dashboard && git pull             # Update dashboard
```

---

## 10. Key Paths

| Resource | Path |
|----------|------|
| ZES System Repo | `~/zes-system-repo/` (GitHub: ZESCODE/Zes-Orchestration-System) |
| ZES Dashboard Source | `~/tmp-zes-dash/` (GitHub: ZESCODE/Zes-Dashboard) |
| Power Agent | `~/Zes-System/power-agent/` |
| Codex Config | `~/.codex/config.toml` |
| Codex AGENTS.md | `~/.codex/AGENTS.md` (v1.2.0) |
| Codex WORKFLOW.md | `~/.codex/WORKFLOW.md` |
| Codex Skills | `~/.codex/skills/` (82+ skills) |
| Claude Code AGENTS.md | `~/.claude/AGENTS.md` |
| Hermes Config | `~/.hermes/config.yaml` |
| Hermes Soul | `~/.hermes/SOUL.md` |
| ZES Memory Hub DB | `~/.zes/memory_hub.sqlite` (224 memories) |
| ZES Memory Files | `~/.zes/memories/*.md` |
| Services | `/data/data/com.termux/files/usr/var/service/` |
| Vercel Config | `~/.local/share/com.vercel.cli/auth.json` |
| GitHub Token | `~/.git-credentials` |
