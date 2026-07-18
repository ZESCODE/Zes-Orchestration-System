---
name: ZES-quality-gate
description: Quality enforcement — delivery-gate and gateguard combined. Blocks completion until quality checks pass, detects rationalization patterns, and demands concrete investigation before edits.
metadata:
  origin: ZES
  version: 1.0.0
---

# ZES Quality Gate

Combines delivery-gate + gateguard for unified quality enforcement.

## Before Completion
1. Run all tests: `PYTHONPATH=. python3 -m unittest discover plugins/memory/zes_memory/`
2. Verify no rationalization patterns (surface text heuristics)
3. Check learning logs freshness (filesystem mtime)
4. Verify disk space

## Before Edits/Write
1. Verify data schemas and importers
2. Confirm user instruction alignment
3. No hardcoded secrets
4. All inputs validated

## Quality Metrics
- Test coverage: 80%+ required
- No security vulnerabilities
- No broken service connections
- Memory consistency across all stores
