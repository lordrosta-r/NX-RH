# Guide Utilisateur

Ce guide decrit ce que fait concrètement chaque type d'utilisateur au quotidien dans NanoXplore RH : ou aller, quoi faire, quelles pages sont accessibles.

Pour comprendre les permissions detaillees de chaque role, voir [[Roles-et-RBAC]].
Pour comprendre le cycle campagne/evaluation/entretien/signatures, voir [[Campagnes-et-Evaluations]].

---

## Employe

L'employe opere exclusivement dans la perspective **"Mon espace"** (perspective `me`). Il n'y a pas de bascule de perspective pour ce role.

### Ce qu'il fait au quotidien

**Ses evaluations** (`/evaluations`)
- Consulter la liste de ses evaluations en cours et passees.
- Ouvrir une evaluation assignee et remplir le questionnaire. Les reponses sont sauvegardees automatiquement ; le statut passe de `assigned` a `in_progress` des la premiere sauvegarde.
- Soumettre l'evaluation une fois remplie (passage au statut `submitted`).
- Consulter son historique d'evaluations (`/evaluations/history`).

**Apres la revue du manager** (statut `reviewed`)
- Signer electroniquement l'evaluation pour confirmer la prise de connaissance (`signed_evaluatee`).
- Ou, en cas de desaccord avec le contenu, signaler un differend (`disputed`) : la RH arbitrera.

**Son plan de developpement** (`/pdi`, `/pdi/:id`)
- Consulter et suivre son Plan de Developpement Individuel (PDI).

**Informations et documents**
- Consulter les evenements RH (`/events`, `/events/:id`).
- Acceder aux documents et ressources publies par la RH (`/documents`, `/documents/:id`).
- Soumettre ou suivre une demande de mobilite interne (`/mobility`).
- Consulter l'organigramme de l'organisation (`/org`).

**Espace personnel**
- Acceder a son profil et le modifier (avatar, telephone) (`/profile`).
- Gerer ses preferences (langue, theme) (`/profile/preferences`).
- Consulter ses notifications (`/notifications`).
- Acceder a l'aide (`/help`).

L'employe n'a pas acces aux listes d'utilisateurs, aux analyses globales, ni a aucune zone d'administration.

---

## Manager

Le manager dispose de deux perspectives : **"Mon espace"** (perspective `me`, identique a celle de l'employe) et **"Mon travail"** (perspective `work`, dediee a la supervision d'equipe). Il bascule entre les deux via le selecteur de perspective.

### En perspective "Mon espace"

Memes fonctionnalites que l'employe : ses propres evaluations, son PDI, les evenements, documents, mobilite, profil.

### En perspective "Mon travail"

**Gestion de l'equipe** (`/users`, `/users/:id`)
- Consulter la liste des membres de son equipe et les fiches de chaque membre.
- Le manager peut lire les profils utilisateurs mais ne peut pas en creer, modifier ni supprimer.

**A traiter** (`/manager/todo`)
- Vue centrale de toutes les actions en attente pour l'ensemble de ses rapports directs, et, via la hierarchie, pour les managers qui lui rapportent.
- C'est le point d'entree unique pour la supervision multi-equipes : il n'existe pas de portail dedie.

**Suivi des evaluations** (`/evaluations`, `/evaluations/:id`)
- Consulter les evaluations de son equipe.
- Reviser une evaluation soumise par un collaborateur (passage au statut `reviewed`).
- Signer une evaluation apres que l'evalue ait signe (`signed_manager`).

**Entretiens** (`/interview`)
- Acceder a la vue Entretien parametre par campagne et evalue (`campaignId`, `evaluateeId` en query string).
- Disposer d'une vue consolidee : reponses, contexte N-1, objectifs, zone de synthese.

**Campagnes et formulaires** (`/campaigns`, `/forms`)
- Consulter les campagnes et formulaires en lecture seule.
- Acceder aux analyses d'une campagne specifique (`/campaigns/:id/analytics`).

**Analyses** (`/analytics`, `/analytics/campaigns/:id`)
- Consulter les analyses globales et par campagne pour son perimetre d'equipe.

**PDI de l'equipe** (`/pdi`, `/pdi/:id`)
- Consulter les plans de developpement des membres de son equipe.

---

## RH (role hr)

La RH dispose des perspectives `me` et `work`. En pratique, elle travaille principalement en perspective `work`.

### Creation et administration des campagnes

- Creer une nouvelle campagne (`/campaigns/new`) : nommer la campagne, definir la periode, choisir le formulaire, cibler les participants par departement et/ou role.
- Modifier une campagne existante (`/campaigns/:id/edit`).
- Creer des formulaires (`/forms/new`) avec des categories et questions, ou en importer via `/admin/forms/import`.

### Gestion des utilisateurs

- Creer des comptes individuellement (`/users/new`) ou en masse (`/admin/users/import`).
- Modifier les fiches utilisateurs, changer les roles et les rattachements hierarchiques (`/users/:id/edit`).
- Gerer les groupes d'utilisateurs (`/users/groups`).
- Acceder aux departements (`/admin/departments`).

### Suivi des evaluations

- Consulter toutes les evaluations de l'organisation.
- Arbitrer les differends (`disputed`) : ramener l'evaluation a `reviewed` ou la faire passer a `signed_evaluatee`.
- Signer les evaluations (`signed_hr`) et les valider (`validated`).
- Utiliser le contournement de signature si necessaire : signer directement depuis `reviewed` sans attendre les signatures employe et manager.

### Administration RH

- Gerer les signalements internes (`/hr/flags`, `/hr/flags/:id`).
- Consulter et parametrer les modeles de mails (`/admin/mail-templates`).
- Acceder aux statistiques (`/admin/stats`) et au journal d'audit (`/admin/audit`).
- Acceder au hub d'administration (`/admin`) et aux parametres RH (`/admin/settings` ou `/hr/settings`).

### Analyses

- Consulter les analyses globales (`/analytics`) et par campagne (`/analytics/campaigns/:id`, `/campaigns/:id/analytics`).

---

## Administrateur (role admin)

L'administrateur dispose de toutes les capacites de la RH, plus le controle total de l'infrastructure.

### Ce qu'il fait en plus de la RH

**Infrastructure et configuration** (acces exclusif admin)
- Configurer la connexion LDAP (`/admin/ldap`).
- Configurer le serveur de messagerie (`/admin/mail-config`) et tester l'envoi (`/admin/test-mail`).
- Gerer les certificats SSL (`/admin/ssl`).
- Modifier la configuration generale de l'application (`/admin/config`).
- Consulter l'etat du systeme (`/admin/status`).
- Lancer l'assistant de configuration initiale (`/admin/setup`).

**Impersonation**
- L'administrateur peut utiliser la fonction "voir comme" pour observer l'interface telle qu'elle apparait a un autre utilisateur.
- Cette session est **strictement en lecture seule** : aucune action d'ecriture n'est possible sous une identite empruntee.

### Ce qu'il ne fait pas

L'administrateur n'a pas acces aux pages `/documents` et `/documents/:id`. Ces pages sont reservees aux employes, managers et RH. L'admin gere le contenu documentaire via la zone d'administration, pas via le visualisateur employe.

---

## Acces communs a tous les roles authentifies

Les pages suivantes sont accessibles a tout utilisateur connecte, quel que soit son role :

| Page | URL |
|---|---|
| Tableau de bord | `/` |
| Evaluations (liste et detail) | `/evaluations`, `/evaluations/:id`, `/evaluations/history` |
| Campagnes (liste et detail) | `/campaigns`, `/campaigns/:id` |
| Formulaires (liste et detail) | `/forms`, `/forms/:id` |
| Evenements | `/events`, `/events/:id` |
| Mobilite interne | `/mobility` |
| PDI | `/pdi`, `/pdi/:id` |
| Organigramme | `/org` |
| Profil et preferences | `/profile`, `/profile/preferences` |
| Notifications | `/notifications` |
| Aide | `/help` |
