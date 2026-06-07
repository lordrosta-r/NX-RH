# MongoDB Deployment & Management Guide

NanoXplore RH uses **MongoDB 7** as its primary database, managed via Docker with
a named volume for data persistence.

---

## Docker Service Configuration

From `docker-compose.yml`:

```yaml
mongo:
  image: mongo:7
  container_name: nx_mongo
  restart: unless-stopped
  environment:
    MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
    MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    MONGO_INITDB_DATABASE: ${MONGO_DB:-nanoxplore_rh}
  volumes:
    - mongo_data:/data/db   # Named volume — survives container restarts
  expose:
    - "27017"               # Internal only — never mapped to host in production
  networks:
    - backend               # Isolated — nginx has no DB access
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
    interval: 10s
    retries: 5
    start_period: 30s
```

> ⚠️ MongoDB port **27017 is never exposed to the host** in production.  
> Only the `app` service (on the `backend` network) can connect to it.

---

## Connection String Format

```
mongodb://<user>:<password>@<host>:<port>/<database>?authSource=admin
```

### In `.env` (Docker stack)

```dotenv
MONGO_ROOT_USER=rh_admin
MONGO_ROOT_PASSWORD=<strong-password>
MONGO_DB=nanoxplore_rh
MONGO_URI=mongodb://rh_admin:<strong-password>@mongo:27017/nanoxplore_rh?authSource=admin
```

The hostname `mongo` resolves to the MongoDB container on the Docker `backend` network.

### Local development (MongoDB on host)

```dotenv
MONGO_URI=mongodb://localhost:27017/nanoxplore_rh
```

---

## Authentication

### Root admin (created automatically by Docker)

The `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` variables are
applied only on the **first start** when the `mongo_data` volume is empty.
They create a root user in the `admin` database.

### Application user (optional hardening)

For production, create a least-privilege application user:

```bash
docker compose exec mongo mongosh -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin
```

```javascript
use nanoxplore_rh
db.createUser({
  user: "nx_app",
  pwd:  "<app-password>",
  roles: [{ role: "readWrite", db: "nanoxplore_rh" }]
})
```

Then update `MONGO_URI` to use `nx_app` instead of the root account.

---

## Data Persistence

Data is stored in the named Docker volume `mongo_data`:

```bash
# Inspect volume location
docker volume inspect taff_mongo_data

# List volumes
docker volume ls | grep mongo
```

The volume persists across `docker compose down` and container rebuilds.
Only `docker compose down -v` removes it — **never run that in production**.

---

## Backup Procedure

### Full database dump

```bash
# Dump to a timestamped directory on the host
docker compose exec mongo mongodump \
  --uri "mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@localhost:27017/nanoxplore_rh?authSource=admin" \
  --out /tmp/dump

# Copy the dump out of the container
docker cp nx_mongo:/tmp/dump ./backups/$(date +%Y%m%d_%H%M%S)
```

### Automated daily backup (cron example)

```bash
# /etc/cron.d/nx-mongo-backup
0 2 * * * root cd /opt/nanoxplore-rh && docker compose exec -T mongo \
  mongodump --uri "mongodb://$$MONGO_ROOT_USER:$$MONGO_ROOT_PASSWORD@localhost:27017/nanoxplore_rh?authSource=admin" \
  --archive=/tmp/nx_rh_$(date +\%Y\%m\%d).gz --gzip \
  && docker cp nx_mongo:/tmp/nx_rh_$(date +\%Y\%m\%d).gz ./backups/
```

---

## Restore Procedure

```bash
# Copy dump archive into the container
docker cp ./backups/20240115_020000 nx_mongo:/tmp/restore

# Restore (will overwrite existing data)
docker compose exec mongo mongorestore \
  --uri "mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@localhost:27017?authSource=admin" \
  --drop \
  /tmp/restore
```

---

## Key Indexes

Indexes are defined in Mongoose models and created automatically on startup.

### `users` collection

| Index | Fields | Notes |
|-------|--------|-------|
| Unique | `email` | Primary lookup for auth and user management |
| Unique (partial) | `ldapDn` | Sparse — only indexes non-null LDAP DNs |
| Compound | `managerId, isActive` | Manager team queries |
| Compound | `managerId, role, isActive` | Role-filtered team queries |
| Compound | `isActive, role` | Dashboard filters |
| Single | `department` | Department-level reporting |

### `evaluations` collection

| Index | Fields | Notes |
|-------|--------|-------|
| Unique compound | `campaignId, formId, evaluatorId, evaluateeId` | Prevents duplicate assignments |
| Single | `campaignId` | Campaign-level queries |
| Compound | `campaignId, status` | Status dashboards |
| Compound | `evaluateeId, campaignId` | Employee's own evaluations |
| Compound | `evaluatorId, campaignId` | Manager's evaluation queue |
| Single | `dueDate` | Deadline scheduler |

### `campaigns` collection

| Index | Fields | Notes |
|-------|--------|-------|
| Single | `status` | Active campaigns filter |
| Single | `createdBy` | HR "my campaigns" dashboard |
| Compound | `startDate, endDate` | Scheduler and date-range queries |

---

## Monitoring

```bash
# Check MongoDB is responding
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Server status (connections, memory, opcounters)
docker compose exec mongo mongosh -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin --eval "db.serverStatus()" | head -60

# Current operations (find slow queries)
docker compose exec mongo mongosh -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin --eval "db.currentOp({ active: true, secs_running: { \$gt: 1 } })"

# Collection stats
docker compose exec mongo mongosh nanoxplore_rh --eval "db.stats()"
```

---

## Production Checklist

- [ ] **Authentication enabled** — `MONGO_ROOT_USER` and `MONGO_ROOT_PASSWORD` are set (non-empty)
- [ ] **Port not exposed** — `27017` is not listed under `ports:` in `docker-compose.yml`
- [ ] **Network isolation** — only `app` is on the `backend` network
- [ ] **Named volume** — `mongo_data` is used (not a bind mount)
- [ ] **Regular backups** — automated dump + offsite copy
- [ ] **Backup restore tested** — restore procedure verified at least once
- [ ] **Strong passwords** — root password ≥ 20 characters, randomly generated
- [ ] **Connection string uses authSource=admin** — required for root-level auth
