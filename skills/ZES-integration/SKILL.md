---
name: ZES-integration
description: 3-Agent integration verification — Service Tester (Groq) + Contract Verifier (OpenRouter) + Dependency Analyzer (LLM7) in parallel. Cross-component integration health check.
---

# ZES Integration — 3-Agent Edition

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  🔌 ZES Integration (zes integrate --dir ~/project)          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 0: Local Scans (instant parallel)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Import scan  │  │ API endpoint │  │ Dependency       │   │
│  │ All imports  │  │ Flask/Fast   │  │ requirements.*   │   │
│  │ Circular?    │  │ HTTP calls   │  │ package.json     │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  Phase 1: 3 AI Agents (parallel, ~25s)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ 🔌 Service   │  │ 📋 Contract  │  │ 🧩 Dependency    │   │
│  │  Tester      │  │  Verifier    │  │  Analyzer        │   │
│  │  Groq        │  │ OpenRouter   │  │ LLM7             │   │
│  │  Llama 3.3   │  │ DeepSeek V4  │  │ Codestral        │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘   │
│         │                 │                 │               │
│         ▼                 ▼                 ▼               │
│  Service boundaries   API contracts      Dependency graph  │
│  Data flow            Type consistency   Version conflicts │
│  Error handling       Auth/errors        Circular deps     │
│                                                              │
│  Phase 2: Synthesizer → HEALTHY / WARNING / BROKEN verdict  │
└──────────────────────────────────────────────────────────────┘
```

## The 3 Integration Agents

| Agent | Provider | Model | Focus |
|-------|----------|-------|-------|
| **Service Tester** | Groq | Llama 3.3 70B | Service boundaries, data flow, error handling, communication |
| **Contract Verifier** | OpenRouter | DeepSeek V4 Flash | API contracts, request/response formats, type consistency, auth |
| **Dependency Analyzer** | LLM7 | Codestral Latest | Dependency graph, version conflicts, circular deps, imports |

## Pipeline

```
Phase 0: Local Scans (instant)
  ├── Import scanner — all imports per file, external/internal deps, circular detection
  ├── API endpoint scanner — Flask/FastAPI routes, HTTP calls (requests/urlopen), config URLs
  └── Dependency file scanner — requirements.txt, pyproject.toml, package.json, unpinned imports

Phase 1: 3 AI Agents (~25s)
  ├── Service Tester → SERVICE_BOUNDARIES + INTEGRATION_ISSUES + DATA_FLOW + ERROR_HANDLING
  ├── Contract Verifier → CONTRACTS_FOUND + BREACHES + TYPE_MISMATCHES + DOC_SYNC
  └── Dependency Analyzer → GRAPH + CONFLICTS + CYCLES + MISSING

Phase 2: Synthesizer (single call, ~3s)
  └── Top 5 Issues → Integration Health → Quick Wins → Architecture Recommendations
```

## CLI Usage

```
zes integrate                            # Full integration check on current dir
zes integrate --dir ~/project            # Specific project
zes integrate --service api              # Focus on specific service/component
zes integrate --quick                     # Local scans + summary (no full AI)
zes integrate --ci                        # CI mode — exit 1 on BROKEN
```

### Options

| Flag | Description |
|------|-------------|
| `--dir`, `-d` | Project directory to analyze |
| `--service`, `-s` | Filter analysis to a specific service/component |
| `--quick`, `-q` | Local scans only + single AI summary |
| `--ci` | Exit 1 on BROKEN verdict |
| `--verbose`, `-v` | Show full local scan details |

## Output Sections

### Service Integration Tester
```
SERVICE_BOUNDARIES: clear / fuzzy / none
INTEGRATION_ISSUES: numbered with HIGH/MED/LOW severity
DATA_FLOW: how data passes between components
ERROR_HANDLING: timeout, retry, circuit breaker patterns
RECOMMENDATIONS: specific fixes
OVERALL: integration health verdict
```

### Contract Verifier
```
CONTRACTS_FOUND: OpenAPI, GraphQL, or other contract specs
BREACHES: contract violations (CRITICAL/HIGH/MED/LOW)
TYPE_MISMATCHES: inconsistent types across boundaries
DOC_SYNC: docs match implementation?
RECOMMENDATIONS: contract fixes
OVERALL: contract health verdict
```

### Dependency Analyzer
```
GRAPH: dependency structure between components
CONFLICTS: version conflicts (HIGH/MED/LOW)
CYCLES: circular dependencies
MISSING: potentially missing imports
RECOMMENDATIONS: dependency fixes
OVERALL: dependency health verdict
```

### Synthesis
```
Top 5 Integration Issues: cross-cutting problems
Integration Health: HEALTHY / WARNING / BROKEN
Quick Wins: immediate fixes
Architecture Recommendations: structural changes
Summary: one-line verdict
```

## When to Run

| Scenario | Why |
|----------|-----|
| **Before adding new service** | Understand existing integration points |
| **After dependency changes** | Detect version conflicts early |
| **Before deployment** | Verify prod-like integration health |
| **Bug hunt: integration failure** | Pinpoint broken boundaries |
| **Refactoring** | Identify coupling before changing |

## Local Scans (No AI Required)

Even without AI agents, `--quick` runs:
- **Import analyzer** — Maps all imports, identifies external deps, detects circular imports
- **API endpoint scanner** — Finds Flask/FastAPI routes, HTTP(S) calls, config URLs
- **Dependency manifest reader** — Parses requirements.txt, pyproject.toml, package.json

## Pair With

- `ZES-design` — After design review, verify integration points
- `ZES-quality-gate` — Integration quality is part of overall quality
- `ZES-verification-before-completion` — Verify integrations work before claiming done
- `ZES-systematic-debugging` — Debug specific integration failures
- `ZES-service-orchestrator` — Service lifecycle management
