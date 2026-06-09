import { Page, Locator } from '@playwright/test'

export class EvaluationPage {
  readonly page: Page
  readonly evaluationsList: Locator
  readonly statusFilter: Locator
  readonly exportButton: Locator

  constructor(page: Page) {
    this.page = page
    this.evaluationsList = page.locator('[data-testid="evaluations-list"]').or(page.locator('.evaluations-list'))
    this.statusFilter = page.getByRole('listbox', { name: /statut|status/i })
    this.exportButton = page.getByRole('button', { name: /export|csv/i })
  }

  async goto() {
    await this.page.goto('/evaluations')
    await this.page.waitForLoadState('networkidle')
  }

  async filterByStatus(status: 'draft' | 'in_progress' | 'completed' | 'pending') {
    // L'UI réelle expose les statuts métier (assigned, in_progress, validated, ...).
    // On mappe les statuts génériques du test vers les vraies valeurs d'option.
    const map: Record<string, string> = {
      draft: 'assigned',
      in_progress: 'in_progress',
      completed: 'validated',
      pending: 'assigned',
    }
    const value = map[status] ?? status
    if ((await this.statusFilter.count()) === 0) return
    const hasOption =
      (await this.statusFilter.locator(`option[value="${value}"]`).count()) > 0
    if (!hasOption) return
    await this.statusFilter.selectOption(value)
    await this.page.waitForLoadState('networkidle')
  }

  async exportToCsv(): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 15000 })
    await this.exportButton.click()
    const download = await downloadPromise
    return download.suggestedFilename()
  }

  async openEvaluation(evaluationId: string) {
    await this.page.goto(`/evaluations/${evaluationId}`)
    await this.page.waitForLoadState('networkidle')
  }

  async getEvaluationCount(): Promise<number> {
    await this.page.waitForSelector('[data-testid*="evaluation"], [class*="evaluation"]', { timeout: 10000 })
    return await this.page.locator('[data-testid*="evaluation"], [class*="evaluation"]').count()
  }

  async clickFirstEvaluation() {
    // La liste rend des lignes avec un lien direct vers le détail (nom de l'évalué).
    const firstEval = this.page.locator('a[href*="/evaluations/"]').first()
    if ((await firstEval.count()) > 0) {
      await firstEval.click()
      await this.page.waitForLoadState('networkidle')
    }
  }
}
