# Architecture technique

> Page de synthese en francais. Reference detaillee : `docs/ARCHITECTURE.md`.
> Voir aussi [[Stack-Technique]] et [[Roles-et-RBAC]].

---

## Vue d'ensemble du systeme

```
+------------+
|  Navigateur |
+-----+------+
      |  HTTPS
      v
+----------+
|  Nginx   |  Terminaison TLS, reverse proxy
+-----+----+
      |  HTTP (interne)
      +-------------------------+
      |                         |
      v                         v
 /api/*  (JSON)          GET /*  (fallback SPA)
      |                         |
      v                         v
+------------------+   +---------------------+
| Express (routes) |   | Express (statique)  |
| routes/          |   | public/index.html   |
+--------+---------+   +---------------------+
         |
    +----+-----+
    |          |
    v          v
+-------+  +------+
| Mongo |  | LDAP |
| (data)|  |(auth)|
+-------+  +------+
```

**Flux d'une requete :**

- Le navigateur charge une seule page HTML (`index.html`). React Router gere toute la navigation cote client ; Express ne rend jamais une page.
- Les requetes `/api/*` vont directement aux handlers Express. Toutes les autres requetes GET retournent `index.html` avec `Cache-Control: no-store`.
- LDAP est utilise uniquement pour l'authentification. Une fois la session etablie, les cookies JWT sont utilises pour toutes les requetes suivantes — aucun aller-retour LDAP par requete.
- MongoDB stocke toutes les donnees applicatives. La chaine de connexion est validee au demarrage ; le serveur refuse de demarrer si `JWT_SECRET` ou `MONGO_URI` est absent.

**Couches de securite :**

- Helmet (CSP, HSTS, frameguard, `nosniff`, `Referrer-Policy`, `Permissions-Policy`)
- CORS restreint a une liste explicite d'origines autorisees (joker interdit)
- `express-mongo-sanitize` sur tous les corps de requete entrants
- Rate limiting : 2 000 req/min general (`apiLimiter`), 500 req/min pour les mutations (`mutationLimiter`)
- JWT en cookies `httpOnly` (jamais dans `localStorage`)
- Garde d'impersonation : toute ecriture est bloquee quand la session est en mode impersonation lecture seule

---

## Architecture frontend

### Point d'entree

```
frontend-v2/index.html
  |
  +-- script inline (lit localStorage, applique data-theme avant React — anti-flash)
  |
  +-- src/main.tsx
        |
        +-- <ErrorBoundary>
              +-- <QueryClientProvider>  (TanStack Query, QueryClient unique)
                    +-- <AuthProvider>
                          +-- <ConfirmProvider>
                                +-- <App />
                                      +-- <RouterProvider router={router} />
```

Chaque composant de page est charge avec `React.lazy` + `<Suspense>`.

### Routing

React Router v6 avec `createBrowserRouter`. La protection des routes est assuree par `<AuthGuard>` :

- Sans prop `roles` : redirige vers `/login` si non authentifie.
- Avec prop `roles` : redirige en plus vers `/unauthorized` si le role de l'utilisateur n'est pas dans la liste autorisee.

```tsx
// Protection globale (tout utilisateur authentifie)
<AuthGuard>
  <AppLayout />
</AuthGuard>

// Protection par role
<AuthGuard roles={["hr", "admin"]}>
  <HrFlagsPage />
</AuthGuard>
```

### Data fetching — TanStack Query v5

Tout l'etat serveur est gere par TanStack Query. Le `fetch` nu n'est jamais utilise ; tous les appels passent par des fonctions axios dans `src/api/`.

Un intercepteur axios global dans `src/api/client.ts` intercepte les reponses HTTP 401 et redirige le navigateur vers `/login`.

### Etat global — Contextes React

Trois contextes sont disponibles partout via leurs hooks :

**AuthContext** (`useAuth`)
```ts
const { user, isLoading, isAuthenticated, login, loginLdap, logout, refreshUser } = useAuth()
// user : User | null  — inclut _id, name, role, email, …
// isLoading : true pendant le fetch initial /api/auth/me
// logout : appelle l'API de deconnexion puis redirige vers /login
```

**PerspectiveContext** (`usePerspective`)
```ts
const { perspective, setPerspective, hasSwitch } = usePerspective()
// perspective : "me" | "work"
// hasSwitch : true pour manager / hr / admin (deux perspectives disponibles)
// employee : toujours "me", pas de switch
```

**ConfirmContext** (`useConfirm`)
```ts
const confirm = useConfirm()
// await confirm({ title, message, confirmLabel? }) -> boolean
// Utilise pour toutes les actions destructrices (suppression, archivage…)
```

### Layouts

| Layout | Utilise par |
|--------|-------------|
| `AppLayout` | Toutes les pages authentifiees ; affiche la nav (issue de `navConfig.ts`) + `<Outlet />` |
| `AuthLayout` | Pages de connexion (`/login`, `/login/ldap`) |
| `OrgLayout` | Organigramme plein ecran (`/org`) |
| `LegalLayout` | Pages legales publiques |

Les elements de navigation sont calcules cote client par `getPerspectiveNav(role, perspective, t)` dans `src/components/layout/navConfig.ts`, retournant `{ primary, more }` filtres par le role et la perspective active de l'utilisateur.

### Style — Tailwind v3 + CSS custom properties

Les tokens de design sont definis en proprietes CSS dans `src/styles/tokens.css` (source de verite unique pour les couleurs et l'espacement). Les composants utilisent des classes utilitaires Tailwind ; les couleurs de marque sont accessibles via `var(--color-*)`.

Le theme est persiste dans `localStorage` et applique via un attribut `data-theme` sur `<html>`. Le script anti-flash dans `index.html` lit `localStorage` avant le montage de React pour eviter un flash blanc.

### Internationalisation — react-i18next

Deux locales : `fr.json` (source principale) et `en.json`, dans `src/i18n/locales/`. Un seul namespace (`translation`). Detection de langue : `localStorage` en premier, puis `navigator`.

Format de cle : `<domaine>.<section>.<element>` — ex. `nav.campaigns`, `evaluations.status.pending`.

---

## Architecture backend

**Stack :** Node.js 20, Express 4, Mongoose 8 (MongoDB 7), JWT en cookies, LDAP optionnel.

```
mongo/server/
+-- index.js               Configuration de l'app, middleware, montage des routes
+-- config/
|   +-- db.js              Helper de connexion Mongoose
+-- middleware/
|   +-- authGuard.js       RBAC — authGuard(['admin', 'hr', ...])
|   +-- errorHandler.js    Gestionnaire d'erreurs Express centralise
|   +-- metricsMiddleware.js  Collecte de metriques
|   +-- impersonationGuard.js blockImpersonatedWrites — lecture seule
+-- routes/                Un fichier par domaine (campaigns, evaluations, users…)
+-- models/                Modeles Mongoose (Campaign, Evaluation, Form, User, PDI…)
+-- services/              Logique metier decouplée des handlers de routes
+-- utils/
    +-- logger.js
    +-- cache.js
    +-- metrics.js
    +-- schedulerLock.js
```

### Pile middleware (dans l'ordre)

1. CORS (liste d'origines explicite, `credentials: true`)
2. Helmet (CSP, HSTS, frameguard, en-tetes de securite)
3. En-tetes de securite personnalises (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`)
4. `express.json` (limite corps a 100 Ko)
5. `express-mongo-sanitize` (prevention injection NoSQL)
6. `cookieParser`
7. `metricsMiddleware`
8. Logger HTTP
9. Redirection extension `.html` (301)
10. Service des fichiers statiques depuis `public/`

### Authentification et RBAC

LDAP est utilise uniquement a la connexion pour verifier les identifiants. En cas de succes, Express emet un JWT stocke dans un cookie `httpOnly`. `authGuard(roles)` est un middleware Express qui valide le cookie JWT et verifie que le role de l'utilisateur est dans la liste autorisee.

```js
v1Router.use('/admin/ldap', mutationLimiter, authGuard(['admin']), ldapRoutes)
v1Router.use('/campaigns',  mutationLimiter, authenticated,        campaignRoutes)
// authenticated = authGuard(['admin', 'manager', 'employee', 'hr'])
```

### Versioning des API

Toutes les routes sont montees sur un `v1Router` partage :

- `/api/v1/*` — chemin versionne (actuel)
- `/api/*` — alias legacy (compatibilite ascendante)

Les deux prefixes atteignent les memes handlers.

---

## Machine d'etat des evaluations

Toutes les transitions valides sont definies dans `mongo/server/models/Evaluation.js` (`VALID_TRANSITIONS` / `ROLE_TRANSITIONS`).

```
assigned
  |
  v  (employe ou admin)
in_progress
  |
  v  (employe, manager sur formulaire competences, ou admin)
submitted
  |
  v  (manager ou admin)
reviewed -----> disputed  (employe conteste ; RH arbitre)
  |               |
  |   +-----------+  (RH resout : retour a reviewed, ou passage direct a signed_evaluatee)
  |   |
  v   v  (employe ou admin)
signed_evaluatee
  |
  v  (manager ou admin)
signed_manager
  |
  v  (RH ou admin)
signed_hr
  |
  v  (RH ou admin)
validated  [terminal]

Etats terminaux supplementaires (aucune transition ulterieure) :
  expired   — declenche par le planificateur quand phaseDeadline ou expiresAt est depasse
  rejected  — le RH refuse l'evaluation
  archived  — evaluation annulee suite a un offboarding
```

**Transitions par role (hors admin) :**

| Role | Depuis | Vers |
|------|--------|------|
| employee | assigned | in_progress |
| employee | in_progress | submitted |
| employee | reviewed | signed_evaluatee, disputed |
| manager | in_progress | submitted |
| manager | submitted | reviewed |
| manager | signed_evaluatee | signed_manager |
| hr | reviewed | signed_hr (contournement : ignore les signatures evaluatee/manager) |
| hr | disputed | reviewed, signed_evaluatee (arbitrage) |
| hr | signed_evaluatee | signed_hr |
| hr | signed_manager | signed_hr |
| hr | signed_hr | validated |

`admin` n'est pas liste dans `ROLE_TRANSITIONS` et peut effectuer toute transition valide dans `VALID_TRANSITIONS`.

**Verrouillage des reponses :** des qu'une evaluation atteint l'un des statuts `submitted`, `reviewed`, `disputed`, `signed_evaluatee`, `signed_manager`, `signed_hr`, `validated` ou `archived`, le champ `answers` est gele. Un hook pre-save l'impose cote serveur.

**Sauvegarde automatique :** tant que le statut est `assigned` ou `in_progress`, les reponses de l'employe sont sauvegardees librement. Chaque sauvegarde met a jour `lastSavedAt`. Si le statut est encore `assigned` au moment de la sauvegarde, il passe automatiquement a `in_progress`.

---

## Pages reference

- Choix techniques argumentes : [[Stack-Technique]]
- Roles, RBAC et protection des routes : [[Roles-et-RBAC]]
- Modele de securite complet : [[Securite]]
