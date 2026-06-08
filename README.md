<div align="center">

# NanoXplore RH

**A complete HR platform for professional reviews, evaluation campaigns and employee development.**

[![CI](https://github.com/lordrosta-r/NX-RH/actions/workflows/ci.yml/badge.svg)](https://github.com/lordrosta-r/NX-RH/actions/workflows/ci.yml)
[![CD — Docker Build](https://github.com/lordrosta-r/NX-RH/actions/workflows/cd.yml/badge.svg)](https://github.com/lordrosta-r/NX-RH/actions/workflows/cd.yml)
[![Security — npm audit](https://github.com/lordrosta-r/NX-RH/actions/workflows/security.yml/badge.svg)](https://github.com/lordrosta-r/NX-RH/actions/workflows/security.yml)
[![Release](https://img.shields.io/github/v/release/lordrosta-r/NX-RH)](https://github.com/lordrosta-r/NX-RH/releases)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-multi--stage-2496ED?logo=docker&logoColor=white)

</div>

---

## About this project

I built **NanoXplore RH** during my apprenticeship (*alternance*) as a full end-to-end product:
from the database and backend API to the React single-page application, the Docker deployment and
the CI/CD pipeline. The goal was to replace scattered spreadsheets and email threads with a single,
role-aware tool that guides each person — employee, manager, HR, admin — through the annual review
lifecycle.

This was my **first full-scale project**, and it taught me a lot: how to design a maintainable
architecture, how to think about security from the start, how to ship behind a real CI/CD pipeline,
and how to write documentation that lets someone else take over. I tried to keep every decision
simple and explicit (the **K.I.S.S.** principle runs through the whole codebase) so the project stays
easy to read and to maintain.

> *Personal note:* what I'm most proud of is that the project is genuinely **deployable, documented
> and tested** — not a demo, but something an organisation could actually run. If you're reading this
> as a recruiter or a fellow developer, the [documentation](#documentation) is the best place to see
> how it all fits together.

---

## Key features

- **Evaluation campaigns** — creation, participant targeting by role, scheduling, analytics
- **Drag-and-drop form builder** — self-assessment, manager, upward feedback, objectives, mobility
- **Evaluation filling** with **N-1 previous-edition context** (last year's answers shown inline)
- **Manager interviews** — structured exchange, objectives, summary, dual signature, disagreement flow
- **Individual development plans (PDI)** and **internal mobility requests**
- **LDAP synchronization** — multiple directories, manager-attribute hierarchy, no orphans
- **Account management** — block / unblock / delete, reversible exclusion of system accounts
- **Document space** — HR publishes downloadable documents to all employees
- **Interactive full-screen org chart** (tentacular departments)
- **Role-based access control** — employee, manager, HR, admin (+ read-only impersonation)
- **Fully bilingual** interface — French / English (auto-detected)
- **Admin-configurable from the UI** — LDAP, SMTP, SSL certificate, company logo

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Routing / state | React Router v6 (`createBrowserRouter`), TanStack Query v5, axios |
| Forms / validation | React Hook Form, Zod |
| Styling / icons | Tailwind CSS v3, CSS custom properties, lucide-react |
| i18n | react-i18next |
| Backend | Node.js 20, Express 4, MongoDB 7, Mongoose 8 |
| Auth | JWT in httpOnly cookies, LDAP (ldapjs) |
| Infra | Nginx 1.27 (TLS), Docker multi-stage, Docker Compose |
| Tests | Vitest + Testing Library, Playwright, Jest 30 + Supertest |
| Quality / security | ESLint, CI/CD (GitHub Actions), Dependabot, CodeQL, npm audit |

---

## Quick start

### Prerequisites

- Docker and Docker Compose installed
- A `.env` file at the repository root — see [docs/INSTALLATION.md](docs/INSTALLATION.md) and [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)

> TLS certificates are **not committed**. On a fresh deploy, a self-signed `localhost` certificate is
> generated automatically (the `cert-init` service) so nginx can start. An admin then uploads the real
> certificate from the UI (*Administration → SSL certificate*). See [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

### Production

```bash
docker compose up -d
```

High-availability mode with several app instances:

```bash
docker compose up -d --scale app=3
```

### Development

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

---

## Project structure

```
NX-RH/
├── Dockerfile                    # Multi-stage: Vite frontend build + Express server
├── docker-compose.yml            # Production stack: cert-init + nginx + app + mongo
├── docker-compose.dev.yml        # Development overrides
├── nginx/                        # Reverse proxy + TLS (certs not committed)
├── frontend-v2/                  # React / TypeScript / Vite SPA
│   └── src/
│       ├── router/index.tsx      # All routes (source of truth) via createBrowserRouter
│       ├── contexts/             # AuthContext, PerspectiveContext, ConfirmContext
│       ├── layouts/  components/  pages/  features/  api/  hooks/
│       ├── schemas/              # Zod schemas
│       ├── i18n/locales/         # fr.json, en.json
│       └── styles/tokens.css     # Design tokens (CSS custom properties)
└── mongo/
    └── server/                   # Express + Mongoose backend
        ├── routes/  models/  services/  middleware/
        └── index.js              # App bootstrap + production security guardrails
```

---

## What I learned

- **Architecture** — keeping a single source of truth (`router/index.tsx`), co-locating code, and
  resisting over-engineering (no Redux, no SSR — TanStack Query + React contexts were enough).
- **Security by design** — JWT in httpOnly cookies, RBAC on every route, boot-time guardrails that
  refuse to start with weak secrets, and a read-only impersonation invariant.
- **Shipping like a product** — protected branches, mandatory PRs, a green CI before merge, semantic
  versioning and tagged releases, dependency scanning (Dependabot, CodeQL, `npm audit`).
- **Operability** — Docker deployment, backups, an update procedure, and documentation a new
  developer can follow without help.

---

## Documentation

| Document | Description |
|---|---|
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Step-by-step first-time setup (copy-paste commands) |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Admin configuration from the UI (LDAP, SMTP, SSL, logo) |
| [docs/UPDATE.md](docs/UPDATE.md) | Upgrade procedure and rollback |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guide |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture |
| [docs/STACK.md](docs/STACK.md) | Technology choices and rationale |
| [docs/ROLES_RBAC.md](docs/ROLES_RBAC.md) | Roles and access-control matrix |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Environment variables reference |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and fixes |
| [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md) | Backup / restore procedures |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines and code conventions |
| [SECURITY.md](SECURITY.md) | Security policy and vulnerability reporting |

---

## License

This project was developed in an apprenticeship context. For reuse or licensing terms, please contact
the author.

**Author:** [@lordrosta-r](https://github.com/lordrosta-r)
