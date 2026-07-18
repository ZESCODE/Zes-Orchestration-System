---
name: ZES-benchmark
description: Performance benchmarking — measure response times, throughput, and resource usage across ZES services and LLM providers.
metadata:
  origin: ZES
  version: 1.0.0
---

# ZES Benchmark

Measures performance of ZES services and LLM providers.

## LLM Provider Benchmarks
```bash
# Test provider response time
time curl -s http://localhost:20128/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"groq/llama-3.3-70b-versatile","messages":[{"role":"user","content":"Say hi"}],"max_tokens":10}'
```

## Service Health Benchmarks
```bash
# Dashboard response time
time curl -s http://localhost:5173 > /dev/null

# Memory hub response time
time curl -s http://localhost:9119/api/health > /dev/null
```

## Metrics to Track
- LLM first-token latency
- Dashboard page load time
- Memory write throughput
- Background review completion time
