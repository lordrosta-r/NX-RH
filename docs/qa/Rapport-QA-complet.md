# Rapport QA approfondi — actions métier par rôle

> Harness rejouable (`e2e/qa-harness-full.mjs`). Chaque ligne = une assertion exécutée **après connexion réelle** sous l'identité concernée, contre les **mêmes endpoints que l'UI**. Inclut lecture, écriture réversible (formulaire créé puis supprimé) et invariants de sécurité. ✅ = conforme, ❌ = écart.

**Date :** 2026-06-07 21:33:10

**Score global : 75/79 assertions conformes** · 10/10 connexions réussies.

### Écarts (❌) à investiguer

| Rôle | Assertion | Méthode | Attendu | HTTP |
|---|---|---|---|---|
| employee | Lister mes documents (/api/documents — endpoint du brief) | GET | ok | 404 |
| employee | Lister mes documents (/api/documents — endpoint du brief) | GET | ok | 404 |
| employee | Lister mes documents (/api/documents — endpoint du brief) | GET | ok | 404 |
| employee | Lister mes documents (/api/documents — endpoint du brief) | GET | ok | 404 |

## ADMIN — admin-rh (compte de test)
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Sources LDAP (admin) | GET | ok | 200 | ✅ |
| Journal d’audit (admin) | GET | ok | 200 | ✅ |
| Branding (GET) | GET | ok | 200 | ✅ |
| Santé détaillée (admin) | GET | ok | 200 | ✅ |
| Lister les utilisateurs | GET | ok | 200 | ✅ |
| Lister les campagnes | GET | ok | 200 | ✅ |
| ANTI-AUTO-BLOCAGE : bloquer mon propre compte | PATCH | rejected | 400 | ✅ |

## HR — marie.bernard.nx051 (compte de test)
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister les campagnes | GET | ok | 200 | ✅ |
| Lister les utilisateurs | GET | ok | 200 | ✅ |
| Lister les formulaires | GET | ok | 200 | ✅ |
| Créer un formulaire (POST /api/forms) | POST | ok | 201 | ✅ |
| Supprimer le formulaire de test (cleanup) | DELETE | ok | 204 | ✅ |
| INTERDIT config LDAP (admin only) | GET | forbidden | 403 | ✅ |

## HR — paul.bertrand.nx066 (compte de test)
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister les campagnes | GET | ok | 200 | ✅ |
| Lister les utilisateurs | GET | ok | 200 | ✅ |
| Lister les formulaires | GET | ok | 200 | ✅ |
| Créer un formulaire (POST /api/forms) | POST | ok | 201 | ✅ |
| Supprimer le formulaire de test (cleanup) | DELETE | ok | 204 | ✅ |
| INTERDIT config LDAP (admin only) | GET | forbidden | 403 | ✅ |

## MANAGER — amelie.clement.pa009 (compte de test)
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Voir l’organigramme (org/tree) | GET | ok | 200 | ✅ |
| Lister mon équipe (/api/users) | GET | ok | 200 | ✅ |
| Lister les évaluations de mon périmètre | GET | ok | 200 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT supprimer un compte | DELETE | forbidden | 403 | ✅ |

## MANAGER — paul.david.nx016 (compte de test)
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Voir l’organigramme (org/tree) | GET | ok | 200 | ✅ |
| Lister mon équipe (/api/users) | GET | ok | 200 | ✅ |
| Lister les évaluations de mon périmètre | GET | ok | 200 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT supprimer un compte | DELETE | forbidden | 403 | ✅ |

## MANAGER — sophie.dubois.nx003 (compte de test)
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Voir l’organigramme (org/tree) | GET | ok | 200 | ✅ |
| Lister mon équipe (/api/users) | GET | ok | 200 | ✅ |
| Lister les évaluations de mon périmètre | GET | ok | 200 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT supprimer un compte | DELETE | forbidden | 403 | ✅ |

## EMPLOYEE — clara.andre.nx023 (compte de test)
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister MES évaluations (scope perso) | GET | ok | 200 | ✅ |
| Lire ma fiche utilisateur (self) | GET | ok | 200 | ✅ |
| Lister mes ressources/documents (/api/resources) | GET | ok | 200 | ✅ |
| Lister mes documents (/api/documents — endpoint du brief) | GET | ok | 404 | ❌ |
| INTERDIT lister les utilisateurs | GET | forbidden | 403 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT voir l’organigramme | GET | forbidden | 403 | ✅ |

## EMPLOYEE — liam.barbier.nx115 (compte de test)
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister MES évaluations (scope perso) | GET | ok | 200 | ✅ |
| Lire ma fiche utilisateur (self) | GET | ok | 200 | ✅ |
| Lister mes ressources/documents (/api/resources) | GET | ok | 200 | ✅ |
| Lister mes documents (/api/documents — endpoint du brief) | GET | ok | 404 | ❌ |
| INTERDIT lister les utilisateurs | GET | forbidden | 403 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT voir l’organigramme | GET | forbidden | 403 | ✅ |

## EMPLOYEE — karim.benali.nx087 (compte de test)
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister MES évaluations (scope perso) | GET | ok | 200 | ✅ |
| Lire ma fiche utilisateur (self) | GET | ok | 200 | ✅ |
| Lister mes ressources/documents (/api/resources) | GET | ok | 200 | ✅ |
| Lister mes documents (/api/documents — endpoint du brief) | GET | ok | 404 | ❌ |
| INTERDIT lister les utilisateurs | GET | forbidden | 403 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT voir l’organigramme | GET | forbidden | 403 | ✅ |

## EMPLOYEE — sarah.bertrand.pa031 (compte de test)
- Connexion : ✅ 200 · Rôle attendu respecté : ✅

| Assertion | Méthode | Attendu | HTTP | Résultat |
|---|---|---|---|---|
| Voir mon profil | GET | ok | 200 | ✅ |
| Lister MES évaluations (scope perso) | GET | ok | 200 | ✅ |
| Lire ma fiche utilisateur (self) | GET | ok | 200 | ✅ |
| Lister mes ressources/documents (/api/resources) | GET | ok | 200 | ✅ |
| Lister mes documents (/api/documents — endpoint du brief) | GET | ok | 404 | ❌ |
| INTERDIT lister les utilisateurs | GET | forbidden | 403 | ✅ |
| INTERDIT créer une campagne | POST | forbidden | 403 | ✅ |
| INTERDIT config LDAP | GET | forbidden | 403 | ✅ |
| INTERDIT voir l’organigramme | GET | forbidden | 403 | ✅ |

