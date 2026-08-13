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

if [ ! -f node_modules/.package-lock.json ]; then
  echo "Installing dashboard dependencies..."
  npm ci
fi

echo "Starting Lumber Tally Dashboard..."
exec npm start
