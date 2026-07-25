# ZES Feature-Workflow Skill — Full-Stack App Builder

**Version:** 1.0.0  
**Source:** Adapted from Emergent (github.com/x1xhlol/system-prompts-and-models-of-ai-tools)

---

<overview>

## Purpose

Build full-stack applications from user requirements using the **Emergent workflow**: analysis → frontend prototype → backend → testing → delivery.

This is the "company feature" pipeline. Use it when the user says "build me X" where X is a complete feature or application with UI + backend + data.

</overview>

---

<workflow>

## Mandatory 5-Phase Workflow

### Phase 1: ANALYSIS & REQUIREMENTS

Before writing any code:
1. Clarify the user's intent. What is the core feature? Who uses it? What data?
2. Identify external API keys needed → ask user before proceeding.
3. List the tech stack (React/Vite/Tailwind frontend, FastAPI/Node backend, DB).
4. Write the **Definition of Done**:
   - What the UI must show
   - What API endpoints are needed
   - What database schema is required
   - What tests must pass

Output: "DoD: [one-line summary of acceptance criteria]"

### Phase 2: FRONTEND PROTOTYPE (Mock Data First)

The goal: get a working UI in front of the user ASAP for feedback.

1. Create the frontend with **mock data** (mock.js or mock.ts file, not hardcoded)
2. All interactive elements work (buttons click, forms submit, data displays)
3. Data saved to browser storage (localStorage) for demo purposes
4. Quality checks:
   - UI matches the requirement (padding, alignment, theme)
   - All clicks/butions work as frontend-only elements
   - Text has decent contrast vs background
   - Responsive layout works
5. Present to user: "This is the prototype with mock data. May I proceed with backend integration?"

**Rules:**
- Never write >5 files in one batch
- Keep components under 300-400 lines
- Use proper color contrast (never same color for interactive elements and background)

### Phase 3: BACKEND IMPLEMENTATION

1. Create `/contracts.md` in the project root capturing:
   - API contracts (endpoints, request/response shapes)
   - Which data is mocked (from mock.js) vs real
   - Database schema
   - How frontend-backend integration will work
2. Implement:
   - Database models
   - CRUD endpoints
   - Business logic
   - Error handling
3. Replace frontend mock data with real API calls
4. Remove mock.js/data files

### Phase 4: TESTING (Sub-Agent Protocol)

1. Update `/test_result.md` with current test state
2. Read testing protocol section
3. **Test backend first** using dedicated testing commands
4. Once backend tests pass → ask user: "Run automated frontend tests?"
5. Never run frontend tests without explicit user permission
6. After backend changes → re-run backend tests
7. Never fix what the testing agent already fixed

**Browser QA (optional):** If the frontend is running on a dev server, use `browser-harness` for quick smoke tests on desktop **and** mobile viewports:
```bash
# Desktop smoke test
browser-harness <<'PY'
new_tab("http://localhost:5173")
import time; time.sleep(2)
info = page_info()
print(f"Desktop: {info['title']} @ {info['url']} ({info['w']}x{info['h']})")
capture_screenshot("/tmp/feature-desktop.png")
PY

# Mobile smoke test
browser-harness <<'PY'
import time
cdp("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=3, mobile=True)
cdp("Emulation.setUserAgentOverride", userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")
new_tab("http://localhost:5173")
time.sleep(2)
info = page_info()
print(f"Mobile: {info['w']}x{info['h']}")
capture_screenshot("/tmp/feature-mobile.png")
# Check no overflow
result = cdp("Runtime.evaluate", expression="document.body.scrollWidth <= window.innerWidth")
no_overflow = result.get("result", {}).get("value", False)
print(f"Overflow check: {'✅' if no_overflow else '❌ Horizontal overflow!'}")
# Reset viewport
cdp("Emulation.clearDeviceMetricsOverride")
cdp("Emulation.setUserAgentOverride", userAgent="")
PY
```

### Phase 5: DELIVERY & DOCUMENTATION

1. Run final lint + type check + build
2. **Browser smoke test** (if frontend): verify UI loads via `browser-harness`
3. Present summary:
   - What was built
   - Where the code lives
   - How to run it
   - Environment variables added (if any)
4. Record decision memory via `zes-self-review`

</workflow>

---

<do_dont>

## DO / DON'T Rules

### DO
- Ask clarifying questions before starting implementation
- Build frontend with mock data first for early "aha moment"
- Include proper error handling in every endpoint
- Write small, focused components
- Log errors to files for debugging
- Use web search when stuck on errors (don't guess)

### DON'T
- Don't start backend before user approves frontend
- Don't run frontend tests without asking
- Don't downgrade package versions without reason
- Don't fix minor non-blocking issues indefinitely
- Don't use curl to test backend APIs — use proper test files
- Don't hardcode URLs or ports

</do_dont>

---

<ui_patterns>

## UI Patterns

- Prefer inline editing over modals for simple interactions
- Use modals only for complex multi-step processes
- Ensure natural focus rings on inputs
- SEO: title tags (<60 chars), meta description (<160 chars), semantic HTML, alt attributes on images
- Accessibility: sufficient color contrast, keyboard-navigable, aria labels

</ui_patterns>

---

<commercial_use>

## Commercial Use

Apache 2.0. No restrictions on products built with this workflow.

</commercial_use>
