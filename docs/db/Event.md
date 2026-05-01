# Modèle : `Event`

**Fichier :** `mongo/server/models/Event.js`
**Collection :** `events`

## Rôle

Événements du calendrier RH : entretiens, réunions, deadlines manuelles.

> Les dates de campagne (startDate/endDate) sont affichées directement depuis `Campaign` — pas besoin de créer un Event pour ça.

## Champs

| Champ | Type | Notes |
|-------|------|-------|
| `title` | String | requis, 1-200 chars |
| `description` | String | max 2000 |
| `location` | String | max 200 |
| `date` | Date | requis, indexed |
| `endDate` | Date | optionnel (événements multi-jours) |
| `type` | String | enum `EVENT_TYPES` |
| `campaignId` | ObjectId → Campaign | optionnel |
| `targetRoles` | [String] | rôles qui voient l'événement — default: tous |
| `reminderSent` | Boolean | `true` une fois le rappel envoyé par le scheduler |
| `createdBy` | ObjectId → User | requis |

## Indexes

- `date: 1` (filtrage calendrier)
- `createdBy: 1, date: -1`
- `campaignId: 1, date: 1`

## Pre-save

Validation que `endDate >= date` si `endDate` est renseigné.
