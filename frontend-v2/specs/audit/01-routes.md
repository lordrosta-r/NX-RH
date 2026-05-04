# Audit Routes — NX-RH

> **Date** : 2025 · **Auditeur** : Agent 1 · **Cible** : `mongo/server/`
> **Basé sur** : lecture de tous les fichiers de routes + `07-api-contract.md`

---

## Inventaire (86 routes total)

> Légende — Handler : ✅ oui / ⚠️ partiel / ❌ non | Erreurs : codes gérés

### Module Auth (`/api/auth`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| POST | /api/auth/login | Public | ✅ | 400, 401, 429 |
| POST | /api/auth/logout | Public | ✅ | — |
| GET | /api/auth/me | Tous (cookie) | ✅ | 401 |
| PATCH | /api/auth/preferences | Tous (cookie) | ✅ | 400, 403 |

### Module Users (`/api/users`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| GET | /api/users | admin, hr, manager, director | ✅ | 403 |
| GET | /api/users/:id | admin, hr, manager, employee | ✅ | 400, 403, 404 |
| POST | /api/users | admin, hr | ✅ | 400, 403, 409 |
| PATCH | /api/users/:id | admin, hr, self | ✅ | 400, 403, 404 |
| PATCH | /api/users/:id/avatar | self, admin, hr | ✅ | 400, 403, 404 |
| GET | /api/users/:id/offboard-preview | admin, hr | ✅ | 400, 403, 404 |
| PATCH | /api/users/:id/offboard | admin, hr | ✅ | 400, 403, 404 |
| PATCH | /api/users/:id/onboarding/complete | self, admin, hr | ✅ | 400, 403, 404 |
| PATCH | /api/users/:id/onboarding/:stepIndex | self, admin, hr | ✅ | 400, 403, 404 |
| GET | /api/users/:id/gdpr-export | self, admin, hr | ✅ | 400, 403, 404 |
| DELETE | /api/users/:id/gdpr-anonymize | admin | ✅ | 400, 403, 404, 409 |

### Module Users Import (`/api/users/import`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| POST | /api/users/import | admin, hr | ✅ | 400 |

### Module Campaigns (`/api/campaigns`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| GET | /api/campaigns | Tous | ✅ | — |
| GET | /api/campaigns/:id | Tous | ✅ | 400, 404 |
| POST | /api/campaigns | admin, hr | ✅ | 400, 403 |
| PATCH | /api/campaigns/:id | admin, hr | ✅ | 400, 403, 404 |
| DELETE | /api/campaigns/:id | admin, hr | ✅ | 400, 403, 404 |
| POST | /api/campaigns/:id/clone | admin, hr | ✅ | 400, 403, 404 |
| GET | /api/campaigns/:id/analytics | admin, hr | ✅ | 400, 403, 404 |

### Module Evaluations (`/api/evaluations`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| GET | /api/evaluations | Tous (scopé) | ✅ | 400 |
| GET | /api/evaluations/history | Tous | ✅ | — |
| GET | /api/evaluations/export | admin, hr | ✅ | 400, 403 |
| POST | /api/evaluations | admin, hr | ✅ | 400, 403, 409 |
| POST | /api/evaluations/bulk | admin, hr | ✅ | 400, 403, 207 |
| PATCH | /api/evaluations/bulk | admin, hr | ✅ | 400, 403 |
| GET | /api/evaluations/:id | Tous (RBAC) | ✅ | 400, 403, 404 |
| PATCH | /api/evaluations/:id | Tous (selon champ) | ✅ | 400, 403, 404, 409 |
| PATCH | /api/evaluations/:id/reassign | admin, hr | ✅ | 400, 403, 404, 409 |
| POST | /api/evaluations/:id/expire | admin, hr | ✅ | 400, 403, 404, 409 |
| GET | /api/evaluations/:id/pdf | Tous (RBAC) | ✅ | 400, 403, 404 |
| GET | /api/evaluations/:id/n1-context | Tous (RBAC) | ✅ | 204, 400, 403, 404 |

### Module Forms (`/api/forms`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| GET | /api/forms | Tous | ✅ | 400 |
| GET | /api/forms/:id | Tous | ✅ | 400, 404 |
| POST | /api/forms | admin, hr | ✅ | 400, 403 |
| PATCH | /api/forms/:id | admin, hr | ✅ | 400, 403, 404, 409 |
| DELETE | /api/forms/:id | admin, hr | ✅ | 400, 403, 404, 409 |

### Module Forms Import/Export (`/api/forms/import|template|:id/export`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| POST | /api/forms/import | admin, hr | ✅ | 400, 403 |
| GET | /api/forms/template | admin, hr | ✅ | 403 |
| GET | /api/forms/:id/export | admin, hr | ✅ | 400, 403, 404 |

### Module Org (`/api/org`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| GET | /api/org/tree | admin, hr | ✅ | 400 |
| PATCH | /api/org/users/:id | admin, hr | ✅ | 400, 404 |
| GET | /api/org/sectors | admin, hr | ✅ | — |
| POST | /api/org/sectors | admin, hr | ✅ | 400, 409 |
| PATCH | /api/org/sectors/:id | admin, hr | ✅ | 400, 404, 409 |
| DELETE | /api/org/sectors/:id | admin, hr | ✅ | 400, 404, 409 |

### Module HR Notifications (`/api/hr/notifications`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| POST | /api/hr/notifications/bulk-remind | admin, hr | ✅ | 400, 404 |

### Module HR Flags (`/api/hr/flags`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| GET | /api/hr/flags | admin, hr | ✅ | — |
| PATCH | /api/hr/flags/:evalId/status | admin, hr | ✅ | 400, 404 |

### Module Admin (`/api/admin`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| POST | /api/admin/email/test | admin | ✅ | 400 |
| GET | /api/admin/config | admin | ✅ | — |
| PUT | /api/admin/config/batch | admin | ✅ | 400 |
| GET | /api/admin/config/:key | admin | ✅ | 404 |
| PUT | /api/admin/config/:key | admin | ✅ | 400 |
| PATCH | /api/admin/config/:key | admin | ✅ | 400, 404 |
| DELETE | /api/admin/config/:key | admin | ✅ | 404 |

### Module Admin LDAP (`/api/admin/ldap`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| POST | /api/admin/ldap/test | admin | ✅ | — (next(err)) |
| POST | /api/admin/ldap/preview | admin | ✅ | — (next(err)) |
| POST | /api/admin/ldap/sync | admin | ✅ | — (next(err)) |
| GET | /api/admin/ldap/config | admin | ✅ | — |
| PUT | /api/admin/ldap/config | admin | ✅ | — |

### Module Admin Mail Templates (`/api/admin/mail-templates`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| GET | /api/admin/mail-templates | admin, hr | ✅ | — |
| PATCH | /api/admin/mail-templates/:slug | admin | ✅ | 403, 404 |

### Module Audit (`/api/admin/audit`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| GET | /api/admin/audit | admin, hr | ✅ | 400 |
| GET | /api/admin/audit/export | admin, hr | ✅ | — |

### Module Events (`/api/events`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| GET | /api/events | Tous (scopé) | ✅ | — |
| GET | /api/events/:id | Tous (RBAC) | ✅ | 400, 403, 404 |
| POST | /api/events | admin, hr | ✅ | 400, 403 |
| PATCH | /api/events/:id | admin, hr | ✅ | 400, 403, 404 |
| DELETE | /api/events/:id | admin, hr | ✅ | 400, 403, 404 |

### Module Offboarding (`/api/offboarding`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| POST | /api/offboarding | admin, hr | ✅ | 400, 403, 404, 409 |
| GET | /api/offboarding | admin, hr | ✅ | 403 |
| GET | /api/offboarding/:id | admin, hr | ✅ | 400, 403, 404 |
| PATCH | /api/offboarding/:id | admin, hr | ✅ | 400, 403, 404 |
| PATCH | /api/offboarding/:id/checklist/:itemIndex | admin, hr | ✅ | 400, 403, 404 |
| DELETE | /api/offboarding/:id | admin | ✅ | 400, 403, 404 |

### Module Analytics (`/api/analytics`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| GET | /api/analytics/export/pdf | admin, hr | ✅ | 400, 403 |

### Module Resources (`/api/resources`)

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| GET | /api/resources | Tous (scopé) | ✅ | — |
| GET | /api/resources/:id | Tous (RBAC) | ✅ | 400, 403, 404 |
| POST | /api/resources | admin, hr | ✅ | 400, 403 |
| PATCH | /api/resources/:id | admin, hr | ✅ | 400, 403, 404 |
| DELETE | /api/resources/:id | admin, hr | ✅ | 400, 403, 404 |

### Module Health

| METHOD | Path | Rôles | Handler | Erreurs gérées |
|--------|------|-------|---------|----------------|
| GET | /api/health | Public | ✅ | 503 |

---

## Comparaison contrat (07-api-contract.md)

Le contrat documente **75 endpoints** dans 16 modules.
L'implémentation réelle contient **86 routes** (contrat + modules non documentés).

### Modules présents dans le code mais **absents du contrat**

| Module | Routes | Impact |
|--------|--------|--------|
| `/api/analytics/export/pdf` | 1 route | Pas documenté côté frontend |
| `/api/resources` (CRUD 5 routes) | 5 routes | Module entier absent du contrat |
| `/api/admin/ldap` (5 routes) | 5 routes | Présent en code mais absent du contrat |

---

## 🔴 P1 — Routes manquantes bloquantes

### P1-01 — `GET /api/notifications` absent

**Attendu** selon les specs demandées : liste des notifications de l'utilisateur courant.
**Réalité** : aucune route `/api/notifications` n'existe. `routes/hr/notifications.js` ne gère que l'envoi groupé de rappels RH (`POST /api/hr/notifications/bulk-remind`), pas la consultation per-user.
**Impact** : le frontend ne peut pas afficher les notifications individuelles (bell icon, centre de notifs).
**Suggestion** : créer `GET /api/notifications` (scopé user courant, paginé) + `PATCH /api/notifications/:id/read`.

### P1-02 — `PATCH /api/notifications/:id/read` absent

**Attendu** : marquer une notification comme lue.
**Réalité** : aucune route de ce type.
**Dépendance** : bloquant si les notifications sont persistées en base (modèle `Notification` à vérifier).

### P1-03 — `GET /api/dashboard` absent

**Attendu** dans les specs demandées : agrégats pour la page d'accueil (compteurs, évaluations en cours, etc.).
**Réalité** : la route `/dashboard` dans `index.js` est un redirect 301 vers `/employee` (SPA). Il n'y a pas d'endpoint API `/api/dashboard`.
**Impact** : le frontend doit faire N appels séparés pour assembler le tableau de bord au lieu d'un seul appel optimisé.

### P1-04 — `POST /api/campaigns/:id/launch` absent

**Attendu** : lancement explicite d'une campagne.
**Réalité** : le lancement se fait via `PATCH /api/campaigns/:id` avec `{ status: 'active' }`. Il n'y a pas de raccourci `/launch`.
**Verdict** : fonctionnellement couvert par PATCH, mais si le contrat frontend attend `/launch` explicitement, c'est un P1. Si PATCH suffit : P3.

### P1-05 — `POST /api/campaigns/:id/close` absent

Même situation que P1-04. La fermeture passe par `PATCH` avec `{ status: 'closed' }`. Pas de route `/close` dédiée.

### P1-06 — `POST /api/evaluations/:id/submit` et `POST /api/evaluations/:id/sign` absents

**Attendu** : des endpoints dédiés pour soumission et signature.
**Réalité** : ces opérations passent par `PATCH /api/evaluations/:id` avec `{ status: 'submitted' }` / `{ status: 'signed_evaluatee' }`. Fonctionnellement complet mais l'interface attendue par les specs demandées ne correspond pas.

### P1-07 — `GET /api/users/me` absent

**Attendu** dans les specs demandées.
**Réalité** : couvert par `GET /api/auth/me`. La convention est différente — si le frontend attend `/api/users/me`, il manque un alias.

---

## 🟠 P2 — Edge cases / validation manquants

### P2-01 — `PATCH /api/campaigns/:id` : pas de validation `endDate > startDate` lors de la mise à jour

`POST /api/campaigns` valide `endDate >= startDate`, mais `PATCH /api/campaigns/:id` ne re-valide pas cette contrainte si les deux champs sont modifiés ensemble. Une campagne pourrait avoir `endDate < startDate` après un PATCH.

### P2-02 — `PATCH /api/users/:id/offboard` : pas de transaction multi-modèles

Le handler archive les évaluations avec `Evaluation.updateMany(...)` séparément du `user.save()`. Si `user.save()` réussit mais `Evaluation.updateMany` échoue (ou vice-versa), les données sont incohérentes. Pas de rollback possible (MongoDB sans transaction explicite).
**Correction** : utiliser une session Mongoose `startSession()` + `withTransaction()`.

### P2-03 — `DELETE /api/campaigns/:id` : pas de transaction

Le handler fait deux opérations (`Evaluation.deleteMany` + `Form.deleteMany`) puis `campaign.deleteOne()` sans transaction. Un échec intermédiaire laisserait la campagne sans ses évaluations mais toujours présente.

### P2-04 — `POST /api/offboarding` : pas de vérification du statut `isActive` de l'utilisateur

Un utilisateur déjà offboardé (`isActive: false`) peut recevoir une nouvelle demande de départ. Le handler vérifie l'existence (`findById`) mais pas `isActive`.

### P2-05 — `PATCH /api/evaluations/bulk` (action `archive`) : logique incorrecte

Dans `handleBulkAction`, l'action `archive` fait `allowed[0]` sans vérifier que `allowed[0] === 'archived'`. Le premier état autorisé de la matrice de transition pour certains statuts n'est pas forcément `archived` — risque de mauvaise transition.

### P2-06 — `GET /api/hr/flags` : pas de pagination

Retourne toutes les évaluations de type "request" sans `page/limit`. Sur un grand volume, risque de timeout et de payload excessif.

### P2-07 — `PATCH /api/evaluations/:id` : gestion insuffisante des rôles `manager`/`director` sur le RBAC answers

Un manager qui n'est ni évaluateur ni lié à l'évalué peut tout de même écrire des `answers` si son rôle n'est pas `employee`. Le filtre `role === 'employee'` pour les answers ne bloque pas les managers non concernés.

### P2-08 — `PATCH /api/users/:id` : email non validé

Le champ `email` est dans la whitelist `ALLOWED` mais aucune validation de format n'est effectuée dans le handler (ni regex, ni unicité check explicite — la contrainte `11000` n'est pas catchée comme dans POST).

### P2-09 — `POST /api/offboarding` : doublon 409 mais pas de vérification de statut existant

Un utilisateur avec une demande `completed` peut recevoir une nouvelle demande si le modèle `OffboardingRequest` n'a pas d'index unique conditionnel (uniquement sur `userId` actif).

### P2-10 — `PATCH /api/hr/flags/:evalId/status` : transition de statut non contrôlée

Le handler accepte `submitted`, `reviewed`, `validated` dans n'importe quel ordre sans vérifier le statut actuel. Une évaluation déjà `validated` peut repasser en `submitted`.

### P2-11 — `POST /api/evaluations/bulk` : `handleBulkCreate` — un seul `campaignId` notifié

Les notifications `evaluationAssigned` sont envoyées en prenant `sanitized[0]?.campaignId` — si le bulk crée des évaluations sur plusieurs campagnes, seule la première est utilisée dans le message de notification.

### P2-12 — Routes LDAP : aucune validation du body `config`

`POST /api/admin/ldap/test|preview|sync` : aucun champ n'est validé dans `req.body.config` avant d'être passé au service. Un body malformé ou vide sera passé directement à `ldapService` avec `next(err)` comme seul filet.

---

## 🟡 P3 — Améliorations (pagination, tri, filtres)

### P3-01 — `GET /api/evaluations/history` : pas de pagination

Limité à 200 résultats hardcodés mais sans `page/limit` exposés. Le frontend ne peut pas charger plus si besoin.

### P3-02 — `GET /api/hr/flags` : tri absent

Aucun paramètre `sort`/`order`. La liste des demandes RH est renvoyée sans ordre défini (dépend de MongoDB).

### P3-03 — `GET /api/evaluations` : pas de `sortBy`/`order` exposé

Le tri est hardcodé `createdAt: -1`. Pas de paramètre pour trier par `status`, `updatedAt`, ou `score`.

### P3-04 — `GET /api/campaigns` : pas de filtre par date (`from`, `to`)

Pas de filtre `?startAfter=&endBefore=` pour lister les campagnes d'une période donnée.

### P3-05 — `GET /api/resources` : pas de filtres exposés

Pas de `?type=&search=` — le frontend ne peut pas filtrer les ressources documentaires.

### P3-06 — `GET /api/events` : pas de filtre par date ni par type

Pas de `?from=&to=&type=` pour filtrer le calendrier.

### P3-07 — `GET /api/admin/audit/export` : filtres non validés

Les filtres `action`, `targetType` ne sont pas validés contre les whitelists définies dans `GET /api/admin/audit`. Un `action` invalide est silencieusement ignoré (pas de 400).

### P3-08 — `PATCH /api/org/sectors/:id` : validation `name` absente

`PATCH /api/org/sectors/:id` accepte n'importe quelle valeur pour `name` sans vérifier longueur (contrairement à `POST /api/org/sectors` qui valide 2–100 chars).

### P3-09 — `POST /api/campaigns/:id/clone` : les formulaires clonés ne copient pas `isAnonymous` correctement

Le handler lit `f.isAnonymous` dans les docs clonés — mais si `formType === 'upward_feedback'` le champ devrait être forcé `true` (comme dans `POST /api/forms`). Pas de re-forçage lors du clone.

### P3-10 — Analytics `/api/analytics/export/pdf` absent du contrat

Ce module (PDF analytique global + filtre campagne) n'est pas documenté dans `07-api-contract.md`. Le frontend v2 ne le connaît peut-être pas.

### P3-11 — Resources `/api/resources` absent du contrat

Cinq routes CRUD complètes pour les ressources documentaires manquent dans `07-api-contract.md`. Les agents suivants doivent en être informés.

---

## ✅ Points conformes

- **Auth** : double rate-limit par email + IP, cookie `httpOnly`, `sameSite: strict`, protection ReDoS email. Complet.
- **Users CRUD** : pagination `{data, total, page, limit}`, validation ObjectId, scope RBAC, protection `passwordHash`/`ldapDn`. Conforme au contrat.
- **Campaigns** : transitions de statut validées via matrice `CAMPAIGN_TRANSITIONS`, audit log fire-and-forget, notifications `campaignLaunch`. Conforme.
- **Evaluations** : matrice `VALID_TRANSITIONS` + `ROLE_TRANSITIONS`, anonymisation via `sanitizeAnonymity`, scope par rôle via `getVisibleUserIds`. Très complet.
- **Forms** : gel (`frozenAt`) respecté sur PATCH et DELETE. Conforme.
- **Org** : protection anti-cycle dans pre-save hook User (signalé dans le commentaire). Conforme.
- **Offboarding** : archivage User automatique sur `completed`, audit log. Conforme.
- **Audit** : whitelist `VALID_ACTIONS` + `VALID_TARGET_TYPES`, export CSV avec BOM Excel. Conforme.
- **LDAP** : `bindPassword` jamais retourné dans les réponses. Conforme sécurité.
- **Tous les modules** : `next(err)` systématique → remontée au `errorHandler` global.
- **Order de montage** dans `index.js` : routes spécifiques avant paramétrées (`/api/users/import` avant `/api/users`, `/api/forms/template` avant `/api/forms/:id`). Conforme.

---

## Résumé exécutif

| Métrique | Valeur |
|----------|--------|
| Routes implémentées | **86** |
| Routes documentées dans le contrat | 75 |
| Routes hors contrat (non documentées) | 11 (LDAP 5, resources 5, analytics/pdf 1) |
| 🔴 P1 — Bloquants | **7** |
| 🟠 P2 — Edge cases / sécurité | **12** |
| 🟡 P3 — Améliorations UX/qualité | **11** |

### Points P1 les plus critiques pour les agents suivants

1. **Notifications user absentes** (GET list + PATCH read) — bloquant UX
2. **Pas de dashboard API** — impacte la page d'accueil
3. **Pas de transaction** sur offboard + delete campaign — risque d'incohérence données
4. `/api/users/me` aliasé via `/api/auth/me` — à vérifier côté frontend
