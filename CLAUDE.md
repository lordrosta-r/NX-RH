# CLAUDE.md — Repères du projet NanoXplore RH

Guide rapide pour toute session de travail (humain ou assistant) sur ce dépôt.

## Structure — où regarder

| Besoin | Emplacement |
|---|---|
| **Frontend (vivant)** | `frontend-v2/` — React 19, Vite, TypeScript, React Router v6. Source de vérité des routes : `frontend-v2/src/router/index.tsx` ; nav : `src/components/layout/navConfig.ts`. |
| **Backend** | `mongo/server/` — Express, MongoDB/Mongoose. Montage des routes : `mongo/server/index.js`. Garde-fous de démarrage prod : même fichier. |
| **Rôles / constantes** | `mongo/server/config/constants.js` (`ADMIN_ROLES = ['admin','hr']`). |
| **Assets de design référencés par le CSS** | `design/` — ⚠️ **utilisé** par `frontend-v2/src/styles/{login,app}.css` (ne pas supprimer). |
| **Config Docker dev (LDAP, nginx)** | `docker/` (utilisé par `docker-compose.dev.yml`). |
| **Documentation détaillée** | `docs/` (PAGES, USER_FLOW, ARCHITECTURE, RUNBOOK…) et le **wiki** GitHub (`wiki/`). |
| **Changements** | `CHANGELOG.md`. |

## Commandes (depuis la racine)
```
npm run dev      # frontend + backend en parallèle (Docker dev)
npm run test     # tests backend (jest)
npm run lint     # lint backend + frontend
npm run build    # build frontend (dist)
```

## Stack e2e jetable (rate-limit relâché)
La stack de test tourne en `NODE_ENV=production` mais avec le login relâché via le
**double opt-in** `RELAX_RATE_LIMIT=true` **+** `E2E_STACK=true` (cf. garde-fou de boot
dans `mongo/server/index.js` et `SECURITY.md`). Voir `docker-compose.e2e.yml`.
La **vraie prod** (sans `E2E_STACK`) refuse RELAX.

Tests Playwright : `frontend-v2/e2e/` ; login helper `e2e/helpers/auth.ts`
(`alice@nxrh.local`, `marie.dupont@…`, `pierre.leclerc@…`, `lucas.bernard@…`, mdp `password123`).
Les tests destructifs opèrent sur des **comptes jetables** (`e2e/helpers/users.ts`) — ne pas
revenir à des mutations de comptes seed (cause de cascades de 401).

## Fichiers archivés (sortis de la racine pour la lisibilité)
Sauvegardés hors-dépôt dans `../NX-RH-archive/` **et** présents dans l'historique git :
- `DOC.md` — redondant avec `README.md` (structure + démarrage rapide y sont déjà).
- `docker-compose.preview.yml` — override non utilisé (n'était référencé que par `DOC.md`).
