# NanoXplore RH — Racine du projet

## Structure

```
nx/
├── client/          ← SPA React/Vite (Tailwind v4, React Router v7)
├── mongo/server/    ← API Express + MongoDB (Node.js)
├── nginx/           ← Configuration reverse-proxy (prod)
├── designs/         ← Maquettes HTML et fichiers de design textuels (source de vérité visuelle)
├── docs/            ← Architecture, flows métier, rôles, specs API
├── scripts/         ← Scripts de migration, e2e, utilitaires
├── CLAUDE.md        ← Conventions & architecture (source de vérité pour les agents IA)
└── docker-compose.yml
```

## Architecture

L'application est une **SPA** (Single-Page Application) :
- `client/index.html` → `main.jsx` → `App.jsx` → React Router v7 (38 routes)
- Express sert `index.html` pour toutes les routes non-API (`GET * → index.html`)
- L'auth est gérée côté client via `AuthContext` + `ProtectedRoute`

## Démarrage rapide

```bash
# Dev (frontend + backend séparés)
cd client && npm run dev          # Vite sur :5173 (proxy /api → :3000)
cd mongo/server && npm start      # Express sur :3000

# Build production
cd client && npx vite build       # → mongo/server/public/

# Docker
docker compose up -d
```

## Source de vérité design

Les fichiers dans `designs/` et `docs/` ont priorité sur le code existant.
Lire `CLAUDE.md` avant toute modification.

## État de la migration SPA

Migration MPA → SPA complète (branche `feat/spa-tailwind`) :
- 38 routes React Router v7 implémentées
- 4 rôles couverts : employee, manager, hr, admin
- Tous les anciens `.html` multi-entrées supprimés
- Express simplifié : SPA fallback unique
