# Graph Report - .  (2026-05-11)

## Corpus Check
- 511 files · ~200,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1609 nodes · 1785 edges · 96 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 280 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Module 0|Module 0]]
- [[_COMMUNITY_Module 1|Module 1]]
- [[_COMMUNITY_Module 2|Module 2]]
- [[_COMMUNITY_Module 3|Module 3]]
- [[_COMMUNITY_Module 4|Module 4]]
- [[_COMMUNITY_Module 5|Module 5]]
- [[_COMMUNITY_Module 6|Module 6]]
- [[_COMMUNITY_Module 7|Module 7]]
- [[_COMMUNITY_Module 8|Module 8]]
- [[_COMMUNITY_Module 9|Module 9]]
- [[_COMMUNITY_Module 10|Module 10]]
- [[_COMMUNITY_Module 11|Module 11]]
- [[_COMMUNITY_Module 12|Module 12]]
- [[_COMMUNITY_Module 13|Module 13]]
- [[_COMMUNITY_Module 14|Module 14]]
- [[_COMMUNITY_Module 15|Module 15]]
- [[_COMMUNITY_Module 16|Module 16]]
- [[_COMMUNITY_Module 17|Module 17]]
- [[_COMMUNITY_Module 18|Module 18]]
- [[_COMMUNITY_Module 20|Module 20]]
- [[_COMMUNITY_Module 22|Module 22]]
- [[_COMMUNITY_Module 26|Module 26]]
- [[_COMMUNITY_Module 28|Module 28]]
- [[_COMMUNITY_Module 29|Module 29]]
- [[_COMMUNITY_Module 31|Module 31]]
- [[_COMMUNITY_Module 32|Module 32]]
- [[_COMMUNITY_Module 33|Module 33]]
- [[_COMMUNITY_Module 34|Module 34]]
- [[_COMMUNITY_Module 35|Module 35]]
- [[_COMMUNITY_Module 36|Module 36]]
- [[_COMMUNITY_Module 40|Module 40]]
- [[_COMMUNITY_Module 41|Module 41]]
- [[_COMMUNITY_Module 42|Module 42]]
- [[_COMMUNITY_Module 43|Module 43]]
- [[_COMMUNITY_Module 47|Module 47]]
- [[_COMMUNITY_Module 48|Module 48]]
- [[_COMMUNITY_Module 50|Module 50]]
- [[_COMMUNITY_Module 54|Module 54]]
- [[_COMMUNITY_Module 62|Module 62]]
- [[_COMMUNITY_Module 63|Module 63]]
- [[_COMMUNITY_Module 64|Module 64]]
- [[_COMMUNITY_Module 65|Module 65]]
- [[_COMMUNITY_Module 66|Module 66]]
- [[_COMMUNITY_Module 67|Module 67]]
- [[_COMMUNITY_Module 68|Module 68]]
- [[_COMMUNITY_Module 69|Module 69]]
- [[_COMMUNITY_Module 70|Module 70]]
- [[_COMMUNITY_Module 81|Module 81]]
- [[_COMMUNITY_Module 83|Module 83]]
- [[_COMMUNITY_Module 85|Module 85]]
- [[_COMMUNITY_Module 86|Module 86]]
- [[_COMMUNITY_Module 88|Module 88]]
- [[_COMMUNITY_Module 89|Module 89]]
- [[_COMMUNITY_Module 90|Module 90]]
- [[_COMMUNITY_Module 152|Module 152]]
- [[_COMMUNITY_Module 153|Module 153]]
- [[_COMMUNITY_Module 154|Module 154]]
- [[_COMMUNITY_Module 155|Module 155]]
- [[_COMMUNITY_Module 156|Module 156]]
- [[_COMMUNITY_Module 157|Module 157]]
- [[_COMMUNITY_Module 158|Module 158]]
- [[_COMMUNITY_Module 159|Module 159]]
- [[_COMMUNITY_Module 160|Module 160]]
- [[_COMMUNITY_Module 290|Module 290]]
- [[_COMMUNITY_Module 291|Module 291]]
- [[_COMMUNITY_Module 292|Module 292]]
- [[_COMMUNITY_Module 293|Module 293]]
- [[_COMMUNITY_Module 294|Module 294]]
- [[_COMMUNITY_Module 295|Module 295]]
- [[_COMMUNITY_Module 296|Module 296]]
- [[_COMMUNITY_Module 297|Module 297]]
- [[_COMMUNITY_Module 298|Module 298]]
- [[_COMMUNITY_Module 299|Module 299]]
- [[_COMMUNITY_Module 300|Module 300]]
- [[_COMMUNITY_Module 301|Module 301]]
- [[_COMMUNITY_Module 302|Module 302]]
- [[_COMMUNITY_Module 303|Module 303]]
- [[_COMMUNITY_Module 304|Module 304]]
- [[_COMMUNITY_Module 305|Module 305]]
- [[_COMMUNITY_Module 306|Module 306]]
- [[_COMMUNITY_Module 307|Module 307]]
- [[_COMMUNITY_Module 308|Module 308]]
- [[_COMMUNITY_Module 309|Module 309]]
- [[_COMMUNITY_Module 310|Module 310]]
- [[_COMMUNITY_Module 311|Module 311]]
- [[_COMMUNITY_Module 312|Module 312]]
- [[_COMMUNITY_Module 313|Module 313]]
- [[_COMMUNITY_Module 314|Module 314]]
- [[_COMMUNITY_Module 315|Module 315]]
- [[_COMMUNITY_Module 316|Module 316]]
- [[_COMMUNITY_Module 317|Module 317]]
- [[_COMMUNITY_Module 318|Module 318]]
- [[_COMMUNITY_Module 319|Module 319]]
- [[_COMMUNITY_Module 320|Module 320]]
- [[_COMMUNITY_Module 321|Module 321]]
- [[_COMMUNITY_Module 322|Module 322]]

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
- **Frontend Audit Suite** — apo_audit_document, aad_audit_document, afe_audit_document, r3_reaudit_document [EXTRACTED 1.00]
- **Dashboard Role-Based Routing** — aad_DashboardPage, aad_DashboardEmployeePage, aad_DashboardManagerPage, aad_DashboardHrPage, aad_DashboardAdminPage [EXTRACTED 1.00]
- **MongoDB Database Seed Collections** — spl_UsersCollection, spl_SectorsCollection, spl_CampaignsCollection, spl_FormsCollection, spl_EvaluationsCollection, spl_OffboardingRequestsCollection, spl_EventsCollection, spl_ResourcesCollection, spl_NotificationsCollection, spl_AuditLogsCollection, spl_ConfigsCollection, spl_MailTemplatesCollection, srep_SeedScript [EXTRACTED 1.00]
- **Evaluation Status Lifecycle** — spl_EvaluationsCollection, afe_EvaluationDetailPage, afe_EvaluationsPage, afe_EvaluationsAPI [INFERRED 0.85]
- **NX-RH Form Types Taxonomy** — spl_SelfEvaluationForm, spl_ManagerEvaluationForm, spl_UpwardFeedbackForm, spl_ObjectivesForm, spl_MobilityRequestForm, spl_PromotionRequestForm [EXTRACTED 1.00]
- **Frontend Authentication Flow** — aad_LoginPage, aad_LoginLdapPage, aad_AuthGuard, aad_AuthContext, aad_AuthAPI [EXTRACTED 1.00]

## Communities

### Community 0 - "Module 0"
Cohesion: 0.02
Nodes (64): Admin(), AdminAudit(), AdminCommunications(), AdminCompliance(), AdminIntegrations(), AdminOrgChart(), AdminRoles(), AdminSandbox() (+56 more)

### Community 1 - "Module 1"
Cohesion: 0.02
Nodes (26): authGuard(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp(), buildApp() (+18 more)

### Community 2 - "Module 2"
Cohesion: 0.03
Nodes (99): Admin Settings HTML Design, Admin Portal (/admin), AuthContext (user, loading, logout), AuthedLayout (AppTopbar + Outlet shell), CLAUDE.md Conventions (AI agent source of truth), Employee Portal (/employee), Evaluation Routes (/evaluation/:evalId), HR Portal (/hr) (+91 more)

### Community 3 - "Module 3"
Cohesion: 0.03
Nodes (83): NanoXplore RH Platform (self-hosted HR evaluation), Admin Role (full system access, user & org management), Employee Role (self-evaluation participation, own data only), HR Role (transverse process piloting, campaigns & templates), Manager Role (N+1 hierarchical, team interviews & evaluations), 6-Phase Annual Evaluation Cycle (Preparation → Entretien), Templates-Before-Campaign Rule (HR must create form templates before launching campaigns), Auth API Endpoints (POST /api/auth/login, /logout, GET /me) (+75 more)

### Community 4 - "Module 4"
Cohesion: 0.05
Nodes (65): Auth API (/api/auth/*), AuthContext, AuthGuard, Campaigns API (/api/campaigns), DashboardAdminPage, DashboardEmployeePage, DashboardHrPage, DashboardManagerPage (+57 more)

### Community 5 - "Module 5"
Cohesion: 0.07
Nodes (54): /api/auth Endpoint Group (login, logout, me, preferences), /api/evaluations Endpoint, Backend Audit Report 5 Bugs Fixed, Employee Role QA Audit, Frontend Global Audit (14 bugs, 27 tests), Manager Role QA Audit, BUG-2: Evaluatee Cannot Sign Critical Fix, BUG-5: Manager Cross-Eval Unauthorized Access (+46 more)

### Community 6 - "Module 6"
Cohesion: 0.08
Nodes (50): Admin Pages Documentation (10 pages), /api/admin/audit Endpoint, /api/campaigns Endpoint, POST /api/evaluations/bulk, /api/forms Endpoint, /api/users Endpoint, POST /api/users, GET /api/users (+42 more)

### Community 7 - "Module 7"
Cohesion: 0.1
Nodes (44): Auth Guard Middleware, Error Handler Middleware, Express Server, Rate Limiter Middleware, AuditLog Model, Docker Compose Deployment, Backend Environment Variables, Health Check Endpoint (+36 more)

### Community 8 - "Module 8"
Cohesion: 0.07
Nodes (25): formatAnswer(), sanitizeAnonymity(), handleUpdate(), _sendStatusNotifications(), handleN1Context(), handlePdf(), _renderPdf(), _renderQuestions() (+17 more)

### Community 9 - "Module 9"
Cohesion: 0.06
Nodes (39): POST /api/auth/login, GET /api/auth/me, POST /api/campaigns/:id/clone, POST /api/campaigns, GET /api/campaigns/:id, GET /api/campaigns, PATCH /api/campaigns/:id, GET /api/evaluations (+31 more)

### Community 10 - "Module 10"
Cohesion: 0.06
Nodes (19): auth(), runTests(), run(), run(), run(), run(), run(), run() (+11 more)

### Community 11 - "Module 11"
Cohesion: 0.07
Nodes (16): connect(), seedCampaignsForms(), seedDemo(), ago(), seedEvaluationsActivities(), upsertEval(), seedAll(), fullSelfAnswers() (+8 more)

### Community 12 - "Module 12"
Cohesion: 0.11
Nodes (31): API: /api/admin endpoints, API: /api/analytics endpoints, API: /api/auth endpoints, API: /api/campaigns endpoints, API: /api/evaluations endpoints, API: /api/events endpoints, API: /api/forms endpoints, API: /api/offboarding endpoints (+23 more)

### Community 13 - "Module 13"
Cohesion: 0.13
Nodes (30): LDAP / Active Directory Integration, Admin Role, Admin Route /api/admin, SMTP Email Configuration, Analytics Route /api/analytics, Audit Log, Audit Route /api/admin/audit, Auth Route /api/auth (+22 more)

### Community 14 - "Module 14"
Cohesion: 0.11
Nodes (10): renderCampaignDetail(), renderFormDetail(), createWrapper(), makeUser(), renderWithProviders(), setMockUser(), renderTopbar(), renderWithAuth() (+2 more)

### Community 15 - "Module 15"
Cohesion: 0.13
Nodes (20): GET /api/evaluations/:id, GET /api/evaluations/:id/pdf, PATCH /api/evaluations/:id, Component: EvaluationForm, Component: SignaturePanel, Flow 4: Processus évaluation complet, Flow 4D: Chaîne de signatures, Notification: evaluationAssigned (+12 more)

### Community 16 - "Module 16"
Cohesion: 0.11
Nodes (3): fetchCampaigns(), fetchEvals(), apiFetch()

### Community 17 - "Module 17"
Cohesion: 0.15
Nodes (8): applyConfig(), buildExportCSS(), DevDesignLab(), ensureFont(), injectCSS(), load(), readFromDOM(), syncTopbarNav()

### Community 18 - "Module 18"
Cohesion: 0.14
Nodes (5): handlePaste(), parseAndValidate(), reset(), validateForm(), handleReset()

### Community 20 - "Module 20"
Cohesion: 0.22
Nodes (4): EvalDrawer(), ExpiryBadge(), fmtDate(), getDaysUntilExpiry()

### Community 22 - "Module 22"
Cohesion: 0.51
Nodes (9): bindAsync(), getVal(), makeClient(), previewUsers(), searchAsync(), syncUsers(), testConnection(), unbindAsync() (+1 more)

### Community 26 - "Module 26"
Cohesion: 0.29
Nodes (1): Skeleton()

### Community 28 - "Module 28"
Cohesion: 0.4
Nodes (2): isSameDay(), isToday()

### Community 29 - "Module 29"
Cohesion: 0.53
Nodes (4): addToast(), dismissAllToasts(), dismissToast(), notify()

### Community 31 - "Module 31"
Cohesion: 0.47
Nodes (4): handleSubmit(), inputCls(), isDisabled(), validate()

### Community 32 - "Module 32"
Cohesion: 0.4
Nodes (2): getIconConfig(), NotificationCard()

### Community 33 - "Module 33"
Cohesion: 0.47
Nodes (3): CalendarWidget(), getDaysInMonth(), getFirstDayOfWeek()

### Community 34 - "Module 34"
Cohesion: 0.4
Nodes (2): EditModal(), toInputDate()

### Community 35 - "Module 35"
Cohesion: 0.33
Nodes (6): GET /api/hr/flags/count, Component: AppLayout, Component: Breadcrumbs, Component: Navbar, Component: NotificationBell, Component: Toast / ToastContainer

### Community 36 - "Module 36"
Cohesion: 0.4
Nodes (1): Toast()

### Community 40 - "Module 40"
Cohesion: 0.5
Nodes (2): buildLayout(), countLeaves()

### Community 41 - "Module 41"
Cohesion: 0.5
Nodes (2): handleSave(), validate()

### Community 42 - "Module 42"
Cohesion: 0.5
Nodes (2): handleSubmit(), validate()

### Community 43 - "Module 43"
Cohesion: 0.6
Nodes (3): buildFilter(), createClient(), getConfig()

### Community 47 - "Module 47"
Cohesion: 0.67
Nodes (2): formatDate(), formatRelativeDate()

### Community 48 - "Module 48"
Cohesion: 0.67
Nodes (2): Avatar(), getColorFromName()

### Community 50 - "Module 50"
Cohesion: 0.5
Nodes (2): clsx(), cn()

### Community 54 - "Module 54"
Cohesion: 0.67
Nodes (2): handleSubmit(), validate()

### Community 62 - "Module 62"
Cohesion: 0.67
Nodes (2): allowedNotifKeysFor(), filterNotifPrefsByRole()

### Community 63 - "Module 63"
Cohesion: 0.83
Nodes (3): getBrandSubForRole(), getNavItemsForRole(), resolveRole()

### Community 64 - "Module 64"
Cohesion: 0.67
Nodes (2): getLocale(), makeT()

### Community 65 - "Module 65"
Cohesion: 1.0
Nodes (3): computeDonePhases(), computeProgress(), EvaluationSummary()

### Community 66 - "Module 66"
Cohesion: 0.5
Nodes (4): POST /api/forms, POST /api/forms/import, Component: QuestionBuilder, S-14 /forms/new — Créer formulaire

### Community 67 - "Module 67"
Cohesion: 0.5
Nodes (4): GET /api/notifications, Domain Concept: Notification, i18n namespace: notifications, S-xx /notifications — Page notifications

### Community 68 - "Module 68"
Cohesion: 1.0
Nodes (2): header(), main()

### Community 69 - "Module 69"
Cohesion: 1.0
Nodes (2): cleanup(), run()

### Community 70 - "Module 70"
Cohesion: 0.67
Nodes (1): App()

### Community 81 - "Module 81"
Cohesion: 1.0
Nodes (2): allowedNotifKeysFor(), filterNotifPrefsByRole()

### Community 83 - "Module 83"
Cohesion: 1.0
Nodes (2): getModel(), notify()

### Community 85 - "Module 85"
Cohesion: 1.0
Nodes (2): fmtDate(), ProfileSection()

### Community 86 - "Module 86"
Cohesion: 1.0
Nodes (2): RoleSpaceSection(), spacesFor()

### Community 88 - "Module 88"
Cohesion: 0.67
Nodes (3): GET /api/users/:id, Component: OnboardingSteps, S-06 /users/:id — Profil utilisateur

### Community 89 - "Module 89"
Cohesion: 0.67
Nodes (3): GET /api/analytics/campaigns/:id, GET /api/analytics/export/csv, S-12 /campaigns/:id/analytics — Analytique campagne

### Community 90 - "Module 90"
Cohesion: 1.0
Nodes (3): POST /api/forms/:id/freeze, Flow 3: Gestion formulaire, Notification: formFrozen

### Community 152 - "Module 152"
Cohesion: 1.0
Nodes (2): Content Security Policy (CSP) via Helmet + HTML meta tag, Helmet HTTP Security Headers (X-Frame-Options, nosniff, Referrer-Policy)

### Community 153 - "Module 153"
Cohesion: 1.0
Nodes (2): NX Monogram Favicon (red, square, rounded), NanoXplore Full Wordmark Logo (red NX + dark text)

### Community 154 - "Module 154"
Cohesion: 1.0
Nodes (2): PATCH /api/evaluations/:id/reassign, S-xx /evaluations — Liste évaluations

### Community 155 - "Module 155"
Cohesion: 1.0
Nodes (2): PATCH /api/auth/preferences, S-32 /profile/preferences — Préférences

### Community 156 - "Module 156"
Cohesion: 1.0
Nodes (2): PATCH /api/users/:id, S-07 /users/:id/edit — Modifier utilisateur

### Community 157 - "Module 157"
Cohesion: 1.0
Nodes (2): PATCH /api/users/:id/offboard, S-08 /users/:id/offboarding — Offboarding redirect

### Community 158 - "Module 158"
Cohesion: 1.0
Nodes (2): POST /api/hr/notifications/bulk-remind, Notification: deadlineReminder

### Community 159 - "Module 159"
Cohesion: 1.0
Nodes (2): Flow 5: Onboarding utilisateur, Notification: onboardingComplete

### Community 160 - "Module 160"
Cohesion: 1.0
Nodes (2): Flow 6: Processus offboarding, Notification: offboardingInitiated

### Community 290 - "Module 290"
Cohesion: 1.0
Nodes (1): Development Docker Compose Override (Vite HMR + nodemon)

### Community 291 - "Module 291"
Cohesion: 1.0
Nodes (1): Lucide React Icons (SVG stroke only)

### Community 292 - "Module 292"
Cohesion: 1.0
Nodes (1): Login Page (/login)

### Community 293 - "Module 293"
Cohesion: 1.0
Nodes (1): LocaleContext (i18n, fr/en)

### Community 294 - "Module 294"
Cohesion: 1.0
Nodes (1): HR Sidebar Navigation (Dashboard, Team Hub, Talent Journey, Performance, Insights, Settings)

### Community 295 - "Module 295"
Cohesion: 1.0
Nodes (1): Notification Center Widget (evaluation prompts, HR messages)

### Community 296 - "Module 296"
Cohesion: 1.0
Nodes (1): Bilan Annuel Card (Strengths & Growth Areas)

### Community 297 - "Module 297"
Cohesion: 1.0
Nodes (1): Design System CSS Audit

### Community 298 - "Module 298"
Cohesion: 1.0
Nodes (1): S-xx /analytics — Analytics globaux

### Community 299 - "Module 299"
Cohesion: 1.0
Nodes (1): S-xx /profile — Mon profil

### Community 300 - "Module 300"
Cohesion: 1.0
Nodes (1): POST /api/auth/logout

### Community 301 - "Module 301"
Cohesion: 1.0
Nodes (1): DELETE /api/users/:id

### Community 302 - "Module 302"
Cohesion: 1.0
Nodes (1): POST /api/users/import

### Community 303 - "Module 303"
Cohesion: 1.0
Nodes (1): GET /api/users/:id/gdpr-export

### Community 304 - "Module 304"
Cohesion: 1.0
Nodes (1): POST /api/evaluations

### Community 305 - "Module 305"
Cohesion: 1.0
Nodes (1): PATCH /api/evaluations/bulk

### Community 306 - "Module 306"
Cohesion: 1.0
Nodes (1): GET /api/forms/:id

### Community 307 - "Module 307"
Cohesion: 1.0
Nodes (1): PATCH /api/forms/:id

### Community 308 - "Module 308"
Cohesion: 1.0
Nodes (1): GET /api/org/sectors

### Community 309 - "Module 309"
Cohesion: 1.0
Nodes (1): PATCH /api/hr/flags/:evalId/status

### Community 310 - "Module 310"
Cohesion: 1.0
Nodes (1): GET /api/analytics/summary

### Community 311 - "Module 311"
Cohesion: 1.0
Nodes (1): PATCH /api/notifications/read-all

### Community 312 - "Module 312"
Cohesion: 1.0
Nodes (1): POST /api/notifications/global-remind

### Community 313 - "Module 313"
Cohesion: 1.0
Nodes (1): Component: PageHeader

### Community 314 - "Module 314"
Cohesion: 1.0
Nodes (1): Component: EmptyState

### Community 315 - "Module 315"
Cohesion: 1.0
Nodes (1): Component: StatCard

### Community 316 - "Module 316"
Cohesion: 1.0
Nodes (1): Component: Avatar

### Community 317 - "Module 317"
Cohesion: 1.0
Nodes (1): Component: Modal / ConfirmDialog

### Community 318 - "Module 318"
Cohesion: 1.0
Nodes (1): Component: Button

### Community 319 - "Module 319"
Cohesion: 1.0
Nodes (1): Component: FilterBar

### Community 320 - "Module 320"
Cohesion: 1.0
Nodes (1): Component: NotificationItem

### Community 321 - "Module 321"
Cohesion: 1.0
Nodes (1): Notification: evaluationExpired

### Community 322 - "Module 322"
Cohesion: 1.0
Nodes (1): Eval Status: expired

## Knowledge Gaps
- **169 isolated node(s):** `Sector Data Model (MongoDB)`, `Analytics API Routes (/api/analytics)`, `Org Chart API Routes (/api/org)`, `HR Flags API Routes (/api/hr/flags)`, `Development Docker Compose Override (Vite HMR + nodemon)` (+164 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Module 26`** (7 nodes): `Skeleton.jsx`, `Skeleton.tsx`, `Skeleton()`, `SkeletonCard()`, `SkeletonStat()`, `SkeletonTable()`, `SkeletonText()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 28`** (6 nodes): `DatePicker.tsx`, `getDaysInMonth()`, `handleClickOutside()`, `isOutOfRange()`, `isSameDay()`, `isToday()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 32`** (6 nodes): `NotificationsPage.tsx`, `formatRelativeTime()`, `getIconConfig()`, `groupNotifications()`, `NotificationCard()`, `NotificationSkeleton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 34`** (6 nodes): `HRCampaignDetail.jsx`, `AssignModal()`, `CmpReassignModal()`, `DeleteConfirmModal()`, `EditModal()`, `toInputDate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 36`** (5 nodes): `Toast.jsx`, `Toast.tsx`, `showToast()`, `Toast()`, `Toaster()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 40`** (5 nodes): `OrgPage.tsx`, `buildLayout()`, `countLeaves()`, `initials()`, `OrgNodeSVG()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 41`** (5 nodes): `FormNewPage.tsx`, `handleSave()`, `moveQuestion()`, `newQuestion()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 42`** (5 nodes): `UserNewPage.tsx`, `handleSubmit()`, `inputCls()`, `useToast()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 47`** (4 nodes): `formatDate.ts`, `formatDate()`, `formatDateTime()`, `formatRelativeDate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 48`** (4 nodes): `Avatar.tsx`, `Avatar()`, `getColorFromName()`, `getInitials()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 50`** (4 nodes): `Input.tsx`, `cn.ts`, `clsx()`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 54`** (4 nodes): `LoginLdapPage.tsx`, `FieldError()`, `handleSubmit()`, `validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 62`** (4 nodes): `users.js`, `allowedNotifKeysFor()`, `escapeRegex()`, `filterNotifPrefsByRole()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 64`** (4 nodes): `index.js`, `getLocale()`, `makeT()`, `setLocale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 68`** (3 nodes): `header()`, `main()`, `run.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 69`** (3 nodes): `cleanup()`, `run()`, `seed.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 70`** (3 nodes): `App.jsx`, `App.tsx`, `App()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 81`** (3 nodes): `auth.js`, `allowedNotifKeysFor()`, `filterNotifPrefsByRole()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 83`** (3 nodes): `notificationHelper.js`, `getModel()`, `notify()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 85`** (3 nodes): `ProfileSection.jsx`, `fmtDate()`, `ProfileSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 86`** (3 nodes): `RoleSpaceSection.jsx`, `RoleSpaceSection()`, `spacesFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 152`** (2 nodes): `Content Security Policy (CSP) via Helmet + HTML meta tag`, `Helmet HTTP Security Headers (X-Frame-Options, nosniff, Referrer-Policy)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 153`** (2 nodes): `NX Monogram Favicon (red, square, rounded)`, `NanoXplore Full Wordmark Logo (red NX + dark text)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 154`** (2 nodes): `PATCH /api/evaluations/:id/reassign`, `S-xx /evaluations — Liste évaluations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 155`** (2 nodes): `PATCH /api/auth/preferences`, `S-32 /profile/preferences — Préférences`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 156`** (2 nodes): `PATCH /api/users/:id`, `S-07 /users/:id/edit — Modifier utilisateur`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 157`** (2 nodes): `PATCH /api/users/:id/offboard`, `S-08 /users/:id/offboarding — Offboarding redirect`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 158`** (2 nodes): `POST /api/hr/notifications/bulk-remind`, `Notification: deadlineReminder`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 159`** (2 nodes): `Flow 5: Onboarding utilisateur`, `Notification: onboardingComplete`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 160`** (2 nodes): `Flow 6: Processus offboarding`, `Notification: offboardingInitiated`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 290`** (1 nodes): `Development Docker Compose Override (Vite HMR + nodemon)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 291`** (1 nodes): `Lucide React Icons (SVG stroke only)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 292`** (1 nodes): `Login Page (/login)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 293`** (1 nodes): `LocaleContext (i18n, fr/en)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 294`** (1 nodes): `HR Sidebar Navigation (Dashboard, Team Hub, Talent Journey, Performance, Insights, Settings)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 295`** (1 nodes): `Notification Center Widget (evaluation prompts, HR messages)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 296`** (1 nodes): `Bilan Annuel Card (Strengths & Growth Areas)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 297`** (1 nodes): `Design System CSS Audit`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 298`** (1 nodes): `S-xx /analytics — Analytics globaux`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 299`** (1 nodes): `S-xx /profile — Mon profil`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 300`** (1 nodes): `POST /api/auth/logout`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 301`** (1 nodes): `DELETE /api/users/:id`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 302`** (1 nodes): `POST /api/users/import`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 303`** (1 nodes): `GET /api/users/:id/gdpr-export`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 304`** (1 nodes): `POST /api/evaluations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 305`** (1 nodes): `PATCH /api/evaluations/bulk`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 306`** (1 nodes): `GET /api/forms/:id`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 307`** (1 nodes): `PATCH /api/forms/:id`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 308`** (1 nodes): `GET /api/org/sectors`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 309`** (1 nodes): `PATCH /api/hr/flags/:evalId/status`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 310`** (1 nodes): `GET /api/analytics/summary`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 311`** (1 nodes): `PATCH /api/notifications/read-all`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 312`** (1 nodes): `POST /api/notifications/global-remind`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 313`** (1 nodes): `Component: PageHeader`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 314`** (1 nodes): `Component: EmptyState`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 315`** (1 nodes): `Component: StatCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 316`** (1 nodes): `Component: Avatar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 317`** (1 nodes): `Component: Modal / ConfirmDialog`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 318`** (1 nodes): `Component: Button`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 319`** (1 nodes): `Component: FilterBar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 320`** (1 nodes): `Component: NotificationItem`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 321`** (1 nodes): `Notification: evaluationExpired`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 322`** (1 nodes): `Eval Status: expired`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `S-03 / — Tableau de bord (5 variantes)` connect `Module 9` to `Module 5`, `Module 6`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `Manager Role` connect `Module 5` to `Module 9`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 40 inferred relationships involving `useAuth()` (e.g. with `RoleGuard()` and `AuthGuard()`) actually correct?**
  _`useAuth()` has 40 INFERRED edges - model-reasoned connections that need verification._
- **Are the 25 inferred relationships involving `authGuard()` (e.g. with `buildApp()` and `buildApp()`) actually correct?**
  _`authGuard()` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `useTranslate()` (e.g. with `Settings()` and `FormBuilder()`) actually correct?**
  _`useTranslate()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `runTests()` (e.g. with `run()` and `run()`) actually correct?**
  _`runTests()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Sector Data Model (MongoDB)`, `Analytics API Routes (/api/analytics)`, `Org Chart API Routes (/api/org)` to the rest of the system?**
  _169 weakly-connected nodes found - possible documentation gaps or missing edges._