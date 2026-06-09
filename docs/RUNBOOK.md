# RUNBOOK NX-RH

Procédures opérationnelles pour la production.

---

## API Versioning

### Version courante
`v1`

### URLs
| Environnement | Base URL |
|---|---|
| Développement | `http://localhost:3001/api/v1` (ou `https://localhost/api/v1` via nginx) |
| Production | `https://<host>/api/v1` |

L'alias `/api/` (sans version) est maintenu pour la compatibilité ascendante ; il pointe vers la même version que `/api/v1/`.

### Format de réponse standard

Toutes les réponses passent par `utils/apiResponse.js` :

**Succès — ressource unique**
```json
{ "success": true, "data": { ... } }
```

**Succès — liste paginée**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "total": 42, "page": 1, "limit": 20, "pages": 3, "hasNext": true, "hasPrev": false }
}
```

**Création (201)**
```json
{ "success": true, "message": "Created", "data": { ... } }
```

**No Content (204)** — corps vide.

### Ajouter une nouvelle version (v2)
1. Créer `routes/v2/` avec les nouveaux handlers.
2. Dans `index.js`, monter `v2Router` sur `/api/v2`.
3. Conserver le montage `/api` sur la dernière version stable.

---

## Backup

### Lancement manuel

```bash
# Variables par défaut (mongodb://localhost:27017/nxrh, rétention 7 jours)
./mongo/database/backup.sh

# Avec surcharge
BACKUP_DIR=/data/backups MONGO_URI=mongodb://prod-host:27017/nxrh RETENTION_DAYS=14 \
  ./mongo/database/backup.sh
```

### Fréquence recommandée

**Quotidien** via cron (ex. 2h du matin) :

```cron
0 2 * * * MONGO_URI=mongodb://localhost:27017/nxrh /opt/nxrh/mongo/database/backup.sh >> /var/log/nxrh-backup.log 2>&1
```

---

## Restore

```bash
# 1. Extraire l'archive
tar -xzf /backups/nxrh_<timestamp>.tar.gz -C /tmp

# 2. Restaurer
mongorestore --uri="mongodb://localhost:27017" --db=nxrh /tmp/nxrh_<timestamp>/nxrh/

# 3. Vérifier
mongo nxrh --eval "db.stats()"
```

---

## Rollback deployment

```bash
# Retirer la dernière image et redémarrer depuis la précédente
docker-compose pull && docker-compose up -d --no-deps server

# Rollback vers un tag spécifique
IMAGE_TAG=v1.2.3 docker-compose up -d --no-deps server
```

---

## Monitoring

### Health check

```bash
curl http://localhost:3000/api/health
# Réponse attendue : {"status":"ok"}
```

En production (derrière Nginx) :

```bash
curl https://<domain>/api/health
```

### Vérification des conteneurs

```bash
docker-compose ps
docker stats --no-stream
```

---

## Logs

```bash
# Logs temps réel du serveur Node.js
docker-compose logs -f server

# Dernières 200 lignes
docker-compose logs --tail=200 server

# Tous les services
docker-compose logs -f
```

---

## Variables d'environnement critiques (production)

| Variable | Description | Obligatoire |
|---|---|---|
| `MONGO_URI` | URI complète MongoDB (avec auth) | ✅ |
| `JWT_SECRET` | Secret de signature des tokens JWT (≥ 32 chars) | ✅ |
| `JWT_EXPIRES_IN` | Durée de vie des tokens (ex. `8h`, `1d`) | ✅ |
| `NODE_ENV` | Doit être `production` | ✅ |
| `PORT` | Port d'écoute du serveur (défaut : 3000) | ⚠️ |
| `BACKUP_DIR` | Répertoire de stockage des backups | ⚠️ |
| `RETENTION_DAYS` | Nombre de jours de rétention des backups | ⚠️ |
