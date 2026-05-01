# Modèle : `Config`

**Fichier :** `mongo/server/models/Config.js`
**Collection :** `configs`

## Rôle

Store générique clé/valeur pour la configuration applicative persistée (ex: configuration LDAP).

## Champs

| Champ | Type | Notes |
|-------|------|-------|
| `key` | String | unique, trim, requis |
| `value` | Mixed | n'importe quel type JSON |
| `createdAt` / `updatedAt` | Date | auto (timestamps) |

## Clés utilisées

| Clé | Contenu |
|-----|---------|
| `ldap` | Configuration LDAP complète (avec `bindPassword` haché) |

## Notes

- Modèle volontairement minimaliste — le schéma flexible (`Mixed`) est intentionnel
- Géré via `GET/PUT/PATCH/DELETE /api/admin/config/:key`
- Le `bindPassword` LDAP est stocké ici mais **jamais retourné** par l'API (`GET /api/admin/ldap/config` le strip)
