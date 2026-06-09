# Sauvegarde et Restauration

Ce document couvre les procédures de sauvegarde et de restauration des deux données avec état
de NanoXplore RH. Toutes les commandes s'exécutent depuis la racine du projet (là où se trouve
`docker-compose.yml`).

---

## Ce qu'il faut sauvegarder

| Donnée | Volume Docker | Chemin dans le conteneur |
|--------|--------------|--------------------------|
| Base de données MongoDB | `mongo_data` | `/data/db` (géré par mongod) |
| Documents RH téléversés | `uploads_data` | `/data/uploads` |

Les deux volumes survivent aux redémarrages et aux mises à jour d'image. Sauvegarder **les deux**
avant toute migration, mise à jour ou opération destructrice.

Les noms de services Docker Compose utilisés dans ce document sont :
- `mongo` — le service MongoDB (conteneur `nx_mongo`)
- `app` — le service applicatif Node.js/Express

---

## Sauvegarde MongoDB

### Créer un dump daté avec mongodump

```bash
# Définir un horodatage et le réutiliser
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

# Charger les variables d'environnement depuis .env si nécessaire
set -a && source .env && set +a

# Lancer mongodump dans le conteneur mongo
docker compose exec mongo mongodump \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db nanoxplore_rh \
  --gzip \
  --archive=/tmp/nxrh_${BACKUP_DATE}.gz
```

### Copier l'archive sur l'hote

```bash
docker cp nx_mongo:"/tmp/nxrh_${BACKUP_DATE}.gz" "./backups/nxrh_${BACKUP_DATE}.gz"

# Verifier que l'archive n'est pas vide
ls -lh "./backups/nxrh_${BACKUP_DATE}.gz"
```

---

## Restauration MongoDB

**Attention :** `mongorestore` ecrase les données existantes. Arreter le service `app` avant de
restaurer pour éviter les conflits en écriture.

### 1. Arreter le service applicatif

```bash
docker compose stop app
```

### 2. Copier l'archive dans le conteneur

```bash
docker cp "./backups/nxrh_${BACKUP_DATE}.gz" nx_mongo:/tmp/
```

### 3. Lancer mongorestore

```bash
docker compose exec mongo mongorestore \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db nanoxplore_rh \
  --drop \
  --gzip \
  --archive="/tmp/nxrh_${BACKUP_DATE}.gz"
```

Le flag `--drop` supprime les collections existantes avant de les recréer depuis l'archive.

### 4. Redémarrer le service applicatif

```bash
docker compose start app
```

---

## Sauvegarde du volume uploads

### Via un conteneur jetable (recommande)

Cette methode fonctionne même si le service `app` est arrêté ou mis à l'echelle à zéro.

```bash
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

docker run --rm \
  -v uploads_data:/data/uploads:ro \
  -v "$(pwd)/backups:/backup" \
  alpine \
  tar czf "/backup/uploads_${BACKUP_DATE}.tar.gz" -C /data/uploads .

ls -lh "./backups/uploads_${BACKUP_DATE}.tar.gz"
```

### Via docker cp (service app en cours d'exécution)

```bash
APP_CONTAINER=$(docker compose ps -q app | head -1 | xargs docker inspect --format '{{.Name}}' | tr -d '/')

docker cp "${APP_CONTAINER}:/data/uploads" "./backups/uploads_${BACKUP_DATE}"
tar czf "./backups/uploads_${BACKUP_DATE}.tar.gz" -C "./backups" "uploads_${BACKUP_DATE}"
rm -rf "./backups/uploads_${BACKUP_DATE}"
```

---

## Restauration du volume uploads

```bash
docker run --rm \
  -v uploads_data:/data/uploads \
  -v "$(pwd)/backups:/backup:ro" \
  alpine \
  sh -c "rm -rf /data/uploads/* && tar xzf /backup/uploads_${BACKUP_DATE}.tar.gz -C /data/uploads"

docker compose restart app
```

---

## Sauvegarde automatisee (cron)

Ajouter cette entrée dans la crontab de l'hôte (`crontab -e`). Elle s'exécute chaque jour à 02h00
et écrit des archives datées dans `/opt/nxrh/backups/`.

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

Utiliser `docker compose exec -T` (sans pseudo-TTY) quand on exécute depuis cron.

---

## Vérification et rétention

### Vérifier une sauvegarde MongoDB (dry run)

```bash
docker compose exec mongo mongorestore \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db nanoxplore_rh_verify \
  --gzip \
  --archive="./backups/nxrh_${BACKUP_DATE}.gz" \
  --dryRun
```

### Vérifier les statistiques apres restauration

```bash
docker compose exec mongo mongosh \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --eval "use('nanoxplore_rh'); db.stats()"
```

### Vérifier une sauvegarde uploads

```bash
tar tzf "./backups/uploads_${BACKUP_DATE}.tar.gz" | head -30
```

### Politique de rétention

Supprimer les sauvegardes de plus de 14 jours :

```bash
find /opt/nxrh/backups -name "nxrh_*.gz" -mtime +14 -delete
find /opt/nxrh/backups -name "uploads_*.tar.gz" -mtime +14 -delete
```

Ajouter ces commandes `find` au même job cron pour automatiser la purge.

### Stockage hors site

Après chaque sauvegarde réussie, copier les archives vers un emplacement distant. Exemple avec
l'AWS CLI :

```bash
aws s3 cp /opt/nxrh/backups/nxrh_${BACKUP_DATE}.gz \
  s3://your-bucket/nxrh/db/nxrh_${BACKUP_DATE}.gz

aws s3 cp /opt/nxrh/backups/uploads_${BACKUP_DATE}.tar.gz \
  s3://your-bucket/nxrh/uploads/uploads_${BACKUP_DATE}.tar.gz
```

Minimum recommandé : **7 sauvegardes quotidiennes** en local + **4 sauvegardes hebdomadaires**
hors site. Tester une restauration complète en environnement de staging au moins une fois par
trimestre.

---

Voir [[Mise-a-jour]] pour les procédures de mise à jour de l'application et les précautions à
prendre avant toute opération sur les volumes.
