# Dépannage

Ce document liste les problèmes opérationnels les plus courants, leur cause et leur résolution
avec des commandes copiables. Pour l'installation initiale, voir [[Installation]].

---

## Table des matières

1. [Conteneur qui quitte immédiatement](#1-conteneur-qui-quitte-immédiatement)
2. [JWT_SECRET trop court ou invalide](#2-jwt_secret-trop-court-ou-invalide)
3. [MongoDB injoignable](#3-mongodb-injoignable)
4. [502 Bad Gateway ou page blanche](#4-502-bad-gateway-ou-page-blanche)
5. [Boucle 401 / impossible de se connecter](#5-boucle-401--impossible-de-se-connecter)
6. [LDAP vide — import renvoie zéro utilisateurs](#6-ldap-vide--import-renvoie-zéro-utilisateurs)
7. [Permission denied sur les logs ou les uploads](#7-permission-denied-sur-les-logs-ou-les-uploads)
8. [429 Too Many Requests sur le login](#8-429-too-many-requests-sur-le-login)
9. [Lire les logs](#9-lire-les-logs)
10. [Endpoint de santé](#10-endpoint-de-santé)

---

## 1. Conteneur qui quitte immédiatement

**Symptôme**

Le conteneur `app` démarre et s'arrête en quelques secondes. `docker compose ps` affiche
`Exited (1)`.

**Cause**

`JWT_SECRET` ou `MONGO_URI` est absent du fichier `.env`. Le process se termine avec le code 1
si l'une de ces variables est manquante.

**Solution**

```bash
# Lire les dernières lignes du log
docker compose logs app | tail -30
```

Ligne typique dans les logs :
```
Variable d'environnement manquante: JWT_SECRET
Variable d'environnement manquante: MONGO_URI
```

Ajouter les variables manquantes dans `.env` :

```bash
# Générer un JWT_SECRET robuste (64 caractères hexadécimaux = 256 bits)
openssl rand -hex 32

# Exemple d'entrées .env
JWT_SECRET=<résultat de la commande ci-dessus>
MONGO_URI=mongodb://appuser:motdepasse@mongo:27017/nanoxplore_rh?authSource=admin
```

Redémarrer :

```bash
docker compose up -d app
```

---

## 2. JWT_SECRET trop court ou invalide

**Symptôme**

Le conteneur `app` s'arrête immédiatement avec l'une de ces lignes dans les logs :

```
JWT_SECRET trop courte (minimum 32 caractères)
[boot] Config production dangereuse : JWT_SECRET ressemble à une valeur par défaut/dev
[boot] Config production dangereuse : JWT_REFRESH_SECRET manquant ou trop court
[boot] Config production dangereuse : MONGO_URI utilise le mot de passe par défaut « changeme »
[boot] Config production dangereuse : E2E_MODE=true désactive le rate-limit de login — interdit en production
[boot] Config production dangereuse : LDAP_TLS_REJECT_UNAUTHORIZED=false désactive la vérification TLS du LDAP
```

**Cause**

En `NODE_ENV=production`, le serveur applique des garde-fous au démarrage. Il rejette :
- `JWT_SECRET` de moins de 32 caractères ;
- `JWT_SECRET` ressemblant à une valeur de dev (`dev`, `changeme`, `secret_key`, etc.) ;
- `JWT_REFRESH_SECRET` absent, trop court, ou identique à `JWT_SECRET` ;
- `MONGO_URI` contenant le mot de passe par défaut `changeme` ;
- `E2E_MODE=true` (désactive le rate-limiting) ;
- `LDAP_TLS_REJECT_UNAUTHORIZED=false` (désactive la vérification TLS LDAP).

**Solution**

Générer des secrets indépendants et aléatoires :

```bash
openssl rand -hex 32   # pour JWT_SECRET
openssl rand -hex 32   # pour JWT_REFRESH_SECRET (valeur distincte)
```

Mettre à jour `.env`, puis redémarrer :

```bash
docker compose up -d app
```

---

## 3. MongoDB injoignable

**Symptôme**

Le conteneur `app` est en cours d'exécution mais les appels API retournent 503. `GET /api/health`
retourne `{"status":"degraded"}`. Les logs affichent des erreurs de connexion répétées.

**Cause 1 — MONGO_URI incorrecte**

L'hôte dans l'URI doit être `mongo` (nom du service Docker Compose), pas `localhost`.

Format correct :
```
mongodb://appuser:motdepasse@mongo:27017/nanoxplore_rh?authSource=admin
```

**Cause 2 — Conteneur mongo pas encore sain**

```bash
docker compose ps
```

Le service `mongo` doit afficher `healthy`. S'il est en `starting` ou `unhealthy` :

```bash
docker compose logs mongo | tail -50
```

Attendre que le healthcheck passe (jusqu'à 80 secondes au premier démarrage), puis relancer `app` :

```bash
docker compose restart app
```

**Cause 3 — Echec d'authentification**

Si `MONGO_ROOT_USER` ou `MONGO_ROOT_PASSWORD` ne correspond pas à ce qui a été utilisé lors de
l'initialisation initiale du volume `mongo_data`, MongoDB rejette la connexion.

Solution : corriger les identifiants pour qu'ils correspondent à l'initialisation d'origine, ou
supprimer le volume et réinitialiser (toutes les données seront perdues — sauvegarder d'abord) :

```bash
docker compose down
docker volume rm nx-rh_mongo_data
docker compose up -d
```

**Diagnostic général**

```bash
docker compose logs app | grep -i mongo
docker compose logs mongo | tail -50
```

---

## 4. 502 Bad Gateway ou page blanche

**Symptôme**

Le navigateur affiche une erreur 502 ou une page blanche.

**Cause 1 — Conteneur app pas encore sain**

Nginx attend que le service `app` soit déclaré sain (`condition: service_healthy`) avant de router
le trafic. Si `app` est encore en démarrage (période de grâce de 15 secondes), nginx ne répond
pas encore.

```bash
docker compose ps
docker compose logs nginx | tail -30
docker compose logs app | tail -30
```

Attendre que `app` affiche `healthy`, puis recharger nginx si nécessaire :

```bash
docker compose exec nginx nginx -s reload
```

**Cause 2 — Certificat TLS absent ou mauvais chemin**

Nginx monte les certificats depuis `./nginx/certs/`. Si les fichiers sont absents ou si les noms
ne correspondent pas à la configuration nginx, nginx refuse de démarrer.

```bash
docker compose logs nginx | grep -i ssl
ls -la ./nginx/certs/
```

Placer le certificat et la clé dans `./nginx/certs/` avec les noms attendus par la configuration,
puis tester et recharger :

```bash
docker compose exec nginx nginx -t          # tester la configuration
docker compose exec nginx nginx -s reload   # recharger sans coupure
```

**Diagnostic rapide**

```bash
# Contourner nginx et appeler directement l'application
curl -s http://localhost:3000/api/health

# Via nginx (production)
curl -sk https://<votre-domaine>/api/health
```

Réponse attendue : `{"status":"ok"}`

---

## 5. Boucle 401 / impossible de se connecter

**Symptôme**

Les identifiants sont corrects mais l'utilisateur est redirigé vers la page de login, ou le
navigateur reçoit 401 sur chaque requête API après la connexion.

**Cause 1 — Cookie non positionné (problème HTTPS / SameSite)**

L'application positionne `COOKIE_SECURE=true`. Les cookies sécurisés ne sont envoyés que via
HTTPS. Si nginx termine le TLS mais que le navigateur se connecte en HTTP, le cookie est ignoré.

Solution : s'assurer que le navigateur accède à l'application via `https://`. Si un certificat
auto-signé est utilisé, le navigateur doit lui faire confiance.

**Cause 2 — JWT_SECRET modifié entre deux déploiements**

Changer `JWT_SECRET` invalide immédiatement toutes les sessions existantes. Tous les utilisateurs
connectés reçoivent un 401 et sont redirigés vers `/login`. C'est le comportement attendu.

**Cause 3 — Dérive d'horloge entre l'hôte et le conteneur**

Les tokens JWT contiennent une expiration (`exp`) vérifiée par rapport à l'horloge serveur. Si
l'horloge de l'hôte dérive de plusieurs minutes, les tokens peuvent être rejetés.

```bash
docker compose exec app date
date
```

Synchroniser l'horloge de l'hôte si nécessaire (`timedatectl set-ntp true` sur Linux).

**Cause 4 — JWT_REFRESH_SECRET absent en production**

Sans `JWT_REFRESH_SECRET`, le renouvellement du token échoue et l'utilisateur est déconnecté à
l'expiration du token d'accès de courte durée.

```bash
openssl rand -hex 32   # générer un secret distinct pour JWT_REFRESH_SECRET
```

Mettre à jour `.env` et redémarrer.

---

## 6. LDAP vide — import renvoie zéro utilisateurs

**Symptôme**

L'import LDAP depuis l'interface admin se termine sans erreur mais importe zéro utilisateur. Le
bouton Test/Aperçu renvoie une liste vide.

**Cause 1 — baseDN incorrect**

Le `baseDN` doit pointer vers l'unité organisationnelle qui contient les entrées utilisateurs.

Solution : utiliser le bouton Test/Aperçu dans la configuration LDAP admin (`/admin/ldap`) pour
valider le `baseDN` et le filtre avant de lancer une synchronisation complète.

**Cause 2 — Filtre de recherche trop restrictif**

Le filtre par défaut peut exclure les comptes désactivés, ou l'`objectClass` utilisé ne correspond
pas au schéma de l'annuaire (`person` vs `inetOrgPerson` vs `user`).

Solution : ajuster le filtre dans les paramètres LDAP admin et vérifier avec Test/Aperçu.

**Cause 3 — Problème TLS LDAP (hors production)**

En environnement non-production, si le serveur LDAP utilise un certificat auto-signé, ajouter
dans `.env` :

```
LDAP_TLS_REJECT_UNAUTHORIZED=false
```

Ne pas utiliser ce paramètre en production — le guard de démarrage le rejette.

**Diagnostic**

```bash
docker compose logs app | grep -i ldap
```

---

## 7. Permission denied sur les logs ou les uploads

**Symptôme**

Le conteneur `app` affiche dans ses logs :
```
EACCES: permission denied, mkdir '/app/logs'
EACCES: permission denied, open '/data/uploads/...'
```

**Cause**

Le conteneur tourne sous l'utilisateur non-root `appuser`. Si un volume ou un bind-mount externe
a été créé avant la version actuelle du Dockerfile (qui crée et `chown`e ces répertoires), il
peut appartenir à `root`.

**Solution**

```bash
# Vérifier le propriétaire à l'intérieur du conteneur
docker compose exec app ls -la /app/logs
docker compose exec app ls -la /data/uploads
```

Le propriétaire attendu est `appuser`. Si ce n'est pas le cas, supprimer et recréer le volume
(sauvegarder les données d'abord) :

```bash
docker compose down
docker volume rm nx-rh_uploads_data
docker compose up -d
```

---

## 8. 429 Too Many Requests sur le login

**Symptôme**

Des tentatives de connexion répétées retournent HTTP 429.

**Cause**

L'API applique un rate-limiter : 500 requêtes par minute sur les endpoints de mutation. Les
scripts automatisés ou les tests qui appellent `/api/auth/login` en boucle déclenchent cette
limite.

**Solution (développement et tests uniquement)**

Définir `E2E_MODE=true` dans `.env` pour désactiver le rate-limiter de login :

```
E2E_MODE=true
```

Ce paramètre est bloqué en production. Le serveur refuse de démarrer si `NODE_ENV=production`
et `E2E_MODE=true`.

---

## 9. Lire les logs

### Logs applicatifs (Node.js / Express)

```bash
# Flux en direct
docker compose logs -f app

# 200 dernières lignes
docker compose logs --tail=200 app

# Tous les services simultanément
docker compose logs -f
```

### Logs nginx

```bash
docker compose logs -f nginx

docker compose exec nginx tail -f /var/log/nginx/access.log
docker compose exec nginx tail -f /var/log/nginx/error.log
```

### Logs MongoDB

```bash
docker compose logs -f mongo
```

### Etat des conteneurs en un coup d'oeil

```bash
docker compose ps
docker stats --no-stream
```

---

## 10. Endpoint de santé

```bash
# Direct (contourne nginx)
curl -s http://localhost:3000/api/health

# Via nginx (production)
curl -sk https://<votre-domaine>/api/health
```

**Réponse saine :**
```json
{"status":"ok"}
```

**Réponse dégradée (MongoDB déconnecté) :**
```json
{"status":"degraded"}
```

Un endpoint détaillé est disponible pour les administrateurs authentifiés :

```bash
curl -s https://<votre-domaine>/api/health/detail \
  --cookie "token=<votre-jwt-admin>"
```

Il inclut l'utilisation mémoire, les statistiques du pool de connexions, les verrous du
planificateur et les métriques.
