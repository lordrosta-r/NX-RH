# ✅ NanoXplore RH — Definition of Done Checklist

> Utiliser cette checklist avant chaque commit de feature ou de bugfix.
> Cocher toutes les cases applicables selon le périmètre de la PR.

---

## 🔐 Sécurité Auth *(à vérifier sur chaque page protégée)*

- [ ] `useAuthUser()` appelé inconditionnellement (avant tout `return`)
- [ ] Guard `if (authLoading) return null` présent
- [ ] Guard `if (!user) return null` présent
- [ ] Vérification de rôle `['role1','role2'].includes(user.role)` si page restreinte
- [ ] Redirect vers `/` si rôle non autorisé

---

## 🌐 Fetch API

- [ ] `credentials: 'include'` sur **tous** les `fetch()`
- [ ] Check `if (!r.ok)` après chaque `fetch()`
- [ ] Gestion 401/403 → redirect `/`
- [ ] Gestion des autres erreurs → `setError(t(...))`
- [ ] Pas de token JWT dans le `localStorage` ni dans le body de réponse

---

## 🌍 i18n

- [ ] **Zéro** texte visible hardcodé en JSX (tout via `t()`)
- [ ] Clé présente dans `fr.js` **ET** `en.js`
- [ ] Format de clé respecté : `<page>.<element>.<detail>`
- [ ] Composants partagés utilisent des **props** pour les labels (pas de `useLocale` directement)
- [ ] `aria-label`, `title`, `placeholder` tous via `t()`

---

## 🎨 CSS

- [ ] **Zéro** `#hex`, `rgba()`, `rgb()`, `hsl()` hardcodés dans les fichiers CSS
- [ ] Couleurs thémables → `var(--th-*)`
- [ ] Couleurs brand → `var(--color-*)`
- [ ] Fallbacks de `var()` utilisent également des tokens CSS
- [ ] Un `.css` par `.jsx` dans le même dossier

---

## ♿ Accessibilité

- [ ] `aria-label` sur tous les boutons icon-only
- [ ] `aria-hidden="true"` sur les SVG décoratifs
- [ ] `scope="col"` sur les `<th>` de tableau
- [ ] `<table><thead><tbody>` pour les tableaux de données (pas de divs)
- [ ] `aria-live` ou `role="alert"` sur les messages d'erreur dynamiques
- [ ] Skip link `<a href="#root" class="skip-link">` dans chaque HTML entry point

---

## 🔧 Backend Routes

- [ ] Route protégée par `authGuard` middleware
- [ ] Vérification de rôle explicite (`req.user.role`)
- [ ] `isValidObjectId()` sur **tous** les `:id` params ET IDs dans le body
- [ ] Whitelist explicite des champs autorisés (jamais `new Model(req.body)`)
- [ ] `try/catch` avec `next(err)` ou `res.status(500)`
- [ ] Données sensibles exclues des réponses (`passwordHash`, `ldapDn`)
- [ ] Codes HTTP sémantiquement corrects (201 créé, 409 conflit, 403 interdit)

---

## 🏗️ Backend Modèles

- [ ] Tous les enums importés depuis `config/constants.js`
- [ ] Champs `select: false` sur données sensibles
- [ ] Index sur les champs de recherche fréquents
- [ ] Validations Mongoose (`required`, `min`, `max`, `match`)
- [ ] Pre-save hooks si transformation nécessaire

---

## 📦 KISS & Architecture

- [ ] Imports inutilisés supprimés
- [ ] Props inutilisées supprimées
- [ ] Pas de `console.log()` en production (`console.warn`/`error` OK)
- [ ] Pas de `TODO` / `FIXME` non traités
- [ ] Pas de données mockées (`MOCK_*` variables) en production
- [ ] Logique métier uniquement dans les routes/services (pas dans les composants UI)

---

## 📄 Documentation

- [ ] Nouveau endpoint documenté dans `docs/API.md`
- [ ] Nouveau composant partagé documenté dans `docs/ARCHITECTURE.md`
- [ ] Variable d'env ajoutée dans `mongo/.env.example`
- [ ] Flux utilisateur modifié → `docs/USER_FLOW.md` à jour
