# Service : `mailer`

**Fichier :** `mongo/server/services/mailer.js`

## Rôle

Abstraction d'envoi d'emails via Nodemailer. En développement, utilise Ethereal (fake SMTP) et retourne une URL de preview.

## Interface

```js
sendMail({ to, subject, html, text? }) → Promise<SentMessageInfo | null>
```

## Configuration

Variables d'environnement utilisées :

| Variable | Description |
|----------|-------------|
| `MAIL_HOST` | Serveur SMTP |
| `MAIL_PORT` | Port SMTP (ex: 587) |
| `MAIL_USER` | Identifiant SMTP |
| `MAIL_PASSWORD` | Mot de passe SMTP |
| `MAIL_FROM` | Adresse expéditeur (ex: `"NanoXplore RH <adresse-expéditeur>"`) |

Si `MAIL_HOST` n'est pas défini, le service crée un compte Ethereal temporaire pour les tests.
