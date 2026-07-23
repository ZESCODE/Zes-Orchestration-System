---
name: ZES-memory-consolidator
description: Scans the Holographic Memory Hub (~/.zes/memory_hub.sqlite), spawns 3 parallel AI analysis agents to find duplicates, contradictions, and quality issues, then consolidates — keeping memory lean without manual cleanup.
metadata:
  origin: ZES
  version: 1.0.0
---

# ZES Memory Consolidator

## Usage

```bash
# Full scan + report (no changes)
zes consolidate --report

# Full scan + auto-consolidate
zes consolidate --force

# Quick local analysis only (no AI agents, faster)
zes consolidate --quick --force
```

## What It Does

1. **Local Analysis** — Fast Jaccard similarity check for obvious duplicates
2. **Parallel AI Analysis** — 3 agents run simultaneously:
   - **Duplicate Detection** (Groq/Llama 3.3 70B) — Finds semantic duplicates
   - **Contradiction Detection** (OpenRouter/DeepSeek V4) — Finds conflicting facts
   - **Quality Assessment** (BitRouter/GPT-5.4 Mini) — Rates facts, recommends boosts/deletions
3. **Synthesis** — Consolidates findings into actionable changes
4. **Apply** — Merges duplicates, deletes low-quality, boosts high-value, updates metadata

## Run Frequency

- **Weekly** — `zes consolidate --force` to keep memory lean
- **Before critical decisions** — `zes consolidate --report` to audit memory quality

## Result: 112 → 100 Facts

First run found:
- **9 duplicate groups** — merged 10 redundant facts
- **5 contradictions** — flagged for review
- **9 low-quality facts** — deleted or updated
- **15 high-value facts** — trust scores boosted
