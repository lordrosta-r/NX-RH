# NanoXplore RH — Deployment Guide

This document covers production deployment with Docker Compose. For update procedures see `docs/UPDATE.md`. For backup and restore see `docs/BACKUP_RESTORE.md`. For first-time installation see `docs/INSTALLATION.md`. For all environment variables see `docs/ENVIRONMENT.md`.

---

## 1. Architecture

Three Docker services communicate over two isolated networks:

```
Internet
  │
  ▼
nginx (ports 80/443)       ← TLS termination, reverse proxy
  │  [frontend network]
  ▼
app (port 3000, internal)  ← Express: REST API + serves built SPA (static files in ./public)
  │  [backend network]
  ▼
mongo (port 27017, internal) ← MongoDB 7, never exposed to host
```

- **nginx** (`nx_nginx`): nginx 1.27-alpine. Terminates TLS, proxies requests to `app`. Config lives in `nginx/conf.d/` and `nginx/nginx.conf` (both mounted read-only).
- **app**: Multi-stage Docker build. Stage 1 compiles the Vite/React SPA (`frontend-v2/`) into static assets. Stage 2 runs Express (`mongo/server/`), which serves those assets from `./public` and handles all `/api/*` routes. Express returns `index.html` for all non-API routes (SPA fallback). Runs as a non-root user.
- **mongo** (`nx_mongo`): MongoDB 7 with data persisted in the `mongo_data` named volume.

Named volumes:
| Volume | Contents |
|---|---|
| `mongo_data` | MongoDB data files |
| `uploads_data` | HR documents uploaded by users (mounted at `/data/uploads` in `app`) |
| `nginx_logs` | Nginx access and error logs |

---

## 2. Prerequisites

**On the server:**

- Docker Engine >= 24 and Docker Compose v2 (`docker compose`, not `docker-compose`)
- Ports **80** and **443** open and not used by another process
- DNS A record for your domain pointing to the server's public IP (required for a real TLS certificate — see section 5)
- Enough disk space for MongoDB data and uploaded documents (plan for your dataset size)

---

## 3. Environment Setup

The `app` service reads its configuration from a `.env` file in the project root (passed via `env_file: .env` in `docker-compose.yml`).

Copy the example file and fill in all required values:

```bash
cp .env.example .env
$EDITOR .env
```

**Required variables** (the application will refuse to start without them):

| Variable | Description |
|---|---|
| `MONGO_ROOT_USER` | MongoDB root username (used by the `mongo` service at init) |
| `MONGO_ROOT_PASSWORD` | MongoDB root password |
| `MONGO_URI` | Full MongoDB connection URI, e.g. `mongodb://user:pass@mongo:27017/nanoxplore_rh?authSource=admin` |
| `JWT_SECRET` | JWT signing secret, minimum 32 characters |
| `JWT_REFRESH_SECRET` | JWT refresh signing secret, minimum 32 characters, different from `JWT_SECRET` |

Generate secure secrets:

```bash
# 64-character hex string — use this for JWT_SECRET and JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# or with openssl
openssl rand -hex 32
```

For the full list of optional variables (`PORT`, `COOKIE_SECURE`, LDAP settings, mail settings, etc.) see `docs/ENVIRONMENT.md`.

---

## 4. Production Deploy

Run all commands from the project root (where `docker-compose.yml` lives).

**Standard deploy (single app instance):**

```bash
docker compose up -d --build
```

**High-availability mode (3 app instances behind nginx load balancer):**

```bash
docker compose up -d --build --scale app=3
```

**Verify all services are running and healthy:**

```bash
docker compose ps
```

All three services (`nginx`, `app`, `mongo`) should show status `running (healthy)`. The `app` service will show `(health: starting)` for up to 15 seconds after start while the healthcheck initializes.

**Health check:**

```bash
# From the host — requires nginx to be up and a valid TLS cert
curl -sf https://your-domain/api/health

# Direct to the app container, bypassing nginx
docker compose exec app wget -qO- http://localhost:3000/api/health
```

A healthy response returns HTTP 200 with a JSON body.

**View logs:**

```bash
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f mongo
```

---

## 5. TLS Certificates

Certificates are stored in `./nginx/certs/` and mounted into both the `app` container
(read-write, for UI uploads) and the `nginx` container (read-only). This directory is
**never committed to the repository** — `nginx/certs/*.pem` is git-ignored.

Nginx reads exactly two files:

```
nginx/certs/
├── fullchain.pem  ← certificate + chain
└── privkey.pem    ← private key
```

### Fresh deployment — automatic self-signed certificate

No manual step is required before the first `docker compose up`. The `cert-init` service
runs once at stack startup. If `fullchain.pem` or `privkey.pem` are missing, it
generates a self-signed RSA 2048 certificate for `localhost` into `nginx/certs/`, then
exits. Nginx only starts after `cert-init` completes successfully.

Your browser will display a certificate warning for the self-signed certificate; accept
the exception or replace the certificate as described below.

### Option A — Upload a real certificate via the admin UI (recommended)

1. Log in as an administrator and go to **Administration > SSL certificate**.
2. Upload your `fullchain.pem` (certificate + intermediate chain) and `privkey.pem`.
3. The API validates the files (PEM markers, expiry, key/certificate match) and writes
   them atomically to the shared `nginx/certs/` volume.
4. Reload nginx to activate the new certificate (no downtime):

```bash
docker compose kill -s HUP nginx
```

### Option B — Place certificate files manually

Copy your files directly onto the host, then reload nginx:

```bash
cp /path/to/fullchain.pem ./nginx/certs/fullchain.pem
cp /path/to/privkey.pem   ./nginx/certs/privkey.pem
chmod 600 ./nginx/certs/privkey.pem

docker compose kill -s HUP nginx
```

### Option C — Generate a self-signed certificate for a specific domain

```bash
bash scripts/gen-certs.sh your.domain.com
# Writes nginx/certs/fullchain.pem and nginx/certs/privkey.pem
docker compose kill -s HUP nginx
```

For details on the admin UI certificate page see `docs/CONFIGURATION.md`, section 4.

---

## 6. First Run

On a fresh deployment, no database seed is run automatically. You must create the initial admin user manually.

See `docs/INSTALLATION.md` for the exact steps (creating the admin user via `mongosh`, generating a bcrypt password hash, and verifying first login).

The application is stateless — no sticky sessions are needed when scaling horizontally.

---

## 7. CI/CD

The GitHub Actions workflow at `.github/workflows/cd.yml` runs on every push to `main` and on version tags (`v*`).

It does two things:

1. **Builds the Docker image** using the multi-stage `Dockerfile` (identical to a production build).
2. **Smoke test**: starts a temporary MongoDB container and the built `app` image on an isolated Docker network, waits 10 seconds, then confirms the container is still running and the log line `NanoXplore RH démarré` is present. This catches startup crashes (missing env vars, connection errors, broken builds) before they reach production.

The CI workflow does **not** push the image to a registry or deploy automatically. To deploy after a successful CI run, SSH into the server, pull the latest code, and run the deploy commands in section 4.

For update procedures (pull, rebuild, zero-downtime rollout) see `docs/UPDATE.md`.

---

## 8. Operational Basics

**Logs:**

```bash
# Follow live logs for a service
docker compose logs -f app
docker compose logs -f nginx

# Last 100 lines
docker compose logs --tail=100 app
```

Containers are configured with `json-file` logging, capped at `10m` per file with 3–5 rotated files.

**Health:**

```bash
# Show container status and health
docker compose ps

# Direct healthcheck endpoint
docker compose exec app wget -qO- http://localhost:3000/api/health
```

**Restart a service:**

```bash
docker compose restart app
```

**Backups:**

The only stateful data to back up is the MongoDB `mongo_data` volume and the `uploads_data` volume (HR documents).

See `docs/BACKUP_RESTORE.md` for backup commands, restore procedures, and recommended schedules.

---

## Security Notes

- MongoDB is **not exposed** to the host (no `ports:` mapping on `mongo`). It is only reachable from the `backend` Docker network.
- `nginx` has no direct access to the `backend` network — it can only reach `app`.
- The `app` container runs as a **non-root user** (`appuser`).
- `NODE_ENV=production` and `COOKIE_SECURE=true` are set unconditionally in `docker-compose.yml` — do not override them.
- Never commit `.env`, `nginx/certs/`, or any file containing secrets to the repository.
