# client/src/pages/hr/

## Contenu

Ce dossier contient la page principale de l'espace RH (`/hr`) et ses sous-pages co-localisées.

| Fichier | Rôle |
|---|---|
| `HR.jsx` | Tableau de bord RH — route `/hr` |
| `hr.css` | Styles de la page `/hr` |
| `HRDirectory.jsx` | Annuaire de l'entreprise — route `/hr/directory` |
| `hr-directory.css` | Styles de l'annuaire |
| `HRRequests.jsx` | Demandes & contestations — route `/hr/requests` |
| `hr-requests.css` | Styles des demandes |
| `HRAnalytics.jsx` | Analyses RH (5 dashboards) — route `/hr/analytics` |
| `hr-analytics.css` | Styles des analyses |
| `HRResources.jsx` | Bibliothèque ressources RH — route `/hr/resources` |
| `hr-resources.css` | Styles des ressources |
| `HRSettings.jsx` | Préférences RH — route `/hr/settings` |
| `hr-settings.css` | Styles des préférences |
| `i18n/` | Traductions fr/en (clés `hr.*`, `hrd.*`, `hrr.*`, `hra.*`, `hrres.*`, `hrst.*`) |

## Architecture

Toutes les pages sont montées via `App.jsx` dans l'arbre React Router :

```
<ProtectedRoute allowedRoles={['hr', 'admin']}>
  <Route path="/hr"            element={<HR />} />
  <Route path="/hr/directory"  element={<HRDirectory />} />
  <Route path="/hr/requests"   element={<HRRequests />} />
  <Route path="/hr/analytics"  element={<HRAnalytics />} />
  <Route path="/hr/resources"  element={<HRResources />} />
  <Route path="/hr/settings"   element={<HRSettings />} />
</ProtectedRoute>
```

Le shell (sidebar + topbar) est fourni par `AuthedLayout` — aucun de ces fichiers ne contient de shell propre.

## Pages et fonctionnalités

### HR.jsx — Tableau de bord
KPI bento, alertes, complétion par service, dernières actions.

### HRDirectory.jsx — Annuaire
- Recherche + filtres locaux (rôle, département) sur données `/api/users`
- Table avec avatar initiales, nom, email, poste, département, manager, rôle
- Pagination 50 par page
- Drawer latéral : profil complet + 3 dernières évaluations (`/api/evaluations?evaluateeId=`)

### HRRequests.jsx — Demandes & Contestations
- 3 onglets avec badge de comptage
- Contestations : évaluations `status=contested`, actions optimistes (Traiter/Ignorer/Escalader)
- Mobilité : filtre sur `answers` contenant "mobili"
- Augmentations : filtre sur `answers` contenant "augment"
- Drawer détail par évaluation

### HRAnalytics.jsx — Analyses RH
5 dashboards avec données de démonstration (mock) :
1. **Flight Risk Radar** — scatter plot SVG (satisfaction × performance)
2. **Goal Gap Analysis** — barres CSS empilées par département
3. **Skills Gap Map** — radar SVG à 6 axes
4. **Sentiment Heatmap** — grille 52 semaines colorée par score
5. **Succession Pipeline (9-Box)** — grille CSS 3×3

Filtres désactivés (Period/Dept) et boutons export "À venir".
TODO: remplacer les mocks par `/api/evaluations` et `/api/users`.

### HRResources.jsx — Bibliothèque ressources
- Grille de cartes (auto-fill, min 280px)
- Filtre `status=published` côté client
- Modal d'ajout (POST `/api/resources`)
- Bouton "Ouvrir" → lien externe

### HRSettings.jsx — Préférences RH
- Langue (radio fr/en via `useLocaleCtx`)
- Notifications (toggles email/push)
- Densité d'interface (radio compact/normal)
- PATCH `/api/users/{id}` avec feedback visuel

## Données (react-query)

| Query key | Endpoint | Utilisé dans |
|---|---|---|
| `hr-campaigns` | `GET /api/campaigns` | HR.jsx |
| `hr-evaluations` | `GET /api/evaluations` | HR.jsx |
| `hr-employees` | `GET /api/employees` | HR.jsx |
| `hr-directory-users` | `GET /api/users` | HRDirectory.jsx |
| `user-evals-drawer` | `GET /api/evaluations?evaluateeId=` | HRDirectory.jsx drawer |
| `hr-evaluations-all` | `GET /api/evaluations` | HRRequests.jsx |
| `hr-resources` | `GET /api/resources` | HRResources.jsx |

## Historique des décisions

### Phase 5 — Migration pages HR secondaires

- **Avant** : `/hr/directory`, `/hr/requests`, `/hr/analytics`, `/hr/resources`, `/hr/settings` renvoyaient `<PagePlaceholder>`.
- **Après** : Chaque route a son composant complet co-localisé dans ce dossier.
- `HRResources.jsx` remplace `pages/resources/Resources.jsx` (supprimé) — adapté SPA sans shell.
- Les fichiers `pages/resources/Resources.jsx` et `pages/resources/main.jsx` ont été supprimés.

## Points d'attention

- Ne pas ajouter de sidebar ou topbar dans ces composants — `AuthedLayout` les fournit.
- HRAnalytics : toutes les données sont des mocks, clairement commentés `// TODO: remplacer`.
- HRDirectory drawer : le fetch évaluations n'est déclenché que quand un utilisateur est sélectionné (`enabled: !!selectedUser`).

