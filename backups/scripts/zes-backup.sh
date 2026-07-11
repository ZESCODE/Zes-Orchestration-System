#!/data/data/com.termux/files/usr/bin/bash
# ZES Backup & Recovery System
# Usage: zes-backup.sh [snapshot|restore|list]
set -euo pipefail

BACKUP_DIR="$HOME/Zes-System/backups/snapshots"
CONFIG_DIR="$HOME/Zes-System/backups/configs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_DIR="$BACKUP_DIR/zes-$TIMESTAMP"
LOG="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR" "$CONFIG_DIR"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

# ── Configs to backup ──────────────────────────────────────────────
CONFIGS=(
  "$HOME/.9router:machine-id"
  "$HOME/.9router:auth/cli-secret"
  "$HOME/.9router:db/data.sqlite"
  "$HOME/.9router:config.yaml"
  "$HOME/.claude.json"
  "$HOME/.hermes/config.yaml"
  "$HOME/.hermes/ecc-config.yaml"
  "$HOME/dashboard_v4.py"
  "$HOME/dashboard_v3.py"
  "$HOME/.codex/AGENTS.md"
)

SERVICES=(
  "zeschrome-mcp"
  "dashboard8083"
  "hermes-gateway"
  "chromium-cdp"
  "tor"
  "ttyd"
  "vscode-server"
)

# ── Snapshot ───────────────────────────────────────────────────────
snapshot() {
  mkdir -p "$SNAPSHOT_DIR"
  log "📸 Creating snapshot: $TIMESTAMP"

  # Backup individual config files
  for entry in "${CONFIGS[@]}"; do
    src="${entry%%:*}"
    sub="${entry##*:}"
    full="$src/$sub"
    if [ -f "$full" ] || [ -d "$full" ]; then
      dest="$SNAPSHOT_DIR/${src/$HOME\/}"
      mkdir -p "$(dirname "$dest")"
      cp -r "$full" "$dest" 2>/dev/null && log "  ✅ $sub" || log "  ⚠️  $sub (failed)"
    else
      log "  ❌ $sub (not found)"
    fi
  done

  # Backup Zes-System (git-tracked files only)
  if [ -d "$HOME/Zes-System/.git" ]; then
    cd "$HOME/Zes-System"
    git archive --format=tar HEAD 2>/dev/null | tar -C "$SNAPSHOT_DIR/zes-system" -xf - 2>/dev/null || true
    log "  ✅ Zes-System repo archived"
  fi

  # Snapshot service status
  log "  📊 Service status snapshot:"
  for svc in "${SERVICES[@]}"; do
    status=$(sv status "/data/data/com.termux/files/usr/var/service/$svc" 2>/dev/null | head -1 || echo "unknown")
    echo "$svc: $status" >> "$SNAPSHOT_DIR/service-status.txt"
  done

  # Summary
  count=$(find "$SNAPSHOT_DIR" -type f 2>/dev/null | wc -l)
  size=$(du -sh "$SNAPSHOT_DIR" 2>/dev/null | cut -f1)
  log "✅ Snapshot complete: $count files, $size → $SNAPSHOT_DIR"

  # Git auto-commit the backups directory
  cd "$HOME/Zes-System"
  git add backups/ 2>/dev/null || true
  git commit -m "backup: snapshot $TIMESTAMP" --no-gpg-sign 2>/dev/null || log "ℹ️  No changes to commit"
}

# ── List snapshots ────────────────────────────────────────────────
list_snapshots() {
  echo "📋 ZES Snapshots:"
  echo ""
  for d in "$BACKUP_DIR"/zes-*/; do
    [ -d "$d" ] || continue
    name=$(basename "$d")
    count=$(find "$d" -type f 2>/dev/null | wc -l)
    size=$(du -sh "$d" 2>/dev/null | cut -f1)
    echo "  $name  ($count files, $size)"
  done | sort -r
}

# ── Restore ────────────────────────────────────────────────────────
restore() {
  local SRC="$1"
  [ -d "$SRC" ] || { echo "❌ Snapshot not found: $SRC"; exit 1; }
  
  log "🔄 Restoring from: $SRC"
  
  # Restore configs
  for entry in "${CONFIGS[@]}"; do
    src="${entry%%:*}"
    sub="${entry##*:}"
    parent="${src/$HOME\/}"
    backup_file="$SRC/$parent/$sub"
    if [ -f "$backup_file" ] || [ -d "$backup_file" ]; then
      cp -r "$backup_file" "$src/$sub" 2>/dev/null && log "  ✅ $sub restored"
    fi
  done

  log "✅ Restore complete — restart services for changes to take effect"
}

# ── Main ──────────────────────────────────────────────────────────
case "${1:-snapshot}" in
  snapshot) snapshot ;;
  list) list_snapshots ;;
  restore)
    shift
    restore "${1:-$BACKUP_DIR/$(ls -1 "$BACKUP_DIR" | tail -1)}"
    ;;
  *)
    echo "Usage: zes-backup.sh [snapshot|list|restore <path>]"
    echo ""
    echo "  snapshot           Create a new backup (default)"
    echo "  list               List all backups"
    echo "  restore [path]     Restore from latest or specified backup"
    ;;
esac
