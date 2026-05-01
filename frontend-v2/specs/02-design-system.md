# NX-RH — Design System v2
> Système de design officiel pour NanoXplore RH · Frontend v2

---

## 1. Brand & Identity

### Nom & Tagline
- **Nom complet** : NX-RH — NanoXplore RH
- **Tagline** : *"L'entretien annuel, simplifié."*
- **Abréviation logo** : `NX` (monogramme) suivi de `RH` en poids léger

### Utilisation du logo
- Logo complet (`NX-RH` + wordmark) : header navbar, page de connexion
- Monogramme seul (`NX`) : favicon, avatar app mobile, onglet browser
- Fond clair uniquement en v1 (dark mode : inversion possible avec filtre CSS)
- Espacement de protection : `16px` minimum autour du logo (pas d'éléments visuels dans la zone)
- **Ne jamais** déformer, pivoter ou recolorer en dehors de la palette primaire

### Personnalité de marque
| Attribut | Description |
|---|---|
| **Professionnel** | Interface épurée, typographie précise, densité d'information maîtrisée |
| **Chaleureux** | Couleurs teal vives (vs bleu froid corporate), tons doux, illustrations SVG humaines |
| **Centré RH** | Iconographie métier, vocabulaire RH français, statuts lisibles |
| **Fiable** | Cohérence visuelle stricte, états de loading clairs, feedback immédiat |

---

## 2. Color Palette

### 2.1 Couleur Primaire — NX Teal
Inspirée de `HSL(202, 79%, 50%)` (#17A8D4) d'Eurecia. Gamme complète générée sur l'échelle 50→950.

| Token | Classe Tailwind | Hex | HSL | Usage |
|---|---|---|---|---|
| `primary-50` | `bg-primary-50` | `#EFF9FD` | `202 79% 97%` | Fond hover subtil, highlight sélection |
| `primary-100` | `bg-primary-100` | `#D9F1FA` | `202 79% 92%` | Fond badge info, chip sélectionné |
| `primary-200` | `bg-primary-200` | `#A8E0F5` | `202 79% 82%` | Bordure focus légère |
| `primary-300` | `bg-primary-300` | `#62C8EC` | `202 79% 66%` | Icônes décoratives, dividers |
| `primary-400` | `bg-primary-400` | `#2DB5DE` | `202 79% 53%` | Hover état bouton primaire |
| `primary-500` | `bg-primary-500` | `#17A8D4` | `202 79% 46%` | **Couleur principale** — CTA, liens actifs |
| `primary-600` | `bg-primary-600` | `#1290B5` | `202 79% 39%` | Active state bouton, pressed |
| `primary-700` | `bg-primary-700` | `#0E7090` | `202 79% 31%` | Texte sur fond clair, nav active |
| `primary-800` | `bg-primary-800` | `#0A5068` | `202 79% 23%` | Titres colorés, backgrounds sombres |
| `primary-900` | `bg-primary-900` | `#063545` | `202 79% 15%` | Footer dark, hero sections |
| `primary-950` | `bg-primary-950` | `#031E29` | `202 79% 9%` | Texte ultra-sombre sur blanc |

### 2.2 Neutrals — Slate
Palette slate pour textes, fonds, bordures.

| Token | Hex | Usage principal |
|---|---|---|
| `slate-50` | `#F8FAFC` | Fond page principal (body background) |
| `slate-100` | `#F1F5F9` | Fond card secondaire, zone désactivée |
| `slate-200` | `#E2E8F0` | Bordures de card, séparateurs |
| `slate-300` | `#CBD5E1` | Bordures input inactive |
| `slate-400` | `#94A3B8` | Placeholder text, icônes désactivées |
| `slate-500` | `#64748B` | Texte secondaire, labels |
| `slate-600` | `#475569` | Texte corps medium |
| `slate-700` | `#334155` | Texte corps principal |
| `slate-800` | `#1E293B` | Titres |
| `slate-900` | `#0F172A` | Titres principaux H1 |
| `slate-950` | `#020617` | Noir absolu (usage rare) |

### 2.3 Couleurs Sémantiques

#### Success (Vert)
| Token | Hex | Usage |
|---|---|---|
| `success-50` | `#F0FDF4` | Fond alerte succès |
| `success-500` | `#22C55E` | Icône succès, badge validé |
| `success-600` | `#16A34A` | Texte succès, bouton confirm |
| `success-700` | `#15803D` | Hover état succès |

#### Warning (Amber)
| Token | Hex | Usage |
|---|---|---|
| `warning-50` | `#FFFBEB` | Fond alerte attention |
| `warning-400` | `#FBBF24` | Icône warning |
| `warning-500` | `#F59E0B` | Badge en attente |
| `warning-600` | `#D97706` | Texte avertissement |

#### Error (Rouge)
| Token | Hex | Usage |
|---|---|---|
| `error-50` | `#FEF2F2` | Fond alerte erreur, input en erreur |
| `error-500` | `#EF4444` | Icône erreur |
| `error-600` | `#DC2626` | Texte erreur, bouton danger |
| `error-700` | `#B91C1C` | Hover bouton danger |

#### Info (Bleu)
| Token | Hex | Usage |
|---|---|---|
| `info-50` | `#EFF6FF` | Fond alerte info |
| `info-500` | `#3B82F6` | Icône info |
| `info-600` | `#2563EB` | Texte info, liens secondaires |

### 2.4 Surface Colors
| Token | Valeur | Usage |
|---|---|---|
| `surface-bg` | `slate-50` (`#F8FAFC`) | Fond page global |
| `surface-card` | `white` (`#FFFFFF`) | Fond cards, panels |
| `surface-overlay` | `rgba(15,23,42,0.5)` | Overlay modale (slate-900/50) |
| `surface-tooltip` | `slate-900` (`#0F172A`) | Fond tooltips |
| `surface-navbar` | `white` + `shadow-sm` | Barre de navigation |

### 2.5 Configuration Tailwind

```typescript
// tailwind.config.ts — section colors
colors: {
  primary: {
    50:  '#EFF9FD',
    100: '#D9F1FA',
    200: '#A8E0F5',
    300: '#62C8EC',
    400: '#2DB5DE',
    500: '#17A8D4',
    600: '#1290B5',
    700: '#0E7090',
    800: '#0A5068',
    900: '#063545',
    950: '#031E29',
  },
  success: {
    50: '#F0FDF4', 500: '#22C55E', 600: '#16A34A', 700: '#15803D',
  },
  warning: {
    50: '#FFFBEB', 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706',
  },
  error: {
    50: '#FEF2F2', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C',
  },
  info: {
    50: '#EFF6FF', 500: '#3B82F6', 600: '#2563EB',
  },
}
```

---

## 3. Typography

### Police principale : Inter
```html
<!-- Google Fonts import -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Échelle typographique complète

| Classe Tailwind | Size | Line Height | Weight usage | Usage |
|---|---|---|---|---|
| `text-xs` | 12px | 16px (1.33) | 400, 500 | Captions, timestamps, metadata |
| `text-sm` | 14px | 20px (1.43) | 400, 500 | Labels form, texte table, badges |
| `text-base` | 16px | 24px (1.5) | 400, 500 | Corps de texte principal |
| `text-lg` | 18px | 28px (1.56) | 500, 600 | Sous-titres card, intro paragraphe |
| `text-xl` | 20px | 28px (1.4) | 600 | Titres card, H3 section |
| `text-2xl` | 24px | 32px (1.33) | 600, 700 | Titres de page H2 |
| `text-3xl` | 30px | 36px (1.2) | 700 | Titres principaux H1 (desktop) |
| `text-4xl` | 36px | 40px (1.11) | 700 | Héros, dashboard KPI large |
| `text-5xl` | 48px | 52px (1.08) | 700 | Landing / splash screen uniquement |

### Graisses et règles d'usage
| Classe | Poids | Usage |
|---|---|---|
| `font-normal` | 400 | Corps de texte, paragraphes, descriptions |
| `font-medium` | 500 | Labels, valeurs de champs, navigation |
| `font-semibold` | 600 | Titres de section, noms de colonnes, CTA |
| `font-bold` | 700 | H1 page, KPI numbers, titres forts |

### Règles sémantiques
- **H1** (text-3xl/bold) : une seule fois par page, titre de la vue courante
- **H2** (text-2xl/semibold) : sous-sections majeures (ex: "Campagnes en cours")
- **H3** (text-xl/semibold) : titres de cards, groupes de formulaires
- **Body** (text-base/normal) : tout le contenu descriptif
- **Label** (text-sm/medium) : labels de champs, entêtes de tableau
- **Caption** (text-xs/normal, slate-500) : dates, métadonnées, helpers

### Configuration Tailwind
```typescript
fontFamily: {
  sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
},
```

---

## 4. Spacing & Layout

### Grille d'espacement (base 4px)
| Token | Valeur | Usage typique |
|---|---|---|
| `space-1` | 4px | Espacement inline minimum |
| `space-2` | 8px | Gap icône/texte, padding badge |
| `space-3` | 12px | Padding bouton sm, gap compact |
| `space-4` | 16px | Padding standard, gap entre éléments |
| `space-5` | 20px | Padding card sm, gap liste |
| `space-6` | 24px | Padding card md, section interne |
| `space-8` | 32px | Gap entre cards, section padding |
| `space-10` | 40px | Padding section page |
| `space-12` | 48px | Espacement sections majeures |
| `space-16` | 64px | Padding page top (sous navbar) |
| `space-20` | 80px | Sections héros |

### Containers & Breakpoints
```
mobile  (< 640px)  : padding horizontal 16px (px-4)
tablet  (768px)    : padding horizontal 24px (px-6), max-w-screen-md
laptop  (1024px)   : padding horizontal 32px (px-8), max-w-screen-lg
desktop (1280px+)  : padding horizontal 32px (px-8), max-w-7xl (1280px)
```

### Système de grille — 12 colonnes
```css
/* Grille principale de l'app */
.app-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 24px; /* gap-6 */
}

/* Layouts courants */
/* Full width    */ col-span-12
/* 2/3 + 1/3    */ col-span-8 + col-span-4
/* 1/2 + 1/2    */ col-span-6 + col-span-6
/* 3 colonnes   */ col-span-4 x3
/* 4 colonnes   */ col-span-3 x4
```

### Conventions de padding

| Contexte | Padding |
|---|---|
| Page container | `pt-8 pb-16 px-8` (desktop), `pt-6 pb-12 px-4` (mobile) |
| Card standard | `p-6` (24px) |
| Card compacte | `p-4` (16px) |
| Table cell | `px-4 py-3` |
| Section header | `mb-6` en bas |
| Form group | `space-y-4` entre champs |

---

## 5. Border Radius & Shadows

### Border Radius
| Token | Valeur | Classe Tailwind | Usage |
|---|---|---|---|
| `radius-sm` | 4px | `rounded` | Badges, chips, tags |
| `radius-md` | 8px | `rounded-lg` | Boutons, inputs, cards compactes |
| `radius-lg` | 12px | `rounded-xl` | Cards principales, panels |
| `radius-xl` | 16px | `rounded-2xl` | Modals, popovers, drawers |
| `radius-full` | 9999px | `rounded-full` | Avatars, pills de statut |

### Shadows
| Token | Valeur CSS | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Navbar, inputs focus léger |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)` | Cards standard |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)` | Dropdowns, popovers |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.10), 0 8px 10px -6px rgba(0,0,0,0.05)` | Modals, sidesheets |

**Règle d'usage** : cards → `shadow-md`, hover card → `shadow-lg`, modal → `shadow-xl`, navbar → `shadow-sm`

---

## 6. Component Tokens

### 6.1 Boutons

#### Variantes
| Variante | Background | Texte | Border | Hover |
|---|---|---|---|---|
| **Primary** | `primary-500` | white | — | `primary-600` |
| **Secondary** | white | `primary-700` | `primary-300` | `primary-50` bg |
| **Ghost** | transparent | `slate-700` | — | `slate-100` bg |
| **Danger** | `error-600` | white | — | `error-700` |

#### Tailles
| Size | Height | Padding H | Font | Radius |
|---|---|---|---|---|
| `sm` | 32px | `px-3` | `text-sm font-medium` | `rounded-lg` |
| `md` | 40px | `px-4` | `text-sm font-semibold` | `rounded-lg` |
| `lg` | 48px | `px-6` | `text-base font-semibold` | `rounded-xl` |

#### États
```
default   : normal style défini ci-dessus
hover     : bg légèrement plus sombre (600→700), transition 150ms
active    : scale-[0.98], bg encore plus sombre
disabled  : opacity-50, cursor-not-allowed
loading   : spinner inline-block 16px, texte masqué ou "Chargement..."
focus     : ring-2 ring-primary-500 ring-offset-2
```

### 6.2 Inputs

```
height       : 40px (md), 36px (sm)
padding      : px-3 py-2
border       : 1px solid slate-300
border-radius: rounded-lg (8px)
font         : text-sm text-slate-700
placeholder  : text-slate-400

focus  : border-primary-500, ring-2 ring-primary-200 (outline léger)
error  : border-error-500, ring-2 ring-error-200, bg-error-50
disabled : bg-slate-100, text-slate-400, cursor-not-allowed
```

### 6.3 Badges / Pills de statut

#### Statuts de campagne
| Statut | Background | Texte | Libellé FR |
|---|---|---|---|
| `draft` | `slate-100` | `slate-600` | Brouillon |
| `active` | `primary-100` | `primary-700` | Active |
| `closed` | `warning-50` | `warning-600` | Clôturée |
| `archived` | `slate-200` | `slate-500` | Archivée |

#### Statuts d'évaluation
| Statut | Background | Texte | Libellé FR |
|---|---|---|---|
| `assigned` | `info-50` | `info-600` | Assignée |
| `in_progress` | `primary-100` | `primary-700` | En cours |
| `submitted` | `warning-50` | `warning-600` | Soumise |
| `reviewed` | `success-50` | `success-600` | Vérifiée |
| `signed_employee` | `info-50` | `info-600` | Signée (collaborateur) |
| `signed_manager` | `primary-100` | `primary-700` | Signée (manager) |
| `validated` | `success-50` | `success-700` | Validée |
| `expired` | `error-50` | `error-600` | Expirée |
| `archived` | `slate-200` | `slate-500` | Archivée |

**Style pill** : `px-2.5 py-0.5 rounded-full text-xs font-medium`

### 6.4 Cards
```
background    : white
border        : 1px solid slate-200
border-radius : rounded-xl (12px)
shadow        : shadow-md
padding       : p-6 (standard), p-4 (compacte)
hover         : shadow-lg, transform scale-[1.01], transition 150ms
```

### 6.5 Tables
```
header row  : bg-slate-50, text-xs font-semibold text-slate-500 uppercase tracking-wider
              padding: px-4 py-3, border-b border-slate-200
body row    : bg-white, text-sm text-slate-700
              padding: px-4 py-3
hover row   : bg-primary-50
striped     : bg-slate-50 sur lignes paires (optionnel par prop)
border      : border border-slate-200, rounded-xl overflow
```

### 6.6 Alerts / Toasts

| Type | Background | Border-left | Icône | Texte |
|---|---|---|---|---|
| `success` | `success-50` | `success-500` (4px) | `CheckCircle` | `success-700` |
| `warning` | `warning-50` | `warning-500` (4px) | `AlertTriangle` | `warning-700` |
| `error` | `error-50` | `error-500` (4px) | `XCircle` | `error-700` |
| `info` | `info-50` | `info-500` (4px) | `Info` | `info-700` |

**Toast** : position `fixed bottom-4 right-4`, max-w `sm` (384px), auto-dismiss 4s, shadow-xl

### 6.7 Modals
```
overlay     : bg-slate-900/50 backdrop-blur-sm, z-50
container   : bg-white rounded-2xl shadow-xl, z-50
max-widths  : sm=480px, md=640px, lg=800px, xl=1024px
header      : p-6 border-b border-slate-200, font-semibold text-slate-800
body        : p-6
footer      : p-6 border-t border-slate-200, flex justify-end gap-3
close btn   : top-4 right-4, ghost button, icon X 20px
```

### 6.8 Avatars
| Size | Dimension | Font | Usage |
|---|---|---|---|
| `sm` | 24px | `text-xs` | Tableaux, listes denses |
| `md` | 32px | `text-sm` | Navbar, cards compactes |
| `lg` | 40px | `text-base` | Profil inline, cards |
| `xl` | 48px | `text-lg` | Page profil, modal header |

**Fallback initiales** : 2 premières lettres (Prénom + Nom), bg auto-généré depuis hash du nom (parmi 8 teintes primaires/neutres)

### 6.9 Progress Bars
```
thin (4px)  : h-1, rounded-full — taux de complétion, progression globale
thick (8px) : h-2, rounded-full — indicateur d'étapes, score évaluation
step bar    : h-2, segmenté par step, couleur primary-500 pour complété, slate-200 pour vide
```

### 6.10 Navigation Navbar
```
height          : 64px (h-16)
position        : fixed top-0 left-0 right-0, z-40
background      : white, shadow-sm
padding         : px-8
logo            : left, h-8
nav links       : center (desktop), drawer (mobile)
  - text-sm font-medium text-slate-600
  - hover : text-primary-600
  - active : text-primary-700 font-semibold, border-b-2 border-primary-500
user zone       : right — avatar md + name + chevron (dropdown)
page top offset : pt-16 (padding-top pour le contenu sous la navbar)
```

---

## 7. Icons

### Bibliothèque : Lucide React

```bash
npm install lucide-react
```

### Tailles standard
| Contexte | Size | Classe Tailwind |
|---|---|---|
| Inline dans texte | 16px | `w-4 h-4` |
| Dans boutons / badges | 20px | `w-5 h-5` |
| Standalone / titres | 24px | `w-6 h-6` |
| Hero / empty states | 48px | `w-12 h-12` |

### Iconographie par module
| Module | Icône Lucide | Usage |
|---|---|---|
| Campagnes | `BarChart2` | Menu nav, header page |
| Évaluations | `ClipboardList` | Menu nav, badges |
| Collaborateurs | `Users` | Annuaire, assignations |
| Mon profil | `UserCircle` | Avatar fallback, profil |
| Tableau de bord | `LayoutDashboard` | Home nav item |
| Paramètres | `Settings` | Footer nav, admin |
| Notifications | `Bell` | Navbar droite |
| Recherche | `Search` | Barre de recherche |
| Filtres | `SlidersHorizontal` | Toolbar listes |
| Export | `Download` | Actions contextuelles |
| Nouveau / Ajouter | `Plus` | CTA principal |
| Modifier | `Pencil` | Action inline |
| Supprimer | `Trash2` | Action danger |
| Valider | `Check` | Confirmation |
| Fermer / Annuler | `X` | Modal close, dismiss |
| Développer | `ChevronDown` | Accordéon, dropdown |
| Lien externe | `ExternalLink` | Liens sortants |
| Calendrier | `Calendar` | Date pickers |
| Signature | `PenLine` | Étape signature |
| Statut | `CircleDot` | Indicateurs statut |

---

## 8. Animations & Transitions

### Standard global
```css
/* Appliqué sur boutons, links, cards */
transition-property: all;
transition-duration: 150ms;
transition-timing-function: ease-in-out;
```
```
Tailwind shorthand: transition-all duration-150 ease-in-out
```

### Transitions spécifiques

```css
/* Page transition — fade */
.page-enter  { opacity: 0; }
.page-active { opacity: 1; transition: opacity 200ms ease-in-out; }

/* Modal open — scale + fade */
.modal-enter  { opacity: 0; transform: scale(0.95); }
.modal-active { opacity: 1; transform: scale(1); transition: all 150ms ease-out; }

/* Toast — slide-in depuis bas droite */
.toast-enter  { opacity: 0; transform: translateY(16px); }
.toast-active { opacity: 1; transform: translateY(0); transition: all 200ms ease-out; }

/* Skeleton shimmer */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### Hover effects
```
Cards       : hover:shadow-lg hover:scale-[1.01] transition-all duration-150
Boutons     : hover:bg-primary-600 transition-colors duration-150
Nav links   : hover:text-primary-600 transition-colors duration-100
Row tables  : hover:bg-primary-50 transition-colors duration-100
```

---

## 9. Responsive Breakpoints

| Breakpoint | Valeur | Cible |
|---|---|---|
| *(default)* | 0px | Mobile 375px — navigation drawer, cards empilées |
| `sm` | 640px | Grand mobile landscape — 2 colonnes possibles |
| `md` | 768px | Tablette — layout 2 cols, mega-menu réduit |
| `lg` | 1024px | Laptop — layout 3 cols, sidebar optionnelle |
| `xl` | 1280px | **Desktop cible** — layout plein 12 cols, navbar complète |
| `2xl` | 1536px | Grand écran — max-w-7xl centré |

### Comportements adaptatifs
- **Navbar** : liens masqués `< md`, remplacés par hamburger + drawer
- **Grille cards** : `grid-cols-1` (mobile) → `grid-cols-2` (md) → `grid-cols-3` (xl)
- **Tableaux** : scroll horizontal `overflow-x-auto` sur mobile, colonnes condensées
- **Modals** : plein écran sur mobile (`sm:max-w-lg sm:mx-auto`)
- **Typography** : H1 passe de `text-2xl` (mobile) à `text-3xl` (xl)

---

## 10. Dark Mode

### Décision : Dark Mode supporté (préférence système)
Le dark mode est activé via `prefers-color-scheme: dark` (strategy: `'class'` dans Tailwind pour contrôle manuel possible).

### Tokens Dark Mode
| Token Light | Token Dark | Surface |
|---|---|---|
| `bg-slate-50` | `bg-slate-900` | Fond page |
| `bg-white` | `bg-slate-800` | Fond card |
| `text-slate-800` | `text-slate-100` | Titres |
| `text-slate-600` | `text-slate-400` | Texte secondaire |
| `border-slate-200` | `border-slate-700` | Bordures |
| `bg-slate-100` | `bg-slate-700` | Fond inputs, hover rows |

### Couleurs primaires en dark mode
La couleur primaire `primary-500` reste identique. Les fonds teal (primary-50/100) sont remplacés par `primary-900/800`.

```typescript
// Tailwind config — darkMode
darkMode: 'class', // contrôle via classe .dark sur <html>
```

---

## 11. Tailwind Config — Fichier complet

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#EFF9FD',
          100: '#D9F1FA',
          200: '#A8E0F5',
          300: '#62C8EC',
          400: '#2DB5DE',
          500: '#17A8D4',
          600: '#1290B5',
          700: '#0E7090',
          800: '#0A5068',
          900: '#063545',
          950: '#031E29',
        },
        success: {
          50:  '#F0FDF4',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        warning: {
          50:  '#FFFBEB',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        error: {
          50:  '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        info: {
          50:  '#EFF6FF',
          500: '#3B82F6',
          600: '#2563EB',
        },
      },
      borderRadius: {
        sm:   '4px',
        md:   '8px',
        lg:   '12px',
        xl:   '16px',
        '2xl':'20px',
        full: '9999px',
      },
      boxShadow: {
        sm:  '0 1px 2px rgba(0,0,0,0.05)',
        md:  '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
        lg:  '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)',
        xl:  '0 20px 25px -5px rgba(0,0,0,0.10), 0 8px 10px -6px rgba(0,0,0,0.05)',
      },
      spacing: {
        '18': '72px',
        '22': '88px',
        '88': '352px',
        '128': '512px',
      },
      height: {
        navbar: '64px',
      },
      maxWidth: {
        '8xl': '88rem',
      },
      screens: {
        sm:  '640px',
        md:  '768px',
        lg:  '1024px',
        xl:  '1280px',
        '2xl': '1536px',
      },
      keyframes: {
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        slideInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer:    'shimmer 1.5s infinite linear',
        fadeIn:     'fadeIn 200ms ease-in-out',
        scaleIn:    'scaleIn 150ms ease-out',
        slideInUp:  'slideInUp 200ms ease-out',
      },
    },
  },
  plugins: [],
}

export default config
```

---

## Récapitulatif des décisions design

| Décision | Choix | Raison |
|---|---|---|
| Couleur primaire | Teal `#17A8D4` | Alignement Eurecia, modernité, accessibilité |
| Police | Inter | Neutralité, lisibilité, omniprésence en SaaS |
| Navbar | Top fixed 64px | Cohérence Eurecia, pas de sidebar |
| Cards | White + shadow-md + rounded-xl | Clarté, professionnalisme |
| Radius | 12px (cards), 8px (buttons) | Moderne sans être trop playful |
| Dark mode | Oui, class strategy | Confort utilisateur, standard 2024 |
| Icons | Lucide React | Cohérence, tree-shakable, MIT |
| Transitions | 150ms ease-in-out | Réactif sans être brusque |
| Grid | 12 colonnes, gap-6 | Flexibilité layouts complexes RH |

---

## SlideOver

Panneau latéral animé (right side) pour les actions contextuelles sans quitter la vue principale (édition inline, aperçu de détail, formulaires courts).

### Usage

```tsx
<SlideOver open={open} onClose={() => setOpen(false)} title="Modifier l'utilisateur">
  <UserEditForm userId={id} onSaved={() => setOpen(false)} />
</SlideOver>
```

### Props

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `open` | `boolean` | — | Contrôle la visibilité du panneau |
| `onClose` | `() => void` | — | Appelé sur backdrop-click ou bouton ✕ |
| `title` | `string` | — | Titre affiché dans le header du panneau |
| `children` | `ReactNode` | — | Contenu du corps |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Largeur du panneau (`sm`=320px, `md`=480px, `lg`=640px) |
| `footer` | `ReactNode` | `undefined` | Barre d'actions bas de panneau (ex. Annuler / Enregistrer) |

### Comportement

- **Entrée** : `translate-x-full → translate-x-0`, `300ms ease-out`
- **Sortie** : `translate-x-0 → translate-x-full`, `200ms ease-in`
- **Backdrop** : `bg-black/40`, clic ferme le panneau
- **Focus trap** : `Tab` cycle dans le panneau uniquement quand ouvert
- **Scroll** : corps scrollable indépendamment (`overflow-y-auto`)
- **Fermeture clavier** : `Escape` déclenche `onClose`

### Variantes d'utilisation

| Contexte | Taille | Contenu |
|---|---|---|
| Édition utilisateur (Org, S-36) | `md` | Formulaire champs hiérarchie + secteur |
| Détail demande RH (Flags, S-38) | `md` | Résumé évaluation + bouton changement statut |
| Édition template mail (S-40) | `lg` | Textarea `subject` + `body` + aperçu rendu |
| Création événement (S-19) | `sm` | `DatePicker`, `Select`, `Input` |

### Classes Tailwind (structure)

```
/* Overlay */
fixed inset-0 z-50 bg-black/40

/* Panneau */
fixed inset-y-0 right-0 z-50 flex flex-col
bg-white dark:bg-neutral-900 shadow-2xl
w-80 | w-[480px] | w-[640px]   /* sm | md | lg */
transition-transform duration-300 ease-out

/* Header */
flex items-center justify-between px-6 py-4
border-b border-neutral-200 dark:border-neutral-700

/* Corps */
flex-1 overflow-y-auto px-6 py-5

/* Footer (optionnel) */
flex items-center justify-end gap-3 px-6 py-4
border-t border-neutral-200 dark:border-neutral-700
```
