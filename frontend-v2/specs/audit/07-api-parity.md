# Audit Parité API — NX-RH

> **Agent** : 07 — Auditeur de parité API contract ↔ backend réel  
> **Sources** : `frontend-v2/specs/07-api-contract.md` · `mongo/server/routes/**` · `audit/01-routes.md`  
> **Date** : 2025

---

## ✅ Endpoints conformes (73/75)

Tous les **75 endpoints documentés** dans le contrat sont bien implémentés dans le backend.
Les 73 ci-dessous sont conformes en méthode, rôles, paramètres et format de réponse.

| Module | Endpoints | Statut |
|---|---|---|
| Auth | 4/4 | ✅ |
| Users | 11/11 | ✅ |
| Users Import | 1/1 | ✅ |
| Campaigns | 7/7 | ✅ |
| Evaluations | 12/12 | ✅ |
| Forms | 5/5 | ✅ |
| Forms Import/Export | 3/3 | ✅ |
| Org | 6/6 | ✅ |
| HR Notifications | 1/1 | ✅ |
| HR Flags | 2/2 | ✅ |
| Admin | 7/7 | ✅ |
| Admin Mail Templates | 2/2 | ✅ |
| Audit | **1/2** | ⚠️ P2 |
| Events | 5/5 | ✅ |
| Offboarding | 6/6 | ✅ |
| Health | 1/1 | ✅ |

Points de conformité importants vérifiés :
- Pagination `{ data: [], total, page, limit }` systématique sur toutes les listes paginées ✅
- Mapping `_id → id` dans `GET /api/auth/me` et `POST /api/auth/login` ✅
- Cookie `httpOnly sameSite:strict` ✅
- Transitions de statut validées (campaigns, evaluations) ✅
- Rate-limiting `POST /api/auth/login` (5/15min/email + 20/15min/IP) ✅
- `DELETE /api/campaigns/:id` supprime aussi évaluations + formulaires liés ✅
- `isAnonymous` forcé `true` sur `upward_feedback` ✅
- `frozenAt` respecté sur PATCH/DELETE formulaires ✅
- Export CSV avec BOM Excel sur audit et évaluations ✅
- `bindPassword` LDAP jamais retourné dans les réponses ✅

---

## 🔴 P1 — Routes attendues par les specs mais absentes du contrat ET du backend

> Ces routes ne sont **ni dans le contrat API (07-api-contract.md) ni dans le backend** ;  
> elles sont pourtant exigées par `05-notifications.md` et `03-screens.md`.

### P1-01 — `GET /api/notifications` — ⚠️ NOT IMPLEMENTED

**Attendu** : liste paginée des notifications in-app de l'utilisateur courant.  
**Contrat** : absent.  
**Backend** : absent (seul `POST /api/hr/notifications/bulk-remind` existe, pour autre chose).  
**Impact** : le centre de notifications (bell icon, badge, page `/notifications`) est inopérant.  
**Modèle** : `Notification` également absent (cf. `audit/02-models.md` P1-01).

### P1-02 — `PATCH /api/notifications/:id/read` — ⚠️ NOT IMPLEMENTED

**Attendu** : marquer une notification comme lue, mise à jour optimiste du badge.  
**Contrat** : absent.  
**Backend** : absent.  
**Dépendance** : bloquant si les notifications sont persistées en base.

### P1-03 — `GET /api/dashboard` — ⚠️ NOT IMPLEMENTED

**Attendu** : agrégats pour la page d'accueil (compteurs, évaluations en cours).  
**Contrat** : absent.  
**Backend** : la route `/dashboard` dans `index.js` est un redirect 301 vers `/employee` (SPA).  
**Impact** : le frontend devra faire N appels séparés au lieu d'un endpoint dédié.

---

## 🟠 P2 — Incohérences format/paramètres (contract ≠ backend)

### P2-01 — `PATCH /api/auth/preferences` — réponse avec `_id` non documenté

**Contrat** : `Response 200: { locale, theme, notificationPrefs }`  
**Backend** :
```js
const fresh = await User.findById(req.user.id)
  .select('locale theme notificationPrefs')
  .lean()    // ← lean() inclut _id dans le résultat
res.json(fresh)  // retourne { _id, locale, theme, notificationPrefs }
```
**Écart** : le champ `_id` est présent dans la réponse mais absent du contrat.  
**Correction appliquée** : contrat mis à jour → `{ _id, locale, theme, notificationPrefs }`.

---

### P2-02 — `GET /api/admin/audit/export` — `400` documenté mais non implémenté

**Contrat** : `Errors: 400 filtres invalides`  
**Backend** (audit.js, route `/export`) :
```js
// aucune validation — les filtres invalides sont silencieusement ignorés
if (req.query.action)     filter.action     = req.query.action
if (req.query.targetType) filter.targetType = req.query.targetType
```
La route `GET /api/admin/audit` (liste) valide bien les filtres contre `VALID_ACTIONS` et
`VALID_TARGET_TYPES` et retourne 400. Mais la route export ne le fait pas.  
**Impact** : un `action` invalide dans l'export est ignoré (pas d'erreur, résultats vides).  
**Correction appliquée** : contrat mis à jour → note que 400 n'est **pas** retourné actuellement sur l'export.

---

### P2-03 — Conventions globales — format d'erreur non documenté

**Contrat** : la table des conventions décrit les codes HTTP et leur traitement côté frontend, mais ne spécifie pas le format du corps d'erreur.  
**Backend** : `{ error: string }` de façon systématique sur toutes les erreurs (400, 401, 403, 404, 409, 429, 503).  
Seul `POST /api/auth/logout` retourne `{ message: 'Déconnecté' }` pour le succès 200.  
**Correction appliquée** : convention ajoutée dans le contrat.

---

## 📋 Routes réelles hors contrat (à documenter)

> Ces 11 routes existent dans le backend (`audit/01-routes.md`) mais sont absentes de `07-api-contract.md`.

### `/api/admin/ldap` — 5 routes (admin uniquement)

Montées avec `authGuard(['admin'])`. Aucune validation de body `config`.

| METHOD | Path | Handler |
|---|---|---|
| POST | `/api/admin/ldap/test` | Test de connexion LDAP |
| POST | `/api/admin/ldap/preview` | Prévisualisation de synchronisation |
| POST | `/api/admin/ldap/sync` | Synchronisation des utilisateurs |
| GET | `/api/admin/ldap/config` | Lecture de la config LDAP (sans `bindPassword`) |
| PUT | `/api/admin/ldap/config` | Mise à jour de la config LDAP |

**Recommandation** : documenter dans le contrat (section 11-bis ou intégrer à section Admin). Les frontends d'administration avancée en ont besoin.

---

### `/api/resources` — 5 routes (CRUD complet)

Module documentaire présent dans le backend mais entièrement absent du contrat.

| METHOD | Path | Rôles | Notes |
|---|---|---|---|
| GET | `/api/resources` | Tous (scopé) | Filtres possibles : type, status |
| GET | `/api/resources/:id` | Tous (RBAC) | — |
| POST | `/api/resources` | admin, hr | — |
| PATCH | `/api/resources/:id` | admin, hr | — |
| DELETE | `/api/resources/:id` | admin, hr | — |

**Recommandation** : documenter en section 17 du contrat (le modèle `Resource` existe et est complet).

---

### `/api/analytics/export/pdf` — 1 route

| METHOD | Path | Rôles | Notes |
|---|---|---|---|
| GET | `/api/analytics/export/pdf` | admin, hr | Export PDF analytique global (filtre campaignId possible) |

**Recommandation** : documenter dans le contrat (section 18 ou dans la section Analytics à créer).

---

## Corrections appliquées à `07-api-contract.md`

| # | Section modifiée | Nature de la correction |
|---|---|---|
| 1 | Conventions globales | Ajout du format d'erreur standard : `{ error: string }` |
| 2 | `PATCH /api/auth/preferences` | Response corrigée : `{ _id, locale, theme, notificationPrefs }` |
| 3 | `GET /api/admin/audit/export` | Note ajoutée : filtre 400 **non implémenté** côté export |
| 4 | Fin du document — section "Routes hors contrat" | Ajout des 11 routes LDAP + Resources + Analytics PDF |
| 5 | Fin du document — section "Routes absentes" | Ajout des 3 routes NOT IMPLEMENTED (notifications + dashboard) |

---

## Résumé exécutif

| Métrique | Valeur |
|---|---|
| Endpoints dans le contrat | 75 |
| Endpoints implémentés ✅ | **75/75** (100 % présents) |
| Endpoints conformes sans écart | **73/75** (97 %) |
| 🔴 P1 — Routes specs attendues absentes (contrat + backend) | **3** |
| 🟠 P2 — Incohérences format/comportement | **3** |
| 📋 Routes hors contrat à documenter | **11** |

**Conclusion** : le backend est complet vis-à-vis du contrat. Les deux seuls écarts (P2-01, P2-02) sont mineurs — un champ `_id` supplémentaire et une validation silencieuse sur l'export d'audit. L'effort prioritaire pour les agents suivants est d'implémenter les routes de notifications in-app (P1-01/P1-02) et de documenter les 11 routes hors contrat.
