# ZES System — Unified Personal AI

ZES orchestrates three AI agents (Codex CLI, Claude Code, Hermes) plus supporting services (9Router AI Gateway, amux Control Plane, ZES Dashboard) on Termux Android.

## Quick Start

```bash
# Clone
git clone https://github.com/ZESCODE/Zes-System.git ~/Zes-System
cd ~/Zes-System

# Deploy services (copies runit scripts to /var/service)
sudo ./scripts/deploy-services.sh

# Health check
curl http://127.0.0.1:5002/api/health
```

## Architecture

```
Codex (coder) ──┐
Claude (review) ─┤── 9Router (:20128) ──→ LLM providers
Hermes (memory) ─┘
       │
       └── ZES Memory Hub (SQLite+FTS5)
       └── ZES Dashboard (:5050)
       └── amux Control Plane (:8822)
```

## Docs

See [AGENTS.md](AGENTS.md) for full system documentation:
- Agent roles & workflow
- Service management
- Memory architecture
- Skills (81 across 14 categories)
- Port & path reference

## Services

| Service | Port | Runit | 
|---------|------|-------|
| ZES Dashboard | `:5050` | `zes-dashboard` |
| Flask API | `:5002` | `zes-flask-api` |
| 9Router | `:20128` | `9router-proxy` |
| amux | `:8822` | `amux` |
| Hermes | `:9119` | `hermes-dashboard` |
| Claude Proxy | `:5905` | `claude-proxy` |

## License

MIT
