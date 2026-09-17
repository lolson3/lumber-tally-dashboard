#!/bin/sh

set -eu

dashboard_port="${DASHBOARD_PORT:-8080}"
wget -q -T 5 -O /dev/null "http://127.0.0.1:${dashboard_port}/healthz"
wget -q -T 10 -O /dev/null "http://127.0.0.1:${dashboard_port}/readyz"
