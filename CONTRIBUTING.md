# Guide de contribution — NX-RH

## Stack technique
- **Frontend** : React 19, Vite 5, TailwindCSS v3, TypeScript strict, TanStack Query v5
- **Backend** : Node.js CommonJS, Express 4, MongoDB/Mongoose
- **Tests** : Jest + Supertest (backend), Vitest + Playwright (frontend)
- **Ports dev** : Frontend 5173, Backend 3000

## Démarrage rapide
```bash
# Backend
cd mongo/server && npm install && npm run dev

# Frontend
cd frontend-v2 && npm install && npm run dev

# Seed DB (admin@nx-rh.fr / Test1234!)
cd mongo/server && node seed.js
```

## Architecture
```
mongo/server/
  models/       # Schémas Mongoose
  routes/       # Contrôleurs HTTP (thin)
  services/     # Logique métier
  middleware/   # authenticate, authorize, validate
  validators/   # Schémas Joi
  utils/        # response.js, helpers

frontend-v2/src/
  pages/        # Pages React (une par route)
  components/   # Composants réutilisables
    ui/         # Composants UI génériques (Button, Modal, etc.)
  hooks/        # Custom hooks (useDebounce, useFocusTrap, etc.)
  api/          # Fonctions d'appel API
  types/        # Interfaces TypeScript
```

## Conventions
- **Commits** : Conventional Commits (`feat:`, `fix:`, `refactor:`, `perf:`, `docs:`, `chore:`)
- **Branches** : `feature/nom`, `fix/nom`, `refactor/nom`
- **TypeScript** : Pas de `as any`. Créer les interfaces dans `src/types/`.
- **Clés React** : Utiliser `_id` ou un champ unique — jamais `key={index}` sur des listes dynamiques
- **API** : Réponses enveloppées `{ data, total, page }`. POST → 201. Erreurs → `{ error: string }`
- **Recherche** : Utiliser `useDebounce(search, 400)` avant de passer au queryKey

## Tests
```bash
# Backend (Jest)
cd mongo/server && npm test

# Frontend (Vitest)
cd frontend-v2 && npm test

# E2E (Playwright)
cd frontend-v2 && npx playwright test
```

## Rôles utilisateurs
| Rôle | Accès |
|------|-------|
| `admin` | Tout |
| `hr` | Campagnes, utilisateurs, rapports |
| `manager` | Ses équipes uniquement |
| `employee` | Son profil, ses évaluations |
| `director` | Vue globale lecture seule |

## Comptes de test (seed)
| Email | MDP | Rôle |
|-------|-----|------|
| admin@nx-rh.fr | Test1234! | admin |
| rh@nx-rh.fr | Test1234! | hr |
| mgr.back@nx-rh.fr | Test1234! | manager |
| emp.back1@nx-rh.fr | Test1234! | employee |
