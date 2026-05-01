# Modèle : `Resource`

**Fichier :** `mongo/server/models/Resource.js`
**Collection :** `resources`

## Rôle

Documents publiés par RH : guides, grilles d'évaluation, livrets. Les fichiers sont stockés dans `UPLOADS_DIR`.

## Champs

| Champ | Type | Notes |
|-------|------|-------|
| `title` | String | requis, 1-200 chars |
| `description` | String | max 2000 |
| `type` | String | enum `RESOURCE_TYPES` (pdf, docx, xlsx, etc.) |
| `filename` | String | nom du fichier sur le disque (relatif à `UPLOADS_DIR`) |
| `status` | String | `draft` (admin seulement) ou `published` |
| `visibleTo` | [String] | rôles qui voient la ressource — default: tous |
| `createdBy` | ObjectId → User | requis |

## Indexes

- `status: 1`
- `createdBy: 1`

## Notes

- Les fichiers sont servis via `GET /api/resources/:id/file`
- `UPLOADS_DIR` est configuré dans `.env` (ex: `/app/uploads`)
- Le chemin du fichier n'est jamais exposé au client — uniquement le nom
