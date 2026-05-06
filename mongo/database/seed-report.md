# NX-RH — Seed Report

**Date d'exécution :** 2026-05-06 11:36:42  
**Script :** `cd /Users/francoislongo/Desktop/taff/NX-RH/mongo && node database/seed-full.js`  
**Résultat :** ✅ Succès (exit 0)

---

## Collections MongoDB — Comptages post-seed

| Collection            | Documents |
|-----------------------|----------:|
| users                 |        25 |
| sectors               |         3 |
| campaigns             |         4 |
| forms                 |         8 |
| configs               |         5 |
| mailtemplates         |         9 |
| evaluations           |        35 |
| offboardingrequests   |         2 |
| events                |        16 |
| resources             |         6 |
| notifications         |        49 |
| auditlogs             |        22 |

> Note : 14 documents users/campaigns/forms proviennent de seeds antérieurs
> (legacy `nanoxplore.com`). Les 11 utilisateurs + 3 campagnes + 6 formulaires
> NX-RH ont été upsertés sans écraser l'existant.

---

## Évaluations — Répartition par statut

| Statut             | Nb |
|--------------------|----|
| assigned           | 23 |
| submitted          |  4 |
| in_progress        |  1 |
| reviewed           |  1 |
| validated          |  1 |
| signed_manager     |  1 |
| signed_evaluatee   |  1 |
| signed_hr          |  1 |
| archived           |  1 |
| expired            |  1 |
| **Total**          | **35** |

---

## Comptes de test

Mot de passe commun : **`Test1234!`**

| Email                              | Rôle      | Notes                        |
|------------------------------------|-----------|------------------------------|
| admin@nx-rh.fr                     | admin     | Alice Moreau                 |
| rh@nx-rh.fr                        | hr        | Hugo Lambert                 |
| direction@nx-rh.fr                 | director  | Claire Bernard               |
| manager-it@nx-rh.fr                | manager   | Julien Robert — Engineering  |
| manager-marketing@nx-rh.fr         | manager   | Marie Dubois — Marketing [ldap] |
| employee-a@nx-rh.fr                | employee  | Élodie Martin — évals en cours |
| employee-b@nx-rh.fr                | employee  | Thomas Petit                 |
| employee-c@nx-rh.fr                | employee  | Sarah Leroy                  |
| employee-d@nx-rh.fr                | employee  | Antoine Faure [inactif]      |
| employee-e@nx-rh.fr                | employee  | Camille Girard [ldap]        |
| employee-offboarding@nx-rh.fr      | employee  | Nicolas Rousseau [offboarding] |

---

## Vérification API

**Endpoint :** `http://localhost:5050`  
**Auth :** cookie HttpOnly JWT (via `POST /api/auth/login`)

| Check                        | Résultat                                          |
|------------------------------|---------------------------------------------------|
| Login admin@nx-rh.fr         | ✅ HTTP 200 — cookie JWT `token=...` défini       |
| Login employee-a@nx-rh.fr    | ✅ HTTP 200 — cookie JWT `token=...` défini       |
| GET /api/campaigns (JSON brut)| ✅ 4 campagnes retournées (dont 3 NX-RH)         |
| Collections MongoDB           | ✅ Toutes les collections peuplées (voir table ci-dessus) |
| Rate limit /api/auth/login    | ⚠️ Atteint (5 req/15min) pendant le debug — données vérifiées via MongoDB directement |

> Les endpoints REST renvoient les données correctement (confirmé sur `/api/campaigns`
> avant épuisement du rate-limit). Le reste de la vérification a été effectué en
> interrogeant MongoDB directement — les données sont intactes.

---

## Formulaires NX-RH

| Titre                          | Type               |
|--------------------------------|--------------------|
| Auto-évaluation 2026           | self_evaluation    |
| Évaluation manager 2026        | manager_evaluation |
| Feedback ascendant 2026        | upward_feedback    |
| Objectifs N+1 2026             | objectives         |
| Demande de mobilité interne    | mobility_request   |
| Demande de promotion           | promotion_request  |

---

## Comment re-lancer le seed

```bash
cd /Users/francoislongo/Desktop/taff/NX-RH/mongo
node database/seed-full.js
```

Ou depuis le dossier `server` :

```bash
cd /Users/francoislongo/Desktop/taff/NX-RH/mongo/server
npm run seed:full
```

Le seed est **idempotent** : relancer ne supprime aucune donnée existante (upsert only).

---

## Todos

- [x] `seed-runner` — `seed-full.js` écrit et validé (exit 0)
