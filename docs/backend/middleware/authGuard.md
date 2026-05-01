# Middleware : `authGuard`

**Fichier :** `mongo/server/middleware/authGuard.js`

## Rôle

Middleware Express combinant **authentification JWT** + **autorisation RBAC** + **vérification DB**.

## Signature

```js
authGuard(allowedRoles = []) → async (req, res, next) => void
```

## Comportement

1. **Cookie JWT** : lit `req.cookies.token` — si absent → 401
2. **Vérification JWT** : `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })`
   - `TokenExpiredError` → 401 "Session expirée"
   - `JsonWebTokenError` → 401 "Token invalide"
3. **RBAC** : si `allowedRoles.length > 0` et `payload.role ∉ allowedRoles` → 403
4. **Vérification DB** : `User.findById(payload.id, 'isActive')` — si inexistant ou `isActive: false` → 401 + clear cookie
5. **Attache `req.user`** : `{ id, email, role, ... }` (payload JWT)

## Usage

```js
// Tous les rôles authentifiés
router.get('/', authGuard(), handler)

// Rôles spécifiques
router.post('/', authGuard(['admin', 'hr']), handler)

// Dans index.js pour un groupe complet de routes
app.use('/api/admin', authGuard(['admin']), adminRoutes)
```

## Notes

- `authGuard([])` = authentifié uniquement (pas de restriction de rôle)
- Pour les routes non-API (SPA), retourne une redirection au lieu du JSON
- La vérification DB est volontairement minimaliste (seul `isActive` est lu) pour minimiser la latence
