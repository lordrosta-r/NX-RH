# Page Login — `client/src/pages/login/`

Page de connexion de l'application NanoXplore RH.
Accessible sans authentification via la route `/login`.

---

## Role dans l'application

Point d'entree unique pour tous les utilisateurs non connectes.
Apres une authentification reussie, l'utilisateur est redirige vers
son tableau de bord selon son role (employee, manager, hr, admin).

---

## Fichiers

| Fichier | Role |
|---|---|
| `Login.jsx` | Composant racine — formulaire de connexion, logique de soumission |
| `MosaicBackground.jsx` | Fond mosaique anime (decoration visuelle) |
| `MosaicBackground.css` | Styles du fond mosaique |
| `LoginControls.jsx` | Pill flottante bas-droite — toggle theme + selecteur langue |
| `LoginControls.css` | Styles de la pill de controles |
| `LanguageSelector.jsx` | Selecteur de langue (fr / en) |
| `LanguageSelector.css` | Styles du selecteur de langue |
| `login.css` | Styles de la page entiere (card, form, header, footer) |
| `i18n/` | Traductions de la page (fr.js, en.js, index.js) |

---

## Dependances cles

### Contextes utilises

| Contexte | Hook | Usage |
|---|---|---|
| `AuthContext` | `useAuth()` | `refreshUser()` — re-fetch /api/auth/me apres login |
| `LocaleContext` | `useLocaleCtx()`, `useTranslate()` | Langue active et traductions |
| `ThemeContext` | (monte globalement) | Le theme est gere par `ThemeProvider` en amont |

### Endpoint API appele

| Methode | Route | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authentifie l'utilisateur, pose le cookie HttpOnly de session |

### Composants UI partages

- `InputField` — `components/ui/InputField`
- `Checkbox` — `components/ui/Checkbox`
- `ThemeToggle` — `components/ui/ThemeToggle` (via LoginControls)

---

## Ce qui a change lors de la migration MPA → SPA (Phase 4)

| Avant (MPA) | Apres (SPA) |
|---|---|
| `main.jsx` — point d'entree Vite dedie | **Supprime** — App.jsx est l'unique entree |
| `useLocale(pageT)` de `hooks/useLocale` | `useLocaleCtx()` + `useTranslate(pageT)` de `LocaleContext` |
| `useTheme()` de `hooks/useTheme` | Plus necessaire — `ThemeProvider` gere le theme globalement |
| `window.location.href = ROLE_HOME[role]` | `navigate(ROLE_HOME[role], { replace: true })` via React Router |
| Pas de synchronisation du contexte Auth | `refreshUser()` appele depuis `AuthContext` avant la navigation |

---

## Points d'attention

- Le cookie de session est HttpOnly — aucune donnee sensible n'est stockee cote client.
- La table `ROLE_HOME` dans `Login.jsx` doit rester synchronisee avec les routes de `App.jsx`.
- Le lien `mailto:admin@nanoxplore.com` reste en `<a href>` (lien externe, pas interne).
