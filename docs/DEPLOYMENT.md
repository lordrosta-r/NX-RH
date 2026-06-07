# NanoXplore RH — Guide de déploiement

---

## Variables d'environnement

Fichier : `mongo/.env` (copier depuis `mongo/.env.example`)

| Variable | Obligatoire | Exemple | Description |
|---|---|---|---|
| `MONGO_URI` | ✅ | `mongodb://localhost:27017/nanoxplore` | URI de connexion MongoDB |
| `JWT_SECRET` | ✅ | *(min 32 caractères)* | Clé secrète de signature JWT |
| `JWT_EXPIRES_IN` | ❌ | `8h` | Durée de validité du token (défaut : `8h`) |
| `PORT` | ❌ | `3000` | Port d'écoute Express (défaut : `3000`) |
| `NODE_ENV` | ❌ | `production` | Active `secure: true` sur le cookie JWT |
| `CLIENT_ORIGIN` | ❌ | `http://localhost:5173` | Origine autorisée pour CORS (dev uniquement) |

### Générer un JWT_SECRET

> ⚠️ **`JWT_SECRET` doit faire minimum 32 caractères.** L'application refuse de démarrer si cette contrainte n'est pas respectée (`process.exit(1)` au boot).

```bash
# Génère 32 octets aléatoires (64 caractères hex) — recommandé
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Setup développement

```bash
# 1. Build du client
cd client
npm install
npm run build          # génère mongo/server/public/

# 2. Installer les dépendances backend
cd ../mongo/server
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# → éditer .env : MONGO_URI, JWT_SECRET

# 4. Lancer le serveur
node index.js
# → http://localhost:3000
```

Pour le développement frontend avec hot-reload :

```bash
# Terminal 1 — serveur API
cd mongo/server && node index.js

# Terminal 2 — Vite dev server
cd client && npm run dev
# → http://localhost:5173 (proxie /api vers :3000)
```

---

## Docker

Le projet inclut un `Dockerfile` multi-stage à la racine.

### Build et lancement

```bash
# Build de l'image
docker build -t nanoxplore-rh .

# Lancement simple
docker run -p 3000:3000 \
  -e MONGO_URI=mongodb://mongo:27017/nanoxplore \
  -e JWT_SECRET=<secret> \
  nanoxplore-rh
```

### Docker Compose

```bash
# Démarrage standard
docker compose up -d

# Mode haute disponibilité (3 instances app + Nginx load balancer)
docker compose up -d --scale app=3
```

Les services définis dans `docker-compose.yml` :

| Service | Rôle |
|---|---|
| `app` | Serveur Express (stateless — scalable horizontalement) |
| `mongo` | Base de données MongoDB |
| `nginx` | Reverse proxy + TLS termination |

**Certificats TLS :** placer les certificats dans `nginx/certs/`. Ce dossier n'est jamais commité.

### docker-compose.dev.yml

Variante de développement avec volume monté pour le code source. Utiliser avec :

```bash
docker compose -f docker-compose.dev.yml up
```

---

## Première connexion

Créer un utilisateur admin manuellement dans MongoDB :

```js
// mongo shell ou mongosh
use nanoxplore
db.users.insertOne({
  email: "admin@example.com",
  firstName: "Admin",
  lastName: "System",
  role: "admin",
  authSource: "local",
  passwordHash: "<bcrypt hash>",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Générer un hash bcrypt :

```bash
node -e "const b = require('bcrypt'); b.hash('motdepasse', 12).then(console.log)"
```

---

## Notes de production

- Positionner `NODE_ENV=production` pour activer `secure: true` sur le cookie JWT (nécessite HTTPS).
- L'application est **stateless** — aucune session serveur. Le scaling horizontal ne requiert pas de sticky sessions.
- MongoDB doit être accessible depuis tous les conteneurs `app` (même réseau Docker ou URI externe).
