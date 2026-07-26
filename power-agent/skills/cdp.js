import WebSocket from 'ws';

const CDP_WS_URL = 'ws://127.0.0.1:9222/devtools/browser';

export class CDPSkill {
  constructor() {
    this.name = 'cdp';
    this.description = 'Chrome browser automation via CDP';
    this._ws = null;
    this._msgId = 0;
    this._pending = new Map();
    this._connected = false;
  }

  async _connect() {
    if (this._connected && this._ws) return;
    try {
      const resp = await fetch('http://127.0.0.1:9222/json/version');
      const data = await resp.json();
      const targetUrl = data.webSocketDebuggerUrl || CDP_WS_URL;
      this._ws = new WebSocket(targetUrl);
    } catch {
      this._ws = new WebSocket(CDP_WS_URL);
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('CDP connection timeout')), 10000);
      this._ws.on('open', () => { this._connected = true; clearTimeout(timeout); resolve(); });
      this._ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.id && this._pending.has(msg.id)) {
            const { resolve: res } = this._pending.get(msg.id);
            this._pending.delete(msg.id);
            res(msg);
          }
        } catch {}
      });
      this._ws.on('close', () => { this._connected = false; });
      this._ws.on('error', (err) => { this._connected = false; clearTimeout(timeout); reject(err); });
    });
  }

  async _send(method, params = {}) {
    await this._connect();
    const id = ++this._msgId;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`CDP command '${method}' timed out`)), 30000);
      this._pending.set(id, { resolve, reject: (err) => { clearTimeout(timeout); reject(err); } });
      this._ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async _getTargets() {
    try {
      const resp = await fetch('http://127.0.0.1:9222/json');
      return await resp.json();
    } catch { return []; }
  }

  async _attachToPage(urlFilter) {
    const targets = await this._getTargets();
    const page = urlFilter
      ? targets.find(t => t.type === 'page' && t.url.includes(urlFilter))
      : targets.find(t => t.type === 'page');
    if (!page) throw new Error('No page target found');
    return page.id;
  }

  async _attachToTarget(targetId) {
    const result = await this._send('Target.attachToTarget', { targetId, flatten: true });
    return result.result.sessionId;
  }

  async _sendWithSession(sessionId, method, params = {}) {
    await this._connect();
    const id = ++this._msgId;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`CDP session command '${method}' timed out`)), 30000);
      this._pending.set(id, { resolve, reject: (err) => { clearTimeout(timeout); reject(err); } });
      this._ws.send(JSON.stringify({ id, method, params, sessionId }));
    }).then(msg => {
      if (msg.error) throw new Error(msg.error.message);
      return msg.result;
    });
  }

  tools() {
    return [
      { name: 'navigate', description: 'Navigate Chrome to a URL and wait for load', inputSchema: { type: 'object', properties: { url: { type: 'string', description: 'URL to navigate to' } }, required: ['url'] } },
      { name: 'screenshot', description: 'Capture screenshot of the current page', inputSchema: { type: 'object', properties: { format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' }, fullPage: { type: 'boolean', default: false } } } },
      { name: 'evaluate', description: 'Execute JavaScript in the page context', inputSchema: { type: 'object', properties: { expression: { type: 'string', description: 'JavaScript expression' } }, required: ['expression'] } },
      { name: 'getConsoleLogs', description: 'Retrieve console log entries', inputSchema: { type: 'object', properties: {} } },
      { name: 'getNetworkRequests', description: 'List network requests made by the page', inputSchema: { type: 'object', properties: {} } },
      { name: 'getAccessibilityTree', description: 'Get full accessibility tree', inputSchema: { type: 'object', properties: {} } },
      { name: 'getDOMSnapshot', description: 'Get full DOM snapshot as HTML', inputSchema: { type: 'object', properties: {} } },
      { name: 'highlightElement', description: 'Highlight element by CSS selector', inputSchema: { type: 'object', properties: { selector: { type: 'string' } }, required: ['selector'] } },
      { name: 'listTabs', description: 'List all open browser tabs', inputSchema: { type: 'object', properties: {} } },
      { name: 'click', description: 'Click element by CSS selector', inputSchema: { type: 'object', properties: { selector: { type: 'string' } }, required: ['selector'] } },
      { name: 'setViewport', description: 'Set viewport size', inputSchema: { type: 'object', properties: { width: { type: 'number', default: 1280 }, height: { type: 'number', default: 720 } }, required: ['width', 'height'] } },
      { name: 'startPerformanceTrace', description: 'Start collecting performance metrics', inputSchema: { type: 'object', properties: {} } },
      { name: 'stopPerformanceTrace', description: 'Stop and return performance metrics', inputSchema: { type: 'object', properties: {} } },
    ];
  }

  async execute(toolName, args) {
    switch (toolName) {
      case 'navigate': {
        const targetId = args.targetId || await this._attachToPage();
        const sessionId = await this._attachToTarget(targetId);
        await this._sendWithSession(sessionId, 'Page.enable');
        const result = await this._sendWithSession(sessionId, 'Page.navigate', { url: args.url });
        return { url: args.url, frameId: result.frameId };
      }
      case 'screenshot': {
        const targetId = args.targetId || await this._attachToPage();
        const sessionId = await this._attachToTarget(targetId);
        await this._sendWithSession(sessionId, 'Page.enable');
        const result = await this._sendWithSession(sessionId, 'Page.captureScreenshot', {
          format: args.format || 'png', quality: args.quality || 80, captureBeyondViewport: !!args.fullPage,
        });
        return { data: result.data, format: args.format || 'png' };
      }
      case 'evaluate': {
        const targetId = args.targetId || await this._attachToPage();
        const sessionId = await this._attachToTarget(targetId);
        const result = await this._sendWithSession(sessionId, 'Runtime.evaluate', {
          expression: args.expression, returnByValue: true,
        });
        if (result.exceptionDetails) return { error: result.exceptionDetails.text };
        return { result: result.result.value ?? result.result.description };
      }
      case 'getConsoleLogs': {
        const targetId = args.targetId || await this._attachToPage();
        const sessionId = await this._attachToTarget(targetId);
        const logs = [];
        const origHandler = this._ws.onmessage;
        this._ws.onmessage = (raw) => {
          try { const m = JSON.parse(raw.toString()); if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params); } catch {}
        };
        await this._sendWithSession(sessionId, 'Runtime.enable');
        await new Promise(r => setTimeout(r, 500));
        this._ws.onmessage = origHandler;
        return { logs };
      }
      case 'getNetworkRequests': {
        const targetId = args.targetId || await this._attachToPage();
        const sessionId = await this._attachToTarget(targetId);
        const requests = [];
        const origHandler = this._ws.onmessage;
        this._ws.onmessage = (raw) => {
          try { const m = JSON.parse(raw.toString()); if (m.method === 'Network.requestWillBeSent') requests.push(m.params); } catch {}
        };
        await this._sendWithSession(sessionId, 'Network.enable');
        await new Promise(r => setTimeout(r, 500));
        this._ws.onmessage = origHandler;
        return { requests };
      }
      case 'getAccessibilityTree': {
        const targetId = args.targetId || await this._attachToPage();
        const sessionId = await this._attachToTarget(targetId);
        const result = await this._sendWithSession(sessionId, 'Accessibility.getFullAXTree');
        return { nodes: result.nodes };
      }
      case 'getDOMSnapshot': {
        const targetId = args.targetId || await this._attachToPage();
        const sessionId = await this._attachToTarget(targetId);
        await this._sendWithSession(sessionId, 'DOM.enable');
        const root = await this._sendWithSession(sessionId, 'DOM.getDocument', { depth: -1 });
        return { html: root.root.outerHTML };
      }
      case 'highlightElement': {
        const targetId = args.targetId || await this._attachToPage();
        const sessionId = await this._attachToTarget(targetId);
        await this._sendWithSession(sessionId, 'DOM.enable');
        const nodeId = 1;
        await this._sendWithSession(sessionId, 'DOM.querySelector', { nodeId, selector: args.selector });
        await this._sendWithSession(sessionId, 'Overlay.enable');
        await this._sendWithSession(sessionId, 'Overlay.highlightNode', {
          nodeId, highlightConfig: { borderColor: { r: 255, g: 0, b: 0, a: 1 } },
        });
        return { highlighted: true, selector: args.selector };
      }
      case 'listTabs': {
        const targets = await this._getTargets();
        return targets.map(t => ({ id: t.id, title: t.title, url: t.url, type: t.type }));
      }
      case 'click': {
        const targetId = args.targetId || await this._attachToPage();
        const sessionId = await this._attachToTarget(targetId);
        await this._sendWithSession(sessionId, 'Runtime.evaluate', {
          expression: `document.querySelector('${args.selector.replace(/'/g, "\\'")}')?.click()`,
        });
        return { clicked: true, selector: args.selector };
      }
      case 'setViewport': {
        const targetId = args.targetId || await this._attachToPage();
        const sessionId = await this._attachToTarget(targetId);
        await this._sendWithSession(sessionId, 'Emulation.setDeviceMetricsOverride', {
          width: args.width || 1280, height: args.height || 720,
          deviceScaleFactor: args.deviceScaleFactor || 1, mobile: args.mobile || false,
        });
        return { viewport: { width: args.width, height: args.height } };
      }
      case 'startPerformanceTrace': {
        const targetId = args.targetId || await this._attachToPage();
        const sessionId = await this._attachToTarget(targetId);
        await this._sendWithSession(sessionId, 'Tracing.start', {
          categories: '-*,disabled-by-default-devtools.timeline,devtools.timeline',
        });
        return { tracing: true };
      }
      case 'stopPerformanceTrace': {
        const targetId = args.targetId || await this._attachToPage();
        const sessionId = await this._attachToTarget(targetId);
        const events = [];
        const origHandler = this._ws.onmessage;
        this._ws.onmessage = (raw) => {
          try { const m = JSON.parse(raw.toString()); if (m.method === 'Tracing.dataCollected') events.push(...m.params.value); } catch {}
        };
        await this._sendWithSession(sessionId, 'Tracing.end');
        await new Promise(r => setTimeout(r, 1000));
        this._ws.onmessage = origHandler;
        return { events, count: events.length };
      }
      default: throw new Error(`Unknown CDP tool: ${toolName}`);
    }
  }
}
