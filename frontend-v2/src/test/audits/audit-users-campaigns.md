# Audit — Users + Campaigns

## Résumé
- Pages auditées: 10
- ✅ Conformes: 4
- ⚠️ Mineures: 5
- ❌ Incorrectes: 1

---

## UsersPage (S-06)
### ⚠️ Anomalies
- Pas de RBAC/scoping côté front: tout affiché via `getUsers(...)` sans filtre rôle
- Pas de vue "collaborateurs actifs seulement" pour rôles non admin/hr
- Pas d'actions bulk ni état offboarding dédié

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/users` (filtres q/role/dept/isActive) | ✅ |
| `POST /api/users/:id/offboarding` | ✅ |
| `POST /api/users/:id/anonymize` | ✅ |

---

## UserDetailPage
### ⚠️ Anomalies
- RBAC partiel sur contenu selon rôle (manager/director/self)
- Export RGPD: incohérence endpoint — impl `/api/users/:id/gdpr` vs spec `/api/users/:id/gdpr-export`

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/users/:id` | ✅ |
| `GET /api/evaluations?evaluateeId=:id` | ✅ |
| `POST /api/users/:id/offboarding` | ✅ |
| `GET /api/users/:id/gdpr` (vs `/gdpr-export`) | ⚠️ |

---

## UserNewPage / UserEditPage
### ✅ Conformes
- UI conforme, création et édition fonctionnelles
- RBAC "self edit limité" présent (isDisabled sur champs)

---

## CampaignsPage (S-09)
### ⚠️ Anomalies
- Progression via placeholder déterministe, pas données métier réelles
- Sinon très proche de la spec (tabs, recherche, colonnes, actions, mobile cards)

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/campaigns` | ✅ |
| `POST /api/campaigns/:id/clone` | ✅ |
| `POST /api/campaigns/:id/archive` | ✅ |
| `DELETE /api/campaigns/:id` | ✅ |

---

## CampaignDetailPage (S-11)
### ❌ Non conforme
- Transitions de statut incohérentes vs spec (draft→Activer, active→Clôturer, closed→Archiver)
- KPIs "Aperçu" restent à zéro (placeholders)
- Tab "Formulaires" n'affiche qu'un seul formulaire, pas une grille

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/campaigns/:id` | ✅ |
| `POST /api/campaigns/:id/activate` | ✅ |
| `POST /api/campaigns/:id/close` | ✅ |
| `POST /api/campaigns/:id/archive` | ✅ |
| `POST /api/campaigns/:id/clone` | ✅ |
| `DELETE /api/campaigns/:id` | ✅ |

---

## CampaignAnalyticsPage (S-43)
### ⚠️ Anomalie critique API
- **Appelle `GET /api/campaigns/:id/analytics` (déprécié)** au lieu de l'endpoint canonique `GET /api/analytics/campaigns/:id`
- Visuellement conforme (donut, histogramme, score, tableau)

### API calls
| Endpoint | Spec | Status |
|---|---|---|
| `GET /api/campaigns/:id/analytics` | S-12 déprécié | ⚠️ |
| `GET /api/analytics/campaigns/:id` | S-43 canonique | ❌ non utilisé |
| Export PDF/CSV | Oui | ✅ |

---

## Incohérences API transverses
- `usersApi.gdprExport` → `/api/users/:id/gdpr` (vs `/api/users/:id/gdpr-export` dans `usersApi.exportGdpr`)
- `campaignsApi.getCampaignAnalytics` → endpoint déprécié (`/api/campaigns/:id/analytics`)
