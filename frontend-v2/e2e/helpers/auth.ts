import { Page } from '@playwright/test'

export type AppRole = 'admin' | 'hr' | 'manager' | 'employee'

const CREDENTIALS: Record<AppRole, { email: string; password: string }> = {
  admin:    { email: 'admin@nx-rh.fr',     password: 'Test1234!' },
  hr:       { email: 'rh@nx-rh.fr',        password: 'Test1234!' },
  manager:  { email: 'mgr.back@nx-rh.fr',  password: 'Test1234!' },
  employee: { email: 'emp.back1@nx-rh.fr', password: 'Test1234!' },
}

export async function loginAs(page: Page, role: AppRole) {
  await page.goto('/login')
  await page.waitForSelector('#email', { timeout: 10000 })
  await page.locator('#email').fill(CREDENTIALS[role].email)
  await page.locator('#password').fill(CREDENTIALS[role].password)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.waitForURL('/', { timeout: 15000 })
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /deconnexion|déconnexion|logout/i }).click().catch(async () => {
    await page.locator('[aria-label*="profil" i], [aria-label*="compte" i]').first().click()
    await page.getByText(/deconnexion|déconnexion|se deconnecter/i).click()
  })
  await page.waitForURL(/\/login/, { timeout: 10000 })
}
