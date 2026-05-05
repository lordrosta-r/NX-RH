# Audit — Admin + Profile + Onboarding + Offboarding

## Résumé
- Pages auditées: 11
- ✅ Conformes: 2
- ⚠️ Mineures: 1
- ❌ Incorrectes: 8

---

## AdminHubPage (S-26)
### ✅ Conforme
- 6 cards de navigation présentes, pointent vers les bons écrans

---

## AdminLdapPage (S-28)
### ✅ Conforme
- Onglets Config / Test / Prévisualisation / Synchronisation présents

### ⚠️ Anomalies mineures
- Onglet sync affiche seulement `synced/errors` — spec attend `N créés / M mis à jour / K ignorés` + dernière sync

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/admin/ldap` | ✅ |
| `PUT /api/admin/ldap` | ✅ |
| `POST /api/admin/ldap/test` | ✅ |
| `POST /api/admin/ldap/preview` | ✅ |
| `POST /api/admin/ldap/sync` | ⚠️ |

---

## AdminConfigPage (S-27)
### ❌ Non conforme
- Spec demande sections (Général / SMTP / Feature flags / Sécurité) + `PATCH /api/admin/config/batch`
- Impl = table clé/valeur + modals CRUD individuels
- Pas de vrais champs SMTP/features/security, pas de save batch

### API calls
| Endpoint | Spec | Status |
|---|---|---|
| `GET /api/admin/config` | `GET /api/admin/config/keys` (impl) | ❌ |
| `PATCH /api/admin/config/batch` | `PUT /api/admin/config/keys` (impl) | ❌ |
| `DELETE /api/admin/config/keys/:key` | spec ne prévoit pas suppression | ❌ |

---

## AdminAuditPage (S-29)
### ❌ Non conforme
- Export CSV appelle `/api/admin/audit/export` — spec prévoit `format=csv` query param
- Filtres envoyés (`actor`, `targetType`) vs API typée (`actorId`)
- Pas d'état d'erreur visible

---

## AdminUsersPage (S-30)
### ❌ Non conforme
- Manquent: colonnes `authSource` + date archivage
- Manquent: filtres `authSource` / inactifs
- Manquent: bandeau RGPD + action "Forcer désactivation"

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/admin/users` | ✅ |
| `POST /api/admin/users/:id/anonymize` | ✅ |
| `GET /api/admin/users/:id/gdpr-export` | ✅ |

---

## AdminUsersImportPage (S-40)
### ❌ Non conforme
- Spec: CSV/JSON + auto-détection `;`/`,` + mode `dryRun` + template CSV
- Impl: import simple vers `/api/admin/users/import` (vs spec `/api/users/import?dryRun=...`)
- Parser CSV ne gère que la virgule
- Colonnes limitées (email/firstName/lastName/role)

---

## AdminFormsImportPage (S-41)
### ❌ Non conforme
- Spec: 2 onglets (fichier / coller JSON) + validation `formType` + aperçu riche + template JSON + redirection `/forms/:id`
- Impl: dropzone fichier seul + redirection `/forms`
- Endpoint: `/api/admin/forms/import` vs spec `/api/forms/import`

---

## ProfilePage (S-31)
### ❌ Non conforme
- Onglet "Mes demandes": `GET /api/evaluations` générique vs spec filtré par `formType`
- Dropdown "Déposer une demande": `search=formType` vs spec `formType=<type>`
- Bloc Infos: champ `manager` absent en lecture seule

### API calls
| Endpoint | Status |
|---|---|
| `PATCH /api/users/:id` | ✅ |
| `PATCH /api/users/:id/avatar` | ✅ |
| `GET /api/evaluations` (non filtré formType) | ❌ |
| `GET /api/forms?formType=<type>` | ⚠️ |
| `GET /api/users/:id/gdpr-export` | ✅ |

---

## OnboardingPage (S-33)
### ❌ Non conforme
- Bouton "Passer cette étape" visible dès étape 1 (spec interdit)
- Étape "Votre équipe": liste collègues du département seulement (spec: manager direct + membres équipe)
- Pas de guard `onboarding.completed` visible

### API calls
| Endpoint | Status |
|---|---|
| `PATCH /api/users/:id/onboarding/:stepIndex` | ✅ |
| `PATCH /api/users/:id/onboarding/complete` | ✅ |
| `PATCH /api/users/:id/avatar` | ✅ |

---

## OffboardingPage (S-23)
### ❌ Non conforme
- Action "Modifier statut" absente du menu ⋮ sur la liste
- Pas de RBAC visible dans le composant

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/offboarding` | ✅ |
| `POST /api/offboarding` | ✅ |
| `DELETE /api/offboarding/:id` | ✅ |
| `PATCH /api/offboarding/:id/status` (manquant sur liste) | ❌ |

---

## OffboardingDetailPage (S-24)
### ✅ Conforme
- Layout 2 colonnes, checklist cliquable, notes RH, changement statut, modal suppression admin

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/offboarding/:id` | ✅ |
| `PATCH /api/offboarding/:id/checklist/:index` | ✅ |
| `PATCH /api/offboarding/:id/notes` | ✅ |
| `PATCH /api/offboarding/:id/status` | ✅ |
| `DELETE /api/offboarding/:id` | ✅ |
