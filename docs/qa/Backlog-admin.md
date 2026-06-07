# Backlog QA — Rôle ADMIN

> Backlog de test exhaustif pour le rôle **administrateur** de NX-RH.
> Couvre l'administration technique (LDAP, SSL, SMTP, configuration système, audit,
> imports) et la gestion sensible des comptes (blocage/déblocage/suppression,
> impersonation lecture seule, RGPD), avec un accent fort sur les **invariants de
> sécurité** (on ne se bloque/supprime pas soi-même ; on ne supprime pas le dernier
> admin ; un compte bloqué ne peut plus se connecter ; un faux positif débloqué
> redevient actif ; l'impersonation est strictement en lecture seule).

Sources : `frontend-v2/src/router/index.tsx`, `components/layout/navConfig.ts`,
les pages `Admin*Page.tsx` + `UserDetailPage.tsx`, `mongo/server/routes/users.js`,
`routes/admin.js`, `middleware/impersonationGuard.js`, `services/ldapService.js`.

Priorités : **P1** = critique (sécurité / corruption de données / blocage d'accès),
**P2** = important (fonction principale), **P3** = confort / cas limites.

---

## 1. Navigation & accès au hub d'administration

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| 1 | Accéder au hub admin via la nav | `/admin` (AdminHubPage) | Connecté en `admin`, perspective « Administration » | 1. Cliquer sur « Administration » dans la sous-nav | La page hub affiche les 6 sections (Système, E-mail, LDAP, Sécurité & Audit, Imports, Paramètres RH) avec leurs tuiles | P2 |
| 2 | Naviguer vers chaque tuile du hub | `/admin` | Connecté `admin` | 1. Cliquer successivement sur chaque lien de tuile | Chaque lien ouvre la bonne route (`/admin/config`, `/admin/status`, `/admin/setup`, `/admin/mail-config`, `/admin/mail-templates`, `/admin/ldap`, `/admin/audit`, `/admin/ssl`, `/admin/users/import`, `/admin/forms/import`, `/admin/settings`) | P2 |
| 3 | Restriction de rôle sur les routes admin sensibles | `/admin/ldap`, `/admin/ssl`, `/admin/config`, `/admin/mail-config`, `/admin/status`, `/admin/setup`, `/admin/test-mail` | Connecté en `hr` (non-admin) | 1. Saisir l'URL directement | Redirection vers `/unauthorized` (ces routes sont `roles={["admin"]}` uniquement) | P1 |
| 4 | Accès partagé admin/hr | `/admin`, `/admin/users`, `/admin/audit`, `/admin/mail-templates`, `/admin/stats`, `/admin/departments`, imports | Connecté en `hr` | 1. Ouvrir chaque route | Accès autorisé (routes `roles={["admin","hr"]}`) | P2 |
| 5 | Accès anonyme refusé | Toute route `/admin/*` | Déconnecté | 1. Saisir l'URL | Redirection vers `/login` (AuthGuard global) | P1 |

---

## 2. Annuaire LDAP — connexion, test, prévisualisation, synchronisation, exclusions

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| 6 | Ajouter une source LDAP | `/admin/ldap` (AdminLdapPage) | Connecté `admin` | 1. Cliquer « Ajouter une source » | Une nouvelle carte « Nouvel annuaire » apparaît avec valeurs par défaut (host `ldap://`, filtre `(objectClass=person)`, rôle `employee`) | P2 |
| 7 | Validation des champs obligatoires | `/admin/ldap` | Une source ajoutée | 1. Vider Hôte/Base DN/Bind DN 2. Quitter le champ (onBlur) | Bordure rouge + message d'erreur ; bouton « Enregistrer » désactivé tant qu'une source est invalide | P1 |
| 8 | Enregistrer les sources | `/admin/ldap` | Au moins une source valide, état « dirty » | 1. Modifier un champ 2. Cliquer « Enregistrer » | Bandeau « Modifications non enregistrées » disparaît ; les données sont persistées (invalidation `["ldap","sources"]`) | P2 |
| 9 | Boutons d'action désactivés tant que non enregistré | `/admin/ldap` | Modifications en cours (dirty) | 1. Observer Tester/Prévisualiser/Synchroniser | Les 3 boutons sont désactivés ; un message invite à enregistrer avant de tester/synchroniser | P2 |
| 10 | Tester la connexion LDAP (succès) | `/admin/ldap` | Source valide et enregistrée, serveur LDAP joignable | 1. Cliquer « Tester » | Badge vert « Connexion réussie » + message info éventuel | P1 |
| 11 | Tester la connexion LDAP (échec) | `/admin/ldap` | Source avec mauvais host/credentials | 1. Cliquer « Tester » | Badge rouge « Connexion échouée » + message d'erreur | P1 |
| 12 | Prévisualiser les utilisateurs LDAP | `/admin/ldap` | Connexion OK | 1. Cliquer « Prévisualiser » | Tableau Nom / Email / DN (max 100 lignes affichées) + total ; **aucune écriture en base** | P2 |
| 13 | Synchroniser une source | `/admin/ldap` | Connexion OK | 1. Cliquer « Synchroniser » | Récap affiché : créés / mis à jour / ignorés / erreurs ; comptes créés en `authSource=ldap` | P1 |
| 14 | Mot de passe Bind inchangé si laissé vide | `/admin/ldap` | Source déjà enregistrée avec mot de passe | 1. Laisser le champ « Mot de passe Bind » vide 2. Enregistrer | Le mot de passe stocké côté serveur reste inchangé (placeholder « laisser vide = inchangé ») | P2 |
| 15 | Définir des motifs d'exclusion de comptes système | `/admin/ldap` | Source existante | 1. Saisir `svc-*, *@bots.local, admin*` dans « Comptes exclus (motifs) » 2. Enregistrer 3. Synchroniser | Les comptes correspondant aux motifs (testés sur email ET DN) sont **ignorés à l'import** (compteur « exclus ») | P1 |
| 16 | Exclusion désactive un compte déjà importé (faux/vrai positif) | `/admin/ldap` + base | Un compte système a déjà été synchronisé, puis ajouté aux motifs d'exclusion | 1. Ajouter le motif 2. Re-synchroniser | Le compte existant est **bloqué (réversible)** : `blocked=true`, `isActive=false`, `blockedReason="Compte système/service exclu (synchro LDAP)"` ; compteur « désactivés » incrémenté ; il n'est **pas supprimé** | P1 |
| 17 | Restaurer un faux positif d'exclusion | `/admin/ldap` (motif) + `/users/:id` | Un vrai utilisateur a été bloqué à tort par un motif trop large | 1. Retirer/affiner le motif côté LDAP 2. Aller sur la fiche utilisateur 3. « Débloquer le compte » | Le compte redevient `blocked=false`, `isActive=true` ; l'utilisateur peut de nouveau se connecter | P1 |
| 18 | Supprimer une source LDAP | `/admin/ldap` | Plusieurs sources | 1. Cliquer la corbeille d'une source 2. Enregistrer | La source disparaît de la liste et de ses erreurs ; persistée après enregistrement | P3 |
| 19 | Activer / désactiver une source | `/admin/ldap` | Source existante | 1. Décocher « Activé » 2. Enregistrer | Source marquée désactivée (non utilisée lors des synchros automatiques) | P3 |

---

## 3. Certificat SSL

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| 20 | Consulter l'état du certificat actuel | `/admin/ssl` (AdminSslPage) | Connecté `admin` | 1. Ouvrir la page | Affiche CN, date de validité, jours restants si installé ; sinon « Aucun certificat n'est installé » | P2 |
| 21 | Alerte certificat bientôt expiré | `/admin/ssl` | Certificat avec < 30 jours restants | 1. Ouvrir la page | Badge rouge sur « Jours restants » | P2 |
| 22 | Téléverser fullchain + clé privée valides | `/admin/ssl` | Fichiers PEM valides | 1. Sélectionner fullchain.pem 2. Sélectionner privkey.pem 3. « Installer le certificat » | Toast succès « Certificat installé » ; état rafraîchi ; champs réinitialisés | P1 |
| 23 | Validation des fichiers (format invalide) | `/admin/ssl` | Fichier non-PEM ou champ vide | 1. Charger un fichier invalide 2. Installer | Message d'erreur (schéma Zod `sslCertSchema`) ; pas d'envoi serveur ; bouton désactivé si un champ est vide | P1 |
| 24 | Refus serveur (clé/cert incohérents) | `/admin/ssl` | fullchain et privkey ne correspondent pas | 1. Installer | Toast erreur « Installation refusée » avec message serveur | P1 |
| 25 | Clé privée non réaffichée | `/admin/ssl` | Certificat installé | 1. Recharger la page | La clé privée n'est jamais réaffichée (champs vidés après installation) | P1 |

---

## 4. Configuration e-mail / SMTP + test d'envoi

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| 26 | Renseigner et enregistrer la config SMTP | `/admin/mail-config` (AdminMailConfigPage) | Connecté `admin` | 1. Saisir hôte/port/user/pass/expéditeur 2. « Enregistrer » | Config persistée (invalidation `mailConfig`) | P2 |
| 27 | Validation des champs SMTP | `/admin/mail-config` | Champs vides/invalides | 1. Soumettre vide | Erreurs par champ (schéma `mailConfigSchema`) ; pas d'enregistrement | P2 |
| 28 | Mot de passe SMTP requis à la 1re configuration | `/admin/mail-config` | Aucun mot de passe encore stocké (`passwordSet=false`) | 1. Laisser le champ pass vide 2. Enregistrer | Erreur « Le mot de passe SMTP est requis lors de la première configuration » | P2 |
| 29 | Mot de passe inchangé si laissé vide après coup | `/admin/mail-config` | `passwordSet=true` | 1. Laisser pass vide 2. Enregistrer | Enregistrement OK ; mot de passe non réécrit (placeholder « inchangé ») | P2 |
| 30 | Preset OVH | `/admin/mail-config` | — | 1. Cliquer « Preset OVH » | Hôte `smtp.ovh.net`, port `587`, TLS off pré-remplis | P3 |
| 31 | Envoyer un email de test (depuis config) | `/admin/mail-config` | Config SMTP enregistrée | 1. Saisir un destinataire 2. « Envoyer un test » | Callout vert « Email envoyé avec succès » | P2 |
| 32 | Envoyer un email de test (page dédiée) | `/admin/test-mail` (AdminMailTestPage) | SMTP configuré | 1. Saisir destinataire valide 2. « Envoyer l'email de test » | Callout vert + lien d'aperçu Ethereal si dispo | P2 |
| 33 | Échec d'envoi de test | `/admin/test-mail` ou `/admin/mail-config` | SMTP mal configuré | 1. Envoyer un test | Callout rouge « Échec de l'envoi — vérifiez la configuration SMTP » | P2 |
| 34 | Validation de l'adresse de test | `/admin/test-mail` | — | 1. Saisir une adresse invalide | Message d'erreur ; bouton désactivé tant que l'adresse est invalide | P3 |

---

## 5. Configuration système (clés + variables d'environnement)

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| 35 | Lister les clés de configuration | `/admin/config` (AdminConfigPage) | Connecté `admin` | 1. Ouvrir la page | Tableau Clé / Valeur / Actions ; valeurs longues tronquées avec « Voir tout / Réduire » | P2 |
| 36 | Créer une nouvelle clé | `/admin/config` | — | 1. « Nouvelle clé » 2. Saisir clé + valeur 3. « Sauvegarder » | Clé ajoutée (invalidation `configKeys`) ; modale fermée | P2 |
| 37 | Modifier une clé existante | `/admin/config` | Au moins une clé | 1. Cliquer le crayon 2. Modifier la valeur 3. Sauvegarder | Valeur mise à jour ; champ « Clé » désactivé (non renommable) | P2 |
| 38 | Supprimer une clé (avec confirmation) | `/admin/config` | Au moins une clé | 1. Cliquer la corbeille 2. Confirmer (variant danger) | Clé supprimée après confirmation `useConfirm()` | P2 |
| 39 | Vérifier les variables d'environnement | `/admin/config` | — | 1. Observer la section « Variables d'environnement » | Compteur défini/manquant ; badge rouge si des variables `required` manquent ; lignes en surbrillance | P2 |
| 40 | Endpoint env indisponible | `/admin/config` | Endpoint env-check en erreur | 1. Ouvrir la page | Message de repli « Endpoint non disponible » sans casser la page | P3 |

---

## 6. Assistant de configuration initiale & état système

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| 41 | Suivre l'assistant de configuration | `/admin/setup` (AdminSetupWizardPage) | Connecté `admin` | 1. Ouvrir la page | Barre de progression (% configuré) + étapes ; chaque étape non faite a un bouton d'action vers la route concernée | P2 |
| 42 | Toutes les étapes complètes | `/admin/setup` | Plateforme entièrement configurée | 1. Ouvrir la page | Callout vert « Configuration complète ! » | P3 |
| 43 | Navigation depuis une étape | `/admin/setup` | Étape non faite | 1. Cliquer le bouton d'action de l'étape | Redirige vers la route de configuration correspondante (LDAP, SMTP, SSL…) | P3 |
| 44 | Consulter l'état du système | `/admin/status` (AdminStatusPage) | Connecté `admin` | 1. Ouvrir la page | Santé/disponibilité des services affichée | P3 |

---

## 7. Journal d'audit

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| 45 | Consulter le journal d'audit | `/admin/audit` (AdminAuditPage) | Connecté `admin` ; actions journalisées existantes | 1. Ouvrir la page | Tableau Date / Acteur / Action / Cible ; badges colorés par type d'action | P2 |
| 46 | Filtrer le journal | `/admin/audit` | Entrées variées | 1. Saisir acteur / action / type cible / dates | La liste se met à jour, pagination remise à 1 | P2 |
| 47 | Pagination du journal | `/admin/audit` | > 20 entrées | 1. Cliquer Suivant/Précédent | Navigation entre pages ; boutons désactivés aux bornes | P3 |
| 48 | Exporter le journal en CSV | `/admin/audit` | Entrées existantes | 1. Cliquer « Exporter CSV » | Téléchargement `audit.csv` respectant les filtres actifs | P2 |
| 49 | Traçabilité des actions sensibles | `/admin/audit` | Avoir effectué bloc/déblocage/suppression/impersonation | 1. Vérifier le journal | Présence des entrées `user_block`, `user_unblock`, `user_delete`, `impersonate_start`, `impersonate_write_blocked` avec acteur et cible | P1 |

---

## 8. Imports (utilisateurs & formulaires)

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| 50 | Télécharger le template CSV utilisateurs | `/admin/users/import` (AdminUsersImportPage) | Connecté `admin`/`hr` | 1. Cliquer « Télécharger le template CSV » | Fichier `template-import-utilisateurs.csv` téléchargé avec les bons en-têtes | P3 |
| 51 | Charger un CSV/JSON par drag-and-drop ou sélection | `/admin/users/import` | Fichier valide | 1. Glisser-déposer ou sélectionner | Lignes parsées, séparateur `;`/`,` détecté, aperçu (10 lignes) affiché | P2 |
| 52 | Validation des champs requis | `/admin/users/import` | CSV avec lignes incomplètes | 1. Charger le fichier | Liste d'erreurs « champ X manquant » (email/firstName/lastName/role) ; import bloqué | P1 |
| 53 | Import en mode simulation (dry-run) | `/admin/users/import` | Mode simulation activé (par défaut) | 1. Cliquer « Simuler » | Aperçu du résultat ; **aucune donnée modifiée** ; bandeau « Mode simulation » | P1 |
| 54 | Import réel | `/admin/users/import` | Mode simulation désactivé, données valides | 1. Désactiver la simulation 2. « Importer N utilisateurs » | Comptes créés/mis à jour ; récap importés/erreurs | P2 |
| 55 | Réinitialiser l'import | `/admin/users/import` | Fichier chargé | 1. Cliquer « Réinitialiser » | Lignes, erreurs et résultat effacés | P3 |
| 56 | Télécharger le template JSON formulaire | `/admin/forms/import` (AdminFormsImportPage) | Connecté `admin`/`hr` | 1. Cliquer « Télécharger le template JSON » | Fichier `template-formulaire.json` téléchargé | P3 |
| 57 | Importer un formulaire (fichier ou collé) | `/admin/forms/import` | JSON formulaire valide | 1. Charger/coller le JSON 2. « Valider » 3. « Importer le formulaire » | Aperçu (titre/type/questions) ; après import, redirection vers `/forms/:id` | P2 |
| 58 | Validation du JSON formulaire | `/admin/forms/import` | JSON invalide (type inconnu, id dupliqué, question sans type) | 1. Charger le JSON | Liste d'erreurs détaillée (formType invalide, ID en double, champ manquant) ; import bloqué | P1 |

---

## 9. Gestion des comptes — blocage / déblocage / suppression (SÉCURITÉ)

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| 59 | Bloquer un compte (système/suspect) | `/users/:id` (UserDetailPage, menu Actions) → `PATCH /api/users/:id/block` | Connecté `admin`, cible ≠ soi, compte non bloqué | 1. Menu « … » 2. « Bloquer le compte » 3. Confirmer | Confirmation `useConfirm` ; compte `blocked=true`, `isActive=false`, `blockedAt` + `blockedReason` renseignés ; toast « Compte bloqué » ; entrée audit `user_block` | P1 |
| 60 | Un compte bloqué ne peut plus se connecter | Login | Compte bloqué | 1. Tenter de se connecter avec ce compte | Connexion refusée (compte inactif) | P1 |
| 61 | Débloquer un compte (restaurer faux positif) | `/users/:id` → `PATCH /api/users/:id/unblock` | Compte actuellement bloqué | 1. Menu « … » 2. « Débloquer le compte » | `blocked=false`, `isActive=true`, `blockedAt/blockedReason` remis à null ; toast « Compte débloqué » ; audit `user_unblock` | P1 |
| 62 | Un compte débloqué redevient actif (peut se reconnecter) | Login | Compte fraîchement débloqué | 1. Se connecter avec ce compte | Connexion réussie | P1 |
| 63 | Interdiction de se bloquer soi-même (UI) | `/users/:id` | Fiche = compte courant | 1. Ouvrir le menu Actions sur sa propre fiche | Les actions Bloquer/Débloquer/Supprimer ne sont pas proposées (`userData.id !== currentUser.id`) | P1 |
| 64 | Interdiction de se bloquer soi-même (API) | `PATCH /api/users/:id/block` | Appel direct avec `:id` = soi | 1. Appeler l'API sur son propre id | `400` « Vous ne pouvez pas bloquer votre propre compte » | P1 |
| 65 | Suppression définitive d'un compte | `/users/:id` → `DELETE /api/users/:id` | Connecté `admin`, cible ≠ soi, cible non-admin | 1. Menu « … » 2. « Supprimer définitivement » 3. Confirmer | Confirmation explicite (action IRRÉVERSIBLE) ; `204` ; redirection `/users` ; audit `user_delete` | P1 |
| 66 | Interdiction de se supprimer soi-même (API) | `DELETE /api/users/:id` | `:id` = soi | 1. Appeler l'API sur son propre id | `400` « Vous ne pouvez pas supprimer votre propre compte » | P1 |
| 67 | Garde-fou « dernier administrateur » | `DELETE /api/users/:id` | Cible est le **seul** admin actif restant | 1. Tenter de supprimer le dernier admin actif | `409` « Impossible : c'est le dernier administrateur actif » ; compte conservé | P1 |
| 68 | Suppression définitive réservée à `admin` | `DELETE /api/users/:id` | Connecté `hr` | 1. Tenter la suppression définitive | `403` « Réservé aux administrateurs » ; option masquée dans l'UI (`currentUser.role === "admin"`) | P1 |
| 69 | Blocage réservé à admin/hr | `PATCH /api/users/:id/block` | Connecté `manager`/`employee` | 1. Appeler l'API | `403` « Permissions insuffisantes » | P1 |
| 70 | ID invalide / utilisateur introuvable | block / unblock / delete | — | 1. Appeler avec un id non-ObjectId ou inexistant | `400` « ID invalide » ou `404` « Utilisateur introuvable » | P3 |
| 71 | Préférence « Bloquer » plutôt que supprimer | `/users/:id` | — | 1. Lire les libellés de confirmation | Le message de suppression recommande « Préférez Bloquer pour un compte système/suspect » | P3 |

---

## 10. Impersonation (« Voir en tant que ») — lecture seule

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| 72 | Démarrer une impersonation | `/users/:id` → `POST /api/admin/impersonate/:userId` | Connecté `admin`, cible non-admin, active, ≠ soi | 1. Menu « … » 2. « Voir en tant que » | Session d'impersonation démarrée ; redirection `/` dans la peau de la cible ; audit `impersonate_start` | P1 |
| 73 | Option masquée pour les cibles non éligibles | `/users/:id` | Cible = admin, inactive, ou = soi | 1. Ouvrir le menu Actions | « Voir en tant que » n'apparaît pas | P1 |
| 74 | Anti-auto-impersonation (API) | `POST /api/admin/impersonate/:userId` | `:userId` = soi | 1. Appeler l'API sur son propre id | `400` « Auto-impersonation interdite » | P1 |
| 75 | Anti-escalade latérale (impersonate d'un admin) | `POST /api/admin/impersonate/:userId` | Cible = autre admin | 1. Appeler l'API | Refus (jamais d'impersonation d'un autre administrateur) | P1 |
| 76 | Écriture interdite pendant l'impersonation | n'importe quelle mutation (POST/PUT/PATCH/DELETE) | Session impersonation active (claim `imp:true`) | 1. Tenter une action mutante | `403` « Action en écriture interdite pendant l'impersonation (lecture seule) » ; audit `impersonate_write_blocked` | P1 |
| 77 | Sortie d'impersonation autorisée | `/auth/impersonate/stop` | Session impersonation active | 1. Quitter l'impersonation | Seule écriture autorisée sous impersonation ; retour à la session admin d'origine | P1 |
| 78 | Refresh neutralisé pendant l'impersonation | session impersonation | Token dédié `imp` | 1. Laisser le token expirer / tenter un refresh | Le refresh est neutralisé (pas de prolongation silencieuse de la session impersonée) | P2 |

---

## 11. Gestion avancée des utilisateurs & RGPD

| # | Action | Page / Route | Préconditions | Étapes | Résultat attendu | Priorité |
|---|--------|--------------|---------------|--------|------------------|----------|
| 79 | Rechercher / filtrer les utilisateurs | `/admin/users` (AdminUsersPage) | Connecté `admin`/`hr` | 1. Saisir une recherche 2. Filtrer par source (Local/LDAP) | Liste filtrée ; badges rôle + source d'auth | P2 |
| 80 | Exporter les données RGPD (JSON) | `/admin/users` ou `/users/:id` | Utilisateur sélectionné | 1. Action « Exporter JSON RGPD » | Téléchargement `gdpr-<id>.json` (ou `export-rgpd.json`) | P2 |
| 81 | Anonymiser un utilisateur (RGPD, irréversible) | `/admin/users` → `anonymizeUser` | `admin`/`hr`, utilisateur non déjà anonymisé | 1. Action « Anonymiser RGPD » 2. Confirmer (variant danger) | Données personnelles effacées (irréversible, audité) ; mention « (anonymisé) » dans la liste ; option désactivée si déjà anonymisé | P1 |
| 82 | Forcer la désactivation (réversible) | `/admin/users` → `forceDeactivateUser` | `admin`/`hr`, utilisateur actif | 1. Action « Forcer désactivation » 2. Confirmer (warning) | Utilisateur ne peut plus se connecter (réversible) ; colonne « Désactivé le » renseignée ; option désactivée si déjà inactif | P2 |
| 83 | Suppression RGPD depuis la fiche | `/users/:id` → `gdprAnonymize` | Connecté `admin`, cible non-admin | 1. Menu « … » 2. « Supprimer l'utilisateur (RGPD) » 3. Confirmer | Anonymisation définitive (droit à l'effacement) ; historique d'évaluations conservé ; redirection `/users` | P1 |
| 84 | RGPD non proposé sur un admin | `/users/:id` | Cible = admin | 1. Ouvrir le menu Actions sur la fiche d'un admin | Les options « Voir en tant que » et « Supprimer (RGPD) » ne s'affichent pas (`userData.role !== "admin"`) | P1 |
| 85 | Rappel RGPD visible | `/admin/users` | — | 1. Ouvrir la page | Callout « Les données utilisateur sont soumises au RGPD. Toute anonymisation est irréversible et auditée » | P3 |

---

**Total : 85 cas de test** répartis sur 11 sections (Navigation/accès, LDAP, SSL, SMTP,
Config système, Setup/État, Audit, Imports, Comptes block/unblock/delete, Impersonation,
RGPD), dont **34 cas de priorité P1** centrés sur les invariants de sécurité.
