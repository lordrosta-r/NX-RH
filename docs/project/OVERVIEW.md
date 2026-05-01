# NanoXplore RH — Vue d'ensemble du projet

## Contexte

NanoXplore RH est une plateforme RH interne dédiée à la gestion des **entretiens annuels d'évaluation** pour NanoXplore. Elle permet aux équipes RH de piloter des campagnes d'évaluation, aux managers de soumettre leurs évaluations, et aux employés de compléter leur auto-évaluation.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js 18+ + Express 4 |
| Base de données | MongoDB 7 (Mongoose 8) |
| Authentification | JWT (cookie httpOnly) + LDAP |
| Emails | Nodemailer (SMTP) |
| Export | PDFKit |
| Infra | Docker Compose |

## Structure du monorepo

```
NX-RH/
├── mongo/
│   ├── server/             ← API Express (ce document)
│   │   ├── config/         ← DB + constantes
│   │   ├── middleware/     ← authGuard, errorHandler
│   │   ├── models/         ← Schemas Mongoose
│   │   ├── routes/         ← Route handlers Express
│   │   ├── services/       ← Logique métier (LDAP, email, scheduler, etc.)
│   │   ├── validators/     ← Schémas Joi de validation
│   │   ├── __tests__/      ← Tests Jest (auth, evaluations, users)
│   │   └── index.js        ← Point d'entrée du serveur
│   └── database/           ← Seeders MongoDB
├── src/                    ← Application React (frontend)
└── docs/                   ← Documentation (ce dossier)
```

## Rôles utilisateurs

| Rôle | Périmètre |
|------|-----------|
| `admin` | Accès complet : users, campagnes, config, LDAP |
| `hr` | Gestion campagnes + évaluations, audit trail |
| `director` | Vue read-only des évaluations de son périmètre |
| `manager` | Soumet les évaluations de ses subordonnés directs |
| `employee` | Complète son auto-évaluation uniquement |

## Modules fonctionnels

- **Authentification** : login local (bcrypt) + LDAP, sessions JWT en cookie httpOnly
- **Campagnes** : cycle draft → active → closed → archived
- **Formulaires** : templates de questions réutilisables, gestion du gel (frozenAt)
- **Évaluations** : cycle complet avec statuts, signatures, PDF, bulk operations
- **Utilisateurs** : gestion CRUD + sync LDAP + offboarding
- **Calendrier** : événements RH avec rappels automatiques
- **Ressources** : bibliothèque documentaire RH
- **Analytics** : tableaux de bord de complétion par campagne / département
- **Audit** : piste d'audit horodatée, TTL 2 ans

## Lancer le projet

```bash
# Démarrer l'ensemble (MongoDB + API + Frontend)
docker-compose up

# Dev backend seul
cd mongo/server && npm run dev

# Seeder la base
cd mongo/server && npm run seed
```

## Variables d'environnement requises

Voir `.env.example` à la racine du repo. Variables obligatoires :
- `MONGO_URI` — URI MongoDB complète
- `JWT_SECRET` — minimum 32 caractères
- `CLIENT_ORIGIN` — origine CORS autorisée (ex: `http://localhost:5173`)
