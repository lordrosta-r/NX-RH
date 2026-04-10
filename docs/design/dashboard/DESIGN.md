# Design System — Inner App Pages (Dashboard, Manager, HR…)
**"Editorial Enterprise" — Sovereign Workspace**

Ce document est la référence de design pour toutes les pages internes de l'application (post-login). Il complète `docs/design/login/DESIGN.md` qui couvre la page de connexion.

> **Règle d'or :** ne jamais hardcoder de couleur. Toujours utiliser les tokens `var(--color-*)` définis dans `client/src/styles/tokens.css`.

---

## 1. Palette & Surface Hierarchy

La palette suit le principe des **couches de papier fin** :

| Variable CSS | Valeur | Usage |
|---|---|---|
| `--color-surface` | `#fcf9f8` | Le fond de page — "le bureau" |
| `--color-surface-container-low` | `#f6f3f2` | Zones utilitaires (sidebar light, notification center) |
| `--color-surface-container-lowest` | `#ffffff` | Carte active — ressort visuellement sans ombre |
| `--color-surface-container-high` | `#eae7e7` | Track du progress ring, éléments secondaires |

### Règle "No-Line"
Interdiction de border `1px solid` pour séparer les sections. Les limites sont établies exclusivement par :
1. **Glissement de teinte** — sidebar foncée contre contenu clair
2. **Espace négatif** — les gouttières entre les cartes créent une frontière implicite
3. **"Ghost Border"** — si une bordure est obligatoire (accessibilité form), utiliser `var(--color-outline-variant)` à 20% d'opacité max

---

## 2. Sidebar — Dark Violet

```css
--color-sidebar:           #2e1065;   /* violet-950 — fond de la sidebar */
--color-sidebar-nav-text:  rgba(221, 214, 254, 0.65);   /* texte inactif */
--color-sidebar-nav-active:#ffffff;                       /* texte actif */
--color-sidebar-active-bg: var(--color-primary);          /* rouge — autorité */
--color-sidebar-hover-bg:  rgba(255, 255, 255, 0.07);
--color-sidebar-label:     rgba(167, 139, 250, 0.55);
```

**Règles :**
- La sidebar est **toujours sombre** (dark violet), quel que soit le thème de la page
- L'item actif utilise `--color-primary` (rouge) avec une ombre `0 4px 14px rgba(184,0,11,0.40)`
- La sidebar a `width: 256px`, `position: fixed`, `height: 100vh`
- Le contenu principal a `margin-left: 256px`

---

## 3. Topbar

- `position: sticky; top: 0; z-index: 40`
- Background identique au fond de page (`--color-surface`) — pas de border-bottom
- Séparateur entre search et actions : via l'espace négatif, pas de ligne
- Search pill : fond `--color-surface-container-low`, border-radius `--radius-full`

---

## 4. Typographie — Editorial Voice

**Règle :** Inter uniquement. Toujours chargé via Google Fonts dans le `<head>` du HTML.

| Usage | Taille | Poids | Letter-spacing |
|---|---|---|---|
| Greeting headline (`H2`) | `2rem` | 800 | `-0.03em` |
| Banner headline | `clamp(2rem, 3.5vw, 3rem)` | 900 | `-0.03em` |
| Card title | `1.125rem` | 700 | `-0.01em` |
| Spotlight title | `1.625rem` | 900 | `-0.02em` |
| Labels / metadata | `0.6875rem` | 700 | `+0.1em` en majuscules |
| Body text | `0.875rem` | 400/500 | normal, `line-height: 1.55` |

**Accent rouge** : le mot ou groupe de mots clé du headline est coloré via `color: var(--color-primary)`.

---

## 5. Campaign Banner — Hero Card

Structure de la bannière hero :
```
┌─────────────────────────────────────────────────────────┐
│ [Badge "Campagne active"]                               │
│                                                         │
│ Votre entretien annuel 2026 est maintenant ouvert.      │
│ (texte body)                                            │
│                                               [Ring]    │
│                                               [CTA btn] │
└─────────────────────────────────────────────────────────┘
```

- Fond : `--color-surface-container-lowest` (`#fff`) sur fond de page `#fcf9f8` → élévation naturelle sans ombre
- Badge : fond `--color-error-container`, texte `--color-error`, pill `--radius-full`, dot pulsant
- Headline : `font-weight: 900`, `letter-spacing: -0.03em`, accent `var(--color-primary)`
- Progress ring SVG : `stroke: var(--color-surface-container-high)` (track) + `stroke: var(--color-secondary)` (progress), `strokeLinecap: round`
- CTA button : gradient `var(--gradient-primary)` (135deg, primary → primary-container), pill, shadow `var(--shadow-cta)`
- Glow décoratif : `rgba(91, 0, 223, 0.04)`, `filter: blur(60px)`, positionné en absolu

---

## 6. Bento Grid

```css
.db-bento {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 1.25rem;
}
```

Placement des cellules :
- **Quick cards** (col 1, col 2, row 1) : fond `--color-surface-container-lowest`, hover lift + `translateY(-2px)`, min-height `220px`
- **Notification center** (col 3, row 1-2) : fond `--color-surface-container-low`, `grid-row: span 2`
- **Spotlight** (col 1-2, row 2) : fond gradient atmosphérique sombre, `grid-column: span 2`

**Anti-divider rule** : les items de la liste de notifications sont séparés par `padding-bottom + border-bottom: 1px solid rgba(28,27,27,0.06)` uniquement (pas de ligne pleine).

---

## 7. Boutons

| Type | Style |
|---|---|
| **CTA principal** | Gradient `var(--gradient-primary)`, pill `--radius-full`, texte blanc uppercase, shadow `var(--shadow-cta)` |
| **Secondaire** | Fond `var(--color-secondary)`, texte blanc, pour les actions "Growth / Culture" |
| **Ghost** | Pas de fond, hover `--color-surface-container-high`, pour les actions tertiaires |

---

## 8. Icônes

Toujours des SVG stroke importés depuis le barrel `components/ui/icons`.

| Icône | Fichier | Usage |
|---|---|---|
| `HomeIcon` | `HomeIcon.jsx` | Nav sidebar — Dashboard |
| `ClipboardIcon` | `ClipboardIcon.jsx` | Nav sidebar — Évaluation |
| `TrendIcon` | `TrendIcon.jsx` | Nav sidebar — Progression |
| `GearIcon` | `GearIcon.jsx` | Nav sidebar — Paramètres |
| `BellIcon` | `BellIcon.jsx` | Topbar — Notifications |
| `SearchIcon` | `SearchIcon.jsx` | Topbar — Recherche |
| `ArrowNEIcon` | `ArrowNEIcon.jsx` | Cartes interactives — hover arrow |
| `ChevronRightIcon` | `ChevronRightIcon.jsx` | Liens inline "Voir →" |

Props standards : `size` (défaut 18), `color` (défaut `currentColor`), `strokeWidth` (défaut 2).

---

## 9. Breakpoints

| Breakpoint | Comportement |
|---|---|
| `> 1100px` | Layout 3 colonnes complet |
| `≤ 1100px` | Grille passe en 2 colonnes, notifications et spotlight en full-width |
| `≤ 720px` | Sidebar masquée (navigation mobile à implémenter), grille 1 colonne |

---

## 10. Réutiliser ce design sur une nouvelle page interne

Pour créer un nouveau "home" (ex: `/manager`, `/hr`) :

1. **Copier** la structure `DashboardSidebar.jsx/.css` dans le nouveau dossier de page
2. **Adapter** les `NAV_ITEMS` (labels + icônes selon le rôle)
3. **Réutiliser** les classes CSS `.db-*` depuis `dashboard.css` si la structure est identique, ou créer un `<page>.css` qui `@import` les tokens
4. **Ne jamais** hardcoder les couleurs — toujours `var(--color-*)`
5. **Documenter** les nouveaux composants dans ce même fichier `DESIGN.md`

---

## 11. Ce qu'on ne fait PAS sur les pages internes

- Pas de `overflow: hidden` sur `<html>/<body>` (les pages internes doivent scroller)
- Pas de fond plein écran avec mosaic (réservé à la page login)
- Pas de `data-theme` toggle pour l'instant (les pages internes sont toujours en Editorial Enterprise light)
- Pas de Material Symbols (font-icons) — SVG stroke uniquement
