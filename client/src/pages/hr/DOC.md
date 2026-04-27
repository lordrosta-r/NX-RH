# client/src/pages/hr/

## Contenu

Ce dossier contient la page principale de l'espace RH (`/hr`) et ses sous-pages co-localisées.

| Fichier | Rôle |
|---|---|
| `HR.jsx` | Tableau de bord RH — route `/hr` |
| `hr.css` | Styles de la page `/hr` |
| `HRCampaigns.jsx` | Liste des campagnes — route `/hr/campaigns` |
| `HRCampaignNew.jsx` | Wizard création campagne — route `/hr/campaigns/new` |
| `HRCampaignDetail.jsx` | Détail campagne (évals, edit, delete) — route `/hr/campaigns/:id` |
| `hr-campaigns.css` | Styles campagnes (BEM : `cmp-`, `cmp-new-`, `cmp-det-`, `tpl-`) |
| `HRTemplates.jsx` | Bibliothèque modèles de formulaires — route `/hr/templates` |
| `HRDirectory.jsx` | Annuaire de l'entreprise — route `/hr/directory` |
| `hr-directory.css` | Styles de l'annuaire |
| `HRRequests.jsx` | Demandes, contestations, actions en masse — route `/hr/requests` |
| `hr-requests.css` | Styles des demandes |
| `HRAnalytics.jsx` | Analyses RH (5 dashboards, données réelles) — route `/hr/analytics` |
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

---

## Fonctionnalités RH disponibles

### Ce qui fonctionne bout en bout

| Fonctionnalité | Chemin |
|---|---|
| Tableau de bord avec KPIs réels | `/hr` |
| Annuaire complet (filtres, profil, historique évals) | `/hr/directory` |
| Créer une campagne (wizard 5 étapes) | `/hr/campaigns/new` |
| Lister, filtrer, activer, clore, archiver, cloner les campagnes | `/hr/campaigns` |
| Éditer le nom/dates/départements d'une campagne brouillon | `/hr/campaigns/:id` |
| Supprimer une campagne brouillon ou clôturée | `/hr/campaigns/:id` |
| Assigner des évaluations à une campagne (choix du formulaire + paires évalué/évaluateur) | `/hr/campaigns/:id` |
| Suivre le taux de complétion par campagne en temps réel | `/hr/campaigns/:id` |
| Réaffecter un évaluateur sur une évaluation en cours | `/hr/requests` ou `/hr/campaigns/:id` |
| Traiter les contestations (disagreementFlag) | `/hr/requests` onglet Contestations |
| Signer / archiver des évaluations en masse (jusqu'à 200) | `/hr/requests` onglet Toutes |
| Créer un modèle de formulaire (titre, description) | `/hr/templates` |
| Éditer les questions d'un modèle dans le FormBuilder | `/hr/templates/:id/builder` |
| Dupliquer / supprimer un modèle non verrouillé | `/hr/templates` |
| 5 dashboards analytics basés sur les données réelles | `/hr/analytics` |
| Bibliothèque de ressources RH (ajout, ouverture lien) | `/hr/resources` |
| Changer langue et préférences de notification | `/hr/settings` |

### Limitation connue — FormBuilder non connecté aux évaluations

Les questions saisies dans le FormBuilder **ne s'affichent pas** dans les formulaires d'évaluation.
`EvaluationForm.jsx` utilise `MOCK_PHASES` comme données primaires et ne bascule sur
`evaluation.formId.questions` que si les questions sont structurées d'une façon précise.

**Impact** : un RH peut créer et organiser des formulaires, mais les évaluations affichent
toujours les questions codées en dur. Le lien formId est stocké en base mais pas rendu.

**Fichiers concernés** :
- `client/src/pages/evaluation/EvaluationForm.jsx` — lignes `MOCK_PHASES` + `computePhaseData`
- `mongo/server/routes/evaluations.js` — `GET /:id` populate `formId.questions`

**Workaround actuel** : modifier `MOCK_PHASES` directement dans le code (nécessite déploiement).

---

## Flows de navigation RH

### Flow 1 — Créer et lancer une campagne

```
/hr/campaigns
  → [+ Nouvelle campagne]
  → /hr/campaigns/new
      Étape 1 : nom, description, dates
      Étape 2 : cibler les départements (ou preset : Tous / CDI > 6 mois / Managers)
      Étape 3 : import historique N-1 (optionnel)
      Étape 4 : deadlines employé et manager, notif 48h
      Étape 5 : résumé → [Lancer la campagne]
  → POST /api/campaigns (status: 'active')
  → /hr/campaigns (retour liste, carte visible avec statut "Active")
```

### Flow 2 — Assigner des évaluations à une campagne

```
/hr/campaigns
  → [Voir détail] sur une campagne active
  → /hr/campaigns/:id
  → [Assigner des évaluations]
      Sélectionner le formulaire (modèle FormBuilder)
      Sélectionner paires évalué/évaluateur
      → POST /api/evaluations (bulk)
  → Tableau mis à jour avec les nouvelles évaluations
```

### Flow 3 — Créer un formulaire d'évaluation

```
/hr/templates
  → [+ Nouveau modèle] → saisir titre + description → POST /api/forms
  → Carte créée → [Éditer]
  → /hr/templates/:id/builder
      Ajouter sections, questions (texte, note, choix multiple…)
      Sauvegarder → PATCH /api/forms/:id
  → Retour /hr/templates (modèle visible, statut "Libre")
  Note : le modèle est verrouillé (frozenAt) dès qu'il est assigné à une évaluation
```

### Flow 4 — Traiter une contestation

```
/hr/requests → onglet "Contestations"
  → Liste des évaluations avec disagreementFlag = true
  → Lire le motif (evaluateeComment)
  → [Traiter] : PATCH /api/evaluations/:id → status = 'signed_hr'
  → [Ignorer] : retire le disagreementFlag
  → [Escalader] : note interne
```

### Flow 5 — Actions en masse sur les évaluations

```
/hr/requests → onglet "Toutes les évaluations"
  → Filtrer par statut (ex : "reviewed")
  → Cocher les évaluations à traiter (ou "Sélectionner tout")
  → [Signer (RH)] : PATCH /api/evaluations/bulk { action: "sign_hr" }
  → [Archiver]    : PATCH /api/evaluations/bulk { action: "archive" }
  → Feedback : N signées / N ignorées (statuts terminaux non modifiés)
```

### Flow 6 — Réaffecter un évaluateur

```
/hr/requests → onglet "Toutes les évaluations"
  → [Réaffecter] sur une ligne
  → ReassignModal : sélectionner un nouveau manager (rôle manager/director, actif)
  → PATCH /api/evaluations/:id/reassign
  → Toast succès + rechargement

OU

/hr/campaigns/:id → colonne "Réaffecter" dans le tableau des évaluations
  → même modal
```

### Flow 7 — Consulter les analytics

```
/hr/analytics
  → Sélectionner l'onglet (Flight Risk / Goal Gap / Skills Gap / Sentiment / 9-Box)
  → Filtrer par département, période, campagne
  → Données calculées en temps réel depuis /api/evaluations
  Note : bouton Export absent (non implémenté)
```

### Flow 8 — Offboarding (via Admin)

```
/admin/users
  → Trouver l'employé → [Départ]
  → OffboardModal étape 1 : aperçu (N évals en cours, campagnes concernées)
  → OffboardModal étape 2 : raison + date effective
  → PATCH /api/users/:id/offboard
  → Évaluations archivées automatiquement + entrée AuditLog
```

---

## Pages et fonctionnalités (détail technique)

### HR.jsx — Tableau de bord
KPI bento (campagnes actives, évaluations en cours, taux complétion, contestations), alertes,
complétion par service, dernières actions. Données réelles depuis `/api/campaigns` et `/api/evaluations`.

### HRCampaigns.jsx — Liste des campagnes
- Filtres par statut (Toutes / Actives / Brouillons / Clôturées / Archivées)
- Grille de cartes avec barre de complétion, période, participants
- Actions par statut : Activer, Clore, Archiver, Cloner, Voir détail
- Tri automatique : actives → brouillons → clôturées → archivées

### HRCampaignNew.jsx — Wizard 5 étapes
1. **Identité** — nom (requis), description, dates début/fin
2. **Ciblage** — checkboxes départements + presets (Tous les actifs, CDI > 6 mois, Managers)
3. **Historique** — toggle import N-1 + sélection campagne source
4. **Calendrier** — deadlines employé/manager + notification 48h
5. **Revue** — résumé complet + warning + POST `/api/campaigns` avec `status: 'active'`

### HRCampaignDetail.jsx — Détail campagne
- KPI strip : participants, complétion, en attente, soumis, validés
- Barre de progression globale
- Tableau des évaluations (évalué, manager, statut, score, bouton réaffecter)
- Actions contextuelles selon statut (Activer/Clore/Archiver)
- Modal "Assigner" : choix formulaire + multi-sélection paires → POST `/api/evaluations`
- EditModal : modifier nom/dates/départements → PATCH `/api/campaigns/:id`
- DeleteConfirmModal : supprimer si non active → DELETE `/api/campaigns/:id`

### HRTemplates.jsx — Bibliothèque modèles
- Grille de cartes avec statut libre/verrouillé (`frozenAt`)
- Modal création inline → POST `/api/forms` → navigate builder
- Supprimer (confirm) + Dupliquer (GET/POST)

### HRDirectory.jsx — Annuaire
- Recherche + filtres locaux (rôle, département)
- Table avec avatar initiales, nom, email, poste, département, manager, rôle
- Pagination 50 par page
- Drawer latéral : profil complet + 3 dernières évaluations (`/api/evaluations?evaluateeId=`)

### HRRequests.jsx — Demandes & Contestations
- **Onglet Contestations** : évaluations `disagreementFlag=true`, actions (Traiter/Ignorer/Escalader)
- **Onglet Mobilité** : filtre sur `answers` contenant "mobili" (fragile — dépend des questions mock)
- **Onglet Augmentations** : filtre sur `answers` contenant "augment" (même limitation)
- **Onglet Toutes les évaluations** :
  - Filtre par statut, checkboxes, "Sélectionner tout"
  - Barre bulk : `sign_hr` / `archive` / réaffecter (via ReassignModal)
  - `PATCH /api/evaluations/bulk` — max 200, retourne `{ success, skipped, errors }`
- Drawer détail par évaluation (statut, score, commentaires)

### HRAnalytics.jsx — Analyses RH (données réelles)
5 dashboards calculés depuis `/api/evaluations` et `/api/campaigns` :
1. **Flight Risk Radar** — scatter SVG : performance (score moyen) × satisfaction (proxy disagreementFlag)
2. **Goal Gap Analysis** — barres empilées par département (≥70 atteint / 40-69 partiel / <40 insuffisant)
3. **Skills Gap Map** — taux de complétion par type de formulaire (radar SVG)
4. **Sentiment Heatmap** — score moyen par semaine (grille 52 semaines)
5. **Succession Pipeline (9-Box)** — grille 3×3 performance × potentiel

Filtres actifs : département, période (Q1-Q4 / année), campagne.
Export : non implémenté.

### HRResources.jsx — Bibliothèque ressources
- Grille de cartes, filtre `status=published` côté client
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
| `hr-campaign-evals` | `GET /api/evaluations?campaignId=` | HRCampaignDetail.jsx |
| `hr-evaluations` | `GET /api/evaluations` | HR.jsx |
| `hr-employees` | `GET /api/employees` | HR.jsx |
| `hr-forms` | `GET /api/forms` | HRTemplates.jsx, modal assign |
| `hr-users-active` | `GET /api/users?isActive=true` | Modal assign, ReassignModal |
| `hr-directory-users` | `GET /api/users` | HRDirectory.jsx |
| `user-evals-drawer` | `GET /api/evaluations?evaluateeId=` | HRDirectory.jsx drawer |
| `hr-evaluations-all` | `GET /api/evaluations` | HRRequests.jsx |
| `hr-analytics-evals` | `GET /api/evaluations` | HRAnalytics.jsx |
| `hr-analytics-campaigns` | `GET /api/campaigns` | HRAnalytics.jsx |
| `hr-resources` | `GET /api/resources` | HRResources.jsx |

## Points d'attention

- Ne pas ajouter de sidebar ou topbar dans ces composants — `AuthedLayout` les fournit.
- HRDirectory drawer : le fetch évaluations n'est déclenché que quand un utilisateur est sélectionné (`enabled: !!selectedUser`).
- Les onglets Mobilité et Augmentations dans HRRequests filtrent `answers` par mot-clé — ces filtres ne seront utiles que quand les questions réelles (FormBuilder) seront utilisées dans les évaluations.
- FormBuilder verrouille le formulaire (`frozenAt`) dès la première évaluation créée avec ce formId — impossible de modifier les questions après.

## Historique des décisions

### Phase 5 — Migration pages HR secondaires

- **Avant** : `/hr/directory`, `/hr/requests`, `/hr/analytics`, `/hr/resources`, `/hr/settings` renvoyaient `<PagePlaceholder>`.
- **Après** : Chaque route a son composant complet co-localisé dans ce dossier.
- `HRResources.jsx` remplace `pages/resources/Resources.jsx` (supprimé) — adapté SPA sans shell.

### Phase 6 — Campagnes et FormBuilder (feat/spa-tailwind)

- Ajout de `HRCampaigns.jsx`, `HRCampaignNew.jsx`, `HRCampaignDetail.jsx`, `HRTemplates.jsx`
- Extension de `i18n/fr.js` et `i18n/en.js` avec les clés `cmp.*` et `tpl.*`
- Le `FormBuilder` est dans `pages/formeditor/FormBuilder.jsx` mais sa route est montée sous `/hr/templates/:id/builder`

### Phase 8 — PDF export, expiry logic, analytics route

- `GET /api/evaluations/:id/pdf` : amélioré avec sections par phase, ratings X/5, signatures, footer "Document confidentiel"
- `GET /api/analytics/export/pdf` : nouveau rapport PDF analytique RH (stats globales, top performers, répartition par département)
- `POST /api/evaluations/:id/expire` : expiration manuelle d'une évaluation (admin/hr)
- `expiresAt` et `nearExpiry` ajoutés au modèle Evaluation — expiresAt = campaign.endDate + 30j à la création
- Scheduler étendu : `runExpiryCheck()` expire les évaluations périmées et pose le flag `nearExpiry` à J-7
- Status `expired` ajouté à `EVALUATION_STATUSES` et `VALID_TRANSITIONS`
- HRRequests.jsx : badge ⚠ J-{n} pour les évaluations proches de l'expiration, badge "Expiré" rouge et ligne grisée pour les expirées

