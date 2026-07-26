import { execSync, spawn } from 'child_process';

export class SystemSkill {
  constructor(options = {}) {
    this.name = 'sys';
    this.description = 'Local system command execution with allowlist';
    this.allowedCommands = options.allowedCommands || ['npm', 'node', 'git', 'pnpm', 'python3', 'bash', 'sh', 'ls', 'cat', 'curl', 'rg', 'find', 'sqlite3', 'echo', 'mkdir', 'cp', 'mv', 'rm', 'chmod'];
  }

  _isAllowed(command) {
    const base = command.trim().split(/\s+/)[0].split('/').pop();
    return this.allowedCommands.some(a => base === a);
  }

  tools() {
    return [
      { name: 'exec', description: 'Execute a shell command (allowlisted)', inputSchema: { type: 'object', properties: { command: { type: 'string' }, timeout: { type: 'number', default: 30000 }, cwd: { type: 'string' } }, required: ['command'] } },
      { name: 'spawn', description: 'Spawn a long-running process', inputSchema: { type: 'object', properties: { command: { type: 'string' }, args: { type: 'array', items: { type: 'string' } }, timeout: { type: 'number', default: 60000 }, cwd: { type: 'string' } }, required: ['command'] } },
      { name: 'env', description: 'Get environment variables', inputSchema: { type: 'object', properties: { key: { type: 'string' } } } },
      { name: 'which', description: 'Find location of a binary', inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } },
      { name: 'pidof', description: 'Find PID of a running process', inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } },
    ];
  }

  async execute(toolName, args) {
    switch (toolName) {
      case 'exec': {
        if (!this._isAllowed(args.command)) return { error: `Command not in allowlist: ${args.command.split(/\s+/)[0]}` };
        try {
          const output = execSync(args.command, { encoding: 'utf-8', timeout: args.timeout || 30000, cwd: args.cwd || process.cwd(), maxBuffer: 10 * 1024 * 1024 });
          return { stdout: output.trim() };
        } catch (err) {
          return { error: err.message, stdout: err.stdout?.toString().trim(), stderr: err.stderr?.toString().trim() };
        }
      }
      case 'spawn': {
        return new Promise(resolve => {
          const proc = spawn(args.command, args.args || [], { cwd: args.cwd || process.cwd(), timeout: args.timeout || 60000, shell: true });
          let stdout = '', stderr = '';
          proc.stdout.on('data', d => stdout += d.toString());
          proc.stderr.on('data', d => stderr += d.toString());
          const t = setTimeout(() => { proc.kill(); resolve({ error: 'Timeout', stdout: stdout.trim(), stderr: stderr.trim() }); }, args.timeout || 60000);
          proc.on('close', code => { clearTimeout(t); resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }); });
          proc.on('error', err => { clearTimeout(t); resolve({ error: err.message, stdout: stdout.trim(), stderr: stderr.trim() }); });
        });
      }
      case 'env': {
        if (args.key) return { [args.key]: process.env[args.key] || null };
        const env = {};
        for (const [k, v] of Object.entries(process.env)) {
          if (!['token', 'secret', 'password', 'key'].some(s => k.toLowerCase().includes(s))) env[k] = v;
        }
        return { env };
      }
      case 'which': {
        try {
          const output = execSync(`which "${args.name}"`, { encoding: 'utf-8', timeout: 5000 });
          return { path: output.trim() };
        } catch { return { path: null, error: `'${args.name}' not found` }; }
      }
      case 'pidof': {
        try {
          const output = execSync(`pgrep -f "${args.name}" | head -5`, { encoding: 'utf-8', timeout: 5000 });
          const pids = output.trim().split('\n').filter(Boolean).map(Number);
          return { pids, count: pids.length };
        } catch { return { pids: [], count: 0 }; }
      }
      default: throw new Error(`Unknown System tool: ${toolName}`);
    }
  }
}
