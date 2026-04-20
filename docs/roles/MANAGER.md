# Rôle — Manager

> **Design complet :** voir [`designs/roles/designmanager.txt`](../../designs/roles/designmanager.txt)

## Qui est-il ?

Le manager est responsable d'une équipe directe. Il conduit les entretiens annuels de ses collaborateurs, valide leurs évaluations et finalise leurs objectifs. Sa visibilité est **strictement limitée à son équipe directe** — il ne voit jamais les données des équipes d'autres managers.

**Redirection après connexion :** `/manager`

---

## Son tableau de bord (`/manager`)

Le manager arrive sur un **Dashboard visuel** listant son équipe directe avec des cartes visuelles. Pour chaque membre, il voit :

- Photo, nom, poste
- Statut de l'évaluation en cours (badge couleur : ⚪ pas commencé / 🔵 en cours / 🟢 soumis / 🟣 validé)
- **Sparkline d'objectifs** : mini-graphique montrant la progression des goals annuels
- Alertes si une phase est en retard
- Accès direct à la fiche d'évaluation complète de chaque collaborateur

**En campagne active**, un **Compteur d'Urgence** apparaît en haut du Dashboard :
*"X entretiens sur Y restent à valider. Deadline : JJ/MM."*

---

## La règle de cloisonnement des équipes

> **Un manager ne voit QUE les membres qui lui sont directement rattachés via `manager_id` en base.**

Si un autre manager gère une autre équipe dans la même organisation, leurs données sont invisibles l'un pour l'autre. Il n'existe aucun moyen dans l'interface pour un manager de "chercher" un employé hors de son périmètre.

Cette règle s'applique aussi aux rapports, aux exports et aux recherches — toujours filtrés sur `manager_id = current_user.id`.

---

## Conduire un entretien — étape par étape

### Avant l'entretien

1. Vérifier que l'employé a soumis ses formulaires (phases 2 à 5)
2. Lire l'auto-évaluation et les aspirations en amont
3. Préparer ses propres observations sur le bilan N-1 et les objectifs

### Pendant l'entretien — **Split-View** (`/manager/review/:evalId`)

L'écran clé du Manager est un **écran divisé** :

1. **Panneau Gauche (Lecture Seule — 60%)** : Le formulaire complet de l'employé.
   - Auto-évaluation (texte + notation Soft Skills)
   - Bilan N-1 avec les jauges d'objectifs figées et le commentaire de l'employé
   - Aspirations (lecture seule — le manager ne peut pas modifier cette section)

2. **Panneau Droit (Rédaction Manager — 40%)** : Le "Carnet du Manager"
   - Par objectif N-1 : Appréciation Manager (Atteint / Partiellement / Non Atteint + Commentaire)
   - Note Globale (si le template l'exige)
   - Commentaire de Synthèse Libre
   - Validation/Modification des Objectifs N+1 proposés par l'employé

### Après l'entretien — Signature & Contestation

5. Cliquer **"Valider & Signer"** → statut passe à `signed_manager`
6. L'employé reçoit une notification et doit **Contresigner** (accepter) ou **Contester** (refuser avec commentaire)
7. Si contresigné : document scellé (PDF archivé), objectifs N+1 descendent dans `/employee/goals`
8. Si contesté : le document est scellé avec mention "Contesté par l'employé", le RH est alerté dans `/hr/requests`

---

## Double casquette : Manager est aussi évalué

Le Manager est un employé de son propre N+1. Sa navigation propose deux espaces :
- **"Mon Équipe"** → Dashboard Manager (ses N-1)
- **"Mon Évaluation"** → Son propre formulaire d'employé (évalué par son N+1)

---

## Choisir un template (pas créer)

Le manager ne crée **jamais** de formulaires. C'est le rôle de HR. En revanche, si une campagne propose plusieurs templates, le manager peut sélectionner celui adapté à son équipe parmi les options disponibles. Il ne peut ni modifier le contenu du template, ni en créer un nouveau.

> Cette règle évite la fragmentation des évaluations et garantit l'uniformité des données agrégées par HR.

---

## Attribuer et suivre les évaluations

- Le manager peut **assigner une évaluation** à un membre de son équipe à partir du panel
- Il peut voir le **pourcentage de complétion** de chaque phase
- Il peut **relancer** un employé en retard (envoi d'un rappel email depuis l'interface)
- Il peut **rouvrir** un formulaire soumis si l'employé a besoin de le corriger (avant validation finale)

---

## Ce que le manager ne peut PAS faire

- Voir ou accéder aux évaluations des équipes d'autres managers
- Créer, modifier ou supprimer des templates de formulaires
- Lancer une campagne (rôle HR uniquement)
- Accéder aux paramètres système (LDAP, SMTP, utilisateurs)
- Voir les données agrégées de toute l'organisation
- Modifier les aspirations d'un employé
- Valider l'évaluation d'un employé qui n'est pas dans son équipe directe
