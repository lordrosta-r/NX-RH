import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { 
  waitForPageLoad, 
  expectNoErrors, 
  generateTestEmail 
} from './helpers/utils'
import { AdminPage, CampaignPage } from './page-objects'

/**
 * EXEMPLE DE TEST - Template pour créer de nouveaux tests
 * 
 * Ce fichier montre les bonnes pratiques pour écrire des tests E2E robustes.
 * Copiez ce template pour créer de nouveaux tests.
 */

test.describe('Exemple - Template de tests', () => {
  
  // ============================================================================
  // EXEMPLE 1 : Test simple avec login
  // ============================================================================
  test('exemple 1 - test basique avec login', async ({ page }) => {
    // Login avec helper
    await loginAs(page, 'admin')
    
    // Navigation
    await page.goto('/admin')
    await waitForPageLoad(page)
    
    // Assertions
    await expect(page).toHaveURL('/admin')
    await expectNoErrors(page)
  })

  // ============================================================================
  // EXEMPLE 2 : Test avec Page Object
  // ============================================================================
  test('exemple 2 - utilisation de Page Object', async ({ page }) => {
    await loginAs(page, 'admin')
    
    // Utiliser un Page Object
    const adminPage = new AdminPage(page)
    await adminPage.goto()
    
    // Méthodes du Page Object
    const cardCount = await adminPage.countHubCards()
    expect(cardCount).toBeGreaterThan(0)
  })

  // ============================================================================
  // EXEMPLE 3 : Création avec données dynamiques
  // ============================================================================
  test('exemple 3 - creation avec donnees uniques', async ({ page }) => {
    await loginAs(page, 'admin')
    
    const adminPage = new AdminPage(page)
    await adminPage.gotoUsers()
    
    // Générer des données uniques
    const timestamp = Date.now()
    const userData = {
      firstName: 'Test',
      lastName: `User${timestamp}`,
      email: generateTestEmail('test'),
      role: 'employee'
    }
    
    // Créer l'utilisateur
    await adminPage.createUser(userData)
    
    // Vérifier la création
    await expect(page.getByText(userData.email)).toBeVisible({ timeout: 10000 })
  })

  // ============================================================================
  // EXEMPLE 4 : Test avec multiple étapes
  // ============================================================================
  test('exemple 4 - workflow multi-etapes', async ({ page }) => {
    await loginAs(page, 'admin')
    
    // Étape 1 : Créer une campagne
    const campaignPage = new CampaignPage(page)
    const campaignData = {
      name: `Test Campaign ${Date.now()}`,
      description: 'Description de test',
      startDate: '2025-10-01',
      endDate: '2025-12-31',
    }
    
    await campaignPage.createCampaign(campaignData)
    
    // Étape 2 : Vérifier que la campagne existe
    await campaignPage.goto()
    await expect(page.getByText(campaignData.name)).toBeVisible({ timeout: 10000 })
    
    // Étape 3 : Ouvrir la campagne
    await campaignPage.openCampaign(campaignData.name)
    expect(page.url()).toContain('/campaigns/')
  })

  // ============================================================================
  // EXEMPLE 5 : Test avec gestion d'élément optionnel
  // ============================================================================
  test('exemple 5 - gestion element optionnel', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/admin')
    
    // Vérifier si un bouton optionnel existe avant de cliquer
    const optionalButton = page.getByRole('button', { name: /optionnel/i })
    
    if (await optionalButton.isVisible()) {
      await optionalButton.click()
      await waitForPageLoad(page)
    } else {
      console.log('Bouton optionnel non présent, on continue')
    }
    
    await expectNoErrors(page)
  })

  // ============================================================================
  // EXEMPLE 6 : Test avec filtrage
  // ============================================================================
  test('exemple 6 - filtrage de liste', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/evaluations')
    await waitForPageLoad(page)
    
    // Sélectionner un filtre
    const statusFilter = page.locator('select[name*="status"]').first()
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('in_progress')
      await waitForPageLoad(page)
    }
    
    // Vérifier que le filtrage fonctionne
    await expectNoErrors(page)
  })

  // ============================================================================
  // EXEMPLE 7 : Test avec download
  // ============================================================================
  test('exemple 7 - telechargement fichier', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/evaluations')
    await waitForPageLoad(page)
    
    const exportBtn = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportBtn.isVisible()) {
      // Attendre le téléchargement
      const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
      await exportBtn.click()
      const download = await downloadPromise
      
      // Vérifier le fichier téléchargé
      expect(download.suggestedFilename()).toMatch(/\.csv$/)
    }
  })

  // ============================================================================
  // EXEMPLE 8 : Test avec contrôle d'accès
  // ============================================================================
  test('exemple 8 - controle acces par role', async ({ page }) => {
    // Login en tant qu'employé
    await loginAs(page, 'employee')
    
    // Tenter d'accéder à une page admin
    await page.goto('/admin')
    await waitForPageLoad(page)
    
    // Vérifier que l'accès est refusé (redirect ou message)
    const isUnauthorized = 
      page.url().includes('/login') || 
      page.url().includes('/unauthorized') ||
      await page.getByText(/acces refuse|unauthorized/i).isVisible()
    
    expect(isUnauthorized).toBeTruthy()
  })

  // ============================================================================
  // EXEMPLE 9 : Test avec plusieurs rôles
  // ============================================================================
  test('exemple 9 - test multiple roles', async ({ page }) => {
    const roles = ['admin', 'hr', 'manager', 'employee'] as const
    
    for (const role of roles) {
      // Login avec le rôle
      await loginAs(page, role)
      
      // Accéder à la page d'évaluations
      await page.goto('/evaluations')
      await waitForPageLoad(page)
      
      // Tous les rôles devraient pouvoir voir leurs évaluations
      await expectNoErrors(page)
      
      // Logout pour le prochain rôle
      await page.goto('/login')
    }
  })

  // ============================================================================
  // EXEMPLE 10 : Test avec assertions multiples
  // ============================================================================
  test('exemple 10 - assertions multiples', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/campaigns')
    await waitForPageLoad(page)
    
    // Assertions multiples
    await expect(page.locator('body')).not.toContainText(/erreur|error/i)
    await expect(page.locator('body')).not.toContainText(/acces refuse/i)
    await expect(page).toHaveURL(/\/campaigns/)
    
    // Vérifier la présence d'éléments
    const campaignCards = page.locator('[data-testid*="campaign"], [class*="campaign"]')
    await expect(campaignCards.first()).toBeVisible({ timeout: 10000 })
    
    // Compter les éléments
    const count = await campaignCards.count()
    expect(count).toBeGreaterThan(0)
  })
})

// ============================================================================
// BONNES PRATIQUES
// ============================================================================

/**
 * ✅ À FAIRE :
 * 
 * 1. Utiliser des sélecteurs stables :
 *    - data-testid
 *    - role (getByRole)
 *    - label (getByLabel)
 *    - text (getByText)
 * 
 * 2. Utiliser les Page Objects pour :
 *    - Logique de navigation
 *    - Interactions répétées
 *    - Workflows complexes
 * 
 * 3. Utiliser les helpers pour :
 *    - Authentification (loginAs, logout)
 *    - Attentes (waitForPageLoad)
 *    - Assertions communes (expectNoErrors)
 * 
 * 4. Générer des données uniques :
 *    - Utiliser Date.now() ou generateTestEmail()
 *    - Éviter les conflits entre tests
 * 
 * 5. Timeouts appropriés :
 *    - Navigation : 15s
 *    - Éléments visuels : 10s
 *    - Downloads : 15s
 * 
 * 6. Tests isolés :
 *    - Chaque test doit fonctionner indépendamment
 *    - Utiliser beforeEach pour la config commune
 */

/**
 * ❌ À ÉVITER :
 * 
 * 1. Sélecteurs fragiles :
 *    - Classes CSS (peuvent changer)
 *    - XPath complexes
 *    - nth-child sans contexte
 * 
 * 2. Attentes fixes (sleep) :
 *    - await page.waitForTimeout(5000) // ❌
 *    - Utiliser waitForLoadState ou expect avec timeout
 * 
 * 3. Données hardcodées réutilisées :
 *    - email: 'test@test.com' // ❌ Conflit entre tests
 *    - Générer des données uniques à chaque fois
 * 
 * 4. Tests dépendants :
 *    - Un test ne doit pas dépendre du succès d'un autre
 * 
 * 5. Catch qui masque les erreurs :
 *    - .catch(() => {}) // ❌ Masque les vrais problèmes
 */
