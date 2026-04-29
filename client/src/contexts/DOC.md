# Contexts globaux — `client/src/contexts/`

> Phase 2 de la migration SPA.  
> Ces contextes remplacent les anciens hooks dupliqués dans chaque page
> (`hooks/useAuthUser.js`, `hooks/useTheme.js`).

---

## Vue d'ensemble

| Contexte | Fichier | Rôle |
|---|---|---|
| **Auth** | `AuthContext.jsx` | Session utilisateur, logout |
| **Theme** | `ThemeContext.jsx` | Thème clair / sombre / sidebar, persistance localStorage |
| **Locale** | `LocaleContext.jsx` | Langue de l'interface (fr / en) |

---

## API des hooks

### `useAuth()` — depuis `AuthContext.jsx`

| Propriété | Type | Description |
|---|---|---|
| `user` | `object \| null` | Utilisateur courant (`null` si non connecté) |
| `loading` | `boolean` | `true` pendant le fetch initial |
| `error` | `string \| null` | Message d'erreur éventuel |
| `logout()` | `() => void` | POST `/api/auth/logout`, vide sessionStorage, redirige vers `/login` |
| `refreshUser()` | `() => Promise<void>` | Re-fetch `/api/auth/me` et met à jour `user` (utilisé après login) |

### `useThemeCtx()` — depuis `ThemeContext.jsx`

| Propriété | Type | Description |
|---|---|---|
| `theme` | `'dark' \| 'light'` | Thème actif |
| `toggleTheme()` | `() => void` | Bascule entre `dark` et `light` |
| `isDark` | `boolean` | `true` si le thème courant est `'dark'` |

> **Note** : `setTheme` et `cycleTheme` n'existent **pas** dans ce contexte.
> Si tu en as besoin, utilise `toggleTheme()` directement.

### `useLocaleCtx()` — depuis `LocaleContext.jsx`

| Propriété | Type | Description |
|---|---|---|
| `locale` | `string` | Langue active (`'fr'` ou `'en'`) |
| `setLocale(lang)` | `(string) => void` | Change la langue + persiste + sync `<html lang>` |

### `useTranslate(pageT)` — depuis `LocaleContext.jsx`

| Propriété | Type | Description |
|---|---|---|
| `t(key)` | `(string) => string` | Traduction d'une clé liée à la locale globale |

Usage : `const t = useTranslate(pageT)` où `pageT` vient de `pages/<page>/i18n`.

---

## Montage (`main.jsx`)

Les providers sont imbriqués dans `main.jsx` autour de `<App />` :

```jsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <ThemeProvider>
      <LocaleProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LocaleProvider>
    </ThemeProvider>
  </AuthProvider>
</QueryClientProvider>
```

L'ordre compte : `AuthProvider` est le plus externe car le thème et la
locale n'ont pas besoin de connaître l'utilisateur, mais l'inverse pourrait
être utile (ex. : thème par défaut selon le profil).

---

## Migration depuis les anciens hooks

| Avant (Phase 1) | Après (Phase 2) |
|---|---|
| `import { useAuthUser } from '../hooks/useAuthUser'` | `import { useAuth } from '../contexts/AuthContext'` |
| `import { useTheme } from '../hooks/useTheme'` | `import { useThemeCtx } from '../contexts/ThemeContext'` |
| `import { useLocale } from '../hooks/useLocale'` | `import { useLocaleCtx, useTranslate } from '../contexts/LocaleContext'` |

Les anciens fichiers `hooks/useAuthUser.js`, `hooks/useTheme.js` et
`hooks/useLocale.js` seront supprimés une fois que toutes les pages
auront migré vers les contextes (Phase 6).
