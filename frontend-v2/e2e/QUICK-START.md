# 🚀 Quick Start - Tests E2E NX-RH

## Installation

```bash
cd /Users/francoislongo/Desktop/taff/NX-RH/frontend-v2
npm install
npx playwright install chromium
```

## Lancer les tests

### 1. Démarrer le serveur de dev
```bash
# Terminal 1
cd frontend-v2
npm run dev
```

### 2. Lancer les tests
```bash
# Terminal 2
cd frontend-v2
npm run test:e2e
```

## Tests disponibles

| Fichier | Tests | Description |
|---------|-------|-------------|
| `auth.spec.ts` | 10 tests | Authentification, login/logout, contrôle d'accès |
| `admin-full.spec.ts` | 11 tests | Parcours admin complet, hub, création users |
| `campaigns.spec.ts` | 7 tests | Gestion campagnes, wizard création |
| `evaluations.spec.ts` | 9 tests | Évaluations, export CSV, filtrage |
| `hr-flags.spec.ts` | 10 tests | Demandes RH, changements de statut |

**Total : 47 tests E2E**

## Commandes utiles

```bash
# Mode UI interactif (recommandé)
npm run test:e2e:ui

# Un seul fichier
npx playwright test auth.spec.ts

# Avec le navigateur visible
npx playwright test --headed

# Mode debug
npx playwright test --debug auth.spec.ts

# Voir le rapport HTML
npm run test:e2e:report
```

## Vérification rapide

```bash
# Test d'authentification (rapide)
npx playwright test auth.spec.ts

# Si tout fonctionne, lancer la suite complète
npm run test:e2e
```

## Troubleshooting

### Le serveur n'est pas démarré
```
Error: page.goto: net::ERR_CONNECTION_REFUSED
```
→ Démarrer `npm run dev` dans un autre terminal

### Port 5173 occupé
```bash
# Changer le port dans vite.config.ts
# Puis mettre à jour baseURL dans playwright.config.ts
```

### Tests échouent aléatoirement
```bash
# Augmenter les timeouts dans les tests
await expect(element).toBeVisible({ timeout: 15000 })
```

## Structure créée

```
e2e/
├── page-objects/           ✅ Page Object Model
│   ├── LoginPage.ts
│   ├── AdminPage.ts
│   ├── CampaignPage.ts
│   ├── EvaluationPage.ts
│   ├── HrFlagPage.ts
│   └── index.ts
├── helpers/               ✅ Helpers
│   ├── auth.ts           (loginAs, logout)
│   └── utils.ts          (utilities)
├── fixtures/             ✅ Test data
├── auth.spec.ts          ✅ 10 tests auth
├── admin-full.spec.ts    ✅ 11 tests admin
├── campaigns.spec.ts     ✅ 7 tests campaigns
├── evaluations.spec.ts   ✅ 9 tests evaluations
├── hr-flags.spec.ts      ✅ 10 tests hr-flags (NOUVEAU)
└── README-COMPLET.md     ✅ Documentation complète
```

## Prochaines étapes

1. ✅ Tests créés et structurés
2. ⏭️ Lancer une première exécution
3. ⏭️ Ajuster les sélecteurs si nécessaire
4. ⏭️ Intégrer dans CI/CD

---

**Note** : Les tests utilisent les données seed de la base de données. Assurez-vous que le backend est démarré avec les seeds chargés.
