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
    // « Nouvel utilisateur » est un lien (Link) vers /users/new sur la page /users.
    this.createUserButton = page
      .getByRole('link', { name: /nouvel utilisateur|créer.*utilisateur|ajouter.*utilisateur/i })
      .or(page.locator('a[href="/users/new"]'))
    this.importCsvButton = page.getByRole('button', { name: /importer|import.*csv/i })
    this.createGroupButton = page.getByRole('button', { name: /créer.*groupe|nouveau groupe/i })
  }

  async goto() {
    await this.page.goto('/admin')
    await this.page.waitForLoadState('networkidle')
  }

  async gotoUsers() {
    // La gestion CRUD des collaborateurs (création, fiche, édition) est sur /users.
    // /admin/users est la vue RGPD (anonymisation), sans création.
    await this.page.goto('/users')
    await this.page.waitForLoadState('networkidle')
  }

  async gotoGroups() {
    await this.page.goto('/admin/groups')
    await this.page.waitForLoadState('networkidle')
  }

  async countHubCards(): Promise<number> {
    // Le hub admin rend des tuiles (.tile) regroupant des liens (.tile-link)
    // vers chaque destination d'administration.
    const cards = this.page.locator('.tile-link')
    await cards.first().waitFor({ state: 'visible', timeout: 10000 })
    return cards.count()
  }

  async createUser(userData: { firstName: string; lastName: string; email: string; role: string }) {
    // Le bouton « Nouvel utilisateur » de /users navigue vers le formulaire /users/new.
    await this.createUserButton.first().click()
    await this.page.waitForURL(/\/users\/new/, { timeout: 10000 })
    await this.page.waitForLoadState('networkidle')

    await this.page.locator('#firstName').fill(userData.firstName)
    await this.page.locator('#lastName').fill(userData.lastName)
    await this.page.locator('#email').fill(userData.email)
    await this.page.locator('#role').selectOption(userData.role)

    // Le formulaire est soumis via le bouton « Créer → » du PageHead.
    await this.page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).first().click()
    // Succès : une modale de confirmation « Utilisateur créé ! » s'affiche.
    // NB : on NE clique PAS « Voir le profil » — bug app connu (#bug) : la réponse
    // POST /api/users ne renvoie pas le champ virtuel `id`, la modale navigue donc
    // vers /users/undefined. La création est validée par la liste (voir spec).
    await this.page.getByText(/Utilisateur créé/i).waitFor({ state: 'visible', timeout: 10000 })
  }

  async importCsv(filePath: string) {
    const fileChooserPromise = this.page.waitForEvent('filechooser')
    await this.importCsvButton.click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(filePath)
    await this.page.waitForLoadState('networkidle')
  }
}
