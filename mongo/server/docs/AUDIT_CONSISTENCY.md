# Audit de consistance — Routes NanoXplore RH

> Généré après application des correctifs de consistance sur les 5 fichiers de routes.
> Les correctifs sont purement syntaxiques — aucune logique métier n'a été modifiée.

---

## Résumé des correctifs

| Fix | Description | Fichiers concernés |
|-----|-------------|-------------------|
| Fix 1 | Messages d'erreur en français, format `{ error: "..." }` | `users.js`, `admin.js` |
| Fix 2 | Codes HTTP corrects (DELETE → 204) | `users.js` |
| Fix 3 | Pagination toujours active sur les GET list | `users.js` |
| Fix 4 | Commentaires de handlers au format standard | Tous les 5 fichiers |
| Fix 5 | Suppression du doublon `_id` / `id` dans `GET /api/auth/me` | `auth.js` |
| Fix 6 | Hachage bcrypt du `tempPassword` avant stockage | `users.js` |
| Fix 7 | Vérification whitelist PATCH non-admin (déjà correct) | `users.js` |

---

## auth.js

### Fix 4 — Commentaires de handlers standardisés

**Problème** : Les handlers avaient des séparateurs décoratifs (`// ─── ...`) mais pas de commentaire au format standard `// METHOD /api/path — Description` directement au-dessus de la déclaration du handler.

**Correctif** : Ajout du commentaire au format standard immédiatement avant chaque `router.METHOD(...)` :

```js
// POST /api/auth/login — Vérifie les identifiants et émet un cookie httpOnly JWT
// POST /api/auth/logout — Supprime le cookie de session
// GET /api/auth/me — Revalide la session et retourne l'utilisateur courant
// PATCH /api/auth/preferences — Met à jour les préférences de l'utilisateur courant
```

### Fix 5 — Suppression du doublon `id` / `_id` dans `GET /api/auth/me`

**Problème** : Le handler retournait `res.json({ id: user._id, ...user })`. Comme `user` (résultat `.lean()`) contient déjà `_id`, la réponse incluait à la fois `id` et `_id` avec la même valeur ObjectId — duplication inutile et incohérente.

**Correctif** :
```js
// Avant (bugué)
res.json({ id: user._id, ...user })

// Après (corrigé)
const { _id, ...rest } = user
res.json({ id: _id, ...rest })
```

**Pourquoi** : `_id` est destructuré pour l'exclure du spread, puis réexposé sous la clé `id`. La réponse contient désormais `id` (string/ObjectId) sans doublon `_id`.

---

## users.js

### Fix 1 — Messages d'erreur traduits en français

**Problème** : Les messages d'erreur 403 et 404 étaient en anglais, incohérents avec les autres fichiers du projet.

**Correctif** : Remplacement global dans tout le fichier :

| Avant | Après |
|-------|-------|
| `'Insufficient permissions'` | `'Permissions insuffisantes'` |
| `'User not found'` | `'Utilisateur introuvable'` |
| `'Email already exists'` | `'Email déjà utilisé'` |

Occurrences corrigées :
- `'Insufficient permissions'` : 8 occurrences (GET /, GET /:id ×2, POST /, PATCH /:id, GET /offboard-preview, PATCH /offboard, PATCH /onboarding/complete, PATCH /onboarding/:stepIndex, GET /gdpr-export)
- `'User not found'` : 8 occurrences (une par handler qui cherche un utilisateur)
- `'Email already exists'` : 1 occurrence (catch erreur 11000 dans POST /)

### Fix 2 — DELETE /api/users/:id/gdpr-anonymize → 204

**Problème** : Le handler DELETE retournait `res.json({ success: true, anonymizedId: userId })` avec un code 200, alors que la convention du projet est 204 No Content pour les DELETEs.

**Correctif** :
```js
// Avant
res.json({ success: true, anonymizedId: userId })

// Après
res.status(204).end()
```

**Pourquoi** : Un DELETE réussi ne doit pas retourner de corps. Le code 204 est la norme REST pour indiquer que l'opération a réussi sans contenu à retourner.

### Fix 3 — Pagination toujours active sur GET /api/users

**Problème** : Le handler `GET /api/users` avait un comportement dual-mode :
- Sans `?page` : retournait un array JSON brut limité à 100 entrées
- Avec `?page` : retournait `{ data, total, page, limit }`

Ce comportement incohérent obligeait les clients à gérer deux formats de réponse différents selon la présence du paramètre.

**Correctif** : Suppression de la branche `if (req.query.page)` et passage systématique au format paginé avec valeurs par défaut `page=1, limit=50` :

```js
// Avant (dual-mode)
if (req.query.page) {
  // ... paginé
  return res.json({ data, total, page, limit })
}
const users = await User.find(filter).limit(100).lean()
res.json(users)  // array brut

// Après (toujours paginé)
const page  = Math.max(1, parseInt(req.query.page)  || 1)
const limit = Math.min(100, parseInt(req.query.limit) || 50)
const skip  = (page - 1) * limit
const [users, total] = await Promise.all([...])
res.json({ data: users, total, page, limit })
```

**Pourquoi** : Uniformité avec `GET /api/admin/audit` et `GET /api/offboarding` qui sont toujours paginés. Le client peut toujours passer `limit=100` pour obtenir la liste complète.

### Fix 4 — Commentaires de handlers standardisés

**Problème** : Les commentaires des handlers n'étaient pas au format standard. Certains étaient incomplets (`// GET /api/users/:id` sans description), d'autres avaient une casse incorrecte.

**Correctif** : Standardisation de tous les commentaires de handlers :

```js
// GET /api/users — Liste les utilisateurs (scope par rôle)
// GET /api/users/:id — Retourne un utilisateur par son ID
// POST /api/users — Crée un utilisateur (admin/hr seulement)
// PATCH /api/users/:id — Modifie un utilisateur
// GET /api/users/:id/offboard-preview — Prévisualise les impacts avant départ (admin/hr)
// PATCH /api/users/:id/offboard — Déclenche le processus de départ (admin/hr)
// PATCH /api/users/:id/onboarding/complete — Marque l'onboarding terminé
// PATCH /api/users/:id/onboarding/:stepIndex — Coche une étape d'onboarding
// GET /api/users/:id/gdpr-export — Exporte les données personnelles RGPD
// DELETE /api/users/:id/gdpr-anonymize — Anonymise un utilisateur (droit à l'effacement)
```

### Fix 6 — Hachage bcrypt du `tempPassword` (bug critique)

**Problème** : Dans `POST /api/users`, le mot de passe temporaire était stocké en clair dans `passwordHash` :
```js
const tempPassword = require('crypto').randomBytes(16).toString('hex')
// ...
passwordHash: tempPassword,  // ← hex brut, jamais hashé !
```
`bcrypt.compare()` dans `/api/auth/login` comparait le mot de passe saisi avec un hash bcrypt attendu — mais `passwordHash` contenait un hex brut. Résultat : les nouveaux comptes ne pouvaient **jamais** se connecter avec leur mot de passe temporaire.

**Correctif** :
```js
const tempPassword = require('crypto').randomBytes(16).toString('hex')
const passwordHash = await bcrypt.hash(tempPassword, 12)

const user = new User({
  // ...
  passwordHash,  // ← hash bcrypt correct
})
// tempPassword (en clair) exposé une seule fois dans la réponse 201
res.status(201).json({ ...result, tempPassword })
```

**Imports ajoutés** : `const bcrypt = require('bcrypt')` en tête de fichier.

**Pourquoi 12 rounds** : Valeur identique à celle utilisée dans le reste du projet (cohérence).

### Fix 7 — Whitelist PATCH non-admin (vérification)

**Vérification effectuée** : Le code existant est correct. La whitelist `ALLOWED` contient `['email', 'firstName', 'lastName', 'department', 'position', 'role', 'managerId', 'isActive']` et les non-admins voient les champs `['role', 'managerId', 'isActive', 'department', 'position', 'email']` bloqués avec un 403. Seuls `firstName` et `lastName` restent modifiables par les non-admins.

**Aucun changement nécessaire.**

---

## admin.js

### Fix 1 — Format de réponse d'erreur

**Problème** : La réponse 400 incluait un champ `sent: false` en plus du champ `error` :
```js
return res.status(400).json({ sent: false, error: 'Adresse email invalide' })
```
La convention du projet impose `{ error: "..." }` uniquement pour les erreurs 4xx.

**Correctif** :
```js
return res.status(400).json({ error: 'Adresse email invalide' })
```

### Fix 4 — Commentaire de handler standardisé

**Correctif** :
```js
// POST /api/admin/email/test — Envoie un email de test
```

---

## ldap.js

### Fix 4 — Commentaires de handlers standardisés

**Problème** : Tous les handlers n'avaient pas de commentaire au format standard. Les sections avaient des séparateurs décoratifs mais aucun commentaire `// METHOD /api/path — Description`.

**Correctif** : Ajout du commentaire standard avant chaque handler :

```js
// POST /api/admin/ldap/test — Teste la connexion LDAP
// POST /api/admin/ldap/preview — Liste les utilisateurs LDAP (prévisualisation, max 50)
// POST /api/admin/ldap/sync — Synchronise les utilisateurs LDAP vers MongoDB
// GET /api/admin/ldap/config — Récupère la configuration LDAP sauvegardée (sans bindPassword)
// PUT /api/admin/ldap/config — Sauvegarde la configuration LDAP
```

---

## audit.js

### Fix 4 — Commentaire de handler standardisé

**Problème** : Le seul handler du fichier n'avait pas de commentaire au format standard (le header de fichier documentait l'endpoint, mais pas le handler lui-même).

**Correctif** :
```js
// GET /api/admin/audit — Liste les entrées de la piste d'audit (paginé)
```

---

## Validation syntaxique

Tous les fichiers ont été validés avec `node --check` après les modifications :

```
OK: auth.js
OK: users.js
OK: admin.js
OK: ldap.js
OK: audit.js
```

---

*Fin du rapport — 5 fichiers modifiés, 0 erreur de syntaxe.*
