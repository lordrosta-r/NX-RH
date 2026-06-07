# Service : `scheduler`

**Fichier :** `mongo/server/services/scheduler.js`

## Rôle

Exécute des jobs récurrents côté serveur (expiration des évaluations, rappels calendrier).

## Interface

```js
start() → void  // Démarre le scheduler au démarrage du serveur
```

## Jobs

| Job | Fréquence | Action |
|-----|-----------|--------|
| Expiration évaluations | Quotidien | Passe `in_progress` en `expired` si `expiresAt < now` |
| Rappels événements | Quotidien | Envoie les rappels J-1 des événements calendrier (`reminderSent: false`) |

## Notes

- Appelé dans `start()` de `index.js` après la connexion MongoDB
- Les jobs sont fire-and-forget — les erreurs sont logguées mais ne crashent pas le serveur
