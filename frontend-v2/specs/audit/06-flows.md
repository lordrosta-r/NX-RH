# Audit Flows — NX-RH

> **Agent** : 6/9 · **Date** : 2025 · **Cible** : `04-flows.md` (Flux 1–10 + F-NEW-01–09)
> **Basé sur** : `04-flows.md` + `audit/01-routes.md` + `audit/03-security.md`

---

## Flows existants (19 flows audités)

| ID | Flow | Happy Path | Error Paths | Complet |
|----|------|------------|-------------|---------|
| Flux 1 | Connexion | ✅ | ⚠️ Partiel (GET /api/auth/me échoue post-login non couvert ; mot de passe oublié absent) | ❌ |
| Flux 2 | Création campagne | ✅ | ⚠️ Partiel (session expirée mid-flow, 500 sur brouillon, rafraîchissement, clôture/suppression absents) | ❌ |
| Flux 3 | Gestion formulaire | ✅ | ⚠️ Partiel (rafraîchissement pendant édition, conflit concurrent non couverts) | ❌ |
| Flux 4 | Processus évaluation | ✅ | ⚠️ Partiel (session expirée mid-soumission, 500 pendant soumission, employé absent, disagreementFlag, transitions expired/archived absents) | ❌ |
| Flux 5 | Onboarding utilisateur | ✅ | ⚠️ Partiel (user créé par import : mot de passe/email absent ; erreur réseau sur step non couverte) | ❌ |
| Flux 6 | Offboarding | ✅ | ⚠️ Partiel (500 partiel user archivé/évaluations non, annulation demande absente) | ❌ |
| Flux 7 | Accès ressource | ✅ | ⚠️ Partiel (réseau coupé pendant téléchargement, fichier corrompu, upload non documenté) | ❌ |
| Flux 8 | Config LDAP | ✅ | ⚠️ Partiel (timeout sync, réseau coupé pendant sync, première connexion users LDAP absente) | ❌ |
| Flux 9 | Journal d'audit | ✅ | ⚠️ Partiel (CSV injection non mentionnée, export PDF lent non couvert) | ❌ |
| Flux 10 | Profil & préférences | ✅ | ⚠️ Partiel (PATCH /api/auth/password absent des routes, échec changement MDP non couvert) | ❌ |
| F-NEW-01 | Drag & Drop Organigramme | ✅ | ✅ (409 cycle, 400, annulation, hors-ligne couverts) | ✅ |
| F-NEW-02 | Import utilisateurs CSV/JSON | ✅ | ⚠️ Partiel (réseau coupé pendant upload, mot de passe des users importés absent) | ❌ |
| F-NEW-03 | Import formulaire JSON | ✅ | ✅ (JSON invalide, type inconnu, fichier trop grand couverts) | ✅ |
| F-NEW-04 | Dépôt demande employé | ✅ | ⚠️ Partiel (notification RH à la soumission absente, suivi par l'employé non défini) | ❌ |
| F-NEW-05 | Traitement demande RH | ✅ | ⚠️ Partiel (flow rejet sans notification employé, traitement concurrent absent, GET /api/hr/flags/count route manquante) | ❌ |
| F-NEW-06 | Sélection périmètre campagne | ⚠️ Partiel | ⚠️ Partiel (qui reçoit les évaluations non défini, POST /launch absent) | ❌ |
| F-NEW-07 | Import données N-1 | ✅ | ✅ (204, 403, 500 couverts) | ✅ |
| F-NEW-08 | Gestion secteurs | ✅ | ✅ (409 suppression, 409 doublon, rollback drag couverts) | ✅ |
| F-NEW-09 | Manager N+1 | ✅ | ✅ (limitation v2 documentée, 403, 400, 409 couverts) | ✅ |

**Bilan** : 5 flows complets / 14 flows incomplets sur 19

---

## 🔴 P1 — Flows manquants bloquants

### P1-01 — Flow "Notifications utilisateur" inexistant

**Problème** : La section 4 de `04-flows.md` décrit l'**UI** du panneau notifications (dropdown, badge, items) mais aucun **flow** ne documente les interactions côté données.

**Manquant** :
- Flow de chargement des notifications : `GET /api/notifications` (route absente — cf. `01-routes.md` P1-01)
- Flow "marquer comme lue" : `PATCH /api/notifications/:id/read` (route absente — cf. `01-routes.md` P1-02)
- `PATCH /api/notifications/read-all` est mentionné dans le flow UI mais la route n'existe pas
- Lien "Voir toutes les notifications" → page `/notifications` non définie, route non existante

**Impact** : Le badge de comptage, l'affichage des notifications et le marquage comme lu sont entièrement non fonctionnels côté API. L'UX décrite est une coquille vide.

---

### P1-02 — Flow "Dashboard" absent

**Problème** : Tous les rôles ont un lien "Tableau de bord" → `/`, mais aucun flow ne décrit ce que cette page affiche ni comment elle est alimentée.

**Manquant** :
- `GET /api/dashboard` absent (cf. `01-routes.md` P1-03)
- Widgets, compteurs, évaluations en cours — aucun flow de chargement
- Pour l'employé : quelles données sont affichées ? (évaluations en cours, deadlines ?)
- Pour le manager : vue équipe, évaluations à traiter ?
- Pour HR/Admin : compteurs globaux, alertes ?

**Impact** : La page la plus visitée de l'application n'a pas de flow défini. Soit le frontend fait N appels séparés non documentés, soit rien ne s'affiche.

---

### P1-03 — Flow "Mot de passe oublié" absent

**Problème** : Le Flux 1 (connexion) ne mentionne aucun lien "Mot de passe oublié" et aucun flow de réinitialisation n'existe dans `04-flows.md`.

**Manquant** :
- Lien sur `/login` → `/forgot-password`
- `POST /api/auth/forgot-password` (route absente)
- Flow d'envoi d'email de réinitialisation
- `POST /api/auth/reset-password?token=xxx` (route absente)
- Gestion des tokens expirés dans le flow

**Impact** : Un utilisateur ayant perdu son mot de passe est bloqué. Le seul recours est de contacter un admin pour réinitialisation manuelle — non documenté.

---

### P1-04 — Flow "Onboarding utilisateur importé" absent

**Problème** : Le Flux 5 couvre la création manuelle (affichage du mot de passe temporaire), mais F-NEW-02 (import CSV) et Flux 8 (sync LDAP) ne précisent jamais comment le nouvel utilisateur peut se connecter.

**Manquant** :
- F-NEW-02 : les N utilisateurs créés reçoivent-ils un email de bienvenue avec un lien de première connexion ?
- F-NEW-02 : quel est leur mot de passe initial ? Généré automatiquement ? Affiché dans le résumé d'import ?
- Flux 8 (LDAP sync) : "Les nouveaux utilisateurs reçoivent le rôle `employee` par défaut" — mais avec quel `authSource` ? Comment se connectent-ils (LDAP) ?
- Si aucun email n'est envoyé, les utilisateurs importés sont des comptes zombies

**Impact** : Des centaines d'utilisateurs peuvent être créés via import sans aucun moyen de se connecter.

---

### P1-05 — Flow "Lancement campagne avec targetScope" partiel (F-NEW-06)

**Problème** : F-NEW-06 définit la saisie du `targetScope` dans le formulaire campagne, mais ne définit pas **ce qui se passe au lancement** — qui reçoit quoi.

**Manquant** :
- `POST /api/campaigns/:id/launch` est absent (cf. `01-routes.md` P1-04) — le lancement passe par `PATCH` avec `status: 'active'`
- Le flow de génération automatique des couples évaluateur/évalué depuis le `targetScope` n'est pas défini
- Si `targetScope.type = 'department'` → un algorithme crée des évaluations pour tous les users du département — mais quel formulaire est assigné ? Quel évaluateur ?
- Aucun flow ne couvre le lancement avec scope vide (0 utilisateurs ciblés)

**Impact** : Le flow est fonctionnellement incomplet. L'UI permet de configurer un scope mais son effet réel sur la campagne reste opaque.

---

### P1-06 — Flow "Rejet d'une demande RH" absent

**Problème** : F-NEW-05 liste le statut "rejected" dans les filtres de la liste, mais aucun flow ne définit le rejet d'une demande ni ses effets.

**Manquant** :
- Flow de notification de l'employé quand sa demande est rejetée/approuvée
- `PATCH /api/hr/flags/:evalId/status { status: 'rejected', internalNote }` est fait côté RH mais :
  - L'employé est-il notifié ? Via quel mécanisme ?
  - La note interne est-elle visible par l'employé ou seulement par la RH ?
  - Peut-il re-soumettre après un rejet ?
- Côté employé (F-NEW-04) : la demande apparaît en statut "En attente" — mais où voit-il qu'elle a été rejetée ou approuvée ? Le flow de suivi n'existe pas.

**Impact** : La communication employé ↔ RH sur les demandes est unilatérale. L'employé soumet dans un trou noir.

---

## 🟠 P2 — Chemins d'erreur manquants

### P2-01 — Session expirée en cours de flow multi-étapes (Flux 2, 4, 5, 6)

**Problème** : Le Flux 1 documente que le 401 déclenche une redirection vers `/login?returnUrl=...`. Mais pour les flows multi-étapes :

- **Flux 2** (campagne) : session expire entre la saisie du formulaire et le `POST /api/campaigns` → les données du formulaire sont-elles perdues ? Le `returnUrl` renverrait vers `/campaigns/new` avec un formulaire vide.
- **Flux 4** (évaluation) : session expire pendant la rédaction → la sauvegarde auto envoie un 401, le formulaire redirige. Les données non encore sauvegardées (depuis la dernière auto-save) sont perdues. Ce cas n'est pas documenté (section 8.5 mentionne l'échec réseau, pas l'expiration de session).
- **Flux 6** (offboarding) : session expire entre `POST /api/offboarding` et `PATCH /api/users/:id/offboard` → état incohérent possible.

**Correction** : Documenter pour chaque flow multi-étapes le comportement en cas de 401 intermédiaire (perte de données ? draft local ? prompt de reconnexion sans perte ?).

---

### P2-02 — 500 au milieu d'un flow multi-étapes (Flux 6, Flux 4 bulk)

**Problème** : Lié au bug `P2-02` de `01-routes.md` (absence de transaction MongoDB sur offboarding).

- **Flux 6** : `POST /api/offboarding` réussit → `PATCH /api/users/:id/offboard` (archive évaluations + user.save()) → si `user.save()` réussit mais `Evaluation.updateMany` échoue, l'utilisateur est archivé mais ses évaluations restent actives. Le flow UX ne documente pas ce cas ni comment le RH peut le récupérer.
- **Flux 4 bulk** : `POST /api/evaluations/bulk` retourne un `207 Multi-Status` — le flow indique "Résumé du résultat `{succès: N, doublons ignorés: M, erreurs: K}`" mais ne documente pas ce que le HR doit faire si `K > 0` (retry uniquement les erreurs ? réimporter tout ?).

---

### P2-03 — Rafraîchissement de page pendant un formulaire (Flux 2, 3, 4)

**Problème** : Aucun flow ne documente le comportement en cas de rafraîchissement de page pendant la saisie d'un formulaire :
- **Flux 2** (création campagne) : F5 sur `/campaigns/new` → le formulaire vierge s'affiche. Pas de récupération de données.
- **Flux 3** (formulaire builder) : F5 sur `/forms/:id` en cours d'édition → rechargement depuis l'API, modifications non sauvegardées perdues.
- **Flux 4** (évaluation) : section 8.5 couvre la sauvegarde auto, mais si le rafraîchissement arrive entre deux cycles de 30 s ?

**Correction** : Documenter l'usage de `localStorage`/`sessionStorage` ou `beforeunload` pour avertir l'utilisateur.

---

### P2-04 — Réseau coupé pendant upload (F-NEW-02, Flux 7)

**Problème** : F-NEW-02 couvre le "Timeout réseau" (toast warning + réessayer), mais pas la coupure réseau **pendant** l'upload multipart :
- Le fichier est partiellement transmis → le serveur reçoit un body incomplet → 400 ou 500 ?
- L'état côté frontend : le bouton est en `loading`, la connexion est perdue. Que se passe-t-il ?
- La bannière hors-ligne de la section 5.3 s'affiche, mais le bouton de retry réinitialise-t-il l'upload depuis le début ?
- Flux 7 (upload ressource) : aucun flow d'upload de fichier n'existe du tout (seul le téléchargement est documenté).

---

### P2-05 — PATCH évaluation par manager : vérification appartenance équipe non mentionnée

**Problème** : `03-security.md` (P2-01) identifie une vulnérabilité critique : un manager peut modifier les `answers` d'une évaluation hors de son équipe.

Le Flux 4 (Étape C) décrit le manager qui "Saisie du score et du commentaire reviewer" mais ne mentionne à aucun moment :
- Que le frontend devrait n'afficher que les évaluations de son équipe
- Que le backend devrait vérifier `evaluatee.managerId === req.user.id`
- Ce qui se passe si un manager accède directement à `/evaluations/:id` avec un ID hors de son périmètre

**Correction** : Le flow doit documenter que l'accès direct à `/evaluations/:id` par un manager hors-périmètre retourne 403, et que l'UI affiche un message approprié (pas une page blanche).

---

### P2-06 — Export CSV audit : protection formula injection non mentionnée

**Problème** : `03-security.md` (P2-02) identifie une vulnérabilité d'injection de formule CSV sur `GET /api/admin/audit/export`.

Le Flux 9 (Journal d'audit) documente le bouton "Exporter en CSV" mais ne mentionne :
- Aucun avertissement à l'utilisateur sur les données sensibles
- Aucun test côté frontend des valeurs commençant par `=`, `+`, `-`, `@`
- La correction côté serveur (`csvEscape` à corriger) n'est pas reflétée dans le flow UX

**Correction** : Le flow devrait noter que les valeurs exportées sont sanitisées côté serveur (une fois la correction P2-02 de `03-security.md` appliquée).

---

### P2-07 — Flow "disagreementFlag" → que fait la RH ?

**Problème** : Le Flux 4 (Étape D — Signature de l'évalué) mentionne le toggle "Je conteste ce bilan" qui lève un `disagreementFlag`. Mais aucun flow ne définit ce qui se passe ensuite :
- La RH est-elle notifiée du désaccord ?
- Y a-t-il une route dédiée ? (non : le flag est dans le `PATCH` évaluation)
- Comment la RH visualise-t-elle les évaluations avec `disagreementFlag=true` (filtre ?)
- Peut-elle forcer la progression malgré le désaccord ?
- Le manager est-il informé ?

---

### P2-08 — Transitions "expired" et "archived" dans les flows

**Problème** : La machine à états (section 3.2) montre les transitions vers `expired` et `archived` mais aucun flow ne les documente :
- **expired** : "deadline dépassée" → qui déclenche `POST /api/evaluations/:id/expire` ? Un job serveur ? Un admin manuel ? Le flow RH de gestion des expirations n'existe pas.
- **archived** : "(offboarding)" → couvert par Flux 6, mais que voit le manager d'un évalué offboardé sur ses évaluations en cours ? Apparaissent-elles en "archivées" dans sa liste ?
- Flow "réassignation" (`PATCH /api/evaluations/:id/reassign`) : aucun flow UX défini.

---

### P2-09 — Flow de notification RH lors d'une nouvelle demande (F-NEW-04)

**Problème** : F-NEW-04 (étape 8) indique "toast success : Demande envoyée aux RH" mais ne définit pas :
- Comment la RH est informée de la nouvelle demande (email ? notification in-app ?)
- F-NEW-05 mentionne un "badge rouge sur la navbar" — mais le mécanisme de mise à jour n'est pas défini : polling `GET /api/hr/flags/count` (route absente de `01-routes.md`) ou push WebSocket ?
- Si c'est du polling : qui initialise ce polling ? À quelle fréquence ? Sur quelles pages ?

---

### P2-10 — Flow "désactivation utilisateur" → évaluations en cours

**Problème** : Aucun flow ne documente ce qui se passe lorsqu'un admin désactive un utilisateur (`PATCH /api/users/:id { isActive: false }`) hors du processus d'offboarding :
- Ses évaluations en cours (`assigned`, `in_progress`, `submitted`) restent-elles actives ?
- Le manager voit-il toujours l'évaluation dans sa liste "à traiter" ?
- L'évalué peut-il encore se connecter pour signer ? (`isActive: false` → 401 à chaque requête → non)
- Différence avec l'offboarding (qui archive explicitement) : non documentée.

---

### P2-11 — `PATCH /api/auth/password` absent des routes (Flux 10)

**Problème** : Le Flux 10 (section "Changement de mot de passe") appelle `PATCH /api/auth/password` mais cette route est absente de `01-routes.md`. Les routes auth listées sont : `POST /login`, `POST /logout`, `GET /me`, `PATCH /preferences`.

**Impact** : Le changement de mot de passe depuis le profil est non fonctionnel côté backend. Le flow existe côté UX mais la route API n'existe pas.

---

### P2-12 — `GET /api/hr/flags/count` absent des routes (F-NEW-05)

**Problème** : F-NEW-05 mentionne un polling `GET /api/hr/flags/count` (toutes les 30 s) pour mettre à jour le badge navbar. Cette route n'est pas dans `01-routes.md`. `GET /api/hr/flags` existe mais retourne les évaluations complètes sans pagination — trop lourd pour du polling fréquent.

---

### P2-13 — Flow "clôture de campagne" → notifications non documentées

**Problème** : Le Flux 2 mentionne le bouton "Clôturer" → `PATCH /api/campaigns/:id { status: 'closed' }` mais ne documente pas :
- Y a-t-il des notifications automatiques envoyées aux évalués/managers ?
- Les évaluations en cours sont-elles forcées à un état final ?
- Comment les évalués sont-ils informés de la clôture ?

La machine à états (section 3.1) montre `ACTIVE → CLOSED` mais aucun flow n'en décrit les effets de bord.

---

### P2-14 — Flow "suppression d'une campagne draft" → rollback

**Problème** : Le Flux 2 mentionne le bouton "Supprimer" sur une campagne `draft` mais ne documente pas :
- `DELETE /api/campaigns/:id` déclenche `Evaluation.deleteMany` + `Form.deleteMany` + `campaign.deleteOne()` sans transaction (cf. `01-routes.md` P2-03).
- En cas d'échec partiel, la campagne peut être supprimée sans ses évaluations, ou vice versa.
- Le flow UX ne prévoit pas de page de confirmation différenciée indiquant "X évaluations seront aussi supprimées".

---

## 🟡 P3 — Edge cases non couverts

### P3-01 — Flux LDAP : première connexion des utilisateurs synchronisés

Flux 8 mentionne que "les nouveaux utilisateurs reçoivent le rôle `employee` par défaut" mais ne documente pas leur `authSource` (`ldap` ou `local`) ni leur processus de première connexion. Si `authSource=ldap`, ils doivent utiliser `/login/ldap` — cela devrait être documenté dans un flow de bienvenue.

---

### P3-02 — Flux 4 : bulk sign RH — comportement si déjà signé

La section D (Signature RH) mentionne "HR peut signer depuis `/evaluations` en actions bulk (`sign_hr` sur sélection multiple)" mais ne documente pas ce qui se passe si une ou plusieurs évaluations sélectionnées ont déjà le statut `signed_hr` ou `validated`. 207 multi-status retourné ? Erreurs inline ?

---

### P3-03 — F-NEW-06 : modification du scope sur campagne active

Le flow documente "scope gelé au lancement" mais ne documente pas le message d'erreur affiché si un admin tente de modifier le scope d'une campagne active (403 ? champs désactivés côté frontend ? toast d'explication ?).

---

### P3-04 — F-NEW-05 : traitement concurrent de la même demande

Si deux agents RH ouvrent simultanément la même demande dans le panneau S-38-P1 et la traitent tous les deux, le dernier `PATCH` écrase silencieusement le premier. Pas de mécanisme de verrouillage optimiste (`If-Match`, `updatedAt` check) ni de message d'avertissement documenté.

---

### P3-05 — Flux 5 : step onboarding déjà coché — comportement non défini

Si un employé essaie de "dé-cocher" un step d'onboarding déjà coché (ou si admin et employé cochent en même temps), `PATCH /api/users/:id/onboarding/:stepIndex` — le flow ne documente pas si cette action est permise ou bloquée.

---

### P3-06 — Flux 7 : upload de ressource non documenté

Le Flux 7 documente le **téléchargement** de ressource et mentionne le formulaire de création admin (`/resources/new` avec "upload fichier"), mais aucun flow d'upload n'est défini :
- Drag & drop ou sélecteur de fichier ?
- Taille maximale ? Types MIME acceptés ?
- Comportement si l'upload échoue à mi-parcours ?

---

### P3-07 — Machine à états : transition `reviewed → signed_hr` (skip évalué/manager)

La machine à états (section 3.2, tableau) indique qu'en statut `reviewed`, le bouton "Signer RH" est disponible pour HR/Admin — permettant de skipper les signatures évalué et manager. Ce comportement est mentionné implicitement mais aucun flow ne documente :
- Quand/pourquoi la RH signerait avant l'évalué ou le manager ?
- Y a-t-il une confirmation spéciale ("Signer sans attendre la signature de l'employé") ?

---

### P3-08 — Flux 4 : manager soumet pour un employé absent/désactivé mid-flow

Scénario : l'évaluation est `submitted`, le manager ouvre la revue, mais entre-temps l'employé est désactivé (offboarding d'urgence). Le manager clique "Valider la revue" → `PATCH` → succès côté API. Mais les étapes de signature suivantes (notification à l'évalué) ne peuvent jamais être complétées. Aucun flow ne couvre ce cas.

---

## ✅ Flows complets

| ID | Flow | Raison |
|----|------|--------|
| F-NEW-01 | Drag & Drop Organigramme | Happy path + 4 chemins d'erreur (409 cycle, 400, annulation, hors-ligne) |
| F-NEW-03 | Import formulaire JSON | Happy path + erreurs client + 400 serveur + limite taille |
| F-NEW-07 | Import données N-1 | Happy path + 3 chemins d'erreur API (204, 403, 500) + règles de visibilité |
| F-NEW-08 | Gestion secteurs | Happy path + 3 chemins d'erreur (409 suppression, 409 doublon, rollback drag) |
| F-NEW-09 | Manager N+1 | Happy path + limitation v2 documentée + 3 chemins d'erreur |

---

## 📋 Nouveaux flows à créer

| Priorité | ID Suggéré | Titre | Acteurs | Routes concernées |
|----------|------------|-------|---------|------------------|
| 🔴 P1 | F-MISS-01 | Notifications — liste & lecture | Tous | `GET /api/notifications` + `PATCH /api/notifications/:id/read` (à créer) |
| 🔴 P1 | F-MISS-02 | Dashboard — chargement des widgets | Tous (par rôle) | `GET /api/dashboard` (à créer) |
| 🔴 P1 | F-MISS-03 | Mot de passe oublié & réinitialisation | Public | `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` (à créer) |
| 🔴 P1 | F-MISS-04 | Première connexion d'un utilisateur importé | Employé (nouvel arrivant) | `POST /api/users/import` (email de bienvenue à définir) |
| 🔴 P1 | F-MISS-05 | Lancement campagne avec génération évaluations | HR / Admin | `PATCH /api/campaigns/:id { status: 'active' }` + algo targetScope |
| 🔴 P1 | F-MISS-06 | Rejet/approbation demande + notification employé | HR / Admin + Employé | `PATCH /api/hr/flags/:evalId/status` |
| 🟠 P2 | F-MISS-07 | Désaccord employé (disagreementFlag) → flow RH | HR / Admin | `GET /api/hr/flags` (filtre disagreement) |
| 🟠 P2 | F-MISS-08 | Expiration forcée d'une évaluation | HR / Admin | `POST /api/evaluations/:id/expire` |
| 🟠 P2 | F-MISS-09 | Réassignation d'une évaluation | HR / Admin | `PATCH /api/evaluations/:id/reassign` |
| 🟠 P2 | F-MISS-10 | Désactivation utilisateur hors offboarding | Admin | `PATCH /api/users/:id { isActive: false }` |
| 🟠 P2 | F-MISS-11 | Clôture d'une campagne → effets de bord | HR / Admin | `PATCH /api/campaigns/:id { status: 'closed' }` |
| 🟠 P2 | F-MISS-12 | Changement de mot de passe | Tous | `PATCH /api/auth/password` (à créer) |
| 🟠 P2 | F-MISS-13 | Upload fichier ressource documentaire | HR / Admin | `POST /api/resources` (multipart) |

---

## Résumé exécutif

| Métrique | Valeur |
|----------|--------|
| Flows audités | **19** (Flux 1–10 + F-NEW-01–09) |
| ✅ Flows complets | **5** (F-NEW-01, 03, 07, 08, 09) |
| ❌ Flows incomplets | **14** |
| 🔴 P1 — Flows manquants bloquants | **6** |
| 🟠 P2 — Chemins d'erreur manquants | **14** |
| 🟡 P3 — Edge cases non couverts | **8** |
| 📋 Nouveaux flows à créer | **13** |

### Points critiques pour les agents aval

1. **Notifications** (F-MISS-01) : l'UI est entièrement décrite mais les 3 routes API nécessaires n'existent pas — l'icône 🔔 ne peut pas fonctionner.
2. **Dashboard** (F-MISS-02) : page d'accueil sans API — le frontend doit faire N appels non documentés.
3. **Mot de passe oublié** (F-MISS-03) : flux d'authentification incomplet — bloquant pour les utilisateurs locaux.
4. **PATCH /api/auth/password absent** (P2-11) : changement de MDP depuis le profil entièrement non fonctionnel.
5. **GET /api/hr/flags/count absent** (P2-12) : le badge RH de demandes ne peut pas se rafraîchir.
6. **disagreementFlag → aucun flow** (P2-07) : une évaluation contestée par l'employé entre dans un état terminal non géré.
7. **CSV injection** (P2-06) : la correction de `03-security.md` P2-02 doit être appliquée avant que le flow d'export audit ne soit marqué complet.
8. **RBAC answers manager** (P2-05) : la correction de `03-security.md` P2-01 doit être reflétée dans le flow Flux 4 (vérification que le manager ne voit que son périmètre).
