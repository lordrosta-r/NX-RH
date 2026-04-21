# DOC — pages/settings/

## Objectif

Page de paramètres personnels de l'utilisateur, accessible à `/employee/settings`.
Visible par tous les rôles authentifiés.

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `Settings.jsx` | Composant racine refactorisé SPA — contenu seul, pas de shell propre. |
| `settings.css` | Styles de la page (`.st-*`). |
| `sections/ProfileSection.jsx` | Section profil utilisateur. |
| `sections/PreferencesSection.jsx` | Section préférences (langue, thème). |
| `sections/NotificationsSection.jsx` | Section notifications. |
| `sections/RoleSpaceSection.jsx` | Section rôle & espace. |
| `sections/DangerSection.jsx` | Section danger (déconnexion). |
| `i18n/` | Traductions fr/en (clés `settings.*`). |
| `DOC.md` | Ce fichier. |

---

## Architecture

`Settings.jsx` est monté dans `App.jsx` en tant que composant de page simple :

```
<ProtectedRoute allowedRoles={ANY_AUTHED}>
  <Route path="/employee/settings" element={<Settings />} />
</ProtectedRoute>
```

Le shell (sidebar + topbar) est fourni par `AuthedLayout`.

---

## Contextes utilisés

| Hook | Contexte | Usage |
|---|---|---|
| `useAuth()` | `AuthContext` | `user`, `loading` |
| `useLocaleCtx()` + `useTranslate(pageT)` | `LocaleContext` | locale, setLocale, t() |
| `useThemeCtx()` | `ThemeContext` | theme, setTheme, cycleTheme |
| `useNavigate()` | React Router | Redirection vers `/login` après déconnexion |

---

## Données

- `PATCH /api/auth/preferences` — sauvegarde les préférences (locale, thème, notifications)
- `POST /api/auth/logout` — déconnexion

---

## Migration SPA (Phase 5)

### Avant
- `Settings.jsx` avait son propre shell : `SettingsSidebar` + `AppTopbar` + wrapper `.db`
- Mode `embedded` pour les cas où le shell était fourni par un parent
- Utilisait `useAuthUser` (hook deprecated), `useLocale(pageT)`, `useTheme()`
- `main.jsx` : point d'entrée Vite séparé → supprimé
- `SettingsSidebar.jsx` → supprimé

### Après
- `Settings.jsx` est un composant de contenu pur
- Utilise `useAuth()`, `useLocaleCtx()`, `useThemeCtx()` (contextes globaux SPA)
- `window.location.href = '/'` remplacé par `navigate('/login')`
- Le prop `embedded` a été supprimé (plus nécessaire)

## Points d'attention

- Les sections (`ProfileSection`, etc.) attendent un prop `t` de type fonction (retourné par `useTranslate`)
- `savePreferences` est passée en prop aux sections qui en ont besoin
- `DangerSection` reçoit `onLogout` et l'appelle directement
