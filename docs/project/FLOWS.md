# NanoXplore RH — Flux métier principaux

## 1. Flux d'authentification

```
Utilisateur                Express                MongoDB
    │                         │                      │
    │  POST /api/auth/login    │                      │
    │  { email, password }     │                      │
    ├─────────────────────────►│                      │
    │                         │  findOne(email)       │
    │                         ├─────────────────────►│
    │                         │◄─────────────────────┤
    │                         │  bcrypt.compare()     │
    │                         │  jwt.sign()           │
    │                         │  Set-Cookie: token    │
    │◄────────────────────────┤                      │
    │  { user: { id, role } }  │                      │
```

**Particularités :**
- Double rate limiting login : 5 essais/15min par email + 20 essais/15min par IP
- Le token JWT contient `{ id, email, role }` — pas de données sensibles
- Cookie `httpOnly + secure + sameSite: strict` — inaccessible au JavaScript
- LDAP : les utilisateurs LDAP s'authentifient via `ldapService.testConnection()` à la place de bcrypt

---

## 2. Cycle de vie d'une campagne

```
[draft] ──► [active] ──► [closed] ──► [archived]
```

- **draft** : créée par admin/hr, non visible des employés
- **active** : évaluations assignées, employés et managers actifs
- **closed** : plus de modification, pré-archivage
- **archived** : terminal, lecture seule

Transitions contrôlées par `CAMPAIGN_TRANSITIONS` dans `models/Campaign.js`.

---

## 3. Cycle de vie d'une évaluation

```
[assigned]
    │
    ▼
[in_progress]  ◄── auto-save (lastSavedAt)
    │
    ▼
[submitted]
    │
    ▼
[reviewed]  ◄── commentaire manager
    │
    ├──► [signed_evaluatee]
    ├──► [signed_manager]
    └──► [signed_hr]
              │
              ▼
         [validated]
              │
              ▼
          [archived]
              │
          [expired]  ◄── via scheduler (endDate + 30 jours)
```

**Règles de transition :**
- Les transitions valides par rôle sont définies dans `ROLE_TRANSITIONS` (`models/Evaluation.js`)
- Les statuts terminaux (`signed_hr`, `validated`, `archived`, `expired`) sont dans `LOCKED_STATUSES`
- Un admin peut forcer n'importe quelle transition définie dans `VALID_TRANSITIONS`

---

## 4. Flux de liaison de formulaires à une campagne

### 4.1 Créer un formulaire (bibliothèque)

```
Admin/HR
  │
  │  POST /api/forms
  │  { title, formType, questions }
  ▼
Form créé autonome (aucun lien de campagne direct)
  │
  ▼
Visible dans /forms — bibliothèque globale
Peut être lié à n'importe quelle campagne
```

### 4.2 Lier un formulaire à une campagne

```
Admin/HR (depuis onglet "Formulaires" de la page Campagne)
  │
  │  POST /api/campaigns/:id/forms
  │  { formId }
  ▼
Vérification : form existe + non déjà lié
  │
  ▼
Campaign.formIds.push(formId)
  │
  ▼
Retourne la campagne mise à jour
  └── Formulaire partagé entre campagnes possible (pas de copie)
```

**Dissocier un formulaire :**

```
Admin/HR
  │
  │  DELETE /api/campaigns/:id/forms/:formId
  ▼
Campaign.formIds.pull(formId)
  └── Le formulaire reste dans la bibliothèque
```

**Règles :**
- Les formulaires sont autonomes — ils n'appartiennent pas à une campagne
- `Campaign.formIds` est un tableau de références vers des `Form`
- Un même formulaire peut être lié à plusieurs campagnes simultanément
- Les formulaires se gèrent depuis l'onglet "Formulaires" de la page détail de campagne, non à la création
- Le gel du formulaire (`frozenAt`) se déclenche à la première évaluation soumise

### 4.3 Multi-formulaires par campagne

Une campagne peut avoir **plusieurs formulaires** de types variés :
- `self_evaluation` : auto-évaluation de l'employé
- `manager_evaluation` : évaluation par le manager N+1
- `upward_feedback` : feedback anonyme vers le manager
- `director_evaluation` : évaluation par le directeur
- `objectives` : formulaire d'objectifs

```
Campaign
  formIds: [
    Form (self_evaluation)       ← "Auto-éval Standard"
    Form (manager_evaluation)    ← "Éval Manager 360°"
    Form (upward_feedback)       ← "Feedback Montant"
  ]
```

Tous les formulaires liés sont accessibles par les évaluateurs concernés.

---

## 5. Flux de création d'évaluations en masse

```
Admin/HR
   │
   │  POST /api/evaluations/bulk
   │  { evaluations: [{ campaignId, formId, evaluatorId, evaluateeId }] }
   ▼
Validation (max 500, ObjectId valides)
   │
   ▼
Form.updateMany (freeze les formulaires concernés)
   │
   ▼
Campaign.find (récupération des endDates pour expiresAt)
   │
   ▼
Evaluation.insertMany (ordered: false — continue malgré les doublons)
   │
   ▼
notifyMany(evaluateeIds) — fire-and-forget
   │
   ▼
{ created: N }
```

---

## 5. Flux d'export PDF

```
GET /api/evaluations/:id/pdf
   │
   ▼
Vérification accès (évaluateur | évalué | admin/hr)
   │
   ▼
Evaluation.findById().populate(form, evaluator, evaluatee, campaign)
   │
   ▼
PDFDocument (pdfkit) : en-tête + infos + questions/réponses + commentaires + signatures
   │
   ▼
doc.pipe(res) → Content-Type: application/pdf
```

---

## 6. Flux de synchronisation LDAP

```
Admin
  │
  │ POST /api/admin/ldap/sync { config }
  ▼
ldapService.validate(config) — vérifie host, bindDN, baseDN
  │
  ▼
ldap.createClient (TLS rejectUnauthorized: true par défaut)
  │
  ▼
bindAsync(bindDN, bindPassword)
  │
  ▼
searchAsync(baseDN, filter, sizeLimit: 1000)
  │
  ▼
Pour chaque entrée LDAP :
  ├── User existe ? → updateOne({ firstName, lastName, ldapDn, dept })
  └── Sinon → User.create({ role: defaultRole, authSource: 'ldap' })
  │
  ▼
{ created, updated, skipped, errors[] }
```

---

## 7. Flux de notification

```
Action métier (ex: changement statut évaluation)
   │
   ▼
notificationService.notify(type, recipient, data)
   │
   ▼
Vérifie notificationPrefs[type] === true
   │
   ├── email activé → mailer.sendMail()
   └── push activé (futur) → WebSocket / SSE
```

Les préférences de notification sont filtrées par rôle — un `employee` ne peut pas activer des notifications réservées aux managers.
