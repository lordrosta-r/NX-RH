# Graph Report - frontend-v2/specs  (2026-05-05)

## Corpus Check
- 21 files · ~78,016 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 169 nodes · 158 edges · 43 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Evaluation Core|Evaluation Core]]
- [[_COMMUNITY_Frontend Architecture|Frontend Architecture]]
- [[_COMMUNITY_Design System Tokens|Design System Tokens]]
- [[_COMMUNITY_Security & RBAC Audit|Security & RBAC Audit]]
- [[_COMMUNITY_Notifications & Navigation|Notifications & Navigation]]
- [[_COMMUNITY_P1 Blockers Audit|P1 Blockers Audit]]
- [[_COMMUNITY_Auth & Campaigns|Auth & Campaigns]]
- [[_COMMUNITY_Users Org & Offboarding|Users Org & Offboarding]]
- [[_COMMUNITY_Forms & Question Types|Forms & Question Types]]
- [[_COMMUNITY_Audit Findings Overview|Audit Findings Overview]]
- [[_COMMUNITY_Admin & LDAP|Admin & LDAP]]
- [[_COMMUNITY_UI Shared Components|UI Shared Components]]
- [[_COMMUNITY_Features Matrix|Features Matrix]]
- [[_COMMUNITY_Notification Models|Notification Models]]
- [[_COMMUNITY_Analytics Module|Analytics Module]]
- [[_COMMUNITY_Manager Notifications|Manager Notifications]]
- [[_COMMUNITY_Page Layout Components|Page Layout Components]]
- [[_COMMUNITY_Admin Config & Audit Log|Admin Config & Audit Log]]
- [[_COMMUNITY_Role Admin|Role: Admin]]
- [[_COMMUNITY_Role RH|Role: RH]]
- [[_COMMUNITY_Role Director|Role: Director]]
- [[_COMMUNITY_Role Manager|Role: Manager]]
- [[_COMMUNITY_Role Employee|Role: Employee]]
- [[_COMMUNITY_Calendar Module|Calendar Module]]
- [[_COMMUNITY_Resources Module|Resources Module]]
- [[_COMMUNITY_Import Module|Import Module]]
- [[_COMMUNITY_Mail Templates|Mail Templates]]
- [[_COMMUNITY_Deadline Reminder|Deadline Reminder]]
- [[_COMMUNITY_System Alerts|System Alerts]]
- [[_COMMUNITY_Evaluation Expired|Evaluation Expired]]
- [[_COMMUNITY_Evaluation Reassigned|Evaluation Reassigned]]
- [[_COMMUNITY_Error Boundary|Error Boundary]]
- [[_COMMUNITY_Mobile Drawer|Mobile Drawer]]
- [[_COMMUNITY_Data Card|Data Card]]
- [[_COMMUNITY_Stat Card|Stat Card]]
- [[_COMMUNITY_Users Feature|Users Feature]]
- [[_COMMUNITY_Forms Feature|Forms Feature]]
- [[_COMMUNITY_Resources Feature|Resources Feature]]
- [[_COMMUNITY_Card Component|Card Component]]
- [[_COMMUNITY_UsersMe Audit|Users/Me Audit]]
- [[_COMMUNITY_Event Model|Event Model]]
- [[_COMMUNITY_Resource Model|Resource Model]]
- [[_COMMUNITY_Routes List|Routes List]]

## God Nodes (most connected - your core abstractions)
1. `API: Evaluations Endpoints (/api/evaluations)` - 16 edges
2. `NX-RH Frontend v2 Master Spec` - 11 edges
3. `Tailwind Config Complete NX Design System` - 10 edges
4. `Component: Navbar` - 7 edges
5. `Module Évaluations` - 6 edges
6. `Evaluation State Machine` - 6 edges
7. `Pre-Frontend Audit Report v2` - 5 edges
8. `Flux 4 — Processus complet évaluation` - 5 edges
9. `API: Campaigns Endpoints (/api/campaigns)` - 5 edges
10. `Evaluation Management Module` - 5 edges

## Surprising Connections (you probably didn't know these)
- `NX-RH Frontend v2 Master Spec` --references--> `Internationalisation (i18n) Spec`  [INFERRED]
  NX-RH/frontend-v2/specs/00-master.md → NX-RH/frontend-v2/specs/08-i18n.md
- `Pre-Frontend Audit Report v1` --references--> `Pre-Frontend Audit Report v2`  [INFERRED]
  NX-RH/frontend-v2/specs/AUDIT_REPORT.md → NX-RH/frontend-v2/specs/AUDIT_REPORT_V2.md
- `Frontend Scaffold Missing (frontend-v2/src/)` --references--> `Frontend Tech Stack`  [INFERRED]
  NX-RH/frontend-v2/specs/AUDIT_REPORT_V2.md → NX-RH/frontend-v2/specs/00-master.md
- `Component: SignaturePanel` --implements--> `Evaluation State Machine`  [INFERRED]
  NX-RH/frontend-v2/specs/06-components.md → NX-RH/frontend-v2/specs/07-api-contract.md
- `Component: EvaluationForm` --references--> `API: Evaluations Endpoints (/api/evaluations)`  [INFERRED]
  NX-RH/frontend-v2/specs/06-components.md → NX-RH/frontend-v2/specs/07-api-contract.md

## Hyperedges (group relationships)
- **Evaluation State Machine: assigned→in_progress→submitted→reviewed→signed_evaluatee→signed_manager→signed_hr→validated** — 07api_evaluation_state_machine, 00master_role_employee, 00master_role_manager, 00master_role_hr, 00master_role_admin, 04flows_flux4_evaluation [EXTRACTED 1.00]
- **Notification Types Catalog (20 types)** — 05notif_campaign_launch, 05notif_evaluation_assigned, 05notif_evaluation_submitted, 05notif_deadline_reminder, 05notif_manager_action_required, 05notif_system_alerts, 05notif_evaluation_reviewed, 05notif_evaluation_signed_evaluatee, 05notif_evaluation_signed_manager, 05notif_evaluation_signed_hr, 05notif_evaluation_validated, 05notif_evaluation_expired, 05notif_evaluation_reassigned, 05notif_form_frozen, 05notif_offboarding_initiated, 05notif_offboarding_completed, 05notif_ldap_sync_complete, 05notif_ldap_sync_failed, 05notif_onboarding_complete, 05notif_bulk_created [EXTRACTED 1.00]
- **Frontend Tech Stack: React 18 + Vite + TS + Tailwind + React Router v6 + TanStack Query + Zustand + RHF + Zod** — 00master_tech_stack, 00master_state_management, 00master_api_layer, 00master_routing, 08i18n_react_i18next [EXTRACTED 1.00]
- **RBAC: 5 roles governing module access** — 00master_role_admin, 00master_role_hr, 00master_role_director, 00master_role_manager, 00master_role_employee, 07api_auth_endpoints, 07api_users_endpoints, 07api_campaigns_endpoints, 07api_evaluations_endpoints [EXTRACTED 1.00]
- **Audit Remediation: P0+P1 fixes enabling frontend start** — audit1_audit_report, audit2_audit_report_v2, audit2_p0_hr_validation_bug, audit2_p0_bulk_auth_bug, audit2_840_tests, audit2_frontend_scaffold_missing [EXTRACTED 1.00]
- **Layout Component Hierarchy: AppLayout→Navbar→PageContainer→PageHeader** — 06comp_app_layout, 06comp_navbar, 06comp_admin_navbar, 06comp_page_container, 06comp_page_header, 06comp_breadcrumbs [EXTRACTED 1.00]
- **RBAC Role System (5 roles)** — features_role_admin, features_role_hr, features_role_director, features_role_manager, features_role_employee [EXTRACTED 1.00]
- **NX Design System Tokens** — design_color_primary_teal, design_color_neutral_slate, design_typography_inter, design_spacing_navbar, design_tailwind_config [EXTRACTED 1.00]
- **Blocking Issues Before Frontend Coding** — audit_p1_notif_missing, audit_p1_dashboard_missing, audit_p1_users_me_missing [EXTRACTED 1.00]

## Communities

### Community 0 - "Evaluation Core"
Cohesion: 0.14
Nodes (21): INC-01: signed_evaluatee status name resolution, INC-02: reviewerScore 0-100 resolution, Module Évaluations, Flux 4 — Processus complet évaluation, Notification: evaluationBulkCreated, Notification: evaluationAssigned, Notification: evaluationReviewed, Notification: evaluationSignedByEvaluatee (+13 more)

### Community 1 - "Frontend Architecture"
Cohesion: 0.12
Nodes (19): API Layer (Axios + interceptors), Module Demandes RH (HR Flags), NX-RH Frontend v2 Master Spec, Routing (React Router v6), State Management Strategy, Frontend Tech Stack, Screens Inventory (44 screens), UX Flows & Interaction Patterns (+11 more)

### Community 2 - "Design System Tokens"
Cohesion: 0.14
Nodes (14): Shimmer Animation (1.5s), Brand NX-RH NanoXplore RH, Error Color Red (#EF4444), Neutral Color Slate Palette, Primary Color NX-Teal (#17A8D4), Success Color Green (#22C55E), Warning Color Amber (#F59E0B), Button Component Variants (+6 more)

### Community 3 - "Security & RBAC Audit"
Cohesion: 0.14
Nodes (14): P2: CSV Formula Injection in Export, P2: RBAC Manager Can Edit Any Evaluation Answers, Security: RBAC Gaps Identified, Analytics Module, Evaluation Management Module, N-1 Context Import Feature, RGPD Export Feature, Director Role (N+2) (+6 more)

### Community 4 - "Notifications & Navigation"
Cohesion: 0.18
Nodes (13): Module Notifications, Navbar Architecture (role-based), NotificationBell Component (UI), Toast Component (UI), Component: AdminNavbar, Component: AppLayout, Component: Breadcrumbs, Component: NavDropdown (+5 more)

### Community 5 - "P1 Blockers Audit"
Cohesion: 0.18
Nodes (11): P1: GET /api/dashboard Absent, Security: JWT HttpOnly Cookie Auth, Security: NoSQL Injection Risk (express-mongo-sanitize absent), LDAP Authentication (No Reset Password), Authentication Module, Offboarding Module, Org Chart Module, Admin Role (+3 more)

### Community 6 - "Auth & Campaigns"
Cohesion: 0.33
Nodes (10): Module Auth & Profil, Module Campagnes, S-01: /login — Connexion, S-02: /login/ldap — Connexion LDAP, S-03: / — Tableau de bord (5 variantes), Flux 1 — Connexion, Flux 2 — Création campagne, Notification: campaignLaunch (+2 more)

### Community 7 - "Users Org & Offboarding"
Cohesion: 0.25
Nodes (9): Module Offboarding, Module Organigramme, Module Utilisateurs, Notification: offboardingCompleted, Notification: offboardingInitiated, Notification: onboardingComplete, Component: OrgChart, API: Org Endpoints (/api/org) (+1 more)

### Community 8 - "Forms & Question Types"
Cohesion: 0.4
Nodes (6): INC-05: QuestionType 7 types resolution, Module Formulaires, Flux 3 — Gestion formulaire, Notification: formFrozen, Component: QuestionBuilder, API: Forms Endpoints (/api/forms)

### Community 9 - "Audit Findings Overview"
Cohesion: 0.33
Nodes (6): API Parity: 73/75 Endpoints Conformant, Features Audit: 97% Backend Complete, Flows Audit: UX Flows Coverage, Screens Audit: 44 Screens Defined, Audit Verdict: Ready with 3 Reservations, Test Coverage: 705 Tests Passing

### Community 10 - "Admin & LDAP"
Cohesion: 0.83
Nodes (4): Module Administration, Notification: ldapSyncComplete, Notification: ldapSyncFailed, API: Admin Endpoints (/api/admin)

### Community 11 - "UI Shared Components"
Cohesion: 0.67
Nodes (3): Component: DataTable, Component: EmptyState, Component: LoadingPage

### Community 12 - "Features Matrix"
Cohesion: 0.67
Nodes (3): Campaign Management Module, HR Flags Module, HR Role

### Community 13 - "Notification Models"
Cohesion: 0.67
Nodes (3): P1: Notification System Absent, Notification Module, Notification Model (ABSENT - P1)

### Community 14 - "Analytics Module"
Cohesion: 1.0
Nodes (2): Module Analytique, API: Analytics Endpoints (/api/analytics)

### Community 15 - "Manager Notifications"
Cohesion: 1.0
Nodes (2): INC-07: managerActionRequired recipient resolution, Notification: managerActionRequired

### Community 16 - "Page Layout Components"
Cohesion: 1.0
Nodes (2): Component: PageContainer, Component: PageHeader

### Community 17 - "Admin Config & Audit Log"
Cohesion: 1.0
Nodes (2): Admin Config Module, AuditLog Mongoose Model

### Community 18 - "Role: Admin"
Cohesion: 1.0
Nodes (1): Role: admin

### Community 19 - "Role: RH"
Cohesion: 1.0
Nodes (1): Role: hr

### Community 20 - "Role: Director"
Cohesion: 1.0
Nodes (1): Role: director

### Community 21 - "Role: Manager"
Cohesion: 1.0
Nodes (1): Role: manager

### Community 22 - "Role: Employee"
Cohesion: 1.0
Nodes (1): Role: employee

### Community 23 - "Calendar Module"
Cohesion: 1.0
Nodes (1): Module Calendrier & Événements

### Community 24 - "Resources Module"
Cohesion: 1.0
Nodes (1): Module Ressources

### Community 25 - "Import Module"
Cohesion: 1.0
Nodes (1): Module Import Utilisateurs

### Community 26 - "Mail Templates"
Cohesion: 1.0
Nodes (1): Module Templates Mail

### Community 27 - "Deadline Reminder"
Cohesion: 1.0
Nodes (1): Notification: deadlineReminder

### Community 28 - "System Alerts"
Cohesion: 1.0
Nodes (1): Notification: systemAlerts

### Community 29 - "Evaluation Expired"
Cohesion: 1.0
Nodes (1): Notification: evaluationExpired

### Community 30 - "Evaluation Reassigned"
Cohesion: 1.0
Nodes (1): Notification: evaluationReassigned

### Community 31 - "Error Boundary"
Cohesion: 1.0
Nodes (1): Component: ErrorBoundary

### Community 32 - "Mobile Drawer"
Cohesion: 1.0
Nodes (1): Component: MobileDrawer

### Community 33 - "Data Card"
Cohesion: 1.0
Nodes (1): Component: DataCard

### Community 34 - "Stat Card"
Cohesion: 1.0
Nodes (1): Component: StatCard

### Community 35 - "Users Feature"
Cohesion: 1.0
Nodes (1): User Management Module

### Community 36 - "Forms Feature"
Cohesion: 1.0
Nodes (1): Form Builder Module

### Community 37 - "Resources Feature"
Cohesion: 1.0
Nodes (1): Resources Module

### Community 38 - "Card Component"
Cohesion: 1.0
Nodes (1): Card Component Design Token

### Community 39 - "Users/Me Audit"
Cohesion: 1.0
Nodes (1): P1: GET /api/users/me Absent

### Community 40 - "Event Model"
Cohesion: 1.0
Nodes (1): Event Mongoose Model

### Community 41 - "Resource Model"
Cohesion: 1.0
Nodes (1): Resource Mongoose Model

### Community 42 - "Routes List"
Cohesion: 1.0
Nodes (1): Backend Routes Audit (01-routes)

## Knowledge Gaps
- **93 isolated node(s):** `UX Flows & Interaction Patterns`, `Role: admin`, `Role: hr`, `Role: director`, `Role: manager` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Analytics Module`** (2 nodes): `Module Analytique`, `API: Analytics Endpoints (/api/analytics)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Manager Notifications`** (2 nodes): `INC-07: managerActionRequired recipient resolution`, `Notification: managerActionRequired`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Page Layout Components`** (2 nodes): `Component: PageContainer`, `Component: PageHeader`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Admin Config & Audit Log`** (2 nodes): `Admin Config Module`, `AuditLog Mongoose Model`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Role: Admin`** (1 nodes): `Role: admin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Role: RH`** (1 nodes): `Role: hr`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Role: Director`** (1 nodes): `Role: director`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Role: Manager`** (1 nodes): `Role: manager`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Role: Employee`** (1 nodes): `Role: employee`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Calendar Module`** (1 nodes): `Module Calendrier & Événements`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Resources Module`** (1 nodes): `Module Ressources`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Import Module`** (1 nodes): `Module Import Utilisateurs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mail Templates`** (1 nodes): `Module Templates Mail`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Deadline Reminder`** (1 nodes): `Notification: deadlineReminder`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `System Alerts`** (1 nodes): `Notification: systemAlerts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evaluation Expired`** (1 nodes): `Notification: evaluationExpired`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evaluation Reassigned`** (1 nodes): `Notification: evaluationReassigned`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Error Boundary`** (1 nodes): `Component: ErrorBoundary`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mobile Drawer`** (1 nodes): `Component: MobileDrawer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Data Card`** (1 nodes): `Component: DataCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stat Card`** (1 nodes): `Component: StatCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Users Feature`** (1 nodes): `User Management Module`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Forms Feature`** (1 nodes): `Form Builder Module`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Resources Feature`** (1 nodes): `Resources Module`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card Component`** (1 nodes): `Card Component Design Token`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Users/Me Audit`** (1 nodes): `P1: GET /api/users/me Absent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Event Model`** (1 nodes): `Event Mongoose Model`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Resource Model`** (1 nodes): `Resource Mongoose Model`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Routes List`** (1 nodes): `Backend Routes Audit (01-routes)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NX-RH Frontend v2 Master Spec` connect `Community 1` to `Community 0`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `API: Evaluations Endpoints (/api/evaluations)` connect `Community 0` to `Community 8`, `Community 6`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `Module Évaluations` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `API: Evaluations Endpoints (/api/evaluations)` (e.g. with `API: Campaigns Endpoints (/api/campaigns)` and `API: Forms Endpoints (/api/forms)`) actually correct?**
  _`API: Evaluations Endpoints (/api/evaluations)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `UX Flows & Interaction Patterns`, `Role: admin`, `Role: hr` to the rest of the system?**
  _93 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._