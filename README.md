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
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)](https://mysql.com)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![nginx](https://img.shields.io/badge/nginx-1.27-009639?logo=nginx&logoColor=white)](https://nginx.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

*Gérez vos entretiens annuels, campagnes d'évaluation et revues de performance en toute simplicité.*

</div>

---

## Overview

**NanoXplore RH** is a lightweight, self-hosted web application for managing the full lifecycle of annual performance reviews — from campaign creation to manager validation.

- **Multi-Page Application (MPA):** Express handles server-side routing. No client-side router bloat.
- **React per page:** Each page is an independent React bundle — fast initial loads, zero shared state overhead.
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
                      │  SSL/TLS)  │     │  ┌── MPA Router ──┐  │    │
                      └─────┬──────┘     │  │  GET /         │  │    │
                            │            │  │  GET /dashboard│  │    │
                     ┌──────┘            │  │  GET /manager  │  │    │
                     │  Load balance     │  └────────────────┘  │    │
                     │  across replicas  │                       │    │
                     │                  │  ┌── API Routes ───┐  │    │
                     ▼                  │  │  /api/auth      │  │    │
              ┌──────────────┐          │  │  /api/users     │◀─┼────┼── fetch()
              │  app (×1-N)  │          │  │  /api/campaigns │  │    │
              └──────────────┘          │  │  /api/forms     │  │    │
                                        │  │  /api/evals     │  │    │
                                        │  └─────────────────┘  │    │
                                        └──────────┬───────────┘    │
                                                   │                  │
                                        ┌──────────▼───────────┐    │
                                        │       MySQL 8         │    │
                                        │  (persistent volume)  │    │
                                        └──────────────────────┘    │
                                                                      │
                            ┌─── Optional ─────────────────────────┐  │
                            │  LDAP / Active Directory (external)   │  │
                            │  SMTP relay (external)                │  │
                            └───────────────────────────────────────┘  │
                            └─────────────────────────────────────────┘
```

### MPA Data Flow

```
  client/login.html ──▶ src/pages/login/main.jsx   ──┐
  client/dashboard.html ▶ src/pages/dashboard/main.jsx├─▶ Vite build ──▶ server/public/
  client/manager.html  ──▶ src/pages/manager/main.jsx ┘

  Browser ──GET /dashboard──▶ Express ──authGuard──▶ sendFile(public/dashboard.html)
  Browser ──fetch /api/──────▶ Express ──route────▶  JSON response
```

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Reverse Proxy** | Nginx 1.27 | SSL termination, load balancing, rate limiting, gzip |
| **Backend** | Node.js 20 + Express 4 | MPA router, REST API, JWT auth |
| **Frontend** | React 18 + Vite 5 | Per-page UI bundles (MPA mode) |
| **Database** | MySQL 8 | Relational data, JSON columns for dynamic forms |
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
git clone https://github.com/nanoxplore/nanoxplore-rh.git
cd nanoxplore-rh
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
cd server && npm install
cd ../client && npm install

# 2. Initialize the database
mysql -u root -p < database/init.sql

# 3. Start the backend (port 3000)
cd server && npm run dev

# 4. Start Vite dev server with HMR (port 5173)
cd client && npm run dev
# → API calls are proxied to http://localhost:3000 automatically
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` enables secure cookies |
| `PORT` | `3000` | Express listen port |
| `DB_HOST` | `localhost` | MySQL hostname (use `db` inside Docker) |
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

> The LDAP service module is at `server/services/ldap.js`.

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
nanoxplore-rh/
│
├── Dockerfile                    ← Multi-stage build (client + server)
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
├── database/
│   └── init.sql                  ← Schema: users, campaigns, forms, evaluations
│
├── server/                       ← Express backend
│   ├── index.js                  ← App entry: MPA routes + API mounts
│   ├── config/
│   │   └── db.js                 ← mysql2 connection pool
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
└── client/                       ← Vite + React (MPA)
    ├── vite.config.js            ← Multi-entry build config
    ├── login.html                ← Entry: GET /
    ├── dashboard.html            ← Entry: GET /dashboard
    ├── manager.html              ← Entry: GET /manager
    └── src/
        ├── pages/
        │   ├── login/            main.jsx + Login.jsx
        │   ├── dashboard/        main.jsx + Dashboard.jsx
        │   └── manager/          main.jsx + Manager.jsx
        ├── components/ui/
        │   └── Button.jsx
        └── styles/
            └── global.css
```

---

## Adding a New Page

```bash
# 1. Create the HTML entry point
touch client/new-page.html        # copy from client/dashboard.html

# 2. Create the React bundle
mkdir -p client/src/pages/new-page
touch client/src/pages/new-page/main.jsx
touch client/src/pages/new-page/NewPage.jsx

# 3. Register in Vite
# client/vite.config.js → rollupOptions.input:
#   'new-page': resolve(__dirname, 'new-page.html'),

# 4. Register in Express
# server/index.js:
#   app.get('/new-page', authGuard([...]), sendPage('new-page'))
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

Nginx uses Docker's internal DNS to round-robin requests across all `app` replicas. The `db` tier remains a single MySQL instance — for full HA at the DB layer, configure a MySQL Group Replication or Galera cluster and update `DB_HOST` accordingly.

---

## Security Notes

- All traffic is HTTPS-only (HTTP → 301 redirect)
- JWT stored in **httpOnly** cookies (not accessible to JavaScript)
- LDAP bind password never leaves the server
- MySQL is on an isolated Docker network — never exposed to the host in production
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
  <sub>Built with Express · React · Vite · MySQL · Docker</sub>
</div>
