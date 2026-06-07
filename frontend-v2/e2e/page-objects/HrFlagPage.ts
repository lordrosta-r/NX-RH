import { Page, Locator } from '@playwright/test'

export class HrFlagPage {
  readonly page: Page
  readonly createButton: Locator
  readonly flagsList: Locator
  readonly statusFilter: Locator

  constructor(page: Page) {
    this.page = page
    this.createButton = page.getByRole('button', { name: /nouvelle demande|créer.*demande|nouvelle requête/i })
    this.flagsList = page.locator('[data-testid="hr-flags-list"]').or(page.locator('.hr-flags-list'))
    this.statusFilter = page.locator('select[name*="status"], #status-filter')
  }

  async goto() {
    await this.page.goto('/hr-flags')
    await this.page.waitForLoadState('networkidle')
  }

  async createFlag(data: {
    type: string
    subject: string
    description: string
    priority?: 'low' | 'medium' | 'high'
  }) {
    await this.createButton.click()
    await this.page.waitForLoadState('networkidle')

    // Type de demande
    const typeSelect = this.page.locator('select[name*="type"], #type, [aria-label*="type" i]').first()
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption(data.type)
    }

    // Sujet
    await this.page.getByLabel(/sujet|objet|titre|subject/i).fill(data.subject)

    // Description
    await this.page.getByLabel(/description|détails|message/i).fill(data.description)

    // Priorité (optionnel)
    if (data.priority) {
      const prioritySelect = this.page.locator('select[name*="priority"], #priority').first()
      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption(data.priority)
      }
    }

    await this.page.getByRole('button', { name: /créer|soumettre|envoyer|submit/i }).click()
    await this.page.waitForLoadState('networkidle')
  }

  async changeStatus(flagId: string, newStatus: 'pending' | 'in_progress' | 'resolved' | 'closed') {
    await this.page.goto(`/hr-flags/${flagId}`)
    await this.page.waitForLoadState('networkidle')

    const statusSelect = this.page.locator('select[name*="status"], #status').first()
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption(newStatus)
      
      const saveButton = this.page.getByRole('button', { name: /enregistrer|sauvegarder|save/i }).first()
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await this.page.waitForLoadState('networkidle')
      }
    }
  }

  async filterByStatus(status: 'pending' | 'in_progress' | 'resolved' | 'closed') {
    if (await this.statusFilter.isVisible()) {
      await this.statusFilter.selectOption(status)
      await this.page.waitForLoadState('networkidle')
    }
  }

  async getFlagCount(): Promise<number> {
    await this.page.waitForSelector('[data-testid*="flag"], [class*="flag-item"]', { timeout: 10000 })
    return await this.page.locator('[data-testid*="flag"], [class*="flag-item"]').count()
  }

  async openFlag(flagId: string) {
    await this.page.goto(`/hr-flags/${flagId}`)
    await this.page.waitForLoadState('networkidle')
  }
}
