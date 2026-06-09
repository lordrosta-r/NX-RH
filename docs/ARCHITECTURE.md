# NanoXplore RH — Technical Architecture

> Reference document for developers contributing to or deploying this project.
> Source of truth for routes: `frontend-v2/src/router/index.tsx`.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Route Tree](#3-route-tree)
4. [Frontend Folder Structure](#4-frontend-folder-structure)
5. [Backend Architecture](#5-backend-architecture)
6. [Key Domain Concepts](#6-key-domain-concepts)

---

## 1. System Overview

```
                     +----------+
                     | Browser  |
                     +----+-----+
                          |  HTTPS
                          v
                     +----------+
                     |  Nginx   |  TLS termination, reverse proxy
                     +----+-----+
                          |  HTTP
              +-----------+------------+
              |                        |
              v                        v
     /api/*  (JSON)           GET /*  (SPA fallback)
              |                        |
              v                        v
      +---------------+      +-----------------+
      | Express (API) |      | Express (static)|
      | routes/       |      | public/index.html|
      +-------+-------+      +-----------------+
              |
       +------+------+
       |             |
       v             v
  +--------+    +--------+
  | MongoDB|    |  LDAP  |
  | (data) |    | (auth) |
  +--------+    +--------+
```

**Request flow:**

- The browser always loads a single HTML file (`index.html`). React Router handles all
  client-side navigation — Express is never asked to render a page.
- `/api/*` requests go directly to Express route handlers. All other GET requests return
  `index.html` with `Cache-Control: no-store`.
- LDAP is used exclusively for authentication. Once a session is established, JWT cookies
  are used for all subsequent requests (no LDAP round-trips per request).
- MongoDB stores all application data. The connection string is validated at startup;
  the server refuses to start if `JWT_SECRET` or `MONGO_URI` are missing.

**Security layers:**

- Helmet (CSP, HSTS, frameguard, `nosniff`, `Referrer-Policy`, `Permissions-Policy`)
- CORS restricted to explicit `CLIENT_ORIGIN` list (wildcard forbidden)
- `express-mongo-sanitize` on all incoming payloads
- Rate limiting: 2000 req/min general (`apiLimiter`), 500 req/min for mutations
  (`mutationLimiter`)
- JWT in `httpOnly` cookies (not `localStorage`)
- Impersonation guard blocks all writes when a session is in read-only impersonation mode

---

## 2. Frontend Architecture

### Entry point

```
frontend-v2/index.html
  |
  +-- inline script (reads localStorage, sets data-theme before React mounts — anti-flash)
  |
  +-- src/main.tsx
        |
        +-- <ErrorBoundary>
              +-- <QueryClientProvider>  (TanStack Query, single QueryClient)
                    +-- <AuthProvider>
                          +-- <ConfirmProvider>
                                +-- <App />
                                      +-- <RouterProvider router={router} />
```

`router` is exported from `src/router/index.tsx` and built with `createBrowserRouter`
(React Router v6). Every page component is loaded with `React.lazy` + `<Suspense>`.

### Routing

React Router v6 with `createBrowserRouter`. Route protection is handled by `<AuthGuard>`:

- No `roles` prop: redirects to `/login` if unauthenticated, otherwise renders.
- With `roles` prop: also redirects to `/unauthorized` if the user's role is not in the
  allowed list.

```tsx
// Global protection (any authenticated user)
<AuthGuard>
  <AppLayout />
</AuthGuard>

// Role-scoped protection
<AuthGuard roles={["hr", "admin"]}>
  <S><HrFlagsPage /></S>
</AuthGuard>
```

### Data fetching — TanStack Query v5

All server state is managed by TanStack Query. Raw `fetch` is never used; all calls go
through axios functions in `src/api/`.

```ts
// Read
const { data, isLoading, error } = useQuery({
  queryKey: ['campaigns'],
  queryFn: () => campaignsApi.getAll(),
})

// Write
const mutation = useMutation({
  mutationFn: (payload) => campaignsApi.create(payload),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
})
```

A global axios interceptor in `src/api/client.ts` catches HTTP 401 responses and
redirects the browser to `/login`.

### Global state — Contexts

Three React contexts are available everywhere via their hooks:

**AuthContext** (`useAuth`)

```ts
const { user, isLoading, isAuthenticated, login, loginLdap, logout, refreshUser } = useAuth()
// user: User | null  — includes _id, name, role, email, …
// isLoading: true during the initial /api/auth/me fetch
// logout: calls the sign-out API then redirects to /login
```

**PerspectiveContext** (`usePerspective`)

```ts
const { perspective, setPerspective, hasSwitch } = usePerspective()
// perspective: "me" | "work"
// hasSwitch: true for manager / hr / admin (two perspectives available)
// employee: always "me", no switch
```

**ConfirmContext** (`useConfirm`)

```ts
const confirm = useConfirm()
// await confirm({ title, message, confirmLabel? }) -> boolean
// Used for all destructive actions (delete, archive, …)
```

### Layouts

| Layout | Used by |
|--------|---------|
| `AppLayout` | All authenticated pages; renders nav (from `navConfig.ts`) + `<Outlet />` |
| `AuthLayout` | Login pages (`/login`, `/login/ldap`) |
| `OrgLayout` | Full-screen org chart (`/org`) |
| `LegalLayout` | Public legal pages |

Navigation items are computed client-side by `getPerspectiveNav(role, perspective, t)`
in `src/components/layout/navConfig.ts`, returning `{ primary, more }` filtered by
the user's role and active perspective.

### Styling — Tailwind v3 + CSS custom properties

Design tokens are defined as CSS custom properties in `src/styles/tokens.css` (the single
source of truth for brand colours and spacing). Components use Tailwind utility classes;
brand colours are accessed via `var(--color-*)`.

Rules:
- No alternative CSS frameworks (Bootstrap, MUI, etc.)
- No hardcoded hex values in components
- No inline `style={{}}` for layout
- Tokens are not modified for one-off overrides

Theming is persisted in `localStorage` and applied via a `data-theme` attribute on
`<html>`. The anti-flash inline script in `index.html` reads `localStorage` before React
mounts to avoid a white flash on load.

### Internationalisation — react-i18next

Configured in `src/i18n.ts` (first import in `main.tsx`). Two locales: `fr.json`
(primary) and `en.json`, under `src/i18n/locales/`. A single namespace (`translation`).
Language detection: `localStorage` first, then `navigator`.

Key format: `<domain>.<section>.<element>` — e.g. `nav.campaigns`,
`evaluations.status.pending`.

### Icons

Single library: `lucide-react`. Always SVG stroke, never emoji or font icons.

```tsx
import { Home, Bell, Settings } from 'lucide-react'
<Home size={18} strokeWidth={1.5} aria-hidden="true" />
```

---

## 3. Route Tree

Source of truth: `frontend-v2/src/router/index.tsx`.

### 3.1 Public routes (no authentication required)

| Path | Layout | Notes |
|------|--------|-------|
| `/login` | AuthLayout | Standard email/password login |
| `/login/ldap` | AuthLayout | LDAP login |
| `/confidentialite` | LegalLayout | Privacy policy |
| `/mentions-legales` | LegalLayout | Legal notice |
| `/accessibilite` | LegalLayout | Accessibility statement |
| `/unauthorized` | — | 403 page |
| `*` | — | 404 page |

### 3.2 Authenticated routes (all roles)

Wrapped by `<AuthGuard> → <AppLayout>`. Routes without a `roles` restriction are
accessible to any authenticated user (employee, manager, hr, admin).

| Path | Allowed roles | Page component |
|------|---------------|----------------|
| `/` | all | DashboardPage |
| `/campaigns` | all | CampaignsPage |
| `/campaigns/:id` | all | CampaignDetailPage |
| `/forms` | all | FormsPage |
| `/forms/:id` | all | FormDetailPage |
| `/evaluations` | all | EvaluationsPage |
| `/evaluations/history` | all | EvaluationHistoryPage |
| `/evaluations/:id` | all | EvaluationDetailPage |
| `/events` | all | EventsPage |
| `/events/:id` | all | EventDetailPage |
| `/help` | all | HelpPage |
| `/mobility` | all | MobilityPage |
| `/pdi` | all | PDIPage |
| `/pdi/:id` | all | PDIDetailPage |
| `/profile` | all | ProfilePage |
| `/profile/preferences` | all | PreferencesPage |
| `/notifications` | all | NotificationsPage |

### 3.3 Role-restricted authenticated routes

| Path | Allowed roles | Page component |
|------|---------------|----------------|
| `/users` | admin, hr, manager | UsersPage |
| `/users/:id` | admin, hr, manager | UserDetailPage |
| `/users/new` | admin, hr | UserNewPage |
| `/users/:id/edit` | admin, hr | UserEditPage |
| `/users/groups` | admin, hr | UserGroupsPage |
| `/campaigns/new` | admin, hr | CampaignNewPage |
| `/campaigns/:id/edit` | admin, hr | CampaignEditPage |
| `/campaigns/:id/analytics` | admin, hr, manager | CampaignAnalyticsPage |
| `/forms/new` | admin, hr | FormNewPage |
| `/evaluations/new` | admin, hr | EvaluationNewPage |
| `/documents` | hr, manager, employee | ResourcesPage |
| `/documents/:id` | hr, manager, employee | ResourceDetailPage |

> **Naming asymmetry — Documents vs Resources:** the frontend routes use `/documents` and
> `/documents/:id`, but the backend API is mounted at `/api/resources` (and `/api/v1/resources`).
> The React page components (`ResourcesPage`, `ResourceDetailPage`) and the backend route file
> (`routes/resources.js`) both use the "resources" naming. Only the client-facing URL uses
> "documents". Keep this in mind when tracing a request end-to-end or adding API calls for
> this feature.
| `/manager/todo` | manager, hr, admin | ManagerTodoPage |
| `/interview` | manager, hr, admin | InterviewPage |
| `/hr/flags` | admin, hr | HrFlagsPage |
| `/hr/flags/:id` | admin, hr | HrFlagDetailPage |
| `/analytics` | admin, hr, manager | AnalyticsPage |
| `/analytics/campaigns/:id` | admin, hr, manager | AnalyticsCampaignPage |

### 3.4 Full-screen routes (OrgLayout)

| Path | Notes |
|------|-------|
| `/org` | Org chart — any authenticated user |
| `/admin/orgchart` | Permanent 301 redirect to `/org` (legacy alias) |

### 3.5 Admin routes

All wrapped by `<AuthGuard> → <AppLayout>`.

| Path | Allowed roles | Page component |
|------|---------------|----------------|
| `/admin` | admin, hr | AdminHubPage |
| `/admin/users` | admin, hr | AdminUsersPage |
| `/admin/users/import` | admin, hr | AdminUsersImportPage |
| `/admin/forms/import` | admin, hr | AdminFormsImportPage |
| `/admin/settings` | admin, hr | HrSettingsPage |
| `/hr/settings` | admin, hr | HrSettingsPage (alias) |
| `/admin/audit` | admin, hr | AdminAuditPage |
| `/admin/mail-templates` | admin, hr | AdminMailTemplatesPage |
| `/admin/stats` | admin, hr | AdminStatsPage |
| `/admin/departments` | admin, hr | DepartmentsPage |
| `/admin/ldap` | admin only | AdminLdapPage |
| `/admin/ssl` | admin only | AdminSslPage |
| `/admin/config` | admin only | AdminConfigPage |
| `/admin/mail-config` | admin only | AdminMailConfigPage |
| `/admin/status` | admin only | AdminStatusPage |
| `/admin/setup` | admin only | AdminSetupWizardPage |
| `/admin/test-mail` | admin only | AdminMailTestPage |

### 3.6 Role model

Four active roles: `employee`, `manager`, `hr`, `admin`.

- The `director` role is retired. Accounts with that legacy role are treated as `manager`.
- A manager can supervise other managers through the hierarchy without a dedicated portal.
  Multi-team supervision is handled by `/manager/todo`, not a separate route.

---

## 4. Frontend Folder Structure

```
frontend-v2/
+-- index.html                    SPA entry point; anti-flash theme script
+-- vite.config.ts                Vite plugins; /api proxy to Express
+-- src/
    +-- main.tsx                  Providers: ErrorBoundary, QueryClient, Auth, Confirm
    +-- App.tsx                   <RouterProvider router={router} />
    +-- i18n.ts                   i18next config (LanguageDetector, fr/en resources)
    +-- router/
    |   +-- index.tsx             createBrowserRouter — all routes, all lazy imports
    +-- contexts/
    |   +-- AuthContext.tsx       useAuth() — user, login, logout, refreshUser
    |   +-- PerspectiveContext.tsx usePerspective() — "me" | "work"
    |   +-- ConfirmContext.tsx    useConfirm() — async destructive-action dialog
    +-- layouts/
    |   +-- AppLayout.tsx         Authenticated shell: nav sidebar + <Outlet />
    |   +-- AuthLayout.tsx        Login pages shell
    |   +-- OrgLayout.tsx         Full-screen layout (org chart)
    |   +-- LegalLayout.tsx       Public legal pages shell
    +-- components/
    |   +-- ui/                   Pure reusable UI components (no business logic)
    |   +-- shared/
    |   |   +-- AuthGuard.tsx     <AuthGuard roles=[...]> — auth + RBAC guard
    |   +-- layout/
    |       +-- navConfig.ts      getPerspectiveNav(role, perspective, t)
    +-- pages/                    One file per page, flat (no domain sub-folders)
    +-- api/                      Axios functions per domain (auth, users, campaigns…)
    +-- hooks/                    Custom hooks (useCampaignDetail, useConfirm, …)
    +-- features/                 Vertical feature modules (campaigns/, evaluations/)
    +-- types/                    Shared TypeScript types (User, Role, …)
    +-- lib/                      General utilities (queryClient.ts, …)
    +-- schemas/                  Zod schemas
    +-- stores/                   Minimal local state (outside TanStack Query)
    +-- utils/                    Pure utility functions
    +-- i18n/
    |   +-- locales/
    |       +-- fr.json           French translations (primary source)
    |       +-- en.json           English translations
    +-- styles/
        +-- tokens.css            CSS custom properties — design token source of truth
```

**Co-location rule:**

| Situation | Location |
|-----------|----------|
| Component used on a single page | `pages/<Page>/` or alongside the page file |
| Component used on multiple pages | `components/ui/` |
| Reusable vertical business logic | `features/<domain>/` |
| Reusable hook | `hooks/` |
| Global context | `contexts/` |

---

## 5. Backend Architecture

**Stack:** Node.js, Express, Mongoose (MongoDB), JWT cookies, optional LDAP.

**Directory layout:**

```
mongo/server/
+-- index.js               App setup, middleware, route mounting, graceful shutdown
+-- config/
|   +-- db.js              Mongoose connection helper
+-- middleware/
|   +-- authGuard.js       RBAC middleware — authGuard(['admin', 'hr', ...])
|   +-- errorHandler.js    Centralised Express error handler
|   +-- metricsMiddleware.js  Request metrics collection
|   +-- impersonationGuard.js blockImpersonatedWrites — read-only enforcement
+-- routes/                One file per domain
|   +-- auth.js
|   +-- users.js  (+ users/import.js, users/bulk.js)
|   +-- campaigns.js
|   +-- forms.js  (+ forms/importExport.js)
|   +-- evaluations.js  (+ evaluations/bulk.js)
|   +-- analytics.js
|   +-- events.js
|   +-- resources.js
|   +-- org.js
|   +-- pdi.js
|   +-- interviews.js
|   +-- mobility.js
|   +-- notifications.js
|   +-- dashboard.js
|   +-- search.js
|   +-- offboarding.js
|   +-- departments.js
|   +-- formCategories.js
|   +-- branding.js
|   +-- ldap.js
|   +-- audit.js
|   +-- hr/
|   |   +-- flags.js
|   |   +-- notifications.js
|   |   +-- settings.js
|   +-- admin/
|       +-- mailTemplates.js
|       +-- groups.js
|       +-- status.js
|       +-- sslCert.js
|       +-- envCheck.js
+-- models/                Mongoose models (Campaign, Evaluation, Form, User, PDI, …)
+-- services/              Business logic decoupled from route handlers
+-- utils/
    +-- logger.js
    +-- cache.js
    +-- metrics.js
    +-- schedulerLock.js
```

### Middleware stack (in order)

1. CORS (explicit origin allowlist, `credentials: true`)
2. Helmet (CSP, HSTS, frameguard, security headers)
3. Custom security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`)
4. `express.json` (100 KB body limit)
5. `express-mongo-sanitize` (NoSQL injection prevention)
6. `cookieParser`
7. `metricsMiddleware`
8. HTTP request logger
9. `.html` extension redirect (301)
10. Static file serving from `public/`

### Authentication and RBAC

- LDAP is used only at login time to verify credentials. On success, Express issues a JWT
  stored in an `httpOnly` cookie.
- `authGuard(roles)` is an Express middleware that validates the JWT cookie and checks that
  the user's role is in the allowed list. Used directly in route mounting:

```js
v1Router.use('/admin/ldap', mutationLimiter, authGuard(['admin']), ldapRoutes)
v1Router.use('/campaigns',  mutationLimiter, authenticated,        campaignRoutes)
// authenticated = authGuard(['admin', 'manager', 'employee', 'hr'])
```

- `/api/health` is public (Docker healthcheck). `/api/health/detail` requires `admin`.

### API versioning

All routes are mounted on a shared `v1Router`:

- `/api/v1/*` — versioned path (current)
- `/api/*` — legacy alias (backward compatibility)

Both prefixes reach the same handlers.

### Rate limiting

| Limiter | Window | Max requests | Applied to |
|---------|--------|--------------|------------|
| `apiLimiter` | 60 s | 2 000 | All `/api/*`, analytics, read-heavy routes |
| `mutationLimiter` | 60 s | 500 | Write routes (users, campaigns, forms, …) |

---

## 6. Key Domain Concepts

### Campaigns

A **Campaign** is the organisational unit that groups a set of evaluations together over a
defined period. HR or admins create campaigns and assign forms and participants. A campaign
has a lifecycle (draft, active, closed) and aggregated analytics.

### Forms (questionnaires)

A **Form** is a structured questionnaire built by HR. It contains categories and questions
(text, rating, multiple-choice, etc.). Forms are attached to campaigns. HR can import and
export forms. Form categories are managed separately (`/form-categories`).

### Evaluations

An **Evaluation** is the instance of a form filled in by a specific employee as part of a
campaign.

#### State machine

All valid transitions are defined in `mongo/server/models/Evaluation.js`
(`VALID_TRANSITIONS` / `ROLE_TRANSITIONS`).

```
assigned
  |
  v (employee or admin)
in_progress
  |
  v (employee or manager filling a competency form, or admin)
submitted
  |
  v (manager or admin)
reviewed -----> disputed (employee contests; HR arbitrates)
  |               |
  |   +-----------+  (HR resolves: back to reviewed, or skip to signed_evaluatee)
  |   |
  v   v (employee or admin)
signed_evaluatee
  |
  v (manager or admin)
signed_manager
  |
  v (HR or admin)
signed_hr
  |
  v (HR or admin)
validated  [terminal]

Additional terminal states (no further transitions):
  expired   — set by the scheduler when phaseDeadline or expiresAt is exceeded
  rejected  — HR refuses the evaluation
  archived  — evaluation cancelled following an offboarding
```

**Role-gated transitions (non-admin):**

| Role | From | To |
|------|------|----|
| employee | assigned | in_progress |
| employee | in_progress | submitted |
| employee | reviewed | signed_evaluatee, disputed |
| manager | in_progress | submitted |
| manager | submitted | reviewed |
| manager | signed_evaluatee | signed_manager |
| hr | reviewed | signed_hr (bypass: skips evaluatee/manager signatures) |
| hr | disputed | reviewed, signed_evaluatee (arbitration) |
| hr | signed_evaluatee | signed_hr |
| hr | signed_manager | signed_hr |
| hr | signed_hr | validated |

`admin` is not listed in `ROLE_TRANSITIONS` and may perform any transition that is valid
in `VALID_TRANSITIONS`.

**Answer lock:** once an evaluation reaches any status in
`[submitted, reviewed, disputed, signed_evaluatee, signed_manager, signed_hr, validated, archived]`
the `answers` field is frozen. A pre-save hook enforces this server-side.

**Auto-save behaviour:** while an evaluation is in `assigned` or `in_progress`, the
employee's answers are saved freely. Each save updates `lastSavedAt`. If the status is
still `assigned` at save time it is automatically advanced to `in_progress`.

#### Signature fields — dual tracking

The model stores signatures in two parallel structures:

- **Legacy timestamp fields** (`signedByEvaluateeAt`, `signedByManagerAt`, `signedByHrAt`):
  plain `Date` fields kept for backward compatibility.
- **`signatures` array** (sub-documents with `userId`, `role`, `signedAt`, `ipAddress`):
  the canonical record of each electronic signature.

The `signatures` array is the source of truth. The legacy fields are retained for
backward compatibility only and should not be used for business logic in new code.

The **N-1** context (previous edition) allows an evaluatee and their manager to view
answers from the previous campaign during the current one, providing continuity and
comparison.

### Interviews

An **Interview** (`/interview`) is the face-to-face review session between a manager and
an employee. It is parameterised by `campaignId` and `evaluateeId` query strings and gives
the manager a consolidated view (evaluation answers, N-1 context, objectives) during the
meeting.

### Manager todo (`/manager/todo`)

Aggregates all pending actions for a manager across all their direct reports and, via
the hierarchy, any managers reporting to them. This is the single entry point for
multi-team supervision; there is no separate "director" portal.

### Individual Development Plans (PDI)

A **PDI** (Plan de Développement Individuel) tracks an employee's personal development
objectives and actions over time. Accessible to all authenticated roles.

### HR Flags

**Flags** (`/hr/flags`) are signals raised internally (by employees, managers, or HR)
about situations requiring attention. Only `admin` and `hr` can access the flag management
interface, but the creation API may be open to other roles.

### Org chart (`/org`)

A full-screen interactive visualisation of the organisation hierarchy, served by a
dedicated layout (`OrgLayout`) without the standard navigation shell. The legacy path
`/admin/orgchart` permanently redirects to `/org`.

### Notifications

The notification system (`/notifications`, `/api/v1/notifications`) delivers in-app
alerts. HR-specific notifications are managed separately under `/api/v1/hr/notifications`.

### Offboarding

The offboarding workflow (`/api/v1/offboarding`) handles the structured exit process for
departing employees. It is accessible to all authenticated roles at the API level.

---

## Adding a new page

```bash
# 1. Create the component
#    frontend-v2/src/pages/MyNewPage.tsx

# 2. Add a lazy import in src/router/index.tsx
const MyNewPage = lazy(() => import('../pages/MyNewPage'))

# 3. Add the route in the createBrowserRouter array
{
  path: '/my-new-route',
  element: (
    <AuthGuard roles={['hr', 'admin']}>
      <S><MyNewPage /></S>
    </AuthGuard>
  ),
}

# 4. Add i18n keys to fr.json and en.json
# 5. Add a nav entry in navConfig.ts if required
```

No additional HTML file, no Vite entry point, no Express route needed.
