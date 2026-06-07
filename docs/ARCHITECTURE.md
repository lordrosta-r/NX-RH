# NanoXplore RH — Architecture technique

> Document destiné aux développeurs qui contribuent au projet ou qui le déploient.

---

## Vue d'ensemble

NanoXplore RH est une **MPA (Multi-Page Application)** : chaque page est une entrée Vite indépendante, servie par Express. Il n'y a pas de SPA router côté client — la navigation entre pages passe par des redirections HTTP standard.

```
┌──────────────────────────────────────────────────────────────┐
│  Navigateur                                                   │
│   ├─ Vite (dev) / Fichiers statiques compilés (prod)         │
│   └─ Composants React par page — pas de router global        │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTP / cookie JWT
┌──────────────────────────────▼───────────────────────────────┐
│  Express (mongo/server/index.js)                              │
│   ├─ Sert les pages HTML : GET / → login.html, etc.          │
│   ├─ /api/auth/*      — authentification                     │
│   ├─ /api/users/*     — gestion utilisateurs                 │
│   ├─ /api/campaigns/* — campagnes                            │
│   ├─ /api/forms/*     — formulaires                          │
│   └─ /api/evaluations/* — évaluations                        │
└──────────────────────────────┬───────────────────────────────┘
                               │ Mongoose ODM
┌──────────────────────────────▼───────────────────────────────┐
│  MongoDB                                                      │
│   Collections : users, campaigns, forms, evaluations         │
└──────────────────────────────────────────────────────────────┘
```

---

## Structure du projet

```
NX/
├── client/                   ← Frontend (Vite + React)
│   ├── src/
│   │   ├── pages/            ← Une entrée par page (co-location absolue)
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   └── manager/
│   │   ├── components/ui/    ← Composants réutilisables sans logique métier
│   │   ├── hooks/
│   │   │   ├── useTheme.js
│   │   │   ├── useLocale.js
│   │   │   └── useAuthUser.js
│   │   ├── i18n/index.js     ← makeT() factory uniquement
│   │   └── styles/
│   │       ├── tokens.css    ← Variables de brand (couleurs, radius, typo)
│   │       ├── theme.css     ← Variables --th-* dark/light
│   │       └── global.css    ← Reset + imports
│   └── vite.config.js        ← rollupOptions.input par page
│
├── mongo/server/             ← Backend principal (Express + Mongoose)
│   ├── index.js              ← Point d'entrée Express
│   ├── models/               ← Schémas Mongoose
│   │   ├── User.js
│   │   ├── Campaign.js
│   │   ├── Form.js
│   │   └── Evaluation.js
│   ├── routes/               ← Handlers REST
│   ├── middleware/
│   │   └── authGuard.js      ← Vérification JWT + contrôle rôle
│   ├── services/
│   │   └── managerVisibility.js
│   └── config/
│       └── constants.js      ← ROLES, DEPARTMENTS, QUESTION_TYPES, FORM_TYPES
│

```

---

## Auth flow

```
1. POST /api/auth/login
   → vérifie email + bcrypt(password)
   → émet cookie httpOnly "token" (JWT, 8h, sameSite=strict)
   → retourne { user: { id, email, firstName, lastName, role } } dans le body (pas de token)

2. Chaque page protégée monte useAuthUser()
   → GET /api/auth/me (credentials: 'include')
   → si 401/403 : window.location.href = '/'
   → si ok : setUser(data) + sessionStorage (affichage seulement)

3. authGuard middleware (côté serveur)
   → lit req.cookies.token UNIQUEMENT (cookie httpOnly)
   → jwt.verify() → attache req.user = { id, email, role }
   → 401 si absent/expiré, 403 si rôle insuffisant

4. POST /api/auth/logout → res.clearCookie('token')
```

**Important :** `sessionStorage` ne sert qu'à afficher le nom/rôle de l'utilisateur dans l'UI (anti-flash sur le label). Il n'est jamais utilisé pour prendre des décisions d'autorisation — toutes les décisions sont faites côté serveur via le cookie JWT.

**Anti-flash thème :** chaque page HTML contient un script inline qui lit `localStorage` et applique `data-theme` sur `<html>` avant le montage React, évitant le flash blanc/noir au chargement.

---

## Modèles Mongoose et relations

```
User
  ├─ managerId → User (N-1 self-reference)
  └─ authSource: 'local' | 'ldap'

Campaign
  ├─ createdBy → User
  └─ extendedVisibility: [{ managerId → User, restrictedToManagers: [User] }]

Form
  ├─ campaignId → Campaign
  ├─ createdBy → User
  ├─ questions: [{ id, type, label, required, scale?, options? }]
  └─ frozenAt: Date | null  ← gelé à la création de la 1ère évaluation

Evaluation
  ├─ campaignId → Campaign
  ├─ formId → Form
  ├─ evaluatorId → User
  ├─ evaluateeId → User
  ├─ answers: [{ questionId, value }]
  └─ index unique: (campaignId, formId, evaluatorId, evaluateeId)
```

### Gel des formulaires (`frozenAt`)

Dès qu'une première évaluation est créée sur un formulaire (`POST /api/evaluations`), le serveur positionne `Form.frozenAt = new Date()`. Toute tentative ultérieure de modifier les questions retourne une erreur `409`. Les champs `title` et `description` restent modifiables.

Ceci protège l'intégrité des réponses existantes : les IDs de questions référencés par `Evaluation.answers` ne bougent plus.

---

## managerVisibility.js

Ce service résout la question : *"Quels utilisateurs le manager X peut-il voir dans la campagne Y ?"*

**Règle de base :** un manager voit ses subordonnés directs (`User.managerId === manager._id`).

**Visibilité étendue :** si le manager figure dans `campaign.extendedVisibility`, il voit aussi les subordonnés des managers dans son sous-arbre hiérarchique. Le calcul est récursif avec protection anti-cycle (`visited: Set`).

```js
// Usage dans une route
const { getVisibleUserIds } = require('../services/managerVisibility')
const ids = await getVisibleUserIds(req.user.id, campaign)
// → ObjectId[] de tous les utilisateurs visibles
```

**`restrictedToManagers`** : optionnel dans le grant `extendedVisibility`. Limite la visibilité aux branches listées plutôt qu'à tout le sous-arbre.

---

## extendedVisibility dans Campaign

```json
"extendedVisibility": [
  {
    "managerId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "restrictedToManagers": []
  }
]
```

- `managerId` : le manager qui bénéficie de la visibilité étendue.
- `restrictedToManagers` : liste des managers-branches autorisées. Vide = tout le sous-arbre.

Configuré par un admin/hr via `PATCH /api/campaigns/:id`.

---

## Design system

### Variables CSS

| Préfixe | Fichier source | Usage |
|---|---|---|
| `--color-*` | `tokens.css` | Couleurs de brand fixes (ne changent pas avec le thème) |
| `--th-*` | `theme.css` | Couleurs thémables — changent selon `data-theme="dark\|light"` |

**Règle :** toujours utiliser `var(--th-*)` pour les couleurs des composants. N'utiliser `var(--color-*)` que pour les éléments de marque qui ont la même couleur quel que soit le thème.

### Thème dark/light

Le hook `useTheme()` écrit `data-theme="dark|light"` sur `<html>` et persiste le choix dans `localStorage`. Le CSS utilise :

```css
[data-theme="light"] { --th-bg: var(--color-white); }
[data-theme="dark"]  { --th-bg: var(--color-gray-900); }
```

---

## i18n

Chaque page gère ses propres traductions. L'engine est partagé, les données ne le sont pas.

```
client/src/i18n/index.js
  └─ makeT({ fr, en }) → t(key, params?)
       Retourne la chaîne pour la locale active.
       Fallback : fr si la clé n'existe pas en en. 

client/src/pages/<page>/i18n/
  ├─ fr.js    ← { 'login.submit': 'Se connecter' }
  ├─ en.js    ← { 'login.submit': 'Sign in' }
  └─ index.js ← export const t = makeT({ fr, en })
```

**Hook `useLocale(pageT)`** : retourne `{ t, locale, setLocale }`. Le locale est persisté dans `localStorage`. Prend le `t` de la page en paramètre — pas de contexte React global.

**Convention de nommage des clés :** `<page>.<élément>.<détail>` — ex : `login.submit.loading`, `dashboard.evaluation.status.assigned`.
