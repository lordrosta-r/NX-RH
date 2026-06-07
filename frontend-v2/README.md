# NanoXplore RH — frontend-v2

Frontend SPA de l'application NanoXplore RH. C'est le **frontend canonique** et vivant du projet.

## Stack

| Outil                    | Version                   | Rôle                          |
| ------------------------ | ------------------------- | ----------------------------- |
| React                    | 19                        | UI                            |
| TypeScript               | ~6.0                      | Typage statique               |
| Vite                     | 8                         | Build & dev server            |
| React Router DOM         | 6 (`createBrowserRouter`) | Routage SPA                   |
| TanStack Query           | 5                         | Data fetching & cache serveur |
| react-i18next / i18next  | 17 / 26                   | Internationalisation (fr/en)  |
| Tailwind CSS             | 3                         | Styles utilitaires            |
| axios                    | 1                         | Client HTTP                   |
| react-hook-form + zod    | 7 / 4                     | Formulaires et validation     |
| lucide-react             | 1                         | Icônes SVG stroke             |
| recharts                 | 3                         | Graphiques                    |
| @dnd-kit                 | 6/10                      | Drag & drop                   |
| @xyflow/react            | 12                        | Organigramme                  |
| Vitest + Testing Library | 4                         | Tests unitaires               |
| Playwright               | 1.60                      | Tests e2e                     |

## Structure des dossiers

```
src/
├── main.tsx               ← Point d'entrée : ErrorBoundary + QueryClientProvider + AuthProvider + ConfirmProvider
├── App.tsx                ← <RouterProvider router={router} />
├── i18n.ts                ← Configuration i18next (LanguageDetector, resources fr/en)
├── router/
│   └── index.tsx          ← createBrowserRouter, toutes les routes, lazy imports
├── contexts/
│   ├── AuthContext.tsx    ← useAuth() : user, isLoading, isAuthenticated, login, logout…
│   ├── PerspectiveContext.tsx ← usePerspective() : "me" | "work" (switch vue perso / vue métier)
│   └── ConfirmContext.tsx ← useConfirm() : confirmations destructrices
├── layouts/
│   ├── AppLayout.tsx      ← Shell authentifié principal (navbar + Outlet)
│   ├── AuthLayout.tsx     ← Shell pages login
│   ├── OrgLayout.tsx      ← Plein écran pour /org et /admin/orgchart
│   └── LegalLayout.tsx    ← Shell pages légales publiques
├── components/
│   ├── ui/                ← Composants réutilisables sans logique métier (Button, Modal, DataTable…)
│   ├── shared/
│   │   └── AuthGuard.tsx  ← <AuthGuard roles={[…]}> — protection des routes
│   └── layout/
│       └── navConfig.ts   ← getPerspectiveNav(role, perspective, t) → { primary, more }
├── pages/                 ← Un composant par page, lazy-importé dans router/index.tsx
├── api/                   ← Fonctions axios par domaine (auth, campaigns, evaluations…)
├── hooks/                 ← Hooks custom (useCampaignDetail, useConfirm, useModal…)
├── features/              ← Modules verticaux (campaigns/, evaluations/)
├── types/                 ← Types TypeScript partagés (User, Role, Campaign…)
├── lib/
│   └── queryClient.ts     ← Instance TanStack QueryClient
├── schemas/               ← Schémas de validation Zod
├── utils/                 ← Fonctions utilitaires pures
├── i18n/
│   └── locales/
│       ├── fr.json        ← Traductions françaises (source principale)
│       └── en.json        ← Traductions anglaises
└── styles/
    └── tokens.css         ← CSS custom properties (source de vérité design)
```

## Démarrage en développement

Le dev se fait via Docker Compose pour avoir le backend, MongoDB, MailHog et LDAP :

```bash
# Depuis la racine du repo
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Frontend accessible sur https://localhost (via nginx) ou http://localhost:5173 (Vite direct)
# API Express sur http://localhost:3001/api ou https://localhost/api
# MailHog (faux SMTP) sur http://localhost:8025
```

Pour lancer Vite seul (si le backend tourne déjà) :

```bash
npm install
npm run dev       # Vite sur :5173, proxy /api → :3000
```

## Commandes utiles

```bash
npm run build         # Build production (TypeScript check + Vite)
npm run lint          # ESLint
npm run test          # Vitest (watch)
npm run test:run      # Vitest (one-shot, CI)
npm run test:e2e      # Playwright
npm run test:e2e:ui   # Playwright avec interface graphique
```

## Conventions React Router v6

Les routes sont toutes définies dans `src/router/index.tsx` via `createBrowserRouter`.
Chaque page est chargée en `lazy()` + wrappée dans `<Suspense>`.
La protection des routes se fait par `<AuthGuard roles={[…]}>` directement dans le tableau de routes.

```tsx
// Exemple — route protégée
{
  path: '/campaigns/new',
  element: (
    <AuthGuard roles={['admin', 'hr']}>
      <S><CampaignNewPage /></S>
    </AuthGuard>
  ),
}

// Exemple — route ouverte à tous les rôles authentifiés
{
  path: '/evaluations',
  element: <S><EvaluationsPage /></S>,   // AuthGuard parent couvre déjà l'auth
}
```

## Conventions TanStack Query v5

Toutes les requêtes HTTP passent par les fonctions dans `src/api/` (axios).
Ne jamais utiliser `fetch` nu dans les composants ou hooks.

```ts
const { data, isLoading } = useQuery({
  queryKey: ["campaigns"],
  queryFn: () => campaignsApi.getAll(),
});

const mutation = useMutation({
  mutationFn: (payload) => campaignsApi.create(payload),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
});
```

## Conventions i18n

Un seul namespace `translation`. Toutes les traductions sont dans les deux fichiers JSON.
Clés au format `<domaine>.<section>.<élément>` (ex : `nav.campaigns`, `evaluations.status.pending`).

```ts
import { useTranslation } from "react-i18next";
const { t } = useTranslation();
// t('nav.campaigns')
```

## Navigation

La navigation est calculée dynamiquement par `getPerspectiveNav(role, perspective, t)` dans
`src/components/layout/navConfig.ts`. Elle tient compte du rôle de l'utilisateur ET de sa
perspective active (`"me"` = vue personnelle, `"work"` = vue métier).

Les rôles qui ont un switch de perspective : `manager`, `hr`, `admin`.
Le rôle `employee` n'a pas de switch (toujours perspective `"me"`).
