# hooks/ — Hooks utilitaires NanoXplore RH

## Règle générale

Hooks **sans logique métier**. Pas de fetch API ici (sauf `useNotifBadges` qui
est un cas spécial de polling léger).

## Hooks disponibles

### `useTheme.js`

Hook standalone pour gérer le thème `dark` / `light`.

```js
const { theme, toggleTheme, isDark, setTheme } = useTheme()
```

> **Note KISS** : `ThemeToggle.jsx` utilise `useThemeCtx()` (ThemeContext) et non ce hook,
> afin d'être synchronisé avec l'état global de l'application.
> Ce hook reste utile pour du code **hors arbre React** (scripts, tests).

- `THEMES = ['dark', 'light']` — deux thèmes uniquement, plus de `light-sidebar`
- Lit et écrit `localStorage('nx_theme')`
- Applique `data-theme` sur `<html>`
- `cycleTheme` = alias de `toggleTheme` (rétrocompatibilité)

### `useLocale.js`

```js
const { locale, setLocale } = useLocale()
```

Lit/écrit `localStorage('nx_locale')`. Utilisé par `LocaleContext`.

### `useNotifBadges.js`

```js
const badges = useNotifBadges()
// → { evaluations: 2, requests: 0, … }
```

Fetch `/api/notifications/badges` toutes les 60s. Utilisé par `AuthedLayout` → `AppTopbar`.

## Ce qu'on ne met PAS ici

- Hooks avec fetch de données métier → `pages/<page>/` ou `components/ui/`
- Hooks dépendant d'un contexte spécifique → co-localisés avec le contexte
