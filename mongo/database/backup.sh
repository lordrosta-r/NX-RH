#!/bin/bash
# =============================================================================
# database/backup.sh — Backup MongoDB NX-RH
#
# USAGE :
#   chmod +x database/backup.sh
#   ./database/backup.sh
#
# Variables d'environnement configurables :
#   BACKUP_DIR      Répertoire de destination  (défaut: /backups)
#   MONGO_URI       URI MongoDB                (défaut: mongodb://localhost:27017/nxrh)
#   DB_NAME         Nom de la base             (défaut: nxrh)
#   RETENTION_DAYS  Rétention en jours         (défaut: 7)
#
# RESTORE :
#   tar -xzf /backups/nxrh_<timestamp>.tar.gz -C /tmp
#   mongorestore --uri="$MONGO_URI" --db nxrh /tmp/nxrh_<timestamp>/nxrh/
# =============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/nxrh}"
DB_NAME="${DB_NAME:-nxrh}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/nxrh_$TIMESTAMP"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
echo "[backup] Démarrage backup $DB_NAME → $BACKUP_PATH"
mongodump --uri="$MONGO_URI" --db="$DB_NAME" --out="$BACKUP_PATH"
tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "nxrh_$TIMESTAMP"
rm -rf "$BACKUP_PATH"
echo "[backup] Backup créé : ${BACKUP_PATH}.tar.gz"

# Purge anciens backups
find "$BACKUP_DIR" -name "nxrh_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete
echo "[backup] Purge des backups > $RETENTION_DAYS jours terminée"
