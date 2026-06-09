# Deploiement

Ce guide couvre le déploiement en production de NanoXplore RH. Pour les procédures de mise à jour, voir [[Mise-a-jour]]. Pour les sauvegardes et restaurations, voir [[Sauvegarde-Restauration]]. Pour l'installation initiale, voir [[Installation]].

La référence complète en anglais se trouve dans `docs/DEPLOYMENT.md`.

---

## Architecture

Trois services Docker communiquent sur deux réseaux isolés :

```
Internet
  |
  v
nginx (ports 80/443)        <- Terminaison TLS, reverse proxy
  |  [réseau frontend]
  v
app (port 3000, interne)    <- Express : API REST + SPA compilée (fichiers statiques dans ./public)
  |  [réseau backend]
  v
mongo (port 27017, interne) <- MongoDB 7, jamais exposé à l'hôte
```

- **nginx** (`nx_nginx`) : nginx 1.27-alpine. Termine le TLS, transmet les requêtes à `app`. La configuration se trouve dans `nginx/conf.d/` et `nginx/nginx.conf` (montés en lecture seule).
- **app** : Build Docker multi-étape. L'étape 1 compile la SPA Vite/React (`frontend-v2/`) en fichiers statiques. L'étape 2 lance Express (`mongo/server/`), qui sert ces fichiers depuis `./public` et gère toutes les routes `/api/*`. Express retourne `index.html` pour toutes les routes non-API (repli SPA). Tourne sous un utilisateur non-root.
- **mongo** (`nx_mongo`) : MongoDB 7 avec les données persistées dans le volume nommé `mongo_data`.

Volumes nommés :

| Volume | Contenu |
|---|---|
| `mongo_data` | Fichiers de données MongoDB |
| `uploads_data` | Documents RH téléversés par les utilisateurs (monté dans `/data/uploads` dans `app`) |
| `nginx_logs` | Journaux d'accès et d'erreurs nginx |

---

## Prérequis sur le serveur

- Docker Engine >= 24 et Docker Compose v2 (commande `docker compose`, pas `docker-compose`)
- Ports **80** et **443** ouverts et non utilisés par un autre processus
- Enregistrement DNS A pour votre domaine pointant vers l'IP publique du serveur (requis pour un vrai certificat TLS)
- Espace disque suffisant pour les données MongoDB et les documents téléversés

---

## Configurer l'environnement

Le service `app` lit sa configuration depuis un fichier `.env` à la racine du projet.

```bash
cp .env.prod.example .env
$EDITOR .env
```

Variables obligatoires (l'application refusera de démarrer sans elles) :

| Variable | Description |
|---|---|
| `MONGO_ROOT_USER` | Nom d'utilisateur root MongoDB |
| `MONGO_ROOT_PASSWORD` | Mot de passe root MongoDB |
| `MONGO_URI` | URI de connexion MongoDB complète |
| `JWT_SECRET` | Secret de signature JWT, minimum 32 caractères |
| `JWT_REFRESH_SECRET` | Secret de signature des jetons de renouvellement JWT, minimum 32 caractères, différent de `JWT_SECRET` |

Générer des secrets robustes :

```bash
openssl rand -hex 48
```

Pour la liste complète des variables optionnelles, voir `docs/ENVIRONMENT.md`.

---

## Deux façons de déployer

Les fichiers Compose et le `Dockerfile` sont regroupés dans `docker/`. Toutes les commandes
ci-dessous se lancent **depuis la racine du dépôt** ; `--env-file .env` charge le `.env` racine
pour l'interpolation des variables.

### Option 1 — Depuis `main` (build local)

C'est la méthode standard. Elle reconstruit l'image Docker localement depuis les sources.

```bash
# Déploiement standard (une instance applicative)
docker compose --env-file .env -f docker/docker-compose.yml up -d --build

# Mode haute disponibilité (3 instances applicatives derrière le load balancer nginx)
docker compose --env-file .env -f docker/docker-compose.yml up -d --build --scale app=3
```

### Option 2 — Depuis une release versionnée (déploiement reproductible)

Pour figer une version précise, se placer sur le tag correspondant puis builder localement.
Les artefacts sont distribués via les [releases GitHub](https://github.com/lordrosta-r/NX-RH/releases)
(aucune image n'est publiée sur un registre).

```bash
git fetch --tags
git checkout v1.0.0
docker compose --env-file .env -f docker/docker-compose.yml up -d --build
```

---

## Vérifier le déploiement

```bash
# Vérifier que tous les services sont actifs et sains
docker compose --env-file .env -f docker/docker-compose.yml ps
```

Les trois services (`nginx`, `app`, `mongo`) doivent afficher le statut `running (healthy)`. Le service `app` peut afficher `(health: starting)` pendant les 15 premières secondes après le démarrage.

```bash
# Via nginx et TLS
curl -sf https://votre-domaine/api/health

# Directement vers le conteneur applicatif, en contournant nginx
docker compose --env-file .env -f docker/docker-compose.yml exec app wget -qO- http://localhost:3000/api/health
```

Une réponse saine retourne HTTP 200 avec un corps JSON `{"status":"ok"}`.

---

## TLS — Certificats

Les certificats sont stockés dans `./nginx/certs/` et montés dans les conteneurs `app` et `nginx`. Ce répertoire n'est **jamais commité dans le dépôt** — `nginx/certs/*.pem` est exclu par `.gitignore`.

Nginx lit exactement deux fichiers :

```
nginx/certs/
├── fullchain.pem  <- certificat + chaîne
└── privkey.pem    <- clé privée
```

Au premier `docker compose up`, le service `cert-init` génère automatiquement un certificat auto-signé si ces fichiers sont absents. Pour installer un vrai certificat, voir [[Configuration]] (section Certificat SSL).

Recharger nginx après tout remplacement de certificat :

```bash
docker compose kill -s HUP nginx
```

---

## Opérations courantes

**Suivre les journaux en temps réel :**

```bash
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f mongo

# 100 dernières lignes uniquement
docker compose logs --tail=100 app
```

**Vérifier la santé des conteneurs :**

```bash
docker compose ps
docker compose exec app wget -qO- http://localhost:3000/api/health
```

**Redémarrer un service :**

```bash
docker compose restart app
```

---

## Notes de sécurité

- MongoDB **n'est pas exposé** à l'hôte (pas de mapping `ports:` sur `mongo`). Il n'est accessible que depuis le réseau Docker `backend`.
- `nginx` n'a pas accès direct au réseau `backend` — il ne peut atteindre que `app`.
- Le conteneur `app` tourne sous un **utilisateur non-root** (`appuser`).
- `NODE_ENV=production` et `COOKIE_SECURE=true` sont définis inconditionnellement dans `docker-compose.yml` — ne pas les remplacer.
- Ne jamais commiter `.env`, `nginx/certs/`, ou tout fichier contenant des secrets dans le dépôt.

---

Etapes suivantes : [[Sauvegarde-Restauration]] | [[Mise-a-jour]]
