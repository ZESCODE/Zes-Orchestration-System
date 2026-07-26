# Agent Trinity — ZES Three-Agent Architecture

**Updated:** 2026-07-26  
**Version:** 3.8.0

---

## Overview

ZES orchestrates three AI agents — Codex CLI, Claude Code, and Hermes — each with distinct roles, personalities, and domains of responsibility. They share skills, memory, and infrastructure but operate in well-defined lanes.

```
┌─────────────────────────────────────────────────────────────┐
│                    ZES Agent Trinity                         │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Codex CLI     │  │   Claude Code    │  │   Hermes    │ │
│  │  The Sharp      │  │  The Face &      │  │  The Steady  │ │
│  │  Scalpel        │  │  Bridge          │  │  Hand        │ │
│  │                 │  │                  │  │              │ │
│  │ • Builds        │  │ • Reviews        │  │ • Remembers  │ │
│  │ • Codes         │  │ • Parallelizes   │  │ • Orchestr.  │ │
│  │ • Deploys       │  │ • UIs            │  │ • Curates    │ │
│  │ • Tests         │  │ • Polishes       │  │ • Synthesiz. │ │
│  └────────┬────────┘  └────────┬─────────┘  └──────┬──────┘ │
│           │                    │                     │        │
│           └──────────┬─────────┴────────────────────┘        │
│                      ▼                                       │
│            ┌────────────────────┐                            │
│            │  ZES Memory Hub    │  (shared truth layer)      │
│            │  224 memories      │                            │
│            └────────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Agent Profiles

### Codex CLI — The Sharp Scalpel
| Attribute | Description |
|-----------|-------------|
| **Role** | Primary coding agent — execution & engineering |
| **Motto** | *"Unverified code is broken code. Done is a test pass."* |
| **Config** | `~/.codex/AGENTS.md` (v1.2.0) |
| **Soul** | `docs/agents/codex-soul.md` |
| **Strengths** | 4-Phase QC workflow, 82+ skills, TDD, CDP diagnostics |
| **Weaknesses** | Can over-engineer if not constrained; follows procedure rigidly |

### Claude Code — The Face & Bridge
| Attribute | Description |
|-----------|-------------|
| **Role** | Secondary coding agent — review, parallel work, bridge |
| **Motto** | *"Code it right, test it clean, ship it with confidence."* |
| **Config** | `~/.claude/AGENTS.md` (v1.0.0) |
| **Soul** | `docs/agents/claude-soul.md` |
| **Strengths** | Code review, parallel execution, accessibility, user-facing UI |
| **Weaknesses** | Not the primary coder; relies on Codex for heavy lifting |

### Hermes — The Steady Hand
| Attribute | Description |
|-----------|-------------|
| **Role** | Orchestrator, memory curator, self-improvement engine |
| **Motto** | *"I build to create continuity."* |
| **Config** | `~/.hermes/config.yaml`, `~/.hermes/SOUL.md` |
| **Soul** | `docs/agents/hermes-soul.md` |
| **Strengths** | Memory hub management, cross-session continuity, conflict resolution |
| **Weaknesses** | No direct file editing capability; relies on Codex/Claude for execution |

---

## Interaction Model

```
User Request
    │
    ├──→ Is it coding?        → Codex (primary) or Claude (parallel)
    ├──→ Is it memory?        → Hermes (curate/search)
    ├──→ Is it review?        → Claude (review) + Hermes (persist decisions)
    └──→ Is it self-improve?  → Hermes (nightly self-review)
```

### Parallel Workflows
When the user requests two independent tasks:
1. Codex takes the primary task (execution)
2. Claude takes the secondary task (review, UI, parallel)
3. Hermes monitors both and persists decisions

### Conflict Resolution
| Conflict | Resolution |
|----------|-----------|
| Code style disagreement | Hermes checks memory hub for explicit user preference |
| Duplicate implementations | Claude reviews both, selects best, Hermes records decision |
| Memory contradiction | Newest explicit user confirmation wins (with timestamp) |

---

## Shared Resources

| Resource | Path | Managed By |
|----------|------|------------|
| Memory Hub | `~/.zes/memory_hub.sqlite` (224 memories) | Hermes |
| Skills | `~/.codex/skills/` (82+ skills) | Shared |
| Power Agent | `~/Zes-System/power-agent/` (38 tools) | Codex |
| Dashboard | `zes-dashboard.vercel.app` (Vercel) | Codex |
| MCP Servers | GitHub, Context7, Exa, Memory, Playwright, CDP, Notion | Shared |
