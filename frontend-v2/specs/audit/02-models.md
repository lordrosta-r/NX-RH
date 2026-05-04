# Audit Modèles — NX-RH

> **Agent** : 02 — Auditeur des modèles Mongoose  
> **Source** : `mongo/server/models/` · `config/constants.js`  
> **Référence specs** : `07-api-contract.md` · `03-screens.md` · `05-notifications.md`  
> **Date** : 2025

---

## Inventaire (11 modèles)

| Modèle | Champs principaux | Indexes | Hooks |
|---|---|---|---|
| `User` | email, passwordHash, firstName, lastName, role, department, position, managerId, sectorId, authSource, ldapDn, locale, theme, notificationPrefs, lastLoginAt, isActive, phone, avatar, onboarding, offboardingStatus, archivedAt | email (unique), ldapDn (partial unique), managerId, sectorId, department, managerId+isActive, managerId+role+isActive, isActive+role | pre-save: hash bcrypt, anti-cycle managerId |
| `Campaign` | name, description, startDate, endDate, status, createdBy, deadlineEmployee, deadlineManager, targetDepartments, extendedVisibility, previousCampaignId, enableN1Context, n1VisibleToEmployee, targetScope, objectivesFormId | status (inline), createdBy, startDate+endDate | pre-save: endDate ≥ startDate |
| `Evaluation` | campaignId, formId, evaluatorId, evaluateeId, status, answers[], lastSavedAt, score, reviewerComment, reviewedBy, nextObjectives, objectiveRatings, evaluateeComment, disagreementFlag, auditLog[], signedAt×3, lastReminderAt, expiresAt, nearExpiry | compound unique (campaignId+formId+evaluatorId+evaluateeId), campaignId+status, evaluateeId+campaignId, evaluatorId+campaignId, N-1 direct & fallback | post-init: snapshot `_originalStatus` ; pre-save: answer-lock, lastSavedAt, auto-transition assigned→in_progress |
| `Form` | campaignId, title, description, formType, isAnonymous, questions[], frozenAt, createdBy | campaignId (inline) | pre-save: force isAnonymous si upward_feedback, unicité IDs questions, validations choice/rating |
| `Sector` | name, description, color, createdBy, isActive | name (unique inline) | — |
| `MailTemplate` | slug, subject, bodyText, bodyHtml, variables[], lastEditedBy | slug (unique inline) | — |
| `AuditLog` | userId, userRole, action, targetType, targetId, meta, createdAt | TTL createdAt (2 ans), userId+createdAt, targetId+createdAt, targetType+createdAt | — |
| `Config` | key, value | key (unique inline) | — |
| `Event` | title, description, location, date, endDate, type, campaignId, targetRoles[], reminderSent, createdBy | date (inline), createdBy+date, campaignId+date | pre-save: endDate > date |
| `OffboardingRequest` | userId, requestedBy, reason, lastDay, status, checklist[], notes | userId (unique inline), status, lastDay | — |
| `Resource` | title, description, type, filename, status, visibleTo[], publishedAt, createdBy | status (inline) | pre-save: set publishedAt à la publication |

---

## 🔴 P1 — Champs manquants bloquants

### 1. Modèle `Notification` absent

**Impact** : Bloquant pour le centre de notifications in-app (`/notifications`) et le polling frontend.

La spec `05-notifications.md` définit un système complet de notifications persistées :
- Route dédiée `/notifications` (page S-xx dans 03-screens)
- Endpoints `GET /api/notifications?unreadOnly=true&limit=1` et `PATCH /api/notifications/:id/read`
- React Query hooks avec mise à jour optimiste du compteur non-lu
- Badge cloche sur la navbar avec compteur `unreadCount`
- Groupement par date, pagination (20 par page)

Le modèle doit exposer a minima :

```js
{
  userId:    { type: ObjectId, ref: 'User', required: true, index: true },
  type:      { type: String, required: true, enum: ALL_NOTIF_TYPES },
  title:     { type: String, required: true, maxlength: 200 },
  body:      { type: String, default: '', maxlength: 1000 },
  link:      { type: String, default: null, maxlength: 500 },   // CTA URL
  read:      { type: Boolean, default: false, index: true },
  priority:  { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  createdAt: { type: Date, default: Date.now },                  // TTL 90 jours recommandé
}
```

Indexes manquants : `userId + read + createdAt` (requête badge), `userId + createdAt` (liste paginée).

> **Note** : `07-api-contract.md` mentionne l'endpoint comme "futur" mais `05-notifications.md` contient du code d'implémentation complet — la feature est attendue en V2.

---

### 2. `Evaluation.phase` absent

**Impact** : La spec audit mentionne explicitement `phase` sur l'évaluation. Bien que les questions portent déjà un champ `phase` (self / n-1 / objectives / aspirations / all), la navigation par phase côté UI (S-16/S-17 : tabs phases, barre de progression segmentée) peut nécessiter de persister la phase courante pour la reprise de session.

**À clarifier** avec l'équipe produit : si la phase courante est purement côté client (état local/sessionStorage), ce champ est inutile en DB. Si elle doit survivre à un rechargement, ajouter :

```js
currentPhase: {
  type: String,
  enum: ['self', 'n-1', 'objectives', 'aspirations'],
  default: 'self',
}
```

> Classé P1 par précaution — peut être rétrogradé P3 si purement UI.

---

## 🟠 P2 — Validations / indexes manquants

### 3. `AuditLog.action` non indexé

La route `GET /api/admin/audit` filtre sur `?action=` et `?targetType=`. `targetType` est indexé mais `action` ne l'est pas.

```js
// Ajouter :
auditLogSchema.index({ action: 1, createdAt: -1 })
```

### 4. `AuditLog.userRole` sans validation enum

```js
userRole: { type: String }  // ← pas d'enum ROLES
```

Peut persister des rôles invalides si le champ est renseigné manuellement. Ajouter :

```js
userRole: { type: String, enum: [...ROLES, null], default: null }
```

### 5. `Form.formType` non indexé

La route `GET /api/forms?formType=` filtre sur ce champ — aucun index en place.

```js
// Ajouter :
formSchema.index({ formType: 1 })
```

### 6. `Form` — immutabilité `frozenAt` non enforced au niveau modèle

La protection "questions gelées" est gérée uniquement dans la route (`409` si `frozenAt` présent). Un contournement direct via `model.save()` bypasserait cette protection. Ajouter un hook pre-save :

```js
formSchema.pre('save', function (next) {
  if (this.frozenAt && this.isModified('questions')) {
    return next(new Error('Questions gelées — formulaire déjà utilisé par des évaluations'))
  }
  next()
})
```

### 7. `Evaluation` — historique des transitions de statut non auto-tracé

Le champ `auditLog[]` existe et est append-only, mais aucun hook modèle ne garantit l'écriture d'une entrée lors d'un changement de statut. L'alimentation est entièrement déléguée aux routes — risque d'oubli silencieux.

```js
// Ajouter dans le pre-save, après l'answer-lock check :
if (this._originalStatus && this.isModified('status') && this.status !== this._originalStatus) {
  this.auditLog.push({
    action: 'status_change',
    meta: { from: this._originalStatus, to: this.status },
    at: new Date(),
  })
}
```

### 8. `User.avatar` — validation URL/longueur absente

Le champ est défini comme `String` sans `maxlength`. L'endpoint `PATCH /users/:id/avatar` accepte `avatarUrl` (URL HTTPS, max 500 chars) mais ce n'est pas validé au niveau du modèle.

```js
avatar: { type: String, default: null, maxlength: 500 }
```

### 9. `MailTemplate.slug` — pas de validation de format

Pas de regex pour s'assurer que le slug est URL-safe (`[a-z0-9_-]+`). Risque de slugs avec espaces ou caractères spéciaux.

```js
slug: {
  type: String, required: true, unique: true, trim: true,
  match: [/^[a-z0-9_-]+$/, 'Slug invalide — caractères autorisés : a-z, 0-9, _ et -'],
}
```

### 10. `Config.key` — pas de validation de format

Même problème : aucune contrainte de format sur les clés de configuration.

```js
key: {
  type: String, required: true, unique: true, trim: true,
  match: [/^[a-zA-Z0-9._-]+$/, 'Clé de config invalide'],
}
```

### 11. `targetScope.type` — conflit de nom avec Mongoose

```js
targetScope: {
  type: {          // ← "type" est un mot réservé Mongoose dans les sous-schémas
    type: String,
    enum: ['all', 'department', 'sector', 'users'],
  },
  ids: { ... }
}
```

Ce pattern est connu pour causer des comportements inattendus (cast silencieux, non-validation de l'enum). Utiliser `_type` ou `scopeType` comme nom de champ, ou forcer via un sous-schéma explicite avec `new Schema({...}, {_id: false})`.

---

## 🟡 P3 — Améliorations (virtuals, softdelete, cohérence)

### 12. Softdelete incohérent entre les modèles

| Modèle | Mécanisme |
|---|---|
| `User` | `isActive: Boolean` (soft delete) |
| `Sector` | `isActive: Boolean` (soft delete) |
| `Campaign` | `status: 'archived'` (terminal) |
| `Evaluation` | `status: 'archived'` (terminal) |
| `Form` | Aucun mécanisme de suppression douce |
| `Event` | Aucun (hard delete uniquement) |
| `Resource` | `status: 'draft'|'published'` (pas de soft delete) |
| `OffboardingRequest` | Aucun (hard delete admin) |

**Recommandation** : `Form` devrait avoir un statut `archived` pour éviter les suppressions irréversibles de formulaires déjà référencés. `Resource` et `Event` sont acceptables en hard delete (données non critiques).

### 13. `User` — virtual `fullName` absent

Utile pour les populates et les logs d'audit (évite les concaténations répétées côté routes).

```js
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`
})
```

### 14. `Evaluation.auditLog[]` vs collection `AuditLog` — double tracking

Il existe deux mécanismes de traçabilité en parallèle :
1. `Evaluation.auditLog[]` : embarqué, append-only, traçage granulaire des actions RH sur une évaluation
2. Collection `AuditLog` : centralisée, TTL 2 ans, toutes les actions métier

Sans convention claire, certaines actions peuvent être tracées des deux côtés ou d'aucun. Documenter explicitement quelles actions vont dans l'un vs l'autre.

### 15. `Event.type` et `Resource.type` non indexés

Ces champs sont filtrés dans les listes mais sans index. Impact faible si volumes réduits — à indexer si la collection dépasse 10k documents.

### 16. `Form.questions[].options` — `default: undefined` fragile

```js
options: { type: [String], default: undefined }
```

`undefined` n'est pas une valeur JSON valide. Préférer `default: null` avec une validation conditionnelle, ou omettre le champ des documents non-choice.

### 17. `Evaluation.answers` — `value: Mixed` sans validation de type par `questionType`

Tout type de valeur est accepté pour `answers[].value`. Pour les questions `yes_no`, seuls `true/false` sont attendus ; pour `rating`, un entier entre 1 et `scale` max ; etc. Ajouter une validation cross-référencée au `Form.questions` lors de la soumission (côté route ou hook) pour éviter des données incohérentes.

---

## ✅ Points conformes

| Aspect | Détail |
|---|---|
| `User.email` | required, unique, lowercase, trim, maxlength 254, regex validation |
| `User.passwordHash` | select: false, hash bcrypt pre-save, détection de doublon-hash |
| `User` anti-cycle managerId | Vérification récursive (profondeur 20) en pre-save |
| `User` champs specs | avatar ✅, phone ✅, lastLoginAt ✅, isActive ✅, ldapDn ✅, authSource ✅ |
| `User.ldapDn` | Index partiel `$type: 'string'` — correct (évite conflits sur null) |
| `Campaign` champs specs | targetScope ✅, objectivesFormId ✅, previousCampaignId ✅, enableN1Context ✅ |
| `Campaign` dates | Validation endDate ≥ startDate en pre-save ✅ |
| `Campaign` VALID_TRANSITIONS | Exposé comme static sur le modèle ✅ |
| `Evaluation` champs specs | status ✅, reviewerComment ✅, nextObjectives ✅, disagreementFlag ✅ |
| `Evaluation` answer-lock | Bloque la modification des réponses post-submitted ✅ |
| `Evaluation` compound unique | (campaignId, formId, evaluatorId, evaluateeId) ✅ |
| `Evaluation` N-1 indexes | Deux index dédiés (direct + fallback) ✅ |
| `Form` questions | phase ✅, options ✅, scale (min 2 / max 10) ✅ |
| `Form` upward_feedback | Forcé isAnonymous=true en pre-save ✅ |
| `Form` frozenAt | Champ présent ✅ (protection dans routes) |
| `Form` unicité IDs questions | Vérification en pre-save ✅ |
| `Sector.color` | Regex hex `#[0-9A-Fa-f]{6}` ✅ |
| `AuditLog` TTL | Index TTL 2 ans sur createdAt ✅ |
| `AuditLog` indexes | userId+createdAt, targetId+createdAt, targetType+createdAt ✅ |
| `OffboardingRequest` | unique userId (1 demande/user), checklist par défaut ✅ |
| `constants.js` | Source de vérité unique ROLES, DEPARTMENTS, FORM_TYPES, EVALUATION_STATUSES ✅ |
| `timestamps: true` | Présent sur tous les modèles sauf AuditLog (gère createdAt manuellement) ✅ |

---

## Résumé exécutif

| Catégorie | Nb | Détail |
|---|---|---|
| **Modèles inventoriés** | 11 | User, Campaign, Evaluation, Form, Sector, MailTemplate, AuditLog, Config, Event, OffboardingRequest, Resource |
| **🔴 P1 — Champs bloquants** | 2 | Notification model absent (in-app notifs) · Evaluation.phase à clarifier |
| **🟠 P2 — Validations/indexes** | 9 | AuditLog.action non indexé · AuditLog.userRole sans enum · Form.formType non indexé · Form immutabilité frozenAt non enforced modèle · Evaluation status-history non auto-tracé · User.avatar sans maxlength · MailTemplate.slug sans regex · Config.key sans regex · targetScope.type conflit Mongoose |
| **🟡 P3 — Améliorations** | 6 | Softdelete incohérent · virtual fullName · double tracking auditLog · indexes Event/Resource type · options default undefined · answers.value non typé |
| **✅ Conformes** | ~25 | Voir tableau ci-dessus |

**Action prioritaire** : créer le modèle `Notification` avant d'implémenter le frontend `/notifications`.
