import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { CampaignPage } from './page-objects/CampaignPage'

test.describe('Campagnes - Gestion des campagnes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test("liste des campagnes accessible (admin)", async ({ page }) => {
    const campaignPage = new CampaignPage(page)
    await campaignPage.goto()
    
    // Vérifier l'accès
    await expect(page.locator('body')).not.toContainText(/acces refuse|unauthorized/i)
    
    // Vérifier la présence de campagnes seed
    await expect(page.getByText(/Evaluation Annuelle 2025|Évaluation Annuelle 2025/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Bilan Annuel 2024/i)).toBeVisible({ timeout: 10000 })
  })

  test('liste des campagnes accessible (hr)', async ({ page }) => {
    await loginAs(page, 'hr')
    const campaignPage = new CampaignPage(page)
    await campaignPage.goto()
    
    await expect(page.locator('body')).not.toContainText(/acces refuse|unauthorized/i)
    await expect(page.getByText(/Evaluation Annuelle 2025|Évaluation Annuelle 2025/i)).toBeVisible({ timeout: 10000 })
  })

  test("campagne active affiche un % de progression", async ({ page }) => {
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')
    
    // Vérifier la présence d'indicateurs de progression
    const progressIndicators = page.locator('[class*="progress"], [style*="width"], [role="progressbar"]')
    await expect(progressIndicators.first()).toBeVisible({ timeout: 10000 })
  })

  test("creation d'une campagne via wizard 4 etapes", async ({ page }) => {
    const campaignPage = new CampaignPage(page)
    const timestamp = Date.now()
    
    await campaignPage.createCampaign({
      name: `Campagne Test ${timestamp}`,
      description: 'Description de test',
      startDate: '2025-10-01',
      endDate: '2025-12-31',
    })
    
    // Vérifier la redirection et la création
    expect(page.url()).toMatch(/\/campaigns/)
    await expect(page.getByText(`Campagne Test ${timestamp}`)).toBeVisible({ timeout: 10000 })
  })

  test("detail d'une campagne s'ouvre", async ({ page }) => {
    const campaignPage = new CampaignPage(page)
    await campaignPage.goto()
    
    await page.getByText(/Evaluation Annuelle 2025|Évaluation Annuelle 2025/i).first().click()
    await page.waitForLoadState('networkidle')
    
    expect(page.url()).toContain('/campaigns/')
    await expect(page.getByText(/Evaluation Annuelle 2025|Évaluation Annuelle 2025/i)).toBeVisible()
  })

  test('manager ne peut pas creer de campagne', async ({ page }) => {
    await loginAs(page, 'manager')
    
    await page.goto('/campaigns/new')
    await page.waitForLoadState('networkidle')
    
    // Soit redirection, soit message d'erreur
    const isUnauthorized = page.url().includes('/login') || 
                           page.url().includes('/unauthorized') ||
                           await page.getByText(/acces refuse|unauthorized|non autorise/i).isVisible()
    
    expect(isUnauthorized).toBeTruthy()
  })

  test('employee ne peut pas creer de campagne', async ({ page }) => {
    await loginAs(page, 'employee')
    
    await page.goto('/campaigns/new')
    await page.waitForLoadState('networkidle')
    
    // Soit redirection, soit message d'erreur
    const isUnauthorized = page.url().includes('/login') || 
                           page.url().includes('/unauthorized') ||
                           await page.getByText(/acces refuse|unauthorized|non autorise/i).isVisible()
    
    expect(isUnauthorized).toBeTruthy()
  })
})
