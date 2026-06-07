# Audit Mobile & Responsivité — NX-RH Frontend

**Date:** 2024  
**Scope:** `/frontend-v2/src`  
**Auditor:** Frontend Mobile Expert

---

## Résumé exécutif

**Score: 6.5/10**

L'application NX-RH utilise **Tailwind CSS** correctement avec une structure de breakpoints solide, mais présente plusieurs **enjeux critiques pour la mobilité** :

✅ **Forces** :
- Configuration Tailwind propre et cohérente
- Hamburger menu + drawer nav sur mobile
- Grille responsive bien structurée
- Overflow horizontal sur tableaux

❌ **Faiblesses majeures** :
- **Dropdowns non-responsive** (width fixe `w-52` → déborde sur mobile)
- **React-Flow sans optimisation touch** (organigramme inutilisable <800px)
- **Inputs de recherche trop larges** (`w-64` sur petit écran)
- **Tables sans colonnes masquées** (scrolling pénible sur mobile)
- **Modales potentiellement trop grandes** (manque padding mobile)

---

## Breakpoints Tailwind utilisés

### Configuration ✓ Correcte
```ts
// tailwind.config.ts
screens: {
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl': '1536px',
}
```

### Utilisation dans le code
| Composant | Breakpoints | État |
|-----------|-------------|------|
| **Navbar** | `md:hidden` (mobile menu), `hidden md:flex` (desktop) | ✅ Correct |
| **AdminHubPage** | `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` | ⚠️ Manque `sm:` |
| **OrgPage Teams** | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` | ✅ Excellent |
| **OrgPage Sectors** | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | ✅ Bon |
| **SearchOverlay** | `max-w-2xl` (pas de breakpoint mobile) | ⚠️ Non responsive |

---

## P0 — Bloquants (inutilisable sur mobile)

### 1. 🔴 Dropdown Menu non-responsive

**Problème**  
Les dropdowns du Navbar (Collaborateurs, Campagnes, Évaluations, etc.) ont une **largeur fixe** :
```tsx
// Navbar.tsx, ligne 164
<div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-lg...">
```

**Impact**  
- Sur mobile (< 640px) : le menu déborde de l'écran
- Pas de `max-w-[calc(100vw-1rem)]` pour rester dans la viewport
- Impossible de cliquer les items du bas du dropdown

**Reproduction**  
1. Ouvrir sur iPhone (375px)
2. Cliquer "Collaborateurs"
3. Le dropdown sort de l'écran vers la droite

**Solution à appliquer**  
```tsx
<div className={clsx(
  "absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg",
  "w-52 md:w-56", // Limiter la largeur
  "sm:max-w-[calc(100vw-2rem)]", // Empêcher débordement sur mobile
  "sm:left-auto sm:right-0" // Repositionner si needed
)}>
```

---

### 2. 🔴 React-Flow sans optimisation touch (OrgPage)

**Problème**  
Le composant `ReactFlow` (organigramme hiérarchique) n'a **aucune optimisation pour le touch** :
```tsx
// OrgPage.tsx
<ReactFlow nodes={nodes} edges={edges}>
  <Background variant={BackgroundVariant.Dots} />
  {/* Pas de panneau tactile, pas de contrôles mobiles optimisés */}
</ReactFlow>
```

**Impact**  
- Pas de zoom par pinch (deux doigts)
- Drag & drop peu intuitif sur mobile
- Contrôles en haut à droite inaccessibles sur petits écrans
- **Complètement inutilisable sur tablette < 1024px**

**Données**  
- OrgPage dispose d'une **Teams view** et **Sectors view** alternatives :
  - Teams: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
  - Sectors: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
  - Ces vues **fonctionnent bien** sur mobile ✅

**Recommandation urgente**  
```tsx
<ReactFlow 
  fitView
  nodeOrigin={[0.5, 0.5]}
  // Ajouter:
  panOnScroll={true}
  panOnDrag={[1, 2]} // Clic droit + clic milieu pour pan
  multiSelectionKeyCode="shift"
  // Options tactiles
  selectionOnDrag={false}
>
  {/* Afficher TeamsView par défaut sur mobile */}
  {isMobile ? <OrgTeamsView /> : <ReactFlowGraph />}
</ReactFlow>
```

**Alternative court terme** : Forcer la Teams/Sectors view sur écrans `< lg` et masquer React-Flow :
```tsx
{view === 'hierarchy' && isLargeScreen ? (
  <OrgHierarchyView />
) : (
  <OrgTeamsView /> // Plus utilisable
)}
```

---

### 3. 🔴 Search Overlay non-responsive

**Problème**  
```tsx
// SearchOverlay.tsx, ligne 71-72
<div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 p-4 bg-black/50">
  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl ...">
```

- `max-w-2xl` = 672px (trop large sur mobile)
- Avec `p-4`, reste seulement ~343px de contenu utile (375 - 2×4 - 2×12)
- Les résultats de recherche sont `max-h-96` (384px) → déborde sur iPhone

**Impact**  
- Impossible de voir les résultats entiers sur mobile
- Scrolling pénible et désorienté

**Solution**  
```tsx
<div className={clsx(
  "bg-white rounded-2xl shadow-2xl w-full",
  "sm:max-w-2xl max-w-full" // ou "max-w-sm sm:max-w-2xl"
)}>
```

---

## P1 — Importants

### 1. ⚠️ AdminHubPage: Grid sans sm breakpoint

**Code**  
```tsx
// AdminHubPage.tsx, ligne 23
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
```

**Problème**  
- Sur mobile (375px) : 2 colonnes à `(375 - 2×1.5 - 24) / 2 = ~171px` par card
- Titre + icône + description → tout est écrasé
- Icônes de 24px à côté de titres : illisible

**Optimal sur mobile**  
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
```

---

### 2. ⚠️ Tables sans colonnes masquées

**État actuel**  
DataTable utilise `overflow-x-auto` global :
```tsx
// DataTable.tsx, ligne 90
<div className="w-full overflow-x-auto rounded-xl border...">
  <table className="w-full text-sm">
```

**Problème**  
- Sur UsersPage : 7 colonnes visibles → scrolling horizontal massif
- Sur EvaluationsPage : idem
- Mobile users doivent scroller horizontalement pour voir chaque donnée

**Colonnes problématiques**  
| Page | Colonnes | Mobile? |
|------|----------|---------|
| **UsersPage** | Avatar, Nom, Rôle, Dept, Status, LastLogin, Actions | ❌ 7 cols |
| **EvaluationsPage** | Collaborateur, Campagne, Statut, Assigné à, Dates, Actions | ❌ 6 cols |

**Solution recommandée**  
```tsx
// DataTable doit supporter mode "compact"
// Masquer sur mobile:
{/* Desktop only */}
<td className="hidden sm:table-cell">{data.department}</td>
<td className="hidden md:table-cell">{data.lastLogin}</td>

// Mobile: afficher seulement Nom + Rôle + Actions
// Les détails dans un drawer/modal
```

---

### 3. ⚠️ Input de recherche trop large

**Code**  
```tsx
// UsersPage.tsx, ligne 329
<input
  className="pl-10 pr-4 py-2 ... w-64"
  placeholder="Rechercher..."
/>
```

**Problème**  
- `w-64` = 256px (68% de la largeur sur iPhone 375px)
- Laisse peu de place aux filtres dropdowns
- Layout sur mobile devient horizontal scrolling

**Optimal**  
```tsx
<input
  className="pl-10 pr-4 py-2 ... w-full sm:w-64"
/>
```

---

### 4. ⚠️ Modal max-width non optimisé

**Code**  
```tsx
// Modal.tsx, ligne 14-19
const SIZE_CLASSES = {
  sm: 'max-w-[480px]',
  md: 'max-w-[640px]', // 640px sur écran 375px = déborde
  lg: 'max-w-[800px]',
  xl: 'max-w-[1024px]',
}
```

**Problème**  
- Sur petit mobile : les modales "md" et "lg" sortent de la viewport
- Pas de padding mobile `p-4 sm:p-6`

**Optimal**  
```tsx
const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'sm:max-w-md md:max-w-lg',
  lg: 'sm:max-w-lg md:max-w-xl',
}

// Ajouter padding responsive
className={clsx(
  'p-4 sm:p-6',
  SIZE_CLASSES[size]
)}
```

---

### 5. ⚠️ Pas d'adaptation padding sur petit écran

**Observations**  
```tsx
// AppLayout.tsx, ligne 25
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

// UsersPage.tsx, ligne 284
<div className="bg-slate-50 min-h-screen p-6">
```

| Classe | Résultat | Optimal mobile? |
|--------|----------|-----------------|
| `px-4` | 16px × 2 = 32px utile | ✅ Oui |
| `py-8` | 32px top/bottom | ⚠️ Peut être `py-4 sm:py-8` |
| `p-6` | 24px all sides | ⚠️ Peut être `p-4 sm:p-6` |

**Exemple optimal**  
```tsx
<div className="p-4 sm:p-6 lg:p-8">
```

---

## P2 — Mineurs

### 1. Pagination spacing tight

**Code**  
```tsx
// Pagination buttons: gap-3
```

**Sur mobile** : Buttons deviennent `gap-2` pour économiser l'espace.

---

### 2. Certains icons trop petits

**Observation**  
```tsx
// IconButton, chercher instances de w-4 h-4
<button className="p-1.5 ...">
  <MoreVertical className="w-4 h-4" />
</button>
```

- `p-1.5` = 6px padding → total 16×16px (OK pour desktop)
- Sur touch mobile : devrait être `p-2` → 24×24px minimum (WCAG)

---

### 3. Typographie: line-height pas toujours optimal

**Observation**  
```tsx
<p className="text-xs text-slate-400">→ line-height hérité</p>
```

Sur mobile, `text-xs` (12px) avec line-height 1.5 = 18px (tight).  
Devrait avoir `leading-relaxed` sur petit écran.

---

## Points positifs ✅

1. **Navbar responsive excellent**
   - Hamburger menu clean (`md:hidden`)
   - Menu drawer bien intégré
   - Fermeture au click sur un item

2. **Tailwind config cohérent**
   - Custom colors, spacing, shadows bien définis
   - Breakpoints standards et appropriés

3. **Teams/Sectors views de l'organigramme**
   - Grilles responsives impeccables
   - Cardées adaptées à tous les écrans
   - Excellente alternative à React-Flow

4. **Boutons accessibles**
   - Tailles: `h-8` (32px), `h-10` (40px), `h-12` (48px)
   - `h-10+` adéquat pour touch (> 44×44 recommandé)

5. **DataTable avec overflow handling**
   - `overflow-x-auto` correct
   - Table base solide

6. **Modales avec good defaults**
   - `max-h-[90vh]` pour ne pas dépasser l'écran
   - Overflow géré correctement

---

## Recommandations prioritaires

### 🔥 URGENT (Sprint 1)

#### 1. Fixer les dropdowns du Navbar
**Effort**: 30 min  
**Impact**: Kritisch pour usabilité mobile

```tsx
// Navbar.tsx - NavDropdown component
<div className={clsx(
  "absolute top-full left-0 mt-2",
  "w-52",
  "sm:max-w-[calc(100vw-2rem)] sm:right-auto",
  "md:w-52 md:right-auto",
  "bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50"
)}>
```

---

#### 2. Mettre React-Flow en fallback sur mobile
**Effort**: 1h  
**Impact**: Critical

```tsx
// OrgPage.tsx
const isMobile = window.innerWidth < 768;

{isMobile || view !== 'hierarchy' ? (
  <OrgTeamsView data={teams} toolbar={toolbar} />
) : (
  <OrgHierarchyFlow nodes={nodes} edges={edges} />
)}
```

Ajouter bouton toggle "Vue Hiérarchie vs. Équipes" sur l'interface.

---

#### 3. SearchOverlay max-width responsive
**Effort**: 15 min  
**Impact**: High

```tsx
<div className="sm:max-w-2xl max-w-[calc(100vw-2rem)]">
```

---

### 📋 IMPORTANT (Sprint 2)

#### 4. DataTable colonnes masquées

Ajouter support mode "compact" au composant DataTable:
```tsx
export interface DataTableProps {
  // ...
  responsiveMode?: 'full' | 'compact'; // Nouveau
  mobileVisibleCols?: string[]; // Colonnes visibles < sm
}
```

Utilisation:
```tsx
<DataTable
  columns={allColumns}
  responsiveMode="compact"
  mobileVisibleCols={['name', 'role', 'actions']}
/>
```

---

#### 5. Fixer AdminHubPage grid

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
```

---

#### 6. Input largeur responsive

```tsx
// UsersPage, EvaluationsPage
<input className="... w-full sm:w-64" />
```

---

### 💡 BON À FAIRE (Sprint 3+)

#### 7. Padding consolidation

Créer une convention:
- **Mobile**: `p-4`
- **Tablet (sm)**: `p-5`
- **Desktop (md+)**: `p-6`

Pattern:
```tsx
<div className="p-4 sm:p-5 md:p-6">
```

---

#### 8. Tester touch targets

Audit les boutons et liens:
```tsx
// Tous les boutons doivent avoir min 44×44 sur mobile
<button className="p-2.5 sm:p-2"> {/* 40×40 minimum */}
```

WCAG 2.5.5 Level AAA: 44×44 px recommandé.

---

#### 9. LineHeight sur small text

```tsx
// Pour text-xs
<p className="text-xs leading-relaxed sm:leading-normal">
```

---

#### 10. Optimiser React-Flow (à long terme)

Si React-Flow reste critique:
```tsx
<ReactFlow
  fitView
  minZoom={0.1}
  maxZoom={4}
  panOnDrag={[1, 2]} // Clic droit + wheel
  panOnScroll
  selectionOnDrag={false}
  multiSelectionKeyCode={null} // Désactiver sur touch
>
```

Ajouter **gesture library** :
```
npm install @use-gesture/react
```

---

## Checklist de validation mobile

- [ ] Tester sur iPhone SE (375px)
- [ ] Tester sur iPhone 12 Pro (390px)
- [ ] Tester sur iPad Air (820px)
- [ ] Tester sur Android device (412px)
- [ ] Vérifier dropdowns ne débordent pas
- [ ] Vérifier searchOverlay ne déborde pas
- [ ] Vérifier modales responsive
- [ ] Test touch interactions (300ms delay, double tap)
- [ ] Test landscape mode
- [ ] Test avec zoom > 100%
- [ ] Vérifier contraste et lisibilité (WCAG AA)
- [ ] Utiliser DevTools Chrome mobile emulation

---

## Conclusion

NX-RH a une **base solide** avec Tailwind bien configuré, mais souffre de **3 blockers critiques** pour mobile :

1. **Dropdowns non-responsive** → débordent
2. **React-Flow non-optimisé** → inutilisable < 800px
3. **SearchOverlay trop large** → déborde

Les autres points (tables, formulaires, modales) sont **mineurs** et peuvent être adressés progressivement.

**Priorité**: Fixer les 3 blockers en Sprint 1, puis itérer sur UX tablet en Sprint 2.

---

## Ressources

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [WCAG 2.1 Touch Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [React-Flow Mobile Optimization](https://xyflow.com/docs/guide/interactions/touch)
- [Mobile First Approach](https://www.nngroup.com/articles/mobile-first-web-design/)
