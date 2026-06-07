# Service : `managerVisibility`

**Fichier :** `mongo/server/services/managerVisibility.js`

## Rôle

Calcule récursivement les IDs d'utilisateurs visibles par un manager, en tenant compte de la visibilité étendue configurée par campagne.

## Interface

```js
getVisibleEvaluateeIds(managerId, campaign) → Promise<ObjectId[]>
```

## Comportement

### Visibilité standard
Un manager voit uniquement les employés dont `User.managerId === managerId`.

### Visibilité étendue (`campaign.extendedVisibility`)
Si la campagne définit une entrée `{ managerId, restrictedToManagers: [] }` pour ce manager :
- `restrictedToManagers: []` → récupère tous les subordonnés dans l'arbre hiérarchique
- `restrictedToManagers: [id1, id2]` → uniquement les équipes de ces sous-managers spécifiques

La résolution est **récursive** — si un team lead manage lui-même des sous-leads, le manager racine voit tout l'arbre.

## Notes

- Utilisé dans `GET /api/evaluations` pour filtrer les résultats selon le rôle `manager`
- Le résultat inclut toujours les subordonnés directs, même sans `extendedVisibility`
