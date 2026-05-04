# 🎯 NX-RH — Rapport de Synthèse Audit Pré-Coding
> Généré par 9 agents d'audit en 3 vagues · Branche `refactor`  
> Date : 2025 · Périmètre : backend `mongo/server` + specs `frontend-v2/specs`

---

## TL;DR

Le backend est **solide à 97 %** (73/75 endpoints conformes, sécurité quasi-irréprochable, 705 tests). Deux fonctionnalités majeures sont **intégralement absentes** : le système de notifications in-app et l'endpoint dashboard. Ces deux manques bloquent des composants transversaux (navbar, page d'accueil). Le reste peut être codé dès maintenant. **Verdict : OUI avec 3 réserves** — résoudre NOTIF + USERS-ME + SELF-CREATE avant de démarrer, puis traiter DASHBOARD en parallèle.

---

## Tableau de bord

| Catégorie | P1 | P2 | P3 | Statut |
|-----------|----|----|----|----|
| Routes backend | 7 (→ 3 uniques) | 12 | 11 | 🔴 |
| Modèles Mongoose | 2 | 9 | 6 | 🟠 |
| Sécurité | 0 | 5 | 7 | 🟠 |
| Tests | 0 (3 fails préexistants) | 4 | 3 | 🟠 |
| Écrans specs | 4 | 5 | — | 🟠 |
| Flows UX | 6 | 13 | — | 🟠 |
| Parité API | 3 | 3 | — | 🟠 |
| Features | 4 | 6 | 6 | 🟠 |
| **TOTAL brut** | **26** | **57** | **33** | — |
| **TOTAL dédupliqué** | **10** | **~30** | **~25** | 🟠 |

---

## 🔴 P1 Consolidés (dédupliqués)

| # | ID | Problème | Rapports | Bloque coding | Effort |
|---|----|---------|----------|--------------|--------|
| 1 | **NOTIF** | Système notifications in-app intégralement absent (modèle `Notification`, `GET /api/notifications`, `PATCH /api/notifications/:id/read`, écran `/notifications`) | 01, 02, 05, 06, 07, 08 | **OUI** — navbar, badge, polling | XL |
| 2 | **DASHBOARD** | `GET /api/dashboard` absent — la page d'accueil requiert 4–8 appels séparés selon le rôle | 01, 05, 06, 07, 08 | Partiel | L |
| 3 | **USERS-ME** | Alias `GET /api/users/me` absent — si les hooks React Query utilisent cette convention, tous les écrans de profil/dashboard tombent en 404 | 01, 05 | **OUI** (conditionnel) | S |
| 4 | **SELF-CREATE** | `POST /api/evaluations` restreint admin/hr — l'employé reçoit 403 pour auto-déposer une demande RH depuis S-31 | 08 | **OUI** pour onglet "Mes demandes" | M |
| 5 | **FORGOT-PWD** | Routes `POST /api/auth/forgot-password` et `POST /api/auth/reset-password` absentes, flow complet non défini | 06 | NON (feature isolée) | L |
| 6 | **IMPORT-ONBOARD** | 1ère connexion des utilisateurs importés (CSV/LDAP) non définie — pas d'email de bienvenue, mot de passe initial opaque | 06 | NON (feature isolée) | M |
| 7 | **CAMPAIGN-SCOPE** | Génération automatique des évaluations depuis `targetScope` au lancement de campagne non documentée ni implémentée côté flow | 01, 06 | Partiel (autres flows OK) | M |
| 8 | **FLAG-REJECT** | Flow rejet demande RH absent — l'employé n'est pas notifié, le suivi est unilatéral | 06 | NON (feature isolée) | M |
| 9 | **ORG-RBAC** | `GET /api/org/tree` restreint admin/hr — managers et directors ne peuvent pas visualiser leur équipe (décision prod requise) | 08 | NON (décision produit) | S |
| 10 | **FLAGS-FILTERS** | `GET /api/hr/flags` sans filtres ni pagination alors que S-38 définit 5 filtres explicites (`type`, `status`, `from`, `to`, `department`, `sector`) | 01, 05 | NON (filtres côté client en attente) | M |

---

## 🟠 P2 Consolidés (top 10 les plus impactants)

| # | Problème | Rapport(s) | Impact |
|---|---------|------------|--------|
| 1 | **RBAC answers manager** : un manager peut modifier les `answers` d'une évaluation hors de son équipe | 03-P2-01 | Corruption données silencieuse |
| 2 | **CSV formula injection** dans `GET /api/evaluations/export` — Excel/Calc peut exécuter des formules | 03-P2-02 | RCE poste RH |
| 3 | **Pas de transactions Mongoose** sur offboard (`PATCH /users/:id/offboard`) et delete campaign — état incohérent possible | 01-P2-02/03 | Incohérence données |
| 4 | **`express-mongo-sanitize` absent** — protection NoSQL injection 100 % manuelle, un chemin oublié = vecteur d'attaque | 03-P2-03 | Défense en profondeur |
| 5 | **`bodyHtml` mail templates stocké sans sanitisation** — XSS potentiel si compte HR compromis | 03-P2-04 | XSS dans clients mail |
| 6 | **`targetScope.type` conflit Mongoose** — nom réservé, cast silencieux possible, enum non validée | 02-P2-11 | Bug subtil runtime |
| 7 | **`AuditLog.action` non indexé** — `GET /api/admin/audit?action=` sans index sur grand volume | 02-P2 | Performance |
| 8 | **PATCH /api/auth/password absent** — le Flux 10 (changement MDP depuis profil) appelle une route inexistante | 06-P2-11 | Feature non fonctionnelle |
| 9 | **GET /api/hr/flags/count absent** — F-NEW-05 fait du polling toutes les 30s sur cette route inexistante | 06-P2-12 | Badge navbar RH cassé |
| 10 | **Écrans `/:id` sans gestion 404/403** — comportements hétérogènes garantis si non spécifié | 05-P2-SCR-01 | UX incohérente |

---

## 📋 Plan d'action

### Bloc A — Avant coding (bloquants stricts)

| Tâche | Effort | Impact |
|-------|--------|--------|
| **NOTIF** — Créer `models/Notification.js` (schéma complet dans `02-models.md §P1-1`) + routes `GET /api/notifications` et `PATCH /api/notifications/:id/read` + brancher les émissions dans les handlers de transitions d'évaluation/campagne | XL | Débloque navbar, badge, écran `/notifications`, 7 user stories |
| **USERS-ME** — Ajouter alias `GET /api/users/me` → handler `GET /api/auth/me` dans `routes/auth.js` ou `routes/users.js` | S | Évite 404 sur tous les hooks React Query utilisant cette convention |
| **SELF-CREATE** — Créer `POST /api/evaluations/self` (ou ouvrir `POST /api/evaluations` aux employés pour `REQUEST_FORM_TYPES`) | M | Débloque l'onglet "Mes demandes" de S-31 |
| **RBAC answers** — Ajouter guard `evaluatee.managerId === req.user.id` sur `answers` pour les rôles manager/director dans `routes/evaluations/mutations.js` | S | Correction sécurité critique |
| **CSV injection** — Corriger `csvEscape()` dans `routes/evaluations/queries.js` pour neutraliser `=`, `+`, `-`, `@` | S | Correction sécurité |

### Bloc B — En parallèle du coding

| Tâche | Effort | Impact |
|-------|--------|--------|
| **DASHBOARD** — Créer `GET /api/dashboard` avec agrégat MongoDB différencié par `req.user.role` (5 variantes) | L | Optimise page d'accueil, évite 4–8 calls séparés |
| **FLAGS-FILTERS** — Ajouter filtres `?type&status&from&to&department&sector` + pagination à `GET /api/hr/flags` | M | Aligne S-38 avec le backend |
| **CAMPAIGN-SCOPE** — Documenter et implémenter le flow de génération évaluations depuis `targetScope` au lancement | M | Débloque F-NEW-06 complet |
| **PATCH /api/auth/password** — Implémenter le changement de mot de passe depuis le profil | M | Débloque Flux 10 |
| **GET /api/hr/flags/count** — Créer l'endpoint léger pour le polling badge navbar RH | S | Badge navbar RH |
| **express-mongo-sanitize** — Ajouter `app.use(mongoSanitize())` dans `index.js` | S | Défense en profondeur |
| **Transactions Mongoose** — Wrapper offboard + delete campaign dans `startSession().withTransaction()` | M | Cohérence données |
| **Tests préexistants** — Corriger `errorHandler.test.js` (message TokenExpiredError) + `events.test.js` (createdBy) | S | 3 → 0 échecs |

### Bloc C — Après MVP

| Tâche | Effort | Impact |
|-------|--------|--------|
| **FORGOT-PWD** — Routes `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` + templates email | L | Autonomie utilisateurs |
| **IMPORT-ONBOARD** — Définir et implémenter le flow email bienvenue + 1ère connexion pour imports CSV/LDAP | M | Onboarding en masse |
| **FLAG-REJECT** — Spécifier et implémenter la notification employé sur rejet/approbation de demande | M | Communication employé↔RH |
| **ORG-RBAC** — Décision produit : ouvrir `GET /api/org/tree` aux managers (scopé) ou documenter la restriction | S | Organigramme manager/director |
| **bodyHtml sanitisation** — Intégrer `sanitize-html` sur `PATCH /api/admin/mail-templates/:slug` | S | XSS mail templates |
| **i18n frontend** — Spécifier bibliothèque (react-i18next), structure `/locales/`, clés, fallback | M | Multi-langue cohérent |
| **Tests manquants** — Créer `hr.flags.test.js`, `forms.import.test.js`, `org.sectors.test.js` | M | Couverture critique |
| **targetScope.type** — Renommer en `scopeType` ou passer par un sous-schéma Mongoose explicite | S | Bug Mongoose latent |

---

## 🟢 Verdict : Prêt à coder ?

### ✅ OUI avec réserves

> Traiter le **Bloc A** (≈ 1 jour) avant de démarrer, puis lancer le frontend en parallèle du **Bloc B**.

**Modules prêts à coder dès maintenant :**
- [x] Auth — login, logout, remember me, préférences, `GET /api/auth/me`
- [x] Utilisateurs — CRUD, avatar, onboarding wizard, offboard, GDPR, export
- [x] Campagnes — création, édition, clone, analytics, transitions statut
- [x] Évaluations — remplissage (4 modes), signature, bulk, PDF, history, export CSV
- [x] Formulaires — CRUD, builder, import JSON, export JSON, template
- [x] Organigramme (admin/hr) — tree 3 vues, drag & drop manager, CRUD secteurs
- [x] Offboarding — CRUD, checklist, archivage
- [x] HR Flags — liste + traitement (filtres côté client en attendant Bloc B)
- [x] Administration — config, LDAP, mail templates, audit, RGPD
- [x] Événements & Ressources — CRUD
- [x] Profil & Préférences — avatar, thème, locale
- [x] Analytics — KPIs, export PDF

**Modules à débloquer d'abord (Bloc A) :**
- [ ] **Notifications** — intégralement bloquées (modèle + routes + écran)
- [ ] **Onglet "Mes demandes" employé** — bloqué par `403` sur `POST /api/evaluations`
- [ ] **Convention `GET /users/me`** — risque de 404 généralisé sur les écrans de profil

---

## ✅ Points forts du projet

| Domaine | État |
|---------|------|
| **Sécurité Auth** | JWT httpOnly/sameSite:strict, double rate-limit login, bcrypt ≥12 rounds, ReDoS protégé |
| **RBAC** | Matrice de transitions `VALID_TRANSITIONS` + `ROLE_TRANSITIONS`, `getVisibleUserIds` par rôle, guard systématique |
| **Modèles Mongoose** | 11 modèles complets, validations robustes, indexes composites, hooks pre-save anti-incohérence |
| **Parité API** | 97 % de conformité (73/75) — seuls 2 écarts mineurs avec le contrat |
| **Tests** | 705 tests, 22 fichiers, 3 échecs préexistants sans lien avec l'audit — base solide |
| **Emails** | Service email fonctionnel, 15 templates, envoi on-event sur transitions |
| **Import/Export** | Users CSV/JSON, Forms JSON, Evaluations CSV avec BOM Excel, Analytics PDF |
| **Historique & Audit** | `AuditLog` TTL 2 ans + log embarqué `Evaluation.auditLog[]`, export CSV |
| **Feature flags** | `Config` CRUD + batch — activation/désactivation fonctionnalités sans redéploiement |
| **Code quality** | `next(err)` systématique, errorHandler global, `constants.js` source de vérité unique |

---

## Annexe — Références croisées P1

| P1 ID | 01-routes | 02-models | 03-security | 04-tests | 05-screens | 06-flows | 07-api-parity | 08-features |
|-------|-----------|-----------|-------------|----------|------------|----------|---------------|-------------|
| NOTIF | P1-01/02 | P1-1 | — | — | P1-SCR-01 | P1-01 | P1-01/02 | P1-F01 |
| DASHBOARD | P1-03 | — | — | — | P1-SCR-02 | P1-02 | P1-03 | P1-F02 |
| USERS-ME | P1-07 | — | — | — | P1-SCR-04 | — | — | — |
| SELF-CREATE | — | — | — | — | — | — | — | P1-F03 |
| FORGOT-PWD | — | — | — | — | — | P1-03 | — | — |
| IMPORT-ONBOARD | — | — | — | — | — | P1-04 | — | — |
| CAMPAIGN-SCOPE | P1-04/05 | — | — | — | — | P1-05 | — | — |
| FLAG-REJECT | — | — | — | — | — | P1-06 | — | — |
| ORG-RBAC | — | — | — | — | — | — | — | P1-F04 |
| FLAGS-FILTERS | P2-06 | — | — | — | P1-SCR-03 | — | — | — |
