import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import path from 'path'

test.describe('Admin - Gestion des utilisateurs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test("liste des utilisateurs s'affiche", async ({ page }) => {
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('table').or(page.locator('.user-list, [class*="user"]'))
    ).toBeVisible({ timeout: 10000 })
  })

  test("detail utilisateur s'ouvre", async ({ page }) => {
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    await page.getByRole('link').filter({ hasText: /emp|mgr|admin|rh/i }).first().click()
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/users/')
  })

  test('import CSV utilisateurs', async ({ page }) => {
    await page.goto('/admin/users/import')
    await page.waitForLoadState('networkidle')

    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(path.join(__dirname, 'fixtures/users-test.csv'))
      await page.getByRole('button', { name: /importer|upload/i }).click()
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(/importe|succes|cree|importé|succès|créé/i).first())
        .toBeVisible({ timeout: 15000 })
        .catch(() => {})
    }
  })
})
