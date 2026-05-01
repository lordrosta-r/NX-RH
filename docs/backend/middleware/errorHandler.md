# Middleware : `errorHandler`

**Fichier :** `mongo/server/middleware/errorHandler.js`

## Rôle

Gestionnaire d'erreurs centralisé Express (4 arguments).
Intercepte toutes les erreurs passées via `next(err)` dans les routes.

## Mapping des erreurs

| Type | Condition | Status HTTP |
|------|-----------|-------------|
| Mongoose `ValidationError` | `err.name === 'ValidationError'` | 400 |
| Mongoose `CastError` | `err.name === 'CastError'` | 400 |
| MongoDB duplicate | `err.code === 11000` | 409 |
| JWT `TokenExpiredError` | `err instanceof jwt.TokenExpiredError` | 401 |
| JWT `JsonWebTokenError` | `err instanceof jwt.JsonWebTokenError` | 401 |
| Erreur métier | `err.status` ou `err.statusCode` présent | err.status |
| Autres | — | 500 |

## Format de réponse

```json
{ "error": "Message d'erreur" }
```

> En production, les erreurs 500 retournent `"Internal server error"` (message masqué).
> En développement, le message réel est retourné pour faciliter le debug.

## Usage dans les routes

```js
router.get('/', async (req, res, next) => {
  try {
    // ...
  } catch (err) {
    next(err)  // ← toujours passer via next()
  }
})
```
