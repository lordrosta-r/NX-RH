# NX-RH — Plateforme RH NanoXplore

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://docker.com)

NX-RH est une plateforme RH interne pour NanoXplore, dédiée à la gestion des campagnes d'évaluation annuelles, des plans de développement individuels (PDI), des demandes de mobilité interne, et des processus d'offboarding collaborateur. Elle expose une API REST sécurisée (JWT + LDAP) consommée par une SPA React moderne.

---

## Quick Start

```bash
git clone <repo> && cd NX-RH
cp .env.example .env          # edit credentials as needed
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

The API will be available at `http://localhost:3000` and the frontend at `http://localhost:5173`.

---

## Test Accounts

| Email | Password | Role |
|---|---|---|
| alice@nxrh.local | password123 | Admin |
| marie.dupont@nxrh.local | password123 | RH |
| pierre.leclerc@nxrh.local | password123 | Manager |
| lucas.bernard@nxrh.local | password123 | Employé |
| admin.ldap@nxrh.local | password123 | Admin (LDAP) |

---

## Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, TanStack Query v5, Vite 8 (rolldown), Tailwind CSS, react-hook-form, Recharts |
| **Backend** | Node.js 20, Express 4, Mongoose 8, Winston, Helmet, Joi |
| **Database** | MongoDB 7 |
| **Auth** | JWT (8h) + LDAP/Active Directory (ldapjs) |
| **DevOps** | Docker, Docker Compose, nginx 1.27, GitHub Actions |
| **Testing** | Jest 30, mongodb-memory-server, Supertest, Vitest, Playwright |

---

## Architecture

```
NX-RH/
├── frontend-v2/      # React SPA — Vite 8 + rolldown build
├── mongo/server/     # Express REST API + MongoDB models
├── nginx/            # Reverse proxy config (HTTPS in prod)
├── docker/           # Infrastructure configs
├── docker-compose.yml          # Production stack
└── docker-compose.dev.yml      # Dev override (HMR, MailHog, OpenLDAP)
```

- **`frontend-v2/`** — SPA React 19 / TypeScript. Routing via React Router v6, state via TanStack Query v5, forms via react-hook-form + Zod, i18n via i18next.
- **`mongo/server/`** — API REST Express, modèles Mongoose, authentification JWT + LDAP, envoi d'emails (Nodemailer), génération PDF (PDFKit), stockage fichiers (MinIO ou disque local).
- **`nginx/`** — Reverse proxy en production : SSL/TLS, compression, load-balancing vers les instances `app`.
- **`docker/`** — Dockerfiles et configurations d'infrastructure.

---

## Development Setup

Le fichier `docker-compose.dev.yml` étend le compose de prod et ajoute :

- Serveur Vite avec HMR sur le port **5173**
- Rechargement live du serveur via **nodemon**
- MongoDB exposé sur **27017** (accès Compass / Studio 3T)
- **MailHog** sur **8025** — capture tous les emails sortants
- **OpenLDAP + phpLDAPadmin** sur **8080** — annuaire LDAP de test

```bash
# Démarrer l'environnement de dev complet
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Logs en temps réel
docker compose logs -f app

# Arrêter
docker compose down
```

Sans Docker (processus séparés) :

```bash
npm run dev        # démarre l'API et le frontend en parallèle (concurrently)
npm run dev:api    # API seule  (nodemon sur mongo/server/)
npm run dev:front  # Frontend seul (vite sur frontend-v2/)
```

---

## Environment Variables

Copiez `.env.example` vers `.env` et adaptez les valeurs. Les variables essentielles :

| Variable | Description |
|---|---|
| `MONGO_URI` | URI de connexion MongoDB (inclut user/password) |
| `JWT_SECRET` | Secret JWT — générer 64 caractères aléatoires |
| `AUTH_PROVIDER` | `local` ou `ldap` |
| `LDAP_URL` | URL du serveur LDAP/AD (ex. `ldaps://dc.corp.local:636`) |
| `MAIL_HOST` | Hôte SMTP (MailHog en dev : `mailhog`, port `1025`) |
| `CLIENT_ORIGIN` | Origine CORS autorisée (ex. `http://localhost:5173`) |
| `COOKIE_SECURE` | `false` en dev, `true` en prod (HTTPS requis) |
| `MINIO_ENDPOINT` | Endpoint MinIO (optionnel — fallback sur disque local) |

---

## API Routes

| Groupe | Préfixe | Description |
|---|---|---|
| Auth | `/api/auth` | Login local/LDAP, refresh token, logout |
| Users | `/api/users` | CRUD utilisateurs, import CSV, groupes |
| Campaigns | `/api/campaigns` | Campagnes d'évaluation, participants, statuts |
| Evaluations | `/api/evaluations` | Évaluations, workflow de signatures |
| Forms | `/api/forms` | Modèles de formulaires RH |
| Offboarding | `/api/offboarding` | Départs collaborateurs, checklists |
| Mobility | `/api/mobility` | Demandes de mobilité interne |
| PDI | `/api/pdi` | Plans de développement individuels |
| HR | `/api/hr` | Flags RH, paramètres, événements |
| Admin | `/api/admin` | Config plateforme, LDAP, mail, audit |
| Metrics | `/api/metrics` | KPIs agrégés, exports analytiques |

Voir [`docs/API.md`](docs/API.md) pour la documentation complète des endpoints.

---

## Running Tests

```bash
# Backend — 1151 tests Jest (in-memory MongoDB)
cd mongo/server && npm test

# Backend avec couverture
cd mongo/server && npm run test:coverage

# Frontend — tests unitaires Vitest
cd frontend-v2 && npm run test:run

# E2E — tests Playwright
cd frontend-v2 && npx playwright test
```

Depuis la racine du monorepo :

```bash
npm test       # tests backend uniquement
npm run lint   # lint API + frontend
npm run build  # build de production du frontend
```

---

## Docker Services

| Service | Port(s) | Description |
|---|---|---|
| `app` | `3000` (interne) | API Express — scalable horizontalement |
| `mongo` | `27017` (interne) | MongoDB 7 avec volume persistant |
| `nginx` | `80`, `443` | Reverse proxy + SSL (prod uniquement) |
| `client` | `5173` | Serveur Vite avec HMR (dev) |
| `mailhog` | `8025` (UI), `1025` (SMTP) | Capture emails en dev |
| `phpldapadmin` | `8080` | Interface web OpenLDAP (dev) |

---

## Seed Data

Plusieurs scripts de seed sont disponibles :

```bash
# Seed complet (utilisateurs, campagnes, évaluations, PDI…)
cd mongo/server && npm run seed:full

# Seed utilisateurs uniquement
cd mongo/server && npm run seed:users

# Seed enrichi v2
cd mongo/server && npm run seed:v2
```

---

## Production Deployment

```bash
# Déploiement prod (nginx + app + mongo)
docker compose up -d --build

# Mode haute disponibilité (3 instances API)
docker compose up -d --scale app=3
```

Placez vos certificats TLS dans `nginx/certs/` avant de démarrer. Voir [`DEPLOYMENT.md`](DEPLOYMENT.md) et [`docs/DEPLOY.md`](docs/DEPLOY.md) pour le guide complet.

---

## Contributing

Consultez [`CONTRIBUTING.md`](CONTRIBUTING.md) pour les conventions de code, la politique de branches et le processus de review. Les hooks pre-commit (Husky + lint-staged) s'installent automatiquement via `npm install`.
