# NanoXplore RH — Conventions & Architecture

## Principe directeur : K.I.S.S.

> Keep It Simple, Stupid.
> Si tu te demandes si c'est trop complexe, c'est trop complexe.

---

## 1. Structure des pages — Co-location absolue

Chaque page est un **dossier autonome**. Tout ce qui appartient à une page vit dedans.

```
client/src/pages/<page>/
├── main.jsx              ← Entry point Vite (NE PAS MODIFIER)
├── <Page>.jsx            ← Composant racine de la page
├── <page>.css            ← Tous les styles de cette page
├── <Composant>.jsx       ← Composant UI spécifique à cette page
├── <Composant>.css       ← Styles du composant (même dossier)
└── i18n/
    ├── fr.js             ← Chaînes françaises de cette page
    ├── en.js             ← Chaînes anglaises de cette page
    └── index.js          ← export const t = makeT({ fr, en })
```

**Règle :** un composant utilisé sur UNE SEULE page → il vit dans le dossier de cette page.
**Règle :** un composant utilisé sur PLUSIEURS pages → il va dans `components/ui/`.

---

## 2. Composants partagés — `components/ui/`

Réservé aux composants **100% réutilisables, sans logique métier** :

```
client/src/components/ui/
├── AppSidebar.jsx + AppSidebar.css  ← Sidebar partagée toutes pages internes
├── CalendarWidget.jsx + CalendarWidget.css  ← Calendrier partagé
├── Button.jsx + Button.css
├── InputField.jsx + InputField.css
├── Checkbox.jsx + Checkbox.css
├── ThemeToggle.jsx + ThemeToggle.css
└── icons/
    ├── SunIcon.jsx          ← Login — thème
    ├── MoonIcon.jsx         ← Login — thème
    ├── GlobeIcon.jsx        ← Login — langue
    ├── HomeIcon.jsx         ← Inner app nav — Dashboard
    ├── ClipboardIcon.jsx    ← Inner app nav — Évaluation
    ├── TrendIcon.jsx        ← Inner app nav — Progression / Rapports
    ├── GearIcon.jsx         ← Inner app nav — Paramètres
    ├── BellIcon.jsx         ← Inner app — Notifications
    ├── SearchIcon.jsx       ← Inner app — Recherche
    ├── ArrowNEIcon.jsx      ← Inner app — Cartes interactives
    ├── ChevronRightIcon.jsx ← Inner app — Liens inline
    ├── HelpIcon.jsx         ← Inner app — Aide topbar
    ├── PaletteIcon.jsx      ← Inner app — Cycle thème topbar
    ├── DocumentIcon.jsx     ← Inner app — Form Editor
    ├── FolderIcon.jsx       ← Inner app — Ressources HR
    ├── PlusIcon.jsx         ← Inner app — Form Editor (ajouter un champ)
    ├── TrashIcon.jsx        ← Inner app — Form Editor (supprimer un champ)
    └── index.js             ← barrel export
```

**Ne jamais** mettre de logique métier, d'appels API ou d'état applicatif ici.

---

## 3. Infrastructure partagée

```
client/src/
├── hooks/
│   ├── useTheme.js       ← dark/light, écrit data-theme sur <html>
│   └── useLocale.js      ← locale + t() réactif, prend un pageT en paramètre
├── i18n/
│   └── index.js          ← makeT() factory UNIQUEMENT — pas de données locale ici
└── styles/
    ├── tokens.css         ← Variables de design (couleurs, radius, typo, sidebar)
    ├── theme.css          ← Variables --th-* pour dark/light (login page)
    └── global.css         ← Reset + imports tokens + theme
```

---

## 4. Deux familles de pages — design distinct

### 4a. Page login (`/`)
- Fond noir cinématique avec mosaic photos
- Variables `--th-*` pour dark/light toggle
- Anti-flash : script inline dans `login.html` qui applique `data-theme` avant React
- Scroll désactivé (`height: 100dvh; overflow: hidden`)
- Design ref : `docs/design/login/DESIGN.md`

### 4b. Pages internes (`/dashboard`, `/hr`, `/manager`, `/formeditor`…)
- **Sidebar** : couleur via `--color-sidebar` (dark violet par défaut, overridé par `data-theme`)
- Partagée via `components/ui/AppSidebar.jsx` — chaque page fournit ses `navItems`
- **Contenu "Editorial Enterprise"** : fond `--color-surface` (#fcf9f8), typographie Inter 900
- **3 thèmes** : `dark` · `light` · `light-sidebar` (cycle via `useTheme().cycleTheme`)
- **Scroll normal** — le contenu doit pouvoir s'étendre
- Design ref : `docs/design/dashboard/DESIGN.md`

---

## 5. Ajouter une nouvelle page

```bash
# 1. Créer le dossier
mkdir -p client/src/pages/<page>/i18n

# 2. Fichiers minimaux
touch client/src/pages/<page>/main.jsx
touch client/src/pages/<page>/<Page>.jsx
touch client/src/pages/<page>/<page>.css
touch client/src/pages/<page>/i18n/fr.js
touch client/src/pages/<page>/i18n/en.js
touch client/src/pages/<page>/i18n/index.js

# 3. Enregistrer dans Vite (client/vite.config.js → rollupOptions.input)
# 4. Enregistrer dans Express (server/index.js → app.get('/route', ...))
# 5. Créer le HTML entry (client/<page>.html)
```

---

## 6. CSS — Règles strictes

| ✅ Faire | ❌ Ne pas faire |
|----------|----------------|
| Utiliser `var(--th-*)` pour les couleurs de la page login | Hardcoder `#ffffff`, `rgba(...)` dans les composants |
| Utiliser `var(--color-*)` pour les tokens de brand et pages internes | Utiliser Tailwind ou un framework CSS |
| Un `.css` par `.jsx` dans le même dossier | Mettre les styles d'une page dans `global.css` |
| Sections commentées dans le CSS | Écrire du CSS sans commentaires de contexte |
| Pages internes : `var(--color-sidebar-*)` pour la sidebar | Hardcoder la couleur `#2e1065` directement |

---

## 7. Traductions — i18n page par page

Chaque page gère ses propres chaînes. L'engine `makeT` est partagé, les données ne le sont pas.

```js
// pages/<page>/i18n/index.js
import fr from './fr'
import en from './en'
import { makeT } from '../../../i18n'
export const t = makeT({ fr, en })

// pages/<page>/<Page>.jsx
import { t as pageT } from './i18n'
const { t, locale, setLocale } = useLocale(pageT)
```

**Clés de traduction** : format `<page>.<section>.<élément>` (ex: `dashboard.campaign.badge`).

---

## 8. Icônes

**Bibliothèque principale : `lucide-react`** (installée dans `client/`)

- Toujours des **SVG stroke** (jamais emoji, jamais font-icon Material Symbols)
- Props standards Lucide : `size` (défaut 18), `color` (défaut `currentColor`), `strokeWidth` (défaut 2), `aria-hidden="true"`
- Importer directement depuis lucide-react : `import { Home, ClipboardList, Settings } from 'lucide-react'`
- Les composants Lucide sont compatibles avec le pattern `AppSidebar` : `{ id, Icon, label }` → `<Icon size={18} strokeWidth={...} />`
- Les icônes custom SVG dans `components/ui/icons/` sont conservées pour la compatibilité (pages non encore migrées), mais les **nouvelles pages utilisent lucide-react**.

```jsx
// ✅ Nouveau standard
import { Home, Bell, Settings, Lock, Save } from 'lucide-react'
<Home size={18} strokeWidth={1.5} aria-hidden="true" />

// 🔴 Jamais ça
<span>🔒</span>   // emoji
import { HomeIcon } from '../../components/ui/icons'  // legacy, ne pas utiliser pour les nouvelles pages
```

---

## 9. Thème dark/light

- Le thème est écrit sur `<html data-theme="dark|light">` par `useTheme()`
- **Anti-flash** : `login.html` contient un script inline qui lit `localStorage` et applique `data-theme` AVANT que React ne monte
- En mode clair : les images de fond restent visibles mais atténuées (`--th-mosaic-opacity: 0.12`)
- **Pages internes** : pas de toggle pour l'instant — toujours Editorial Enterprise light

---

## 10. Sidebar des pages internes

```jsx
// Pattern — sidebar partagée via AppSidebar (components/ui/)
// Chaque page crée un thin wrapper (ex: DashboardSidebar, HRSidebar)
// qui passe ses navItems + brandSub à AppSidebar.

import AppSidebar from '../../components/ui/AppSidebar'

// Thin wrapper (co-localisé dans la page) :
export default function HRSidebar({ t, activeItem }) {
  const navItems = [ /* items spécifiques à la page */ ]
  return <AppSidebar brandSub="HR Portal" navItems={navItems} />
}

import DashboardSidebar from './DashboardSidebar'

// Dans le JSX :
<div className="db">
  <DashboardSidebar t={t} user={user} />
  <div className="db-main">
    <header className="db-topbar">…</header>
    <main className="db-content">…</main>
  </div>
</div>
```

Layout CSS clé :
```css
.db          { display: flex; min-height: 100vh; }
.db-main     { margin-left: 256px; flex: 1; }
.db-topbar   { position: sticky; top: 0; z-index: 40; }
```

---

## 11. Docker & déploiement

- Un seul `Dockerfile` multi-stage à la racine
- Le build client sort dans `mongo/server/public/` (copié depuis l'étape builder)
- `docker compose up -d --scale app=3` pour le mode HA
- Certificats TLS dans `nginx/certs/` (jamais committés)

---

## 12. Ce qu'on ne fait PAS (encore)

- Pas de logique métier dans les composants UI
- Pas de state management global (Redux, Zustand…) — useState suffit pour l'instant
- Pas de React Router — Express gère la navigation entre pages
- Pas de SSR — MPA classique avec Express servant du HTML statique compilé
- ~~Pas de dark mode sur les pages internes~~ — 3 thèmes implémentés : `dark` · `light` · `light-sidebar`
- Pas de Material Symbols (font-icons) — SVG stroke uniquement
