# NanoXplore RH — Installation Guide

Step-by-step guide to install NanoXplore RH from scratch.
All commands are copy-paste ready. No prior knowledge of the codebase is required.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the repository](#2-clone-the-repository)
3. [Create the environment file](#3-create-the-environment-file)
4. [Production launch](#4-production-launch)
5. [Create the first admin account](#5-create-the-first-admin-account)
6. [Development mode](#6-development-mode)
7. [Verify the installation](#7-verify-the-installation)
8. [Common first-run issues](#8-common-first-run-issues)

---

## 1. Prerequisites

You need the following tools installed on your machine.

### Docker Engine and Docker Compose

The entire stack (nginx, Express app, MongoDB) runs in Docker containers.
Docker Compose v2 is included with Docker Desktop on macOS and Windows.

```bash
# Verify Docker is installed and running
docker --version
# Expected: Docker version 25.x or higher

# Verify Docker Compose v2 is available (note: no dash between "docker" and "compose")
docker compose version
# Expected: Docker Compose version v2.x or higher
```

If either command fails, install Docker Desktop from https://docs.docker.com/get-docker/

### Git

```bash
git --version
# Expected: git version 2.x
```

### Node.js 20 (development only)

Node.js is only needed if you want to run the frontend or backend locally outside Docker.
For a pure Docker installation (production or staging), you can skip this.

```bash
node --version
# Expected: v20.x.x
npm --version
```

Install from https://nodejs.org/ or via a version manager such as `nvm`.

---

## 2. Clone the repository

```bash
git clone <repository-url> NX-RH
cd NX-RH
```

Replace `<repository-url>` with the actual URL of the repository.

---

## 3. Create the environment file

The application reads its configuration from a `.env` file at the root of the repository.
**This file is never committed to git.** You must create it from the provided template.

### 3.1 Copy the template

For a production deployment, use the production template:

```bash
cp .env.prod.example .env
```

For a development environment, you can use the general template instead:

```bash
cp .env.example .env
```

### 3.2 Generate secrets

The server refuses to start in production if the secrets look like placeholder values.
Generate strong random secrets with `openssl`:

```bash
# Generate JWT_SECRET (64 random hex characters)
openssl rand -hex 48

# Generate JWT_REFRESH_SECRET (must be a different value — run the command again)
openssl rand -hex 48

# Generate the MongoDB password
openssl rand -hex 24
```

Run each command separately and copy each output to the corresponding variable in `.env`.

### 3.3 Required variables

Open `.env` with a text editor and fill in at least the following variables.
The server will refuse to start if any of them is missing or contains a placeholder value.

| Variable | Description | Constraint |
|---|---|---|
| `JWT_SECRET` | Secret used to sign access tokens | At least 32 characters, randomly generated, never a dev/default string |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens | At least 32 characters, randomly generated, must be different from `JWT_SECRET` |
| `MONGO_URI` | Full MongoDB connection string | Must not contain the password `changeme` |
| `MONGO_ROOT_USER` | MongoDB root username | Used by the `mongo` container on first boot |
| `MONGO_ROOT_PASSWORD` | MongoDB root password | Used by the `mongo` container on first boot |

Example of a correctly filled production `.env` (replace every `<...>` placeholder):

```dotenv
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Secrets — generate each with: openssl rand -hex 48
JWT_SECRET=a1b2c3d4...64_random_hex_chars...
JWT_REFRESH_SECRET=e5f6a7b8...64_different_random_hex_chars...
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# MongoDB
MONGO_ROOT_USER=nxrh_app
MONGO_ROOT_PASSWORD=a_strong_random_password
MONGO_DB=nanoxplore_rh
MONGO_URI=mongodb://nxrh_app:a_strong_random_password@mongo:27017/nanoxplore_rh?authSource=admin

# Cookies / CORS (HTTPS required in production)
COOKIE_SECURE=true
CLIENT_ORIGIN=https://rh.your-domain.com
FRONTEND_URL=https://rh.your-domain.com

# SMTP (optional — leave blank to skip email notifications)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=NanoXplore RH <rh@your-domain.com>

UPLOADS_DIR=/data/uploads
```

### 3.4 TLS certificates

No manual step is required before the first `docker compose up`. The `cert-init`
service automatically generates a self-signed certificate for `localhost` into
`nginx/certs/` if no certificate is found there. This unblocks nginx on a fresh
deployment (certificates are never committed to the repository).

To replace the self-signed certificate with a real one, see section 5 of
`docs/DEPLOYMENT.md`.

---

## 4. Production launch

### 4.1 Start all services

```bash
docker compose up -d
```

This command builds the application image (React frontend + Express backend),
then starts three containers: `nx_nginx`, the app container, and `nx_mongo`.

### 4.2 Check that all containers are healthy

```bash
docker compose ps
```

Wait until all containers show `healthy` in the `STATUS` column.
MongoDB takes up to 30 seconds on first boot. The app container waits for MongoDB
to be healthy before starting, and nginx waits for the app.

Example of a healthy output:

```
NAME          IMAGE                  STATUS
nx_nginx      nginx:1.27-alpine      running (healthy)
<app>         nanoxplore-rh:latest   running (healthy)
nx_mongo      mongo:7                running (healthy)
```

### 4.3 Confirm the health endpoint

```bash
curl -s http://localhost:3000/api/health
```

If the app container port is not exposed to the host (it is internal-only in production
behind nginx), query through nginx instead:

```bash
curl -sk https://localhost/api/health
```

A successful response returns HTTP 200 with a JSON body similar to `{"status":"ok"}`.

### 4.4 View logs if something is wrong

```bash
# All containers
docker compose logs -f

# A single service
docker compose logs -f app
docker compose logs -f mongo
docker compose logs -f nginx
```

---

## 5. Create the first admin account

The database starts empty. You must run the bootstrap script once to create
the first administrator account before anyone can log in.

### 5.1 Recommended: set a strong password via environment variables

Run the script with an explicit email and password:

```bash
MONGO_URI="mongodb://nxrh_app:a_strong_random_password@localhost:27017/nanoxplore_rh?authSource=admin" \
ADMIN_EMAIL="admin@your-domain.com" \
ADMIN_PASSWORD="YourStrongPassword123!" \
  node mongo/server/scripts/bootstrap-admin.js
```

Rules for `ADMIN_PASSWORD`:
- Minimum 12 characters
- The script hashes the password with bcrypt — never stored in plain text

You can also run the script inside the running app container to avoid exposing
the MongoDB port on the host:

```bash
docker compose exec app \
  sh -c 'ADMIN_EMAIL="admin@your-domain.com" ADMIN_PASSWORD="YourStrongPassword123!" node scripts/bootstrap-admin.js'
```

### 5.2 Alternative: use the default password

If you omit `ADMIN_PASSWORD`, the script creates the account with the default
password `Admin@Change2026` and sets a `mustChangePassword` flag.
The application will prompt the user to change the password on first login.

```bash
docker compose exec app \
  sh -c 'ADMIN_EMAIL="admin@your-domain.com" node scripts/bootstrap-admin.js'
```

### 5.3 Idempotency

The script is safe to run multiple times. It exits immediately (with a non-zero
exit code) if an active admin account already exists in the database.

### 5.4 Additional environment variables for the bootstrap script

| Variable | Default | Description |
|---|---|---|
| `ADMIN_EMAIL` | `admin@nanoxplore.local` | Email address of the admin account |
| `ADMIN_PASSWORD` | `Admin@Change2026` | Password (plain text, hashed by the script) |
| `ADMIN_FIRSTNAME` | `Admin` | First name |
| `ADMIN_LASTNAME` | `RH` | Last name |
| `MONGO_URI` | Value from `.env` | Connection string (loaded automatically if `.env` is present) |

---

## 6. Development mode

Development mode starts additional services: a Vite dev server with hot-module
replacement, MailHog (a fake SMTP server) to catch outgoing emails, and OpenLDAP
containers for testing LDAP authentication.

### 6.1 Start in development mode

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

### 6.2 Services and ports in development mode

| Service | URL | Description |
|---|---|---|
| Application (nginx) | https://localhost | Main entry point (proxies to Vite + Express) |
| Vite dev server | http://localhost:5173 | Frontend with hot reload |
| Express API | http://localhost:3001 | Backend with live reload via nodemon |
| MongoDB | localhost:27017 | Exposed for GUI clients (e.g. MongoDB Compass) |
| MailHog web UI | http://localhost:8025 | View all outgoing emails |
| MailHog SMTP | localhost:1025 | Fake SMTP endpoint |
| phpLDAPadmin | http://localhost:8080 | LDAP directory browser |

### 6.3 Running the frontend locally (without Docker)

If you prefer to run the Vite dev server directly on your machine instead of inside Docker:

```bash
cd frontend-v2
npm install
npm run dev
```

The frontend proxies `/api` requests to the backend via the Vite config.

### 6.4 Running the backend locally (without Docker)

```bash
cd mongo/server
npm install
node index.js
```

Make sure a `.env` file is present at the repository root (the server loads it with `dotenv`).
You also need a running MongoDB instance (either via `docker compose up mongo -d` or a local install).

---

## 7. Verify the installation

1. Open https://localhost in your browser (accept the self-signed certificate warning if present).
2. You should see the NanoXplore RH login page.
3. Log in with the admin email and password you set in step 5.
4. If you used the default password `Admin@Change2026`, you will be prompted to set a new password.
5. After login, you should land on the dashboard (`/`).

---

## 8. Common first-run issues

See `docs/TROUBLESHOOTING.md` for a full list of known issues and solutions.

Common causes of failure on first run:

- **App container exits immediately** — a required environment variable is missing or contains a placeholder value. Run `docker compose logs app` to see which variable the server rejected.
- **"JWT_SECRET trop courte"** — `JWT_SECRET` is shorter than 32 characters. Regenerate it with `openssl rand -hex 48`.
- **"JWT_REFRESH_SECRET manquant"** — `JWT_REFRESH_SECRET` is not set in `.env`. It is required in production.
- **MongoDB connection refused** — `MONGO_URI` credentials do not match `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD`. Both must be identical in `.env`.
- **Nginx starts but returns 502** — the app container is still starting or unhealthy. Wait 30 seconds and run `docker compose ps` again.
- **"Un administrateur actif existe déjà"** — the bootstrap script has already been run. This is safe to ignore; use the existing admin account to log in.
- **Browser shows a certificate warning** — this is expected on a fresh install. The `cert-init` service generates a self-signed certificate for `localhost`. Accept the browser exception or install a real certificate via the admin UI (Administration > SSL certificate).
