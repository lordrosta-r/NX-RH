# NanoXplore RH — Guide de déploiement en production

---

## 1. Prerequis

### Logiciels requis

| Composant | Version minimale | Verification |
|-----------|-----------------|--------------|
| Docker    | 24+             | `docker --version` |
| Docker Compose | v2 (intégré) | `docker compose version` |
| Git       | 2.x             | `git --version` |
| openssl   | 1.1+            | `openssl version` |

### Ressources système

- RAM : 4 Go minimum (8 Go recommandés en production)
- Disque : 20 Go minimum (données MongoDB incluses)
- Ports libres : **80** (HTTP) et **443** (HTTPS)

Vérifier que les ports ne sont pas déjà utilisés :

```bash
ss -tlnp | grep -E ':80|:443'
```

---

## 2. Déploiement Docker

### 2.1 Cloner le dépôt

```bash
git clone https://github.com/votre-org/NX-RH.git
cd NX-RH
```

### 2.2 Configurer les variables d'environnement

Copier le fichier d'exemple et renseigner toutes les valeurs :

```bash
cp .env.example .env
```

Ouvrir `.env` et remplir chaque variable :

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `NODE_ENV` | oui | Mettre `production` |
| `PORT` | non | Port interne Express (défaut : `3000`) |
| `MONGO_URI` | oui | URI de connexion MongoDB (voir exemple ci-dessous) |
| `MONGO_ROOT_USER` | oui | Nom d'utilisateur root MongoDB |
| `MONGO_ROOT_PASSWORD` | oui | Mot de passe root MongoDB |
| `MONGO_DB` | non | Nom de la base (défaut : `nanoxplore_rh`) |
| `AUTH_PROVIDER` | oui | `local` ou `ldap` |
| `JWT_SECRET` | oui | Clé secrète JWT (64 caractères minimum) |
| `JWT_EXPIRES_IN` | non | Durée du token (défaut : `8h`) |
| `LDAP_TYPE` | si LDAP | `activedirectory` ou `openldap` |
| `LDAP_URL` | si LDAP | URL du serveur LDAP (ex : `ldaps://dc.corp.local:636`) |
| `LDAP_BASE_DN` | si LDAP | DN racine de l'annuaire |
| `LDAP_BIND_DN` | si LDAP | DN du compte de service |
| `LDAP_BIND_PASSWORD` | si LDAP | Mot de passe du compte de service |
| `LDAP_USER_SEARCH_BASE` | si LDAP | OU de recherche des utilisateurs |
| `LDAP_USER_FILTER` | si LDAP | Filtre LDAP (ex : `(sAMAccountName={{u}})`) |
| `LDAP_TLS_REJECT_UNAUTHORIZED` | non | `true` en production (défaut : `true`) |
| `MAIL_HOST` | non | Serveur SMTP |
| `MAIL_PORT` | non | Port SMTP (587 pour STARTTLS, 465 pour SMTPS) |
| `MAIL_SECURE` | non | `false` pour STARTTLS, `true` pour SMTPS implicite |
| `MAIL_USER` | non | Identifiant SMTP |
| `MAIL_PASSWORD` | non | Mot de passe SMTP |
| `MAIL_FROM` | non | Adresse expéditeur (ex : `"NX-RH <no-reply@corp.fr>"`) |
| `CLIENT_ORIGIN` | oui | Origine CORS autorisée (ex : `https://rh.nanoxplore.com`) |

Exemple de valeur pour `MONGO_URI` en production Docker :

```
MONGO_URI=mongodb://MON_USER:MON_PASSWORD@mongo:27017/nanoxplore_rh?authSource=admin
```

### 2.3 Générer les secrets

Générer un `JWT_SECRET` robuste :

```bash
openssl rand -hex 32
```

Générer des mots de passe MongoDB :

```bash
openssl rand -base64 24
```

### 2.4 Démarrer les conteneurs

```bash
docker compose up -d
```

Vérifier que les trois services sont actifs :

```bash
docker compose ps
```

Résultat attendu :

```
NAME         IMAGE                  STATUS          PORTS
nx_nginx     nginx:1.27-alpine      Up (healthy)    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
nx_mongo     mongo:7                Up (healthy)
nx-rh-app-1  nanoxplore-rh:latest   Up (healthy)
```

### 2.5 Vérifications de santé

```bash
# Santé de l'API (via nginx)
curl -k https://localhost/api/health

# Santé directe de l'application (port interne)
docker compose exec app wget -qO- http://localhost:3000/api/health

# Logs de démarrage
docker compose logs --tail=50 app
```

### 2.6 Initialiser la base de données (seed)

Pour un premier déploiement, injecter les données initiales :

```bash
# Seed complet (utilisateurs + campagnes + évaluations)
docker compose exec app npm run seed:v2

# Seed minimal (utilisateurs seulement)
docker compose exec app npm run seed:users
```

Comptes créés par le seed (mot de passe commun : `Test1234!`) :

| Email | Rôle | Description |
|-------|------|-------------|
| `admin@nx-rh.fr` | admin | Administrateur système |
| `rh@nx-rh.fr` | hr | Responsable RH |
| `dg@nx-rh.fr` | director | Directeur Général |
| `dir.tech@nx-rh.fr` | director | Directeur Technique |
| `mgr.back@nx-rh.fr` | manager | Manager Dev Backend |
| `emp.back1@nx-rh.fr` | employee | Développeur Backend Senior |

**Changer ces mots de passe immédiatement après le premier déploiement.**

---

## 3. SSL/TLS

### 3.1 Certificats Let's Encrypt (recommandé)

Prérequis : le domaine doit pointer vers le serveur et le port 80 doit être accessible.

```bash
# Installer certbot
apt-get install -y certbot

# Obtenir le certificat (le conteneur nginx doit être démarré)
certbot certonly --webroot \
  -w /var/www/certbot \
  -d rh.nanoxplore.com \
  --email admin@nanoxplore.com \
  --agree-tos \
  --non-interactive

# Copier les certificats dans le répertoire nginx
cp /etc/letsencrypt/live/rh.nanoxplore.com/fullchain.pem ./nginx/certs/fullchain.pem
cp /etc/letsencrypt/live/rh.nanoxplore.com/privkey.pem   ./nginx/certs/privkey.pem

docker compose restart nginx
```

Renouvellement automatique via cron :

```cron
0 3 * * * certbot renew --quiet && \
  cp /etc/letsencrypt/live/rh.nanoxplore.com/fullchain.pem /chemin/NX-RH/nginx/certs/fullchain.pem && \
  cp /etc/letsencrypt/live/rh.nanoxplore.com/privkey.pem   /chemin/NX-RH/nginx/certs/privkey.pem && \
  docker compose -f /chemin/NX-RH/docker-compose.yml restart nginx
```

### 3.2 Certificat auto-signé (tests uniquement)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./nginx/certs/privkey.pem \
  -out    ./nginx/certs/fullchain.pem \
  -subj "/CN=localhost"

docker compose restart nginx
```

### 3.3 Configuration nginx

La configuration nginx est dans `nginx/conf.d/`. Elle inclut :
- Redirection HTTP vers HTTPS (port 80 → 443)
- TLS 1.2/1.3 uniquement
- En-têtes de sécurité (HSTS, X-Frame-Options, etc.)
- Proxy vers l'upstream Express `app:3000`

Modifier `server_name _` par le nom de domaine réel dans `nginx/conf.d/*.conf`.

---

## 4. SMTP — Envoi d'emails

### 4.1 Variables de configuration

```env
MAIL_HOST=smtp.nanoxplore.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=notifications@nanoxplore.com
MAIL_PASSWORD=mot_de_passe_smtp
MAIL_FROM="NanoXplore RH <notifications@nanoxplore.com>"
```

### 4.2 Configurations courantes

**Gmail (avec mot de passe d'application) :**

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=votre-compte@gmail.com
MAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx
MAIL_FROM="NanoXplore RH <votre-compte@gmail.com>"
```

**Microsoft 365 / Exchange Online :**

```env
MAIL_HOST=smtp.office365.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=notifications@nanoxplore.com
MAIL_PASSWORD=mot_de_passe
MAIL_FROM="NanoXplore RH <notifications@nanoxplore.com>"
```

**Relay SMTP interne :**

```env
MAIL_HOST=relay.corp.local
MAIL_PORT=25
MAIL_SECURE=false
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM="NanoXplore RH <noreply@nanoxplore.com>"
```

**Mailtrap (développement / recette) :**

```env
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_SECURE=false
MAIL_USER=<mailtrap_user>
MAIL_PASSWORD=<mailtrap_pass>
MAIL_FROM="NX-RH Dev <dev@nx-rh.fr>"
```

### 4.3 Tester l'envoi

Depuis l'interface d'administration : Administration > Configuration > Test SMTP.

---

## 5. LDAP / Active Directory

### 5.1 Activer l'authentification LDAP

```env
AUTH_PROVIDER=ldap
```

### 5.2 Variables LDAP

| Variable | Description | Exemple |
|----------|-------------|---------|
| `LDAP_TYPE` | Type d'annuaire | `activedirectory` ou `openldap` |
| `LDAP_URL` | URL du serveur | `ldaps://dc.corp.local:636` |
| `LDAP_BASE_DN` | DN racine | `DC=corp,DC=local` |
| `LDAP_BIND_DN` | Compte de service | `CN=svc-nanoxplore,OU=Service Accounts,DC=corp,DC=local` |
| `LDAP_BIND_PASSWORD` | Mot de passe du compte de service | `P@ssw0rd!` |
| `LDAP_USER_SEARCH_BASE` | OU de recherche | `OU=Users,DC=corp,DC=local` |
| `LDAP_USER_FILTER` | Filtre de recherche | `(sAMAccountName={{u}})` |
| `LDAP_TLS_REJECT_UNAUTHORIZED` | Valider le certificat TLS | `true` |

### 5.3 Exemple Active Directory

```env
AUTH_PROVIDER=ldap
LDAP_TYPE=activedirectory
LDAP_URL=ldaps://dc01.corp.nanoxplore.com:636
LDAP_BASE_DN=DC=corp,DC=nanoxplore,DC=com
LDAP_BIND_DN=CN=svc-nxrh,OU=Service Accounts,DC=corp,DC=nanoxplore,DC=com
LDAP_BIND_PASSWORD=MotDePasseServiceAccount!
LDAP_USER_SEARCH_BASE=OU=Employes,DC=corp,DC=nanoxplore,DC=com
LDAP_USER_FILTER=(sAMAccountName={{u}})
LDAP_TLS_REJECT_UNAUTHORIZED=true
```

### 5.4 Exemple OpenLDAP

```env
AUTH_PROVIDER=ldap
LDAP_TYPE=openldap
LDAP_URL=ldaps://ldap.corp.nanoxplore.com:636
LDAP_BASE_DN=dc=corp,dc=nanoxplore,dc=com
LDAP_BIND_DN=cn=svc-nxrh,ou=service-accounts,dc=corp,dc=nanoxplore,dc=com
LDAP_BIND_PASSWORD=MotDePasseServiceAccount!
LDAP_USER_SEARCH_BASE=ou=people,dc=corp,dc=nanoxplore,dc=com
LDAP_USER_FILTER=(uid={{u}})
LDAP_TLS_REJECT_UNAUTHORIZED=true
```

### 5.5 Certificat auto-signé

Si le serveur LDAP utilise un certificat auto-signé (non recommandé en production) :

```env
LDAP_TLS_REJECT_UNAUTHORIZED=false
```

---

## 6. Reverse proxy Apache (alternative a nginx)

Si nginx est remplacé par Apache httpd en frontal, voici la configuration pour un virtual host HTTP + HTTPS.

Modules requis :

```bash
a2enmod proxy proxy_http rewrite ssl headers
```

**Virtual host HTTP — redirection vers HTTPS :**

```apache
<VirtualHost *:80>
    ServerName rh.nanoxplore.com

    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>
```

**Virtual host HTTPS — proxy vers l'application :**

```apache
<VirtualHost *:443>
    ServerName rh.nanoxplore.com

    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/nanoxplore/fullchain.pem
    SSLCertificateKeyFile /etc/ssl/certs/nanoxplore/privkey.pem
    SSLProtocol           all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite        HIGH:!aNULL:!MD5

    # En-têtes de sécurité
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Proxy de l'API vers le backend Express
    ProxyPreserveHost On
    ProxyPass        /api/ http://127.0.0.1:3000/api/
    ProxyPassReverse /api/ http://127.0.0.1:3000/api/

    # Proxy WebSocket (si applicable)
    ProxyPass        /socket.io/ http://127.0.0.1:3000/socket.io/
    ProxyPassReverse /socket.io/ http://127.0.0.1:3000/socket.io/

    # Proxy du reste vers Express (SPA — React Router gere le routage)
    ProxyPass        / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    # Réécriture SPA : toutes les routes non-fichier → index.html via Express
    # (Le serveur Express inclut déjà ce fallback — aucune règle RewriteRule nécessaire)

    ErrorLog  ${APACHE_LOG_DIR}/nxrh-error.log
    CustomLog ${APACHE_LOG_DIR}/nxrh-access.log combined
</VirtualHost>
```

Dans ce scénario, le conteneur `app` doit exposer le port 3000 vers l'hôte. Modifier `docker-compose.yml` en conséquence :

```yaml
app:
  ports:
    - "127.0.0.1:3000:3000"   # accessible uniquement en local — Apache proxie dessus
```

---

## 7. Mise a l'echelle horizontale

L'application est sans état (JWT cookie) et peut être scalée horizontalement.

Démarrer 3 instances de l'application derrière nginx :

```bash
docker compose up -d --scale app=3
```

nginx répartit le trafic en round-robin entre les instances via le bloc `upstream nanoxplore_app`.

Vérifier les replicas :

```bash
docker compose ps app
```

Pour les sessions persistantes (si ajoutées ultérieurement), activer la directive `ip_hash` dans `nginx/conf.d/*.conf` :

```nginx
upstream nanoxplore_app {
    ip_hash;
    server app:3000;
    keepalive 32;
}
```

---

## 8. Sauvegarde MongoDB

### 8.1 Sauvegarde manuelle

```bash
# Dump complet de la base
docker compose exec mongo mongodump \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db nanoxplore_rh \
  --out /data/db/backup/$(date +%Y%m%d_%H%M%S)
```

Copier le dump sur l'hôte :

```bash
docker cp nx_mongo:/data/db/backup ./mongo-backups/
```

### 8.2 Automatisation via cron

Exemple de script `/usr/local/bin/nxrh-backup.sh` :

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/var/backups/nxrh"
DATE=$(date +%Y%m%d_%H%M%S)
DEST="$BACKUP_DIR/$DATE"

source /chemin/NX-RH/.env

docker compose -f /chemin/NX-RH/docker-compose.yml exec -T mongo \
  mongodump \
    --username "$MONGO_ROOT_USER" \
    --password "$MONGO_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --db "$MONGO_DB" \
    --archive \
  > "$DEST.archive"

# Supprimer les sauvegardes de plus de 30 jours
find "$BACKUP_DIR" -name "*.archive" -mtime +30 -delete

echo "Sauvegarde terminée : $DEST.archive"
```

Rendre le script exécutable et planifier :

```bash
chmod +x /usr/local/bin/nxrh-backup.sh

# Crontab — sauvegarde quotidienne à 2h du matin
crontab -e
```

```cron
0 2 * * * /usr/local/bin/nxrh-backup.sh >> /var/log/nxrh-backup.log 2>&1
```

### 8.3 Restauration

```bash
# Copier l'archive dans le conteneur
docker cp ./mongo-backups/20240101_020000.archive nx_mongo:/tmp/restore.archive

# Restaurer
docker compose exec mongo mongorestore \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db nanoxplore_rh \
  --drop \
  --archive=/tmp/restore.archive
```

---

## 9. Mise a jour de l'application

```bash
# 1. Récupérer les dernières modifications
cd /chemin/NX-RH
git pull origin main

# 2. Reconstruire l'image
docker compose build --no-cache app

# 3. Redémarrer avec la nouvelle image (zéro downtime si scale > 1)
docker compose up -d --no-deps app

# 4. Vérifier que le déploiement est sain
docker compose ps
curl -k https://localhost/api/health
```

Pour une mise à jour complète de tous les services :

```bash
docker compose pull          # Mettre à jour les images officielles (nginx, mongo)
docker compose up -d         # Redémarrer les services mis à jour
docker image prune -f        # Nettoyer les anciennes images
```

---

## 10. Résolution de problèmes

### 10.1 Consulter les logs

```bash
# Tous les services
docker compose logs -f

# Un service spécifique
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f mongo

# 100 dernières lignes
docker compose logs --tail=100 app

# Logs nginx (fichiers montés)
docker compose exec nginx tail -f /var/log/nginx/error.log
docker compose exec nginx tail -f /var/log/nginx/access.log
```

### 10.2 Problèmes courants

**L'application ne démarre pas — `MONGO_ROOT_USER is required`**

Le fichier `.env` est absent ou mal configuré. Vérifier :

```bash
cat .env | grep MONGO_ROOT
```

**Erreur `JWT_SECRET must be at least 32 characters`**

Générer un secret valide :

```bash
openssl rand -hex 32
```

**Nginx retourne 502 Bad Gateway**

L'application n'est pas encore démarrée ou est en cours de démarrage. Attendre le healthcheck :

```bash
docker compose ps          # Vérifier le status "healthy"
docker compose logs app    # Lire les erreurs de démarrage
```

**MongoDB refuse la connexion**

Vérifier que les identifiants dans `.env` correspondent à ceux utilisés à la création du volume. Si le volume existe avec d'autres identifiants, le supprimer et recommencer :

```bash
docker compose down -v     # ATTENTION : supprime les données
docker compose up -d
```

**Emails non envoyés**

Vérifier la connectivité SMTP depuis le conteneur :

```bash
docker compose exec app node -e "
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: +process.env.MAIL_PORT,
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD }
});
t.verify().then(() => console.log('SMTP OK')).catch(console.error);
"
```

**Réinitialiser un mot de passe admin en cas de verrouillage**

```bash
docker compose exec mongo mongosh \
  -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin nanoxplore_rh \
  --eval "
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('NouveauMotDePasse!', 10);
    db.users.updateOne({ email: 'admin@nx-rh.fr' }, { \$set: { passwordHash: hash } });
  "
```
