# NanoXplore RH — Guide du développeur

---

## 1. Prerequis

| Outil | Version minimale | Installation |
|-------|-----------------|--------------|
| Node.js | 20 LTS | https://nodejs.org |
| npm | 10+ | Inclus avec Node.js |
| Git | 2.x | `apt install git` / homebrew |
| MongoDB | 7 (ou Docker) | https://www.mongodb.com |
| Docker (optionnel) | 24+ | https://www.docker.com |

Vérifier les versions installées :

```bash
node --version   # v20.x.x
npm --version    # 10.x.x
git --version    # 2.x.x
```

---

## 2. Installation locale

### 2.1 Cloner le dépôt

```bash
git clone https://github.com/votre-org/NX-RH.git
cd NX-RH
```

### 2.2 Démarrer MongoDB

**Option A — Docker (recommandé) :**

```bash
docker run -d \
  --name nx-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin \
  mongo:7
```

**Option B — MongoDB installé localement :**

```bash
mongod --dbpath /data/db &
```

### 2.3 Configurer le backend

```bash
cd mongo/server
cp ../../.env.example ../../.env
```

Editer `.env` à la racine du projet avec les valeurs de développement :

```env
NODE_ENV=development
PORT=5050
MONGO_URI=mongodb://admin:admin@localhost:27017/nanoxplore_rh?authSource=admin
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=admin
MONGO_DB=nanoxplore_rh
JWT_SECRET=dev_secret_replace_in_production_min_64_chars_here
JWT_EXPIRES_IN=8h
AUTH_PROVIDER=local
CLIENT_ORIGIN=http://localhost:5173
```

Installer les dépendances backend :

```bash
cd mongo/server
npm install
```

### 2.4 Initialiser la base de données

```bash
npm run seed:v2
```

### 2.5 Démarrer le backend

```bash
npm run dev
# Serveur démarré sur http://localhost:5050
```

### 2.6 Démarrer le frontend

Dans un second terminal :

```bash
cd frontend-v2
npm install
npm run dev
# Interface disponible sur http://localhost:5173
```

Le proxy Vite redirige automatiquement les requêtes `/api/*` vers `http://localhost:5050`.

### 2.7 Comptes de test

Tous les comptes ont le mot de passe : **`Test1234!`**

| Email | Rôle | Périmètre |
|-------|------|-----------|
| `admin@nx-rh.fr` | admin | Accès complet, configuration système |
| `rh@nx-rh.fr` | hr | Gestion des collaborateurs et campagnes |
| `dg@nx-rh.fr` | director | Tableau de bord direction, analytics |
| `dir.tech@nx-rh.fr` | director | Direction technique |
| `mgr.back@nx-rh.fr` | manager | Equipe dev backend (subordonnés uniquement) |
| `mgr.front@nx-rh.fr` | manager | Equipe dev frontend |
| `emp.back1@nx-rh.fr` | employee | Vue collaborateur standard |
| `emp.front1@nx-rh.fr` | employee | Vue collaborateur standard |

---

## 3. Architecture

### 3.1 Structure des dossiers

```
NX-RH/
├── frontend-v2/               Frontend React 19 + Vite + TypeScript
│   └── src/
│       ├── components/        Composants réutilisables (ui/, shared/)
│       ├── contexts/          Contextes React (AuthContext)
│       ├── hooks/             Hooks personnalisés
│       ├── layouts/           Layouts (AppLayout, AuthLayout, OrgLayout)
│       ├── pages/             Une page = un fichier (ex : UsersPage.tsx)
│       ├── router/            Configuration React Router
│       ├── stores/            Zustand stores
│       └── types/             Types TypeScript partagés
├── mongo/
│   ├── server/                Backend Express
│   │   ├── config/            Connexion DB, constantes, rôles
│   │   ├── middleware/        authGuard, errorHandler, rateLimit
│   │   ├── models/            Modèles Mongoose
│   │   └── routes/            Routes Express (une route = un domaine)
│   └── database/              Scripts de seed
├── nginx/                     Configuration nginx (prod)
├── docs/                      Documentation
├── docker-compose.yml         Stack production
└── .env.example               Template des variables d'environnement
```

### 3.2 Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Icônes | Lucide React |
| Etat async | TanStack Query (React Query) |
| Routing | React Router v7 |
| Backend | Node.js 20, Express 5 |
| Base de données | MongoDB 7, Mongoose |
| Authentification | JWT (cookie `httpOnly`) |
| Proxy/Reverse | nginx 1.27 |
| Conteneurisation | Docker Compose |

### 3.3 Flux d'authentification

```
Navigateur
  │
  ├─[POST /api/auth/login]──────────────► Express
  │                                          │
  │                                          ├─ Vérifie identifiants (local ou LDAP)
  │                                          ├─ Signe JWT (RS256, 8h)
  │◄─[Set-Cookie: token=<jwt>; httpOnly]─────┘
  │
  ├─[GET /api/users] + cookie──────────► authGuard middleware
  │                                          │
  │                                          ├─ Vérifie et décode le JWT
  │                                          ├─ Charge req.user
  │                                          └─ next() ou 401
  │
  └─[Réponse JSON]◄───────────────────── Route handler
```

Le token est stocké dans un cookie `httpOnly` (non accessible via JavaScript). La vérification côté frontend est assurée par `AuthContext` qui interroge `GET /api/auth/me` au chargement.

### 3.4 Rôles et permissions

| Rôle | Description | Périmètre |
|------|-------------|-----------|
| `admin` | Administrateur système | Accès complet à toute l'application et à la configuration |
| `hr` | Ressources humaines | Gestion de tous les collaborateurs, campagnes, formulaires |
| `director` | Directeur | Tableau de bord direction, analytics, vue de son équipe |
| `manager` | Manager | Evaluation de ses subordonnés directs uniquement |
| `employee` | Collaborateur | Ses propres évaluations et documents |

Les contrôles de rôle sont appliqués à deux niveaux :
- **Backend** : middleware `authGuard` + vérification explicite dans chaque route (`req.user.role`)
- **Frontend** : composant `AuthGuard` dans le router + masquage conditionnel des menus

---

## 4. Ajouter une page frontend

### Étape 1 — Créer le composant de page

Créer `frontend-v2/src/pages/MaNouvellePage.tsx` :

```tsx
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMonRessource } from '@/hooks/useMonRessource'

export default function MaNouvellePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['ma-ressource'],
    queryFn: fetchMonRessource,
  })

  if (isLoading) return <div className="p-6">Chargement...</div>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Ma nouvelle page</h1>
      {/* contenu */}
    </div>
  )
}
```

### Étape 2 — Enregistrer la route dans le router

Editer `frontend-v2/src/router/index.tsx` :

```tsx
// Ajouter l'import lazy en haut du fichier
const MaNouvellePage = lazy(() => import('../pages/MaNouvellePage'))

// Ajouter la route dans le bloc des routes protégées
{
  path: 'ma-nouvelle-page',
  element: (
    <Suspense fallback={<PageLoader />}>
      <MaNouvellePage />
    </Suspense>
  ),
}
```

### Étape 3 — Ajouter le lien dans le menu (optionnel)

Editer `frontend-v2/src/layouts/AppLayout.tsx` (ou le composant de navigation) et ajouter une entrée avec l'icône Lucide correspondante.

### Étape 4 — Vérifier avec le role guard (si page restreinte)

Envelopper la route avec `AuthGuard` en passant les rôles autorisés :

```tsx
{
  path: 'ma-nouvelle-page',
  element: (
    <AuthGuard roles={['admin', 'hr']}>
      <Suspense fallback={<PageLoader />}>
        <MaNouvellePage />
      </Suspense>
    </AuthGuard>
  ),
}
```

---

## 5. Ajouter un endpoint API

### Étape 1 — Créer ou éditer le fichier de routes

Créer `mongo/server/routes/maRessource.js` :

```js
'use strict'

const router = require('express').Router()
const MaRessource = require('../models/MaRessource')

// GET /api/ma-ressource
router.get('/', async (req, res, next) => {
  try {
    const items = await MaRessource.find().lean()
    res.json(items)
  } catch (err) {
    next(err)
  }
})

// POST /api/ma-ressource
router.post('/', async (req, res, next) => {
  try {
    const item = await MaRessource.create(req.body)
    res.status(201).json(item)
  } catch (err) {
    next(err)
  }
})

module.exports = router
```

### Étape 2 — Monter la route dans index.js

Editer `mongo/server/index.js` :

```js
const maRessourceRoutes = require('./routes/maRessource')

// Monter sous /api/ma-ressource (après authGuard)
app.use('/api/ma-ressource', authGuard, maRessourceRoutes)
```

### Étape 3 — Créer le modèle Mongoose (si nouvelle entité)

Créer `mongo/server/models/MaRessource.js` :

```js
'use strict'

const mongoose = require('mongoose')

const maRessourceSchema = new mongoose.Schema({
  nom:       { type: String, required: true, trim: true, maxlength: 200 },
  actif:     { type: Boolean, default: true },
  creePar:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,   // createdAt / updatedAt automatiques
})

module.exports = mongoose.model('MaRessource', maRessourceSchema)
```

Exporter le modèle depuis `mongo/server/models/index.js` si un barrel file est utilisé.

---

## 6. Conventions de développement

### Interface et textes

- Toute l'interface est en **français**.
- Aucun emoji dans l'interface utilisateur ni dans le code.
- Les messages d'erreur API sont en français (ex : `"Permissions insuffisantes"`).

### Icônes

Utiliser uniquement **Lucide React** :

```tsx
import { Users, ChevronRight, AlertCircle } from 'lucide-react'

<Users className="w-5 h-5 text-gray-500" />
```

Ne pas importer d'icônes depuis d'autres bibliothèques.

### Styles Tailwind

- Utiliser les classes Tailwind CSS v3 uniquement.
- Radius standard : **`rounded-md`** (ne pas utiliser `rounded-lg` sauf exception justifiée).
- Espacement : préférer `space-y-4` / `space-x-3` plutôt que des marges explicites.
- Couleurs : utiliser le thème configuré dans `tailwind.config.ts` (préfixes `primary-`, `gray-`).

### Composants partagés

Avant de créer un nouveau composant, vérifier `frontend-v2/src/components/ui/`. Les composants disponibles incluent notamment :

- `Button` — bouton avec variants (`primary`, `secondary`, `danger`, `ghost`)
- `Badge` — étiquette colorée
- `Modal` — fenêtre modale
- `Input`, `Select`, `Textarea` — champs de formulaire

Exemple d'utilisation du `Button` :

```tsx
import Button from '@/components/ui/Button'

<Button variant="primary" onClick={handleSave}>
  Enregistrer
</Button>

<Button variant="danger" disabled={isLoading}>
  Supprimer
</Button>
```

### Backend

- Toutes les routes utilisent `async/await` avec `try/catch` + `next(err)`.
- Valider les entrées utilisateur (longueur, type) avant toute insertion en base.
- Ne jamais exposer `passwordHash` dans les réponses JSON (utiliser `.select('-passwordHash')` ou `.lean()` + suppression manuelle).
- Chaque route est protégée par `authGuard`. Les routes publiques sont explicitement déclarées avant le middleware.

### Git

- Branches : `feature/nom-feature`, `fix/description-bug`, `chore/tache`
- Commits en anglais ou en français, impératif : `Add user export endpoint`, `Corriger le filtre par département`
- Ne jamais committer le fichier `.env`

---

## 7. Scripts disponibles

### Frontend (`frontend-v2/`)

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrer Vite en mode développement (port 5173, HMR activé) |
| `npm run build` | Compiler TypeScript + builder le bundle de production |
| `npm run preview` | Prévisualiser le bundle de production localement |
| `npm run lint` | Lancer ESLint sur l'ensemble du code frontend |
| `npm test` | Lancer les tests unitaires en mode watch (Vitest) |
| `npm run test:run` | Lancer les tests unitaires une fois sans watch |
| `npm run test:ui` | Ouvrir l'interface graphique Vitest |
| `npm run test:e2e` | Lancer les tests end-to-end Playwright |
| `npm run test:e2e:ui` | Lancer les tests e2e avec l'interface Playwright |
| `npm run test:e2e:report` | Afficher le dernier rapport Playwright |

### Backend (`mongo/server/`)

| Commande | Description |
|----------|-------------|
| `npm start` | Démarrer le serveur Express (production) |
| `npm run dev` | Démarrer avec nodemon (rechargement automatique) |
| `npm run seed` | Seed minimal de la base de données |
| `npm run seed:users` | Insérer uniquement les utilisateurs |
| `npm run seed:rich` | Seed enrichi v1 |
| `npm run seed:v2` | Seed enrichi v2 (recommandé — données complètes) |
| `npm run seed:full` | Seed complet multi-scripts |
| `npm test` | Lancer les tests Jest (séquentiel) |
| `npm run test:watch` | Lancer Jest en mode watch |
| `npm run lint` | Lancer ESLint sur le code backend |
| `npm run lint:fix` | Corriger automatiquement les erreurs ESLint |

---

## 8. Flux de travail recommandé

```
1. Créer une branche feature depuis main
   git checkout -b feature/ma-fonctionnalite

2. Démarrer les services de développement
   Terminal 1 : cd mongo/server && npm run dev
   Terminal 2 : cd frontend-v2 && npm run dev

3. Développer et tester manuellement sur http://localhost:5173

4. Lancer les tests
   cd frontend-v2 && npm run test:run
   cd mongo/server && npm test

5. Vérifier le linting
   cd frontend-v2 && npm run lint
   cd mongo/server && npm run lint

6. Committer et ouvrir une pull request vers main
```
