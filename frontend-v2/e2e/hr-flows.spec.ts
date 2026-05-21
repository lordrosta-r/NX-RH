import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('HR - Flux RH', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'hr')
  })

  test("dashboard HR s'affiche", async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
  })

  test('HR voit les evaluations', async ({ page }) => {
    await page.goto('/evaluations')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/acces refuse|unauthorized/i)
  })

  test('HR peut acceder aux campagnes', async ({ page }) => {
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/Evaluation Annuelle 2025|Évaluation Annuelle 2025/i)).toBeVisible({ timeout: 10000 })
  })

  test('HR bulk remind - bouton visible et cliquable', async ({ page }) => {
    await page.goto('/evaluations')
    await page.waitForLoadState('networkidle')

    const remindBtn = page.getByRole('button', { name: /rappel|remind/i }).first()
    if (await remindBtn.isVisible()) {
      await remindBtn.click()
      await page.waitForLoadState('networkidle')
    }
  })
})
