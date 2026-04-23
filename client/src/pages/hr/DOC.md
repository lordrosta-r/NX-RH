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
| `i18n/` | Traductions fr/en (clés `hr.*`, `hrd.*`, `hrr.*`, `hra.*`, `hrres.*`, `hrst.*`, `cmp.*`, `tpl.*`) |

## Architecture

Toutes les pages sont montées via `App.jsx` dans l'arbre React Router :

```
<ProtectedRoute allowedRoles={['hr', 'admin']}>
  <Route path="/hr"                       element={<HR />} />
  <Route path="/hr/campaigns"             element={<HRCampaigns />} />
  <Route path="/hr/campaigns/new"         element={<HRCampaignNew />} />
  <Route path="/hr/campaigns/:id"         element={<HRCampaignDetail />} />
  <Route path="/hr/templates"             element={<HRTemplates />} />
  <Route path="/hr/templates/:id/builder" element={<FormBuilder />} />
  <Route path="/hr/directory"             element={<HRDirectory />} />
  <Route path="/hr/requests"              element={<HRRequests />} />
  <Route path="/hr/analytics"             element={<HRAnalytics />} />
  <Route path="/hr/resources"             element={<HRResources />} />
  <Route path="/hr/settings"              element={<HRSettings />} />
</ProtectedRoute>
```

Le shell (sidebar + topbar) est fourni par `AuthedLayout` — aucun de ces fichiers ne contient de shell propre.

## Pages et fonctionnalités

### HR.jsx — Tableau de bord
KPI bento, alertes, complétion par service, dernières actions.

### HRCampaigns.jsx — Liste des campagnes
- Filtres par statut (Toutes / Actives / Brouillons / Clôturées / Archivées)
- Grille de cartes avec barre de complétion, période, participants
- Actions par statut : Activer, Clore, Archiver, Cloner, Voir détail (avec `window.confirm`)
- Tri automatique : actives → brouillons → clôturées → archivées

### HRCampaignNew.jsx — Wizard 5 étapes
1. **Identité** — nom (requis), description, dates début/fin
2. **Ciblage** — checkboxes départements + presets (Tous les actifs, CDI > 6 mois, Managers)
3. **Historique** — toggle import N-1 + sélection campagne source
4. **Calendrier** — deadlines employé/manager + notification 48h
5. **Revue** — résumé complet + warning + POST `/api/campaigns` avec `status: 'active'`

### HRCampaignDetail.jsx — Détail campagne
- useParams → `id`
- KPI strip : participants, complétion, en attente, soumis, validés
- Barre de progression globale
- Tableau des évaluations (évalué, manager, statut, score)
- Actions contextuelles selon statut (Activer/Clore/Archiver)
- Modal "Assigner" : formulaire + multi-sélection utilisateurs → POST `/api/evaluations/bulk`

### HRTemplates.jsx — Bibliothèque modèles
- Grille de cartes avec statut libre/verrouillé (`frozenAt`)
- Modal création inline → POST `/api/forms` → navigate builder
- Supprimer (confirm) + Dupliquer (GET/POST)

### HRDirectory.jsx — Annuaire
- Recherche + filtres locaux (rôle, département) sur données `/api/users`
- Table avec avatar initiales, nom, email, poste, département, manager, rôle
- Pagination 50 par page
- Drawer latéral : profil complet + 3 dernières évaluations (`/api/evaluations?evaluateeId=`)

### HRRequests.jsx — Demandes & Contestations
- 4 onglets avec badge de comptage
- Contestations : évaluations `disagreementFlag=true`, actions optimistes (Traiter/Ignorer/Escalader)
- Mobilité : filtre sur `answers` contenant "mobili"
- Augmentations : filtre sur `answers` contenant "augment"
- **Toutes les évaluations** : liste complète avec filtrage par statut, checkboxes et actions en masse
  - Checkbox "Sélectionner tout" dans le header, checkboxes par ligne
  - Barre bulk actions (`PATCH /api/evaluations/bulk`) : sign_hr, archive, désélectionner
  - Feedback inline : nombre de succès / ignorées ou message d'erreur
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
| `hr-campaigns-list` | `GET /api/campaigns` | HRCampaigns.jsx, HRCampaignNew.jsx |
| `hr-campaign` | `GET /api/campaigns/:id` | HRCampaignDetail.jsx |
| `hr-evaluations` | `GET /api/evaluations` | HR.jsx |
| `hr-employees` | `GET /api/employees` | HR.jsx |
| `hr-forms` | `GET /api/forms` | HRTemplates.jsx, modal assign |
| `hr-users-active` | `GET /api/users?isActive=true` | Modal assign |
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

### Phase 6 — Campagnes et FormBuilder (feat/spa-tailwind)

- Ajout de `HRCampaigns.jsx`, `HRCampaignNew.jsx`, `HRCampaignDetail.jsx`, `HRTemplates.jsx`
- Ajout de `hr-campaigns.css` (tokens uniquement, BEM : `cmp-`, `cmp-new-`, `cmp-det-`, `tpl-`)
- Extension de `i18n/fr.js` et `i18n/en.js` avec les clés `cmp.*` et `tpl.*`
- Suppression des legacy files : `campaigns/main.jsx`, `formeditor/main.jsx`, `FormEditorSidebar.jsx`, `FormEditorBanner.jsx`
- Le `FormBuilder` est dans `pages/formeditor/FormBuilder.jsx` mais sa route est montée sous `/hr/templates/:id/builder`

### Phase 7 — Bulk actions (feat/spa-tailwind)

- Ajout de `PATCH /api/evaluations/bulk` dans `mongo/server/routes/evaluations.js`
  - Actions : `sign_hr`, `archive`, `assign_reviewer` — rôle requis admin ou hr, max 200 ids
  - Renvoie `{ success, skipped, errors[] }`
- Ajout de l'onglet "Toutes les évaluations" dans `HRRequests.jsx` avec checkboxes et barre d'actions bulk
- Styles `.hrr-bulk-bar`, `.hrr-checkbox`, `.hrr-bulk-result` dans `hr-requests.css`
- Nouvelles clés i18n `hrr.bulk.*` et `hrr.allevs.*`


- Ne pas ajouter de sidebar ou topbar dans ces composants — `AuthedLayout` les fournit.
- HRAnalytics : toutes les données sont des mocks, clairement commentés `// TODO: remplacer`.
- HRDirectory drawer : le fetch évaluations n'est déclenché que quand un utilisateur est sélectionné (`enabled: !!selectedUser`).

