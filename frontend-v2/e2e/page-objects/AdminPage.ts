import { Page, Locator } from '@playwright/test'

export class AdminPage {
  readonly page: Page
  readonly adminHub: Locator
  readonly createUserButton: Locator
  readonly importCsvButton: Locator
  readonly createGroupButton: Locator

  constructor(page: Page) {
    this.page = page
    this.adminHub = page.locator('[data-testid="admin-hub"]').or(page.locator('text=/hub|portail/i'))
    this.createUserButton = page.getByRole('button', { name: /créer.*utilisateur|créer un utilisateur|ajouter.*utilisateur/i })
    this.importCsvButton = page.getByRole('button', { name: /importer|import.*csv/i })
    this.createGroupButton = page.getByRole('button', { name: /créer.*groupe|nouveau groupe/i })
  }

  async goto() {
    await this.page.goto('/admin')
    await this.page.waitForLoadState('networkidle')
  }

  async gotoUsers() {
    await this.page.goto('/admin/users')
    await this.page.waitForLoadState('networkidle')
  }

  async gotoGroups() {
    await this.page.goto('/admin/groups')
    await this.page.waitForLoadState('networkidle')
  }

  async countHubCards(): Promise<number> {
    await this.page.waitForSelector('[data-testid*="card"], .card, [class*="card"]', { timeout: 10000 })
    const cards = await this.page.locator('[data-testid*="card"], .card, [class*="card"]').count()
    return cards
  }

  async createUser(userData: { firstName: string; lastName: string; email: string; role: string }) {
    await this.createUserButton.click()
    await this.page.waitForLoadState('networkidle')

    await this.page.getByLabel(/prénom|prenom|first.*name/i).fill(userData.firstName)
    await this.page.getByLabel(/nom de famille|nom|last.*name/i).fill(userData.lastName)
    await this.page.getByLabel(/email|e-mail/i).fill(userData.email)
    
    const roleSelect = this.page.locator('select[name*="role"], #role, [aria-label*="role" i]').first()
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption(userData.role)
    }

    await this.page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).click()
    await this.page.waitForLoadState('networkidle')
  }

  async importCsv(filePath: string) {
    const fileChooserPromise = this.page.waitForEvent('filechooser')
    await this.importCsvButton.click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(filePath)
    await this.page.waitForLoadState('networkidle')
  }
}
