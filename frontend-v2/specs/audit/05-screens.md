# Audit Écrans — NX-RH

> **Agent** : 05 — Auditeur des écrans (Vague 2)
> **Sources** : `03-screens.md` · `audit/01-routes.md` · `audit/02-models.md` · `05-notifications.md`
> **Périmètre** : 41 écrans (S-01→S-41 hors S-37, + S-10b)
> **Date** : 2025

---

## Matrice des 41 écrans

Légende — **Vide** : ✅ défini / 🌐 pattern global / ⚠️ partiel / ❌ absent / N/A = non applicable
**Loading** : ✅ explicite / 🌐 pattern global / ❌ absent
**Erreur** : ✅ explicite / 🌐 pattern global / ⚠️ partiel / ❌ absent
**Mobile** : ✅ défini / ⚠️ partiel / ❌ absent
**Actions OK** : ✅ tous endpoints OK / ⚠️ endpoint manquant ou discordant / ❌ endpoint absent

> Le « pattern global » (🌐) couvre skeleton shimmer pour le loading, alert+retry pour l'erreur 500, et SVG+CTA pour l'état vide. Il **ne couvre pas** les 404, 403, ni les toasts post-action.

| ID | Écran | URL | Vide | Loading | Erreur | Mobile | Actions OK |
|----|-------|-----|------|---------|--------|--------|-----------|
| S-01 | Connexion | `/login` | N/A | ✅ | ✅ | ✅ | ✅ |
| S-02 | Connexion LDAP | `/login/ldap` | N/A | 🌐 | ⚠️ | ⚠️ | ✅ |
| S-03 | Dashboard (5 var.) | `/` | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ **P1** |
| S-04 | Liste utilisateurs | `/users` | ✅ | 🌐 | 🌐 | ✅ | ✅ |
| S-05 | Créer utilisateur | `/users/new` | N/A | 🌐 | ⚠️ | ✅ | ✅ |
| S-06 | Profil utilisateur | `/users/:id` | ⚠️ | 🌐 | 🌐 | ✅ | ✅ |
| S-07 | Modifier utilisateur | `/users/:id/edit` | N/A | 🌐 | 🌐 | ✅ | ✅ |
| S-08 | Redirect offboarding | `/users/:id/offboarding` | ❌ | ❌ | ❌ | ❌ | ✅ |
| S-09 | Liste campagnes | `/campaigns` | ✅ | 🌐 | 🌐 | ✅ | ✅ |
| S-10 | Créer campagne | `/campaigns/new` | N/A | ❌ | ❌ | ✅ | ✅ |
| S-10b | Modifier campagne | `/campaigns/:id/edit` | N/A | ❌ | ❌ | ✅ | ✅ |
| S-11 | Détail campagne | `/campaigns/:id` | ⚠️ | ❌ | ❌ | ✅ | ✅ |
| S-12 | Analytics campagne | `/campaigns/:id/analytics` | ✅ | ❌ | ❌ | ✅ | ✅ |
| S-13 | Bibliothèque formulaires | `/forms` | ✅ | 🌐 | 🌐 | ✅ | ✅ |
| S-14 | Créer formulaire | `/forms/new` | N/A | ❌ | ❌ | ✅ | ⚠️ |
| S-15 | Éditer formulaire | `/forms/:id` | N/A | ❌ | ❌ | ❌ | ✅ |
| S-16 | Liste évaluations | `/evaluations` | ✅ | ❌ | ❌ | ✅ | ✅ |
| S-17 | Évaluation (4 modes) | `/evaluations/:id` | N/A | ❌ | ❌ | ✅ | ✅ |
| S-18 | Historique | `/evaluations/history` | ✅ | 🌐 | 🌐 | ✅ | ✅ |
| S-19 | Calendrier | `/events` | ✅ | ❌ | ❌ | ✅ | ✅ |
| S-20 | Détail événement | `/events/:id` | N/A | ❌ | ❌ | ❌ | ✅ |
| S-21 | Bibliothèque ressources | `/resources` | ✅ | ❌ | ❌ | ✅ | ✅ |
| S-22 | Détail ressource | `/resources/:id` | N/A | ❌ | ❌ | ❌ | ✅ |
| S-23 | Liste offboardings | `/offboarding` | ✅ | 🌐 | 🌐 | ✅ | ✅ |
| S-24 | Dossier offboarding | `/offboarding/:id` | N/A | ❌ | ❌ | ✅ | ✅ |
| S-25 | Analytics global | `/analytics` | ✅ | ❌ | ❌ | ✅ | ✅ |
| S-26 | Hub administration | `/admin` | N/A | 🌐 | 🌐 | ❌ | ✅ |
| S-27 | Config système | `/admin/config` | ❌ | ❌ | ❌ | ❌ | ✅ |
| S-28 | Config LDAP | `/admin/ldap` | N/A | ❌ | ⚠️ | ❌ | ✅ |
| S-29 | Journal d'audit | `/admin/audit` | ✅ | ❌ | ❌ | ✅ | ✅ |
| S-30 | Gestion avancée RGPD | `/admin/users` | ⚠️ | 🌐 | 🌐 | ❌ | ✅ |
| S-31 | Mon profil | `/profile` | N/A | ❌ | ❌ | ❌ | ✅ |
| S-32 | Préférences | `/profile/preferences` | N/A | ❌ | ❌ | ✅ | ✅ |
| S-33 | Flux onboarding | `/onboarding` | N/A | ❌ | ❌ | ✅ | ✅ |
| S-34 | Paramètres système | `/admin/settings` | N/A | ❌ | ❌ | ✅ | ⚠️ |
| S-35 | Paramètres RH | `/hr/settings` | N/A | ❌ | ❌ | ✅ | ⚠️ |
| S-36 | Templates mail | `/admin/mail-templates` | ❌ | ❌ | ❌ | ❌ | ✅ |
| S-38 | Demandes collaborateurs | `/hr/flags` | ❌ | ❌ | ❌ | ❌ | ⚠️ **P1** |
| S-39 | Organigramme | `/admin/orgchart` | ❌ | ❌ | ❌ | ✅ | ⚠️ |
| S-40 | Import utilisateurs | `/admin/users/import` | N/A | ❌ | ⚠️ | ✅ | ⚠️ |
| S-41 | Import formulaire JSON | `/admin/forms/import` | N/A | ❌ | ✅ | ✅ | ✅ |

---

## 🔴 P1 — Écrans avec routes manquantes / bloquants

### P1-SCR-01 — Écran `/notifications` entièrement absent

**Lien avec** : P1-01 et P1-02 de `01-routes.md` · Modèle `Notification` absent (`02-models.md`)

`05-notifications.md` définit un système complet de notifications in-app (14 types, badge non-lu, pagination 20/page, CTA par notification). La navbar mentionne une icône « cloche » avec compteur `unreadCount`. Mais **aucun écran `/notifications` n'est défini dans `03-screens.md`**.

Manque à définir :
- URL : `/notifications`
- Rôles : Tous (authGuard)
- Layout : liste groupée par date · badge non-lu · pagination · état vide « Pas de notification »
- Interactions : clic sur notif → CTA link · `PATCH /api/notifications/:id/read` (marquer lu) · « Tout marquer comme lu »
- Endpoints requis : `GET /api/notifications?unreadOnly=&limit=20&page=` (absent) · `PATCH /api/notifications/:id/read` (absent) · `GET /api/notifications?unreadOnly=true&limit=1` (polling badge)
- Sans cet écran + ces routes, la cloche navbar est non-fonctionnelle

**Bloquant UX** — dépend aussi de la création du modèle `Notification` (P1 de `02-models.md`).

---

### P1-SCR-02 — S-03 Dashboard : `GET /api/dashboard` absent

**Lien avec** : P1-03 de `01-routes.md`

Le tableau de bord (5 variantes) affiche des agrégats qui nécessitent un endpoint dédié `/api/dashboard`. En l'absence de cet endpoint, le frontend doit effectuer **6 à 8 appels parallèles** pour assembler la page :

| Variante | Appels API nécessaires |
|----------|----------------------|
| A (Admin) | GET users (count) + GET campaigns (count) + GET evaluations (count) + GET offboarding (count) + GET admin/audit (10 lines) + actions urgentes (évals expirées) |
| B (RH) | GET campaigns (active) + GET evaluations (submitted/signed) + GET events (upcoming) |
| C (Directeur) | GET users (département) + GET evaluations (scope dept.) |
| D (Manager) | GET evaluations (évaluateur=me) + GET users (managerId=me) + GET events |
| E (Employé) | GET evaluations (évalué=me) + GET events + GET resources (last 3) + GET evaluations/history |

**Risque** : waterfalls de requêtes → flash de contenu · incohérence si une requête échoue partiellement.
**Suggestion** : créer `GET /api/dashboard?role=admin|hr|director|manager|employee` retournant un objet agrégé selon le rôle de l'utilisateur authentifié.

**États UI incomplets** : Les variantes A/B/C/D ne définissent pas d'état vide (ex. : aucune campagne active, équipe sans évaluation).

---

### P1-SCR-03 — S-38 Demandes RH : filtres définis dans l'écran, mais absent de la route

**Lien avec** : P2-06 de `01-routes.md`

L'écran S-38 définit une `FilterBar` avec 5 filtres : `Type` · `Statut` · `Période (date range)` · `Département` · `Secteur`. Le panneau latéral cite explicitement :
```
GET /api/hr/flags?type=...&status=...&from=...&to=...&department=...&sector=...
```

Or, `GET /api/hr/flags` (01-routes.md) **ne supporte aucun de ces paramètres** : aucune pagination, aucun tri, aucun filtre. La route retourne toutes les évaluations de type `request` en masse.

**Conséquence** : Les 5 filtres de l'écran sont non-fonctionnels côté backend. Le frontend devra filtrer en mémoire (dangereux sur grand volume) ou la route devra être étendue.

**Autres états manquants** : S-38 ne définit pas d'état vide, de loading, d'erreur, ni de version mobile.

---

### P1-SCR-04 — S-03 et S-31 : `/api/users/me` vs `/api/auth/me`

**Lien avec** : P1-07 de `01-routes.md`

S-31 (Mon profil) et S-03 (Dashboard) chargent le profil de l'utilisateur courant. Si le frontend est codé avec `GET /api/users/me` (convention REST standard) au lieu de `GET /api/auth/me` (convention actuelle), tous ces écrans seront en 404. À vérifier impérativement dans l'implémentation des hooks React Query.

---

## 🟠 P2 — États UI incomplets

### P2-SCR-01 — Gestion 404 absente sur toutes les routes `/:id`

**Écrans concernés** : S-06 · S-07 · S-08 · S-11 · S-15 · S-17 · S-20 · S-22 · S-24 · S-28 (test LDAP)

Aucun écran `/:id` ne définit ce qui se passe si l'API retourne 404 (ressource introuvable) ou 403 (accès interdit à cet ID précis). Le pattern global couvre uniquement les erreurs 500. À définir :
- **404** : Page « Introuvable » centrée avec bouton « Retour » ou redirect vers la liste.
- **403** : Redirect vers `/` avec toast `error` « Accès non autorisé ».

Sans cette définition, les développeurs implémenteront des comportements hétérogènes (certains redirects, d'autres pages blanches).

---

### P2-SCR-02 — États de chargement manquants sur les formulaires

**Écrans concernés** : S-10 · S-10b · S-11 · S-12 · S-14 · S-15 · S-16 · S-17 · S-19 · S-21 · S-24 · S-25 · S-27 · S-28 · S-29 · S-31 · S-33 · S-36 · S-39

Ces écrans ne définissent pas de skeleton de chargement. Le pattern global est défini mais non confirmé comme appliqué ici. En particulier :
- **S-17** (évaluation) : Si le formulaire contient 20 questions, la page doit afficher un skeleton pendant le chargement, pas une page vide.
- **S-39** (organigramme D3) : L'arbre SVG peut prendre 1–3 s à calculer. Un spinner centré doit remplacer la zone vide.
- **S-28** (LDAP sync) : Le bouton « Lancer la synchronisation » mentionne un « progress indicator » mais sans définition (progress bar ? spinner ? étapes ?)

---

### P2-SCR-03 — Toasts de succès/erreur manquants

Les écrans suivants définissent des actions CRUD sans mentionner de toast de retour :

| Écran | Action sans toast |
|-------|-------------------|
| S-10 / S-10b | Création/modification campagne (succès + 400 validation) |
| S-11 | Transition de statut (activate, close, archive) |
| S-14 / S-15 | Sauvegarde formulaire + suppression |
| S-16 | Export CSV |
| S-17 | Signature (3 étapes) |
| S-19 / S-20 | Création, modification, suppression événement |
| S-21 / S-22 | Publier/dépublier ressource · modification |
| S-24 | Cocher item checklist · sauvegarder notes |
| S-25 | Export PDF |
| S-27 | Créer/modifier/supprimer clé config |
| S-28 | Sauvegarder config LDAP |
| S-33 | Chaque étape onboarding |
| S-39 | Changement manager (drag & drop) · changer rôle/secteur |
| S-40 | Import réussi (N créés) |

La convention globale situe les toasts en `fixed bottom-4 right-4` avec auto-dismiss 4 s, mais leur déclenchement doit être confirmé par chaque écran.

---

### P2-SCR-04 — Redirections post-action non définies

| Écran | Action | Redirect manquante |
|-------|--------|-------------------|
| S-07 | Sauvegarde modifier utilisateur | → `/users/:id` ? ou rester sur la page ? |
| S-11 | Suppression campagne | → `/campaigns` |
| S-15 | Suppression formulaire | → `/forms` |
| S-20 | Suppression événement | → `/events` |
| S-24 | Passage statut `completed` (user désactivé) | → `/offboarding` ou rester ? |
| S-24 | Suppression dossier offboarding | → `/offboarding` |
| S-30 | Anonymisation RGPD | → `/admin/users` |

---

### P2-SCR-05 — S-08 : redirect sans gestion d'erreur

S-08 (`/users/:id/offboarding`) redirige vers `/offboarding/:offboardingId`. Aucun cas d'erreur défini :
- Que se passe-t-il si l'utilisateur n'a **pas** de dossier d'offboarding en cours ?
- Si plusieurs dossiers existent (status `completed` + nouveau) : lequel est retourné ?

À définir : `GET /api/offboarding?userId=:id` → si aucun résultat → redirect vers `/offboarding?userId=:id` avec message informatif. Si 404 → page erreur.

---

### P2-SCR-06 — S-11 : état vide des onglets non défini

S-11 (Détail campagne) a 3 onglets. L'onglet « Aperçu » a un état défini, mais :
- **Onglet Évaluations** : que voit-on si aucune évaluation n'a encore été créée pour cette campagne ?
- **Onglet Formulaires** : que voit-on si aucun formulaire n'est lié ?

---

### P2-SCR-07 — S-06 : onglet Évaluations sans état vide

L'onglet « Évaluations » du profil utilisateur (S-06) affiche le tableau des évaluations de cet utilisateur. Aucun état vide défini pour un utilisateur sans évaluation.

---

### P2-SCR-08 — S-34/S-35 : discordance PUT vs PATCH sur `/api/admin/config/batch`

S-34 et S-35 appellent `PATCH /api/admin/config/batch`, mais `01-routes.md` documente `PUT /api/admin/config/batch`. La méthode HTTP diffère. Si le frontend envoie un PATCH, le serveur répondra 404 (route non définie). À corriger dans la spec écrans ou dans l'implémentation.

---

### P2-SCR-09 — S-40 : endpoint CSV template absent

S-40 affiche `[⬇ Télécharger le template CSV]`. Aucun endpoint backend n'est documenté pour ce téléchargement dans `01-routes.md` (seul `GET /api/forms/template` existe pour les formulaires). L'endpoint `/api/users/import/template` ou `/api/users/import?format=template` est à créer.

---

### P2-SCR-10 — S-39 : batch secteur sans endpoint

L'organigramme S-39 mentionne une sélection multiple des nœuds + bouton « Assigner au secteur (batch) ». Aucun endpoint bulk sector assignment n'existe dans `01-routes.md` (seul `PATCH /api/org/users/:id` est disponible pour une mise à jour unitaire). Cette action déclencherait N appels successifs ou nécessite un endpoint dédié `PATCH /api/org/users/bulk-sector`.

---

### P2-SCR-11 — S-27 : état vide de la liste config non défini

S-27 affiche un tableau des clés de configuration. Si la DB est vide (premier démarrage), aucun état vide n'est défini (illustration + message + « + Ajouter la première clé »).

---

### P2-SCR-12 — S-36 : état vide + mobile entièrement absents

S-36 (Templates mail) ne définit ni état vide, ni mobile, ni loading, ni erreur. La liste des templates est statique (7 templates) mais un problème d'API (GET /api/admin/mail-templates) laisserait l'écran sans retour.

---

### P2-SCR-13 — S-02 : états loading/erreur/mobile non confirmés

S-02 se décrit comme « identique à S-01, sans le séparateur LDAP » mais ne confirme pas explicitement l'héritage des états loading (bouton spinner), erreur (inline 401), et mobile. Si l'écran est implémenté sans lire S-01, ces états seront manquants.

---

### P2-SCR-14 — S-16 : modales bulk actions non définies

S-16 mentionne « Actions bulk : Archiver · Signer · Réaffecter — avec modale de confirmation » mais aucune de ces modales n'est spécifiée :
- Quel est le message de confirmation pour « Archiver N évaluations » ?
- « Réaffecter » : qui est le nouvel évaluateur ? Un sélecteur est-il dans la modale ?
- « Signer (RH) » : confirmation simple ou saisie requise ?

---

### P2-SCR-15 — S-31 onglet « Mes demandes » : formType non supporté dans GET /api/evaluations

S-31 appelle `GET /api/evaluations?formType=mobility_request,salary_raise_request,...`. Or, `GET /api/evaluations` dans `01-routes.md` ne documente pas le filtre `formType` — le filtre officiel est `campaignId`, `status`, `evaluateeId`, `evaluatorId`. Ce filtre sera ignoré côté backend et l'onglet retournera toutes les évaluations de l'utilisateur, pas seulement les demandes.

---

## 🟡 P3 — Responsive / accessibilité

### P3-SCR-01 — S-39 Organigramme : accessibilité SVG/D3 non définie

L'arbre D3/SVG ne définit aucune mesure d'accessibilité :
- Pas de `role="tree"` / `role="treeitem"` sur les nœuds
- Pas de navigation clavier (flèches pour déplier/replier)
- Le drag & drop n'est pas utilisable au clavier
- Pas d'alternative textuelle pour les branches/nœuds

---

### P3-SCR-02 — S-12/S-25 : graphes sans alternative accessible

Les graphes donut et histogrammes (recharts/SVG) ne mentionnent pas :
- `aria-label` sur les éléments SVG
- Tableaux de données alternatifs (pour lecteurs d'écran)
- Tooltips accessibles au clavier

---

### P3-SCR-03 — Modales sans focus trap défini

Aucune modale de l'application ne mentionne explicitement un focus trap. Les modales identifiées sans confirmation de gestion du focus :

| Modale | Écran | Risque |
|--------|-------|--------|
| S-06-M2 Anonymisation | S-06 | Formulaire danger — le tab doit rester dans la modale |
| S-11-M2 Suppression campagne | S-11 | Saisie de confirmation — focus sur le champ texte |
| S-17-M1 Soumission évaluation | S-17 | Action irréversible |
| S-06-M1 Offboard preview | S-06 | Action destructive |
| Toutes les modales « Danger » | Multiple | Règle WCAG 2.5 |

---

### P3-SCR-04 — S-14/S-16 : drag & drop non accessible au clavier

S-14 (FormBuilder, handle ⠿) et S-39 (organigramme) utilisent du drag & drop sans définir d'alternative clavier (ex. : boutons ↑ / ↓ pour réordonner les questions, ou un menu contextuel pour le déplacement dans l'arbre).

---

### P3-SCR-05 — S-16 : checkboxes bulk sans aria

La sélection multiple en S-16 (checkboxes + « Sélectionner tout ») n'indique pas les attributs `aria-checked`, `aria-label`, ni la gestion de l'état intermédiaire (indeterminate) pour « Sélectionner tout » quand une partie seulement est cochée.

---

### P3-SCR-06 — Mobile absent sur S-20, S-22, S-26, S-27, S-28, S-30, S-31, S-36, S-38

Ces 9 écrans n'ont pas de spécification mobile. Certains contiennent des tableaux denses (S-27, S-30, S-36) et des panels slide-over (S-38) qui nécessitent un comportement spécifique sur 375px.

Priorisation par criticité d'usage mobile :
- **S-38** (Demandes RH) : les RH peuvent consulter en mobilité — ⚠️
- **S-31** (Mon profil) : utilisé par les employés — ⚠️
- **S-27/S-28/S-30/S-36** : admin uniquement, usage desktop — 🟡 faible priorité

---

### P3-SCR-07 — S-03 Variantes A/B/C/D : responsive non défini

Seule la variante E (Employé) mentionne « Empilement vertical, cards pleine largeur ». Les variantes admin/RH/directeur/manager n'ont pas de définition mobile. Les grilles 12 colonnes avec KPI 3 ou 4 colonnes nécessitent un breakpoint pour les 375px.

---

### P3-SCR-08 — Formulaires sans aria-required / aria-invalid

Aucun écran (S-05, S-10, S-14, S-27) ne mentionne `aria-required="true"` pour les champs obligatoires ni `aria-invalid="true"` pour les champs en erreur de validation. Les `*` visuels ne suffisent pas pour l'accessibilité.

---

### P3-SCR-09 — S-18 Historique : pagination non définie, limité à 200

`GET /api/evaluations/history` est limité à 200 résultats hardcodés (P3-01 de `01-routes.md`). S-18 ne définit pas de pagination, ni ce qui se passe si l'utilisateur a > 200 entretiens. Un message « Affichage limité aux 200 derniers entretiens » devrait apparaître si `total > 200`.

---

### P3-SCR-10 — S-09 Campagnes : pagination absente dans la spec

S-09 affiche un tableau de campagnes sans mention de pagination. Pour une organisation avec beaucoup de campagnes (> 50), le tableau sera trop long. `GET /api/campaigns` ne documente pas de pagination dans `01-routes.md`.

---

### P3-SCR-11 — S-13 Formulaires : pagination absente

S-13 affiche une grille de formulaires sans pagination ni mention d'une limite par page.

---

## ✅ Écrans complets

Écrans dont les états UI, actions, mobile et navigation sont correctement définis :

| ID | Écran | Motif |
|----|-------|-------|
| S-01 | Connexion | Loading + erreurs inline (401/429/403) + mobile + redirect + LDAP conditionnel tous définis |
| S-04 | Liste utilisateurs | Empty state + mobile + filtres + pagination + actions ⋮ + modales tous définis |
| S-09 | Liste campagnes | Empty state + mobile + filtres statuts + actions bulk tous définis |
| S-17 | Évaluation | 4 modes, sauvegarde auto + toast, soumission modale, signatures multi-étapes, mobile tous définis |
| S-18 | Historique évaluations | Empty state + mobile définis (modulo limite 200 → P3) |
| S-23 | Liste offboardings | Empty state + mobile + motifs colorés + filtres définis |
| S-24 | Dossier offboarding | Checklist + confirmation completed + modal suppression + mobile définis |
| S-33 | Flux onboarding | Wizard 5 étapes + skip + redirect final + mobile définis |
| S-41 | Import formulaire JSON | Validation inline + aperçu avant import + erreurs typées + mobile définis |

---

## 📋 Écrans à créer

### E-NEW-01 — `/notifications` (P1 — Bloquant)

**Priorité** : 🔴 P1
**Rôles** : Tous (authGuard)
**Dépendances** : Route `GET /api/notifications` + `PATCH /api/notifications/:id/read` (P1-01/P1-02 de `01-routes.md`) + Modèle `Notification` (P1 de `02-models.md`)

Spec minimale à écrire :
```
URL : /notifications
Fil d'Ariane : Accueil › Notifications
H1 : « Mes notifications »                [Tout marquer comme lu] (Secondary)

[Section "Aujourd'hui"]
  ┌─────────────────────────────────────────────────────┐
  │ [●] [Icône type]  Titre de la notification          │
  │      Corps court (max 2 lignes)                     │
  │      Il y a 2 h  [CTA : Voir →]                    │
  └─────────────────────────────────────────────────────┘

[Section "Cette semaine"]
  ...

[Pagination : charger 20 suivantes]

Empty state : Illustration Bell + « Vous êtes à jour ! Aucune notification. »
Loading : Skeleton 3 lignes
Erreur : Alert + Réessayer
Mobile : Cards pleine largeur, icône sm
```

Endpoints : `GET /api/notifications?page=&limit=20` · `PATCH /api/notifications/:id/read` · `PATCH /api/notifications/read-all` (à créer)

---

### E-NEW-02 — `/evaluations/new` (P2 — Référencé mais absent)

**Priorité** : 🟠 P2
**Rôles** : Tous (employee, manager)
**Contexte** : S-31 (Mon profil, onglet Mes demandes) redirige vers `/evaluations/new?formId=<id>` pour créer une évaluation de type "demande RH" (mobilité, augmentation, etc.). Cet écran n'est pas défini.

Spec minimale :
```
URL : /evaluations/new?formId=:id&evaluateeId=me
Fil d'Ariane : Accueil › Évaluations › Nouvelle évaluation
Layout : Identique S-17 Mode A (remplissage)
Particularités :
  – Chargement du formulaire via GET /api/forms/:id
  – Création d'abord : POST /api/evaluations avec { formId, evaluateeId: userId, evaluatorId: null }
  – Puis redirect vers /evaluations/:newId pour remplissage
```

---

### E-NEW-03 — S-37 : emplacement vide à documenter

**Priorité** : 🟡 P3
La spec annonce 41 écrans avec « hors S-37 » mais ne fournit aucune explication. Si S-37 était planifié (un écran « Tableau de suivi temps réel » ou « Notifications center » ?), son absence devrait être documentée avec une décision explicite (reporté, annulé, fusionné avec un autre écran).

---

## Résumé exécutif

| Métrique | Valeur |
|----------|--------|
| Écrans définis | **41** (S-01→S-41 hors S-37, + S-10b) |
| ✅ Écrans complets | **9** |
| ⚠️ Écrans partiellement définis | **23** |
| ❌ Écrans insuffisants (≥ 3 lacunes majeures) | **9** |
| 🔴 P1 — Bloquants | **4** |
| 🟠 P2 — États UI / actions incomplètes | **15** |
| 🟡 P3 — Responsive / accessibilité | **11** |
| 📋 Écrans à créer | **3** (dont 1 P1) |

### Les 4 points P1 à traiter en priorité

1. **Créer l'écran `/notifications`** + les routes `GET/PATCH /api/notifications` + le modèle `Notification` — sans cela la cloche navbar est non-fonctionnelle.
2. **Créer `GET /api/dashboard`** ou documenter explicitement la stratégie multi-appels pour S-03 (avec gestion des états partiels si un appel échoue).
3. **Étendre `GET /api/hr/flags`** pour supporter les 5 filtres définis dans S-38, ajouter pagination.
4. **Vérifier la convention `/api/users/me` vs `/api/auth/me`** dans tous les hooks React Query qui chargent l'utilisateur courant.

### Observation transversale

Le pattern global (empty state · skeleton · alert-retry) est bien défini dans les conventions mais **n'est pas confirmé écran par écran**. Sur les ~20 formulaires et écrans de détail, les états 404 et 403 ne sont traités nulle part. Recommandation : créer un composant `<ResourceLoader>` centralisé qui encapsule loading/error/404/403 et le référencer dans chaque spec de détail.
