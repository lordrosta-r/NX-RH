# Service : `ldapService`

**Fichier :** `mongo/server/services/ldapService.js`

## Rôle

Intégration LDAP pour tester la connexion, prévisualiser les utilisateurs, et synchroniser l'annuaire vers MongoDB.

## Interface

```js
testConnection(config)  → Promise<{ ok: boolean, info?: string, error?: string }>
previewUsers(config)    → Promise<Array<LdapEntry>>
syncUsers(config)       → Promise<{ created, updated, skipped, errors[] }>
```

## Shape de la config

```js
{
  host,           // ldaps://dc.corp.com:636
  bindDN,         // cn=svc-nanoxplore,dc=corp,dc=com
  bindPassword,   // mot de passe du compte de service
  baseDN,         // ou=people,dc=corp,dc=com
  userFilter,     // (sAMAccountName={{u}}) ou (objectClass=person)
  attrEmail,      // default: 'mail'
  attrFirstName,  // default: 'givenName'
  attrLastName,   // default: 'sn'
  attrDepartment, // default: 'department'
  attrTitle,      // default: 'title'
  defaultRole,    // default: 'employee'
  rejectUnauthorized, // default: true (TLS strict)
}
```

## Sécurité

- TLS `rejectUnauthorized: true` par défaut (configurable via `LDAP_TLS_REJECT_UNAUTHORIZED`)
- `bindPassword` n'est jamais retourné dans les réponses API (`GET /api/admin/ldap/config` le strip)
- `previewUsers` limite à 50 entrées (`sizeLimit: 50`)
- `syncUsers` limite à 1000 entrées (`sizeLimit: 1000`)

## Comportement de sync

- Upsert sur `email` (lowercase)
- Ne modifie JAMAIS le `passwordHash` d'un utilisateur existant
- Les nouveaux utilisateurs reçoivent un hash aléatoire (s'authentifieront via LDAP uniquement)
- `authSource: 'ldap'` est forcé pour tous les utilisateurs synchronisés
