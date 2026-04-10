# Rôle — Director (Directeur)

## Qui est-il ?

Le directeur est un **manager de managers**. Il supervise plusieurs équipes via des managers intermédiaires. Il ne manage pas directement des employés de base — il manage des managers. Sa visibilité est **récursive** : il peut voir toutes les données de sa sous-arborescence hiérarchique descendante.

**Redirection après connexion :** `/manager` (panel directeur)

---

## Ce qui le différencie du Manager

| | Manager | Director |
|---|---|---|
| Manage | Employés (directs) | Managers |
| Visibilité équipe | Son équipe directe uniquement | Tous les employés sous sa sous-arborescence |
| Conduit des entretiens | Oui (ses directs) | Non (délègue aux managers) |
| Vue consolidée | Non | Oui |
| Peut déléguer | Non | Oui |

---

## Visibilité récursive sur sa sous-arborescence

La visibilité du directeur suit l'arbre hiérarchique à partir de lui :

```
Director (Alice)
├── Manager A (Bob)
│   ├── Employee 1
│   ├── Employee 2
│   └── Employee 3
└── Manager B (Carol)
    ├── Employee 4
    └── Employee 5
```

Alice peut voir les évaluations de Employee 1 à 5 et les statuts de Bob et Carol.
Alice ne peut pas voir les équipes d'un autre directeur.

Cette visibilité est calculée dynamiquement via une requête récursive sur `manager_id` — l'arbre peut avoir N niveaux de profondeur.

---

## Son tableau de bord (`/manager` — vue directeur)

- **Vue par manager** : pour chaque manager sous lui, le taux de complétion de son équipe
- **Vue agrégée** : statistiques consolidées sur l'ensemble de sa sous-arborescence
  - Nombre d'entretiens en cours / validés / en retard
  - Répartition des statuts
  - Alertes sur les campagnes qui approchent de la date de clôture
- **Accès aux fiches** : il peut consulter (en lecture) n'importe quelle évaluation dans son périmètre

---

## Consolidation des résultats

Le directeur dispose d'une vue agrégée des résultats de ses équipes :
- Répartition des notes globales (si disponibles)
- Synthèse des objectifs par équipe
- Vue des aspirations consolidées (pour anticiper les besoins en formation/mobilité)

> Ces données sont en **lecture seule** — le directeur ne peut pas modifier les évaluations de ses managers ni celles des employés.

---

## Délégation d'évaluation

Si un manager est absent ou indisponible, le directeur peut **déléguer temporairement** la conduite des entretiens à un autre manager de son périmètre. Cette délégation est tracée et visible dans l'audit.

---

## Ce que le directeur ne peut PAS faire

- Conduire directement l'entretien d'un employé de base (il doit déléguer au manager)
- Modifier ou valider les évaluations (uniquement lecture, sauf en cas de délégation explicite)
- Voir les équipes hors de sa sous-arborescence
- Créer des templates de formulaires (rôle HR)
- Lancer une campagne (rôle HR)
- Accéder aux paramètres système (rôle Admin)
