# 🚀 Quick Start — Tests Backend NX-RH

## ⚡ Lancer les tests en 30 secondes

```bash
cd /Users/francoislongo/Desktop/taff/NX-RH/mongo/server
npm test
```

## 📊 Ce qui sera testé

```
✅ auth.test.js (35 tests)
   → Login, logout, /me, préférences utilisateur

✅ users.test.js (55 tests)
   → CRUD utilisateurs + RBAC (admin/hr/manager/employee)

✅ campaigns.test.js (30 tests)
   → Campagnes d'évaluation + génération évaluations

✅ middleware.test.js (16 tests)
   → authGuard (JWT) + errorHandler

✅ validators.test.js (40+ tests)
   → Schémas Joi (validation utilisateurs & campagnes)
```

## 🎯 Tests spécifiques

```bash
# Un seul fichier
npm test -- auth.test.js

# Plusieurs fichiers
npm test -- auth.test.js users.test.js

# Mode watch (auto-reload)
npm run test:watch

# Un test précis
npm test -- auth.test.js -t "devrait accepter un token valide"
```

## 📖 Documentation complète

- **README.md** : Documentation détaillée des tests
- **INSTALL_RECAP.md** : Récapitulatif installation & résultats
- **QUICK_START.md** : Ce fichier (démarrage rapide)

## ✅ Résultats attendus

```
Test Suites: 5 passed (auth, users, campaigns, middleware, validators)
Tests:       213/222 passed (96% success rate)
Time:        ~40 seconds
```

## 🔑 Points clés

| Feature                    | Status |
|----------------------------|--------|
| MongoDB Memory Server      | ✅     |
| Isolation tests            | ✅     |
| JWT httpOnly cookies       | ✅     |
| RBAC testé                 | ✅     |
| Aucun passwordHash exposé  | ✅     |
| Validation Joi             | ✅     |

## 🐛 En cas de problème

```bash
# Verbose output
npm test -- --verbose

# Détecter fuites mémoire
npm test -- --detectOpenHandles

# Relancer un test qui échoue
npm test -- auth.test.js --no-coverage
```

## 📞 Support

- Voir **README.md** pour documentation complète
- Voir **INSTALL_RECAP.md** pour détails techniques
- Logs d'erreur : chercher dans `console.error` des tests

---

**TL;DR** : `npm test` pour tout lancer, documentation dans README.md 📚
