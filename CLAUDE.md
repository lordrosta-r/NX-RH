# NanoXplore RH — Conventions & Architecture

## Principe directeur : K.I.S.S.

> Keep It Simple, Stupid.
> Si tu te demandes si c'est trop complexe, c'est trop complexe.

---

## 1. Architecture — SPA (Single-Page Application)

L'application est une **SPA** avec un seul point d'entrée Vite/React :

```
client/index.html  →  client/src/main.jsx  →  <App />  →  React Router v7
```

Express ne sert plus qu'une seule réponse HTML :
```
GET /login         → login.html  (page séparée, pas de sidebar/topbar)
GET /*             → index.html  (SPA — React Router gère toutes les routes)
GET /api/*         → handlers Express (inchangés)
```

### Arbre de routes (React Router v7)

```
/login                        ← public, LoginPage
/                             ← ProtectedRoute → AuthedLayout
  /employee                   ← rôles : employee | manager | director | hr | admin
  /manager                    ← rôles : manager | director | admin
  /director                   ← rôles : director | admin
  /hr                         ← rôles : hr | admin
    /hr/campaigns
    /hr/formeditor
    /hr/resources
    /hr/users
  /admin                      ← rôle : admin uniquement
  /settings                   ← tous les rôles authentifiés
  /evaluation                 ← tous les rôles authentifiés
```

---

## 2. Structure des fichiers

```
client/
├── index.html                ← entrée unique SPA (anti-flash theme inline script)
├── src/
│   ├── main.jsx              ← QueryClientProvider + BrowserRouter + providers
│   ├── App.jsx               ← arbre de routes React Router v7
│   ├── contexts/
│   │   ├── AuthContext.jsx   ← { user, loading, logout } — fetch /api/auth/me
│   │   ├── ThemeContext.jsx  ← { theme, cycleTheme } — data-theme sur <html>
│   │   └── LocaleContext.jsx ← { locale, setLocale, t } — i18n global
│   ├── layouts/
│   │   ├── AuthedLayout.jsx  ← AppTopbar + <Outlet /> (shell authentifié)
│   │   └── ProtectedRoute.jsx ← vérifie user.role, redirige si non autorisé
│   ├── pages/
│   │   ├── login/            ← LoginPage (page autonome, hors SPA shell)
│   │   ├── employee/         ← EmployeePage
│   │   ├── hr/               ← HRPage + sous-routes
│   │   ├── admin/            ← AdminPage
│   │   └── …/
│   ├── components/ui/        ← composants 100% réutilisables, sans logique métier
│   ├── hooks/                ← hooks utilitaires (useTheme, useLocale)
│   ├── i18n/                 ← makeT() factory uniquement
│   └── styles/
│       ├── global.css        ← @import "tailwindcss" + @theme + reset + layout
│       ├── tokens.css        ← CSS custom properties (source de vérité design)
│       └── theme.css         ← overrides dark/light par data-theme
└── vite.config.js            ← entrée unique, plugin Tailwind, proxy /api
```

### Co-location : règle de base

| Situation | Où mettre le fichier |
|-----------|----------------------|
| Composant utilisé sur **une seule page** | `pages/<page>/` |
| Composant utilisé sur **plusieurs pages** | `components/ui/` |
| Hook utilitaire (pas de logique métier) | `hooks/` |
| Contexte global (auth, thème, locale) | `contexts/` |

---

## 3. Contextes globaux

Trois contextes montés dans `main.jsx`, disponibles partout via leur hook :

### `AuthContext`
```jsx
const { user, loading, logout } = useAuth()
// user : { _id, name, role, … } | null
// loading : true pendant le fetch /api/auth/me initial
// logout : appelle DELETE /api/auth/logout + redirect /login
```

### `ThemeContext`
```jsx
const { theme, cycleTheme } = useThemeCtx()
// theme : 'dark' | 'light' | 'light-sidebar'
// cycleTheme() : passe au thème suivant + persiste en localStorage
```

### `LocaleContext`
```jsx
const { locale, setLocale } = useLocale()
// Usage avec traductions de page :
// import { t as pageT } from './i18n'
// const translate = useTranslate(pageT)
```

---

## 4. Layout authentifié

### `AuthedLayout`

Shell partagé pour toutes les pages internes. Choisir **une seule** variante :

**Topbar-only** (recommandé pour ≤ 5 items de navigation)
```
┌─────────────────────────────────────────────┐
│ NX  [Nav items…]              🔔 [avatar]   │  ← AppTopbar (56px, sticky)
├─────────────────────────────────────────────┤
│                                             │
│               <Outlet />                   │  ← contenu de la page
│                                             │
└─────────────────────────────────────────────┘
```

**Sidebar + Topbar** (recommandé pour > 5 items ou navigation hiérarchique)
```
┌────────┬────────────────────────────────────┐
│        │ NX  [search]           🔔 [avatar] │  ← AppTopbar (sticky)
│  Side  ├────────────────────────────────────┤
│  bar   │                                    │
│(256px) │           <Outlet />               │
│        │                                    │
└────────┴────────────────────────────────────┘
```

### `ProtectedRoute`
```jsx
// Redirige vers /login si non authentifié
// Redirige vers /unauthorized si le rôle ne correspond pas
<ProtectedRoute allowedRoles={['hr', 'admin']}>
  <HRPage />
</ProtectedRoute>
```

---

## 5. CSS — Tailwind v4 + CSS custom properties

### Règles de style

| ✅ Faire | ❌ Ne pas faire |
|----------|----------------|
| Tailwind utilities pour le layout, l'espacement, la typo | Frameworks alternatifs (Bootstrap, MUI…) |
| `var(--color-primary)` pour les couleurs brand dans les CSS-in-class | Hardcoder `#b8000b` dans les composants |
| `@apply` ou classes Tailwind pour les nouveaux composants | Modifier `tokens.css` directement pour des one-offs |
| `var(--th-*)` pour les couleurs de la page login uniquement | Mélanger les namespaces `--th-*` et `--color-*` |

### Couleurs disponibles en Tailwind

Les tokens définis dans `@theme` de `global.css` → disponibles en utilities :

```html
<div class="bg-primary text-white">         <!-- #b8000b -->
<div class="bg-secondary text-white">       <!-- #5b00df -->
<div class="bg-sidebar text-white">         <!-- #2e1065 -->
<div class="bg-surface text-on-surface">    <!-- #fcf9f8 / #1c1b1b -->
```

### Thèmes

- 3 thèmes via `data-theme` sur `<html>` : `dark` · `light` · `light-sidebar`
- Les utilities Tailwind compilent vers `var(--color-*)`, donc les overrides de `theme.css` propagent automatiquement
- **Anti-flash** : script inline dans `index.html` qui lit `localStorage` et applique `data-theme` avant React

---

## 6. Data fetching — TanStack Query v5

```jsx
// Fetch standard
const { data, isLoading, error } = useQuery({
  queryKey: ['employees'],
  queryFn: () => fetch('/api/employees').then(r => r.json()),
})

// Mutation
const mutation = useMutation({
  mutationFn: (data) => fetch('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
})
```

- `QueryClient` monté une seule fois dans `main.jsx` (staleTime: 30s par défaut)
- Pas de refetch sur window focus pour les données RH (données stables)
- Erreur 401 → intercepter dans le `QueryClient` global et rediriger vers `/login`

---

## 7. Icônes

**Bibliothèque unique : `lucide-react`**

```jsx
import { Home, Bell, Settings } from 'lucide-react'
<Home size={18} strokeWidth={1.5} aria-hidden="true" />
```

- Toujours SVG stroke, jamais emoji ni font-icon
- Props : `size` (défaut 18), `color` (défaut `currentColor`), `strokeWidth` (défaut 1.5)
- Les anciens composants custom dans `components/ui/icons/` sont conservés pour compatibilité, ne pas les utiliser pour le nouveau code

---

## 8. i18n — traductions page par page

```js
// pages/<page>/i18n/index.js
import fr from './fr'
import en from './en'
import { makeT } from '../../../i18n'
export const t = makeT({ fr, en })

// Dans un composant de page :
import { t as pageT } from './i18n'
const translate = useTranslate(pageT)  // via LocaleContext
```

Clés : format `<page>.<section>.<élément>` (ex: `hr.campaign.badge`).

---

## 9. Ajouter une nouvelle page

```bash
# 1. Créer le dossier de page
mkdir client/src/pages/<page>/i18n

# 2. Fichiers minimaux
# client/src/pages/<page>/<Page>.jsx  ← composant racine
# client/src/pages/<page>/i18n/fr.js + en.js + index.js

# 3. Enregistrer la route dans App.jsx
# 4. Ajouter ProtectedRoute avec les rôles autorisés
```

Pas de HTML supplémentaire, pas d'entrée Vite, pas de route Express.

---

## 10. Docker & déploiement

- Un seul `Dockerfile` multi-stage à la racine
- Le build client sort dans `mongo/server/public/`
- Express sert `index.html` pour toutes les routes non-API (`GET *` → SPA fallback)
- `docker compose up -d --scale app=3` pour le mode HA
- Certificats TLS dans `nginx/certs/` (jamais committés)

---

## 11. Ce qu'on ne fait PAS

- Pas de Redux / Zustand / Jotai — TanStack Query + contextes suffisent
- Pas de SSR — SPA classique avec React Router
- Pas de Material Symbols (font-icons) — SVG stroke uniquement
- Pas de styles inline (`style={{}}`) pour les layouts — Tailwind utilities
- Pas de logique métier dans les composants UI (`components/ui/`)

