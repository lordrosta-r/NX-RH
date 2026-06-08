# Contributing to NanoXplore RH

Welcome, and thank you for taking the time to contribute. This guide covers everything you need to go from zero to a merged pull request. Read it once before you start — it will save you time.

---

## Table of contents

1. [Code of conduct](#1-code-of-conduct)
2. [Getting set up](#2-getting-set-up)
3. [Branching model](#3-branching-model)
4. [Commit message convention](#4-commit-message-convention)
5. [Coding conventions](#5-coding-conventions)
6. [Before opening a PR](#6-before-opening-a-pr)
7. [Opening a PR](#7-opening-a-pr)
8. [Where to add things](#8-where-to-add-things)

---

## 1. Code of conduct

- Be respectful and constructive in code reviews and discussions.
- Assume good intent. Ask questions before assuming mistakes.
- Keep feedback specific: point to a line of code or a documented convention, not a general opinion.
- There are no dumb questions — if something is unclear, ask.

---

## 2. Getting set up

Follow the step-by-step development environment setup in:

```
docs/INSTALLATION.md
```

That document covers Node.js version, MongoDB, environment variables, and how to start both the frontend and the backend in development mode.

Quick reminder of what dev mode looks like once the setup is done:

```bash
# Terminal 1 — frontend (Vite dev server, port 5173)
cd frontend-v2
npm run dev

# Terminal 2 — backend (Express + nodemon, port 3000)
cd mongo/server
npm run dev
```

---

## 3. Branching model

### Branch naming

| Type of change | Branch prefix | Example |
|----------------|---------------|---------|
| New feature | `feature/` | `feature/campaign-analytics` |
| Bug fix | `fix/` | `fix/login-redirect-loop` |
| Style / UI only | `style/` | `style/dashboard-spacing` |
| Tests | `test/` | `test/evaluation-service` |
| Refactor (no behaviour change) | `refactor/` | `refactor/auth-context` |
| Docs | `docs/` | `docs/update-runbook` |
| Chores / config / tooling | `chore/` | `chore/update-dependencies` |

### Rules

- **Never commit directly to `main`.** It is a protected branch — direct pushes are blocked.
- Always branch off `main` unless you have been told otherwise.
- Keep branches focused: one feature or one fix per branch. This makes reviews faster.
- Delete your branch after it is merged.

```bash
# Start a new branch from an up-to-date main
git checkout main
git pull origin main
git checkout -b feature/my-feature
```

---

## 4. Commit message convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow this format:

```
<type>(<optional scope>): <short description in lowercase>
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature visible to users |
| `fix` | A bug fix |
| `chore` | Tooling, config, dependency updates — no production code change |
| `docs` | Documentation only |
| `style` | Formatting, spacing, visual tweaks — no logic change |
| `test` | Adding or updating tests |
| `refactor` | Code restructuring without changing behaviour |

### Examples (from this repository's actual commit history)

```
feat(ui): standardise les confirmations destructrices via useConfirm()
fix(evaluations): câbler le flux de remplissage + contexte N-1 (4 bugs)
fix(forms): création/édition fonctionnelles + tests e2e du builder
style(modal): fond opaque plein qui recouvre tout l'écran
```

### Tips

- Use the imperative mood in the description: "add button" not "added button".
- Keep the subject line under 72 characters.
- If more context is needed, add a blank line after the subject and write a paragraph body.
- Reference a GitHub issue with `Fixes #123` or `Closes #123` in the body when relevant.

---

## 5. Coding conventions

The full conventions live in `CONTRIBUTING.md`. Here is the essential summary.

### KISS — Keep It Simple, Stupid

If you are unsure whether something is too complex, it probably is. Prefer the straightforward solution. Do not add abstractions before they are needed.

### Anti-duplication rule (read this carefully)

Before creating any new component, route, i18n key, navigation link, or named element, **search the repository first**:

```bash
# Search for a component name
grep -r "MyComponentName" frontend-v2/src/

# Search for an i18n key
grep -r "campaigns.title" frontend-v2/src/i18n/
```

If it already exists somewhere, reuse or move it. Never introduce a second element that does the same thing under a different name.

### State management

- Use **TanStack Query v5** for all server state (fetching, caching, mutations).
- Use the existing React contexts (`AuthContext`, `PerspectiveContext`, `ConfirmContext`) for global UI state.
- Do **not** add Redux, Zustand, Jotai, or any other state library. TanStack Query + contexts are sufficient.

```ts
// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['campaigns'],
  queryFn: () => campaignsApi.getAll(),
})

// Mutating data
const mutation = useMutation({
  mutationFn: (payload) => campaignsApi.create(payload),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
})
```

### API calls

- All HTTP calls go through the functions in `frontend-v2/src/api/` (axios-based).
- Do **not** use `fetch` directly. The axios client in `src/api/client.ts` handles 401 errors and redirects automatically.

### Styling

- Use **Tailwind v3 utility classes** for layout, spacing, and typography.
- Use `var(--color-*)` CSS custom properties (defined in `frontend-v2/src/styles/tokens.css`) for brand colors.
- Do **not** use inline styles (`style={{}}`) for layout purposes.
- Do **not** hardcode hex color values in components.
- Do **not** use alternative CSS frameworks (Bootstrap, Material UI, etc.).

### Icons

One icon library only: **`lucide-react`**. Always use SVG stroke icons. No emojis, no font icons.

```tsx
import { Home, Bell, Settings } from 'lucide-react'
<Home size={18} strokeWidth={1.5} aria-hidden="true" />
```

### Translations (i18n)

- Use `useTranslation()` from `react-i18next` in every component that displays user-facing text.
- Always add keys to **both** `frontend-v2/src/i18n/locales/fr.json` and `en.json` at the same time.
- Key format: `<domain>.<section>.<element>` — for example `nav.campaigns` or `evaluations.status.pending`.
- Do **not** use any legacy `makeT` or `useTranslate` helpers.

```ts
import { useTranslation } from 'react-i18next'
const { t } = useTranslation()
// then use: t('nav.campaigns')
```

### TypeScript

- No `as any`. Define interfaces and types in `frontend-v2/src/types/`.
- Caught errors must be typed as `unknown`, not `Error`:

```ts
// Correct
catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
}
```

### No server-side rendering

This is a plain SPA (React Router v6 + Vite). There is no SSR. Do not try to add it.

### DOC.md files

Every significant folder (`contexts/`, `layouts/`, `pages/`, `hooks/`, etc.) contains a `DOC.md`. Read it before modifying that folder, and update it after your changes if the documentation is affected.

---

## 6. Before opening a PR

Run these checks locally **before** pushing. CI will catch failures too, but fixing them locally is faster.

### Frontend workspace

```bash
cd frontend-v2

# 1. TypeScript type check
npx tsc --noEmit

# 2. ESLint
npm run lint

# 3. Unit tests (single run, no watch mode)
npm run test:run

# 4. Production build — confirms no build-time errors
npm run build
```

### Backend workspace

```bash
cd mongo/server

# 1. Jest tests
npm test

# 2. ESLint
npm run lint
```

All of these must be green before you open a PR. If lint or tests fail, fix the issue before pushing — do not open a PR with known failures.

---

## 7. Opening a PR

### Target branch

All pull requests must target **`main`**.

### PR description

A good description helps reviewers and speeds up the process. Include:

- **What** the PR changes (one short paragraph or a bullet list).
- **Why** the change is needed.
- Any steps a reviewer should follow to test it manually (optional but appreciated).

### Required CI checks

Three checks run automatically on every PR (defined in `.github/workflows/pr-checks.yml`). All three must pass before a PR can be merged:

| Check | What it runs |
|-------|-------------|
| Frontend TypeScript check | `cd frontend-v2 && npm ci && npx tsc --noEmit` |
| Backend tests | `cd mongo/server && npm ci && npm test` |
| Quick checks (TS + lint + tests) | Wraps both steps in a single job |

If a check fails, click on it in GitHub to read the log, fix the issue locally, and push again. The checks will re-run automatically.

### Review and merge

- At least one reviewer must approve the PR before it can be merged.
- Address all requested changes before asking for a re-review.
- Do not merge your own PR without at least one approval.
- Once approved and all checks are green, the PR can be merged into `main`.

---

## 8. Where to add things

### A new frontend page

```bash
# 1. Create the page component
# frontend-v2/src/pages/MyNewPage.tsx

# 2. Add a lazy import in frontend-v2/src/router/index.tsx
const MyNewPage = lazy(() => import('../pages/MyNewPage'))

# 3. Register the route in the createBrowserRouter array (same file)
{
  path: '/my-new-route',
  element: (
    <AuthGuard roles={['hr', 'admin']}>
      <Suspense fallback={null}><MyNewPage /></Suspense>
    </AuthGuard>
  ),
}

# 4. Add i18n keys to both fr.json and en.json

# 5. Add a navigation entry in frontend-v2/src/components/layout/navConfig.ts
#    if the page should appear in the sidebar
```

No extra HTML file, no extra Vite entry point, no extra Express route is needed.

### A new i18n key

Add the key to **both** files at the same time:

- `frontend-v2/src/i18n/locales/fr.json`
- `frontend-v2/src/i18n/locales/en.json`

Follow the existing key format: `<domain>.<section>.<element>`.

### A new API function (frontend side)

Add it to the appropriate file in `frontend-v2/src/api/` (one file per domain: `campaigns.ts`, `users.ts`, etc.). Use the shared axios instance from `src/api/client.ts`.

### A new backend route

Add or extend a route file in `mongo/server/routes/` (one file per domain). Put business logic in `mongo/server/services/`, not directly in the route handler.

### A new reusable UI component

- Used on **one page only**: co-locate it in `frontend-v2/src/pages/` next to the page file.
- Used on **multiple pages**: place it in `frontend-v2/src/components/ui/`. Components in `ui/` must have zero business logic — they are purely presentational.

### A new custom hook

Place it in `frontend-v2/src/hooks/`. Hooks that are tightly coupled to one feature domain can also live in `frontend-v2/src/features/<domain>/`.
