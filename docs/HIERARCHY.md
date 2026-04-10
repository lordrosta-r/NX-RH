# NanoXplore RH — Hiérarchie et permissions

## Arbre organisationnel type

```
                        ┌─────────┐
                        │  Admin  │  ← configuration système
                        └────┬────┘
                             │ (transverse)
                        ┌────┴────┐
                        │   HR    │  ← pilotage du processus
                        └─────────┘

          ┌──────────────────────────────────────┐
          │           Director A                 │
          │  (manage des managers)               │
          └──────┬───────────────────────┬───────┘
                 │                       │
          ┌──────┴──────┐         ┌──────┴──────┐
          │  Manager A  │         │  Manager B  │
          └──┬──┬──┬────┘         └──┬──┬───────┘
             │  │  │                 │  │
           Emp Emp Emp             Emp  Emp
```

**Note :** HR et Admin sont des rôles transverses — ils ne sont pas dans la ligne hiérarchique managériale. Un HR peut voir toute l'organisation mais il n'est le supérieur d'aucun manager.

---

## Matrice "qui peut voir qui"

| | Ses propres données | Son équipe directe | Sous-arbre récursif | Toute l'organisation |
|---|:---:|:---:|:---:|:---:|
| **Employee** | ✓ | — | — | — |
| **Manager** | ✓ | ✓ (directs uniquement) | — | — |
| **Director** | ✓ | ✓ | ✓ (son périmètre) | — |
| **HR** | ✓ | — | — | ✓ (lecture) |
| **Admin** | ✓ | ✓ | ✓ | ✓ (lecture + admin) |

> **Règle fondamentale :** un manager ne voit **jamais** les données des équipes d'un autre manager, même s'ils sont au même niveau dans l'org.

---

## Matrice "qui peut faire quoi"

| Action | Employee | Manager | Director | HR | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Remplir ses formulaires | ✓ | ✓ | ✓ | ✓ | ✓ |
| Commenter les formulaires de son équipe | — | ✓ | — | — | — |
| Valider un entretien | — | ✓ | (via délégation) | — | ✓ |
| Voir les statuts de son équipe | — | ✓ | ✓ | ✓ | ✓ |
| Vue agrégée de sa sous-arborescence | — | — | ✓ | — | ✓ |
| Vue globale de l'organisation | — | — | — | ✓ | ✓ |
| Créer un template de formulaire | — | — | — | ✓ | ✓ |
| Publier un template | — | — | — | ✓ | ✓ |
| Créer une campagne | — | — | — | ✓ | ✓ |
| Gérer le cycle de vie d'une campagne | — | — | — | ✓ | ✓ |
| Exporter les données | — | — | — | ✓ | ✓ |
| Créer / modifier des utilisateurs | — | — | — | — | ✓ |
| Changer les rôles | — | — | — | — | ✓ |
| Configurer LDAP | — | — | — | — | ✓ |
| Configurer SMTP | — | — | — | — | ✓ |

---

## Règles de cloisonnement

### Règle 1 — Isolation des équipes
Un manager ne peut accéder qu'aux données des utilisateurs dont le champ `manager_id` en base pointe vers son propre `id`. Aucune exception.

### Règle 2 — Visibilité récursive du Director
La visibilité du directeur est calculée par une traversée récursive de l'arbre `manager_id`. L'arbre peut avoir N niveaux de profondeur sans limite technique.

### Règle 3 — HR est transverse, pas hiérarchique
HR voit tout en lecture pour piloter le processus, mais n'est pas un supérieur hiérarchique. Il ne peut pas conduire d'entretiens ni valider des évaluations.

### Règle 4 — Prérequis template → campagne
Aucune campagne ne peut être créée sans au moins un template publié. Cette contrainte est vérifiée au niveau de l'interface ET de l'API.

### Règle 5 — Intégrité des soumissions
Une évaluation soumise (`submitted`) ne peut être rouverte que par un Manager (pour son équipe) ou HR. Elle ne peut jamais être supprimée — seulement archivée.

### Règle 6 — Ordre des phases
Les phases du cycle sont séquentielles. Un formulaire de phase N ne peut pas être soumis si la phase N-1 n'est pas complète. L'API rejette toute tentative de sauter une étape.

---

## Comment ajouter un rôle custom à l'avenir

Si l'organisation nécessite un nouveau rôle (ex : `auditor` en lecture seule sur tout), voici les points à modifier :

1. **`database/init.sql`** — ajouter la valeur dans l'ENUM `role` de la table `users`
2. **`server/middleware/authGuard.js`** — le nouveau rôle doit être passé dans les tableaux de rôles autorisés sur les routes concernées
3. **Routes API** — vérifier chaque route pour définir si le nouveau rôle a accès en lecture/écriture
4. **`server/routes/`** — ajouter les filtres de visibilité appropriés (le modèle `manager_id` ou une logique custom)
5. **Interface** — la sidebar `/manager` conditionne déjà l'affichage des onglets selon le rôle ; ajouter le nouveau cas
6. **Documentation** — créer `docs/roles/NEWROLE.md` en suivant le même format que les autres fichiers de ce dossier

> Ne pas oublier de mettre à jour ce fichier (`HIERARCHY.md`) avec la nouvelle entrée dans les matrices.
