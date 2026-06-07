# NanoXplore RH — Schéma MongoDB

## Collections (6)

| Collection | Rôle |
|---|---|
| `users` | Comptes locaux et LDAP |
| `campaigns` | Cycles d'évaluation |
| `forms` | Templates de formulaires |
| `evaluations` | Formulaires remplis + signatures |
| `resources` | Documents publiés par RH |
| `events` | Événements calendrier |

---

## `users`

| Champ | Type | Contrainte |
|---|---|---|
| `_id` | ObjectId | auto |
| `email` | String | unique, lowercase |
| `passwordHash` | String | **select:false** — null si LDAP |
| `firstName` | String | required |
| `lastName` | String | required |
| `role` | String | enum: admin / hr / manager / employee — **toujours géré en DB, jamais depuis LDAP** |
| `department` | String | nullable |
| `position` | String | titre de poste, nullable |
| `managerId` | ObjectId → User | nullable, index |
| `authSource` | String | enum: local / ldap |
| `ldapDn` | String | **select:false** — sparse unique, null si local |
| `isActive` | Boolean | default: true |

**Règles :**
- `managerId !== _id` (pre-save)
- `passwordHash` et `ldapDn` jamais retournés sans `.select('+...')`
- LDAP = authentification uniquement — le rôle est toujours dans la DB

---

## `campaigns`

| Champ | Type | Contrainte |
|---|---|---|
| `_id` | ObjectId | auto |
| `name` | String | required |
| `description` | String | |
| `startDate` | Date | required |
| `endDate` | Date | required, >= startDate |
| `status` | String | enum: draft / active / closed / archived — index |
| `createdBy` | ObjectId → User | required |
| `targetDepartments` | [String] | liste des départements concernés — vide = tous |

**Transitions :** `draft → active → closed → archived` (irréversible)

---

## `forms`

| Champ | Type | Contrainte |
|---|---|---|
| `_id` | ObjectId | auto |
| `campaignId` | ObjectId → Campaign | required, index |
| `title` | String | required |
| `description` | String | instructions affichées avant de remplir |
| `formType` | String | enum: self_evaluation / manager_evaluation / upward_feedback / peer_360 |
| `isAnonymous` | Boolean | default: false — **forcé true** si upward_feedback |
| `questions` | Array | min 1 — IDs uniques validés par pre-save |
| `frozenAt` | Date | null jusqu'à la 1ère évaluation — protège les questions |
| `createdBy` | ObjectId → User | |

**Structure d'une question :**

| Champ | Type | Détail |
|---|---|---|
| `id` | String | unique dans le form |
| `type` | String | rating / text / yes_no |
| `label` | String | texte de la question |
| `required` | Boolean | default: true |
| `scale` | Number | 2–10, default 5 — **uniquement pour type rating** |

**Règle `frozenAt` :** dès la première évaluation créée, les questions ne peuvent plus être modifiées (les routes vérifient `frozenAt`). `title` et `description` restent modifiables.

---

## `evaluations`

| Champ | Type | Contrainte |
|---|---|---|
| `_id` | ObjectId | auto |
| `campaignId` | ObjectId → Campaign | required, index |
| `formId` | ObjectId → Form | required |
| `evaluatorId` | ObjectId → User | required, index — **jamais retourné si form.isAnonymous** |
| `evaluateeId` | ObjectId → User | required, index |
| `status` | String | voir lifecycle ci-dessous |
| `answers` | Array | `[{questionId, value}]` — lock après submitted |
| `lastSavedAt` | Date | màj automatique à chaque save d'answers ("Dernière sauvegarde à 14h32") |
| `score` | Number | 0–100, nullable |
| `reviewerComment` | String | par manager |
| `reviewedBy` | ObjectId → User | nullable |
| `evaluateeComment` | String | |
| `disagreementFlag` | Boolean | default: false |
| `signedByEvaluateeAt` | Date | |
| `signedByManagerAt` | Date | |
| `signedByHrAt` | Date | |

**Index unique :** `(campaignId, formId, evaluatorId, evaluateeId)` — pas de doublon

**Lifecycle complet :**
```
assigned → in_progress → submitted → reviewed → signed_evaluatee → signed_manager → signed_hr → validated
           (1er save)   (évaluateur)  (manager)  (évaluatee lit)   (manager signe)  (RH signe)  (validé)
```

**Answer-lock :** réponses non modifiables dès `submitted`. Le statut passe automatiquement `assigned → in_progress` au 1er save des réponses.

---

## `resources`

| Champ | Type | Contrainte |
|---|---|---|
| `_id` | ObjectId | auto |
| `title` | String | required |
| `description` | String | courte description affichée dans la liste |
| `type` | String | enum: pdf / xlsx / docx / pptx |
| `filename` | String | nom du fichier dans UPLOADS_DIR |
| `status` | String | enum: draft / published — index |
| `visibleTo` | Array | rôles autorisés — default: tous |
| `publishedAt` | Date | auto-rempli à la publication |
| `createdBy` | ObjectId → User | required |

---

## `events`

| Champ | Type | Contrainte |
|---|---|---|
| `_id` | ObjectId | auto |
| `title` | String | required |
| `date` | Date | required, index |
| `type` | String | enum: deadline / interview / meeting / feedback / campaign |
| `campaignId` | ObjectId → Campaign | nullable |
| `targetRoles` | Array | rôles qui voient l'événement — default: tous |
| `createdBy` | ObjectId → User | required |

---

## Relations (diagram simplifié)

```
User ──managerId──▶ User          (hiérarchie manager, self-ref)
Campaign ──createdBy──▶ User
Form ──campaignId──▶ Campaign
Evaluation ──campaignId──▶ Campaign
Evaluation ──formId──▶ Form
Evaluation ──evaluatorId──▶ User
Evaluation ──evaluateeId──▶ User
Resource ──createdBy──▶ User
Event ──campaignId──▶ Campaign    (optionnel)
Event ──createdBy──▶ User
```

**Embarqué (pas de référence) :**
- `Form.questions[]` — toujours lu avec le form
- `Evaluation.answers[]` — toujours lu avec l'évaluation

---

## Sécurité

| Règle | Où |
|---|---|
| `passwordHash` jamais dans les réponses | `select: false` dans User |
| `ldapDn` jamais dans les réponses | `select: false` dans User |
| `evaluatorId` masqué si form anonyme | Logique API (routes) |
| `upward_feedback` toujours anonyme | Pre-save hook Form |
| Pas de doublon d'évaluation | Compound unique index |
| Score entre 0 et 100 | Mongoose min/max |
| Pas d'auto-management | Pre-save hook User |
| Champs inconnus ignorés | Strict mode Mongoose (défaut) |
| Injection LDAP impossible | `buildFilter()` échappe les caractères spéciaux |
| IDs de questions uniques | Pre-save hook Form |
| Questions gelées après 1ère évaluation | Champ `frozenAt` + vérif en route |
| LDAP optionnel (local-only) | `ldap.isEnabled()` |

