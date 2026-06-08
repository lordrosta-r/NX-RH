# Backup & Restore — NanoXplore RH

This document covers backup and restore procedures for the two stateful pieces of
NanoXplore RH:

1. **MongoDB data** — stored in the `mongo_data` named volume, served by the `mongo`
   service (container `nx_mongo`).
2. **Uploaded files** — HR documents written by the `app` service to `/data/uploads`,
   stored in the `uploads_data` named volume.

All commands must be run from the project root (where `docker-compose.yml` lives).

---

## 1. What to Back Up

| Data | Docker volume | Path inside container |
|------|---------------|-----------------------|
| MongoDB database | `mongo_data` | `/data/db` (managed by mongod) |
| Uploaded HR documents | `uploads_data` | `/data/uploads` |

Both volumes survive container restarts and image upgrades. Back up **both** before any
migration, upgrade, or destructive operation.

---

## 2. MongoDB Backup

### 2.1 Create a dated dump with mongodump

```bash
# Set a timestamp once and reuse it
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

# Run mongodump inside the mongo container
# Replace $MONGO_ROOT_USER / $MONGO_ROOT_PASSWORD with your real credentials,
# or source your .env file first: set -a && source .env && set +a
docker compose exec mongo mongodump \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db nanoxplore_rh \
  --archive \
  --gzip \
  --out "/tmp/nxrh_${BACKUP_DATE}"
```

The dump is written **inside** the container at `/tmp/nxrh_<timestamp>/`. Copy it to
the host next.

### 2.2 Copy the dump to the host

```bash
# Copy the directory tree out of the container
docker cp nx_mongo:"/tmp/nxrh_${BACKUP_DATE}" "./backups/nxrh_${BACKUP_DATE}"

# Verify the archive is not empty
ls -lh "./backups/nxrh_${BACKUP_DATE}/nanoxplore_rh/"
```

If you prefer a single archive file:

```bash
docker compose exec mongo sh -c \
  "mongodump \
    --username \"$MONGO_ROOT_USER\" \
    --password \"$MONGO_ROOT_PASSWORD\" \
    --authenticationDatabase admin \
    --db nanoxplore_rh \
    --gzip \
    --archive=/tmp/nxrh_${BACKUP_DATE}.gz"

docker cp nx_mongo:"/tmp/nxrh_${BACKUP_DATE}.gz" "./backups/nxrh_${BACKUP_DATE}.gz"
```

---

## 3. MongoDB Restore

> **Warning: mongorestore overwrites existing data.** Stop the `app` service first to
> avoid write conflicts. Restore on a running MongoDB is safe but can cause inconsistent
> reads while the restore is in progress.

### 3.1 Stop the app tier (optional but recommended)

```bash
docker compose stop app
```

### 3.2 Copy the dump back into the container

```bash
# If you have a directory dump:
docker cp "./backups/nxrh_${BACKUP_DATE}" nx_mongo:/tmp/

# If you have a single .gz archive:
docker cp "./backups/nxrh_${BACKUP_DATE}.gz" nx_mongo:/tmp/
```

### 3.3 Run mongorestore

```bash
# From a directory dump (drop existing collections before restoring):
docker compose exec mongo mongorestore \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db nanoxplore_rh \
  --drop \
  --gzip \
  "/tmp/nxrh_${BACKUP_DATE}/nanoxplore_rh"

# From a single .gz archive:
docker compose exec mongo mongorestore \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db nanoxplore_rh \
  --drop \
  --gzip \
  --archive="/tmp/nxrh_${BACKUP_DATE}.gz"
```

### 3.4 Restart the app tier

```bash
docker compose start app
```

---

## 4. Uploads Volume Backup and Restore

The `uploads_data` volume is mounted at `/data/uploads` inside each `app` container.

### 4.1 Backup via a throwaway container

This method works even if the app is scaled to zero or is stopped.

```bash
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

docker run --rm \
  -v uploads_data:/data/uploads:ro \
  -v "$(pwd)/backups:/backup" \
  alpine \
  tar czf "/backup/uploads_${BACKUP_DATE}.tar.gz" -C /data/uploads .

ls -lh "./backups/uploads_${BACKUP_DATE}.tar.gz"
```

### 4.2 Backup via docker cp (requires a running app container)

```bash
# Find the first running app container name
APP_CONTAINER=$(docker compose ps -q app | head -1 | xargs docker inspect --format '{{.Name}}' | tr -d '/')

docker cp "${APP_CONTAINER}:/data/uploads" "./backups/uploads_${BACKUP_DATE}"
tar czf "./backups/uploads_${BACKUP_DATE}.tar.gz" -C "./backups" "uploads_${BACKUP_DATE}"
rm -rf "./backups/uploads_${BACKUP_DATE}"
```

### 4.3 Restore the uploads volume

```bash
# Restore into the named volume via a throwaway container
docker run --rm \
  -v uploads_data:/data/uploads \
  -v "$(pwd)/backups:/backup:ro" \
  alpine \
  sh -c "rm -rf /data/uploads/* && tar xzf /backup/uploads_${BACKUP_DATE}.tar.gz -C /data/uploads"
```

After the restore, restart the app service so it picks up the restored files cleanly:

```bash
docker compose restart app
```

---

## 5. Scheduled Backup (Cron)

Add this entry to the crontab on the host (`crontab -e`). It runs every day at 02:00
and writes dated archives into `/opt/nxrh/backups/`.

```cron
0 2 * * * cd /opt/nxrh && \
  set -a && source .env && set +a && \
  BACKUP_DATE=$(date +\%Y\%m\%d_\%H\%M\%S) && \
  docker compose exec -T mongo mongodump \
    --username "$MONGO_ROOT_USER" \
    --password "$MONGO_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --db nanoxplore_rh \
    --gzip \
    --archive=/tmp/nxrh_${BACKUP_DATE}.gz && \
  docker cp nx_mongo:/tmp/nxrh_${BACKUP_DATE}.gz /opt/nxrh/backups/nxrh_${BACKUP_DATE}.gz && \
  docker run --rm \
    -v uploads_data:/data/uploads:ro \
    -v /opt/nxrh/backups:/backup \
    alpine tar czf /backup/uploads_${BACKUP_DATE}.tar.gz -C /data/uploads . \
  >> /var/log/nxrh-backup.log 2>&1
```

Use `docker compose exec -T` (no pseudo-TTY) when running from cron.

---

## 6. Verification and Retention

### Verify a MongoDB backup

```bash
# List collections and document counts in the archive
docker compose exec mongo mongorestore \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db nanoxplore_rh_verify \
  --gzip \
  --archive="./backups/nxrh_${BACKUP_DATE}.gz" \
  --dryRun
```

After a real restore, check collection stats:

```bash
docker compose exec mongo mongosh \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --eval "use('nanoxplore_rh'); db.stats()"
```

### Verify an uploads backup

```bash
# List archived paths and sizes
tar tzf "./backups/uploads_${BACKUP_DATE}.tar.gz" | head -30
```

### Retention policy

Delete backups older than N days from the local backup directory:

```bash
# Keep 14 days of backups
find /opt/nxrh/backups -name "nxrh_*.gz" -mtime +14 -delete
find /opt/nxrh/backups -name "uploads_*.tar.gz" -mtime +14 -delete
```

Add this `find` command to the same cron job to automate pruning.

**Off-host storage:** After each successful backup, copy the archives to a remote
location (S3, SFTP, NFS share). Example with the AWS CLI:

```bash
aws s3 cp /opt/nxrh/backups/nxrh_${BACKUP_DATE}.gz \
  s3://your-bucket/nxrh/db/nxrh_${BACKUP_DATE}.gz

aws s3 cp /opt/nxrh/backups/uploads_${BACKUP_DATE}.tar.gz \
  s3://your-bucket/nxrh/uploads/uploads_${BACKUP_DATE}.tar.gz
```

Recommended minimum: **7 daily backups** on-host + **4 weekly backups** off-host.
Test a full restore in a staging environment at least once per quarter.
