# NanoXplore RH — Conventions & Architecture

## Principe directeur : K.I.S.S.

> Keep It Simple, Stupid.
> Si tu te demandes si c'est trop complexe, c'est trop complexe.

---

## 1. Structure des pages — Co-location absolue

Chaque page est un **dossier autonome**. Tout ce qui appartient à une page vit dedans.

```
client/src/pages/<page>/
├── main.jsx              ← Entry point Vite (NE PAS MODIFIER)
├── <Page>.jsx            ← Composant racine de la page
├── <page>.css            ← Tous les styles de cette page
├── <Composant>.jsx       ← Composant UI spécifique à cette page
├── <Composant>.css       ← Styles du composant (même dossier)
└── i18n/
    ├── fr.js             ← Chaînes françaises de cette page
    ├── en.js             ← Chaînes anglaises de cette page
    └── index.js          ← export const t = makeT({ fr, en })
```

**Règle :** un composant utilisé sur UNE SEULE page → il vit dans le dossier de cette page.
**Règle :** un composant utilisé sur PLUSIEURS pages → il va dans `components/ui/`.

---

## 2. Composants partagés — `components/ui/`

Réservé aux composants **100% réutilisables, sans logique métier** :

```
client/src/components/ui/
├── Button.jsx + Button.css
├── InputField.jsx + InputField.css
├── Checkbox.jsx + Checkbox.css
├── ThemeToggle.jsx + ThemeToggle.css
└── icons/
    ├── SunIcon.jsx
    ├── MoonIcon.jsx
    ├── GlobeIcon.jsx
    └── index.js          ← barrel export
```

**Ne jamais** mettre de logique métier, d'appels API ou d'état applicatif ici.

---

## 3. Infrastructure partagée

```
client/src/
├── hooks/
│   ├── useTheme.js       ← dark/light, écrit data-theme sur <html>
│   └── useLocale.js      ← locale + t() réactif, prend un pageT en paramètre
├── i18n/
│   └── index.js          ← makeT() factory UNIQUEMENT — pas de données locale ici
└── styles/
    ├── tokens.css         ← Variables de design (couleurs, radius, typo)
    ├── theme.css          ← Variables --th-* pour dark/light
    └── global.css         ← Reset + imports tokens + theme
```

---

## 4. Ajouter une nouvelle page

```bash
# 1. Créer le dossier
mkdir -p client/src/pages/<page>/i18n

# 2. Fichiers minimaux
touch client/src/pages/<page>/main.jsx
touch client/src/pages/<page>/<Page>.jsx
touch client/src/pages/<page>/<page>.css
touch client/src/pages/<page>/i18n/fr.js
touch client/src/pages/<page>/i18n/en.js
touch client/src/pages/<page>/i18n/index.js

# 3. Enregistrer dans Vite (client/vite.config.js → rollupOptions.input)
# 4. Enregistrer dans Express (server/index.js → app.get('/route', ...))
# 5. Créer le HTML entry (client/<page>.html)
```

---

## 5. CSS — Règles strictes

| ✅ Faire | ❌ Ne pas faire |
|----------|----------------|
| Utiliser `var(--th-*)` pour toutes les couleurs thémables | Hardcoder `#ffffff`, `rgba(...)` dans les composants |
| Utiliser `var(--color-*)` pour les tokens de brand | Utiliser Tailwind ou un framework CSS |
| Un `.css` par `.jsx` dans le même dossier | Mettre les styles d'une page dans `global.css` |
| Sections commentées dans le CSS | Écrire du CSS sans commentaires de contexte |

---

## 6. Traductions — i18n page par page

Chaque page gère ses propres chaînes. L'engine `makeT` est partagé, les données ne le sont pas.

```js
// pages/<page>/i18n/index.js
import fr from './fr'
import en from './en'
import { makeT } from '../../../i18n'
export const t = makeT({ fr, en })

// pages/<page>/<Page>.jsx
import { t as pageT } from './i18n'
const { t, locale, setLocale } = useLocale(pageT)
```

**Clés de traduction** : format `<page>.<element>.<détail>` (ex: `login.submit.loading`).

---

## 7. Icônes

- Toujours des **SVG stroke** (jamais emoji, jamais font-icon)
- Props standards : `size`, `color`, `strokeWidth`
- Toujours `aria-hidden="true"` sur le SVG
- Importer depuis le barrel : `import { SunIcon } from '../components/ui/icons'`
- Documenter dans `docs/design/icons/index.html`

---

## 8. Thème dark/light

- Le thème est écrit sur `<html data-theme="dark|light">` par `useTheme()`
- **Anti-flash** : `login.html` (et toutes les pages) contient un script inline qui lit `localStorage` et applique `data-theme` AVANT que React ne monte
- En mode clair : les images de fond restent visibles mais atténuées (`--th-mosaic-opacity: 0.10`)

---

## 9. Docker & déploiement

- Un seul `Dockerfile` multi-stage à la racine
- Le build client sort dans `server/public/` (copié depuis l'étape builder)
- `docker compose up -d --scale app=3` pour le mode HA
- Certificats TLS dans `nginx/certs/` (jamais committés)

---

## 10. Ce qu'on ne fait PAS (encore)

- Pas de logique métier dans les composants UI
- Pas de state management global (Redux, Zustand…) — useState suffit pour l'instant
- Pas de React Router — Express gère la navigation entre pages
- Pas de SSR — MPA classique avec Express servant du HTML statique compilé
