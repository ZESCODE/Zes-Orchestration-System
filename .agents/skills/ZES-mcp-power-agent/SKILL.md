---
name: ZES-mcp-power-agent
description: MCP Power Agent — unified browser automation (via browser-harness + browser-use), CDP control, filesystem, API, DB, SSH, and system skills in a single MCP server with skill registry pattern. For Hermes, Codex, and autonomous agent use.
metadata:
  origin: ZES
  version: 1.0.0
  requires:
    - Node.js >= 18
    - Chrome/Chromium 150+ (CDP on :9222)
    - 9Router (:20128) for LLM routing
    - browser-harness (pip3 install browser-harness) — direct CDP control
    - browser-use (pip3 install browser-use) — AI-driven browser automation
---

# MCP Power Agent — Unified Skill Server

## Overview

The MCP Power Agent is a **multi-capability MCP server** that combines CDP browser automation, filesystem operations, REST API calls, database queries, SSH execution, and system commands into a single, agent-friendly interface. It uses the **Skill Registry pattern** to expose every capability as a discrete MCP tool.

```
┌─────────────────────────────────────────────────────┐
│                 MCP Power Agent                      │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ CDP Skill │  │  FS Skill │  │   REST API Skill │   │
│  │ (browser) │  │ (files)   │  │   (HTTP client)  │   │
│  └─────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│        │              │                  │              │
│  ┌─────┴─────┐  ┌────┴────┐  ┌─────────┴────────┐   │
│  │ DB Skill   │  │ SSH Skill│  │  System Skill    │   │
│  │ (SQL)      │  │ (remote) │  │  (shell exec)    │   │
│  └─────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│        │              │                  │              │
│        └──────────────┴──────────────────┘              │
│                         │                               │
│              ┌──────────▼──────────┐                    │
│              │   Skill Registry    │                    │
│              │  (tool dispatcher)  │                    │
│              └──────────┬──────────┘                    │
│                         │                               │
│              ┌──────────▼──────────┐                    │
│              │   MCP Transport     │                    │
│              │  (stdio / HTTP)     │                    │
│              └─────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## Architecture

### Skill Registry Pattern

The Power Agent uses a `SkillRegistry` class that dynamically registers and dispatches skill instances. Each skill implements a standard interface with async methods, structured error handling, and typed return values.

```typescript
interface Skill {
  name: string;
  description: string;
  tools(): ToolDefinition[];
  execute(toolName: string, args: Record<string, any>): Promise<SkillResult>;
}

interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
  contentType?: "text" | "json" | "image" | "binary";
}
```

### MCP Tool Mapping

Each skill method becomes an MCP tool with JSON Schema input validation:

```typescript
{
  name: "cdp_navigate",
  description: "Navigate Chrome to a URL and wait for load",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "Full URL to navigate to" },
      waitUntil: { type: "string", enum: ["load", "networkidle", "domcontentloaded"] },
      timeout: { type: "number" }
    },
    required: ["url"]
  }
}
```

## Skill Implementations

### 1. CDP Browser Skill

Wraps the existing `zeschrome-mcp` CDP helpers with expanded tools.

**Tools:** \
| Tool | Description | Key Params | \
|------|-------------|------------| \
| `cdp_navigate` | Navigate to URL | `url`, `waitUntil`, `timeout` | \
| `cdp_click` | Click element by selector | `selector`, `timeout` | \
| `cdp_type` | Type text into input | `selector`, `text`, `delay` | \
| `cdp_extract` | Extract text content | `selector`, `maxLength` | \
| `cdp_screenshot` | Capture screenshot | `format`, `fullPage`, `quality` | \
| `cdp_evaluate` | Execute JavaScript | `expression` | \
| `cdp_get_console_logs` | Get console log entries | `since` | \
| `cdp_get_network_errors` | Get failed network requests | -- | \
| `cdp_get_accessibility` | Get accessibility tree | `depth` | \
| `cdp_list_tabs` | List open Chrome tabs | -- | \
| `cdp_get_performance` | Get performance metrics | -- | \
| `cdp_clear_cache_cookies` | Clear cache/cookies | -- | \
| `cdp_get_dom_snapshot` | Get full DOM snapshot | `includeStyles` | \
| `cdp_inject_css` | Inject custom CSS | `css` | \
| `cdp_wait_for_selector` | Wait for element | `selector`, `timeout`, `state` |

**Implementation pattern (Node.js):**

```typescript
import { withCdpSocket, listTargets, captureScreenshot } from "./cdp-helpers.js";

export class CDPSkill {
  name = "cdp";
  description = "Chrome browser automation via CDP";

  async getWsUrl() {
    const targets = await listTargets();
    const tab = targets.find(t => t.type === "page") || targets[0];
    if (!tab) throw new Error("No browser tab found");
    return tab.webSocketDebuggerUrl;
  }

  async navigate(args: { url: string; waitUntil?: string; timeout?: number }) {
    const wsUrl = await this.getWsUrl();
    return withCdpSocket(wsUrl, async (send) => {
      await send("Page.enable");
      await send("Page.navigate", { url: args.url });
      if (args.waitUntil !== "domcontentloaded") {
        await new Promise(r => setTimeout(r, args.timeout || 5000));
      }
      const state = await send("Runtime.evaluate", {
        expression: "JSON.stringify({ title: document.title, url: location.href, readyState: document.readyState })",
        returnByValue: true
      });
      return { success: true, data: JSON.parse(state.result.value) };
    });
  }

  async screenshot(args: { format?: string; fullPage?: boolean; quality?: number }) {
    const wsUrl = await this.getWsUrl();
    const data = await captureScreenshot(wsUrl, {
      format: args.format || "png",
      fullPage: args.fullPage || false,
      quality: args.quality
    });
    return { success: true, data, contentType: "image" };
  }
}
```

### 2. Filesystem Skill

Read, write, list, manage files in the local filesystem.

**Tools:** `fs_read`, `fs_write`, `fs_append`, `fs_list`, `fs_delete`, `fs_move`, `fs_copy`, `fs_mkdir`, `fs_exists`, `fs_stat`, `fs_search`, `fs_watch`

### 3. REST API Skill

Make HTTP requests to external APIs.

**Tools:** `api_get`, `api_post`, `api_put`, `api_patch`, `api_delete`, `api_upload`, `api_download`

### 4. Database Skill

Execute SQL queries against configured databases.

**Tools:** `db_execute`, `db_query`, `db_list_tables`, `db_describe`

### 5. SSH Skill

Execute commands on remote servers via asyncssh.

**Tools:** `ssh_exec`, `ssh_upload`, `ssh_download`, `ssh_connect`

### 6. System Skill

Execute local shell commands with safety guardrails.

**Tools:** `sys_exec`, `sys_spawn`, `sys_env`, `sys_which`, `sys_pidof`

## MCP Server Implementation

### Full Power Agent Server (Node.js + MCP SDK)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Import all skills
import { CDPSkill } from "./skills/cdp.js";
import { FileSystemSkill } from "./skills/filesystem.js";
import { RESTAPISkill } from "./skills/rest-api.js";
import { DatabaseSkill } from "./skills/database.js";
import { SSHSkill } from "./skills/ssh.js";
import { SystemSkill } from "./skills/system.js";
import { SkillRegistry } from "./registry.js";

// Initialize registry
const registry = new SkillRegistry();
registry.register("cdp", new CDPSkill());
registry.register("fs", new FileSystemSkill());
registry.register("api", new RESTAPISkill({ baseUrl: "" }));
registry.register("db", new DatabaseSkill());
registry.register("ssh", new SSHSkill("localhost", "root"));
registry.register("sys", new SystemSkill({ allowedCommands: ["npm", "node", "git", "pnpm", "python3"] }));

// Create MCP server
const server = new Server(
  { name: "zes-power-agent", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// List all tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools: any[] = [];
  for (const [prefix, skill] of Object.entries(registry.skills)) {
    for (const tool of skill.tools()) {
      tools.push({
        name: `${prefix}_${tool.name}`,
        description: tool.description,
        inputSchema: tool.inputSchema
      });
    }
  }
  return { tools };
});

// Execute tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const [prefix, ...rest] = name.split("_");
  const toolName = rest.join("_");

  try {
    const result = await registry.execute(prefix, toolName, args || {});
    return {
      content: [{
        type: result.contentType === "image" ? "image" : "text",
        ...(result.contentType === "image"
          ? { data: result.data, mimeType: "image/png" }
          : { text: JSON.stringify(result.data ?? result) })
      }]
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error: ${error.message}` }]
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Integration with ZES Ecosystem

### How Agents Use the Power Agent / browser-harness

**Hermes agent:** \
1. User task -> Hermes interprets -> identifies need for browser + file operation \
2. Hermes calls `cdp_navigate` -> Power Agent opens Chrome -> returns page state \
3. Hermes extracts content via `cdp_extract` -> saves data via `fs_write` \
4. If needed -> calls `db_query` to check existing records \
5. Completes task with all data gathered

**Codex agent (via MCP):** \
MCP client connects to Power Agent as an additional MCP server \
-> Gains all tools: cdp_*, fs_*, api_*, db_*, ssh_*, sys_* \
-> Can run browser audits, save results, execute DB queries
-> Or call browser-harness directly for interactive browser control

### Service Registration (runsv)

```bash
mkdir -p /data/data/com.termux/files/usr/var/service/zes-power-agent

cat > /data/data/com.termux/files/usr/var/service/zes-power-agent/run << 'SCRIPT'
#!/data/data/com.termux/files/usr/bin/bash
exec node /data/data/com.termux/files/home/Zes-System/power-agent/server.js
SCRIPT
chmod +x /data/data/com.termux/files/usr/var/service/zes-power-agent/run

ln -s /data/data/com.termux/files/usr/var/service/zes-power-agent \
  /data/data/com.termux/files/home/.9router/services/
sv start zes-power-agent
```

## Skills That Need Updating

### 1. `cdp-audit` — Add:
- Playwright MCP support alongside raw CDP
- Console log streaming (real-time capture)
- Network request interception (mock/block/replay)
- Accessibility tree dump via `Accessibility.getFullAXTree`
- DOM snapshot with computed styles
- Visual diffing via pixelmatch (screenshot comparison)
- Performance tracing (load waterfall)
- Multi-tab management (switch, create, close tabs)

### 2. `browser-qa` — Add:
- Screenshot comparison (baseline vs current)
- Element state verification (visibility, enabled, text)
- Form interaction patterns (fill -> submit -> validate)
- Mobile viewport switching via CDP emulation
- Network condition simulation (throttle, offline)

### 3. `mcp-builder` — Add:
- Reference to Power Agent as multi-skill architecture example
- Skill Registry pattern as recommended tool organization
- ZES deployment instructions (runsv services)

## Skill Registry Reference

```typescript
export class SkillRegistry {
  constructor() {
    this.skills = new Map();
  }

  register(name, skillInstance) {
    this.skills.set(name, skillInstance);
  }

  get(name) {
    return this.skills.get(name);
  }

  list() {
    return Array.from(this.skills.keys());
  }

  async execute(skillName, method, args = {}) {
    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new Error('Skill "' + skillName + '" not found. Available: ' + this.list().join(", "));
    }
    const fn = skill[method];
    if (typeof fn !== "function") {
      throw new Error('Method "' + method + '" not found on skill "' + skillName + '"');
    }
    return fn.call(skill, args);
  }

  toolDefinitions() {
    const tools = [];
    for (const [name, skill] of this.skills) {
      if (typeof skill.tools === "function") {
        for (const tool of skill.tools()) {
          tools.push({
            name: name + "_" + tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          });
        }
      }
    }
    return tools;
  }
}
```

## Quick Start

```bash
# 1. Verify browser-harness is installed and CDP is alive
browser-harness --doctor

# 2. Check CDP is alive (alternative)
curl -s http://127.0.0.1:9222/json/version | python3 -m json.tool

# 3. Verify browser-use is importable
python3 -c "from browser_use import Agent; print('browser-use OK')"

# 4. Quick browser test
browser-harness <<'PY'
new_tab("http://localhost:5050")
print("Title:", page_info()["title"])
capture_screenshot("/tmp/quick-test.png")
PY

# 5. Create Power Agent directory
mkdir -p ~/Zes-System/power-agent/skills

# 6. Install MCP SDK
cd ~/Zes-System/power-agent
npm init -y
npm install @modelcontextprotocol/sdk ws

# 7. Create skills and server
# 8. Run as stdio MCP server
node server.js
```

## Security Considerations

- **Filesystem** — Restrict reads to allowed directories (e.g., `~/Zes-*`)
- **Shell** — Use an allowlist. Never allow `rm -rf`, `sudo`
- **API** — Warn when sending to external hosts. Require opt-in
- **Database** — Read-only by default. Require explicit flag for writes
- **SSH** — Key-based auth only. Never embed passwords
- **CDP** — Warn on external URLs. Don't exfiltrate without context

## Related Skills & Tools

- **browser-harness** — Direct CDP browser control (the runtime layer for CDP Skill)
- **browser-use** — AI-driven browser automation (the agent layer)
- **cdp-audit** — CDP diagnostic and debugging (complements browser-harness)
- **browser-qa** — Visual regression and smoke testing
- **ZES-systematic-debugging** — Full debugging workflow (uses cdp-audit)
- **mcp-builder** — General MCP server creation guide
- **ZES-service-orchestrator** — Service lifecycle management
- **ZES-dashboard** — Dashboard that can be tested via browser-qa
