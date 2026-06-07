# Backlog QA — Rôle Employé (employee)

Backlog de test exhaustif couvrant **toutes les actions** réalisables par un utilisateur ayant le rôle `employee` (collaborateur) dans l'application NanoXplore RH (frontend-v2).

Périmètre couvert : connexion/déconnexion, tableau de bord collaborateur, barre supérieure (recherche, aide, notifications, profil, langue, perspective), remplissage d'auto-évaluation (tous les types de question), sauvegarde automatique, accordéon « édition précédente » (contexte N-1), soumission, prise de connaissance / signature / contestation, signatures électroniques, historique d'entretiens, demandes (mobilité/promotion/augmentation/formation via `/mobility` et `/profile`), PDI (lecture), profil (info, avatar, préférences, données RGPD), notifications, et cas d'erreur (champ requis, lecture seule après soumission).

Navigation employé (`getPerspectiveNav('employee', 'me', t)`) : **Tableau de bord**, **Mes évaluations** (`/evaluations`), **Historique** (`/evaluations/history`), **Demandes/Mobilité** (`/mobility`), **PDI** (`/pdi`). L'employé n'a **pas** de switch de perspective (toujours « me »).

Priorités : **P1** = parcours critique cœur métier · **P2** = important · **P3** = secondaire/confort.

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| 1 | Se connecter (login local) | `/login` | Compte employé local actif | Saisir email + mot de passe, cliquer « Se connecter » | Redirection vers `/` (ou `redirect`), session JWT cookie posée | P1 |
| 2 | Login — mauvais identifiants (401) | `/login` | — | Saisir un mauvais mot de passe et soumettre | Alerte d'erreur `auth.loginError`, pas de redirection | P1 |
| 3 | Login — trop de tentatives (429) | `/login` | Rate-limit atteint | Soumettre plusieurs fois | Alerte warning `auth.tooManyAttempts` | P3 |
| 4 | Login — compte désactivé (403) | `/login` | Compte employé désactivé | Soumettre des identifiants valides d'un compte off | Alerte erreur `auth.accountDisabled` | P2 |
| 5 | Login — validation Zod email vide/invalide | `/login` | — | Laisser email vide ou format invalide, soumettre | Message d'erreur sous le champ, pas d'appel API | P2 |
| 6 | Afficher/masquer le mot de passe | `/login` | — | Cliquer l'icône œil dans le champ mot de passe | Le mot de passe bascule en clair/masqué | P3 |
| 7 | Cocher « Se souvenir de moi » | `/login` | — | Cocher la case puis se connecter | Session prolongée (remember=true transmis) | P3 |
| 8 | Voir le tableau de bord collaborateur | `/` | Connecté employé | Arriver sur `/` | En-tête « Bonjour {prénom} », tuiles évaluations/événements/ressources/historique/demandes | P1 |
| 9 | Repérer une éval **assignée à commencer** | `/` | ≥1 éval statut `assigned` | Lire la tuile « Mes évaluations en cours » | Badge « Assignée » (ambre) + bouton **Commencer** | P1 |
| 10 | Cliquer « Commencer » sur une éval assignée | `/` → `/evaluations/:id` | Éval `assigned`, user = evaluatee/evaluator | Cliquer « Commencer » | Ouverture en mode `fill` (formulaire de remplissage) | P1 |
| 11 | Cliquer « Continuer » sur éval en cours | `/` → `/evaluations/:id` | Éval `in_progress` | Cliquer « Continuer » | Ouverture en mode `fill` avec réponses déjà saisies | P1 |
| 12 | Lien « Tout voir » évaluations | `/` → `/evaluations` | — | Cliquer « Tout voir → » | Navigation vers la liste des évaluations | P3 |
| 13 | Voir prochains événements (dashboard) | `/` | — | Lire la tuile « Prochains événements » | Liste (max 3) ou « Aucun événement à venir » | P3 |
| 14 | Lien « Voir tout » événements | `/` → `/events` | — | Cliquer le lien | Navigation vers `/events` | P3 |
| 15 | Voir ressources récentes (dashboard) | `/` | — | Lire la tuile « Ressources récentes » | Liste (max 3) publiées ou message vide | P3 |
| 16 | Ouvrir une ressource depuis dashboard | `/` → `/resources/:id` | ≥1 ressource | Cliquer « Voir » sur une ressource | Navigation vers le détail ressource | P3 |
| 17 | Voir mon historique (dashboard) | `/` | — | Lire la tuile « Mon historique » | Évals `validated` (max 5) avec score + « Voir PDF → » | P2 |
| 18 | Ouvrir PDF historique (dashboard) | `/` → `/evaluations/:id` | Éval validée | Cliquer « Voir PDF → » | Navigation vers le détail (lecture seule) | P2 |
| 19 | Accès rapide « Demande de mobilité » | `/` → `/mobility/new` | — | Cliquer la tuile dans « Mes demandes » | Navigation vers création de demande | P2 |
| 20 | Accès rapide « Mise à jour profil » | `/` → `/profile` | — | Cliquer la tuile | Navigation vers `/profile` | P3 |
| 21 | Accès rapide « Documents RH » | `/` → `/documents` | — | Cliquer la tuile | Navigation `/documents` (vérifier route existante / 404) | P3 |
| 22 | Lister mes évaluations | `/evaluations` | Connecté employé | Arriver sur la page | Cartes (vue employee) via `getMyEvaluations`, ou état vide | P1 |
| 23 | Filtrer mes évals par campagne | `/evaluations` | — | Choisir une campagne dans le select | Liste filtrée, pagination remise à 1 | P3 |
| 24 | Filtrer mes évals par statut | `/evaluations` | — | Sélectionner un statut (select multiple) | Filtre appliqué si un seul statut sélectionné | P3 |
| 25 | Ouvrir une éval à remplir (carte) | `/evaluations` → `/evaluations/:id` | Éval `assigned`/`in_progress` | Cliquer **Remplir** | Mode `fill` ouvert | P1 |
| 26 | Ouvrir une éval terminée (carte) | `/evaluations` → `/evaluations/:id` | Statut ≥ submitted | Cliquer **Voir** | Mode `review`/`sign`/`readonly` selon statut | P2 |
| 27 | État vide « aucune évaluation active » | `/evaluations` | Aucune éval | Charger la page | EmptyState « Vous n'avez pas d'évaluation active » | P3 |
| 28 | Répondre à une question **rating** (1–5) | `/evaluations/:id` (fill) | Question type `rating` | Cliquer une pastille 1 à 5 | Pastille sélectionnée (bleu), valeur enregistrée | P1 |
| 29 | Saisir le **commentaire** d'un rating | `/evaluations/:id` (fill) | Question `rating` | Saisir texte dans « Note (optionnelle) » | Stocké sous `{id}_note` | P3 |
| 30 | Répondre à une question **text/textarea** | `/evaluations/:id` (fill) | Question `text`/`textarea` | Taper une réponse | Valeur conservée dans `answers[id]` | P1 |
| 31 | Répondre à une question **yes_no** | `/evaluations/:id` (fill) | Question `yes_no` | Cliquer « Oui » ou « Non » | Option sélectionnée (bleu) | P1 |
| 32 | Répondre à une question **choice** | `/evaluations/:id` (fill) | Question `choice` avec options | Cliquer une option | Option sélectionnée | P1 |
| 33 | Répondre à une question **scale** (0–100, pas 5) | `/evaluations/:id` (fill) | Question `scale` | Déplacer le curseur range | Valeur % affichée et enregistrée | P1 |
| 34 | Répondre à une question **weather** (humeur) | `/evaluations/:id` (fill) | Question `weather` | Cliquer Ensoleillé/Nuageux/Pluvieux/Orageux | État sélectionné (clé stockée) | P2 |
| 35 | Renseigner un **objective_item** | `/evaluations/:id` (fill) | Question `objective_item` | Saisir description + déplacer avancement | Objet `{description, progress}` enregistré | P2 |
| 36 | Renseigner une question **mobility** | `/evaluations/:id` (fill) | Question `mobility` | Choisir souhait + précisions | Objet `{wish, details}` enregistré | P2 |
| 37 | Naviguer « Suivant » entre questions | `/evaluations/:id` (fill) | ≥2 questions | Cliquer « Suivant → » | Question suivante affichée, compteur incrémenté | P1 |
| 38 | Naviguer « Précédent » | `/evaluations/:id` (fill) | idx > 0 | Cliquer « ← Précédent » | Question précédente ; bouton désactivé à idx 0 | P2 |
| 39 | Naviguer par **phase** (onglets) | `/evaluations/:id` (fill) | Formulaire multi-phases | Changer de phase | Questions filtrées par phase, idx remis à 0 | P2 |
| 40 | Voir la progression (X répondues / N) | `/evaluations/:id` (fill) | — | Observer la barre de progression | answeredCount / totalQuestions à jour | P3 |
| 41 | **Sauvegarde automatique** des réponses | `/evaluations/:id` (fill) | — | Modifier une réponse, attendre | Indicateur « Enregistrement… » puis « Sauvegardé à HH:MM » | P1 |
| 42 | Sauvegarde — échec réseau | `/evaluations/:id` (fill) | Backend KO | Modifier une réponse hors-ligne | « ⚠ Échec d'enregistrement — réponses conservées localement » | P2 |
| 43 | Ouvrir l'accordéon « Édition précédente » | `/evaluations/:id` (fill) | Question `carryPrevious=true` + réponse N-1 existante | Déplier `<details>` sous la question | Affiche la réponse de la campagne N-1 (AnswerView) | P2 |
| 44 | Accordéon absent si pas de contexte N-1 | `/evaluations/:id` (fill) | Pas de réponse N-1 / 204 | Charger une question carryPrevious sans lignée | Aucun accordéon rendu | P3 |
| 45 | Ouvrir la modale de soumission | `/evaluations/:id` (fill) | Dernière question atteinte | Cliquer « Soumettre l'évaluation » | Modale « Confirmer la soumission ? » | P1 |
| 46 | Avertissement questions non répondues | `/evaluations/:id` (fill) | answeredCount < total | Ouvrir la modale | Mention « N question(s) non répondue(s) » en ambre | P2 |
| 47 | Confirmer la soumission | `/evaluations/:id` (fill) | saveState OK | Cliquer « Confirmer la soumission » | submitMutation, statut → `submitted`, passage en lecture seule | P1 |
| 48 | Soumission bloquée si sauvegarde en cours/échec | `/evaluations/:id` (fill) | saveState = saving/error | Tenter de soumettre | Bouton désactivé + tooltip explicatif | P2 |
| 49 | Annuler la soumission | `/evaluations/:id` (fill) | Modale ouverte | Cliquer « Annuler » | Modale fermée, aucune soumission | P3 |
| 50 | Éval déjà soumise = **lecture seule** | `/evaluations/:id` | Statut `submitted`+, user employee | Rouvrir l'éval | Pas de mode `fill` ; affichage compte-rendu/lecture seule | P1 |
| 51 | Voir le compte-rendu (stepper) | `/evaluations/:id` (sign) | Statut reviewed/signed… | Ouvrir l'éval | Stepper Soumis→Révisé→Signé(évalué/resp/RH), score, objectifs N+1 | P2 |
| 52 | Saisir mon commentaire de prise de connaissance | `/evaluations/:id` (sign) | Statut `reviewed` + isEvaluatee | Taper dans « Mon commentaire (facultatif) » | Texte conservé pour la signature | P2 |
| 53 | Cocher « Je signale un désaccord » | `/evaluations/:id` (sign) | Statut `reviewed` + isEvaluatee | Cocher la case | disagreementFlag = true | P2 |
| 54 | **Signer** et valider la prise de connaissance | `/evaluations/:id` (sign) | Statut `reviewed` + isEvaluatee | Cliquer « Signer et valider la prise de connaissance » | signWithCommentMutation, statut → `signed_evaluatee` | P1 |
| 55 | **Contester** l'évaluation (ouvrir litige) | `/evaluations/:id` (sign) | Statut `reviewed` + isEvaluatee | Cliquer « Contester » → confirmer dans ConfirmDialog | disputeMutation, statut → `disputed`, transmis RH | P1 |
| 56 | Annuler la contestation | `/evaluations/:id` (sign) | ConfirmDialog ouvert | Cliquer « Annuler » | Pas de litige ouvert | P3 |
| 57 | Signature électronique (SignatureSection) | `/evaluations/:id` (sign) | Statut signant + user = evaluatee, pas déjà signé | Cocher la confirmation puis « Signer cette évaluation » | signMutation, signature horodatée ajoutée | P1 |
| 58 | Signer bloqué sans cocher la confirmation | `/evaluations/:id` (sign) | canSign vrai | Ne pas cocher, observer le bouton | Bouton « Signer » désactivé | P2 |
| 59 | Voir l'état des signatures | `/evaluations/:id` (sign) | — | Lire la section « Signatures électroniques » | Badges Évalué/Évaluateur/RH (signé/en attente), « Complètes » si OK | P3 |
| 60 | Voir bandeau litige en cours | `/evaluations/:id` | Statut `disputed` | Ouvrir l'éval | Callout rouge « arbitrage RH en cours » + commentaire | P3 |
| 61 | Éval introuvable / accès refusé | `/evaluations/:id` | id invalide ou non autorisé | Ouvrir un id inexistant | « Évaluation introuvable ou accès refusé » + retour | P2 |
| 62 | Consulter l'historique d'entretiens | `/evaluations/history` | Connecté employé | Arriver sur la page | Tableau (campagne/statut/score/validée le) via `getHistory` | P1 |
| 63 | Filtrer l'historique par année | `/evaluations/history` | ≥1 éval | Choisir une année | Tableau filtré | P3 |
| 64 | Filtrer l'historique par campagne | `/evaluations/history` | ≥1 éval | Choisir une campagne | Tableau filtré | P3 |
| 65 | Ouvrir un compte-rendu depuis l'historique | `/evaluations/history` → `/evaluations/:id` | — | Cliquer « Voir le compte-rendu » | Détail en lecture seule | P2 |
| 66 | Télécharger le PDF d'une éval historique | `/evaluations/history` | Éval terminée | Cliquer l'icône télécharger | Ouverture `/api/evaluations/:id/pdf` (nouvel onglet) | P2 |
| 67 | État vide historique | `/evaluations/history` | Aucune éval | Charger | « Aucun entretien terminé pour l'instant » | P3 |
| 68 | Ouvrir la page Demandes (Mobilité) | `/mobility` | Connecté employé | Arriver sur la page | Onglets « Mes demandes »/« Historique », KPIs, bouton « + Nouvelle demande » | P1 |
| 69 | Ouvrir la modale « Nouvelle demande » | `/mobility` | — | Cliquer « + Nouvelle demande » | Modale avec catégorie, champs, motivation | P1 |
| 70 | Créer une demande de **mobilité** | `/mobility` | Catégorie « Mobilité » | Saisir poste visé (requis), dépt, nature, motivation → « Soumettre » | createMutation, demande créée, modale fermée | P1 |
| 71 | Créer une demande **promotion** | `/mobility` | Catégorie « Promotion » | Saisir poste visé (requis) + motivation → Soumettre | Demande créée | P2 |
| 72 | Créer une demande **augmentation/formation** | `/mobility` | Catégorie augmentation/formation | Saisir description (requise) → Soumettre | Demande créée | P2 |
| 73 | Créer une demande **« Autre »** (libellé libre) | `/mobility` | Catégorie « Autre » | Saisir « Précisez » (requis) + description → Soumettre | Demande créée avec customCategory | P2 |
| 74 | Validation — bouton Soumettre désactivé | `/mobility` | Champs requis manquants | Laisser poste visé / description / précisez vide | Bouton « Soumettre » désactivé (isRequestValid=false) | P1 |
| 75 | Annuler la nouvelle demande | `/mobility` | Modale ouverte | Cliquer « Annuler » | Modale fermée, formulaire reset | P3 |
| 76 | Filtrer mes demandes par statut | `/mobility` | — | Cliquer un chip (En attente, Approuvée…) | Liste filtrée | P3 |
| 77 | Voir la timeline d'une demande | `/mobility` | ≥1 demande | Cliquer l'icône ⏱ | Modale timeline (créée/examen/décision/implémentation) | P3 |
| 78 | Onglet « Historique » mobilité | `/mobility` | Employé non HR | Cliquer l'onglet « Historique » | Liste historique avec timeline par demande | P2 |
| 79 | Relancer une demande refusée | `/mobility` (historique) | Demande `rejected` | Cliquer « ↩ Relancer cette demande » | reopenMutation, demande relancée | P2 |
| 80 | État vide mobilité | `/mobility` | Aucune demande | Charger | « Aucune demande de mobilité » | P3 |
| 81 | Consulter la liste des PDI | `/pdi` | Connecté employé | Arriver sur la page | Liste des PDI (lecture), bouton « Nouveau PDI » **absent** (employee ne peut créer) | P2 |
| 82 | Filtrer les PDI par statut | `/pdi` | — | Cliquer un chip (Brouillon/Actif/Terminé/Archivé) | Liste filtrée | P3 |
| 83 | Ouvrir le détail d'un PDI | `/pdi` → `/pdi/:id` | ≥1 PDI | Cliquer une carte PDI | Navigation vers le détail | P2 |
| 84 | Vérifier absence du bouton « Nouveau PDI » | `/pdi` | Rôle employee | Observer l'en-tête | Bouton de création non rendu (canCreate=false) | P2 |
| 85 | État vide PDI | `/pdi` | Aucun PDI | Charger | « Aucun PDI trouvé » | P3 |
| 86 | Ouvrir mon profil | `/profile` | Connecté employé | Cliquer avatar → Profil, ou `/profile` | En-tête profil + onglets Info/Avatar/Préférences/Données/Demandes | P1 |
| 87 | Passer en mode édition du profil | `/profile` | — | Cliquer « Modifier » (header ou onglet Info) | Champs Prénom/Nom éditables | P2 |
| 88 | Modifier prénom/nom | `/profile` (Info) | editMode | Modifier les champs → « Sauvegarder » | saveInfoMutation, refreshUser, sortie d'édition | P2 |
| 89 | Annuler l'édition profil | `/profile` (Info) | editMode | Cliquer « Annuler » | Champs réinitialisés aux valeurs user | P3 |
| 90 | Vérifier champs lecture seule (email/rôle/dépt/poste/manager) | `/profile` (Info) | — | Observer les champs non éditables | Affichés en lecture seule (email/rôle/manager non modifiables) | P3 |
| 91 | Changer l'avatar — choisir un fichier | `/profile` (Avatar) | — | Onglet Avatar → « Choisir une image » | Sélecteur de fichier ouvert, aperçu affiché | P3 |
| 92 | Avatar — format non supporté | `/profile` (Avatar) | — | Choisir un .gif/.pdf | Erreur « Format non supporté. Utilisez JPEG, PNG ou WebP. » | P2 |
| 93 | Avatar — fichier trop volumineux (>2 Mo) | `/profile` (Avatar) | — | Choisir une image > 2 Mo | Erreur « Fichier trop volumineux (max 2 Mo). » | P2 |
| 94 | Enregistrer le nouvel avatar | `/profile` (Avatar) | Aperçu présent | Cliquer « Enregistrer » | avatarMutation, avatar mis à jour | P3 |
| 95 | Supprimer l'avatar | `/profile` (Avatar) | Avatar existant | Cliquer « Supprimer l'avatar » | avatarMutation("") → avatar retiré | P3 |
| 96 | Accès rapide « Mes données » | `/profile` (Données) | — | Onglet « Mes données » | Liens Mes évaluations / Historique | P3 |
| 97 | Exporter mes données RGPD | `/profile` (Données) | — | Cliquer « Exporter mes données RGPD » | gdprMutation → téléchargement `gdpr-export-{id}.json` | P2 |
| 98 | Déposer une demande depuis le profil | `/profile` (Demandes) | Formulaire du type disponible | Onglet Demandes → « + Déposer une demande » → choisir un type | Navigation `/evaluations/new?formId=…` | P2 |
| 99 | Demande sans formulaire disponible | `/profile` (Demandes) | Aucun form du type | Choisir un type sans formulaire | Alerte « Aucun formulaire disponible pour ce type de demande. » | P3 |
| 100 | Lister mes demandes (profil) | `/profile` (Demandes) | — | Onglet Demandes | Tableau Type/Date/Statut ou « Aucune demande pour l'instant. » | P3 |
| 101 | Ouvrir une demande depuis le profil | `/profile` (Demandes) → `/evaluations/:id` | ≥1 demande | Cliquer « Voir → » | Détail de la demande | P3 |
| 102 | Ouvrir mes préférences | `/profile/preferences` | — | Onglet Préférences → « Gérer mes préférences » | Page Préférences (langue + notifications) | P2 |
| 103 | Changer la langue (préférences) | `/profile/preferences` | — | Choisir Français/English → « Sauvegarder » | saveMutation, toast « Préférences sauvegardées » | P2 |
| 104 | Activer/désactiver les notifications email | `/profile/preferences` | — | Basculer les toggles (Éval assignée, Rappel deadline) → Sauvegarder | Préférences enregistrées (employee voit uniquement ses 2 toggles) | P2 |
| 105 | Retour au profil depuis préférences | `/profile/preferences` → `/profile` | — | Cliquer « Profil » (chevron) | Retour à `/profile` | P3 |
| 106 | Ouvrir les notifications | `/notifications` | — | Cliquer la cloche (NotificationBell) ou aller à `/notifications` | Liste groupée Aujourd'hui/Cette semaine/Plus tôt | P2 |
| 107 | Marquer une notification comme lue | `/notifications` | ≥1 non lue | Cliquer une notification | markRead, lien suivi si présent, pastille retirée | P2 |
| 108 | Tout marquer comme lu | `/notifications` | unreadCount > 0 | Cliquer « Tout marquer comme lu » | markAllRead, compteur à 0 | P2 |
| 109 | Charger plus de notifications | `/notifications` | hasMore = true | Cliquer « Charger plus » | Page suivante accumulée | P3 |
| 110 | Réessayer après erreur de chargement | `/notifications` | Backend KO | Cliquer « Réessayer » | refetch des notifications | P3 |
| 111 | État vide notifications | `/notifications` | Aucune | Charger | « Vous êtes à jour 🎉 » | P3 |
| 112 | Ouvrir l'aide | top bar → `/help` | — | Cliquer l'icône `?` (HelpCircle) | Navigation vers `/help` | P3 |
| 113 | Recherche globale (top bar) | top bar | — | Cliquer l'icône loupe | Ouverture du panneau de recherche (onSearchClick) | P3 |
| 114 | Voir le compteur de notifications (cloche) | top bar | ≥1 non lue | Observer la cloche | Badge de compteur non lues | P3 |
| 115 | Ouvrir le menu avatar | top bar | — | Cliquer l'avatar | Menu : Profil, Organigramme, Langue, Déconnexion | P3 |
| 116 | Basculer la langue (menu avatar) | top bar | — | Cliquer « Langue » (toggleLanguage) | Langue UI basculée FR/EN | P3 |
| 117 | Naviguer via la sous-nav | sous-nav | — | Cliquer Tableau de bord / Mes évaluations / Historique / Demandes / PDI | Navigation vers la route correspondante | P2 |
| 118 | Vérifier absence de la perspective « work » | top bar | Rôle employee | Observer le switch de perspective | Aucun switch (hasSwitch=false, toujours « me ») | P2 |
| 119 | Accès route interdite (ex. `/campaigns/new`) | route admin/hr | Rôle employee | Naviguer vers une route réservée | Redirection `/unauthorized` (AuthGuard) | P2 |
| 120 | Session expirée (401 global) | n'importe quelle page | Cookie JWT expiré | Déclencher un appel API | Intercepteur axios → redirection `/login` | P2 |
| 121 | Se déconnecter | top bar (menu avatar) | Connecté | Cliquer « Déconnexion » | logout API + redirection `/login`, session purgée | P1 |
