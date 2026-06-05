# NX-RH — Référence des pages frontend

Ce document décrit chaque page du SPA React (`frontend-v2/src/pages/`), son chemin de routage, les rôles autorisés et ses fonctionnalités principales.

**Rôles disponibles :** `admin` · `rh` · `manager` · `employee` (tous)

---

## Table des matières

- [Authentification](#authentification)
- [Tableaux de bord](#tableaux-de-bord)
- [Campagnes d'évaluation](#campagnes-dévaluation)
- [Évaluations](#évaluations)
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
- **Route :** `/dashboard`
- **Accès :** tous
- **Objectif :** Vue d'ensemble personnalisée — KPIs et activité récente de l'utilisateur connecté.
- **Fonctionnalités :**
  - Indicateurs clés selon le rôle (évaluations en cours, PDI actifs, notifications)
  - Raccourcis vers les actions prioritaires
  - Redirection dynamique vers le tableau de bord spécifique au rôle

### DashboardHrPage
- **Route :** `/dashboard/hr`
- **Accès :** `rh`, `admin`
- **Objectif :** Vue RH complète avec métriques avancées sur l'ensemble des collaborateurs.
- **Fonctionnalités :**
  - KPIs globaux : taux de complétion des évaluations, PDI en retard, offboardings en cours
  - Graphiques Recharts (complétion, répartition par département)
  - Alertes et flags RH nécessitant une action
  - Accès rapide aux campagnes actives

### DashboardManagerPage
- **Route :** `/dashboard/manager`
- **Accès :** `manager`
- **Objectif :** Vue manager centrée sur l'équipe directe et les évaluations à mener.
- **Fonctionnalités :**
  - Liste des membres de l'équipe avec statut d'évaluation
  - Évaluations en attente de signature manager
  - PDI des collaborateurs à revoir
  - Notifications d'échéances proches

### DashboardAdminPage
- **Route :** `/dashboard/admin`
- **Accès :** `admin`
- **Objectif :** Vue administrateur avec état de santé de la plateforme et métriques système.
- **Fonctionnalités :**
  - Statut des services (API, MongoDB, SMTP, LDAP)
  - Métriques d'utilisation globales
  - Accès rapide aux outils d'administration
  - Journal d'activité récent

### DashboardDirectorPage
- **Route :** `/dashboard/director`
- **Accès :** `admin`, `rh` (profil direction)
- **Objectif :** Vue direction avec synthèse stratégique RH à l'échelle de l'entreprise.
- **Fonctionnalités :**
  - Synthèse des campagnes d'évaluation par département
  - Indicateurs de mobilité et de rétention
  - Export des données agrégées

### DashboardEmployeePage
- **Route :** `/dashboard/employee`
- **Accès :** `employee`
- **Objectif :** Vue employé avec le suivi personnel des évaluations et objectifs.
- **Fonctionnalités :**
  - Évaluations en cours et historique personnel
  - PDI actif et objectifs
  - Demandes de mobilité en cours
  - Notifications personnelles

---

## Campagnes d'évaluation

### CampaignsPage
- **Route :** `/campaigns`
- **Accès :** `rh`, `manager`, `admin`
- **Objectif :** Gestion des campagnes d'évaluation — liste, filtres et création.
- **Fonctionnalités :**
  - Liste paginée des campagnes (actives, archivées, brouillons)
  - Filtres par statut, période, département
  - Indicateurs de progression (% évaluations complètes)
  - Bouton de création d'une nouvelle campagne

### CampaignDetailPage
- **Route :** `/campaigns/:id`
- **Accès :** `rh`, `admin`
- **Objectif :** Détail d'une campagne — participants, suivi et actions de gestion.
- **Fonctionnalités :**
  - Liste des participants avec statut individuel (non démarré, en cours, signé)
  - Relances email groupées ou individuelles
  - Clôture et archivage de la campagne
  - Téléchargement du rapport de campagne (PDF)

### CampaignNewPage
- **Route :** `/campaigns/new`
- **Accès :** `rh`, `admin`
- **Objectif :** Création d'une nouvelle campagne d'évaluation.
- **Fonctionnalités :**
  - Formulaire multi-étapes : paramètres, sélection du modèle, participants, dates
  - Sélection du formulaire d'évaluation associé
  - Prévisualisation avant publication

### CampaignEditPage
- **Route :** `/campaigns/:id/edit`
- **Accès :** `rh`, `admin`
- **Objectif :** Modification d'une campagne existante (avant clôture).
- **Fonctionnalités :**
  - Édition des paramètres, dates et participants
  - Ajout/suppression de participants individuels
  - Changement de formulaire associé (si aucune évaluation démarrée)

### CampaignAnalyticsPage
- **Route :** `/campaigns/:id/analytics`
- **Accès :** `rh`, `admin`
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

### EvaluationFormPage
- **Route :** `/evaluations/:id/form`
- **Accès :** `employee`, `manager`
- **Objectif :** Formulaire de saisie d'une évaluation en cours.
- **Fonctionnalités :**
  - Rendu dynamique du formulaire (types de champs variés : texte, note, choix multiple)
  - Sauvegarde automatique des réponses (brouillon)
  - Soumission et déclenchement du workflow de signature
  - Validation côté client avant envoi

### EvaluationNewPage
- **Route :** `/evaluations/new`
- **Accès :** `rh`, `manager`
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

---

## Formulaires RH

### FormsPage
- **Route :** `/forms`
- **Accès :** `rh`, `admin`
- **Objectif :** Gestion des modèles de formulaires d'évaluation RH.
- **Fonctionnalités :**
  - Liste des formulaires (actifs, archivés, brouillons)
  - Duplication et archivage d'un formulaire
  - Indicateur du nombre de campagnes utilisant chaque formulaire

### FormDetailPage
- **Route :** `/forms/:id`
- **Accès :** `rh`, `admin`
- **Objectif :** Prévisualisation et gestion d'un modèle de formulaire.
- **Fonctionnalités :**
  - Aperçu du rendu final du formulaire
  - Accès à l'éditeur
  - Historique des modifications

### FormNewPage
- **Route :** `/forms/new`
- **Accès :** `rh`, `admin`
- **Objectif :** Création d'un nouveau modèle de formulaire d'évaluation.
- **Fonctionnalités :**
  - Éditeur drag-and-drop de sections et de champs (dnd-kit)
  - Types de champs : texte court, texte long, note (1-5), choix unique, choix multiple, case à cocher
  - Configuration de la pondération des sections
  - Sauvegarde en brouillon ou publication directe

### AdminFormsImportPage
- **Route :** `/admin/forms/import`
- **Accès :** `admin`
- **Objectif :** Import de modèles de formulaires depuis un fichier JSON ou CSV.
- **Fonctionnalités :**
  - Upload de fichier et validation du format
  - Prévisualisation avant import
  - Rapport d'import (succès / erreurs)

---

## Offboarding

### OffboardingPage
- **Route :** `/offboarding`
- **Accès :** `rh`, `admin`
- **Objectif :** Gestion des départs collaborateurs — liste et création de dossiers.
- **Fonctionnalités :**
  - Liste des départs (en cours, planifiés, clôturés)
  - Filtres par département, type de départ (démission, licenciement, retraite…)
  - Création d'un nouveau dossier de départ

### OffboardingDetailPage
- **Route :** `/offboarding/:id`
- **Accès :** `rh`, `admin`
- **Objectif :** Suivi et validation d'un dossier de départ collaborateur.
- **Fonctionnalités :**
  - Checklist de départ par étapes (IT, RH, manager, finance)
  - Attribution des tâches aux responsables
  - Suivi de l'avancement en temps réel
  - Clôture du dossier et archivage

### UserOffboardingPage
- **Route :** `/users/:id/offboarding`
- **Accès :** `rh`, `admin`
- **Objectif :** Vue offboarding centrée sur un utilisateur spécifique.
- **Fonctionnalités :**
  - Initiation d'un dossier de départ depuis la fiche utilisateur
  - Pré-remplissage des informations du collaborateur

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
- **Accès :** `rh`, `admin`
- **Objectif :** Tableaux de bord KPIs globaux et exports des données RH.
- **Fonctionnalités :**
  - Indicateurs agrégés : taux d'évaluation, scores moyens, distribution des notes
  - Graphiques interactifs Recharts (barres, radar, courbes)
  - Filtres par département, période, type de campagne
  - Export PDF (jsPDF) et CSV

### AnalyticsCampaignPage
- **Route :** `/analytics/campaigns`
- **Accès :** `rh`, `admin`
- **Objectif :** Analyse comparative des campagnes d'évaluation sur plusieurs périodes.
- **Fonctionnalités :**
  - Comparaison des taux de complétion entre campagnes
  - Évolution des scores dans le temps
  - Filtres par campagne, département, formulaire

---

## Gestion des utilisateurs

### UsersPage
- **Route :** `/users`
- **Accès :** `admin`, `rh`
- **Objectif :** Liste et recherche des utilisateurs de la plateforme.
- **Fonctionnalités :**
  - Tableau paginé avec recherche et filtres (rôle, département, statut)
  - Actions en masse (activer, désactiver, exporter)
  - Accès rapide à la fiche utilisateur

### UserDetailPage
- **Route :** `/users/:id`
- **Accès :** `admin`, `rh`
- **Objectif :** Fiche détaillée d'un utilisateur avec son historique RH.
- **Fonctionnalités :**
  - Informations personnelles et professionnelles
  - Historique des évaluations et PDI
  - Demandes de mobilité et offboarding associés
  - Actions rapides (modifier, désactiver, démarrer un offboarding)

### UserEditPage
- **Route :** `/users/:id/edit`
- **Accès :** `admin`, `rh`
- **Objectif :** Modification des informations d'un utilisateur.
- **Fonctionnalités :**
  - Édition du profil, du rôle, du département, du manager
  - Réinitialisation du mot de passe
  - Gestion de la synchronisation LDAP

### UserNewPage
- **Route :** `/users/new`
- **Accès :** `admin`
- **Objectif :** Création manuelle d'un compte utilisateur.
- **Fonctionnalités :**
  - Formulaire de création avec validation
  - Envoi d'un email de bienvenue avec lien de définition du mot de passe

### AdminUsersImportPage
- **Route :** `/admin/users/import`
- **Accès :** `admin`
- **Objectif :** Import en masse d'utilisateurs depuis un fichier CSV.
- **Fonctionnalités :**
  - Upload et validation du fichier CSV
  - Aperçu des données avant import
  - Rapport détaillé (lignes importées, erreurs, doublons)

### UserGroupsPage
- **Route :** `/users/groups`
- **Accès :** `admin`, `rh`
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
- **Route :** `/resources`
- **Accès :** tous
- **Objectif :** Bibliothèque de ressources RH (guides, modèles de documents, politiques).
- **Fonctionnalités :**
  - Recherche et filtres par catégorie
  - Téléchargement des documents
  - Gestion des ressources (rôles admin/rh)

### ResourceDetailPage
- **Route :** `/resources/:id`
- **Accès :** tous
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
- **Accès :** `admin`
- **Objectif :** Hub d'administration — configuration globale de la plateforme et accès à tous les outils admin.
- **Fonctionnalités :**
  - Navigation vers les sous-sections admin (utilisateurs, mail, LDAP, audit…)
  - Indicateurs de santé de la plateforme
  - Raccourcis vers les actions d'administration fréquentes

### AdminUsersPage
- **Route :** `/admin/users`
- **Accès :** `admin`
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
- **Route :** `/admin/mail`
- **Accès :** `admin`
- **Objectif :** Configuration du serveur SMTP pour les notifications email.
- **Fonctionnalités :**
  - Paramètres SMTP (hôte, port, TLS, authentification)
  - Test d'envoi d'email
  - Statut de la connexion SMTP

### AdminMailTemplatesPage
- **Route :** `/admin/mail/templates`
- **Accès :** `admin`
- **Objectif :** Gestion des modèles d'emails transactionnels.
- **Fonctionnalités :**
  - Édition des templates (invitation évaluation, relance, bienvenue…)
  - Variables dynamiques disponibles par template
  - Prévisualisation du rendu

### AdminMailTestPage
- **Route :** `/admin/mail/test`
- **Accès :** `admin`
- **Objectif :** Envoi d'un email de test pour vérifier la configuration SMTP.
- **Fonctionnalités :**
  - Formulaire d'envoi vers une adresse arbitraire
  - Affichage du résultat (succès / message d'erreur SMTP)

### AdminAuditPage
- **Route :** `/admin/audit`
- **Accès :** `admin`
- **Objectif :** Journal d'audit des actions sensibles effectuées sur la plateforme.
- **Fonctionnalités :**
  - Historique des actions (connexions, modifications, suppressions)
  - Filtres par utilisateur, date, type d'action
  - Export du journal

### AdminStatsPage
- **Route :** `/admin/stats`
- **Accès :** `admin`
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

### HrSettingsPage
- **Route :** `/hr/settings`
- **Accès :** `rh`, `admin`
- **Objectif :** Paramètres RH spécifiques (règles métier, notifications, workflows).
- **Fonctionnalités :**
  - Configuration des règles de relance automatique
  - Paramètres des workflows d'évaluation et de signature
  - Gestion des départements et des postes

### HrFlagsPage
- **Route :** `/hr/flags`
- **Accès :** `rh`, `admin`
- **Objectif :** Liste des flags RH — alertes nécessitant une attention particulière.
- **Fonctionnalités :**
  - Liste des signalements actifs (évaluations bloquées, PDI en retard, offboardings urgents)
  - Filtres par type et priorité
  - Assignation et résolution des flags

### HrFlagDetailPage
- **Route :** `/hr/flags/:id`
- **Accès :** `rh`, `admin`
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
- **Route :** `/preferences`
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

### OnboardingPage
- **Route :** `/onboarding`
- **Accès :** tous
- **Objectif :** Parcours d'accueil pour les nouveaux utilisateurs de la plateforme.
- **Fonctionnalités :**
  - Guide pas-à-pas des fonctionnalités principales
  - Complétion du profil obligatoire avant accès complet
  - Marquage de l'onboarding comme terminé

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
