# ZES System — Complete System Documentation

## Quick Reference

```bash
zes status          # all services + health
zes health          # run 20 test suite
zes mcp list        # list MCP bridge tools
zes backup          # snapshot configs
zes restore         # restore from backup
zes restart <svc>   # restart service
zes logs <svc>      # tail logs (20 lines)
zes dashboard       # show dashboard URL
zes-scan            # security hardening scan
```

## System Status (20/20 tests passing, 8/8 health evals)

| Service | Port | Status |
|---------|------|--------|
| 9Router | 20128 | ✅ 18 providers (9 active) |
| Dashboard v4 | 8083 | ✅ SSE real-time · Drawer nav · Mobile-optimized |
| Hermes | — | ✅ 10 cron jobs · MCP layer |
| Claude Code | CLI | ✅ v2.1.207 |
| Codex | 5900 | ✅ API proxy |
| VS Code Server | 8000 | ✅ Web VS Code |
| ttyd | 7173 | ✅ Web terminal |
| Tor | 9050 | ✅ SOCKS5 proxy |
| zeschrome MCP | 5901 | ✅ 18 tools |
| ZES Bridge MCP | stdio | ✅ 10 tools |

## MCP Layer — 6 Servers

Configured in `~/.claude.json` and `~/.hermes/config.yaml`:
- zeschrome (18 tools), zes-bridge (10 tools), chrome-devtools, filesystem, memory, sequential-thinking

## Security Hooks — 6 Active

`config-protection.js`, `gateguard-fact-force.js`, `governance-capture.js`, `insaits-security-monitor.py`, `insaits-security-wrapper.js`, `mcp-health-check.js`

## Skills — 31

Core: zes-testing, zes-autoreview, zes-security-review, zes-bugfix-sweep, zes-dev-patterns, zes-tdd-workflow, zes-mcp-patterns, zes-agent-debugging, zes-verification, zes-evals, zes-research, zes-changelog, zes-heap-leaks, zes-performance, zes-transcript, openclaw-debugging, technical-documentation, gitcrawl-z, gitcrawl-zes, zes-refactor-docs, zes-security-triage

ECC-imported: zes-plan-canvas, zes-coding-standards, zes-backend-patterns, zes-documentation-lookup, zes-frontend-patterns, zes-e2e-testing, zes-benchmark-methodology, zes-strategic-compact, zes-product-capability, zes-agent-introspection-debugging

## Agents — 16

planner, architect, code-reviewer, tdd-guide, security-reviewer, spec-miner, python-reviewer, typescript-reviewer, build-error-resolver, harness-optimizer, e2e-runner, performance-optimizer, loop-operator, code-architect, silent-failure-hunter, doc-updater

## Backup System

- `zes-backup snapshot` — snapshots .9router/, .claude.json, .hermes/, dashboard_v4.py, Zes-System repo
- `zes-backup list` — list all snapshots
- `zes-backup restore` — restore from latest
- Auto-committed to Zes-System git, Hermes cron daily at 04:00

## Dashboard v4 Features

- Real-time SSE push (every 3s): services, MCP, providers
- Left drawer nav with service status + quick links
- Provider heat map with model info
- MCP server status panel
- Hook audit log (auto-refresh 5s)
- ttyd terminal iframe
- Mobile-optimized (480px + 768px breakpoints, swipe gestures)
- Action APIs: restart service, rotate Tor, run evals
