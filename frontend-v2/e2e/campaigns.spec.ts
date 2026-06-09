import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { CampaignPage } from './page-objects/CampaignPage'

// Campagnes du seed e2e (mongo/server/seeds/seed.js). Match large : reste valide
// même si l'un des noms change, tant qu'au moins une campagne seed est présente.
const SEED_CAMPAIGN = /Entretien annuel|Mi-parcours|Évaluation 360°/i

test.describe('Campagnes - Gestion des campagnes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test("liste des campagnes accessible (admin)", async ({ page }) => {
    const campaignPage = new CampaignPage(page)
    await campaignPage.goto()
    
    // Vérifier l'accès
    await expect(page.locator('body')).not.toContainText(/acces refuse|unauthorized/i)
    
    // Vérifier la présence d'au moins une campagne seed
    await expect(page.getByText(SEED_CAMPAIGN).first()).toBeVisible({ timeout: 10000 })
  })

  test('liste des campagnes accessible (hr)', async ({ page }) => {
    await loginAs(page, 'hr')
    const campaignPage = new CampaignPage(page)
    await campaignPage.goto()
    
    await expect(page.locator('body')).not.toContainText(/acces refuse|unauthorized/i)
    await expect(page.getByText(SEED_CAMPAIGN).first()).toBeVisible({ timeout: 10000 })
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
    
    await page.getByText(SEED_CAMPAIGN).first().click()
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain('/campaigns/')
    await expect(page.getByText(SEED_CAMPAIGN).first()).toBeVisible()
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
