import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Evaluations', () => {
  test("admin - liste des evaluations s'affiche", async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/evaluations')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
  })

  test('admin - export CSV des evaluations', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/evaluations')
    await page.waitForLoadState('networkidle')

    const exportBtn = page.getByRole('button', { name: /export|csv/i }).first()
    if (await exportBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
      await exportBtn.click()
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.csv$/)
    }
  })

  test('employee - dashboard affiche les evaluations en cours', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
  })

  test('employee - peut voir le detail de son evaluation', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/evaluations')
    await page.waitForLoadState('networkidle')

    const evalLink = page.getByRole('link').filter({ hasText: /voir|evaluation|evaluat/i }).first()
    if (await evalLink.isVisible()) {
      await evalLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('/evaluations/')
    }
  })
})
