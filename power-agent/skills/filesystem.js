import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ALLOWED_PREFIXES = [process.env.HOME || '/data/data/com.termux/files/home', '/tmp', '/data/data/com.termux/files/usr/tmp'];

export class FileSystemSkill {
  constructor() {
    this.name = 'fs';
    this.description = 'Filesystem operations — read, write, search, list files';
  }

  _ensureSafe(targetPath) {
    const resolved = path.resolve(targetPath);
    if (!ALLOWED_PREFIXES.some(p => resolved.startsWith(p)) && !resolved.startsWith('/data/data/com.termux')) {
      throw new Error(`Access denied: '${targetPath}' is outside allowed directories`);
    }
    return resolved;
  }

  tools() {
    return [
      { name: 'read', description: 'Read file contents', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
      { name: 'write', description: 'Write content to a file', inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
      { name: 'append', description: 'Append content to a file', inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
      { name: 'list', description: 'List directory contents', inputSchema: { type: 'object', properties: { path: { type: 'string' }, recursive: { type: 'boolean', default: false } }, required: ['path'] } },
      { name: 'delete', description: 'Delete a file', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
      { name: 'mkdir', description: 'Create directory (recursive)', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
      { name: 'exists', description: 'Check if file/directory exists', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
      { name: 'stat', description: 'Get file/directory stats', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
      { name: 'search', description: 'Search files by name pattern', inputSchema: { type: 'object', properties: { root: { type: 'string' }, pattern: { type: 'string' }, maxDepth: { type: 'number', default: 5 } }, required: ['root', 'pattern'] } },
      { name: 'grep', description: 'Search file contents for pattern', inputSchema: { type: 'object', properties: { pattern: { type: 'string' }, path: { type: 'string' }, maxResults: { type: 'number', default: 20 } }, required: ['pattern', 'path'] } },
    ];
  }

  async execute(toolName, args) {
    switch (toolName) {
      case 'read': {
        const p = this._ensureSafe(args.path);
        return { content: fs.readFileSync(p, 'utf-8'), path: args.path };
      }
      case 'write': {
        const p = this._ensureSafe(args.path);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, args.content, 'utf-8');
        return { written: true, path: args.path, size: Buffer.byteLength(args.content, 'utf-8') };
      }
      case 'append': {
        const p = this._ensureSafe(args.path);
        fs.appendFileSync(p, args.content);
        return { appended: true, path: args.path };
      }
      case 'list': {
        const p = this._ensureSafe(args.path);
        if (args.recursive) {
          const result = []; const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); result.push(path.relative(p, f)); if (e.isDirectory()) walk(f); } };
          walk(p); return { entries: result, count: result.length };
        }
        return { entries: fs.readdirSync(p, { withFileTypes: true }).map(e => ({ name: e.name, type: e.isDirectory() ? 'directory' : 'file' })) };
      }
      case 'delete': {
        const p = this._ensureSafe(args.path);
        fs.rmSync(p, { recursive: true, force: true });
        return { deleted: true, path: args.path };
      }
      case 'mkdir': {
        const p = this._ensureSafe(args.path);
        fs.mkdirSync(p, { recursive: true });
        return { created: true, path: args.path };
      }
      case 'exists': {
        const p = this._ensureSafe(args.path);
        return { exists: fs.existsSync(p), path: args.path };
      }
      case 'stat': {
        const p = this._ensureSafe(args.path);
        const s = fs.statSync(p);
        return { path: args.path, size: s.size, isDirectory: s.isDirectory(), isFile: s.isFile(), modified: s.mtime };
      }
      case 'search': {
        const root = this._ensureSafe(args.root);
        try {
          const output = execSync(`find "${root}" -maxdepth ${args.maxDepth || 5} -name "${args.pattern}" -type f 2>/dev/null | head -100`, { encoding: 'utf-8', timeout: 10000 });
          const files = output.trim().split('\n').filter(Boolean);
          return { files, count: files.length };
        } catch { return { files: [], count: 0 }; }
      }
      case 'grep': {
        const p = this._ensureSafe(args.path);
        try {
          const isDir = fs.statSync(p).isDirectory();
          const target = isDir ? `-r "${p}"` : `"${p}"`;
          const output = execSync(`rg -n --max-count ${args.maxResults || 20} "${args.pattern.replace(/"/g, '\\"')}" ${target} 2>/dev/null | head -${args.maxResults || 20}`, { encoding: 'utf-8', timeout: 15000 });
          const lines = output.trim().split('\n').filter(Boolean);
          return { results: lines, count: lines.length };
        } catch { return { results: [], count: 0 }; }
      }
      default: throw new Error(`Unknown FS tool: ${toolName}`);
    }
  }
}
