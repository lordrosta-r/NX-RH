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

## 4. Flux de création d'évaluations en masse

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
