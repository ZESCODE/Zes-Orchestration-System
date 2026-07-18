# ZES System — Unified Agent Instructions

**Version:** 3.4.0  
**Scope:** This file governs all agents operating within the ZES (ZES Enterprise System) environment. It supersedes individual AGENTS.md files where conflicts exist.

---

## 1. System Overview

ZES is a unified personal AI system running on Termux (Android). It orchestrates three primary agents — **Codex CLI**, **Hermes Agent**, and **Claude Code** — plus supporting services (9Router AI Gateway, amux Agent Control Plane, ZES Dashboard).

```
┌──────────────────────────────────────────────────────────┐
│                    ZES System                             │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Codex   │  │  Hermes  │  │ Claude   │               │
│  │  CLI     │  │  Agent   │  │  Code    │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       │             │             │                      │
│       └─────────┬───┴─────────────┘                      │
│                 ▼                                         │
│       ┌──────────────────┐                               │
│       │  ZES Memory Hub   │  (unified memory)             │
│       └──────────────────┘                               │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐       │
│  │ 9Router  │  │   amux   │  │ ZES Dashboard    │       │
│  │ AI GW    │  │  Control │  │ (Vite + shadcn)  │       │
│  └──────────┘  └──────────┘  └──────────────────┘       │
└──────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Hermes is the memory hub** — All memories flow through ZESMemoryProvider / holographic provider
2. **Codex is the coding agent** — Primary for code generation, edits, repo work
3. **Claude Code is the secondary coding agent** — Parallel coding, code review, multi-agent orchestration via amux
4. **9Router is the AI gateway** — Routes LLM requests, manages API keys
5. **amux is the agent control plane** — Runs, monitors, and orchestrates parallel agent sessions
6. **Skills are shared** — Codex skills available to Hermes and vice versa
7. **Services communicate via HTTP** — REST APIs, WebSocket, file-based bridges

---

## 2. Component Roles

### Codex CLI (`~/.codex/`)
- **Primary role:** Coding agent — file editing, repo management, planning
- **Runtime:** Python, Node.js
- **Config:** `~/.codex/config.toml`
- **Memories:** `~/.codex/memories_1.sqlite` (stage1_outputs table), `~/.codex/memories/raw_memories.md`
- **Ports:** `:5900` (app-server, optional)
- **Entry point:** `codex` command or `npx codexapp`
- **Skills:** 77 skills (29 ZES + 42 ECC + shared skills)

### Hermes Agent (`~/hermes-agent-full/`)
- **Primary role:** Persistent AI agent — gateway, cron, self-improvement loop
- **Runtime:** Python 3.14
- **Config:** `~/.hermes/config.yaml`
- **Memories:** `~/.hermes/MEMORY.md`, `~/.hermes/USER.md`, `~/.hermes/skills/`, ZES Memory Hub (SQLite+FTS5)
- **Ports:** Dashboard `:9119`
- **Entry point:** `python3 -m hermes_cli.main gateway run` (runit-managed)
- **Plugins:** Memory providers (holographic, honcho, mem0, etc.), browser, context engines
- **Provider:** 9Router at `http://127.0.0.1:20128/v1` (model: gh/gpt-4o-mini)

### Claude Code (`~/.local/bin/claude`)
- **Primary role:** Secondary coding agent — parallel coding, multi-agent orchestration
- **Runtime:** Node.js
- **Config:** `~/.claude/settings.json`, `~/.claude/projects/`
- **Memories:** Managed by amux sessions; ZES Memory Hub via sync
- **Ports:** None (CLI-only)
- **Entry point:** `claude` or `zes-claude` (ZES-wrapped)
- **Provider:** 9Router proxy at `http://127.0.0.1:5905` via `ANTHROPIC_BASE_URL`

### amux Agent Control Plane (`~/amux-fresh/`)
- **Primary role:** Open-source control plane for AI coding agents — run, monitor & orchestrate parallel sessions
- **Runtime:** Python 3.14 + tmux
- **Port:** `:8822` (web dashboard)
- **Config:** `~/.amux/config.yaml`
- **Entry point:** `python3 amux-server.py 8822 --bind 127.0.0.1 --no-tls` (runit-managed)
- **Registered projects:** zes-system, workspace, claude-code, codex, hermes
- **Features:** Self-healing watchdog, kanban board, session management, YOLO mode

### 9Router AI Gateway (`~/9router/`)
- **Primary role:** LLM request router — API key management, model routing, load balancing
- **Runtime:** Node.js
- **Port:** `:20128` (OpenAI-compatible endpoint + Next.js UI)
- **Config:** `~/9router/.env`, `~/9router/data/`
- **Providers:** OpenAI, Anthropic, Groq, Alibaba, LLM7, free models, and 30+ more

### ZES Dashboard (`~/zes-system-v2/` → `:5050`)
- **Primary role:** Web UI for system control, service status, memory viewer
- **Stack:** React 19 + shadcn/ui + Vite 8 + Tailwind CSS v4
- **Port:** `:5050` (Vite dev server)
- **Backend API:** Flask API on `:5002` (runit-managed)
- **Features:** Service health grid, kanban board, Hermes chat, Claude iframe, architecture topology

---

## 3. Unified Memory Architecture

### Memory Stores

| Store | Location | Type | Agent Access |
|-------|----------|------|-------------|
| ZES Memory Hub | `~/.zes/memory_hub.sqlite` | SQLite + FTS5 | All agents (via sync) |
| Codex stage1_outputs | `~/.codex/memories_1.sqlite` | SQLite | Codex CLI |
| Codex raw memories | `~/.codex/memories/raw_memories.md` | Markdown | Codex CLI |
| Hermes native | `~/.hermes/MEMORY.md` | Markdown | Hermes |
| Hermes skills | `~/.hermes/skills/` | Skill files | Hermes |
| amux transcripts | `~/.amux/transcripts/` | JSONL | amux sessions |
| Claude Code project memory | `~/.claude/projects/*/memory` | SQLite | Claude Code |

### Sync Flow

```
Codex CLI ──zes-memory-sync (120s)──→ ZES Memory Hub ←── Claude Sync (300s)
                                            │
                                     ┌──────┴──────┐
                                     │  zes-memory  │  CLI tool
                                     │  sync daemon │  (runit-managed)
                                     └─────────────┘
```

### ZES Memory Hub CLI
```bash
zes-memory status       # Check hub health & count
zes-memory list 20      # Recent memories
zes-memory search <q>   # FTS5 full-text search
zes-memory write <text> # Write memory entry
```

---

## 4. Port & Service Reference

| Service | Port | Status | Managed By |
|---------|------|--------|------------|
| ZES Dashboard (Vite) | `:5050` | ✅ | runit (zes-dashboard) |
| ZES Flask API | `:5002` | ✅ | runit (zes-flask-api) |
| ZES Memory Sync | — | ✅ | runit (zes-memory-sync) |
| Hermes Dashboard | `:9119` | ✅ | runit (hermes-dashboard) |
| Hermes Gateway | — | ✅ | runit (hermes-gateway) |
| 9Router AI Gateway | `:20128` | ✅ | runit (9router-proxy) |
| amux Control Plane | `:8822` | ✅ | runit (amux) |
| ZES Control Center | `:8083` | ✅ | runit (dashboard8083) |
| Claude Code proxy | `:5905` | ✅ | runit (claude-proxy) |
| Bridge server | `:5300` | ✅ | runit |
| ttyd web terminal | `:7173` | ⬇️ | runit |

---

## 5. Workflow Patterns

### Pattern A: Memory Curation (Default)
1. User chats with any agent (Codex, Hermes, Claude Code)
2. ZES Memory Sync daemon runs every 120s
3. Imports Codex `stage1_outputs` → ZES Memory Hub
4. Exports to Claude Code context at `~/.claude/zes_memory_context.md`

### Pattern B: Parallel Agent Work (via amux)
1. Register a project: `amux register <name> --dir <path> --yolo`
2. Start a session: `amux start <name>`
3. Monitor via web dashboard at `http://127.0.0.1:8822`
4. Self-healing watchdog auto-recovers crashed sessions

### Pattern C: Service Orchestration
1. All services managed by runit — `sv start/stop/restart/status <service>`
2. Dashboard at `:5050` shows service health
3. Flask API at `:5002` provides system info, processes, network, battery

### Pattern D: Multi-Agent Coding
1. Use **Codex CLI** for primary coding (planning, editing, repo management)
2. Use **Claude Code** for parallel tasks (code review, testing, documentation)
3. Use **amux** to run both in parallel tmux sessions
4. ZES Memory Hub syncs context between agents

---

## 6. Skills Ecosystem

### ZES System Skills (29 active)
Skills live in `~/.codex/skills/` and `~/.hermes/skills/`. Key categories:

| Category | Skills |
|----------|--------|
| **Orchestration** | skill-orchestrator, integration, service-orchestrator, dispatching-parallel-agents |
| **Memory** | memory-ops, context-manager, context-budget |
| **Development** | agentic-engineering, subagent-driven-development, executing-plans |
| **Writing** | writing-plans, writing-skills |
| **Review** | requesting-code-review, receiving-code-review |
| **Verification** | quality-gate, verification-before-completion, verification-loop |
| **Debugging** | systematic-debugging, test-driven-development |
| **Infrastructure** | using-git-worktrees, finishing-a-development-branch |
| **Research** | github-research, deep-research, brainstorming, benchmark |
| **Providers** | provider-manager, cost-tracker |
| **Safety** | safety, security-review, security-scan |
| **Design** | design, dashboard-builder, designmd |

### ECC Workflow Skills
Core workflow (tdd-workflow, verification-loop, coding-standards, error-handling), Testing (python-testing, e2e-testing, browser-qa), Frontend (react-patterns, vite-patterns, frontend-a11y), Backend (fastapi-patterns, postgres-patterns, python-patterns, api-design), Research (deep-research, documentation-lookup, exa-search), Discovery (skill-scout, skill-stocktake).

---

## 7. Quick Reference

### Service Management (runit — persists across sessions)
```bash
# Core ZES services
sv start/stop/restart/status zes-flask-api     # Flask API (:5002)
sv start/stop/restart/status zes-dashboard     # Vite Dashboard (:5050)
sv start/stop/restart/status zes-memory-sync   # ZES Memory Hub sync

# Agent services
sv start/stop/restart/status amux              # amux Control Plane (:8822)
sv start/stop/restart/status hermes-gateway    # Hermes gateway
sv start/stop/restart/status hermes-dashboard  # Hermes Dashboard (:9119)

# AI Gateway
sv start/stop/restart/status 9router-proxy     # 9Router AI Gateway (:20128)
```

### Common Commands
```bash
# Quick health check
zes-health

# Memory Hub
zes-mem status          # Hub health
zes-mem list 10         # Recent memories
zes-mem search <query>  # FTS5 search

# Start Codex
npx codexapp             # Codex app-server (:5900)

# Start Claude Code
claude                   # Direct
zes-claude               # With ZES workspace context

# amux
amux list                # List projects
amux start <name>        # Start a session
amux serve               # (runit-managed, on :8822)

# API endpoints
curl http://127.0.0.1:5002/api/health      # System health
curl http://127.0.0.1:5002/api/system      # System info
curl http://127.0.0.1:5002/api/services    # All services
curl http://127.0.0.1:5002/api/summary     # Full summary
```

### IP Rotation & Tor
```bash
# Enable Tor SOCKS5 proxy
bash ~/zes-system-v2-check/scripts/start-ip-rotator.sh start

# Check status
bash ~/zes-system-v2-check/scripts/start-ip-rotator.sh status

# Stop
bash ~/zes-system-v2-check/scripts/start-ip-rotator.sh stop

# Tor runs on :9050, used by credential_pool_strategies for deepseek-v4-flash-free
```

### Key Paths
| Resource | Path |
|----------|------|
| ZES Workspace | `~/Documents/Codex/2026-07-17/system-status/` |
| ZES v2 Repo | `~/zes-system-v2/` |
| Codex Config | `~/.codex/config.toml` |
| Codex Skills | `~/.codex/skills/` (77 skills) |
| ZES Memory Hub DB | `~/.zes/memory_hub.sqlite` |
| ZES Memory CLI | `~/.local/bin/zes-memory` |
| Hermes Source | `~/hermes-agent-full/` |
| Hermes Config | `~/.hermes/config.yaml` |
| Claude Code Config | `~/.claude/` |
| amux Source | `~/amux-fresh/` |
| amux Config | `~/.amux/config.yaml` |
| amux DB | `~/.amux/amux.db` |
| 9Router | `~/9router/` |
| Credentials | `~/.secure-credentials/master.env` |
| ZES Dashboard Source | `~/zes-system-v2/src/` |
| ZES Control Center | `~/dashboard_v4.py` (serves :8083) |
| Design System | `~/zes-system-v2/DESIGN.md` |
