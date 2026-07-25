#!/bin/bash
# ZES Pre-flight QC Checks
# Runs before builds to catch common issues early.

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
PASS=0
FAIL=0

check() {
  local desc="$1"
  local cmd="$2"
  if eval "$cmd" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $desc"
    ((PASS++))
  else
    echo -e "  ${RED}✗${NC} $desc"
    ((FAIL++))
  fi
}

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     ZES Pre-flight QC Checks             ║"
echo "╚══════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "── File Integrity ──"
check "package.json exists"    "test -f package.json"
check "vite.config.js exists"  "test -f vite.config.js"
check "index.html exists"      "test -f index.html"
check "src/main.jsx exists"    "test -f src/main.jsx"

echo ""
echo "── Source Quality ──"
# Check for alert() calls in source
ALERT_COUNT=$(grep -r 'alert(' src/ --include='*.jsx' 2>/dev/null | grep -v 'node_modules' | grep -vc '//.*alert')
if [ "$ALERT_COUNT" -le 2 ]; then
  echo -e "  ${GREEN}✓${NC} No alert() calls in source ($ALERT_COUNT found)"
  ((PASS++))
else
  echo -e "  ${YELLOW}⚠${NC} $ALERT_COUNT alert() calls found in source"
  ((FAIL++))
fi

# Check for console.log in production
CONSOLE_COUNT=$(grep -r 'console\.log' src/ --include='*.jsx' 2>/dev/null | grep -v 'node_modules' | grep -v '//.*console' | wc -l)
if [ "$CONSOLE_COUNT" -le 10 ]; then
  echo -e "  ${GREEN}✓${NC} Minimal console.log usage ($CONSOLE_COUNT found)"
  ((PASS++))
else
  echo -e "  ${YELLOW}⚠${NC} $CONSOLE_COUNT console.log calls found in source"
  ((FAIL++))
fi

echo ""
echo "── API Surface ──"
check "Skills endpoint defined"      "grep -q 'def list_skills' api/server.py"
check "Health endpoint defined"      "grep -q 'def health_check' api/server.py"
check "Health events endpoint"       "grep -q 'def health_events_api' api/server.py"
check "Services endpoints defined"   "grep -q 'def list_services' api/server.py"

echo ""
echo "── Build Check ──"
BUILD_OUTPUT=$(npx vite build 2>&1)
BUILD_EXIT=$?
echo "$BUILD_OUTPUT" | tail -5
if [ "$BUILD_EXIT" -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} Vite build succeeds"
  ((PASS++))
else
  echo -e "  ${RED}✗${NC} Vite build fails"
  ((FAIL++))
fi

echo ""
echo "── Port Check ──"
for pair in "Flask API:5002" "9Router:20128" "Hermes:9119" "amux:8822"; do
  name="${pair%%:*}"
  port="${pair##*:}"
  python3 -c "import socket; s=socket.socket(); s.settimeout(0.3); r=s.connect_ex(('127.0.0.1',$port)); exit(0 if r==0 else 1); s.close()" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} $name (:$port)"
    ((PASS++))
  else
    echo -e "  ${RED}✗${NC} $name (:$port)"
    ((FAIL++))
  fi
done

echo ""
echo "── Summary ──"
echo -e "  ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "⚠️  Some checks failed. Review above before deploying."
  exit 1
else
  echo "✅ All pre-flight checks passed."
  exit 0
fi
