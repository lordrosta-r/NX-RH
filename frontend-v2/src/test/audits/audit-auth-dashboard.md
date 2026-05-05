# Audit — Auth + Dashboard

## Résumé
- Pages auditées: 9
- ✅ Conformes: 3
- ⚠️ Mineures: 4
- ❌ Manquantes/Incorrectes: 2

## LoginPage (S-01)
### ✅ Conforme
- H1, sous-titre, champs email/mdp, checkbox, CTA principal et lien LDAP si activé ok
- Erreurs 401/429/403 conformes spec
- Redirection après login avec `?redirect=` conservée

### ⚠️ Anomalies mineures
- Le layout spec inclut logo + tagline au-dessus de la card; géré par `AuthLayout`
- Le CTA LDAP n'est pas explicitement "Secondary" en style exact de spec

### API calls
| Endpoint | Spec | Impl | Status |
|---|---|---|---|
| `POST /api/auth/login` | Oui | `authApi.login()` | ✅ |

---

## LoginLdapPage (S-02)
### ✅ Conforme
- H1 "Connexion LDAP", sous-titre, lien retour, champ login texte, bouton LDAP ok
- Redirection vers `/login` si `VITE_LDAP_ENABLED=false`
- Redirection si déjà authentifié

### ⚠️ Anomalies mineures
- Message 503/serveur indisponible ajouté côté UI (non spécifié, acceptable)

### API calls
| Endpoint | Spec | Impl | Status |
|---|---|---|---|
| `POST /api/auth/login/ldap` | Oui | `authApi.loginLdap()` | ✅ |

---

## AuthGuard
### ✅ Conforme
- Blocage non-auth → `/login`
- Blocage rôle non autorisé → `/`
- Loading state présent

### ⚠️ Anomalies mineures
- Pas de redirection spécifique par rôle/route au-delà du fallback `/`

---

## AuthContext
### ✅ Conforme
- `getMe` au boot, `login`, `loginLdap`, `logout` implémentés
- `isAuthenticated` dérivé de `user`

### ⚠️ Anomalies mineures
- Logout fait un `window.location.href = '/login'` (full reload) au lieu d'une navigation SPA
- Pas de gestion explicite du "remember me" côté front

### API calls
| Endpoint | Status |
|---|---|
| `GET /api/auth/me` | ✅ |
| `POST /api/auth/login` | ✅ |
| `POST /api/auth/login/ldap` | ✅ |
| `POST /api/auth/logout` | ✅ |

---

## DashboardPage + rôles (S-04/S-05)
### ✅ Conforme
- Routing par rôle vers composants dédiés
- Loading wrapper présent

### DashboardEmployeePage ⚠️
- Spec attend "Bonjour, [Prénom]" en header global; ici dans une card
- Ressources récentes et Prochains événements sont des placeholders
- API: seulement `GET /api/evaluations?...` — manque `GET /api/campaigns?status=active` et `GET /api/evaluations?campaignId=null&evaluateeId=me`
- Pas de lien "Voir campagne active" / carte "Mes demandes"

### DashboardManagerPage ⚠️
- Cartes non triées par deadline
- "Rappels deadline" hardcodé à 0
- API `scope=my_team` non vérifiable côté page

### DashboardHrPage ⚠️
- "Exporter PDF" désactivé (CTA attendu par spec)
- KPI "Évals à signer" hardcodé à 0

### DashboardAdminPage ⚠️
- "Activité récente" = placeholder S11
- Pas d'appel `GET /api/config` visible

## API Contract Summary
| Endpoint | Spec | Status |
|---|---|---|
| `POST /api/auth/login` | Auth | ✅ |
| `POST /api/auth/login/ldap` | Auth | ✅ |
| `GET /api/auth/me` | Auth | ✅ |
| `POST /api/auth/logout` | Auth | ✅ |
| `GET /api/campaigns?status=active` | Dashboard | ⚠️ non visible |
| `GET /api/evaluations?campaignId=null&evaluateeId=me` | Employee | ❌ absent |
| `GET /api/evaluations?scope=my_team` | Manager | ⚠️ non visible |
| `GET /api/evaluations?scope=subtree` | Director | ⚠️ non visible |
| `GET /api/hr/flags?status=submitted` | HR/Admin | ⚠️ non visible |
| `GET /api/config` | Admin | ❌ absent |
