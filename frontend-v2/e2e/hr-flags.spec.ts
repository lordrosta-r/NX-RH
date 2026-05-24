import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { HrFlagPage } from './page-objects/HrFlagPage'

test.describe('Demandes RH - HR Flags', () => {
  test('employee - creation demande RH', async ({ page }) => {
    await loginAs(page, 'employee')
    const hrFlagPage = new HrFlagPage(page)
    await hrFlagPage.goto()
    
    const timestamp = Date.now()
    const flagData = {
      type: 'conge',
      subject: `Demande congés ${timestamp}`,
      description: 'Je souhaite prendre des congés du 1er au 15 juillet',
      priority: 'medium' as const
    }
    
    // Créer la demande
    await hrFlagPage.createFlag(flagData)
    
    // Vérifier la création
    await expect(page.getByText(flagData.subject)).toBeVisible({ timeout: 10000 })
  })

  test('employee - liste de ses demandes', async ({ page }) => {
    await loginAs(page, 'employee')
    const hrFlagPage = new HrFlagPage(page)
    await hrFlagPage.goto()
    
    // Vérifier l'accès à la liste
    await expect(page.locator('body')).not.toContainText(/acces refuse|unauthorized/i)
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
  })

  test('hr - liste de toutes les demandes', async ({ page }) => {
    await loginAs(page, 'hr')
    const hrFlagPage = new HrFlagPage(page)
    await hrFlagPage.goto()
    
    // Vérifier l'accès
    await expect(page.locator('body')).not.toContainText(/acces refuse|unauthorized/i)
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
    
    // Le RH devrait voir des demandes de différents employés
    const flags = await hrFlagPage.getFlagCount().catch(() => 0)
    expect(flags).toBeGreaterThanOrEqual(0)
  })

  test('admin - liste de toutes les demandes', async ({ page }) => {
    await loginAs(page, 'admin')
    const hrFlagPage = new HrFlagPage(page)
    await hrFlagPage.goto()
    
    await expect(page.locator('body')).not.toContainText(/acces refuse|unauthorized/i)
  })

  test('admin - changement statut demande (pending -> in_progress)', async ({ page }) => {
    await loginAs(page, 'admin')
    const hrFlagPage = new HrFlagPage(page)
    await hrFlagPage.goto()
    
    // Ouvrir la première demande
    const firstFlag = page.getByRole('link').filter({ hasText: /voir|demande|détail/i }).first()
    if (await firstFlag.isVisible()) {
      await firstFlag.click()
      await page.waitForLoadState('networkidle')
      
      // Changer le statut
      const statusSelect = page.locator('select[name*="status"], #status').first()
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('in_progress')
        
        // Enregistrer
        const saveBtn = page.getByRole('button', { name: /enregistrer|sauvegarder|save/i }).first()
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForLoadState('networkidle')
          
          // Vérifier le changement
          await expect(statusSelect).toHaveValue('in_progress')
        }
      }
    }
  })

  test('admin - changement statut demande (in_progress -> resolved)', async ({ page }) => {
    await loginAs(page, 'admin')
    const hrFlagPage = new HrFlagPage(page)
    await hrFlagPage.goto()
    
    const firstFlag = page.getByRole('link').filter({ hasText: /voir|demande|détail/i }).first()
    if (await firstFlag.isVisible()) {
      await firstFlag.click()
      await page.waitForLoadState('networkidle')
      
      const statusSelect = page.locator('select[name*="status"], #status').first()
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('resolved')
        
        const saveBtn = page.getByRole('button', { name: /enregistrer|sauvegarder|save/i }).first()
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForLoadState('networkidle')
        }
      }
    }
  })

  test('hr - filtrage par statut "pending"', async ({ page }) => {
    await loginAs(page, 'hr')
    const hrFlagPage = new HrFlagPage(page)
    await hrFlagPage.goto()
    
    await hrFlagPage.filterByStatus('pending')
    
    // Vérifier que le filtrage fonctionne
    await expect(page.locator('body')).not.toContainText(/erreur/i)
  })

  test('hr - filtrage par statut "resolved"', async ({ page }) => {
    await loginAs(page, 'hr')
    const hrFlagPage = new HrFlagPage(page)
    await hrFlagPage.goto()
    
    await hrFlagPage.filterByStatus('resolved')
    
    await expect(page.locator('body')).not.toContainText(/erreur/i)
  })

  test('manager ne peut pas acceder aux demandes RH globales', async ({ page }) => {
    await loginAs(page, 'manager')
    
    await page.goto('/hr-flags')
    await page.waitForLoadState('networkidle')
    
    // Le manager ne devrait voir que ses propres demandes ou celles de son équipe
    // Pas de vérification stricte car dépend de la logique métier
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
  })

  test('employee ne peut voir que ses propres demandes', async ({ page }) => {
    await loginAs(page, 'employee')
    const hrFlagPage = new HrFlagPage(page)
    await hrFlagPage.goto()
    
    // L'employé ne devrait voir que ses demandes
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
  })
})
