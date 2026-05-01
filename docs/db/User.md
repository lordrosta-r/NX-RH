# Modèle : `User`

**Fichier :** `mongo/server/models/User.js`
**Collection :** `users`

## Champs

| Champ | Type | Notes |
|-------|------|-------|
| `firstName` | String | requis, max 80 |
| `lastName` | String | requis, max 80 |
| `email` | String | unique, lowercase, requis |
| `passwordHash` | String | `select: false` — bcrypt |
| `role` | String | enum ROLES |
| `department` | String | max 120 |
| `position` | String | intitulé de poste |
| `managerId` | ObjectId → User | référence au manager direct |
| `isActive` | Boolean | default: true — désactiver = révocation |
| `authSource` | String | `'local'` ou `'ldap'` |
| `ldapDn` | String | DN LDAP (index partiel unique, ignore null) |
| `locale` | String | `'fr'`, `'en'` |
| `theme` | String | `'light'`, `'dark'`, `'system'` |
| `notificationPrefs` | Mixed | clés par type de notification |
| `lastLoginAt` | Date | mis à jour à chaque login |
| `onboarding` | Mixed | état de l'onboarding frontend |
| `createdAt` / `updatedAt` | Date | auto (timestamps) |

## Indexes

- `email` : unique
- `ldapDn` : partiel unique (ignore `null`)
- `department: 1`
- `managerId: 1, isActive: 1`
- `managerId: 1, role: 1, isActive: 1`
- `isActive: 1, role: 1`

## Pre-save hooks

- **Hachage du mot de passe** : si `passwordHash` est modifié, bcrypt avec `BCRYPT_ROUNDS`
- **Détection de cycle** : vérifie qu'un manager ne crée pas de cycle hiérarchique (`managerId → managerId → ...`)

## Notes

- `isActive: false` = révocation immédiate — l'`authGuard` vérifie ce flag en DB à chaque requête
- La suppression physique est impossible (intégrité des évaluations)
- Les utilisateurs LDAP s'authentifient via `ldapService` — leur `passwordHash` est un hash aléatoire inutilisable
