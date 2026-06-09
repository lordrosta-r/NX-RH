# Reprise développeur

Ce document guide un nouveau développeur qui rejoint le projet NanoXplore RH. Il indique par où
commencer, explique la structure du projet, les conventions à respecter et le workflow Git/PR.
Pour l'architecture détaillée, voir [[Architecture]]. Pour la stack technique, voir
[[Stack-Technique]]. Pour le pipeline CI/CD, voir [[CI-CD]].

---

## Verdict de reprenabilité

Un développeur React/Node autonome est productif en **environ un jour**, à l'aise en
**environ une semaine**. Le projet a une opinion et s'y tient : conventions strictes, pas
d'abstractions surprises, logique métier dans les services.

---

## Premier jour — plan en 5 étapes

**1. Lire les documents de référence**

- `CONTRIBUTING.md` à la racine (conventions, workflow Git, checklist avant PR)
- `CLAUDE.md` à la racine (architecture, structure des fichiers, règles CSS, i18n)
- Le `DOC.md` du dossier sur lequel vous allez travailler

**2. Monter la stack de développement**

```bash
# Mode développement complet (hot reload frontend + backend)
docker compose --env-file .env -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d --build

# Ou lancer les deux processus séparément :

# Terminal 1 — frontend (Vite dev server, port 5173)
cd frontend-v2
npm run dev

# Terminal 2 — backend (Express + nodemon, port 3000)
cd mongo/server
npm run dev
```

**3. Suivre une route de bout en bout**

Prendre un domaine simple (les campagnes par exemple) et le tracer du frontend au backend :

```
frontend-v2/src/router/index.tsx       → enregistrement de la route
frontend-v2/src/pages/CampaignsPage.tsx → composant de page
frontend-v2/src/api/campaigns.ts        → fonctions HTTP (axios)
mongo/server/routes/campaigns.js        → route Express
mongo/server/services/campaignService.js → logique métier
mongo/server/models/Campaign.js          → modèle Mongoose
```

**4. Lancer les tests**

```bash
cd mongo/server && npm test
cd frontend-v2 && npm run test:run
```

**5. Lire la documentation QA**

`docs/qa/README.md` documente la surface fonctionnelle par rôle (402 cas de test répartis entre
employé, manager, RH et admin).

---

## Structure du projet

```
NX-RH/
├── frontend-v2/          # Frontend vivant (React + Vite + TypeScript)
│   ├── src/
│   │   ├── router/       # Toutes les routes en un seul fichier
│   │   ├── pages/        # Une page = un fichier
│   │   ├── components/   # ui/ (sans logique métier), shared/, layout/
│   │   ├── api/          # Fonctions axios par domaine
│   │   ├── hooks/        # Hooks custom
│   │   ├── contexts/     # AuthContext, PerspectiveContext, ConfirmContext
│   │   ├── features/     # Modules verticaux (campaigns/, evaluations/)
│   │   ├── types/        # Types TypeScript partagés
│   │   └── i18n/locales/ # fr.json et en.json
│   └── e2e/              # Tests Playwright et scripts de démo
├── mongo/
│   └── server/           # Backend (Express + Mongoose)
│       ├── routes/        # Un fichier par domaine
│       ├── services/      # Logique métier (découplée des routes)
│       └── models/        # Modèles Mongoose
├── docs/                 # Documentation opérationnelle
├── .github/workflows/    # CI (ci.yml) et CD (cd.yml)
└── docker/               # Conteneurisation (Dockerfile + docker-compose*.yml)
```

Le seul frontend vivant est `frontend-v2/`. Ignorer tout dossier `client/` legacy éventuel.

---

## Conventions essentielles

### KISS — Keep It Simple, Stupid

Si vous vous demandez si quelque chose est trop complexe, c'est qu'il l'est probablement.
Préférer la solution directe. Ne pas ajouter d'abstractions avant qu'elles soient nécessaires.

### Anti-duplication (a lire attentivement)

Avant de créer un composant, une route, une clé i18n, un lien de navigation ou tout élément
nommé, **chercher d'abord dans le dépôt** :

```bash
# Chercher un nom de composant
grep -r "MonComposant" frontend-v2/src/

# Chercher une clé i18n
grep -r "campaigns.title" frontend-v2/src/i18n/
```

S'il existe déjà quelque part, réutiliser ou déplacer l'existant. Ne jamais introduire un second
élément qui fait la même chose sous un autre nom.

### Gestion d'état

- **TanStack Query v5** pour tout l'état serveur (fetch, cache, mutations).
- Les contextes React existants (`AuthContext`, `PerspectiveContext`, `ConfirmContext`) pour
  l'état UI global.
- Ne pas ajouter Redux, Zustand, Jotai ou toute autre librairie d'état.

### Appels HTTP

Tous les appels HTTP passent par les fonctions de `frontend-v2/src/api/` (axios). Ne pas
utiliser `fetch` directement : le client axios dans `src/api/client.ts` gère les 401 et les
redirections automatiquement.

### CSS

- Classes Tailwind v3 pour le layout, l'espacement, la typographie.
- `var(--color-*)` pour les couleurs de la marque (définies dans `src/styles/tokens.css`).
- Pas de styles inline (`style={{}}`) pour les layouts.
- Pas de valeurs hexadécimales en dur dans les composants.

### Icones

Une seule bibliothèque : **`lucide-react`**, toujours en SVG stroke.

```tsx
import { Home, Bell } from 'lucide-react'
<Home size={18} strokeWidth={1.5} aria-hidden="true" />
```

### TypeScript

- Pas de `as any`.
- Les erreurs catchées sont typées `unknown`, pas `Error` :

```ts
catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
}
```

### DOC.md par dossier

Chaque dossier significatif (`contexts/`, `layouts/`, `pages/`, `hooks/`, etc.) contient un
`DOC.md`. Le lire avant de modifier le dossier, et le mettre à jour après.

---

## Workflow Git et PR

### Nommage des branches

| Type de changement | Préfixe | Exemple |
|-------------------|---------|---------|
| Nouvelle fonctionnalité | `feature/` | `feature/campaign-analytics` |
| Correction de bug | `fix/` | `fix/login-redirect-loop` |
| Style / UI uniquement | `style/` | `style/dashboard-spacing` |
| Tests | `test/` | `test/evaluation-service` |
| Refactoring | `refactor/` | `refactor/auth-context` |
| Documentation | `docs/` | `docs/update-runbook` |
| Config / tooling | `chore/` | `chore/update-dependencies` |

```bash
git checkout main
git pull origin main
git checkout -b feature/ma-fonctionnalite
```

Ne jamais committer directement sur `main`. C'est une branche protégée.

### Convention de commits (Conventional Commits)

```
<type>(<scope optionnel>): <description courte en minuscules>
```

Exemples tirés de l'historique réel du dépôt :

```
feat(ui): standardise les confirmations destructrices via useConfirm()
fix(evaluations): câbler le flux de remplissage + contexte N-1 (4 bugs)
fix(forms): création/édition fonctionnelles + tests e2e du builder
style(modal): fond opaque plein qui recouvre tout l'écran
```

### Checklist avant d'ouvrir une PR

```bash
# Backend
cd mongo/server
npm test
npm run lint

# Frontend
cd frontend-v2
npx tsc --noEmit
npm run lint
npm run test:run
npm run build
```

Tous ces checks doivent passer localement. Le CI les rejouera automatiquement sur la PR.

### Revue et merge

- Au moins un reviewer doit approuver la PR avant le merge.
- Toutes les PR ciblent `main`.
- Ne pas merger sa propre PR sans approbation.

---

## Ajouter une page, une route ou une clé i18n

### Nouvelle page frontend

```bash
# 1. Créer le composant
# frontend-v2/src/pages/MaNouvellePage.tsx

# 2. Ajouter l'import lazy dans frontend-v2/src/router/index.tsx
const MaNouvellePage = lazy(() => import('../pages/MaNouvellePage'))

# 3. Enregistrer la route dans le tableau createBrowserRouter (même fichier)
{
  path: '/ma-nouvelle-route',
  element: (
    <AuthGuard roles={['hr', 'admin']}>
      <Suspense fallback={null}><MaNouvellePage /></Suspense>
    </AuthGuard>
  ),
}

# 4. Ajouter les clés i18n dans fr.json ET en.json

# 5. Ajouter un lien dans frontend-v2/src/components/layout/navConfig.ts
#    si la page doit apparaître dans la navigation
```

Pas de fichier HTML supplémentaire, pas d'entrée Vite, pas de route Express nécessaire.

### Nouvelle clé i18n

Ajouter la clé dans **les deux fichiers simultanément** :

- `frontend-v2/src/i18n/locales/fr.json`
- `frontend-v2/src/i18n/locales/en.json`

Format : `<domaine>.<section>.<element>` (exemples : `nav.campaigns`, `evaluations.status.pending`).

### Nouvelle fonction API (côté frontend)

Ajouter dans le fichier approprié de `frontend-v2/src/api/` (un fichier par domaine :
`campaigns.ts`, `users.ts`, etc.), en utilisant l'instance axios partagée de `src/api/client.ts`.

### Nouvelle route backend

Ajouter ou étendre un fichier de routes dans `mongo/server/routes/` (un fichier par domaine).
Placer la logique métier dans `mongo/server/services/`, pas directement dans le handler de route.

---

## Points d'attention spécifiques au domaine

Ces parties du code demandent une lecture attentive avant d'y toucher :

- **Machine à états des évaluations** (`assigned` -> ... -> `validated`) : lire le modèle
  `mongo/server/models/Evaluation.js` et `mongo/server/routes/evaluations/` avant de modifier.
  C'est strict par sécurité, pas accidentel.
- **Contexte N-1** (`mongo/server/routes/evaluations/n1Context.js`) : lookup en deux stratégies
  et lignée `parentQuestionId`. Bien commenté, mais à lire posément.
- **Organigramme** (`frontend-v2/src/hooks/useOrgChart.ts` + `src/components/org/`) : react-flow
  avec calculs de layout et plusieurs vues. Le morceau frontend le plus conséquent.

---

Voir aussi [[Architecture]] pour le schéma complet de l'application, [[Stack-Technique]] pour
les versions et dépendances, et [[CI-CD]] pour le pipeline d'intégration et de livraison continues.
