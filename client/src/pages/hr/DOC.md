# client/src/pages/hr/

## Contenu

Ce dossier contient la page principale de l'espace RH (`/hr`) et ses dépendances co-localisées.

| Fichier | Rôle |
|---|---|
| `HR.jsx` | Composant route SPA pour `/hr` — tableau de bord RH |
| `hr.css` | Styles de la page `/hr` (tokens CSS uniquement, jamais de valeurs en dur) |
| `i18n/` | Traductions fr/en pour la page HR (clés `hr.*`) |

## Architecture

`HR.jsx` est monté via `App.jsx` dans l'arbre React Router :

```
<ProtectedRoute allowedRoles={['hr', 'admin']}>
  <Route path="/hr" element={<HR />} />
</ProtectedRoute>
```

Le shell (sidebar + topbar) est fourni par `AuthedLayout` — `HR.jsx` ne contient que le contenu de la page.

## Sections de la page

1. **Hero** — eyebrow + titre "Pilotage RH" + sous-titre
2. **KPI bento** — 6 tuiles (campagnes actives, taux de complétion, alertes, collaborateurs, évaluations, score culture)
3. **Panneau alertes** — retards, contestations, campagnes sur le point de clore
4. **Complétion par service** — barres de progression CSS dérivées des évaluations
5. **Dernières actions** — tableau des évaluations triées par date de mise à jour

## Données (react-query)

| Query key | Endpoint | Usage |
|---|---|---|
| `hr-campaigns` | `GET /api/campaigns` | Nombre de campagnes actives, alertes de clôture |
| `hr-evaluations` | `GET /api/evaluations` | Taux de complétion, stats par service, activité |
| `hr-employees` | `GET /api/employees` | Nombre total de collaborateurs |

Toutes les queries ont `staleTime: 5min` — pas de refetch automatique sur focus.

## Icônes utilisées

Toutes depuis `components/ui/icons/` :
- `ClipboardIcon` — campagnes
- `CheckCircleIcon` — taux de complétion (ajouté lors de la migration SPA)
- `BellIcon` — alertes
- `UsersIcon` — collaborateurs (ajouté lors de la migration SPA)
- `TrendIcon` — évaluations
- `SparklesIcon` — score culture

## Historique des décisions

### Phase 4 — Migration SPA (feat/spa-tailwind)

- **Avant** : `HRDashboard.jsx` était une MPA complète avec sidebar propre (`HRSidebar.jsx`), topbar, et son propre shell.
- **Après** : `HR.jsx` est un composant de contenu pur — le shell est délégué à `AuthedLayout`.
- Fichiers supprimés : `HRDashboard.jsx`, `HRSidebar.jsx`, `HRWelcomeBanner.jsx`, `HRWelcomeBanner.css`, `main.jsx`.
- Les icônes `UsersIcon` et `CheckCircleIcon` ont été créées dans `components/ui/icons/`.

## Points d'attention

- Ne pas ajouter de sidebar ou topbar dans `HR.jsx` — `AuthedLayout` les fournit.
- Le chart de complétion par service est CSS-only (pas de bibliothèque de graphiques).
- Si l'API `/api/evaluations` ne retourne pas de champ `department`, les barres de complétion seront vides.
- Le score culture ("eNPS") est un placeholder `—` en attendant l'intégration de l'API analytics.
