# System Prompt: Build Dashboards with React + shadcn/ui + Tailwind CSS v4

> Production dashboard stack: React 19 + shadcn/ui + Tailwind v4 + Vite 8 + Lucide Icons

---

## Table of Contents

1. [Stack & Setup](#1-stack--setup)
2. [Project Structure](#2-project-structure)
3. [Configuration Files](#3-configuration-files)
4. [Architecture & Routing](#4-architecture--routing)
5. [Mobile Optimization](#5-mobile-optimization)
6. [Component Library](#6-component-library)
7. [Data Fetching Pattern](#7-data-fetching-pattern)
8. [Component Reference](#8-component-reference)
9. [Kanban Board](#9-kanban-board)
10. [Build & Deploy](#10-build--deploy)

---

## 1. Stack & Setup

```
React 19.2.7       → UI framework
shadcn/ui (Radix)  → Accessible primitives (tabs, dialog, sheet, etc.)
Tailwind CSS 4     → Utility-first styling with @theme
Vite 8             → Dev server + build
Lucide React       → Icon library
clsx + twMerge     → Conditional class merging (cn() util)
```

### Quick Start

```bash
npm create vite@latest my-dash -- --template react
cd my-dash
npm install react react-dom lucide-react class-variance-authority clsx tailwind-merge
npm install -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite
```

### Install shadcn/ui Primitives

**Do not use the shadcn CLI** — copy component files directly into `src/components/ui/`. This avoids build-time dependency issues on Termux and gives full control over the source.

Primitive list — copy from reference project or shadcn docs:
- `button.jsx` — `cva()` with variants (default, secondary, ghost, destructive, outline, link)
- `card.jsx` — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- `tabs.jsx` — Radix Tabs (TabsList, TabsTrigger, TabsContent)
- `sheet.jsx` — Radix Dialog with animation (slide-in panel)
- `separator.jsx` — Radix Separator
- `badge.jsx` — `cva()` with variants (default, secondary, outline, destructive)
- `skeleton.jsx` — Animated loading placeholder
- `input.jsx` — Styled input with focus ring

---

## 2. Project Structure

```
project/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn primitives (copy-paste)
│   │   │   ├── badge.jsx
│   │   │   ├── button.jsx
│   │   │   ├── card.jsx
│   │   │   ├── input.jsx
│   │   │   ├── separator.jsx
│   │   │   ├── sheet.jsx
│   │   │   ├── skeleton.jsx
│   │   │   └── tabs.jsx
│   │   ├── DashboardLayout.jsx    # Shell: sidebar + content + mobile nav
│   │   ├── Sidebar.jsx            # Desktop sidebar nav
│   │   ├── MobileNav.jsx          # Fixed bottom nav bar (mobile)
│   │   ├── SummaryCards.jsx       # Overview stats grid
│   │   ├── ServiceGrid.jsx        # Service list with controls
│   │   ├── ServiceCard.jsx        # Single service (start/stop/restart)
│   │   ├── ProcessList.jsx        # Top processes table
│   │   ├── SystemInfo.jsx         # System + memory/disk info
│   │   ├── WebServices.jsx        # Web service URL cards
│   │   ├── NetworkInfo.jsx        # Network interfaces
│   │   ├── HermesChat.jsx         # Chat interface (sessions + messages)
│   │   ├── OpenClaudeChat.jsx     # OpenClaude chat embed
│   │   ├── OpenClaudePage.jsx     # OpenClaude info page
│   │   ├── ZESDashboard.jsx       # ZES health dashboard
│   │   ├── DesignStudio.jsx       # Theme designer (colors, fonts, CSS)
│   │   ├── IFramePage.jsx         # Generic iframe wrapper for external UIs
│   │   └── KanbanBoard.jsx        # Full kanban with DnD
│   ├── hooks/
│   │   └── useApi.js              # Custom hooks (useServices, useSystemInfo, etc.)
│   ├── lib/
│   │   └── utils.js               # cn() utility
│   ├── App.jsx                    # Root — mounts DashboardLayout
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Tailwind v4 imports + @theme
├── vite.config.js
├── package.json
└── components.json                # (optional) shadcn config reference
```

---

## 3. Configuration Files

### vite.config.js

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    host: "127.0.0.1",
    // 🔥 Avoid inotify ENOSPC on Termux/Android:
    watch: { usePolling: true, interval: 1000 },
    proxy: {
      "/api": { target: "http://localhost:5002", changeOrigin: true },
    },
  },
});
```

### src/index.css (Tailwind v4)

```css
@import "tailwindcss";

@theme {
  --color-background: hsl(222.2 84% 4.9%);
  --color-foreground: hsl(210 40% 98%);
  --color-card: hsl(222.2 84% 4.9%);
  --color-card-foreground: hsl(210 40% 98%);
  --color-primary: hsl(222.2 47.4% 11.2%);
  --color-primary-foreground: hsl(210 40% 98%);
  --color-secondary: hsl(217.2 32.6% 17.5%);
  --color-muted: hsl(217.2 32.6% 17.5%);
  --color-muted-foreground: hsl(215.4 16.3% 46.9%);
  --color-accent: hsl(217.2 32.6% 17.5%);
  --color-destructive: hsl(0 62.8% 30.6%);
  --color-destructive-foreground: hsl(210 40% 98%);
  --color-border: hsl(217.2 32.6% 17.5%);
  --color-ring: hsl(224.3 76.3% 48%);
}
```

### src/lib/utils.js

```js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

---

## 4. Architecture & Routing

### Hash-Based Routing (no react-router)

The dashboard uses `window.location.hash` for tab state — persists across refresh, works with browser back/forward, and avoids the overhead of react-router.

```jsx
// In DashboardLayout.jsx
const VALID_TABS = [
  "overview", "services", "processes", "system", "web", "network",
  "zes", "hermes", "ninerouter", "design", "workflows", "codexweb",
  "openclaude", "openclaude-chat", "kanban",
];

export function DashboardLayout() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.slice(1);
    return VALID_TABS.includes(hash) ? hash : "overview";
  });

  // Update hash on tab change
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  }, []);

  // Sync on back/forward
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (VALID_TABS.includes(hash) && hash !== activeTab) {
        setActiveTab(hash);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [activeTab]);
```

### Tab → Component Mapping

```jsx
const tabs = {
  overview:   { title: "Overview",    component: SummaryCards },
  services:   { title: "Services",    component: ServiceGrid },
  processes:  { title: "Processes",   component: ProcessList },
  system:     { title: "System Info", component: SystemInfo },
  web:        { title: "Web",         component: WebServices },
  network:    { title: "Network",     component: NetworkInfo },
  zes:        { title: "ZES Health",  component: ZESDashboard },
  hermes:     { title: "Hermes Chat", component: HermesChat, noPadding: true },
  ninerouter: { title: "9Router",     component: () => <IFramePage url="..." /> },
  design:     { title: "Design",      component: DesignStudio },
  workflows:  { title: "Workflows",   component: () => <IFramePage url="..." /> },
  codexweb:   { title: "Codex Web",   component: () => <IFramePage url="..." /> },
  openclaude: { title: "OpenClaude",  component: OpenClaudePage },
  "openclaude-chat": { title: "OC Chat", component: OpenClaudeChat, noPadding: true },
  kanban:     { title: "Kanban",      component: KanbanBoard, noPadding: true },
};
```

`noPadding: true` — pages that need full-height (chat, kanban) skip the page header and extra padding.

---

## 5. Mobile Optimization

### Core Pattern: Desktop Sidebar → Mobile Bottom Nav

```jsx
// DashboardLayout.jsx — responsive switching
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 768);
  check();
  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
}, []);

if (isMobile) {
  return (
    <div className="flex flex-col h-screen bg-background">
      {content}              {/* Full-height scrollable area */}
      <MobileNav ... />      {/* Fixed bottom nav bar */}
    </div>
  );
}

return (
  <div className="flex h-screen bg-background">
    <Sidebar ... />          {/* Desktop sidebar (w-64) */}
    {content}
  </div>
);
```

### Mobile Bottom Nav (MobileNav.jsx)

```jsx
export function MobileNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
      <div className="flex justify-around items-center h-14 px-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-md transition-colors min-w-0 shrink-0",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

Key details:
- `fixed bottom-0` — always visible at bottom
- `z-40` — above content
- `md:hidden` — hidden on desktop
- `h-14` — comfortable touch target height (56px)
- `text-[9px]` — compact labels for mobile
- 7 most-used tabs only (not all 15)

### Mobile Drawer (for less-used tabs)

On mobile, a `Sheet` (slide-in drawer) provides access to the full sidebar for tabs not in the bottom nav:

```jsx
<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
  <SheetTrigger asChild>
    <Button variant="outline" size="icon" className="h-9 w-9">
      <Menu className="h-5 w-5" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left" className="w-64 p-0">
    <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
  </SheetContent>
</Sheet>
```

### Responsive Padding & Content

Every component uses responsive utilities:

```jsx
// Cards grid: 2 cols mobile → 3 cols tablet → 4 cols desktop
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">

// Padding scales up on desktop
<CardHeader className="px-3 pt-3 md:px-6 md:pt-6">
<CardContent className="px-3 pb-3 md:px-6 md:pb-6">

// Text sizes
<CardTitle className="text-xs md:text-sm">
<p className="text-[10px] md:text-xs">
<div className="text-lg md:text-2xl font-bold">

// Bottom padding for mobile nav
<main className="flex-1 overflow-auto p-3 md:p-6 pb-20 md:pb-6">
//                         ^^^^^^^^  20 = 14px nav + 6px spacing
```

### Mobile Touch Targets

- Bottom nav items: `h-14` (56px) — comfortable for thumbs
- Buttons: `h-8` (32px) minimum, `h-9` on desktop
- All clickable areas have `cursor-pointer`
- `overflow-x-auto` for horizontal scroll on small screens
- `-webkit-overflow-scrolling: touch` for iOS momentum scroll

---

## 6. Component Library

### shadcn/ui Pattern (copy-paste)

Each primitive is a standalone file in `src/components/ui/`. Example:

```jsx
// ui/button.jsx
import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
));
Button.displayName = "Button";

export { Button, buttonVariants };
```

### Lucide Icons

Used exclusively for all icons. Import individually for tree-shaking:

```jsx
import { Server, Activity, Cpu, LayoutDashboard, MessageSquare, Columns } from "lucide-react";
```

Common icons used in this dashboard:
- Navigation: `LayoutDashboard`, `Server`, `Cpu`, `Activity`, `Globe`, `Network`, `Layout`, `MessageSquare`, `Router`, `Palette`, `Workflow`, `Terminal`, `MessageCircle`, `Columns`
- Actions: `Plus`, `X`, `Trash2`, `Edit3`, `Send`, `Play`, `Square`, `RotateCcw`, `Save`, `Download`, `Copy`
- Status: `CheckCircle2`, `AlertCircle`, `Clock`, `Loader2`, `RefreshCw`
- UI: `Menu`, `PanelLeft`, `ExternalLink`, `ChevronDown`, `ChevronUp`, `Search`, `GripVertical`

---

## 7. Data Fetching Pattern

### Custom Hooks (useApi.js)

No React Query — plain `useEffect` + `fetch` is sufficient for polling dashboards:

```js
const API_BASE = "/api";

export function useServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_BASE}/services`);
      setServices(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 5000);  // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const controlService = async (name, action) => {
    await fetch(`${API_BASE}/services/${name}/${action}`, { method: "POST" });
    await fetchServices();
  };

  return { services, loading, controlService };
}

export function useSystemInfo() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API_BASE}/system`).then(r => r.json()).then(setInfo).finally(() => setLoading(false));
  }, []);
  return { info, loading };
}
```

### Data Flow

```
Component → custom hook (useServices) → fetch(/api/services) → setState → render
                                  ↕ polling every 5-30s
                           user action → POST /api/services/:name/start
```

### Loading/Error/Empty States

Every component handles all three:

```jsx
if (loading) return <Skeleton className="h-24" />;
if (error)   return <ErrorState message={error} onRetry={fetchData} />;
if (empty)   return <p className="text-muted-foreground text-sm">No data</p>;
return <ActualData />;
```

---

## 8. Component Reference

### SummaryCards (Overview)

```
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Server  │ │Memory  │ │CPU     │ │Uptime  │
│ 3/6    │ │ 128/512│ │ 4 cores│ │ 12h    │
│Running │ │ Used MB│ │  0.5   │ │ 🔋85%  │
└────────┘ └────────┘ └────────┘ └────────┘
```

- Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Polls every 10s
- Source: `GET /api/summary`

### ServiceGrid + ServiceCard

```
┌────────────────────────────────────┐
│ polybot-combined           Running │
│ run: pid 24823, 712s               │
│ [▶ Start] [■ Stop] [↻ Restart]    │
└────────────────────────────────────┘
```

- 3-column responsive grid
- Each card: name, status badge (color-coded), raw status text, 3 action buttons
- Actions: start, stop, restart via `POST /api/services/:name/:action`
- Status polling every 5s
- Loading/disabled states during actions

### ProcessList

```
  CPU%  MEM%  COMMAND
  12.3   8.1  node bridge/server.cjs
   5.1   2.3  python3 api/server.py
  ...
```

- Single card with table rows
- Top processes sorted by CPU
- Source: `GET /api/processes`
- `font-mono` for command names

### SystemInfo

```
┌─────────────────┐ ┌─────────────────┐
│ System           │ │ Memory & Disk   │
│ OS: Android 14   │ │ Mem: 7.2G/11.8G │
│ Host: localhost  │ │ Disk: 89G/223G  │
│ Arch: aarch64    │ │                 │
│ Termux: 0.118.1  │ │                 │
└─────────────────┘ └─────────────────┘
```

- 2-column grid
- Left: OS, hostname, Android version, arch, Termux version
- Right: Memory + disk (pre-formatted)
- Source: `GET /api/system`

### WebServices

```
┌──────────────────────────────────────┐
│ 🌐 Hermes Dashboard        [Online]  │
│ http://localhost:5300         [🔗]   │
└──────────────────────────────────────┘
```

- Shows detected web services with URLs
- Status badge (Online/Offline)
- External link button
- Source: `GET /api/web-services`
- Polls every 10s

### NetworkInfo

```
┌──────────────────────────────────────┐
│ Network Interfaces                   │
│ wlan0: 192.168.1.100                 │
│ lo:    127.0.0.1                     │
└──────────────────────────────────────┘
```

- Single card with interface list
- Source: `GET /api/network`

### HermesChat

Full chat interface with:
- Session list (left sidebar / mobile drawer)
- Message history with date grouping
- Text input with auto-resize
- Send button with loading state
- Model badge
- Session search, delete, create
- Source: `http://localhost:5300` (bridge API)

### IFramePage

Generic wrapper for embedding external UIs:

```jsx
export function IFramePage({ url, title }) {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -mx-3 md:-mx-6 -mb-6">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b text-xs text-muted-foreground shrink-0">
        <span className="truncate font-mono">{url}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
          <ExternalLink className="h-3 w-3" /> Open in new tab
        </a>
      </div>
      <iframe src={url} title={title} className="w-full flex-1 border-0" style={{ background: "#fff" }} />
    </div>
  );
}
```

Used for: 9Router, Workflow Builder, Codex Web UI, etc.

### DesignStudio

Theme designer with:
- Color pickers: primary, background, text, accent, border, card, success, warning, error
- Real-time preview
- CSS export (copy or download)
- Tab interface (Colors, Typography, CSS Output)

### ZESDashboard

- Shows ZES system health metrics
- Service links to related UIs
- Source: `http://localhost:8082/api/health`

---

## 9. Kanban Board

### Architecture

```
KanbanBoard              ← Page component, fetches data, owns state
├── CreateTaskModal      ← Dialog for new tasks (title, body, priority, assignee)
├── TaskDetailModal      ← Dialog for viewing/editing existing task
├── KanbanColumn         ← Renders column header + task list, handles drops
├── TaskCard             ← Draggable card with actions
└── Stats Bar            ← Column summary counts
```

### 8-Column Workflow

| Column | Purpose | Color |
|--------|---------|-------|
| `triage` | Incoming, needs review | Gray |
| `todo` | Queued, not started | Blue |
| `scheduled` | Time-bound tasks | Purple |
| `ready` | Dependencies met | Emerald |
| `running` | In progress | Amber |
| `blocked` | Stuck on something | Red |
| `review` | Needs approval | Cyan |
| `done` | Completed | Green |

### Drag and Drop (Native HTML5)

```jsx
// TaskCard (draggable)
<div draggable onDragStart={(e) => {
  e.dataTransfer.setData("text/plain", JSON.stringify({ id, from: task.status }));
}} />

// KanbanColumn (drop target)
<div onDragOver={(e) => e.preventDefault()}
     onDrop={(e) => {
       const { id, from } = JSON.parse(e.dataTransfer.getData("text/plain"));
       onStatusChange(id, from, column.id);
     }} />
```

### Mobile: Columns ↔ List Toggle

```jsx
const [mobileView, setMobileView] = useState("columns"); // "columns" | "list"

// Mobile list view: accordion-style by column
{isMobile && mobileView === "list" ? (
  board.columns.map(col => (
    <div key={col.name}>
      <button onClick={() => setExpandedCol(col.name)}>
        <span>{col.label}</span> <Badge>{col.tasks.length}</Badge>
        {isExpanded ? <ChevronUp /> : <ChevronDown />}
      </button>
      {isExpanded && col.tasks.map(task => <TaskCard ... />)}
    </div>
  ))
) : (
  // Desktop: horizontal scrollable columns
  <div className="flex gap-3 overflow-x-auto pb-4">
    {board.columns.map(col => <KanbanColumn ... />)}
  </div>
)}
```

### Data Model

```js
task = {
  id: string,
  title: string,
  body: string,
  status: "triage" | "todo" | "scheduled" | "ready" | "running" | "blocked" | "review" | "done",
  priority: 0 | 1 | 2 | 3,   // Low, Medium, High, Urgent
  assignee: string | null,
  tenant: string | null,      // Context tag (e.g. "9Router", "Hermes")
  created_at: unix_timestamp,
  tags: string[],
}
```

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/kanban` | Fetch full board with columns |
| POST | `/api/kanban/tasks` | Create task |
| PUT | `/api/kanban/tasks/:id` | Update task |
| DELETE | `/api/kanban/tasks/:id` | Delete task |

### Task Card Layout

```
┌─────────────────────────────────────┐
│ ⠿ High [9Router]           [✏️][🗑️] │
│ Implement chat streaming            │
│ backlog description text...         │
│ ─────────────────────────────────── │
│ 👤 user   3h ago          [→][→][→] │
└─────────────────────────────────────┘
```

### Usage

```jsx
import { KanbanBoard } from "./components/KanbanBoard";

// In DashboardLayout tabs:
"kanban": { title: "Kanban Board", component: KanbanBoard, noPadding: true }
```

Access via URL hash: `http://localhost:5173/#kanban`

---

## 10. Build & Deploy

```bash
# Development (Termux — use polling to avoid ENOSPC)
npx vite --port 5173 --host 127.0.0.1

# Production build
npm run build
# Output → dist/

# Preview production build
npm run preview
```

### Termux-Specific Notes

- **No `node_modules` watch**: Use `usePolling: true` to avoid `ENOSPC` from inotify limits
- **No Docker**: Run `vite` directly, not through containers
- **No react-router**: Hash-based routing works with file:// or embedded contexts
- **No React Query**: Simple `fetch` + `useEffect` reduces bundle size and complexity
- **No shadcn CLI**: Copy component files manually to avoid npm build hooks that fail on Termux
- **Background processes**: Use `setsid` to persist processes across shell sessions

### Mobile Testing

- Use `localhost` in Termux browser or via cloudflared tunnel
- Responsive breakpoint: 768px (md)
- Add `?` query param or use DevTools device mode to test mobile
- Bottom nav shows on screens < 768px wide
- Sheet drawer provides access to full nav on mobile
- `pb-20` on main content prevents nav bar overlap
