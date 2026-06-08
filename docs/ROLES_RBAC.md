# NanoXplore RH — Roles & RBAC

Access control is enforced at two layers:

- **Frontend**: `AuthGuard` component in `frontend-v2/src/router/index.tsx` — routes that do not
  specify a `roles` prop are accessible to any authenticated user; routes with a `roles` prop block
  access and redirect to `/unauthorized`.
- **Backend**: `authGuard` middleware in `mongo/server/` — verifies the JWT and checks the role
  before every API handler executes.

---

## 1. The Four Roles

| Role | Purpose |
|---|---|
| **admin** | Full platform control: server configuration, LDAP, mail, SSL, audit log, setup wizard, system status, and all HR/manager capabilities. |
| **hr** | Human-resources operations: manage users and groups, create and edit campaigns and forms, manage evaluations, HR flags, mail templates, departments, and settings. Cannot access infrastructure-level admin pages (LDAP, mail server config, SSL, system status, setup wizard). |
| **manager** | Team oversight: view and manage their team's users (read + limited write via the team view), follow campaigns and evaluations, access team analytics, and process pending items (`/manager/todo`). Cannot create campaigns, forms, or evaluations, and has no access to the admin area. |
| **employee** | Individual contributor: fills in their own evaluations, tracks their individual development plan (PDI), browses HR documents and events, and submits mobility requests. No write access to shared resources. |

> The legacy `director` role no longer exists. Any account stored with role `director` is treated
> as a `manager` by the application.
>
> A manager can supervise other managers through the standard reporting hierarchy. There is no
> separate director portal or dedicated route for multi-team supervision — `/manager/todo` absorbs
> all pending-action supervision regardless of team depth.

---

## 2. The Perspective Concept

Roles with managerial or administrative responsibilities have two navigation perspectives:

| Perspective | Who has it | What it shows |
|---|---|---|
| **me** ("Mon espace") | All roles | Personal evaluations, PDI, mobility requests, events, HR documents |
| **work** | manager, hr, admin | Team/org management, campaigns, forms, analytics, administration |

`employee` always operates in the `me` perspective — there is no perspective switch for them.

The active perspective is stored in `PerspectiveContext` (`"me" | "work"`) and controls which
navigation items are displayed. Switching perspective does not change route permissions; `AuthGuard`
enforces those independently of the perspective.

---

## 3. Permissions Matrix

The table below is derived strictly from `AuthGuard roles` declarations in `router/index.tsx` and
the route table in `CONTRIBUTING.md`. Routes with no `roles` restriction are marked as accessible to all
authenticated users. Write-specific sub-routes (e.g. `/new`, `/:id/edit`) are noted inline.

Legend:
- **yes** — the role can access all sub-routes in this area (read + write where applicable)
- **read** — the role can view the area but cannot create, edit, or delete
- **write** — specific write sub-routes are available; details noted in the cell
- **—** — the role has no access (blocked by `AuthGuard`)

| Feature / Route area | admin | hr | manager | employee |
|---|---|---|---|---|
| **Dashboard** `/` | yes | yes | yes | yes |
| **Users** `/users`, `/users/:id` | yes | yes | read (list + detail, no create/edit) | — |
| **User create/edit** `/users/new`, `/users/:id/edit` | yes | yes | — | — |
| **User groups** `/users/groups` | yes | yes | — | — |
| **Campaigns** `/campaigns`, `/campaigns/:id` | yes | yes | read | read |
| **Campaign create/edit** `/campaigns/new`, `/campaigns/:id/edit` | yes | yes | — | — |
| **Campaign analytics** `/campaigns/:id/analytics` | yes | yes | yes | — |
| **Forms** `/forms`, `/forms/:id` | yes | yes | read | read |
| **Form create** `/forms/new` | yes | yes | — | — |
| **Evaluations** `/evaluations`, `/evaluations/:id`, `/evaluations/history` | yes | yes | yes | yes |
| **Evaluation create** `/evaluations/new` | yes | yes | — | — |
| **Manager todo** `/manager/todo` | yes | yes | yes | — |
| **Interview view** `/interview` | yes | yes | yes | — |
| **PDI** `/pdi`, `/pdi/:id` | yes | yes | yes | yes |
| **HR flags** `/hr/flags`, `/hr/flags/:id` | yes | yes | — | — |
| **Analytics** `/analytics`, `/analytics/campaigns/:id` | yes | yes | yes | — |
| **Events** `/events`, `/events/:id` | yes | yes | yes | yes |
| **Documents (HR resources)** `/documents`, `/documents/:id` | — | yes | yes | yes |
| **Mobility/Requests** `/mobility` | yes | yes | yes | yes |
| **Org chart** `/org` | yes | yes | yes | yes |
| **Help** `/help` | yes | yes | yes | yes |
| **Profile & Preferences** `/profile`, `/profile/preferences` | yes | yes | yes | yes |
| **Notifications** `/notifications` | yes | yes | yes | yes |
| **Admin hub** `/admin` | yes | yes | — | — |
| **Admin users** `/admin/users`, `/admin/users/import` | yes | yes | — | — |
| **Admin forms import** `/admin/forms/import` | yes | yes | — | — |
| **HR Settings** `/admin/settings`, `/hr/settings` | yes | yes | — | — |
| **Audit log** `/admin/audit` | yes | yes | — | — |
| **Mail templates** `/admin/mail-templates` | yes | yes | — | — |
| **Departments** `/admin/departments` | yes | yes | — | — |
| **Stats** `/admin/stats` | yes | yes | — | — |
| **LDAP configuration** `/admin/ldap` | yes | — | — | — |
| **SSL configuration** `/admin/ssl` | yes | — | — | — |
| **Mail server config** `/admin/mail-config` | yes | — | — | — |
| **Application config** `/admin/config` | yes | — | — | — |
| **System status** `/admin/status` | yes | — | — | — |
| **Setup wizard** `/admin/setup` | yes | — | — | — |
| **Test mail** `/admin/test-mail` | yes | — | — | — |

> Note on the Documents area: the `admin` role is explicitly excluded from `/documents` and
> `/documents/:id` (`AuthGuard roles={["hr", "manager", "employee"]}`). HR documents are a
> staff-facing resource; admins manage content through the admin area, not through the employee-
> facing document viewer.

---

## 4. Manager Hierarchy

A manager can supervise other managers through the standard organisational hierarchy. There is no
dedicated portal, route, or role for multi-level supervision. All pending actions arising from
managing other managers flow through `/manager/todo`, exactly like single-team management.

---

## 5. Read-only Impersonation Invariant

When an admin uses view-as (impersonation) to observe the application as another user, the session
is strictly read-only. No write operation is permitted under an impersonated identity. This
invariant is enforced at the backend level and must not be weakened when adding new write
endpoints.
