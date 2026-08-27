#!/usr/bin/env bash
#
# run-bot.sh — hands-off runner for the Outbid market update bot
# (scripts/update_report.py). Intended for manual / screen / tmux use;
# the daily GitHub Actions workflow remains the primary scheduler.
#
# Usage:
#   ./run-bot.sh                 # one run, output appended to bot.log
#   ./run-bot.sh --loop          # run now, then every 24 h until killed
#   ./run-bot.sh --commit        # also commit + push changed bot files
#   ./run-bot.sh --loop --commit # both
#   ./run-bot.sh --log FILE      # custom log path (default: bot.log)
#   ./run-bot.sh --help
#
# Loop behaviour: after a failed run (API unreachable, network blocked)
# it retries every 15 minutes, up to 3 consecutive failures, then exits.
# After a successful run it sleeps 24 h.
#
# --commit races with the 03:17 UTC GitHub Actions job (both write the
# same files and push), so avoid using it around that time.
#
# Exit codes: 0 = the single run (or at least one loop run) succeeded;
# 1 = every run failed; 2 = bad usage.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

LOOP=0
COMMIT=0
LOG="bot.log"

usage() {
  sed -n '2,17p' "$0"
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --loop)   LOOP=1 ;;
    --commit) COMMIT=1 ;;
    --log)    LOG="${2:?--log needs a path}"; shift ;;
    -h|--help) usage ;;
    *) echo "unknown option: $1 (try --help)" >&2; usage 2 ;;
  esac
  shift
done

BOT_FILES=(data/outbid-market-inventory.csv data/stats.json index.html entry-simulator.html ideas.html)

run_once() {
  echo "=== run started $(date -u '+%F %T UTC') ===" >> "$LOG"
  if ! python3 scripts/update_report.py 2>&1 | tee -a "$LOG"; then
    echo "!!! run FAILED $(date -u '+%F %T UTC') — see $LOG" | tee -a "$LOG"
    return 1
  fi
  if [ "$COMMIT" = 1 ]; then
    to_add=()
    for f in "${BOT_FILES[@]}"; do
      [ -f "$f" ] && to_add+=("$f")
    done
    if [ "${#to_add[@]}" -eq 0 ]; then
      echo "no bot files present — nothing to commit" | tee -a "$LOG"
    else
      git add -- "${to_add[@]}"
      if git diff --cached --quiet; then
        echo "no data changes to commit" | tee -a "$LOG"
      else
        if git commit -m "bot: manual refresh ($(date -u +%F)) [skip ci]" >> "$LOG" 2>&1 \
           && git push origin "HEAD:$(git rev-parse --abbrev-ref HEAD)" >> "$LOG" 2>&1; then
          echo "committed and pushed" | tee -a "$LOG"
        else
          echo "!!! commit/push failed — changes are staged/committed locally; push manually" | tee -a "$LOG"
        fi
      fi
    fi
  fi
  echo "=== run finished OK $(date -u '+%F %T UTC') ===" >> "$LOG"
  return 0
}

failures=0
if [ "$LOOP" = 1 ]; then
  while :; do
    if run_once; then
      failures=0
      echo "[run-bot] next run in 24 h (Ctrl-C to stop)" | tee -a "$LOG"
      sleep 86400
    else
      failures=$((failures + 1))
      if [ "$failures" -ge 3 ]; then
        echo "[run-bot] 3 consecutive failures — giving up. Check network/API, then rerun." | tee -a "$LOG"
        exit 1
      fi
      echo "[run-bot] retrying in 15 min (failure $failures/3)" | tee -a "$LOG"
      sleep 900
    fi
  done
else
  if run_once; then
    exit 0
  else
    exit 1
  fi
fi
