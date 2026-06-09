# Campagnes et Evaluations

Le coeur metier de NanoXplore RH s'articule autour d'un cycle : une **Campagne** regroupe des **Evaluations** generees a partir d'un **Formulaire**, chaque evaluation passant par des etapes d'entretien, de signatures et de validation RH. Cette page documente ce cycle complet.

Pour un guide pratique par role, voir [[Guide-Utilisateur]].

---

## 1. La Campagne

Une **Campagne** est l'unite organisationnelle qui regroupe un ensemble d'evaluations sur une periode definie. Elle est creee et configuree par un role `hr` ou `admin`.

Une campagne possede :
- Un nom et une periode (dates de debut et de fin).
- Un formulaire associe (le questionnaire a remplir).
- Un ensemble de participants (cibles par role ou departement).
- Un cycle de vie : brouillon, active, cloturee.
- Des analyses agregees accessibles via `/campaigns/:id/analytics` (roles `admin`, `hr`, `manager`).

La creation se fait via `/campaigns/new`, la modification via `/campaigns/:id/edit` (roles `admin` et `hr` uniquement).

---

## 2. Le Formulaire (questionnaire)

Un **Formulaire** est un questionnaire structure construit par la RH. Il contient des categories et des questions de differents types (texte libre, notation, choix multiple, etc.). Les formulaires sont rattaches aux campagnes. La RH peut importer et exporter des formulaires via `/admin/forms/import`.

Les categories de formulaires sont gerees separement via l'API `/form-categories`.

La creation d'un formulaire se fait via `/forms/new` (roles `admin` et `hr`). Les autres roles peuvent consulter les formulaires existants en lecture seule.

---

## 3. L'Evaluation

Une **Evaluation** est l'instance d'un formulaire remplie par un employe specifique dans le cadre d'une campagne. Chaque evaluation est liee a un `evaluateeId` (l'evalue) et un `evaluatorId` (l'evaluateur, en general le manager direct).

### Comportement d'auto-sauvegarde

Tant qu'une evaluation est aux statuts `assigned` ou `in_progress`, les reponses de l'employe sont sauvegardees librement. Chaque sauvegarde met a jour le champ `lastSavedAt`. Si le statut est encore `assigned` au moment de la sauvegarde, il passe automatiquement a `in_progress`.

Une fois qu'une evaluation atteint l'un des statuts suivants — `submitted`, `reviewed`, `disputed`, `signed_evaluatee`, `signed_manager`, `signed_hr`, `validated`, `archived` — le champ `answers` est verrouille. Un hook pre-sauvegarde applique ce verrou cote serveur.

---

## 4. La machine a etats de l'Evaluation

Tous les etats et transitions valides sont definis dans `mongo/server/models/Evaluation.js` (`VALID_TRANSITIONS` / `ROLE_TRANSITIONS`).

```
assigned
  |
  v (employe ou admin)
in_progress
  |
  v (employe, manager pour un formulaire de competences, ou admin)
submitted
  |
  v (manager ou admin)
reviewed -----> disputed (l'evalue conteste ; la RH arbitre)
  |               |
  |   +-----------+  (RH resout : retour a reviewed, ou passage direct a signed_evaluatee)
  |   |
  v   v (employe ou admin)
signed_evaluatee
  |
  v (manager ou admin)
signed_manager
  |
  v (RH ou admin)
signed_hr
  |
  v (RH ou admin)
validated  [terminal]
```

Etats terminaux sans transition ulterieure :
- `expired` — declenche par le planificateur quand `phaseDeadline` ou `expiresAt` est depasse.
- `rejected` — la RH refuse l'evaluation.
- `archived` — evaluation annulee suite a un offboarding.

### Transitions autorisees par role (hors admin)

| Role | De | Vers |
|---|---|---|
| employee | assigned | in_progress |
| employee | in_progress | submitted |
| employee | reviewed | signed_evaluatee, disputed |
| manager | in_progress | submitted |
| manager | submitted | reviewed |
| manager | signed_evaluatee | signed_manager |
| hr | reviewed | signed_hr (contournement : passe les signatures employe/manager) |
| hr | disputed | reviewed, signed_evaluatee (arbitrage) |
| hr | signed_evaluatee | signed_hr |
| hr | signed_manager | signed_hr |
| hr | signed_hr | validated |

Le role `admin` n'est pas liste dans `ROLE_TRANSITIONS` et peut effectuer toute transition valide dans `VALID_TRANSITIONS`.

---

## 5. Le processus d'entretien

L'**Entretien** (`/interview`) est la session de revue en face-a-face entre un manager et un employe. Il est parametre par les query strings `campaignId` et `evaluateeId` et offre au manager une vue consolidee pendant la reunion :

- Les reponses de l'employe au formulaire d'evaluation.
- Le contexte N-1 (edition precedente, voir section 7).
- Les objectifs de l'employe.
- Une zone de synthese.

### Signatures et desaccord

Apres l'entretien, le processus de signature se deroule en trois temps :

1. **Signature de l'evalue** : l'employe signe electroniquement (`signed_evaluatee`). S'il conteste le contenu, il peut passer en statut `disputed` plutot que de signer.
2. **Signature du manager** : une fois l'evaluation signee par l'evalue, le manager signe a son tour (`signed_manager`).
3. **Signature et validation RH** : la RH signe (`signed_hr`) puis valide (`validated`).

En cas de desaccord (`disputed`), la RH arbitre : elle peut soit faire revenir l'evaluation au statut `reviewed` pour modification, soit la faire passer directement a `signed_evaluatee` si elle tranche en faveur du manager.

La RH dispose egalement d'un contournement : elle peut signer directement depuis `reviewed` vers `signed_hr`, passant outre les signatures de l'evalue et du manager si la situation l'exige.

### Traçabilite des signatures

Le modele stocke les signatures dans deux structures paralleles :
- **Champs legacy** (`signedByEvaluateeAt`, `signedByManagerAt`, `signedByHrAt`) : conserves pour la compatibilite ascendante uniquement.
- **Tableau `signatures`** (sous-documents avec `userId`, `role`, `signedAt`, `ipAddress`) : source de verite pour toute logique metier.

---

## 6. Ciblage par role et departement

Lors de la creation ou de l'edition d'une campagne, la RH definit quels employes et managers sont concernes. Le ciblage peut s'effectuer par departement et/ou par role, permettant de restreindre une campagne a un perimetre organisationnel precis.

---

## 7. Contexte N-1 (edition precedente)

Le contexte **N-1** permet a l'evalue et a son manager de consulter les reponses de la campagne precedente pendant le remplissage de la campagne en cours. Cette fonctionnalite offre une continuite et facilite la comparaison d'une annee sur l'autre.

Le contexte N-1 est disponible dans la vue d'evaluation et dans la vue Entretien.
