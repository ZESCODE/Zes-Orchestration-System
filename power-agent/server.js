#!/usr/bin/env node
import { Server } from './node_modules/@modelcontextprotocol/sdk/dist/esm/server/index.js';
import { StdioServerTransport } from './node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import { SSEServerTransport } from './node_modules/@modelcontextprotocol/sdk/dist/esm/server/sse.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from './node_modules/@modelcontextprotocol/sdk/dist/esm/types.js';
import { SkillRegistry } from './registry.js';
import { CDPSkill } from './skills/cdp.js';
import { FileSystemSkill } from './skills/filesystem.js';
import { RESTAPISkill } from './skills/rest-api.js';
import { DatabaseSkill } from './skills/database.js';
import { SSHSkill } from './skills/ssh.js';
import { SystemSkill } from './skills/system.js';
import http from 'http';

const registry = new SkillRegistry();
registry.register('cdp', new CDPSkill());
registry.register('fs', new FileSystemSkill());
registry.register('api', new RESTAPISkill({ baseUrl: '' }));
registry.register('db', new DatabaseSkill({ readOnly: true, dbPath: process.env.ZES_MEMORY_DB || '' }));
registry.register('ssh', new SSHSkill('localhost', process.env.USER || 'root'));
registry.register('sys', new SystemSkill({
  allowedCommands: ['npm', 'node', 'git', 'pnpm', 'python3', 'bash', 'sh', 'ls', 'cat', 'curl', 'rg', 'find', 'sqlite3', 'echo', 'mkdir', 'cp', 'mv', 'rm', 'chmod', 'pgrep', 'which', 'ps', 'top', 'free', 'df', 'du', 'uname', 'date', 'whoami', 'pwd', 'cd', 'vercel', 'npx'],
}));

const allTools = registry.getAllTools();

const server = new Server(
  { name: 'zes-power-agent', version: '1.0.0' },
  { capabilities: { tools: {}, logging: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema || { type: 'object', properties: {} },
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await registry.execute(name, args || {});
    if (!result.success) {
      return {
        content: [{ type: 'text', text: `Error: ${result.error}` }],
        isError: true,
      };
    }
    const data = result.data;
    if (data && data.data && name.includes('screenshot')) {
      return {
        content: [{ type: 'image', data: data.data, mimeType: `image/${data.format || 'png'}` }],
      };
    }
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    return { content: [{ type: 'text', text }] };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Internal error: ${err.message}` }],
      isError: true,
    };
  }
});

async function startStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Power Agent] MCP server ready on stdio');
}

async function startSSE(port) {
  const transports = new Map();
  const app = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname === '/sse') {
      const transport = new SSEServerTransport('/messages', res);
      transports.set(transport.sessionId, transport);
      res.on('close', () => transports.delete(transport.sessionId));
      await server.connect(transport);
      return;
    }
    if (url.pathname === '/messages') {
      const transport = transports.get(url.searchParams.get('sessionId'));
      if (transport) { await transport.handlePostMessage(req, res); return; }
      res.writeHead(404); res.end('Session not found');
      return;
    }
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok', skills: registry.getAll().map(s => s.name), tools: allTools.length,
      }));
      return;
    }
    res.writeHead(404); res.end('Not found');
  });
  app.listen(port, () => {
    console.error(`[Power Agent] MCP server ready on http://localhost:${port}/sse`);
    console.error(`[Power Agent] Health check: http://localhost:${port}/health`);
  });
}

const port = process.env.POWER_AGENT_PORT;
if (port) startSSE(parseInt(port));
else startStdio();

process.on('SIGINT', async () => {
  console.error('\n[Power Agent] Shutting down...');
  await server.close();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  console.error('\n[Power Agent] Shutting down...');
  await server.close();
  process.exit(0);
});
