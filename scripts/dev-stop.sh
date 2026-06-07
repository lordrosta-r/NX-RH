#!/usr/bin/env bash

# NX-RH Dev Environment – Stop

# ── 1. Kill Vite ─────────────────────────────────────────────────────────────
if [ -f /tmp/nxrh-vite.pid ]; then
  kill "$(cat /tmp/nxrh-vite.pid)" 2>/dev/null || true
  rm -f /tmp/nxrh-vite.pid
  echo "✔  Vite stopped"
else
  echo "–  Vite PID file not found (already stopped?)"
fi

# ── 2. Stop socat containers ─────────────────────────────────────────────────
docker stop nx-port-forward nx-mongo-forward 2>/dev/null || true
echo "✔  Socat containers stopped (nx-port-forward, nx-mongo-forward)"

echo ""
echo "Dev environment stopped."
