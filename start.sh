#!/usr/bin/env sh

set -eu

# Always run from the dashboard directory, including under a scheduler.
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed or is not available in PATH." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not installed or is not available in PATH." >&2
  exit 1
fi

if [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "Installing dashboard dependencies..."
  npm ci
fi

START_MODE="${1:-}"
DEMO_FROM_ENV=false
case "${DEMO_MODE:-false}" in
  true|TRUE|1|yes|YES) START_MODE="-demo"; DEMO_FROM_ENV=true ;;
  false|FALSE|0|no|NO|"") ;;
  *)
    echo "ERROR: DEMO_MODE must be true or false." >&2
    exit 2
    ;;
esac

if [ "$DEMO_FROM_ENV" = true ] && [ "$#" -ne 0 ]; then
  echo "ERROR: DEMO_MODE=true does not accept launcher arguments." >&2
  exit 2
fi

case "$START_MODE" in
  "")
    echo "Starting Lumber Tally Dashboard..."
    exec npm start
    ;;
  -demo|--demo)
    if [ "$#" -gt 1 ]; then
      echo "ERROR: -demo does not accept additional arguments." >&2
      exit 2
    fi
    echo "Preparing deterministic demo data..."
    echo "Starting Lumber Tally Dashboard in DEMO mode..."
    exec npm start -- --mode demo
    ;;
  *)
    echo "ERROR: Unknown option '$1'. Use -demo to run with fake data." >&2
    exit 2
    ;;
esac
