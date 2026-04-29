# Audit QA — Rôle Administrateur (`admin`)

**Auditeur :** QA (code source — simulation sans navigateur)
**Date :** 2025-07-07
**Périmètre :** `client/src/pages/admin/` · `mongo/server/routes/` · `client/src/App.jsx` · `client/src/components/ui/navMenuConfig.js`

---

## 1. Cartographie des routes admin

| Route                       | Composant               | Rôles autorisés | Lien nav ? |
|-----------------------------|-------------------------|-----------------|------------|
| `/admin`                    | `Admin.jsx`             | admin           | — (page d'accueil admin) |
| `/admin/users`              | `AdminUsers.jsx`        | admin           | ✅ Utilisateurs > Utilisateurs |
| `/admin/org-chart`          | `AdminOrgChart.jsx`     | admin           | ✅ Utilisateurs > Organigramme |
| `/admin/roles`              | `AdminRoles.jsx`        | admin           | ✅ Configuration > Rôles & accès |
| `/admin/integrations`       | `AdminIntegrations.jsx` | admin           | ✅ Configuration > Intégrations |
| `/admin/communications`     | `AdminCommunications.jsx`| admin          | ✅ Communications > Communications |
| `/admin/compliance`         | `AdminCompliance.jsx`   | admin           | ✅ Communications > Conformité |
| `/admin/security`           | `AdminSecurity.jsx`     | admin           | ✅ Configuration > Sécurité |
| `/admin/sandbox`            | `AdminSandbox.jsx`      | admin           | ✅ Système > Bac à sable |
| `/admin/settings`           | `AdminSettings.jsx`     | admin           | ✅ Système > Paramètres |
| `/admin/audit`              | `AdminAudit.jsx`        | admin + hr      | ✅ **CORRIGÉ** — Communications > Piste d'audit |
| `/admin/templates-import`   | `PagePlaceholder`       | admin           | ❌ Aucun lien (placeholder intentionnel) |

---

## 2. Trace des actions admin

### 2.1 — Dashboard (`/admin`)

| Action | Composant | Endpoint | Handler | Résultat |
|--------|-----------|----------|---------|----------|
| Charger KPIs utilisateurs | `Admin.jsx` → `useQuery` | `GET /api/users?limit=200` | `routes/users.js GET /` | ✅ Retourne array (max 100 sans ?page) |
| Vérifier santé système | `Admin.jsx` → `useQuery` | `GET /api/health` | `index.js` | ✅ `{ status: 'ok', timestamp }` |

---

### 2.2 — Gestion des utilisateurs (`/admin/users`)

| Action | Composant | Endpoint | Handler | Résultat |
|--------|-----------|----------|---------|----------|
| Lister utilisateurs | `AdminUsers.jsx` `useQuery` | `GET /api/users?limit=500` | `users.js GET /` | ✅ Array (capé à 100 sans ?page — ADM-10) |
| Rechercher (client-side) | `useMemo` | — | — | ✅ Filtre sur name/email |
| Créer utilisateur | `UserModal` `POST` | `POST /api/users` | `users.js POST /` | ✅ 201 + tempPassword exposé une fois |
| Modifier utilisateur (rôle, dept, manager) | `UserModal` `PATCH` | `PATCH /api/users/:id` | `users.js PATCH /:id` | ✅ Whitelist des champs |
| Activer/Désactiver | `toggleMutation` `PATCH` | `PATCH /api/users/:id` | `users.js PATCH /:id` | ✅ `{ isActive }` |
| Déclencher départ (offboarding) | `OffboardModal` | `GET /api/users/:id/offboard-preview` + `PATCH /api/users/:id/offboard` | `users.js` | ✅ Archive les évaluations en cours |
| Export RGPD | `window.open` | `GET /api/users/:id/gdpr-export` | `users.js GET /:id/gdpr-export` | ✅ Téléchargement JSON |
| Anonymiser utilisateur (RGPD) | `anonymizeMutation` `DELETE` | `DELETE /api/users/:id/gdpr-anonymize` | `users.js DELETE /:id/gdpr-anonymize` | ✅ Bloqué si évaluations actives |

---

### 2.3 — Organigramme (`/admin/org-chart`)

| Action | Composant | Endpoint | Handler | Résultat |
|--------|-----------|----------|---------|----------|
| Charger utilisateurs | `useQuery` | `GET /api/users?limit=500` | `users.js GET /` | ✅ (même cap 100) |
| Construire arbre hiérarchique | `buildTree()` | — (in-memory) | — | ✅ Arbre par `managerId` |
| Mode full / managerial / hub / diagnostic | `useMemo` | — | — | ✅ Calcul client-side |
| Alertes orphelins | Callout | — | — | ✅ Détecte managerId introuvable |

---

### 2.4 — Rôles (`/admin/roles`)

| Action | Composant | Endpoint | Handler | Résultat |
|--------|-----------|----------|---------|----------|
| Afficher matrice RBAC | Tableau statique | — | — | ✅ Lecture seule — pas d'API |

---

### 2.5 — Intégrations (`/admin/integrations`)

| Action | Composant | Endpoint | Handler | Résultat |
|--------|-----------|----------|---------|----------|
| Charger config LDAP | `useQuery` | `GET /api/admin/ldap/config` | `ldap.js GET /config` | ✅ Sans bindPassword |
| Sauvegarder config LDAP | `saveMutation` `PUT` | `PUT /api/admin/ldap/config` | `ldap.js PUT /config` | ✅ Préserve mdp existant si non fourni |
| Tester connexion LDAP | `testMutation` `POST` | `POST /api/admin/ldap/test` | `ldap.js POST /test` | ✅ |
| Prévisualiser utilisateurs LDAP | `previewMutation` `POST` | `POST /api/admin/ldap/preview` | `ldap.js POST /preview` | ✅ Max 50 |
| Synchroniser LDAP → DB | `syncMutation` `POST` | `POST /api/admin/ldap/sync` | `ldap.js POST /sync` | ✅ Rapport créés/mis à jour/skipped |
| Tester email SMTP | `emailTestMutation` `POST` | `POST /api/admin/email/test` | `admin.js POST /email/test` | ✅ Ethereal en dev |
| **Sauvegarder config SMTP** | Bouton sans `onClick` | — | — | ❌ **ADM-08** — bouton mort |
| **Configurer SSO** | Bouton sans action | — | — | ❌ Mock — pas d'endpoint |
| **Ajouter webhook** | Modal sans persistance | — | — | ❌ **ADM-09** — mock |

---

### 2.6 — Communications (`/admin/communications`)

| Action | Composant | Endpoint | Handler | Résultat |
|--------|-----------|----------|---------|----------|
| Sélectionner template | `selectTemplate()` | — | — | ✅ État local |
| Éditer template | `<textarea>` | — | — | ✅ État local |
| **Enregistrer template** | `handleSave()` | — | — | ❌ **ADM-05** — mock (`setSaved(true)` uniquement, aucun appel API) |

---

### 2.7 — Conformité RGPD (`/admin/compliance`)

| Action | Composant | Endpoint | Handler | Résultat |
|--------|-----------|----------|---------|----------|
| Modifier rétention (select) | `<select>` | — | — | ✅ État local |
| **Enregistrer rétention** | Bouton sans `onClick` | — | — | ❌ **ADM-04a** — bouton mort (no onClick) |
| Saisir ID utilisateur anonymisation | `<input>` | — | — | ✅ État local |
| **Confirmer anonymisation** | Modal onClick | — | — | ❌ **ADM-04b** — ferme le modal sans appeler `DELETE /api/users/:id/gdpr-anonymize` |
| **Confirmer export RGPD** | Modal onClick | — | — | ❌ **ADM-04c** — ferme le modal sans appeler `GET /api/users/:id/gdpr-export` |
| Voir journal audit RGPD | Tableau statique | — | — | ❌ Tableau toujours vide (aucun fetch) |

---

### 2.8 — Sécurité (`/admin/security`)

| Action | Composant | Endpoint | Handler | Résultat |
|--------|-----------|----------|---------|----------|
| Charger journal d'audit | `useQuery` | `GET /api/admin/audit?limit=100` | `audit.js GET /` | ✅ **CORRIGÉ** (était `/api/audit-logs` → 404) |
| Filtrer par type (targetType) | `useMemo` | — | — | ✅ **CORRIGÉ** (était filtrage sur `l.type` inexistant) |
| Filtrer par utilisateur | `useMemo` | — | — | ✅ **CORRIGÉ** (était filtrage sur `l.user` inexistant) |
| Filtrer par date | `useMemo` | — | — | ✅ **CORRIGÉ** (était filtrage sur `l.date`, maintenant `l.createdAt`) |
| **Impersonner un utilisateur** | Bouton onClick mock | — | — | ❌ **ADM-07** — code mort (`/* Mock */`), nécessite `POST /api/auth/impersonate` |

---

### 2.9 — Bac à sable (`/admin/sandbox`)

| Action | Composant | Endpoint | Handler | Résultat |
|--------|-----------|----------|---------|----------|
| Lancer scénario test | `handleLaunch()` | — | — | ⚠️ Mock — setTimeout 2s, aucun appel backend |
| Nettoyer sandbox | `handleCleanup()` | — | — | ⚠️ Reset état local uniquement |

---

### 2.10 — Paramètres (`/admin/settings`)

| Action | Composant | Endpoint | Handler | Résultat |
|--------|-----------|----------|---------|----------|
| Modifier branding | `<input>` | — | — | ✅ État local |
| Modifier langue par défaut | `<select>` | — | — | ✅ État local |
| Modifier politique mots de passe | Toggles | — | — | ✅ État local |
| **Enregistrer** (toutes sections) | `save()` | — | — | ❌ **ADM-06** — `setSavedSection()` uniquement, aucun appel API |

---

### 2.11 — Piste d'audit (`/admin/audit`)

| Action | Composant | Endpoint | Handler | Résultat |
|--------|-----------|----------|---------|----------|
| Charger entrées (paginées) | `useQuery` | `GET /api/admin/audit?page=1&limit=20` | `audit.js GET /` | ✅ |
| Filtrer par type d'action | Dropdown | Param `?action=` | `audit.js` whitelist | ✅ |
| Filtrer par type de cible | Dropdown | Param `?targetType=` | `audit.js` whitelist | ✅ |
| Filtrer par date | Date inputs | Params `?from=&to=` | `audit.js` | ✅ |
| Pagination avant/arrière | Boutons | Param `?page=` | `audit.js` | ✅ |

---

## 3. Bugs identifiés

### 🔴 Bugs critiques (corrigés)

#### ADM-01 — AdminSecurity : endpoint d'audit inexistant (`/api/audit-logs`)
- **Fichier :** `client/src/pages/admin/AdminSecurity.jsx`
- **Symptôme :** Le journal d'audit de la page Sécurité est toujours vide. `GET /api/audit-logs` retourne 404 (route inexistante).
- **Cause :** Endpoint incorrect. La route réelle est `/api/admin/audit`.
- **Impact secondaire :** Le filtre client-side utilisait `l.type`, `l.user`, `l.date` — champs inexistants dans le modèle `AuditLog`. La colonne "Adresse IP" n'existe pas dans le modèle non plus.
- **Correction :**
  - Endpoint : `/api/audit-logs` → `/api/admin/audit?limit=100`
  - Parsing réponse : `d.logs || []` → `d.data || []`
  - Filtre `filterType` : `l.type` → `l.targetType`
  - Filtre `filterUser` : `l.user` → `l.userId.firstName + l.userId.lastName` (objet populé)
  - Filtre dates : `l.date` → `l.createdAt`
  - Calcul `actionTypes` : `l.type` → `l.targetType`
  - Table rendering : champs corrigés (`targetType`, `action`, `userId` populé, `userRole`, `createdAt`)
  - Colonne "Adresse IP" remplacée par "Rôle" (`col.ip` → `col.role`)
  - I18n : ajout de `admin.security.audit.col.role` dans `fr.js` et `en.js`
- **Statut :** ✅ Corrigé

---

#### ADM-02 — AdminAudit : `keepPreviousData` déprécié (TanStack Query v5)
- **Fichier :** `client/src/pages/admin/AdminAudit.jsx`
- **Symptôme :** En changeant de page dans la pagination, la table clignote (tableau vide pendant le refetch) au lieu de conserver les données précédentes.
- **Cause :** `keepPreviousData: true` a été renommé en `placeholderData` dans TanStack Query v5. L'ancienne option est silencieusement ignorée.
- **Correction :** `keepPreviousData: true` → `placeholderData: (prev) => prev`
- **Statut :** ✅ Corrigé

---

#### ADM-03 — `/admin/audit` absent du menu de navigation (admin + hr)
- **Fichier :** `client/src/components/ui/navMenuConfig.js`
- **Symptôme :** La piste d'audit est accessible uniquement en tapant l'URL manuellement (`/admin/audit`). Aucun lien dans la navigation pour les rôles `admin` et `hr`.
- **Cause :** Entrée manquante dans `NAV_MENU.admin` et `NAV_MENU.hr`.
- **Correction :**
  - Admin : ajout de `{ id: 'audit', to: '/admin/audit', labels: { fr: 'Piste d\'audit', en: 'Audit Log' } }` dans le groupe `communications`
  - HR : ajout de la même entrée dans le groupe `analytique`
- **Statut :** ✅ Corrigé

---

### 🟡 Bugs non-critiques (backend manquant — documentés)

#### ADM-04 — AdminCompliance : actions anonymisation/export sans appel API
- **Fichier :** `client/src/pages/admin/AdminCompliance.jsx`
- **Symptôme :** Confirmer l'anonymisation ou l'export RGPD dans le modal ferme juste le modal sans rien faire. Le bouton "Enregistrer" la rétention n'a pas d'`onClick`.
- **Cause :** Pas d'endpoints backend dédiés depuis cette page (`/api/admin/compliance/*`).
- **Note :** `AdminUsers.jsx` implémente les mêmes actions de façon fonctionnelle via les endpoints existants (`DELETE /api/users/:id/gdpr-anonymize` et `GET /api/users/:id/gdpr-export`). La page AdminCompliance devrait réutiliser ces endpoints.
- **Statut :** ⚠️ Non corrigé — backend manquant

---

#### ADM-05 — AdminCommunications : sauvegarde de templates sans appel API
- **Fichier :** `client/src/pages/admin/AdminCommunications.jsx`
- **Symptôme :** `handleSave()` appelle `setSaved(true)` et simule une sauvegarde, mais aucun appel API n'est effectué. Les modifications sont perdues au rechargement.
- **Cause :** Pas d'endpoint backend pour les templates d'email (ex: `PUT /api/admin/communications/templates/:id`).
- **Statut :** ⚠️ Non corrigé — backend manquant

---

#### ADM-06 — AdminSettings : boutons "Enregistrer" sans appel API
- **Fichier :** `client/src/pages/admin/AdminSettings.jsx`
- **Symptôme :** Toutes les sections (branding, langue, politique mots de passe, maintenance) affichent "Enregistré" visuellement mais ne persistent rien.
- **Cause :** `save(section)` appelle uniquement `setSavedSection()`. Pas d'endpoints backend (`/api/admin/settings`).
- **Statut :** ⚠️ Non corrigé — backend manquant

---

#### ADM-07 — AdminSecurity : bouton Impersonation mort
- **Fichier :** `client/src/pages/admin/AdminSecurity.jsx`
- **Symptôme :** Le bouton "Se connecter en tant que" est visible mais son `onClick` est un commentaire `/* Mock */`.
- **Cause :** Pas d'endpoint `POST /api/auth/impersonate` côté serveur.
- **Statut :** ⚠️ Non corrigé — backend manquant

---

#### ADM-08 — AdminIntegrations : bouton "Enregistrer" SMTP sans `onClick`
- **Fichier :** `client/src/pages/admin/AdminIntegrations.jsx` (ligne ~426)
- **Symptôme :** `<button type="button" className="adm-btn adm-btn--primary">{t('admin.integrations.save')}</button>` — aucun handler.
- **Cause :** Pas d'endpoint `PUT /api/admin/smtp/config`.
- **Statut :** ⚠️ Non corrigé — backend manquant

---

#### ADM-09 — AdminIntegrations : webhook "Ajouter" ne persiste pas
- **Fichier :** `client/src/pages/admin/AdminIntegrations.jsx`
- **Symptôme :** Le modal webhook se ferme sans appel API. La liste de webhooks est toujours vide.
- **Cause :** Pas d'endpoints backend pour les webhooks.
- **Statut :** ⚠️ Non corrigé — backend manquant

---

#### ADM-10 — `GET /api/users` sans `?page` : paramètre `limit` ignoré
- **Fichier :** `mongo/server/routes/users.js`
- **Symptôme :** `AdminUsers.jsx` demande `limit=500`, `Admin.jsx` demande `limit=200` — mais le backend capte silencieusement à 100 utilisateurs quand `?page` n'est pas fourni.
- **Cause :** Dans `users.js`, la branche sans pagination (`if (!req.query.page)`) utilise `.limit(100)` hardcodé, ignorant le paramètre `limit` de la query string.
- **Impact :** Les organisations de plus de 100 utilisateurs voient des données tronquées dans l'organigramme, les KPIs admin et le tableau de gestion.
- **Solution recommandée :** Utiliser `?page=1&limit=100` dans les fetch et mettre à jour le parsing de réponse (`d.data || []`).
- **Statut :** ⚠️ Non corrigé — refactoring nécessaire

---

#### ADM-11 — Dashboard admin : section "uptime" jamais affichée
- **Fichier :** `client/src/pages/admin/Admin.jsx` + `mongo/server/index.js`
- **Symptôme :** La section uptime dans la santé du système ne s'affiche jamais.
- **Cause :** `GET /api/health` retourne `{ status, timestamp }` — pas de champ `uptime`. `Admin.jsx` vérifie `health.uptime != null` qui est toujours `false`.
- **Statut :** ⚠️ Mineur — pas de crash, section silencieusement absente

---

## 4. Cohérence App.jsx ↔ navMenuConfig.js

### Avant corrections

| Route App.jsx | Présent en nav ? | Rôle nav |
|---------------|-----------------|----------|
| `/admin/audit` | ❌ | admin + hr |
| `/admin/templates-import` | ❌ | admin (intentionnel — placeholder) |

### Après corrections

| Route App.jsx | Présent en nav ? | Rôle nav |
|---------------|-----------------|----------|
| `/admin/audit` | ✅ Ajouté | admin (Communications) + hr (Analytique) |
| `/admin/templates-import` | ❌ | Placeholder intentionnel, pas de nav |

**Liens de nav orphelins :** aucun — tous les liens de navMenuConfig.js pointent vers des routes existantes dans App.jsx.

---

## 5. Récapitulatif des corrections appliquées

| ID     | Fichier(s) modifié(s) | Type |
|--------|----------------------|------|
| ADM-01 | `AdminSecurity.jsx` + `i18n/fr.js` + `i18n/en.js` | 🔴 Bug critique |
| ADM-02 | `AdminAudit.jsx` | 🔴 Bug critique |
| ADM-03 | `navMenuConfig.js` | 🔴 Bug critique |

---

## 6. Endpoints backend — synthèse

| Endpoint | Méthode | Auth | Utilisé par | Statut |
|----------|---------|------|-------------|--------|
| `/api/users` | GET | admin/hr/manager | Admin, AdminUsers, AdminOrgChart, AdminSecurity | ✅ |
| `/api/users` | POST | admin/hr | AdminUsers UserModal | ✅ |
| `/api/users/:id` | PATCH | admin/self | AdminUsers toggle + modal | ✅ |
| `/api/users/:id/offboard-preview` | GET | admin/hr | OffboardModal | ✅ |
| `/api/users/:id/offboard` | PATCH | admin/hr | OffboardModal | ✅ |
| `/api/users/:id/gdpr-export` | GET | admin/self | AdminUsers | ✅ |
| `/api/users/:id/gdpr-anonymize` | DELETE | admin | AdminUsers | ✅ |
| `/api/admin/ldap/config` | GET + PUT | admin | AdminIntegrations | ✅ |
| `/api/admin/ldap/test` | POST | admin | AdminIntegrations | ✅ |
| `/api/admin/ldap/preview` | POST | admin | AdminIntegrations | ✅ |
| `/api/admin/ldap/sync` | POST | admin | AdminIntegrations | ✅ |
| `/api/admin/email/test` | POST | admin | AdminIntegrations | ✅ |
| `/api/admin/audit` | GET | admin + hr | AdminAudit, AdminSecurity (**post-fix**) | ✅ |
| `/api/health` | GET | public | Admin dashboard | ✅ (sans uptime) |
| `/api/audit-logs` | GET | — | AdminSecurity (**pré-fix**) | ❌ 404 |
| `/api/auth/impersonate` | POST | — | AdminSecurity (mock) | ❌ Manquant |
| `/api/admin/smtp/config` | PUT | — | AdminIntegrations (mort) | ❌ Manquant |
| `/api/admin/communications/templates` | PUT | — | AdminCommunications (mock) | ❌ Manquant |
| `/api/admin/settings` | PUT | — | AdminSettings (mock) | ❌ Manquant |
| `/api/admin/webhooks` | GET + POST | — | AdminIntegrations (mock) | ❌ Manquant |
