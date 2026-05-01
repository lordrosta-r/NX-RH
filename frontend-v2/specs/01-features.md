# NX-RH — Inventaire des fonctionnalités (Frontend v2)

> **Source** : Analyse exhaustive du backend `mongo/server/routes/` et `mongo/server/models/`
> **Date** : 2025 · **Langue** : Français (outil RH NanoXplore)

---

## 1. Définition des rôles

### 1.1 `admin` — Administrateur système

| Dimension | Détail |
|-----------|--------|
| **Voit** | Tous les utilisateurs (actifs/inactifs), toutes les campagnes (tous statuts), toutes les évaluations (toutes équipes), toutes les ressources (draft + published), tous les événements, toutes les demandes d'offboarding, la piste d'audit complète, la configuration applicative, la configuration LDAP |
| **Peut faire** | Toutes les actions : créer/modifier/supprimer utilisateurs, campagnes, formulaires, évaluations, ressources, événements ; déclencher offboarding ; exécuter toutes les transitions d'évaluation ; gérer config système ; tester/configurer/synchroniser LDAP ; exporter RGPD ; anonymiser utilisateur ; envoyer email de test |
| **Caché** | Rien |

### 1.2 `hr` — Responsable RH

| Dimension | Détail |
|-----------|--------|
| **Voit** | Tous les utilisateurs, toutes les campagnes, toutes les évaluations, toutes les ressources, tous les événements, toutes les demandes d'offboarding, la piste d'audit complète |
| **Peut faire** | Créer/modifier campagnes et formulaires, créer/réaffecter/expirer évaluations, gérer ressources et événements, créer/gérer demandes d'offboarding, exporter CSV et PDF analytiques, exporter RGPD, signer en masse (sign_hr), consulter la piste d'audit |
| **Caché** | Configuration applicative admin, LDAP (admin only), anonymisation RGPD (admin only), suppression de demandes d'offboarding (admin only) |

### 1.3 `director` — Directeur / N+2

| Dimension | Détail |
|-----------|--------|
| **Voit** | Ses propres évaluations, évaluations de ses subordonnés directs + indirects (si `extendedVisibility` configurée), campagnes actives uniquement (+ toutes les campagnes pour consultation de statut), ressources publiées ciblant son rôle, événements ciblant `director` ou sans restriction |
| **Peut faire** | Revoir les évaluations soumises par ses équipes (`submitted → reviewed`), co-signer (`signed_evaluatee → signed_manager`), définir score et commentaire reviewer, définir les objectifs N+1, noter les objectifs |
| **Caché** | Campagnes `draft`/`closed`/`archived`, ressources `draft`, liste complète des utilisateurs (hors ses subordonnés), données des autres équipes, configuration, LDAP, offboarding, audit |

### 1.4 `manager` — Manager / N+1

| Dimension | Détail |
|-----------|--------|
| **Voit** | Ses subordonnés directs (`managerId === soi`), ses propres évaluations + évaluations de ses subordonnés directs (+ étendus si `extendedVisibility`), campagnes actives, ressources publiées pour son rôle |
| **Peut faire** | Idem `director` mais limité à son périmètre direct. Réaffecter n'est pas disponible (admin/hr seulement) |
| **Caché** | Idem `director`. Liste utilisateurs limitée à ses subordonnés directs |

### 1.5 `employee` — Employé

| Dimension | Détail |
|-----------|--------|
| **Voit** | Ses propres évaluations (en tant qu'évaluateur ou évalué), campagnes `active` uniquement, ressources `published` dont `visibleTo` inclut `employee`, événements dont `targetRoles` inclut `employee` ou est vide, son propre profil, son manager direct (par ID uniquement) |
| **Peut faire** | Remplir ses évaluations (sauvegarder brouillon, soumettre), signer (`reviewed → signed_evaluatee`), ajouter un commentaire d'évalué, lever un flag de désaccord, cocher ses étapes d'onboarding, modifier ses préférences (locale, thème, certaines notifications), exporter ses données RGPD |
| **Caché** | Données des autres utilisateurs (sauf son manager direct), évaluations des autres, toute campagne non active, ressources `draft`, configuration, LDAP, offboarding, audit |

---

## 2. Matrice des fonctionnalités par module et par rôle

| Module / Fonctionnalité | admin | hr | director | manager | employee |
|------------------------|:-----:|:--:|:--------:|:-------:|:--------:|
| **Authentification & Profil** | | | | | |
| Connexion / Déconnexion | ✅ | ✅ | ✅ | ✅ | ✅ |
| Consulter son profil (`/me`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Modifier préférences (locale, thème, notifs) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Gestion des utilisateurs** | | | | | |
| Lister tous les utilisateurs | ✅ | ✅ | ✅ | 🟡 | ❌ |
| Voir un profil utilisateur | ✅ | ✅ | ✅ | 🟡 | 🟡 |
| Créer un utilisateur | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modifier un utilisateur | ✅ | ✅ | ❌ | ❌ | 🟡 |
| Onboarding (étapes, complétion) | ✅ | ✅ | ❌ | ❌ | 🟡 |
| Déclencher offboard (preview + action) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export RGPD (ses données) | ✅ | ✅ | ❌ | ❌ | 🟡 |
| Anonymisation RGPD | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Campagnes** | | | | | |
| Lister les campagnes | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Voir le détail d'une campagne (+ stats) | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Créer une campagne | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modifier / Changer le statut | ✅ | ✅ | ❌ | ❌ | ❌ |
| Supprimer une campagne | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cloner une campagne | ✅ | ✅ | ❌ | ❌ | ❌ |
| Analytics campagne | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Formulaires / Templates** | | | | | |
| Lister les formulaires | ✅ | ✅ | ✅ | ✅ | ✅ |
| Voir un formulaire | ✅ | ✅ | ✅ | ✅ | ✅ |
| Créer un formulaire | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modifier un formulaire | ✅ | ✅ | ❌ | ❌ | ❌ |
| Supprimer un formulaire | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Évaluations** | | | | | |
| Lister les évaluations | ✅ | ✅ | 🟡 | 🟡 | 🟡 |
| Voir le détail d'une évaluation | ✅ | ✅ | 🟡 | 🟡 | 🟡 |
| Créer une évaluation | ✅ | ✅ | ❌ | ❌ | ❌ |
| Créer en masse (bulk, max 500) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Actions en masse (archive/sign_hr/assign_reviewer) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remplir / Sauvegarder réponses | 🟡 | 🟡 | 🟡 | 🟡 | ✅ |
| Soumettre une évaluation | ✅ | ✅ | 🟡 | 🟡 | ✅ |
| Revoir (reviewed) + score + commentaire | ✅ | ✅ | ✅ | ✅ | ❌ |
| Signer (évalué / manager / RH) | ✅ | ✅ | 🟡 | 🟡 | 🟡 |
| Réaffecter l'évaluateur | ✅ | ✅ | ❌ | ❌ | ❌ |
| Expirer manuellement | ✅ | ✅ | ❌ | ❌ | ❌ |
| Historique personnel | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export CSV | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export PDF individuel | ✅ | ✅ | 🟡 | 🟡 | 🟡 |
| **Calendrier & Événements** | | | | | |
| Voir les événements | ✅ | ✅ | 🟡 | 🟡 | 🟡 |
| Créer un événement | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modifier / Supprimer un événement | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ressources documentaires** | | | | | |
| Voir les ressources publiées | ✅ | ✅ | 🟡 | 🟡 | 🟡 |
| Voir toutes les ressources (draft inclus) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Créer / Modifier / Supprimer une ressource | ✅ | ✅ | ❌ | ❌ | ❌ |
| Publier une ressource | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Offboarding** | | | | | |
| Lister les demandes de départ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Créer une demande de départ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mettre à jour le statut / notes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cocher les items de la checklist | ✅ | ✅ | ❌ | ❌ | ❌ |
| Supprimer une demande | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Analytique & Reporting** | | | | | |
| Analytics d'une campagne (JSON) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export PDF analytique RH global | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export CSV évaluations | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Administration** | | | | | |
| Configuration clé/valeur | ✅ | ❌ | ❌ | ❌ | ❌ |
| Email de test | ✅ | ❌ | ❌ | ❌ | ❌ |
| Piste d'audit | ✅ | ✅ | ❌ | ❌ | ❌ |
| LDAP : test / prévisualisation / sync / config | ✅ | ❌ | ❌ | ❌ | ❌ |

> 🟡 = accès partiel (périmètre limité ou actions restreintes) · ✅ = accès complet · ❌ = aucun accès

---

## 3. Liste détaillée des fonctionnalités par module

---

### 3.1 Authentification & Profil

#### Connexion (`POST /api/auth/login`)
- **Description** : Saisie email + mot de passe. Création d'un cookie `httpOnly` JWT. Option "Se souvenir de moi" (30 jours vs 8 h). Protection anti-brute-force : 5 tentatives / 15 min par email + 20 / 15 min par IP.
- **Rôles** : Tous (route publique)
- **Données** : Email, mot de passe, flag `remember`. Retourne : `id`, `email`, `firstName`, `lastName`, `role`
- **Règles métier** : Seuls les comptes `authSource=local` et `isActive=true` peuvent se connecter. Les comptes LDAP s'authentifient via le cookie LDAP (flux séparé). Mise à jour `lastLoginAt` en fire-and-forget.

#### Déconnexion (`POST /api/auth/logout`)
- **Description** : Suppression du cookie JWT. Aucun appel DB requis.
- **Rôles** : Tous

#### Session courante (`GET /api/auth/me`)
- **Description** : Revalide le JWT et retourne le profil complet de l'utilisateur connecté, incluant préférences filtrées selon le rôle.
- **Rôles** : Tous (authGuard)
- **Données** : `firstName`, `lastName`, `email`, `role`, `department`, `position`, `locale`, `theme`, `notificationPrefs` (filtrées par rôle), `lastLoginAt`, `authSource`, `managerId`, `onboarding`
- **Règles métier** : Si `isActive=false`, le cookie est supprimé et 401 renvoyé.

#### Préférences utilisateur (`PATCH /api/auth/preferences`)
- **Description** : Mise à jour de la langue d'interface, du thème visuel et des préférences de notifications.
- **Rôles** : Tous (chacun modifie ses propres préférences)
- **Données** : `locale` (`fr`|`en`), `theme` (`dark`|`light`|`light-sidebar`), `notificationPrefs` (objet booléen)
- **Règles métier** : Les clés de notification autorisées dépendent du rôle :
  - `employee` : `evaluationAssigned`, `deadlineReminder`, `managerActionRequired`
  - `manager` / `director` : + `evaluationSubmitted`
  - `hr` : + `campaignLaunch`
  - `admin` : + `systemAlerts`

---

### 3.2 Gestion des utilisateurs

#### Liste des utilisateurs (`GET /api/users`)
- **Description** : Annuaire paginé des collaborateurs, filtrable par rôle, département, statut actif, et recherche texte (prénom, nom, email).
- **Rôles** : admin, hr, director (tous), manager (ses subordonnés directs uniquement)
- **Données** : `firstName`, `lastName`, `email`, `role`, `department`, `position`, `managerId`, `isActive`, `lastLoginAt`, `authSource`, `onboarding`
- **Règles métier** : `passwordHash` et `ldapDn` ne sont jamais retournés.

#### Détail d'un utilisateur (`GET /api/users/:id`)
- **Description** : Fiche profil complète d'un collaborateur.
- **Rôles** : admin/hr/director = accès complet ; manager = soi + subordonnés directs ; employee = soi + son manager direct (pour afficher le nom)

#### Création d'un utilisateur (`POST /api/users`)
- **Description** : Création d'un compte local. Un mot de passe temporaire est généré automatiquement et retourné une seule fois.
- **Rôles** : admin, hr
- **Données** : `firstName`, `lastName`, `email`, `role`, `department`, `position`, `managerId`
- **Règles métier** : L'email doit être unique (409 si doublon). Le rôle est assigné via DB, jamais via LDAP. Mot de passe temporaire exposé uniquement à la création.

#### Modification d'un utilisateur (`PATCH /api/users/:id`)
- **Description** : Mise à jour des informations du collaborateur.
- **Rôles** : admin/hr = tous les champs ; self (employee/manager/etc.) = `firstName`, `lastName` uniquement
- **Règles métier** : Les non-admins ne peuvent pas modifier `role`, `managerId`, `isActive`, `department`, `position`, `email`. Un utilisateur ne peut pas être son propre manager (cycle détecté jusqu'à 20 niveaux de profondeur).

#### Onboarding — Étapes (`PATCH /api/users/:id/onboarding/:stepIndex`)
- **Description** : Cocher ou décocher une étape du parcours d'intégration d'un nouveau collaborateur.
- **Rôles** : self ou admin/hr
- **Étapes par défaut** : Profil complété · Photo ajoutée · Présentation à l'équipe · Accès systèmes vérifiés · Premier entretien planifié

#### Onboarding — Complétion (`PATCH /api/users/:id/onboarding/complete`)
- **Description** : Marque l'onboarding comme terminé.
- **Rôles** : self ou admin/hr

#### Prévisualisation départ (`GET /api/users/:id/offboard-preview`)
- **Description** : Avant de déclencher un départ, affiche l'impact : nombre d'évaluations en cours, noms des campagnes actives concernées.
- **Rôles** : admin, hr

#### Déclenchement départ (`PATCH /api/users/:id/offboard`)
- **Description** : Lance le processus de départ : passe `offboardingStatus` à `offboarding`, archive toutes les évaluations non terminées (`status → archived`), enregistre la raison et la date effective.
- **Rôles** : admin, hr
- **Règles métier** : Archive les évaluations dont le statut n'est pas `validated` ou `archived`.

#### Export RGPD (`GET /api/users/:id/gdpr-export`)
- **Description** : Télécharge un fichier JSON contenant l'ensemble des données personnelles (profil + toutes les évaluations en tant qu'évalué).
- **Rôles** : admin, hr, ou soi-même (droit d'accès RGPD)

#### Anonymisation RGPD (`DELETE /api/users/:id/gdpr-anonymize`)
- **Description** : Droit à l'effacement. Remplace `firstName`/`lastName`/`email`/`phone`/`avatar` par des valeurs anonymes. Désactive le compte.
- **Rôles** : admin uniquement
- **Règles métier** : Refusé si des évaluations en cours existent (`assigned`, `in_progress`, `submitted`).

---

### 3.3 Campagnes d'évaluation

#### Liste des campagnes (`GET /api/campaigns`)
- **Description** : Vue d'ensemble de toutes les campagnes RH, avec pagination et filtre par statut.
- **Rôles** : Tous — mais les `employee` ne voient que les campagnes `active`

#### Détail d'une campagne (`GET /api/campaigns/:id`)
- **Description** : Fiche détaillée d'une campagne avec statistiques de complétion en temps réel (total / démarré / soumis / validé).
- **Rôles** : Tous (avec scope)

#### Création d'une campagne (`POST /api/campaigns`)
- **Description** : Crée une nouvelle campagne. Statut initial : `draft` (ou `active` si précisé).
- **Rôles** : admin, hr
- **Données** : `name`, `description`, `startDate`, `endDate`, `targetDepartments`, `extendedVisibility`, `deadlineEmployee`, `deadlineManager`
- **Règles métier** : `endDate` doit être postérieure à `startDate`.

#### Modification / Transition de statut (`PATCH /api/campaigns/:id`)
- **Description** : Modifie les métadonnées et/ou fait avancer le statut de la campagne.
- **Rôles** : admin, hr
- **Cycle de vie (irréversible)** : `draft` → `active` → `closed` → `archived`
- **Règles métier** : Lors du passage à `active`, une notification `campaignLaunch` est envoyée aux utilisateurs des départements ciblés. Les transitions non autorisées renvoient une erreur 400.

#### Suppression d'une campagne (`DELETE /api/campaigns/:id`)
- **Description** : Supprime définitivement une campagne et tous ses formulaires et évaluations associés.
- **Rôles** : admin, hr
- **Règles métier** : Seules les campagnes en `draft` ou `archived` peuvent être supprimées. Une campagne `active` doit être clôturée d'abord.

#### Clonage d'une campagne (`POST /api/campaigns/:id/clone`)
- **Description** : Duplique une campagne existante (avec tous ses formulaires, questions incluses) en statut `draft`. Les dates sont décalées d'un an par défaut. Les formulaires clonés ont `frozenAt=null` (modifiables).
- **Rôles** : admin, hr

#### Analytics d'une campagne (`GET /api/campaigns/:id/analytics`)
- **Description** : Agrégats analytiques : distribution des statuts, distribution des scores (par tranche de 10), score moyen global, taux de complétion par département.
- **Rôles** : admin, hr

---

### 3.4 Formulaires / Templates

#### Liste et détail (`GET /api/forms`, `GET /api/forms/:id`)
- **Description** : Bibliothèque de formulaires, filtrables par `campaignId` ou `formType`.
- **Rôles** : Tous
- **Types de formulaires** : `self_evaluation` · `manager_evaluation` · `upward_feedback` · `director_evaluation` · `peer_review`

#### Création d'un formulaire (`POST /api/forms`)
- **Description** : Crée un formulaire avec ses questions. Peut être autonome (template de bibliothèque) ou rattaché à une campagne.
- **Rôles** : admin, hr
- **Types de questions** : `rating` · `text` · `yes_no` · `choice` · `weather` · `mobility` · `n1_import`
- **Phases** : `self` · `n-1` · `objectives` · `aspirations` · `all`
- **Règles métier** : `upward_feedback` est toujours anonyme (forcé). Les IDs de questions doivent être uniques au sein d'un formulaire.

#### Modification d'un formulaire (`PATCH /api/forms/:id`)
- **Description** : Modifie le titre, la description ou les questions d'un formulaire.
- **Rôles** : admin, hr
- **Règles métier** : **`frozenAt` bloque la modification des questions.** Le gel (`frozenAt`) est positionné automatiquement dès la création de la première évaluation sur ce formulaire. Le titre et la description restent modifiables même après gel.

#### Suppression d'un formulaire (`DELETE /api/forms/:id`)
- **Description** : Supprime un formulaire non utilisé.
- **Rôles** : admin, hr
- **Règles métier** : Impossible si `frozenAt` est renseigné (des évaluations existent).

---

### 3.5 Évaluations

#### Cycle de vie complet d'une évaluation

```
assigned → in_progress → submitted → reviewed
        → signed_evaluatee → signed_manager → signed_hr → validated
```

États terminaux : `validated` · `expired` (deadline dépassée) · `archived` (offboarding)

| Transition | Qui peut l'effectuer |
|-----------|----------------------|
| `assigned → in_progress` | Évaluateur (employee/manager/director) — automatique à la 1ère sauvegarde |
| `in_progress → submitted` | Évaluateur |
| `submitted → reviewed` | Manager ou director (évaluateur de l'évaluation) |
| `reviewed → signed_evaluatee` | L'évalué (employee) |
| `signed_evaluatee → signed_manager` | Manager ou director |
| `signed_manager → signed_hr` | RH (peut signer depuis `reviewed`, `signed_evaluatee` ou `signed_manager`) |
| `signed_hr → validated` | Admin ou RH |
| Toute transition | Admin |

#### Liste des évaluations (`GET /api/evaluations`)
- **Rôles** : admin/hr = tout ; director/manager = ses équipes (+ visibilité étendue) ; employee = ses propres évaluations
- **Règles métier** : Si `form.isAnonymous=true`, `evaluatorId` est retiré de la réponse (`sanitizeAnonymity`).

#### Historique personnel (`GET /api/evaluations/history`)
- **Description** : Liste des entretiens passés (statuts avancés : `reviewed`, `signed_*`, `validated`), limitée à 200 résultats.
- **Rôles** : Tous (filtrés sur soi)

#### Création individuelle / en masse (`POST /api/evaluations`, `POST /api/evaluations/bulk`)
- **Description** : Crée une ou plusieurs évaluations. En masse : max 500 par batch. Gèle automatiquement les formulaires concernés.
- **Rôles** : admin, hr
- **Règles métier** : Index unique sur `(campaignId, formId, evaluatorId, evaluateeId)` — doublon ignoré en mode bulk (207). `expiresAt = campaign.endDate + 30 jours`.

#### Mise à jour d'une évaluation (`PATCH /api/evaluations/:id`)
- **Description** : Sauvegarde des réponses (brouillon), transition de statut, ajout de score, commentaires reviewer/évalué, objectifs N+1.
- **Règles métier** :
  - Les réponses sont **verrouillées** après `submitted` (toute tentative renvoie 409)
  - `lastSavedAt` est mis à jour à chaque sauvegarde de réponses (affiché côté client)
  - Le score et `reviewerComment` sont réservés aux managers, directors, admin, hr
  - `evaluateeComment` et `disagreementFlag` sont réservés à l'évalué (ou admin/hr)

#### Actions en masse (`PATCH /api/evaluations/bulk`)
- **Description** : Effectue en lot (max 200) l'une des actions : `archive`, `sign_hr`, `assign_reviewer`.
- **Rôles** : admin, hr
- **Retourne** : `{ success, skipped, errors }`

#### Réaffectation (`PATCH /api/evaluations/:id/reassign`)
- **Description** : Change l'évaluateur d'une évaluation non terminée. Le nouvel évaluateur doit être actif et avoir le rôle `manager` ou `director`.
- **Rôles** : admin, hr
- **Règles métier** : Impossible si statut `signed_hr` ou `validated`.

#### Expiration manuelle (`POST /api/evaluations/:id/expire`)
- **Description** : Force le passage à `expired` d'une évaluation non terminée.
- **Rôles** : admin, hr

#### Export CSV (`GET /api/evaluations/export`)
- **Description** : Exporte jusqu'à 5 000 évaluations au format CSV (UTF-8 BOM), filtrable par campagne, statut, département.
- **Rôles** : admin, hr

#### Export PDF individuel (`GET /api/evaluations/:id/pdf`)
- **Description** : Génère un PDF A4 de compte-rendu d'entretien : informations générales, questions/réponses par phase, commentaires, signatures.
- **Rôles** : admin/hr (toutes) ; évaluateur ou évalué (la leur uniquement)
- **Règles métier** : Évaluations anonymes → `evaluatorId` masqué dans le PDF également.

---

### 3.6 Calendrier & Événements

#### Liste et détail (`GET /api/events`)
- **Description** : Calendrier des entretiens, deadlines, réunions, feedbacks.
- **Rôles** : admin/hr = tout ; autres = événements dont `targetRoles` est vide (tous) ou contient leur rôle
- **Types** : `deadline` · `interview` · `meeting` · `feedback` · `campaign`

#### Création / Modification / Suppression (`POST`, `PATCH`, `DELETE /api/events`)
- **Description** : Gestion complète des événements du calendrier.
- **Rôles** : admin, hr
- **Données** : `title`, `date`, `endDate` (optionnel), `type`, `description`, `location`, `campaignId` (optionnel), `targetRoles`
- **Règles métier** : `targetRoles` vide = visible par tous les rôles. `reminderSent` est géré par le scheduler (rappel J-1 / J-7).

---

### 3.7 Ressources documentaires

#### Liste et détail (`GET /api/resources`)
- **Description** : Médiathèque RH (guides, grilles d'évaluation, livrets d'accueil...).
- **Rôles** : admin/hr = tout (draft + published) ; autres = uniquement `published` dont `visibleTo` inclut leur rôle
- **Types** : `pdf` · `xlsx` · `docx` · `pptx`

#### Création / Modification / Suppression
- **Rôles** : admin, hr
- **Données** : `title`, `description`, `type`, `filename`, `status` (`draft`|`published`), `visibleTo` (liste de rôles)
- **Règles métier** : `publishedAt` est renseigné automatiquement lors du passage à `published`. Le nom de fichier est validé (pas de `..`, caractères alphanumériques uniquement).

---

### 3.8 Offboarding

#### Cycle de vie d'une demande

```
pending → in_progress → completed
```
> `in_progress` est automatiquement atteint dès le premier item de checklist coché.
> `completed` déclenche `user.isActive=false` et `user.archivedAt`.

#### Checklist par défaut
1. Révocation accès systèmes
2. Récupération matériel
3. Archivage évaluations
4. Solde de tout compte
5. Entretien de départ (optionnel)

#### Création d'une demande (`POST /api/offboarding`)
- **Rôles** : admin, hr
- **Données** : `userId`, `reason` (`resignation`|`termination`|`retirement`|`other`), `lastDay`, `notes`
- **Règles métier** : Une seule demande par utilisateur (index unique). 409 si doublon.

#### Mise à jour statut / notes (`PATCH /api/offboarding/:id`)
- **Rôles** : admin, hr
- **Règles métier** : Passage à `completed` → `user.isActive=false`, `offboardingStatus='offboarded'`, `archivedAt=now`.

#### Checklist (`PATCH /api/offboarding/:id/checklist/:itemIndex`)
- **Rôles** : admin, hr
- **Données** : `done` (boolean), `doneAt` (auto), `doneBy` (userId de l'agent)

#### Suppression (`DELETE /api/offboarding/:id`)
- **Rôles** : admin uniquement

---

### 3.9 Analytique & Reporting

#### Analytics d'une campagne (`GET /api/campaigns/:id/analytics`)
- **Description** : Distribution des statuts, distribution des scores par tranche de 10, score moyen, taux de complétion global et par département.
- **Rôles** : admin, hr

#### Rapport PDF analytique RH (`GET /api/analytics/export/pdf`)
- **Description** : Rapport PDF global (ou filtré par campagne) : statistiques globales, top 5 performers (score moyen), répartition par département.
- **Rôles** : admin, hr

#### Export CSV évaluations (`GET /api/evaluations/export`)
- **Description** : Export tabulaire des évaluations (voir §3.5).
- **Rôles** : admin, hr

---

### 3.10 Administration

#### Configuration applicative (`GET|PUT|PATCH|DELETE /api/admin/config`)
- **Description** : Store clé/valeur pour la configuration système (ex : paramètres email, feature flags).
- **Rôles** : admin uniquement

#### Email de test (`POST /api/admin/email/test`)
- **Description** : Envoie un email de test à une adresse donnée. En développement, retourne l'URL de prévisualisation Ethereal.
- **Rôles** : admin uniquement

#### Piste d'audit (`GET /api/admin/audit`)
- **Description** : Journal chronologique de toutes les actions sensibles. Filtrable par `action`, `targetType`, `userId`, plage de dates.
- **Rôles** : admin, hr
- **Actions tracées** : `status_change`, `evaluation_update`, `campaign_create`, `campaign_activate`, `campaign_update`, `campaign_delete`, `bulk_action`, `offboard`, `offboarding_create`, `offboarding_update`, `offboarding_delete`, `gdpr_anonymize`, `reassigned`

#### LDAP — Test de connexion (`POST /api/admin/ldap/test`)
- **Description** : Vérifie que la connexion LDAP est fonctionnelle avec la config fournie.
- **Rôles** : admin uniquement

#### LDAP — Prévisualisation (`POST /api/admin/ldap/preview`)
- **Description** : Liste les 50 premiers utilisateurs LDAP sans les importer.
- **Rôles** : admin uniquement

#### LDAP — Synchronisation (`POST /api/admin/ldap/sync`)
- **Description** : Synchronise les utilisateurs LDAP dans MongoDB. Les nouveaux utilisateurs reçoivent le rôle `employee` par défaut. Le rôle est toujours géré en DB, jamais depuis l'annuaire.
- **Rôles** : admin uniquement

#### LDAP — Configuration (`GET|PUT /api/admin/ldap/config`)
- **Description** : Sauvegarde et lecture de la configuration LDAP. `bindPassword` n'est jamais retourné en lecture.
- **Rôles** : admin uniquement

---

## 4. Cartographie navigation frontend

| Écran / Section | Fonctionnalités couvertes | Rôles concernés |
|-----------------|--------------------------|-----------------|
| `/login` | Connexion, rate limiting | Tous |
| `/` (Dashboard) | Résumé des campagnes actives, évaluations en attente, événements proches | Tous |
| `/profile` | `GET /me`, modification préférences (locale, thème, notifications), export RGPD self, onboarding self | Tous |
| `/users` | Liste utilisateurs, filtres (rôle, département, recherche), pagination | admin, hr, director, manager |
| `/users/new` | Création utilisateur, assignation manager | admin, hr |
| `/users/:id` | Fiche profil, modification, onboarding checklist, offboard-preview, déclenchement offboard, export RGPD, anonymisation | admin, hr (complet) ; manager/employee (limité) |
| `/campaigns` | Liste campagnes, filtres par statut | Tous |
| `/campaigns/new` | Création campagne, ciblage départements, visibilité étendue managers | admin, hr |
| `/campaigns/:id` | Détail campagne, stats complétion, boutons de transition de statut, clonage | admin/hr (complet) ; autres (lecture) |
| `/campaigns/:id/analytics` | Graphes analytiques : distribution statuts, scores, taux par département | admin, hr |
| `/forms` | Bibliothèque de formulaires, filtres type/campagne | Tous |
| `/forms/new` | Création formulaire, éditeur de questions (FormBuilder), gestion des phases | admin, hr |
| `/forms/:id` | Détail formulaire, modification (avec badge "gelé" si frozenAt), suppression | admin/hr (écriture) ; autres (lecture) |
| `/evaluations` | Liste évaluations, filtres (campagne, statut, évalué), actions bulk | Tous (scopé) |
| `/evaluations/history` | Historique personnel des entretiens terminés | Tous |
| `/evaluations/new` | Création individuelle (admin/hr), sélection campagne/formulaire/évaluateur/évalué | admin, hr |
| `/evaluations/bulk` | Import en masse (max 500), actions en masse (archive/sign_hr/reassign) | admin, hr |
| `/evaluations/:id` | Formulaire de remplissage, sauvegarde automatique, soumission, signature, commentaires, objectifs, désaccord | Tous (scopé) |
| `/evaluations/:id/pdf` | Téléchargement PDF du compte-rendu | admin, hr, évaluateur, évalué |
| `/calendar` | Vue calendrier (mensuelle/hebdomadaire), événements filtrés par rôle, liens campagnes | Tous |
| `/calendar/new` | Création événement, ciblage rôles | admin, hr |
| `/resources` | Médiathèque, filtres type, téléchargement | Tous (publiés) ; admin/hr (tous) |
| `/resources/new` | Upload ressource, métadonnées, ciblage rôles, publication | admin, hr |
| `/offboarding` | Liste des demandes de départ, filtres statut | admin, hr |
| `/offboarding/new` | Création demande, choix motif, date de dernier jour | admin, hr |
| `/offboarding/:id` | Détail demande, checklist interactive, notes, changement statut, suppression | admin, hr |
| `/analytics` | Rapport analytique global, sélecteur de campagne, export PDF | admin, hr |
| `/admin/config` | Configuration clé/valeur, email de test | admin |
| `/admin/ldap` | Test connexion, prévisualisation annuaire, synchronisation, configuration | admin |
| `/admin/audit` | Piste d'audit, filtres (action, type, utilisateur, dates) | admin, hr |

---

## Annexe — Règles métier transversales

### Anonymat des évaluations
- Si `form.isAnonymous = true` (toujours vrai pour `upward_feedback`, configurable pour les autres), `evaluatorId` est **toujours stocké en DB** (nécessaire pour l'index d'unicité) mais **jamais retourné** dans les réponses API ni dans le PDF.

### Gel des formulaires (`frozenAt`)
- Positionné automatiquement à la création de la première évaluation sur un formulaire.
- Bloque toute modification des `questions` (erreur 409).
- `title` et `description` restent modifiables.
- À la clôture/suppression d'une campagne `draft`, les formulaires sont supprimés (gel sans importance).

### Notifications — 6 types
| Clé | Déclencheur | Destinataires |
|-----|-------------|---------------|
| `campaignLaunch` | Campagne → `active` | Utilisateurs des départements ciblés |
| `evaluationAssigned` | Création d'évaluation (individuelle ou bulk) | Évalués |
| `evaluationSubmitted` | Soumission, signature évalué, signature manager | Manager concerné / équipe RH |
| `deadlineReminder` | Scheduler J-7 / J-1 avant `expiresAt` | Évaluateurs concernés |
| `managerActionRequired` | Évaluation passée à `reviewed` ou `signed_hr` | Évalué |
| `systemAlerts` | Alertes techniques (admin uniquement) | admin |

### Visibilité étendue des managers (`extendedVisibility`)
- Configurée par campagne (admin/hr).
- Permet à un manager d'accéder aux évaluations des équipes sous ses sous-managers (récursif, jusqu'à 20 niveaux).
- Sans cette configuration, un manager ne voit que ses subordonnés directs (`managerId === soi`).

### Expiration des évaluations
- `expiresAt = campaign.endDate + 30 jours` (calculé à la création).
- Le scheduler positionne `nearExpiry=true` à J-7 (badge d'avertissement UI).
- Le scheduler passe le statut à `expired` une fois `expiresAt` dépassé.
- L'expiration manuelle est possible pour admin/hr.

### Sécurité hiérarchique
- Un utilisateur ne peut pas être son propre manager.
- Le backend détecte les cycles hiérarchiques jusqu'à 20 niveaux de profondeur.
- `ADMIN_ROLES = ['admin', 'hr']` — contrôle d'accès aux opérations d'écriture sensibles.
- `MANAGER_ROLES = ['admin', 'hr', 'director', 'manager']` — accès élargi en lecture.

### Offboarding — effets en cascade
1. `PATCH /api/offboarding/:id` avec `status: 'completed'` → `user.isActive=false`, `archivedAt=now`, `offboardingStatus='offboarded'`
2. `PATCH /api/users/:id/offboard` → archive toutes les évaluations non terminées (`status → archived`)
3. `DELETE /api/users/:id/gdpr-anonymize` → remplace les PII, désactive le compte (bloqué si évaluations actives)
