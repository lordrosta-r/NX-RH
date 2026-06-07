# NanoXplore RH — Conventions & Architecture

> 🔁 **Anti-duplication (obligatoire avant toute création).** Avant de créer un nouveau lien
> de navigation, une route, une clé i18n, un composant ou tout autre élément nommé, **rechercher
> d'abord son nom dans le repo** (`grep`/`find` sur le label, la clé, le `href` ou le nom de
> fichier). S'il existe déjà quelque part, **réutiliser/déplacer l'existant** au lieu d'en créer
> un doublon. Ne jamais introduire un second élément qui fait la même chose sous un autre nom.

## Principe directeur : K.I.S.S.

> Keep It Simple, Stupid.
> Si tu te demandes si c'est trop complexe, c'est trop complexe.

---

## 1. Architecture — SPA (Single-Page Application)

L'application est une **SPA** avec un seul point d'entrée Vite/React :

```
frontend-v2/index.html  →  src/main.tsx  →  <App />  →  <RouterProvider router={router} />
```

`router` est défini dans `frontend-v2/src/router/index.tsx` via `createBrowserRouter` (React Router v6).
Express ne sert qu'une seule réponse HTML pour toutes les routes non-API :

```
GET /login        → AuthLayout + LoginPage
GET /login/ldap   → AuthLayout + LoginLdapPage
GET /api/*        → handlers Express
GET /*            → AppLayout (SPA fallback)
```

### Arbre de routes (depuis `src/router/index.tsx`)

```
/login                         ← public, AuthLayout
/login/ldap                    ← public, AuthLayout
/confidentialite               ← public, LegalLayout
/mentions-legales              ← public, LegalLayout
/accessibilite                 ← public, LegalLayout
/unauthorized                  ← public, 403
*                              ← public, 404

/                              ← AuthGuard → AppLayout → DashboardPage
/users                         ← admin | hr | manager
/users/new                     ← admin | hr
/users/:id                     ← admin | hr | manager
/users/:id/edit                ← admin | hr
/users/groups                  ← admin | hr
/campaigns                     ← tous les rôles authentifiés
/campaigns/new                 ← admin | hr
/campaigns/:id                 ← tous les rôles authentifiés
/campaigns/:id/edit            ← admin | hr
/campaigns/:id/analytics       ← admin | hr | manager
/forms                         ← tous les rôles authentifiés
/forms/new                     ← admin | hr
/forms/:id                     ← tous les rôles authentifiés
/evaluations                   ← tous les rôles authentifiés
/evaluations/history           ← tous les rôles authentifiés
/evaluations/new               ← admin | hr
/evaluations/:id               ← tous les rôles authentifiés
/events                        ← tous les rôles authentifiés
/events/:id                    ← tous les rôles authentifiés
/resources                     ← tous les rôles authentifiés
/resources/:id                 ← tous les rôles authentifiés
/help                          ← tous les rôles authentifiés
/mobility                      ← tous les rôles authentifiés
/manager/todo                  ← manager | hr | admin
/interview                     ← manager | hr | admin
/pdi                           ← tous les rôles authentifiés
/pdi/:id                       ← tous les rôles authentifiés
/hr/flags                      ← admin | hr
/hr/flags/:id                  ← admin | hr
/analytics                     ← admin | hr | manager
/analytics/campaigns/:id       ← admin | hr | manager
/profile                       ← tous les rôles authentifiés
/profile/preferences           ← tous les rôles authentifiés
/notifications                 ← tous les rôles authentifiés
/org                           ← AuthGuard → OrgLayout (plein écran)
/admin                         ← admin | hr
/admin/users                   ← admin | hr
/admin/settings                ← admin | hr  (alias /hr/settings)
/hr/settings                   ← admin | hr  (alias /admin/settings)
/admin/users/import            ← admin | hr
/admin/forms/import            ← admin | hr
/admin/ldap                    ← admin
/admin/audit                   ← admin | hr
/admin/config                  ← admin
/admin/mail-config             ← admin
/admin/mail-templates          ← admin | hr
/admin/status                  ← admin
/admin/setup                   ← admin
/admin/test-mail               ← admin
/admin/stats                   ← admin | hr
/admin/departments             ← admin | hr
/admin/orgchart                ← AuthGuard → OrgLayout (plein écran)
```

### Simplification des rôles

- Le rôle produit `director` n'existe plus.
- Un manager peut superviser d'autres managers via la hiérarchie sans portail ni UX dédiés.
- Toute supervision multi-équipes est absorbée par `/manager/todo`, pas par une route ou page séparée.
- Si des comptes legacy `director` existent côté backend, ils sont traités comme des managers.

---

## 2. Structure des fichiers

```
frontend-v2/
├── index.html                 ← entrée unique SPA (anti-flash theme inline script)
├── src/
│   ├── main.tsx               ← ErrorBoundary + QueryClientProvider + AuthProvider + ConfirmProvider + App
│   ├── App.tsx                ← <RouterProvider router={router} />
│   ├── i18n.ts                ← configuration i18next (LanguageDetector + resources fr/en)
│   ├── router/
│   │   └── index.tsx          ← createBrowserRouter, toutes les routes, lazy imports
│   ├── contexts/
│   │   ├── AuthContext.tsx    ← { user, isLoading, isAuthenticated, login, loginLdap, logout, refreshUser }
│   │   ├── PerspectiveContext.tsx ← { perspective, setPerspective, hasSwitch } — "me" | "work"
│   │   └── ConfirmContext.tsx ← useConfirm() pour les confirmations destructrices
│   ├── layouts/
│   │   ├── AppLayout.tsx      ← shell authentifié principal (nav + <Outlet />)
│   │   ├── AuthLayout.tsx     ← shell pages login
│   │   ├── OrgLayout.tsx      ← plein écran pour l'organigramme
│   │   └── LegalLayout.tsx    ← shell pages légales
│   ├── components/
│   │   ├── ui/                ← composants 100 % réutilisables, sans logique métier
│   │   ├── shared/
│   │   │   └── AuthGuard.tsx  ← <AuthGuard roles={[…]}> (remplace ProtectedRoute legacy)
│   │   ├── layout/
│   │   │   └── navConfig.ts   ← getPerspectiveNav(role, perspective, t)
│   │   └── …/                 ← autres sous-dossiers par domaine
│   ├── pages/                 ← une page = un fichier, pas de sous-dossiers par domaine
│   ├── api/                   ← fonctions axios par domaine (auth, users, campaigns…)
│   ├── hooks/                 ← hooks custom (useCampaignDetail, useConfirm, useModal…)
│   ├── features/              ← modules verticaux (campaigns/, evaluations/)
│   ├── types/                 ← types TypeScript partagés (User, Role, …)
│   ├── lib/                   ← utilitaires généraux (queryClient, …)
│   ├── schemas/               ← schémas Zod
│   ├── stores/                ← (état local minimal hors TanStack Query)
│   ├── utils/                 ← fonctions utilitaires pures
│   ├── i18n/
│   │   └── locales/
│   │       ├── fr.json        ← traductions françaises (source principale)
│   │       └── en.json        ← traductions anglaises
│   └── styles/
│       └── tokens.css         ← CSS custom properties (source de vérité design)
└── vite.config.ts             ← plugins, proxy /api → Express
```

### Co-location : règle de base

| Situation | Où mettre le fichier |
|-----------|----------------------|
| Composant utilisé sur **une seule page** | `pages/<Page>/` ou co-localisé dans `pages/` |
| Composant utilisé sur **plusieurs pages** | `components/ui/` |
| Logique métier verticale réutilisable | `features/<domaine>/` |
| Hook (logique réutilisable) | `hooks/` |
| Contexte global (auth, perspective) | `contexts/` |

---

## 3. Contextes globaux

Trois contextes disponibles partout via leur hook :

### `AuthContext`
```ts
const { user, isLoading, isAuthenticated, login, loginLdap, logout, refreshUser } = useAuth()
// user : User | null  (User inclut _id, name, role, email, …)
// isLoading : true pendant le fetch /api/auth/me initial
// logout : appelle l'API de déconnexion + redirect /login
```

### `PerspectiveContext`
```ts
const { perspective, setPerspective, hasSwitch } = usePerspective()
// perspective : "me" | "work"
// hasSwitch : true si le rôle a deux perspectives (manager / hr / admin)
// employee : toujours "me", pas de switch
```

### `ConfirmContext`
```ts
const confirm = useConfirm()
// await confirm({ title, message, confirmLabel? }) → boolean
// Utilisé pour toutes les actions destructrices (suppression, archivage…)
```

---

## 4. Layouts

### `AppLayout`

Shell partagé pour toutes les pages internes. Contient la barre de navigation
(items calculés par `getPerspectiveNav(role, perspective, t)`) et un `<Outlet />`.

### `AuthGuard`

Composant de protection des routes. Redirige vers `/login` si non authentifié,
vers `/unauthorized` si le rôle ne correspond pas.

```tsx
// Protection par rôle (dans router/index.tsx)
<AuthGuard roles={["hr", "admin"]}>
  <S><HrFlagsPage /></S>
</AuthGuard>

// Protection globale sans restriction de rôle
<AuthGuard>
  <AppLayout />
</AuthGuard>
```

### Navigation

La navigation est calculée côté client par `getPerspectiveNav(role, perspective, t)` définie dans
`frontend-v2/src/components/layout/navConfig.ts`. Elle retourne `{ primary, more }` selon
le rôle ET la perspective active de l'utilisateur.

---

## 5. CSS — Tailwind v3 + CSS custom properties

### Règles de style

| Faire | Ne pas faire |
|-------|-------------|
| Tailwind utilities pour le layout, l'espacement, la typo | Frameworks alternatifs (Bootstrap, MUI…) |
| `var(--color-*)` pour les couleurs brand | Hardcoder des valeurs hex dans les composants |
| Classes Tailwind pour les nouveaux composants | Styles inline (`style={{}}`) pour les layouts |
| `tokens.css` comme source de vérité des tokens | Modifier les tokens pour des one-offs |

### Thèmes

- Thème persisté en `localStorage`, appliqué via `data-theme` sur `<html>`
- **Anti-flash** : script inline dans `index.html` qui lit `localStorage` avant React

---

## 6. Data fetching — TanStack Query v5

```ts
// Fetch standard
const { data, isLoading, error } = useQuery({
  queryKey: ['campaigns'],
  queryFn: () => campaignsApi.getAll(),
})

// Mutation
const mutation = useMutation({
  mutationFn: (payload) => campaignsApi.create(payload),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
})
```

- `QueryClient` configuré dans `src/lib/queryClient.ts`, monté une seule fois dans `main.tsx`
- Les fonctions API sont dans `src/api/` (axios, pas de `fetch` nu)
- Erreur 401 → intercepteur axios global dans `src/api/client.ts` → redirect `/login`

---

## 7. Icônes

**Bibliothèque unique : `lucide-react`**

```tsx
import { Home, Bell, Settings } from 'lucide-react'
<Home size={18} strokeWidth={1.5} aria-hidden="true" />
```

- Toujours SVG stroke, jamais emoji ni font-icon
- Props standard : `size` (défaut 18), `color` (défaut `currentColor`), `strokeWidth` (défaut 1.5)

---

## 8. i18n — react-i18next

Configuration dans `src/i18n.ts` (chargé en premier import de `main.tsx`).
Traductions dans `src/i18n/locales/fr.json` et `en.json` (un seul namespace `translation`).
Détection automatique de la langue via `localStorage` puis `navigator`.

```ts
// Dans un composant :
import { useTranslation } from 'react-i18next'
const { t } = useTranslation()
// t('nav.campaigns'), t('evaluations.status.pending'), …
```

Clés : format `<domaine>.<section>.<élément>` (ex : `nav.campaigns`, `evaluations.title`).

---

## 9. Ajouter une nouvelle page

```bash
# 1. Créer le composant dans frontend-v2/src/pages/
# frontend-v2/src/pages/MaNouvellePage.tsx

# 2. Enregistrer un import lazy dans src/router/index.tsx
const MaNouvellePage = lazy(() => import('../pages/MaNouvellePage'))

# 3. Ajouter la route dans le tableau createBrowserRouter
{
  path: '/ma-nouvelle-route',
  element: (
    <AuthGuard roles={['hr', 'admin']}>
      <S><MaNouvellePage /></S>
    </AuthGuard>
  ),
}

# 4. Ajouter les clés i18n dans fr.json et en.json
# 5. Ajouter le lien dans navConfig.ts si nécessaire
```

Pas de HTML supplémentaire, pas d'entrée Vite, pas de route Express.

---

## 10. Backend

- **Dossier** : `mongo/server/` (Express + Mongoose, Node.js)
- **Auth** : JWT dans cookies httpOnly (pas de localStorage). LDAP pour l'authentification uniquement.
- **Routes** : `mongo/server/routes/` (un fichier par domaine : `campaigns.js`, `evaluations.js`, …)
- **Modèles** : `mongo/server/models/` (Campaign, Evaluation, Form, User, PDI, …)
- **Services** : `mongo/server/services/` (logique métier découplée des routes)

---

## 11. Docker & déploiement

- Un seul `Dockerfile` multi-stage à la racine
- Le build du frontend sort dans `mongo/server/public/`
- Express sert `index.html` pour toutes les routes non-API (SPA fallback)
- `docker compose up -d` pour la production
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build` pour le développement
- Certificats TLS dans `nginx/certs/` (jamais committés)
- Voir `docs/DEPLOYMENT.md` et `docs/RUNBOOK.md` pour les détails opérationnels

---

## 12. Documentation par dossier — DOC.md

Chaque dossier significatif contient un fichier `DOC.md` qui documente :
- Ce que le dossier contient et son rôle dans l'application
- Comment les fichiers fonctionnent ensemble
- Ce qui a changé pendant la migration (historique des décisions)
- Les points d'attention ou pièges à éviter

### Règles pour les agents IA (Copilot, Claude, etc.)

1. **Avant de modifier un dossier** : lire son `DOC.md` s'il existe
2. **Après avoir modifié un dossier** : mettre à jour son `DOC.md`
3. **Lors de la création d'un nouveau dossier significatif** : créer un `DOC.md`

Un "dossier significatif" = tout dossier qui contient de la logique métier ou de
l'infrastructure partagée (contexts/, layouts/, pages/*, hooks/, etc.).
Ne pas créer de DOC.md pour les dossiers triviaux (i18n/locales/, assets/).

---

## 13. Ce qu'on ne fait PAS

- Pas de Redux / Zustand / Jotai — TanStack Query + contextes suffisent
- Pas de SSR — SPA classique avec React Router v6
- Pas de Material Symbols (font-icons) — SVG stroke uniquement via lucide-react
- Pas de styles inline (`style={{}}`) pour les layouts — Tailwind utilities
- Pas de logique métier dans les composants UI (`components/ui/`)
- Pas de `fetch` nu — utiliser les fonctions dans `src/api/` (axios)
- Pas de `makeT`/`useTranslate` legacy — utiliser `useTranslation()` de react-i18next
