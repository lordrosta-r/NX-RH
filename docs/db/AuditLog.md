# Modèle : `AuditLog`

**Fichier :** `mongo/server/models/AuditLog.js`
**Collection :** `auditlogs`

## Rôle

Piste d'audit des actions métier sensibles (changements de statut, créations en masse, etc.).

## Champs

| Champ | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId → User | requis — auteur de l'action |
| `userRole` | String | rôle au moment de l'action |
| `action` | String | requis — ex: `status_change`, `bulk_action`, `campaign_create` |
| `targetType` | String | requis — `Evaluation`, `Campaign`, `User` |
| `targetId` | ObjectId | requis |
| `meta` | Mixed | données contextuelles (ancien/nouveau statut, count, etc.) |
| `createdAt` | Date | horodatage |

## TTL

Les logs expirent automatiquement après **2 ans** via un index TTL MongoDB (`expireAfterSeconds: 63072000`).

## Indexes

- TTL : `createdAt: 1` (expireAfterSeconds: 2 ans)
- `userId: 1, createdAt: -1`
- `targetId: 1, createdAt: -1`
- `targetType: 1, createdAt: -1`

## Notes

- Les logs sont créés en fire-and-forget (`.catch(() => {})`) — une erreur de log ne bloque jamais l'action métier
- `timestamps: false` — `createdAt` est géré manuellement pour éviter `updatedAt` inutile
