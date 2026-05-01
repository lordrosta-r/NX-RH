# NX-RH — Spécification Maîtresse Frontend v2
> Source unique de vérité · Générée à partir de l'analyse croisée des 6 specs sources

---

## Section 0 — En-tête & Statut

| Champ | Valeur |
|---|---|
| **Date de génération** | 2025 |
| **Version** | 1.1.0 |
| **Stack** | React 18 + Vite + TypeScript + Tailwind CSS |
| **Statut** | ✅ READY FOR IMPLEMENTATION |
| **Auteur** | Architecte produit (synthèse multi-agents) |

**Fichiers sources** :
- [`01-features.md`](./01-features.md) — Inventaire des fonctionnalités par rôle
- [`02-design-system.md`](./02-design-system.md) — Tokens design
- [`03-screens.md`](./03-screens.md) — Inventaire des 40 écrans
- [`04-flows.md`](./04-flows.md) — Flux UX et machines à états
- [`05-notifications.md`](./05-notifications.md) — Système de notifications
- [`06-components.md`](./06-components.md) — Bibliothèque de composants
- [`07-api-contract.md`](./07-api-contract.md) — Contrats des endpoints backend

---

## Section 1 — Résumé Exécutif

### Qu'est-ce que NX-RH ?

NX-RH est l'outil de gestion des entretiens annuels de NanoXplore. Il couvre l'intégralité du cycle RH : création de campagnes d'évaluation, remplissage de formulaires, circuit de signature multi-acteurs, onboarding/offboarding collaborateurs, ressources documentaires et analytique. L'interface est inspirée d'Eurecia (cards blanches, couleur primaire teal `#17A8D4`) avec une navigation par barre top fixe, sans sidebar.

### Les 5 rôles

| Rôle | Description |
|---|---|
| `admin` | Administrateur système — accès total, gestion LDAP, RGPD, configuration |
| `hr` | Responsable RH — gestion campagnes, évaluations, offboarding, audit |
| `director` | Directeur N+2 — revoir et co-signer les évaluations de ses équipes |
| `manager` | Manager N+1 — idem director mais périmètre limité aux subordonnés directs |
| `employee` | Employé — remplir ses propres évaluations, signer, voir ses ressources |

### Les 10 modules

1. **Auth & Profil** · 2. **Utilisateurs** · 3. **Campagnes** · 4. **Formulaires** · 5. **Évaluations** · 6. **Calendrier & Événements** · 7. **Ressources** · 8. **Offboarding** · 9. **Analytique** · 10. **Administration**

### Décisions de design clés

- **Pas de sidebar** — navigation top navbar fixe (h-16 desktop, h-14 mobile)
- **Inspiration Eurecia** — cards blanches, ombres douces, couleur primaire `#17A8D4`
- **Responsive** — desktop 1280px · tablette 768px · mobile 375px
- **Inter** comme police principale (Google Fonts)
- **Lucide React** pour toutes les icônes
- **Dark mode** supporté via classe `.dark` sur `<html>` (Tailwind `darkMode: 'class'`)

### Stack technique

```
React 18 · Vite · TypeScript · Tailwind CSS · React Router v6
TanStack Query (React Query) · Zustand · React Hook Form · Zod
Lucide React · Recharts (ou Victory) pour les graphes
```

---

## Section 2 — Incohérences Détectées et Résolutions

> **Note** : 8 incohérences réelles identifiées par recoupement des 6 specs. Chaque incohérence propose une résolution prescriptive.

---

### INC-01 · Nom du statut `signed_employee` vs `signed_evaluatee`

**Fichiers en conflit** : `02-design-system.md` (§6.3 Badges) vs tous les autres fichiers.

**Problème** : Le design system nomme le badge `signed_employee` avec libellé "Signée (collaborateur)". Tous les autres specs (`01-features`, `03-screens`, `04-flows`, `05-notifications`) utilisent `signed_evaluatee`.

**Résolution** ✅ : **Utiliser `signed_evaluatee`** (aligné avec le backend et les 4 autres specs).  
Dans `StatusBadge`, mapper `signed_evaluatee` → `bg-info-50 text-info-600` · libellé : "Signée (évalué)".

---

### INC-02 · Score d'évaluation : 1–10 vs /100

**Fichiers en conflit** : `04-flows.md` (Flux 4, Étape C : "saisie du score 1–10") vs `03-screens.md` (S-17 Mode B : "Score global* [____] /100").

**Problème** : Le flux UX dit "score 1–10" mais l'écran affiche "/100". Incohérent pour l'implémentation.

**Résolution** ✅ : **Le score reviewer est sur 100** (aligné avec l'écran S-17 et le composant `RatingInput` mode `scale`). La mention "1–10" dans 04-flows est une erreur de rédaction. `reviewerScore` est un entier `0–100`.

---

### INC-03 · Routes manquantes dans `03-screens.md`

**Fichiers en conflit** : `03-screens.md` vs `01-features.md` (§4 cartographie) + `04-flows.md` + `05-notifications.md`.

**Problème** : Les routes suivantes sont référencées dans les flux mais absentes de l'inventaire des écrans :
- `/evaluations/bulk` — mentionné dans `01-features` §4 et `04-flows` Flux 4A
- `/resources/new` — mentionné dans `04-flows` Flux 7 et `01-features` §4
- `/offboarding/new` — mentionné dans `04-flows` Flux 6 et `01-features` §4
- `/notifications` — page complète définie dans `05-notifications` §6 mais absente de `03-screens`
- `/calendar/new` — mentionné dans l'annexe B de `03-screens` mais sans fiche écran

**Résolution** ✅ : **Ajouter ces 5 routes** à l'inventaire officiel (voir Section 7, checklist). Layout identique aux patterns existants. Rôles : `/evaluations/bulk` (admin/hr), `/resources/new` (admin/hr), `/offboarding/new` (admin/hr), `/notifications` (tous), `/calendar/new` (admin/hr).

---

### INC-04 · Position des toasts : `bottom-4` vs `bottom-6`

**Fichiers en conflit** : `03-screens.md` (`fixed bottom-4 right-4`) vs `04-flows.md` §7.3 (`bottom-6 right-6`).

**Résolution** ✅ : **`fixed bottom-4 right-4 z-[9999]`** — aligné avec `03-screens` et `05-notifications`. La valeur `bottom-6` dans `04-flows` est une erreur de rédaction.

---

### INC-05 · Types de questions manquants dans `QuestionBuilder` (06-components)

**Fichiers en conflit** : `06-components.md` `QuestionBuilder` interface vs `01-features.md` + `03-screens.md`.

**Problème** : Le composant `QuestionBuilder` dans `06-components` ne définit que 5 types (`text`, `rating`, `yes_no`, `choice`, `scale`). Il manque `weather`, `mobility`, `n1_import` (définis dans 01 et 03). De plus, `scale` n'est pas listé dans les specs fonctionnelles.

**Résolution** ✅ : **L'interface `QuestionType` doit inclure les 7 types officiels** :
```typescript
type QuestionType = 'rating' | 'text' | 'yes_no' | 'choice' | 'weather' | 'mobility' | 'n1_import';
```
Supprimer `scale` (non métier). `n1_import` s'affiche en lecture seule pour l'évalué.

---

### INC-06 · Navbar admin/hr incomplète dans `06-components`

**Fichiers en conflit** : `06-components.md` (Navbar, liens admin/hr) vs `04-flows.md` (§1.1 Navbar par rôle).

**Problème** : `06-components` omet le lien **Calendrier** pour admin/hr, et omet **Offboarding** pour admin. `04-flows` liste Calendrier explicitement pour tous les rôles avec navbar.

**Résolution** ✅ : **Navbar admin** = Tableau de bord · Utilisateurs · Campagnes · Formulaires · Évaluations · Calendrier · Ressources · **Offboarding** · Analytics · Admin ▾  
**Navbar hr** = Tableau de bord · Utilisateurs · Campagnes · Formulaires · Évaluations · **Calendrier** · Ressources · Offboarding · Analytics

---

### INC-07 · `managerActionRequired` : destinataire ambigu

**Fichiers en conflit** : `01-features.md` (§ Notifications) vs `05-notifications.md` (§4 matrice).

**Problème** : Dans `01-features`, `managerActionRequired` est décrit comme "Évaluation passée à `reviewed` ou `signed_hr`" avec destinataire "Évalué". Le nom laisse entendre que c'est le manager qui doit agir. Dans `05-notifications`, le corps dit "Votre évaluation a été révisée et attend votre signature" (envoyé à l'évalué).

**Résolution** ✅ : **`managerActionRequired` est envoyé à l'ÉVALUÉ** (employee) pour l'informer que son manager a terminé la revue et qu'il peut signer. Le nom (hérité du backend) est trompeur mais ne doit pas être changé côté frontend (clé constante). Le libellé UI doit être "Action requise sur votre évaluation".

---

### INC-08 · Page préférences : route vs ancre

**Fichiers en conflit** : `03-screens.md` (S-32 `/profile/preferences` = page dédiée) vs `05-notifications.md` + `04-flows.md` (utilisent `/profile#notifications`).

**Résolution** ✅ : **`/profile/preferences` est la route canonique** (page dédiée, S-32). L'ancre `#notifications` peut être utilisée comme scroll-to dans cette page. Les liens `→ /profile#notifications` dans les notifications redirigent vers `/profile/preferences` avec scroll automatique vers la section notifications.

---

## Section 3 — Architecture Technique

### 3.1 Structure du projet

```
frontend-v2/
├── src/
│   ├── components/
│   │   ├── layout/          # AppLayout, PageHeader, PageContainer, Navbar, Breadcrumbs
│   │   │                    # EmptyState, LoadingPage, ErrorBoundary
│   │   ├── navigation/      # NavItem, NavDropdown, UserMenu, MobileDrawer
│   │   ├── data-display/    # DataTable, DataCard, StatCard, StatusBadge, Avatar
│   │   │                    # AvatarGroup, ProgressBar, ProgressSteps, Timeline
│   │   ├── forms/           # FormField, Input, Textarea, Select, DatePicker
│   │   │                    # Toggle, Checkbox, CheckboxGroup, RadioGroup
│   │   │                    # RatingInput, QuestionBuilder, SearchInput
│   │   ├── feedback/        # Toast, ToastContainer, Alert, Modal, ConfirmDialog
│   │   │                    # Tooltip, Skeleton
│   │   ├── actions/         # Button, IconButton, ActionMenu, Pagination, FilterBar
│   │   └── domain/
│   │       ├── campaigns/   # CampaignCard
│   │       ├── evaluations/ # EvaluationCard, EvaluationForm, SignaturePanel
│   │       ├── offboarding/ # OffboardingChecklist
│   │       ├── users/       # OnboardingSteps, RoleBadge, DepartmentTag
│   │       └── notifications/ # NotificationItem, NotificationBell
│   ├── charts/              # CompletionRateChart, ScoreDistribution, CampaignSummaryTable
│   ├── pages/               # 1 dossier par module
│   ├── hooks/               # useAuth, useNotifications, useRoleGuard...
│   ├── services/            # api.ts + 1 fichier par module (campaignService.ts...)
│   ├── stores/              # authStore.ts, notificationStore.ts
│   ├── types/               # Tous les types TypeScript (User, Campaign, Evaluation...)
│   └── utils/               # formatDate, cn (classnames), roleGuard, debounce
├── public/
├── index.html
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

### 3.2 State Management

| État | Technologie | Justification |
|---|---|---|
| Auth (`user`, `role`, `token`) | **Zustand** (`authStore`) | Global, persisté en `sessionStorage` |
| Notifications (`unreadCount`, liste) | **TanStack Query** + polling 30s | Cache invalidé par `useNotificationPolling` |
| Données de page (listes, détails) | **TanStack Query** | Cache automatique, staleTime 30s |
| État formulaire (RHF) | **React Hook Form** | Local à la page, validation Zod |
| Thème / locale | **Zustand** (`uiStore`) | Persisté en `localStorage` |
| Modales, drawers | **État local** (`useState`) | Jamais global |

### 3.3 Couche API

```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // JWT en cookie httpOnly
});

// Intercepteur 401 → logout + redirect
api.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) {
    authStore.getState().logout();
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?returnUrl=${returnUrl}`;
  }
  if (error.response?.status === 429) {
    // Retry après délai indiqué dans Retry-After
  }
  return Promise.reject(error);
});
```

**Query keys** (pattern) :
```typescript
['campaigns']               // liste
['campaigns', id]           // détail
['campaigns', id, 'analytics']
['evaluations', { campaignId, status }]
['users', id]
['notifications']
```

### 3.4 Routing

**Librairie** : React Router v6 avec `createBrowserRouter`.

```tsx
// Composant de route protégée
function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
```

**Redirect après login** :
```tsx
// Récupération du returnUrl depuis la query string
const [searchParams] = useSearchParams();
const returnUrl = searchParams.get('returnUrl') ?? '/';
navigate(returnUrl, { replace: true });
```

**Routes complètes** (voir Section 7 pour le mapping complet).

---

## Section 4 — Implémentation par Module

### Module 1 — Auth

| Champ | Détail |
|---|---|
| **Écrans** | `/login` (S-01), `/login/ldap` (S-02) |
| **Composants clés** | `Input`, `Button`, `Alert`, `Checkbox`, `FormField` |
| **API** | `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` · `PATCH /api/auth/preferences` |
| **Rôles** | Public (non authentifié) |
| **Flux** | Flux 1 — cookie httpOnly, returnUrl en sessionStorage |
| **Notifications** | Aucune |
| **Règles métier** | ① `authSource=ldap` → `/login/ldap` seulement si `VITE_LDAP_ENABLED=true` · ② Brute-force : 5 tentatives/15min/email → 429 · ③ `isActive=false` → 403 |

### Module 2 — Utilisateurs

| Champ | Détail |
|---|---|
| **Écrans** | `/users` (S-04), `/users/new` (S-05), `/users/:id` (S-06), `/users/:id/edit` (S-07), `/users/:id/offboarding` (S-08), `/profile` (S-31), `/profile/preferences` (S-32), `/onboarding` (S-33) |
| **Composants clés** | `DataTable`, `Avatar`, `StatusBadge`, `RoleBadge`, `OnboardingSteps`, `ProgressBar`, `ConfirmDialog`, `FormField`, `Select` |
| **API** | `GET /api/users` · `POST /api/users` · `GET|PATCH /api/users/:id` · `PATCH /api/users/:id/onboarding/:stepIndex` · `GET /api/users/:id/gdpr-export` · `DELETE /api/users/:id/gdpr-anonymize` · `GET /api/users/:id/offboard-preview` · `PATCH /api/users/:id/offboard` · `PATCH /api/auth/preferences` · `PATCH /api/users/:id/avatar` |
| **Rôles** | admin/hr = tout · director = subordonnés · manager = subordonnés directs · employee = soi |
| **Flux** | Flux 5 (onboarding), Flux 10 (profil/préférences) |
| **Notifications** | `onboardingComplete` (admin · hr · manager direct) |
| **Règles métier** | ① Mot de passe temporaire affiché UNE seule fois à la création · ② Pas de cycle hiérarchique (jusqu'à 20 niveaux) · ③ `passwordHash` et `ldapDn` jamais retournés |

### Module 3 — Campagnes

| Champ | Détail |
|---|---|
| **Écrans** | `/campaigns` (S-09), `/campaigns/new` (S-10), `/campaigns/:id` (S-11), `/campaigns/:id/analytics` (S-12) |
| **Composants clés** | `DataTable`, `StatusBadge`, `ProgressBar`, `Button`, `ConfirmDialog`, `DatePicker`, `Select` (multi), `StatCard` |
| **API** | `GET /api/campaigns` · `POST /api/campaigns` · `GET|PATCH|DELETE /api/campaigns/:id` · `POST /api/campaigns/:id/clone` · `GET /api/campaigns/:id/analytics` · `GET /api/evaluations/:id/n1-context` |
| **Rôles** | admin/hr = tout · director/manager = actives (lecture) · employee = actives uniquement |
| **Flux** | Flux 2 (création + activation) |
| **Notifications** | `campaignLaunch` (participants depts ciblés) |
| **Règles métier** | ① Cycle irréversible : `draft→active→closed→archived` · ② Suppression uniquement sur `draft` ou `archived` · ③ `endDate > startDate` obligatoire · ④ Clonage : formulaires clonés avec `frozenAt=null` · ⑤ `enableN1Context=false` masque les champs `n1VisibleToEmployee` et `previousCampaignId` · ⑥ `previousCampaignId` vide → auto-fallback backend sur la campagne closed/archived la plus récente |

### Module 4 — Formulaires

| Champ | Détail |
|---|---|
| **Écrans** | `/forms` (S-13), `/forms/new` (S-14), `/forms/:id` (S-15) |
| **Composants clés** | `DataCard`, `StatusBadge`, `QuestionBuilder`, `Select`, `Toggle`, `Alert` |
| **API** | `GET /api/forms` · `POST /api/forms` · `GET|PATCH|DELETE /api/forms/:id` |
| **Rôles** | Tous (lecture) · admin/hr (écriture) |
| **Flux** | Flux 3 (création + gestion gel) |
| **Notifications** | `formFrozen` (admin · hr à la création de la 1ère évaluation) |
| **Règles métier** | ① `frozenAt` bloque les questions (bannière `warning`, inputs `disabled`) · ② `title` et `description` modifiables même gelés · ③ Suppression impossible si `frozenAt` · ④ `upward_feedback` toujours anonyme (forcé) |

### Module 5 — Évaluations

| Champ | Détail |
|---|---|
| **Écrans** | `/evaluations` (S-16), `/evaluations/:id` (S-17, 4 modes), `/evaluations/history` (S-18), `/evaluations/bulk` (ajouté INC-03) |
| **Composants clés** | `DataTable`, `StatusBadge`, `ProgressSteps`, `RatingInput`, `Textarea`, `SignaturePanel`, `EvaluationForm`, `ProgressBar`, `ConfirmDialog`, `Alert` |
| **API** | `GET /api/evaluations` · `POST /api/evaluations` · `POST /api/evaluations/bulk` · `GET|PATCH /api/evaluations/:id` · `PATCH /api/evaluations/bulk` · `PATCH /api/evaluations/:id/reassign` · `POST /api/evaluations/:id/expire` · `GET /api/evaluations/export` · `GET /api/evaluations/:id/pdf` · `GET /api/evaluations/history` |
| **Rôles** | Tous (scopés selon rôle) |
| **Flux** | Flux 4 (processus complet, étapes A→D) |
| **Notifications** | `evaluationAssigned` · `evaluationSubmitted` · `evaluationReviewed` · `managerActionRequired` · `deadlineReminder` · `evaluationSignedByEvaluatee` · `evaluationSignedByManager` · `evaluationSignedByHR` · `evaluationValidated` · `evaluationExpired` · `evaluationReassigned` · `evaluationBulkCreated` |
| **Règles métier** | ① Réponses verrouillées après `submitted` (409) · ② `evaluatorId` masqué si `form.isAnonymous=true` · ③ `expiresAt = campaign.endDate + 30j` · ④ Score reviewer : 0–100 (entier) · ⑤ Réaffectation impossible si `signed_hr` ou `validated` |

### Module 6 — Calendrier & Événements

| Champ | Détail |
|---|---|
| **Écrans** | `/events` (S-19), `/events/:id` (S-20), `/calendar/new` (ajouté INC-03) |
| **Composants clés** | `DataCard`, `Select`, `DatePicker`, `Modal` (slide-over), `FilterBar` |
| **API** | `GET /api/events` · `POST /api/events` · `GET|PATCH|DELETE /api/events/:id` |
| **Rôles** | Tous (filtrés par `targetRoles`) · admin/hr = écriture |
| **Flux** | Partie flux 4 (événements deadline) |
| **Notifications** | `deadlineReminder` (via scheduler J-7 / J-1) |
| **Règles métier** | ① `targetRoles` vide = visible tous rôles · ② `reminderSent` géré par scheduler (pas le frontend) |

### Module 7 — Ressources

| Champ | Détail |
|---|---|
| **Écrans** | `/resources` (S-21), `/resources/:id` (S-22), `/resources/new` (ajouté INC-03) |
| **Composants clés** | `DataCard`, `StatusBadge`, `Select` (multi), `Button`, `Modal` |
| **API** | `GET /api/resources` · `POST /api/resources` · `GET|PATCH|DELETE /api/resources/:id` |
| **Rôles** | Tous (publiées + `visibleTo`) · admin/hr = toutes + draft |
| **Flux** | Flux 7 |
| **Notifications** | Aucune |
| **Règles métier** | ① `publishedAt` auto à la publication · ② Nom de fichier validé (pas de `..`, alphanumériques uniquement) · ③ Téléchargement = `Content-Disposition: attachment` |

### Module 8 — Offboarding

| Champ | Détail |
|---|---|
| **Écrans** | `/offboarding` (S-23), `/offboarding/:id` (S-24), `/offboarding/new` (ajouté INC-03) |
| **Composants clés** | `DataTable`, `OffboardingChecklist`, `ProgressBar`, `Textarea`, `StatusBadge`, `ConfirmDialog` |
| **API** | `GET /api/offboarding` · `POST /api/offboarding` · `GET|PATCH|DELETE /api/offboarding/:id` · `PATCH /api/offboarding/:id/checklist/:itemIndex` · `GET /api/users/:id/offboard-preview` · `PATCH /api/users/:id/offboard` |
| **Rôles** | admin/hr uniquement |
| **Flux** | Flux 6 |
| **Notifications** | `offboardingInitiated` · `offboardingCompleted` |
| **Règles métier** | ① Une seule demande par utilisateur (409 si doublon) · ② `completed` → `user.isActive=false`, `archivedAt=now` · ③ Modal de confirmation avant passage à `completed` avec résumé des impacts · ④ `in_progress` automatique au 1er item coché |

### Module 9 — Analytique

| Champ | Détail |
|---|---|
| **Écrans** | `/analytics` (S-25) |
| **Composants clés** | `StatCard`, `CompletionRateChart`, `ScoreDistribution`, `CampaignSummaryTable`, `Select`, `Button` |
| **API** | `GET /api/campaigns/:id/analytics` · `GET /api/analytics/export/pdf` · `GET /api/evaluations/export` |
| **Rôles** | admin, hr |
| **Flux** | (lecture seule, pas de flux interactif) |
| **Notifications** | Aucune |
| **Règles métier** | ① Graphes recharts (palette = tokens sémantiques du design system) · ② Sélecteur campagne rafraîchit tous les graphes · ③ Export PDF déclenche `GET /api/analytics/export/pdf?campaignId=:id` |

### Module 10 — Administration

| Champ | Détail |
|---|---|
| **Écrans** | `/admin` (S-26), `/admin/config` (S-27), `/admin/ldap` (S-28), `/admin/audit` (S-29), `/admin/users` (S-30) |
| **Composants clés** | `DataTable`, `Modal`, `Input`, `Button`, `Alert`, `Timeline`, `FilterBar` |
| **API** | `GET|PUT|PATCH|DELETE /api/admin/config` · `PATCH /api/admin/config/batch` · `POST /api/admin/email/test` · `GET /api/admin/audit` · `GET /api/admin/audit?format=csv` · `POST /api/admin/ldap/test` · `POST /api/admin/ldap/preview` · `POST /api/admin/ldap/sync` · `GET|PUT /api/admin/ldap/config` · `POST /api/hr/notifications/bulk-remind` |
| **Rôles** | admin (tout) · hr (`/admin/audit` + `/hr/settings` + `/hr/notifications/bulk-remind`) |
| **Flux** | Flux 8 (LDAP), Flux 9 (audit) |
| **Notifications** | `ldapSyncComplete` · `ldapSyncFailed` · `systemAlerts` |
| **Règles métier** | ① `bindPassword` jamais retourné en lecture (write-only) · ② Nouveaux utilisateurs LDAP = rôle `employee` par défaut · ③ Rôle toujours géré en DB, jamais depuis LDAP |

---

## Section 5 — Design System Quick Reference

### Palette de couleurs

| Token | Hex | Usage principal |
|---|---|---|
| `primary-500` | `#17A8D4` | CTA, liens actifs |
| `primary-600` | `#1290B5` | Hover bouton primaire |
| `primary-700` | `#0E7090` | Texte sur fond clair, nav active |
| `primary-50` | `#EFF9FD` | Fond hover subtil |
| `primary-100` | `#D9F1FA` | Fond badge info |
| `slate-50` | `#F8FAFC` | Fond page global |
| `slate-200` | `#E2E8F0` | Bordures cards |
| `slate-500` | `#64748B` | Texte secondaire |
| `slate-700` | `#334155` | Texte corps |
| `slate-900` | `#0F172A` | Titres principaux |
| `success-500` | `#22C55E` | Icône succès |
| `success-600` | `#16A34A` | Texte succès |
| `success-50` | `#F0FDF4` | Fond alerte succès |
| `warning-500` | `#F59E0B` | Badge en attente |
| `warning-50` | `#FFFBEB` | Fond alerte warning |
| `error-500` | `#EF4444` | Icône erreur |
| `error-600` | `#DC2626` | Texte erreur, bouton danger |
| `error-50` | `#FEF2F2` | Fond alerte erreur |
| `info-500` | `#3B82F6` | Icône info |
| `info-50` | `#EFF6FF` | Fond badge info |

### Typographie

| Classe | Size | Weight | Usage |
|---|---|---|---|
| `text-3xl font-bold` | 30px/700 | H1 page |
| `text-2xl font-semibold` | 24px/600 | H2 section |
| `text-xl font-semibold` | 20px/600 | Titre card (H3) |
| `text-base font-normal` | 16px/400 | Corps |
| `text-sm font-medium` | 14px/500 | Labels, tables |
| `text-xs font-normal` | 12px/400 | Captions, metadata |

Police : `Inter` · `font-sans` dans Tailwind.

### Variants boutons

| Variante | Fond | Texte | Hover |
|---|---|---|---|
| `primary` | `primary-500` | white | `primary-600` |
| `secondary` | white | `primary-700` | `primary-50` bg |
| `ghost` | transparent | `slate-700` | `slate-100` bg |
| `danger` | `error-600` | white | `error-700` |

Tailles : `sm`=h-8, `md`=h-10, `lg`=h-12.

### Mapping complet des statuts badges

#### Statuts campagne

| Statut | Fond | Texte | Libellé |
|---|---|---|---|
| `draft` | `slate-100` | `slate-600` | Brouillon |
| `active` | `primary-100` | `primary-700` | Active |
| `closed` | `warning-50` | `warning-600` | Clôturée |
| `archived` | `slate-200` | `slate-500` | Archivée |

#### Statuts évaluation

| Statut | Fond | Texte | Libellé |
|---|---|---|---|
| `assigned` | `info-50` | `info-600` | Assignée |
| `in_progress` | `primary-100` | `primary-700` | En cours |
| `submitted` | `warning-50` | `warning-600` | Soumise |
| `reviewed` | `success-50` | `success-600` | Vérifiée |
| `signed_evaluatee` | `info-50` | `info-600` | Signée (évalué) |
| `signed_manager` | `primary-100` | `primary-700` | Signée (manager) |
| `signed_hr` | `primary-50` | `primary-600` | Signée (RH) |
| `validated` | `success-50` | `success-700` | Validée |
| `expired` | `error-50` | `error-600` | Expirée |
| `archived` | `slate-200` | `slate-500` | Archivée |

Style pill : `px-2.5 py-0.5 rounded-full text-xs font-medium`

---

## Section 6 — Règles d'Or du Frontend

Les règles suivantes sont **non-négociables**. Tout développeur doit les lire avant d'implémenter une fonctionnalité.

1. **Jamais de modification des réponses après `submitted`** — retourner un 409 côté API ; côté UI, mettre les inputs en lecture seule et afficher une bannière `info`.
2. **Un formulaire avec `frozenAt` : les questions sont en lecture seule** — désactiver tous les boutons d'édition, de suppression et de drag dans `QuestionBuilder` (`disabled=true`).
3. **Ne jamais afficher `evaluatorId` pour les évaluations anonymes** — si `form.isAnonymous=true`, masquer le nom de l'évaluateur dans la liste, le détail d'évaluation et le PDF.
4. **Toujours vérifier le rôle avant d'afficher les boutons d'action** — aucun bouton de création/modification/suppression ne doit être rendu si l'utilisateur n'a pas la permission (utiliser `user.role`).
5. **Les boutons primaires sont TOUJOURS en haut à droite du `PageHeader`** — jamais en bas de page sauf pour les soumissions de formulaires.
6. **Les actions destructrices passent TOUJOURS par un `ConfirmDialog`** — jamais de DELETE/anonymisation directe sans confirmation explicite.
7. **Le mot de passe temporaire est affiché UNE SEULE FOIS** — dans une modal post-création ; le fermer efface définitivement la valeur.
8. **`bindPassword` LDAP n'est jamais affiché** — le champ est toujours `type="password"` write-only avec placeholder "••••••••".
9. **Le statut de campagne est irréversible** : `draft → active → closed → archived`. Ne jamais afficher de bouton pour revenir en arrière.
10. **`expiresAt` des évaluations = `campaign.endDate + 30j`** — calculé à la création, jamais modifiable manuellement (sauf expiration forcée admin/hr).
11. **Polling notifications : 30s onglet actif, 5min en arrière-plan** — ne jamais utiliser de WebSocket (backend REST only).
12. **Sauvegarde automatique des évaluations : debounce 2s** — afficher `lastSavedAt` après chaque sauvegarde réussie.
13. **Les campagnes `draft` et `closed` sont cachées aux employés** — n'afficher que `active` pour le rôle `employee`.
14. **Les ressources `draft` sont invisibles aux non-admin/hr** — filtrer côté frontend si l'API retourne tous les statuts.
15. **L'offboarding `completed` désactive l'utilisateur** — afficher une modal de confirmation avec résumé de l'impact avant de confirmer.
16. **Les transitions d'évaluation sont guardées par rôle** — un `employee` ne peut pas déclencher `submitted → reviewed`. Masquer le bouton si `user.role` n'est pas dans la liste des acteurs autorisés.
17. **Un utilisateur ne peut pas être son propre manager** — valider côté client dans le sélecteur de manager (exclure `user.id` des options).
18. **L'anonymisation RGPD nécessite la saisie de "CONFIRMER"** — vérifier la correspondance exacte avant d'activer le bouton de confirmation.
19. **Score reviewer : entier 0–100** — utiliser `<Input type="number" min={0} max={100} />`, validation Zod : `z.number().int().min(0).max(100)`.
20. **Toute transition de statut d'évaluation vers `signed_*` ou `validated` est permanente** — ces évaluations ne peuvent plus être modifiées, l'UI doit le refléter avec un bandeau `info`.

---

## Section 7 — Checklist d'Implémentation

> **Légende** : ☐ = Non commencé · ☑ = En cours · ✅ = Terminé

| Écran | Route | Composants principaux | Endpoint clé | Tests |
|---|---|---|---|---|
| Connexion | `/login` | `Input`, `Button`, `Alert`, `Checkbox` | `POST /api/auth/login` | ☐ |
| Connexion LDAP | `/login/ldap` | `Input`, `Button` | `POST /api/auth/login` | ☐ |
| Dashboard (×5 rôles) | `/` | `StatCard`, `DataTable`, `ProgressBar` | `GET /api/auth/me` | ☐ |
| Liste utilisateurs | `/users` | `DataTable`, `Avatar`, `StatusBadge`, `FilterBar` | `GET /api/users` | ☐ |
| Créer utilisateur | `/users/new` | `FormField`, `Input`, `Select` | `POST /api/users` | ☐ |
| Profil utilisateur | `/users/:id` | `Avatar`, `Tabs`, `OnboardingSteps`, `ProgressBar` | `GET /api/users/:id` | ☐ |
| Modifier utilisateur | `/users/:id/edit` | `FormField`, `Input`, `Select`, `Toggle` | `PATCH /api/users/:id` | ☐ |
| Redirect offboarding | `/users/:id/offboarding` | — | — | ☐ |
| Liste campagnes | `/campaigns` | `DataTable`, `StatusBadge`, `ProgressBar` | `GET /api/campaigns` | ☐ |
| Créer campagne | `/campaigns/new` | `FormField`, `Input`, `DatePicker`, `Select`, `Toggle` | `POST /api/campaigns` | ☐ |
| Modifier campagne | `/campaigns/:id/edit` | `FormField`, `Input`, `DatePicker`, `Select`, `Toggle` | `PATCH /api/campaigns/:id` | ☐ |
| Détail campagne | `/campaigns/:id` | `StatCard`, `StatusBadge`, `Tabs`, `ProgressBar` | `GET /api/campaigns/:id` | ☐ |
| Analytics campagne | `/campaigns/:id/analytics` | `ScoreDistribution`, `CompletionRateChart` | `GET /api/campaigns/:id/analytics` | ☐ |
| Bibliothèque formulaires | `/forms` | `DataCard`, `StatusBadge` | `GET /api/forms` | ☐ |
| Créer formulaire | `/forms/new` | `QuestionBuilder`, `Select`, `Toggle` | `POST /api/forms` | ☐ |
| Éditer formulaire | `/forms/:id` | `QuestionBuilder`, `Alert` (gel) | `GET|PATCH /api/forms/:id` | ☐ |
| Liste évaluations | `/evaluations` | `DataTable`, `StatusBadge`, `Avatar`, `FilterBar` | `GET /api/evaluations` | ☐ |
| Détail évaluation (4 modes) | `/evaluations/:id` | `EvaluationForm`, `ProgressSteps`, `SignaturePanel`, `RatingInput` | `GET|PATCH /api/evaluations/:id` | ☐ |
| Historique évaluations | `/evaluations/history` | `DataCard`, `StatusBadge` | `GET /api/evaluations/history` | ☐ |
| Création en masse | `/evaluations/bulk` | `DataTable`, `Select`, `Button` | `POST /api/evaluations/bulk` | ☐ |
| Calendrier | `/events` | `DataCard`, `FilterBar` | `GET /api/events` | ☐ |
| Détail événement | `/events/:id` | `Modal` (slide-over), `FormField` | `GET|PATCH|DELETE /api/events/:id` | ☐ |
| Nouvel événement | `/calendar/new` | `FormField`, `DatePicker`, `Select` | `POST /api/events` | ☐ |
| Bibliothèque ressources | `/resources` | `DataCard`, `StatusBadge` | `GET /api/resources` | ☐ |
| Détail ressource | `/resources/:id` | `StatusBadge`, `Button` | `GET|PATCH /api/resources/:id` | ☐ |
| Nouvelle ressource | `/resources/new` | `FormField`, `Input`, `Select` | `POST /api/resources` | ☐ |
| Liste offboardings | `/offboarding` | `DataTable`, `StatusBadge`, `ProgressBar` | `GET /api/offboarding` | ☐ |
| Dossier offboarding | `/offboarding/:id` | `OffboardingChecklist`, `ProgressBar`, `Textarea` | `GET|PATCH /api/offboarding/:id` | ☐ |
| Nouvel offboarding | `/offboarding/new` | `FormField`, `Select`, `DatePicker` | `POST /api/offboarding` | ☐ |
| Analytics global | `/analytics` | `StatCard`, `ScoreDistribution`, `CompletionRateChart` | `GET /api/campaigns/:id/analytics` | ☐ |
| Hub admin | `/admin` | `DataCard` (5 cards) | — | ☐ |
| Config système | `/admin/config` | `DataTable`, `Modal` | `GET|PUT|PATCH|DELETE /api/admin/config` | ☐ |
| Config LDAP | `/admin/ldap` | `Tabs`, `Input`, `Button`, `DataTable` | `POST /api/admin/ldap/*` | ☐ |
| Journal d'audit | `/admin/audit` | `DataTable`, `FilterBar`, `Timeline` | `GET /api/admin/audit` | ☐ |
| Gestion RGPD users | `/admin/users` | `DataTable`, `Avatar`, `ConfirmDialog` | `GET /api/users` + GDPR | ☐ |
| Mon profil | `/profile` | `Avatar`, `Tabs`, `FormField`, `Toggle`, `Input` | `GET|PATCH /api/auth/me` · `PATCH /api/users/:id/avatar` | ☐ |
| Mes préférences | `/profile/preferences` | `RadioGroup`, `CheckboxGroup`, `Toggle` | `PATCH /api/auth/preferences` | ☐ |
| Flux onboarding | `/onboarding` | `ProgressSteps`, `Input`, `Button` | `PATCH /api/users/:id/onboarding/:stepIndex` | ☐ |
| Centre notifications | `/notifications` | `NotificationItem`, `FilterBar`, `Pagination` | `GET /api/notifications` | ☐ |
| Paramètres système | `/admin/settings` | `FormField`, `Input`, `Toggle`, `Select` | `PATCH /api/admin/config/batch` | ☐ |
| Paramètres RH | `/hr/settings` | `FormField`, `Toggle`, `Select`, `Button` | `PATCH /api/admin/config/batch` · `POST /api/hr/notifications/bulk-remind` | ☐ |

---

## Section 8 — Annexes

### Glossaire

| Terme | Définition |
|---|---|
| **Campagne** | Cycle d'entretiens RH délimité dans le temps, ciblant des départements |
| **Formulaire** | Template de questions (7 types) rattaché à une campagne ou autonome |
| **Évaluation** | Instance de formulaire assignée à un couple (évaluateur, évalué) |
| **Évaluateur** | Personne qui remplit l'évaluation (peut être le manager ou l'employé lui-même) |
| **Évalué** | Collaborateur objet de l'évaluation |
| **`frozenAt`** | Date à laquelle un formulaire a été gelé (1ère évaluation créée sur lui) |
| **`extendedVisibility`** | Option de campagne : un manager voit les évaluations de N+2 |
| **Onboarding** | Parcours d'intégration d'un nouveau collaborateur (5 étapes) |
| **Offboarding** | Processus de départ d'un collaborateur (checklist 5 items) |
| **`authSource`** | Origine du compte : `local` (mot de passe) ou `ldap` (annuaire entreprise) |
| **`signed_evaluatee`** | Statut d'évaluation : l'évalué a signé pour prise de connaissance |
| **`disagreementFlag`** | Indicateur de contestation levé par l'évalué lors de la signature |

### Variables d'environnement

```env
# .env.local
VITE_API_URL=http://localhost:3000          # URL de base de l'API backend
VITE_LDAP_ENABLED=false                    # Affiche le bouton connexion LDAP
VITE_APP_VERSION=2.0.0                     # Affiché dans le footer de /login
```

### Convention URL de l'API

- **Base** : `VITE_API_URL` (ex. `https://nxrh.nanoxplore.com/api` en production)
- **Auth** : Cookie `httpOnly` (`withCredentials: true` dans Axios)
- **Pas de Bearer token en localStorage** — sécurité CSRF gérée côté serveur

### Patterns de query keys TanStack Query

```typescript
// Conventions obligatoires
export const queryKeys = {
  auth:              () => ['auth', 'me'],
  users:             (filters?: UsersFilter) => ['users', filters],
  user:              (id: string) => ['users', id],
  campaigns:         (filters?: CampaignFilter) => ['campaigns', filters],
  campaign:          (id: string) => ['campaigns', id],
  campaignAnalytics: (id: string) => ['campaigns', id, 'analytics'],
  forms:             (filters?: FormsFilter) => ['forms', filters],
  form:              (id: string) => ['forms', id],
  evaluations:       (filters?: EvalFilter) => ['evaluations', filters],
  evaluation:        (id: string) => ['evaluations', id],
  notifications:     () => ['notifications'],
  offboarding:       (filters?: OffboardFilter) => ['offboarding', filters],
  events:            (filters?: EventFilter) => ['events', filters],
} as const;
```

---

*Fin du document — NX-RH Master Spec v1.1.0 · 40 écrans*
