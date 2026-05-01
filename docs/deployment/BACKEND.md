# Backend Deployment Guide

NanoXplore RH — Express API + MongoDB + Nginx on Docker.

---

## Architecture Overview

```
Internet
   │
   ▼
Nginx 1.27 (port 80/443)   ← SSL termination, reverse proxy, load balancer
   │  frontend network
   ▼
Express app (port 3000)    ← Node.js 18, horizontally scalable (1–N replicas)
   │  backend network
   ▼
MongoDB 7 (port 27017)     ← Internal only, never exposed to host in production
```

- **Nginx** handles TLS, serves static assets, and proxies `/api/*` to the app.
- **Express** serves the React SPA and mounts all API routes under `/api/`.
- **MongoDB** is isolated on the `backend` network — only `app` can reach it.

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Docker | 24.x |
| Docker Compose | v2 (plugin, `docker compose`) |
| Node.js | 18 LTS (local dev only) |
| npm | 9+ (local dev only) |
| openssl | any (certificate generation) |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in every value before starting.

```bash
cp .env.example .env
```

### Required

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | HS256 signing key — **minimum 32 characters**, use 64+ in production |
| `MONGO_URI` | Full MongoDB connection string (see MongoDB guide) |
| `MONGO_ROOT_USER` | MongoDB root username (used by `docker-compose.yml`) |
| `MONGO_ROOT_PASSWORD` | MongoDB root password |

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Set to `production` in Docker |
| `PORT` | `3000` | Port the Express server listens on |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated allowed CORS origins |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_PROVIDER` | `local` | `local` or `ldap` |
| `JWT_EXPIRES_IN` | `8h` | Token lifetime (e.g. `8h`, `1d`) |

### LDAP (required only when `AUTH_PROVIDER=ldap`)

| Variable | Description |
|----------|-------------|
| `LDAP_TYPE` | `activedirectory` or `openldap` |
| `LDAP_URL` | e.g. `ldaps://dc.corp.local:636` |
| `LDAP_BASE_DN` | e.g. `DC=corp,DC=local` |
| `LDAP_BIND_DN` | Service account DN |
| `LDAP_BIND_PASSWORD` | Service account password |
| `LDAP_USER_SEARCH_BASE` | OU to search for users |
| `LDAP_USER_FILTER` | e.g. `(sAMAccountName={{u}})` |
| `LDAP_TLS_REJECT_UNAUTHORIZED` | `true` (set `false` only for self-signed certs in dev) |

### Mail (SMTP)

| Variable | Description |
|----------|-------------|
| `MAIL_HOST` | SMTP server hostname |
| `MAIL_PORT` | `587` (STARTTLS) or `465` (SMTPS) |
| `MAIL_SECURE` | `false` for STARTTLS, `true` for SMTPS |
| `MAIL_USER` | SMTP authentication user |
| `MAIL_PASSWORD` | SMTP authentication password |
| `MAIL_FROM` | Sender address, e.g. `"NanoXplore RH <noreply@company.com>"` |

---

## Local Development (without Docker)

```bash
# 1. Install dependencies
cd mongo/server
npm install

# 2. Configure environment
cp ../../.env.example ../../.env
# Edit .env — set MONGO_URI to a local MongoDB instance, e.g.:
# MONGO_URI=mongodb://localhost:27017/nanoxplore_rh

# 3. Start with live-reload
npm run dev
```

The API is available at `http://localhost:3000`.  
The React client (Vite) runs separately:

```bash
cd client
npm install
npm run dev   # http://localhost:5173
```

---

## Docker Deployment

### 1. Generate TLS certificates

```bash
# Self-signed (development / staging)
bash scripts/gen-certs.sh yourdomain.com

# Production — Let's Encrypt
bash scripts/certbot-init.sh
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in JWT_SECRET, MONGO_ROOT_USER, MONGO_ROOT_PASSWORD, MONGO_URI, CLIENT_ORIGIN
```

### 3. Build and start

```bash
docker compose up -d --build
```

### 4. Check status

```bash
docker compose ps
```

### Scaling the API (high-availability)

```bash
# Run 3 app replicas behind Nginx load balancer
docker compose up -d --scale app=3
```

### View logs

```bash
docker compose logs -f app       # API logs (all replicas)
docker compose logs -f nginx     # Nginx access/error logs
docker compose logs -f mongo     # MongoDB logs
```

---

## Health Checks

The API exposes a health endpoint that also verifies the MongoDB connection:

```bash
curl http://localhost/api/health
# → {"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
# → HTTP 503 if MongoDB is unreachable
```

Docker uses this endpoint for its own health check (`interval: 30s`, `retries: 3`).

---

## Database Seeding

Seed scripts live in `mongo/database/`. Run them via the server's npm scripts:

```bash
# From mongo/server/
npm run seed            # Base seed (roles, minimal data)
npm run seed:users      # Demo users only
npm run seed:rich       # Full rich dataset (campaigns, evaluations, events…)
```

Or via Docker exec while the stack is running:

```bash
docker compose exec app npm run seed:rich
```

---

## Updating

```bash
git pull

# Rebuild and restart with zero-downtime rolling update
docker compose up -d --build

# Remove old unused images
docker image prune -f
```

---

## Common Issues

### Port 80/443 already in use

```bash
sudo lsof -i :80 -i :443
# Stop the conflicting process, then retry
```

### MongoDB connection refused at startup

- Verify `MONGO_URI` matches `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` in `.env`.
- The app waits for MongoDB's health check (`condition: service_healthy`) before starting.
- Check MongoDB logs: `docker compose logs mongo`.

### `JWT_SECRET too short` error at startup

`JWT_SECRET` must be **at least 32 characters**. Generate a secure value:

```bash
openssl rand -hex 32
```

### Nginx returns 502 Bad Gateway

The app container is not healthy yet. Wait 15–30 s for startup, then check:

```bash
docker compose ps app
docker compose logs app
```
