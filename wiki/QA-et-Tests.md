# QA & Tests

Le système QA vit dans [`docs/qa/`](../tree/main/docs/qa).

## Backlogs par rôle (402 cas)

Énumèrent **toutes les actions** de chaque rôle (bouton, champ, lien, menu, signature) avec
préconditions / étapes / résultat attendu / priorité, **cas d'erreur** et **invariants de sécurité**.

| Rôle | Cas |
|------|-----|
| Employé | 121 |
| Manager | 80 |
| RH | 116 |
| Admin | 85 |

## Harness automatisé (rejouable)

`frontend-v2/e2e/qa-harness.mjs` : compose un panel de **10 utilisateurs** (rôles répartis),
se **connecte réellement** sous chaque identité, et vérifie une matrice RBAC
(actions **autorisées** vs **interdites**).

```bash
# stack prod up + RELAX_RATE_LIMIT=true
cd frontend-v2 && node e2e/qa-harness.mjs   # → docs/qa/Rapport-QA.md
```

Dernier run : **10/10 connexions · 60/60 assertions conformes**.

## Tests automatisés du dépôt

- **Backend** : Jest + mongodb-memory-server. `cd mongo/server && npm test` (`--runInBand`).
- **Frontend** : Vitest (unit) + Playwright (`frontend-v2/e2e/`, ~30 specs).

## Scripts e2e utiles (peuplement / démonstration)

`frontend-v2/e2e/` : `ldap-connect-sync.mjs` (connecter+synchroniser les annuaires),
`assign-roles.mjs`, `capture-*.mjs` (captures par feature), `n1-demo.mjs` (rappel édition
précédente bout-en-bout), `lifecycle.mjs` (offboarding + départ manager avec réaffectation).
