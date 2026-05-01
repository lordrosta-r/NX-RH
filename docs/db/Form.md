# Modèle : `Form`

**Fichier :** `mongo/server/models/Form.js`
**Collection :** `forms`

## Champs

| Champ | Type | Notes |
|-------|------|-------|
| `campaignId` | ObjectId → Campaign | optionnel — `null` = template réutilisable |
| `title` | String | requis |
| `description` | String | |
| `formType` | String | enum `FORM_TYPES` |
| `isAnonymous` | Boolean | `upward_feedback` forcé à `true` par pre-save |
| `questions` | [QuestionSchema] | liste des questions (voir ci-dessous) |
| `frozenAt` | Date | null = modifiable, renseigné = questions gelées |

## Schema d'une question

| Champ | Type | Notes |
|-------|------|-------|
| `id` | String | identifiant unique dans le formulaire |
| `type` | String | `rating \| text \| yes_no \| choice \| weather \| mobility \| n1_import` |
| `label` | String | max 500 |
| `required` | Boolean | default: true |
| `scale` | Number | uniquement pour `rating` (2-10, default: 5) |
| `options` | [String] | uniquement pour `choice` |
| `phase` | String | `self \| n-1 \| objectives \| aspirations \| all` |

## Gel des questions (`frozenAt`)

Une fois la première évaluation créée sur ce formulaire, `frozenAt` est renseigné.
Les questions ne peuvent plus être modifiées — modifier les IDs rendrait les réponses existantes orphelines.
Le titre et la description restent modifiables.

## Pre-save

`upward_feedback` est toujours forcé en `isAnonymous: true`.

## Types de formulaires

`self_evaluation`, `manager_evaluation`, `upward_feedback`, `director_evaluation`
