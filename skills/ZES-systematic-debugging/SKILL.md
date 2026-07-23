---
name: ZES-systematic-debugging
description: 3-Agent systematic debugging — Explorer (evidence), Analyzer (root cause), Fixer (implementation). Parallel AI agents across Groq, OpenRouter, and LLM7.
---

# ZES Systematic Debugging — 3-Agent Edition

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  🔍 ZES Debug Engine (zes debug "error")            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ 🔎 Explorer  │  │ 🧠 Analyzer  │  │ 🔧 Fixer │  │
│  │  (Groq)      │  │ (OpenRouter) │  │ (LLM7)   │  │
│  │  Llama 3.3   │  │ DeepSeek V4  │  │ Codestral│  │
│  │  70B         │  │ Flash        │  │ Latest   │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬────┘  │
│         │                 │                 │       │
│         ▼                 ▼                 ▼       │
│  Evidence Report    Root Cause Analysis    Fix     │
│  • Error signature  • Hypothesis           • Code   │
│  • Environment      • Root cause           • Config │
│  • Recent changes   • Proposed fix         • Tests  │
│  • Suspect files    • Verification steps   • Rollback│
│                                                     │
│  Phase 2: Analyzer re-runs WITH Explorer's data     │
│  Phase 3: Fixer re-runs WITH Analyzer's analysis     │
└─────────────────────────────────────────────────────┘
```

## The 3 Agents

| Agent | Provider | Model | Role |
|-------|----------|-------|------|
| **Explorer** | Groq | Llama 3.3 70B (fast) | Codebase scan, log reading, CDP diagnostics, evidence gathering |
| **Analyzer** | OpenRouter | DeepSeek V4 Flash (deep reasoning) | Root cause analysis, pattern matching, hypothesis formation |
| **Fixer** | LLM7 | Codestral Latest (code specialist) | Implementation, tests, verification, rollback commands |

## Pipeline

```
Phase 0: Gather Evidence
  ├── Bug description (from user)
  ├── Codebase scan (git log, grep error patterns) — if --dir specified
  └── CDP diagnostics (browser console, network) — if --cdp specified

Phase 1: 3 Parallel Agents (simultaneous)
  ├── Explorer → Evidence Report (fast analysis)
  ├── Analyzer → Root Cause Hypothesis (deep reasoning)  
  └── Fixer → Preliminary Fix Plan (code specialist)

Phase 2: Synthesize (sequential)
  └── Analyzer re-runs WITH Explorer's evidence → Refined analysis

Phase 3: Final Fix (sequential)
  └── Fixer re-runs WITH Analyzer's analysis → Precise fix with commands
```

## CLI Usage

```
zes debug "error message"
zes debug "error message" --dir ~/project
zes debug "error message" --dir ~/project --verbose
zes debug "White screen on dashboard" --cdp
zes debug --cdp "Runtime SyntaxError in browser"
```

## Custom Providers

Override which provider each agent uses via env vars:

```
export EXPLORER_URL="https://api.groq.com/openai/v1/chat/completions"
export EXPLORER_MODEL="llama-3.3-70b-versatile"
export ANALYZER_URL="https://openrouter.ai/api/v1/chat/completions"
export ANALYZER_MODEL="deepseek/deepseek-v4-flash:free"
export FIXER_URL="https://api.llm7.io/v1/chat/completions"
export FIXER_MODEL="codestral-latest"
```

Or load a JSON config file:

```
zes debug "error" --providers ~/.zes/debug-config.json
```

## The Original 4-Phase Workflow (Manual Mode)

When running without CLI tool, follow these phases:

### Phase 1: Root Cause Investigation
1. Read error messages carefully
2. Reproduce consistently
3. Check recent changes (git diff, recent commits)
4. Gather evidence — trace data flow
5. **Use CDP for browser issues**

### Phase 2: Pattern Analysis
1. Find working examples in same codebase
2. Compare against references
3. Identify differences between working and broken
4. Understand dependencies

### Phase 3: Hypothesis and Testing
1. Form single hypothesis: "I think X because Y"
2. Test minimally — one variable at a time
3. Verify before continuing
4. If 3+ fixes failed: Question the architecture

### Phase 4: Implementation
1. Create failing test case first
2. Implement single fix
3. Verify fix
4. No "while I'm here" improvements

## CDP Integration

When debugging browser-rendered apps (Next.js, React), Chromium headless runs on ws://127.0.0.1:9222.

Use `zes debug "error" --cdp` to automatically:
- Check CDP availability
- Capture console errors
- List open browser tabs
- Feed CDP evidence into all 3 agents

## Pair With

- `ZES-parallel-research` — Deep research on unfamiliar technologies
- `ZES-model-router` — Choose optimal model for each debug subtask
- `ZES-quality-gate` — Post-fix quality verification
- `cdp-audit` skill — Full CDP command reference
