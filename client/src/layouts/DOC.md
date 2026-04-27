# Layouts — Documentation

## Contenu du dossier `layouts/`

Ce dossier contient les composants de mise en page partagés par l'ensemble
de l'application SPA. Ils encapsulent la structure commune (barre supérieure,
garde d'authentification) afin d'éviter la duplication dans chaque page.

---

## Composants

### `AuthedLayout`

Shell partagé pour **toutes les pages authentifiées**.

- Lit les 3 contextes : `AuthContext`, `ThemeContext`, `LocaleContext`
- Affiche `AppTopbar` avec la **nav dropdown groupée** (via `navGroups`) et les **badges de notification** (via `useNotifBadges`)
- Rend le contenu de la page enfant via `<Outlet />`
- **Pas de sidebar** — topbar-only depuis la migration Phase 6

### `ProtectedRoute`

Garde de route basée sur les **rôles utilisateur**.

| Situation                  | Comportement                              |
| -------------------------- | ----------------------------------------- |
| Session en cours de chargement | Rien n'est affiché (évite le flash)   |
| Utilisateur non connecté   | Redirection vers `/login`                |
| Rôle non autorisé          | Redirection vers `/employee`             |
| Rôle autorisé              | Rend les routes enfants (`<Outlet />`)   |

Prop : `allowedRoles` — tableau de rôles (`['employee', 'manager', …]`).

---

## Structure du layout

```
┌─────────────────────────────────────────────────────────────────┐
│  NX NanoXplore  [Mon espace ▾] [Préférences]     🌙 🔔 fr  👤  │  ← AppTopbar (56px, sticky)
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   <main className="db-content">                                 │
│       <Outlet />  ← page courante                               │
│   </main>                                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

CSS global utilisé :

```css
.db-toponly { display: flex; flex-direction: column; min-height: 100vh; }
.db-content { flex: 1; padding: 2.5rem; background: var(--color-surface-container); }
```

---

## Navigation par rôle

La config vient de `components/ui/navMenuConfig.js` via `getNavMenuForRole(role)`.

| Rôle     | Groupes dropdown                        | Liens directs  |
| -------- | --------------------------------------- | -------------- |
| employee | Mon espace                              | Préférences    |
| manager  | Mon équipe, Pilotage                    | —              |
| hr       | Campagnes, Collaborateurs *, Analytique, Ressources | Paramètres |
| admin    | Utilisateurs, Configuration, Communications, Système | — |

\* Le groupe **Collaborateurs** affiche un red dot si `badges.requests > 0`.

---

## Badges de notification

Hook `hooks/useNotifBadges.js` → appelle `/api/notifications/badges`.
Retourne des comptes mock si l'endpoint est indisponible (`{ requests: 3 }`).
Passé en prop `badges` à `AppTopbar` → propagé aux boutons et liens du nav.

---

## Utilisation dans `App.jsx` (routes imbriquées)

```jsx
<Routes>
  {/* Public */}
  <Route path="/login" element={<LoginPage />} />

  {/* Shell authentifié — toutes les pages internes partagent la topbar */}
  <Route element={<AuthedLayout />}>

    {/* Employé — tous les rôles authentifiés */}
    <Route element={<ProtectedRoute allowedRoles={['employee', 'manager', 'director', 'hr', 'admin']} />}>
      <Route path="/employee" element={…} />
    </Route>

    {/* HR — rôles hr et admin uniquement */}
    <Route element={<ProtectedRoute allowedRoles={['hr', 'admin']} />}>
      <Route path="/hr" element={…} />
    </Route>

    {/* Admin */}
    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
      <Route path="/admin" element={…} />
    </Route>

  </Route>

  {/* Redirection par défaut */}
  <Route path="/" element={<Navigate to="/employee" replace />} />
  <Route path="*" element={<Navigate to="/employee" replace />} />
</Routes>
```

`AuthedLayout` est une route *layout* (sans `path`) : React Router rend
son `<Outlet />` avec la route enfant correspondante. `ProtectedRoute`
fonctionne de la même manière mais ajoute la vérification du rôle avant
de rendre son propre `<Outlet />`.

Note produit : le portail `director` a été retiré. Les comptes legacy `director`
restent autorisés sur les vues manager le temps d'assainir les données.

Note : `AppSidebar` est conservé dans `components/ui/` pour référence mais
n'est plus monté dans `AuthedLayout`.
