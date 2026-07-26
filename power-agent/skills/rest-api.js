export class RESTAPISkill {
  constructor(options = {}) {
    this.name = 'api';
    this.description = 'HTTP client for REST API calls';
    this.baseUrl = options.baseUrl || '';
  }

  _isExternal(url) {
    try {
      const u = new URL(url);
      return !['localhost', '127.0.0.1', '0.0.0.0', '[::1]', ''].includes(u.hostname) && !u.hostname.endsWith('.local');
    } catch { return false; }
  }

  tools() {
    return [
      { name: 'get', description: 'HTTP GET request', inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
      { name: 'post', description: 'HTTP POST with JSON body', inputSchema: { type: 'object', properties: { url: { type: 'string' }, body: { type: 'object' } }, required: ['url', 'body'] } },
      { name: 'put', description: 'HTTP PUT request', inputSchema: { type: 'object', properties: { url: { type: 'string' }, body: { type: 'object' } }, required: ['url', 'body'] } },
      { name: 'patch', description: 'HTTP PATCH request', inputSchema: { type: 'object', properties: { url: { type: 'string' }, body: { type: 'object' } }, required: ['url', 'body'] } },
      { name: 'delete', description: 'HTTP DELETE request', inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
    ];
  }

  async execute(toolName, args) {
    const url = args.url.startsWith('http') ? args.url : `${this.baseUrl}${args.url}`;
    if (this._isExternal(url)) console.warn(`[API] External request to: ${url}`);
    const method = toolName.toUpperCase();
    const headers = { 'Content-Type': 'application/json', ...(args.headers || {}) };
    const body = ['POST', 'PUT', 'PATCH'].includes(method) && args.body ? JSON.stringify(args.body) : undefined;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), args.timeout || 30000);
      const response = await fetch(url, { method, headers, body, signal: controller.signal });
      clearTimeout(timeout);
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : await response.text();
      return { status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers.entries()), data };
    } catch (err) {
      return { error: err.message, url, method };
    }
  }
}
