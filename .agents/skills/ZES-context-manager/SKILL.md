---
name: ZES-context-manager
description: Context window budget management — audit token consumption across agents, identify bloat, and optimize for cost and performance.
metadata:
  origin: ZES
  version: 1.0.0
---

# ZES Context Manager

Optimizes context window usage across the ZES system.

## Key Rules
1. **Hermes prompt caching is sacred** — never invalidate mid-conversation
2. **Skills add tokens** — only load skills that apply to the current task
3. **Memory prefetch is bounded** — limit prefetch results to 10
4. **Background review uses digest** — different-model review replays compact digest

## Optimization Checklist
- [ ] Review skill count: which are actually used?
- [ ] Check memory prefetch: are results relevant?
- [ ] Verify prompt cache hits: any unnecessary invalidations?
- [ ] Monitor `hermes memory status` for store bloat
