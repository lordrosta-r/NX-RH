#!/usr/bin/env bash
# =============================================================================
# prod-visual.sh — Lance le test visuel Playwright contre la stack Docker PROD.
#
# Enchaîne : certs → build → up → health → seed e2e → Playwright → (teardown).
#
# Usage :
#   scripts/e2e/prod-visual.sh                 # build + up + seed + audit visuel
#   scripts/e2e/prod-visual.sh --down          # idem puis arrête la stack à la fin
#   scripts/e2e/prod-visual.sh --no-build      # réutilise l'image déjà buildée
#   scripts/e2e/prod-visual.sh -- <args...>    # passe des args à `playwright test`
#
# Prérequis : Docker, et un fichier .env à la racine (cf. .env.prod.example).
# La stack écoute sur https://localhost (cert auto-signé → ignoreHTTPSErrors).
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

DO_DOWN=false
DO_BUILD=true
PW_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --down)     DO_DOWN=true; shift ;;
    --no-build) DO_BUILD=false; shift ;;
    --)         shift; PW_ARGS=("$@"); break ;;
    *)          PW_ARGS+=("$1"); shift ;;
  esac
done

log() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m❌ %s\033[0m\n' "$*" >&2; exit 1; }

# 1. Prérequis ----------------------------------------------------------------
command -v docker >/dev/null 2>&1 || fail "Docker n'est pas installé/disponible."
[ -f .env ] || fail ".env manquant à la racine — copie .env.prod.example et renseigne les secrets."

# 2. Certs TLS auto-signés ----------------------------------------------------
if [ ! -f nginx/certs/fullchain.pem ] || [ ! -f nginx/certs/privkey.pem ]; then
  log "🔐 Génération des certificats auto-signés…"
  bash scripts/gen-certs.sh
fi

# 3. Build + up ---------------------------------------------------------------
if [ "$DO_BUILD" = true ]; then
  log "🐳 Build de l'image…"
  docker compose build
fi
log "🐳 Démarrage de la stack prod…"
docker compose up -d

# 4. Attente du health check --------------------------------------------------
log "⏳ Attente de https://localhost/api/health…"
HEALTHY=false
for _ in $(seq 1 60); do
  if curl -fsSk https://localhost/api/health >/dev/null 2>&1; then HEALTHY=true; break; fi
  sleep 2
done
if [ "$HEALTHY" != true ]; then
  docker compose logs --tail=60 app || true
  fail "La stack n'a pas répondu sur https://localhost/api/health (timeout 120s)."
fi
log "✅ Stack up."

# 5. Seed e2e (dans le conteneur app) -----------------------------------------
log "🌱 Seed des données e2e…"
docker compose exec -T app npm run seed:e2e

# 6. Playwright — audit visuel ------------------------------------------------
log "🎭 Exécution de l'audit visuel Playwright…"
set +e
( cd frontend-v2 && npx playwright test e2e/visual-ux-audit.spec.ts "${PW_ARGS[@]}" )
PW_EXIT=$?
set -e

log "🖼  Screenshots : frontend-v2/test-results/audit/  ·  rapport : npx playwright show-report (dans frontend-v2/)"

# 7. Teardown optionnel -------------------------------------------------------
if [ "$DO_DOWN" = true ]; then
  log "🧹 Arrêt de la stack…"
  docker compose down
fi

exit $PW_EXIT
