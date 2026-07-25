---
name: ZES-browser-agent
description: "AI browser agent for ZES — automated QA, smoke testing, form filling, and data extraction using browser-use and browser-harness. Wraps browser-use.Agent with ZES-specific presets: CDP at :9222, 9Router provider routing, and ZES dashboard targets."
---

# ZES Browser Agent

Wraps [browser-use](https://github.com/browser-use/browser-use) for the ZES ecosystem. Uses `browser-use Agent` with ZES-specific defaults.

## Prerequisites

- browser-use ≥ 0.13.6 installed (`pip install browser-use`)
- browser-harness daemon running (auto-starts)
- CDP on :9222 (runit service `chromium-cdp`)
- ZES dashboards running (:5050, :7070, :8083)

## Quick Start

```bash
# Run a browser agent task
browser-use <<'PY'
new_tab("http://localhost:5050")
print(page_info())
PY
```

## Agent Tasks

### Smoke Test All Dashboards

```bash
browser-use <<'PY'
import json

dashboards = {
    "ZES Vite": "http://localhost:5050",
    "ZES Next": "http://localhost:7070",
    "ZES Control": "http://localhost:8083",
    "amux": "http://localhost:8822",
    "Hermes": "http://localhost:9119",
    "9Router": "http://localhost:20128",
}
results = {}
for name, url in dashboards.items():
    new_tab(url)
    import time; time.sleep(2)
    info = page_info()
    results[name] = {
        "status": info.get("status", "unknown"),
        "title": info.get("title", ""),
    }
    print(f"{name}: {info.get('title', '')}")

print(json.dumps(results, indent=2))
PY
```

### Run as Agent (browser-use Agent)

```bash
browser-use agent "Test that all ZES dashboards are loading correctly at localhost:5050, localhost:7070, and localhost:8083"
```

### Capture Screenshots

```bash
browser-use <<'PY'
for port in 5050 7070 8083 8822:
    new_tab(f"http://localhost:{port}")
    import time; time.sleep(2)
    capture_screenshot(f"/tmp/zes-{port}.png")
    print(f"Captured :{port}")
PY
```

## ZES Agent API Usage (Python)

```python
from browser_use import Agent
from browser_use.browser import Browser, BrowserConfig
from browser_use.controller import Controller

# Connect to ZES CDP
config = BrowserConfig(
    cdp_url="http://127.0.0.1:9222",
    headless=True,
)

agent = Agent(
    task="Check all ZES dashboards and report status",
    llm="claude-sonnet-4-20250514",  # or any model through 9Router
    browser=Browser(config),
    controller=Controller(),
)
result = await agent.run()
print(result)
```

## Integration with ZES Skills

This skill is used by:
- **browser-qa** — visual QA testing on dashboards
- **cdp-audit** — deep CDP diagnostics
- **ZES-verification-before-completion** — post-deploy smoke tests
- **ZES-quality-gate** — CI/CD quality checks with browser testing

## Port Reference

| Service | Port | Status |
|---------|------|--------|
| CDP (Chromium) | :9222 | runit chromium-cdp |
| CDP Viewer UI | :9223 | runit cdp-viewer |
| Vite Dashboard | :5050 | ZES main |
| Next Dashboard | :7070 | ZES secondary |
| amux | :8822 | Agent control plane |
