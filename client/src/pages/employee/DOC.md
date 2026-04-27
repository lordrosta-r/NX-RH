# DOC — pages/employee/

## Objectif

Tableau de bord du collaborateur et ses sous-pages, accessibles à l'URL `/employee`.
Visible par tous les rôles authentifiés (`employee`, `manager`, `hr`, `admin`).

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `Employee.jsx` | Composant racine de la route `/employee`. Charge les données via react-query et rend la bannière hero + le bento grid. |
| `CampaignBanner.jsx` | Section hero : salutation, badge campagne active, anneau de progression SVG, bouton CTA. |
| `CampaignBanner.css` | Styles du hero — fond `surface-container-lowest`, gradient CTA, anneau SVG. |
| `employee.css` | Styles du bento grid, cartes, centre de notifications, spotlight, responsive. |
| `EmployeeGoals.jsx` | Objectifs de l'employé — route `/employee/goals`. |
| `employee-goals.css` | Styles des objectifs (barre de progression, modal, grille de cartes). |
| `EmployeeHistory.jsx` | Historique des évaluations — route `/employee/history`. |
| `employee-history.css` | Styles de l'historique (timeline, filtres, badges de statut). |
| `i18n/fr.js` | Traductions françaises (clés `dashboard.*`, `employee.*`). |
| `i18n/en.js` | Traductions anglaises. |
| `i18n/index.js` | Factory `makeT({ fr, en })` — exporte `t`. |
| `DOC.md` | Ce fichier. |

---

## Sources de données (react-query)

| Query key | Endpoint | Description |
|---|---|---|
| `['campaign-active']` | `GET /api/campaigns?status=active` | Campagne RH en cours. |
| `['evaluations-me', userId]` | `GET /api/evaluations?evaluateeId=&status=assigned` | Évaluations assignées à l'utilisateur. |
| `['events']` | `GET /api/events` | Événements pour le widget calendrier. |
| `['resources-published']` | `GET /api/resources` | Ressources filtrées `status=published`, 3 premières. |
| `['my-evaluations-validated', userId]` | `GET /api/evaluations?evaluateeId=&status=validated` | Objectifs depuis évaluations validées. |
| `['my-evaluations-history', userId]` | `GET /api/evaluations?evaluateeId=` | Toutes les évaluations pour l'historique. |

Tous les appels ont `staleTime: 5min` et `enabled: !!user`.

---

## Composants clés utilisés

- `CampaignBanner` — hero éditorial co-localisé dans ce dossier
- `CalendarWidget` — `components/ui/CalendarWidget`
- `SparklesIcon`, `HeartIcon`, `ArrowNEIcon`, `ChevronRightIcon` — `components/ui/icons`
- `useAuth()` — `contexts/AuthContext`
- `useTranslate(pageT)` + `useLocaleCtx()` — `contexts/LocaleContext`

---

## EmployeeGoals — Mes objectifs (/employee/goals)

- Extrait `objectives` et `draftObjectives` de l'évaluation validée la plus récente
- Barre de progression CSS (`eg-progress-track` + `eg-progress-fill`)
- Modal inline avec slider 0-100 + commentaire (état local uniquement — pas de PATCH)
- Grille auto-fill minmax(300px, 1fr)
- État vide avec illustration `Target` si aucune évaluation validée

## EmployeeHistory — Historique (/employee/history)

- Filtre par année et par campagne (dérivés des données)
- Timeline verticale (dot + line) triée par date décroissante
- Badge de statut mappé (`STATUS_MAP`)
- Bouton "Consulter" → `navigate('/evaluation/' + ev._id)`

---

## Notes de migration

### Phase 4 — MPA → SPA (Employee.jsx)
- `main.jsx` : point d'entrée Vite séparé → supprimé
- `EmployeeSidebar.jsx`, `EmployeeOverview.jsx` → supprimés
- `AuthedLayout` fournit la sidebar et le topbar

### Phase 5 — Ajout EmployeeGoals + EmployeeHistory
- Routes `/employee/goals` et `/employee/history` précédemment `<PagePlaceholder>` → composants complets
- `/employee/settings` → pointe maintenant vers `pages/settings/Settings.jsx` (refactorisé SPA)

### Phase 10 — Bandeau onboarding
- `OnboardingBanner` ajouté dans `Employee.jsx` : affiché si `user.onboarding.completed === false`
- Checklist interactive (`PATCH /api/users/:id/onboarding/:stepIndex`)
- Bouton "Marquer comme terminé" activé quand toutes les étapes sont cochées (`PATCH /api/users/:id/onboarding/complete`)
- Après chaque mutation : `refreshUser()` depuis `AuthContext` pour mettre à jour l'état global
- Styles dans `employee.css` (préfixe `.db-onboarding__*`)
- Traductions : clés `onb.*` dans `i18n/fr.js` et `i18n/en.js`

