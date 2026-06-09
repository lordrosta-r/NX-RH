# Installation

Guide pas à pas pour installer NanoXplore RH depuis zéro. Toutes les commandes sont prêtes à copier-coller. Aucune connaissance préalable de la base de code n'est nécessaire.

La référence complète en anglais se trouve dans `docs/INSTALLATION.md`.

---

## Prérequis

### Docker Engine et Docker Compose

L'intégralité de la pile (nginx, application Express, MongoDB) tourne dans des conteneurs Docker. Docker Compose v2 est inclus avec Docker Desktop sur macOS et Windows.

```bash
# Vérifier que Docker est installé et actif
docker --version
# Attendu : Docker version 25.x ou supérieure

# Vérifier que Docker Compose v2 est disponible
docker compose version
# Attendu : Docker Compose version v2.x ou supérieure
```

Si l'une des commandes échoue, installer Docker Desktop depuis https://docs.docker.com/get-docker/

### Git

```bash
git --version
# Attendu : git version 2.x
```

### Node.js 20 (développement uniquement)

Node.js est nécessaire uniquement si vous souhaitez lancer le frontend ou le backend localement en dehors de Docker. Pour une installation Docker pure (production ou staging), cette étape est facultative.

---

## 1. Cloner le dépôt

```bash
git clone <url-du-depot> NX-RH
cd NX-RH
```

Remplacer `<url-du-depot>` par l'URL réelle du dépôt.

---

## 2. Créer le fichier d'environnement

L'application lit sa configuration depuis un fichier `.env` à la racine du dépôt. **Ce fichier n'est jamais commité dans git.** Il doit être créé à partir du modèle fourni.

### 2.1 Copier le modèle

Pour un déploiement en production :

```bash
cp .env.prod.example .env
```

Pour un environnement de développement :

```bash
cp .env.example .env
```

### 2.2 Générer les secrets

Le serveur refuse de démarrer en production si les secrets ressemblent à des valeurs de substitution. Générer des secrets aléatoires robustes avec `openssl` :

```bash
# Générer JWT_SECRET (96 caractères hexadécimaux aléatoires)
openssl rand -hex 48

# Générer JWT_REFRESH_SECRET (doit être une valeur différente — relancer la commande)
openssl rand -hex 48

# Générer le mot de passe MongoDB
openssl rand -hex 24
```

Lancer chaque commande séparément et copier chaque résultat dans la variable correspondante dans `.env`.

### 2.3 Variables obligatoires

Ouvrir `.env` avec un éditeur de texte et remplir au minimum les variables suivantes. Le serveur refusera de démarrer si l'une d'elles est absente ou contient une valeur de substitution.

| Variable | Description | Contrainte |
|---|---|---|
| `JWT_SECRET` | Secret utilisé pour signer les jetons d'accès | Au moins 32 caractères, généré aléatoirement, jamais une valeur par défaut |
| `JWT_REFRESH_SECRET` | Secret utilisé pour signer les jetons de renouvellement | Au moins 32 caractères, généré aléatoirement, différent de `JWT_SECRET` |
| `MONGO_URI` | Chaîne de connexion MongoDB complète | Ne doit pas contenir le mot de passe `changeme` |
| `MONGO_ROOT_USER` | Nom d'utilisateur root MongoDB | Utilisé par le conteneur `mongo` au premier démarrage |
| `MONGO_ROOT_PASSWORD` | Mot de passe root MongoDB | Utilisé par le conteneur `mongo` au premier démarrage |

Exemple d'un fichier `.env` production correctement rempli :

```dotenv
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Secrets — générer chacun avec : openssl rand -hex 48
JWT_SECRET=a1b2c3d4...96_chars_hex_aléatoires...
JWT_REFRESH_SECRET=e5f6a7b8...96_chars_hex_différents...
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# MongoDB
MONGO_ROOT_USER=nxrh_app
MONGO_ROOT_PASSWORD=un_mot_de_passe_fort_aléatoire
MONGO_DB=nanoxplore_rh
MONGO_URI=mongodb://nxrh_app:un_mot_de_passe_fort_aléatoire@mongo:27017/nanoxplore_rh?authSource=admin

# Cookies / CORS (HTTPS requis en production)
COOKIE_SECURE=true
CLIENT_ORIGIN=https://rh.votre-domaine.com
FRONTEND_URL=https://rh.votre-domaine.com

# SMTP (optionnel — laisser vide pour désactiver les notifications par email)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=NanoXplore RH <adresse-expéditeur de votre domaine>

UPLOADS_DIR=/data/uploads
```

### 2.4 Certificats TLS

Aucune action manuelle n'est requise avant le premier `docker compose up`. Le service `cert-init` génère automatiquement un certificat auto-signé pour `localhost` dans `nginx/certs/` si aucun certificat n'y est trouvé. Cela débloque nginx lors d'un déploiement initial (les certificats ne sont jamais commités dans le dépôt).

Pour remplacer le certificat auto-signé par un vrai certificat, voir [[Configuration]].

---

## 3. Lancement en production

### 3.1 Démarrer tous les services

```bash
docker compose up -d
```

Cette commande construit l'image de l'application (frontend React + backend Express), puis démarre trois conteneurs : `nx_nginx`, le conteneur applicatif, et `nx_mongo`.

### 3.2 Vérifier que tous les conteneurs sont en bonne santé

```bash
docker compose ps
```

Attendre que tous les conteneurs affichent `healthy` dans la colonne `STATUS`. MongoDB peut prendre jusqu'à 30 secondes au premier démarrage. Le conteneur applicatif attend que MongoDB soit sain avant de démarrer, et nginx attend l'application.

Exemple d'une sortie saine :

```
NAME          IMAGE                  STATUS
nx_nginx      nginx:1.27-alpine      running (healthy)
<app>         nanoxplore-rh:latest   running (healthy)
nx_mongo      mongo:7                running (healthy)
```

### 3.3 Confirmer le point de contrôle de santé

```bash
# Via nginx (production)
curl -sk https://localhost/api/health

# Directement vers le conteneur applicatif
curl -s http://localhost:3000/api/health
```

Une réponse HTTP 200 avec un corps JSON `{"status":"ok"}` indique que tout fonctionne.

### 3.4 Consulter les journaux en cas de problème

```bash
# Tous les conteneurs
docker compose logs -f

# Un service précis
docker compose logs -f app
docker compose logs -f mongo
docker compose logs -f nginx
```

---

## 4. Créer le premier compte administrateur

La base de données démarre vide. Il faut exécuter le script de bootstrap une seule fois pour créer le premier compte administrateur.

### 4.1 Recommandé : définir un mot de passe fort via les variables d'environnement

```bash
docker compose exec app \
  sh -c 'ADMIN_EMAIL="<email-admin de votre domaine>" ADMIN_PASSWORD="VotreMotDePasseFort123!" node scripts/bootstrap-admin.js'
```

Règles pour `ADMIN_PASSWORD` : minimum 12 caractères. Le script hache le mot de passe avec bcrypt — il n'est jamais stocké en clair.

### 4.2 Alternative : utiliser le mot de passe par défaut

Si `ADMIN_PASSWORD` est omis, le script crée le compte avec le mot de passe par défaut `Admin@Change2026` et positionne un indicateur `mustChangePassword`. L'application demandera de changer le mot de passe à la première connexion.

```bash
docker compose exec app \
  sh -c 'ADMIN_EMAIL="<email-admin de votre domaine>" node scripts/bootstrap-admin.js'
```

### 4.3 Variables disponibles pour le script bootstrap

| Variable | Défaut | Description |
|---|---|---|
| `ADMIN_EMAIL` | `<email-admin>` | Adresse email du compte administrateur |
| `ADMIN_PASSWORD` | `Admin@Change2026` | Mot de passe (texte clair, haché par le script) |
| `ADMIN_FIRSTNAME` | `Admin` | Prénom |
| `ADMIN_LASTNAME` | `RH` | Nom |

Le script est idempotent : il s'arrête immédiatement si un compte administrateur actif existe déjà dans la base de données.

---

## 5. Vérifier l'installation

1. Ouvrir https://localhost dans le navigateur (accepter l'avertissement de certificat auto-signé si nécessaire).
2. La page de connexion NanoXplore RH doit s'afficher.
3. Se connecter avec l'email et le mot de passe administrateur définis à l'étape 4.
4. Si le mot de passe par défaut `Admin@Change2026` a été utilisé, l'application demandera d'en définir un nouveau.
5. Après connexion, le tableau de bord (`/`) doit s'afficher.

---

## 6. Mode développement

Le mode développement lance des services supplémentaires : un serveur Vite avec rechargement à chaud, MailHog (faux serveur SMTP) pour intercepter les emails sortants, et des conteneurs OpenLDAP pour tester l'authentification LDAP.

```bash
docker compose --env-file .env -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d --build
```

| Service | URL | Description |
|---|---|---|
| Application (nginx) | https://localhost | Point d'entrée principal |
| Serveur Vite | http://localhost:5173 | Frontend avec rechargement à chaud |
| API Express | http://localhost:3001 | Backend avec rechargement via nodemon |
| MongoDB | localhost:27017 | Exposé pour les clients GUI (ex. MongoDB Compass) |
| MailHog UI | http://localhost:8025 | Visualiser tous les emails sortants |
| phpLDAPadmin | http://localhost:8080 | Navigateur d'annuaire LDAP |

---

## Problèmes courants au premier démarrage

- **Le conteneur applicatif s'arrête immédiatement** : une variable d'environnement requise est absente ou contient une valeur de substitution. Lancer `docker compose logs app` pour voir quelle variable a été rejetée.
- **"JWT_SECRET trop courte"** : `JWT_SECRET` fait moins de 32 caractères. La régénérer avec `openssl rand -hex 48`.
- **"JWT_REFRESH_SECRET manquant"** : `JWT_REFRESH_SECRET` n'est pas défini dans `.env`. Obligatoire en production.
- **Connexion MongoDB refusée** : les identifiants dans `MONGO_URI` ne correspondent pas à `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD`. Les deux doivent être identiques dans `.env`.
- **nginx démarre mais retourne 502** : le conteneur applicatif est encore en cours de démarrage. Attendre 30 secondes et relancer `docker compose ps`.
- **"Un administrateur actif existe déjà"** : le script bootstrap a déjà été exécuté. Ce message est sans danger ; utiliser le compte administrateur existant pour se connecter.
- **Le navigateur affiche un avertissement de certificat** : comportement attendu à l'installation initiale. Accepter l'exception ou installer un vrai certificat via l'interface d'administration (voir [[Configuration]]).

---

Etapes suivantes : [[Configuration]] | [[Depannage]]
