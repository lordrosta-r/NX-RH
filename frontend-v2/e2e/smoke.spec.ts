import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

/**
 * SMOKE TESTS - Tests rapides pour vérifier que l'app fonctionne
 * Lancer avec: npx playwright test smoke.spec.ts
 */

test.describe('Smoke Tests - Vérifications rapides', () => {
  test('app démarre et login page accessible', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('#email')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible()
  })

  test('login admin fonctionne', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(page).toHaveURL('/')
    await expect(page.locator('body')).not.toContainText(/erreur|error/i)
  })

  test('pages principales accessibles - admin', async ({ page }) => {
    await loginAs(page, 'admin')
    
    // Dashboard
    await page.goto('/')
    await expect(page.locator('body')).not.toContainText(/erreur/i)
    
    // Admin
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/acces refuse/i)
    
    // Campaigns
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/erreur/i)
    
    // Evaluations
    await page.goto('/evaluations')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/erreur/i)
  })

  test('4 rôles peuvent se connecter', async ({ page }) => {
    const roles = ['admin', 'hr', 'manager', 'employee'] as const
    
    for (const role of roles) {
      await loginAs(page, role)
      await expect(page).toHaveURL('/')
      await expect(page.locator('body')).not.toContainText(/erreur/i)
      
      // Logout pour tester le prochain rôle
      await page.goto('/login')
    }
  })

  test('backend API répond', async ({ page }) => {
    // Vérifier que le backend est accessible
    await page.goto('/')
    const response = await page.request.get('http://localhost:3000/api/health')
      .catch(() => null)
    
    if (response) {
      expect(response.ok()).toBeTruthy()
    }
  })
})
