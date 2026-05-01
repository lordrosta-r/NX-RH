# Modèle : `Campaign`

**Fichier :** `mongo/server/models/Campaign.js`
**Collection :** `campaigns`

## Champs

| Champ | Type | Notes |
|-------|------|-------|
| `name` | String | requis, 3-200 chars |
| `description` | String | max 2000 |
| `startDate` | Date | requis |
| `endDate` | Date | requis, ≥ startDate |
| `status` | String | `draft \| active \| closed \| archived`, indexed |
| `createdBy` | ObjectId → User | requis |
| `deadlineEmployee` | Date | échéance phase auto-évaluation |
| `deadlineManager` | Date | échéance phase manager |
| `targetDepartments` | [String] | `[]` = toute l'entreprise |
| `extendedVisibility` | Array | visibilité étendue par manager |

## Cycle de statuts

```
draft → active → closed → archived
```
Transitions définies dans `CAMPAIGN_TRANSITIONS` (exporté par le modèle).

## Visibilité étendue

`extendedVisibility[].managerId` : manager qui reçoit la visibilité étendue.

`extendedVisibility[].restrictedToManagers` : `[]` = tout l'arbre, ou liste de sous-managers spécifiques.

## Indexes

- `status: 1`
- `createdBy: 1`
- `startDate: 1, endDate: 1` (pour le scheduler)

## Pre-save

Validation que `endDate >= startDate`.
