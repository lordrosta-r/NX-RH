# Rôle — Employee (Employé)

## Qui est-il ?

L'employé est le participant principal du processus d'évaluation. Il est le sujet de l'entretien annuel et l'auteur de la grande majorité des formulaires. Il n'a aucune visibilité sur les données des autres employés.

**Redirection après connexion :** `/dashboard`

---

## Son tableau de bord (`/dashboard`)

Le dashboard est organisé autour de la campagne en cours (s'il y en a une). Il y voit :

- **La campagne active** avec l'état d'avancement de chaque phase
- **Le statut de chaque formulaire** : non commencé / en cours / soumis / validé
- **Les phases verrouillées** — une phase n'est accessible que si la précédente est complète
- **L'historique** des campagnes passées et ses évaluations archivées
- **Ses paramètres personnels** : langue d'interface, thème clair/sombre, changement de mot de passe

---

## Les 4 actions qu'il réalise dans le cycle

### 1. Auto-évaluation (Phase 2)

L'employé remplit un formulaire libre sur l'année écoulée :
- Ses réalisations majeures
- Ses points forts perçus
- Ses axes d'amélioration
- Son ressenti global

> Ce formulaire est soumis directement à son manager. Il n'est **pas modifiable** après soumission sauf réouverture explicite.

### 2. Bilan N-1 (Phase 3)

L'employé passe en revue les objectifs définis lors du dernier entretien :
- Pour chaque objectif : **atteint / partiellement atteint / non atteint**
- Il peut ajouter un commentaire par objectif pour contextualiser
- Il soumet sa version, puis le manager ajoute ses propres appréciations

### 3. Objectifs futurs (Phase 4)

L'employé propose les objectifs qu'il souhaite se fixer pour la prochaine période :
- Titre de l'objectif
- Description / indicateur de succès
- Priorité ou pondération (si le template l'inclut)

Le manager peut modifier ou valider ces propositions lors de l'entretien.

### 4. Aspirations (Phase 5)

L'employé exprime librement ses souhaits de développement :
- Formations souhaitées
- Mobilité interne (changement d'équipe, de poste, de site)
- Évolution de carrière à court et moyen terme
- Besoin d'accompagnement ou de mentorat

> Cette section est **en lecture seule pour le manager** — il ne peut pas la modifier ni la noter. Elle lui sert de base de discussion lors de l'entretien.

---

## Statuts de ses évaluations

| Statut | Signification |
|---|---|
| `pending` | La campagne est active mais l'employé n'a pas encore commencé |
| `in_progress` | Au moins un formulaire a été ouvert ou partiellement rempli |
| `submitted` | Tous les formulaires de l'employé ont été soumis |
| `reviewed` | Le manager a consulté et commenté les formulaires |
| `validated` | L'entretien a eu lieu et a été validé par le manager |

---

## Ce que l'employé ne peut PAS faire

- Voir les évaluations ou données des autres employés
- Créer ou modifier des templates de formulaires
- Lancer ou administrer une campagne
- Accéder au panel manager (`/manager`)
- Modifier une soumission après qu'elle ait été validée par le manager
- Voir les commentaires internes que le manager a rédigés s'ils sont marqués privés
- Gérer des utilisateurs ou des droits d'accès
