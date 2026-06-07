# Audit Tests — NX-RH

> Réalisé sur `/NX-RH/mongo/server` — Jest 30, Node, supertest, pas de MongoDB réel.

---

## Tests existants (22 fichiers)

| Fichier | Tests (approx.) | Statut |
|---------|----------------|--------|
| `middleware/errorHandler.test.js` | 7 | ❌ 1 fail (msg "Session expirée" ≠ "Token invalide") |
| `middleware/authGuard.test.js` | ~8 | ✅ Pass |
| `config/constants.test.js` | ~5 | ✅ Pass |
| `config/ldap.test.js` | ~5 | ✅ Pass |
| `models/evaluation.test.js` | ~12 | ✅ Pass |
| `models/user.test.js` | ~10 | ✅ Pass |
| `routes/auth.test.js` | ~28 | ✅ Pass |
| `routes/campaigns.test.js` | ~50 | ✅ Pass |
| `routes/evaluations.test.js` | ~25 | ✅ Pass |
| `routes/evaluations.bulk.test.js` | ~80 | ✅ Pass |
| `routes/evaluations.n1context.test.js` | ~10 | ✅ Pass |
| `routes/evaluations.pdf.test.js` | ~15 | ✅ Pass |
| `routes/forms.test.js` | ~45 | ✅ Pass |
| `routes/users.test.js` | ~40 | ✅ Pass |
| `routes/events.test.js` | ~35 | ❌ 2 fails (createdBy non transmis) |
| `routes/audit.test.js` | ~15 | ✅ Pass |
| `routes/analytics.test.js` | ~20 | ✅ Pass |
| `routes/admin.test.js` | ~20 | ✅ Pass |
| `routes/ldap.test.js` | ~15 | ✅ Pass |
| `routes/offboarding.test.js` | ~30 | ✅ Pass |
| `routes/resources.test.js` | ~20 | ✅ Pass |
| `services/managerVisibility.test.js` | ~10 | ✅ Pass |

**Total avant ajout : 669 tests — 3 échecs préexistants (non liés à cet audit)**

### Échecs préexistants (à corriger séparément)

1. `errorHandler.test.js` — le test attend `"Session expirée"` mais la route renvoie `"Token invalide"` pour `TokenExpiredError`. Désynchronisation test ↔ implémentation.
2. `events.test.js` (×2) — `Event.create` non appelé avec `createdBy` attendu. Probable refactoring du handler non reflété dans les tests.

---

## Routes sans tests

### P1 — Critiques

| Route | Fichier source | Couverture |
|-------|---------------|------------|
| `POST /api/auth/login` | `routes/auth.js` | ✅ Couvert dans `auth.test.js` — mais pas de fichier dédié login. **Nouveau : `auth.login.test.js` créé** |
| `POST /api/campaigns/:id/launch` | `routes/campaigns.js` | ⚠️ **Route inexistante** — le "lancement" est géré via `PATCH /api/campaigns/:id` (transition draft→active), couvert dans `campaigns.test.js` |
| `POST /api/evaluations/:id/submit` | `routes/evaluations/` | ⚠️ **Route inexistante** — la soumission est une transition de statut via `PATCH /:id`, couverte dans `evaluations.test.js` |
| `POST /api/users/import` | `routes/users/import.js` | ❌ **Aucun test** → **Nouveau : `users.import.test.js` créé** |
| `GET /api/org/tree` | `routes/org/index.js` | ❌ **Aucun test** → **Nouveau : `org.tree.test.js` créé** |
| `POST /api/forms/import` | `routes/forms/importExport.js` | ❌ Aucun test dédié import/export |
| `GET /api/hr/flags` | `routes/hr/flags.js` | ❌ Aucun test |
| `PATCH /api/hr/flags/:id/status` | `routes/hr/flags.js` | ❌ Aucun test (AuditLog via auditLog.push non testé) |
| `DELETE /api/org/sectors/:id` | `routes/org/index.js` | ❌ Aucun test (409 si utilisé non testé) |

### P2 — Importantes

| Route | Fichier source | Couverture |
|-------|---------------|------------|
| `GET /api/evaluations/:id` | `routes/evaluations/queries.js` | ⚠️ Partiellement (RBAC employé vs manager non isolé) |
| `PATCH /api/evaluations/:id` | `routes/evaluations/mutations.js` | ✅ Couvert dans `evaluations.test.js` |
| `GET /api/org/tree?view=sector` | `routes/org/index.js` | ❌ Couvert par le nouveau `org.tree.test.js` |
| `PATCH /api/org/users/:id` | `routes/org/index.js` | ❌ Anti-cycle managerId non testé |
| `GET /api/hr/notifications` | `routes/hr/notifications.js` | ❌ Aucun test |
| `POST /api/offboarding` | `routes/offboarding.js` | ✅ Couvert |

---

## Nouveaux tests créés

| Fichier | Tests | Résultat |
|---------|-------|---------|
| `__tests__/routes/auth.login.test.js` | 10 | ✅ 10/10 pass |
| `__tests__/routes/org.tree.test.js` | 13 | ✅ 13/13 pass |
| `__tests__/routes/users.import.test.js` | 16 | ✅ 16/16 pass |

**Après ajout : 705 tests — 3 échecs préexistants inchangés, 0 régression introduite.**

### Détail `auth.login.test.js` (10 tests)
- 400 email manquant / password manquant / format invalide
- 401 utilisateur inconnu / mauvais mot de passe / LDAP user / utilisateur inactif
- 200 cookie httpOnly posé + user sans passwordHash
- 200 payload JWT (id, email, role) vérifié
- 200 remember=true allonge maxAge (~30 jours)

### Détail `org.tree.test.js` (13 tests)
- 401 sans token / 403 rôle insuffisant
- 400 vue invalide
- `view=all` : racines au premier niveau, enfants imbriqués
- `view=teams` : groupes par manager, sous-managers
- `view=sector` : groupes par secteur, utilisateurs sans secteur → groupe null
- Liste vide → []

### Détail `users.import.test.js` (16 tests)
- 401 / 403 guards
- 400 body non-tableau / tableau vide / CSV vide
- `dryRun=true` : action=create pour nouveau, action=update pour existant
- Création effective : incrémente `created`, mock `new User`
- Mise à jour effective : incrémente `updated`, modifie `firstName`
- Validation : email invalide / rôle invalide / firstName+lastName manquants
- Warning : managerEmail introuvable → warning + user créé quand même
- CSV virgule + CSV point-virgule
- Résolution `sectorName → sectorId`

---

## Recommandations

### 🔴 Priorité haute (à traiter avant mise en production)

1. **Corriger `errorHandler.test.js`** — mettre à jour le message attendu pour `TokenExpiredError` : `"Token invalide"` (ou aligner l'implémentation sur `"Session expirée"`).
2. **Corriger `events.test.js`** — le test `createdBy` attend que `Event.create` soit appelé avec `createdBy: req.user.id`, mais le handler a vraisemblablement été refactorisé.
3. **Créer `__tests__/routes/hr.flags.test.js`** — `GET /api/hr/flags` (filtres type, status, department, sectorId) + `PATCH /:evalId/status` (création AuditLog, transition valide, 400/404).
4. **Créer `__tests__/routes/forms.import.test.js`** — `POST /api/forms/import` (JSON valide, JSON invalide, conflit).

### 🟡 Priorité moyenne

5. **Créer `__tests__/routes/org.sectors.test.js`** — `DELETE /api/org/sectors/:id` (409 si des utilisateurs l'utilisent), `POST` et `PATCH`.
6. **Créer `__tests__/routes/org.users.test.js`** — `PATCH /api/org/users/:id` (anti-cycle managerId, champ `sectorId`).
7. **Ajouter `coverageThreshold`** dans `jest` config (ex. `{ global: { lines: 70 } }`) pour prévenir les régressions silencieuses.

### 🟢 Qualité / outillage

8. **Ajouter `setupFilesAfterFramework`** si un mock MongoDB global (mongomemoryserver) est introduit — évite la duplication des mocks modèles dans chaque fichier.
9. **Activer `--coverage`** en CI pour obtenir un rapport HTML automatique.
10. **Configurer `collectCoverageFrom`** pour exclure `seeds/`, `config/db.js` des métriques de couverture.
