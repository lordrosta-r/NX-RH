#!/bin/bash

# Script de vérification de la configuration E2E

echo "🔍 Vérification de la configuration E2E Playwright pour NX-RH"
echo "================================================================"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
  echo "❌ Erreur : package.json non trouvé. Êtes-vous dans frontend-v2 ?"
  exit 1
fi

# Vérifier Playwright dans package.json
if grep -q "@playwright/test" package.json; then
  echo "✅ Playwright installé dans package.json"
else
  echo "❌ Playwright non trouvé dans package.json"
  exit 1
fi

# Vérifier playwright.config.ts
if [ -f "playwright.config.ts" ]; then
  echo "✅ playwright.config.ts présent"
else
  echo "❌ playwright.config.ts manquant"
  exit 1
fi

# Vérifier les répertoires
if [ -d "e2e" ]; then
  echo "✅ Répertoire e2e/ présent"
else
  echo "❌ Répertoire e2e/ manquant"
  exit 1
fi

if [ -d "e2e/page-objects" ]; then
  echo "✅ Répertoire e2e/page-objects/ présent"
else
  echo "❌ Répertoire e2e/page-objects/ manquant"
  exit 1
fi

if [ -d "e2e/helpers" ]; then
  echo "✅ Répertoire e2e/helpers/ présent"
else
  echo "❌ Répertoire e2e/helpers/ manquant"
  exit 1
fi

# Compter les fichiers de test
SPEC_COUNT=$(find e2e -name "*.spec.ts" | wc -l | tr -d ' ')
echo "✅ $SPEC_COUNT fichiers .spec.ts trouvés"

# Vérifier les fichiers principaux
FILES=(
  "e2e/auth.spec.ts"
  "e2e/admin-full.spec.ts"
  "e2e/campaigns.spec.ts"
  "e2e/evaluations.spec.ts"
  "e2e/hr-flags.spec.ts"
  "e2e/smoke.spec.ts"
  "e2e/helpers/auth.ts"
  "e2e/helpers/utils.ts"
  "e2e/page-objects/LoginPage.ts"
  "e2e/page-objects/AdminPage.ts"
  "e2e/page-objects/CampaignPage.ts"
  "e2e/page-objects/EvaluationPage.ts"
  "e2e/page-objects/HrFlagPage.ts"
  "e2e/README-COMPLET.md"
  "e2e/QUICK-START.md"
)

MISSING_COUNT=0
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file manquant"
    MISSING_COUNT=$((MISSING_COUNT + 1))
  fi
done

echo ""
echo "================================================================"

if [ $MISSING_COUNT -eq 0 ]; then
  echo "✅ Tous les fichiers sont présents !"
  echo ""
  echo "📋 Prochaines étapes :"
  echo "  1. Installer les navigateurs : npx playwright install chromium"
  echo "  2. Démarrer le dev server : npm run dev"
  echo "  3. Lancer les smoke tests : npx playwright test smoke.spec.ts"
  echo "  4. Lancer tous les tests : npm run test:e2e"
  echo ""
  exit 0
else
  echo "❌ $MISSING_COUNT fichier(s) manquant(s)"
  exit 1
fi
