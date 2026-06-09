# NX-RH — Référence des pages frontend

Ce document décrit chaque page du SPA React (`frontend-v2/src/pages/`), son chemin de routage, les rôles autorisés et ses fonctionnalités principales.

> **Source de vérité :** les routes et leurs gardes (`AuthGuard roles`) sont définies dans
> `frontend-v2/src/router/index.tsx`. En cas de divergence, ce fichier fait foi.

**Rôles disponibles :** `admin` · `hr` · `manager` · `employee` (tous)

---

## Table des matières

- [Authentification](#authentification)
- [Tableaux de bord](#tableaux-de-bord)
- [Campagnes d'évaluation](#campagnes-dévaluation)
- [Évaluations](#évaluations)
- [Entretien & actions manager](#entretien--actions-manager)
- [Formulaires RH](#formulaires-rh)
- [Offboarding](#offboarding)
- [Mobilité interne](#mobilité-interne)
- [Plans de développement individuels (PDI)](#plans-de-développement-individuels-pdi)
- [Analytics](#analytics)
- [Gestion des utilisateurs](#gestion-des-utilisateurs)
- [Événements & Ressources](#événements--ressources)
- [Administration](#administration)
- [Pages profil & préférences](#pages-profil--préférences)
- [Pages système](#pages-système)

---

## Authentification

### LoginPage
- **Route :** `/login`
- **Accès :** tous (non authentifié)
- **Objectif :** Point d'entrée de l'application — authentification locale par email/mot de passe.
- **Fonctionnalités :**
  - Formulaire email + mot de passe avec validation Zod
  - Gestion des erreurs d'authentification (compte désactivé, mauvais identifiants)
  - Lien vers la connexion LDAP
  - Redirection automatique si déjà connecté

### LoginLdapPage
- **Route :** `/login/ldap`
- **Accès :** tous (non authentifié)
- **Objectif :** Authentification via annuaire LDAP/Active Directory.
- **Fonctionnalités :**
  - Formulaire identifiant LDAP + mot de passe
  - Support Active Directory (`sAMAccountName`) et OpenLDAP (`uid`)
  - Retour vers la connexion locale

---

## Tableaux de bord

### DashboardPage
- **Route :** `/` (route index, tout rôle authentifié)
- **Accès :** tous
- **Objectif :** Point d'entrée après connexion. Une **seule route** affiche le bon tableau de bord
  selon le rôle de l'utilisateur (et la perspective active « Mon espace » / « métier »).
- **Fonctionnement :** `DashboardPage` rend conditionnellement l'un des composants ci-dessous —
  il n'existe **pas** de routes `/dashboard/*` distinctes.

| Rôle (ou perspective « Mon espace ») | Composant rendu |
|---|---|
| `admin` | `DashboardAdminPage` |
| `hr` | `DashboardHrPage` |
| `manager` | `DashboardManagerPage` |
| `employee` (ou perspective personnelle) | `DashboardEmployeePage` |

- **DashboardHrPage** — KPIs globaux (taux de complétion, PDI en retard), graphiques Recharts,
  flags RH à traiter, accès rapide aux campagnes actives.
- **DashboardManagerPage** — équipe directe avec statut d'évaluation, signatures manager en attente,
  PDI des collaborateurs, échéances proches.
- **DashboardAdminPage** — état de santé de la plateforme (API, MongoDB, SMTP, LDAP), métriques
  d'utilisation, raccourcis vers les outils d'administration, activité récente.
- **DashboardEmployeePage** — suivi personnel : évaluations en cours, PDI actif, objectifs,
  demandes de mobilité, notifications.

> L'ancien chemin `/dashboard` redirige côté serveur ; le tableau de bord vit désormais à la racine `/`.

---

## Campagnes d'évaluation

### CampaignsPage
- **Route :** `/campaigns`
- **Accès :** `hr`, `manager`, `admin`
- **Objectif :** Gestion des campagnes d'évaluation — liste, filtres et création.
- **Fonctionnalités :**
  - Liste paginée des campagnes (actives, archivées, brouillons)
  - Filtres par statut, période, département
  - Indicateurs de progression (% évaluations complètes)
  - Bouton de création d'une nouvelle campagne

### CampaignDetailPage
- **Route :** `/campaigns/:id`
- **Accès :** `hr`, `admin`
- **Objectif :** Détail d'une campagne — participants, suivi et actions de gestion.
- **Fonctionnalités :**
  - Liste des participants avec statut individuel (non démarré, en cours, signé)
  - Relances email groupées ou individuelles
  - Clôture et archivage de la campagne
  - Téléchargement du rapport de campagne (PDF)

### CampaignNewPage
- **Route :** `/campaigns/new`
- **Accès :** `hr`, `admin`
- **Objectif :** Création d'une nouvelle campagne d'évaluation.
- **Fonctionnalités :**
  - Formulaire multi-étapes : paramètres, sélection du modèle, participants, dates
  - Sélection du formulaire d'évaluation associé
  - Prévisualisation avant publication

### CampaignEditPage
- **Route :** `/campaigns/:id/edit`
- **Accès :** `hr`, `admin`
- **Objectif :** Modification d'une campagne existante (avant clôture).
- **Fonctionnalités :**
  - Édition des paramètres, dates et participants
  - Ajout/suppression de participants individuels
  - Changement de formulaire associé (si aucune évaluation démarrée)

### CampaignAnalyticsPage
- **Route :** `/campaigns/:id/analytics`
- **Accès :** `hr`, `admin`
- **Objectif :** Analyse détaillée des résultats d'une campagne spécifique.
- **Fonctionnalités :**
  - Visualisations des scores par critère et par département
  - Tableau comparatif des évaluations
  - Export PDF et CSV des résultats

---

## Évaluations

### EvaluationsPage
- **Route :** `/evaluations`
- **Accès :** tous
- **Objectif :** Liste des évaluations de l'utilisateur courant (à compléter, en attente, signées).
- **Fonctionnalités :**
  - Filtres par statut, campagne, période
  - Indicateurs visuels de progression (workflow de signatures)
  - Accès rapide aux évaluations prioritaires

### EvaluationDetailPage
- **Route :** `/evaluations/:id`
- **Accès :** tous
- **Objectif :** Détail d'une évaluation avec workflow complet de signatures.
- **Fonctionnalités :**
  - Affichage des réponses au formulaire (lecture seule post-signature)
  - Workflow de signatures : employé → manager → RH
  - Historique des actions et commentaires
  - Téléchargement PDF de l'évaluation signée

> **Saisie d'une évaluation** — il n'existe pas de route `/evaluations/:id/form` distincte. Le
> formulaire de remplissage est intégré à `EvaluationDetailPage` (`/evaluations/:id`) : rendu
> dynamique des questions, sauvegarde automatique en brouillon (`assigned → in_progress`),
> soumission et déclenchement du workflow de signature.

### EvaluationNewPage
- **Route :** `/evaluations/new`
- **Accès :** `admin`, `hr`
- **Objectif :** Création manuelle d'une évaluation hors campagne.
- **Fonctionnalités :**
  - Sélection de l'employé et du formulaire
  - Association optionnelle à une campagne existante
  - Initialisation du workflow

### EvaluationHistoryPage
- **Route :** `/evaluations/history`
- **Accès :** tous
- **Objectif :** Historique complet des évaluations passées de l'utilisateur.
- **Fonctionnalités :**
  - Timeline des évaluations par année
  - Comparaison des scores d'une année sur l'autre
  - Téléchargement des évaluations archivées

### ObjectivesPage
- **Route :** `/objectives`
- **Accès :** `employee`, `manager`, `hr`, `admin`
- **Objectif :** Suivi des objectifs fixés lors des entretiens.
- **Fonctionnalités :**
  - Liste des objectifs avec niveau d'atteinte et échéances
  - Mise à jour de l'avancement

---

## Entretien & actions manager

### ManagerTodoPage
- **Route :** `/manager/todo`
- **Accès :** `manager`, `hr`, `admin`
- **Objectif :** File des actions en attente pour le manager (« À traiter »).
- **Fonctionnalités :**
  - Évaluations de l'équipe à réviser ou à signer
  - Demandes (mobilité, etc.) à traiter, quelle que soit la profondeur hiérarchique

### InterviewPage
- **Route :** `/interview` (lit `campaignId` et `evaluateeId` en query string)
- **Accès :** `manager`, `hr`, `admin`
- **Objectif :** Vue Entretien en face-à-face — conduite de l'échange à partir de la fiche complète.
- **Fonctionnalités :**
  - Affichage côte à côte des réponses (auto-évaluation, contexte N-1)
  - Saisie de la synthèse, des objectifs et de la note globale
  - Double signature et gestion du désaccord

---

## Formulaires RH

### FormsPage
- **Route :** `/forms`
- **Accès :** `hr`, `admin`
- **Objectif :** Gestion des modèles de formulaires d'évaluation RH.
- **Fonctionnalités :**
  - Liste des formulaires (actifs, archivés, brouillons)
  - Duplication et archivage d'un formulaire
  - Indicateur du nombre de campagnes utilisant chaque formulaire

### FormDetailPage
- **Route :** `/forms/:id`
- **Accès :** `hr`, `admin`
- **Objectif :** Prévisualisation et gestion d'un modèle de formulaire.
- **Fonctionnalités :**
  - Aperçu du rendu final du formulaire
  - Accès à l'éditeur
  - Historique des modifications

### FormNewPage
- **Route :** `/forms/new`
- **Accès :** `admin`, `hr`, `manager`
- **Objectif :** Création d'un nouveau modèle de formulaire d'évaluation.
- **Fonctionnalités :**
  - Éditeur drag-and-drop de sections et de champs (dnd-kit)
  - Types de champs : texte court, texte long, note (1-5), choix unique, choix multiple, case à cocher
  - Configuration de la pondération des sections
  - Sauvegarde en brouillon ou publication directe

### AdminFormsImportPage
- **Route :** `/admin/forms/import`
- **Accès :** `admin`, `hr`
- **Objectif :** Import de modèles de formulaires depuis un fichier JSON ou CSV.
- **Fonctionnalités :**
  - Upload de fichier et validation du format
  - Prévisualisation avant import
  - Rapport d'import (succès / erreurs)

---

## Offboarding

> **Pas de page/route frontend dédiée.** L'offboarding (départ d'un collaborateur) est une
> capacité **backend** exposée par l'API `/api/v1/offboarding`. Il est déclenché et suivi depuis la
> fiche utilisateur (`UserDetailPage`, `/users/:id`) par un rôle `hr`/`admin`. Lancer un offboarding
> archive les évaluations en cours du collaborateur concerné (statut `archived`). Voir
> [[Gestion-des-comptes]] dans le wiki et `docs/ARCHITECTURE.md`.

---

## Mobilité interne

### MobilityPage
- **Route :** `/mobility`
- **Accès :** tous
- **Objectif :** Gestion des demandes de mobilité interne (promotion, transfert de poste, mobilité internationale).
- **Fonctionnalités :**
  - Liste des demandes de l'utilisateur courant (employé) ou de l'équipe (manager, RH)
  - Création d'une nouvelle demande avec type, justification et documents joints
  - Suivi du statut (soumis, en cours d'examen, approuvé, refusé)
  - Notifications à chaque changement de statut

---

## Plans de développement individuels (PDI)

### PDIPage
- **Route :** `/pdi`
- **Accès :** tous
- **Objectif :** Gestion des plans de développement individuels actifs et passés.
- **Fonctionnalités :**
  - Liste des PDI (actifs, complétés, en retard)
  - Vue employé : PDI personnel ; vue manager/RH : PDI de l'équipe
  - Création d'un nouveau PDI
  - Indicateurs d'avancement des objectifs

### PDIDetailPage
- **Route :** `/pdi/:id`
- **Accès :** tous
- **Objectif :** Détail d'un PDI avec objectifs, actions de développement et suivi.
- **Fonctionnalités :**
  - Liste des objectifs avec statut et échéances
  - Commentaires et suivi des actions par l'employé et le manager
  - Mise à jour de l'avancement
  - Historique des révisions

---

## Analytics

### AnalyticsPage
- **Route :** `/analytics`
- **Accès :** `hr`, `admin`
- **Objectif :** Tableaux de bord KPIs globaux et exports des données RH.
- **Fonctionnalités :**
  - Indicateurs agrégés : taux d'évaluation, scores moyens, distribution des notes
  - Graphiques interactifs Recharts (barres, radar, courbes)
  - Filtres par département, période, type de campagne
  - Export PDF (jsPDF) et CSV

### AnalyticsCampaignPage
- **Route :** `/analytics/campaigns/:id`
- **Accès :** `hr`, `admin`
- **Objectif :** Analyse comparative des campagnes d'évaluation sur plusieurs périodes.
- **Fonctionnalités :**
  - Comparaison des taux de complétion entre campagnes
  - Évolution des scores dans le temps
  - Filtres par campagne, département, formulaire

---

## Gestion des utilisateurs

### UsersPage
- **Route :** `/users`
- **Accès :** `admin`, `hr` (gestion) · `manager` (lecture de son équipe)
- **Objectif :** Liste et recherche des utilisateurs de la plateforme.
- **Fonctionnalités :**
  - Tableau paginé avec recherche et filtres (rôle, département, statut)
  - Actions en masse (activer, désactiver, exporter)
  - Accès rapide à la fiche utilisateur

### UserDetailPage
- **Route :** `/users/:id`
- **Accès :** `admin`, `hr` · `manager` (lecture)
- **Objectif :** Fiche détaillée d'un utilisateur avec son historique RH.
- **Fonctionnalités :**
  - Informations personnelles et professionnelles
  - Historique des évaluations et PDI
  - Demandes de mobilité et offboarding associés
  - Actions rapides (modifier, désactiver, démarrer un offboarding)

### UserEditPage
- **Route :** `/users/:id/edit`
- **Accès :** `admin`, `hr`
- **Objectif :** Modification des informations d'un utilisateur.
- **Fonctionnalités :**
  - Édition du profil, du rôle, du département, du manager
  - Réinitialisation du mot de passe
  - Gestion de la synchronisation LDAP

### UserNewPage
- **Route :** `/users/new`
- **Accès :** `admin`, `hr`
- **Objectif :** Création manuelle d'un compte utilisateur.
- **Fonctionnalités :**
  - Formulaire de création avec validation
  - Envoi d'un email de bienvenue avec lien de définition du mot de passe

### AdminUsersImportPage
- **Route :** `/admin/users/import`
- **Accès :** `admin`, `hr`
- **Objectif :** Import en masse d'utilisateurs depuis un fichier CSV.
- **Fonctionnalités :**
  - Upload et validation du fichier CSV
  - Aperçu des données avant import
  - Rapport détaillé (lignes importées, erreurs, doublons)

### UserGroupsPage
- **Route :** `/users/groups`
- **Accès :** `admin`, `hr`
- **Objectif :** Gestion des groupes d'utilisateurs pour les campagnes et les droits.
- **Fonctionnalités :**
  - Création et édition de groupes
  - Affectation de membres par critères (département, rôle)
  - Utilisation des groupes dans les campagnes

---

## Événements & Ressources

### EventsPage
- **Route :** `/events`
- **Accès :** tous
- **Objectif :** Calendrier et liste des événements RH (formations, entretiens, échéances).
- **Fonctionnalités :**
  - Vue liste et vue calendrier
  - Filtres par type d'événement et participant
  - Création d'événements (rôles RH/admin)

### EventDetailPage
- **Route :** `/events/:id`
- **Accès :** tous
- **Objectif :** Détail d'un événement RH avec participants et documents.
- **Fonctionnalités :**
  - Informations complètes de l'événement
  - Liste des participants
  - Documents et ressources associés

### ResourcesPage
- **Route :** `/documents`
- **Accès :** `hr`, `manager`, `employee` (l'`admin` est **exclu** de cette zone)
- **Objectif :** Espace documentaire RH (guides, modèles, politiques) publié par la RH.
- **Fonctionnalités :**
  - Recherche et filtres par catégorie
  - Téléchargement des documents
  - Publication/gestion des documents (rôle `hr`)

### ResourceDetailPage
- **Route :** `/documents/:id`
- **Accès :** `hr`, `manager`, `employee` (l'`admin` est **exclu**)
- **Objectif :** Consultation et téléchargement d'une ressource RH spécifique.
- **Fonctionnalités :**
  - Aperçu du document
  - Téléchargement et partage
  - Métadonnées (auteur, date, version)

### OrgPage
- **Route :** `/org`
- **Accès :** tous
- **Objectif :** Organigramme interactif de l'entreprise.
- **Fonctionnalités :**
  - Visualisation hiérarchique (React Flow / dagre)
  - Recherche de collaborateurs
  - Accès à la fiche utilisateur depuis l'organigramme

---

## Administration

### AdminPage (Hub)
- **Route :** `/admin`
- **Accès :** `admin`, `hr`
- **Objectif :** Hub d'administration — accès aux outils d'administration et de configuration RH. Le contenu affiché dépend du rôle (les outils infrastructure restent réservés à l'`admin`).
- **Fonctionnalités :**
  - Navigation vers les sous-sections admin (utilisateurs, mail, LDAP, audit…)
  - Indicateurs de santé de la plateforme
  - Raccourcis vers les actions d'administration fréquentes

### AdminUsersPage
- **Route :** `/admin/users`
- **Accès :** `admin`, `hr`
- **Objectif :** Gestion avancée des utilisateurs avec outils RGPD et synchronisation LDAP.
- **Fonctionnalités :**
  - Gestion complète des comptes (activation, désactivation, suppression RGPD)
  - Synchronisation manuelle avec l'annuaire LDAP
  - Export des données utilisateurs (conformité RGPD)
  - Gestion des rôles et permissions

### AdminConfigPage
- **Route :** `/admin/config`
- **Accès :** `admin`
- **Objectif :** Configuration générale de la plateforme (paramètres globaux).
- **Fonctionnalités :**
  - Paramètres de l'application (nom, logo, langue par défaut)
  - Activation/désactivation des modules fonctionnels
  - Gestion des planificateurs (cron jobs)

### AdminLdapPage
- **Route :** `/admin/ldap`
- **Accès :** `admin`
- **Objectif :** Configuration et test de la connexion LDAP/Active Directory.
- **Fonctionnalités :**
  - Formulaire de configuration LDAP (URL, Base DN, filtre utilisateur)
  - Test de connexion en temps réel
  - Mappage des attributs LDAP vers les champs utilisateur

### AdminMailConfigPage
- **Route :** `/admin/mail-config`
- **Accès :** `admin`
- **Objectif :** Configuration du serveur SMTP pour les notifications email.
- **Fonctionnalités :**
  - Paramètres SMTP (hôte, port, TLS, authentification)
  - Test d'envoi d'email
  - Statut de la connexion SMTP

### AdminMailTemplatesPage
- **Route :** `/admin/mail-templates`
- **Accès :** `admin`, `hr`
- **Objectif :** Gestion des modèles d'emails transactionnels.
- **Fonctionnalités :**
  - Édition des templates (invitation évaluation, relance, bienvenue…)
  - Variables dynamiques disponibles par template
  - Prévisualisation du rendu

### AdminMailTestPage
- **Route :** `/admin/test-mail`
- **Accès :** `admin`
- **Objectif :** Envoi d'un email de test pour vérifier la configuration SMTP.
- **Fonctionnalités :**
  - Formulaire d'envoi vers une adresse arbitraire
  - Affichage du résultat (succès / message d'erreur SMTP)

### AdminAuditPage
- **Route :** `/admin/audit`
- **Accès :** `admin`, `hr`
- **Objectif :** Journal d'audit des actions sensibles effectuées sur la plateforme.
- **Fonctionnalités :**
  - Historique des actions (connexions, modifications, suppressions)
  - Filtres par utilisateur, date, type d'action
  - Export du journal

### AdminStatsPage
- **Route :** `/admin/stats`
- **Accès :** `admin`, `hr`
- **Objectif :** Statistiques techniques et métriques d'utilisation de la plateforme.
- **Fonctionnalités :**
  - Métriques d'utilisation (connexions, actions par module)
  - Performances API
  - Données agrégées pour le reporting

### AdminStatusPage
- **Route :** `/admin/status`
- **Accès :** `admin`
- **Objectif :** Page de statut des services — santé de l'infrastructure en temps réel.
- **Fonctionnalités :**
  - Statut MongoDB, SMTP, LDAP, stockage fichiers
  - Temps de réponse de l'API
  - Alertes sur les services dégradés

### AdminSetupWizardPage
- **Route :** `/admin/setup`
- **Accès :** `admin`
- **Objectif :** Assistant de configuration initiale à la première installation de la plateforme.
- **Fonctionnalités :**
  - Étapes guidées : base de données, SMTP, LDAP, compte admin
  - Validation de chaque étape avant de passer à la suivante
  - Seed de données initiales optionnel

### AdminSslPage
- **Route :** `/admin/ssl`
- **Accès :** `admin`
- **Objectif :** Gestion du certificat TLS — statut, téléversement du `fullchain.pem` / `privkey.pem`.
- **Fonctionnalités :**
  - Affichage du CN, de la date d'expiration et du nombre de jours restants
  - Téléversement et validation d'un nouveau certificat (écriture atomique dans `nginx/certs/`)

### DepartmentsPage
- **Route :** `/admin/departments`
- **Accès :** `admin`, `hr`
- **Objectif :** Gestion des départements de l'organisation.
- **Fonctionnalités :**
  - Création, édition et suppression de départements
  - Association des collaborateurs aux départements

### HrSettingsPage
- **Routes :** `/hr/settings` et `/admin/settings` (même composant)
- **Accès :** `hr`, `admin`
- **Objectif :** Paramètres RH spécifiques (règles métier, notifications, workflows).
- **Fonctionnalités :**
  - Configuration des règles de relance automatique
  - Paramètres des workflows d'évaluation et de signature
  - Gestion des départements et des postes

### HrFlagsPage
- **Route :** `/hr/flags`
- **Accès :** `hr`, `admin`
- **Objectif :** Liste des flags RH — alertes nécessitant une attention particulière.
- **Fonctionnalités :**
  - Liste des signalements actifs (évaluations bloquées, PDI en retard, offboardings urgents)
  - Filtres par type et priorité
  - Assignation et résolution des flags

### HrFlagDetailPage
- **Route :** `/hr/flags/:id`
- **Accès :** `hr`, `admin`
- **Objectif :** Détail d'un flag RH avec contexte et actions de résolution.
- **Fonctionnalités :**
  - Description du problème et contexte (collaborateur, module concerné)
  - Historique des actions prises
  - Résolution et commentaire de clôture

---

## Pages profil & préférences

### ProfilePage
- **Route :** `/profile`
- **Accès :** tous
- **Objectif :** Profil personnel de l'utilisateur connecté — informations, notifications et historique.
- **Fonctionnalités :**
  - Modification des informations personnelles et photo de profil
  - Historique d'activité récente
  - Préférences de notifications (email, in-app)
  - Changement de mot de passe (authentification locale)

### PreferencesPage
- **Route :** `/profile/preferences`
- **Accès :** tous
- **Objectif :** Paramètres personnels de l'interface (langue, thème, notifications).
- **Fonctionnalités :**
  - Choix de la langue de l'interface (i18next)
  - Préférences d'affichage
  - Configuration des alertes et rappels personnels

### NotificationsPage
- **Route :** `/notifications`
- **Accès :** tous
- **Objectif :** Centre de notifications — toutes les alertes et messages de la plateforme.
- **Fonctionnalités :**
  - Liste des notifications (lues, non lues)
  - Filtres par type (évaluation, PDI, mobilité, système)
  - Marquage comme lu / tout marquer comme lu
  - Liens directs vers les éléments concernés

### HelpPage
- **Route :** `/help`
- **Accès :** tous (admin compris)
- **Objectif :** Aide en ligne, accessible via le bouton `?` de la barre supérieure.
- **Fonctionnalités :**
  - Guide d'utilisation par fonctionnalité
  - Réponses aux questions fréquentes

---

## Pages système

### NotFoundPage
- **Route :** `*` (404)
- **Accès :** tous
- **Objectif :** Page d'erreur 404 — ressource non trouvée.
- **Fonctionnalités :**
  - Message d'erreur clair
  - Lien retour vers le tableau de bord

### UnauthorizedPage
- **Route :** `/unauthorized`
- **Accès :** tous
- **Objectif :** Page d'erreur 403 — accès refusé à une ressource protégée.
- **Fonctionnalités :**
  - Message explicatif selon le rôle manquant
  - Lien retour et suggestion de contact RH/admin
