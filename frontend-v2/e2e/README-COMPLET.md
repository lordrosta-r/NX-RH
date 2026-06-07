# Tests E2E Playwright - NX-RH

Suite complète de tests end-to-end pour l'application NX-RH.

## 📋 Structure

```
e2e/
├── fixtures/              # Données de test (CSV, JSON)
├── helpers/              # Helpers et utilitaires
│   ├── auth.ts          # Authentification
│   └── utils.ts         # Utilitaires généraux
├── page-objects/        # Page Object Model
│   ├── LoginPage.ts
│   ├── AdminPage.ts
│   ├── CampaignPage.ts
│   ├── EvaluationPage.ts
│   ├── HrFlagPage.ts
│   └── index.ts
└── *.spec.ts            # Fichiers de tests
```

## 🧪 Fichiers de tests

### 1. `auth.spec.ts` - Authentification
- ✅ Login réussi pour chaque rôle (admin, hr, manager, employee)
- ✅ Login échoué (mauvais mot de passe, email inexistant)
- ✅ Logout avec redirection
- ✅ Accès pages protégées sans auth → redirect login
- ✅ Contrôle d'accès par rôle

### 2. `admin-full.spec.ts` - Parcours Admin
- ✅ Dashboard admin avec sections clés
- ✅ Hub admin (vérification des cartes)
- ✅ Création d'utilisateur
- ✅ Import CSV utilisateurs
- ✅ Création de groupe d'utilisateurs
- ✅ Accès journal d'audit
- ✅ Accès analytics et organigramme
- ✅ Paramètres RH et templates email

### 3. `campaigns.spec.ts` - Campagnes
- ✅ Liste des campagnes (admin + hr)
- ✅ Affichage % de progression
- ✅ Création campagne via wizard 4 étapes
- ✅ Détail d'une campagne
- ✅ Vérification que manager/employee ne peuvent pas créer

### 4. `evaluations.spec.ts` - Évaluations
- ✅ Liste des évaluations (admin, hr, manager, employee)
- ✅ Export CSV des évaluations
- ✅ Filtrage par statut (en cours, complétée)
- ✅ Accès évaluation individuelle
- ✅ Dashboard employé avec évaluations

### 5. `hr-flags.spec.ts` - Demandes RH
- ✅ Création d'une demande (employé)
- ✅ Liste des demandes (employee, hr, admin)
- ✅ Changement de statut (admin/hr)
- ✅ Filtrage par statut (pending, resolved)
- ✅ Contrôles d'accès par rôle

## 🔑 Credentials

Les comptes de test (seed data) :

| Rôle     | Email                   | Mot de passe |
|----------|-------------------------|--------------|
| Admin    | admin@nx-rh.fr         | Test1234!    |
| HR       | rh@nx-rh.fr            | Test1234!    |
| Manager  | mgr.back@nx-rh.fr      | Test1234!    |
| Employee | emp.back1@nx-rh.fr     | Test1234!    |

## 🚀 Lancer les tests

### Prérequis
```bash
cd frontend-v2
npm install
```

### Tous les tests
```bash
npm run test:e2e
```

### Tests en mode UI (recommandé pour debug)
```bash
npm run test:e2e:ui
```

### Tests spécifiques
```bash
npx playwright test auth.spec.ts
npx playwright test admin-full.spec.ts
npx playwright test campaigns.spec.ts
npx playwright test evaluations.spec.ts
npx playwright test hr-flags.spec.ts
```

### Voir le rapport
```bash
npm run test:e2e:report
```

## 🎯 Page Object Model

Les Page Objects encapsulent la logique d'interaction avec les pages :

```typescript
import { LoginPage, AdminPage } from './page-objects'

test('exemple', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login('admin@nx-rh.fr', 'Test1234!')
  
  const adminPage = new AdminPage(page)
  await adminPage.goto()
  const cardCount = await adminPage.countHubCards()
  expect(cardCount).toBeGreaterThan(0)
})
```

## 🛠️ Helpers disponibles

### `auth.ts`
```typescript
import { loginAs, logout } from './helpers/auth'

await loginAs(page, 'admin')  // Login rapide
await logout(page)             // Logout
```

### `utils.ts`
```typescript
import {
  waitForPageLoad,
  expectNoErrors,
  expectNotUnauthorized,
  generateTestEmail,
  waitForDownload
} from './helpers/utils'

await waitForPageLoad(page)
await expectNoErrors(page)
const email = generateTestEmail('test')
```

## 📝 Bonnes pratiques

### 1. Sélecteurs stables
- **Préférer** : `data-testid`, `role`, `label`
- **Éviter** : classes CSS, XPath complexes

```typescript
// ✅ Bon
page.getByRole('button', { name: /créer/i })
page.getByLabel(/email/i)
page.locator('[data-testid="submit-btn"]')

// ❌ Éviter
page.locator('.btn-primary.submit')
page.locator('div > div > button:nth-child(3)')
```

### 2. Attentes et timeouts
```typescript
// Attendre la visibilité
await expect(page.getByText('Succès')).toBeVisible({ timeout: 10000 })

// Attendre la navigation
await page.waitForURL('/dashboard', { timeout: 15000 })

// Attendre le réseau
await page.waitForLoadState('networkidle')
```

### 3. Tests robustes
```typescript
// Gérer les éléments optionnels
const optionalBtn = page.getByRole('button', { name: /optionnel/i })
if (await optionalBtn.isVisible()) {
  await optionalBtn.click()
}

// Vérifier l'absence d'erreurs
await expect(page.locator('body')).not.toContainText(/erreur|error/i)
```

### 4. Isolation des tests
- Chaque test doit être **indépendant**
- Utiliser `test.beforeEach` pour la configuration commune
- Générer des données uniques avec timestamps

```typescript
test('create user', async ({ page }) => {
  const timestamp = Date.now()
  const email = `test.${timestamp}@nx-rh.fr`
  // ...
})
```

## 🐛 Debug

### 1. Mode headed (voir le navigateur)
```bash
npx playwright test --headed
```

### 2. Mode debug (pause et inspection)
```bash
npx playwright test --debug
```

### 3. Traces
Les traces sont automatiquement capturées en cas d'échec :
```bash
npx playwright show-trace test-results/.../trace.zip
```

### 4. Screenshots
Les screenshots sont pris automatiquement en cas d'échec dans `test-results/`

## ⚙️ Configuration

Voir `playwright.config.ts` :
- **baseURL** : `http://localhost:5173`
- **Workers** : 1 (tests séquentiels)
- **Retries** : 2 en CI, 0 en local
- **Timeout** : 30s par test (défaut)

## 📊 CI/CD

Les tests peuvent être intégrés dans votre pipeline CI :

```yaml
# .github/workflows/e2e.yml
- name: Run E2E tests
  run: |
    cd frontend-v2
    npm ci
    npx playwright install --with-deps chromium
    npm run test:e2e
```

## 🔒 Sécurité

- Les credentials de test sont **uniquement** pour l'environnement de dev
- Ne **jamais** committer de vraies credentials
- Les cookies JWT sont httpOnly (sécurité renforcée)

## 📈 Couverture

Actuellement **5 fichiers de tests** couvrant :
- ✅ Authentification & autorisation
- ✅ Workflows admin complets
- ✅ Gestion des campagnes
- ✅ Gestion des évaluations
- ✅ Demandes RH (hr-flags)

## 🤝 Contribuer

Pour ajouter de nouveaux tests :

1. Créer un nouveau fichier `*.spec.ts`
2. Utiliser les Page Objects existants ou en créer de nouveaux
3. Suivre les conventions de nommage et structure
4. Documenter les tests ajoutés dans ce README

---

**Dernière mise à jour** : Mai 2025  
**Playwright version** : 1.60+  
**Statut** : ✅ Suite complète fonctionnelle
