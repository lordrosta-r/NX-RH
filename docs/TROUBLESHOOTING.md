# NanoXplore RH — Troubleshooting Guide

Common operational problems, their causes, and step-by-step fixes with copy-paste commands.

> The Compose files live under `docker/`. Run commands from the project root and export this
> once per shell session so every `docker compose …` command below works as-is:
>
> ```bash
> export COMPOSE_FILE=docker/docker-compose.yml
> ```

---

## Table of Contents

1. [Container exits immediately](#1-container-exits-immediately)
2. [Permission denied on logs or uploads](#2-permission-denied-on-logs-or-uploads)
3. [Cannot connect to MongoDB](#3-cannot-connect-to-mongodb)
4. [502 Bad Gateway or blank page from nginx](#4-502-bad-gateway-or-blank-page-from-nginx)
5. [Login fails / 401 loop](#5-login-fails--401-loop)
6. [LDAP sync returns nothing](#6-ldap-sync-returns-nothing)
7. [Rate limit / 429 on login](#7-rate-limit--429-on-login)
8. [Reading logs](#8-reading-logs)
9. [Health endpoint](#9-health-endpoint)

---

## 1. Container exits immediately

### Symptom

The `app` container starts and stops within seconds. `docker compose ps` shows `Exited (1)`.

### Causes and fixes

#### Missing required environment variable

**Log line:**
```
Variable d'environnement manquante: JWT_SECRET
Variable d'environnement manquante: MONGO_URI
```

`JWT_SECRET` and `MONGO_URI` are mandatory. The process exits with code 1 if either is absent.

**Diagnose:**
```bash
docker compose logs app | tail -30
```

**Fix:** Ensure `.env` exists at the project root and contains both variables:
```bash
# Generate a strong JWT_SECRET (64 hex chars = 256 bits)
openssl rand -hex 32

# Example .env entries
JWT_SECRET=<output of the command above>
MONGO_URI=mongodb://appuser:strongpassword@mongo:27017/nanoxplore_rh?authSource=admin
```

Restart after editing `.env`:
```bash
docker compose up -d app
```

---

#### JWT_SECRET too short

**Log line:**
```
JWT_SECRET trop courte (minimum 32 caractères)
```

The secret must be at least 32 characters long. The server exits immediately if it is shorter.

**Fix:**
```bash
# Generate a secret that is at least 32 characters (64 hex chars is recommended)
openssl rand -hex 32
```

Update `.env`, then:
```bash
docker compose up -d app
```

---

#### Production guardrails: weak or default secrets

In `NODE_ENV=production`, the server also rejects the following and exits with code 1:

- `JWT_SECRET` that matches patterns like `dev`, `changeme`, `secret_key`, `not_for_production`, `example`, or `placeholder`
- `JWT_REFRESH_SECRET` missing, shorter than 32 characters, or derived from `JWT_SECRET` (same value or `JWT_SECRET + "_refresh"`)
- `MONGO_URI` containing the default password `changeme`
- `E2E_MODE=true` (disables login rate limiting — forbidden in production)
- `LDAP_TLS_REJECT_UNAUTHORIZED=false` (disables TLS certificate verification)

**Log lines (examples):**
```
[boot] Config production dangereuse : JWT_SECRET ressemble à une valeur par défaut/dev — générez un secret aléatoire (≥64 car.)
[boot] Config production dangereuse : JWT_REFRESH_SECRET manquant ou trop court — définissez un secret aléatoire distinct (≥32 car.)
[boot] Config production dangereuse : MONGO_URI utilise le mot de passe par défaut « changeme »
[boot] Config production dangereuse : E2E_MODE=true désactive le rate-limit de login — interdit en production
[boot] Config production dangereuse : LDAP_TLS_REJECT_UNAUTHORIZED=false désactive la vérification TLS du LDAP — interdit en production
```

**Fix:** Generate independent, random secrets for both `JWT_SECRET` and `JWT_REFRESH_SECRET`:
```bash
openssl rand -hex 32   # use for JWT_SECRET
openssl rand -hex 32   # use for JWT_REFRESH_SECRET (must be different)
```

Update `.env` and restart:
```bash
docker compose up -d app
```

---

#### MONGO_ROOT_USER or MONGO_ROOT_PASSWORD not set

**Log line (from Docker Compose itself, before containers start):**
```
variable is not set. Defaulting to a blank string.
```
or a hard error because the variable is marked required in `docker-compose.yml`:
```
MONGO_ROOT_USER is required
MONGO_ROOT_PASSWORD is required
```

**Fix:** Add them to `.env`:
```bash
MONGO_ROOT_USER=root
MONGO_ROOT_PASSWORD=<strong password>
```

---

## 2. Permission denied on logs or uploads

### Symptom

The app container logs errors like:
```
EACCES: permission denied, mkdir '/app/logs'
EACCES: permission denied, open '/data/uploads/...'
```

### Cause

The container runs as the non-root user `appuser`. The Dockerfile creates and `chown`s both `/app/logs` and `/data/uploads` during the build. If an external volume or bind-mount overrides those directories at runtime, it may be owned by `root`, preventing writes.

### Fix

**Verify the volume owner inside the running container:**
```bash
docker compose exec app ls -la /app/logs
docker compose exec app ls -la /data/uploads
```

Expected owner: `appuser`.

If a named volume was created before the current Dockerfile (which added the `chown`), remove it and let Docker recreate it:
```bash
# Stop everything first
docker compose down

# Inspect the volume
docker volume inspect nx-rh_uploads_data

# Remove and recreate (data will be lost — back up first)
docker volume rm nx-rh_uploads_data
docker compose up -d
```

For bind-mounts, fix the host-side ownership:
```bash
# Replace 1001 with the UID of appuser inside the container
docker compose run --rm app id appuser
sudo chown -R 1001:1001 ./path/to/bind-mount
```

---

## 3. Cannot connect to MongoDB

### Symptom

The `app` container is healthy but API calls return 503, or the app log shows repeated connection errors. `GET /api/health` returns `{"status":"degraded"}`.

### Causes and fixes

#### Wrong MONGO_URI

The `app` service depends on the `mongo` service only on the `backend` network. The hostname must be `mongo` (the service name), not `localhost`.

**Correct URI format:**
```
mongodb://appuser:password@mongo:27017/nanoxplore_rh?authSource=admin
```

**Diagnose:**
```bash
docker compose logs app | grep -i mongo
docker compose logs mongo | tail -50
```

#### MongoDB container not healthy

```bash
docker compose ps
```

Look for `mongo` — it should show `healthy`. If it is `starting` or `unhealthy`:
```bash
docker compose logs mongo | tail -50
```

Wait for MongoDB to complete its healthcheck (up to 30 s start period + 5 retries × 10 s = 80 s max), then restart the app:
```bash
docker compose restart app
```

#### Authentication failure

If `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` do not match what was used when the `mongo_data` volume was first initialized, MongoDB will reject the connection.

**Fix:** Either update the credentials to match the original ones, or remove the volume and reinitialize (all data will be lost):
```bash
docker compose down
docker volume rm nx-rh_mongo_data
docker compose up -d
```

---

## 4. 502 Bad Gateway or blank page from nginx

### Symptom

The browser shows a 502 error or a blank page when accessing the application.

### Causes and fixes

#### App container not yet healthy

Nginx depends on `app` with `condition: service_healthy`. If the app is still starting (healthcheck has a 15 s start period), nginx may not be routing yet.

**Diagnose:**
```bash
docker compose ps
docker compose logs nginx | tail -30
docker compose logs app | tail -30
```

Wait for the `app` container to report `healthy`, then reload nginx if needed:
```bash
docker compose exec nginx nginx -s reload
```

#### TLS certificate missing or wrong path

Nginx mounts certificates from `./nginx/certs`. If the files are absent or the path in the nginx config does not match, nginx fails to start.

**Diagnose:**
```bash
docker compose logs nginx | grep -i ssl
ls -la ./nginx/certs/
```

**Fix:** Place the certificate and key files in `./nginx/certs/` and ensure the filenames match the nginx configuration. Reload nginx:
```bash
docker compose exec nginx nginx -t          # test config
docker compose exec nginx nginx -s reload   # reload without downtime
```

#### Quick health check

```bash
# From the host, bypass nginx and hit the app directly
curl -s http://localhost:3000/api/health

# Through nginx (production)
curl -sk https://<your-domain>/api/health
```

Expected response: `{"status":"ok"}`

---

## 5. Login fails / 401 loop

### Symptom

Credentials are correct but the user is redirected back to the login page, or the browser shows a 401 on every API request after login.

### Causes and fixes

#### Cookie not set (HTTPS / SameSite issue)

The app sets `COOKIE_SECURE=true` in the `docker-compose.yml` `environment` block. Secure cookies are only sent over HTTPS. If nginx is terminating TLS but the browser is connecting over HTTP, the cookie is dropped.

**Fix:** Ensure the browser accesses the application via `https://`. If using a self-signed certificate, the browser must trust it (add a security exception or install the CA).

#### JWT_SECRET changed between deploys

Changing `JWT_SECRET` invalidates all existing sessions immediately. Any user with an active session will receive a 401 and be redirected to `/login`.

**This is expected behavior.** All users must log in again. Communicate the change in advance if possible.

#### Clock skew between host and container

JWT tokens include an expiry (`exp`) checked against the server clock. If the host clock drifts more than a few minutes, tokens may be rejected as expired or not-yet-valid.

**Diagnose:**
```bash
docker compose exec app date
date
```

**Fix:** Synchronize the host clock (`timedatectl set-ntp true` on Linux, or check NTP service).

#### JWT_REFRESH_SECRET missing in production

If `JWT_REFRESH_SECRET` is not set, token refresh fails and users are logged out after the short-lived access token expires.

**Fix:** Set `JWT_REFRESH_SECRET` in `.env` (independent random value, at least 32 characters):
```bash
openssl rand -hex 32
```

---

## 6. LDAP sync returns nothing

### Symptom

The LDAP import in the admin UI completes without errors but imports zero users, or the Test/Preview returns an empty list.

### Causes and fixes

#### Wrong baseDN

The `baseDN` must point to the correct organizational unit that contains the user entries.

**Fix:** Use the Test/Preview button in the admin LDAP configuration UI (`/admin/ldap`) to validate your `baseDN` and filter before running a full sync.

#### Restrictive search filter

The default filter may exclude accounts that are disabled, or the `objectClass` used does not match your directory schema (e.g., `person` vs `inetOrgPerson` vs `user`).

**Fix:** Adjust the filter in the admin LDAP settings and use Test/Preview to verify results.

#### LDAP TLS issue (non-production)

In non-production environments, if the LDAP server uses a self-signed certificate, set:
```
LDAP_TLS_REJECT_UNAUTHORIZED=false
```
in `.env`. **Do not use this in production** — the server boot guard will reject it.

**Diagnose:**
```bash
docker compose logs app | grep -i ldap
```

---

## 7. Rate limit / 429 on login

### Symptom

Repeated login attempts return HTTP 429 Too Many Requests.

### Cause

The API applies a rate limiter: 2000 requests per minute for general API traffic and 500 per minute for mutation endpoints. Automated testing or scripts that hit `/api/auth/login` repeatedly will trigger this limit.

### Fix (development / testing only)

Set `E2E_MODE=true` in `.env` to disable the login rate limiter:
```
E2E_MODE=true
```

**This setting is blocked in production.** The server will refuse to start if `NODE_ENV=production` and `E2E_MODE=true`.

For production rate limit adjustments, modify the `rateLimit` configuration in `mongo/server/index.js` and rebuild the image.

---

## 8. Reading logs

### Application logs (Node.js / Express)

```bash
# Stream live logs
docker compose logs -f app

# Last 200 lines
docker compose logs --tail=200 app

# All services simultaneously
docker compose logs -f
```

### Nginx logs

```bash
docker compose logs -f nginx
```

The nginx log volume (`nginx_logs`) is also accessible via:
```bash
docker compose exec nginx tail -f /var/log/nginx/access.log
docker compose exec nginx tail -f /var/log/nginx/error.log
```

### MongoDB logs

```bash
docker compose logs -f mongo
```

### Container status at a glance

```bash
docker compose ps
docker stats --no-stream
```

---

## 9. Health endpoint

The application exposes a public health endpoint that returns HTTP 200 when the database connection is active, or HTTP 503 when degraded.

```bash
# Direct (bypasses nginx)
curl -s http://localhost:3000/api/health

# Through nginx (production)
curl -sk https://<your-domain>/api/health
```

**Healthy response:**
```json
{"status":"ok"}
```

**Degraded response (MongoDB disconnected):**
```json
{"status":"degraded"}
```

A detailed health endpoint is available to admin users only and includes memory usage, database pool stats, scheduler locks, and metrics:

```bash
# Requires a valid admin session cookie
curl -s https://<your-domain>/api/health/detail \
  --cookie "token=<your-admin-jwt>"
```
