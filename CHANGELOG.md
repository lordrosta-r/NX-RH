# CHANGELOG — NX-RH

## [1.2.0] — 2026-06-09 — Durcissement prod

Campagne « prod-ready » : challenge bout-à-bout par rôle (chaque page, chaque
bouton, chaque route), audits automatisés et corrections.

### Nouveautés
- **RSVP événements** : un participant peut **Accepter / Incertain / Décliner** un
  RDV (`POST /api/events/:id/respond`), réponse persistée et affichée.
- **Mobile responsive** : navigation repliable (hamburger + drawer < 768px), 0
  débordement horizontal à 390px.
- **Explications** : encart `PageGuide` ajouté sur 12 pages (dashboards, campagne,
  formulaires, mobilité, analytics, flags, événements, documents).

### Corrections (bugs)
- Page PDI : ne crashe plus si l'employé/manager d'un PDI est supprimé.
- Événements : clic sur un événement ne renvoie plus vers `/events/undefined`.
- Création utilisateur : `POST /api/users` renvoie `id` + `temporaryPassword`
  (« Voir le profil » ne mène plus à `/users/undefined`).
- Recherche utilisateurs : honore `q` **et** `search`, et matche les emails (`@`).
- Pagination `/users` et `/admin/users` : l'admin voit **tous** les utilisateurs.
- RBAC : détail PDI accessible au manager/employé (était 403). `/org` réservé manager+.
- Accessibilité : nom accessible sur le bouton de fermeture `PageGuide`, contraste
  des états vides.
- Export CSV de l'audit admin : route corrigée (était 404).
- Notifications : badge de la cloche rafraîchi après « tout marquer comme lu ».
- Création de campagne : message d'erreur en cas d'échec serveur.

### UI par rôle
- Boutons **Exporter** (PDF/CSV) et actions en masse masqués aux rôles non
  autorisés (le manager n'exporte plus).

### Sécurité / config
- `RELAX_RATE_LIMIT` toléré en production **uniquement** avec `E2E_STACK=true`
  (double opt-in pour les stacks e2e jetables ; la vraie prod le refuse).
- Audit d'intégrité : ~422 requêtes `/api` vérifiées, aucun endpoint mort.
- Endpoints durcis (barrières anti-injection NoSQL sur les entrées).

### Tests / qualité
- Audits e2e : accessibilité (axe-core), couverture de routes (142 routes, RBAC
  sans fuite), intégrité des endpoints, challenge « chaque bouton » par rôle.
- Isolation des tests destructifs (comptes jetables) → run complet stable.
- LICENSE propriétaire ; documentation et wiki mis à jour.

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
