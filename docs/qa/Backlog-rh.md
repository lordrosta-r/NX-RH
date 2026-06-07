# Backlog QA — Rôle RH (`hr`)

> Backlog d'assurance qualité exhaustif pour le rôle **RH** de NanoXplore RH (frontend-v2).
> Couvre toutes les actions accessibles au rôle `hr` : pilotage des campagnes d'évaluation,
> construction des formulaires, gestion des collaborateurs et des départements, suivi
> analytique, traitement des demandes/signaux RH et création de PDI.
>
> **Portée des droits RH (rappel des invariants).** Le RH partage l'essentiel des droits de
> l'admin sur les campagnes, formulaires, utilisateurs et demandes. Différences observées dans
> le code :
> - **Geler / dégeler un formulaire** : réservé à l'**admin** (`isAdmin`) — le RH ne voit pas
>   ces boutons (`FormDetailPage.tsx`).
> - **Compte actif & source d'authentification** (sécurité utilisateur) : réservés à l'**admin**
>   (`UserEditPage.tsx`, carte « Sécurité »).
> - **Signature de la synthèse** : le RH ne signe que la synthèse (`signed_hr`), pas l'évaluation
>   employé/manager — invariant métier hors écrans listés ici, à vérifier côté évaluations.
> - Navigation RH : `getPerspectiveNav('hr', 'work')` expose Collaborateurs (Utilisateurs, Org),
>   Campagnes (Campagnes, Formulaires), Évaluations (Évaluations, Historique, Demandes RH),
>   Administration ; + menu « more » : Calendrier, Ressources, Analytique, Départements.
>   En perspective `me`, le RH a Tableau de bord, Mes évaluations, Historique, Mobilité, PDI.
>
> Légende priorité : **P0** critique (bloque le métier), **P1** important, **P2** secondaire.

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| 1 | Accéder à la navigation RH (perspective « work ») | AppLayout (toutes routes) | Connecté en `hr`, perspective = work | Observer la barre de navigation | Groupes affichés : Collaborateurs, Campagnes, Évaluations, Administration + dashboard ; menu « more » : Calendrier, Ressources, Analytique, Départements | P1 |
| 2 | Basculer en perspective « Mon espace » (me) | AppLayout | Connecté en `hr`, `hasSwitch` vrai | Basculer la perspective vers « me » | Nav réduite : Tableau de bord, Mes évaluations, Historique, Mobilité, PDI | P2 |
| 3 | Lister les campagnes | `/campaigns` (CampaignsPage) | Connecté en `hr` | Ouvrir la page | Tableau des campagnes (nom, statut, période, progression %) ; onglets de statut all/draft/active/closed/archived ; bouton « Nouvelle campagne » visible (canManage) | P0 |
| 4 | Filtrer les campagnes par statut | `/campaigns` | Campagnes existantes | Cliquer un onglet de statut | Liste filtrée sur le statut choisi | P2 |
| 5 | Rechercher une campagne (debounce 400 ms) | `/campaigns` | Campagnes existantes | Saisir un terme dans la recherche | Indicateur « … » pendant la frappe puis liste filtrée par `q` | P2 |
| 6 | Exporter les campagnes en CSV | `/campaigns` | Au moins une campagne | Cliquer « Exporter » | Fichier `campagnes.csv` téléchargé (nom, statut, dateDebut, dateFin) | P2 |
| 7 | Démarrer la création d'une campagne | `/campaigns/new` (CampaignNewPage) | `hr` | Cliquer « Nouvelle campagne » | Wizard 4 étapes affiché (Informations, Formulaires, Public cible, Récapitulatif) avec stepper | P0 |
| 8 | Étape 1 — saisir nom + dates valides | `/campaigns/new` étape 0 | Wizard ouvert | Renseigner nom (≥2 car.), date début, date fin > début, puis « Suivant » | Validation OK, passage à l'étape 2 | P0 |
| 9 | Étape 1 — nom trop court | `/campaigns/new` étape 0 | Wizard ouvert | Saisir un nom < 2 caractères, « Suivant » | Erreur « Le nom doit contenir au moins 2 caractères », pas de passage | P1 |
| 10 | Étape 1 — date de fin ≤ date de début | `/campaigns/new` étape 0 | Wizard ouvert | Date fin antérieure/égale à la date début, « Suivant » | Erreur « La date de fin doit être après la date de début » (refine Zod), blocage | P0 |
| 11 | Étape 1 — date début ou fin manquante | `/campaigns/new` étape 0 | Wizard ouvert | Laisser une date vide, « Suivant » | Erreur « La date de début/fin est requise », blocage | P1 |
| 12 | Étape 1 — activer le contexte N-1 (édition précédente) | `/campaigns/new` étape 0 | Wizard ouvert | Activer le toggle N-1, choisir « Visible par l'employé » et une campagne source | Champs N-1 affichés ; campagnes source chargées (closed + archived) | P1 |
| 13 | Étape 2 — Formulaires (info) | `/campaigns/new` étape 1 | Wizard ouvert | Lire l'étape | Message indiquant que les formulaires se gèrent depuis la page campagne après création | P2 |
| 14 | Étape 3 — périmètre « Tous les collaborateurs » | `/campaigns/new` étape 2 | Wizard ouvert | Sélectionner scope = all | Aucun sous-champ requis ; payload `targetScope:'all'` | P0 |
| 15 | Étape 3 — périmètre « Par rôle » | `/campaigns/new` étape 2 | Wizard ouvert | Scope = role, cocher rôles (employee/manager/hr/admin) | `targetRoleIds` envoyés uniquement si scope=role | P1 |
| 16 | Étape 3 — périmètre « Par département » | `/campaigns/new` étape 2 | Départements configurés | Scope = department, cocher des départements | Liste chargée via adminApi ; `targetDepartments` envoyés (sinon ChipInput de secours) | P1 |
| 17 | Étape 3 — périmètre « Par secteur » | `/campaigns/new` étape 2 | Secteurs existants | Scope = sector, cocher des secteurs | Secteurs chargés (orgApi) ; `targetSectorIds` envoyés | P1 |
| 18 | Étape 3 — périmètre « Sélection manuelle (users) » | `/campaigns/new` étape 2 | Wizard ouvert | Scope = users, ajouter des identifiants via ChipInput | `targetUserIds` envoyés | P1 |
| 19 | Étape 3 — périmètre « Par groupe » | `/campaigns/new` étape 2 | Groupes existants | Scope = group, choisir un groupe | `targetGroupIds=[targetGroupId]` envoyé | P1 |
| 20 | Étape 3 — périmètre vide (rôle/dept/secteur/users/groupe sans sélection) | `/campaigns/new` étape 2 | Scope ≠ all sans sélection | Continuer puis soumettre | Le tableau d'ids reste vide/undefined ; vérifier le rejet ou l'avertissement backend (périmètre vide) | P1 |
| 21 | Étape 3 — visibilité étendue (N+2) | `/campaigns/new` étape 2 (et edit) | Wizard ouvert | Cocher « Visibilité étendue (managers voient N+2) » | `extendedVisibility:true` dans le payload | P2 |
| 22 | Étape 4 — récapitulatif et soumission | `/campaigns/new` étape 3 | Étapes valides | Vérifier le récap, cliquer « Créer » | POST /api/campaigns ; redirection vers `/campaigns/:id` ; campagne créée en statut `draft` | P0 |
| 23 | Naviguer en arrière dans le wizard | `/campaigns/new` | Étape > 0 | Cliquer « Précédent » | Retour à l'étape précédente sans perte de saisie | P2 |
| 24 | Consulter le détail d'une campagne | `/campaigns/:id` (CampaignDetailPage) | Campagne existante | Ouvrir la campagne | En-tête (nom, statut, dates), onglets Aperçu / Évaluations / Formulaires | P0 |
| 25 | Activer une campagne (draft → active) | `/campaigns/:id` | Campagne en `draft` | Cliquer « Activer la campagne » | Statut passe à `active` ; évaluations générées automatiquement (selon périmètre) | P0 |
| 26 | Clôturer une campagne (active → closed) | `/campaigns/:id` | Campagne en `active` | Cliquer « Clôturer la campagne » | Statut passe à `closed` | P0 |
| 27 | Archiver une campagne (closed → archived) | `/campaigns/:id` | Campagne en `closed` | Cliquer « Archiver » | Statut passe à `archived` | P1 |
| 28 | Bouton « Modifier » masqué si closed/archived | `/campaigns/:id` | Campagne closed ou archived | Observer l'en-tête | Le bouton « Modifier » n'apparaît pas (transition d'édition interdite) | P1 |
| 29 | Transition de statut interdite | `/campaigns/:id` | Campagne draft | Vérifier l'absence de « Clôturer »/« Archiver » sur un draft (seul « Activer ») | Seules les transitions légales sont proposées | P1 |
| 30 | Onglet Évaluations sur campagne draft | `/campaigns/:id` onglet Évaluations | Campagne `draft` | Ouvrir l'onglet | Message « Aucune évaluation disponible — la campagne est en brouillon » | P2 |
| 31 | Onglet Évaluations sur campagne active/closed | `/campaigns/:id` onglet Évaluations | Campagne non draft | Ouvrir l'onglet, suivre le lien | Lien vers `/evaluations?campaign=:id` | P2 |
| 32 | Associer un formulaire à la campagne | `/campaigns/:id` onglet Formulaires | Formulaires en bibliothèque | Ouvrir le modal d'ajout, sélectionner un formulaire | linkForm appelé ; formulaire ajouté à `formIds` | P0 |
| 33 | Dissocier un formulaire de la campagne | `/campaigns/:id` onglet Formulaires | Formulaire déjà lié | Retirer le formulaire | unlinkForm appelé ; formulaire retiré | P1 |
| 34 | Cloner une campagne (depuis le détail) | `/campaigns/:id` | Campagne existante | Menu actions → « Cloner » → confirmer dans le modal | cloneCampaign ; nouvelle campagne créée | P1 |
| 35 | Cloner une campagne (depuis la liste) | `/campaigns` menu ligne | Campagne existante | Menu « ⋮ » → « Cloner » | Clonage ; liste invalidée. Erreur → toast « Erreur lors du clonage » | P1 |
| 36 | Archiver depuis la liste (confirmation) | `/campaigns` menu ligne | Campagne active ou closed | Menu → « Archiver » → confirmer | Dialog `useConfirm` (warning) puis archivage | P1 |
| 37 | Supprimer une campagne (draft/archived) | `/campaigns` menu ligne | Campagne `draft` ou `archived` | Menu → « Supprimer » → confirmer | Dialog danger irréversible puis suppression ; option absente si active/closed | P1 |
| 38 | Voir les analytics depuis le détail | `/campaigns/:id/analytics` | Campagne existante | Menu actions → « Voir les analytics » | Redirection vers la page analytics de la campagne | P2 |
| 39 | Éditer une campagne — identité & dates | `/campaigns/:id/edit` (CampaignEditPage) | Campagne éditable (draft/active) | Modifier nom/description/dates, « Enregistrer » | PATCH /api/campaigns/:id ; redirection vers le détail | P0 |
| 40 | Éditer — date fin ≤ début | `/campaigns/:id/edit` | Édition ouverte | Mettre date fin ≤ début, « Enregistrer » | Erreur « La date de fin doit être après la date de début », pas d'envoi | P0 |
| 41 | Éditer — nom vide | `/campaigns/:id/edit` | Édition ouverte | Vider le nom, « Enregistrer » | Erreur « Le nom est requis », blocage | P1 |
| 42 | Éditer — changer le périmètre (hydratation depuis `targetScope`) | `/campaigns/:id/edit` | Campagne avec scope existant | Changer le scope et la sélection | Formulaire pré-rempli depuis `{scopeType, ids}` ; nouveau périmètre enregistré | P1 |
| 43 | Éditer — deadlines employé/manager | `/campaigns/:id/edit` | Édition ouverte | Renseigner les deadlines, enregistrer | `deadlineEmployee`/`deadlineManager` persistés | P2 |
| 44 | Éditer — reprise édition précédente (N-1) | `/campaigns/:id/edit` | Édition ouverte | Activer N-1, choisir source ou auto-sélection | `enableN1Context`, `n1VisibleToEmployee`, `previousCampaignId` persistés | P1 |
| 45 | Lister les formulaires | `/forms` (FormsPage) | Connecté en `hr` | Ouvrir la page | Grille de formulaires (type, nombre de questions, badge « Gelé » si applicable) ; bouton « Nouveau formulaire » (isAdminOrHr) | P0 |
| 46 | Filtrer les formulaires par type / campagne / recherche | `/forms` | Formulaires existants | Choisir type, campagne, ou saisir une recherche | Liste filtrée (debounce 400 ms sur la recherche) | P2 |
| 47 | Créer un formulaire — métadonnées | `/forms/new` (FormNewPage) | `hr` | Saisir titre, choisir catégorie + type | Builder affiché ; type requis (sauf catégorie personnalisée → `custom`) | P0 |
| 48 | Créer un formulaire — titre manquant | `/forms/new` | Builder ouvert | Laisser le titre vide, « Enregistrer » | Erreur « Le titre est requis », blocage | P1 |
| 49 | Créer un formulaire — type manquant | `/forms/new` | Builder ouvert | Aucune catégorie/type, « Enregistrer » | Erreur « Choisissez une catégorie et un type », blocage | P1 |
| 50 | Créer une catégorie personnalisée | `/forms/new` / `/forms/:id` (CategoryTypeSelect) | Builder ouvert | « Nouvelle » → saisir un libellé → valider | Catégorie créée, auto-sélectionnée ; type passe à `custom` si catégorie sans types | P2 |
| 51 | Ajouter une question type « Note (1-10) / rating » | FormBuilder | Builder ouvert | Ajouter une question, type = rating, régler l'échelle (3..10) | Question rating avec `scale` configurée ; aperçu inline | P1 |
| 52 | Ajouter une question type « Texte libre » | FormBuilder | Builder ouvert | Type = text | Question text créée | P1 |
| 53 | Ajouter une question type « Oui / Non » | FormBuilder | Builder ouvert | Type = yes_no | Question yes_no créée | P1 |
| 54 | Ajouter une question type « Choix multiple » | FormBuilder | Builder ouvert | Type = choice, ajouter ≥ 2 options | Question choice valide | P1 |
| 55 | Choix multiple avec < 2 options | `/forms/new` | Question choice | Laisser 0 ou 1 option remplie, enregistrer | Erreur « Une question à choix doit avoir au moins 2 options » | P1 |
| 56 | Ajouter une question type « Météo humeur » | FormBuilder | Builder ouvert | Type = weather | Question weather créée (aperçu icônes) | P2 |
| 57 | Ajouter une question type « Souhait mobilité » | FormBuilder | Builder ouvert | Type = mobility | Question mobility créée | P2 |
| 58 | Ajouter une question type « Curseur 0-100% (scale) » | FormBuilder | Builder ouvert | Type = scale | Question scale créée | P2 |
| 59 | Ajouter une question type « Objectif structuré » | FormBuilder | Builder ouvert | Type = objective_item | Question objective_item créée | P2 |
| 60 | Question sans intitulé | `/forms/new` | Une question vide | Laisser le texte vide, enregistrer | Erreur « Chaque question doit avoir un intitulé » | P1 |
| 61 | Marquer une question obligatoire | FormBuilder (ConfigPanel) | Question sélectionnée | Cocher « Réponse obligatoire » | `required:true` sur la question | P2 |
| 62 | Définir la phase d'une question | FormBuilder | Question sélectionnée | Choisir phase (self/objectives/aspirations/all) | `phase` mise à jour | P2 |
| 63 | Réordonner les questions par drag & drop | FormBuilder | ≥ 2 questions | Glisser une carte question | Ordre mis à jour (`order` recalculé) | P2 |
| 64 | Supprimer une question | FormBuilder | ≥ 1 question | Cliquer la corbeille de la carte | Question retirée ; panneau config désélectionné si active | P2 |
| 65 | Activer « Reprendre l'édition précédente » (carryPrevious) par question | FormBuilder (ConfigPanel) | Question sélectionnée | Cocher « Reprendre l'édition précédente » | `carryPrevious:true` ; bloc de liaison affiché ; aide « ? » disponible | P1 |
| 66 | Lier manuellement à une question parente (formulaire créé de zéro) | FormBuilder (LinkPreviousQuestion) | carryPrevious activé | Choisir formulaire source puis question à lier | `parentQuestionId` renseigné ; état « Lié ✓ » | P1 |
| 67 | Délier une question parente | FormBuilder | Question liée | Cliquer « Délier » | `parentQuestionId` = null | P2 |
| 68 | Options de diffusion — campagne liée / anonyme / rempli par / visible par l'évalué | `/forms/new` | Builder ouvert | Régler campagne, anonyme, `filledBy` (employee/manager/hr), `visibleToEvaluatee` | Champs persistés ; `campaignId` vide non envoyé | P1 |
| 69 | Enregistrer le formulaire | `/forms/new` | Champs valides | « Enregistrer » | POST /api/forms ; redirection `/forms/:id` | P0 |
| 70 | Importer un formulaire JSON | `/admin/forms/import` (lien depuis FormNewPage) | `hr` | Suivre « Importer un JSON » | Redirection vers l'écran d'import | P2 |
| 71 | Consulter / éditer un formulaire | `/forms/:id` (FormDetailPage) | Formulaire existant, non gelé | Ouvrir, modifier titre/questions, « Enregistrer » | PUT /api/forms/:id (champs : titre, description, catégorie, filledBy, visibleToEvaluatee, questions) ; bouton actif seulement si `isDirty` | P0 |
| 72 | Type verrouillé en édition (lockType) | `/forms/:id` | Formulaire existant | Tenter de changer le type | Le type est en lecture seule en édition (lockType) | P2 |
| 73 | Exporter un formulaire en JSON | `/forms/:id` | `hr` | Cliquer « Exporter JSON » | Téléchargement `form-:id.json` | P2 |
| 74 | Cloner un formulaire (conserve la filiation) | `/forms` (modal clone) | Formulaire existant | Bouton dupliquer → confirmer | cloneForm ; copie « Copie de … », non gelée, sans campagne ; filiation des questions conservée (rappel N-1) | P1 |
| 75 | Supprimer un formulaire non gelé | `/forms` ou `/forms/:id` | Formulaire non gelé, isAdminOrHr | Corbeille → confirmer (irréversible) | deleteForm ; suppression, retour à la liste | P1 |
| 76 | Geler / dégeler un formulaire — interdit au RH | `/forms/:id` | Connecté en `hr` | Observer les actions du formulaire | Boutons « Geler »/« Dégeler » **absents** (réservés admin) ; sécurité respectée | P0 |
| 77 | Formulaire gelé — non modifiable | `/forms/:id` | Formulaire `isFrozen` | Ouvrir le formulaire gelé | Questions en lecture seule ; bandeau « Formulaire gelé » ; titre/description restent éditables ; suppression masquée | P1 |
| 78 | Lister les collaborateurs | `/users` (UsersPage) | `hr` | Ouvrir la page | Tableau paginé ; filtres rôle/département/statut/recherche ; en-tête avec total | P0 |
| 79 | Filtrer / rechercher les collaborateurs | `/users` | Utilisateurs existants | Régler filtres et recherche | Liste filtrée ; bouton de réinitialisation si filtres actifs | P2 |
| 80 | Créer un collaborateur | `/users/new` (UserNewPage) | `hr` | Renseigner prénom, nom, email, rôle (+ dépt, poste, manager), « Créer » | POST /api/users ; modal de mot de passe temporaire (visible une seule fois) ; bouton « Voir le profil » | P0 |
| 81 | Créer — champs requis manquants (Zod) | `/users/new` | Formulaire ouvert | Soumettre sans prénom/nom/email/rôle | Erreurs de validation par champ, blocage | P1 |
| 82 | Créer — email au format invalide | `/users/new` | Formulaire ouvert | Email mal formé | Erreur de validation email | P1 |
| 83 | Copier le mot de passe temporaire | `/users/new` (modal) | Utilisateur créé | Cliquer l'icône copier | Mot de passe copié ; toast « Copié ! » ; non réaffiché après fermeture | P2 |
| 84 | Rattacher un responsable direct à la création | `/users/new` | Utilisateurs actifs existants | Sélectionner un manager dans la liste | `managerId` envoyé | P1 |
| 85 | Éditer un collaborateur (RH = canEditAll) | `/users/:id/edit` (UserEditPage) | `hr` | Modifier infos/poste/rôle/manager, « Enregistrer » | PATCH /api/users/:id ; toast + redirection profil | P0 |
| 86 | Éditer — validations (prénom/nom/email/rôle) | `/users/:id/edit` | Édition ouverte | Vider un champ requis ou email invalide | Erreurs par champ, blocage | P1 |
| 87 | Changer le rôle manager → autre avec équipe (remplaçant requis) | `/users/:id/edit` | Cible = manager avec subordonnés | Mettre rôle ≠ manager sans remplaçant | Champ « Remplaçant pour l'équipe » requis ; erreur si vide ; aussi gérée en retour 400 backend | P0 |
| 88 | Réattribuer l'équipe à un remplaçant (offboarding hiérarchique) | `/users/:id/edit` | needsReplacement vrai | Choisir un remplaçant manager, enregistrer | `replacementManagerId` envoyé ; équipe transférée | P0 |
| 89 | Activer « Voir toute la descendance » (canViewSubtree) | `/users/:id/edit` | Cible = manager, éditeur hr/admin | Basculer le toggle, enregistrer | `canViewSubtree` envoyé (rôle manager uniquement) | P2 |
| 90 | Compte actif / source d'auth — réservés admin | `/users/:id/edit` | Connecté en `hr` | Observer la carte « Sécurité » | Carte **absente** pour le RH (réservée admin) ; le RH ne gère pas isActive/authSource | P1 |
| 91 | Désactivation en masse de collaborateurs | `/users` (UsersTable) | Sélection multiple | Sélectionner des lignes → « Désactiver » | Désactivation groupée (offboarding) | P1 |
| 92 | Anonymiser un collaborateur (RGPD) | `/users` (UsersTable) | Utilisateur cible | Action → confirmer (danger, irréversible) | anonymizeMutation ; données personnelles effacées, historique d'évaluations conservé | P1 |
| 93 | Export en masse de collaborateurs | `/users` | Sélection multiple | « Exporter » la sélection | Export des collaborateurs sélectionnés | P2 |
| 94 | Importer des collaborateurs | `/users` (UserImportModal) | `hr` | Ouvrir le modal d'import | Modal d'import affiché | P2 |
| 95 | Gérer les départements | `/admin/departments` (DepartmentsPage) | `hr` | Ajouter / renommer / supprimer des départements puis « Enregistrer » | updateDepartments ; toast « Enregistré » ; bouton actif seulement si modifications | P1 |
| 96 | Département en doublon | `/admin/departments` | Liste existante | Ajouter un nom déjà présent | Toast « Doublon … existe déjà », pas d'ajout | P2 |
| 97 | Consulter l'analytique RH globale | `/analytics` (AnalyticsPage) | `hr` | Ouvrir la page (« Toutes les campagnes ») | KPIs (total, score moyen, complétion, validées), donut des statuts, top 5, complétion par département | P1 |
| 98 | Filtrer l'analytique par campagne | `/analytics` | Campagnes existantes | Sélectionner une campagne | Vue par campagne (totalAssigned, completionRate, distribution des scores) | P2 |
| 99 | Exporter l'analytique en PDF / CSV | `/analytics` | Données disponibles | Cliquer « Exporter PDF » / « Exporter CSV » | Téléchargement `analytics-rapport.pdf` / `analytics-export.csv` ; respect du filtre campagne | P2 |
| 100 | Erreur de chargement analytique + réessai | `/analytics` | Backend en erreur | Provoquer l'erreur, cliquer « Réessayer » | Bandeau d'erreur affiché ; refetch au clic | P2 |
| 101 | Analytique d'une campagne (route dédiée) | `/campaigns/:id/analytics` ou `/analytics/campaigns/:id` (AnalyticsCampaignPage) | Campagne existante | Ouvrir la page | Indicateurs détaillés de la campagne | P2 |
| 102 | Lister et filtrer les Demandes RH (signaux) | `/hr/flags` (HrFlagsPage) | `hr` | Ouvrir, filtrer par statut/type | Tableau (collaborateur, type, date, statut) ; filtres pending/in_progress/treated/rejected et types | P1 |
| 103 | Traiter un signal RH — changer le statut + note | `/hr/flags` (slide-over) | Signal existant | Ouvrir le détail, saisir une note, changer le statut, « Sauvegarder » | updateFlagStatus ; statut/note persistés ; slide-over fermé ; liste invalidée | P1 |
| 104 | État vide « Aucun signal RH » | `/hr/flags` | Aucun flag | Filtrer sans résultat | Empty state affiché | P2 |
| 105 | Lister les Demandes (mobilité/promotion/augmentation/formation) | `/mobility` (MobilityPage) | `hr` (isHrAdmin) | Ouvrir la page | KPIs (total/en attente/approuvées/refusées) ; stats RH (taux d'approbation, délai moyen) ; table avec priorité et date effective | P1 |
| 106 | Filtrer les demandes par statut / type | `/mobility` | Demandes existantes | Régler les filtres statut et type | Liste filtrée | P2 |
| 107 | Traiter une demande de mobilité (décision RH) | `/mobility` (modal « Traiter ») | Demande existante, isHrAdmin | « Traiter → », saisir commentaire, choisir under_review/approved/rejected/on_hold | PATCH /mobility/:id ; statut + hrComment persistés ; modal fermé | P1 |
| 108 | Implémenter une demande approuvée | `/mobility` | Demande `approved` non implémentée | Cliquer « Implémenter » | POST /mobility/:id/complete ; statut implémentation = completed ; stats invalidées | P2 |
| 109 | Voir la timeline d'une demande | `/mobility` (modal timeline) | Demande existante | Cliquer l'icône timeline | Timeline affichée (créée, examinée, décision, implémentation) | P2 |
| 110 | Créer une nouvelle demande (formulaire unifié) | `/mobility` (modal) | `hr` | « Nouvelle demande », choisir catégorie, remplir, « Soumettre » | POST /mobility ; validation : poste visé requis pour mobilité/promotion, description requise sinon, libellé requis pour « Autre » | P2 |
| 111 | Demande invalide (validation conditionnelle) | `/mobility` (modal) | Modal ouvert | Catégorie mobilité/promotion sans poste visé, ou « Autre » sans libellé | Bouton « Soumettre » désactivé (isRequestValid) | P2 |
| 112 | Lister les PDI | `/pdi` (PDIPage) | `hr` | Ouvrir la page, filtrer par statut | Liste des PDI (employé, manager, période, actions, progression) ; filtres draft/active/completed/archived | P1 |
| 113 | Créer un PDI | `/pdi` (formulaire inline) | `hr` (canCreate) | « Nouveau PDI », saisir ID employé, ID manager, dates période, notes, « Créer » | POST /pdi ; PDI créé ; formulaire réinitialisé | P1 |
| 114 | PDI — champs requis manquants | `/pdi` | Formulaire ouvert | Laisser employé/manager/dates vides | Bouton « Créer » désactivé tant que les champs requis manquent | P1 |
| 115 | Consulter le détail d'un PDI | `/pdi/:id` | PDI existant | Cliquer une ligne PDI | Page détail du PDI (objectifs, actions, signatures employé/manager) | P2 |
| 116 | Signer uniquement la synthèse (invariant RH) | Écrans évaluations (hors périmètre listé) | Évaluation en cours | Vérifier les actions de signature pour le RH | Le RH ne peut signer que la **synthèse** (`signed_hr`) ; pas les signatures évalué/manager | P0 |
