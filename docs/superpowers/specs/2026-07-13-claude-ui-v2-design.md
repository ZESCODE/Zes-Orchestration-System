# Claude UI v2 — shadcn/ui + Assistant UI Migration

**Date:** 2026-07-13
**Status:** Draft
**Approach:** A — shadcn/ui + Assistant UI (recommended)

---

## 1. Architecture

```
Browser (:8080) ──→ React 18 App ──→ Backend (:9001) ──→ 9Router Proxy (:5905)
                      │
                ┌─────┴──────┐
           shadcn/ui     Assistant UI
           (Sheet,       (Thread,
            Select,       Message,
            Button,       PromptInput,
            Dialog,       tool calls,
            ScrollArea)   streaming)
                      │
                 Tailwind CSS
```

**No backend changes.** The Express server at `:9001` stays untouched — it already handles `/api/chat` (SSE streaming), `/api/models`, `/api/status`. Only the React frontend changes.

---

## 2. Component Tree

```
App
├── TopBar (shadcn Button variants)
│   ├── LeftDrawer toggle (shadcn Sheet trigger)
│   ├── Title + System Status dot
│   └── RightDrawer toggle (shadcn Sheet trigger)
├── LeftDrawer (shadcn Sheet side panel)
│   ├── New Chat button (shadcn Button)
│   ├── Model selector (shadcn Select)
│   ├── Session list (shadcn ScrollArea)
│   │   └── Session items (shadcn Button/list)
│   └── System info footer
├── ChatArea (Assistant UI)
│   ├── Thread (Assistant UI <Thread>)
│   │   ├── Welcome screen (when empty)
│   │   ├── Messages (Assistant UI <Message>)
│   │   │   ├── User message bubble
│   │   │   ├── Assistant message (streaming, markdown)
│   │   │   └── Tool call display
│   │   └── Scroll-to-bottom on new content
│   └── PromptInput (Assistant UI <PromptInput>)
│       ├── Multi-line textarea
│       ├── Send button (shadcn Button)
│       ├── Model indicator
│       └── Stop generation button (during streaming)
└── RightDrawer (shadcn Sheet side panel)
    ├── System Status panel (live from dashboard API)
    ├── Quick actions (restart services, check health)
    └── Settings (theme toggle, max tokens)
```

### Component Mapping (Old → New)

| Old File | New File/Component | Notes |
|----------|--------------------|-------|
| `src/App.js` | `src/App.js` | Refactored — integrate runtimes |
| `src/components/ChatView.js` | Assistant UI `<Thread>` | Full replacement |
| `src/components/LeftDrawer.js` | shadcn `<Sheet>` + custom content | Left-aligned sheet |
| `src/components/RightDrawer.js` | shadcn `<Sheet>` + custom content | Right-aligned sheet |
| `src/styles/App.css` | `src/styles/globals.css` | Replace with Tailwind + CSS vars |
| — | `src/components/ui/` | shadcn auto-generated components |
| — | `tailwind.config.js` | Tailwind config |
| — | `postcss.config.js` | PostCSS for Tailwind |
| — | `components.json` | shadcn configuration |

---

## 3. Data Flow

### Chat Flow (unchanged from current)
```
User types → PromptInput onChange → App.js state
  → POST /api/chat { message, model, stream: true }
  → Express backend → HTTP POST to 9Router (:5905) with Anthropic format
  → SSE response stream
  → Assistant UI <Thread> renders tokens incrementally
  → On complete: save session to localStorage
```

### Session Management (unchanged)
```
Save: On message complete → localStorage.setItem('claude_ui_sessions', JSON.stringify(...))
Load: On app start → localStorage.getItem → populate LeftDrawer
Delete: Clear button → remove from localStorage
```

### Drawer State (unchanged logic, new components)
```
Left open/close → React state → shadcn Sheet open prop
Right open/close → React state → shadcn Sheet open prop
Both can be open simultaneously
Drawers slide from edges (left: sidebar, right: settings)
```

### Model Selection (unchanged)
```
TopBar or LeftDrawer → shadcn Select onChange
  → Updates App.js model state
  → Passed to POST /api/chat as model param
```

---

## 4. Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.2.0 | Already installed |
| `react-dom` | ^18.2.0 | Already installed |
| `react-scripts` | 5.0.1 | Already installed |
| `tailwindcss` | ^3.4.17 | Utility CSS framework |
| `postcss` | ^8.4 | CSS processing |
| `autoprefixer` | ^10.4 | Vendor prefixes |
| `class-variance-authority` | ^0.7.1 | shadcn utility for variants |
| `clsx` | ^2.1.1 | Class merging |
| `tailwind-merge` | ^2.6 | Tailwind class merge |
| `lucide-react` | ^0.468 | Icon library |
| `@radix-ui/react-dialog` | ^1.1 | shadcn Dialog primitive |
| `@radix-ui/react-select` | ^1.2 | shadcn Select primitive |
| `@radix-ui/react-scroll-area` | ^1.2 | shadcn ScrollArea primitive |
| `@radix-ui/react-slot` | ^1.1 | shadcn Slot primitive |
| `@radix-ui/react-tooltip` | ^1.1 | Tooltips (optional) |
| `@assistant-ui/react` | ^0.7.61 | AI chat components |
| `@assistant-ui/react-markdown` | ^0.7.5 | Markdown rendering in chat |

### Dev Dependencies (none — CRA handles builds)

---

## 5. Files to Create

### `tailwind.config.js`
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ZES dark theme colors
        bg: "#080c14",
        surface: "#0d1320",
        surface2: "#131b2e",
        border: "rgba(0,140,255,0.12)",
        text: "#c8d0e0",
        text2: "#8899bb",
        accent: "#4a9eff",
      }
    },
  },
  plugins: [],
}
```

### `postcss.config.js`
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### `components.json` (shadcn config)
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### `src/lib/utils.js` (shadcn utility)
```js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

### `src/styles/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #080c14;
  --surface: #0d1320;
  --surface2: #131b2e;
  --border: rgba(0,140,255,0.12);
  --text: #c8d0e0;
  --text2: #8899bb;
  --accent: #4a9eff;
}

body {
  background: var(--bg);
  color: var(--text);
}
```

### shadcn UI components (auto-generated by CLI)
- `src/components/ui/sheet.js`
- `src/components/ui/button.js`
- `src/components/ui/select.js`
- `src/components/ui/scroll-area.js`
- `src/components/ui/dialog.js`
- `src/components/ui/badge.js`

### Assistant UI components (auto-generated by CLI)
- `src/components/assistant-ui/thread.js`
- `src/components/assistant-ui/message.js`
- `src/components/assistant-ui/prompt-input.js`

---

## 6. Backward Compatibility

| Aspect | Status | Notes |
|--------|--------|-------|
| Backend API | ✅ **Compatible** | Same `/api/chat`, `/api/models`, `/api/status` |
| Session format | ✅ **Compatible** | Same localStorage format |
| Model list | ✅ **Compatible** | Same models endpoint |
| Streaming | ✅ **Compatible** | Same SSE format |
| Ports | ✅ **Unchanged** | Frontend :8080, Backend :9001 |
| claude.html | ✅ **Unchanged** | Separate static UI at :8767 |
| runsv services | ✅ **Unchanged** | Same service management |

---

## 7. Migration Order

1. Install Tailwind CSS + PostCSS + autoprefixer
2. Create `tailwind.config.js`, `postcss.config.js`
3. Install shadcn dependencies (radix, CVA, clsx, tailwind-merge, lucide)
4. Create `components.json`, `src/lib/utils.js`
5. Run `npx shadcn-ui@latest init` to generate base components
6. Add shadcn components: Sheet, Button, Select, ScrollArea, Dialog, Badge
7. Install `@assistant-ui/react` + `@assistant-ui/react-markdown`
8. Run `npx assistant-ui@latest init` to generate chat components
9. Refactor `App.js` — integrate Assistant Runtime + shadcn layout
10. Replace `ChatView.js` with Assistant UI `<Thread>`
11. Replace `LeftDrawer.js` with shadcn `<Sheet>`
12. Replace `RightDrawer.js` with shadcn `<Sheet>`
13. Update `globals.css` — replace old CSS with Tailwind
14. Remove `App.css`
15. Test streaming, drawers, model switching, session persistence
16. Verify no regressions on backend endpoints

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Tailwind + CRA compatibility | CRA 5 supports PostCSS; Tailwind works with CRA |
| Assistant UI requires Next.js? | No — works with plain React/CRA via `@assistant-ui/react` |
| shadcn CLI requires Next.js project? | No — supports CRA with manual config |
| CSS variable conflicts | ZES theme uses CSS vars scoped to `:root`; Tailwind merges cleanly |
| Large dependency addition | ~8 new packages, but tree-shaken by CRA build |
| Assistant UI bundle size | ~30kB gzipped, acceptable for a chat app |
