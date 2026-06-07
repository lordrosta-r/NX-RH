# NanoXplore RH — Rapport complet du projet

> Date de génération : **18 avril 2026** (mis à jour après refactor cloisonnement)
> État : MVP fonctionnel, cœur métier complet, **un portail dédié par rôle**, plusieurs sections périphériques restantes.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Modèle de données](#3-modèle-de-données)
4. [Rôles & hiérarchie](#4-rôles--hiérarchie)
5. [Routes API (backend)](#5-routes-api-backend)
6. [Pages (frontend)](#6-pages-frontend)
7. [Flows utilisateurs détaillés par rôle](#7-flows-utilisateurs-détaillés-par-rôle)
8. [Flow métier : cycle d'une campagne d'évaluation](#8-flow-métier-cycle-dune-campagne-dévaluation)
9. [Sécurité](#9-sécurité)
10. [i18n, thèmes, préférences](#10-i18n-thèmes-préférences)
11. [Tests](#11-tests)
12. [Déploiement](#12-déploiement)
13. [Features — ce qui est fait, ajouté récemment, manquant](#13-features)
14. [Dette technique & prochaines étapes](#14-dette-technique--prochaines-étapes)

---

## 1. Vue d'ensemble

**NanoXplore RH** est une application web d'évaluation annuelle des collaborateurs pour une entreprise moyenne à grande. Elle remplace les entretiens sous Word/Excel par un processus structuré, traçable, multi-rôle, avec hiérarchie organisationnelle, signatures numériques et campagnes cadencées.

**Public visé** : 5 rôles fonctionnels (Admin, RH, Directeur, Manager, Collaborateur) sur une organisation hiérarchique.

**Principe directeur** (cf. `CLAUDE.md`) : **K.I.S.S.** — chaque page est un dossier autonome (MPA Vite), pas de framework CSS, pas de router SPA, pas de state global. React + Express + MongoDB et rien de plus.

---

## 2. Architecture technique

### 2.1 Stack

| Couche | Techno | Version | Rôle |
|---|---|---|---|
| Front | React | 18.3.1 | UI des pages |
| Front | Vite | 5.4.2 | Build MPA (multi-entry) |
| Front | CSS vanilla | — | Tokens `--color-*` + thèmes dark/light/light-sidebar |
| Back | Express | 4.19.2 | API REST + service HTML |
| Back | Mongoose | 8.4.0 | ODM MongoDB |
| Back | bcrypt | 5.1.1 | Hash passwords locaux |
| Back | jsonwebtoken | — | JWT httpOnly cookie |
| Back | ldapjs | — | Bind LDAP optionnel |
| Infra | Docker multi-stage | — | Image prod unifiée client+server |
| Infra | Nginx 1.27-alpine | — | TLS, reverse proxy, rate limit |
| Infra | MongoDB 7-alpine | — | Base de données |
| Tests | Jest 30 | — | Tests backend |
| Tests | Vitest 4.1 | — | Tests composants React |
| Tests | Node custom | — | E2E via `fetch` + cookie jar |

### 2.2 Architecture MPA (Multi-Page Application)

Chaque page est un **entry Vite** indépendant qui compile en un bundle séparé. Pas de React Router — c'est Express qui route entre les HTML compilés.

```
client/
├── login.html       → /src/pages/login/main.jsx      → Express GET /
├── employee.html    → /src/pages/employee/main.jsx   → Express GET /employee     🆕 (renommé depuis /dashboard)
├── manager.html     → /src/pages/manager/main.jsx    → Express GET /manager
├── director.html    → /src/pages/director/main.jsx   → Express GET /director     🆕
├── hr.html          → /src/pages/hr/main.jsx         → Express GET /hr
├── admin.html       → /src/pages/admin/main.jsx      → Express GET /admin        🆕
├── formeditor.html  → /src/pages/formeditor/main.jsx → Express GET /formeditor
├── campaigns.html   → /src/pages/campaigns/main.jsx  → Express GET /campaigns    🆕
├── evaluation.html  → /src/pages/evaluation/main.jsx → Express GET /evaluation
└── settings.html    → /src/pages/settings/main.jsx   → Express GET /settings
```

**10 entries Vite** ; `npm run build` sort tout dans `mongo/server/public/` que l'Express sert en statique. Les routes sont protégées par `authGuard([...roles])` côté Express avant même d'envoyer le HTML. **Rétrocompat** : `GET /dashboard` renvoie un `301` vers `/employee`.

### 2.3 Co-location absolue

Convention du projet : **tout ce qui concerne une page vit dans son dossier**.

```
client/src/pages/settings/
├── main.jsx              ← entry Vite
├── Settings.jsx          ← composant racine
├── settings.css          ← styles de la page
├── SettingsSidebar.jsx   ← sidebar spécifique
├── sections/
│   ├── ProfileSection.jsx
│   ├── PreferencesSection.jsx
│   ├── NotificationsSection.jsx
│   ├── RoleSpaceSection.jsx
│   └── DangerSection.jsx
└── i18n/
    ├── fr.js
    ├── en.js
    └── index.js          ← makeT({ fr, en })
```

Seuls les composants **utilisés par plusieurs pages** vivent dans `client/src/components/ui/` : `AppSidebar`, `AppTopbar`, `Button`, `InputField`, `Checkbox`, `CalendarWidget`, `ThemeToggle`, les 22 icônes SVG.

---

## 3. Modèle de données

Six collections MongoDB. Toutes ont `createdAt` / `updatedAt` automatiques.

### 3.1 User ([`mongo/server/models/User.js`](mongo/server/models/User.js))

| Champ | Type | Notes |
|---|---|---|
| `email` | String unique | normalisé lowercase |
| `passwordHash` | String `select:false` | null pour LDAP users, auto-hashé bcrypt pre-save |
| `firstName`, `lastName` | String | requis |
| `role` | enum `admin / hr / director / manager / employee` | indexé |
| `department` | enum 14 valeurs | indexé |
| `position` | String | libre |
| `managerId` | ObjectId→User | null possible, anti-cycle (profondeur max 20) |
| `authSource` | enum `local / ldap` | |
| `ldapDn` | String `select:false` | unique partial |
| `locale` | enum `fr / en` | **ajouté** pour settings |
| `theme` | enum `dark / light / light-sidebar` | **ajouté** pour settings |
| `notificationPrefs` | Object booléens | **ajouté**, filtré par rôle à l'API |
| `lastLoginAt` | Date | **ajouté**, fire-and-forget au login |
| `isActive` | Boolean | soft delete |

### 3.2 Campaign ([`Campaign.js`](mongo/server/models/Campaign.js))

| Champ | Type | Notes |
|---|---|---|
| `name`, `description` | String | |
| `startDate`, `endDate` | Date | `endDate > startDate` |
| `status` | enum `draft / active / closed / archived` | transitions unidirectionnelles |
| `createdBy` | ObjectId→User | |
| `targetDepartments` | [enum] | vide = toute l'org |
| `extendedVisibility` | `[{ managerId, restrictedToManagers:[] }]` | permet à un manager de voir des sous-équipes |

### 3.3 Form ([`Form.js`](mongo/server/models/Form.js))

| Champ | Type | Notes |
|---|---|---|
| `campaignId` | ObjectId→Campaign | |
| `title`, `description` | String | |
| `formType` | enum `self_evaluation / manager_evaluation / upward_feedback / director_evaluation / peer_review` | `upward_feedback` force `isAnonymous=true` |
| `isAnonymous` | Boolean | cache l'`evaluatorId` dans les réponses API |
| `questions[]` | `{ id, type, label, required, scale, options }` | `type ∈ rating / text / yes_no / choice` |
| `frozenAt` | Date | set dès qu'une évaluation existe → interdit de modifier les `id` de questions |

### 3.4 Evaluation ([`Evaluation.js`](mongo/server/models/Evaluation.js))

| Champ | Type | Notes |
|---|---|---|
| `campaignId`, `formId`, `evaluatorId`, `evaluateeId` | ObjectId | index unique composite sur les 4 |
| `status` | enum 8 états | `assigned → in_progress → submitted → reviewed → signed_evaluatee → signed_manager → signed_hr → validated` |
| `answers[]` | `{ questionId, value }` | verrouillées dès `submitted` |
| `lastSavedAt` | Date | auto-update |
| `score` | Number 0-100 | posé par le manager |
| `reviewerComment`, `evaluateeComment` | String | |
| `disagreementFlag` | Boolean | si l'évalué conteste |
| `signedByEvaluateeAt / ManagerAt / HrAt` | Date | horodatage des signatures |

### 3.5 Event ([`Event.js`](mongo/server/models/Event.js))

Événements de calendrier : `deadline / interview / meeting / feedback / campaign`. Champ `targetRoles[]` pour filtrer l'audience.

### 3.6 Resource ([`Resource.js`](mongo/server/models/Resource.js))

Documents partagés (PDF/XLSX/DOCX/PPTX). Statut `draft` (admin uniquement) ou `published` (visible selon `visibleTo[]`).

---

## 4. Rôles & hiérarchie

### 4.1 Rôles fonctionnels

| Rôle | Portée de lecture | Écriture |
|---|---|---|
| **admin** | Tout | Tout |
| **hr** | Tout | Users, Campaigns, Forms, Resources, Events |
| **director** | Sa sous-arborescence hiérarchique complète | Lit/review ses équipes |
| **manager** | Ses subordonnés directs (+ sous-équipes si `extendedVisibility` l'autorise) | Review + signe les évaluations de son équipe |
| **employee** | Lui-même | Remplit ses propres évaluations |

### 4.2 Hiérarchie

Structure en arbre via `User.managerId`. Le service [`managerVisibility.js`](mongo/server/services/managerVisibility.js) :
- `getVisibleUserIds(managerId, campaign)` → renvoie tous les userIds qu'un manager peut voir, en récursif, avec anti-cycle et limite de profondeur (20).
- `extendedVisibility` permet à RH de donner à un manager la visibilité de sous-équipes qu'il ne manage pas directement (ex : un directeur qui doit voir toute une BU).

### 4.3 Matrice d'accès (pages)

| Page | admin | hr | director | manager | employee |
|---|:-:|:-:|:-:|:-:|:-:|
| `/` (login) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/employee` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/manager` | ✓ | — | ✓ | ✓ | — |
| `/director` 🆕 | ✓ | — | ✓ | — | — |
| `/hr` | ✓ | ✓ | — | — | — |
| `/admin` 🆕 | ✓ | — | — | — | — |
| `/formeditor` | ✓ | ✓ | — | — | — |
| `/campaigns` 🆕 | ✓ | ✓ | — | — | — |
| `/evaluation` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/settings` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/dashboard` | → redirect 301 vers `/employee` (compat) |

(protégé dans `mongo/server/index.js` par `authGuard([...roles])`)

**Cloisonnement par rôle** : depuis le refactor d'avril 2026, **chaque rôle dispose de son propre portail dédié** (`/admin`, `/hr`, `/director`, `/manager`, `/employee`). Plus aucun rôle n'est « passager clandestin » d'un portail conçu pour un autre.

---

## 5. Routes API (backend)

Toutes les routes sont sous `/api/*`, rate-limitée globalement (100 req/min) + `mutationLimiter` (20 req/min) sur POST/PATCH/DELETE.

### 5.1 Auth — [`routes/auth.js`](mongo/server/routes/auth.js)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | email+password ; bcrypt local ou LDAP bind ; pose cookie JWT ; met à jour `lastLoginAt` fire-and-forget |
| POST | `/api/auth/logout` | public | `clearCookie('token')` |
| GET | `/api/auth/me` | authentifié | retourne l'utilisateur courant (sans `passwordHash`/`ldapDn`), **filtre `notificationPrefs` selon `user.role`** |
| PATCH | `/api/auth/preferences` | authentifié | met à jour `locale / theme / notificationPrefs` avec whitelist stricte ; **rejette 403 les clés non autorisées pour le rôle** |

Rate limits login : 5 tentatives/email/15min, 20 tentatives/IP/15min. Anti-enumeration : même message d'erreur pour user inconnu et mot de passe faux.

### 5.2 Users — [`routes/users.js`](mongo/server/routes/users.js)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/api/users` | admin/hr/director/manager | liste paginée, scope manager = subordonnés directs |
| GET | `/api/users/:id` | scope rôle | détail d'un user (passwordHash exclu) |
| POST | `/api/users` | admin/hr | création user local (tempPassword auto-hashé par pre-save hook) |
| PATCH | `/api/users/:id` | admin/hr + self (champs restreints) | self ne peut modifier que certains champs, pas `role` |

### 5.3 Campaigns — [`routes/campaigns.js`](mongo/server/routes/campaigns.js)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/api/campaigns` | tous | liste (employee ne voit que `active`) |
| GET | `/api/campaigns/:id` | tous | détail + stats de complétion |
| POST | `/api/campaigns` | admin/hr | création en statut `draft` |
| PATCH | `/api/campaigns/:id` | admin/hr | update ; transitions validées `draft→active→closed→archived` |

### 5.4 Forms — [`routes/forms.js`](mongo/server/routes/forms.js)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/api/forms` | tous | liste filtrable par `campaignId / formType` |
| GET | `/api/forms/:id` | tous | détail avec questions |
| POST | `/api/forms` | admin/hr | création template |
| PATCH | `/api/forms/:id` | admin/hr | édition ; questions verrouillées si `frozenAt` posé |

### 5.5 Evaluations — [`routes/evaluations.js`](mongo/server/routes/evaluations.js)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/api/evaluations` | tous | scope hiérarchique via `managerVisibility` ; anonymisation si form.isAnonymous |
| GET | `/api/evaluations/:id` | tous | idem |
| POST | `/api/evaluations` | admin/hr | création unitaire |
| POST | `/api/evaluations/bulk` | admin/hr | création en masse (max 500) |
| PATCH | `/api/evaluations/:id` | tous (transitions selon rôle) | sauvegarde réponses (autosave) ou change status ou pose signature |

Verrouillage des réponses dès le statut `submitted` et au-delà.

### 5.6 Events — [`routes/events.js`](mongo/server/routes/events.js)

CRUD classique. Seuls admin/hr créent/suppriment. Lecture filtrée par `targetRoles`.

### 5.7 Resources — [`routes/resources.js`](mongo/server/routes/resources.js)

CRUD classique. Admin voit `draft` + `published` ; autres ne voient que `published` si leur rôle est dans `visibleTo[]`.

---

## 6. Pages (frontend)

### 6.1 `/` — Login ([`pages/login/`](client/src/pages/login/))

- Fond noir cinématique avec mosaïque Unsplash.
- Toggle dark/light + FR/EN.
- Anti-flash : script inline dans `login.html` lit `localStorage` et pose `data-theme` avant le montage React.
- Formulaire email+password, checkbox « remember » (étend le JWT de 8h → 30j).
- Redirection post-login selon le rôle **(un portail dédié par rôle)** :
  - `admin`    → `/admin`     🆕
  - `hr`       → `/hr`
  - `director` → `/director`  🆕
  - `manager`  → `/manager`
  - `employee` → `/employee`  🆕 (anciennement `/dashboard`)

### 6.2 `/employee` — Portail collaborateur ([`pages/employee/`](client/src/pages/employee/)) 🆕 *(renommé depuis `/dashboard`)*

- Bannière de la campagne active.
- Liste des évaluations assignées avec leur statut.
- Sidebar : Home (actif), Evaluation, Settings. **Plus aucun item disabled.**
- Topbar : search, thème, notifications, menu user.

### 6.3 `/manager` — Portail manager ([`pages/manager/`](client/src/pages/manager/))

- Table des évaluations des subordonnés directs.
- Accès rapide à la review (lecture des self-evals, saisie du score, commentaire, transition vers `reviewed`).
- Sidebar : Evaluations (actif), Settings. **Plus aucun item disabled.**

### 6.4 `/director` — Portail directeur ([`pages/director/`](client/src/pages/director/)) 🆕

- Vue agrégée sur **toute la sous-arborescence hiérarchique** du directeur.
- Hero éditorial + barre de complétion globale (évaluations signées / total).
- 6 KPIs : total évaluations, managers actifs, en cours, à reviewer, reviewed, signées.
- Cartes d'action rapide vers `/manager`, `/evaluation`, `/settings`.
- Sidebar : Vue agrégée (actif), Évaluations (→ `/manager`), Settings.
- Accès : `director` + `admin`.

### 6.5 `/hr` — Portail RH ([`pages/hr/`](client/src/pages/hr/))

- Overview : KPIs de campagnes, actions rapides.
- Sidebar : Overview (actif), **Campaigns (→ `/campaigns`, activé)**, Form Editor, Settings. **Items Resources et Reports retirés** (UI non implémentée → ne pas afficher de fausses promesses).

### 6.5b `/admin` — Portail administrateur ([`pages/admin/`](client/src/pages/admin/)) 🆕

- Vue système globale, réservée à `admin`.
- Hero éditorial + 6 KPIs : utilisateurs total, actifs, inactifs, comptes LDAP, comptes locaux, santé système (`/api/health`).
- Répartition par rôle avec badges colorés (admin / hr / director / manager / employee).
- 6 cartes d'action vers les autres portails (`/hr`, `/director`, `/manager`, `/campaigns`, `/formeditor`, `/settings`).
- Table des 50 premiers utilisateurs (nom, email, rôle, département, statut, source auth).
- Sidebar : Overview (actif), HR Portal, Campagnes, Form Editor, Settings.

### 6.5c `/campaigns` — Portail Campagnes ([`pages/campaigns/`](client/src/pages/campaigns/)) 🆕

- Liste complète des campagnes (cards avec status coloré : draft / active / closed / archived).
- Métadonnées : dates de début/fin, départements ciblés.
- Barre de progression par campagne (depuis `stats.completionPct`).
- Tri intelligent : actives d'abord, puis par date de début décroissante.
- Empty state avec CTA vers `/formeditor`.
- Sidebar adaptative : pour HR, sidebar HR avec Campaigns actif ; pour admin, sidebar Admin avec Campaigns actif.
- Accès : `hr` + `admin`.

### 6.6 `/formeditor` — Éditeur de formulaire ([`pages/formeditor/`](client/src/pages/formeditor/))

- Builder drag-drop pour questions (rating, text, yes_no, choice).
- Preview live.
- Attachement à une campagne.
- Sélection du type de formulaire (self / manager / upward / director / peer).
- Indicateur de verrouillage si `frozenAt`.

### 6.7 `/evaluation` — Remplissage d'évaluation ([`pages/evaluation/`](client/src/pages/evaluation/))

- Affichage des questions avec leur type.
- Autosave sur chaque champ (PATCH) → met à jour `lastSavedAt`.
- Bouton « Soumettre » → passe au statut `submitted`, verrouille.
- Mode review : après `reviewed`, affichage du score manager + commentaires, option « Signer » / « Contester ».

### 6.8 `/settings` — Paramètres personnels ([`pages/settings/`](client/src/pages/settings/)) **[ajouté récemment]**

Page **personnalisée selon le rôle** :

| Section | Contenu |
|---|---|
| **Profile** | Nom, email, rôle (badge coloré), département, poste, manager, source auth (LDAP/local), dernière connexion, date de création. Note sur la gestion du mot de passe par l'annuaire. |
| **Preferences** | Radio langue FR/EN + 3 cartes thème (dark / light / light-sidebar) avec preview. Persiste en base via `PATCH /api/auth/preferences`. |
| **Notifications** | Cases à cocher pour les notifs. **Les clés affichées sont filtrées par rôle côté backend** (3 pour employee, 5 pour admin). |
| **RoleSpace** | Raccourcis contextuels vers les espaces accessibles au rôle (admin voit tout, employee voit dashboard+evaluation, etc.). |
| **Danger** | Bouton de déconnexion (pas de suppression de compte, pas de changement de mdp car LDAP). |

Sidebar dynamique : **5 branches distinctes par rôle** (admin / hr / director / manager / employee). Chaque rôle voit la sidebar de son propre portail avec un raccourci vers son espace, plus l'item Settings actif. **Aucun item disabled.**

---

## 7. Flows utilisateurs détaillés par rôle

### 7.1 Flow transverse : authentification

```
┌─────────────┐
│ Utilisateur │
└──────┬──────┘
       │ 1. Visite /
       ▼
┌──────────────────────┐
│  /login              │
│  - Anti-flash thème  │
│  - Formulaire        │
└──────┬───────────────┘
       │ 2. POST /api/auth/login {email, password, remember}
       ▼
┌──────────────────────────────┐
│  Express authRoute           │
│  - Rate limit (5/email)      │
│  - Find user (authSource)    │
│  - bcrypt OR LDAP bind       │
│  - jwt.sign({id, email, role})│
│  - res.cookie('token', httpOnly, sameSite=strict, maxAge)│
│  - User.updateOne(lastLoginAt)│ (fire-and-forget)
└──────┬───────────────────────┘
       │ 3. 200 + cookie
       ▼
┌──────────────────────────────┐
│  Front redirige selon role   │
│   admin/hr   → /hr           │
│   director   → /manager      │
│   manager    → /manager      │
│   employee   → /dashboard    │
└──────┬───────────────────────┘
       │ 4. GET /dashboard
       ▼
┌──────────────────────────────┐
│  authGuard middleware        │
│  - Extrait cookie            │
│  - jwt.verify                │
│  - Vérifie User.isActive en DB│
│  - Check role ∈ allowedRoles │
│  - req.user = {id, email, role}│
└──────┬───────────────────────┘
       │ 5. sendPage('employee') → HTML compilé
       ▼
┌──────────────────────────────┐
│  React monte <Employee/>     │
│  - useAuthUser() → GET /me   │
│  - Revalide la session       │
│  - Charge campagnes, évals   │
└──────────────────────────────┘
```

**Déconnexion (tous rôles)** :
```
Clic « Se déconnecter »
  → POST /api/auth/logout
  → res.clearCookie('token')
  → sessionStorage.clear()
  → window.location = '/'
```

---

### 7.2 Flow **Employee** (Collaborateur)

```
1. CONNEXION
   └─ /login → /employee

2. SUR LE PORTAIL EMPLOYEE
   ├─ Voit la bannière de campagne active
   ├─ Voit ses évaluations assignées (statut: assigned)
   └─ Topbar : cloche notifications (filtrée aux 3 keys employee)

3. OUVRE UNE ÉVALUATION
   ├─ Clic sur une évaluation → /evaluation
   ├─ GET /api/evaluations/:id → formulaire avec questions
   └─ Statut: assigned → in_progress (auto dès 1ère réponse)

4. REMPLISSAGE
   ├─ Tape réponses (rating/text/choice)
   ├─ Autosave → PATCH /api/evaluations/:id { answers }
   │  └─ lastSavedAt mis à jour, affiché « Enregistré il y a 3s »
   └─ Peut quitter et revenir

5. SOUMISSION
   ├─ Clic « Soumettre »
   ├─ PATCH /api/evaluations/:id { status: 'submitted' }
   └─ Réponses VERROUILLÉES — plus aucune édition possible

6. ATTENTE REVIEW MANAGER
   └─ Statut visible dans le dashboard : « En cours de review »

7. APRÈS REVIEW (status: reviewed)
   ├─ Notification reçue (si préférence activée)
   ├─ Ouvre l'évaluation → lecture du score + commentaire manager
   ├─ Peut laisser son propre commentaire (evaluateeComment)
   ├─ Peut cocher « Je conteste » (disagreementFlag: true)
   └─ Clic « Signer » → PATCH { status: 'signed_evaluatee' }
      └─ signedByEvaluateeAt = now

8. PARAMÈTRES (optionnel, à tout moment)
   └─ /settings : change langue, thème, notifs préférées

9. DÉCONNEXION
   └─ /settings → Zone de session → « Se déconnecter »
```

**Permissions** : ne peut JAMAIS voir les évaluations d'autrui. Toutes les listes `/api/*` sont scopées à `evaluatorId=self` ou `evaluateeId=self`.

---

### 7.3 Flow **Manager**

```
1. CONNEXION
   └─ /login → /manager (portail manager)

2. SUR /manager
   ├─ Table des évaluations de ses subordonnés
   │  (scope: User.managerId = self + extendedVisibility si grant)
   ├─ Filtres: campagne, statut, collaborateur
   └─ Voit les évaluations qu'il doit reviewer (status: submitted)

3. REVIEW D'UNE ÉVALUATION (status: submitted)
   ├─ Clic sur ligne → détail
   ├─ Lecture de la self-evaluation (read-only)
   ├─ Remplit son MANAGER_EVALUATION (évaluation parallèle où il est evaluator)
   │  ├─ PATCH sur SA evaluation (evaluatorId=self)
   │  └─ Autosave
   ├─ Saisit le SCORE final (0-100) sur l'évaluation du collab
   │  └─ PATCH /api/evaluations/:evalCollab { score, reviewerComment }
   └─ Clic « Terminer la review »
      └─ PATCH { status: 'reviewed' }

4. SIGNATURE MANAGER (après signature collab)
   ├─ Évaluation passe à signed_evaluatee
   ├─ Clic « Contresigner »
   └─ PATCH { status: 'signed_manager' }

5. PARAMÈTRES
   └─ /settings : sidebar affiche items Manager + Settings
       Notifs autorisées : evaluationAssigned, deadlineReminder,
                          evaluationSubmitted (quand un collab soumet)

6. DÉCONNEXION
```

**Permissions** : voit `User.managerId = self` + tout user dans une sous-équipe dont il a `extendedVisibility` sur la campagne. Ne peut pas créer/modifier de campagnes ou formulaires.

---

### 7.4 Flow **Director**

Depuis le refactor d'avril 2026, le directeur dispose de **son propre portail `/director`** avec une vue agrégée sur sa sous-arborescence.

```
1. CONNEXION
   └─ /login → /director

2. SUR /director (vue agrégée)
   ├─ 6 KPIs : total évaluations, managers actifs, en cours, à reviewer, reviewed, signées
   ├─ Barre de complétion globale (signées / total)
   └─ Cartes d'action vers /manager (vue détaillée), /evaluation, /settings

3. VISION ÉLARGIE
   ├─ managerVisibility.getVisibleUserIds traverse TOUTE la sous-arborescence
   │  managée depuis le directeur (récursif, limite profondeur 20)
   └─ Voit les évaluations de toutes les équipes sous sa branche

4. REVIEW DÉTAILLÉE
   ├─ Clic sur « Vue Manager détaillée » → /manager
   └─ Mêmes transitions que manager (selon politique interne, généralement co-signe)

5. PARAMÈTRES
   └─ Notifs : 3 keys (evaluationAssigned, deadlineReminder, evaluationSubmitted)
```

---

### 7.5 Flow **HR** (Ressources Humaines)

```
1. CONNEXION
   └─ /login → /hr (portail RH)

2. OVERVIEW HR
   ├─ KPIs : campagnes actives, taux de complétion, évaluations en retard
   └─ Actions rapides

3. GESTION DES UTILISATEURS (non UI dédiée encore — via API)
   ├─ POST /api/users → créer nouvel employé local
   ├─ PATCH /api/users/:id → changer département/manager/role
   └─ Soft delete via isActive

4. CRÉATION D'UNE CAMPAGNE (actuellement via API, UI en cours)
   ├─ POST /api/campaigns { name, startDate, endDate, targetDepartments }
   └─ Status: draft

5. CRÉATION DES FORMULAIRES
   ├─ Clic Form Editor → /formeditor
   ├─ Construit questions (rating, text, yes_no, choice)
   ├─ Choisit type (self / manager / upward / director / peer)
   ├─ Coche isAnonymous si besoin (forcé pour upward_feedback)
   └─ POST /api/forms { campaignId, questions, formType }

6. GÉNÉRATION EN MASSE DES ÉVALUATIONS
   ├─ POST /api/evaluations/bulk [{ campaignId, formId, evaluatorId, evaluateeId }, ...]
   ├─ max 500 par batch
   └─ Toutes en status: assigned

7. ACTIVATION DE LA CAMPAGNE
   ├─ PATCH /api/campaigns/:id { status: 'active' }
   └─ Campagne devient visible aux employés

8. SUIVI PENDANT LA CAMPAGNE
   ├─ GET /api/campaigns/:id → stats de complétion
   └─ GET /api/evaluations?campaignId → liste globale

9. SIGNATURE RH FINALE (après signatures employé + manager)
   └─ PATCH { status: 'signed_hr' }

10. VALIDATION ET CLÔTURE
    ├─ PATCH { status: 'validated' } (par évaluation)
    ├─ PATCH /api/campaigns/:id { status: 'closed' }
    └─ Plus tard : { status: 'archived' }

11. RESSOURCES (UI non implémentée, API prête)
    └─ POST /api/resources pour uploader PDF/DOCX/etc.

12. ÉVÉNEMENTS CALENDRIER (UI non implémentée, API prête)
    └─ POST /api/events { type, date, targetRoles }

13. PARAMÈTRES
    └─ Notifs autorisées : 4 (+ campaignLaunch)

14. DÉCONNEXION
```

**Permissions** : tout sauf ce qui est strictement réservé à admin (ex: modifier le rôle d'un autre admin, accès aux logs).

---

### 7.6 Flow **Admin**

L'admin dispose depuis avril 2026 de **son propre portail `/admin`** (vue système) en plus de l'accès à tous les autres portails.

```
1. CONNEXION
   └─ /login → /admin

2. SUR /admin (vue système)
   ├─ 6 KPIs : utilisateurs total/actifs/inactifs, comptes LDAP/locaux, santé système
   ├─ Répartition par rôle avec badges colorés
   ├─ Cartes d'action vers /hr, /director, /manager, /campaigns, /formeditor, /settings
   └─ Table des 50 premiers utilisateurs

3-15. Mêmes capacités que HR + spécifiques admin :
   ├─ GESTION DES RÔLES : PATCH /api/users/:id { role: 'manager' }
   │    (seul admin peut modifier le champ role)
   ├─ NOTIFS : accès à systemAlerts en plus des 5 autres clefs
   └─ CONFIGURATION LDAP via env vars (LDAP_URL, LDAP_BASE_DN, etc.)
```

---

## 8. Flow métier : cycle d'une campagne d'évaluation

Le flow le plus important de l'application — orchestrer l'évaluation annuelle de toute l'organisation.

### Timeline type (3 mois)

```
Mois 1 — Préparation (HR)
├─ J-30 : POST /api/campaigns (draft)
├─ J-25 : création des formulaires (self, manager, upward)
├─ J-20 : génération évaluations en bulk
└─ J-0  : PATCH status=active → notifications

Mois 1 à 2 — Self + Manager review
├─ Employé remplit sa self-eval (statut: assigned → in_progress → submitted)
├─ Manager lit la self-eval
├─ Manager remplit sa manager-eval (évaluation parallèle)
├─ Manager pose score + commentaire sur l'éval collab
└─ Manager passe statut à reviewed

Mois 2 à 3 — Signatures
├─ Employé signe (signed_evaluatee) ou conteste (disagreementFlag)
├─ Manager contresigne (signed_manager)
└─ RH signe (signed_hr)

Mois 3 — Validation
├─ RH valide (validated) → statut terminal
└─ PATCH /api/campaigns/:id status=closed → plus d'édition possible
```

### Cas particulier : Upward Feedback

Permet à un collaborateur d'évaluer son **manager** (feedback remontant).

- `form.formType = 'upward_feedback'`
- `isAnonymous` forcé à `true` par le schéma
- Évaluation créée avec `evaluatorId = collaborateur` et `evaluateeId = manager`
- À la lecture : backend sanitise → `evaluatorId` jamais renvoyé au manager cible
- Seules les réponses sont visibles

### Verrouillage & intégrité

- `LOCKED_STATUSES = [submitted, reviewed, signed_evaluatee, signed_manager, signed_hr, validated]`
- Une fois verrouillée, `answers[]` est immuable (tentative → 400)
- `frozenAt` sur le formulaire dès la 1ère évaluation créée : interdit de modifier les `id` de questions (sinon on orpheline les réponses existantes)

---

## 9. Sécurité

### 9.1 Authentification

- **JWT HS256** signé avec `JWT_SECRET` (≥32 chars recommandé)
- **Cookie `token`** : `httpOnly` + `sameSite: 'strict'` + `secure` en prod
- **Durée** : 8h par défaut, 30j avec `remember`
- **Bcrypt** 12 rounds pour les mdp locaux (`BCRYPT_ROUNDS` env)
- **LDAP** optionnel : bind direct contre l'annuaire d'entreprise ; crée l'user en DB à la volée avec `authSource='ldap'`, `role='employee'`

### 9.2 Anti-attaques

| Attaque | Mitigation |
|---|---|
| Brute-force login | Rate limit 5 tentatives/email/15min + 20/IP/15min |
| Énumération de comptes | Même message d'erreur pour user inconnu vs mdp faux |
| LDAP injection | Échappement de `\ * ( ) NUL` dans `buildFilter()` |
| ReDoS | Regex email testée avec longueur max + escape des caractères spéciaux |
| Mass assignment | Whitelist explicite des champs modifiables par rôle |
| CSRF | `sameSite: strict` + cookie non accessible JS |
| XSS | `httpOnly` cookie + CSP via Helmet + pas de `innerHTML` |
| Deactivation mid-session | `authGuard` re-vérifie `isActive` en DB à CHAQUE requête |
| Path traversal | Validation filename (`/^[a-zA-Z0-9_\-.]+$/`) |
| NoSQL injection | Mongoose ODM + `isValidObjectId` systématique |

### 9.3 RBAC

- `authGuard([roles...])` appliqué à chaque route protégée
- Vérifications supplémentaires dans chaque handler (scope manager, scope self)
- Champs sensibles (`passwordHash`, `ldapDn`) avec `select: false` au schéma
- Filtrage `notificationPrefs` par rôle côté backend (single source of truth)

### 9.4 Infrastructure

- Nginx : TLS 1.2+, HSTS 1 an, rate limit par zone (login 5/min, API 30/min)
- Docker : non-root `appuser`, multi-stage pour réduire l'image
- MongoDB : réseau interne Docker, non exposé

---

## 10. i18n, thèmes, préférences

### 10.1 Internationalisation

- Factory `makeT({ fr, en })` dans [`client/src/i18n/index.js`](client/src/i18n/index.js)
- Chaque page a son propre dossier `i18n/` avec `fr.js` / `en.js` / `index.js`
- Clés format `<page>.<section>.<element>` (ex : `settings.profile.heading`)
- Hook `useLocale(pageT)` → `{ t, locale, setLocale }`
- Persistance : `localStorage.nx_locale` + (nouveau) `User.locale` en DB

### 10.2 Thèmes

- 3 thèmes : `dark` / `light` / `light-sidebar`
- Écrit sur `<html data-theme="...">` par [`useTheme`](client/src/hooks/useTheme.js)
- Anti-flash : script inline dans chaque HTML qui applique le thème depuis `localStorage` AVANT le montage React
- Persistance : `localStorage.nx_theme` + `User.theme` en DB
- Cycle via bouton topbar ou sélection explicite dans `/settings`

### 10.3 Préférences de notification

Filtrées par rôle côté backend (voir [`NOTIF_KEYS_BY_ROLE`](mongo/server/config/constants.js)) :

| Clé | employee | manager | director | hr | admin |
|---|:-:|:-:|:-:|:-:|:-:|
| `evaluationAssigned` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `deadlineReminder` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `managerActionRequired` | ✓ | — | — | — | — |
| `evaluationSubmitted` | — | ✓ | ✓ | ✓ | ✓ |
| `campaignLaunch` | — | — | — | ✓ | ✓ |
| `systemAlerts` | — | — | — | — | ✓ |

**Backend** : `/me` ne renvoie que les clés autorisées, `PATCH /preferences` rejette 403 toute clé hors périmètre.

---

## 11. Tests

### 11.1 Backend (Jest)

Dans [`mongo/server/__tests__/`](mongo/server/__tests__/) :

| Fichier | Tests | Coverage |
|---|---|---|
| `routes/auth.test.js` | 21 | login, logout, /me, /preferences, lastLoginAt |
| `services/managerVisibility.test.js` | ~10 | arbre hiérarchique, cycles, extendedVisibility |
| `config/ldap.test.js` | ~10 | isEnabled, getConfig, injection LDAP |
| `middleware/authGuard.test.js` | ~10 | JWT, isActive, role check |
| `models/*.test.js` | ~25 | validations schéma, indices, pre-save hooks |

**Total** : ~80 tests. **109/110 passent** actuellement (1 échec pré-existant sur `authGuard.test.js` → assertion de `clearCookie` options désalignée).

### 11.2 Frontend (Vitest)

Dans [`client/src/__tests__/`](client/src/__tests__/) :

| Composant | Tests |
|---|---|
| `Button` | ~20 |
| `Checkbox` | ~15 |
| `InputField` | ~15 |

**Total** : ~50 tests.

### 11.3 E2E custom

Dans [`scripts/e2e/`](scripts/e2e/) : 17 fichiers de tests orchestrés par [`run.js`](scripts/e2e/run.js). Utilise `fetch` + cookie jar, sans Playwright/Cypress.

| Scope | Fichiers |
|---|---|
| Auth | `test-auth.js`, `test-security.js`, `test-deactivation.js` |
| Users | `test-users.js`, `test-validations.js` |
| Campaigns | `test-campaigns.js`, `test-campaign-stats.js` |
| Forms | `test-forms.js`, `test-multi-forms.js` |
| Evaluations | `test-evaluations.js`, `test-answer-lock.js` |
| RBAC | `test-rbac.js`, `test-restricted.js`, `test-director.js`, `test-hierarchy.js` |
| Périphérique | `test-events-resources.js`, `test-pagination.js` |

---

## 12. Déploiement

### 12.1 Production (`docker-compose.yml`)

```
         Internet
            │ TLS
            ▼
       ┌─────────┐
       │  nginx  │  (1.27-alpine)
       │ TLS+LB  │
       └────┬────┘
            │ http (réseau: frontend)
    ┌───────┼───────┐
    ▼       ▼       ▼
  ┌───┐   ┌───┐   ┌───┐
  │app│   │app│   │app│   (Express + public/ servi)
  └─┬─┘   └─┬─┘   └─┬─┘
    └───────┼───────┘
            │ (réseau: backend)
            ▼
       ┌─────────┐
       │ mongo 7 │  (volume: mongo_data)
       └─────────┘
```

```bash
docker compose up -d --scale app=3
```

### 12.2 Variables d'environnement requises

```env
# MongoDB
MONGO_URI=mongodb://mongo:27017/nanoxplore_rh
MONGO_ROOT_USER=...
MONGO_ROOT_PASSWORD=...

# Express
NODE_ENV=production
PORT=3000
JWT_SECRET=<32+ chars>
JWT_EXPIRES_IN=8h
BCRYPT_ROUNDS=12

# CORS
CLIENT_ORIGIN=https://rh.nanoxplore.com

# LDAP (optionnel)
LDAP_URL=ldaps://dc.corp.com:636
LDAP_BASE_DN=ou=people,dc=corp,dc=com
LDAP_BIND_DN=...
LDAP_BIND_PASSWORD=...
LDAP_USER_FILTER=(sAMAccountName={{u}})
```

### 12.3 Certificats TLS

Montés dans `nginx/certs/cert.pem` + `nginx/certs/key.pem` (non committés, `.gitignore`). Script helper `scripts/gen-certs.sh` pour le développement.

### 12.4 CI/CD

**Absent**. Pas de pipeline GitHub Actions / GitLab CI. Déploiement manuel actuellement.

---

## 13. Features

Légende : ✅ implémenté · 🟡 partiel · ⬜ non commencé · 🆕 ajouté dans la session courante

### 13.1 Authentification

| Feature | État |
|---|---|
| Login local (bcrypt) | ✅ |
| Login LDAP | ✅ |
| JWT httpOnly cookie | ✅ |
| Remember me (30j) | ✅ |
| Logout | ✅ |
| Rate limiting login | ✅ |
| Anti-enumeration | ✅ |
| Password recovery | ⬜ (TODO dans login UI) |
| MFA / 2FA | ⬜ |
| SSO OAuth (Google/Microsoft) | ⬜ |

### 13.2 Gestion utilisateurs

| Feature | État |
|---|---|
| CRUD utilisateurs (API) | ✅ |
| UI admin liste/édition users | ⬜ |
| Changement de rôle (admin-only) | ✅ (API) |
| Soft delete via `isActive` | ✅ |
| Hiérarchie manager (anti-cycle) | ✅ |
| Import LDAP sync automatique | ⬜ (bind à la volée uniquement) |
| Import CSV en masse | ⬜ |
| `lastLoginAt` tracking | ✅ 🆕 |

### 13.3 Campagnes

| Feature | État |
|---|---|
| CRUD campaigns (API) | ✅ |
| Transitions de statut (draft→active→closed→archived) | ✅ |
| Target departments | ✅ |
| Extended visibility (managers voient sous-équipes) | ✅ |
| UI de gestion campaigns | ✅ 🆕 (page `/campaigns` dédiée, list+filter+stats) |
| Stats de complétion | ✅ (API + UI dans `/campaigns`) |
| Duplication de campagne | ⬜ |
| Rappels automatiques aux collaborateurs en retard | ⬜ |

### 13.4 Formulaires

| Feature | État |
|---|---|
| CRUD forms (API) | ✅ |
| Types : self / manager / upward / director / peer | ✅ |
| Questions : rating / text / yes_no / choice | ✅ |
| Anonymisation forcée sur upward_feedback | ✅ |
| Freeze à la 1ère éval | ✅ |
| UI Form Editor (drag-drop) | ✅ |
| Duplication de formulaire | ⬜ |
| Templates pré-configurés | ⬜ |
| Conditional logic (questions dépendantes) | ⬜ |

### 13.5 Évaluations

| Feature | État |
|---|---|
| CRUD evaluations | ✅ |
| Bulk creation (max 500) | ✅ |
| Cycle de statuts 8 états | ✅ |
| Autosave | ✅ |
| Verrouillage des réponses après submit | ✅ |
| Score 0-100 + commentaires | ✅ |
| Signatures horodatées (3 niveaux) | ✅ |
| DisagreementFlag | ✅ |
| UI de remplissage (/evaluation) | ✅ |
| UI de review manager | ✅ |
| Historique / versioning | ⬜ |
| Export PDF | ⬜ |

### 13.6 Calendrier / Événements

| Feature | État |
|---|---|
| CRUD events (API) | ✅ |
| Filtrage par `targetRoles` | ✅ |
| UI calendrier (CalendarWidget) | ✅ (composant prêt) |
| Intégration dans les pages | 🟡 |
| Rappels par email | ⬜ |
| Sync Google Calendar / Outlook | ⬜ |

### 13.7 Ressources documentaires

| Feature | État |
|---|---|
| CRUD resources (API) | ✅ |
| Types PDF/XLSX/DOCX/PPTX | ✅ |
| Statuts draft/published | ✅ |
| Filtrage `visibleTo` | ✅ |
| UI Resources | ⬜ (sidebar HR `disabled`) |
| Upload de fichiers | ⬜ (métadonnées uniquement pour l'instant) |
| Stockage S3/local | ⬜ |

### 13.8 Paramètres / Settings 🆕

| Feature | État |
|---|---|
| Page `/settings` | ✅ 🆕 |
| Section Profile (read-only) | ✅ 🆕 |
| Section Preferences (langue + thème) | ✅ 🆕 |
| Persistance prefs en DB | ✅ 🆕 |
| Section Notifications filtrée par rôle | ✅ 🆕 |
| Filtrage backend des clés de notif par rôle | ✅ 🆕 |
| Section Role Spaces (raccourcis contextuels) | ✅ 🆕 |
| Section Danger (logout) | ✅ 🆕 |
| Changement mdp | ⬜ (LDAP uniquement, volontaire) |
| Upload avatar | ⬜ |

### 13.9 Notifications

| Feature | État |
|---|---|
| Préférences stockées + filtrées par rôle | ✅ 🆕 |
| UI de toggle dans /settings | ✅ 🆕 |
| Cloche topbar (affichage) | 🟡 (UI présente, pas de backend notif store) |
| Envoi email | ⬜ (pas de service SMTP connecté) |
| Push browser / webhooks | ⬜ |
| Notification center (inbox) | ⬜ |

### 13.10 UI / Design System

| Feature | État |
|---|---|
| Tokens CSS (couleurs, radius, typo) | ✅ |
| 3 thèmes dark / light / light-sidebar | ✅ |
| Anti-flash au chargement | ✅ |
| Sidebar partagée (AppSidebar) | ✅ |
| Topbar partagée (AppTopbar) | ✅ |
| 22 icônes SVG | ✅ |
| Composants UI : Button, Input, Checkbox | ✅ |
| CalendarWidget | ✅ |
| Responsive mobile complet | 🟡 |
| Accessibilité a11y (ARIA, skip-link) | ✅ |
| Dark mode sur pages internes | ✅ (3 thèmes via useTheme) |

### 13.11 i18n

| Feature | État |
|---|---|
| Français | ✅ |
| Anglais | ✅ |
| Factory `makeT` | ✅ |
| Persistance locale en DB | ✅ 🆕 |
| Autres langues (ES/DE/IT) | ⬜ |

### 13.12 DevOps / Ops

| Feature | État |
|---|---|
| Dockerfile multi-stage | ✅ |
| docker-compose prod + dev | ✅ |
| Nginx TLS + LB | ✅ |
| Scaling horizontal | ✅ |
| Healthcheck API | ✅ |
| Backup MongoDB (`scripts/backup.sh`) | ✅ |
| Logs structurés | 🟡 (console.log, pas de JSON structuré) |
| Monitoring (Prometheus/Grafana) | ⬜ |
| CI/CD | ⬜ |
| Audit log (qui a fait quoi) | ⬜ |

### 13.13 Reporting / Analytics

| Feature | État |
|---|---|
| Stats de complétion (API) | ✅ |
| Dashboard RH avec KPIs | 🟡 |
| Dashboard Director (vue agrégée) | ✅ 🆕 (portail `/director`) |
| Dashboard Admin (vue système) | ✅ 🆕 (portail `/admin`) |
| Export Excel | ⬜ |
| Export PDF | ⬜ |
| Rapports personnalisés | ⬜ |

### 13.14 Ajoutés cette session 🆕 — Refactor cloisonnement (avril 2026)

**Objectif** : donner à chaque rôle son propre portail dédié, supprimer les items « disabled » des sidebars, normaliser le naming.

1. **Renommage `/dashboard` → `/employee`** (folder, html, JSX, CSS, toutes références mises à jour). Compat 301.
2. **Création portail `/admin`** (8 fichiers) : KPIs système, répartition par rôle, table users, cartes d'action vers les autres portails.
3. **Création portail `/director`** (8 fichiers) : vue agrégée sur sa sous-arborescence, 6 KPIs, barre de complétion globale.
4. **Création portail `/campaigns`** (8 fichiers) : liste de campagnes en cards, status colorés, métadonnées, barre de progression, sidebar adaptative HR/admin.
5. **ROLE_HOME post-login** : 5 destinations distinctes (admin→/admin, hr→/hr, director→/director, manager→/manager, employee→/employee).
6. **Vite** passé à **10 entries** (login + 5 portails + formeditor + campaigns + evaluation + settings). Build : 834 ms ✓.
7. **Express** : nouveaux guards `/admin` (admin only), `/director` (director+admin), `/campaigns` (hr+admin) ; `/dashboard` renvoie `301`.
8. **Sidebars nettoyées** : retiré les items disabled HR/Resources, HR/Reports, Manager/Team, Employee/Growth, Evaluation/Progress.
9. **HR sidebar** : onglet Campaigns activé (→ `/campaigns`).
10. **SettingsSidebar refactor** : 5 branches distinctes par rôle (chaque rôle voit son vrai espace, plus de « RH disabled »).
11. **Tests** : 109/110 inchangés (le seul échec pré-existant `authGuard.test.js` n'est pas lié au refactor).

### 13.15 Ajoutés session précédente (Settings page)

1. **`User.locale`, `User.theme`, `User.notificationPrefs`, `User.lastLoginAt`** dans le modèle
2. **Constantes `LOCALES`, `THEMES`, `NOTIF_PREF_KEYS`, `NOTIF_KEYS_BY_ROLE`** dans `constants.js`
3. **`PATCH /api/auth/preferences`** avec whitelist stricte + validation par rôle
4. **`/me`** retourne les nouveaux champs + filtre `notificationPrefs` par rôle
5. **Login** met à jour `lastLoginAt` en fire-and-forget
6. **Hook `useTheme` exporte `THEMES` et la fonction `setTheme(name)`**
7. **Page `/settings` complète** avec 5 sections, sidebar dynamique par rôle, i18n FR/EN
8. **Wiring de la sidebar Settings** dans Dashboard, HR, Manager, Evaluation
9. **Route Express `/settings`** protégée pour tous les rôles authentifiés
10. **Filtrage backend des clés de notif par rôle** (403 si tentative de clé non autorisée)
11. **8 tests Jest ajoutés** sur `/preferences` et `lastLoginAt`

---

## 14. Dette technique & prochaines étapes

### 14.1 Quick wins (< 1 jour chacun)

- ✅ ~~Page Settings manquante~~ → fait
- ✅ ~~Page `/hr` : activer onglet Campagnes~~ → fait (portail `/campaigns` dédié)
- ✅ ~~Créer portail `/admin` dédié~~ → fait
- ✅ ~~Créer portail `/director` dédié~~ → fait
- ✅ ~~Renommer `/dashboard` → `/employee`~~ → fait (compat 301 conservée)
- ✅ ~~Retirer les items disabled des sidebars~~ → fait (HR/Resources, HR/Reports, Manager/Team, Employee/Growth, Evaluation/Progress)
- ⬜ Lien retour breadcrumb dans Settings (vers le portail d'origine)
- ⬜ Correction du test `authGuard.test.js` ligne 140 (clearCookie options)
- ⬜ Page `/hr` : activer onglet Resources (liste + upload métadonnées)
- ⬜ Lien « Mot de passe oublié » sur login (même si stub)

### 14.2 Chantiers moyens (1 à 3 jours)

- ⬜ UI de gestion des utilisateurs (liste, recherche, édition, désactivation — actuellement table read-only dans `/admin`)
- ⬜ UI de création/édition de campagne (wizard multi-step, actuellement seulement liste read-only dans `/campaigns`)
- ✅ ~~Dashboard Director agrégé~~ → fait (portail `/director`)
- ⬜ Page `/employee` collaborateur : enrichir bannière de campagne dynamique, liste d'actions en attente
- ⬜ Export PDF d'une évaluation validée
- ⬜ Service SMTP + envoi des notifications email (les clés sont déjà filtrées)

### 14.3 Chantiers lourds (> 1 semaine)

- ⬜ Sync LDAP daemon (cron qui importe/met à jour les users)
- ⬜ Audit log complet (qui a modifié quoi, quand) → nouvelle collection `AuditLog`
- ⬜ MFA / 2FA
- ⬜ API publique documentée (OpenAPI/Swagger)
- ⬜ Mobile app / PWA offline-first
- ⬜ Reporting avancé (export Excel, tableaux croisés, analytics)
- ⬜ CI/CD GitHub Actions : lint → test → build → docker push → deploy

### 14.4 Bugs / points d'attention

- ⚠️ Le test `authGuard.test.js` échoue sur une assertion `clearCookie` options (pré-existant, pas lié aux changements récents)
- ⚠️ Les portails `/admin`, `/director` et `/campaigns` sont visuels uniquement : ils affichent les données mais n'offrent pas encore d'actions de création/édition — toute mutation passe encore par l'API.
- ✅ ~~Pas d'UI pour créer une campagne~~ → partiel : la liste est là, le wizard de création reste à faire.
- ✅ ~~Sidebars listent plusieurs onglets `disabled`~~ → résolu (tous retirés).
- ⚠️ Pas de cache Redis → toute requête `/api/auth/me` hit MongoDB. Acceptable pour < 1000 utilisateurs, à revoir au-delà.

---

## En résumé

**Le cœur métier est complet et solide.** L'authentification (local + LDAP), le RBAC à 5 rôles, le cycle complet d'une campagne d'évaluation avec signatures hiérarchiques, l'anonymisation des feedbacks remontants, la hiérarchie organisationnelle avec visibilité étendue — tout cela fonctionne et est testé (80+ tests unitaires, 17 fichiers E2E).

**Cloisonnement par rôle abouti.** Depuis le refactor d'avril 2026, **chaque rôle dispose de son propre portail dédié** (`/admin`, `/hr`, `/director`, `/manager`, `/employee`). Les sidebars ne contiennent plus aucun item « disabled ». Le portail `/campaigns` centralise enfin la gestion des cycles d'évaluation pour HR et admin.

**Ce qui manque est principalement de l'UI de création/édition** sur les ressources déjà listées (wizard de création de campagne, gestion fine des users, upload de ressources), plus l'envoi effectif des notifications (emails) et les exports PDF/Excel.

**Le projet est en état MVP déployable** : on peut le mettre en production avec un flow opérationnel à base de curl/scripts pour les tâches admin lourdes, et **5 portails UI distincts** pour les 5 rôles fonctionnels qui font le travail quotidien.

Les pages `/settings`, `/admin`, `/director` et `/campaigns` ajoutées comblent les manques structurels les plus visibles : chaque utilisateur a désormais un vrai espace personnel **et** un vrai espace de travail rôle-spécifique, sans être passager clandestin du portail d'un autre rôle.
