#!/usr/bin/env node
/**
 * ZES Subconscious — Background context scanner.
 *
 * Concept ported from OpenHuman Subconscious.
 * Runs every 20 minutes as a runsv service.
 *
 * What it does:
 *   1. Scans monitored project directories for file changes (mtime + hash)
 *   2. Tracks state in SQLite (~/.zes/subconscious.db)
 *   3. Diffs against last known state
 *   4. Writes ~/.zes/context-briefing.md with recent context
 *   5. Updates memory hub with significant changes
 *
 * Every agent session (Codex, Claude, Hermes) can preload the briefing
 * so they never start cold.
 *
 * Usage:
 *   node subconscious.js          # single scan + write
 *   node subconscious.js --watch  # loop every 20 min
 *   node subconscious.js --once   # same as default
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || '/data/data/com.termux/files/home';
const ZES_DIR = path.join(HOME, '.zes');
const DB_PATH = path.join(ZES_DIR, 'subconscious.db');
const BRIEF_PATH = path.join(ZES_DIR, 'context-briefing.md');
const SCAN_INTERVAL = 20 * 60 * 1000; // 20 minutes

// ─── Config ───────────────────────────────────────────────────────────
// Directories to scan for changes
const WATCH_DIRS = [
  { path: path.join(HOME, 'zes-app-builder'),       name: 'App Builder' },
  { path: path.join(HOME, 'zes-system-v2'),         name: 'ZES System V2' },
  { path: path.join(HOME, 'hermes-agent-full'),      name: 'Hermes Agent' },
];

// File patterns to ignore
const IGNORE_PATTERNS = [
  /node_modules/, /\.git/, /\.DS_Store/, /__pycache__/,
  /\.sqlite/, /\.sqlite-shm/, /\.sqlite-wal/,
  /\.log$/, /\.cache/, /dist\//, /\.next\//,
  /logs\//, /supervise\//,
];

// ─── SQLite helpers (lightweight, no module dependency) ──────────────
// Use file-based JSON as state store since we can't assume better-sqlite3
const STATE_PATH = path.join(ZES_DIR, 'subconscious-state.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return { version: 1, files: {}, goals: [], lastBriefing: '', scanCount: 0 };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// ─── File scanning ──────────────────────────────────────────────────
function shouldIgnore(p) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(p));
}

function walkDir(dir) {
  // Try Rust native scanner if available (much faster for large dirs)
  const scannerPath = path.join(HOME, '.local', 'bin', 'zes-scanner');
  if (fs.existsSync(scannerPath)) {
    try {
      const cachePath = path.join(ZES_DIR, '.walk-cache.json');
      execSync(`"${scannerPath}" "${dir}" --json "${cachePath}" 2>/dev/null`, {
        timeout: 30000, stdio: ['pipe', 'pipe', 'ignore']
      });
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      try { fs.unlinkSync(cachePath); } catch {}
      return data.files
        .filter(f => !f.is_dir)
        .map(f => ({
          path: f.path,
          mtime: f.mtime,
          size: f.size,
          hash: f.hash,
        }));
    } catch {}
  }

  // Fallback: Node.js recursive walker
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (shouldIgnore(fullPath)) continue;
      if (entry.isDirectory()) {
        files.push(...walkDir(fullPath));
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          files.push({
            path: fullPath,
            mtime: stat.mtimeMs,
            size: stat.size,
          });
        } catch { /* skip unreadable */ }
      }
    }
  } catch { /* skip unreadable dirs */ }
  return files;
}

function shortHash(sizeOrMtime) {
  return createHash('md5').update(String(sizeOrMtime)).digest('hex').slice(0, 8);
}

// ─── Detect changes ─────────────────────────────────────────────────
function detectChanges(state, dirs) {
  const now = Date.now();
  const changes = [];

  for (const dir of dirs) {
    const absPath = path.resolve(dir.path);
    const dirName = dir.name;

    // Check if directory exists
    if (!fs.existsSync(absPath)) {
      changes.push({ type: 'dir_missing', dir: dirName, path: absPath });
      continue;
    }

    const files = walkDir(absPath);
    const currentFiles = {};
    for (const f of files) {
      // Use relative path for tracking
      const relPath = path.relative(absPath, f.path);
      const key = `${dirName}:${relPath}`;
      currentFiles[key] = f;
    }

    // Compare with state
    const prevFiles = state.files || {};
    const seenKeys = new Set();

    for (const [key, curr] of Object.entries(currentFiles)) {
      seenKeys.add(key);
      const prev = prevFiles[key];
      if (!prev) {
        changes.push({ type: 'new', dir: dirName, file: path.basename(curr.path), path: curr.path });
      } else if (prev.mtime !== curr.mtime || prev.size !== curr.size) {
        changes.push({ type: 'modified', dir: dirName, file: path.basename(curr.path), path: curr.path });
      }
    }

    // Detect deleted files
    for (const key of Object.keys(prevFiles)) {
      if (key.startsWith(`${dirName}:`) && !seenKeys.has(key)) {
        const relPath = key.slice(dirName.length + 1);
        changes.push({ type: 'deleted', dir: dirName, file: path.basename(relPath), path: relPath });
      }
    }

    // Update state
    state.files = { ...state.files, ...currentFiles };
  }

  return changes;
}

// ─── Analyze changes for significance ──────────────────────────────
function analyzeChanges(changes) {
  const summary = { total: changes.length, newFiles: 0, modified: 0, deleted: 0, important: [] };

  for (const c of changes) {
    if (c.type === 'new') summary.newFiles++;
    else if (c.type === 'modified') summary.modified++;
    else if (c.type === 'deleted') summary.deleted++;
  }

  // Pick important changes (new files, config changes, source files)
  const sourceExts = ['.js', '.ts', '.py', '.md', '.json', '.yaml', '.html', '.css', '.toml'];
  for (const c of changes) {
    const ext = path.extname(c.file).toLowerCase();
    if (c.type === 'new' && sourceExts.includes(ext)) {
      // Show relative path instead of basename for clarity
      const relDisplay = c.path.replace(HOME, '~');
      summary.important.push({ ...c, displayPath: relDisplay });
    }
  }

  return summary;
}

// ─── Build context briefing ─────────────────────────────────────────
function buildBriefing(changes, state) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const summary = analyzeChanges(changes);

  const lines = [];

  lines.push(`# ZES Context Briefing`);
  lines.push(`*Generated: ${now}*`);
  lines.push(`*Scan #${state.scanCount + 1}*`);
  lines.push('');

  // ── Changes section ──
  if (summary.total > 0) {
    lines.push(`## Recent Changes (${summary.total})`);
    lines.push('');
    lines.push(`| Type | Count |`);
    lines.push(`|------|-------|`);
    lines.push(`| New files | ${summary.newFiles} |`);
    lines.push(`| Modified | ${summary.modified} |`);
    lines.push(`| Deleted | ${summary.deleted} |`);
    lines.push('');

    if (summary.important.length > 0) {
      lines.push('### Important Changes');
      lines.push('');
      for (const c of summary.important.slice(0, 15)) {
        lines.push(`- ${c.type === 'new' ? '🟢' : '🟡'} **${c.dir}** — \`${c.displayPath}\``);
      }
      if (summary.important.length > 15) {
        lines.push(`- ... and ${summary.important.length - 15} more`);
      }
      lines.push('');
    }
  } else {
    lines.push(`## No Changes`);
    lines.push('');
    lines.push('No file changes detected since last scan.');
    lines.push('');
  }

  // ── Project state section ──
  lines.push(`## Project State`);
  lines.push('');
  for (const dir of WATCH_DIRS) {
    const absPath = path.resolve(dir.path);
    if (fs.existsSync(absPath)) {
      try {
        const entries = fs.readdirSync(absPath);
        const dotDirs = entries.filter(e => e.startsWith('.'));
        const realDirs = entries.filter(e => !e.startsWith('.') && !e.includes('node_modules'));
        lines.push(`- **${dir.name}** — ${realDirs.length} top-level items, ${dotDirs.length} hidden`);
      } catch { lines.push(`- **${dir.name}** — (error reading)`); }
    } else {
      lines.push(`- **${dir.name}** — directory not found`);
    }
  }
  lines.push('');

  // ── Active memory hint ──
  lines.push(`## Active Context`);
  lines.push('');
  lines.push('This briefing is preloaded by all agents (Codex, Claude, Hermes)');
  lines.push('to warm-start sessions. Agents should use this context when responding');
  lines.push('to user queries about recent changes, project structure, or ongoing work.');
  lines.push('');

  // ── Goals & Todos section (from zes-goals brief) ──
  try {
    const goalsBrief = execSync('node ~/zes-system-v2/scripts/zes-goals.js brief', { encoding: 'utf-8', timeout: 5000 });
    lines.push(goalsBrief.trim());
  } catch { /* goals db not available — skip */ }
  lines.push('');

  // ── Scan summary ──
  lines.push(`---`);
  lines.push(`*Total files tracked: ${Object.keys(state.files || {}).length}*`);
  lines.push(`*Next scan: ${new Date(now).getTime() + SCAN_INTERVAL > 0 ? 'in ~20 min' : 'immediate'}*`);

  return lines.join('\n');
}

// ─── Write briefing & update memory ────────────────────────────────
function writeBriefing(briefing) {
  fs.mkdirSync(path.dirname(BRIEF_PATH), { recursive: true });
  fs.writeFileSync(BRIEF_PATH, briefing);
}

// ─── Main scan cycle ────────────────────────────────────────────────
async function scan() {
  const state = loadState();
  state.scanCount = (state.scanCount || 0) + 1;

  const changes = detectChanges(state, WATCH_DIRS);
  const briefing = buildBriefing(changes, state);

  writeBriefing(briefing);
  saveState(state);

  const summary = analyzeChanges(changes);
  console.log(`[Subconscious] Scan #${state.scanCount}: ${summary.total} changes (${summary.newFiles} new, ${summary.modified} mod, ${summary.deleted} del) — briefed`);

  return changes;
}

// ─── Watch loop ─────────────────────────────────────────────────────
async function watch() {
  console.log(`[Subconscious] Starting — scanning every ${SCAN_INTERVAL / 1000}s`);
  console.log(`[Subconscious] Monitored dirs:`);
  for (const d of WATCH_DIRS) {
    const exists = fs.existsSync(path.resolve(d.path));
    console.log(`  ${exists ? '✓' : '✗'} ${d.name}: ${d.path}`);
  }
  console.log(`[Subconscious] Brief: ${BRIEF_PATH}`);

  // Initial scan
  await scan();

  // Loop
  while (true) {
    await new Promise(resolve => setTimeout(resolve, SCAN_INTERVAL));
    try {
      await scan();
    } catch (err) {
      console.error(`[Subconscious] Error: ${err.message}`);
    }
  }
}

// ─── Entry point ────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes('--watch')) {
  watch().catch(err => { console.error(err); process.exit(1); });
} else {
  // Default: single scan
  scan().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
