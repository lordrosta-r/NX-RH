# NX-RH — Contrat API Backend (Frontend v2)

> **Version** : 2.0 · **Date** : 2025 · **Source de vérité** : `mongo/server/`
> **Stack** : Express + MongoDB · Cookie `httpOnly` JWT · Base URL `VITE_API_URL`

Ce fichier documente **tous** les endpoints backend, organisés par module.
Chaque endpoint est décrit avec ses rôles, paramètres, body, réponse et erreurs possibles.

---

## Conventions globales

- **Auth** : cookie `httpOnly` (`token`) — `withCredentials: true` dans Axios
- **Pas de Bearer token** en localStorage
- **Format** : `application/json` sauf mention contraire (CSV, multipart)
- **Pagination** : `?page=1&limit=50` (max 100) → `{ data, total, page, limit }`
- **Format d'erreur** : toutes les réponses d'erreur utilisent `{ error: string }` — sauf `POST /api/auth/logout` qui retourne `{ message: string }` pour le succès 200

| Code HTTP | Signification frontend |
|---|---|
| `400` | Validation échouée — afficher erreurs inline |
| `401` | Session expirée — logout + redirect `/login` |
| `403` | Accès interdit — redirect `/` + toast `error` |
| `404` | Ressource introuvable — état vide inline |
| `409` | Conflit (doublon, état invalide) — toast `error` |
| `429` | Trop de requêtes — toast `warning` avec délai |
| `500` | Erreur serveur — toast `error` + bouton « Réessayer » |

---

## 1. Auth (`/api/auth`)

### POST /api/auth/login
- **Auth** : Public (non authentifié)
- **Rate limit** : 5 tentatives/15min/email · 20/15min/IP
- **Body** : `{ email: string, password: string, remember?: boolean }`
- **Response** `200` : `{ user: { id, email, firstName, lastName, role } }` + cookie `token`
- **Errors** : `400` champs manquants · `401` identifiants invalides · `429` trop de tentatives

---

### POST /api/auth/logout
- **Auth** : Public
- **Body** : aucun
- **Response** `200` : `{ message: "Déconnecté" }` — efface le cookie `token`
- **Errors** : aucune

---

### GET /api/auth/me
- **Auth** : Tous les rôles (cookie valide requis)
- **Response** `200` : objet User complet `{ id, email, firstName, lastName, role, department, position, isActive, locale, theme, notificationPrefs, lastLoginAt, authSource, managerId, onboarding, createdAt }` (notificationPrefs filtré par rôle)
- **Errors** : `401` session invalide ou cookie expiré

---

### PATCH /api/auth/preferences
- **Auth** : Tous les rôles
- **Body** : `{ locale?: 'fr'|'en', theme?: 'light'|'dark'|'system', notificationPrefs?: Record<string, boolean> }`
- **Response** `200` : `{ _id, locale, theme, notificationPrefs }` ⚠️ *le champ `_id` est inclus dans la réponse réelle (lean MongoDB)*
- **Errors** : `400` locale/thème invalide · `400` clé notification inconnue · `403` clé non autorisée pour le rôle · `400` aucune préférence envoyée

---

### PATCH /api/auth/password
- **Auth** : Authentifié (tous rôles)
- **⚠️ DÉSACTIVÉ (LDAP)** : retourne toujours `403 { message: 'La modification du mot de passe est gérée par le LDAP.' }`

---

### POST /api/auth/forgot-password
- **Auth** : Public
- **⚠️ DÉSACTIVÉ (LDAP)** : retourne toujours `403 { message: 'La réinitialisation du mot de passe est gérée par le LDAP.' }`

---

### POST /api/auth/reset-password
- **Auth** : Public
- **⚠️ DÉSACTIVÉ (LDAP)** : retourne toujours `403 { message: 'La réinitialisation du mot de passe est gérée par le LDAP.' }`

---

## 2. Users (`/api/users`)

### GET /api/users/me
- **Auth** : tout utilisateur authentifié (alias de `GET /api/auth/me`)
- **Response** `200` : `{ id, firstName, lastName, email, role, department, position, isActive, locale, theme, notificationPrefs, lastLoginAt, authSource, managerId, onboarding, createdAt }` (notificationPrefs filtrées selon le rôle)
- **Errors** : `401` session invalide (cookie expiré ou utilisateur inactif)

---

### GET /api/users
- **Auth** : admin, hr (tout) · manager, director (leurs subordonnés directs)
- **Query** : `?role=&department=&search=&isActive=true|false&sector=<sectorId>&page=1&limit=50`
- **Response** `200` : `{ data: User[], total, page, limit }` (sans `passwordHash`, `ldapDn`)
- **Errors** : `403` rôle insuffisant

---

### GET /api/users/:id
- **Auth** : admin, hr (tout) · manager (soi + subordonnés directs) · employee (soi + son manager direct)
- **Response** `200` : objet User (sans `passwordHash`, `ldapDn`)
- **Errors** : `400` ID invalide · `403` accès refusé · `404` utilisateur introuvable

---

### POST /api/users
- **Auth** : admin, hr
- **Body** : `{ firstName: string, lastName: string, email: string, role?: string, department?: string, position?: string, managerId?: string }`
- **Response** `201` : User créé + `tempPassword` (affiché une seule fois)
- **Errors** : `400` champs requis manquants · `400` rôle invalide · `409` email déjà utilisé

---

### PATCH /api/users/:id
- **Auth** : admin, hr (tous les champs) · self (firstName, lastName, avatar, phone uniquement)
- **Body** : champs parmi `{ email, firstName, lastName, department, position, role, managerId, isActive, avatar, phone }`
- **Response** `200` : User mis à jour (sans `passwordHash`, `ldapDn`)
- **Errors** : `400` ID invalide · `403` champs protégés (non-admin) · `404` introuvable

---

### PATCH /api/users/:id/avatar
- **Auth** : self · admin, hr
- **Body** : `{ avatarUrl: string | null }` (URL HTTPS, max 500 chars — `null` supprime)
- **Response** `200` : `{ _id, avatar }`
- **Errors** : `400` URL invalide · `403` accès refusé · `404` introuvable

---

### GET /api/users/:id/offboard-preview
- **Auth** : admin, hr
- **Response** `200` : `{ user, pendingEvaluations: number, activeCampaigns: string[] }`
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

### PATCH /api/users/:id/offboard
- **Auth** : admin, hr
- **Body** : `{ reason: string, effectiveDate: string (ISO) }`
- **Response** `200` : User mis à jour (offboardingStatus, offboardingReason, offboardingDate)
- **Errors** : `400` reason/effectiveDate requis · `403` accès refusé · `404` introuvable

---

### PATCH /api/users/:id/onboarding/complete
- **Auth** : self · admin, hr
- **Body** : aucun
- **Response** `200` : User avec `onboarding.completed=true`, `onboarding.completedAt`
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

### PATCH /api/users/:id/onboarding/:stepIndex
- **Auth** : self · admin, hr
- **Body** : `{ done?: boolean }` (défaut `true`)
- **Response** `200` : User mis à jour (step coché/décoché)
- **Errors** : `400` ID/stepIndex invalide · `400` stepIndex hors limites · `403` accès refusé · `404` introuvable

---

### GET /api/users/:id/gdpr-export
- **Auth** : self · admin, hr
- **Response** `200` : `Content-Disposition: attachment; filename="gdpr-export-{id}.json"` — `{ user, evaluations, exportedAt }`
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

### DELETE /api/users/:id/gdpr-anonymize
- **Auth** : admin uniquement
- **Response** `204` : aucun corps
- **Errors** : `400` ID invalide · `403` non admin · `404` introuvable · `409` évaluations actives en cours

---

### DELETE /api/users/:id
- **Auth** : admin uniquement
- **Response** `204` : aucun corps (soft delete — `isActive = false`)
- **Errors** : `400` ID invalide · `403` non admin · `403` impossible de se supprimer soi-même · `404` introuvable

---

## 3. Users Import (`/api/users/import`)

### POST /api/users/import
- **Auth** : admin, hr
- **Query** : `?dryRun=true|false`
- **Body** : JSON `application/json` (tableau d'objets) OU CSV `text/csv` / `text/plain`
- **Colonnes CSV / champs JSON** : `firstName, lastName, email, role, department, managerEmail, sector`
- **Response** `200` :
  ```json
  {
    "created": 5, "updated": 3, "skipped": 1,
    "errors": [{ "row": 2, "field": "email", "message": "Email invalide" }],
    "warnings": [{ "row": 4, "field": "managerEmail", "message": "Manager introuvable" }],
    "preview": []
  }
  ```
  Si `dryRun=true` : `preview[]` rempli, aucune écriture DB.
- **Errors** : `400` body vide ou invalide · `400` aucune donnée

---

## 4. Campaigns (`/api/campaigns`)

### GET /api/campaigns
- **Auth** : Tous les rôles
- **Query** : `?status=draft|active|closed|archived&page=1&limit=50`
- **Scope** : employee → actives uniquement · manager/director → toutes · admin/hr → toutes
- **Response** `200` : `{ data: Campaign[], total, page, limit }` (createdBy populé)
- **Errors** : aucune

---

### GET /api/campaigns/:id
- **Auth** : Tous les rôles
- **Response** `200` : Campaign + `stats: { total, started, submitted, validated }`
- **Errors** : `400` ID invalide · `404` introuvable

---

### POST /api/campaigns
- **Auth** : admin, hr
- **Body** : `{ name: string, startDate: ISO, endDate: ISO, description?: string, targetDepartments?: string[], extendedVisibility?: string[], deadlineEmployee?: ISO, deadlineManager?: ISO, status?: 'draft'|'active', targetScope?: object, objectivesFormId?: string }`
- **Response** `201` : Campaign créée (createdBy populé)
- **Errors** : `400` name/startDate/endDate requis · `400` endDate < startDate · `400` statut initial invalide · `403` accès refusé

---

### PATCH /api/campaigns/:id
- **Auth** : admin, hr
- **Body** : champs parmi `{ name, description, status, startDate, endDate, targetDepartments, extendedVisibility, deadlineEmployee, deadlineManager, previousCampaignId, enableN1Context, n1VisibleToEmployee, targetScope, objectivesFormId }`
- **Response** `200` : Campaign mise à jour
- **Errors** : `400` ID/transition invalide · `403` accès refusé · `404` introuvable

---

### DELETE /api/campaigns/:id
- **Auth** : admin, hr
- **Response** `204` : aucun corps (supprime aussi les évaluations et formulaires liés)
- **Errors** : `400` ID invalide · `400` campagne active (clôturer d'abord) · `400` statut non supprimable · `403` accès refusé · `404` introuvable

---

### POST /api/campaigns/:id/clone
- **Auth** : admin, hr
- **Body** : `{ name?: string, startDate?: ISO, endDate?: ISO }` (optionnel — dates décalées +1 an par défaut)
- **Response** `201` : `{ id: string, formsCloned: number }`
- **Errors** : `400` ID invalide · `400` endDate < startDate · `403` accès refusé · `404` introuvable

---

### GET /api/campaigns/:id/analytics
> ⚠️ **Déprécié** — L'endpoint canonique est désormais `GET /api/analytics/campaigns/:id` (mêmes données, accès étendu aux managers et directeurs). Cet endpoint reste disponible pour compatibilité.
- **Auth** : admin, hr
- **Response** `200` :
  ```json
  {
    "campaignId", "campaignName",
    "totalEvaluations", "completedEvaluations", "completionPct",
    "avgScore",
    "statusDistribution": { "assigned": 5, "submitted": 3, ... },
    "scoreDistribution": [{ "from": 70, "to": 79, "count": 4 }, ...],
    "byDepartment": [{ "department": "R&D", "total": 10, "completed": 8, "completionPct": 80, "avgScore": 75 }]
  }
  ```
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

## 5. Evaluations (`/api/evaluations`)

### GET /api/evaluations
- **Auth** : Tous les rôles (scopé automatiquement)
- **Query** : `?campaignId=&status=&evaluateeId=&page=1&limit=50`
- **Scope** : employee → ses propres · manager/director → ses subordonnés · admin/hr → tout
- **Response** `200` : `{ data: Evaluation[], total, page, limit }` (formId, evaluatorId, evaluateeId, campaignId populés)
- **Errors** : `400` campaignId/evaluateeId/status invalide

---

### GET /api/evaluations/history
- **Auth** : Tous les rôles
- **Response** `200` : `Evaluation[]` statuts terminés, max 200 (populé — tri updatedAt desc)
- **Errors** : aucune

---

### GET /api/evaluations/export
- **Auth** : admin, hr
- **Query** : `?campaignId=&status=&dept=`
- **Response** `200` : `Content-Type: text/csv` — colonnes : Évalué, Manager, Campagne, Statut, Score, Département, Date
- **Errors** : `400` campaignId/status invalide · `403` accès refusé

---

### POST /api/evaluations
- **Auth** : admin, hr
- **Body** : `{ campaignId: string, formId: string, evaluatorId: string, evaluateeId: string }`
- **Response** `201` : `{ id: string }` — gèle le formulaire si pas encore gelé
- **Errors** : `400` champs requis manquants · `400` IDs invalides · `403` accès refusé · `409` évaluation déjà existante

---

### POST /api/evaluations/bulk
- **Auth** : admin, hr
- **Body** : `{ evaluations: Array<{ campaignId, formId, evaluatorId, evaluateeId }> }` (max 500)
- **Response** `201` : `{ created: number }`
- **Response** `207` (partiel) : `{ created, skipped, message }`
- **Errors** : `400` tableau vide · `400` > 500 · `400` champ requis manquant · `403` accès refusé

---

### PATCH /api/evaluations/bulk
- **Auth** : admin, hr
- **Body** : `{ ids: string[], action: 'archive'|'sign_hr'|'assign_reviewer', reviewerId?: string }`
- **Response** `200` : `{ success, skipped, errors }`
- **Errors** : `400` ids vide · `400` > 200 · `400` action invalide · `400` reviewerId manquant pour assign_reviewer · `403` accès refusé

---

### GET /api/evaluations/:id
- **Auth** : Tous les rôles (RBAC + anonymisation)
- **Response** `200` : Evaluation complète (formId avec questions, evaluatorId/evaluateeId/campaignId populés) — `evaluatorId` masqué si `isAnonymous`
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

### PATCH /api/evaluations/:id
- **Auth** : Tous les rôles (selon le champ)
- **Body** (selon rôle) :
  - `answers: Array<{ questionId, value }>` — tous les rôles (avant `submitted`)
  - `status: string` — transition selon matrice rôle/statut (voir tableau ci-dessous)
  - `reviewerScore: number` (0–100) — manager/director/admin/hr
  - `reviewerComment: string` — manager/director/admin/hr
  - `nextYearObjectives: string` — manager/director/admin/hr
  - `objectiveRatings: object` — manager/director/admin/hr
  - `evaluateeComment: string` — évalué/admin/hr
  - `disagreementFlag: boolean` — évalué/admin/hr
- **Transitions par rôle** :
  | Rôle | Depuis → Vers |
  |---|---|
  | employee | `assigned→in_progress`, `in_progress→submitted`, `reviewed→signed_evaluatee` |
  | manager/director | `submitted→reviewed`, `signed_evaluatee→signed_manager` |
  | hr | `reviewed→signed_hr`, `signed_evaluatee→signed_hr`, `signed_manager→signed_hr`, **`signed_hr→validated`** |
  | admin | toutes les transitions valides (`VALID_TRANSITIONS`) |
- **Timestamps automatiques** : lors d'une transition vers `signed_evaluatee`, `signed_manager` ou `signed_hr`, les champs `signedByEvaluateeAt`, `signedByManagerAt`, `signedByHrAt` sont settés automatiquement.
- **Response** `200` : Evaluation complète populée
- **Errors** : `400` ID/answers invalides · `400` transition non autorisée · `403` accès refusé (mauvais rôle/évaluateur) · `404` introuvable · `409` réponses verrouillées après submitted

---

### PATCH /api/evaluations/:id/reassign
- **Auth** : admin, hr
- **Body** : `{ newEvaluatorId: string, reason?: string }`
- **Response** `200` : `{ id, evaluatorId, evaluatorName }`
- **Errors** : `400` ID/newEvaluatorId invalide · `400` évaluateur inactif · `400` rôle invalide (manager/director requis) · `403` accès refusé · `404` introuvable · `409` statut terminal (signed_hr/validated)

---

### POST /api/evaluations/:id/expire
- **Auth** : admin, hr
- **Body** : aucun
- **Response** `200` : `{ id, status: 'expired' }`
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable · `409` déjà validé ou expiré

---

### GET /api/evaluations/:id/pdf
- **Auth** : Tous les rôles (RBAC)
- **Response** `200` : `Content-Type: application/pdf` — PDF de l'évaluation
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

### GET /api/evaluations/:id/n1-context
- **Auth** : Tous les rôles (RBAC + `n1VisibleToEmployee`)
- **Response** `200` :
  ```json
  {
    "n1Campaign": { "id", "name", "startDate", "endDate" },
    "reviewerScore", "reviewerComment", "nextYearObjectives", "objectiveRatings",
    "status", "objectivesAnswers": [{ "questionId", "questionLabel", "questionType", "value" }],
    "formTitle", "formType",
    "evaluateeComment", "disagreementFlag"
  }
  ```
- **Response** `204` : pas de contexte N-1 (feature désactivée ou aucune éval précédente)
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

## 6. Forms (`/api/forms`)

### GET /api/forms
- **Auth** : Tous les rôles
- **Query** : `?campaignId=&formType=&search=<string>&page=1&limit=50`
  - `search` : regex insensible à la casse sur `title` (ex. `?search=annuel` → formulaires dont le titre contient "annuel")
- **Response** `200` : `{ data: Form[], total, page, limit }` (createdBy populé)
- **Errors** : `400` campaignId/formType invalide

---

### GET /api/forms/:id
- **Auth** : Tous les rôles
- **Response** `200` : Form complet (questions incluses, createdBy populé)
- **Errors** : `400` ID invalide · `404` introuvable

---

### POST /api/forms
- **Auth** : admin, hr
- **Body** : `{ title: string, formType: string, description?: string, isAnonymous?: boolean, questions?: Question[], campaignId?: string }`
- **Response** `201` : Form créé (createdBy populé) — `isAnonymous` forcé `true` si `formType=upward_feedback`
- **Errors** : `400` title/formType requis · `400` campaignId invalide · `400` questions non tableau · `400` validation Mongoose · `403` accès refusé

---

### PATCH /api/forms/:id
- **Auth** : admin, hr
- **Body** : `{ title?: string, description?: string, questions?: Question[] }`
- **Response** `200` : `{ id }`
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable · `409` questions gelées (`frozenAt` présent)

---

### DELETE /api/forms/:id
- **Auth** : admin, hr
- **Response** `204` : aucun corps
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable · `409` form gelé (évaluations existantes)

---

### POST /api/forms/:id/freeze
- **Auth** : admin seulement
- **Body** : aucun
- **Response** `200` : `{ success: true, form: Form }` — `isFrozen` passé à `true`, `frozenAt` défini
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

### POST /api/forms/:id/unfreeze
- **Auth** : admin seulement
- **Body** : aucun
- **Response** `200` : `{ success: true, form: Form }` — `isFrozen` passé à `false`, `frozenAt` remis à `null`
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

### POST /api/forms/:id/clone
- **Auth** : admin, hr
- **Body** : aucun
- **Response** `201` : `{ form: Form }` — copie avec `title: "Copie de [titre original]"`, `isFrozen: false`, `frozenAt: null`, sans `_id` original
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable · `400` validation Mongoose

---

## 7. Forms Import/Export (`/api/forms/import`, `/api/forms/template`, `/api/forms/:id/export`)

### POST /api/forms/import
- **Auth** : admin, hr
- **Body** : objet JSON `{ title, formType, description?, isAnonymous?, questions: [{ id, type, label, ... }] }`
- **Response** `201` : `{ imported: 1, skipped: 0, errors: [], form: Form }` — Form créé (`frozenAt=null`)
- **Errors** : `400` body invalide · `400` title manquant/trop court · `400` formType invalide · `400` questions manquantes ou types inconnus · `403` accès refusé

---

### GET /api/forms/template
- **Auth** : admin, hr
- **Response** `200` : `Content-Disposition: attachment; filename="form-template.json"` — template JSON vide avec exemples de questions (text, rating, yes_no, choice, scale, objective_item, weather, mobility)
- **Errors** : `403` accès refusé

---

### GET /api/forms/:id/export
- **Auth** : admin, hr
- **Response** `200` : `Content-Disposition: attachment; filename="form-{slug}.json"` — Form exporté sans `_id`, `createdBy`, `frozenAt`, `campaignId`
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

## 8. Org (`/api/org`)

### GET /api/org/tree
- **Auth** : admin, hr (vue complète) · manager (vue scopée — soi-même + directs) · director (vue scopée — soi-même + directs + directs de leurs directs)
- **Query** : `?view=all|teams|sector`
- **Scoping** :
  - `admin` / `hr` : tous les utilisateurs actifs
  - `director` : sous-arbre à 2 niveaux (soi + N1 + N2)
  - `manager` : sous-arbre à 1 niveau (soi + directs uniquement)
  - Autres rôles : `403 Accès interdit`
- **Response** `200` (view=all) : arbre récursif `[{ _id, firstName, lastName, role, department, sectorId, managerId, avatar, children: [...] }]`
- **Response** `200` (view=teams) : `[{ manager, directReports, subManagers }]`
- **Response** `200` (view=sector) : `[{ sector, users }]` + `{ sector: null, users }` pour non-assignés
- **Errors** : `400` view invalide · `403` rôle non autorisé

---

### PATCH /api/org/users/:id
- **Auth** : admin, hr
- **Body** : `{ managerId?: string|null, sectorId?: string|null, role?: string }`
- **Response** `200` : User mis à jour (sans passwordHash, ldapDn)
- **Errors** : `400` ID invalide · `400` managerId/sectorId/role invalide · `400` manager introuvable · `400` secteur introuvable · `404` utilisateur introuvable · `400` cycle hiérarchique détecté (pre-save hook)

---

### GET /api/org/sectors
- **Auth** : admin, hr
- **Response** `200` : `Sector[]` actifs triés par nom (createdBy populé)
- **Errors** : aucune

---

### POST /api/org/sectors
- **Auth** : admin, hr
- **Body** : `{ name: string (2–100 chars), description?: string, color?: string (hex) }`
- **Response** `201` : Sector créé
- **Errors** : `400` name requis/invalide · `409` nom déjà utilisé

---

### PATCH /api/org/sectors/:id
- **Auth** : admin, hr
- **Body** : `{ name?: string, description?: string, color?: string, isActive?: boolean }`
- **Response** `200` : Sector mis à jour (createdBy populé)
- **Errors** : `400` ID invalide · `404` introuvable · `409` nom déjà utilisé

---

### PATCH /api/org/sectors/:id/assign-users
- **Auth** : admin, hr
- **Body** : `{ userIds: string[] }` (tableau d'ObjectIds)
- **Response** `200` : `{ updated: number }`
- **Errors** : `400` ID invalide · `400` userIds tableau non vide requis · `404` secteur introuvable

---

### DELETE /api/org/sectors/:id
- **Auth** : admin, hr
- **Response** `204` : aucun corps
- **Errors** : `400` ID invalide · `404` introuvable · `409` secteur utilisé par N utilisateur(s)

---

## 9. HR Notifications (`/api/hr/notifications`)

### POST /api/hr/notifications/bulk-remind
- **Auth** : admin, hr
- **Body** :
  ```json
  {
    "campaignId": "string",
    "targetStatuses": ["assigned", "in_progress"],
    "targetRoles": ["employee", "manager"],
    "message": "string (optionnel)"
  }
  ```
- **Response** `200` : `{ sent: number, skipped: number, campaignId: string }`
- **Errors** : `400` campaignId requis · `404` campagne introuvable · `404` campagne non active

---

## 10. HR Flags (`/api/hr/flags`)

### GET /api/hr/flags
- **Auth** : admin, hr
- **Query params** :
  | Param        | Type       | Description                                                  |
  |-------------|------------|--------------------------------------------------------------|
  | `type`       | string     | Filtre par `formType` (doit être dans `REQUEST_FORM_TYPES`)  |
  | `status`     | string     | Filtre par statut évaluation : `assigned\|in_progress\|submitted\|reviewed\|validated\|rejected` |
  | `from`       | ISO date   | `createdAt >= from`                                          |
  | `to`         | ISO date   | `createdAt <= to`                                            |
  | `department` | string     | Department de l'évaluataire (filtre DB via User)             |
  | `sectorId`   | ObjectId   | sectorId de l'évaluataire (filtre DB via User)               |
  | `page`       | number     | Numéro de page (défaut : 1)                                  |
  | `limit`      | number     | Résultats par page (défaut : 20, max : 100)                  |
- **Response** `200` : `{ data: Evaluation[], total: number, page: number, limit: number, totalPages: number }` (evaluateeId et formId populés)
- **Errors** : aucune

---

### PATCH /api/hr/flags/:evalId/status
- **Auth** : admin, hr
- **Body** : `{ status: 'submitted'|'reviewed'|'validated'|'rejected', note?: string }`
- **Transitions de statut** : `submitted → reviewed → validated` (traité) ou `submitted|reviewed → rejected` (refusé). Les statuts `assigned` et `in_progress` sont en lecture seule via ce endpoint.
- **Effets** : `validated`/`reviewed` → notification `request_treated` ; `rejected` → notification `request_rejected` (avec `note` comme motif si présent)
- **Response** `200` : Evaluation mise à jour (avec auditLog si note présente)
- **Errors** : `400` ID invalide · `400` status invalide · `404` évaluation introuvable

---

## 11. Admin (`/api/admin`)

### POST /api/admin/email/test
- **Auth** : admin
- **Body** : `{ to: string (email valide) }`
- **Response** `200` : `{ sent: true, previewUrl: string|null }` (`previewUrl` = URL Ethereal en dev)
- **Errors** : `400` adresse invalide

---

### GET /api/admin/config
- **Auth** : admin
- **Response** `200` : `Config[]` triés par clé (tous les paramètres système)
- **Errors** : aucune

---

### PUT /api/admin/config/batch
- **Auth** : admin
- **Body** : `{ configs: Array<{ key: string, value: any }> }` (max 50)
- **Response** `200` : `{ updated: number, results: Config[] }`
- **Errors** : `400` configs non tableau/vide · `400` > 50 clés · `400` clés avec caractères invalides

---

### GET /api/admin/config/:key
- **Auth** : admin
- **Response** `200` : `{ key, value, _id, ... }`
- **Errors** : `404` clé introuvable

---

### PUT /api/admin/config/:key
- **Auth** : admin
- **Body** : `{ value: any }`
- **Response** `200` : Config créée ou remplacée (upsert)
- **Errors** : `400` value manquant

---

### PATCH /api/admin/config/:key
- **Auth** : admin
- **Body** : `{ value: any }`
- **Response** `200` : Config mise à jour
- **Errors** : `400` value manquant · `404` clé introuvable

---

### DELETE /api/admin/config/:key
- **Auth** : admin
- **Response** `204` : aucun corps
- **Errors** : `404` clé introuvable

---

## 12. Admin Mail Templates (`/api/admin/mail-templates`)

### GET /api/admin/mail-templates
- **Auth** : admin, hr
- **Response** `200` : `MailTemplate[]` triés par slug
- **Errors** : aucune

---

### PATCH /api/admin/mail-templates/:slug
- **Auth** : admin uniquement (hr peut lister mais pas modifier)
- **Body** : `{ subject?: string, bodyText?: string, bodyHtml?: string, reset?: boolean }`
  - Si `reset: true` → remet les valeurs hardcodées du `notificationService`
- **Response** `200` : MailTemplate mis à jour
- **Errors** : `403` non admin · `404` slug introuvable (ou pas de template hardcodé pour reset)

---

## 13. Audit (`/api/admin/audit`)

### GET /api/admin/audit
- **Auth** : admin, hr
- **Query** : `?page=1&limit=20&action=&targetType=&userId=&from=ISO&to=ISO`
- **Valeurs `action`** : `status_change, evaluation_update, campaign_create, campaign_activate, campaign_update, campaign_delete, bulk_action, offboard, offboarding_create, offboarding_update, offboarding_delete, gdpr_anonymize, reassigned, login, login_failed`
- **Valeurs `targetType`** : `Evaluation, Campaign, User, Form, OffboardingRequest`
- **Response** `200` : `{ data: AuditLog[], total, page, limit }` (userId populé avec firstName, lastName, role)
- **Errors** : `400` action/targetType invalide

---

### GET /api/admin/audit/export
- **Auth** : admin, hr
- **Query** : `?action=&targetType=&userId=&from=ISO&to=ISO`
- **Response** `200` : `Content-Type: text/csv; charset=utf-8` — BOM Excel, colonnes : Date;Utilisateur;Email;Action;Type cible;ID cible;Détails (max 5000 lignes)
- **Errors** : `400` filtres invalides ⚠️ *non implémenté — les filtres invalides sont silencieusement ignorés (contrairement à `GET /api/admin/audit` qui valide contre whitelist). À corriger backend.*

---

## 14. Events (`/api/events`)

### GET /api/events
- **Auth** : Tous les rôles
- **Query** : `?page=1&limit=50`
- **Scope** : admin/hr → tout · autres → `targetRoles` vide OU contient leur rôle
- **Response** `200` : `{ data: Event[], total, page, limit }`
- **Errors** : aucune

---

### GET /api/events/:id
- **Auth** : Tous les rôles (RBAC sur `targetRoles`)
- **Response** `200` : Event complet
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

### POST /api/events
- **Auth** : admin, hr
- **Body** : `{ title: string, date: ISO, type: string, description?: string, location?: string, endDate?: ISO, campaignId?: string, targetRoles?: Role[] }`
- **Response** `201` : Event créé
- **Errors** : `400` title/date/type requis · `400` targetRoles invalide · `403` accès refusé

---

### PATCH /api/events/:id
- **Auth** : admin, hr
- **Body** : `{ title?, date?, type?, targetRoles?, description? }`
- **Response** `200` : Event mis à jour
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

### DELETE /api/events/:id
- **Auth** : admin, hr
- **Response** `204` : aucun corps
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

## 15. Offboarding (`/api/offboarding`)

### POST /api/offboarding
- **Auth** : admin, hr
- **Body** : `{ userId: string, reason: 'resignation'|'termination'|'retirement'|'other', lastDay: ISO, notes?: string }`
- **Response** `201` : OffboardingRequest créée
- **Errors** : `400` userId/reason/lastDay requis · `400` reason invalide · `400` userId invalide · `403` accès refusé · `404` utilisateur introuvable · `409` demande déjà existante

---

### GET /api/offboarding
- **Auth** : admin, hr
- **Query** : `?status=pending|in_progress|completed&page=1&limit=50`
- **Response** `200` : `{ data: OffboardingRequest[], total, page, limit }` (userId et requestedBy populés)
- **Errors** : `403` accès refusé

---

### GET /api/offboarding/:id
- **Auth** : admin, hr
- **Response** `200** : OffboardingRequest (userId et requestedBy populés)
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

### PATCH /api/offboarding/:id
- **Auth** : admin, hr
- **Body** : `{ status?: 'pending'|'in_progress'|'completed', notes?: string }`
  - `completed` → `user.isActive=false`, `user.archivedAt=now`, `user.offboardingStatus='offboarded'`
- **Response** `200** : OffboardingRequest peuplée (après mise à jour)
- **Errors** : `400` ID invalide · `400` status invalide · `403` accès refusé · `404` introuvable

---

### PATCH /api/offboarding/:id/checklist/:itemIndex
- **Auth** : admin, hr
- **Body** : `{ done?: boolean }` (défaut `true`)
- **Response** `200` : OffboardingRequest mise à jour — passage auto en `in_progress` au 1er item coché
- **Errors** : `400` ID/itemIndex invalide · `400` itemIndex hors limites · `403` accès refusé · `404` introuvable

---

### DELETE /api/offboarding/:id
- **Auth** : admin uniquement
- **Response** `204` : aucun corps
- **Errors** : `400` ID invalide · `403` non admin · `404` introuvable

---

## 16. Health

### GET /api/health
- **Auth** : Public
- **Response** `200` : `{ status: 'ok', timestamp: ISO }`
- **Response** `503` : `{ status: 'error', reason: 'database unreachable' }`

---

## Résumé

| Module | Endpoints |
|---|---|
| Auth | 7 |
| Users | 11 |
| Users Import | 1 |
| Campaigns | 7 |
| Evaluations | 12 |
| Forms | 8 |
| Forms Import/Export | 3 |
| Org | 6 |
| HR Notifications | 1 |
| Notifications | 5 |
| HR Flags | 2 |
| Admin | 7 |
| Admin Mail Templates | 2 |
| Audit | 2 |
| Events | 5 |
| Offboarding | 6 |
| Health | 1 |
| **Total** | **83 endpoints** |

---

*Fin du document — NX-RH API Contract v2.0 · 80 endpoints · 17 modules*

---

## 17. Notifications (`/api/notifications`)

### GET /api/notifications
- **Auth** : Tous les rôles (scopé par `userId`)
- **Query params** :
  | Param | Type | Description |
  |---|---|---|
  | `unreadOnly` | boolean | Si `true`, retourne uniquement les notifications non lues |
  | `page` | number | Numéro de page (défaut : 1) |
  | `limit` | number | Résultats par page (défaut : 20, max : 100) |
- **Response** `200` : `{ data: Notification[], total, page, limit, unreadCount }`
- **Errors** : aucune

---

### PATCH /api/notifications/read-all
- **Auth** : Tous les rôles
- **Body** : aucun
- **Response** `200` : `{ modifiedCount: number }`
- **Errors** : aucune

---

### PATCH /api/notifications/:id/read
- **Auth** : Tous les rôles (scope : notification de l'utilisateur courant)
- **Body** : aucun
- **Response** `200` : `{ id, read: true }`
- **Errors** : `400` ID invalide · `403` notification appartenant à un autre user · `404` notification introuvable

---

### GET /api/notifications/count
- **Auth** : Tous les rôles
- **Response** `200` : `{ total: number, unreadCount: number }`
- **Errors** : aucune

---

### POST /api/notifications/global-remind
- **Auth** : admin, hr
- **Body** :
  ```json
  {
    "campaignId": "string (optionnel)",
    "message": "string (optionnel)"
  }
  ```
- **Response** `200` : `{ sent: number }`
- **Errors** : `403` rôle insuffisant

---

## Routes hors contrat (présentes dans le backend, non documentées)

> Ces routes ont été identifiées dans `audit/01-routes.md` (Agent 1) et confirmées par l'audit de parité (Agent 7).

### Admin LDAP (`/api/admin/ldap`) — 5 routes — auth: admin uniquement

| METHOD | Path | Description |
|---|---|---|
| POST | `/api/admin/ldap/test` | Tester la connexion LDAP |
| POST | `/api/admin/ldap/preview` | Prévisualiser la synchronisation (dry-run) |
| POST | `/api/admin/ldap/sync` | Lancer la synchronisation LDAP → MongoDB |
| GET | `/api/admin/ldap/config` | Lire la configuration LDAP (sans `bindPassword`) |
| PUT | `/api/admin/ldap/config` | Mettre à jour la configuration LDAP |

⚠️ *Aucune validation du body `config` dans les routes POST — risque si body malformé.*

---

### Resources (`/api/resources`) — 5 routes — auth: Tous (lecture scopée) / admin, hr (écriture)

| METHOD | Path | Rôles | Description |
|---|---|---|---|
| GET | `/api/resources` | Tous (scopé) | Liste des ressources documentaires |
| GET | `/api/resources/:id` | Tous (RBAC) | Détail d'une ressource |
| POST | `/api/resources` | admin, hr | Créer une ressource |
| PATCH | `/api/resources/:id` | admin, hr | Modifier une ressource |
| DELETE | `/api/resources/:id` | admin, hr | Supprimer une ressource |

---

### Analytics (`/api/analytics`) — 4 routes — auth: voir détail par route

| METHOD | Path | Rôles | Description |
|---|---|---|---|
| GET | `/api/analytics/summary` | admin, hr, director | Stats globales toutes campagnes |
| GET | `/api/analytics/campaigns/:id` | admin, hr, director, manager | Stats par campagne |
| GET | `/api/analytics/export/csv` | admin, hr | Export CSV des évaluations |
| GET | `/api/analytics/export/pdf` | admin, hr | Export PDF analytique global |

---

### GET /api/analytics/summary
- **Auth** : admin, hr, director
- **Response** `200` :
  ```json
  {
    "totalCampaigns": 10,
    "activeCampaigns": 3,
    "totalEvaluations": 250,
    "completionRate": 72,
    "avgScore": 78,
    "byStatus": { "assigned": 20, "in_progress": 15, "validated": 180, "..." : "..." }
  }
  ```
- **Errors** : `403` accès refusé

---

### GET /api/analytics/campaigns/:id
- **Auth** : admin, hr, director, manager
- **Note** : Remplace l'ancien endpoint campaign-scoped `GET /api/campaigns/:id/analytics` (toujours disponible pour compatibilité)
- **Response** `200` :
  ```json
  {
    "campaign": { "id": "...", "name": "Campagne 2024", "status": "active" },
    "totalEvaluations": 40,
    "completionRate": 65,
    "byStatus": { "assigned": 5, "validated": 26, "..." : "..." },
    "avgScore": 74,
    "signaturesProgress": { "evaluatee": 80, "manager": 60, "hr": 40 }
  }
  ```
- **Errors** : `400` ID invalide · `403` accès refusé · `404` introuvable

---

### GET /api/analytics/export/csv
- **Auth** : admin, hr
- **Query** : `?campaignId=xxx` (optionnel — filtre par campagne)
- **Response** `200` : fichier CSV
  - `Content-Type: text/csv`
  - `Content-Disposition: attachment; filename="analytics-export-YYYY-MM-DD.csv"`
  - **Colonnes** : `evaluateeId, evaluateeName, managerId, managerName, campaignId, campaignName, status, reviewerScore, signedByEvaluateeAt, signedByManagerAt, signedByHrAt, createdAt`
- **Errors** : `400` campaignId invalide · `403` accès refusé

---

### GET /api/analytics/export/pdf
- **Auth** : admin, hr
- **Query** : `?campaignId=xxx` (optionnel — filtre par campagne)
- **Response** `200` : fichier PDF
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="analytics-rh-YYYY-MM-DD.pdf"`
- **Errors** : `400` campaignId invalide · `403` accès refusé

---

## Routes absentes du contrat ET du backend (⚠️ NOT IMPLEMENTED)

> Ces routes sont attendues par les specs (`05-notifications.md`, `03-screens.md`) mais ni documentées ni implémentées.

### `GET /api/notifications` — ✅ IMPLEMENTED (voir § 17)

- **Auth** : Tous les rôles (scopé par `userId`)
- **Query attendue** : `?unreadOnly=true&page=1&limit=20`
- **Response** : `{ data: Notification[], total, page, limit, unreadCount }`

### `PATCH /api/notifications/:id/read` — ✅ IMPLEMENTED (voir § 17)

- **Auth** : Tous les rôles (scope : notification de l'utilisateur courant)
- **Body attendu** : aucun (ou `{ read: true }`)
- **Response** : `{ id, read: true }`

### `GET /api/dashboard` — ⚠️ NOT IMPLEMENTED

- **Auth** : Tous les rôles
- **Response attendue** : agrégats pour la page d'accueil (compteurs évaluations en cours, campagnes actives, événements à venir)
- **Note** : `/dashboard` dans le serveur est un redirect 301 SPA — pas un endpoint API.

---

## Module Dashboard

### GET /api/dashboard

- **Auth** : Authentifié (tous rôles : `employee`, `manager`, `director`, `hr`, `admin`)
- **Rate limit** : `apiLimiter` (2 000 req/min)
- **Response** `200` : `{ role, ...kpis }` — les champs KPI varient selon le rôle (voir ci-dessous)
- **Errors** : `401` non authentifié · `500` erreur serveur

#### Réponse par rôle

**`employee`**
```json
{
  "role": "employee",
  "activeCampaigns": [{ "_id", "name", "startDate", "endDate" }],
  "myEvals": [{ "_id", "status", "campaignId": { "name", "endDate" }, "formId": { "title" } }],
  "myRequests": [{ "_id", "status", "formId": { "title", "formType" } }]
}
```

**`manager`**
```json
{
  "role": "manager",
  "activeCampaigns": [{ "_id", "name", "startDate", "endDate" }],
  "team": { "total": number, "submitted": number, "completionRate": number },
  "teamSize": number,
  "pendingRequests": [{ "_id", "status", "evaluateeId": { "firstName", "lastName" }, "formId": { "title", "formType" } }]
}
```

**`director`**
```json
{
  "role": "director",
  "activeCampaigns": [{ "_id", "name", "startDate", "endDate" }],
  "subtree": { "total": number, "submitted": number, "completionRate": number, "size": number },
  "pendingRequests": [{ "_id", "status", "evaluateeId": { "firstName", "lastName" }, "formId": { "formType" } }]
}
```
> Les évaluations couvrent le sous-arbre à 2 niveaux (directs + leurs directs).

**`hr` / `admin`**
```json
{
  "role": "hr",
  "activeCampaign": { "_id", "name", "status", "startDate", "endDate" } | null,
  "evalStats": {
    "total": number, "assigned": number, "in_progress": number,
    "submitted": number, "validated": number, "expired": number
  },
  "openRequests": [{ "_id", "status", "formId": { "formType" }, "evaluateeId": { "firstName", "lastName", "department" } }],
  "usersWithoutManager": number,
  "totalUsers": number
}
```
