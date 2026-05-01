# NX-RH — Bibliothèque de composants v2

> Référence complète des composants React pour NX-RH · Frontend v2  
> Stack : React 18 · Vite · TypeScript · Tailwind CSS · Lucide React  
> Couleur primaire : `#17A8D4` (primary-500)

---

## Règles d'or — Placement des boutons

| Règle | Emplacement |
|---|---|
| **1. CTA principal** | Coin supérieur droit du `PageHeader` |
| **2. Soumission de formulaire** | Bas-droit du formulaire ; bouton Annuler à sa gauche |
| **3. Action destructrice** | Toujours dans un `ConfirmDialog`, jamais exposée directement |
| **4. Actions de ligne** | `ActionMenu` (kebab) si ≥ 3 actions ; boutons inline si 1–2 |
| **5. Actions de modal** | Confirmer bas-droit, Annuler bas-gauche |
| **6. CTA d'état vide** | Centré sous l'illustration dans `EmptyState` |

---

## Structure des dossiers

```
frontend-v2/src/
├── components/
│   ├── layout/          # AppLayout, PageHeader, PageContainer, Navbar, Breadcrumbs, EmptyState, LoadingPage, ErrorBoundary
│   ├── navigation/      # NavItem, NavDropdown, UserMenu, MobileDrawer
│   ├── data-display/    # DataTable, DataCard, StatCard, StatusBadge, Avatar, AvatarGroup, ProgressBar, ProgressSteps, Timeline
│   ├── forms/           # FormField, Input, Textarea, Select, DatePicker, Toggle, Checkbox, CheckboxGroup, RadioGroup, RatingInput, QuestionBuilder, SearchInput
│   ├── feedback/        # Toast, ToastContainer, Alert, Modal, ConfirmDialog, Tooltip, Skeleton
│   ├── actions/         # Button, IconButton, ActionMenu, Pagination, FilterBar
│   └── domain/
│       ├── campaigns/   # CampaignCard
│       ├── evaluations/ # EvaluationCard, EvaluationForm, SignaturePanel
│       ├── offboarding/ # OffboardingChecklist
│       ├── users/       # OnboardingSteps, RoleBadge, DepartmentTag
│       └── notifications/ # NotificationItem, NotificationBell
├── charts/              # CompletionRateChart, ScoreDistribution, CampaignSummaryTable
├── pages/
├── hooks/
├── services/
├── types/
└── utils/
```

---

## 1. Composants de mise en page (Layout)

---

### `AppLayout`

**Description** : Enveloppe racine de toute page authentifiée. Compose la `Navbar` fixe en haut, la zone de contenu principale avec décalage `pt-16`, et les `Breadcrumbs` sous la navbar. Injecte le `ToastContainer` global.

```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}
```

**Description visuelle** : `min-h-screen bg-slate-50 font-sans`. La `Navbar` occupe les 64px supérieurs (`fixed h-16`). Le contenu est dans `<main className="pt-16">`.

**États** : aucun état propre — stateless wrapper.

```tsx
// Utilisation
<AppLayout>
  <PageContainer>
    <PageHeader title="Campagnes" />
    {/* contenu page */}
  </PageContainer>
</AppLayout>
```

**Règles de placement** : composant racine unique — ne s'imbrique jamais dans lui-même.

**Accessibilité** : `<main role="main">` pour le contenu ; la navbar est `<nav aria-label="Navigation principale">`.

---

### `PageHeader`

**Description** : Bandeau titre présent en haut de chaque page. Affiche le titre H1, un sous-titre optionnel, et des boutons d'action à droite (CTA principal + actions secondaires).

```typescript
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backHref?: string; // affiche un bouton retour si renseigné
}
```

**Description visuelle** : `flex items-start justify-between mb-6`. Titre : `text-3xl font-bold text-slate-900`. Sous-titre : `text-base text-slate-500 mt-1`. Zone actions : `flex items-center gap-3`.

**États** : stateless.

```tsx
<PageHeader
  title="Campagnes d'évaluation"
  subtitle="Gérez les cycles d'entretiens annuels"
  actions={
    <Button variant="primary" leftIcon={<Plus />}>
      Nouvelle campagne
    </Button>
  }
/>
```

**Règles de placement** : toujours premier enfant de `PageContainer`, sous `Breadcrumbs`.

**Accessibilité** : le titre est un `<h1>` ; un seul `<h1>` par page.

---

### `PageContainer`

**Description** : Enveloppe de largeur maximale avec padding horizontal adaptatif. Utilisé sur toutes les pages pour homogénéiser les marges.

```typescript
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}
```

**Description visuelle** : `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16`.

```tsx
<PageContainer>
  <PageHeader title="Tableau de bord" />
  {/* cartes, tableaux… */}
</PageContainer>
```

**Règles de placement** : enfant direct de `<main>` dans `AppLayout`.

---

### `Navbar`

**Description** : Barre de navigation fixe en haut de l'écran. Affiche le logo NX-RH à gauche, les liens de navigation au centre (desktop) ou un bouton hamburger (mobile), et le `UserMenu` + `NotificationBell` à droite. Les liens visibles s'adaptent selon le rôle de l'utilisateur connecté.

```typescript
interface NavbarProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'hr' | 'director' | 'manager' | 'employee';
    avatar?: string;
  };
  onLogout: () => void;
}
```

**Description visuelle** : `fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-40 px-8 flex items-center justify-between`.

**Liens par rôle** :
- `admin` / `hr` : Tableau de bord · Collaborateurs · Campagnes · Formulaires · Évaluations · Ressources · Offboarding · Analytics
- `director` / `manager` : Tableau de bord · Évaluations · Campagnes · Ressources
- `employee` : Tableau de bord · Mes évaluations · Ressources

**États** : lien actif → `text-primary-700 font-semibold border-b-2 border-primary-500` ; hover → `text-primary-600`.

```tsx
<Navbar user={currentUser} onLogout={handleLogout} />
```

**Accessibilité** : `<nav aria-label="Navigation principale">` ; lien actif reçoit `aria-current="page"`.

---

### `Breadcrumbs`

**Description** : Fil d'Ariane hiérarchique affiché sous la Navbar, au-dessus du `PageHeader`. Permet à l'utilisateur de comprendre sa position et de remonter dans la hiérarchie.

```typescript
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}
```

**Description visuelle** : `flex items-center gap-2 text-sm text-slate-500 mb-4`. Séparateur : `<ChevronRight className="w-4 h-4" />`. Dernier élément : `text-slate-800 font-medium` (non cliquable).

```tsx
<Breadcrumbs items={[
  { label: 'Campagnes', href: '/campaigns' },
  { label: 'Entretiens 2025', href: '/campaigns/123' },
  { label: 'Analytics' },
]} />
```

**Accessibilité** : `<nav aria-label="Fil d'Ariane"><ol>` avec `aria-current="page"` sur le dernier item.

---

### `EmptyState`

**Description** : Affichage centré quand une liste est vide ou qu'un état nul doit être communiqué. Composé d'une icône ou illustration SVG, d'un titre, d'un message explicatif et d'un CTA optionnel.

```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Description visuelle** : `flex flex-col items-center justify-center py-16 text-center`. Icône : `w-12 h-12 text-slate-300 mb-4`. Titre : `text-xl font-semibold text-slate-700`. Description : `text-base text-slate-500 mt-2 max-w-sm`. Bouton CTA : `mt-6`, variante `primary`.

```tsx
<EmptyState
  icon={<ClipboardList />}
  title="Aucune évaluation"
  description="Aucune évaluation n'a été assignée pour cette campagne."
  action={{ label: 'Créer des évaluations', onClick: handleCreate }}
/>
```

**Règles de placement** : dans une `DataTable` (slot `emptyState`), ou seul dans `PageContainer`.

---

### `LoadingPage`

**Description** : Squelette pleine page affiché pendant le chargement initial des données critiques. Simule la structure de la page cible (navbar + header + table ou cards).

```typescript
interface LoadingPageProps {
  variant?: 'table' | 'cards' | 'form';
}
```

**Description visuelle** : Utilise le composant `Skeleton` en composition. Header squelette : `h-8 w-48 rounded-lg bg-slate-200 animate-pulse`. Corps : 3–6 lignes `Skeleton` de hauteurs variées.

```tsx
<LoadingPage variant="table" />
```

**Règles de placement** : remplace le contenu de `PageContainer` pendant le premier chargement.

---

### `ErrorBoundary`

**Description** : Composant React de classe qui capture les erreurs de rendu enfants et affiche une interface de récupération avec un message d'erreur et un bouton "Réessayer".

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}
```

**Description visuelle** : `EmptyState` avec icône `AlertTriangle` rouge, titre "Une erreur est survenue", description condensée de l'erreur, bouton "Réessayer" (variante `secondary`).

```tsx
<ErrorBoundary>
  <CampaignDetailPage />
</ErrorBoundary>
```

**Accessibilité** : `role="alert"` sur le message d'erreur ; focus automatique sur le bouton "Réessayer".

---

## 2. Composants de navigation

---

### `NavItem`

**Description** : Lien individuel dans la `Navbar`. Affiche une icône Lucide + un libellé. Gère les états actif, hover et focus.

```typescript
interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  badge?: number; // compteur numérique (ex: 3 évaluations en attente)
}
```

**Description visuelle** : `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150`. Défaut : `text-slate-600`. Hover : `text-primary-600 bg-primary-50`. Actif : `text-primary-700 font-semibold bg-primary-50 border-b-2 border-primary-500`.

---

### `NavDropdown`

**Description** : Menu déroulant dans la `Navbar` pour regrouper plusieurs sous-pages (ex : Administration → Config · Audit · LDAP).

```typescript
interface NavDropdownProps {
  label: string;
  icon?: React.ReactNode;
  items: Array<{ label: string; href: string; icon?: React.ReactNode }>;
}
```

**Description visuelle** : Déclencheur : `NavItem` avec `<ChevronDown />`. Panel : `absolute top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-48 z-50`.

**Accessibilité** : `role="menu"` sur le panel, `role="menuitem"` sur chaque option, `aria-expanded` sur le déclencheur.

---

### `UserMenu`

**Description** : Zone utilisateur en haut à droite de la `Navbar`. Affiche l'`Avatar` md + nom + chevron. Au clic, déploie un dropdown avec Profil, Préférences et Déconnexion.

```typescript
interface UserMenuProps {
  user: {
    firstName: string;
    lastName: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}
```

**Description visuelle** : `flex items-center gap-2 cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100`. Dropdown : `right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 w-56`.

**Accessibilité** : `aria-haspopup="true"`, `aria-expanded`, focus piégé dans le dropdown ouvert.

---

### `MobileDrawer`

**Description** : Panneau de navigation latéral glissant depuis la gauche sur mobile (< 768px). Contient les mêmes `NavItem` que la barre desktop, plus le `UserMenu`.

```typescript
interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: NavbarProps['user'];
  onLogout: () => void;
}
```

**Description visuelle** : Overlay `bg-slate-900/50 fixed inset-0 z-50`. Panneau : `fixed inset-y-0 left-0 w-72 bg-white shadow-xl transform transition-transform duration-300` (`translate-x-0` si ouvert, `-translate-x-full` si fermé).

**Accessibilité** : `role="dialog"`, `aria-modal="true"`, focus piégé, fermeture sur `Escape`.

---

## 3. Composants d'affichage de données

---

### `DataTable`

**Description** : Table de données complète avec tri des colonnes, filtre, pagination, sélection en masse et actions de ligne. Composant le plus utilisé de l'application (listes d'utilisateurs, campagnes, évaluations, etc.).

```typescript
interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string; // ex: 'w-48'
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  sortConfig?: { key: string; direction: 'asc' | 'desc' };
  onSort?: (key: string) => void;
  rowActions?: (row: T) => React.ReactNode;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  getRowId?: (row: T) => string;
  striped?: boolean;
}
```

**Description visuelle** : Conteneur `rounded-xl border border-slate-200 overflow-hidden shadow-md bg-white`. En-tête : `bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3`. Lignes : `text-sm text-slate-700 px-4 py-3 border-b border-slate-100`. Hover ligne : `bg-primary-50`. Colonne triée active : chevron `text-primary-500`.

**États** : `loading` → remplace le corps par 5 lignes `Skeleton` ; `empty` → affiche `EmptyState` ; `selected row` → `bg-primary-50`.

```tsx
<DataTable
  columns={[
    { key: 'name', header: 'Nom', sortable: true },
    { key: 'status', header: 'Statut', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', header: 'Créé le', render: (row) => formatDate(row.createdAt) },
  ]}
  data={campaigns}
  loading={isLoading}
  pagination={{ page, pageSize: 20, total, onPageChange: setPage }}
  onSort={handleSort}
  rowActions={(row) => (
    <ActionMenu items={[
      { label: 'Modifier', icon: <Pencil />, onClick: () => handleEdit(row) },
      { label: 'Supprimer', icon: <Trash2 />, onClick: () => handleDelete(row), danger: true },
    ]} />
  )}
  emptyState={<EmptyState icon={<BarChart2 />} title="Aucune campagne" />}
/>
```

**Règles de placement** : dans `PageContainer`, sous `FilterBar`.

**Accessibilité** : `<table role="table">`, `scope="col"` sur les `<th>`, `aria-sort` sur colonnes triables, checkbox de sélection avec `aria-label`.

---

### `DataCard`

**Description** : Carte affichant une entité unique dans une vue grille. Utilisé alternativement à `DataTable` pour les campagnes et les ressources documentaires.

```typescript
interface DataCardProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  meta?: Array<{ icon: React.ReactNode; label: string }>;
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}
```

**Description visuelle** : `bg-white rounded-xl border border-slate-200 shadow-md p-6 flex flex-col gap-4 hover:shadow-lg hover:scale-[1.01] transition-all duration-150 cursor-pointer`.

---

### `StatCard`

**Description** : Carte KPI pour le tableau de bord. Affiche un chiffre clé, un libellé, une icône colorée et un indicateur de tendance (hausse/baisse/neutre).

```typescript
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor?: string;   // ex: 'text-primary-500'
  iconBg?: string;      // ex: 'bg-primary-50'
  trend?: {
    value: number;      // pourcentage
    direction: 'up' | 'down' | 'neutral';
    label?: string;     // ex: 'vs mois dernier'
  };
}
```

**Description visuelle** : `bg-white rounded-xl border border-slate-200 shadow-md p-6`. Valeur : `text-3xl font-bold text-slate-900`. Label : `text-sm text-slate-500`. Icône : `w-10 h-10 rounded-lg flex items-center justify-center`. Tendance : flèche `TrendingUp` (vert) ou `TrendingDown` (rouge).

```tsx
<StatCard
  label="Évaluations en cours"
  value={42}
  icon={<ClipboardList />}
  iconColor="text-primary-500"
  iconBg="bg-primary-50"
  trend={{ value: 12, direction: 'up', label: 'vs semaine dernière' }}
/>
```

**Règles de placement** : grille `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6` dans `PageContainer`.

---

### `StatusBadge`

**Description** : Pill colorée indiquant le statut d'une campagne ou d'une évaluation. Couleurs et libellés définis par les tokens du design system.

```typescript
type CampaignStatus = 'draft' | 'active' | 'closed' | 'archived';
type EvaluationStatus =
  | 'assigned' | 'in_progress' | 'submitted' | 'reviewed'
  | 'signed_evaluatee' | 'signed_manager' | 'validated'
  | 'expired' | 'archived';

interface StatusBadgeProps {
  status: CampaignStatus | EvaluationStatus;
  size?: 'sm' | 'md';
}
```

**Description visuelle** : `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`. Mappage couleurs :
- `draft` → `bg-slate-100 text-slate-600`
- `active` → `bg-primary-100 text-primary-700`
- `submitted` → `bg-warning-50 text-warning-600`
- `validated` → `bg-success-50 text-success-700`
- `expired` → `bg-error-50 text-error-600`
- *(cf. tableau complet §6.3 du design system)*

```tsx
<StatusBadge status="active" />
// → <span class="...">Active</span>
```

**Règles de placement** : dans les cellules de tableau ou l'en-tête d'une `DataCard`. Jamais seul dans un bloc de texte courant.

---

### `Avatar`

**Description** : Photo de profil d'un utilisateur avec fallback sur les initiales. La couleur de fond du fallback est dérivée du hash du nom.

```typescript
interface AvatarProps {
  firstName: string;
  lastName: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}
```

**Tailles** : `sm`=24px, `md`=32px, `lg`=40px, `xl`=48px.

**Description visuelle** : `rounded-full overflow-hidden flex items-center justify-center font-semibold bg-primary-100 text-primary-700`.

```tsx
<Avatar firstName="Marie" lastName="Dupont" size="lg" />
```

**Accessibilité** : `aria-label="Avatar de Marie Dupont"` ; `alt` renseigné si `<img>`.

---

### `AvatarGroup`

**Description** : Groupe d'avatars superposés pour représenter une équipe ou un ensemble de signataires. Affiche les 3–4 premiers avatars puis un compteur `+N`.

```typescript
interface AvatarGroupProps {
  users: Array<{ firstName: string; lastName: string; src?: string }>;
  max?: number; // défaut 4
  size?: AvatarProps['size'];
}
```

**Description visuelle** : `flex -space-x-2`. Chaque `Avatar` a un anneau blanc `ring-2 ring-white`.

---

### `ProgressBar`

**Description** : Barre de progression horizontale avec label et pourcentage. Utilisée pour la complétion d'une campagne, d'un onboarding, d'un offboarding.

```typescript
interface ProgressBarProps {
  value: number;        // 0–100
  label?: string;
  showPercent?: boolean;
  size?: 'thin' | 'thick'; // thin=4px, thick=8px
  color?: string;           // défaut: 'bg-primary-500'
}
```

**Description visuelle** : Piste : `bg-slate-200 rounded-full`. Fill : `bg-primary-500 rounded-full transition-all duration-500`.

```tsx
<ProgressBar value={67} label="Complétion" showPercent />
```

---

### `ProgressSteps`

**Description** : Indicateur d'étapes horizontal (stepper) pour les flux multi-étapes : cycle de signature d'une évaluation, onboarding, offboarding.

```typescript
interface Step {
  label: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface ProgressStepsProps {
  steps: Step[];
}
```

**Description visuelle** : Ligne de connexion `bg-slate-200` entre étapes. Étape complète : cercle `bg-primary-500 text-white` avec `<Check />`. Courante : `border-2 border-primary-500 text-primary-500`. À venir : `border-2 border-slate-300 text-slate-400`.

---

### `Timeline`

**Description** : Historique vertical d'événements (piste d'audit, historique d'évaluation). Chaque entrée : icône colorée + date + description.

```typescript
interface TimelineItem {
  id: string;
  date: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  color?: string; // ex: 'bg-primary-500'
}

interface TimelineProps {
  items: TimelineItem[];
}
```

**Description visuelle** : Ligne verticale `border-l-2 border-slate-200 ml-4`. Chaque point : `w-8 h-8 rounded-full -ml-4 flex items-center justify-center`. Date : `text-xs text-slate-400`. Label : `text-sm font-medium text-slate-700`.

---

## 4. Composants de formulaire

---

### `FormField`

**Description** : Wrapper standardisé pour tous les champs de formulaire. Compose le label, l'input (slot enfant), le message d'aide et le message d'erreur. Assure la cohérence visuelle et l'accessibilité entre tous les champs.

```typescript
interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}
```

**Description visuelle** : `flex flex-col gap-1.5`. Label : `text-sm font-medium text-slate-700`. Astérisque requis : `text-error-500 ml-0.5`. Erreur : `text-xs text-error-600 flex items-center gap-1`. Aide : `text-xs text-slate-400`.

```tsx
<FormField label="Nom de la campagne" htmlFor="name" required error={errors.name}>
  <Input id="name" {...register('name')} />
</FormField>
```

---

### `Input`

**Description** : Champ de saisie texte avec variantes pour email, mot de passe et recherche. Supporte icônes gauche/droite et état d'erreur.

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'text' | 'email' | 'password' | 'search';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
  inputSize?: 'sm' | 'md';
}
```

**Description visuelle** : `h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 transition-colors`. Focus : `border-primary-500 ring-2 ring-primary-200 outline-none`. Erreur : `border-error-500 ring-2 ring-error-200 bg-error-50`. Désactivé : `bg-slate-100 text-slate-400 cursor-not-allowed`.

---

### `Textarea`

**Description** : Champ de saisie multi-lignes pour les réponses libres aux questions d'évaluation, les commentaires et les descriptions.

```typescript
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  minRows?: number;
  maxRows?: number;
}
```

**Description visuelle** : Mêmes styles que `Input` ; `resize-y min-h-[80px]`. Compteur de caractères optionnel : `text-xs text-slate-400 text-right mt-1`.

---

### `Select`

**Description** : Menu déroulant de sélection, version simple (une valeur) ou multi-sélection. Utilisé pour les filtres, les rôles, les formulaires d'évaluation.

```typescript
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  disabled?: boolean;
  error?: boolean;
  searchable?: boolean;
}
```

**Description visuelle** : Déclencheur : style `Input` + `<ChevronDown />` à droite. Dropdown : `bg-white rounded-xl shadow-lg border border-slate-200 max-h-60 overflow-y-auto`. Option active : `bg-primary-50 text-primary-700`. Multi-select : chips avec `<X />` dans le déclencheur.

**Accessibilité** : `role="combobox"`, `aria-expanded`, `role="listbox"`, navigation clavier flèches + Entrée + Échap.

---

### `DatePicker`

**Description** : Champ de saisie de date avec calendrier déroulant. Utilisé pour les dates de début/fin de campagne, les deadlines, les dates de départ.

```typescript
interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}
```

**Description visuelle** : Champ : style `Input` + `<Calendar className="w-4 h-4 text-slate-400" />` à droite. Calendrier : `absolute bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50`. Jour sélectionné : `bg-primary-500 text-white rounded-lg`. Aujourd'hui : `border border-primary-300`.

---

### `Toggle`

**Description** : Interrupteur booléen pour activer/désactiver une option (thème, préférences de notification, visibilité étendue).

```typescript
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}
```

**Description visuelle** : Piste : `h-6 w-11 rounded-full transition-colors`. Off : `bg-slate-300`. On : `bg-primary-500`. Poignée : `h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform`. On → `translate-x-5`. Off → `translate-x-1`.

**Accessibilité** : `role="switch"`, `aria-checked`.

---

### `Checkbox`

**Description** : Case à cocher unique. Utilisée pour les conditions d'acceptation, la sélection de ligne dans `DataTable`, les items de checklist.

```typescript
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  indeterminate?: boolean;
  error?: boolean;
}
```

**Description visuelle** : `h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-200`. Coché : `bg-primary-500 border-primary-500`. Label : `text-sm text-slate-700 ml-2`.

---

### `CheckboxGroup`

**Description** : Groupe de cases à cocher pour les questions à choix multiples des formulaires d'évaluation.

```typescript
interface CheckboxGroupProps {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value: string[];
  onChange: (values: string[]) => void;
  label?: string;
  error?: string;
  orientation?: 'vertical' | 'horizontal';
}
```

---

### `RadioGroup`

**Description** : Groupe de boutons radio pour les questions Oui/Non, les choix exclusifs dans les évaluations. Supports orientation verticale et horizontale.

```typescript
interface RadioGroupProps {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string;
  onChange: (value: string) => void;
  name: string;
  label?: string;
  error?: string;
  orientation?: 'vertical' | 'horizontal';
}
```

**Description visuelle** : Bouton radio sélectionné : cercle extérieur `border-2 border-primary-500`, point intérieur `bg-primary-500`.

**Accessibilité** : `role="radiogroup"`, `aria-labelledby`.

---

### `RatingInput`

**Description** : Saisie d'une note numérique pour les questions d'évaluation. Deux modes : étoiles (1–5) ou échelle numérique (1–10). Affiche la note sélectionnée avec un libellé optionnel.

```typescript
interface RatingInputProps {
  value?: number | null;
  onChange: (value: number) => void;
  mode: 'stars' | 'scale';
  min?: number;   // défaut 1
  max?: number;   // défaut 5 (stars) ou 10 (scale)
  labels?: Record<number, string>; // ex: { 1: 'Insuffisant', 5: 'Excellent' }
  disabled?: boolean;
  readonly?: boolean;
}
```

**Description visuelle** :
- `stars` : icônes `Star` Lucide `w-8 h-8`. Remplie : `text-warning-400 fill-warning-400`. Vide : `text-slate-300`. Hover : animation progressive.
- `scale` : boutons `w-10 h-10 rounded-lg` de 1 à 10. Sélectionné : `bg-primary-500 text-white`. Hover : `bg-primary-50`.

```tsx
<RatingInput mode="stars" value={rating} onChange={setRating} max={5} />
<RatingInput mode="scale" value={score} onChange={setScore} min={1} max={10}
  labels={{ 1: 'Très insuffisant', 5: 'Moyen', 10: 'Excellent' }} />
```

**Accessibilité** : `role="group"`, `aria-label="Note"`, chaque bouton `aria-label="Note X sur Y"`.

---

### `QuestionBuilder`

**Description** : Composant composé pour la création et l'édition de questions dans un formulaire. Permet de choisir le type de question, de rédiger le texte, de définir les options de réponse (pour `choice`), d'activer l'obligation et de réordonner les questions par glisser-déposer (décrit sans code).

```typescript
type QuestionType = 'text' | 'rating' | 'yes_no' | 'choice' | 'scale';

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  phase: 'self' | 'n-1' | 'objectives' | 'aspirations' | 'all';
  options?: string[];   // pour type 'choice'
  scale?: { min: number; max: number };
}

interface QuestionBuilderProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
  disabled?: boolean; // vrai si formulaire gelé (frozenAt)
}
```

**Description visuelle** : Chaque question est une carte `DataCard` compacte avec handle de drag `GripVertical`, sélecteur de type `Select`, champ texte `Input`, toggle "Obligatoire". En bas : bouton `+ Ajouter une question`. Si `disabled=true` : mode lecture seule avec badge "Formulaire gelé".

**Règles de placement** : uniquement dans les pages de création/édition de formulaire (admin/hr).

---

### `SearchInput`

**Description** : Champ de recherche avec indicateur de debounce. Utilisé dans les barres de filtres des listes.

```typescript
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number; // défaut 300ms
  loading?: boolean;
}
```

**Description visuelle** : `Input` variante `search` avec `<Search className="w-4 h-4 text-slate-400" />` à gauche. Pendant le debounce : spinner `w-4 h-4 animate-spin` à droite.

---

## 5. Composants de feedback

---

### `Toast`

**Description** : Notification éphémère apparaissant en bas à droite de l'écran. Quatre variantes : succès, erreur, avertissement, info. Auto-disparition après 4 secondes.

```typescript
interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number; // ms, défaut 4000
  onDismiss: (id: string) => void;
}
```

**Description visuelle** : `flex items-start gap-3 p-4 rounded-xl shadow-xl border max-w-sm bg-white`. Bordure gauche 4px de la couleur sémantique. Icônes : `CheckCircle` (success), `XCircle` (error), `AlertTriangle` (warning), `Info` (info). Bouton fermeture `<X />` en haut à droite.

```tsx
toast.success('Campagne créée', 'La campagne "Entretiens 2025" a été créée avec succès.');
toast.error('Erreur de serveur', 'Impossible de sauvegarder les modifications.');
```

**Accessibilité** : `role="alert"`, `aria-live="polite"`.

---

### `ToastContainer`

**Description** : Gestionnaire de la pile de toasts. Positionné fixe en bas à droite de l'écran. Gère l'empilement, les animations d'entrée/sortie et le nettoyage automatique.

```typescript
interface ToastContainerProps {
  toasts: ToastProps[];
  onDismiss: (id: string) => void;
}
```

**Description visuelle** : `fixed bottom-4 right-4 z-[100] flex flex-col gap-3`. Animation entrée : `slide-in-from-right` + `fade-in` 200ms. Animation sortie : `fade-out` 150ms.

---

### `Alert`

**Description** : Bannière d'alerte inline, dismissible. Utilisée pour les avertissements contextuels dans les formulaires ou les pages (ex : "Ce formulaire est gelé et ses questions ne peuvent plus être modifiées.").

```typescript
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  description: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: { label: string; onClick: () => void };
}
```

**Description visuelle** : `flex items-start gap-3 p-4 rounded-xl border-l-4`. Couleurs identiques aux tokens `§6.6` du design system. Bouton dismiss : `<X className="w-4 h-4" />` en haut à droite.

---

### `Modal`

**Description** : Dialog overlay centré avec fond semi-transparent. Composant générique pour tous les dialogues de l'application. Gère le focus trap, la fermeture sur Échap et le verrouillage du scroll body.

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

**Tailles** : `sm`=480px, `md`=640px, `lg`=800px, `xl`=1024px.

**Description visuelle** : Overlay : `fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50`. Conteneur : `bg-white rounded-2xl shadow-xl mx-auto`. Header : `px-6 py-4 border-b border-slate-200 flex items-center justify-between`. Footer : `px-6 py-4 border-t border-slate-200 flex justify-end gap-3`.

```tsx
<Modal isOpen={isOpen} onClose={onClose} title="Modifier la campagne" size="md"
  footer={
    <>
      <Button variant="ghost" onClick={onClose}>Annuler</Button>
      <Button variant="primary" onClick={handleSubmit}>Enregistrer</Button>
    </>
  }
>
  <CampaignForm />
</Modal>
```

**Accessibilité** : `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointant vers le titre, focus piégé, fermeture sur `Escape`.

---

### `ConfirmDialog`

**Description** : Modal spécialisé pour les actions destructrices (suppression, expiration, anonymisation RGPD). Affiche un avertissement explicite et oblige l'utilisateur à confirmer intentionnellement.

```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;  // défaut 'Confirmer'
  cancelLabel?: string;   // défaut 'Annuler'
  variant?: 'danger' | 'warning';
  loading?: boolean;
}
```

**Description visuelle** : `Modal` size `sm`. Icône `AlertTriangle` ou `Trash2` en rouge/amber, centré. Titre : `text-xl font-semibold text-slate-900`. Bouton confirmer : variante `danger` (rouge) à droite. Bouton annuler : variante `ghost` à gauche.

```tsx
<ConfirmDialog
  isOpen={showDelete}
  onClose={() => setShowDelete(false)}
  onConfirm={handleDelete}
  title="Supprimer la campagne ?"
  description="Cette action est irréversible. Toutes les évaluations associées seront également supprimées."
  confirmLabel="Supprimer définitivement"
  variant="danger"
/>
```

---

### `Tooltip`

**Description** : Info-bulle contextuelle apparaissant au survol ou au focus d'un élément. Utilisée pour les icônes sans libellé et les informations complémentaires.

```typescript
interface TooltipProps {
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
}
```

**Description visuelle** : `bg-slate-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg max-w-xs`. Animation : `fade-in 100ms ease-out`.

**Accessibilité** : `role="tooltip"`, `aria-describedby` sur l'élément déclencheur.

---

### `Skeleton`

**Description** : Placeholder de chargement imitant la forme du contenu à venir. Trois variantes : ligne de texte, cercle (avatar), rectangle (carte, image).

```typescript
interface SkeletonProps {
  variant?: 'line' | 'circle' | 'rect';
  width?: string;    // ex: 'w-48', 'w-full'
  height?: string;   // ex: 'h-4', 'h-32'
  className?: string;
}
```

**Description visuelle** : `bg-slate-200 animate-pulse rounded`. Line : `h-4 rounded`. Circle : `rounded-full`. Rect : dimensions custom.

---

## 6. Composants d'action

---

### `Button`

**Description** : Bouton d'action principal de l'application. Quatre variantes sémantiques, trois tailles, état de chargement intégré.

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}
```

**Variantes** :
| Variante | Classes Tailwind |
|---|---|
| `primary` | `bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus:ring-primary-500` |
| `secondary` | `bg-white text-primary-700 border border-primary-300 hover:bg-primary-50` |
| `ghost` | `bg-transparent text-slate-700 hover:bg-slate-100` |
| `danger` | `bg-error-600 text-white hover:bg-error-700` |

**Tailles** : `sm`=`h-8 px-3 text-sm rounded-lg`, `md`=`h-10 px-4 text-sm font-semibold rounded-lg`, `lg`=`h-12 px-6 text-base font-semibold rounded-xl`.

**États** : `disabled` → `opacity-50 cursor-not-allowed`. `loading` → spinner Lucide `Loader2 animate-spin w-4 h-4` + texte masqué.

```tsx
<Button variant="primary" size="md" loading={isSaving} leftIcon={<Plus />}>
  Nouvelle campagne
</Button>
```

**Accessibilité** : `aria-disabled` si `disabled`; `aria-busy` si `loading`.

---

### `IconButton`

**Description** : Bouton carré contenant uniquement une icône. Toujours accompagné d'un `Tooltip` pour l'accessibilité.

```typescript
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  tooltip: string;
  variant?: 'ghost' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}
```

**Description visuelle** : `inline-flex items-center justify-center rounded-lg transition-colors`. `sm`=`h-8 w-8`, `md`=`h-10 w-10`, `lg`=`h-12 w-12`.

```tsx
<IconButton icon={<Pencil />} tooltip="Modifier" onClick={handleEdit} />
```

---

### `ActionMenu`

**Description** : Menu déroulant kebab (`⋮`) listant les actions disponibles sur une entité. Utilisé dans les lignes de tableau quand ≥ 3 actions sont disponibles. Supporte des séparateurs et des items destructeurs.

```typescript
interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean; // affiche un hr avant cet item
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  align?: 'left' | 'right';
}
```

**Description visuelle** : Déclencheur : `IconButton` avec `<MoreVertical />`. Menu : `absolute bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-48 z-50`. Item danger : `text-error-600 hover:bg-error-50`. Item normal : `hover:bg-slate-50`.

**Accessibilité** : `role="menu"`, `role="menuitem"`, navigation clavier flèches + Entrée + Échap.

---

### `Pagination`

**Description** : Barre de navigation entre pages pour les `DataTable`. Affiche les boutons précédent/suivant, les numéros de page et le résumé "X–Y sur Z".

```typescript
interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  showSummary?: boolean;
}
```

**Description visuelle** : `flex items-center justify-between px-4 py-3 border-t border-slate-200`. Résumé : `text-sm text-slate-500`. Boutons : `Button` variante `ghost` size `sm`. Page courante : `bg-primary-50 text-primary-700 font-semibold`.

---

### `FilterBar`

**Description** : Barre de filtres chips affichant les filtres actifs avec la possibilité de les supprimer individuellement ou tous à la fois. Affiche aussi le `SearchInput` et un bouton "Filtres" pour ouvrir un panneau avancé.

```typescript
interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  displayValue: string;
}

interface FilterBarProps {
  filters: ActiveFilter[];
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onOpenAdvanced?: () => void;
}
```

**Description visuelle** : `flex flex-wrap items-center gap-3 py-4`. Chips de filtre actif : `bg-primary-100 text-primary-700 rounded-full text-sm px-3 py-1 flex items-center gap-1`. Bouton `×` dans chaque chip. "Tout effacer" : `Button` ghost size `sm`.

---

## 7. Composants domaine NX-RH

---

### `CampaignCard`

**Description** : Carte d'affichage d'une campagne dans la vue grille. Montre le nom, le statut, les dates, la progression et les actions rapides.

```typescript
interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    status: CampaignStatus;
    startDate: string;
    endDate: string;
    completionRate: number; // 0–100
    evaluationCount: number;
  };
  onEdit?: () => void;
  onViewAnalytics?: () => void;
  onClone?: () => void;
  onClick?: () => void;
}
```

**Description visuelle** : `DataCard` avec : `StatusBadge` en haut à droite, dates avec icône `Calendar`, `ProgressBar` de complétion, compteur d'évaluations, `ActionMenu` avec actions (Modifier · Analytics · Cloner · Supprimer).

---

### `EvaluationCard`

**Description** : Carte d'évaluation affichant l'évalué, le statut, le nom du formulaire et la date d'échéance. Utilisée dans les vues liste (employee, manager).

```typescript
interface EvaluationCardProps {
  evaluation: {
    id: string;
    evaluatee: { firstName: string; lastName: string; avatar?: string };
    evaluator: { firstName: string; lastName: string };
    status: EvaluationStatus;
    formName: string;
    campaignName: string;
    expiresAt?: string;
    lastSavedAt?: string;
  };
  onClick?: () => void;
  actions?: React.ReactNode;
}
```

**Description visuelle** : `DataCard` avec `Avatar` lg de l'évalué, `StatusBadge`, nom du formulaire, badge d'échéance (rouge si < 7 jours), indicateur "Dernière sauvegarde il y a X".

---

### `EvaluationForm`

**Description** : Rendu dynamique d'un formulaire d'évaluation à partir des questions du modèle `Form`. Mappe chaque type de question vers le composant de saisie approprié. Gère la sauvegarde automatique (auto-save toutes les 30 secondes) et l'état verrouillé après soumission.

```typescript
interface EvaluationFormProps {
  questions: Question[];
  answers: Record<string, unknown>;
  onChange: (questionId: string, value: unknown) => void;
  onSave: () => void;
  onSubmit: () => void;
  readonly?: boolean;
  lastSavedAt?: string;
  saving?: boolean;
}
```

**Mappage type → composant** :
| Type de question | Composant rendu |
|---|---|
| `text` | `Textarea` |
| `rating` (1–5) | `RatingInput mode="stars"` |
| `rating` (1–10) | `RatingInput mode="scale"` |
| `yes_no` | `RadioGroup` (options : Oui / Non) |
| `choice` | `CheckboxGroup` ou `RadioGroup` (unique) |
| `scale` | `RatingInput mode="scale"` |
| `weather` | `RadioGroup` icônes météo |
| `mobility` | `RadioGroup` (Oui / Non / Sans objet) |

**Description visuelle** : Chaque question est dans un `FormField` avec son texte comme label. Bandeau en bas : "Sauvegardé à HH:MM" + bouton `Enregistrer le brouillon` (secondary) + bouton `Soumettre` (primary). Mode `readonly` : tous les champs sont `disabled`, badge "Soumise — lecture seule".

---

### `SignaturePanel`

**Description** : Panneau affiché sur la page de détail d'une évaluation, montrant l'état de signature de chaque partie (évalué, manager, RH). Le signataire actif reçoit un bouton "Signer".

```typescript
interface Signatory {
  role: 'evaluatee' | 'manager' | 'hr';
  label: string;
  user?: { firstName: string; lastName: string; avatar?: string };
  status: 'pending' | 'signed';
  signedAt?: string;
}

interface SignaturePanelProps {
  signatories: Signatory[];
  currentUserRole: string;
  onSign: () => void;
  signing?: boolean;
}
```

**Description visuelle** : `bg-white rounded-xl border border-slate-200 p-6`. Titre "Signatures" avec `<PenLine />`. Chaque signataire : `Avatar` md + nom + `StatusBadge` (En attente / Signé + date). Signataire actif : bouton `Button` primary "Signer l'entretien" + `ProgressSteps` de la chaîne de signature.

---

### `OffboardingChecklist`

**Description** : Liste interactive des items de la checklist de départ d'un collaborateur. Affiche la progression globale et un bouton de finalisation quand tous les items sont cochés.

```typescript
interface ChecklistItem {
  index: number;
  label: string;
  done: boolean;
  doneAt?: string;
  doneBy?: string;
}

interface OffboardingChecklistProps {
  items: ChecklistItem[];
  onToggle: (index: number, done: boolean) => void;
  onComplete: () => void;
  status: 'pending' | 'in_progress' | 'completed';
  readonly?: boolean;
}
```

**Description visuelle** : `bg-white rounded-xl border border-slate-200 p-6`. `ProgressBar` en haut (X/5 items). Chaque item : `Checkbox` + label + date/agent si coché. Bouton "Finaliser le départ" (`Button` primary) activé quand tous les items sont cochés.

---

### `OnboardingSteps`

**Description** : Affichage visuel des étapes d'onboarding d'un nouveau collaborateur. Permet à l'employé de cocher ses propres étapes et affiche la progression globale.

```typescript
interface OnboardingStep {
  index: number;
  label: string;
  completed: boolean;
}

interface OnboardingStepsProps {
  steps: OnboardingStep[];
  onToggle: (index: number, completed: boolean) => void;
  onComplete: () => void;
  isCompleted: boolean;
  canEdit: boolean; // soi-même ou admin/hr
}
```

**Description visuelle** : `ProgressSteps` horizontal en haut. Liste d'étapes avec `Checkbox`. Si `isCompleted` : bannière de succès `Alert` type `success` "Onboarding terminé 🎉".

---

### `RoleBadge`

**Description** : Pill colorée indiquant le rôle d'un utilisateur dans l'annuaire et les pages de profil.

```typescript
interface RoleBadgeProps {
  role: 'admin' | 'hr' | 'director' | 'manager' | 'employee';
  size?: 'sm' | 'md';
}
```

**Mappage couleurs** :
| Rôle | Classes |
|---|---|
| `admin` | `bg-purple-100 text-purple-700` |
| `hr` | `bg-primary-100 text-primary-700` |
| `director` | `bg-blue-100 text-blue-700` |
| `manager` | `bg-orange-100 text-orange-700` |
| `employee` | `bg-slate-100 text-slate-600` |

**Description visuelle** : `px-2.5 py-0.5 rounded-full text-xs font-medium`.

---

### `DepartmentTag`

**Description** : Tag compact affichant le nom d'un département. Utilisé dans les tableaux d'utilisateurs et les filtres.

```typescript
interface DepartmentTagProps {
  name: string;
  color?: string; // couleur auto-générée depuis hash du nom si non fournie
}
```

**Description visuelle** : `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600`. La couleur de fond peut varier selon le département (palette de 8 teintes slate/primary/info/success).

---

### `NotificationItem`

**Description** : Élément individuel dans le dropdown de notifications. Affiche le type, le message, la date et un indicateur lu/non-lu.

```typescript
interface NotificationItemProps {
  notification: {
    id: string;
    type: 'evaluationAssigned' | 'deadlineReminder' | 'campaignLaunch' | 'systemAlert' | 'managerActionRequired';
    title: string;
    body: string;
    createdAt: string;
    read: boolean;
  };
  onMarkRead: (id: string) => void;
  onClick: (id: string) => void;
}
```

**Description visuelle** : `flex items-start gap-3 px-4 py-3 hover:bg-slate-50`. Non-lu : `bg-primary-50` + point bleu `w-2 h-2 rounded-full bg-primary-500`. Date : `text-xs text-slate-400`. Icône type : `Bell`, `Clock`, `BarChart2`, `AlertTriangle`.

---

### `NotificationBell`

**Description** : Icône cloche dans la `Navbar` avec badge de comptage des notifications non lues. Au clic, déploie un panneau dropdown listant les `NotificationItem` récentes.

```typescript
interface NotificationBellProps {
  unreadCount: number;
  notifications: NotificationItemProps['notification'][];
  onMarkAllRead: () => void;
  onViewAll: () => void;
}
```

**Description visuelle** : `<Bell className="w-5 h-5" />`. Badge : `absolute -top-1 -right-1 h-4 w-4 rounded-full bg-error-500 text-white text-[10px] font-bold flex items-center justify-center`. Dropdown : `absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50`.

**Accessibilité** : `aria-label="X notifications non lues"`, `aria-haspopup`, `aria-expanded`.

---

## 8. Composants graphiques (Analytics)

---

### `CompletionRateChart`

**Description** : Graphique donut affichant le taux de complétion global d'une campagne. Affiche le pourcentage au centre et une légende simple. Basé sur une librairie SVG légère (Recharts ou chart.js adapté).

```typescript
interface CompletionRateChartProps {
  completed: number;
  total: number;
  label?: string;
  size?: number; // px, défaut 200
}
```

**Description visuelle** : Anneau `stroke-primary-500` (complété) + `stroke-slate-200` (restant). Centre : `text-3xl font-bold text-slate-900` + `text-sm text-slate-500`. Légende sous le donut : "X évaluations validées sur Y".

**Règles de placement** : dans une `DataCard` col-span-4 du tableau de bord analytics.

---

### `ScoreDistribution`

**Description** : Histogramme vertical montrant la distribution des scores d'une campagne par tranche de 10 (0–10, 10–20, …, 90–100).

```typescript
interface ScoreDistributionProps {
  data: Array<{ range: string; count: number }>;
  title?: string;
}
```

**Description visuelle** : Barres `bg-primary-400 hover:bg-primary-500` avec étiquettes de valeur au-dessus. Axe X : tranches. Axe Y : nombre d'évaluations.

---

### `CampaignSummaryTable`

**Description** : Tableau récapitulatif des statistiques clés d'une campagne : taux de complétion par département, score moyen, nombre d'évaluations dans chaque statut.

```typescript
interface DepartmentStats {
  department: string;
  total: number;
  completed: number;
  avgScore?: number;
  completionRate: number;
}

interface CampaignSummaryTableProps {
  stats: DepartmentStats[];
  loading?: boolean;
}
```

**Description visuelle** : `DataTable` avec colonnes : Département · Total · Complétées · Score moyen · Taux. Colonne taux : `ProgressBar thin` inline. Score moyen : `RatingInput readonly mode="scale"` ou valeur numérique.

---

## Résumé — Index des composants

| Catégorie | Composants |
|---|---|
| **Layout** | `AppLayout`, `PageHeader`, `PageContainer`, `Navbar`, `Breadcrumbs`, `EmptyState`, `LoadingPage`, `ErrorBoundary` |
| **Navigation** | `NavItem`, `NavDropdown`, `UserMenu`, `MobileDrawer` |
| **Données** | `DataTable`, `DataCard`, `StatCard`, `StatusBadge`, `Avatar`, `AvatarGroup`, `ProgressBar`, `ProgressSteps`, `Timeline` |
| **Formulaires** | `FormField`, `Input`, `Textarea`, `Select`, `DatePicker`, `Toggle`, `Checkbox`, `CheckboxGroup`, `RadioGroup`, `RatingInput`, `QuestionBuilder`, `SearchInput` |
| **Feedback** | `Toast`, `ToastContainer`, `Alert`, `Modal`, `ConfirmDialog`, `Tooltip`, `Skeleton` |
| **Actions** | `Button`, `IconButton`, `ActionMenu`, `Pagination`, `FilterBar` |
| **Domaine** | `CampaignCard`, `EvaluationCard`, `EvaluationForm`, `SignaturePanel`, `OffboardingChecklist`, `OnboardingSteps`, `RoleBadge`, `DepartmentTag`, `NotificationItem`, `NotificationBell` |
| **Graphiques** | `CompletionRateChart`, `ScoreDistribution`, `CampaignSummaryTable` |

**Total : 50 composants**
