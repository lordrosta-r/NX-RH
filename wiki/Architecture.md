# Architecture

## Principe directeur : K.I.S.S.

Si tu te demandes si c'est trop complexe, c'est trop complexe. Réutiliser l'existant
plutôt que créer un doublon (composant, route, clé i18n).

## SPA (Single-Page Application)

Un seul point d'entrée Vite/React :
```
frontend-v2/index.html → src/main.tsx → <App/> → <RouterProvider router={router}/>
```
`router` (React Router v6, `createBrowserRouter`) dans `src/router/index.tsx` = **source de
vérité** des routes. Express ne sert qu'une réponse HTML pour toute route non-API (fallback SPA).

## Structure frontend (`frontend-v2/src/`)

| Dossier | Rôle |
|---------|------|
| `router/` | Toutes les routes + lazy imports + `AuthGuard roles=[…]` |
| `pages/` | Une page = un fichier |
| `components/ui/` | Composants 100 % réutilisables, sans logique métier |
| `components/<domaine>/` | Composants par domaine (org, evaluations, campaigns…) |
| `contexts/` | `AuthContext`, `PerspectiveContext`, `ConfirmContext` |
| `hooks/` | Logique réutilisable (`useCampaignForm`, `useOrgChart`…) |
| `api/` | Fonctions axios par domaine (jamais de `fetch` nu) |
| `schemas/` | Validation **Zod** (formulaires) |
| `types/` | Types TS partagés |
| `i18n/locales/` | `fr.json` / `en.json` |
| `styles/tokens.css` | Source de vérité des tokens design (couleurs `var(--*)`) |

## Structure backend (`mongo/server/`)

| Dossier | Rôle |
|---------|------|
| `routes/` | Un fichier par domaine ; RBAC via `authGuard([roles])` |
| `models/` | Schémas Mongoose (User, Campaign, Form, Evaluation, Interview…) |
| `services/` | Logique métier découplée des routes (ldapService, campaignService…) |
| `validators/` | Schémas **Joi** (validation serveur) |
| `config/constants.js` | Enums (rôles, statuts, types de questions/formulaires) |
| `scripts/` | Bootstrap admin, ensure-indexes, set-admin-password… |

## Conventions à respecter

- **Couleurs** : `var(--blue)` (#1b1b78), `var(--ink)`, `var(--line)`, `var(--red)`. **Jamais**
  `var(--color-primary)` (cyan) ni de hex en dur. Pas de styles inline pour le layout.
- **Icônes** : `lucide-react` uniquement (SVG stroke), jamais d'emoji.
- **i18n** : `useTranslation()` de react-i18next. Clés `domaine.section.element`.
- **Erreurs catchées** : toujours `catch (err: unknown)`.
- **DOC.md** par dossier significatif : à lire avant de modifier, à mettre à jour après.

## Données & sécurité

- **TanStack Query v5** pour le fetch ; `QueryClient` monté une fois dans `main.tsx`.
- **Auth** : JWT en cookies httpOnly (jamais localStorage). LDAP pour l'authentification.
  401 → intercepteur axios global → redirect `/login`.
- **RBAC** : `authGuard([roles])` sur les routes ; les transitions d'évaluation sont
  **gatées par l'identité** (l'employé soumet, le manager relit, etc.) — non contournable.
