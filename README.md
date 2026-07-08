# Zes-System

> **ZES System** — Self-hosted AI infrastructure: provider router, agent orchestration, and service management on Android/Termux.

## Architecture

```
Termux (Android aarch64) + Debian proot
├── 9Router v0.5.20       — AI provider router (:20128)
├── Hermes Agent          — AI agent framework (:8787)
├── OpenCode              — AI coding agent (:9876)
├── CMDOP/OpenClaw        — Fleet orchestration
├── Composio SDK          — Gmail/API integrations
├── Dashboard             — System dashboard (:8083)
├── Tor                   — Anonymizing proxy (:9050)
├── Headless Chromium     — Browser automation (:9222)
└── runsv (runit)         — Service supervision
```

## Quick Links

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:8083 |
| 9Router | http://localhost:20128 |
| Hermes WebUI | http://localhost:8787 |
| Codex Server | http://localhost:5900 |
| Web Terminal | http://localhost:7173 |
| OpenCode Server | http://localhost:9876 |

## Documentation

- [Infrastructure Overview](docs/infrastructure/overview.md)
- [9Router Provider Config](docs/providers/9router.md)
- [Service Management](docs/services/management.md)
- [Agent Orchestration](docs/agents/orchestration.md)
- [Gmail Integration](docs/guides/gmail.md)
- [Quick Reference](docs/guides/quickref.md)

