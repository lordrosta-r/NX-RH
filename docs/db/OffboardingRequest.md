# Modèle : `OffboardingRequest`

**Fichier :** `mongo/server/models/OffboardingRequest.js`
**Collection :** `offboardingrequests`

## Rôle

Gère le processus de départ d'un employé (offboarding). Une seule demande par utilisateur.

## Champs

| Champ | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId → User | unique — un seul offboarding par utilisateur |
| `requestedBy` | ObjectId → User | hr/admin qui a initié |
| `reason` | String | motif du départ |
| `targetDate` | Date | date de départ prévue |
| `checklist` | [ChecklistItem] | étapes à compléter |
| `completedAt` | Date | date de complétion totale |

## Checklist par défaut

1. Révocation accès systèmes
2. Récupération matériel
3. Archivage évaluations
4. Solde de tout compte
5. Entretien de départ (optionnel)

## Schema d'un item de checklist

| Champ | Type | Notes |
|-------|------|-------|
| `item` | String | libellé de l'étape |
| `done` | Boolean | default: false |
| `doneAt` | Date | horodatage de complétion |
| `doneBy` | ObjectId → User | qui a coché l'étape |

## Comportement

Quand toutes les étapes sont `done: true`, `completedAt` est renseigné et `User.isActive` est passé à `false`.
