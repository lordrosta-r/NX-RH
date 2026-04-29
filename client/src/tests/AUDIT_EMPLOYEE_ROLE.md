# Audit QA — Rôle `employee` (NanoXplore RH)

**Date** : 2025-07  
**Auditeur** : QA automatisé (Copilot) — lecture statique du code source  
**Périmètre** : pages `/employee/*`, `/evaluation/:evalId/*`, `/employee/settings`

---

## 1. Cartographie des actions et traces

### `/employee` — Tableau de bord

| Action | Composant | Fetch | Endpoint | Handler | Résultat |
|--------|-----------|-------|----------|---------|----------|
| Voir le dashboard | `Employee.jsx` | `GET /api/campaigns?status=active` | `campaigns.js` | filtre `status=active` | campagne ou null |
| Voir évaluations en cours | `Employee.jsx` | `GET /api/evaluations?evaluateeId=:id` | `evaluations.js` | scope `$or [evaluatorId, evaluateeId]` (param ignoré, sécurisé par session) | liste d'évaluations |
| Voir événements calendrier | `Employee.jsx` | `GET /api/events` | `events.js` | tous événements | liste d'événements |
| Voir ressources récentes | `Employee.jsx` | `GET /api/resources` | `resources.js` | filtre published | 3 premières ressources |
| Démarrer l'évaluation (CTA) | `CampaignBanner` → `Employee.jsx` | `navigate(/evaluation/:id)` | — | React Router | redirection |
| Cocher étape onboarding | `OnboardingBanner` | `PATCH /api/users/:id/onboarding/:idx` | `users.js` | self ou admin | met à jour l'étape |
| Terminer l'onboarding | `OnboardingBanner` | `PATCH /api/users/:id/onboarding/complete` | `users.js` | self ou admin | `completed=true` |

### `/employee/goals` — Objectifs

| Action | Composant | Fetch | Endpoint | Handler | Résultat |
|--------|-----------|-------|----------|---------|----------|
| Voir objectifs | `EmployeeGoals.jsx` | `GET /api/evaluations?evaluateeId=:id` | `evaluations.js` | scope employee | évaluation active |
| Mettre à jour progression | `UpdateModal` → `patchProgress` | `PATCH /api/evaluations/:id` | `evaluations.js` | answers PATCH | sauvegarde `obj_progress_*` + `obj_comment_*` (après fix) |

### `/employee/history` — Historique

| Action | Composant | Fetch | Endpoint | Résultat |
|--------|-----------|-------|----------|---------|
| Voir historique | `EmployeeHistory.jsx` | `GET /api/evaluations?evaluateeId=:id` | liste des évaluations soumises+ (après fix) |
| Filtrer par année/campagne | `EmployeeHistory.jsx` | — | client-side | filtrage local |
| Consulter une évaluation | bouton → `navigate` | — | `/evaluation/:id` | redirection |

### `/employee/settings` — Paramètres

| Action | Composant | Fetch | Endpoint | Résultat |
|--------|-----------|-------|----------|---------|
| Voir profil | `ProfileSection` | `GET /api/auth/me` (AuthContext) | `auth.js` | profil + `GET /api/users/:managerId` (après fix) |
| Changer langue | `PreferencesSection` | `PATCH /api/auth/preferences` | `auth.js` | `locale` sauvegardé |
| Changer thème | `PreferencesSection` | `PATCH /api/auth/preferences` | `auth.js` | `theme` sauvegardé (après fix) |
| Toggle notif | `NotificationsSection` | `PATCH /api/auth/preferences` | `auth.js` | prefs mises à jour |
| Se déconnecter | `DangerSection` | `POST /api/auth/logout` | `auth.js` | session détruite |

### `/evaluation/:evalId/*` — Formulaire d'évaluation

| Action | Composant | Fetch | Endpoint | Résultat |
|--------|-----------|-------|----------|---------|
| Voir récapitulatif | `EvaluationSummary` | `GET /api/evaluations/:id` | `evaluations.js` | détail évaluation |
| Remplir une phase | `EvaluationForm` | `PATCH /api/evaluations/:id` | `evaluations.js` | answers + status (in_progress après fix) |
| Sauvegarder brouillon | `EvaluationForm` | idem | idem | answers saved |
| Soumettre (dernière phase) | `EvaluationForm` | idem | idem | answers + status=submitted (après fix) |
| Signer | `EvaluationSign` | `PATCH /api/evaluations/:id { status: 'signed_evaluatee' }` | `evaluations.js` | transition reviewed→signed_evaluatee |
| Contester | `EvaluationSign` | `PATCH /api/evaluations/:id { evaluateeComment }` | `evaluations.js` | commentaire sauvegardé |

---

## 2. Bugs identifiés et corrigés

### EMP-01 — Bouton "Terminer l'onboarding" jamais affiché ⚠️ BLOQUANT

**Page / composant** : `Employee.jsx` → `OnboardingBanner`  
**Action déclenchante** : Cocher toutes les étapes d'onboarding  
**Bug** : Ligne 84 — `if (!hasIncomplete && !onboarding.completed) return null` masque la bannière quand toutes les étapes sont cochées mais que `onboarding.completed = false`. Le bouton "Marquer l'onboarding comme terminé" devient inaccessible (code mort).  
**Attendu** : La bannière reste visible avec le bouton "Terminer l'onboarding" quand tous les steps sont `done`.  
**✅ Corrigé** : Suppression de la condition logique inversée. La bannière s'affiche jusqu'à ce que `onboarding.completed = true`.

---

### EMP-02 — Workflow de soumission cassé (status jamais changé) ⚠️ BLOQUANT

**Page / composant** : `EvaluationForm.jsx`  
**Action déclenchante** : Cliquer "Enregistrer le brouillon" ou "Soumettre l'évaluation"  
**Bug** :  
- `saveMutation` envoyait uniquement `{ answers: payload }` — le statut restait indéfiniment à `assigned`  
- `handleSubmitPhase` sur la dernière phase naviguait vers `/sign` sans passer à `submitted`  
- La page de signature envoyait `{ status: 'signed_evaluatee' }` depuis `assigned` → rejeté par le backend (400) car `ROLE_TRANSITIONS.employee.assigned = ['in_progress']` seulement  
- L'employé ne pouvait jamais finaliser son évaluation  

**Attendu** :  
- Premier brouillon : `assigned → in_progress`  
- Dernière phase soumise : `in_progress → submitted` + redirection vers le récapitulatif  
- Le manager révise : `submitted → reviewed`  
- L'employé peut alors signer : `reviewed → signed_evaluatee`  

**✅ Corrigé** :  
- `saveMutation` accepte désormais un objet body complet  
- `handleSaveDraft` : inclut `status: 'in_progress'` si l'évaluation est encore à `assigned`  
- `handleSubmitPhase` (dernière phase) : inclut `status: 'submitted'` + redirige vers le récapitulatif (pas vers `/sign`)

---

### EMP-03 — Nom du manager non affiché dans les paramètres ⚠️ BLOQUANT

**Page / composant** : `ProfileSection.jsx` + `mongo/server/routes/users.js`  
**Action déclenchante** : Accéder à `/employee/settings`  
**Bug** : `GET /api/users/:managerId` retourne 403 pour un employee (RBAC : `employee` ne peut voir que son propre profil). Le nom du manager affiche `—`.  
**Attendu** : L'employé voit le nom de son manager direct dans la section Profil.  
**✅ Corrigé (backend)** : Le handler `GET /api/users/:id` permet désormais à un employee de récupérer le profil de son manager direct. Un `User.findById(req.user.id, 'managerId')` est effectué pour vérifier la relation avant d'autoriser.

---

### EMP-04 — Commentaire d'objectif ignoré (champ mort) ⚠️ MAJEUR

**Page / composant** : `EmployeeGoals.jsx` → `UpdateModal`  
**Action déclenchante** : Mettre à jour un objectif avec un commentaire  
**Bug** : `onSave(goal.id, progress, comment)` appelle `handleSaveProgress(goalId, pct)` qui ignore le 3ème argument. Le commentaire est saisi mais jamais persisté.  
**Attendu** : Le commentaire est sauvegardé dans une réponse `obj_comment_${goalId}`.  
**✅ Corrigé** : `handleSaveProgress(goalId, pct, comment)` + `patchProgress` inclut le commentaire dans les answers (`obj_comment_${goalId}`) si non vide.

---

### EMP-05 — Changement de thème non persisté en base ⚠️ MAJEUR

**Page / composant** : `PreferencesSection.jsx`  
**Action déclenchante** : Changer le thème dans les paramètres  
**Bug** : `handleTheme` appelait `setTheme(next)` mais pas `persist({ theme: next })`. Le thème était stocké en localStorage uniquement — non synchronisé en DB (perte sur autre appareil/navigateur).  
**Attendu** : `PATCH /api/auth/preferences { theme: 'dark' }` doit être appelé à chaque changement.  
**✅ Corrigé** : Ajout de `persist({ theme: next })` dans `handleTheme`.

---

### EMP-06 — Message de succès de contestation trompeur ⚠️ MAJEUR

**Page / composant** : `EvaluationSign.jsx`  
**Action déclenchante** : Contester une évaluation  
**Bug** : Le message de succès affichait "L'équipe RH a été notifiée." mais aucune notification n'est envoyée par le backend lors d'un PATCH `evaluateeComment`. Le handler `PATCH /api/evaluations/:id` ne contient pas d'appel `notify()` pour ce champ.  
**Attendu** : Message honnête sur ce qui se passe réellement.  
**✅ Corrigé** : Message corrigé → "Contestation enregistrée. Un membre de l'équipe RH prendra contact avec vous."

---

### EMP-07 — Signature possible avec 0 réponses ⚠️ MINEUR

**Page / composant** : `EvaluationSign.jsx`  
**Action déclenchante** : Cliquer "Contresigner" sans avoir rempli aucune phase  
**Bug** : Pas de validation côté frontend avant signature. L'employé pouvait techniquement signer une évaluation vide (le backend accepte la transition d'état indépendamment du contenu).  
**Attendu** : Avertissement si `answersCount === 0`.  
**✅ Corrigé** : `handleSign` bloque la signature et affiche un message si `answersCount === 0`.

---

### EMP-08 — Historique affiche aussi les évaluations en cours ⚠️ MINEUR

**Page / composant** : `EmployeeHistory.jsx`  
**Action déclenchante** : Accéder à `/employee/history`  
**Bug** : La liste incluait les évaluations `assigned` et `in_progress` (déjà affichées sur le dashboard). L'état vide disait "Aucune évaluation clôturée" mais la liste n'était pas filtrée en conséquence.  
**Attendu** : Seules les évaluations hors statuts actifs (`submitted`, `reviewed`, `signed_*`, `validated`, `expired`, `archived`) apparaissent dans l'historique.  
**✅ Corrigé** : Filtre `ACTIVE_STATUSES = new Set(['assigned', 'in_progress'])` appliqué dans le `useMemo` de `filtered`. STATUS_MAP complété avec les statuts manquants (`signed_evaluatee`, `expired`, `archived`).

---

### EMP-09 — Lien "Évaluation" dans les paramètres pointe vers une route invalide ⚠️ MINEUR

**Page / composant** : `RoleSpaceSection.jsx`  
**Action déclenchante** : Cliquer sur le raccourci "Évaluation" dans Paramètres  
**Bug** : Le lien pointait vers `/evaluation` (route non définie dans App.jsx → 404). La route correcte est `/employee/evaluation` (composant `EvaluationRedirect`).  
**✅ Corrigé** : `href` mis à jour → `/employee/evaluation`.

---

## 3. Features manquantes / incomplètes

| Feature | Nav/UI | État |
|---------|--------|------|
| Soumettre l'évaluation (workflow complet) | Bouton "Soumettre" dans EvaluationForm | ✅ **Corrigé** — envoyait uniquement les réponses sans changer le statut |
| Terminer l'onboarding | Bouton dans bannière onboarding | ✅ **Corrigé** — bouton inaccessible à cause d'une condition inversée |
| `contested` comme statut officiel | `EvaluationSign` → "Contester" | ⚠️ **Partiel** — le commentaire est sauvegardé mais aucun statut `contested` n'existe dans `EVALUATION_STATUSES`. Prévu comme TODO dans le code. À implémenter : ajouter `contested` aux constantes + `ROLE_TRANSITIONS.employee.reviewed = ['signed_evaluatee', 'contested']` + endpoint backend dédié |
| Demande de mobilité / augmentation | Mentionné dans les demandes à vérifier | ❌ **Non implémenté** — aucune route `/hr/requests` ne gère les soumissions employé. `HRRequests` est accessible côté RH uniquement. Il n'y a pas de formulaire de demande côté employee dans les pages `/employee/*` |
| Export PDF de son évaluation | Mentionné dans les designs | ✅ **Existe** — `GET /api/evaluations/:id/pdf` est accessible si `isOwn` (evaluatorId ou evaluateeId). Pas de bouton dans l'UI `EvaluationSummary`. Feature backend prête, UI manquante |
| Feedback 360° / retour par les pairs | Carte "Retour par les pairs" → `/employee/history` | ⚠️ **Lien trompeur** — la carte navigue vers `/employee/history` mais son libellé suggère une feature de feedback 360° distincte. Aucune page de feedback 360° employé n'existe |
| Score visible | `EvaluationSummary` | ✅ **Existe** — affiché dans `EvaluationSign` si `evaluation.score != null` |

---

## 4. Points de vigilance (non-bugs)

| Point | Détail |
|-------|--------|
| `evaluateeId` param ignoré pour employees | `GET /api/evaluations?evaluateeId=:id` : le backend scoped par session (`$or [evaluatorId, evaluateeId]`), le param est superflu mais inoffensif |
| Questions mock vs questions réelles | `EmployeeGoals` extrait les objectifs par préfixe `obj_q*`. Si le formulaire lié a des IDs différents, la page sera vide. Couplage fragile à documenter |
| CampaignBanner CTA : `<a href="#">` | Devrait être un `<button>`. `onNavigate` est toujours fourni donc pas de navigation parasite en pratique |
| Status `signed_evaluatee` absent du `STATUS_MAP` original | Ajouté dans le fix EMP-08 |

---

## 5. Résumé des fichiers modifiés

| Fichier | Type de fix |
|---------|-------------|
| `client/src/pages/employee/Employee.jsx` | EMP-01 : condition OnboardingBanner |
| `client/src/pages/evaluation/EvaluationForm.jsx` | EMP-02 : workflow status in_progress + submitted |
| `mongo/server/routes/users.js` | EMP-03 : RBAC employee → manager direct |
| `client/src/pages/employee/EmployeeGoals.jsx` | EMP-04 : commentaire objectif sauvegardé |
| `client/src/pages/settings/sections/PreferencesSection.jsx` | EMP-05 : theme persisté en DB |
| `client/src/pages/evaluation/EvaluationSign.jsx` | EMP-06 : message contestation + EMP-07 : guard 0 réponses |
| `client/src/pages/employee/EmployeeHistory.jsx` | EMP-08 : filtre évaluations actives + STATUS_MAP complet |
| `client/src/pages/settings/sections/RoleSpaceSection.jsx` | EMP-09 : lien `/employee/evaluation` |
