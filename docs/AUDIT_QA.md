# AUDIT QA — NX-RH

**Date :** 2025-07-16  
**Scope :** Frontend (`frontend-v2/src/`) + Backend (`mongo/server/`)  
**Référence :** `CLAUDE.md`, `specs/01-features.md`, `specs/04-flows.md`, `specs/07-api-contract.md`

---

## Résumé exécutif

| Catégorie | Problèmes trouvés | Corrigés |
|-----------|:-----------------:|:--------:|
| Violations CLAUDE.md — Emojis | 9 fichiers | 9 |
| Violations CLAUDE.md — Couleurs hex | 4 fichiers | 4 |
| Violations CLAUDE.md — Rôle `director` | 1 fichier (FormNewPage) | 1 |
| Bugs logique métier | 3 | 3 |
| Contrat API manquant | 1 route backend | 1 |
| Erreurs TypeScript | 0 | — |

---

## 1. Violations CLAUDE.md

### 1.1 Emojis interdits

CLAUDE.md interdit l'usage d'emojis dans l'interface. Les occurrences suivantes ont été supprimées ou remplacées par des icônes Lucide.

| Fichier | Emoji(s) | Correction |
|---------|---------|------------|
| `DashboardEmployeePage.tsx` | 👋 | Supprimé |
| `DashboardAdminPage.tsx` | 👋 | Supprimé |
| `UsersPage.tsx` | ⚠️ | `<AlertTriangle>` (Lucide) |
| `UserDetailPage.tsx` | ⚠️ × 2 | `<AlertTriangle>` (Lucide) |
| `EventsPage.tsx` | ⚠️ | `<AlertTriangle>` (Lucide) |
| `EvaluationDetailPage.tsx` | ⚠️ | `<AlertTriangle>` (Lucide) |
| `AdminUsersPage.tsx` | ⚠️ × 2 | `<AlertTriangle>` (Lucide) |
| `OnboardingPage.tsx` | 👤 📸 👥 ✅ 🎉 (tableau `stepEmojis`) | Remplacé par tableau `stepIcons` : `User, Camera, Users, MonitorCheck, PartyPopper` (Lucide) |

### 1.2 Couleurs hex codées en dur

CLAUDE.md exige l'usage exclusif des variables CSS Tailwind (`var(--color-*)`) ou des classes utilitaires Tailwind. Les constantes et props Recharts/SVG/ReactFlow suivantes ont été corrigées.

| Fichier | Hex(s) remplacé(s) | Remplacement |
|---------|-------------------|--------------|
| `AnalyticsPage.tsx` | `#94A3B8`, `#F59E0B`, `#22C55E`, `#3B82F6`, `#A855F7`, `#0f172a`, `#E2E8F0`, `#64748B` | `var(--color-slate-400)` etc. |
| `CampaignAnalyticsPage.tsx` | `#0f172a`, `#E2E8F0`, `#64748B`, `#94A3B8` | CSS vars + `className="fill-slate-900"` |
| `AnalyticsCampaignPage.tsx` | `#94A3B8`, `#F59E0B`, `#22C55E`, `#E2E8F0`, `#64748B`, `#17A8D4` | `var(--color-slate-400)` etc. |
| `OrgPage.tsx` | `#6366F1`, `#94A3B8` (ReactFlow edges), `#E2E8F0` (Background dots) | `var(--color-indigo-500)`, `var(--color-slate-400)`, `var(--color-slate-200)` |

### 1.3 Rôle `director` interdit

CLAUDE.md stipule que le rôle `director` a été supprimé. Une option UI permettait encore de créer des formulaires de type `director_evaluation`.

| Fichier | Problème | Correction |
|---------|---------|------------|
| `FormNewPage.tsx` | `<option value="director_evaluation">Évaluation directeur</option>` dans le formulaire de création | Option supprimée — ce type ne peut plus être créé depuis l'UI |

**Note :** Les mappings d'affichage (`formTypeLabel`) dans `FormDetailPage.tsx`, `FormsPage.tsx`, et `CampaignDetailPage.tsx` ont été conservés pour assurer la rétrocompatibilité avec les données existantes.

---

## 2. Bugs logique métier

### 2.1 CampaignsPage — rendu vide (bug critique)

**Fichier :** `frontend-v2/src/pages/CampaignsPage.tsx`  
**Sévérité :** Critique

**Description :** Les deux callbacks `campaigns.map()` (tableau desktop et cartes mobile) utilisaient une syntaxe de bloc `{ ... }` sans instruction `return`. Le JSX était produit mais jamais retourné — la liste affichait donc zéro ligne.

**Correction :** Ajout de `return (...)` et des wrappers `<tr key={...}>` / `<div key={...}>` dans les deux blocs map.

### 2.2 CampaignDetailPage — bouton Modifier affiché sur campagnes terminées

**Fichier :** `frontend-v2/src/pages/CampaignDetailPage.tsx`  
**Sévérité :** Majeur

**Description :** Le bouton "Modifier" était visible pour les utilisateurs `admin/hr` même lorsque la campagne avait le statut `closed` ou `archived`, permettant une modification d'objets immuables.

**Correction :** Le bouton n'est affiché que si `campaign?.status !== 'closed' && campaign?.status !== 'archived'`.

### 2.3 CampaignDetailPage — onglet Évaluations visible en mode brouillon

**Fichier :** `frontend-v2/src/pages/CampaignDetailPage.tsx`  
**Sévérité :** Mineur

**Description :** L'onglet Évaluations affichait un lien vers le suivi des évaluations même pour les campagnes en statut `draft`, pour lesquelles aucune évaluation n'est encore générée.

**Correction :** Pour `status === 'draft'`, l'onglet affiche un message informatif à la place du contenu vide.

---

## 3. Contrat API — routes manquantes

### 3.1 GET /api/hr/flags/:id inexistant

**Fichiers :** `mongo/server/routes/hr/flags.js` (backend) / `frontend-v2/src/lib/api.ts` (frontend)  
**Sévérité :** Critique

**Description :** `hrApi.getFlag(id)` appelait `GET /api/hr/flags/:id` qui n'existait pas côté backend — la page `HrFlagDetailPage` crashait systématiquement avec une 404.

**Correction :** Route `GET /:id` ajoutée dans `flags.js`. Elle interroge le modèle `Evaluation` (filtré sur `REQUEST_FORM_TYPES`) et retourne un objet au format `HrFlag` conforme au type TypeScript.

---

## 4. Pages stub / sprint

Aucune page stub active n'a été identifiée :

- `DashboardEmployeePage.tsx` : implémenté avec appels réels à `eventsApi` et `resourcesApi`.
- `DashboardManagerPage.tsx` : implémenté avec appels réels.
- `DashboardDirectorPage.tsx` : fichier orphelin (aucune route dans le router) — conforme à la suppression du rôle director.

---

## 5. Vérification TypeScript

```
npx tsc --noEmit
```

**Résultat :** 0 erreur. Toutes les corrections sont type-safe.

---

## 6. Récapitulatif des fichiers modifiés

| Fichier | Modifications |
|---------|--------------|
| `frontend-v2/src/pages/DashboardEmployeePage.tsx` | Suppression emoji 👋 |
| `frontend-v2/src/pages/DashboardAdminPage.tsx` | Suppression emoji 👋 |
| `frontend-v2/src/pages/UsersPage.tsx` | Remplacement ⚠️ → AlertTriangle |
| `frontend-v2/src/pages/UserDetailPage.tsx` | Remplacement ⚠️×2 → AlertTriangle |
| `frontend-v2/src/pages/EventsPage.tsx` | Remplacement ⚠️ → AlertTriangle |
| `frontend-v2/src/pages/EvaluationDetailPage.tsx` | Remplacement ⚠️ → AlertTriangle |
| `frontend-v2/src/pages/AdminUsersPage.tsx` | Remplacement ⚠️×2 → AlertTriangle |
| `frontend-v2/src/pages/OnboardingPage.tsx` | Remplacement tableau stepEmojis → stepIcons (Lucide) |
| `frontend-v2/src/pages/CampaignsPage.tsx` | Fix bug critique — return + wrappers dans map() |
| `frontend-v2/src/pages/CampaignDetailPage.tsx` | Bouton Modifier conditionné ; message draft sur onglet évaluations |
| `frontend-v2/src/pages/AnalyticsPage.tsx` | Hex → CSS vars (CHART_COLORS, STATUS_COLORS) |
| `frontend-v2/src/pages/CampaignAnalyticsPage.tsx` | Hex → CSS vars + SVG fill → className |
| `frontend-v2/src/pages/AnalyticsCampaignPage.tsx` | Hex → CSS vars (CAMPAIGN_STATUS_COLORS + chart) |
| `frontend-v2/src/pages/OrgPage.tsx` | Hex → CSS vars (edges + Background dots) |
| `frontend-v2/src/pages/FormNewPage.tsx` | Suppression option director_evaluation |
| `mongo/server/routes/hr/flags.js` | Ajout route GET /:id |
