# Graph Report - .  (2026-05-01)

## Corpus Check
- 338 files · ~50,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1042 nodes · 1366 edges · 40 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 265 edges (avg confidence: 0.82)
- Token cost: 37,700 input · 7,600 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin Frontend Components|Admin Frontend Components]]
- [[_COMMUNITY_Product Specs v1.2|Product Specs v1.2]]
- [[_COMMUNITY_Auth & Test Suite|Auth & Test Suite]]
- [[_COMMUNITY_Portal Design Mockups|Portal Design Mockups]]
- [[_COMMUNITY_Backend Core Middleware|Backend Core Middleware]]
- [[_COMMUNITY_API Contracts & QA Audits|API Contracts & QA Audits]]
- [[_COMMUNITY_Auth & App Foundation|Auth & App Foundation]]
- [[_COMMUNITY_Frontend Shell & Context|Frontend Shell & Context]]
- [[_COMMUNITY_Role Definitions & Platform|Role Definitions & Platform]]
- [[_COMMUNITY_Auth & Test Runners|Auth & Test Runners]]
- [[_COMMUNITY_Admin Routes & Pages|Admin Routes & Pages]]
- [[_COMMUNITY_Infrastructure & Integrations|Infrastructure & Integrations]]
- [[_COMMUNITY_DB Bootstrap & Seeds|DB Bootstrap & Seeds]]
- [[_COMMUNITY_Campaign Lifecycle Handlers|Campaign Lifecycle Handlers]]
- [[_COMMUNITY_Evaluation Output Pipeline|Evaluation Output Pipeline]]
- [[_COMMUNITY_HR Analytics & Data|HR Analytics & Data]]
- [[_COMMUNITY_Design Lab & Tokens|Design Lab & Tokens]]
- [[_COMMUNITY_HR Requests & Evaluations|HR Requests & Evaluations]]
- [[_COMMUNITY_LDAP Service|LDAP Service]]
- [[_COMMUNITY_Module 21|Module 21]]
- [[_COMMUNITY_Module 23|Module 23]]
- [[_COMMUNITY_Module 24|Module 24]]
- [[_COMMUNITY_Module 29|Module 29]]
- [[_COMMUNITY_Module 30|Module 30]]
- [[_COMMUNITY_Module 31|Module 31]]
- [[_COMMUNITY_Module 32|Module 32]]
- [[_COMMUNITY_Module 33|Module 33]]
- [[_COMMUNITY_Module 35|Module 35]]
- [[_COMMUNITY_Module 38|Module 38]]
- [[_COMMUNITY_Module 39|Module 39]]
- [[_COMMUNITY_Module 68|Module 68]]
- [[_COMMUNITY_Module 69|Module 69]]
- [[_COMMUNITY_Module 142|Module 142]]
- [[_COMMUNITY_Module 143|Module 143]]
- [[_COMMUNITY_Module 144|Module 144]]
- [[_COMMUNITY_Module 145|Module 145]]
- [[_COMMUNITY_Module 146|Module 146]]
- [[_COMMUNITY_Module 147|Module 147]]
- [[_COMMUNITY_Module 148|Module 148]]
- [[_COMMUNITY_Module 149|Module 149]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 39 edges
2. `useTranslate()` - 25 edges
3. `NX-RH Master Spec v1.2` - 25 edges
4. `User Model` - 19 edges
5. `runTests()` - 18 edges
6. `Express Server` - 18 edges
7. `Evaluation Model` - 17 edges
8. `Backend API Reference` - 17 edges
9. `Express.js Backend (Node.js 20 + Express 4)` - 16 edges
10. `authGuard()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Interface Options Grid (Scale, Dropdown, Text Area, Multiple Choice)` --semantically_similar_to--> `FormEditor Field Types (scale, textarea, text, choice)`  [INFERRED] [semantically similar]
  designs/rh/formcreator.html → docs/design/formeditor/DESIGN.md
- `Frontend Specs Audit Report` --semantically_similar_to--> `Backend Audit Report 5 Bugs Fixed`  [INFERRED] [semantically similar]
  frontend-v2/specs/nxrh-audit-specs.md → mongo/server/__tests__/AUDIT_BACKEND.md
- `run()` --calls--> `Login()`  [INFERRED]
  scripts/e2e/test-hierarchy.js → client/src/pages/login/Login.jsx
- `run()` --calls--> `Login()`  [INFERRED]
  scripts/e2e/test-restricted.js → client/src/pages/login/Login.jsx
- `TanStack Query v5 (Data Fetching)` --references--> `Express.js Backend (Node.js 20 + Express 4)`  [INFERRED]
  CLAUDE.md → README.md

## Communities

### Community 0 - "Admin Frontend Components"
Cohesion: 0.02
Nodes (59): Admin(), AdminAudit(), AdminCommunications(), AdminCompliance(), AdminIntegrations(), AdminOrgChart(), AdminRoles(), AdminSandbox() (+51 more)

### Community 1 - "Product Specs v1.2"
Cohesion: 0.05
Nodes (84): NX-RH Master Spec v1.2, Features Inventory by Role, Design System v2, Screens Inventory 41 Screens, UX Flows and Interaction Patterns, Notifications System Spec, API Contract Frontend v2, API: /api/admin endpoints (+76 more)

### Community 2 - "Auth & Test Suite"
Cohesion: 0.03
Nodes (15): authGuard(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp() (+7 more)

### Community 3 - "Portal Design Mockups"
Cohesion: 0.05
Nodes (62): Admin Settings HTML Design, Admin Portal (/admin), Employee Portal (/employee), Evaluation Routes (/evaluation/:evalId), HR Portal (/hr), Manager Portal (/manager), React Router v7 (38 routes), Tailwind CSS v4 + CSS Custom Properties (+54 more)

### Community 4 - "Backend Core Middleware"
Cohesion: 0.06
Nodes (60): Auth Guard Middleware, Error Handler Middleware, Express Server, Rate Limiter Middleware, AuditLog Model, Docker Compose Deployment, Backend Environment Variables, Health Check Endpoint (+52 more)

### Community 5 - "API Contracts & QA Audits"
Cohesion: 0.08
Nodes (50): /api/auth Endpoint Group (login, logout, me, preferences), /api/evaluations Endpoint, Employee Role QA Audit, Frontend Global Audit (14 bugs, 27 tests), Manager Role QA Audit, B01: ProtectedRoute Redirects Unauthorized to /employee Instead of /unauthorized, B11: useLocale State Desynced from LocaleContext, B14: No 401 Interceptor – Expired Sessions Not Redirected to /login (+42 more)

### Community 6 - "Auth & App Foundation"
Cohesion: 0.06
Nodes (46): Auth API Endpoints (POST /api/auth/login, /logout, GET /me), authGuard Middleware (JWT verification + role-based access), CSS Design Tokens (tokens.css brand + theme.css dark/light vars), Express Backend Server (mongo/server/index.js), i18n makeT Factory Engine (per-page locale files, fr/en), JWT Cookie-Based Authentication Flow (httpOnly, 8h expiry), MongoDB Database (collections: users, campaigns, forms, evaluations), Mongoose ODM (schema validation + middleware hooks) (+38 more)

### Community 7 - "Frontend Shell & Context"
Cohesion: 0.07
Nodes (40): AuthContext (user, loading, logout), AuthedLayout (AppTopbar + Outlet shell), CLAUDE.md Conventions (AI agent source of truth), KISS Principle (K.I.S.S.), ProtectedRoute (role-based access guard), SPA Architecture (Single-Page Application), TanStack Query v5 (Data Fetching), Development Docker Compose Override (Vite HMR + nodemon) (+32 more)

### Community 8 - "Role Definitions & Platform"
Cohesion: 0.08
Nodes (40): NanoXplore RH Platform (self-hosted HR evaluation), Admin Role (full system access, user & org management), Employee Role (self-evaluation participation, own data only), HR Role (transverse process piloting, campaigns & templates), Manager Role (N+1 hierarchical, team interviews & evaluations), 6-Phase Annual Evaluation Cycle (Preparation → Entretien), Templates-Before-Campaign Rule (HR must create form templates before launching campaigns), Campaigns API Endpoints (lifecycle: draft→active→closed→archived) (+32 more)

### Community 9 - "Auth & Test Runners"
Cohesion: 0.06
Nodes (19): auth(), runTests(), run(), run(), run(), run(), run(), run() (+11 more)

### Community 10 - "Admin Routes & Pages"
Cohesion: 0.14
Nodes (34): Admin Pages Documentation (10 pages), /api/admin/audit Endpoint, /api/campaigns Endpoint, /api/forms Endpoint, /api/users Endpoint, Admin Role QA Audit, HR Role QA Audit, ADM-01: AdminSecurity Wrong Audit Endpoint (/api/audit-logs → 404) (+26 more)

### Community 11 - "Infrastructure & Integrations"
Cohesion: 0.13
Nodes (30): LDAP / Active Directory Integration, Admin Role, Admin Route /api/admin, SMTP Email Configuration, Analytics Route /api/analytics, Audit Log, Audit Route /api/admin/audit, Auth Route /api/auth (+22 more)

### Community 12 - "DB Bootstrap & Seeds"
Cohesion: 0.1
Nodes (10): connect(), seedDemo(), fullSelfAnswers(), partialSelfAnswers(), seedRich(), seed(), seed(), seed() (+2 more)

### Community 13 - "Campaign Lifecycle Handlers"
Cohesion: 0.14
Nodes (11): handleUpdate(), _sendStatusNotifications(), getTransporter(), _initTransporter(), sendMail(), getMailTemplate(), notify(), notifyMany() (+3 more)

### Community 14 - "Evaluation Output Pipeline"
Cohesion: 0.14
Nodes (13): formatAnswer(), sanitizeAnonymity(), handleN1Context(), handlePdf(), _renderPdf(), _renderQuestions(), _renderSignatureLine(), handleDetail() (+5 more)

### Community 15 - "HR Analytics & Data"
Cohesion: 0.11
Nodes (3): fetchCampaigns(), fetchEvals(), apiFetch()

### Community 16 - "Design Lab & Tokens"
Cohesion: 0.15
Nodes (8): applyConfig(), buildExportCSS(), DevDesignLab(), ensureFont(), injectCSS(), load(), readFromDOM(), syncTopbarNav()

### Community 17 - "HR Requests & Evaluations"
Cohesion: 0.22
Nodes (4): EvalDrawer(), ExpiryBadge(), fmtDate(), getDaysUntilExpiry()

### Community 18 - "LDAP Service"
Cohesion: 0.51
Nodes (9): bindAsync(), getVal(), makeClient(), previewUsers(), searchAsync(), syncUsers(), testConnection(), unbindAsync() (+1 more)

### Community 21 - "Module 21"
Cohesion: 0.47
Nodes (3): CalendarWidget(), getDaysInMonth(), getFirstDayOfWeek()

### Community 23 - "Module 23"
Cohesion: 0.4
Nodes (2): EditModal(), toInputDate()

### Community 24 - "Module 24"
Cohesion: 0.6
Nodes (3): buildFilter(), createClient(), getConfig()

### Community 29 - "Module 29"
Cohesion: 0.83
Nodes (3): getBrandSubForRole(), getNavItemsForRole(), resolveRole()

### Community 30 - "Module 30"
Cohesion: 0.67
Nodes (2): getLocale(), makeT()

### Community 31 - "Module 31"
Cohesion: 1.0
Nodes (3): computeDonePhases(), computeProgress(), EvaluationSummary()

### Community 32 - "Module 32"
Cohesion: 1.0
Nodes (2): header(), main()

### Community 33 - "Module 33"
Cohesion: 1.0
Nodes (2): cleanup(), run()

### Community 35 - "Module 35"
Cohesion: 1.0
Nodes (2): allowedNotifKeysFor(), filterNotifPrefsByRole()

### Community 38 - "Module 38"
Cohesion: 1.0
Nodes (2): fmtDate(), ProfileSection()

### Community 39 - "Module 39"
Cohesion: 1.0
Nodes (2): RoleSpaceSection(), spacesFor()

### Community 68 - "Module 68"
Cohesion: 1.0
Nodes (2): Content Security Policy (CSP) via Helmet + HTML meta tag, Helmet HTTP Security Headers (X-Frame-Options, nosniff, Referrer-Policy)

### Community 69 - "Module 69"
Cohesion: 1.0
Nodes (2): NX Monogram Favicon (red, square, rounded), NanoXplore Full Wordmark Logo (red NX + dark text)

### Community 142 - "Module 142"
Cohesion: 1.0
Nodes (1): Lucide React Icons (SVG stroke only)

### Community 143 - "Module 143"
Cohesion: 1.0
Nodes (1): Login Page (/login)

### Community 144 - "Module 144"
Cohesion: 1.0
Nodes (1): LocaleContext (i18n, fr/en)

### Community 145 - "Module 145"
Cohesion: 1.0
Nodes (1): HR Sidebar Navigation (Dashboard, Team Hub, Talent Journey, Performance, Insights, Settings)

### Community 146 - "Module 146"
Cohesion: 1.0
Nodes (1): Notification Center Widget (evaluation prompts, HR messages)

### Community 147 - "Module 147"
Cohesion: 1.0
Nodes (1): Bilan Annuel Card (Strengths & Growth Areas)

### Community 148 - "Module 148"
Cohesion: 1.0
Nodes (1): DataCard Component

### Community 149 - "Module 149"
Cohesion: 1.0
Nodes (1): Avatar Component

## Knowledge Gaps
- **86 isolated node(s):** `Lucide React Icons (SVG stroke only)`, `Event Data Model (MongoDB)`, `Resource Document Model (MongoDB)`, `Sector Data Model (MongoDB)`, `Users API Routes (/api/users)` (+81 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Module 23`** (6 nodes): `HRCampaignDetail.jsx`, `AssignModal()`, `CmpReassignModal()`, `DeleteConfirmModal()`, `EditModal()`, `toInputDate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 30`** (4 nodes): `index.js`, `getLocale()`, `makeT()`, `setLocale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 32`** (3 nodes): `header()`, `main()`, `run.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 33`** (3 nodes): `cleanup()`, `run()`, `seed.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 35`** (3 nodes): `auth.js`, `allowedNotifKeysFor()`, `filterNotifPrefsByRole()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 38`** (3 nodes): `ProfileSection.jsx`, `fmtDate()`, `ProfileSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 39`** (3 nodes): `RoleSpaceSection.jsx`, `RoleSpaceSection()`, `spacesFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 68`** (2 nodes): `Content Security Policy (CSP) via Helmet + HTML meta tag`, `Helmet HTTP Security Headers (X-Frame-Options, nosniff, Referrer-Policy)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 69`** (2 nodes): `NX Monogram Favicon (red, square, rounded)`, `NanoXplore Full Wordmark Logo (red NX + dark text)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 142`** (1 nodes): `Lucide React Icons (SVG stroke only)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 143`** (1 nodes): `Login Page (/login)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 144`** (1 nodes): `LocaleContext (i18n, fr/en)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 145`** (1 nodes): `HR Sidebar Navigation (Dashboard, Team Hub, Talent Journey, Performance, Insights, Settings)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 146`** (1 nodes): `Notification Center Widget (evaluation prompts, HR messages)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 147`** (1 nodes): `Bilan Annuel Card (Strengths & Growth Areas)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 148`** (1 nodes): `DataCard Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 149`** (1 nodes): `Avatar Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Login()` connect `Admin Frontend Components` to `Auth & Test Runners`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `useTranslate()` connect `Admin Frontend Components` to `Module 31`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 38 inferred relationships involving `useAuth()` (e.g. with `TestConsumer()` and `LogoutConsumer()`) actually correct?**
  _`useAuth()` has 38 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `useTranslate()` (e.g. with `Settings()` and `FormBuilder()`) actually correct?**
  _`useTranslate()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `runTests()` (e.g. with `run()` and `run()`) actually correct?**
  _`runTests()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Lucide React Icons (SVG stroke only)`, `Event Data Model (MongoDB)`, `Resource Document Model (MongoDB)` to the rest of the system?**
  _86 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Frontend Components` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._