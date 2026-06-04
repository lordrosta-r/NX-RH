# Audit fonctionnel par rôle — NX-RH

**Date :** 2026-06-04
**Méthode :** `scripts/role-audit.mjs` (API via nginx `https://localhost`) sur la dev stack à jour + seed socle.
**Comptes (mot de passe `Test1234!`) :** `admin@nx-rh.fr`, `rh@nx-rh.fr`, `mgr-eng@nx-rh.fr`, `emp-elodie@nx-rh.fr`.

Rejouer : `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d` → `./scripts/ldap-seed.sh` → `node mongo/database/seed.js` → `NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/role-audit.mjs`.

---

## 1. Accès & cohérence par rôle

| Domaine | admin | hr | manager | employee | Verdict |
|---|---|---|---|---|---|
| Login (local) | ✅ | ✅ | ✅ | ✅ | OK |
| Login (LDAP, 2 annuaires) | — | ✅ | ✅ | ✅ | OK (cf. §4) |
| Organigramme `/org/tree` | ✅ | ✅ | ✅ (scopé) | ⛔ 403 | OK |
| Liste users `/users` | ✅ | ✅ | ⚠️ **200** | ⛔ 403 | **À confirmer** : un manager liste TOUS les users |
| Campagnes `/campaigns` | ✅ | ✅ | ✅ | ✅ | OK |
| Admin LDAP / config | ✅ | ⛔ 403 | ⛔ 403 | ⛔ 403 | OK |

**RBAC global : sain**, sauf un point : `GET /api/users` est accessible aux managers (attendu : restreint hr/admin, ou au moins filtré à leur équipe). À trancher.

---

## 2. Clarté des concepts (campagne / évaluation / signature)

- **Campagne** : claire. Création HR OK (`POST /campaigns`, `formId` requis), assignation en masse OK (`POST /evaluations/bulk`).
- **Évaluation (self)** : claire et fonctionnelle. L'employé voit son évaluation, enregistre ses réponses, soumet (`assigned → in_progress → submitted`). ✅
- **Signature** : le mécanisme (`POST /evaluations/:id/sign`, `signatures[]`, `signatureStatus`) est correct **mais inatteignable par le manager** (voir §3).

---

## 3. ⚠️ Incohérence majeure — workflow review/signature côté manager

Le passage `submitted → reviewed → signed_*` est **bloqué pour le manager** par deux règles contradictoires :

1. **`routes/evaluations/mutations/update.js`** : pour un changement de statut, un `manager`/`director` doit être **l'évaluateur** (`evaluation.evaluatorId === user.id`).
   - Sur une **self_evaluation**, `evaluatorId === evaluateeId === employé` → le manager (le vrai relecteur) reçoit **403** sur `submitted → reviewed`.
2. **`models/Evaluation.js` `ROLE_TRANSITIONS.manager`** = `{ submitted:['reviewed'], signed_evaluatee:['signed_manager'] }` — il **manque `in_progress → submitted`**.
   - Sur une **manager_evaluation** (évaluateur = manager), le manager remplit puis tente de soumettre → **400** (« transition non autorisée pour le rôle manager »).

**Conséquence** : aucune des deux modélisations ne permet à un manager de relire/signer de bout en bout via l'API.
- Self-eval : le manager ne peut pas la passer en `reviewed` (il n'est pas l'évaluateur).
- Manager-eval : le manager ne peut pas la `submit` (transition de rôle absente).

Seul un `admin` (qui utilise `VALID_TRANSITIONS` complet) peut dérouler toute la chaîne.

**Recommandation** (Partie 2 — W8/W9) : clarifier le modèle. Option A : une seule évaluation par employé, l'employé soumet, le manager (= N+1 hiérarchique, pas l'évaluateur) peut `submitted → reviewed` → assouplir le check « évaluateur » en « évaluateur OU manager du N-1 ». Option B : garder des évals séparées et ajouter `in_progress → submitted` à `ROLE_TRANSITIONS.manager`. **À décider avec le métier.**

---

## 4. Cas limites demandés

| Cas | Résultat |
|---|---|
| **Offboarding en pleine campagne** | ✅ La complétion de la demande archive les évaluations en cours du sortant (`status → archived`) et le désactive. Vérifié de bout en bout. |
| **Non-réponse après la date limite** | ✅ Mécanique en place : `Evaluation.phaseDeadline` (deadlineEmployee/Manager selon la phase) posé à la création ; `scheduler.runDeadlineExpiry()` passe les évals `assigned`/`in_progress` à `expired` après la deadline, sans toucher les évals déjà soumises. (Auto-déclenché toutes les heures ; couvert par tests unitaires.) |
| **Signature électronique** | ⚠️ Mécanisme OK, mais état `reviewed` inatteignable par le manager (§3). |
| **LDAP multi-annuaires** | ✅ Login contre 2 OpenLDAP (`main` NX-RH + `partner`), upsert avec `ldapSource` correct, mots de passe masqués côté API. |

---

## 5. Bugs trouvés pendant l'audit

1. **[CORRIGÉ]** `ldapService.searchAsync` utilisait l'API `ldapjs` 2.x (`entry.object`) absente en 3.x → toutes les recherches LDAP ne renvoyaient que le `dn` → `authenticate`/`preview`/`sync` cassés. Réécrit via `entry.pojo.attributes`.
2. **[À CORRIGER — W3/sécu]** `[auth] AuditLog create failed` à chaque login échoué : l'audit `login_failed` est créé sans `userId`/`targetType`/`targetId` (requis) → l'entrée d'audit n'est jamais écrite (perte de traçabilité des échecs de connexion).
3. **[À CORRIGER — W9]** Contrat LDAP front/back : `AdminLdapPage` (ancienne version) envoyait `url`/`emailAttr` alors que le service lit `host`/`attrEmail` → l'UI LDAP mono-source était de fait non fonctionnelle. La réécriture multi-source (W1) utilise les noms backend.
4. **[À TRANCHER]** `GET /api/users` accessible aux managers (§1).
5. **[À CORRIGER — W8/W9]** Incohérence review/signature manager (§3).

---

## 6. Verdict

- **Socle, RBAC, campagnes, self-évaluation, offboarding, deadlines, LDAP multi-source** : opérationnels et cohérents.
- **Point bloquant pour une démo bout-en-bout du parcours** : la relecture/signature par le **manager** (§3) — à arbitrer puis corriger en Partie 2.
- Les specs Playwright existantes (`frontend-v2/e2e/workflow-*.spec.ts`) couvrent ces parcours mais s'appuient sur un **fixture seed différent** du socle minimal ; les aligner sur le nouveau seed est un préalable à leur exécution en CI (W11).
