# Roles et RBAC

NanoXplore RH applique le contrôle d'accès a deux niveaux :

- **Frontend** : le composant `AuthGuard` dans `frontend-v2/src/router/index.tsx`. Les routes sans propriete `roles` sont accessibles a tout utilisateur authentifie ; les routes avec `roles` bloquent l'acces et redirigent vers `/unauthorized`.
- **Backend** : le middleware `authGuard` dans `mongo/server/`. Il verifie le cookie JWT et le role avant chaque handler de route.

---

## Les quatre roles

| Role | Description |
|---|---|
| **admin** | Controle total de la plateforme : configuration serveur, LDAP, messagerie, SSL, journal d'audit, assistant de configuration, etat du systeme, et toutes les capacites RH et manager. |
| **hr** | Operations RH : gestion des utilisateurs et des groupes, creation et edition des campagnes et formulaires, gestion des evaluations, signalements RH, modeles de mails, departements et parametres. Ne peut pas acceder aux pages d'administration infrastructure (LDAP, configuration serveur de messagerie, SSL, etat du systeme, assistant de configuration). |
| **manager** | Supervision d'equipe : consultation et gestion limitee des utilisateurs de son equipe, suivi des campagnes et evaluations, acces aux analyses d'equipe, traitement des actions en attente (`/manager/todo`). Ne peut pas creer des campagnes, formulaires ou evaluations, et n'a pas acces a la zone d'administration. |
| **employee** | Collaborateur individuel : remplit ses propres evaluations, suit son plan de developpement individuel (PDI), consulte les documents et evenements RH, soumet des demandes de mobilite. Aucun acces en ecriture aux ressources partagees. |

> Le role legacy `director` n'existe plus. Tout compte stocke avec le role `director` est traite comme un `manager` par l'application.
>
> Un manager peut superviser d'autres managers via la hierarchie organisationnelle standard. Il n'existe pas de portail ni de route dedies a la supervision multi-equipes : `/manager/todo` concentre toutes les actions en attente quelle que soit la profondeur hierarchique.

---

## La notion de perspective

Les roles ayant des responsabilites manageriales ou administratives disposent de deux perspectives de navigation :

| Perspective | Qui en dispose | Ce qu'elle affiche |
|---|---|---|
| **me** ("Mon espace") | Tous les roles | Evaluations personnelles, PDI, demandes de mobilite, evenements, documents RH |
| **work** | manager, hr, admin | Gestion d'equipe ou d'organisation, campagnes, formulaires, analyses, administration |

L'`employee` opere toujours dans la perspective `me` : il n'y a pas de bascule pour ce role.

La perspective active est stockee dans `PerspectiveContext` (`"me" | "work"`) et controle les elements de navigation affiches. Changer de perspective ne modifie pas les permissions de route ; `AuthGuard` les applique independamment.

---

## Matrice de permissions

Derivee strictement des declarations `AuthGuard roles` dans `router/index.tsx` et du fichier `ROLES_RBAC.md`.

Legende :
- **oui** — le role peut acceder a toutes les sous-routes de cette zone (lecture + ecriture selon disponibilite)
- **lecture** — le role peut consulter la zone mais ne peut pas creer, modifier ni supprimer
- **—** — le role n'a pas acces (bloque par `AuthGuard`)

| Fonctionnalite / Zone de routes | admin | hr | manager | employee |
|---|---|---|---|---|
| **Tableau de bord** `/` | oui | oui | oui | oui |
| **Utilisateurs** `/users`, `/users/:id` | oui | oui | lecture | — |
| **Creer/modifier utilisateur** `/users/new`, `/users/:id/edit` | oui | oui | — | — |
| **Groupes d'utilisateurs** `/users/groups` | oui | oui | — | — |
| **Campagnes** `/campaigns`, `/campaigns/:id` | oui | oui | lecture | lecture |
| **Creer/modifier campagne** `/campaigns/new`, `/campaigns/:id/edit` | oui | oui | — | — |
| **Analyses campagne** `/campaigns/:id/analytics` | oui | oui | oui | — |
| **Formulaires** `/forms`, `/forms/:id` | oui | oui | lecture | lecture |
| **Creer formulaire** `/forms/new` | oui | oui | — | — |
| **Evaluations** `/evaluations`, `/evaluations/:id`, `/evaluations/history` | oui | oui | oui | oui |
| **Creer evaluation** `/evaluations/new` | oui | oui | — | — |
| **A traiter (manager)** `/manager/todo` | oui | oui | oui | — |
| **Vue Entretien** `/interview` | oui | oui | oui | — |
| **PDI** `/pdi`, `/pdi/:id` | oui | oui | oui | oui |
| **Signalements RH** `/hr/flags`, `/hr/flags/:id` | oui | oui | — | — |
| **Analyses globales** `/analytics`, `/analytics/campaigns/:id` | oui | oui | oui | — |
| **Evenements** `/events`, `/events/:id` | oui | oui | oui | oui |
| **Documents RH** `/documents`, `/documents/:id` | — | oui | oui | oui |
| **Mobilite interne** `/mobility` | oui | oui | oui | oui |
| **Organigramme** `/org` | oui | oui | oui | oui |
| **Aide** `/help` | oui | oui | oui | oui |
| **Profil et preferences** `/profile`, `/profile/preferences` | oui | oui | oui | oui |
| **Notifications** `/notifications` | oui | oui | oui | oui |
| **Hub administration** `/admin` | oui | oui | — | — |
| **Utilisateurs admin** `/admin/users`, `/admin/users/import` | oui | oui | — | — |
| **Import formulaires** `/admin/forms/import` | oui | oui | — | — |
| **Parametres RH** `/admin/settings`, `/hr/settings` | oui | oui | — | — |
| **Journal d'audit** `/admin/audit` | oui | oui | — | — |
| **Modeles de mails** `/admin/mail-templates` | oui | oui | — | — |
| **Departements** `/admin/departments` | oui | oui | — | — |
| **Statistiques** `/admin/stats` | oui | oui | — | — |
| **Configuration LDAP** `/admin/ldap` | oui | — | — | — |
| **Configuration SSL** `/admin/ssl` | oui | — | — | — |
| **Configuration serveur de mail** `/admin/mail-config` | oui | — | — | — |
| **Configuration application** `/admin/config` | oui | — | — | — |
| **Etat du systeme** `/admin/status` | oui | — | — | — |
| **Assistant de configuration** `/admin/setup` | oui | — | — | — |
| **Test d'envoi de mail** `/admin/test-mail` | oui | — | — | — |

> **Note sur la zone Documents** : le role `admin` est explicitement exclu de `/documents` et `/documents/:id`. Les documents RH sont une ressource destinee au personnel ; les admins gerent le contenu via la zone d'administration, pas via le visualisateur employe.

---

## Hierarchie manager

Un manager peut superviser d'autres managers via la hierarchie organisationnelle standard. Il n'existe pas de portail, route ou role dedies a la supervision multi-niveaux. Toutes les actions en attente decoulant de la supervision de managers subordonnes passent par `/manager/todo`, exactement comme la gestion d'une equipe simple.

---

## Impersonation en lecture seule

Lorsqu'un administrateur utilise la fonction "voir comme" (impersonation) pour observer l'application en tant qu'un autre utilisateur, la session est strictement en lecture seule. Aucune operation d'ecriture n'est autorisee sous une identite empruntee. Cet invariant est applique au niveau du backend (`middleware/impersonationGuard.js`) et ne doit pas etre affaibli lors de l'ajout de nouveaux endpoints en ecriture.
