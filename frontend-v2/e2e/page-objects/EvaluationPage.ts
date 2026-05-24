import { Page, Locator } from '@playwright/test'

export class EvaluationPage {
  readonly page: Page
  readonly evaluationsList: Locator
  readonly statusFilter: Locator
  readonly exportButton: Locator

  constructor(page: Page) {
    this.page = page
    this.evaluationsList = page.locator('[data-testid="evaluations-list"]').or(page.locator('.evaluations-list'))
    this.statusFilter = page.locator('select[name*="status"], #status-filter')
    this.exportButton = page.getByRole('button', { name: /export|csv/i })
  }

  async goto() {
    await this.page.goto('/evaluations')
    await this.page.waitForLoadState('networkidle')
  }

  async filterByStatus(status: 'draft' | 'in_progress' | 'completed' | 'pending') {
    if (await this.statusFilter.isVisible()) {
      await this.statusFilter.selectOption(status)
      await this.page.waitForLoadState('networkidle')
    }
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
    const firstEval = this.page.getByRole('link').filter({ hasText: /voir|evaluation|évaluation/i }).first()
    if (await firstEval.isVisible()) {
      await firstEval.click()
      await this.page.waitForLoadState('networkidle')
    }
  }
}
