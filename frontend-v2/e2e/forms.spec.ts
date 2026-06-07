import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import path from 'path'

test.describe('Formulaires', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test("liste des formulaires s'affiche", async ({ page }) => {
    await page.goto('/forms')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/erreur|error/i)
  })

  test("creation d'un formulaire", async ({ page }) => {
    await page.goto('/forms/new')
    await page.waitForLoadState('networkidle')

    const formTitle = `Form Test ${Date.now()}`
    const titleField = page.getByLabel(/titre|nom/i).first()
    if (await titleField.isVisible()) {
      await titleField.fill(formTitle)
    }

    const saveBtn = page.getByRole('button', { name: /sauvegarder|enregistrer|creer|créer/i })
    if (await saveBtn.isVisible()) {
      await saveBtn.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test("import d'un formulaire JSON", async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const importLink = page.getByRole('link', { name: /import.*form|formulaire.*import/i })
    if (await importLink.isVisible()) {
      await importLink.click()
      await page.waitForLoadState('networkidle')

      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles(path.join(__dirname, 'fixtures/form-test.json'))
        await page.getByRole('button', { name: /importer|valider/i }).click()
        await page.waitForLoadState('networkidle')
      }
    }
  })
})
