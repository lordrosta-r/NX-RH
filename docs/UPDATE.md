# NanoXplore RH — Updating a Production Deployment

This document describes how to safely update an existing production deployment of NanoXplore RH
(nginx + app + mongo, orchestrated with Docker Compose).

> **Before you start:** read this entire document once before executing any command.

---

## 0. Prerequisites

- SSH access to the production host
- `git` available on the host (the repository is checked out there)
- Docker and Docker Compose v2 installed (`docker compose` command, not `docker-compose`)
- A recent database backup (see step 1)

---

## 1. Back Up First — Always

**Never update without a verified backup.** If anything goes wrong, this is your only safety net.

Full backup procedure: see [docs/BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

Quick one-liner to dump the database from inside the running container:

```bash
docker compose exec mongo mongodump \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db "${MONGO_DB:-nanoxplore_rh}" \
  --out /tmp/backup-before-update

# Copy the dump out of the container
docker compose cp mongo:/tmp/backup-before-update ./backup-before-update-$(date +%Y%m%d%H%M%S)
```

Verify the backup directory is non-empty before continuing:

```bash
ls -lh ./backup-before-update-*/
```

---

## 2. Fetch the New Version

### Using a release tag (recommended for production)

```bash
git fetch --tags

# List available tags to identify the target version
git tag --sort=-creatordate | head -20

# Check out the target tag
git checkout v1.2.3   # replace with the actual tag
```

### Using the main branch tip

```bash
git fetch origin
git checkout main
git pull origin main
```

Confirm the expected version is in place before building:

```bash
git log -1 --oneline
```

---

## 3. Rebuild and Restart

The Dockerfile uses a two-stage build: stage 1 compiles the Vite/React frontend, stage 2
produces the production Express image. Both stages run inside Docker; no local Node.js
installation is required on the host.

### Build the new image

```bash
docker compose build
```

This produces the `nanoxplore-rh:latest` image locally. The build is hermetic (all
dependencies are installed inside the container) so the host environment does not affect the
output.

### Roll out with minimal downtime

```bash
docker compose up -d
```

Docker Compose replaces containers one service at a time. The `nginx` service depends on the
`app` service being healthy (`condition: service_healthy`), so nginx is only reloaded once the
new app container passes its health check (`GET /api/health`, 30 s interval, 3 retries,
15 s start period). Expect a brief window (under one minute) during which in-flight requests
may be interrupted.

If you are running the app in high-availability mode (multiple replicas), use:

```bash
docker compose up -d --scale app=3
```

Docker Compose will roll the replicas in sequence, keeping at least some instances serving
traffic throughout.

---

## 4. Verify the Deployment

### Check container status

All three services should show status `Up` and, for `app` and `mongo`, `(healthy)`.

```bash
docker compose ps
```

Expected output (abridged):

```
NAME         IMAGE                  STATUS                   PORTS
nx_nginx     nginx:1.27-alpine      Up About a minute        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
nx_mongo     mongo:7                Up About a minute (healthy)
<app>        nanoxplore-rh:latest   Up About a minute (healthy)
```

### Hit the health endpoint

```bash
# From the host (through nginx + TLS)
curl -s https://<your-domain>/api/health

# Direct to the app container (bypasses nginx)
curl -s http://localhost:3000/api/health
```

Expected response:

```json
{"status":"ok"}
```

### Tail the application logs

```bash
docker compose logs -f app
```

Watch for startup errors, unhandled exceptions, or database connection failures. Press
`Ctrl+C` to stop following. To inspect the last 200 lines only:

```bash
docker compose logs --tail=200 app
```

---

## 5. Rollback Procedure

If the new version is broken and you need to revert:

### Step 1 — Check out the previous version

```bash
# If you updated to a tag, check out the previous tag
git checkout v1.2.2   # the last known-good version

# If you pulled the main branch, find the previous commit SHA
git log --oneline | head -10
git checkout <previous-sha>
```

### Step 2 — Rebuild and restart from that version

```bash
docker compose build
docker compose up -d
```

Verify with `docker compose ps` and the health endpoint as described in step 4.

### Step 3 — Restore the database if needed

If the new version wrote schema changes or corrupted data, restore from the backup taken in
step 1:

```bash
# Copy the dump back into the mongo container
docker compose cp ./backup-before-update-<timestamp>/ mongo:/tmp/restore/

# Run mongorestore inside the container
docker compose exec mongo mongorestore \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db "${MONGO_DB:-nanoxplore_rh}" \
  --drop \
  /tmp/restore/nanoxplore_rh/
```

The `--drop` flag removes existing collections before restoring, ensuring a clean state.
Use it only when you are certain the restore target is correct.

Full restore details: see [docs/BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

---

## 6. Dependency Updates (Dependabot PRs)

The repository uses Dependabot to open pull requests when npm or Docker image dependencies
have new versions available (e.g. `node:20-alpine`, `nginx:1.27-alpine`, `mongo:7`,
frontend and server npm packages).

Rules before merging a Dependabot PR:

1. Read the diff — understand what is being bumped and whether it is a patch, minor, or major
   bump.
2. CI must be green (all checks passed) before merging.
3. For major version bumps (e.g. `mongo:7` → `mongo:8`, Node.js 20 → 22), test on a staging
   environment first.
4. After merging, deploy to production following steps 1–4 of this document.

Do not merge Dependabot PRs directly to production without a backup.

---

## 7. Database Migrations

NanoXplore RH uses **Mongoose** (MongoDB ODM). There is no dedicated migration framework
(such as migrate-mongo or db-migrate) in the codebase. Schema evolution is handled at the
application level:

- Mongoose schemas define the expected shape of documents.
- New optional fields added to a schema are automatically tolerated by existing documents
  (which will simply return `undefined` for the new field).
- Existing documents are **not** automatically backfilled when a new field is added. If
  backfilling is required, it must be done via a one-off script run manually against the
  database after deployment.
- Removing or renaming a field in the schema does not delete data from existing documents in
  MongoDB; orphaned fields remain in the collection until explicitly purged.

**Recommended practice:** before deploying a version that changes a Mongoose schema in a
breaking way, take a full database backup (step 1), deploy, and verify that the application
handles both old-shaped and new-shaped documents correctly. If it does not, roll back
immediately (step 5).
