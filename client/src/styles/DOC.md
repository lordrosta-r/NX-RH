# styles/ — Système de design NanoXplore RH

## Fichiers et rôles

| Fichier | Rôle | Quand modifier |
|---------|------|----------------|
| `tokens.css` | Source de vérité des tokens de design (couleurs, ombres, espacement). Mode clair = défaut. | Ajout d'un nouveau token brand ou surface. |
| `theme.css` | Overrides de tokens pour `dark` et `light`. Ajoute aussi `color-scheme` pour les navigateurs. | Changement de couleur d'un élément en dark/light mode. |
| `global.css` | Import de Tailwind, `@theme` (mapping Tailwind ↔ tokens), layout global. | Ajout d'une utility Tailwind custom, class de layout partagée. |

## Architecture du thème

```
tokens.css  →  valeurs light (défaut :root)
theme.css   →  overrides dark (html[data-theme="dark"])
              overrides light (html[data-theme="light"])  ← minimal, complète tokens.css
```

**Deux thèmes uniquement : `dark` et `light`.** Plus de `light-sidebar` (supprimé — redondant).

### color-scheme

`theme.css` déclare `color-scheme: dark` / `color-scheme: light` sur `<html>`.  
Ceci est **indispensable** pour Firefox, Safari et Edge : sans cette propriété, les navigateurs
appliquent leurs propres couleurs système (texte gris, fond jaune d'autofill) même si vous avez
stylé les inputs explicitement.

## Anti-flash

`public/theme-init.js` lit `localStorage('nx_theme')` et écrit `data-theme` sur `<html>` **avant**
que React monte. Toute valeur inconnue (ex : ancien `'light-sidebar'`) → `'dark'`.

## Namespaces de variables

- `--color-*` → tokens brand/surface, utilisés partout dans l'app
- `--th-*` → tokens spécifiques à la page **login** (fond, card, inputs, controls)
- `--apptb-*` → tokens de la **topbar** (`AppTopbar.jsx`)
- `--shadow-*` → ombres (définis dans `tokens.css`)

## Règles

- Ne jamais hardcoder `#b8000b` — utiliser `var(--color-primary)`
- Ne pas mélanger `--th-*` (login) et `--color-*` (app) dans le même composant
- Pour un composant inner-app, utiliser `--color-surface-*` de `tokens.css`, pas `--th-*`
