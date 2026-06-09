# Glossaire

Définitions des termes métier utilisés dans NanoXplore RH et dans ce wiki.

---

**Campagne**
Unité organisationnelle qui regroupe un ensemble d'évaluations sur une période définie. La RH ou un administrateur crée la campagne, y associe un ou plusieurs formulaires et définit le périmètre des participants. Cycle de vie : `draft → active → closed → archived`. Une campagne dispose d'un tableau de bord analytique agrégé.

**Formulaire**
Questionnaire structuré construit par la RH via le constructeur de formulaires par glisser-déposer. Il contient des catégories et des questions (texte libre, évaluation par notation, choix multiple, etc.). Un formulaire est rattaché à une campagne et peut être réutilisé ou importé/exporté.

**Evaluation**
Instance d'un formulaire remplie par un collaborateur précis dans le cadre d'une campagne. Une évaluation suit une machine d'états stricte : `assigned → in_progress → submitted → reviewed → signed_evaluatee → signed_manager → signed_hr → validated`. Des états terminaux supplémentaires existent : `expired`, `rejected`, `archived`. Une fois soumise, la zone de réponses est verrouillée côté serveur.

**Entretien**
Session de revue en face-à-face entre un manager et un collaborateur, paramétrée par une campagne et un évalué. Le manager dispose d'une vue consolidée (réponses à l'évaluation, contexte N-1, objectifs). L'entretien donne lieu à une synthèse, une double signature électronique et, le cas échéant, à un marquage de désaccord ou de litige.

**Edition precedente (N-1)**
Rappel contextuel affiché en ligne lors du remplissage d'une évaluation : pour chaque question marquée `carryPrevious` par la RH, la réponse donnée lors de la campagne précédente est visible à côté du champ en cours. Cela permet la continuité et la comparaison d'une année sur l'autre.

**Synthese**
Document de conclusion rédigé à l'issue de l'entretien managérial. Il résume les échanges, les points clés retenus et les objectifs fixés pour la période suivante. Il fait partie du cycle de signature.

**Signature**
Validation électronique d'une évaluation par l'une des parties concernées (évalué, manager, RH). Le modèle stocke les signatures dans un tableau de sous-documents (`userId`, `role`, `signedAt`, `ipAddress`). La double signature évalué-manager est requise avant la validation finale par la RH. Un flux de désaccord (litige) permet à l'évalué de contester la revue managériale ; la RH arbitre.

**PDI (Plan de Developpement Individuel)**
Document de suivi des objectifs de développement personnel et professionnel d'un collaborateur. Il enregistre des actions à mener sur le moyen terme. Accessible à tous les rôles authentifiés.

**Mobilite**
Fonctionnalité permettant à un collaborateur d'exprimer une demande de mobilité interne (changement de poste, de département ou de site). Accessible depuis `/mobility`.

**Perspective (me / work)**
Les utilisateurs disposant d'un rôle multi-casquettes (manager, RH, administrateur) basculent entre deux perspectives via un switch dans la barre de navigation. "Mon espace" (`me`) donne accès aux fonctionnalités liées à leur propre situation (évaluations personnelles, PDI). "Mon Equipe" / espace professionnel (`work`) donne accès aux fonctionnalités liées à leurs responsabilités (suivi d'équipe, todo manager, administration). Les employés sont toujours en perspective `me`.

**RBAC (Role-Based Access Control)**
Contrôle d'accès basé sur les rôles. NanoXplore RH définit quatre rôles actifs : `employee`, `manager`, `hr`, `admin`. Chaque route frontend et chaque endpoint backend est protégé par une liste de rôles autorisés. Un cinquième rôle `director` existait dans une version antérieure ; les comptes portant ce rôle sont traités comme `manager`. Voir [[Roles-et-RBAC]].

**Offboarding**
Processus structuré de sortie d'un collaborateur quittant l'organisation. Il déclenche l'archivage des évaluations en cours et le nettoyage des données associées. Géré via l'API `/api/v1/offboarding`.

**Organigramme**
Visualisation interactive plein écran de la hiérarchie de l'organisation, accessible depuis `/org`. Elle est servie par un layout dédié (`OrgLayout`) sans la barre de navigation standard. L'ancienne URL `/admin/orgchart` redirige automatiquement vers `/org`.
