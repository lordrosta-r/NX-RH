# Rapport QA — connexion en tant que 10 utilisateurs

**Score global : 60/60 assertions conformes** · 10/10 connexions réussies.

> Harness rejouable (`e2e/qa-harness.mjs`). Chaque ligne = une assertion exécutée **après connexion réelle** sous l'identité concernée. ✅ = conforme, ❌ = écart.

## ADMIN — admin-rh@nanoxplore.com
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Config LDAP | GET | ok | 200 | ✅ |
| Lister les utilisateurs | GET | ok | 200 | ✅ |
| Lister les campagnes | GET | ok | 200 | ✅ |
| Audit log | GET | ok | 200 | ✅ |
| Santé détaillée (admin) | GET | ok | 200 | ✅ |

## HR — marie.bernard.nx051@nxrh.local
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister les campagnes | GET | ok | 200 | ✅ |
| Lister les utilisateurs | GET | ok | 200 | ✅ |
| Lister les formulaires | GET | ok | 200 | ✅ |
| Bloquer/débloquer autorisé (route accessible) | PATCH | ok | 404 | ✅ |
| INTERDIT config LDAP (admin only) | GET | forbidden | 403 | ✅ |

## HR — paul.bertrand.nx066@nxrh.local
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister les campagnes | GET | ok | 200 | ✅ |
| Lister les utilisateurs | GET | ok | 200 | ✅ |
| Lister les formulaires | GET | ok | 200 | ✅ |
| Bloquer/débloquer autorisé (route accessible) | PATCH | ok | 404 | ✅ |
| INTERDIT config LDAP (admin only) | GET | forbidden | 403 | ✅ |

## MANAGER — amelie.clement.pa009@partner.local
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister les utilisateurs (équipe) | GET | ok | 200 | ✅ |
| Voir l’organigramme | GET | ok | 200 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT supprimer un compte | DELETE | forbidden | 403 | ✅ |

## MANAGER — paul.david.nx016@nxrh.local
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister les utilisateurs (équipe) | GET | ok | 200 | ✅ |
| Voir l’organigramme | GET | ok | 200 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT supprimer un compte | DELETE | forbidden | 403 | ✅ |

## MANAGER — sophie.dubois.nx003@nxrh.local
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister les utilisateurs (équipe) | GET | ok | 200 | ✅ |
| Voir l’organigramme | GET | ok | 200 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT supprimer un compte | DELETE | forbidden | 403 | ✅ |

## EMPLOYEE — clara.andre.nx023@nxrh.local
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister mes évaluations | GET | ok | 200 | ✅ |
| INTERDIT lister les utilisateurs | GET | forbidden | 403 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT bloquer un compte | PATCH | forbidden | 403 | ✅ |

## EMPLOYEE — liam.barbier.nx115@nxrh.local
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister mes évaluations | GET | ok | 200 | ✅ |
| INTERDIT lister les utilisateurs | GET | forbidden | 403 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT bloquer un compte | PATCH | forbidden | 403 | ✅ |

## EMPLOYEE — karim.benali.nx087@nxrh.local
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister mes évaluations | GET | ok | 200 | ✅ |
| INTERDIT lister les utilisateurs | GET | forbidden | 403 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT bloquer un compte | PATCH | forbidden | 403 | ✅ |

## EMPLOYEE — sarah.bertrand.pa031@partner.local
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister mes évaluations | GET | ok | 200 | ✅ |
| INTERDIT lister les utilisateurs | GET | forbidden | 403 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT bloquer un compte | PATCH | forbidden | 403 | ✅ |

