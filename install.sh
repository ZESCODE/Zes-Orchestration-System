#!/bin/bash
#==============================================================================
# ZES Orchestration System — Bootstrap Installer
# Run: curl -fsSL https://raw.githubusercontent.com/ZESCODE/Zes-Orchestration-System/main/install.sh | bash
#==============================================================================
set -euo pipefail

REPO="https://github.com/ZESCODE/Zes-Orchestration-System.git"
DASHBOARD_REPO="https://github.com/ZESCODE/Zes-Dashboard.git"
INSTALL_DIR="${ZES_DIR:-$HOME/Zes-System}"
DASHBOARD_DIR="${ZES_DASHBOARD_DIR:-$HOME/Zes-Dashboard}"
SKILLS_DIR="${CODEX_SKILLS_DIR:-$HOME/.codex/skills}"
MEMORY_HUB="$HOME/.zes/memory_hub.sqlite"
VERSION="3.8.0"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${BLUE}[ZES]${NC} $1"; }
ok()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; }

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║   ZES Orchestration System v${VERSION} Installer   ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# ── Prerequisites ──────────────────────────────────────
info "Checking prerequisites..."

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    err "$1 is required but not installed."
    case "$1" in
      node)   echo "  Install: pkg install nodejs" ;;
      npm)    echo "  Install: pkg install nodejs" ;;
      git)    echo "  Install: pkg install git" ;;
      python3) echo "  Install: pkg install python" ;;
      sqlite3) echo "  Install: pkg install sqlite" ;;
      curl)   echo "  Install: pkg install curl" ;;
    esac
    return 1
  fi
  return 0
}

check_cmd node    || MISSING=1
check_cmd npm     || MISSING=1
check_cmd git     || MISSING=1
check_cmd python3 || MISSING=1

if [ -n "${MISSING:-}" ]; then
  echo ""
  err "Missing prerequisites. Install them and re-run."
  echo "  pkg update && pkg install nodejs git python sqlite curl"
  exit 1
fi

ok "All core prerequisites found"

# ── Clone System Repo ──────────────────────────────────
if [ -d "$INSTALL_DIR" ]; then
  warn "$INSTALL_DIR already exists — pulling latest..."
  cd "$INSTALL_DIR" && git pull origin main 2>/dev/null || true
else
  info "Cloning ZES Orchestration System..."
  git clone "$REPO" "$INSTALL_DIR"
  ok "Cloned to $INSTALL_DIR"
fi

# ── Install Power Agent Dependencies ───────────────────
if [ -f "$INSTALL_DIR/power-agent/package.json" ]; then
  info "Installing Power Agent dependencies..."
  cd "$INSTALL_DIR/power-agent" && npm install --silent 2>/dev/null
  ok "Power Agent dependencies installed"
fi

# ── Set Up Service (runsv) ────────────────────────────
SERVICE_DIR="/data/data/com.termux/files/usr/var/service"
if [ -d "$SERVICE_DIR" ]; then
  if [ ! -d "$SERVICE_DIR/zes-power-agent" ]; then
    info "Registering zes-power-agent service..."
    mkdir -p "$SERVICE_DIR/zes-power-agent"
    cat > "$SERVICE_DIR/zes-power-agent/run" << 'RUNEOF'
#!/data/data/com.termux/files/usr/bin/bash
exec 2>&1
cd /data/data/com.termux/files/home/Zes-System/power-agent
exec node server.js
RUNEOF
    chmod +x "$SERVICE_DIR/zes-power-agent/run"
    mkdir -p "$SERVICE_DIR/zes-power-agent/log"
    cat > "$SERVICE_DIR/zes-power-agent/log/run" << 'LOGEOF'
#!/data/data/com.termux/files/usr/bin/bash
exec svlogd -tt /data/data/com.termux/files/usr/var/log/sv/zes-power-agent
LOGEOF
    chmod +x "$SERVICE_DIR/zes-power-agent/log/run"
    ok "Service registered. Start with: sv start zes-power-agent"
  else
    ok "Service already registered"
  fi
else
  warn "runsv not detected — skip service registration"
fi

# ── Optional: Install Dashboard ─────────────────────────
install_dashboard() {
  echo ""
  info "Installing ZES Dashboard (Next.js)..."

  if [ -d "$DASHBOARD_DIR" ]; then
    warn "$DASHBOARD_DIR already exists — pulling latest..."
    cd "$DASHBOARD_DIR" && git pull origin main 2>/dev/null || true
  else
    git clone "$DASHBOARD_REPO" "$DASHBOARD_DIR"
  fi

  cd "$DASHBOARD_DIR"

  # Detect package manager
  if [ -f "pnpm-lock.yaml" ]; then
    PM="pnpm"
    command -v pnpm &>/dev/null || npm install -g pnpm
  else
    PM="npm"
  fi

  info "Installing dashboard dependencies (${PM})..."
  $PM install

  # Build
  info "Building dashboard..."
  $PM run build 2>/dev/null || npm run build 2>/dev/null || warn "Build failed — check node version"

  # Register service
  if [ -d "$SERVICE_DIR" ] && [ ! -d "$SERVICE_DIR/zes-dashboard-next" ]; then
    mkdir -p "$SERVICE_DIR/zes-dashboard-next"
    cat > "$SERVICE_DIR/zes-dashboard-next/run" << 'DASHRUN'
#!/data/data/com.termux/files/usr/bin/bash
exec 2>&1
export HOME=/data/data/com.termux/files/home
export WATCHPACK_POLLING=true
cd /data/data/com.termux/files/home/Zes-Dashboard
exec npx next start -p 7070 --hostname 127.0.0.1
DASHRUN
    chmod +x "$SERVICE_DIR/zes-dashboard-next/run"
    ok "Dashboard service registered at :7070"
  fi

  echo ""
  ok "Dashboard ready at http://127.0.0.1:7070"
  echo "  Start with: sv start zes-dashboard-next"
}

# ── Optional: Install Skills ────────────────────────────
install_skills() {
  echo ""
  info "Installing ZES skills..."

  SKILL_REPO="https://github.com/ZESCODE/ZES-Skills.git"
  if [ -d "$SKILLS_DIR" ]; then
    warn "$SKILLS_DIR already exists — skipping"
    return
  fi

  mkdir -p "$(dirname "$SKILLS_DIR")"
  git clone "$SKILL_REPO" "$SKILLS_DIR"
  ok "Skills installed to $SKILLS_DIR"
}

# ── Optional: Init Memory Hub ───────────────────────────
init_memory() {
  echo ""
  info "Initializing Memory Hub..."
  mkdir -p "$HOME/.zes" "$HOME/.zes/memories"
  sqlite3 "$MEMORY_HUB" << 'SQLEOF'
CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'fact',
    scope TEXT NOT NULL DEFAULT 'personal',
    priority TEXT NOT NULL DEFAULT 'medium',
    content TEXT NOT NULL,
    tags TEXT DEFAULT '',
    source TEXT DEFAULT 'installer',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS memory_banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT ''
);
SQLEOF
  ok "Memory Hub initialized ($MEMORY_HUB)"
}

# ── Entry Point ─────────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║          Installation Complete                ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "  System:    $INSTALL_DIR"
echo "  Version:   v${VERSION}"
echo "  Agent docs:"
echo "    • Codex:  docs/agents/codex-soul.md"
echo "    • Claude: docs/agents/claude-soul.md"
echo "    • Hermes: docs/agents/hermes-soul.md"
echo "  Config samples: docs/configs/"
echo ""
echo "  Next steps:"
echo "    1. Read the unified instructions: cat $INSTALL_DIR/AGENTS.md"
echo "    2. Install dashboard: bash $INSTALL_DIR/scripts/setup-dashboard.sh"
echo "    3. Start power agent: sv start zes-power-agent"
echo "    4. Read agent souls: cat $INSTALL_DIR/docs/agents/*-soul.md"
echo ""
