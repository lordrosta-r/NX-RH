# Modèle : `Evaluation`

**Fichier :** `mongo/server/models/Evaluation.js`
**Collection :** `evaluations`

## Champs principaux

| Champ | Type | Notes |
|-------|------|-------|
| `campaignId` | ObjectId → Campaign | requis, indexed |
| `formId` | ObjectId → Form | requis, indexed |
| `evaluatorId` | ObjectId → User | requis, indexed (toujours stocké même si anonyme) |
| `evaluateeId` | ObjectId → User | requis, indexed |
| `status` | String | voir cycle de vie ci-dessous |
| `answers` | Array | `[{ questionId, value }]` |
| `reviewerComment` | String | commentaire du manager |
| `evaluateeComment` | String | commentaire de l'évalué |
| `signedByEvaluateeAt` | Date | horodatage signature évalué |
| `signedByManagerAt` | Date | horodatage signature manager |
| `signedByHrAt` | Date | horodatage signature RH |
| `lastSavedAt` | Date | dernier auto-save |
| `expiresAt` | Date | endDate campagne + 30j — TTL soft |

## Cycle de statuts

```
assigned → in_progress → submitted → reviewed
       → signed_evaluatee → signed_manager → signed_hr → validated → archived
       → expired
```

## Constantes exportées

- `VALID_TRANSITIONS` : toutes les transitions valides (admin peut toutes les effectuer)
- `ROLE_TRANSITIONS` : transitions autorisées par rôle (hr, manager, employee)
- `LOCKED_STATUSES` : statuts terminaux — aucune modification possible
- `COMPLETED_STATUSES` (dans `helpers.js`) : statuts considérés "complétés"

## Indexes

- Compound unique : `(campaignId, formId, evaluatorId, evaluateeId)` — empêche les doublons
- `campaignId: 1, status: 1`
- `evaluateeId: 1, campaignId: 1`
- `evaluatorId: 1, campaignId: 1`
- `status: 1` (individual)
- `expiresAt: 1` (pour le scheduler)
