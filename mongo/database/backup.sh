#!/usr/bin/env bash
# =============================================================================
# database/backup.sh — Sauvegarde de la base MongoDB (mongodump)
#
# USAGE :
#   chmod +x database/backup.sh
#   ./database/backup.sh
#
# Crée un dump dans /backups/<date>/ (ex: /backups/2026-05-01/).
# Configurez MONGO_URI dans votre .env ou passez-le en variable d'environnement.
#
# RESTORE :
#   mongorestore --uri="$MONGO_URI" --db nanoxplore_rh /backups/2026-05-01/nanoxplore_rh/
# =============================================================================

set -euo pipefail

MONGO_URI="${MONGO_URI:?'MONGO_URI non défini — ajoutez-le dans votre .env'}"
BACKUP_DIR="/backups/$(date +%Y-%m-%d)"

echo "[backup] Démarrage du dump → $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

mongodump \
  --uri="$MONGO_URI" \
  --db nanoxplore_rh \
  --out="$BACKUP_DIR"

echo "[backup] Terminé ✓ — dump dans $BACKUP_DIR/nanoxplore_rh/"
