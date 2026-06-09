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

  /**
   * Wizard /campaigns/new (CampaignNewPage) — 4 étapes :
   *  0. Informations (nom, description, dates) — seuls nom + dates sont validés
   *  1. Formulaires (texte info)
   *  2. Public cible (périmètre, "all" par défaut)
   *  3. Récapitulatif → bouton "Créer la campagne"
   * Le nom, la description et les dates sont TOUS sur l'étape 0.
   */
  async createCampaign(data: {
    name: string
    description?: string
    startDate: string
    endDate: string
    template?: string
  }) {
    await this.gotoNew()

    // Étape 0 — Informations générales
    await this.page.locator('#campaign-name').fill(data.name)

    if (data.description) {
      await this.page.locator('#campaign-description').fill(data.description)
    }

    await this.page.locator('#campaign-start-date').fill(data.startDate)
    await this.page.locator('#campaign-end-date').fill(data.endDate)

    // 0 → 1 → 2 → 3 : trois clics "Suivant →"
    await this.clickNext() // → Formulaires
    await this.clickNext() // → Public cible
    await this.clickNext() // → Récapitulatif

    // Étape 3 — soumission
    await this.page
      .getByRole('button', { name: /créer la campagne/i })
      .click()

    await this.page.waitForLoadState('networkidle')
  }

  async clickNext() {
    await this.page
      .getByRole('button', { name: /suivant/i })
      .click()
    await this.page.waitForTimeout(300)
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
