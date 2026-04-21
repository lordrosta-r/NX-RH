# DOC — pages/employee/

## Objectif

Tableau de bord du collaborateur, accessible à l'URL `/employee`.
Visible par tous les rôles authentifiés (`employee`, `manager`, `hr`, `admin`).

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `Employee.jsx` | Composant racine de la route `/employee`. Charge les données via react-query et rend la bannière hero + le bento grid. |
| `CampaignBanner.jsx` | Section hero : salutation, badge campagne active, anneau de progression SVG, bouton CTA. |
| `CampaignBanner.css` | Styles du hero — fond `surface-container-lowest`, gradient CTA, anneau SVG. |
| `employee.css` | Styles du bento grid, cartes, centre de notifications, spotlight, responsive. |
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

Tous les appels ont `staleTime: 5min` et `enabled: !!user`.

---

## Composants clés utilisés

- `CampaignBanner` — hero éditorial co-localisé dans ce dossier
- `CalendarWidget` — `components/ui/CalendarWidget`
- `SparklesIcon`, `HeartIcon`, `ArrowNEIcon`, `ChevronRightIcon` — `components/ui/icons`
- `useAuth()` — `contexts/AuthContext`
- `useTranslate(pageT)` + `useLocaleCtx()` — `contexts/LocaleContext`

---

## Notes de migration (Phase 4 — MPA → SPA)

### Avant (MPA)
- `main.jsx` : point d'entrée Vite séparé avec son propre `QueryClientProvider` + `BrowserRouter`
- `Employee.jsx` : shell mini-SPA avec `<Routes>`, `AppTopbar` et navigation intégrée
- `EmployeeOverview.jsx` : contenu du dashboard extrait dans un composant séparé
- `EmployeeSidebar.jsx` : wrapper autour de `AppSidebar` (inutile, le shell global s'en charge)

### Après (SPA)
- `Employee.jsx` est maintenant un composant de page simple, sans sous-routage
- `AuthedLayout` fournit la sidebar et le topbar via `<Outlet />`
- `QueryClientProvider` est monté une seule fois dans `src/main.jsx`
- Les fichiers `main.jsx`, `EmployeeSidebar.jsx`, `EmployeeOverview.jsx` ont été supprimés

### Points d'attention
- La classe `.emp` (shell mini-SPA) a été retirée de `employee.css` — le conteneur est désormais `.db-content` fourni par `AuthedLayout`
- `useAuthUser` (hook deprecated) remplacé par `useAuth()` depuis `AuthContext`
- L'affichage conditionnel `loading / !user` est géré par `ProtectedRoute` en amont
