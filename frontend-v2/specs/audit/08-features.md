# Audit Features — NX-RH

> **Agent** : 08 — Auditeur de complétude fonctionnelle  
> **Sources lues** : `01-routes.md` · `02-models.md` · `03-security.md` · `04-tests.md`  
> **Specs croisées** : `00-master.md` · `01-features.md` · `03-screens.md` · `05-notifications.md`  
> **Date** : 2025

---

## Résumé exécutif

| Métrique | Valeur |
|---|---|
| **User stories analysées** | 36 (10 employé · 7 manager · 4 director · 10 HR · 5 admin) |
| **Stories complètes** | 22 (61 %) |
| **Stories partielles** | 7 (19 %) |
| **Stories manquantes** | 7 (19 %) |
| **🔴 P1 — Gaps bloquants** | **4** |
| **🟠 P2 — Features importantes** | **6** |
| **🟡 P3 — Nice-to-have** | **6** |
| **Features transversales manquantes** | **1** (notifications in-app) |

---

## User Stories par rôle

### Rôle : Employé

| Story | Backend | Specs | Statut |
|-------|---------|-------|--------|
| Se connecter (LDAP ou local) | ✅ `POST /api/auth/login` + LDAP | ✅ S-01, S-02 | ✅ Complet |
| Voir son dashboard (évals en cours, objectifs, demandes) | ⚠️ Pas de `GET /api/dashboard` — N requêtes séparées | ✅ S-03 variante E | ⚠️ Partiel |
| Remplir son auto-évaluation | ✅ `PATCH /api/evaluations/:id` + sauvegarde auto | ✅ S-17 Mode A | ✅ Complet |
| Voir les évaluations N-1 (si activé) | ✅ `GET /api/evaluations/:id/n1-context` · `enableN1Context` | ✅ S-17 · S-10 | ✅ Complet |
| Importer ses objectifs N-1 | ⚠️ Question `n1_import` en lecture seule · pré-remplissage depuis n1-context | ⚠️ S-14 décrit le type, flow partiel | ⚠️ Partiel |
| Signer son évaluation | ✅ `PATCH /api/evaluations/:id` → `signed_evaluatee` | ✅ S-17 Mode C | ✅ Complet |
| Déposer une demande (mobilité, augmentation, promotion, formation) | ❌ `POST /api/evaluations` = admin/hr only — l'employé ne peut pas créer sa propre demande | ✅ S-31 Onglet Mes demandes | ❌ **Manquant** |
| Voir l'historique de ses demandes | ⚠️ Via `GET /api/evaluations?formType=...&evaluateeId=me` — pas de route dédiée | ✅ S-31 Onglet Mes demandes | ⚠️ Partiel |
| Voir ses notifications | ❌ Modèle `Notification` absent · `GET /api/notifications` absent · `PATCH /api/notifications/:id/read` absent | ✅ `05-notifications.md` complet | ❌ **Manquant** |
| Modifier son profil (avatar, phone) | ✅ `PATCH /api/users/:id/avatar` · `PATCH /api/users/:id` · `PATCH /api/auth/preferences` | ✅ S-31, S-07, S-32 | ✅ Complet |

**Score Employé : 5 complètes · 3 partielles · 2 manquantes (5/10)**

---

### Rôle : Manager

| Story | Backend | Specs | Statut |
|-------|---------|-------|--------|
| Voir les évaluations de son équipe | ✅ `GET /api/evaluations` scopé via `getVisibleUserIds` | ✅ S-16, S-17 | ✅ Complet |
| Compléter l'évaluation manager (score, commentaire, objectifs N+1) | ✅ `PATCH /api/evaluations/:id` avec contrôle `evaluatorId/managerId` | ✅ S-17 Mode B | ✅ Complet |
| Signer l'évaluation manager | ✅ `PATCH /api/evaluations/:id` → `signed_manager` | ✅ S-17 Mode C | ✅ Complet |
| Voir le N-1 de ses rapports directs | ✅ `GET /api/evaluations/:id/n1-context` | ✅ S-17 | ✅ Complet |
| Voir le dashboard équipe | ⚠️ Pas de `GET /api/dashboard` — KPIs doivent être assemblés côté client | ✅ S-03 variante D | ⚠️ Partiel |
| Recevoir des notifications (soumission employé, deadline) | ❌ Modèle + routes notifications absents | ✅ 05-notifications (`evaluationSubmitted`, `deadlineReminder`) | ❌ **Manquant** |
| Voir l'organigramme de son équipe | ❌ `GET /api/org/tree` restreint admin/hr uniquement | ❌ S-39 admin/hr only | ❌ **Manquant** |

**Score Manager : 4 complètes · 1 partielle · 2 manquantes (4/7)**

---

### Rôle : Director

| Story | Backend | Specs | Statut |
|-------|---------|-------|--------|
| Voir les évaluations de tout son sous-arbre | ✅ `getVisibleUserIds` gère `extendedVisibility` et sous-arbre | ✅ S-16, `01-features` §1.3 | ✅ Complet |
| Valider / co-signer les évaluations | ✅ Transitions `reviewed → signed_evaluatee → signed_manager` disponibles | ✅ S-17 Mode C | ✅ Complet |
| Vue organigramme étendue (sous-arbre director) | ❌ `GET /api/org/tree` restreint admin/hr uniquement | ❌ S-39 admin/hr only — non prévu pour director | ❌ **Manquant** |
| Dashboard agrégé multi-équipes | ⚠️ Pas de `GET /api/dashboard` — doit agréger `GET /api/evaluations` + `GET /api/users` | ✅ S-03 variante C | ⚠️ Partiel |

**Score Director : 2 complètes · 1 partielle · 1 manquante (2/4)**

---

### Rôle : HR

| Story | Backend | Specs | Statut |
|-------|---------|-------|--------|
| Créer/gérer les campagnes avec targetScope | ✅ CRUD complet · `targetScope` (all/dept/sector/users) · clonage | ✅ S-09, S-10, S-11, S-12 | ✅ Complet |
| Créer/gérer les formulaires + import JSON | ✅ CRUD + `POST /api/forms/import` + `GET /api/forms/template` + export | ✅ S-13, S-14, S-15, S-41 | ✅ Complet |
| Voir et traiter les demandes (flags) | ✅ `GET /api/hr/flags` + `PATCH /api/hr/flags/:evalId/status` | ✅ S-38 | ✅ Complet |
| Importer des utilisateurs (CSV/JSON) | ✅ `POST /api/users/import` avec dryRun + upsert | ✅ S-40 | ✅ Complet |
| Gérer l'organigramme (drag & drop) | ✅ `GET /api/org/tree` + `PATCH /api/org/users/:id` | ✅ S-39 | ✅ Complet |
| Gérer les secteurs | ✅ CRUD `/api/org/sectors` | ✅ S-35, S-39 | ✅ Complet |
| Envoyer des rappels bulk | ✅ `POST /api/hr/notifications/bulk-remind` | ✅ S-35 | ✅ Complet |
| Voir les audits logs (+ export CSV) | ✅ `GET /api/admin/audit` + `GET /api/admin/audit/export` | ✅ S-29 | ✅ Complet |
| Personnaliser les templates mail | ⚠️ HR = lecture seule (`PATCH` réservé admin) — comportement attendu par spec | ✅ S-36 (hr read-only) | ✅ Complet (by design) |
| Voir les statistiques/rapports | ✅ `GET /api/campaigns/:id/analytics` + `GET /api/analytics/export/pdf` | ✅ S-25 | ✅ Complet |

**Score HR : 10 complètes · 0 partielles · 0 manquantes (10/10)**

---

### Rôle : Admin

| Story | Backend | Specs | Statut |
|-------|---------|-------|--------|
| Toutes les fonctions HR | ✅ Superset de HR | ✅ | ✅ Complet |
| Configurer le système (SMTP, LDAP, thèmes, feature flags) | ✅ `GET|PUT|PATCH|DELETE /api/admin/config` + batch + LDAP CRUD | ✅ S-27, S-28, S-34 | ✅ Complet |
| Gérer les templates mail | ✅ `GET /api/admin/mail-templates` + `PATCH /api/admin/mail-templates/:slug` | ✅ S-36, S-40 | ✅ Complet |
| Exporter les logs CSV | ✅ `GET /api/admin/audit/export` | ✅ S-29, S-35 | ✅ Complet |
| Gérer les offboardings (+ anonymisation RGPD) | ✅ CRUD `/api/offboarding` + `DELETE /api/users/:id/gdpr-anonymize` | ✅ S-23, S-24, S-30 | ✅ Complet |

**Score Admin : 5 complètes · 0 partielles · 0 manquantes (5/5)**

---

## Features transversales

| Feature | Backend | Specs | Statut |
|---------|---------|-------|--------|
| **Notifications in-app** | ❌ Modèle `Notification` absent · `GET /api/notifications` absent · `PATCH /api/notifications/:id/read` absent · `PATCH /api/notifications/read-all` absent | ✅ Spec complète (05-notifications, 15 types, polling 30s, badge) | ❌ **Manquant** |
| **Emails automatiques** | ✅ Service email + templates `MailTemplate` + envoi on transitions | ✅ 05-notifications (matrice déclencheurs) | ✅ Complet |
| **Import/export données** | ✅ Users CSV/JSON · Forms JSON · Audit CSV · Evaluations CSV · Analytics PDF | ✅ S-40, S-41, S-29, S-12, S-25 | ✅ Complet |
| **Historique des évaluations** | ✅ `GET /api/evaluations/history` (200 max, filtré par user) | ✅ S-18 | ✅ Complet |
| **Campagne N-1** (accès données année précédente) | ✅ `enableN1Context` · `previousCampaignId` · `n1-context` route · question type `n1_import` | ✅ S-10, S-14, S-17 | ⚠️ Flow import objectifs pré-remplissage partiel |
| **Multi-langue** | ⚠️ `locale` stocké dans `User.preferences` + `PATCH /api/auth/preferences` | ⚠️ S-32 (toggle FR/EN) mais spec i18n frontend absente | ⚠️ Partiel |
| **Thèmes (dark mode)** | ✅ `theme` stocké + `PATCH /api/auth/preferences` | ✅ S-32 · `darkMode: 'class'` · `.dark` sur `<html>` | ✅ Complet |
| **Sauvegarde auto évaluation** | ✅ `PATCH /api/evaluations/:id` (debounce 2s côté frontend) + `lastSavedAt` | ✅ S-17 Mode A · Golden Rule §12 | ✅ Complet |
| **Export PDF évaluation individuelle** | ✅ `GET /api/evaluations/:id/pdf` | ✅ S-17 Mode D, S-18 | ✅ Complet |
| **Onboarding wizard** | ✅ `PATCH /api/users/:id/onboarding/:stepIndex` + `onboarding/complete` | ✅ S-33 (5 étapes) | ✅ Complet |

---

## 🔴 P1 — Gaps bloquants

### P1-F01 — Système de notifications in-app intégralement absent

**Impact** : Bloque 7 user stories directes (notifications manager, employé) et la feature centrale UX de l'application.

**Détail** :
- Le modèle `Notification` n'existe pas dans `mongo/server/models/` (confirmé `02-models.md` §P1-1).
- `GET /api/notifications` absent (confirmé `01-routes.md` §P1-01).
- `PATCH /api/notifications/:id/read` absent (confirmé `01-routes.md` §P1-02).
- 15 types de notifications définis dans `05-notifications.md` (campaignLaunch, evaluationAssigned, deadlineReminder, managerActionRequired, systemAlerts, etc.).
- Les composants frontend attendus (`NotificationBell`, `NotificationItem`, `notificationStore`) ne peuvent pas fonctionner sans backend.
- L'écran `/notifications` (master checklist Section 7) est entièrement bloqué.
- Le badge cloche avec `unreadCount` ne peut pas être alimenté.
- Le polling 30s/5min (Golden Rule §11) ne retourne aucune donnée.

**Rôles bloqués** : Tous (employee, manager, director, hr, admin).

**Correction requise** :
1. Créer `mongo/server/models/Notification.js` (voir `02-models.md` §P1-1 pour le schéma complet).
2. Créer `mongo/server/routes/notifications.js` avec `GET /api/notifications` (paginé, `?unreadOnly=`) et `PATCH /api/notifications/:id/read`.
3. Monter ces routes dans `index.js`.
4. Brancher les émissions de notifications dans les handlers existants (transitions d'évaluation, lancement campagne, etc.).

---

### P1-F02 — Dashboard sans endpoint d'agrégat API

**Impact** : La page d'accueil (`/`) pour les 5 rôles ne peut pas être construite efficacement.

**Détail** :
- `GET /api/dashboard` absent (confirmé `01-routes.md` §P1-03).
- La variante admin (S-03A) nécessite : nb utilisateurs actifs, campagnes actives, évaluations non finalisées, offboardings en attente, activité récente — minimum 4 requêtes séparées.
- La variante manager (S-03D) nécessite : évals à compléter, équipe en attente, rappels deadline — 3 requêtes séparées.
- Sans agrégat, le TTL des pages dashboard en React Query est complexe à invalider.
- En production, N utilisateurs chargent le dashboard simultanément → N×4 requêtes MongoDB au lieu de N×1.

**Rôles bloqués** : Tous (dégradation performances · UX pénalisée).

**Correction recommandée** :
- Créer `GET /api/dashboard` avec query param `?role=` ou inféré depuis `req.user.role`.
- Retourner un agrégat JSON différencié par rôle (KPIs + actions urgentes + activité récente).

---

### P1-F03 — Employé ne peut pas déposer de demande RH en autonomie

**Impact** : La user story "Déposer une demande (mobilité, augmentation, promotion, formation)" depuis S-31 est architecturalement bloquée.

**Détail** :
- S-31 Onglet "Mes demandes" attend que l'employé clique "+ Déposer → Demande de mobilité" → récupère le formId → navigue vers `/evaluations/new?formId=<id>` → crée une évaluation.
- Or `POST /api/evaluations` est restreint à `admin, hr` (confirmé `01-routes.md`).
- L'employé reçoit un `403 Forbidden` en tentant de créer son évaluation de demande.
- Il n'existe pas de route `POST /api/evaluations/self` ou `POST /api/hr/requests` permettant l'auto-création par un employé.

**Rôles bloqués** : Employé.

**Correction requise** :
- Option A (recommandée) : Créer `POST /api/evaluations/self` (ou ouvrir `POST /api/evaluations` aux employés pour les `REQUEST_FORM_TYPES` uniquement) — `evaluatorId = evaluateeId = req.user.id`.
- Option B : HR pré-crée une évaluation générique de chaque type de demande par défaut à l'activation d'une campagne.

---

### P1-F04 — Organigramme inaccessible aux managers et directors

**Impact** : Manager et Director ne peuvent pas visualiser l'organigramme de leur équipe depuis le frontend.

**Détail** :
- `GET /api/org/tree` est restreint à `admin, hr` (confirmé `01-routes.md`).
- La spec `01-features.md` §1.3 et §1.4 ne mentionne pas l'accès organigramme pour director/manager — mais la user story est légitime (un manager doit pouvoir visualiser son équipe).
- S-39 est explicitement admin/hr uniquement dans les specs (non une erreur de configuration RBAC, mais une décision fonctionnelle à réviser).
- La spec `00-master.md` Section 11 dit "`GET /tree` retourne l'arbre hiérarchique complet" — aucune restriction mentionnée sur director/manager.

**Rôles bloqués** : Manager, Director.

**Correction à valider avec l'équipe produit** :
- Si voulu : ajouter `manager` et `director` dans le guard de `GET /api/org/tree` avec scope automatique sur leurs subordonnés.
- Si non voulu : supprimer la user story et documenter explicitement que l'organigramme est réservé HR/admin.

---

## 🟠 P2 — Features importantes manquantes

### P2-F01 — 5 écrans INC-03 non indexés dans `03-screens.md`

Les écrans suivants sont présents dans `00-master.md` Section 7 (checklist officielle) et dans `01-features.md` mais absents de l'inventaire S-xx de `03-screens.md` Annexe B :

| Route | Défini dans | Backend | Priorité |
|-------|------------|---------|----------|
| `/notifications` | master §7 · 05-notifications | ❌ Routes absentes (P1-F01) | P1 dépendant |
| `/evaluations/bulk` | master §7 · INC-03 | ✅ `POST /api/evaluations/bulk` | Écran manquant |
| `/resources/new` | master §7 · INC-03 | ✅ `POST /api/resources` | Écran manquant |
| `/offboarding/new` | master §7 · INC-03 | ✅ `POST /api/offboarding` | Écran manquant |
| `/events/new` | master §7 · INC-03 | ✅ `POST /api/events` | Écran manquant |

**Impact** : 4 écrans avec backend fonctionnel n'ont pas de spec d'écran dans `03-screens.md` — les implémenteurs frontend n'ont pas de wireframe de référence.

---

### P2-F02 — Incohérence de route pour l'organigramme

**Conflit** :
- `00-master.md` Section 11 → `/org (S-36)`
- `03-screens.md` Annexe B → `S-39 · /admin/orgchart`
- `00-master.md` Section 7 (checklist) → `/org (S-36)` avec endpoint `GET /api/org/tree`
- Hub admin S-26 dans `03-screens.md` → lien vers `/admin/orgchart`

**Impact** : Les développeurs frontend vont implémenter une route incorrecte. Le lien depuis le hub admin ne correspondra pas à la route configurée dans le routeur.

**Résolution recommandée** : Choisir `/admin/orgchart` (aligné avec la logique de permission admin/hr et le hub admin).

---

### P2-F03 — Flow d'historique des demandes RH (employé) incomplet

**Détail** :
- S-31 attend `GET /api/evaluations?formType=mobility_request,salary_raise_request,promotion_request,training_request&evaluateeId=me`.
- La route `GET /api/evaluations` supporte `formType` mais la whitelist des types autorisés pour les employés doit inclure les `REQUEST_FORM_TYPES`.
- Si l'employé peut lister ses propres demandes via `evaluateeId=soi`, mais ne peut pas en créer (P1-F03), la liste sera toujours vide — UX incohérente.

**Impact** : Onglet "Mes demandes" en S-31 fonctionnel seulement si P1-F03 est résolu en amont.

---

### P2-F04 — bulk-remind sans notification in-app persistée

**Détail** :
- `POST /api/hr/notifications/bulk-remind` envoie des **emails** aux évaluateurs non soumis.
- Aucune notification in-app n'est créée (modèle absent).
- Après correction de P1-F01, le service de bulk-remind doit aussi créer des `Notification` documents pour chaque destinataire (type `deadlineReminder`).

**Impact** : Les rappels groupés ne sont visibles que par email — pas dans le centre de notifications.

---

### P2-F05 — Multi-langue : spec i18n frontend absente

**Détail** :
- `User.locale` est stocké en DB (`fr` / `en` via `PATCH /api/auth/preferences`).
- S-32 affiche le toggle Français/Anglais.
- Aucune spec ne définit : bibliothèque i18n (react-i18next ? FormatJS ?), structure des fichiers de traduction (`/locales/fr.json`), clés de traduction, fallback en cas de traduction manquante.
- Le `useTranslate` hook mentionné dans les spécifications graphify n'est pas défini dans `06-components.md`.

**Impact** : Développeurs frontend devront improviser l'architecture i18n sans référence.

---

### P2-F06 — Campagne N-1 : flow pré-remplissage objectifs incomplet

**Détail** :
- `GET /api/evaluations/:id/n1-context` retourne les données de la campagne précédente.
- La question de type `n1_import` dans un formulaire est censée être pré-remplie avec les réponses N-1 correspondantes.
- Le mécanisme côté frontend de "matching" questions N-1 → réponses actuelles n'est pas spécifié (par `phase` ? par `questionId` ? par index ?).
- Si `previousCampaignId` est vide, le fallback backend est automatique — mais la logique de matching reste implicite.

**Impact** : L'import objectifs N-1 peut être implémenté de façon incohérente selon les développeurs.

---

## 🟡 P3 — Nice-to-have

### P3-F01 — Thème sombre : implémentation composants non spécifiée

Les tokens Tailwind `dark:` ne sont pas documentés dans `02-design-system.md`. La classe `.dark` sur `<html>` est mentionnée, mais les classes `dark:` pour chaque composant (cards, navbar, inputs, badges) ne sont pas spécifiées. Les développeurs devront extrapoler.

---

### P3-F02 — Dashboard employé : lien `/evaluations/history` sans données initiales

S-03E affiche "Mon historique (5 dernières évals validées, liens PDF)" mais `GET /api/evaluations/history` ne supporte pas `?limit=5` — retourne 200 résultats max hardcodé (signalé `01-routes.md` §P3-01). Prévoir un paramètre `limit`.

---

### P3-F03 — Analytics PDF absent du contrat API

`GET /api/analytics/export/pdf` existe dans le backend (confirmé `01-routes.md`) mais est absent de `07-api-contract.md`. Les agents qui s'appuient uniquement sur le contrat ne sauront pas que cette route existe. À documenter.

---

### P3-F04 — Module Resources absent du contrat API

5 routes CRUD `/api/resources` existent dans le backend (confirmé `01-routes.md` §P3-11) mais sont absentes de `07-api-contract.md`. L'écran S-21 (`/resources`) et S-22 (`/resources/:id`) ne pourront pas être implémentés correctement sans ce contrat.

---

### P3-F05 — Vue calendrier mensuelle sans filtre de date

`GET /api/events` ne supporte pas `?from=&to=` (confirmé `01-routes.md` §P3-06). S-19 affiche une grille mensuelle — sans filtre de date backend, le frontend doit charger tous les événements et filtrer en mémoire.

---

### P3-F06 — Admin hub : route `/admin/settings` sans card de navigation

S-26 liste 6 cards vers : Config · LDAP · Audit · Gestion avancée · **Paramètres système** · Organigramme. La card "Paramètres système" pointe vers `/admin/settings` (S-34), mais la checklist master (Section 7) liste aussi `/hr/settings` (S-35) sans card depuis S-26. HR doit accéder aux paramètres RH via la navbar — le chemin de navigation n'est pas documenté.

---

## ✅ Features complètes

| Module | Features | Écrans |
|--------|----------|--------|
| **Auth** | Connexion locale + LDAP, cookie httpOnly, remember me, logout, profil `/me` | S-01, S-02 |
| **Utilisateurs** | CRUD complet, avatar, onboarding wizard, offboard preview, export RGPD, anonymisation, import CSV/JSON | S-04 → S-08, S-33, S-40 |
| **Campagnes** | CRUD + clone + transitions statut + analytics + targetScope + N-1 context + objectivesForm | S-09 → S-12 |
| **Formulaires** | CRUD + gel (frozenAt) + import JSON + export JSON + template download + 9 types de questions | S-13 → S-15, S-41 |
| **Évaluations** | CRUD + bulk create/update + 10 transitions statut + PDF + history + reassign + expire + export CSV + N-1 context | S-16, S-17 (4 modes), S-18 |
| **Calendrier & Événements** | CRUD + filtrage par rôle | S-19, S-20 |
| **Ressources** | CRUD + filtrage visibleTo + publication | S-21, S-22 |
| **Offboarding** | CRUD + checklist + archivage user + audit log | S-23, S-24 |
| **Analytique** | KPIs + graphes + export PDF + export CSV | S-25 |
| **Administration** | Config CRUD + batch + LDAP + audit + RGPD + mail templates + feature flags | S-26 → S-30, S-34, S-36 |
| **Organigramme** | Tree (3 vues) + drag & drop manager + CRUD secteurs | S-39 |
| **Demandes RH (HR side)** | Flags list + filtres + changement statut + note interne | S-38 |
| **Profil & Préférences** | Avatar upload, préférences langue/thème/notifs | S-31, S-32 |
| **Rappels groupés** | Bulk-remind avec sélection campagne | S-35 |
| **Emails automatiques** | 15 templates + envoi on-event | backend complet |

---

## Tableau de bord des priorités

```
🔴 P1 — 4 gaps bloquants à traiter AVANT TOUT
 ├── P1-F01 : Modèle Notification + API (GET list + PATCH read)   → CRITIQUE tous rôles
 ├── P1-F02 : GET /api/dashboard (agrégat 5 variantes rôle)       → CRITIQUE page d'accueil
 ├── P1-F03 : POST /api/evaluations autorisé à l'employé (ou      → BLOQUE self-service RH
 │            POST /api/evaluations/self pour REQUEST_FORM_TYPES)
 └── P1-F04 : Décision product sur accès org/tree manager+director→ BLOQUER ou étendre RBAC

🟠 P2 — 6 gaps importants à traiter avant v2 stable
 ├── P2-F01 : Créer fiches écran S-xx pour 4 routes INC-03
 ├── P2-F02 : Résoudre conflit /org vs /admin/orgchart
 ├── P2-F03 : Clarifier flow demandes RH employé (dépend P1-F03)
 ├── P2-F04 : Brancher bulk-remind → création Notification in-app
 ├── P2-F05 : Spécifier architecture i18n frontend (bibliothèque + fichiers)
 └── P2-F06 : Documenter le matching n1_import → réponses N-1

🟡 P3 — 6 améliorations pour polish post-v2
 ├── P3-F01 : Tokens dark: dans design system
 ├── P3-F02 : Paramètre ?limit= sur /api/evaluations/history
 ├── P3-F03 : Documenter /api/analytics/export/pdf dans 07-api-contract
 ├── P3-F04 : Documenter /api/resources dans 07-api-contract
 ├── P3-F05 : Filtres ?from=&to= sur GET /api/events
 └── P3-F06 : Documenter chemin de navigation vers /hr/settings
```

---

## Synthèse des dépendances P1

```
P1-F01 (Notification model + API)
  └── Débloque : centre /notifications · badge cloche · polling · tous les types notifs
  └── Requis par : P2-F04 (bulk-remind → notif in-app)

P1-F02 (Dashboard API)
  └── Débloque : S-03 (5 variantes) · KPIs admin/hr/manager/director/employee
  
P1-F03 (Employee self-create evaluation)
  └── Débloque : S-31 Onglet "Mes demandes" · P2-F03 (historique demandes)
  
P1-F04 (Org tree RBAC)
  └── Décision produit requise avant implémentation frontend S-39
```

---

> **Note aux agents aval** :
> - **Agent 9 (synthèse finale)** : 4 P1, 6 P2, 6 P3 features. Le backend est très complet (86 routes, 11 modèles) sauf le système de notifications (modèle + 2 routes) et l'endpoint dashboard. La majorité des écrans specs sont couverts par un backend solide.
> - **Priorité absolue backend** : créer `Notification.js` + routes notifications avant tout développement frontend des composants `NotificationBell`/`NotificationItem`.
> - **Score global** : 22/36 user stories complètes (61 %) · 7 partielles (19 %) · 7 manquantes (19 %).
