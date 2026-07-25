---
name: ZES-verification-before-completion
description: 3-Agent verification before claiming completion — Test Verifier (Groq) + Type/Lint Checker (OpenRouter) + Requirements Checker (LLM7) running in parallel. The Iron Law enforced by AI.
---

# Verification Before Completion — 3-Agent Edition

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  ✅ ZES Verify (zes verify --dir ~/project --plan plan.md)  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 0: Local Tools (instant parallel)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ pytest       │  │ mypy + pylint│  │ git diff + plan  │   │
│  │ Test runner  │  │ Type checker │  │ Requirements ctx │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  Phase 1: 3 AI Agents (parallel, ~20s)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ 🧪 Test      │  │ 📋 Type/Lint │  │ 📋 Requirements  │   │
│  │  Groq        │  │ OpenRouter   │  │ LLM7             │   │
│  │  Llama 3.3   │  │ DeepSeek V4  │  │ Codestral        │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘   │
│         │                 │                 │               │
│         ▼                 ▼                 ▼               │
│  Test pass/fail     Type errors         Requirements met    │
│  Red-green cycle    Lint violations     Missing features    │
│  Coverage gaps      Code quality        Scope creep        │
│                                                              │
│  Phase 2: Synthesizer → FINAL VERDICT                       │
│  → VERIFIED | FAILED | INCOMPLETE                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## The 3 Verification Agents

| Agent | Provider | Model | Verifies |
|-------|----------|-------|----------|
| **Test Verifier** | Groq | Llama 3.3 70B | Tests pass, red-green cycle, edge cases |
| **Type/Lint Checker** | OpenRouter | DeepSeek V4 Flash | Type errors, lint errors, syntax |
| **Requirements Checker** | LLM7 | Codestral Latest | Plan compliance, acceptance criteria |

## Pipeline

```
Phase 0: Local Checks (instant)
  ├── pytest test suite (with timeout and failure parsing)
  ├── mypy type checking + pylint linting + syntax validation
  ├── git diff + plan file reading (requirements context)
  └── Browser Smoke Test (if --browser flag set)
      ├── CDP health check via browser-harness --doctor
      ├── Page load verification (title, URL, screenshot)
      └── Console error scan (JS exceptions)

Phase 1: AI Agents (parallel, ~20s)
  ├── Test Verifier → Tests passing? Red-green evidence? Coverage?
  ├── Type/Lint Checker → Zero type errors? Zero lint errors? Clean syntax?
  └── Requirements Checker → All requirements met? Scope creep?

Phase 2: Final Verdict (single call)
  └── Synthesizer → VERIFIED / FAILED / INCOMPLETE + evidence
```

## CLI Usage

```
zes verify                            # Full verification on current dir
zes verify --dir ~/project            # Specific project
zes verify --plan docs/plan.md        # Verify against implementation plan
zes verify --quick                    # Local tools only (no AI, ~10s)
zes verify --ci                       # CI mode — exit 1 on FAILED
zes verify --browser                   # Include browser smoke test
zes verify --browser --url http://localhost:5050  # Custom URL
zes verify --browser --url :7070        # Verify dashboard :7070
```

## The Gate Function (Manual Mode)

When running without CLI tool:

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim
```

## Browser Smoke Test

For frontend projects, add a `--browser` flag to verify the UI loads correctly before claiming completion.

### Quick Check
```bash
zes verify --dir ~/zes-system-v2 --browser
```

### What It Verifies

| Check | Command | Pass Condition |
|-------|---------|----------------|
| CDP alive | `browser-harness --doctor` | All [ok] |
| Page loads | `new_tab(url)` + `page_info()` | Title not empty |
| Non-blank | `capture_screenshot()` | File >5KB |
| Console clean | `cdp("Runtime.evaluate", ...)` | No exceptions |

### Manual Verification (Desktop + Mobile)
```bash
# Desktop verification
browser-harness <<'PY'
new_tab("http://localhost:5050")
import time, os
time.sleep(2)
info = page_info()
assert info["title"], "FAIL: Page title empty"
assert info["w"] > 0, "FAIL: Page not rendered"
path = os.path.expanduser("~/verify-desktop.png")
capture_screenshot(path)
assert os.path.getsize(path) > 5000, "FAIL: Blank page"
print("PASS: Desktop verification complete")
PY

# Mobile verification
browser-harness <<'PY'
import time, os
cdp("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=3, mobile=True)
cdp("Emulation.setUserAgentOverride", userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")
new_tab("http://localhost:5050")
time.sleep(2)
info = page_info()
print(f"Mobile viewport: {info['w']}x{info['h']}")
# Check no overflow
result = cdp("Runtime.evaluate", expression="document.body.scrollWidth <= window.innerWidth")
no_overflow = result.get("result", {}).get("value", False)
assert no_overflow, "FAIL: Mobile horizontal overflow detected"
path = os.path.expanduser("~/verify-mobile.png")
capture_screenshot(path)
# Reset to desktop
cdp("Emulation.clearDeviceMetricsOverride")
cdp("Emulation.setUserAgentOverride", userAgent="")
print("PASS: Mobile verification complete")
PY
```

## What Each Check Proves

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Requirements met | Line-by-line checklist | Tests passing |
| Agent completed | VCS diff shows changes | Agent reports "success" |

## When to Run

| Before | Why |
|--------|-----|
| **Claiming "done"** | The Iron Law — evidence before claims |
| **Committing/pushing** | Catch issues before they're permanent |
| **Creating a PR** | Ensure quality before review |
| **Moving to next task** | Don't leave unfinished work behind |
| **After AI agent work** | Verify independently — don't trust agent reports |

## CI Integration

```yaml
# GitHub Actions
- name: ZES Verification
  run: |
    source ~/.secure-credentials/master.env
    zes verify --dir . --plan requirements.md --ci
  # Exits 1 on FAILED — blocks merge
```

## Red Flags - STOP

- Using "should", "probably", "seems to" instead of verified results
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!")
- About to commit/push/PR without verification
- Trusting agent success reports
- Thinking "just this once"

## Pair With

- `browser-harness` — Browser control for smoke tests
- `browser-qa` — Structured visual regression testing
- `cdp-audit` — Deep browser diagnostics on failure
- `ZES-quality-gate` — Broader quality check (includes security + coverage)
- `ZES-systematic-debugging` — When verification FAILS, debug root cause
- `ZES-writing-plans` — Create the plans that verification checks against
