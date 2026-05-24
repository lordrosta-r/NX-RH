import { Page, Locator } from '@playwright/test'

export class CampaignPage {
  readonly page: Page
  readonly createButton: Locator
  readonly campaignsList: Locator

  constructor(page: Page) {
    this.page = page
    this.createButton = page.getByRole('button', { name: /nouvelle campagne|créer.*campagne|nouvelle évaluation/i })
    this.campaignsList = page.locator('[data-testid="campaigns-list"]').or(page.locator('.campaigns-list'))
  }

  async goto() {
    await this.page.goto('/campaigns')
    await this.page.waitForLoadState('networkidle')
  }

  async gotoNew() {
    await this.page.goto('/campaigns/new')
    await this.page.waitForLoadState('networkidle')
  }

  async createCampaign(data: {
    name: string
    description?: string
    startDate: string
    endDate: string
    template?: string
  }) {
    await this.gotoNew()

    // Step 1: Basic info
    const nameField = this.page.getByLabel(/nom|titre/i).first()
    await nameField.fill(data.name)

    if (data.description) {
      const descField = this.page.getByLabel(/description/i).first()
      if (await descField.isVisible()) {
        await descField.fill(data.description)
      }
    }

    await this.clickNextOrSubmit()

    // Step 2: Dates
    const startDateField = this.page.getByLabel(/date.*début|date.*debut|start.*date/i).first()
    if (await startDateField.isVisible()) {
      await startDateField.fill(data.startDate)
    }

    const endDateField = this.page.getByLabel(/date.*fin|end.*date/i).first()
    if (await endDateField.isVisible()) {
      await endDateField.fill(data.endDate)
    }

    await this.clickNextOrSubmit()

    // Step 3: Template (if applicable)
    if (data.template) {
      const templateSelect = this.page.locator('select[name*="template"], #template').first()
      if (await templateSelect.isVisible()) {
        await templateSelect.selectOption(data.template)
      }
    }

    await this.clickNextOrSubmit()

    // Step 4: Final submit
    await this.clickNextOrSubmit()

    await this.page.waitForLoadState('networkidle')
  }

  async clickNextOrSubmit() {
    const button = this.page.getByRole('button', {
      name: /suivant|next|créer|create|enregistrer|sauvegarder|soumettre|submit/i
    }).first()
    
    if (await button.isVisible()) {
      await button.click()
      await this.page.waitForTimeout(1000)
    }
  }

  async openCampaign(campaignName: string) {
    await this.page.getByText(campaignName).first().click()
    await this.page.waitForLoadState('networkidle')
  }

  async getCampaignCount(): Promise<number> {
    await this.page.waitForSelector('[data-testid*="campaign"], [class*="campaign"]', { timeout: 10000 })
    return await this.page.locator('[data-testid*="campaign"], [class*="campaign"]').count()
  }
}
