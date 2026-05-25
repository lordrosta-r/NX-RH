<div align="center">

```
███╗   ██╗ █████╗ ███╗   ██╗ ██████╗ ██╗  ██╗██████╗ ██╗      ██████╗ ██████╗ ███████╗    ██████╗ ██╗  ██╗
████╗  ██║██╔══██╗████╗  ██║██╔═══██╗╚██╗██╔╝██╔══██╗██║     ██╔═══██╗██╔══██╗██╔════╝    ██╔══██╗██║  ██║
██╔██╗ ██║███████║██╔██╗ ██║██║   ██║ ╚███╔╝ ██████╔╝██║     ██║   ██║██████╔╝█████╗      ██████╔╝███████║
██║╚██╗██║██╔══██║██║╚██╗██║██║   ██║ ██╔██╗ ██╔═══╝ ██║     ██║   ██║██╔══██╗██╔══╝      ██╔══██╗██╔══██║
██║ ╚████║██║  ██║██║ ╚████║╚██████╔╝██╔╝ ██╗██║     ███████╗╚██████╔╝██║  ██║███████╗    ██║  ██║██║  ██║
╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝╚═╝  ╚═╝
```

**Human Resources — Annual Performance Review Platform**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![nginx](https://img.shields.io/badge/nginx-1.27-009639?logo=nginx&logoColor=white)](https://nginx.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![CI](https://github.com/nanoxplore/NX-RH/actions/workflows/ci.yml/badge.svg)](https://github.com/nanoxplore/NX-RH/actions/workflows/ci.yml)

*Gérez vos entretiens annuels, campagnes d'évaluation et revues de performance en toute simplicité.*

</div>

---

## 🚀 Démarrage rapide

**Prérequis** : Node.js 20+, MongoDB 7+, Docker (optionnel)

```bash
# 1. Cloner le projet
git clone https://github.com/nanoxplore/NX-RH.git && cd NX-RH

# 2. Configurer les variables d'environnement
cp mongo/server/.env.example mongo/server/.env
cp frontend-v2/.env.example frontend-v2/.env.local  # si exists

# 3. Installer et lancer
npm install
npm run dev   # Lance API (port 3000) + Frontend (port 5173) simultanément
```

Voir [docs/DEVELOPER.md](docs/DEVELOPER.md) pour la configuration complète.

---

## Overview

**NanoXplore RH** is a lightweight, self-hosted web application for managing the full lifecycle of annual performance reviews — from campaign creation to manager validation.

- **Single-Page Application (SPA):** React Router v6 handles all client-side routing. One React bundle, seamless navigation.
- **React + Vite:** Full-featured frontend in `frontend-v2/` — TypeScript, TailwindCSS, React Query, and React Router v6.
- **Docker-native:** Production-ready stack with Nginx SSL termination and horizontal scaling out of the box.

---

## Features

| Module | Description |
|--------|-------------|
| **Campaigns** | Create and manage annual review cycles with defined periods |
| **Forms** | Build flexible evaluation templates (self-review, manager review, 360°) |
| **Evaluations** | Assign, fill, and track individual evaluations through their full lifecycle |
| **Users** | Multi-role directory (Admin / Manager / Employee) with team hierarchy |
| **Authentication** | Local accounts **or** LDAP/Active Directory — switchable via env var |
| **Notifications** | SMTP email notifications via any relay (Exchange, O365, Gmail, Mailtrap…) |

---

## Architecture

```
                            ┌─────────────────────────────────────────┐
                            │             Docker Network               │
                            │                                          │
  Browser ──HTTPS──▶ ┌─────┴──────┐     ┌──────────────────────┐    │
                      │   Nginx    │────▶│    Express (app)      │    │
  (port 443)          │  (proxy +  │     │                       │    │
                      │  SSL/TLS)  │     │  ┌── Static SPA ───┐  │    │
                      └─────┬──────┘     │  │  GET /*         │  │    │
                            │            │  │  → index.html   │  │    │
                     ┌──────┘            │  └────────────────┘  │    │
                     │  Load balance     │                       │    │
                     │  across replicas  │  ┌── API Routes ───┐  │    │
                     │                  │  │  /api/auth      │  │    │
                     ▼                  │  │  /api/users     │◀─┼────┼── fetch()
              ┌──────────────┐          │  │  /api/campaigns │  │    │
              │  app (×1-N)  │          │  │  /api/forms     │  │    │
              └──────────────┘          │  │  /api/evals     │  │    │
                                        │  └─────────────────┘  │    │
                                        └──────────┬───────────┘    │
                                                   │                  │
                                        ┌──────────▼───────────┐    │
                                        │      MongoDB 7        │    │
                                        │  (persistent volume)  │    │
                                        └──────────────────────┘    │
                                                                      │
                            ┌─── Optional ─────────────────────────┐  │
                            │  LDAP / Active Directory (external)   │  │
                            │  SMTP relay (external)                │  │
                            └───────────────────────────────────────┘  │
                            └─────────────────────────────────────────┘
```

### SPA Data Flow

```
  frontend-v2/src/main.tsx  ──▶ React Router v6 ──▶ <App /> (client-side routing)

  Browser ──GET /dashboard──▶ Nginx ──▶ Express ──authGuard──▶ sendFile(index.html)
  React Router renders the matching page component client-side.
  Browser ──fetch /api/──────▶ Express ──route────▶  JSON response
```

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Reverse Proxy** | Nginx 1.27 | SSL termination, load balancing, rate limiting, gzip |
| **Backend** | Node.js 20 + Express 4 | REST API, JWT auth, static SPA serving |
| **Frontend** | React 19 + Vite + TailwindCSS + React Router v6 | SPA in `frontend-v2/` |
| **Database** | MongoDB 7 | Document store, Mongoose ODM |
| **Auth** | JWT + bcrypt / LDAP | Local or directory-based authentication |
| **Mail** | Nodemailer | Any SMTP relay |
| **Container** | Docker + Compose | Single-command deployment |

---

## Quick Start with Docker

### Prerequisites

- Docker ≥ 24 and Docker Compose ≥ 2.20
- `openssl` (for dev certificates)

### 1 — Clone & configure

```bash
git clone https://github.com/nanoxplore/NX-RH.git
cd NX-RH
cp .env.example .env
# Edit .env with your DB password, JWT secret, etc.
```

### 2 — Generate TLS certificates

**Development (self-signed):**
```bash
chmod +x scripts/gen-certs.sh
./scripts/gen-certs.sh localhost
```

**Production (Let's Encrypt):**
```bash
chmod +x scripts/certbot-init.sh
./scripts/certbot-init.sh your-domain.com admin@your-domain.com
```

### 3 — Launch

```bash
# Standard (1 app instance)
docker compose up -d

# High-availability (3 app instances behind Nginx)
docker compose up -d --scale app=3

# Follow logs
docker compose logs -f app
```

### 4 — Open

| URL | Description |
|-----|-------------|
| `https://localhost` | Login page |
| `https://localhost/dashboard` | Employee dashboard |
| `https://localhost/manager` | Manager review panel |
| `https://localhost/api/health` | Health check (JSON) |

Default admin credentials (change immediately):
```
Email:    admin@nanoxplore.com
Password: changeme
```

---

## Development Setup (without Docker)

```bash
# 1. Install dependencies
cd mongo/server && npm install
cd ../../frontend-v2 && npm install

# 2. Initialize the database
cd ../mongo && node database/seed.js

# 3. Start the backend (port 3000)
cd mongo/server && npm run dev

# 4. Start Vite dev server with HMR (port 5173)
cd frontend-v2 && npm run dev
# → API calls are proxied to http://localhost:3000 automatically
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` enables secure cookies |
| `PORT` | `3000` | Express listen port |
| `MONGO_URI` | `mongodb://...` | MongoDB connection URI (use `mongo` inside Docker) |
| `DB_NAME` | `nanoxplore_rh` | Database name |
| `JWT_SECRET` | — | **Required** — min 64 random chars |
| `JWT_EXPIRES_IN` | `8h` | Token expiry duration |
| `AUTH_PROVIDER` | `local` | `local` or `ldap` |

See [`.env.example`](.env.example) for the full reference including LDAP and SMTP variables.

---

## Authentication

### Local (default)

Passwords are hashed with **bcrypt** (cost factor 12) and stored in the `users` table.

```env
AUTH_PROVIDER=local
```

### LDAP / Active Directory

Switch to LDAP authentication without touching any code:

```env
AUTH_PROVIDER=ldap
LDAP_TYPE=activedirectory        # or openldap
LDAP_URL=ldaps://dc.corp.local:636
LDAP_BASE_DN=DC=corp,DC=local
LDAP_BIND_DN=CN=svc-rh,OU=Service Accounts,DC=corp,DC=local
LDAP_BIND_PASSWORD=...
LDAP_USER_SEARCH_BASE=OU=Users,DC=corp,DC=local
```

| `LDAP_TYPE` | Directory | Search filter |
|-------------|-----------|---------------|
| `activedirectory` | Windows AD | `sAMAccountName` / UPN |
| `openldap` | Linux OpenLDAP | `uid` / `cn` |

> The LDAP service module is at `mongo/server/services/ldap.js`.

---

## Email Notifications

Configure any SMTP relay — the app sends notifications for campaign launches, evaluation reminders, and validations.

```env
MAIL_HOST=smtp.yourcompany.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=notifications@nanoxplore.com
MAIL_PASSWORD=...
MAIL_FROM="NanoXplore RH <notifications@nanoxplore.com>"
```

**Development tip:** use [Mailtrap](https://mailtrap.io) to intercept all outgoing emails locally:

```env
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
```

---

## Project Structure

```
NX-RH/
│
├── Dockerfile                    ← Multi-stage build (frontend-v2 + server)
├── docker-compose.yml            ← Production stack (nginx + app + db)
├── docker-compose.dev.yml        ← Dev overrides (live-reload, exposed ports)
├── .env.example                  ← All configurable variables documented
│
├── nginx/
│   ├── nginx.conf                ← Worker config, gzip, rate limits
│   ├── certs/                    ← TLS certificates (not committed to git)
│   └── conf.d/
│       ├── app.conf              ← Site config: SSL, upstream, security headers
│       └── proxy_params.conf     ← Shared proxy headers
│
├── scripts/
│   ├── gen-certs.sh              ← Self-signed cert generator (dev)
│   └── certbot-init.sh           ← Let's Encrypt issuance (prod)
│
├── mongo/server/                 ← Express backend
│   ├── index.js                  ← App entry: API mounts + static SPA serving
│   ├── config/
│   │   └── db.js                 ← Mongoose connection
│   ├── middleware/
│   │   └── authGuard.js          ← JWT guard (cookie + Bearer header)
│   ├── routes/
│   │   ├── auth.js               ← POST /api/auth/login|logout
│   │   ├── users.js              ← GET|POST|PATCH /api/users
│   │   ├── campaigns.js          ← /api/campaigns
│   │   ├── forms.js              ← /api/forms
│   │   └── evaluations.js        ← /api/evaluations
│   └── services/
│       ├── ldap.js               ← LDAP/AD connector (AD + OpenLDAP)
│       └── mailer.js             ← Nodemailer SMTP transport
│
└── frontend-v2/                  ← React SPA (Vite + TypeScript + TailwindCSS)
    ├── vite.config.ts            ← Vite config with API proxy
    ├── index.html                ← Single HTML entry point
    └── src/
        ├── main.tsx              ← React entry + React Router setup
        ├── App.tsx               ← Route definitions (React Router v6)
        ├── types/                ← Shared TypeScript types
        ├── api/                  ← Axios API clients per resource
        ├── contexts/             ← AuthContext and other React contexts
        ├── hooks/                ← Custom React hooks (React Query)
        ├── components/           ← Shared UI components
        │   ├── layout/           ← Navbar, Sidebar, Layout wrapper
        │   └── ui/               ← Buttons, badges, modals, etc.
        ├── pages/                ← One component per route
        └── lib/                  ← Constants, utilities
```

---

## Adding a New Page

```bash
# 1. Create the page component
touch frontend-v2/src/pages/NewPage.tsx

# 2. Register the route in App.tsx
# frontend-v2/src/App.tsx:
#   <Route path="/new-page" element={<NewPage />} />

# 3. Add a nav link in Navbar.tsx if needed
# frontend-v2/src/components/layout/Navbar.tsx
```

---

## Database Schema

```
users ──────────────────────────────────────────────────────────
  id | email | password_hash | first_name | last_name
  role (admin/manager/employee) | manager_id (→ users.id)
  department | job_title | is_active

campaigns ──────────────────────────────────────────────────────
  id | name | description | status | start_date | end_date
  created_by (→ users.id)

forms ───────────────────────────────────────────────────────────
  id | campaign_id | title | form_type | structure (JSON)
  created_by (→ users.id)

evaluations ─────────────────────────────────────────────────────
  id | campaign_id | form_id
  evaluator_id (→ users.id) | evaluatee_id (→ users.id)
  status | answers (JSON) | score | manager_comment
  submitted_at | reviewed_at
```

**Evaluation status lifecycle:**
```
pending → in_progress → submitted → reviewed → validated
```

---

## High Availability

Scale the app tier horizontally with a single command:

```bash
docker compose up -d --scale app=3
```

Nginx uses Docker's internal DNS to round-robin requests across all `app` replicas. The `mongo` tier remains a single MongoDB instance — for full HA at the DB layer, configure a MongoDB Replica Set and update `MONGO_URI` accordingly.

---

## Security Notes

- All traffic is HTTPS-only (HTTP → 301 redirect)
- JWT stored in **httpOnly** cookies (not accessible to JavaScript)
- LDAP bind password never leaves the server
- MongoDB is on an isolated Docker network — never exposed to the host in production
- Nginx rate-limits `/api/auth/login` to 5 req/min per IP
- `server_tokens off` hides nginx version from response headers
- Non-root user inside the Docker container

---

## Roadmap

- [ ] Campaign management UI (admin panel)
- [ ] Form builder (drag-and-drop question editor)
- [ ] Employee self-evaluation workflow
- [ ] Manager review & scoring interface
- [ ] Email notification triggers
- [ ] Export to PDF (evaluation reports)
- [ ] Audit log

---

## License

MIT © NanoXplore — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with Express · React · Vite · MongoDB · Docker</sub>
</div>
