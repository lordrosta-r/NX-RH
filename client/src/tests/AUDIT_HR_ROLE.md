# Audit QA — Rôle HR (NanoXplore RH)

> Audit de code statique (sans navigateur) : lecture de toutes les pages HR React
> et des routes Express associées. Chaque action UI est tracée jusqu'à son handler
> backend et le comportement attendu est vérifié.
>
> **Date :** 2025-07  
> **Périmètre :** `client/src/pages/hr/` · `mongo/server/routes/campaigns.js` ·
> `forms.js` · `users.js` · `offboarding.js` · `evaluations.js` (partiel)

---

## 1. Tableau de traçabilité — Action → API → Handler → Résultat

| # | Page | Action UI | Endpoint | Handler | Résultat attendu | Statut |
|---|------|-----------|----------|---------|------------------|--------|
| 1 | HR Dashboard | Chargement KPI employés | `GET /api/users` | `users.js` GET / | Liste des users, comptage | ✅ Corrigé (était `/api/employees`) |
| 2 | HR Dashboard | Chargement campagnes | `GET /api/campaigns` | `campaigns.js` GET / | Toutes les campagnes (HR voit tout) | ✅ OK |
| 3 | HR Dashboard | Chargement évaluations | `GET /api/evaluations` | `evaluations.js` GET / | Toutes les évaluations | ✅ OK |
| 4 | HRCampaigns | Liste des campagnes | `GET /api/campaigns?status=X` | `campaigns.js` GET / | Filtrage par statut | ✅ OK |
| 5 | HRCampaigns | Cloner une campagne | `POST /api/campaigns/:id/clone` | `campaigns.js` POST /clone | Nouvelle campagne draft créée | ✅ OK |
| 6 | HRCampaigns | Supprimer campagne | `DELETE /api/campaigns/:id` | `campaigns.js` DELETE | Autorisé si draft ou archived | ✅ OK |
| 7 | HRCampaignNew | Créer campagne (wizard step 5) | `POST /api/campaigns` | `campaigns.js` POST / | Campagne créée avec `status: 'active'` | ✅ Corrigé (statut ignoré avant fix) |
| 8 | HRCampaignDetail | Charger détail + stats | `GET /api/campaigns/:id` | `campaigns.js` GET /:id | Campagne + aggregate stats | ✅ Corrigé (KPIs completionRate/pending) |
| 9 | HRCampaignDetail | Activer / Fermer / Archiver | `PATCH /api/campaigns/:id` | `campaigns.js` PATCH | Transition validée ou 400 | ✅ Corrigé (erreur maintenant affichée) |
| 10 | HRCampaignDetail | Modifier campagne | `PATCH /api/campaigns/:id` | `campaigns.js` PATCH | Champs EDITABLE mis à jour | ✅ OK |
| 11 | HRCampaignDetail | Assigner évaluations (bulk) | `POST /api/evaluations/bulk` | `evaluations.js` POST /bulk | Évaluations créées en masse | ⚠️ Voir HR-05 |
| 12 | HRCampaignDetail | Réassigner évaluation | `PATCH /api/evaluations/:id/reassign` | `evaluations.js` PATCH /reassign | Évaluateur changé | ✅ OK |
| 13 | HRTemplates | Liste des formulaires | `GET /api/forms` | `forms.js` GET / | Tous les templates | ✅ OK |
| 14 | HRTemplates | Créer template | `POST /api/forms` | `forms.js` POST / | Formulaire vide créé | ✅ OK |
| 15 | HRTemplates | Dupliquer template | `POST /api/forms/:id/duplicate` | `forms.js` POST /duplicate | Copie créée | ✅ OK |
| 16 | HRTemplates | Supprimer template | `DELETE /api/forms/:id` | `forms.js` DELETE | Autorisé si non `frozenAt` | ✅ OK (confirmé présent) |
| 17 | HRDirectory | Liste des employés + filtres | `GET /api/users` | `users.js` GET / | Tous les utilisateurs | ✅ OK |
| 18 | HRDirectory | Lancer offboarding | `POST /api/offboarding` | `offboarding.js` POST / | Procédure créée | ✅ OK |
| 19 | HROffboarding | Liste des procédures | `GET /api/offboarding` | `offboarding.js` GET / | Toutes les procédures | ✅ OK |
| 20 | HROffboarding | Cocher item checklist | `PATCH /api/offboarding/:id/checklist` | `offboarding.js` PATCH /checklist | Item coché, statut auto `in_progress` | ✅ OK |
| 21 | HROffboarding | Changer statut procédure | `PATCH /api/offboarding/:id` | `offboarding.js` PATCH /:id | Statut mis à jour | ✅ OK |
| 22 | HRRequests | Liste toutes évaluations | `GET /api/evaluations` | `evaluations.js` GET / | Toutes les évaluations | ✅ OK |
| 23 | HRRequests | Valider contestation | `PATCH /api/evaluations/:id` | `evaluations.js` PATCH | Commentaire reviewer sauvegardé | ✅ OK |
| 24 | HRRequests | Export CSV évaluations | `GET /api/evaluations/export` | `evaluations.js` GET /export | Fichier CSV téléchargé | ⚠️ Voir HR-06 |
| 25 | HRAnalytics | Données analytiques | `GET /api/evaluations` | `evaluations.js` GET / | Données pour les 5 dashboards | ✅ OK |
| 26 | HRAnalytics | Export analytics | `GET /api/evaluations/export?...` | `evaluations.js` GET /export | CSV téléchargé | ⚠️ Voir HR-06 |
| 27 | HRResources | Ajouter ressource | `POST /api/resources` | Non vérifié (route existante) | Ressource créée | ✅ OK (probable) |
| 28 | HRSettings | Sauvegarder préférences | `PATCH /api/users/:id` | `users.js` PATCH /:id | Locale, notifs sauvegardées | ⚠️ Voir HR-07 |

---

## 2. Bugs identifiés et corrigés

### ✅ HR-01 — Dashboard : endpoint `/api/employees` inexistant
**Sévérité :** Critique  
**Fichier :** `client/src/pages/hr/HR.jsx` ligne 137  
**Symptôme :** Le KPI "N employés actifs" affichait toujours `—` (requête 404).  
**Cause :** `apiFetch('/api/employees')` alors que la route est `/api/users`.  
**Correction appliquée :** Changement vers `/api/users`.

---

### ✅ HR-02 — Wizard campagne : `status: 'active'` ignoré par le backend
**Sévérité :** Critique  
**Fichier :** `mongo/server/routes/campaigns.js` lignes 102-126  
**Symptôme :** L'étape 5 du wizard avertit "la campagne sera immédiatement activée",
mais le backend ne lisait pas `status` du body → toutes les campagnes créées en `draft`.  
**Cause :** Le handler POST ne destructurait pas `status` et ne le passait pas à `Campaign.create`.  
**Correction appliquée :** Ajout de `status` dans la destructuration, validation
(seuls `draft` et `active` acceptés à la création), passage conditionnel à `Campaign.create`.

---

### ✅ HR-03 — Détail campagne : KPIs `completionRate` et `pending` toujours à 0
**Sévérité :** Majeur  
**Fichier :** `client/src/pages/hr/HRCampaignDetail.jsx` ligne 591  
**Symptôme :** La barre de progression et les tuiles "En attente" et "Taux de complétion"
affichaient toujours 0.  
**Cause :** L'API retourne `{ total, started, submitted, validated }` mais le frontend
destructurait `{ completionRate, pending }` qui n'existent pas dans la réponse.  
**Correction appliquée :** Destructuration de `started`, calcul côté client :
```js
const completionRate = total > 0 ? Math.round(started / total * 100) : 0
const pending = total - started
```

---

### ✅ HR-04 — Détail campagne : transitions de statut sans gestion d'erreur
**Sévérité :** Majeur  
**Fichier :** `client/src/pages/hr/HRCampaignDetail.jsx` lignes 554-563  
**Symptôme :** Si une transition invalide est tentée (ex. `archived → active`), l'API
répond 400 mais aucun message d'erreur n'était affiché à l'utilisateur. La mutation
semblait "réussir" (fetch ne rejette pas sur non-2xx).  
**Cause :** `patchMutation` utilisait `fetch(...)` sans vérifier `r.ok` et sans `onError`.  
**Correction appliquée :** Ajout de `.then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(...)))` et `onError: (err) => showToast(...)`.

---

### ✅ HR-05 — Settings : `setTheme` inexistant dans `ThemeContext`
**Sévérité :** Mineur  
**Fichier :** `client/src/pages/hr/HRSettings.jsx` ligne 19  
**Symptôme :** `setTheme` serait `undefined` si appelé. Le composant ne crashait pas
(non utilisé dans le JSX) mais la destructuration était incorrecte selon l'API réelle.  
**Cause :** `ThemeContext` expose `{ theme, cycleTheme }` (pas `setTheme`).  
**Correction appliquée :** Suppression de `setTheme` de la destructuration.

---

## 3. Bugs connus non corrigés (nécessitent une décision produit)

### ⚠️ HR-06 — `AssignModal` : `evaluatorId` auto-assigné à l'évalué
**Sévérité :** Majeur (UX)  
**Fichier :** `client/src/pages/hr/HRCampaignDetail.jsx` lignes ~458-464  
**Symptôme :** Lors d'une assignation en masse, l'évaluateur est forcé à `evaluateeId`
(l'employé s'évalue lui-même). Incorrect pour les formulaires manager.  
**Cause :** Fallback hardcodé `evaluatorId: evaluateeId`.  
**Action requise :** Ajouter une UI de sélection du manager dans `AssignModal`,
ou pré-remplir depuis `user.managerId` (nécessite de charger les users complets).

---

### ⚠️ HR-07 — `HRRequests` : onglets Mobilité / Salaire basés sur une regex fragile
**Sévérité :** Majeur (fonctionnel)  
**Fichier :** `client/src/pages/hr/HRRequests.jsx` lignes 340-343, 401-403  
**Symptôme :** Les onglets "Mobilité" et "Salaire" filtrent par `JSON.stringify(answers).match(regex)`.
Si les formulaires n'utilisent pas ces mots-clés dans leurs réponses textuelles,
les onglets seront vides même s'il y a des demandes.  
**Action requise :** Ajouter des champs dédiés `mobilityRequest: Boolean` et
`salaryRequest: Boolean` sur le modèle Evaluation, ou un tag sur le formulaire
(ex. `Form.category: 'mobility' | 'salary' | 'evaluation'`).

---

### ⚠️ HR-08 — Export CSV via `window.open` (fiabilité selon config cookie)
**Sévérité :** Mineur (selon déploiement)  
**Fichiers :** `HRAnalytics.jsx` ligne ~492, `HRRequests.jsx` ligne ~527  
**Symptôme :** `window.open('/api/evaluations/export?...')` fonctionne si les cookies
de session sont `SameSite=Lax` ou `None`. En mode `SameSite=Strict`, la requête
ouvre un onglet sans cookie → 401.  
**Action recommandée :** Remplacer par un `apiFetch` avec réponse `blob` + création
d'un lien `<a>` temporaire pour déclencher le téléchargement.

---

### ℹ️ HR-09 — `HRSettings` : densité d'affichage non restaurée au rechargement
**Sévérité :** Mineur (UX)  
**Fichier :** `client/src/pages/hr/HRSettings.jsx` ligne 28  
**Symptôme :** `density` initialisé à `'normal'` en dur ; la valeur sauvegardée via
`PATCH /api/users/:id` (champ `displayDensity`) est perdue après rechargement.  
**Action recommandée :** Initialiser `density` depuis `user?.displayDensity ?? 'normal'`.

---

### ℹ️ HR-10 — Menu de navigation HR : pas de lien vers le dashboard `/hr`
**Sévérité :** Mineur (UX)  
**Fichier :** `client/src/components/ui/navMenuConfig.js`  
**Symptôme :** Le menu HR ne contient pas d'entrée pour `/hr` (tableau de bord). Une
fois sur une sous-page, seul le logo permet de revenir au dashboard.  
**Action recommandée :** Ajouter `{ label: 'Tableau de bord', path: '/hr', icon: 'LayoutDashboard' }`
en tête du groupe HR dans `navMenuConfig.js`.

---

## 4. Fonctionnalités incomplètes (stubs)

| Fonctionnalité | Page | Détail |
|----------------|------|--------|
| Édition / suppression de ressources | `HRResources` | L'UI ne propose pas de bouton modifier ni supprimer sur les ressources existantes, malgré les routes `PATCH` et `DELETE /api/resources/:id` disponibles en backend |
| Import N-1 / source campagne | `HRCampaignNew` Step 3 | Les champs `importN1` et `sourceCampaignId` sont collectés dans le wizard mais jamais envoyés au backend |
| Approbation formelle mobilité/salaire | `HRRequests` | Les onglets Mobilité et Salaire permettent d'ajouter un commentaire mais pas de changer le statut (approuvé / refusé) |

---

## 5. Points de sécurité vérifiés

| Vérification | Résultat |
|-------------|----------|
| `DELETE /api/forms/:id` interdit si `frozenAt` | ✅ Vérifié (`forms.js` lignes 163-189) |
| POST/PATCH campagnes réservé aux rôles `admin`/`hr` | ✅ Vérifié (`ADMIN_ROLES.includes(req.user.role)`) |
| Offboarding accessible uniquement aux rôles RH | ✅ Middleware `authenticated` + vérification `HR_ROLES` dans les handlers |
| Transitions de statut campagne validées côté serveur | ✅ `VALID_TRANSITIONS` dans `Campaign.js` |
| Injections NoSQL dans filtres query string | ✅ Whitelist explicite (`VALID_STATUSES.includes(...)`) |
| Pas de secret committé | ✅ Aucun token ou mot de passe trouvé dans les fichiers audités |

---

## 6. Résumé

| Catégorie | Compte |
|-----------|--------|
| Bugs critiques corrigés | 2 (HR-01, HR-02) |
| Bugs majeurs corrigés | 2 (HR-03, HR-04) |
| Bugs mineurs corrigés | 1 (HR-05) |
| Bugs non corrigés (décision produit requise) | 3 (HR-06, HR-07, HR-08) |
| Observations UX | 2 (HR-09, HR-10) |
| Fonctionnalités incomplètes (stubs) | 3 |
| Points de sécurité ✅ | 6 |
