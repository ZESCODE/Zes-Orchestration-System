---
name: ZES-benchmark
description: 3-Agent performance benchmarking — Provider latency (Groq) + Service response (OpenRouter) + Resource monitoring (LLM7) + Browser Web Vitals (CDP) in parallel. Real-time system performance analysis.
---

# ZES Benchmark — 3-Agent Edition

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  ⏱  ZES Benchmark (zes bench)                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 0: Local Benchmarks (parallel, ~20s)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ ⚡ Provider   │  │ 🔌 Service  │  │ 🖥️  Resource      │   │
│  │  Benchmarks  │  │  Benchmarks │  │  Monitor          │   │
│  │  All 4 LLMs  │  │  6 services │  │  CPU/Mem/Disk     │   │
│  │  3 attempts  │  │  +runsv     │  │  ZES processes    │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  Phase 1: 3 AI Agents (parallel, ~25s)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ ⚡ Provider  │  │ 🔌 Service  │  │ 🖥️  Resource     │   │
│  │  Groq        │  │ OpenRouter   │  │ LLM7             │   │
│  │  Llama 3.3   │  │ DeepSeek V4  │  │ Codestral        │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘   │
│         │                 │                 │               │
│         ▼                 ▼                 ▼               │
│  Ranking by speed     Uptime status      CPU/Mem analysis   │
│  Reliability          Bottlenecks        Disk capacity      │
│  Recommendations      Recommendations    Recommendations   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## The 3 Benchmark Agents

| Agent | Provider | Model | Measured Metrics |
|-------|----------|-------|------------------|
| **Provider Benchmarker** | Groq | Llama 3.3 | Response times, reliability, ranking across 4 LLM providers |
| **Service Benchmarker** | OpenRouter | DeepSeek V4 Flash | Endpoint latency, uptime, runsv daemon health |
| **Resource Monitor** | LLM7 | Codestral Latest | CPU load, memory usage, disk capacity, ZES process analysis |

## Pipeline

```
Phase 0: Local Benchmarks (parallel, ~20s)
  ├── Provider benchmarks: 4 providers × 3 attempts each
  │   └── Groq, OpenRouter, LLM7, OpenCode Zen
  ├── Service benchmarks: 6 endpoints + 3 runsv daemons
  │   └── BitRouter (:4356), AI-Proxy (:20129), Dashboard (:5050),
  │       Claude Chat (:3000), Hermes (:9119), amux (:8822)
  ├── Resource monitoring: top, free, df, ps, uptime
  │   └── CPU top 5, Memory top 5, Disk usage, ZES processes
  └── Browser Web Vitals: CDP-based LCP, CLS, INP measurement
      └── Dashboard (:5050), Claude Chat (:3000), Hermes (:9119)

Phase 1: 3 AI Agents (parallel, ~25s)
  ├── Provider Benchmarker → RANKING + AVERAGES + RELIABILITY + RECOMMENDATIONS
  ├── Service Benchmarker → SERVICE_STATUS + UPTIME + BOTTLENECKS
  └── Resource Monitor → CPU + MEMORY + DISK + PROCESSES + CAPACITY

Phase 2: Combined Report
  └── Raw data + AI analysis printed to terminal
```

## CLI Usage

```
zes bench                            # Full benchmark suite
zes bench --quick                    # Local benchmarks only (no AI)
zes bench --providers                # Provider benchmarks only
zes bench --services                 # Service benchmarks only
zes bench --resources                # Resource monitoring only
zes bench --save ~/bench-report.md   # Save full report to file
zes bench --url http://localhost:4356  # Custom service URL
zes bench --web-vitals              # Browser Web Vitals only
zes bench --web-vitals --url http://localhost:7070  # Custom URL for vitals
```

### Examples

```
# Quick provider speed comparison
zes bench --providers --quick

# Monthly benchmark run (save for trend tracking)
zes bench --save ~/bench-$(date +%Y%m%d).md

# Check why system is slow
zes bench --resources

# Full system performance review
zes bench
```

## Android Device Metrics (Real Device)

Since ZES runs on a mobile device, benchmark the device's real-time health alongside provider/services.

### Measured Metrics

| Metric | Command | What It Shows |
|--------|---------|---------------|
| Battery Level | `termux-battery-status` | Remaining % | 
| Battery Temp | `termux-battery-status` | Temperature °C (thermal throttling indicator) |
| Charging | `termux-battery-status` | plugged/unplugged |
| CPU Load | `uptime` | Load average (1/5/15 min) |
| Memory Pressure | `free -h` | Total/used/available + swap |
| Storage | `df -h ~` | Available space |
| Network Type | `termux-wifi-connectioninfo` | WiFi SSID or mobile data |
| Signal Strength | `termux-wifi-connectioninfo` | RSSI in dBm |
| Uptime | `uptime` | Hours since last boot |

### CLI Usage
```bash
zes bench --device           # Android device metrics only
zes bench --all              # Full suite including device metrics
```

### Quick Device Health
```bash
# Take a snapshot of device health
device_bench() {
    echo "=== Device Health Snapshot ==="
    battery=$(termux-battery-status)
    echo "🔋 $(echo $battery | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f"{d[\"percentage\"]}% | {d[\"temperature\"]}°C | plugged={d[\"plugged\"]}")')"
    echo "📡 $(termux-wifi-connectioninfo 2>/dev/null | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f"{d.get(\"ssid\",\"N/A\")} | {d.get(\"rssi\",0)}dBm")' 2>/dev/null || echo 'No WiFi')" 
    echo "💾 $(df -h ~ | tail -1 | awk '{print $3}') / $(df -h ~ | tail -1 | awk '{print $2}') ($(df -h ~ | tail -1 | awk '{print $5}'))"
    echo "🖥️  $(uptime | sed 's/.*up //' | sed 's/,.*//')"
}

# Before any benchmark run, log device state
device_bench >> ~/bench-device-log.csv
```

### Battery Drain During Benchmarks
```bash
# Measure battery impact of LLM provider benchmarks
before=$(termux-battery-status | python3 -c "import sys,json; print(json.load(sys.stdin)['percentage'])")
# ... run benchmarks ...
after=$(termux-battery-status | python3 -c "import sys,json; print(json.load(sys.stdin)['percentage'])")
echo "Battery drain: $((before - after))% during benchmark"
```

### Thermal Throttling Detection
```bash
# Run before/after to detect thermal throttling
temp_before=$(termux-battery-status | python3 -c "import sys,json; print(json.load(sys.stdin)['temperature'])")
# ... run heavy benchmark ...
sleep 2
temp_after=$(termux-battery-status | python3 -c "import sys,json; print(json.load(sys.stdin)['temperature'])")
echo "Temperature delta: $(echo "$temp_after - $temp_before" | bc)°C"
if [ "$(echo "$temp_after > 42.0" | bc)" -eq 1 ]; then
    echo "⚠️  Thermal throttling likely — results may be slower than normal"
fi
```

## Pair With
- `ZES-safety` — Device health pre-flight checks before benchmarking
- `shared_skills/android` — Full Android device access reference

## Browser Web Vitals (CDP-based)

Uses Chrome DevTools Protocol to measure real browser performance metrics for web UI services. Requires Chromium with CDP on :9222.

### Measured Metrics

| Metric | Description | Good | Needs Work | Poor |
|--------|-------------|------|------------|------|
| **LCP** | Largest Contentful Paint | ≤2.5s | ≤4.0s | >4.0s |
| **CLS** | Cumulative Layout Shift | ≤0.1 | ≤0.25 | >0.25 |
| **INP** | Interaction to Next Paint | ≤200ms | ≤500ms | >500ms |
| **FCP** | First Contentful Paint | ≤1.8s | ≤3.0s | >3.0s |
| **DOM Nodes** | Document Object Model count | <1500 | <3000 | >3000 |
| **JS Heap** | JavaScript heap usage | <50MB | <100MB | >100MB |

### Measurement Commands

```bash
# Quick vitals check on dashboard
browser-harness <<'PY'
new_tab("http://localhost:5050")
import time, json
time.sleep(3)  # Wait for full load
# Get performance metrics via CDP
result = cdp("Performance.getMetrics")
metrics = {i["name"]: i["value"] for i in result["result"]["metrics"]}
print(f"JS Heap: {metrics['JSHeapUsedSize']/1024:.0f}KB")
print(f"DOM Nodes: {metrics['DOMNodes']}")
print(f"Layouts: {metrics['LayoutCount']}")
print(f"Script Duration: {metrics['ScriptDuration']*1000:.0f}ms")
print(f"Task Duration: {metrics['TaskDuration']*1000:.0f}ms")
PY

# Full CDP audit with screenshot
python3 << 'CDPEOF'
import asyncio, json, websockets, urllib.request, base64
async def web_vitals(url):
    targets = json.loads(urllib.request.urlopen('http://127.0.0.1:9222/json').read())
    tab = next((t for t in targets if t['type'] == 'page'), None)
    if not tab: return print("No browser tab")
    async with websockets.connect(tab['webSocketDebuggerUrl']) as ws:
        for d in ['Page','Performance']:
            await ws.send(json.dumps({'id':1,'method':d+'.enable'})); await ws.recv()
        await ws.send(json.dumps({'id':2,'method':'Page.navigate','params':{'url':url}}))
        await ws.recv(); await asyncio.sleep(3)
        await ws.send(json.dumps({'id':3,'method':'Performance.getMetrics'}))
        r = json.loads(await ws.recv())
        m = {i['name']:i['value'] for i in r['result']['metrics']}
        print(f"URL: {url}")
        print(f"  JS Heap: {m['JSHeapUsedSize']/1024:.0f}KB")
        print(f"  DOM Nodes: {m['DOMNodes']}")
        print(f"  Layouts: {m['LayoutCount']}")
        print(f"  Scripts: {m['ScriptDuration']*1000:.0f}ms")
        print(f"  Tasks: {m['TaskDuration']*1000:.0f}ms")
        print(f"  Nodes: {m['Nodes']}")
        print(f"  JS Event Listeners: {m['JSEventListeners']}")
asyncio.run(web_vitals("http://localhost:5050"))
CDPEOF
```

### Mobile Web Vitals
Measure browser performance on mobile viewport (important since mobile CPUs/GPUs are slower):
```bash
python3 << 'CDPEOF'
import asyncio, json, websockets, urllib.request

async def mobile_vitals(url):
    targets = json.loads(urllib.request.urlopen('http://127.0.0.1:9222/json').read())
    tab = next((t for t in targets if t['type'] == 'page'), None)
    if not tab: return
    async with websockets.connect(tab['webSocketDebuggerUrl']) as ws:
        async def cmd(m, p=None):
            await ws.send(json.dumps({'id':1,'method':m,'params':p or {}}))
            return json.loads(await ws.recv())
        # Enable + mobile emulation
        for d in ['Page','Performance']:
            await cmd(d+'.enable')
        await cmd('Emulation.setDeviceMetricsOverride', {'width':390,'height':844,'deviceScaleFactor':3,'mobile':True})
        await cmd('Page.navigate', {'url': url})
        await asyncio.sleep(4)
        r = await cmd('Performance.getMetrics')
        m = {i['name']:i['value'] for i in r['result']['metrics']}
        print(f"Mobile Vitals — {url}")
        print(f"  JS Heap: {m['JSHeapUsedSize']/1024:.0f}KB")
        print(f"  DOM Nodes: {m['DOMNodes']}")
        print(f"  Layouts: {m['LayoutCount']}")
        print(f"  Scripts: {m['ScriptDuration']*1000:.0f}ms")
        print(f"  Tasks: {m['TaskDuration']*1000:.0f}ms")
        await cmd('Emulation.clearDeviceMetricsOverride')

asyncio.run(mobile_vitals('http://localhost:5050'))
CDPEOF
```

### CLI Integration

```bash
zes bench --web-vitals                    # Measure vitals on all web services
zes bench --web-vitals --url :5050        # Specific dashboard URL
zes bench --all                           # Full suite including web vitals
```

## Pair With

- `browser-harness` — Interactive CDP control for deeper investigation
- `cdp-audit` — Full CDP diagnostic suite
- `browser-qa` — Visual regression and smoke testing

## Measured Providers

| Provider | Model | Auth | Test |
|----------|-------|------|------|
| Groq | Llama 3.3 70B | Bearer | "Hello from ZES" × 3 |
| OpenRouter | DeepSeek V4 Flash | Bearer | "Hello from ZES" × 3 |
| LLM7 | Codestral Latest | Bearer | "Hello from ZES" × 3 |
| OpenCode Zen | MiMo-V2.5 Free | X-API-Key | "Hello from ZES" × 3 |

## Measured Services

| Service | Port | Tests |
|---------|------|-------|
| BitRouter | :4356 | /v1/models latency |
| AI-Proxy | :20129 | /v1/models latency |
| OpenClaude Dashboard | :5050 | Page load time |
| Claude Chat | :3000 | Page load time |
| Hermes Dashboard | :9119 | Health check |
| amux | :8822 | API health |

Plus runsv daemon status for bitrouter, ai-proxy, tor.

## Resource Metrics

| Metric | Command | What We See |
|--------|---------|-------------|
| CPU | `ps aux --sort=-%cpu \| head -6` | Top consumer, load average |
| Memory | `free -h` + `ps aux --sort=-%mem` | Total/used/available, swap |
| Disk | `df -h ~` | Usage %, available space |
| ZES Processes | `ps aux \| grep python\|node` | PID, CPU%, MEM%, command |
| Uptime | `uptime` | Load average, uptime days |

## When to Run

| Scenario | Command | Why |
|----------|---------|-----|
| **Monthly system health** | `zes bench --save ~/bench.md` | Track performance trends |
| **Before/after upgrade** | `zes bench --providers` | Check if new provider is faster |
| **System feels slow** | `zes bench --resources` | Find CPU/memory bottleneck |
| **Service down** | `zes bench --services` | Quick uptime check |
| **Provider comparison** | `zes bench --providers` | Which is fastest today? |

## Real Results (2026-07-24)

### Providers (fastest → slowest)
| Provider | Avg Response | Status |
|----------|-------------|--------|
| Groq (Llama 3.3) | **308ms** | 🟢 Fastest |
| LLM7 (Codestral) | **642ms** | 🟢 |
| OpenRouter (DeepSeek V4) | **1848ms** | 🟢 |
| OpenCode Zen (MiMo) | **Error** | 🔴 HTTP 500 |

### Services
| Service | Response | Status |
|---------|----------|--------|
| AI-Proxy | **11ms** | 🟢 |
| BitRouter | **14ms** | 🟢 |
| amux | **13ms** | 🟢 |
| Hermes Dashboard | **32ms** | 🟢 |
| OpenClaude Dashboard | **79ms** | 🟢 |
| Claude Chat | **DOWN** | 🔴 |

### Resources
| Metric | Value | Assessment |
|--------|-------|------------|
| RAM | 6.9/11GB used (63%) | 🟡 Moderate |
| Swap | 6.1/11GB used (55%) | 🟡 Moderate |
| Disk | 178/228GB used (79%) | 🟡 Getting full |
| Load Avg | 19.11 | 🔴 High load |

## Pair With

- `browser-harness` — Interactive CDP control for deeper Web Vitals investigation
- `cdp-audit` — Full CDP diagnostic suite for detailed performance analysis
- `browser-qa` — Visual regression testing after performance optimization
- `ZES-cost-tracker` — Combine benchmark speed data with cost data for value analysis
- `ZES-model-router` — Use benchmark results to optimize routing
- `ZES-service-orchestrator` — Restart services found DOWN in benchmarking
- `ZES-systematic-debugging` — Debug performance bottlenecks found here
