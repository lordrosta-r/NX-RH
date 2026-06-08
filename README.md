# NanoXplore RH

NanoXplore RH (NX-RH) is a web application for managing HR professional reviews and evaluations. It covers the full lifecycle of annual or periodic review campaigns: campaign creation and configuration, drag-and-drop form building, evaluation filling (including N-1 previous-edition context visible to evaluators), manager interviews, individual development plans (PDI), document upload and management, and platform administration — all under a role-based access control model with LDAP directory synchronization and a bilingual (French / English) interface.

Key features:

- Campaign management: creation, participant assignment, analytics
- Drag-and-drop evaluation form builder
- Evaluation filling with N-1 previous-edition context
- Manager interviews and team todo workflows
- Individual development plans (PDI)
- Mobility requests
- LDAP synchronization for user authentication
- Document upload and storage (MinIO-backed)
- Interactive full-screen org chart
- Role-based access control (RBAC): employee, manager, HR, admin
- Bilingual interface: French and English (auto-detected)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19, TypeScript 6 |
| Build tool | Vite 8 |
| Routing | React Router v6 (`createBrowserRouter`) |
| Data fetching / state | TanStack Query v5, axios |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS v3, CSS custom properties |
| Charts | Recharts |
| Icons | lucide-react |
| i18n | react-i18next, i18next-browser-languagedetector |
| Backend runtime | Node.js 20 |
| Backend framework | Express 4 |
| Database | MongoDB 7, Mongoose 8 |
| Authentication | JWT in httpOnly cookies, LDAP via ldapjs |
| Email | Nodemailer |
| PDF generation | PDFKit (server-side), jsPDF (client-side) |
| File storage | MinIO (multer) |
| Logging | Winston |
| Security middleware | Helmet, express-rate-limit, express-mongo-sanitize |
| Reverse proxy | Nginx 1.27 (SSL termination, load balancing) |
| Containerization | Docker multi-stage build, Docker Compose |
| Frontend unit tests | Vitest, Testing Library |
| Frontend E2E tests | Playwright |
| Backend tests | Jest 30, Supertest, mongodb-memory-server |

---

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- A `.env` file at the repository root (see [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) and [docs/CONFIGURATION.md](docs/CONFIGURATION.md))
- TLS certificates placed in `nginx/certs/` (not committed to the repository)

### Production

```bash
docker compose up -d
```

To run in high-availability mode with multiple app instances:

```bash
docker compose up -d --scale app=3
```

### Development

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

---

## Project Structure

```
NX-RH/
├── Dockerfile                        # Multi-stage: Vite frontend build + Express server
├── docker-compose.yml                # Production stack: nginx + app + mongo
├── docker-compose.dev.yml            # Development overrides
├── nginx/
│   ├── nginx.conf
│   ├── conf.d/
│   └── certs/                        # TLS certificates (not committed)
├── frontend-v2/                      # React / TypeScript / Vite SPA
│   ├── index.html                    # Single HTML entry point (anti-flash theme script)
│   └── src/
│       ├── main.tsx                  # ErrorBoundary, QueryClientProvider, AuthProvider, App
│       ├── App.tsx                   # RouterProvider
│       ├── router/index.tsx          # All routes via createBrowserRouter
│       ├── contexts/                 # AuthContext, PerspectiveContext, ConfirmContext
│       ├── layouts/                  # AppLayout, AuthLayout, OrgLayout, LegalLayout
│       ├── components/
│       │   ├── ui/                   # Reusable, business-logic-free components
│       │   ├── shared/               # AuthGuard
│       │   └── layout/               # navConfig.ts (role + perspective nav)
│       ├── pages/                    # One file per page
│       ├── features/                 # Vertical modules (campaigns/, evaluations/)
│       ├── api/                      # Axios functions per domain
│       ├── hooks/                    # Custom React hooks
│       ├── types/                    # Shared TypeScript types
│       ├── schemas/                  # Zod schemas
│       ├── i18n/locales/             # fr.json, en.json
│       └── styles/tokens.css         # Design tokens (CSS custom properties)
└── mongo/
    └── server/                       # Express + Mongoose backend
        ├── index.js
        ├── routes/                   # One file per domain (campaigns.js, evaluations.js, ...)
        ├── models/                   # Mongoose models (Campaign, Evaluation, Form, User, PDI, ...)
        └── services/                 # Business logic decoupled from routes
```

---

## Documentation

| Document | Description |
|---|---|
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | First-time setup and prerequisites |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Environment variables and application settings |
| [docs/UPDATE.md](docs/UPDATE.md) | Upgrade procedure between versions |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guide |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture decisions |
| [docs/ROLES_RBAC.md](docs/ROLES_RBAC.md) | Role definitions and access control matrix |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Required and optional environment variables |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and resolutions |
| [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md) | Database and file backup / restore procedures |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines and code conventions |
| [SECURITY.md](SECURITY.md) | Security policy and vulnerability reporting |

---

## License

License: contact the project owner for terms.

Contact: —
