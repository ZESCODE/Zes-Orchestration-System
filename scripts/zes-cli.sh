#!/data/data/com.termux/files/usr/bin/bash
RESEARCH_ENGINE="$HOME/.local/bin/zes-research"
BATCH_ENGINE="$HOME/.local/bin/zes-batch"
CONSOLIDATE_ENGINE="$HOME/.local/bin/zes-consolidate"

case "${1:-help}" in
  research|r)
    shift
    exec python3 "$RESEARCH_ENGINE" "$@"
    ;;
  batch|b)
    shift
    exec python3 "$BATCH_ENGINE" "$@"
    ;;
  consolidate|c)
    shift
    exec python3 "$CONSOLIDATE_ENGINE" "$@"
    ;;
  --check|-c|check)
    echo "=== Research Providers ==="
    python3 "$RESEARCH_ENGINE" --check
    echo ""
    echo "=== Available Commands ==="
    echo "  zes research \"topic\"     Multi-agent deep research"
    echo "  zes batch tasks.txt      Batch task processing"
    echo "  zes consolidate           Memory hub consolidation"
    ;;
  *)
    echo "ZES Cloud AI Toolkit"
    echo "Usage:"
    echo "  zes research \"topic\" [options]   # Multi-agent deep research"
    echo "  zes batch tasks.txt [options]     # Batch task processing"
    echo "  zes consolidate [options]          # Memory hub consolidation"
    echo "  zes --check                       # Check providers"
    echo ""
    echo "Research options:  --agents N | --providers P | --output FILE | --silent"
    echo "Batch options:     --inline | --concurrent N | --timeout N | --providers P"
    echo "Consolidate:       --report (no changes) | --force (auto-apply)"
    echo ""
    echo "Examples:"
    echo "  zes research \"AI trends 2026\" --agents 4"
    echo "  zes batch tasks.txt --concurrent 20"
    echo "  zes consolidate --report"
    echo "  zes consolidate --force"
    ;;
esac
