#!/usr/bin/env node
/**
 * ZES Goals & Todos — shared kanban for all agents.
 *
 * SQLite-backed goal tracking (node:sqlite built-in, no deps).
 * Shared by Hermes, Codex, and Claude. Integrates with Subconscious briefing.
 *
 * Tier 1 item #3 — port of OpenHuman Goals/Todos concept.
 *
 * Usage:
 *   zes-goals [status]         Dashboard — active goals + pending todos
 *   zes-goals list             List all goals
 *   zes-goals add <title>      Add a goal
 *   zes-goals done <id>        Mark goal complete
 *   zes-goals delete <id>      Delete goal
 *   zes-goals brief            Output machine-parsable for Subconscious briefing
 *
 *   zes-goals todo             List pending todos
 *   zes-goals todo add <title> --goal <id>   Add todo to a goal
 *   zes-goals todo done <id>                 Complete a todo
 *   zes-goals todo list [--all]              List todos
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const HOME = process.env.HOME || '/data/data/com.termux/files/home';
const DB_PATH = path.join(HOME, '.zes', 'goals.db');
const args = process.argv.slice(2);

// ─── DB Setup ────────────────────────────────────────────────────────
function getDb() {
  const db = new DatabaseSync(DB_PATH);
  db.exec(`PRAGMA journal_mode=WAL`);
  db.exec(`PRAGMA busy_timeout=5000`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority    TEXT DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
      status      TEXT DEFAULT 'active' CHECK(status IN ('active','completed','abandoned')),
      category    TEXT DEFAULT 'general',
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS todos (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id   INTEGER REFERENCES goals(id),
      title     TEXT NOT NULL,
      desc      TEXT DEFAULT '',
      status    TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done','cancelled')),
      priority  TEXT DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
      est_min   INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );
  `);
  return db;
}

// ─── Goals CRUD ──────────────────────────────────────────────────────
function listGoals(db, status) {
  const where = status ? `WHERE g.status = '${status}'` : '';
  return db.prepare(`
    SELECT g.*, (SELECT COUNT(*) FROM todos t WHERE t.goal_id = g.id) as total_todos,
           (SELECT COUNT(*) FROM todos t WHERE t.goal_id = g.id AND t.status = 'done') as done_todos
    FROM goals g ${where}
    ORDER BY CASE g.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, g.created_at DESC
  `).all();
}

function addGoal(db, title, opts) {
  db.prepare(`INSERT INTO goals (title, description, priority, category)
              VALUES (?, ?, ?, ?)`).run(title, opts.desc || '', opts.priority || 'medium', opts.category || 'general');
  const row = db.prepare('SELECT * FROM goals ORDER BY id DESC LIMIT 1').get();
  return row;
}

function markDone(db, id) {
  const r = db.prepare(`UPDATE goals SET status='completed', completed_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).run(id);
  return r.changes > 0;
}

function deleteGoal(db, id) {
  db.prepare(`DELETE FROM todos WHERE goal_id=?`).run(id);
  const r = db.prepare(`DELETE FROM goals WHERE id=?`).run(id);
  return r.changes > 0;
}

// ─── Todos CRUD ──────────────────────────────────────────────────────
function listTodos(db, opts = {}) {
  const where = !opts.all ? "WHERE t.status IN ('pending','in_progress')" : '';
  return db.prepare(`
    SELECT t.*, g.title as goal_title
    FROM todos t LEFT JOIN goals g ON t.goal_id = g.id
    ${where}
    ORDER BY CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, t.created_at DESC
  `).all();
}

function addTodo(db, title, opts) {
  db.prepare(`INSERT INTO todos (goal_id, title, desc, priority, est_min)
              VALUES (?, ?, ?, ?, ?)`).run(opts.goal || null, title, opts.desc || '', opts.priority || 'medium', opts.est || null);
  return db.prepare('SELECT * FROM todos ORDER BY id DESC LIMIT 1').get();
}

function markTodoDone(db, id) {
  const r = db.prepare(`UPDATE todos SET status='done', completed_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).run(id);
  return r.changes > 0;
}

// ─── Display ─────────────────────────────────────────────────────────
function showDashboard(db) {
  const goals = listGoals(db, 'active');
  const todos = listTodos(db);

  console.log('\n📋  ZES Goals & Todos');
  console.log('━━━━━━━━━━━━━━━━━━━━\n');

  if (goals.length === 0) {
    console.log('No active goals. Add one: zes-goals add "My goal"');
  } else {
    console.log('🎯  Active Goals');
    console.log('─'.repeat(60));
    for (const g of goals) {
      const pct = g.total_todos > 0 ? ` (${Math.round(g.done_todos / g.total_todos * 100)}%)` : '';
      const prio = g.priority === 'high' ? '🔴' : g.priority === 'medium' ? '🟡' : '🟢';
      console.log(`  ${prio} [#${g.id}] ${g.title}${pct}`);
      if (g.description) console.log(`       ${g.description}`);
    }
  }

  console.log('');
  if (todos.length === 0) {
    console.log('No pending todos.');
  } else {
    console.log('✅  Pending Todos');
    console.log('─'.repeat(60));
    for (const t of todos) {
      const goalRef = t.goal_title ? ` (→ ${t.goal_title})` : '';
      const prio = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢';
      const statusIcon = t.status === 'in_progress' ? ' 🔄' : '';
      console.log(`  ${prio} [#${t.id}] ${t.title}${statusIcon}${goalRef}`);
    }
  }
  console.log('');
}

function showBrief(db) {
  // Machine-parsable output for Subconscious briefing integration
  const goals = listGoals(db, 'active');
  const todos = listTodos(db);

  const lines = [];
  lines.push('## Goals & Todos');

  if (goals.length > 0) {
    lines.push(''); lines.push('### Active Goals');
    for (const g of goals) {
      const pct = g.total_todos > 0 ? ` (${Math.round(g.done_todos / g.total_todos * 100)}%)` : '';
      lines.push(`- [${g.priority}] #${g.id}: ${g.title}${pct}`);
    }
  }

  if (todos.length > 0) {
    lines.push(''); lines.push('### Pending Todos');
    for (const t of todos) {
      const g = t.goal_title ? ` [→ ${t.goal_title}]` : '';
      lines.push(`- [${t.priority}] #${t.id}: ${t.title}${g}`);
    }
  } else {
    lines.push(''); lines.push('No pending todos.');
  }

  lines.push('');
  lines.push(`*${goals.length} active goals · ${todos.length} pending todos*`);
  return lines.join('\n');
}

// ─── CLI Router ──────────────────────────────────────────────────────
function usage() {
  console.log(`
Usage: zes-goals [command] [args...]

Commands:
  (no command)    Show dashboard
  list [status]   List goals (active|completed|abandoned, default: all)
  add <title>     Add a goal (--desc, --priority, --category)
  done <id>       Mark goal complete
  delete <id>     Delete goal
  brief           Brief text for Subconscious briefing
  
  todo            List pending todos
  todo add <t>    Add todo (--goal <id>, --priority, --desc)
  todo done <id>  Complete a todo
  todo list --all Show all todos (including done)
`.trim());
}

function parseFlags() {
  const opts = {};
  const consumed = new Set();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--desc') { opts.desc = args[++i] || ''; consumed.add(i).add(i-1); }
    else if (args[i] === '--priority') { opts.priority = args[++i] || 'medium'; consumed.add(i).add(i-1); }
    else if (args[i] === '--category') { opts.category = args[++i] || 'general'; consumed.add(i).add(i-1); }
    else if (args[i] === '--goal') { opts.goal = parseInt(args[++i]); consumed.add(i).add(i-1); }
    else if (args[i] === '--est') { opts.est = parseInt(args[++i]); consumed.add(i).add(i-1); }
    else if (args[i] === '--all') { opts.all = true; consumed.add(i); }
  }
  return { ...opts, consumed };
}

function main() {
  const db = getDb();

  if (args.length === 0) {
    showDashboard(db);
    db.close();
    return;
  }

  const cmd = args[0];
  const opts = parseFlags();

  switch (cmd) {
    case 'list': {
      const status = args[1] || null;
      const goals = listGoals(db, status);
      if (goals.length === 0) { console.log('No goals found.'); break; }
      for (const g of goals) {
        const pct = g.total_todos > 0 ? ` (${Math.round(g.done_todos / g.total_todos * 100)}%)` : '';
        const s = g.status === 'active' ? '🟢' : g.status === 'completed' ? '✅' : '⏳';
        console.log(`${s} [#${g.id}] ${g.title} — ${g.status}${pct}`);
        if (g.description) console.log(`     ${g.description}`);
      }
      break;
    }
    case 'add': {
      const opts = parseFlags();
      const title = args.slice(1).filter((a, i) => !a.startsWith('--') && !opts.consumed?.has(i)).join(' ');
      if (!title) { console.log('Error: title required'); break; }
      const g = addGoal(db, title, opts);
      console.log(`✅ Goal #${g.id} "${g.title}" added (${g.priority})`);
      break;
    }
    case 'done': {
      const id = parseInt(args[1]);
      if (!id) { console.log('Error: goal ID required'); break; }
      if (markDone(db, id)) console.log(`✅ Goal #${id} completed`);
      else console.log(`Goal #${id} not found`);
      break;
    }
    case 'delete': {
      const id = parseInt(args[1]);
      if (!id) { console.log('Error: goal ID required'); break; }
      if (deleteGoal(db, id)) console.log(`🗑️  Goal #${id} and its todos deleted`);
      else console.log(`Goal #${id} not found`);
      break;
    }
    case 'brief': {
      console.log(showBrief(db));
      break;
    }
    case 'todo': {
      const sub = args[1];
      if (!sub || sub === 'list') {
        const allFlag = args.includes('--all');
        const todos = listTodos(db, { all: allFlag });
        if (todos.length === 0) { console.log('No todos found.'); break; }
        for (const t of todos) {
          const icon = t.status === 'done' ? '✅' : t.status === 'in_progress' ? '🔄' : t.status === 'cancelled' ? '⏳' : '⬜';
          const g = t.goal_title ? ` (→ ${t.goal_title})` : '';
          console.log(`${icon} [#${t.id}] ${t.title} — ${t.status}${g}`);
        }
        break;
      }
      if (sub === 'add') {
        const todoOpts = parseFlags();
        const title = args.slice(2).filter((a, i) => !a.startsWith('--') && !todoOpts.consumed?.has(i+2)).join(' ');
        if (!title) { console.log('Error: todo title required'); break; }
        const t = addTodo(db, title, todoOpts);
        const ref = t.goal_id ? ` → goal #${t.goal_id}` : '';
        console.log(`✅ Todo #${t.id} "${t.title}" added${ref}`);
        break;
      }
      if (sub === 'done') {
        const id = parseInt(args[2]);
        if (!id) { console.log('Error: todo ID required'); break; }
        if (markTodoDone(db, id)) console.log(`✅ Todo #${id} completed`);
        else console.log(`Todo #${id} not found`);
        break;
      }
      usage();
      break;
    }
    default:
      usage();
  }

  db.close();
}

main();
