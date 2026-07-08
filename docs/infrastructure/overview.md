# Infrastructure Overview

## Platform

- **Host:** Android (aarch64) via Termux
- **Container:** Debian trixie via proot-distro
- **Shell:** bash
- **Python:** 3.13.13 (stdlib only for custom apps)
- **Node:** v26.3.1

## Service Supervision (runsv)

All services are managed by **runit** (`runsv`) and auto-start with Termux.

### Active Services

| Service | Port | Runs In | Wrapper |
|---------|------|---------|---------|
| Codex App Server | 5900 | Termux | Direct |
| Web Terminal (ttyd) | 7173 | Termux | Direct |
| Socat Bridge | 8090 | Termux | Direct |
| Hermes Gateway | 8787 | Termux | Direct |
| 9Router | 20128 | Termux | Direct (manual start) |
| Tor SOCKS5 | 9050 | Termux | Direct |
| SSH Server | 8022 | Termux | Direct |
| OpenCode Server | 9876 | Proot | `proot-distro login debian -- lildax` |
| Browser CDP | 9222 | Proot | `proot-distro login debian -- chromium` |
| CMDOP Agent | — | Proot | `proot-distro login debian -- cmdop` |
| Dashboard | 8083 | Termux | Direct |

### Service Directory

```
/data/data/com.termux/files/usr/var/service/
├── chromium-cdp/
├── cmdop-agent/
├── dashboard8083/
├── hermes-gateway/
├── opencode/
├── ssh-agent/
├── sshd/
├── tor/
├── tx11/
└── tx11-xfce4/
```

### Commands

```bash
sv status <service>           # Check status
sv restart <service>          # Restart
sv start <service>            # Start
sv stop <service>             # Stop
sv status /data/data/com.termux/files/usr/var/service/*  # List all
```

## Network

- All services bind to `127.0.0.1` (localhost-only)
- SSH on port 8022 for remote access
- Tor SOCKS5 on port 9050 for anonymized outbound requests
- Proxy pool in 9router routes through Tor for privacy
