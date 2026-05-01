# Route : `/api/admin/audit`

**Fichier :** `mongo/server/routes/audit.js`
**Protégé :** `authGuard(['admin', 'hr'])` + `apiLimiter`

## Endpoints

### `GET /api/admin/audit`

Liste la piste d'audit avec pagination.

**Query :** `?userId`, `?targetType` (Evaluation|Campaign|User), `?action`, `?from`, `?to`, `?page`, `?limit`

**Réponse :** `{ data: [AuditLog], total, page, limit }`

## Notes

- Les logs sont en lecture seule — aucune route de création/modification exposée
- TTL : les logs expirent automatiquement après 2 ans (MongoDB TTL index)
- Déclaré AVANT `/api/admin` dans `index.js` pour que `authGuard(['admin','hr'])` s'applique (sinon `authGuard(['admin'])` prendrait la priorité)
