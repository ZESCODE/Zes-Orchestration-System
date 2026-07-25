---
name: ZES-service-orchestrator
description: Manage all ZES services — start, stop, monitor, and route between 9Router, Hermes, OpenClaude, Dashboard, and Codex CLI. Unified service lifecycle for the ZES ecosystem.
metadata:
  origin: ZES
  version: 1.0.0
  services:
    - ninerouter (:20128)
    - hermes (:9119)
    - openclaude
    - dashboard (:5173)
    - old-zes-core (:8082)
---

# ZES Service Orchestrator

Manages the full **ZES ecosystem**: 9Router AI Gateway, Hermes Agent, OpenClaude, System Dashboard, Old ZES Core dev reference. Every service, one skill.

## Service Registry

| Service | Port | Purpose | Start Command |
|---------|------|---------|--------------|
| **9Router** | :20128 | AI model gateway | `cd ~/9router && node server.js &` |
| **Hermes** | :9119 | Agent dashboard + chat | `cd ~/Documents/Codex/2026-07-12/system-status/hermes-agent && python3 run_agent.py &` |
| **Dashboard** | :5173 | ZES main dashboard | `cd ~/Documents/Codex/2026-07-12/system-status && bash start-dashboard.sh` |
| **Old ZES Core** | :8082 | Dev reference / legacy | `cd ~/zes-core/site && python3 server.py &` |
| **OpenClaude** | — | Terminal chat UI | `cd ~/openclaude && bun run start` |

## Quick Status

```bash
# Check all services
for p in 20128 9119 5173 8082; do
  curl -s -o /dev/null -w ":%p → %{http_code}" http://localhost:$p && echo "" || echo ":$p → DOWN"
done
```

## Service Lifecycle

```bash
# Start all
cd ~/Documents/Codex/2026-07-12/system-status && bash start-dashboard.sh

# Stop specific
kill $(lsof -ti :5173) 2>/dev/null
kill $(lsof -ti :9119) 2>/dev/null
```

## Android Device-Aware Operations

Since ZES runs on a mobile device, check device state before starting/stopping services.

### Battery-Aware Scheduling
```bash
# Before starting all services — check battery
battery=$(termux-battery-status)
level=$(echo "$battery" | python3 -c "import sys,json; print(json.load(sys.stdin)['percentage'])")
charging=$(echo "$battery" | python3 -c "import sys,json; print(json.load(sys.stdin)['plugged'])")

if [ "$level" -lt 20 ] && [ "$charging" = "false" ]; then
    echo "⚠️  Battery ${level}% — starting only essential services (9Router, Dashboard)"
    # Start minimal set only
    sv start 9router-proxy
    sv start zes-dashboard
    # Skip heavy services
    # sv start hermes-gateway
    # sv start amux
elif [ "$level" -lt 10 ]; then
    echo "🔴 Battery ${level}% — stopping non-essential services"
    sv stop hermes-gateway 2>/dev/null
    sv stop amux 2>/dev/null
    sv stop zes-memory-sync 2>/dev/null
    echo "⚠️  Running with minimal footprint until charging"
fi
```

### WiFi-Aware Routing
```bash
# Check network type before starting network-heavy services
wifi_info=$(termux-wifi-connectioninfo 2>/dev/null)
on_wifi=$(echo "$wifi_info" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('supplicant_state','')=='COMPLETED')" 2>/dev/null || echo "false")

if [ "$on_wifi" = "true" ]; then
    echo "📡 On WiFi — full service mode"
    # Start all services including model downloads, memory sync
else
    echo "📱 On mobile data — reduced network mode"
    # Skip large downloads, batch syncs
    export ZES_LIMITED_NETWORK=1
fi
```

### Device Sleep Prevention
```bash
# Prevent device sleep during critical operations
termux-wake-lock acquire zes_service_run
# ... run services ...
termux-wake-lock release zes_service_run
```

### Device Health Status Command
```bash
# Quick device health check for service planning
zes device-status() {
    battery=$(termux-battery-status)
    level=$(echo "$battery" | python3 -c "import sys,json; print(json.load(sys.stdin)['percentage'])")
    temp=$(echo "$battery" | python3 -c "import sys,json; print(json.load(sys.stdin)['temperature'])")
    charging=$(echo "$battery" | python3 -c "import sys,json; print(json.load(sys.stdin)['plugged'])")
    wifi=$(termux-wifi-connectioninfo 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ssid','unknown'))" 2>/dev/null)
    storage=$(df -h ~ | tail -1 | awk '{print $4}')
    
    echo "🔋 ${level}% | 🌡️  ${temp}°C | 🔌 $( [ '$charging' = 'true' ] && echo 'Charging' || echo 'Battery' )"
    echo "📡 ${wifi:-No WiFi} | 💾 ${storage} free"
}
```

## Browser Health Checks

For web UI services, use **browser-harness** to verify pages load correctly — goes beyond HTTP status codes to check actual rendering.

### Quick Health Check
```bash
browser-harness <<'PY'
import time, os
services = [
    ("ZES Dashboard", "http://localhost:5050"),
    ("Hermes", "http://localhost:9119"),
    ("Claude Chat", "http://localhost:3000"),
    ("amux", "http://localhost:8822"),
]
for name, url in services:
    try:
        new_tab(url)
        time.sleep(2)
        info = page_info()
        status = "✅" if info["title"] and info["w"] > 0 else "⚠️"
        print(f"{status} {name}: {info['title'][:50]} @ {url}")
    except Exception as e:
        print(f"❌ {name}: {str(e)[:60]}")
PY
```

### Mobile Health Check
Verify each web service renders correctly on mobile viewport:
```bash
browser-harness <<'PY'
import time
cdp("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=3, mobile=True)
cdp("Emulation.setUserAgentOverride", userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")

services = [
    ("ZES Dashboard", "http://localhost:5050"),
    ("Hermes", "http://localhost:9119"),
    ("amux", "http://localhost:8822"),
]
for name, url in services:
    new_tab(url)
    time.sleep(2)
    info = page_info()
    # Check no horizontal overflow on mobile
    result = cdp("Runtime.evaluate", expression="document.body.scrollWidth <= window.innerWidth")
    no_overflow = result.get("result", {}).get("value", False)
    icon = "✅" if no_overflow else "⚠️"
    print(f"{icon} {name}[mobile {info['w']}x{info['h']}]: overflow={no_overflow}")

# Reset viewport
cdp("Emulation.clearDeviceMetricsOverride")
cdp("Emulation.setUserAgentOverride", userAgent="")
PY
```

### Deep Health Check (CDP Audit)
Use `cdp-audit` for comprehensive service health:
- Console errors present?
- Page loads within threshold?
- JS heap within limits?
- Network requests all 2xx?

### Integration with Service Status
Add browser health to the quick status command:
```bash
# Extended health check with browser verification
browser-harness --doctor 2>&1 | grep "ok" && echo "CDP: ✅" || echo "CDP: ❌"
for url in http://localhost:5050 http://localhost:9119 http://localhost:8822; do
    curl -so /dev/null -w "%{http_code}" "$url" && echo " $url" || echo " DOWN $url"
done
```

## Pair With

- `browser-harness` — Interactive browser service checks
- `browser-qa` — Structured QA workflow for service UIs
- `cdp-audit` — Deep CDP diagnostics for failing services

## Design Doc

`docs/superpowers/specs/2026-07-14-zes-memory-hub-design.md`
`docs/superpowers/plans/2026-07-14-zes-memory-hub-implementation.md`
