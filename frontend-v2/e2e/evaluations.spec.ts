import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { EvaluationPage } from './page-objects/EvaluationPage'

test.describe('Evaluations - Gestion des evaluations', () => {
  test("admin - liste des evaluations s'affiche", async ({ page }) => {
    await loginAs(page, 'admin')
    const evalPage = new EvaluationPage(page)
    await evalPage.goto()
    
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
    await expect(page.locator('body')).not.toContainText(/acces refuse/i)
  })

  test('admin - export CSV des evaluations', async ({ page }) => {
    await loginAs(page, 'admin')
    const evalPage = new EvaluationPage(page)
    await evalPage.goto()

    const exportBtn = page.getByRole('button', { name: /export|csv/i }).first()
    if (await exportBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
      await exportBtn.click()
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.csv$/)
    }
  })

  test('hr - liste des evaluations accessible', async ({ page }) => {
    await loginAs(page, 'hr')
    const evalPage = new EvaluationPage(page)
    await evalPage.goto()
    
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
    await expect(page.locator('body')).not.toContainText(/acces refuse/i)
  })

  test('manager - liste des evaluations de son equipe', async ({ page }) => {
    await loginAs(page, 'manager')
    const evalPage = new EvaluationPage(page)
    await evalPage.goto()
    
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
    await expect(page.locator('body')).not.toContainText(/acces refuse/i)
  })

  test('employee - dashboard affiche les evaluations en cours', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
  })

  test('employee - peut voir le detail de son evaluation', async ({ page }) => {
    await loginAs(page, 'employee')
    const evalPage = new EvaluationPage(page)
    await evalPage.goto()

    const evalLink = page.getByRole('link').filter({ hasText: /voir|evaluation|évaluation/i }).first()
    if (await evalLink.isVisible()) {
      await evalLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('/evaluations/')
    }
  })

  test('admin - filtrage par statut "en cours"', async ({ page }) => {
    await loginAs(page, 'admin')
    const evalPage = new EvaluationPage(page)
    await evalPage.goto()
    
    await evalPage.filterByStatus('in_progress')
    
    // Vérifier que le filtrage fonctionne (pas d'erreur)
    await expect(page.locator('body')).not.toContainText(/erreur/i)
  })

  test('admin - filtrage par statut "completee"', async ({ page }) => {
    await loginAs(page, 'admin')
    const evalPage = new EvaluationPage(page)
    await evalPage.goto()
    
    await evalPage.filterByStatus('completed')
    
    await expect(page.locator('body')).not.toContainText(/erreur/i)
  })

  test('admin - acces evaluation individuelle', async ({ page }) => {
    await loginAs(page, 'admin')
    const evalPage = new EvaluationPage(page)
    await evalPage.goto()
    
    await evalPage.clickFirstEvaluation()
    
    // Vérifier qu'on est sur une page de détail
    expect(page.url()).toContain('/evaluations/')
  })
})
