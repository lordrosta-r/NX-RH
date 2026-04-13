#!/usr/bin/env bash
# NanoXplore RH — Pre-commit checks
# Usage: bash scripts/pre-commit.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0

echo "🔍 NanoXplore RH — Pre-commit checks"
echo "======================================"

# ── 1. Build Vite ──────────────────────────────────────────────
echo ""
echo "📦 [1/6] Build Vite..."
cd "$ROOT/client"
if npm run build --silent; then
  echo "  ✅ Build OK"
else
  echo "  ❌ Build FAILED"
  ERRORS=$((ERRORS+1))
fi

# ── 2. ESLint frontend ─────────────────────────────────────────
echo ""
echo "🔎 [2/6] ESLint frontend..."
cd "$ROOT/client"
if ! npm run lint --silent > /dev/null 2>&1; then
  # Script absent → skip gracefully
  if ! npm run | grep -q "\"lint\""; then
    echo "  ⏭️  lint script absent — skip"
  elif npm run lint 2>&1 | grep -q "error"; then
    echo "  ❌ ESLint errors détectés"
    npm run lint 2>&1 | grep "error" | head -20
    ERRORS=$((ERRORS+1))
  else
    echo "  ✅ ESLint OK"
  fi
else
  echo "  ✅ ESLint OK"
fi

# ── 3. Stylelint CSS ────────────────────────────────────────────
echo ""
echo "🎨 [3/6] Stylelint CSS..."
cd "$ROOT/client"
if ! npm run | grep -q "\"lint:css\""; then
  echo "  ⏭️  lint:css script absent — skip"
elif npm run lint:css --silent 2>&1 | grep -qiE "✖|error"; then
  echo "  ⚠️  Stylelint violations (couleurs hardcodées ?)"
  npm run lint:css 2>&1 | grep -iE "✖|error" | head -20
else
  echo "  ✅ Stylelint OK"
fi

# ── 4. Syntax check backend ────────────────────────────────────
echo ""
echo "🔧 [4/6] Syntax check backend Node.js..."
cd "$ROOT/mongo/server"
BACKEND_ERRORS=0
for f in index.js routes/*.js models/*.js middleware/*.js services/*.js config/*.js; do
  if [ -f "$f" ]; then
    if ! node --check "$f" 2>/dev/null; then
      echo "  ❌ Syntax error in $f"
      BACKEND_ERRORS=$((BACKEND_ERRORS+1))
    fi
  fi
done
if [ $BACKEND_ERRORS -eq 0 ]; then
  echo "  ✅ Syntax OK (all files)"
else
  ERRORS=$((ERRORS+1))
fi

# ── 5. Grep: hardcodes dangereux ───────────────────────────────
echo ""
echo "🚨 [5/6] Grep: patterns dangereux..."

# i18n hardcodés en français dans JSX
FR_HARDCODES=$(grep -rn "\"[A-ZÀ-ÿa-z]\+[àâäéèêëîïôùûü]\|Connexion\|Déconnexion\|Enregistrer\|Annuler\|Fermer\"" \
  "$ROOT/client/src" \
  --include="*.jsx" \
  --exclude-dir=i18n \
  2>/dev/null | grep -v "//.*\"" | wc -l || echo 0)

if [ "$FR_HARDCODES" -gt 0 ]; then
  echo "  ⚠️  ~$FR_HARDCODES potentiels hardcodes FR dans JSX (vérifier manuellement)"
else
  echo "  ✅ Pas de hardcodes FR évidents"
fi

# credentials: 'include' manquant dans les fetch
FETCH_WITHOUT_CREDS=$(grep -rn "fetch(" "$ROOT/client/src" --include="*.jsx" -A3 2>/dev/null | \
  grep -B3 "fetch(" | grep "fetch(" | grep -v "credentials" | wc -l || echo 0)

# Token JWT dans body de réponse
JWT_IN_BODY=$(grep -rn "res.json.*token" "$ROOT/mongo/server/routes" --include="*.js" 2>/dev/null | \
  grep -v "//\|refresh\|access_token_in_url" | wc -l || echo 0)

if [ "$JWT_IN_BODY" -gt 0 ]; then
  echo "  ❌ Token JWT potentiellement exposé dans res.json() ($JWT_IN_BODY occurrences)"
  grep -rn "res.json.*token" "$ROOT/mongo/server/routes" --include="*.js" | grep -v "//"
  ERRORS=$((ERRORS+1))
else
  echo "  ✅ JWT non exposé en body"
fi

# eval() dans le backend
EVAL_USAGE=$(grep -rn "\beval(" "$ROOT/mongo/server" --include="*.js" 2>/dev/null | grep -v "node_modules\|//\|evaluate" | wc -l || echo 0)
if [ "$EVAL_USAGE" -gt 0 ]; then
  echo "  ❌ eval() détecté dans le backend !"
  ERRORS=$((ERRORS+1))
else
  echo "  ✅ Pas de eval()"
fi

# new User(req.body) mass assignment
MASS_ASSIGN=$(grep -rn "new User(req.body)\|new Campaign(req.body)\|new Form(req.body)\|new Evaluation(req.body)" \
  "$ROOT/mongo/server/routes" --include="*.js" 2>/dev/null | wc -l || echo 0)
if [ "$MASS_ASSIGN" -gt 0 ]; then
  echo "  ❌ Mass assignment détecté (new Model(req.body)) !"
  ERRORS=$((ERRORS+1))
else
  echo "  ✅ Pas de mass assignment"
fi

# ── 6. .env.example à jour ─────────────────────────────────────
echo ""
echo "📄 [6/6] .env.example check..."
ENV_EXAMPLE="$ROOT/mongo/.env.example"
if [ -f "$ENV_EXAMPLE" ]; then
  missing=0
  for key in JWT_SECRET MONGO_URI NODE_ENV PORT CLIENT_ORIGIN; do
    if ! grep -q "^$key=" "$ENV_EXAMPLE"; then
      echo "  ⚠️  $key manquant dans .env.example"
      missing=$((missing+1))
    fi
  done
  if [ $missing -eq 0 ]; then
    echo "  ✅ .env.example complet"
  fi
else
  echo "  ⚠️  .env.example introuvable"
fi

# ── Résultat final ─────────────────────────────────────────────
echo ""
echo "======================================"
if [ $ERRORS -eq 0 ]; then
  echo "✅ PASS — Tous les checks sont OK"
  echo "   Prêt pour commit."
  exit 0
else
  echo "❌ FAIL — $ERRORS check(s) en erreur"
  echo "   Corriger avant de commiter."
  exit 1
fi
