import fs from 'fs';
import { execSync } from 'child_process';

export class DatabaseSkill {
  constructor(options = {}) {
    this.name = 'db';
    this.description = 'SQL database queries (read-only by default)';
    this.readOnly = options.readOnly !== false;
    this.dbPath = options.dbPath || '';
  }

  _getDb(dbPath) {
    const resolved = dbPath || this.dbPath;
    if (!fs.existsSync(resolved)) throw new Error(`Database not found: ${resolved}`);
    return resolved;
  }

  _rejectWrite(sql) {
    const upper = sql.trim().toUpperCase();
    const writeOps = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'REPLACE'];
    if (writeOps.some(op => upper.startsWith(op)) && this.readOnly) {
      throw new Error('Write operations disabled (read-only mode). Set readOnly=false to enable.');
    }
  }

  tools() {
    return [
      { name: 'query', description: 'Execute SQL SELECT query', inputSchema: { type: 'object', properties: { sql: { type: 'string' }, dbPath: { type: 'string' } }, required: ['sql'] } },
      { name: 'execute', description: 'Execute SQL statement (write requires readOnly=false)', inputSchema: { type: 'object', properties: { sql: { type: 'string' }, dbPath: { type: 'string' } }, required: ['sql'] } },
      { name: 'tables', description: 'List all tables', inputSchema: { type: 'object', properties: { dbPath: { type: 'string' } }, required: ['dbPath'] } },
      { name: 'describe', description: 'Describe table schema', inputSchema: { type: 'object', properties: { table: { type: 'string' }, dbPath: { type: 'string' } }, required: ['table', 'dbPath'] } },
    ];
  }

  async execute(toolName, args) {
    const dbPath = this._getDb(args.dbPath);
    switch (toolName) {
      case 'query':
      case 'execute': {
        this._rejectWrite(args.sql);
        const escapedSql = args.sql.replace(/'/g, "'\\''");
        const isSelect = args.sql.trim().toUpperCase().startsWith('SELECT');
        try {
          const output = execSync(`sqlite3 -${isSelect ? 'json' : 'text'} "${dbPath}" '${escapedSql}' 2>/dev/null`, { encoding: 'utf-8', timeout: 10000 });
          if (isSelect && output.trim()) return { rows: JSON.parse(output), count: JSON.parse(output).length };
          return { changes: output.trim() || 'OK' };
        } catch (err) { return { error: err.message }; }
      }
      case 'tables': {
        const output = execSync(`sqlite3 "${dbPath}" ".tables" 2>/dev/null`, { encoding: 'utf-8', timeout: 5000 });
        const tables = output.trim().split(/\s+/).filter(Boolean);
        return { tables, count: tables.length };
      }
      case 'describe': {
        const output = execSync(`sqlite3 "${dbPath}" "PRAGMA table_info('${args.table}')" 2>/dev/null`, { encoding: 'utf-8', timeout: 5000 });
        const columns = output.trim().split('\n').filter(Boolean).map(line => {
          const parts = line.split('|');
          return { cid: parseInt(parts[0]), name: parts[1], type: parts[2], notnull: parts[3] === '1', dflt: parts[4], pk: parts[5] === '1' };
        });
        return { table: args.table, columns };
      }
      default: throw new Error(`Unknown DB tool: ${toolName}`);
    }
  }
}
