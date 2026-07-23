---
name: ZES-benchmark
description: 3-Agent performance benchmarking — Provider latency (Groq) + Service response (OpenRouter) + Resource monitoring (LLM7) in parallel. Real-time system performance analysis.
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
  └── Resource monitoring: top, free, df, ps, uptime
      └── CPU top 5, Memory top 5, Disk usage, ZES processes

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

- `ZES-cost-tracker` — Combine benchmark speed data with cost data for value analysis
- `ZES-model-router` — Use benchmark results to optimize routing
- `ZES-service-orchestrator` — Restart services found DOWN in benchmarking
- `ZES-systematic-debugging` — Debug performance bottlenecks found here
