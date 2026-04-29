# AUDIT FRONTEND — NanoXplore RH

**Date** : 2025  
**Périmètre** : `client/src/` — App.jsx, main.jsx, contexts, layouts, pages, components/ui, hooks, i18n  
**Outils** : Vitest + @testing-library/react

---

## Résumé exécutif

14 bugs identifiés et corrigés. Aucune régression sur les 86 tests existants. 27 nouveaux tests créés (100 % pass).

| Catégorie | Nombre |
|-----------|--------|
| Route / Navigation | 2 |
| Données perdues (uncontrolled input) | 1 |
| onError silencieux (UX) | 5 |
| Synchronisation état global | 1 |
| Invalidation QueryCache | 2 |
| Clé i18n manquante | 1 |
| Élément HTML incorrect | 2 |
| Sécurité / Auth | 2 |

---

## Bugs corrigés

### B01 — `ProtectedRoute.jsx` : mauvaise redirection sur rôle incorrect
- **Fichier** : `src/layouts/ProtectedRoute.jsx`  
- **Avant** : `<Navigate to="/employee" replace />` — redirige silencieusement un accès non autorisé vers la page employé au lieu de la page dédiée.  
- **Après** : `<Navigate to="/unauthorized" replace />` — conforme à l'architecture et aux attentes UX.

### B02 — `Employee.jsx` : `<a href="#">` utilisé comme bouton
- **Fichier** : `src/pages/employee/Employee.jsx`  
- **Avant** : `<a href="#" onClick={…}>` avec `e.preventDefault()` — mauvaise sémantique HTML, lien non-navigable, problème d'accessibilité.  
- **Après** : `<button type="button" onClick={…}>` — élément sémantiquement correct.

### B03 — `EvaluationLayout.jsx` : bouton retour sans `type="button"`
- **Fichier** : `src/pages/evaluation/EvaluationLayout.jsx`  
- **Avant** : `<button className="ev-layout__back" onClick={…}>` — sans `type`, se comporte comme `type="submit"` dans un formulaire parent.  
- **Après** : `type="button"` ajouté.

### B04 — `EvaluationSummary.jsx` : boutons de phase sans `type="button"`
- **Fichier** : `src/pages/evaluation/EvaluationSummary.jsx`  
- **Avant** : boutons CTA sans `type` — risque de soumission de formulaire accidentelle.  
- **Après** : `type="button"` ajouté.

### B05 — `ManagerReview.jsx` : mutation sans `onError`
- **Fichier** : `src/pages/manager/ManagerReview.jsx`  
- **Avant** : la mutation PATCH n'avait pas de `onError` — l'erreur est visible via `mutation.isError` dans le JSX mais aucune notification toast n'est envoyée.  
- **Après** : `onError: () => showToast({ message: t('manager.error.update_failed'), type: 'error' })` ajouté.

### B06 — `ManagerReview.jsx` : textarea `nextObjectives` non contrôlé — données perdues
- **Fichier** : `src/pages/manager/ManagerReview.jsx`  
- **Avant** : le champ "Objectifs N+1" n'avait ni `value` ni `onChange` — les données saisies n'étaient jamais incluses dans le payload envoyé au backend.  
- **Après** : `useState('')` ajouté, textarea câblé, champ inclus dans `handleSubmit`.

### B07 — `HRResources.jsx` : `addMutation` sans `onError`
- **Fichier** : `src/pages/hr/HRResources.jsx`  
- **Avant** : en cas d'erreur de création, la modal reste ouverte (car `setModalOpen(false)` est dans `onSuccess`) et l'utilisateur ne reçoit aucun retour.  
- **Après** : `onError: (err) => showToast({ message: err.message || 'Erreur lors de la création', type: 'error' })` ajouté.

### B08 — `EmployeeGoals.jsx` : `patchProgress` mutation sans `onError`
- **Fichier** : `src/pages/employee/EmployeeGoals.jsx`  
- **Avant** : si la sauvegarde de la progression échoue, aucune notification — l'utilisateur pense que sa progression est enregistrée alors qu'elle ne l'est pas.  
- **Après** : `onError: () => showToast({ message: 'Sauvegarde échouée', type: 'error' })` ajouté.

### B09 — `AdminUsers.jsx` : `toggleMutation` sans `onError`
- **Fichier** : `src/pages/admin/AdminUsers.jsx`  
- **Avant** : la désactivation/activation d'un utilisateur échoue silencieusement.  
- **Après** : `onError: () => showToast({ message: t('admin.users.error.save'), type: 'error' })` ajouté.

### B10 — `HRRequests.jsx` : `queryClient.invalidateQueries()` sans queryKey
- **Fichier** : `src/pages/hr/HRRequests.jsx` — `AllEvalsTab`  
- **Avant** : `queryClient.invalidateQueries()` sans argument invalide **toutes** les requêtes du cache — performance dégradée.  
- **Après** : `queryClient.invalidateQueries({ queryKey: ['hr-evaluations-all'] })`.

### B11 — `hooks/useLocale.js` : état local non synchronisé avec `LocaleContext`
- **Fichier** : `src/hooks/useLocale.js`  
- **Avant** : `useLocale` maintenait son propre `useState` indépendant. Les composants qui l'utilisaient (EvaluationForm, EvaluationSummary, EvaluationSign, AdminUsers) ne se re-rendaient pas quand l'utilisateur changeait la langue via la topbar.  
- **Après** : `useLocale` délègue maintenant à `useLocaleCtx()` — un seul état de locale pour toute l'application.

### B12 — `evaluation/i18n/fr.js` + `en.js` : clé `ev.status.inprogress` ≠ statut MongoDB `in_progress`
- **Fichiers** : `src/pages/evaluation/i18n/fr.js`, `src/pages/evaluation/i18n/en.js`  
- **Avant** : `'ev.status.inprogress': 'En cours'` — le template `` t(`ev.status.${status}`) `` avec `status = 'in_progress'` recherchait la clé `ev.status.in_progress` (avec underscore), introuvable.  
- **Après** : renommé en `'ev.status.in_progress'` dans les deux fichiers.

### B13 — `lib/apiFetch.js` : code HTTP non exposé sur l'erreur
- **Fichier** : `src/lib/apiFetch.js`  
- **Avant** : les erreurs étaient lancées avec `new Error(msg)` sans propriété `status` — impossible de détecter les 401 dans les callbacks globaux.  
- **Après** : `err.status = r.status` ajouté avant le `throw`.

### B14 — `main.jsx` : `retry: 1` global + aucun intercepteur 401
- **Fichier** : `src/main.jsx`  
- **Avant** : toutes les requêtes TanStack Query réessayaient sur n'importe quelle erreur (y compris 401). Aucune redirection vers `/login` en cas d'expiration de session côté API.  
- **Après** :
  - `QueryCache.onError` : redirige vers `/login` si `error.status === 401`.
  - `retry` : fonction qui retourne `false` pour les 401, `failureCount < 1` pour les autres erreurs.

---

## Fichiers modifiés

| Fichier | Bugs corrigés |
|---------|---------------|
| `src/layouts/ProtectedRoute.jsx` | B01 |
| `src/pages/employee/Employee.jsx` | B02 |
| `src/pages/evaluation/EvaluationLayout.jsx` | B03 |
| `src/pages/evaluation/EvaluationSummary.jsx` | B04, B11 |
| `src/pages/manager/ManagerReview.jsx` | B05, B06 |
| `src/pages/hr/HRResources.jsx` | B07 |
| `src/pages/employee/EmployeeGoals.jsx` | B08 |
| `src/pages/admin/AdminUsers.jsx` | B09, B11 |
| `src/pages/hr/HRRequests.jsx` | B10 |
| `src/hooks/useLocale.js` | B11 |
| `src/pages/evaluation/i18n/fr.js` | B12 |
| `src/pages/evaluation/i18n/en.js` | B12 |
| `src/lib/apiFetch.js` | B13 |
| `src/main.jsx` | B14 |
| `src/__tests__/hooks/useLocale.test.js` | Mise à jour suite à B11 |
| `vite.config.js` | Include `src/tests/` dans la config Vitest |

---

## Tests créés

### `src/tests/AuthContext.test.jsx` — 6 tests
- État de chargement initial
- Exposition des données utilisateur après succès de `/api/auth/me`
- `user = null` sur réponse 401
- `user = null` sur réponse 403
- `logout()` appelle `POST /api/auth/logout` et redirige vers `/login`
- Erreur si `useAuth()` utilisé hors `<AuthProvider>`

### `src/tests/ProtectedRoute.test.jsx` — 6 tests
- Rendu null pendant le chargement
- Redirection vers `/login` si non authentifié
- Rendu du contenu protégé pour un rôle autorisé
- Rendu si aucune restriction de rôle
- Redirection vers `/unauthorized` (pas `/employee`) pour rôle non autorisé (vérifie B01)
- Accès si l'utilisateur a l'un des rôles autorisés

### `src/tests/AppTopbar.test.jsx` — 15 tests
- Initiales dérivées du prénom/nom
- Fallback sur `RH` si user indéfini
- Dropdown utilisateur fermé par défaut
- Ouverture du dropdown au clic
- Nom complet et rôle dans le dropdown
- Appel de `onLogout`
- Fermeture après clic sur déconnexion
- Dropdown notifications fermé par défaut
- Ouverture + affichage des notifications
- Badge compteur
- Appel de `cycleTheme`
- Label correct selon le thème actif
- `setLocale('en')` depuis locale `fr`
- `setLocale('fr')` depuis locale `en`
- Bouton langue masqué si `setLocale` absent

---

## Points d'attention restants (non corrigés dans cet audit)

| Élément | Raison de non-correction |
|---------|--------------------------|
| `App.jsx` : `director` encore dans `ANY_AUTHED` / `MANAGER_UP` | Compatibilité legacy intentionnelle (migration en cours) |
| `AdminUsers.jsx` : double garde JSX (`if user.role !== 'admin') return null`) | Redondant mais inoffensif — la suppression sans suite de l'effet correspondant suffit |
| `navMenuConfig.js` : `/admin/audit` absent du nav | Route existante mais non liée à un défaut utilisateur bloquant |
| Plusieurs pages évaluation/employee sans traductions i18n complètes (textes FR codés en dur) | Hors périmètre fonctionnel de l'audit |
