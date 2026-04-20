# Rôle — Director (Directeur)

> **Design complet :** voir [`designs/roles/designdirector.txt`](../../designs/roles/designdirector.txt)

## Qui est-il ?

Le directeur est un **manager de managers**. Il supervise plusieurs équipes via des managers intermédiaires. Il ne manage pas directement des employés de base — il manage des managers. Sa visibilité est **récursive** : il peut voir toutes les données de sa sous-arborescence hiérarchique descendante.

**Redirection après connexion :** `/director`

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

## Son tableau de bord (`/director`) — Vue Consolidée

- **Vue par manager** : pour chaque manager sous lui :
  - Nom, taille d'équipe, taux de complétion
  - **Distribution moyenne des notes** : détecte la complaisance (moyenne trop haute) ou la sévérité excessive (moyenne trop basse)
- **Compteur Global** : *"Ma branche : X évaluations, Y validées, Z en cours, deadline dans N jours."*
- **Heatmap de complétion** : graphique coloré par équipe (zones rouges = retardataires)
- **Accès aux fiches** : consultation en lecture de n'importe quelle évaluation dans son périmètre

---

## Session de Calibration (`/director/calibration/:campaignId`)

Avant la clôture définitive d'une campagne, le Director dispose d'un **tableau comparatif** :
- Chaque colonne = un Manager, chaque ligne = un employé évalué
- Visualisation des notes et moyennes pour détecter les incohérences
- Le Director ne modifie PAS les notes mais ajoute des **commentaires de recadrage** visibles par le Manager
- Le Manager doit alors ajuster ou justifier sa notation

---

## Lecture Profonde (`/director/review/:evalId`)

- Ouverture de n'importe quelle évaluation de sa descendance en **lecture seule pure**
- Voit ce que l'employé a écrit ET ce que le Manager a écrit
- Peut laisser un **"Commentaire Director"** (visible par le RH uniquement, pas par l'employé ni le Manager)

---

## Double casquette : Director + Manager direct

Le Director a ses propres N-1 directs (les Managers) à évaluer :
- **Onglet "Mon Équipe Directe"** : Agit comme un Manager classique (entretiens de ses N-1)
- **Onglet "Ma Branche"** : Vue Heatmap/Calibration pour superviser toute la descendance

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
