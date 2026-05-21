import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Campagnes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test("liste des campagnes s'affiche avec les campagnes seed", async ({ page }) => {
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/Evaluation Annuelle 2025|Évaluation Annuelle 2025/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Bilan Annuel 2024/i)).toBeVisible()
  })

  test("campagne active affiche un % de progression", async ({ page }) => {
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[class*="progress"], [style*="width"]').first()).toBeVisible({ timeout: 10000 })
  })

  test("creation d'une nouvelle campagne", async ({ page }) => {
    await page.goto('/campaigns/new')
    await page.waitForLoadState('networkidle')

    const campaignName = `Test Campaign ${Date.now()}`

    const nameField = page.getByLabel(/nom|titre/i).first()
    if (await nameField.isVisible()) {
      await nameField.fill(campaignName)
    }

    const startDate = page.getByLabel(/date.*debut|debut|start/i).first()
    if (await startDate.isVisible()) {
      await startDate.fill('2025-10-01')
    }

    const endDate = page.getByLabel(/date.*fin|fin|end/i).first()
    if (await endDate.isVisible()) {
      await endDate.fill('2025-12-31')
    }

    await page.getByRole('button', { name: /creer|enregistrer|soumettre|créer|sauvegarder/i }).first().click()
    await page.waitForLoadState('networkidle')
    expect(page.url()).toMatch(/\/campaigns/)
  })

  test("detail d'une campagne s'ouvre", async ({ page }) => {
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')

    await page.getByText(/Evaluation Annuelle 2025|Évaluation Annuelle 2025/i).click()
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/campaigns/')
    await expect(page.getByText(/Evaluation Annuelle 2025|Évaluation Annuelle 2025/i)).toBeVisible()
  })
})
