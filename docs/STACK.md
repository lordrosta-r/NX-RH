# Technology Stack — Rationale and Justifications

This document explains the reasoning behind every major technology choice in NanoXplore RH.
It is written from the perspective of the developer who built the project during an apprenticeship,
and is intended to be read as a defence of those choices — not a neutral survey.

---

## 1. Guiding principle: K.I.S.S.

Every decision in this project was filtered through a single question: **is this the simplest
thing that could possibly work?**

An apprenticeship project carries a specific constraint that is easy to forget: the developer is
learning while building. Adding a framework because it is fashionable, or because a blog post said
it scales better, creates two problems at once — more surface area to understand, and more surface
area to break. I chose to err on the side of well-understood, well-documented, mainstream tools
with large communities, even when a newer alternative might have been theoretically superior.

The payoff is visible in the constraints listed in CONTRIBUTING.md: no Redux, no Zustand, no Jotai,
no SSR, no alternative CSS frameworks. These are not arbitrary prohibitions — they are the result
of deliberately choosing the simpler path and then holding the line against scope creep.

The architecture reflects the same philosophy. One HTML entry point, one router file as the single
source of truth for all routes, one axios client that handles auth errors globally. Nothing is
reinvented; everything is composed from standard building blocks.

---

## 2. Frontend: React 19 + TypeScript 6 + Vite 8

### The choice

A single-page application built with React 19, TypeScript 6, and Vite 8 as the build tool.

### Why

React is the most widely adopted UI library in the industry. For an apprentice, that matters:
the documentation is exhaustive, community answers exist for virtually every problem, and the
mental models (components, props, hooks) are transferable. I was not choosing between equally
mature options — I was choosing the one where getting stuck would cost the least time.

TypeScript 6 was a deliberate choice to enforce correctness at the boundary between the frontend
and the backend. HR data — evaluations, campaign targets, role-based visibility — is complex
enough that a typo in a field name or a missing null-check can silently produce wrong data for
a user. TypeScript catches those bugs at compile time, before they reach production. The strict
typing of caught errors (`unknown` rather than `Error`) and the prohibition on `as any` are
enforced by ESLint and reflect the same philosophy: let the compiler do the work.

Vite was chosen because it is fast and simple to configure. Development startup is near-instant,
hot-module replacement is reliable, and the production build pipeline (`tsc -b && vite build`)
is a single command. There is nothing exotic in the configuration — a React plugin, a compression
plugin, and a proxy to the Express backend for development.

### Alternatives considered

**Create React App (CRA)** was the standard scaffolding tool for years, but it has been
officially deprecated and was already showing its age at the time of this project. Slow build
times, a rigid webpack configuration, and no path to ejecting cleanly made it a non-starter.

**Next.js** was the most tempting alternative. It is well-documented, has excellent TypeScript
support, and file-based routing is genuinely ergonomic. I decided against it for two reasons.
First, this application does not need server-side rendering: the data is behind authentication,
there are no public pages that require SEO, and the latency improvement from SSR would be
negligible on an internal HR tool. Second, introducing Next.js would have meant learning its
conventions (app router vs pages router, server components, data fetching patterns) on top of
everything else. The added complexity was not justified by a concrete requirement.

---

## 3. Routing and state: React Router v6 + TanStack Query v5

### The choice

Client-side routing via React Router v6 (`createBrowserRouter`), server-state management via
TanStack Query v5, and axios for HTTP calls. No global state library.

### Why

React Router v6 is the de facto standard for SPA routing in React applications. The
`createBrowserRouter` API — which replaced the JSX-based `<Routes>` for the top-level
definition — produces a single, readable file (`src/router/index.tsx`) that lists every route
in the application. This is the single source of truth for navigation, and it made it trivial
to audit access control: every protected route is wrapped in an `AuthGuard` component, and the
allowed roles are declared inline.

TanStack Query v5 handles all server state: fetching, caching, background revalidation,
optimistic updates, and invalidation after mutations. The mental model is straightforward —
a query key identifies a piece of server data, and any mutation that changes that data
invalidates the key. This eliminates the synchronisation problem that motivated the creation of
Redux in the first place: the cache is always the source of truth, and the UI derives from it.

Axios was chosen over the native `fetch` API because a shared instance (`src/api/client.ts`)
allows interceptors to be attached once. The 401 interceptor that redirects to `/login` when a
session expires is defined in one place and applies to every API call in the application. With
raw `fetch`, that logic would have had to be duplicated in every hook or wrapped in a custom
utility anyway.

### Alternatives considered

**Redux (and Redux Toolkit)** is the answer many developers reach for when they hear "state
management". I chose not to use it, and CONTRIBUTING.md explicitly prohibits adding it. The
reason is that Redux solves a problem this application does not have. Redux is most valuable when
client-side state needs to be shared across many components that cannot be connected through
normal props or context — for example, a complex multi-step wizard or a collaborative editing
tool. In NanoXplore RH, the vast majority of "state" is server data (campaigns, users,
evaluations), which TanStack Query manages better than Redux ever could. The remaining UI state
(who is logged in, which perspective is active, whether a confirmation dialog is open) fits
cleanly into three lightweight React contexts.

**Zustand and Jotai** are lighter alternatives that I also considered and rejected for the same
reason: they solve a problem that does not arise here. Adding them would have been pre-emptive
architecture without a concrete use case.

---

## 4. Styling: Tailwind CSS v3 + CSS custom properties

### The choice

Tailwind CSS v3 for layout, spacing, and typography. CSS custom properties (`var(--color-*)`)
defined in `src/styles/tokens.css` for brand colours and design tokens. A single icon library,
`lucide-react`, for all icons.

### Why

Tailwind's utility-first model keeps styles co-located with the markup that uses them. There is
no separate stylesheet to maintain in parallel, no risk of a class name collision breaking an
unrelated component, and no dead CSS to audit. For a single-developer project, the productivity
gain is real: I could build and modify UI components quickly without switching files.

CSS custom properties were added on top of Tailwind, not instead of it, to solve a specific
problem: theming. The application supports a dark/light theme switch, and the theme must be
applied before React renders to avoid a flash of unstyled content. An inline script in
`index.html` reads `localStorage` and sets `data-theme` on the `<html>` element before any
JavaScript bundle loads. CSS custom properties on `:root` respond to that attribute, and
Tailwind utilities reference those properties via `var(--color-*)`. This architecture keeps
the theme logic entirely in CSS, which is the right layer for it.

Lucide-react was chosen as the sole icon library because mixing icon libraries creates visual
inconsistency (different stroke weights, different grid sizes, different naming conventions).
Using one library — and enforcing that constraint in CONTRIBUTING.md — means every icon in
the application looks the same.

### Alternatives considered

**styled-components and Emotion** produce CSS-in-JS, which has the advantage of full JavaScript
expressiveness for styles but the disadvantage of a runtime cost and a more complex build setup.
For an application of this scale, the runtime cost is not worth it.

**Material UI (MUI)** would have given me a complete design system out of the box, which sounds
appealing. In practice, MUI applications often end up fighting the library: overriding default
styles is verbose, the bundle size is significant, and the visual language is distinctly
"Material Design" rather than neutral. I wanted full control over the visual design, and
building on Tailwind + custom tokens gave me that.

---

## 5. Backend: Node.js 20 + Express 4 + MongoDB 7 + Mongoose 8

### The choice

A Node.js 20 Express 4 server backed by MongoDB 7 with Mongoose 8 as the ODM.

### Why

The JavaScript/TypeScript stack on the frontend made a Node.js backend a natural fit: one
language across the entire codebase, shared type definitions when needed, and no cognitive
overhead from switching between two runtime mental models in the same day. For an apprentice
working alone, that consistency matters.

Express 4 is intentionally minimal. It does not impose a project structure, does not require
annotation-based dependency injection, and is trivially understandable: a request comes in, it
passes through middleware, it hits a route handler, it returns a response. The backend structure
I chose (`routes/`, `models/`, `services/`, `middleware/`) is a conventional layered architecture
that any Node.js developer will recognise immediately.

MongoDB was chosen because the evaluation domain has genuinely variable schemas. An evaluation
campaign can target participants with different roles, different form types (self-assessment,
manager review, upward feedback, objectives), and different sets of custom questions built by HR
in the drag-and-drop form builder. Modelling that in a relational database is possible, but it
requires multiple join tables and either EAV patterns or JSON columns — both of which add
complexity without simplifying the application code. MongoDB's document model maps naturally to
nested structures like a form with categories, each category with questions, each question with
its own type and configuration.

Mongoose was added on top of the MongoDB driver to provide schema validation at the ODM level,
pre-save hooks, and a cleaner API for queries. It is the standard choice for Express + MongoDB
and well-documented.

Security is handled at multiple layers: `helmet` sets secure HTTP headers, `express-rate-limit`
limits request rates, `express-mongo-sanitize` prevents NoSQL injection, `sanitize-html` cleans
HTML content before persistence, and `bcrypt` hashes passwords. These are all well-maintained
packages with a clear single responsibility.

### Alternatives considered

**NestJS** is a full-featured opinionated framework built on top of Express that adds
decorators, dependency injection, modules, and a strongly typed request/response pipeline. I
considered it seriously. The reason I chose plain Express instead is the same as the reason I
chose a plain SPA over Next.js: the additional abstraction layer would have required learning
NestJS conventions before I could start building the actual application. Express's simplicity
meant I could focus on the domain logic.

**PostgreSQL** is the alternative that deserves the most honest discussion. See the trade-offs
section at the end of this document.

---

## 6. Authentication: JWT in httpOnly cookies + LDAP

### The choice

JWT tokens issued by the Express server, stored in `httpOnly` cookies (not `localStorage`).
LDAP integration via `ldapjs` for enterprise directory authentication.

### Why

Storing JWTs in `httpOnly` cookies rather than `localStorage` is a security baseline, not a
preference. JavaScript running in the browser — including any XSS payload an attacker might
inject — cannot read `httpOnly` cookies. A token in `localStorage` can be read by any script
on the page. For an HR application that handles sensitive personal data and role-based access
to other employees' evaluations, this distinction is not theoretical.

LDAP integration was a hard requirement from the project context: enterprise organisations
typically authenticate against an Active Directory or OpenLDAP server. Users should not
maintain a separate password for the HR tool. `ldapjs` provides the primitives to bind,
search, and verify credentials against an LDAP directory. The application also supports
multiple LDAP directories, which is common in organisations that have merged or have separate
directories per entity.

The authentication flow is explicit: LDAP validates the credential, the Express server issues
a JWT, the JWT is set as an `httpOnly` cookie, and all subsequent requests carry the cookie
automatically. The frontend never sees the token — it only calls `/api/auth/me` to know
who the current user is.

### Alternatives considered

**Session-based authentication** (server-side sessions stored in the database) was considered
and rejected primarily for scalability reasons. Session storage requires a shared store (Redis
or the database) when multiple app instances are running. JWT tokens are stateless and can be
verified by any instance without a round-trip to a shared store, which is why `docker compose
up --scale app=3` works without additional configuration.

**Storing the JWT in localStorage** is the approach taken in many tutorials and rejected here
for the XSS exposure reason described above. The convenience is not worth the risk.

---

## 7. Validation: Zod (frontend) + Joi (backend)

### The choice

Zod 4 for schema validation on the frontend (form validation via `@hookform/resolvers` + Zod).
Joi 17 for request validation on the backend.

### Why

The two-library approach reflects the different roles validation plays on each side of the
boundary.

On the frontend, Zod integrates cleanly with React Hook Form via `@hookform/resolvers`. A Zod
schema defines both the TypeScript type and the validation rules in one declaration. The inferred
type is used throughout the component, which means there is no risk of the validation rules
drifting out of sync with the TypeScript interface. Zod 4 also has a small bundle footprint,
which matters for a frontend build.

On the backend, Joi is a mature validation library with a fluent API that is well-suited to
Express middleware. Validation schemas in the `routes/` layer use Joi to reject malformed
requests before they reach the service layer, so service functions can trust their inputs.
Joi's error messages are also human-readable, which helps when debugging integration tests
with Supertest.

The duplication between frontend and backend validation is intentional. Frontend validation
improves the user experience (immediate feedback without a round-trip). Backend validation is
the security boundary that cannot be skipped — a client can always send a crafted request that
bypasses the UI entirely. Having both layers means neither is a single point of failure.

---

## 8. Internationalisation: react-i18next

### The choice

`react-i18next` with `i18next-browser-languagedetector`, two locale files (`fr.json` and
`en.json`), and automatic language detection from `localStorage` then `navigator`.

### Why

Internationalisation was a genuine requirement: the organisation operates in both French and
English, and the interface must be fully usable in either language. `react-i18next` is the
standard i18n library for React applications. It has a straightforward API (`useTranslation()`
hook, `t('key')` call), supports namespacing, and handles pluralisation and interpolation.

The decision to use a single namespace (`translation`) rather than multiple namespaces was a
deliberate simplification. A single JSON file per language is easier to maintain, easier to
search, and easier to audit for missing keys. The key naming convention
(`<domain>.<section>.<element>`) provides sufficient structure without requiring a loader to
dynamically fetch namespace files.

Language detection is automatic: the application reads the user's preference from `localStorage`
first, then falls back to the browser's `navigator.language`. No manual configuration is
required from the user on first use.

### Alternatives considered

**Hard-coded strings in French only** was the pragmatic starting point, but internationalisation
was added early because retrofitting it later is significantly more painful than doing it from
the start. Once a codebase has hundreds of string literals scattered across components, the
extraction work is tedious and error-prone.

**FormatJS / react-intl** is a capable alternative, particularly for complex pluralisation and
number/date formatting with ICU message syntax. I chose `react-i18next` because its API is
simpler for the common case (looking up a string by key), and the project does not need
sophisticated ICU formatting.

---

## 9. Deployment: Docker multi-stage + nginx

### The choice

A multi-stage `Dockerfile` that builds the Vite frontend and packages it with the Express
server. Docker Compose for orchestration (nginx reverse proxy + app container + MongoDB container
+ a one-shot `cert-init` container for TLS). GitHub Actions for CI/CD.

### Why

Docker gives the deployment a reproducible, self-contained unit. The multi-stage build means
the production image contains only the compiled assets and the Node.js runtime — no build tools,
no source files, no development dependencies. The image is smaller and has a reduced attack
surface.

The `cert-init` pattern solves a real operational problem elegantly: nginx requires a TLS
certificate to start, but the real certificate is uploaded by an admin from the UI after the
first boot. The `cert-init` service generates a self-signed certificate for `localhost`
automatically on first run so nginx can start unconditionally. An admin then replaces it with
the real certificate through the administration panel.

Nginx sits in front of Express for TLS termination, HTTP-to-HTTPS redirection, and static asset
caching. Express handles only API requests and serves `index.html` for all non-API routes (the
SPA fallback pattern).

GitHub Actions runs two workflows plus CodeQL: a CI workflow on every push and PR to `main`
(TypeScript check, ESLint, unit tests, backend integration tests) and a CD workflow that builds
and smoke-tests the Docker image on `v*` release tags (the image is not published to a registry —
deployment artifacts ship as release attachments). Dependency and code scanning is handled by
Dependabot and CodeQL.

### Alternatives considered

**PaaS platforms (Render, Railway, Fly.io)** would have simplified the deployment considerably:
no Dockerfile to maintain, no nginx configuration, managed TLS. I chose the Docker approach
because it produces a fully portable artefact that can be deployed to any machine running Docker,
including an on-premises server — which is the typical deployment target for enterprise HR tools
that handle sensitive employee data and cannot route that data through a third-party cloud. The
operational overhead of managing the container is an acceptable trade-off for data sovereignty.

**Heroku** was effectively ruled out by its pricing changes and the same data-residency argument.

---

## 10. Testing: Vitest + Playwright (frontend) / Jest 30 + Supertest (backend)

### The choice

Vitest 4 and Testing Library for frontend unit and component tests. Playwright for end-to-end
tests. Jest 30 and Supertest for backend integration tests, with `mongodb-memory-server` for an
in-process MongoDB instance.

### Why

**Vitest** was chosen over Jest for the frontend because it runs inside the Vite pipeline.
Configuration is minimal (it reuses the Vite config), startup is fast, and the API is compatible
with Jest — migration cost is near zero if the choice is ever reversed. The `jsdom` environment
allows component tests that exercise the DOM without a real browser.

**Testing Library** (`@testing-library/react`, `@testing-library/user-event`) encourages testing
components from the user's perspective: find elements by accessible role or label, fire events
the way a user would, assert on what the user sees. This produces tests that are more resilient
to implementation changes than tests that assert on internal state or class names.

**Playwright** handles end-to-end tests that exercise the full stack through a real browser.
The scenarios in `frontend-v2/e2e/` cover the critical user paths (form builder, evaluation
filling, manager flows) and produce screenshots as artefacts. Playwright's cross-browser support
means the same test suite runs on Chromium, Firefox, and WebKit.

**Jest 30** on the backend is the established choice for Node.js. `mongodb-memory-server` spins
up a real MongoDB instance in memory for each test suite, which means integration tests exercise
the actual Mongoose models and query logic without requiring an external database connection.
`Supertest` allows HTTP-level tests against the Express application, verifying that routes,
middleware, and authentication guards behave correctly end-to-end.

**MSW (Mock Service Worker)** is available in the frontend dev dependencies for mocking API
responses in component tests without coupling the tests to a running backend.

### Alternatives considered

**Jest on the frontend** was the obvious alternative to Vitest. The main reason to prefer Vitest
is the elimination of the `babel-jest` or `ts-jest` transformer layer: Vite already handles
TypeScript and JSX transformation, so Vitest can reuse that pipeline directly. Fewer
transformation layers mean fewer configuration edge cases.

---

## 11. Trade-offs and what I would revisit

**MongoDB vs a relational database** is the choice I reflect on most. HR data is
inherently relational: users belong to departments, managers are users, campaigns target users,
evaluations belong to campaigns and to users, form templates are reused across campaigns. The
document model can represent all of this, but it requires careful denormalisation and aggregation
pipelines where a relational database would use a straightforward JOIN. In practice, I found
myself writing Mongoose aggregations that would have been simpler SQL queries. If I were starting
this project again, I would seriously consider PostgreSQL with JSONB columns for the genuinely
variable parts (form question configuration, evaluation answers) and normalised tables for the
stable relational core.

**No TypeScript on the backend** is a consequence of starting with a plain Express/JavaScript
backend and adding TypeScript only to the frontend. The backend is typed via JSDoc comments
in some files but not consistently. This creates a gap: the Zod schemas on the frontend and
the Joi schemas on the backend are not derived from a shared source, so a field rename requires
two changes in two different schemas. A future improvement would be to migrate the backend to
TypeScript and extract shared types into a common package.

**Test coverage is uneven.** The coverage thresholds in `package.json` (50% branches, 55%
functions, 60% lines) reflect a pragmatic decision to ship working software rather than chase
a coverage number. The critical paths are covered — authentication, evaluation submission, role
guards — but some administrative and configuration routes have no automated tests. Expanding
coverage, particularly for the LDAP synchronisation and email-sending services, is the most
valuable technical debt to address.

**Playwright tests are fragile against a live database.** The end-to-end tests depend on seed
data and live API calls, which makes them slower and less deterministic than pure unit tests.
A seed-and-teardown harness (`seeds/seed-fresh.js` already exists) mitigates this, but the
tests remain sensitive to timing and network conditions. Isolating the E2E suite behind a
dedicated test environment would improve reliability.

These are not failures — they are the natural result of building a full-stack application alone
over a bounded apprenticeship period. The choices I made allowed me to ship a genuinely
deployable, documented, and tested product. The trade-offs I have described are the honest
next steps, not excuses.
