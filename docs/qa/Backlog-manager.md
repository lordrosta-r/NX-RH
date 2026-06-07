# Backlog QA — Rôle MANAGER

> Backlog de test exhaustif pour le rôle **manager**. Le manager porte **deux casquettes**,
> accessibles via le switch de perspective de la barre supérieure (« Mon espace » / « Mon Équipe ») :
>
> 1. **Mon espace** (`perspective === "me"`) — son propre parcours d'évalué : tableau de bord perso,
>    ses évaluations, son historique, sa mobilité, son PDI. Identique à un employé.
> 2. **Mon Équipe** (`perspective === "work"`) — l'encadrement de son équipe : traiter les évaluations
>    des collaborateurs, relire/réviser, mener l'entretien (échange, objectifs, synthèse, signature,
>    désaccord), consulter l'organigramme et la liste de son équipe.
>
> **Source de vérité** (fichiers analysés) :
> `components/layout/navConfig.ts`, `components/layout/Navbar.tsx`, `pages/DashboardManagerPage.tsx`,
> `pages/ManagerTodoPage.tsx`, `pages/InterviewPage.tsx`, `pages/EvaluationDetailPage.tsx`,
> `pages/OrgPage.tsx`, `hooks/useOrgChart.ts`, `components/org/*`.
>
> ### Invariants de navigation par perspective
>
> - **Mon espace** (`me`) : Tableau de bord · Mes évaluations (`/evaluations`) · Historique
>   (`/evaluations/history`) · Mobilité (`/mobility`) · PDI (`/pdi`).
> - **Mon Équipe** (`work`) — primaire : Tableau de bord · À traiter (`/manager/todo`) ·
>   Mon équipe (`/users`) · Organigramme (`/org`) · Campagnes (`/campaigns`) · Évaluations
>   (`/evaluations`). « Plus » : Historique · Calendrier (`/events`) · Ressources (`/resources`).
>
> ### Invariant de sécurité majeur (organigramme)
>
> Dans `useOrgChart`, `canEdit = (role === "admin" || role === "hr")`. **Le manager ne peut PAS
> faire de drag-and-drop de rattachement** : `nodesDraggable={canEdit}` est faux pour lui,
> `handleNodeDragStop` n'est pas branché, et la mutation `patchOrgUser` est de toute façon gardée.
> Les cas de drag-and-drop ci-dessous sont donc des cas de **non-régression de sécurité** (l'action
> doit être impossible côté UI), pas des parcours nominaux.

---

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| **A. Switch de perspective & navigation** |
| 1 | Le switch de perspective est visible | Barre supérieure (`Navbar`) | Connecté en manager | Observer la zone centrale du bandeau | Deux onglets « Mon espace » et « Mon Équipe » (`hasSwitch === true` pour manager) | Haute |
| 2 | Basculer sur « Mon Équipe » | `Navbar` → `/` | Perspective « Mon espace » active | Cliquer l'onglet « Mon Équipe » | Onglet `aria-selected=true`, redirection vers `/`, sous-nav passe à : À traiter / Mon équipe / Organigramme / Campagnes / Évaluations | Haute |
| 3 | Basculer sur « Mon espace » | `Navbar` → `/` | Perspective « Mon Équipe » active | Cliquer l'onglet « Mon espace » | Redirection vers `/`, sous-nav passe à : Mes évaluations / Historique / Mobilité / PDI | Haute |
| 4 | Persistance de la perspective | `Navbar` | Manager connecté | Basculer en « Mon Équipe », naviguer puis rafraîchir | La perspective choisie est conservée (cf. `PerspectiveContext`) | Moyenne |
| 5 | Menu « Plus » en perspective Équipe | `Navbar` (sous-nav) | Perspective « Mon Équipe » | Ouvrir le dropdown « Plus » | Groupes affichés : Historique (sous Évaluations), Calendrier + Ressources (sous Pilotage) | Moyenne |
| 6 | Fermeture des dropdowns | `Navbar` | Un dropdown ouvert | Cliquer en dehors / presser Échap | Le menu se ferme (`useOutsideClose` + Échap) | Basse |
| 7 | Accès Profil / Organigramme / Langue / Déconnexion via avatar | `Navbar` | Manager connecté | Ouvrir le menu avatar | Liens Profil, Organigramme, bascule de langue FR/EN, Déconnexion | Moyenne |
| **B. Tableau de bord manager (Mon Équipe)** |
| 8 | Afficher le tableau de bord manager | `DashboardManagerPage` `/` | Perspective « Mon Équipe » | Charger la page | KPI : Évals à compléter, Taux de complétion, Taille équipe, En retard, Signées | Haute |
| 9 | Liste « Évaluations à compléter » | `DashboardManagerPage` `/` | Au moins 1 éval `assigned`/`in_progress` | Observer la tuile | Lignes filtrées sur `assigned`/`in_progress`, bouton « Remplir » → `/evaluations/:id` | Haute |
| 10 | Tuile « Mon équipe » | `DashboardManagerPage` `/` | Équipe non vide | Observer | Liste des collaborateurs avec badge de statut + barre de progression | Moyenne |
| 11 | État vide « Mon équipe » | `DashboardManagerPage` `/` | Aucun membre | Observer | « Aucun membre dans l'équipe » | Basse |
| 12 | Campagnes actives | `DashboardManagerPage` `/` | Campagnes `status=active` | Observer la tuile | Jusqu'à 5 campagnes avec % de progression, lien « Voir » → `/campaigns/:id` | Moyenne |
| 13 | En attente de signature | `DashboardManagerPage` `/` | `stats.pendingSignatures` non vide | Observer | Jusqu'à 5 évals signées par l'évalué, lien « Signer » → `/evaluations/:id` | Haute |
| 14 | Prochains événements | `DashboardManagerPage` `/` | Événements à venir | Observer la tuile | Jusqu'à 3 événements, liens « Voir » → `/events/:id` | Basse |
| 15 | Squelettes de chargement | `DashboardManagerPage` `/` | Réseau lent | Charger | Placeholders animés affichés avant les données | Basse |
| **C. À traiter — file d'attente de l'équipe** |
| 16 | Afficher « À traiter » | `ManagerTodoPage` `/manager/todo` | Manager avec collaborateurs | Charger la page | Cartes regroupées par (collaborateur + campagne) ; seuls les statuts `submitted/assigned/in_progress/signed_evaluatee` | Haute |
| 17 | Compteurs « à reviewer » / « en retard » | `/manager/todo` | Évals soumises et/ou en retard | Observer le bandeau | Compteur bleu « N à reviewer », compteur rouge « N en retard » | Haute |
| 18 | Tri par priorité | `/manager/todo` | Mix de statuts/échéances | Observer l'ordre | Soumises d'abord, puis en retard, puis échéance proche (< 7 j), puis le reste | Moyenne |
| 19 | Accent visuel des cartes | `/manager/todo` | Carte avec éval en retard / soumise | Observer la bordure haute | Rouge si retard, bleu si soumise, neutre sinon | Basse |
| 20 | Badge d'échéance | `/manager/todo` | Éval avec deadline proche/dépassée | Observer | Icône horloge + badge date, rouge (retard) / ambre (proche) | Moyenne |
| 21 | Ouvrir une éval depuis la carte | `/manager/todo` | Carte affichée | Cliquer sur une ligne d'évaluation | Navigation vers `/evaluations/:id` | Haute |
| 22 | Ouvrir l'entretien depuis la carte | `/manager/todo` | Carte d'un collaborateur | Cliquer « Ouvrir l'entretien » | Navigation `/interview?campaignId=…&evaluateeId=…` | Haute |
| 23 | État vide « Rien à traiter » | `/manager/todo` | Aucune éval actionnable | Charger | EmptyState « Rien à traiter » | Basse |
| 24 | Squelettes de chargement | `/manager/todo` | Réseau lent | Charger | 3 placeholders animés | Basse |
| **D. Relecture / révision d'une évaluation de subordonné** |
| 25 | Mode « review » sur éval soumise | `EvaluationDetailPage` `/evaluations/:id` | Éval `submitted`, manager du collaborateur | Ouvrir la page | Mode `review` : formulaire objectifs N+1 + scores éditables (relecture de l'auto-éval) | Haute |
| 26 | Bouton « Ouvrir l'entretien » disponible | `/evaluations/:id` | Statut ∈ submitted/in_progress/assigned/reviewed/signed_evaluatee | Observer l'en-tête | Bouton « Ouvrir l'entretien » présent (manager/hr/admin uniquement) | Haute |
| 27 | Transition vers « reviewed » | `/evaluations/:id` | Mode review | Ajuster scores/objectifs puis valider la révision | L'éval passe en `reviewed` ; le collaborateur peut ensuite signer | Haute |
| 28 | Mode « sign » | `/evaluations/:id` | Statut reviewed/disputed/signed_evaluatee/signed_manager/signed_hr | Ouvrir la page | Section commentaires/signature affichée (`EvaluationCommentsSection`) | Haute |
| 29 | Signer l'évaluation (manager) | `/evaluations/:id` | Éval en attente de signature manager | Apposer la signature | L'éval enregistre la signature manager (statut `signed_manager`) | Haute |
| 30 | Mode « readonly » sur éval finalisée | `/evaluations/:id` | Statut validated/archived/expired | Ouvrir | Lecture seule + historique des étapes, pas d'édition | Moyenne |
| 31 | Guide contextuel selon le mode | `/evaluations/:id` | Tout statut | Observer le PageGuide | Étapes adaptées au mode courant (fill/review/sign/readonly) | Basse |
| **E. Mener l'entretien complet** |
| 32 | Ouvrir l'entretien | `InterviewPage` `/interview` | `campaignId` + `evaluateeId` valides du périmètre | Accéder à l'URL | En-tête participants (évalué, manager, statut) + sections de l'entretien | Haute |
| 33 | Paramètres manquants | `/interview` | URL sans campaignId/evaluateeId | Accéder | Message « Paramètres manquants » + lien retour vers `/manager/todo` | Moyenne |
| 34 | Échange par question — réponses en lecture seule | `/interview` | Entretien chargé avec questions | Observer chaque question | Deux blocs lecture seule côte à côte : Auto-éval (évalué) et Manager | Haute |
| 35 | Saisir le commentaire de l'évalué | `/interview` | Entretien chargé | Renseigner « Commentaire — évalué » sur une question | Texte capturé dans l'état `discussion.employeeComment` | Haute |
| 36 | Saisir le commentaire du manager | `/interview` | Entretien chargé | Renseigner « Commentaire — manager » | Texte capturé dans `discussion.managerComment` | Haute |
| 37 | Acter la position retenue | `/interview` | Entretien chargé | Renseigner « Position retenue (commune) » | Texte capturé dans `discussion.agreedAnswer` | Haute |
| 38 | Revue des objectifs N-1 — statut | `/interview` | Objectifs de l'édition précédente présents | Cliquer Atteint / Partiel / Non atteint | Bouton actif togglable ; statut enregistré par objectif | Haute |
| 39 | Revue des objectifs N-1 — commentaire | `/interview` | Idem | Saisir un commentaire par objectif | Texte capturé dans `objReview[i].comment` | Moyenne |
| 40 | Pré-remplissage des objectifs N-1 | `/interview` | `previousObjectives` fournis, pas encore de revue | Charger | Objectifs pré-remplis depuis les objectifs N+1 de l'édition précédente | Moyenne |
| 41 | Aucun objectif N-1 | `/interview` | Aucun objectif précédent | Observer la section | « Aucun objectif fixé à l'édition précédente. » | Basse |
| 42 | Fixer les objectifs N+1 — ajouter | `/interview` | Entretien chargé | Cliquer « Ajouter un objectif », saisir le texte | Nouvelle ligne d'objectif ajoutée | Haute |
| 43 | Fixer les objectifs N+1 — retirer | `/interview` | Au moins 1 objectif N+1 | Cliquer l'icône corbeille d'une ligne | La ligne est supprimée | Moyenne |
| 44 | Rédiger la synthèse | `/interview` | Entretien chargé | Saisir le texte de synthèse | Texte capturé dans `synthesis` | Haute |
| 45 | Insérer un exemple de synthèse | `/interview` | Champ synthèse vide | Cliquer « Insérer un exemple » | Le textarea se remplit avec le texte d'exemple | Basse |
| 46 | Enregistrer l'entretien | `/interview` | Modifications saisies | Cliquer « Enregistrer l'entretien » | Appel `saveState`, bouton passe à « Enregistré » (3 s), données rechargées | Haute |
| 47 | Bouton désactivé pendant l'enregistrement | `/interview` | Sauvegarde en cours | Observer le bouton | Libellé « Enregistrement… », bouton désactivé | Basse |
| 48 | Signer en tant que manager | `/interview` | Entretien chargé, pas encore signé manager | Tracer la signature dans le SignaturePad | Appel `sign({ role: "manager" })`, signature affichée avec date/heure | Haute |
| 49 | Signature manager déjà apposée | `/interview` | Signature manager existante | Observer la section | Aperçu de la signature + horodatage, plus de pad de saisie | Moyenne |
| 50 | Rappel : l'évalué signe ailleurs | `/interview` | Entretien chargé | Lire la note de la section signature | Mention « L'évalué·e signe de son côté, depuis sa propre fiche » (le manager ne signe que la sienne) | Moyenne |
| 51 | Marquer un désaccord — ouvrir | `/interview` | Pas de désaccord déjà signalé | Cliquer « Marquer un désaccord » | Zone de motif affichée avec textarea | Haute |
| 52 | Marquer un désaccord — confirmer | `/interview` | Motif saisi | Renseigner le motif puis « Confirmer le désaccord » | Appel `flagDisagreement`, bandeau rouge « passage en litige (arbitrage RH) » | Haute |
| 53 | Désaccord — bouton désactivé sans motif | `/interview` | Zone désaccord ouverte, motif vide | Observer « Confirmer » | Bouton désactivé tant que le motif est vide | Moyenne |
| 54 | Désaccord — annuler | `/interview` | Zone désaccord ouverte | Cliquer « Annuler » | La zone se referme sans signalement | Basse |
| 55 | Bandeau désaccord déjà signalé | `/interview` | `disagreement.flagged === true` | Charger | Bandeau rouge en haut + motif ; le bloc « Marquer un désaccord » est masqué | Moyenne |
| 56 | Aucune question dans les formulaires | `/interview` | Formulaires sans questions | Observer la section échange | « Aucune question dans les formulaires associés. » | Basse |
| **F. Mon équipe & organigramme** |
| 57 | Accéder à « Mon équipe » | `/users` | Perspective « Mon Équipe » | Cliquer le lien « Mon équipe » | Liste des collaborateurs encadrés (rôle manager autorisé sur `/users`) | Haute |
| 58 | Ouvrir l'organigramme | `OrgPage` `/org` | Manager connecté | Cliquer « Organigramme » | Organigramme chargé (ReactFlow), barre d'outils + légende | Haute |
| 59 | Vue « Tout » | `/org` | Org chargé | Sélectionner la vue « Tout » | Arbre hiérarchique complet (vue par défaut `all`) | Moyenne |
| 60 | Vue « Équipes » | `/org` | Org chargé | Sélectionner « Équipes » | `OrgTeamsView` affichée | Moyenne |
| 61 | Vue « Départements » | `/org` | Org chargé | Sélectionner « Départements » | `OrgDepartmentsView` : arbres imbriqués par département | Moyenne |
| 62 | Vue « Secteurs » | `/org` | Org chargé | Sélectionner « Secteurs » | `OrgSectorsView` affichée | Moyenne |
| 63 | Rechercher une personne | `/org` | Org chargé | Saisir un nom dans la recherche | Nœuds correspondants surlignés, autres atténués, recentrage sur le 1er résultat | Moyenne |
| 64 | Filtrer par rôle | `/org` | Org chargé | Activer un/des rôle(s) | Seuls les nœuds des rôles sélectionnés restent en pleine opacité | Moyenne |
| 65 | Sélectionner un nœud (chaîne hiérarchique) | `/org` | Org chargé | Cliquer un nœud | Panneau latéral ouvert + surlignage ascendants/descendants | Moyenne |
| 66 | Panneau latéral collaborateur | `/org` | Nœud sélectionné | Observer `OrgSidePanel` | Détails de la personne ; bouton de fermeture | Basse |
| 67 | Naviguer vers un collègue depuis le panneau | `/org` | Panneau ouvert | Cliquer un lien de navigation | Recentrage et sélection du nœud cible | Basse |
| 68 | Contrôles de zoom / recadrage | `/org` | Org chargé | Utiliser `OrgControls` / fitView | Zoom et recadrage fonctionnels | Basse |
| **G. Cas d'erreur & sécurité (périmètre du manager)** |
| 69 | **SÉCURITÉ — pas de drag-and-drop de rattachement** | `/org` | Manager connecté | Tenter de glisser un nœud sur un autre | Les nœuds ne sont **pas** déplaçables (`nodesDraggable={canEdit}`, `canEdit=false` pour manager) ; aucun dialogue de confirmation ; aucun `patchOrgUser` émis | **Critique** |
| 70 | **SÉCURITÉ — pas d'édition d'organigramme** | `/org` | Manager connecté | Observer la légende / le panneau | `OrgLegend` `canEdit` = `role === "admin"` uniquement ; aucune action d'édition exposée au manager | Haute |
| 71 | **SÉCURITÉ — éval hors périmètre** | `/evaluations/:id` | Éval d'un collaborateur **non** rattaché au manager | Ouvrir l'URL directement | « Évaluation introuvable ou accès refusé » (backend filtre par évaluateur) ; pas de mode review/sign | **Critique** |
| 72 | **SÉCURITÉ — entretien hors périmètre** | `/interview` | `evaluateeId` hors équipe du manager | Forcer l'URL | « Entretien introuvable ou accès refusé » + lien retour | **Critique** |
| 73 | **SÉCURITÉ — pas de review hors statut** | `/evaluations/:id` | Éval `assigned`/`in_progress` dont le manager n'est pas l'évaluateur | Ouvrir | Mode `readonly` (review réservé à `submitted` + manager/hr/admin) | Haute |
| 74 | **SÉCURITÉ — file limitée à ses évaluations** | `/manager/todo` | Manager connecté | Charger | Requête filtrée sur `evaluatorId = user.id` ; aucune éval d'une autre équipe listée | Haute |
| 75 | **SÉCURITÉ — todo masqué en perspective « Mon espace »** | `Navbar` | Perspective « Mon espace » | Observer la sous-nav | Les liens À traiter / Mon équipe / Organigramme / Campagnes n'apparaissent pas (vue perso uniquement) | Moyenne |
| 76 | **SÉCURITÉ — pas d'administration** | `Navbar` / routes `/admin/*` | Manager connecté | Tenter l'accès à `/admin` | Aucun lien « Administration » dans la nav manager ; accès route → `/unauthorized` (AuthGuard) | Haute |
| 77 | Entretien introuvable | `/interview` | Backend renvoie null | Charger | Message « Entretien introuvable ou accès refusé » + lien retour | Moyenne |
| 78 | Erreur d'enregistrement de l'entretien | `/interview` | `saveState` échoue | Cliquer « Enregistrer » | Erreur logguée, bouton ne reste pas bloqué (pas de « Enregistré ») | Moyenne |
| 79 | Erreur de signature | `/interview` | `sign` échoue | Tracer + valider | Erreur gérée (onError), pas de signature affichée | Basse |
| 80 | Erreur de signalement de désaccord | `/interview` | `flagDisagreement` échoue | Confirmer le désaccord | Erreur gérée, zone non fermée / pas de bandeau erroné | Basse |
