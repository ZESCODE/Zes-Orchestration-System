// MCP Tools — Controls Chrome via CDP on :9222
// Uses Chrome DevTools Protocol directly

const CDP_URL = 'http://localhost:9222/json';

export class ToolRegistry {
  constructor() {
    this._tools = new Map();
    this._ws = null;
    this._msgId = 1;
    this._pending = new Map();
    this.registerDefaults();
  }

  async _connect() {
    const res = await fetch(CDP_URL);
    const targets = await res.json();
    const tab = targets.find(t => t.type === 'page') || targets[0];
    if (!tab) throw new Error('No browser tab found via CDP. Is Chrome running with --remote-debugging-port=9222?');

    this._ws = new WebSocket(tab.webSocketDebuggerUrl);
    this._ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this._pending.has(data.id)) {
        const { resolve } = this._pending.get(data.id);
        this._pending.delete(data.id);
        if (data.error) resolve({ error: data.error });
        else resolve(data.result);
      }
    };
    return new Promise((resolve, reject) => {
      this._ws.onopen = () => resolve();
      this._ws.onerror = (e) => reject(new Error('CDP WebSocket connection failed'));
    });
  }

  async _send(method, params = {}) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) await this._connect();
    const id = this._msgId++;
    this._ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) => {
      this._pending.set(id, { resolve });
    });
  }

  async _evaluate(expression) {
    const result = await this._send('Runtime.evaluate', {
      expression, returnByValue: true
    });
    if (result.error) throw new Error(result.error.message);
    return result.result?.value;
  }

  async _navigate(url, waitMs = 2000) {
    await this._send('Page.enable');
    await this._send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, waitMs));
    return await this._evaluate(
      'JSON.stringify({title: document.title, text: document.body.innerText.slice(0,10000)})'
    ).then(v => v ? JSON.parse(v) : { title: 'Unknown', text: '' });
  }

  register(name, tool) { this._tools.set(name, tool); }
  get(name) { return this._tools.get(name); }
  list() { return Array.from(this._tools.values()); }

  registerDefaults() {
    // browse — Navigate to URL
    this.register('browse', {
      name: 'browse',
      description: 'Navigate to a URL and return page content',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Full URL to navigate to' }
        },
        required: ['url']
      },
      execute: async (args) => {
        const ctx = await this._navigate(args.url);
        const text = ctx.text ? ctx.text.slice(0, 5000) : '(empty page)';
        return {
          content: [{
            type: 'text',
            text: `Title: ${ctx.title || 'Untitled'}\nURL: ${args.url}\n\n${text}`
          }]
        };
      }
    });

    // screenshot — Capture visible tab
    this.register('screenshot', {
      name: 'screenshot',
      description: 'Take a screenshot of the current tab',
      inputSchema: { type: 'object', properties: {}, required: [] },
      execute: async () => {
        await this._send('Page.enable');
        const result = await this._send('Page.captureScreenshot', { format: 'png' });
        return {
          content: [{
            type: 'image',
            data: `data:image/png;base64,${result.data}`,
            mimeType: 'image/png'
          }]
        };
      }
    });

    // click — Click element
    this.register('click', {
      name: 'click',
      description: 'Click an element by CSS selector',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector for element to click' }
        },
        required: ['selector']
      },
      execute: async (args) => {
        const s = args.selector.replace(/'/g, "\\'");
        const result = await this._evaluate(
          `(() => { const e = document.querySelector('${s}'); if (!e) return 'NOT_FOUND'; e.click(); return 'CLICKED'; })()`
        );
        if (result === 'NOT_FOUND') throw new Error(`Element not found: ${args.selector}`);
        return { content: [{ type: 'text', text: `Clicked: ${args.selector}` }] };
      }
    });

    // type — Type text into field
    this.register('type', {
      name: 'type',
      description: 'Type text into an input field',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector for input element' },
          text: { type: 'string', description: 'Text to type' }
        },
        required: ['selector', 'text']
      },
      execute: async (args) => {
        const s = args.selector.replace(/'/g, "\\'");
        const t = args.text.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
        const result = await this._evaluate(
          `(() => { const e = document.querySelector('${s}'); if (!e) return 'NOT_FOUND'; e.value = '${t}'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return 'TYPED'; })()`
        );
        if (result === 'NOT_FOUND') throw new Error(`Element not found: ${args.selector}`);
        return { content: [{ type: 'text', text: `Typed into: ${args.selector}` }] };
      }
    });

    // extract — Get text from page
    this.register('extract', {
      name: 'extract',
      description: 'Extract text from the page or a specific element',
      inputSchema: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector (use "body" for full page)',
            default: 'body'
          }
        },
        required: []
      },
      execute: async (args) => {
        const sel = args.selector || 'body';
        const s = sel.replace(/'/g, "\\'");
        const text = await this._evaluate(
          `(() => { const e = document.querySelector('${s}'); return e ? (e.textContent || e.innerText || '').slice(0, 10000) : 'ELEMENT_NOT_FOUND'; })()`
        );
        if (text === 'ELEMENT_NOT_FOUND' && sel !== 'body') {
          throw new Error(`Element not found: ${sel}`);
        }
        return { content: [{ type: 'text', text: text || '(empty)' }] };
      }
    });

    // wait — Wait for element to appear
    this.register('wait', {
      name: 'wait',
      description: 'Wait for an element to appear on the page',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector to wait for' },
          timeout: { type: 'number', description: 'Max wait in ms', default: 10000 }
        },
        required: ['selector']
      },
      execute: async (args) => {
        const s = args.selector.replace(/'/g, "\\'");
        const timeout = args.timeout || 10000;
        const start = Date.now();
        let found = false;
        while (Date.now() - start < timeout) {
          const result = await this._evaluate(`!!document.querySelector('${s}')`);
          if (result) { found = true; break; }
          await new Promise(r => setTimeout(r, 500));
        }
        return {
          content: [{
            type: 'text',
            text: found ? `Element appeared: ${args.selector}` : `Timeout after ${timeout}ms: ${args.selector}`
          }]
        };
      }
    });

    // auth — Start OAuth for service
    this.register('auth', {
      name: 'auth',
      description: 'Start OAuth flow for a connected service',
      inputSchema: {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            enum: ['gmail', 'drive', 'calendar', 'github', 'slack'],
            description: 'Service to authenticate'
          }
        },
        required: ['service']
      },
      execute: async (args) => {
        await this._navigate(`http://localhost:8083/auth/${args.service}`);
        return {
          content: [{
            type: 'text',
            text: `Auth flow started for ${args.service}. Complete OAuth in the browser.`
          }]
        };
      }
    });

    // run_task — Full autonomous task
    this.register('run_task', {
      name: 'run_task',
      description: 'Run an autonomous browser task via AI',
      inputSchema: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Natural language task to complete' }
        },
        required: ['task']
      },
      execute: async (args) => {
        const res = await fetch('http://localhost:8083/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: args.task,
            history: [],
            mode: 'autonomous'
          })
        });
        if (!res.ok) throw new Error(`Dashboard API error: ${res.status}`);
        const data = await res.json();
        return {
          content: [{
            type: 'text',
            text: data.text || data.message || JSON.stringify(data)
          }]
        };
      }
    });
  }
}
