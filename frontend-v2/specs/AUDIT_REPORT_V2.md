# AUDIT_REPORT_V2 — NX-RH Pre-Frontend Audit Round 2
**Date :** 2026-05-04 | **Branch :** refactor | **Tests :** 840/840

---

## Verdict global : READY WITH CONDITIONS

Le backend NX-RH est fonctionnellement complet pour démarrer le scaffolding frontend. Les 2 bugs P0 bloquants ont été corrigés dans ce rapport. Tous les tests passent (840/840). Les items P1 restants sont des lacunes de tests ou des incomplétudes non-bloquantes pour le frontend.

---

## Résumé des 9 domaines

| Domaine | Verdict | P0 | P1 | P2 |
|---------|---------|----|----|-----|
| A1 — Auth & Sécurité | ✅ PRÊT AVEC RÉSERVES | 1 corrigé | 0 | 1 (refresh token) |
| A2 — Campagnes & Évaluations | ✅ PRÊT AVEC RÉSERVES | 1 corrigé | 1 (bulk-remind absent) | 0 |
| A3 — Analytics + Dashboard + HR Flags | ✅ PRÊT AVEC RÉSERVES | 0 | 2 corrigés (doc) | 1 (CSV reviewerScore) |
| A4 — Org & Utilisateurs | ✅ PRÊT AVEC RÉSERVES | 0 | 1 corrigé (view=team) | 1 (offboarding transfer) |
| A5 — Formulaires | ✅ PRÊT AVEC RÉSERVES | 0 | 0 | 1 (multiple_choice) |
| A6 — Notifications & Mailing | ✅ PRÊT AVEC RÉSERVES | 0 | 0 | 1 (NOTIFICATION_TYPES) |
| A7 — Modèles & Constants | ✅ PRÊT AVEC RÉSERVES | 0 | 1 (draft absent) | 1 (index Notification) |
| A8 — Specs Frontend | ✅ PRÊT AVEC RÉSERVES | 0 | 3 corrigés (doc) | 0 |
| A9 — Tests & Couverture | ✅ PRÊT AVEC RÉSERVES | 0 | 1 (tests analytics) | 2 |

---

## Bugs P0 (corrigés dans ce rapport)

### P0-1 — HR ne pouvait pas faire `signed_hr → validated`
- **Fichier** : `mongo/server/models/Evaluation.js`
- **Cause** : `ROLE_TRANSITIONS.hr` ne contenait pas `signed_hr: ['validated']` — HR pouvait signer mais pas valider.
- **Correction** : Ajout de `signed_hr: ['validated']` dans `ROLE_TRANSITIONS.hr`.
- **Impact** : HR peut désormais compléter le cycle de validation sans passer par un admin.
- **Test mis à jour** : `__tests__/models/evaluation.test.js` — assertion inversée + nouveau test `can validate after signing`.

### P0-2 — `/api/evaluations/bulk` non protégé par `authGuard`
- **Fichier** : `mongo/server/index.js` (ligne ~158)
- **Cause** : `app.use('/api/evaluations/bulk', mutationLimiter)` — aucune vérification d'authentification ou de rôle.
- **Correction** : `app.use('/api/evaluations/bulk', mutationLimiter, authGuard(['admin', 'hr']))`.
- **Impact** : La route de création/modification en masse est maintenant réservée aux admins et RH authentifiés.

---

## Items P1 — Corrigés dans ce rapport

### P1-1 — `view=team` (singulier) ignoré dans `/api/org/tree`
- **Fichier** : `mongo/server/routes/org/index.js`
- **Correction** : Ajout d'un alias `if (view === 'team') view = 'teams'` avant la validation.
- **Impact** : Les deux formes `?view=team` et `?view=teams` sont acceptées.

### P1-2 — `GET /api/dashboard` marqué `NOT IMPLEMENTED` dans `07-api-contract.md`
- **Fichier** : `frontend-v2/specs/07-api-contract.md`
- **Correction** : Entrée changée en `✅ IMPLEMENTED (voir § Module Dashboard)`. La route existe et est complètement documentée plus bas dans le même fichier.

### P1-3 — `GET /api/hr/flags/count` absent de `07-api-contract.md`
- **Fichier** : `frontend-v2/specs/07-api-contract.md`
- **Correction** : Entrée complète ajoutée dans la section `## 10. HR Flags`.

### P1-4 — Compteur d'écrans incohérent entre `00-master.md` (46) et `03-screens.md` (44)
- **Fichier** : `frontend-v2/specs/00-master.md`
- **Correction** : `46` → `44` (aligné avec `03-screens.md` qui liste S-01→S-43 + S-10b = 44 écrans).

### P1-5 — `POST /api/admin/ldap/preview` référencé dans `04-flows.md` mais non documenté
- **Fichier** : `frontend-v2/specs/07-api-contract.md`
- **Correction** : Documentation complète ajoutée (body, response, erreurs) dans la section LDAP hors-contrat.

---

## Items P1 — Restants (à traiter avant le premier sprint)

### P1-R1 — `bulk-remind` absent dans `campaigns.js` / `bulk.js`
- **Domaine** : A2
- **Description** : `POST /api/campaigns/:id/bulk-remind` est référencé dans les specs mais non implémenté côté backend.
- **Action** : Implémenter la route avant de coder l'écran S-11 (Détail campagne).

### P1-R2 — `draft` absent de `EVALUATION_STATUSES`
- **Domaine** : A7
- **Description** : `EVALUATION_STATUSES` contient des statuts extra (`assigned`, `submitted`, `reviewed`, `expired`, `rejected`) qui ne correspondent pas au state machine documenté. Le statut `draft` est absent.
- **Action** : Aligner `EVALUATION_STATUSES` avec le state machine officiel ou documenter les écarts.

### P1-R3 — Tests analytics incomplets (`analytics.test.js`)
- **Domaine** : A9
- **Description** : `GET /api/analytics/summary` et `GET /api/analytics/export/csv` non couverts (seulement PDF).
- **Action** : Ajouter les tests manquants.

---

## Items P2 — Pendant le premier sprint

| # | Domaine | Description |
|---|---------|-------------|
| P2-1 | A1 | Refresh token absent — sessions expirées nécessitent re-login complet |
| P2-2 | A2 | HR ne peut pas créer de flag (`POST /api/hr/flags` absent) |
| P2-3 | A2 | HR ne peut pas supprimer de flag (`DELETE /api/hr/flags/:id` absent) |
| P2-4 | A3 | CSV analytics utilise encore `score` au lieu de `reviewerScore` comme nom de colonne |
| P2-5 | A4 | Offboarding archive les évals mais ne transfère pas les évaluations en cours au nouveau manager |
| P2-6 | A5 | Spec mentionne `multiple_choice` comme type de question — absent du backend (`QUESTION_TYPES`) |
| P2-7 | A6 | `NOTIFICATION_TYPES` incomplets vs spec `05-notifications.md` (manque `evaluationReviewed`, `evaluationSignedByHR`, etc.) |
| P2-8 | A9 | `mutations.js`, `queries.js`, `helpers.js` (evaluations) sans tests dédiés |
| P2-9 | A9 | `admin/mailTemplates.js`, `hr/notifications.js` sans tests |

---

## Items P3 — Backlog

| # | Domaine | Description |
|---|---------|-------------|
| P3-1 | A1 | Routes LDAP retournent `{ message }` au lieu de `{ error }` (inconsistance de contrat) |
| P3-2 | A7 | Index `{ userId: 1 }` absent sur le modèle `Notification` (perf) |
| P3-3 | A5 | Validation questions partielle (enum Mongoose OK, mais pas de validation explicite du shape complet) |
| P3-4 | A9 | `soft DELETE users` et `batch assign` non couverts par les tests |
| P3-5 | A9 | `auth.test.js` + `auth.login.test.js` doublonnent partiellement |
| P3-6 | A6 | `req.user._id` compensé par middleware mais fragile — à uniformiser |

---

## Ce qui est PRÊT pour le frontend

### ✅ Authentification
- JWT avec payload complet (`id`, `email`, `role`, `firstName`, `lastName`)
- Rate limiter sur login/logout/me
- CORS + Helmet configurés
- Auth LDAP fonctionnelle

### ✅ Gestion des utilisateurs
- CRUD complet + soft DELETE + anonymisation
- Import JSON/CSV (avec alias `sector`/`sectorName`)
- Organigramme (`/api/org/tree?view=all|teams|team|sector`)
- Offboarding workflow

### ✅ Campagnes & Évaluations
- Cycle de vie complet : `assigned → in_progress → submitted → reviewed → signed_evaluatee → signed_manager → signed_hr → validated`
- HR peut maintenant valider (P0-1 corrigé)
- Génération auto des évaluations, contexte N-1
- Export PDF (pdfkit) + CSV
- Bulk create/update protégé (P0-2 corrigé)

### ✅ Formulaires
- CRUD + freeze/unfreeze/clone
- Import/Export JSON
- 9 types de questions (`QUESTION_TYPES`)
- 4 types de formulaires RH (`REQUEST_FORM_TYPES`)

### ✅ Analytics & Dashboard
- 3 routes analytics (summary/campaigns/:id/export)
- Dashboard KPI par rôle (5 rôles)
- HR Flags avec filtres, pagination, count

### ✅ Notifications & Mailing
- GET paginé avec `unreadCount`, `/count`, `/read`, `/read-all`
- Global remind (admin/hr)
- TTL 90j, MailTemplate + seeds

### ✅ Infrastructure
- 840 tests passants (33 suites)
- Audit log (15 actions)
- Rate limiting multi-niveaux
- Pagination standardisée `{ data, total, page, limit }`

---

## Ce qui n'est PAS encore là (frontend scaffold)

- `frontend-v2/src/` n'existe pas encore — Vite + React + Tailwind à scaffolder
- Aucun composant React créé (AdminNavbar, OrgChart, QuestionBuilder, NotificationBell définis dans spec uniquement)
- i18n `react-i18next` à initialiser
- Design system tokens à implémenter (définis dans `02-design-system.md`)
- 44 écrans à implémenter (définis dans `03-screens.md`)
- Routing React Router v6 à configurer
