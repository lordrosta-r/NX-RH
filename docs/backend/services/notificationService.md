# Service : `notificationService`

**Fichier :** `mongo/server/services/notificationService.js`

## Rôle

Gère l'envoi de notifications (email) aux utilisateurs selon leurs préférences et leur rôle.

## Interface

```js
notify(type, recipient, data)         → Promise<void>
notifyMany(type, recipients[], data)  → Promise<void>
```

## Types de notifications

Définis dans `config/constants.js` via `NOTIF_KEYS_BY_ROLE`.

Chaque utilisateur peut activer/désactiver chaque type via `PATCH /api/auth/preferences`.

## Comportement

- Vérifie `recipient.notificationPrefs[type] === true` avant d'envoyer
- Appelle `mailer.sendMail()` si l'email est activé
- `notifyMany` itère sur tous les destinataires — les erreurs individuelles n'interrompent pas le batch
- Utilisé en fire-and-forget dans les routes (`.catch(() => {})`)
