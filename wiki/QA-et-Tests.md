# QA et Tests

Ce document décrit la stratégie de tests du projet NanoXplore RH : tests unitaires backend,
tests unitaires et d'intégration frontend, tests end-to-end Playwright, et le harness QA
fonctionnel. Il indique les commandes pour lancer chaque suite.

---

## Apercu

| Suite | Outil | Localisation | Volume |
|-------|-------|-------------|--------|
| Backend | Jest + mongodb-memory-server | `mongo/server/` | ~1 200 tests |
| Frontend unitaire | Vitest | `frontend-v2/src/` | intégration + MSW |
| End-to-end | Playwright | `frontend-v2/e2e/` | ~30 specs |
| Harness QA fonctionnel | Script Node.js | `frontend-v2/e2e/qa-harness.mjs` | 10 connexions · 60 assertions |

---

## Backend — Jest

### Ce qui est testé

Les tests backend couvrent les routes Express et les services métier. Chaque test tourne contre
une base MongoDB en mémoire (`mongodb-memory-server`) : pas de base externe nécessaire, pas de
données persistées entre les runs.

### Lancer les tests

```bash
cd mongo/server
npm test
```

En mode CI, les tests tournent avec `--runInBand` (pas de parallélisme) pour éviter les conflits
sur la base en mémoire. Les variables d'environnement nécessaires sont :

```bash
NODE_ENV=test
MONGO_URI=mongodb://localhost:27017/nxrh_test
JWT_SECRET=<valeur de test, au moins 32 caractères>
JWT_REFRESH_SECRET=<valeur de test distincte, au moins 32 caractères>
```

### Coverage

Le CI lance les tests avec `--coverage`. Le rapport de couverture est généré dans
`mongo/server/coverage/`.

### Lint backend

```bash
cd mongo/server
npm run lint
```

---

## Frontend — Vitest

### Ce qui est testé

Les tests Vitest couvrent les hooks, les composants et les fonctions utilitaires. Les appels HTTP
sont interceptés par **MSW** (Mock Service Worker) : les tests s'exécutent sans backend réel.

### Lancer les tests

```bash
cd frontend-v2

# Mode single-run (identique au CI)
npm run test:run

# Mode watch (développement)
npm test
```

### Vérification TypeScript et lint

```bash
cd frontend-v2

# TypeScript strict (sans compilation, juste la vérification des types)
npx tsc --noEmit

# ESLint
npm run lint
```

### Build de production

Permet de détecter les erreurs de compilation Vite avant de pousser :

```bash
cd frontend-v2
npm run build
```

---

## End-to-end — Playwright

### Ce qui est testé

Les specs Playwright dans `frontend-v2/e2e/` couvrent les flux fonctionnels complets : connexion,
builder de formulaires, flux d'évaluation N-1, cycles de vie des utilisateurs. Environ 30 specs.

### Prérequis

La stack complète doit être en cours d'exécution (mode production ou développement). Pour les
tests automatisés, activer `E2E_MODE=true` dans `.env` pour désactiver le rate-limiting de login
(interdit en production).

### Lancer les tests e2e

```bash
cd frontend-v2
npx playwright test
```

### Scripts e2e utiles

Ces scripts dans `frontend-v2/e2e/` servent au peuplement de données et à la démonstration :

| Script | Usage |
|--------|-------|
| `ldap-connect-sync.mjs` | Connecter et synchroniser les annuaires LDAP |
| `assign-roles.mjs` | Assigner des rôles aux utilisateurs créés |
| `capture-*.mjs` | Captures d'écran par feature |
| `n1-demo.mjs` | Démonstration du contexte d'édition précédente N-1 bout-en-bout |
| `lifecycle.mjs` | Offboarding et départ manager avec réaffectation |

---

## Harness QA fonctionnel

### Ce que c'est

`frontend-v2/e2e/qa-harness.mjs` est un harness automatisé qui compose un panel de
**10 utilisateurs** répartis sur tous les rôles, se **connecte réellement** sous chaque identité,
et vérifie une matrice RBAC (actions autorisées vs interdites).

Dernier run connu : **10/10 connexions · 60/60 assertions conformes**.

### Lancer le harness

```bash
# La stack doit être en production avec RELAX_RATE_LIMIT=true
cd frontend-v2
node e2e/qa-harness.mjs
# Génère : docs/qa/Rapport-QA.md
```

---

## Backlogs QA par rôle

Les backlogs dans `docs/qa/` documentent **402 cas de test** manuels, répartis par rôle :

| Role | Nombre de cas |
|------|-------------|
| Employe | 121 |
| Manager | 80 |
| RH | 116 |
| Admin | 85 |

Chaque cas liste : préconditions, étapes, résultat attendu, priorité, cas d'erreur et invariants de
sécurité.

---

## Integration avec le CI

Le pipeline CI lance automatiquement sur chaque PR et chaque push vers `main` :

- Le job Backend : `npm test -- --coverage` dans `mongo/server/`
- Le job Frontend : TypeScript + lint + `npm run test:run` + build

Les deux jobs tournent en parallèle. Voir [[CI-CD]] pour les détails du pipeline.

---

## Checklist avant d'ouvrir une PR

```bash
# Backend
cd mongo/server
npm test
npm run lint

# Frontend
cd frontend-v2
npx tsc --noEmit
npm run lint
npm run test:run
npm run build
```

Tous ces checks doivent passer localement avant de pousser. Le CI les rejouera ; mieux vaut les
attraper en local.
