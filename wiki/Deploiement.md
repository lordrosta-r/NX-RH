# Déploiement

L'app se déploie en **Docker** : `nginx` (reverse proxy + TLS) + `app` (Express, scalable) + `mongo`.

## Prérequis

- Docker + Docker Compose.
- Un fichier `.env` à la racine (jamais committé). Partir de `.env.prod.example`.

## 1. Configurer `.env` (production)

```bash
cp .env.prod.example .env
# Générer des secrets FORTS et INDÉPENDANTS :
openssl rand -hex 48   # → JWT_SECRET
openssl rand -hex 48   # → JWT_REFRESH_SECRET (doit être différent)
openssl rand -hex 24   # → MONGO_ROOT_PASSWORD (reporter aussi dans MONGO_URI)
```

Le serveur **refuse de démarrer en production** si : `JWT_SECRET` ressemble à une valeur
dev (`dev_`, `changeme`…), `JWT_REFRESH_SECRET` manque ou dérive de `JWT_SECRET`,
`E2E_MODE=true`, `MONGO_URI` utilise le mot de passe `changeme`, ou
`LDAP_TLS_REJECT_UNAUTHORIZED=false`. (cf. `mongo/server/index.js → start()`)

> **Outil interne** : pour relâcher les rate-limits (login/mutations à 1000/15 min),
> ajouter `RELAX_RATE_LIMIT=true`. À ne PAS activer sur un déploiement exposé publiquement.

## 2. Build + démarrage

```bash
docker compose -f docker-compose.yml up -d --build
# Montée en charge horizontale :
docker compose -f docker-compose.yml up -d --scale app=3
```

L'app écoute en HTTPS via nginx (`443`). En local, certificat auto-signé dans `nginx/certs/`
(avertissement navigateur normal — remplacer via [Configuration](Configuration) → SSL).

## 3. Créer le premier administrateur (bootstrap)

Pas de seed en prod. Sur une base vierge :

```bash
docker compose -f docker-compose.yml exec \
  -e ADMIN_EMAIL=admin@votre-domaine.fr \
  -e ADMIN_PASSWORD='MotDePasseFort12+' \
  app node scripts/bootstrap-admin.js
```

Le script crée le 1er admin via le modèle User (mot de passe hashé bcrypt). Idempotent :
refuse si un admin actif existe déjà. Ensuite, **tout se configure depuis l'UI**.

## 4. Premier login

`https://<votre-hôte>/login` → email + mot de passe de l'admin. Une bannière
« Configuration initiale incomplète » guide les étapes restantes (formulaire, SMTP…).

## Sauvegarde / restauration

```bash
docker compose exec mongo mongodump --archive=/data/db/backup.gz --gzip
# restauration : mongorestore --archive=... --gzip
```

## Dev (hot-reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
# + 2 annuaires OpenLDAP de test, MailHog, Vite/nodemon en live-reload.
```
