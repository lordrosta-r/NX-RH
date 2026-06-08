# CHANGELOG — NX-RH

## [1.1.0] — 2026-06-08

### Sécurité
- Garde-fou prod : refus de démarrer si `RELAX_RATE_LIMIT=true` (anti-bruteforce).
- `avatarUrl` : validation anti-SSRF (https publics uniquement, rejet des hôtes internes/métadonnées).
- `refreshTokens` : tableau plafonné aux 20 derniers (anti-gonflement du document).

### CI / CD / Packaging
- Pipeline CI/CD refait de zéro : un seul `ci.yml` (jobs Backend + Frontend, `concurrency`), suppression du `pr-checks.yml` redondant.
- Lint bloquant + tests **Vitest** intégrés à la CI.
- **Image Docker publiée sur `ghcr.io/lordrosta-r/nx-rh`** (tags `latest`, `sha`, et version sur les tags `v*`).
- Dependabot + CodeQL + `npm audit` actifs.

### Infrastructure
- `cert-init` : génération automatique d'un certificat auto-signé au 1er démarrage (nginx démarre sans cert pré-fourni).
- Upload de certificat via l'UI fonctionnel en conteneur (volume `nginx/certs` partagé app `:rw` / nginx `:ro`).

### Documentation
- `docs/STACK.md` (choix techniques argumentés), `docs/ARCHITECTURE.md` (machine d'état complète), docs certificats à jour.
- README professionnel (badges, contexte d'alternance).

### Nettoyage
- Suppression du code mort (guards/features inutilisés, assets, types morts).
- Repo public, base de données vidée des données de démo.

## [Unreleased] — Sprint LOT 1-4

### 🔒 Sécurité (LOT 1)
- IDOR: RBAC filter on GET /api/campaigns/:id (evaluateeId/evaluatorId)
- Joi validation middleware sur POST/PUT campaigns et users
- COOKIE_SECURE=true en production
- unhandledRejection + uncaughtException handlers

### ♿ Accessibilité (LOT 1)
- Focus trap WCAG 2.1.2 sur les modals (useFocusTrap hook)
- aria-labels sur 13 boutons icônes
- Skip-to-main link + id="main-content"
- aria-label="Navigation principale" sur `<nav>`

### ⚡ Performance (LOT 2)
- bulkWrite: N→1 requêtes MongoDB pour les opérations batch
- Index texte MongoDB (User, Campaign, Form) — $regex → $text
- useDebounce(400ms) sur toutes les recherches — 8 pages
- Vite manualChunks: 4 vendor bundles (react, charts, flow, query)
- ReactQueryDevtools conditionnel (dev only)

### 🐛 Bugfixes React (LOT 2)
- 26 listes dynamiques: key={index} → clés stables (_id, valeur, composite)

### 🏗️ Architecture (LOT 3)
- Service layer: campaignService (9 fn), userService (8 fn), authService (4 fn)
- API envelopes normalisées: { data, total, page } — POST → 201
- TypeScript: 0 `as any` restants
- EventsPage décomposée: CalendarGrid + EventSlideOver

### 📚 Documentation (LOT 3)
- CONTRIBUTING.md: stack, architecture, conventions, comptes test

### ✨ Features (LOT 4)
- Dashboard RH: KPIs dynamiques (users, campagnes, évaluations)
- Dashboard Manager: KPIs scopés à l'équipe
- Notifications: cron quotidien J-3, cloche UI avec badge
- AdminHub: 5 familles (utilisateurs, campagnes, RH, communication, système)
- EmptyState component réutilisable
- Dashboard Employé: section demandes rapides
- Winston logging structuré (HTTP + métier + erreurs)
