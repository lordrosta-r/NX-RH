# NanoXplore RH — Référence API

> Base URL : `http://localhost:3000` (ou l'hôte configuré)
> Tous les endpoints (sauf `/api/auth/login` et `/api/auth/logout`) requièrent un cookie JWT httpOnly valide.

---

## Authentification

Le cookie `token` (httpOnly, sameSite=strict) est émis par `POST /api/auth/login` et consommé automatiquement par le navigateur. Le middleware `authGuard` accepte aussi un header `Authorization: Bearer <token>` pour les clients non-navigateurs.

---

## Format des réponses d'erreur

Toutes les erreurs retournent un objet JSON uniforme :

```json
{ "error": "Message d'erreur lisible" }
```

### Codes HTTP courants

| Code | Signification |
|---|---|
| `400` | Données invalides ou transition de statut non autorisée |
| `401` | Cookie absent, expiré ou invalide |
| `403` | Rôle insuffisant pour cette action |
| `404` | Ressource introuvable |
| `409` | Conflit — doublon détecté ou ressource gelée |

---

## Rôles

| Valeur | Description |
|---|---|
| `admin` | Accès total, gestion des utilisateurs et du système |
| `hr` | Pilotage des campagnes et formulaires |
| `director` | Vue consolidée de sa sous-arborescence managériale |
| `manager` | Gestion de son équipe directe |
| `employee` | Accès à ses propres évaluations uniquement |

---

## Endpoints

### Auth

#### `POST /api/auth/login`
Authentifie l'utilisateur et émet le cookie de session.

**Body**
```json
{ "email": "alice@example.com", "password": "secret" }
```

**Réponse 200**
```json
{
  "user": { "id": "...", "email": "...", "firstName": "Alice", "lastName": "Dupont", "role": "employee" }
}
```

> **Note sécurité :** Le JWT est transmis uniquement via cookie `httpOnly; Secure; SameSite=Strict`. Il n'apparaît jamais dans le corps de la réponse.

**Cookie émis :** `token` (httpOnly, secure en production, maxAge 8h)

---

#### `POST /api/auth/logout`
Supprime le cookie de session.

**Réponse 200**
```json
{ "message": "Déconnecté" }
```

---

#### `GET /api/auth/me`
Revalide la session et retourne l'utilisateur courant.

**Auth :** requise

**Réponse 200**
```json
{
  "id": "...",
  "email": "alice@example.com",
  "firstName": "Alice",
  "lastName": "Dupont",
  "role": "employee",
  "department": "Engineering",
  "position": "Software Engineer",
  "isActive": true
}
```

---

### Users

#### `GET /api/users`
Liste les utilisateurs selon le scope du rôle appelant.

**Auth :** requise — `admin`, `hr`, `director`, `manager`

| Rôle | Scope |
|---|---|
| `admin`, `hr`, `director` | Tous les utilisateurs actifs |
| `manager` | Ses subordonnés directs uniquement |

**Query params**

| Paramètre | Type | Description |
|---|---|---|
| `role` | string | Filtrer par rôle (`admin`, `hr`, `director`, `manager`, `employee`) |
| `department` | string | Filtrer par département |
| `search` | string | Recherche regex sur prénom, nom, email |

**Réponse 200** — `User[]`

---

#### `GET /api/users/:id`
Retourne un utilisateur par son ID.

**Auth :** requise

> Un manager ne peut accéder qu'à ses subordonnés directs ou à lui-même.

**Réponse 200** — `User`

---

#### `POST /api/users`
Crée un nouvel utilisateur.

**Auth :** `admin` ou `hr` uniquement

**Body**

| Champ | Requis | Description |
|---|---|---|
| `email` | ✅ | Adresse email unique |
| `firstName` | ✅ | Prénom |
| `lastName` | ✅ | Nom |
| `department` | ❌ | Département |
| `position` | ❌ | Intitulé de poste |
| `role` | ❌ | Rôle (défaut : `employee`) |
| `managerId` | ❌ | ID du manager direct |

**Réponse 201** — Objet utilisateur complet (sans `passwordHash`, `ldapDn`)

**Erreur 409** si l'email existe déjà.

---

#### `PATCH /api/users/:id`
Met à jour un utilisateur.

**Auth :** `admin`/`hr` pour tous les champs ; un utilisateur peut modifier ses propres données (hors `role` et `managerId`).

**Body** — tous les champs sont optionnels :
`firstName`, `lastName`, `department`, `position`, `role`, `managerId`, `isActive`

> `passwordHash` et `ldapDn` sont toujours ignorés même s'ils sont envoyés.

**Réponse 200** — Objet utilisateur mis à jour

---

### Campaigns

#### `GET /api/campaigns`
Liste toutes les campagnes.

**Auth :** requise

**Query params**

| Paramètre | Type | Description |
|---|---|---|
| `status` | string | Filtrer par statut (`draft`, `active`, `closed`, `archived`) |

**Réponse 200** — `Campaign[]` (avec `createdBy` populé)

---

#### `GET /api/campaigns/:id`
Retourne une campagne avec ses statistiques de complétion.

**Auth :** requise

**Réponse 200**
```json
{
  "_id": "...",
  "name": "Entretiens annuels 2025",
  "status": "active",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-03-31T00:00:00.000Z",
  "targetDepartments": [],
  "extendedVisibility": [],
  "createdBy": { "_id": "...", "firstName": "RH", "lastName": "Admin", "email": "..." },
  "stats": {
    "total": 42,
    "started": 30,
    "submitted": 20,
    "validated": 5
  }
}
```

---

#### `POST /api/campaigns`
Crée une nouvelle campagne.

**Auth :** `admin` ou `hr`

**Body**

| Champ | Requis | Description |
|---|---|---|
| `name` | ✅ | Nom de la campagne |
| `startDate` | ✅ | Date d'ouverture (ISO 8601) |
| `endDate` | ✅ | Date de clôture (ISO 8601, doit être après `startDate`) |
| `description` | ❌ | Description libre |
| `targetDepartments` | ❌ | `string[]` — vide = toute l'organisation |
| `extendedVisibility` | ❌ | Voir [Visibilité étendue](#visibilité-étendue) |

**Réponse 201**
```json
{ "id": "<campaignId>" }
```

---

#### `PATCH /api/campaigns/:id`
Modifie une campagne ou effectue une transition de statut.

**Auth :** `admin` ou `hr`

**Champs modifiables :** `name`, `description`, `status`, `startDate`, `endDate`, `targetDepartments`, `extendedVisibility`

**Transitions de statut autorisées :**

```
draft → active → closed → archived
```

Toute autre transition retourne une erreur `400`.

**Réponse 200**
```json
{ "id": "<campaignId>" }
```

---

### Forms

#### `GET /api/forms`
Liste les formulaires.

**Auth :** requise

**Query params**

| Paramètre | Type | Description |
|---|---|---|
| `campaignId` | ObjectId | Filtrer par campagne |
| `formType` | string | Filtrer par type de formulaire |

**Réponse 200** — `Form[]`

---

#### `GET /api/forms/:id`
Retourne un formulaire avec ses questions.

**Auth :** requise

**Réponse 200** — `Form`

---

#### `POST /api/forms`
Crée un formulaire.

**Auth :** `admin` ou `hr`

**Body**

| Champ | Requis | Description |
|---|---|---|
| `campaignId` | ✅ | ID de la campagne associée |
| `title` | ✅ | Titre du formulaire |
| `formType` | ✅ | Type (voir [Types de formulaires](#types-de-formulaires)) |
| `questions` | ✅ | `Question[]` non vide (voir [Types de questions](#types-de-questions)) |
| `description` | ❌ | Instructions affichées à l'utilisateur |
| `isAnonymous` | ❌ | `boolean` — forcé `true` pour `upward_feedback` |

**Réponse 201**
```json
{ "id": "<formId>" }
```

---

#### `PATCH /api/forms/:id`
Modifie un formulaire.

**Auth :** `admin` ou `hr`

**Champs modifiables librement :** `title`, `description`

**`questions` :** modifiable uniquement si `frozenAt` est null.
Une fois qu'une évaluation existe sur ce formulaire, les questions sont gelées (retourne `409`).

**Réponse 200**
```json
{ "id": "<formId>" }
```

**Erreur 409**
```json
{
  "error": "Les questions sont gelées — des évaluations existent déjà sur ce formulaire",
  "frozenAt": "2025-02-10T08:00:00.000Z"
}
```

---

### Evaluations

#### `GET /api/evaluations`
Liste les évaluations selon le scope du rôle.

**Auth :** requise

| Rôle | Scope |
|---|---|
| `employee` | Ses propres évaluations (évaluateur ou évaluatee) |
| `manager`, `director` | Les siennes + celles de ses subordonnés visibles (voir [Visibilité étendue](#visibilité-étendue)) |
| `admin`, `hr` | Toutes les évaluations |

**Query params**

| Paramètre | Type | Description |
|---|---|---|
| `campaignId` | ObjectId | Filtrer par campagne (requis pour la visibilité étendue manager) |

**Réponse 200** — `Evaluation[]` (avec `formId`, `evaluatorId`, `evaluateeId`, `campaignId` populés)

> Les évaluations sur un formulaire anonyme retournent `evaluatorId: null, evaluatorName: "Anonyme"`.

---

#### `GET /api/evaluations/:id`
Retourne une évaluation.

**Auth :** requise

> Un employé ne peut accéder qu'à ses propres évaluations.

**Réponse 200** — `Evaluation` complète (formulaire avec questions inclus)

---

#### `POST /api/evaluations`
Crée une évaluation et gèle le formulaire associé si nécessaire.

**Auth :** `admin` ou `hr`

**Body**

| Champ | Requis | Description |
|---|---|---|
| `campaignId` | ✅ | ID de la campagne |
| `formId` | ✅ | ID du formulaire |
| `evaluatorId` | ✅ | ID de l'évaluateur |
| `evaluateeId` | ✅ | ID de l'évaluatee |

**Réponse 201**
```json
{ "id": "<evaluationId>" }
```

**Erreur 409** si le quadruplet `(campaignId, formId, evaluatorId, evaluateeId)` existe déjà.

---

#### `POST /api/evaluations/bulk`
Crée plusieurs évaluations en une seule requête.

**Auth :** `admin` ou `hr`

**Body**
```json
{ "evaluations": [ { "campaignId": "...", "formId": "...", "evaluatorId": "...", "evaluateeId": "..." } ] }
```

**Réponse 201**
```json
{ "created": 15 }
```

**Réponse 207** (Multi-Status) si certains doublons ont été ignorés :
```json
{ "created": 13, "skipped": 2, "message": "Certaines évaluations existaient déjà et ont été ignorées" }
```

---

#### `PATCH /api/evaluations/:id`
Sauvegarde des réponses et/ou effectue une transition de statut.

**Auth :** requise

**Body**

| Champ | Requis | Description |
|---|---|---|
| `answers` | ❌ | `Answer[]` — verrouillées après `submitted` |
| `status` | ❌ | Nouvelle statut (transitions selon rôle) |
| `score` | ❌ | Score 0–100 — `manager`, `director`, `admin`, `hr` uniquement |

**Réponse 200**
```json
{ "id": "...", "status": "in_progress", "lastSavedAt": "2025-02-10T14:32:00.000Z" }
```

**Transitions autorisées par rôle :**

| Rôle | Transitions possibles |
|---|---|
| `employee` | `assigned → in_progress`, `in_progress → submitted` |
| `manager` | `submitted → reviewed` |
| `director` | `submitted → reviewed` |
| `hr` | `reviewed → signed_hr`, `signed_manager → signed_hr` |
| `admin` | Toutes les transitions |

---

## Statuts d'évaluation

```
assigned → in_progress → submitted → reviewed → signed_evaluatee → signed_manager → signed_hr → validated
```

| Statut | Description |
|---|---|
| `assigned` | Évaluation créée, aucune réponse saisie |
| `in_progress` | Formulaire en cours de saisie |
| `submitted` | Formulaire soumis — réponses verrouillées |
| `reviewed` | Examiné par le manager (score + commentaire) |
| `signed_evaluatee` | Signé par l'évaluatee |
| `signed_manager` | Co-signé par le manager |
| `signed_hr` | Contre-signé par RH |
| `validated` | Finalisé — lecture seule permanente |

---

## Types de formulaires

| Valeur | Description | Anonyme |
|---|---|---|
| `self_evaluation` | L'employé ou le manager s'auto-évalue | Non |
| `manager_evaluation` | Le manager évalue un membre de son équipe | Non |
| `upward_feedback` | L'équipe évalue son manager | **Toujours** |
| `director_evaluation` | Le directeur évalue un manager | Non |
| `peer_review` | Les pairs s'évaluent mutuellement | Non |

---

## Types de questions

| Type | Description | Champs spécifiques |
|---|---|---|
| `rating` | Note sur une échelle numérique | `scale` (2–10, défaut 5) |
| `text` | Réponse texte libre | — |
| `yes_no` | Réponse booléenne | — |
| `choice` | Choix parmi une liste | `options` (min 2 valeurs) |

**Exemple de question :**
```json
{
  "id": "q1",
  "type": "rating",
  "label": "Comment évaluez-vous votre maîtrise technique ?",
  "required": true,
  "scale": 5
}
```

**Exemple de réponse (`Answer`) :**
```json
{ "questionId": "q1", "value": 4 }
```

---

## Visibilité étendue

Le champ `extendedVisibility` d'une campagne permet d'accorder à certains managers une visibilité au-delà de leurs subordonnés directs.

**Structure :**
```json
[
  {
    "managerId": "<ObjectId>",
    "restrictedToManagers": ["<ObjectId>", "<ObjectId>"]
  }
]
```

- Si `restrictedToManagers` est vide, le manager voit tout son sous-arbre récursivement.
- S'il est renseigné, la visibilité est limitée aux branches listées.

La résolution est effectuée par `services/managerVisibility.js` → `getVisibleUserIds(managerId, campaign)`.
