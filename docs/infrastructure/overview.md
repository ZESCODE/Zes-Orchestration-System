# Infrastructure Overview

## Current State (July 2026)

### OS
- **Host:** Android aarch64 (Termux)
- **Init:** runit (runsv) for service supervision
- **RAM:** 7.5 GiB / 11.5 GiB | **Swap:** 6 GiB / 11.5 GiB

### Networking
- All services on localhost (127.0.0.1)
- Multi-transport proxy via claude-oc on `:5905`
  - **1VPN HTTPS proxies** — 3 locations (Singapore, Los Angeles, Amsterdam)
  - **Tor SOCKS5** — on `:9050` for private routing
  - **Direct** — no proxy for testing
- Headless Chromium on `:9222` for browser automation

### Provider Pipeline (v2 — replaces 9Router)

```
Claude Code → claude-oc :5905 → Model Router
  ├── Hermes  → deepseek-v4-flash-free  → 1VPN (Singapore)
  ├── Codex   → nemotron-3-ultra-free   → 1VPN (Los Angeles)
  ├── Claude  → deepseek-v4-flash-free  → 1VPN (Singapore)
  ├── Premium → ling-3.0-flash-free     → 1VPN (Singapore)
  └── Fallback→ gemini-3.6-flash        → Tor
```

All models are **free tier** from OpenCode (opencode.ai/zen/v1).

### Sub-Agent Pipeline
- `zes-subagent` tool for parallel multi-agent execution
- 3 agents simultaneously, each with different model/transport
- Auto-synthesis of results

### Services

| Service | Port | Transport | Status |
|---------|------|-----------|--------|
| claude-oc Proxy | `:5905` | 1VPN/Tor/Direct | Active |
| Tor SOCKS5 | `:9050` | Tor | Active |
| amux Dashboard | `:8822` | Direct | Active |
| ZES Power Agent | `:3099` | stdio/SSE | Active |
| ZES Dashboard | `:5050` | Direct | Active |
| Chromium CDP | `:9222` | Direct | Active |

### Key Improvements from v1
1. **No 9Router** — replaced by single-file Python proxy
2. **No VPN slot needed** — 1VPN uses HTTPS proxies, not system VPN
3. **5x cheaper** — all models free tier
4. **3x faster** — 1VPN gives 1-7s vs Tor's 4-35s
5. **Parallel agents** — threaded proxy handles concurrent requests
6. **Rate-limit isolation** — separate pools per transport+model
