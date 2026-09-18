#!/usr/bin/env sh

set -eu

# Always run from the repository root, including under a scheduler.
BIN_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$BIN_DIR/.." && pwd)
cd "$PROJECT_DIR"

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
  true|TRUE|1|yes|YES) START_MODE="--demo"; DEMO_FROM_ENV=true ;;
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
  ""|-production|--production)
    if [ "$#" -gt 1 ]; then
      echo "ERROR: Production mode does not accept additional arguments." >&2
      exit 2
    fi
    ;;
  -demo|--demo)
    if [ "$#" -gt 1 ]; then
      echo "ERROR: --demo does not accept additional arguments." >&2
      exit 2
    fi
    echo "Preparing deterministic demo data..."
    echo "Starting Lumber Tally Dashboard in DEMO mode..."
    exec npm start -- --mode demo
    ;;
  -dev|--dev)
    if [ "$#" -gt 1 ]; then
      echo "ERROR: Development mode does not accept additional arguments." >&2
      exit 2
    fi
    echo "Starting Lumber Tally Dashboard with the Vite development server..."
    exec npm start
    ;;
  *)
    echo "ERROR: Unknown option '$1'. Use --demo, --dev, or --production." >&2
    exit 2
    ;;
esac

if ! command -v nginx >/dev/null 2>&1; then
  echo "ERROR: nginx is required for native production mode." >&2
  exit 1
fi

echo "Building the production dashboard..."
npm run build

if [ -n "${NGINX_MIME_TYPES:-}" ]; then
  if [ ! -f "$NGINX_MIME_TYPES" ]; then
    echo "ERROR: NGINX_MIME_TYPES does not identify an existing file." >&2
    exit 1
  fi
  MIME_TYPES=$NGINX_MIME_TYPES
elif [ -f /etc/nginx/mime.types ]; then
  MIME_TYPES=/etc/nginx/mime.types
elif [ -f /usr/local/etc/nginx/mime.types ]; then
  MIME_TYPES=/usr/local/etc/nginx/mime.types
else
  echo "ERROR: nginx mime.types was not found. Set NGINX_MIME_TYPES to its absolute path." >&2
  exit 1
fi

RUNTIME_DIR="${DASHBOARD_RUNTIME_DIR:-$PROJECT_DIR/.runtime/nginx}"
mkdir -p "$RUNTIME_DIR"
RUNTIME_DIR=$(CDPATH= cd -- "$RUNTIME_DIR" && pwd)

export DEMO_MODE=false
if [ -f "$PROJECT_DIR/.env" ]; then
  node --env-file="$PROJECT_DIR/.env" ./bin/prepare-native-runtime.mjs \
    --project-root "$PROJECT_DIR" \
    --runtime-dir "$RUNTIME_DIR" \
    --mime-types "$MIME_TYPES"
else
  node ./bin/prepare-native-runtime.mjs \
    --project-root "$PROJECT_DIR" \
    --runtime-dir "$RUNTIME_DIR" \
    --mime-types "$MIME_TYPES"
fi

echo "Validating nginx configuration..."
nginx -t -p "$RUNTIME_DIR/" -c "$RUNTIME_DIR/nginx.conf"

echo "Starting Lumber Tally Dashboard with nginx..."
exec nginx -p "$RUNTIME_DIR/" -c "$RUNTIME_DIR/nginx.conf" -g "daemon off;"
