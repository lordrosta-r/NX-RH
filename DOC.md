# NanoXplore RH — Racine du projet

## Structure

```
nx/
├── frontend-v2/       ← SPA React/Vite (TypeScript, React Router v6, TanStack Query v5, i18next, Tailwind v3)
├── mongo/server/      ← API Express + MongoDB/Mongoose (Node.js, JWT cookies httpOnly, LDAP auth)
├── nginx/             ← Configuration reverse-proxy (prod + dev)
├── docker/            ← Fichiers de configuration Docker auxiliaires (nginx-dev.conf, …)
├── docs/              ← Architecture, flows métier, rôles, specs API, runbook
├── designs/           ← Maquettes HTML et fichiers de design (source de vérité visuelle)
├── scripts/           ← Scripts de migration, seeding LDAP, utilitaires
├── CONTRIBUTING.md          ← Conventions & architecture (source de vérité pour les développeurs)
├── Dockerfile         ← Build multi-stage (frontend → mongo/server/public/ + Express)
├── docker-compose.yml            ← Production
├── docker-compose.dev.yml        ← Override développement (Vite dev server + live-reload)
├── docker-compose.preview.yml    ← Preview build production en local
└── docker-compose.e2e.yml        ← Environnement Playwright e2e
```

## Frontend vivant : `frontend-v2/`

Le frontend est une SPA TypeScript lancée via Vite. Point d'entrée :
`frontend-v2/src/main.tsx` → `App.tsx` → `RouterProvider` (React Router v6 `createBrowserRouter`).

- Routes : `frontend-v2/src/router/index.tsx`
- Navigation : `frontend-v2/src/components/layout/navConfig.ts`
- Auth : `useAuth()` depuis `frontend-v2/src/contexts/AuthContext.tsx`
- i18n : `react-i18next`, fichiers dans `frontend-v2/src/i18n/locales/{fr,en}.json`

Voir `frontend-v2/README.md` et `CONTRIBUTING.md` pour les conventions détaillées.

## Backend : `mongo/server/`

API Express + Mongoose. L'auth repose sur des cookies JWT httpOnly (pas de localStorage).
LDAP utilisé pour l'authentification uniquement (pas d'autorisation LDAP).

- Routes : `mongo/server/routes/` (un fichier JS par domaine)
- Modèles Mongoose : `mongo/server/models/`
- Services métier : `mongo/server/services/`

## Démarrage rapide

```bash
# Dev (frontend + backend dans Docker, hot-reload activé)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
# → Frontend Vite sur https://localhost (via nginx) et port :5173
# → Backend Express sur :3001 (direct) ou https://localhost/api (via nginx)
# → MailHog UI sur :8025
# → phpLDAPadmin sur :8080

# Build production
docker compose up -d --build
```

## Documentation de référence

Les fichiers dans `docs/` décrivent l'architecture et les processus sans doublonner ce fichier :

- `docs/PAGES.md` — inventaire des pages et leur rôle fonctionnel
- `docs/USER_FLOW.md` — flux utilisateur par rôle
- `docs/DEPLOYMENT.md` / `docs/RUNBOOK.md` — opérations de production
- `docs/API.md` — contrat des endpoints Express
- `docs/ARCHITECTURE.md` — décisions d'architecture

**Lire `CONTRIBUTING.md` avant toute modification de code.**
