#!/usr/bin/env node
/**
 * ZES Memory Scorer — Relevance scoring layer for holographic memory.
 *
 * Tier 2 item — Port of OpenHuman Memory Tree scoring concept.
 *
 * Scores memories by:
 *   - Recency (newer = higher, decays linearly over 30 days)
 *   - Relevance (matches current project/topic keywords)
 *   - Usage frequency (how often accessed)
 *   - User feedback (explicit upvote/downvote)
 *
 * Composite score = 0.0 - 1.0, stored in ~/.zes/memory-scores.db
 *
 * Usage:
 *   zes-score                          # Dashboard: score stats
 *   zes-score list                     # All scored memories
 *   zes-score list --min 0.5           # Only high-scoring
 *   zes-score <id>                     # Show score for memory ID
 *   zes-score <id> up                  # Upvote (boost score)
 *   zes-score <id> down                # Downvote (reduce score)
 *   zes-score <id> rate 0.8            # Set explicit score
 *   zes-score refresh                  # Recalculate all scores
 *   zes-score top [N]                  # Top N highest-scored
 *   zes-score brief                    # Brief output for SuperContext
 */

import { DatabaseSync } from 'node:sqlite';
import { execSync } from 'child_process';
import path from 'path';

const HOME = process.env.HOME || '/data/data/com.termux/files/home';
const DB_PATH = path.join(HOME, '.zes', 'memory-scores.db');
const MEMORY_HUB = path.join(HOME, '.zes', 'memory_hub.sqlite');
const args = process.argv.slice(2);

// ─── DB Setup ────────────────────────────────────────────────────────
function getDb() {
  const db = new DatabaseSync(DB_PATH);
  db.exec(`PRAGMA journal_mode=WAL`);
  db.exec(`PRAGMA busy_timeout=5000`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      memory_id    INTEGER PRIMARY KEY,
      base_score   REAL DEFAULT 0.5,
      recency      REAL DEFAULT 0.5,
      relevance    REAL DEFAULT 0.5,
      frequency    REAL DEFAULT 0.5,
      user_score   REAL DEFAULT 0.5,
      composite    REAL DEFAULT 0.5,
      access_count INTEGER DEFAULT 0,
      last_accessed TEXT,
      user_rating  TEXT CHECK(user_rating IN ('up','down','none')) DEFAULT 'none',
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS memory_entities (
      memory_id INTEGER,
      entity    TEXT,
      PRIMARY KEY (memory_id, entity)
    );
  `);
  return db;
}

// ─── Calculate scores ────────────────────────────────────────────────
function calcRecency(hoursOld) {
  // Decay from 1.0 (now) to 0.0 (30+ days old)
  const maxAge = 30 * 24; // 30 days in hours
  return Math.max(0, 1 - (hoursOld / maxAge));
}

function calcComposite(base, recency, relevance, frequency, user) {
  return (base * 0.15 + recency * 0.25 + relevance * 0.30 + frequency * 0.10 + user * 0.20);
}

// ─── Score all known memories ────────────────────────────────────────
function refreshScores(db) {
  const now = Date.now();

  // Get memories from hub — direct SQLite
  let memories = [];
  try {
    const hub = new DatabaseSync(MEMORY_HUB);
    // Get from memories table
    const rows = hub.prepare(`SELECT id, content, type, scope, source, created_at FROM memories ORDER BY id`).all();
    for (const r of rows) {
      memories.push({ id: r.id, content: `#${r.id} [${r.type}] ${r.scope} ${r.source} | ${(r.content || '').slice(0, 200)}` });
    }
    // Also get from facts table (holographic memory)
    try {
      const facts = hub.prepare(`SELECT fact_id, content, category, trust_score FROM facts ORDER BY fact_id`).all();
      for (const f of facts) {
        const fakeId = 100000 + f.fact_id;
        memories.push({ id: fakeId, content: `#${fakeId} [fact] ${f.category} | ${(f.content || '').slice(0, 200)} (trust: ${f.trust_score || '?'})` });
      }
    } catch {}
    hub.close();
  } catch {}

  // Fallback: zes-memory CLI with offset pagination
  if (memories.length === 0) {
    try {
      for (let offset = 0; offset < 500; offset += 50) {
        const out = execSync(`zes-memory list 50 --offset ${offset} 2>/dev/null`, {
          encoding: 'utf-8', timeout: 3000, stdio: ['pipe', 'pipe', 'ignore']
        });
        const lines = out.trim().split('\n').filter(l => l.trim() && !l.startsWith('Error') && !l.startsWith('Total'));
        memories.push(...lines);
        if (lines.length < 50) break;
      }
    } catch {}
  }

  // Update or insert scores for each memory
  let updated = 0;
  const totalMemories = memories.length;
  for (const entry of memories) {
    const id = entry.id;
    const content = entry.content.toLowerCase();

    // Calculate recency from memory ID (incremental ID ≈ recency)
    const maxId = totalMemories > 0 ? Math.max(...memories.map(e => e.id)) : 10000;
    const ageRatio = Math.max(0, 1 - (maxId - id) / Math.max(maxId, 1));
    const recency = calcRecency((1 - ageRatio) * 30 * 24); // map to hours

    // Calculate relevance based on content keywords
    const projectKeywords = ['zes', 'app-builder', 'droidscript', 'apk', 'proxy', 'deepseek', 'tokenjuice', 'subconscious', 'claude', 'codex', 'hermes', 'dashboard', 'memory', 'mcp', 'goals', 'build', 'deploy'];
    const matches = projectKeywords.filter(k => content.includes(k)).length;
    const relevance = Math.min(1, 0.3 + (matches / projectKeywords.length) * 0.7);

    // Check existing score entry
    const existing = db.prepare(`SELECT * FROM scores WHERE memory_id = ?`).get(id);
    if (existing) {
      // Update with recalculated components, preserve user rating
      const frequency = Math.min(1, (existing.access_count + 1) / 100);
      const userScore = existing.user_rating === 'up' ? 1.0 : existing.user_rating === 'down' ? 0.0 : 0.5;
      const composite = calcComposite(existing.base_score || 0.5, recency, relevance, frequency, userScore);
      db.prepare(`UPDATE scores SET recency=?, relevance=?, frequency=?, composite=?, updated_at=datetime('now') WHERE memory_id=?`)
        .run(recency, relevance, frequency, composite, id);
    } else {
      // New entry
      const composite = calcComposite(0.5, recency, relevance, 0.3, 0.5);
      db.prepare(`INSERT INTO scores (memory_id, base_score, recency, relevance, frequency, composite, access_count, user_rating)
                   VALUES (?, 0.5, ?, ?, 0.3, ?, 0, 'none')`)
        .run(id, recency, relevance, composite);
    }
    updated++;
  }

  return updated;
}

// ─── Get score for a memory ID ───────────────────────────────────────
function getScore(db, id) {
  let score = db.prepare(`SELECT * FROM scores WHERE memory_id = ?`).get(id);
  if (!score) {
    // Create default score
    db.prepare(`INSERT INTO scores (memory_id) VALUES (?)`).run(id);
    score = db.prepare(`SELECT * FROM scores WHERE memory_id = ?`).get(id);
  }
  // Increment access count
  db.prepare(`UPDATE scores SET access_count = access_count + 1, last_accessed = datetime('now') WHERE memory_id = ?`).run(id);
  return score;
}

// ─── Rate a memory ──────────────────────────────────────────────────
function rateMemory(db, id, rating) {
  const existing = getScore(db, id);
  const userScore = rating === 'up' ? 1.0 : rating === 'down' ? 0.0 : 0.5;
  const userRating = rating === 'up' ? 'up' : rating === 'down' ? 'down' : 'none';
  const composite = calcComposite(
    existing.base_score || 0.5,
    existing.recency || 0.5,
    existing.relevance || 0.5,
    Math.min(1, (existing.access_count + 1) / 100),
    userScore
  );
  db.prepare(`UPDATE scores SET user_score=?, user_rating=?, composite=?, updated_at=datetime('now') WHERE memory_id=?`)
    .run(userScore, userRating, composite, id);
  return { id, rating, composite };
}

// ─── Set explicit base score ─────────────────────────────────────────
function setBaseScore(db, id, score) {
  const existing = getScore(db, id);
  const s = Math.max(0, Math.min(1, score));
  const composite = calcComposite(s, existing.recency, existing.relevance, Math.min(1, existing.access_count / 100), existing.user_score);
  db.prepare(`UPDATE scores SET base_score=?, composite=?, updated_at=datetime('now') WHERE memory_id=?`)
    .run(s, composite, id);
  return { id, baseScore: s, composite };
}

// ─── Display ─────────────────────────────────────────────────────────
function showDashboard(db) {
  const total = db.prepare(`SELECT COUNT(*) as c FROM scores`).get();
  const avg = db.prepare(`SELECT AVG(composite) as a FROM scores`).get();
  const top = db.prepare(`SELECT * FROM scores ORDER BY composite DESC LIMIT 5`).all();
  const bottom = db.prepare(`SELECT * FROM scores ORDER BY composite ASC LIMIT 5`).all();

  console.log(`\n📊  Memory Score Dashboard`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Tracked memories: ${total?.c || 0}`);
  console.log(`  Average score:    ${avg?.a ? (avg.a * 100).toFixed(1) + '%' : 'N/A'}`);
  console.log(``);
  console.log(`  🏆  Top 5`);
  console.log(`  ${'─'.repeat(50)}`);
  for (const s of top) {
    console.log(`  #${s.memory_id}  score: ${(s.composite * 100).toFixed(0)}%  (rec:${(s.recency*100).toFixed(0)} rel:${(s.relevance*100).toFixed(0)} freq:${(s.frequency*100).toFixed(0)} user:${(s.user_score*100).toFixed(0)})`);
  }
  console.log(``);
  console.log(`  🔻  Bottom 5`);
  console.log(`  ${'─'.repeat(50)}`);
  for (const s of bottom) {
    console.log(`  #${s.memory_id}  score: ${(s.composite * 100).toFixed(0)}%`);
  }
  console.log('');
}

function listScores(db, minScore) {
  const rows = minScore
    ? db.prepare(`SELECT * FROM scores WHERE composite >= ? ORDER BY composite DESC`).all(minScore)
    : db.prepare(`SELECT * FROM scores ORDER BY composite DESC`).all();
  if (rows.length === 0) { console.log('No scored memories.'); return; }
  for (const r of rows) {
    console.log(`#${r.memory_id}  ${(r.composite * 100).toFixed(0)}%  [rec:${(r.recency*100).toFixed(0)} rel:${(r.relevance*100).toFixed(0)} freq:${(r.frequency*100).toFixed(0)}] ${r.user_rating !== 'none' ? (r.user_rating === 'up' ? '👍' : '👎') : ''}`);
  }
}

function showScoreDetail(db, id) {
  const s = getScore(db, id);
  console.log(`\n📝  Memory #${s.memory_id}`);
  console.log(`  Composite:  ${(s.composite * 100).toFixed(0)}%`);
  console.log(`  Base:       ${(s.base_score * 100).toFixed(0)}%`);
  console.log(`  Recency:    ${(s.recency * 100).toFixed(0)}%`);
  console.log(`  Relevance:  ${(s.relevance * 100).toFixed(0)}%`);
  console.log(`  Frequency:  ${(s.frequency * 100).toFixed(0)}%`);
  console.log(`  User:       ${(s.user_score * 100).toFixed(0)}% (${s.user_rating})`);
  console.log(`  Accessed:   ${s.access_count} times`);
  console.log(`  Last read:  ${s.last_accessed || 'never'}`);
  console.log('');
}

// ─── Brief output for SuperContext ──────────────────────────────────
function showBrief(db) {
  const top = db.prepare(`SELECT * FROM scores ORDER BY composite DESC LIMIT 5`).all();
  const total = db.prepare(`SELECT COUNT(*) as c FROM scores`).get();
  console.log(`Memory scores: ${total?.c || 0} tracked, top score ${top[0]?.composite ? (top[0].composite * 100).toFixed(0) + '%' : 'N/A'}`);
}

// ─── CLI Router ──────────────────────────────────────────────────────
function usage() {
  console.log(`
Usage: zes-score [command] [args]

Commands:
  (none)          Score dashboard
  list [--min N]  List all scored memories (filter by min score 0-1)
  <id>            Show score detail for memory ID
  <id> up         Upvote a memory (boost score)
  <id> down       Downvote a memory (reduce score)
  <id> rate N     Set explicit base score (0.0-1.0)
  refresh         Recalculate all scores from memory hub
  top [N]         Top N highest-scored memories
  brief           Brief summary for SuperContext
`.trim());
}

function main() {
  const db = getDb();

  if (args.length === 0) {
    showDashboard(db);
    db.close();
    return;
  }

  const cmd = args[0];

  if (cmd === 'refresh') {
    const count = refreshScores(db);
    console.log(`✅ Refreshed scores for ${count} memories`);
    db.close();
    return;
  }

  if (cmd === 'list') {
    const minIdx = args.indexOf('--min');
    const min = minIdx >= 0 ? parseFloat(args[minIdx + 1]) : null;
    listScores(db, min);
    db.close();
    return;
  }

  if (cmd === 'top') {
    const n = parseInt(args[1]) || 10;
    const rows = db.prepare(`SELECT * FROM scores ORDER BY composite DESC LIMIT ?`).all(n);
    for (const r of rows) {
      console.log(`#${r.memory_id}  ${(r.composite * 100).toFixed(0)}%`);
    }
    db.close();
    return;
  }

  if (cmd === 'brief') {
    showBrief(db);
    db.close();
    return;
  }

  // Score ID-based commands
  const id = parseInt(cmd);
  if (!isNaN(id)) {
    if (args[1] === 'up') {
      const r = rateMemory(db, id, 'up');
      console.log(`👍 Memory #${r.id} upvoted — composite now ${(r.composite * 100).toFixed(0)}%`);
    } else if (args[1] === 'down') {
      const r = rateMemory(db, id, 'down');
      console.log(`👎 Memory #${r.id} downvoted — composite now ${(r.composite * 100).toFixed(0)}%`);
    } else if (args[1] === 'rate') {
      const score = parseFloat(args[2]);
      if (isNaN(score)) { console.log('Error: provide score 0.0-1.0'); db.close(); return; }
      const r = setBaseScore(db, id, score);
      console.log(`📝 Memory #${r.id} base score set to ${(r.baseScore * 100).toFixed(0)}% — composite ${(r.composite * 100).toFixed(0)}%`);
    } else {
      showScoreDetail(db, id);
    }
    db.close();
    return;
  }

  usage();
  db.close();
}

main();
