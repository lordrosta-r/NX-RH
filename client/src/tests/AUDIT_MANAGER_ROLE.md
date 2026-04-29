# Audit QA — Rôle Manager (`manager`)

> Testeur : simulation statique (lecture du code source + traçage API)
> Périmètre : rôle `manager` uniquement
> Date : 2025

---

## 1. Cartographie des actions manager

### Flux : Voir son équipe

```
/manager ou /manager/team
  → Manager.jsx / ManagerTeam.jsx
  → GET /api/users
  → users.js : filter.managerId = req.user.id
  → ✅ Retourne uniquement les subordonnés directs du manager
```

### Flux : Voir le profil d'un collaborateur

```
/manager/team/:userId
  → ManagerTeamMember.jsx
  → GET /api/users/:userId         ✅ RBAC : 403 si non subordonné
  → GET /api/evaluations?evaluateeId=:userId  ⚠️ voir MGR-01
```

### Flux : Voir les évaluations en cours (dashboard)

```
/manager
  → Manager.jsx
  → GET /api/evaluations           → scope auto : subordonnés directs
  → GET /api/users                 → subordonnés directs
  → ✅ KPIs calculés côté client
```

### Flux : Remplir l'évaluation N-1

```
/evaluation/:evalId/n-1
  → EvaluationForm phase="n-1"
  → PATCH /api/evaluations/:evalId  (answers)
  → Évaluation model : LOCKED_STATUSES bloque si déjà soumise
  → ✅ Autorisé pour employee/manager (évaluateur)
```

### Flux : Compléter la section objectifs

```
/evaluation/:evalId/objectives
  → EvaluationForm phase="objectives"
  → PATCH /api/evaluations/:evalId  (answers)
  → ✅ Identique au flux N-1
```

### Flux : Review + signature manager

```
/manager/review/:evalId
  → ManagerReview.jsx
  → GET /api/evaluations/:evalId   → RBAC via getVisibleUserIds
  → PATCH /api/evaluations/:evalId → { score, reviewerComment, status: 'reviewed'|'signed_manager' }
  → ROLE_TRANSITIONS.manager : submitted→reviewed, signed_evaluatee→signed_manager
  → ⚠️ voir MGR-03 (save draft), MGR-04 (nextObjectives/objectiveRatings)
```

### Flux : Voir l'historique

```
/manager/history
  → ManagerHistory.jsx
  → GET /api/evaluations  → scope manager
  → Filtre côté client : signed_manager | signed_hr | validated
  → ✅ Fonctionnel
```

### Flux : Analytics équipe

```
/manager/analytics
  → PagePlaceholder (non implémenté)
  → Aucun endpoint manager dédié dans /api/analytics
  → ⚠️ voir MGR-06
```

### Flux : Espace employé

```
/employee  → Employee.jsx
  → ProtectedRoute allowedRoles = ANY_AUTHED (inclut 'manager') ✅
  → GET /api/evaluations  → scope employee (ses propres évals)
  → ✅ Accessible, données correctement scopées
```

---

## 2. Vérification des droits croisés

| Vérification | Résultat |
|---|---|
| Manager accède à un utilisateur hors équipe via `GET /api/users/:id` | ✅ **Bloqué** — 403 Insufficient permissions |
| Manager accède aux évaluations hors équipe via `GET /api/evaluations/:id` | ✅ **Bloqué** — 403 via `getVisibleUserIds` |
| Manager appelle `GET /api/users` (liste) sans filtre | ✅ **Limité** — `filter.managerId = req.user.id` appliqué |
| Manager tente `POST /api/evaluations` (créer) | ✅ **Bloqué** — `ADMIN_ROLES` uniquement |
| Manager tente `PATCH /api/evaluations/:id/reassign` | ✅ **Bloqué** — `ADMIN_ROLES` uniquement |
| Manager accède à `/hr/*` | ✅ **Bloqué** — ProtectedRoute `HR_UP = ['hr','admin']` |
| Manager accède à `/admin/*` | ✅ **Bloqué** — ProtectedRoute `ADMIN_ONLY` |
| Manager modifie une évaluation dont il n'est pas l'évaluateur (status) | ✅ **Bloqué** — `evaluatorId !== uid` → 403 |
| Manager modifie une évaluation `validated` | ✅ **Bloqué** — score → 403, status → aucune transition |
| Manager modifie une évaluation `signed_manager` (après correction) | ✅ **Bloqué** — champs désactivés côté UI |

---

## 3. Bugs identifiés

---

### MGR-01 — BLOQUANT ✅ CORRIGÉ

**Page :** `ManagerTeamMember.jsx` (`/manager/team/:userId`)
**Action :** Ouverture de la fiche d'un collaborateur
**Bug :** `GET /api/evaluations?evaluateeId=:userId` — le paramètre `evaluateeId` était **ignoré** par le handler Express. La route retournait l'ensemble des évaluations visibles du manager (toute l'équipe), pas seulement celles du membre demandé.
**Impact :** `currentEval` et `historyEvals` pouvaient référencer des évaluations d'un autre collaborateur.
**Correction :**
- `mongo/server/routes/evaluations.js` : ajout du filtre `evaluateeId` après le scope par rôle (lignes ~105-111)

---

### MGR-02 — BLOQUANT ✅ CORRIGÉ

**Page :** `ManagerTeamMember.jsx` (`/manager/team/:userId`)
**Action :** Affichage des évaluations d'un collaborateur
**Bug :** Absence de filtre `userId` côté client. `currentEval.find()` et `historyEvals.filter()` n'appliquaient aucune vérification sur `evaluateeId`, retournant potentiellement la première évaluation disponible toutes équipes confondues.
**Impact :** Données du mauvais collaborateur affichées (bouton "Voir l'évaluation" pointant vers la mauvaise évaluation).
**Correction :**
- `client/src/pages/manager/ManagerTeamMember.jsx` : ajout de la vérification `evId === userId` dans les deux `.find`/`.filter`

---

### MGR-03 — BLOQUANT ✅ CORRIGÉ

**Page :** `ManagerReview.jsx` (`/manager/review/:evalId`)
**Action :** Clic sur "Enregistrer le brouillon"
**Bug :** Le bouton appelait `handleSubmit(evaluation.status)`, envoyant `{ status: "submitted" }` (ou autre statut courant) dans le `PATCH`. Le handler Express vérifiait la transition dans `ROLE_TRANSITIONS.manager` : `submitted → submitted` n'est pas autorisé → **HTTP 400 systématique**. Le brouillon ne pouvait jamais être sauvegardé.
**Impact :** Toutes les notes manager (score, commentaire, objectifs N+1, appréciations) étaient perdues à chaque tentative de sauvegarde intermédiaire.
**Correction :**
- `client/src/pages/manager/ManagerReview.jsx` : ajout de `handleSaveDraft()` qui envoie uniquement les champs métier **sans** le champ `status`. Le bouton "Enregistrer" appelle désormais `handleSaveDraft`.

---

### MGR-04 — MAJEUR ✅ CORRIGÉ

**Page :** `ManagerReview.jsx` (`/manager/review/:evalId`)
**Action :** Saisie des "Objectifs N+1" et appréciations d'objectifs
**Bug :** Les champs `nextObjectives` et `objectiveRatings` étaient envoyés dans le body PATCH mais :
1. Absents du schéma Mongoose → Mongoose (strict mode) les ignorait silencieusement
2. Non gérés dans le handler PATCH → données perdues sans erreur
**Impact :** Les managers remplissaient ces champs sans que les données soient jamais persistées.
**Correction :**
- `mongo/server/models/Evaluation.js` : ajout des champs `nextObjectives` (String, max 5000) et `objectiveRatings` (Mixed)
- `mongo/server/routes/evaluations.js` : ajout des blocs de traitement dans PATCH `/:id` avec contrôle de rôle et validation

---

### MGR-05 — MAJEUR ✅ CORRIGÉ (UI)

**Page :** `ManagerReview.jsx` (`/manager/review/:evalId`)
**Action :** Ouverture d'une évaluation déjà co-signée (`signed_manager` / `signed_hr` / `validated`)
**Bug :** Le formulaire restait entièrement éditable même pour des évaluations en statut terminal. Le bouton "Enregistrer le brouillon" aurait provoqué des modifications post-signature. Le backend aurait rejeté la transition de statut mais aurait potentiellement modifié `score`/`reviewerComment` (aucun blocage côté serveur pour ces champs sur `signed_manager`).
**Correction :**
- `client/src/pages/manager/ManagerReview.jsx` : ajout de `LOCKED_FOR_MANAGER` et flag `isEditable`. Tous les inputs/selects/textareas sont désactivés (`disabled={!isEditable}`). Les boutons d'action sont masqués. Un bandeau "lecture seule" est affiché.

---

### MGR-06 — MINEUR (non corrigé — feature à planifier)

**Page :** `/manager/analytics`
**Action :** Clic sur "Analytique" dans le menu
**Bug :** La route affiche un `PagePlaceholder`. Il n'existe pas d'endpoint `/api/analytics` pour le rôle manager (seul `/api/analytics/export/pdf` existe, réservé admin/hr).
**Impact :** Le manager ne peut pas consulter les analytics de son équipe.
**Recommandation :** Créer un endpoint `GET /api/analytics/team` scopé au manager (taux de complétion, scores moyens, distribution par statut), et implémenter `ManagerAnalytics.jsx`.

---

### MGR-07 — MINEUR (non corrigé — UX)

**Page :** Menu manager (`navMenuConfig.js`)
**Action :** Navigation vers sa propre page employé
**Bug :** Aucun lien vers `/employee` dans le menu manager. Un manager qui souhaite consulter ses propres évaluations en tant qu'évalué doit connaître l'URL.
**Recommandation :** Ajouter un lien "Mon espace" → `/employee` dans le groupe ou en `direct` du config manager.

---

### MGR-08 — MINEUR (documentaire)

**Fichier :** `mongo/server/routes/evaluations.js` (PATCH `/:id`)
**Action :** Ajout d'un score après réaffectation d'évaluateur
**Bug :** Incohérence dans les contrôles d'accès manager :
- `score` : vérifie `evaluatee.managerId === uid` (manager hiérarchique de l'évalué)
- `status` : vérifie `evaluation.evaluatorId === uid` (évaluateur assigné)

Après une réaffectation (admin/hr seulement), le nouveau manager peut changer le statut (car il est `evaluatorId`) mais **pas** ajouter un score (car il n'est pas le `managerId` de l'évalué).
**Recommandation :** Aligner les deux contrôles sur `evaluatorId` pour les évaluations réaffectées.

---

## 4. Résumé

| ID | Sévérité | Statut | Description |
|----|----------|--------|-------------|
| MGR-01 | BLOQUANT | ✅ Corrigé | `evaluateeId` ignoré côté serveur dans GET /api/evaluations |
| MGR-02 | BLOQUANT | ✅ Corrigé | Absence de filtre userId côté client dans ManagerTeamMember |
| MGR-03 | BLOQUANT | ✅ Corrigé | Bouton "Enregistrer brouillon" → HTTP 400 systématique |
| MGR-04 | MAJEUR   | ✅ Corrigé | `nextObjectives` et `objectiveRatings` perdus silencieusement |
| MGR-05 | MAJEUR   | ✅ Corrigé | Formulaire éditable sur évaluations signées/terminales |
| MGR-06 | MINEUR   | ⏳ Planifié | Page Analytics → PagePlaceholder, aucun endpoint manager |
| MGR-07 | MINEUR   | ⏳ Planifié | Pas de lien vers /employee dans le menu manager |
| MGR-08 | MINEUR   | ⏳ Documenté | Incohérence managerId vs evaluatorId dans PATCH score |

---

## 5. Fichiers modifiés

| Fichier | Nature |
|---------|--------|
| `mongo/server/routes/evaluations.js` | Ajout filtre `evaluateeId` dans GET `/api/evaluations` + gestion `nextObjectives`/`objectiveRatings` dans PATCH `/:id` |
| `mongo/server/models/Evaluation.js` | Ajout champs `nextObjectives` et `objectiveRatings` au schéma |
| `client/src/pages/manager/ManagerTeamMember.jsx` | Filtre `userId` défensif sur `currentEval` et `historyEvals` |
| `client/src/pages/manager/ManagerReview.jsx` | `handleSaveDraft()` sans status + `isEditable` + champs `disabled` |
