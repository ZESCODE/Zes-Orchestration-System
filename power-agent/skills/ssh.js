import { execSync } from 'child_process';

export class SSHSkill {
  constructor(host, user) {
    this.name = 'ssh';
    this.description = 'SSH remote command execution';
    this.defaultHost = host || 'localhost';
    this.defaultUser = user || 'root';
  }

  tools() {
    return [
      { name: 'exec', description: 'Execute command via SSH', inputSchema: { type: 'object', properties: { command: { type: 'string' }, host: { type: 'string' }, user: { type: 'string' }, timeout: { type: 'number', default: 30000 } }, required: ['command'] } },
    ];
  }

  async execute(toolName, args) {
    if (toolName === 'exec') {
      const host = args.host || this.defaultHost;
      const user = args.user || this.defaultUser;
      try {
        const output = execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${user}@${host} '${args.command.replace(/'/g, "'\\''")}'`, { encoding: 'utf-8', timeout: args.timeout || 30000, maxBuffer: 10 * 1024 * 1024 });
        return { stdout: output.trim(), host };
      } catch (err) {
        return { error: err.message, stderr: err.stderr?.trim(), host };
      }
    }
    throw new Error(`Unknown SSH tool: ${toolName}`);
  }
}
