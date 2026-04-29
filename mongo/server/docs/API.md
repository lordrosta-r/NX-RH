# API Reference — NanoXplore RH

> Version 1.0.0 · Backend Express + MongoDB  
> Spec complète : [`openapi.yaml`](./openapi.yaml)

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Authentification](#2-authentification)
3. [Conventions](#3-conventions)
4. [Routes par ressource](#4-routes-par-ressource)
   - [Health](#41-health)
   - [Auth](#42-auth)
   - [Users](#43-users)
   - [Campaigns](#44-campaigns)
   - [Forms](#45-forms)
   - [Evaluations](#46-evaluations)
   - [Analytics](#47-analytics)
   - [Events](#48-events)
   - [Resources](#49-resources)
   - [Offboarding](#410-offboarding)
   - [Admin](#411-admin)
   - [LDAP](#412-ldap)
   - [Audit](#413-audit)
5. [Machines d'état](#5-machines-détat)
6. [Exemples curl](#6-exemples-curl)

---

## 1. Vue d'ensemble

| Propriété | Valeur |
|-----------|--------|
| Base URL (dev) | `http://localhost:3000/api` |
| Base URL (prod) | `https://<domain>/api` |
| Format des données | JSON (application/json) |
| Authentification | Cookie httpOnly `token` (JWT HS256) |
| Pagination | `{ data[], total, page, limit }` |
| Erreurs | `{ "error": "message en français" }` |
| Encodage texte | UTF-8 |

Le serveur Express monte toutes les routes sous le préfixe `/api`. Un proxy Nginx (production) ou Vite (développement) redirige le trafic `/api/*` vers Express.

### CORS

- Origines autorisées : variable d'environnement `CLIENT_ORIGIN` (liste séparée par des virgules)
- Wildcard `*` interdit en production
- `credentials: true` — le cookie est transmis cross-origin

---

## 2. Authentification

### Mécanisme

1. L'utilisateur envoie `POST /api/auth/login` avec ses identifiants.
2. En cas de succès, le serveur émet un cookie **httpOnly** nommé **`token`** (JWT signé HS256).
3. Ce cookie est automatiquement inclus dans toutes les requêtes suivantes par le navigateur.
4. Le serveur valide le token à chaque requête protégée via le middleware `authGuard`.

### Durée de vie

| Paramètre `remember` | Durée |
|---------------------|-------|
| `false` (défaut) | 8 heures |
| `true` | 30 jours |

### Rôles

| Rôle | Alias | Description |
|------|-------|-------------|
| `admin` | — | Accès complet à toutes les ressources |
| `hr` | — | Accès RH : campagnes, évaluations, offboarding, audit |
| `manager` | — | Gestion de son équipe directe |
| `director` | legacy | Traité comme `manager` — en cours de suppression |
| `employee` | — | Accès à ses propres évaluations uniquement |

> **Note :** Le rôle `director` existe dans les constants mais n'a plus de portail dédié. Les comptes legacy `director` fonctionnent comme des managers.

### Rate limiting sur login

- **5** tentatives / 15 min **par email**
- **20** tentatives / 15 min **par IP**

---

## 3. Conventions

### Pagination

Tous les endpoints de liste retournent la même enveloppe :

```json
{
  "data": [...],
  "total": 142,
  "page": 1,
  "limit": 50
}
```

Paramètres de requête :

| Paramètre | Défaut | Max | Exception |
|-----------|--------|-----|-----------|
| `page` | 1 | — | — |
| `limit` | 50 | 100 | `/admin/audit` → défaut **20** |

Endpoints **non paginés** (réponse tableau direct) :
- `GET /evaluations/history` → tableau, max 200 éléments
- `GET /evaluations/export` → fichier CSV, max 5000 lignes
- `GET /evaluations/:id/pdf` → fichier PDF
- `GET /analytics/export/pdf` → fichier PDF

### Erreurs HTTP

| Code | Signification |
|------|--------------|
| `200` | OK |
| `201` | Ressource créée |
| `204` | Succès sans contenu (DELETE) |
| `207` | Multi-statut (bulk partiel) |
| `400` | Données invalides (validation, format, doublon logique) |
| `401` | Non authentifié (cookie absent, invalide ou expiré) |
| `403` | Accès refusé (rôle insuffisant ou hors scope) |
| `404` | Ressource introuvable |
| `409` | Conflit (doublon, statut incompatible, ressource gelée) |
| `429` | Trop de requêtes (rate limiting) |
| `500` | Erreur serveur interne |

Format de toutes les erreurs :
```json
{ "error": "Description de l'erreur en français" }
```

### ObjectId

Tous les paramètres `{id}` sont des ObjectId MongoDB (24 caractères hexadécimaux). Un ObjectId invalide retourne `400`.

### Champs jamais retournés

- `User.passwordHash` — `select: false` dans le schéma Mongoose
- `User.ldapDn` — `select: false` dans le schéma Mongoose
- `LdapConfig.bindPassword` — exclu explicitement de `GET /admin/ldap/config`

---

## 4. Routes par ressource

### 4.1 Health

| Méthode | Chemin | Rôles | Description |
|---------|--------|-------|-------------|
| `GET` | `/health` | public | Vérification du serveur et de MongoDB |

**Réponse 200 :**
```json
{ "status": "ok", "timestamp": "2024-01-15T10:30:00.000Z" }
```

**Réponse 503 :**
```json
{ "status": "error", "reason": "MongoDB disconnected" }
```

---

### 4.2 Auth

| Méthode | Chemin | Rôles | Description |
|---------|--------|-------|-------------|
| `POST` | `/auth/login` | public | Connexion — émet le cookie `token` |
| `POST` | `/auth/logout` | public | Déconnexion — efface le cookie |
| `GET` | `/auth/me` | tous | Profil de l'utilisateur courant |
| `PATCH` | `/auth/preferences` | tous | Locale, thème et préférences de notification |

**Corps de `/auth/login` :**
```json
{
  "email": "alice@nanoxplore.com",
  "password": "MotDePasse123!",
  "remember": false
}
```

**Réponse `/auth/me` :** objet `User` complet avec `id` (string, pas `_id`) et `notificationPrefs` filtrées par rôle.

**Corps de `/auth/preferences` :**
```json
{
  "locale": "fr",
  "theme": "dark",
  "notificationPrefs": {
    "evaluationAssigned": true,
    "deadlineReminder": false
  }
}
```

Clés `notificationPrefs` autorisées par rôle :
- `employee` : `evaluationAssigned`, `deadlineReminder`, `managerActionRequired`
- `manager` : `evaluationAssigned`, `deadlineReminder`, `evaluationSubmitted`
- `hr` : + `campaignLaunch`
- `admin` : + `campaignLaunch`, `systemAlerts`

---

### 4.3 Users

Middleware de montage : `authenticated` (tous les rôles connectés) + `mutationLimiter`

| Méthode | Chemin | Rôles | Description |
|---------|--------|-------|-------------|
| `GET` | `/users` | admin, hr, director, manager | Liste paginée avec filtres |
| `POST` | `/users` | admin, hr | Créer un utilisateur local |
| `GET` | `/users/:id` | scope par rôle | Détail d'un utilisateur |
| `PATCH` | `/users/:id` | scope par rôle | Modifier un utilisateur |
| `GET` | `/users/:id/offboard-preview` | admin, hr | Aperçu des impacts d'un départ |
| `PATCH` | `/users/:id/offboard` | admin, hr | Déclencher le processus de départ |
| `PATCH` | `/users/:id/onboarding/complete` | self, admin, hr | Terminer l'onboarding |
| `PATCH` | `/users/:id/onboarding/:stepIndex` | self, admin, hr | Cocher une étape d'onboarding |
| `GET` | `/users/:id/gdpr-export` | self, admin, hr | Export RGPD (attachment JSON) |
| `DELETE` | `/users/:id/gdpr-anonymize` | admin | Anonymisation irréversible |

**Scope de visibilité :**

| Rôle appelant | `GET /users` | `GET /users/:id` |
|---------------|-------------|-----------------|
| `admin` / `hr` / `director` | Tous | Tous |
| `manager` | Subordonnés directs (`managerId=soi`) | Soi + subordonnés |
| `employee` | 403 | Soi + manager direct |

**`POST /users` — réponse 201 :** l'objet `User` est retourné avec un champ supplémentaire `tempPassword` (en clair, une seule fois).

**`DELETE /users/:id/gdpr-anonymize` — 409** si l'utilisateur a des évaluations aux statuts `assigned`, `in_progress` ou `submitted`.

---

### 4.4 Campaigns

Middleware de montage : `authenticated` + `mutationLimiter`

| Méthode | Chemin | Rôles | Description |
|---------|--------|-------|-------------|
| `GET` | `/campaigns` | tous | Liste paginée (employees → forcé `status=active`) |
| `POST` | `/campaigns` | admin, hr | Créer une campagne |
| `GET` | `/campaigns/:id` | tous | Détail avec stats de complétion |
| `PATCH` | `/campaigns/:id` | admin, hr | Modifier / avancer le statut |
| `DELETE` | `/campaigns/:id` | admin, hr | Supprimer (draft ou archived seulement) |
| `POST` | `/campaigns/:id/clone` | admin, hr | Cloner une campagne |
| `GET` | `/campaigns/:id/analytics` | admin, hr | Agrégats de complétion et de scores |

**Transitions de statut :** `draft → active → closed → archived` (irréversible).

**`DELETE /campaigns/:id` :** supprime également les évaluations et formulaires liés.

**`POST /campaigns/:id/clone` — réponse 201 :**
```json
{ "id": "664f...", "formsCloned": 3 }
```

---

### 4.5 Forms

Middleware de montage : `authenticated` + `mutationLimiter`

| Méthode | Chemin | Rôles | Description |
|---------|--------|-------|-------------|
| `GET` | `/forms` | tous | Liste paginée, filtrable par `campaignId` et `formType` |
| `POST` | `/forms` | admin, hr | Créer un formulaire |
| `GET` | `/forms/:id` | tous | Détail d'un formulaire |
| `PATCH` | `/forms/:id` | admin, hr | Modifier (questions gelées si `frozenAt` défini) |
| `DELETE` | `/forms/:id` | admin, hr | Supprimer (bloqué si `frozenAt` défini) |

**Types de formulaire :** `self_evaluation`, `manager_evaluation`, `upward_feedback`, `director_evaluation`, `peer_review`

**Types de questions :** `rating`, `text`, `yes_no`, `choice`, `weather`, `mobility`, `n1_import`

**Gel du formulaire (`frozenAt`) :** automatiquement renseigné dès la première évaluation créée sur ce formulaire.
- `title` et `description` restent modifiables après gel
- `questions` → retourne `409` si tentative de modification
- `DELETE` → retourne `409`

**`formType=upward_feedback` :** force `isAnonymous=true` (non modifiable, hook pre-save).

---

### 4.6 Evaluations

Middleware de montage : `authenticated` + `mutationLimiter` (bulk routes ont un limiter supplémentaire)

| Méthode | Chemin | Rôles | Description |
|---------|--------|-------|-------------|
| `GET` | `/evaluations/history` | tous | Historique (tableau, max 200, **non paginé**) |
| `GET` | `/evaluations` | tous | Liste paginée (scope par rôle) |
| `POST` | `/evaluations` | admin, hr | Créer une évaluation individuelle |
| `GET` | `/evaluations/export` | admin, hr | Export CSV (non paginé, max 5000, attachment) |
| `POST` | `/evaluations/bulk` | admin, hr | Créer en masse (max 500) |
| `PATCH` | `/evaluations/bulk` | admin, hr | Actions en masse (max 200) |
| `GET` | `/evaluations/:id` | scope par rôle | Détail d'une évaluation |
| `PATCH` | `/evaluations/:id` | scope par rôle | Sauvegarder réponses / avancer statut |
| `PATCH` | `/evaluations/:id/reassign` | admin, hr | Réaffecter l'évaluateur |
| `POST` | `/evaluations/:id/expire` | admin, hr | Expirer manuellement |
| `GET` | `/evaluations/:id/pdf` | admin, hr, participants | Export PDF (attachment) |

**Transitions de statut par rôle :**

| Rôle | Transitions autorisées |
|------|----------------------|
| `employee` | `assigned→in_progress`, `in_progress→submitted`, `reviewed→signed_evaluatee` |
| `manager` / `director` | `submitted→reviewed`, `signed_evaluatee→signed_manager` |
| `hr` | `reviewed→signed_hr`, `signed_evaluatee→signed_hr`, `signed_manager→signed_hr` |
| `admin` | Toutes les transitions valides |

Statuts terminaux (réponses verrouillées) : `validated`, `expired`, `archived`

**Réponses anonymisées :** si `form.isAnonymous=true`, `evaluatorId` et `evaluatorName` sont `null` dans la réponse.

**`GET /evaluations/history` :** retourne un **tableau** (pas enveloppé) des évaluations aux statuts `submitted`, `reviewed`, `signed_*`, `validated` pour l'utilisateur courant.

**`PATCH /evaluations/bulk` — actions :**
- `archive` : avance le statut selon le rôle
- `sign_hr` : signature RH (depuis `reviewed`, `signed_evaluatee` ou `signed_manager`)
- `assign_reviewer` : réaffectation (requiert `reviewerId`, statuts `assigned` ou `in_progress`)

---

### 4.7 Analytics

Middleware de montage : `apiLimiter` + `authenticated`

| Méthode | Chemin | Rôles | Description |
|---------|--------|-------|-------------|
| `GET` | `/analytics/export/pdf` | admin, hr | Rapport PDF global ou par campagne |

Paramètre optionnel `?campaignId` pour filtrer le rapport.  
Nom du fichier : `analytics-rh-YYYY-MM-DD[-campaignId].pdf`

---

### 4.8 Events

Middleware de montage : `authenticated` + `mutationLimiter`

| Méthode | Chemin | Rôles | Description |
|---------|--------|-------|-------------|
| `GET` | `/events` | tous | Liste paginée (filtrée par `targetRoles`) |
| `POST` | `/events` | admin, hr | Créer un événement |
| `GET` | `/events/:id` | scope par `targetRoles` | Détail d'un événement |
| `PATCH` | `/events/:id` | admin, hr | Modifier (dont `targetRoles`) |
| `DELETE` | `/events/:id` | admin, hr | Supprimer |

**Visibilité :** les événements dont `targetRoles` est vide sont visibles par tous. À la création, `targetRoles` est forcé à tous les rôles (non modifiable via POST — utiliser PATCH après création).

> **Attention :** le schéma Mongoose `Event` n'a **pas** de champ `description`. Le champ est ignoré silencieusement par le mode strict de Mongoose.

---

### 4.9 Resources

Middleware de montage : `authenticated` + `mutationLimiter`

| Méthode | Chemin | Rôles | Description |
|---------|--------|-------|-------------|
| `GET` | `/resources` | scope par `visibleTo` | Liste paginée |
| `POST` | `/resources` | admin, hr | Créer une ressource documentaire |
| `GET` | `/resources/:id` | scope par `visibleTo` | Détail |
| `PATCH` | `/resources/:id` | admin, hr | Modifier (dont `status`, `visibleTo`) |
| `DELETE` | `/resources/:id` | admin, hr | Supprimer (ne supprime pas le fichier physique) |

**Types de fichier :** `pdf`, `xlsx`, `docx`, `pptx`

**Statuts :** `draft` (brouillon, admin/hr seulement) / `published` (visible selon `visibleTo`)

**`publishedAt` :** rempli automatiquement (hook pre-save) au premier passage vers `status=published`.

**Nom de fichier :** caractères autorisés `[a-zA-Z0-9_\-.]` — pas de `..` ni de chemin relatif.

---

### 4.10 Offboarding

Middleware de montage : `authenticated` + `mutationLimiter`  
Toutes les routes nécessitent le rôle `hr` ou `admin` **sauf** la route de checklist.

| Méthode | Chemin | Rôles | Description |
|---------|--------|-------|-------------|
| `GET` | `/offboarding` | hr, admin | Liste paginée, filtrable par `?status` |
| `POST` | `/offboarding` | hr, admin | Créer une demande (unique par utilisateur) |
| `GET` | `/offboarding/:id` | hr, admin | Détail d'une demande |
| `PATCH` | `/offboarding/:id` | hr, admin | Modifier statut / notes |
| `DELETE` | `/offboarding/:id` | admin | Supprimer une demande |
| `PATCH` | `/offboarding/:id/checklist/:itemIndex` | hr, admin | Cocher/décocher un item |

**Statuts :** `pending → in_progress → completed`

**Complétion (`status=completed`) :** met automatiquement `user.isActive=false` et `user.offboardingStatus=offboarded`.

**Checklist par défaut (5 items) :**
1. Révocation des accès systèmes
2. Récupération du matériel
3. Clôture des évaluations en cours
4. Solde de tout compte
5. Entretien de départ

Premier item coché → passage automatique `pending→in_progress`.

**`POST /offboarding` — 409** si une demande existe déjà pour cet utilisateur (index unique MongoDB).

---

### 4.11 Admin

Middleware de montage : `mutationLimiter` + `authGuard(['admin'])`

| Méthode | Chemin | Rôles | Description |
|---------|--------|-------|-------------|
| `POST` | `/admin/email/test` | admin | Envoyer un email de test |

**Réponse 200 :**
```json
{
  "sent": true,
  "previewUrl": "https://ethereal.email/message/xyz"
}
```
`previewUrl` est non-null uniquement en développement (Ethereal). En production, la valeur est `null`.

---

### 4.12 LDAP

Middleware de montage : `mutationLimiter` + `authGuard(['admin'])`

| Méthode | Chemin | Rôles | Description |
|---------|--------|-------|-------------|
| `POST` | `/admin/ldap/test` | admin | Tester la connexion LDAP |
| `POST` | `/admin/ldap/preview` | admin | Prévisualiser les utilisateurs (max 50) |
| `POST` | `/admin/ldap/sync` | admin | Synchroniser les utilisateurs |
| `GET` | `/admin/ldap/config` | admin | Récupérer la config sauvegardée |
| `PUT` | `/admin/ldap/config` | admin | Sauvegarder la config (upsert) |

**Sécurité :** `bindPassword` n'est **jamais** retourné par `GET /admin/ldap/config`. Pour les requêtes `test`, `preview` et `sync`, omettre `bindPassword` réutilise la valeur sauvegardée dans la collection `Config`.

**Corps de `/admin/ldap/test`, `/preview`, `/sync` :**
```json
{
  "config": {
    "url": "ldaps://ldap.example.com:636",
    "bindDn": "cn=admin,dc=example,dc=com",
    "baseDn": "ou=people,dc=example,dc=com",
    "userFilter": "(objectClass=inetOrgPerson)",
    "usernameAttribute": "sAMAccountName",
    "emailAttribute": "mail",
    "firstNameAttribute": "givenName",
    "lastNameAttribute": "sn"
  }
}
```

---

### 4.13 Audit

Middleware de montage : `apiLimiter` + `authGuard(['admin', 'hr'])`  
> Cette route est montée **avant** `/api/admin` pour éviter un conflit de chemin.

| Méthode | Chemin | Rôles | Description |
|---------|--------|-------|-------------|
| `GET` | `/admin/audit` | admin, hr | Piste d'audit paginée |

**Paramètres de requête :**

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | integer | 1 | Numéro de page |
| `limit` | integer | **20** | Taille de page (≠ 50, max 100) |
| `action` | string | — | Filtre par type d'action |
| `targetType` | string | — | `Evaluation`, `Campaign`, `User`, `Form`, `OffboardingRequest` |
| `userId` | ObjectId | — | Filtre par auteur |
| `from` | date-time | — | Date de début (`createdAt ≥ from`) |
| `to` | date-time | — | Date de fin (`createdAt ≤ to`) |

**Actions valides :** `status_change`, `evaluation_update`, `campaign_create`, `campaign_activate`, `campaign_update`, `campaign_delete`, `bulk_action`, `offboard`, `offboarding_create`, `offboarding_update`, `offboarding_delete`, `gdpr_anonymize`, `reassigned`, `login`, `login_failed`

---

## 5. Machines d'état

### Évaluation

```
assigned
  └─▶ in_progress  (employee)
        └─▶ submitted  (employee)
              └─▶ reviewed  (manager / director)
                    ├─▶ signed_evaluatee  (employee)
                    │     ├─▶ signed_manager  (manager / director)
                    │     │     └─▶ signed_hr  (hr — bypass possible depuis reviewed/signed_evaluatee)
                    │     └─▶ signed_hr  (hr — bypass)
                    └─▶ signed_hr  (hr — bypass depuis reviewed)

signed_hr ──▶ validated  (admin)

Tout statut non terminal ──▶ expired   (admin/hr — manuel ou scheduler)
Tout statut non terminal ──▶ archived  (admin/hr — bulk)
```

Statuts terminaux : `validated`, `expired`, `archived`  
Transitions autorisées par admin : toutes les transitions valides ci-dessus.

### Campagne

```
draft ──▶ active ──▶ closed ──▶ archived
```
Toutes les transitions sont irréversibles. `draft` et `archived` sont les seuls statuts supprimables.

### Offboarding

```
pending ──▶ in_progress ──▶ completed
```
`completed` → `user.isActive = false`, `user.offboardingStatus = offboarded`

---

## 6. Exemples curl

> Remplacer `localhost:3000` par l'URL de votre environnement. Les cookies sont gérés par `-c`/`-b`.

### Connexion

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nanoxplore.com","password":"MonMotDePasse","remember":false}'
```

### Profil courant

```bash
curl -b cookies.txt http://localhost:3000/api/auth/me
```

### Liste des utilisateurs (avec filtres)

```bash
curl -b cookies.txt \
  "http://localhost:3000/api/users?role=employee&department=Engineering&page=1&limit=25"
```

### Créer un utilisateur

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Alice",
    "lastName": "Dupont",
    "email": "alice.dupont@nanoxplore.com",
    "role": "employee",
    "department": "Engineering",
    "managerId": "664f1234567890abcdef0001"
  }'
```

### Créer une campagne

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Entretiens annuels 2025",
    "startDate": "2025-01-15T00:00:00Z",
    "endDate": "2025-03-31T23:59:59Z",
    "status": "draft",
    "targetDepartments": ["Engineering", "Product"]
  }'
```

### Avancer le statut d'une campagne

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/campaigns/664f... \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'
```

### Créer des évaluations en masse

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/evaluations/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "evaluations": [
      {
        "campaignId": "664f...",
        "formId": "664f...",
        "evaluatorId": "664f...",
        "evaluateeId": "664f..."
      }
    ]
  }'
```

### Soumettre une évaluation (employee)

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/evaluations/664f... \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {"questionId": "q1", "value": 4},
      {"questionId": "q2", "value": "Je suis satisfait de ma progression."}
    ],
    "status": "submitted"
  }'
```

### Export CSV des évaluations

```bash
curl -b cookies.txt \
  "http://localhost:3000/api/evaluations/export?campaignId=664f...&status=validated" \
  -o evaluations.csv
```

### Consulter la piste d'audit

```bash
curl -b cookies.txt \
  "http://localhost:3000/api/admin/audit?action=status_change&targetType=Evaluation&from=2025-01-01T00:00:00Z&limit=20"
```

### Créer une demande de départ

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/offboarding \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "664f...",
    "reason": "resignation",
    "lastDay": "2025-02-28",
    "notes": "Départ volontaire pour opportunité externe."
  }'
```

### Export RGPD d'un utilisateur

```bash
curl -b cookies.txt \
  "http://localhost:3000/api/users/664f.../gdpr-export" \
  -o export-rgpd-alice.json
```

### Déconnexion

```bash
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/logout
```
