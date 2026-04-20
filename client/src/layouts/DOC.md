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
- Affiche `AppTopbar` (logo, sélecteur de langue, thème, menu utilisateur)
- Rend le contenu de la page enfant via `<Outlet />`

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
┌─────────────────────────────────────────────┐
│  AppTopbar  (logo · langue · thème · user)  │
├─────────────────────────────────────────────┤
│                                             │
│   <main className="content">                │
│       <Outlet />  ← page courante           │
│   </main>                                   │
│                                             │
└─────────────────────────────────────────────┘
```

CSS global utilisé :

```css
.page    { display: flex; flex-direction: column; min-height: 100vh; }
.content { flex: 1; padding: 2rem; max-width: 1100px; width: 100%; margin: 0 auto; }
```

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
