#!/usr/bin/env bash

# NX-RH Dev Environment Launcher

# ── 1. nx-port-forward (host:5050 → app:3000) ────────────────────────────────
if docker ps --format '{{.Names}}' | grep -q '^nx-port-forward$'; then
  echo "✔  nx-port-forward already running"
else
  echo "▶  Starting nx-port-forward…"
  docker run -d --rm --name nx-port-forward \
    --network nx_backend \
    -p 5050:5050 \
    alpine/socat TCP-LISTEN:5050,fork,reuseaddr TCP:app:3000
fi

# ── 2. nx-mongo-forward (host:27017 → mongo:27017) ───────────────────────────
if docker ps --format '{{.Names}}' | grep -q '^nx-mongo-forward$'; then
  echo "✔  nx-mongo-forward already running"
else
  echo "▶  Starting nx-mongo-forward…"
  docker run -d --rm --name nx-mongo-forward \
    --network nx_backend \
    -p 27017:27017 \
    alpine/socat TCP-LISTEN:27017,fork,reuseaddr TCP:mongo:27017
fi

# ── 3. Vite dev server ────────────────────────────────────────────────────────
VITE_PID_FILE="/tmp/nxrh-vite.pid"
VITE_LOG_FILE="/tmp/nxrh-vite.log"

vite_is_running() {
  # Running if PID file exists with a live process, or port 5173 is already bound
  if [ -f "$VITE_PID_FILE" ]; then
    local pid
    pid=$(cat "$VITE_PID_FILE" 2>/dev/null)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  if lsof -i :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

if vite_is_running; then
  echo "✔  Vite already running on :5173"
else
  echo "▶  Starting Vite…"
  cd /Users/francoislongo/Desktop/taff/NX-RH/frontend-v2 || {
    echo "✗  frontend-v2 directory not found"; exit 1
  }
  nohup npm run dev > "$VITE_LOG_FILE" 2>&1 &
  echo $! > "$VITE_PID_FILE"
  echo "   Waiting for Vite to initialise…"
  sleep 4
  # Print the local URL from the log
  VITE_URL=$(grep -oE 'http://localhost:[0-9]+/' "$VITE_LOG_FILE" | head -1)
  if [ -n "$VITE_URL" ]; then
    echo "   Vite URL: $VITE_URL"
  fi
fi

# ── 4. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          NX-RH Dev Environment Ready 🚀             ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Frontend  : http://localhost:5173/                 ║"
echo "║  API       : http://localhost:5050/api              ║"
echo "║  MongoDB   : localhost:27017 (nanoxplore_rh)        ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Credentials (tous les comptes : Test1234!)         ║"
echo "║  admin@nanoxplore.com        → Admin                ║"
echo "║  hr@nanoxplore.com           → RH                   ║"
echo "║  directeur@nanoxplore.com    → Directeur            ║"
echo "║  manager1@nanoxplore.com     → Manager              ║"
echo "║  employee1@nanoxplore.com    → Employé              ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Logs Vite  : tail -f /tmp/nxrh-vite.log           ║"
echo "║  Stop Vite  : kill \$(cat /tmp/nxrh-vite.pid)       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 5. Open browser (interactive only) ───────────────────────────────────────
if [ -t 0 ]; then
  read -r -p "Open browser? [y/N] " answer
  case "$answer" in
    [yY]|[yY][eE][sS])
      open "http://localhost:5173/" 2>/dev/null || \
        xdg-open "http://localhost:5173/" 2>/dev/null || true
      ;;
  esac
fi
