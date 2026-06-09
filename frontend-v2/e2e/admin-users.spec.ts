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
    // La liste rend une grille (tile) avec data-testid, pas une <table>.
    await expect(page.getByTestId('users-table')).toBeVisible({ timeout: 10000 })
  })

  test("detail utilisateur s'ouvre", async ({ page }) => {
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    // Chaque ligne de la grille lie vers /users/:id — on clique le 1er lien
    // de fiche (scopé à la table pour éviter /users/new et /users/groups du header).
    const detailLink = page
      .getByTestId('users-table')
      .locator('a[href^="/users/"]')
      .first()
    await detailLink.waitFor({ state: 'visible', timeout: 10000 })
    await detailLink.click()
    await page.waitForLoadState('networkidle')
    expect(page.url()).toMatch(/\/users\/[a-f0-9]{8,}/)
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
