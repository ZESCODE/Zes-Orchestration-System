#!/bin/bash
#==============================================================================
# ZES Dashboard — Local Setup (:7070)
# Installs the Next.js dashboard from ZESCODE/Zes-Dashboard and registers
# it as a runsv service on port 7070.
#==============================================================================
set -euo pipefail

REPO="https://github.com/ZESCODE/Zes-Dashboard.git"
DASHBOARD_DIR="${ZES_DASHBOARD_DIR:-$HOME/Zes-Dashboard}"
PORT="${ZES_DASHBOARD_PORT:-7070}"
HOST="${ZES_DASHBOARD_HOST:-127.0.0.1}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${BLUE}[DASHBOARD]${NC} $1"; }
ok()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; }

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   ZES Dashboard — Local Setup (:${PORT})   ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ── Prerequisites ──────────────────────────────────────
info "Checking prerequisites..."
command -v node &>/dev/null || { err "Node.js required — install: pkg install nodejs"; exit 1; }
command -v npm &>/dev/null  || { err "npm not found"; exit 1; }

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
info "Node.js version: $(node -v)"

# ── Clone / Pull ───────────────────────────────────────
if [ -d "$DASHBOARD_DIR" ]; then
  warn "$DASHBOARD_DIR already exists — pulling latest..."
  cd "$DASHBOARD_DIR"
  git stash 2>/dev/null || true
  git pull origin main 2>/dev/null || true
else
  info "Cloning ZES Dashboard..."
  git clone "$REPO" "$DASHBOARD_DIR"
  cd "$DASHBOARD_DIR"
fi

ok "Source at $DASHBOARD_DIR"

# ── Package Manager ────────────────────────────────────
if [ -f "pnpm-lock.yaml" ]; then
  PM="pnpm"
  if ! command -v pnpm &>/dev/null; then
    info "Installing pnpm..."
    npm install -g pnpm 2>/dev/null
  fi
else
  PM="npm"
fi
ok "Package manager: $PM"

# ── Install Dependencies ───────────────────────────────
info "Installing dependencies (${PM})..."
$PM install 2>&1 | tail -3
ok "Dependencies installed"

# ── Build ──────────────────────────────────────────────
info "Building for production..."
if [ "$NODE_VER" -ge 18 ]; then
  $PM run build 2>&1 | tail -5 || {
    warn "Initial build failed — trying with Turbopack disabled..."
    DISABLE_TURBOPACK=1 $PM run build 2>&1 | tail -5 || {
      err "Build failed. Check: node version, memory, disk space"
      exit 1
    }
  }
else
  warn "Node.js v${NODE_VER} may be too old — expected v18+"
  $PM run build 2>&1 | tail -5 || exit 1
fi
ok "Build successful"

# ── Register runsv Service ────────────────────────────
SERVICE_DIR="/data/data/com.termux/files/usr/var/service"
if [ -d "$SERVICE_DIR" ]; then
  if [ ! -d "$SERVICE_DIR/zes-dashboard-next" ]; then
    info "Registering dashboard service on :${PORT}..."

    mkdir -p "$SERVICE_DIR/zes-dashboard-next"
    cat > "$SERVICE_DIR/zes-dashboard-next/run" << SRVEOF
#!/data/data/com.termux/files/usr/bin/bash
exec 2>&1
export HOME=$HOME
export WATCHPACK_POLLING=true
cd $DASHBOARD_DIR
exec npx next start -p $PORT --hostname $HOST
SRVEOF
    chmod +x "$SERVICE_DIR/zes-dashboard-next/run"

    mkdir -p "$SERVICE_DIR/zes-dashboard-next/log"
    cat > "$SERVICE_DIR/zes-dashboard-next/log/run" << LOGEOF
#!/data/data/com.termux/files/usr/bin/bash
exec svlogd -tt /data/data/com.termux/files/usr/var/log/sv/zes-dashboard-next
LOGEOF
    chmod +x "$SERVICE_DIR/zes-dashboard-next/log/run"

    ok "Service registered at $SERVICE_DIR/zes-dashboard-next"
  else
    ok "Service already registered — updating port..."
    sed -i "s/-p [0-9]*/-p $PORT/" "$SERVICE_DIR/zes-dashboard-next/run"
    sed -i "s/--hostname [0-9.]*/--hostname $HOST/" "$SERVICE_DIR/zes-dashboard-next/run"
  fi
else
  warn "runsv not found — service not registered"
fi

# ── Done ───────────────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║         Dashboard Setup Complete          ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "  Dashboard:  http://${HOST}:${PORT}"
echo "  Source:     $DASHBOARD_DIR"
echo "  Build:      $DASHBOARD_DIR/.next"

if [ -d "$SERVICE_DIR" ]; then
  echo ""
  echo "  Start:  sv start zes-dashboard-next"
  echo "  Stop:   sv stop zes-dashboard-next"
  echo "  Status: sv status zes-dashboard-next"
  echo "  Logs:   tail -f /data/data/com.termux/files/usr/var/log/sv/zes-dashboard-next/current"
fi
