---
name: ZES-safety
description: Safety checks — prevent destructive operations on production systems, verify rollback capability, and validate before autonomous actions.
metadata:
  origin: ZES
  version: 1.0.0
---

# ZES Safety

Prevents destructive operations across the ZES production ecosystem.

## Production Safeguards
- **No** deleting Cloudflare Pages projects without confirmation
- **No** modifying `~/.zes/memory_hub.sqlite` without backup
- **No** overwriting `~/.codex/config.toml` without review
- **No** revoking API keys without replacement

## Before Any Destructive Operation
1. Backup affected data
2. Verify rollback path exists
3. Check for dependent services
4. Get user confirmation for production changes

## Secret Management
- NEVER hardcode API keys in files
- Use env vars or `~/.zes/.env`
- Rotate keys after any suspected exposure


## Android Device Safety Guards

Since ZES runs on a mobile device, check device health before resource-intensive operations.

### Battery Check
```bash
# Before long-running operations, verify sufficient charge
battery=$(termux-battery-status)
level=$(echo "$battery" | python3 -c "import sys,json; print(json.load(sys.stdin)['percentage'])")
charging=$(echo "$battery" | python3 -c "import sys,json; print(json.load(sys.stdin)['plugged'])")

if [ "$level" -lt 20 ] && [ "$charging" = "false" ]; then
  echo "⚠️  Battery at ${level}% and not charging. Cancel or connect charger."
  exit 1
fi
```

### Thermal Check
```bash
# Check battery temperature before heavy CPU/GPU work
temp=$(termux-battery-status | python3 -c "import sys,json; print(json.load(sys.stdin)['temperature'])")
if [ "$(echo "$temp > 40.0" | bc)" -eq 1 ]; then
  echo "🔥 Battery at ${temp}°C — too hot for intensive operations. Cool down first."
  exit 1
fi
```

### Storage Check
```bash
# Verify sufficient free space before downloads or builds
avail=$(df -h ~ | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$(echo "$avail < 1.0" | bc)" -eq 1 ]; then
  echo "💾 Only ${avail}GB free — need >1GB. Clean up before proceeding."
  exit 1
fi
```

### Network Check (for downloads/API calls)
```bash
# Check WiFi connectivity before large downloads
wifi=$(termux-wifi-connectioninfo 2>/dev/null)
if [ -z "$wifi" ] || [ "$(echo "$wifi" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('supplicant_state','')=='COMPLETED')")" = "False" ]; then
  echo "📡 Not connected to WiFi. Large downloads may use mobile data."
  echo "   Set ZES_ALLOW_MOBILE_DATA=1 to proceed anyway."
  [ "${ZES_ALLOW_MOBILE_DATA:-0}" != "1" ] && exit 1
fi
```

### Combined Pre-Flight Check
```bash
# Full device health check before any heavy operation
termux-battery-status > /dev/null || { echo "❌ Battery service unavailable"; exit 1; }
battery=$(termux-battery-status)
level=$(echo "$battery" | python3 -c "import sys,json; print(json.load(sys.stdin)['percentage'])")
temp=$(echo "$battery" | python3 -c "import sys,json; print(json.load(sys.stdin)['temperature'])")
charging=$(echo "$battery" | python3 -c "import sys,json; print(json.load(sys.stdin)['plugged'])")

echo "🔋 ${level}% | 🌡️  ${temp}°C | 🔌 $( [ '$charging' = 'true' ] && echo 'Charging' || echo 'Battery' )"
storage=$(df -h ~ | tail -1 | awk '{print $4}')
echo "💾 Free: ${storage}"

[ "$level" -lt 15 ] && [ "$charging" = "false" ] && echo "❌ Battery critical" && exit 1
[ "$(echo "$temp > 42.0" | bc)" -eq 1 ] && echo "❌ Overheating" && exit 1
echo "✅ Device health OK"
```

## Pair With
- `shared_skills/android` — Full Android device access reference (camera, sensors, clipboard, intents)
- `ZES-service-orchestrator` — Device-aware service scheduling
- `ZES-benchmark` — Device performance metrics before/after operations
