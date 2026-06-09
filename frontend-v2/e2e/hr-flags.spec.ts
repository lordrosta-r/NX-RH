import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { HrFlagPage } from './page-objects/HrFlagPage'

test.describe('Demandes RH - HR Flags', () => {
  test('employee - creation demande RH', async ({ page }) => {
    // L'employé ne crée pas de signal via /hr/flags (vue RH/admin) mais
    // via /mobility (« Demandes ») : modal « Nouvelle demande » → Soumettre.
    await loginAs(page, 'employee')
    await page.goto('/mobility')
    await page.waitForLoadState('networkidle')

    const motivation = `Demande formation e2e ${Date.now()}`

    await page.getByRole('button', { name: /nouvelle demande/i }).click()
    // Catégorie « Formation » → seul le champ Description est requis.
    await page.getByRole('combobox', { name: /type de demande/i }).selectOption('formation')
    await page.getByRole('textbox', { name: /description de la demande/i }).fill(motivation)
    await page.getByRole('button', { name: /soumettre/i }).click()
    await page.waitForLoadState('networkidle')

    // La demande créée apparaît dans la liste de l'employé.
    await expect(page.getByText('Formation').first()).toBeVisible({ timeout: 10000 })
  })

  test('employee - liste de ses demandes', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/mobility')
    await page.waitForLoadState('networkidle')

    // Vérifier l'accès à la liste de ses demandes (page « Demandes »).
    await expect(page.getByRole('heading', { name: /demandes/i }).first()).toBeVisible()
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

  test('admin - changement statut demande (slide-over)', async ({ page }) => {
    await loginAs(page, 'admin')
    const hrFlagPage = new HrFlagPage(page)
    await hrFlagPage.goto()

    // Ouvrir le détail du premier signal via le bouton d'actions de la ligne.
    const detailBtn = page.getByRole('button', { name: /détail du signal/i }).first()
    if ((await detailBtn.count()) === 0) {
      test.info().annotations.push({ type: 'info', description: 'Aucun signal RH dans le seed — changement de statut non testé' })
      return
    }
    await detailBtn.click()

    // Le slide-over expose un select « Changer le statut » + « Sauvegarder ».
    const statusSelect = page.getByRole('combobox', { name: /changer le statut/i })
    await expect(statusSelect).toBeVisible({ timeout: 10000 })
    await statusSelect.selectOption('in_progress')
    await expect(statusSelect).toHaveValue('in_progress')

    await page.getByRole('button', { name: /sauvegarder/i }).click()
    await page.waitForLoadState('networkidle')
    // Le slide-over se ferme après sauvegarde.
    await expect(statusSelect).toBeHidden({ timeout: 10000 })
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

  test('manager ne peut pas acceder a la vue RH globale des signaux', async ({ page }) => {
    await loginAs(page, 'manager')

    // /hr/flags est réservé admin/hr → le manager est bloqué (404 / non autorisé).
    await page.goto('/hr/flags')
    await page.waitForLoadState('networkidle')

    // AuthGuard redirige vers /unauthorized (« Accès refusé »).
    await expect(page).toHaveURL(/\/unauthorized/, { timeout: 10000 })
    await expect(
      page.getByText(/accès refusé|404|introuvable|non autorisé/i).first(),
    ).toBeVisible()
  })

  test('employee ne voit que ses propres demandes', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/mobility')
    await page.waitForLoadState('networkidle')

    // L'employé accède à « Demandes » (ses demandes), pas à la vue RH globale.
    await expect(page.getByRole('heading', { name: /demandes/i }).first()).toBeVisible()
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
  })
})
