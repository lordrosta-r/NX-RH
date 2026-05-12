# Graph Report - .  (2026-05-12)

## Corpus Check
- 37 files · ~999,999 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1714 nodes · 1923 edges · 102 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 297 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin UI & Audit|Admin UI & Audit]]
- [[_COMMUNITY_Auth Middleware & Tests|Auth Middleware & Tests]]
- [[_COMMUNITY_Frontend Layouts & Docs|Frontend Layouts & Docs]]
- [[_COMMUNITY_Role & Hierarchy Specs|Role & Hierarchy Specs]]
- [[_COMMUNITY_API Client Layer|API Client Layer]]
- [[_COMMUNITY_API Routes Reference|API Routes Reference]]
- [[_COMMUNITY_Auth & Evaluation Flows|Auth & Evaluation Flows]]
- [[_COMMUNITY_Backend Architecture|Backend Architecture]]
- [[_COMMUNITY_Campaign API Endpoints|Campaign API Endpoints]]
- [[_COMMUNITY_Evaluation Mutations|Evaluation Mutations]]
- [[_COMMUNITY_E2E Test Suite|E2E Test Suite]]
- [[_COMMUNITY_Database Config & Seeds|Database Config & Seeds]]
- [[_COMMUNITY_Frontend API Services|Frontend API Services]]
- [[_COMMUNITY_Admin & Analytics Routes|Admin & Analytics Routes]]
- [[_COMMUNITY_CampaignFormOrg Chart|Campaign/Form/Org Chart]]
- [[_COMMUNITY_Audit Reports|Audit Reports]]
- [[_COMMUNITY_Frontend Tests|Frontend Tests]]
- [[_COMMUNITY_HR Analytics|HR Analytics]]
- [[_COMMUNITY_Design Lab UI|Design Lab UI]]
- [[_COMMUNITY_Forms Import & Resources|Forms Import & Resources]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 156|Community 156]]
- [[_COMMUNITY_Community 157|Community 157]]
- [[_COMMUNITY_Community 158|Community 158]]
- [[_COMMUNITY_Community 159|Community 159]]
- [[_COMMUNITY_Community 160|Community 160]]
- [[_COMMUNITY_Community 161|Community 161]]
- [[_COMMUNITY_Community 162|Community 162]]
- [[_COMMUNITY_Community 163|Community 163]]
- [[_COMMUNITY_Community 164|Community 164]]
- [[_COMMUNITY_Community 167|Community 167]]
- [[_COMMUNITY_Community 297|Community 297]]
- [[_COMMUNITY_Community 298|Community 298]]
- [[_COMMUNITY_Community 299|Community 299]]
- [[_COMMUNITY_Community 300|Community 300]]
- [[_COMMUNITY_Community 301|Community 301]]
- [[_COMMUNITY_Community 302|Community 302]]
- [[_COMMUNITY_Community 303|Community 303]]
- [[_COMMUNITY_Community 304|Community 304]]
- [[_COMMUNITY_Community 305|Community 305]]
- [[_COMMUNITY_Community 306|Community 306]]
- [[_COMMUNITY_Community 307|Community 307]]
- [[_COMMUNITY_Community 308|Community 308]]
- [[_COMMUNITY_Community 309|Community 309]]
- [[_COMMUNITY_Community 310|Community 310]]
- [[_COMMUNITY_Community 311|Community 311]]
- [[_COMMUNITY_Community 312|Community 312]]
- [[_COMMUNITY_Community 313|Community 313]]
- [[_COMMUNITY_Community 314|Community 314]]
- [[_COMMUNITY_Community 315|Community 315]]
- [[_COMMUNITY_Community 316|Community 316]]
- [[_COMMUNITY_Community 317|Community 317]]
- [[_COMMUNITY_Community 318|Community 318]]
- [[_COMMUNITY_Community 319|Community 319]]
- [[_COMMUNITY_Community 320|Community 320]]
- [[_COMMUNITY_Community 321|Community 321]]
- [[_COMMUNITY_Community 322|Community 322]]
- [[_COMMUNITY_Community 323|Community 323]]
- [[_COMMUNITY_Community 324|Community 324]]
- [[_COMMUNITY_Community 325|Community 325]]
- [[_COMMUNITY_Community 326|Community 326]]
- [[_COMMUNITY_Community 327|Community 327]]
- [[_COMMUNITY_Community 328|Community 328]]
- [[_COMMUNITY_Community 329|Community 329]]
- [[_COMMUNITY_Community 332|Community 332]]
- [[_COMMUNITY_Community 333|Community 333]]
- [[_COMMUNITY_Community 334|Community 334]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 42 edges
2. `authGuard()` - 26 edges
3. `useTranslate()` - 25 edges
4. `User Model` - 19 edges
5. `runTests()` - 18 edges
6. `Express Server` - 18 edges
7. `Backend API Reference` - 16 edges
8. `useLocaleCtx()` - 15 edges
9. `useLocale()` - 15 edges
10. `Express.js Backend (Node.js 20 + Express 4)` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Interface Options Grid (Scale, Dropdown, Text Area, Multiple Choice)` --semantically_similar_to--> `FormEditor Field Types (scale, textarea, text, choice)`  [INFERRED] [semantically similar]
  designs/rh/formcreator.html → docs/design/formeditor/DESIGN.md
- `run()` --calls--> `Login()`  [INFERRED]
  scripts/e2e/test-hierarchy.js → client/src/pages/login/Login.jsx
- `run()` --calls--> `Login()`  [INFERRED]
  scripts/e2e/test-restricted.js → client/src/pages/login/Login.jsx
- `RoleGuard()` --calls--> `useAuth()`  [INFERRED]
  frontend-v2/src/components/shared/RoleGuard.tsx → client/src/contexts/AuthContext.jsx
- `AuthGuard()` --calls--> `useAuth()`  [INFERRED]
  frontend-v2/src/components/shared/AuthGuard.tsx → client/src/contexts/AuthContext.jsx

## Hyperedges (group relationships)
- **Outils d'administration système** —  [INFERRED]
- **Système de notifications in-app** —  [INFERRED]
- **Org Chart Interactive View System** — orgpage_OrgPage, orgpage_OrgFlowInner, orgcirclenode_OrgCircleNode, orgtoolbar_OrgToolbar, orgcontrols_OrgControls, orgsidepanel_OrgSidePanel, orgtooltip_OrgTooltip, useorglayout_useOrgLayout [INFERRED 0.95]
- **Org Chart Data Type Cluster** — index_OrgUser, index_OrgTreeNode, index_OrgTeamGroup, index_OrgSectorGroup, useorglayout_OrgNodeData [INFERRED 0.90]
- **Campaign Lifecycle Pipeline** — campaigns_router, campaigns_generateEvaluationsForCampaign, form_FormModel, seedrichv2_seed [INFERRED 0.85]
- **Evaluation Domain Model** — index_Evaluation, index_Campaign, index_Form, index_User, index_FormQuestion [EXTRACTED 0.95]
- **Template-to-Evaluation Data Integrity Chain** — flows_template_first, form_frozen_at, flows_evaluation_lifecycle [INFERRED 0.88]
- **Missing Notifications System (Model + Routes + Screen)** — audit_notification_model_gap, audit_notifications_routes_gap, audit_screens_doc [EXTRACTED 1.00]
- **Security Vulnerability Assessment Cluster** — audit_rbac_answers_gap, audit_csv_injection_gap, audit_security_doc [EXTRACTED 1.00]

## Communities

### Community 0 - "Admin UI & Audit"
Cohesion: 0.02
Nodes (67): Admin(), AdminAudit(), AdminCommunications(), AdminCompliance(), AdminIntegrations(), AdminOrgChart(), AdminRoles(), AdminSandbox() (+59 more)

### Community 1 - "Auth Middleware & Tests"
Cohesion: 0.02
Nodes (26): authGuard(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp() (+18 more)

### Community 2 - "Frontend Layouts & Docs"
Cohesion: 0.03
Nodes (99): Admin Settings HTML Design, Admin Portal (/admin), AuthContext (user, loading, logout), AuthedLayout (AppTopbar + Outlet shell), CLAUDE.md Conventions (AI agent source of truth), Employee Portal (/employee), Evaluation Routes (/evaluation/:evalId), HR Portal (/hr) (+91 more)

### Community 3 - "Role & Hierarchy Specs"
Cohesion: 0.03
Nodes (83): NanoXplore RH Platform (self-hosted HR evaluation), Admin Role (full system access, user & org management), Employee Role (self-evaluation participation, own data only), HR Role (transverse process piloting, campaigns & templates), Manager Role (N+1 hierarchical, team interviews & evaluations), 6-Phase Annual Evaluation Cycle (Preparation → Entretien), Templates-Before-Campaign Rule (HR must create form templates before launching campaigns), Auth API Endpoints (POST /api/auth/login, /logout, GET /me) (+75 more)

### Community 4 - "API Client Layer"
Cohesion: 0.05
Nodes (65): Auth API (/api/auth/*), AuthContext, AuthGuard, Campaigns API (/api/campaigns), DashboardAdminPage, DashboardEmployeePage, DashboardHrPage, DashboardManagerPage (+57 more)

### Community 5 - "API Routes Reference"
Cohesion: 0.06
Nodes (64): Admin Pages Documentation (10 pages), /api/admin/audit Endpoint, POST /api/auth/login, GET /api/auth/me, /api/campaigns Endpoint, GET /api/campaigns, POST /api/evaluations/bulk, GET /api/evaluations (+56 more)

### Community 6 - "Auth & Evaluation Flows"
Cohesion: 0.07
Nodes (54): /api/auth Endpoint Group (login, logout, me, preferences), /api/evaluations Endpoint, Backend Audit Report 5 Bugs Fixed, Employee Role QA Audit, Frontend Global Audit (14 bugs, 27 tests), Manager Role QA Audit, BUG-2: Evaluatee Cannot Sign Critical Fix, BUG-5: Manager Cross-Eval Unauthorized Access (+46 more)

### Community 7 - "Backend Architecture"
Cohesion: 0.08
Nodes (53): Auth Guard Middleware, Error Handler Middleware, Express Server, Rate Limiter Middleware, AuditLog Model, Docker Compose Deployment, Backend Environment Variables, Health Check Endpoint (+45 more)

### Community 8 - "Campaign API Endpoints"
Cohesion: 0.05
Nodes (45): POST /api/campaigns/:id/clone, POST /api/campaigns, GET /api/campaigns/:id, PATCH /api/campaigns/:id, GET /api/evaluations/:id, GET /api/evaluations/:id/n1-context, GET /api/evaluations/:id/pdf, PATCH /api/evaluations/:id (+37 more)

### Community 9 - "Evaluation Mutations"
Cohesion: 0.07
Nodes (25): formatAnswer(), sanitizeAnonymity(), handleUpdate(), _sendStatusNotifications(), handleN1Context(), handlePdf(), _renderPdf(), _renderQuestions() (+17 more)

### Community 10 - "E2E Test Suite"
Cohesion: 0.06
Nodes (19): auth(), runTests(), run(), run(), run(), run(), run(), run() (+11 more)

### Community 11 - "Database Config & Seeds"
Cohesion: 0.07
Nodes (16): connect(), seedCampaignsForms(), seedDemo(), ago(), seedEvaluationsActivities(), upsertEval(), seedAll(), fullSelfAnswers() (+8 more)

### Community 12 - "Frontend API Services"
Cohesion: 0.11
Nodes (31): API: /api/admin endpoints, API: /api/analytics endpoints, API: /api/auth endpoints, API: /api/campaigns endpoints, API: /api/evaluations endpoints, API: /api/events endpoints, API: /api/forms endpoints, API: /api/offboarding endpoints (+23 more)

### Community 13 - "Admin & Analytics Routes"
Cohesion: 0.13
Nodes (30): LDAP / Active Directory Integration, Admin Role, Admin Route /api/admin, SMTP Email Configuration, Analytics Route /api/analytics, Audit Log, Audit Route /api/admin/audit, Auth Route /api/auth (+22 more)

### Community 14 - "Campaign/Form/Org Chart"
Cohesion: 0.08
Nodes (28): generateEvaluationsForCampaign Function, Campaigns Express Router, Form Mongoose Model, Question Sub-Schema, Campaign Interface, Evaluation Interface, Form Interface (Frontend Type), FormQuestion Interface (+20 more)

### Community 15 - "Audit Reports"
Cohesion: 0.14
Nodes (26): Audit API Parity – Contract vs Backend (73/75), CSV Formula Injection in GET /api/evaluations/export (P2), Missing GET /api/dashboard Endpoint (P1 Blocker), EVALUATION_STATUSES Constant Misalignment – draft Status Missing (P1-R2), Audit Features – 36 User Stories Completeness, Audit Flows – 19 UX Flows Analysis, GET /api/hr/flags Missing Filters & Pagination While S-38 Defines 5 Filters (P1), Audit Models – 11 Mongoose Models Analysis (+18 more)

### Community 16 - "Frontend Tests"
Cohesion: 0.11
Nodes (10): renderCampaignDetail(), renderFormDetail(), createWrapper(), makeUser(), renderWithProviders(), setMockUser(), renderTopbar(), renderWithAuth() (+2 more)

### Community 17 - "HR Analytics"
Cohesion: 0.11
Nodes (3): fetchCampaigns(), fetchEvals(), apiFetch()

### Community 18 - "Design Lab UI"
Cohesion: 0.15
Nodes (8): applyConfig(), buildExportCSS(), DevDesignLab(), ensureFont(), injectCSS(), load(), readFromDOM(), syncTopbarNav()

### Community 19 - "Forms Import & Resources"
Cohesion: 0.14
Nodes (5): handlePaste(), parseAndValidate(), reset(), validateForm(), handleReset()

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (12): addDays(), computeScore(), generateAnswers(), main(), makeDirectorEval(), makeManagerEval360(), makeManagerEvalSimple(), makeSelfEvalDetailed() (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.22
Nodes (4): EvalDrawer(), ExpiryBadge(), fmtDate(), getDaysUntilExpiry()

### Community 24 - "Community 24"
Cohesion: 0.51
Nodes (9): bindAsync(), getVal(), makeClient(), previewUsers(), searchAsync(), syncUsers(), testConnection(), unbindAsync() (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.36
Nodes (5): buildLayout(), countLeaves(), flattenToMap(), getAncestors(), getDescendants()

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (1): Skeleton()

### Community 30 - "Community 30"
Cohesion: 0.4
Nodes (2): isSameDay(), isToday()

### Community 31 - "Community 31"
Cohesion: 0.53
Nodes (4): addToast(), dismissAllToasts(), dismissToast(), notify()

### Community 33 - "Community 33"
Cohesion: 0.47
Nodes (4): handleSubmit(), inputCls(), isDisabled(), validate()

### Community 34 - "Community 34"
Cohesion: 0.4
Nodes (2): getIconConfig(), NotificationCard()

### Community 35 - "Community 35"
Cohesion: 0.47
Nodes (3): CalendarWidget(), getDaysInMonth(), getFirstDayOfWeek()

### Community 36 - "Community 36"
Cohesion: 0.4
Nodes (2): EditModal(), toInputDate()

### Community 37 - "Community 37"
Cohesion: 0.33
Nodes (6): GET /api/hr/flags/count, Component: AppLayout, Component: Breadcrumbs, Component: Navbar, Component: NotificationBell, Component: Toast / ToastContainer

### Community 41 - "Community 41"
Cohesion: 0.5
Nodes (2): handleSave(), validate()

### Community 42 - "Community 42"
Cohesion: 0.5
Nodes (2): handleSubmit(), validate()

### Community 43 - "Community 43"
Cohesion: 0.6
Nodes (3): buildFilter(), createClient(), getConfig()

### Community 45 - "Community 45"
Cohesion: 0.4
Nodes (1): Toast()

### Community 47 - "Community 47"
Cohesion: 0.5
Nodes (2): clsx(), cn()

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (2): formatDate(), formatRelativeDate()

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (2): Avatar(), getColorFromName()

### Community 55 - "Community 55"
Cohesion: 0.67
Nodes (2): handleSubmit(), validate()

### Community 63 - "Community 63"
Cohesion: 0.67
Nodes (2): allowedNotifKeysFor(), filterNotifPrefsByRole()

### Community 64 - "Community 64"
Cohesion: 0.83
Nodes (3): getBrandSubForRole(), getNavItemsForRole(), resolveRole()

### Community 65 - "Community 65"
Cohesion: 0.67
Nodes (2): getLocale(), makeT()

### Community 66 - "Community 66"
Cohesion: 0.5
Nodes (4): POST /api/forms, POST /api/forms/import, Component: QuestionBuilder, S-14 /forms/new — Créer formulaire

### Community 67 - "Community 67"
Cohesion: 0.5
Nodes (4): GET /api/notifications, Domain Concept: Notification, i18n namespace: notifications, S-xx /notifications — Page notifications

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (2): header(), main()

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (2): cleanup(), run()

### Community 71 - "Community 71"
Cohesion: 0.67
Nodes (1): App()

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (2): allowedNotifKeysFor(), filterNotifPrefsByRole()

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (2): getModel(), notify()

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (2): fmtDate(), ProfileSection()

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (2): RoleSpaceSection(), spacesFor()

### Community 89 - "Community 89"
Cohesion: 0.67
Nodes (3): GET /api/analytics/campaigns/:id, GET /api/analytics/export/csv, S-12 /campaigns/:id/analytics — Analytique campagne

### Community 90 - "Community 90"
Cohesion: 0.67
Nodes (3): GET /api/users/:id, Component: OnboardingSteps, S-06 /users/:id — Profil utilisateur

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (3): POST /api/forms/:id/freeze, Flow 3: Gestion formulaire, Notification: formFrozen

### Community 94 - "Community 94"
Cohesion: 0.67
Nodes (3): Design System v2, Design Token: Primary Teal #17A8D4, Design Token: Inter Typography

### Community 156 - "Community 156"
Cohesion: 1.0
Nodes (2): Content Security Policy (CSP) via Helmet + HTML meta tag, Helmet HTTP Security Headers (X-Frame-Options, nosniff, Referrer-Policy)

### Community 157 - "Community 157"
Cohesion: 1.0
Nodes (2): NX Monogram Favicon (red, square, rounded), NanoXplore Full Wordmark Logo (red NX + dark text)

### Community 158 - "Community 158"
Cohesion: 1.0
Nodes (2): PATCH /api/auth/preferences, S-32 /profile/preferences — Préférences

### Community 159 - "Community 159"
Cohesion: 1.0
Nodes (2): PATCH /api/users/:id, S-07 /users/:id/edit — Modifier utilisateur

### Community 160 - "Community 160"
Cohesion: 1.0
Nodes (2): PATCH /api/users/:id/offboard, S-08 /users/:id/offboarding — Offboarding redirect

### Community 161 - "Community 161"
Cohesion: 1.0
Nodes (2): PATCH /api/evaluations/:id/reassign, S-xx /evaluations — Liste évaluations

### Community 162 - "Community 162"
Cohesion: 1.0
Nodes (2): POST /api/hr/notifications/bulk-remind, Notification: deadlineReminder

### Community 163 - "Community 163"
Cohesion: 1.0
Nodes (2): Flow 5: Onboarding utilisateur, Notification: onboardingComplete

### Community 164 - "Community 164"
Cohesion: 1.0
Nodes (2): Flow 6: Processus offboarding, Notification: offboardingInitiated

### Community 167 - "Community 167"
Cohesion: 1.0
Nodes (2): OrgSectorGroup Interface, Sector Interface

### Community 297 - "Community 297"
Cohesion: 1.0
Nodes (1): Development Docker Compose Override (Vite HMR + nodemon)

### Community 298 - "Community 298"
Cohesion: 1.0
Nodes (1): Lucide React Icons (SVG stroke only)

### Community 299 - "Community 299"
Cohesion: 1.0
Nodes (1): Login Page (/login)

### Community 300 - "Community 300"
Cohesion: 1.0
Nodes (1): LocaleContext (i18n, fr/en)

### Community 301 - "Community 301"
Cohesion: 1.0
Nodes (1): HR Sidebar Navigation (Dashboard, Team Hub, Talent Journey, Performance, Insights, Settings)

### Community 302 - "Community 302"
Cohesion: 1.0
Nodes (1): Notification Center Widget (evaluation prompts, HR messages)

### Community 303 - "Community 303"
Cohesion: 1.0
Nodes (1): Bilan Annuel Card (Strengths & Growth Areas)

### Community 304 - "Community 304"
Cohesion: 1.0
Nodes (1): Design System CSS Audit

### Community 305 - "Community 305"
Cohesion: 1.0
Nodes (1): S-xx /analytics — Analytics globaux

### Community 306 - "Community 306"
Cohesion: 1.0
Nodes (1): S-xx /profile — Mon profil

### Community 307 - "Community 307"
Cohesion: 1.0
Nodes (1): POST /api/auth/logout

### Community 308 - "Community 308"
Cohesion: 1.0
Nodes (1): DELETE /api/users/:id

### Community 309 - "Community 309"
Cohesion: 1.0
Nodes (1): POST /api/users/import

### Community 310 - "Community 310"
Cohesion: 1.0
Nodes (1): GET /api/users/:id/gdpr-export

### Community 311 - "Community 311"
Cohesion: 1.0
Nodes (1): POST /api/evaluations

### Community 312 - "Community 312"
Cohesion: 1.0
Nodes (1): PATCH /api/evaluations/bulk

### Community 313 - "Community 313"
Cohesion: 1.0
Nodes (1): GET /api/forms/:id

### Community 314 - "Community 314"
Cohesion: 1.0
Nodes (1): PATCH /api/forms/:id

### Community 315 - "Community 315"
Cohesion: 1.0
Nodes (1): GET /api/org/sectors

### Community 316 - "Community 316"
Cohesion: 1.0
Nodes (1): PATCH /api/hr/flags/:evalId/status

### Community 317 - "Community 317"
Cohesion: 1.0
Nodes (1): GET /api/analytics/summary

### Community 318 - "Community 318"
Cohesion: 1.0
Nodes (1): PATCH /api/notifications/read-all

### Community 319 - "Community 319"
Cohesion: 1.0
Nodes (1): POST /api/notifications/global-remind

### Community 320 - "Community 320"
Cohesion: 1.0
Nodes (1): Component: PageHeader

### Community 321 - "Community 321"
Cohesion: 1.0
Nodes (1): Component: EmptyState

### Community 322 - "Community 322"
Cohesion: 1.0
Nodes (1): Component: StatCard

### Community 323 - "Community 323"
Cohesion: 1.0
Nodes (1): Component: Avatar

### Community 324 - "Community 324"
Cohesion: 1.0
Nodes (1): Component: Modal / ConfirmDialog

### Community 325 - "Community 325"
Cohesion: 1.0
Nodes (1): Component: Button

### Community 326 - "Community 326"
Cohesion: 1.0
Nodes (1): Component: FilterBar

### Community 327 - "Community 327"
Cohesion: 1.0
Nodes (1): Component: NotificationItem

### Community 328 - "Community 328"
Cohesion: 1.0
Nodes (1): Notification: evaluationExpired

### Community 329 - "Community 329"
Cohesion: 1.0
Nodes (1): Eval Status: expired

### Community 332 - "Community 332"
Cohesion: 1.0
Nodes (1): Frontend Specs Audit Report

### Community 333 - "Community 333"
Cohesion: 1.0
Nodes (1): Role Type

### Community 334 - "Community 334"
Cohesion: 1.0
Nodes (1): OrgToolbar Component

## Knowledge Gaps
- **188 isolated node(s):** `Sector Data Model (MongoDB)`, `Analytics API Routes (/api/analytics)`, `Org Chart API Routes (/api/org)`, `HR Flags API Routes (/api/hr/flags)`, `Development Docker Compose Override (Vite HMR + nodemon)` (+183 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 28`** (7 nodes): `Skeleton.jsx`, `Skeleton.tsx`, `Skeleton()`, `SkeletonCard()`, `SkeletonStat()`, `SkeletonTable()`, `SkeletonText()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (6 nodes): `DatePicker.tsx`, `getDaysInMonth()`, `handleClickOutside()`, `isOutOfRange()`, `isSameDay()`, `isToday()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (6 nodes): `NotificationsPage.tsx`, `formatRelativeTime()`, `getIconConfig()`, `groupNotifications()`, `NotificationCard()`, `NotificationSkeleton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (6 nodes): `HRCampaignDetail.jsx`, `AssignModal()`, `CmpReassignModal()`, `DeleteConfirmModal()`, `EditModal()`, `toInputDate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (5 nodes): `FormNewPage.tsx`, `handleSave()`, `moveQuestion()`, `newQuestion()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (5 nodes): `UserNewPage.tsx`, `handleSubmit()`, `inputCls()`, `useToast()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (5 nodes): `Toast.jsx`, `Toast.tsx`, `showToast()`, `Toast()`, `Toaster()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (4 nodes): `Input.tsx`, `cn.ts`, `clsx()`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (4 nodes): `formatDate.ts`, `formatDate()`, `formatDateTime()`, `formatRelativeDate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (4 nodes): `Avatar.tsx`, `Avatar()`, `getColorFromName()`, `getInitials()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (4 nodes): `LoginLdapPage.tsx`, `FieldError()`, `handleSubmit()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (4 nodes): `users.js`, `allowedNotifKeysFor()`, `escapeRegex()`, `filterNotifPrefsByRole()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (4 nodes): `index.js`, `getLocale()`, `makeT()`, `setLocale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (3 nodes): `header()`, `main()`, `run.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (3 nodes): `cleanup()`, `run()`, `seed.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (3 nodes): `App.jsx`, `App.tsx`, `App()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (3 nodes): `auth.js`, `allowedNotifKeysFor()`, `filterNotifPrefsByRole()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (3 nodes): `notificationHelper.js`, `getModel()`, `notify()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (3 nodes): `ProfileSection.jsx`, `fmtDate()`, `ProfileSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (3 nodes): `RoleSpaceSection.jsx`, `RoleSpaceSection()`, `spacesFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 156`** (2 nodes): `Content Security Policy (CSP) via Helmet + HTML meta tag`, `Helmet HTTP Security Headers (X-Frame-Options, nosniff, Referrer-Policy)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 157`** (2 nodes): `NX Monogram Favicon (red, square, rounded)`, `NanoXplore Full Wordmark Logo (red NX + dark text)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 158`** (2 nodes): `PATCH /api/auth/preferences`, `S-32 /profile/preferences — Préférences`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 159`** (2 nodes): `PATCH /api/users/:id`, `S-07 /users/:id/edit — Modifier utilisateur`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 160`** (2 nodes): `PATCH /api/users/:id/offboard`, `S-08 /users/:id/offboarding — Offboarding redirect`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 161`** (2 nodes): `PATCH /api/evaluations/:id/reassign`, `S-xx /evaluations — Liste évaluations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 162`** (2 nodes): `POST /api/hr/notifications/bulk-remind`, `Notification: deadlineReminder`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 163`** (2 nodes): `Flow 5: Onboarding utilisateur`, `Notification: onboardingComplete`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 164`** (2 nodes): `Flow 6: Processus offboarding`, `Notification: offboardingInitiated`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 167`** (2 nodes): `OrgSectorGroup Interface`, `Sector Interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 297`** (1 nodes): `Development Docker Compose Override (Vite HMR + nodemon)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 298`** (1 nodes): `Lucide React Icons (SVG stroke only)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 299`** (1 nodes): `Login Page (/login)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 300`** (1 nodes): `LocaleContext (i18n, fr/en)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 301`** (1 nodes): `HR Sidebar Navigation (Dashboard, Team Hub, Talent Journey, Performance, Insights, Settings)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 302`** (1 nodes): `Notification Center Widget (evaluation prompts, HR messages)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 303`** (1 nodes): `Bilan Annuel Card (Strengths & Growth Areas)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 304`** (1 nodes): `Design System CSS Audit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 305`** (1 nodes): `S-xx /analytics — Analytics globaux`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 306`** (1 nodes): `S-xx /profile — Mon profil`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 307`** (1 nodes): `POST /api/auth/logout`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 308`** (1 nodes): `DELETE /api/users/:id`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 309`** (1 nodes): `POST /api/users/import`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 310`** (1 nodes): `GET /api/users/:id/gdpr-export`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 311`** (1 nodes): `POST /api/evaluations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 312`** (1 nodes): `PATCH /api/evaluations/bulk`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 313`** (1 nodes): `GET /api/forms/:id`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 314`** (1 nodes): `PATCH /api/forms/:id`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 315`** (1 nodes): `GET /api/org/sectors`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 316`** (1 nodes): `PATCH /api/hr/flags/:evalId/status`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 317`** (1 nodes): `GET /api/analytics/summary`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 318`** (1 nodes): `PATCH /api/notifications/read-all`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 319`** (1 nodes): `POST /api/notifications/global-remind`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 320`** (1 nodes): `Component: PageHeader`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 321`** (1 nodes): `Component: EmptyState`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 322`** (1 nodes): `Component: StatCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 323`** (1 nodes): `Component: Avatar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 324`** (1 nodes): `Component: Modal / ConfirmDialog`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 325`** (1 nodes): `Component: Button`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 326`** (1 nodes): `Component: FilterBar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 327`** (1 nodes): `Component: NotificationItem`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 328`** (1 nodes): `Notification: evaluationExpired`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 329`** (1 nodes): `Eval Status: expired`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 332`** (1 nodes): `Frontend Specs Audit Report`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 333`** (1 nodes): `Role Type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 334`** (1 nodes): `OrgToolbar Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `S-03 / — Tableau de bord (5 variantes)` connect `API Routes Reference` to `Campaign API Endpoints`, `Auth & Evaluation Flows`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `Role: manager` connect `Auth & Evaluation Flows` to `API Routes Reference`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 40 inferred relationships involving `useAuth()` (e.g. with `RoleGuard()` and `AuthGuard()`) actually correct?**
  _`useAuth()` has 40 INFERRED edges - model-reasoned connections that need verification._
- **Are the 25 inferred relationships involving `authGuard()` (e.g. with `buildApp()` and `buildApp()`) actually correct?**
  _`authGuard()` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `useTranslate()` (e.g. with `Settings()` and `FormBuilder()`) actually correct?**
  _`useTranslate()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `runTests()` (e.g. with `run()` and `run()`) actually correct?**
  _`runTests()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Sector Data Model (MongoDB)`, `Analytics API Routes (/api/analytics)`, `Org Chart API Routes (/api/org)` to the rest of the system?**
  _188 weakly-connected nodes found - possible documentation gaps or missing edges._