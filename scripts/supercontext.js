#!/usr/bin/env node
/**
 * ZES SuperContext — Memory + file scout that preloads context before agents.
 *
 * Port of OpenHuman's SuperContext concept.
 *
 * What it does:
 *   1. Reads the Subconscious context briefing
 *   2. Queries holographic memory hub for relevant facts
 *   3. Scans recent files for session context
 *   4. Outputs a warm-start preamble for any agent
 *
 * Usage:
 *   supercontext                    # Full context (default)
 *   supercontext --brief            # Brief output for Claude/Codex preload
 *   supercontext --focus <keyword>  # Focus on specific topic
 *   supercontext --json             # Machine-parseable JSON
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || '/data/data/com.termux/files/home';
const ZES_DIR = path.join(HOME, '.zes');

const BRIEF_PATH = path.join(ZES_DIR, 'context-briefing.md');
const MEMORY_HUB = path.join(ZES_DIR, 'memory_hub.sqlite');

// ─── Read Subconscious briefing ─────────────────────────────────────
function readBriefing() {
  try {
    return fs.readFileSync(BRIEF_PATH, 'utf-8');
  } catch {
    return null;
  }
}

// ─── Query memory hub ───────────────────────────────────────────────
function queryMemory(maxResults = 10) {
  // Try scoring system first — get top-scored memories
  try {
    const scorePath = path.join(ZES_DIR, 'memory-scores.db');
    const scoreDb = new DatabaseSync(scorePath);
    const rows = scoreDb.prepare(`SELECT memory_id, composite FROM scores ORDER BY composite DESC LIMIT ?`).all(maxResults * 2);
    scoreDb.close();

    if (rows.length > 0) {
      // Get content for these memory IDs from hub
      const hub = new DatabaseSync(MEMORY_HUB);
      const result = [];
      for (const r of rows) {
        let content = null;
        if (r.memory_id >= 100000) {
          // It's a fact
          const factId = r.memory_id - 100000;
          const fact = hub.prepare(`SELECT content, category FROM facts WHERE fact_id = ?`).get(factId);
          if (fact) content = `[${fact.category}] ${(fact.content || '').slice(0, 200)}`;
        } else {
          const mem = hub.prepare(`SELECT content, type FROM memories WHERE id = ?`).get(r.memory_id);
          if (mem) content = `[${mem.type}] ${(mem.content || '').slice(0, 200)}`;
        }
        if (content) {
          result.push(`[score:${(r.composite * 100).toFixed(0)}%] ${content}`);
        }
        if (result.length >= maxResults) break;
      }
      hub.close();
      if (result.length > 0) return result;
    }
  } catch {}

  // Fallback: try zes-memory CLI
  const cmds = [
    `zes-memory list ${maxResults} 2>/dev/null`,
    `zes-memory search '' --limit ${maxResults} 2>/dev/null`,
  ];
  for (const cmd of cmds) {
    try {
      const out = execSync(cmd, { encoding: 'utf-8', timeout: 3000, stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = out.trim().split('\n').filter(l => l.trim() && !l.startsWith('Search error') && !l.startsWith('Error'));
      if (lines.length > 0) {
        return lines.slice(0, maxResults).map(l => l.replace(/^[\d.]+\s+\|\s*/, '').trim()).filter(Boolean);
      }
    } catch {}
  }

  return ['(memory hub query unavailable — run `zes-memory status` to check)'];
}

// ─── Scan recent files for context ──────────────────────────────────
function scanRecentFiles(maxFiles = 5) {
  const dirs = [
    path.join(HOME, 'zes-app-builder'),
    path.join(HOME, 'zes-system-v2'),
  ];

  const results = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      // Get recently modified files (any type, exclude node_modules/.git)
      const recent = files
        .filter(f => !f.startsWith('.') && f !== 'node_modules' && f !== '.git')
        .map(f => {
          try { return { name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }; } catch { return null; }
        })
        .filter(Boolean)
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, maxFiles);
      for (const f of recent) {
        try {
          const stat = fs.statSync(path.join(dir, f.name));
          if (stat.isFile() && stat.size < 50000) {
            const content = fs.readFileSync(path.join(dir, f.name), 'utf-8').slice(0, 300);
            results.push({ file: path.join(dir, f.name), snippet: content.replace(/\n+/g, ' ').slice(0, 200) });
          } else if (stat.isDirectory()) {
            results.push({ file: path.join(dir, f.name), snippet: '(directory)' });
          }
        } catch {}
      }
    } catch {}
  }
  return results.slice(0, maxFiles);
}

// ─── Format output ──────────────────────────────────────────────────
function formatContext(briefing, memories, recentFiles, focus) {
  const lines = [];

  lines.push('# ZES SuperContext');
  lines.push(`*Preloaded context — ${new Date().toISOString().slice(0, 19).replace('T', ' ')}*`);
  if (focus) lines.push(`*Focus: ${focus}*`);
  lines.push('');

  // ── Active Projects ──
  lines.push('## Active Projects');
  lines.push('');
  const projects = [
    { name: 'ZES App Builder', path: '~/zes-app-builder', desc: 'DroidScript replacement IDE with browser editor, APK pipeline, AI integration' },
    { name: 'ZES System V2', path: '~/zes-system-v2', desc: 'Agent orchestration, proxies, MCP servers, CLI tools' },
  ];
  for (const p of projects) {
    const exists = fs.existsSync(p.path.replace('~', HOME));
    lines.push(`- **${p.name}** ${exists ? '✓' : '✗'} — ${p.desc}`);
  }
  lines.push('');

  // ── Briefing Summary ──
  if (briefing) {
    const briefLines = briefing.split('\n');
    const changes = briefLines.filter(l => l.startsWith('|') && l.includes('New')).length > 0;
    const goalsSection = briefing.split('## Goals & Todos')[1] || '';

    if (briefLines.some(l => l.includes('No Changes'))) {
      lines.push('### Recent Changes');
      lines.push('No file changes since last scan.');
      lines.push('');
    }

    if (goalsSection) {
      lines.push('### Goals & Todos');
      lines.push(goalsSection.trim());
      lines.push('');
    }
  }

  // ── Memory Hub ──
  if (memories.length > 0) {
    lines.push('## Relevant Memories');
    lines.push('');
    for (const mem of memories.slice(0, 5)) {
      lines.push(`- ${mem}`);
    }
    lines.push('');
  }

  // ── Recent Files ──
  if (recentFiles.length > 0) {
    lines.push('## Recently Modified Files');
    lines.push('');
    for (const f of recentFiles) {
      lines.push(`- \`${f.file.replace(HOME, '~')}\`: ${f.snippet}`);
    }
    lines.push('');
  }

  // ── Agent Guidance ──
  lines.push('## Session Guidance');
  lines.push('');
  lines.push('Use this SuperContext as a warm-start for the current session.');
  lines.push('The user has been working on these projects — continue from where');
  lines.push('things were left off rather than asking basic setup questions.');
  if (focus) {
    lines.push(`Focus the session on: **${focus}**`);
  }

  return lines.join('\n');
}

// ─── CLI ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const focusIdx = args.indexOf('--focus');
const focus = focusIdx >= 0 ? args[focusIdx + 1] : null;
const briefMode = args.includes('--brief');
const jsonMode = args.includes('--json');

const briefing = readBriefing();
const memories = queryMemory(briefMode ? 5 : 10);
const recentFiles = scanRecentFiles();

if (jsonMode) {
  const output = {
    generated_at: new Date().toISOString(),
    focus,
    has_briefing: !!briefing,
    memory_count: memories.length,
    recent_files: recentFiles.length,
    briefing_snippet: briefing ? briefing.split('\n').slice(0, 5).join('\n') : null,
    memories: memories.slice(0, 10),
    recent_files_list: recentFiles.map(f => f.file.replace(HOME, '~')),
  };
  console.log(JSON.stringify(output, null, 2));
} else if (briefMode) {
  // Brief: just the essentials for Claude/Codex
  if (briefing) {
    const goalsSection = briefing.split('## Goals & Todos')[1];
    if (goalsSection) console.log(goalsSection.trim());
  }
  if (memories.length > 0) {
    console.log('\nRelated memory:');
    memories.slice(0, 3).forEach(m => console.log(`  ${m}`));
  }
} else {
  console.log(formatContext(briefing, memories, recentFiles, focus));
}
