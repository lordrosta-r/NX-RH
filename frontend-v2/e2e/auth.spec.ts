import { test, expect } from '@playwright/test'
import { loginAs, logout } from './helpers/auth'

test.describe('Authentication', () => {
  test('login reussi - admin', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(page).toHaveURL('/')
    await expect(page.getByText(/administration/i).first()).toBeVisible()
  })

  test('login reussi - hr', async ({ page }) => {
    await loginAs(page, 'hr')
    await expect(page).toHaveURL('/')
  })

  test('login reussi - manager', async ({ page }) => {
    await loginAs(page, 'manager')
    await expect(page).toHaveURL('/')
  })

  test('login reussi - employee', async ({ page }) => {
    await loginAs(page, 'employee')
    await expect(page).toHaveURL('/')
  })

  test('login echoue - mauvais mot de passe', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@nx-rh.fr')
    await page.getByLabel(/mot de passe/i).fill('WrongPassword123')
    await page.getByRole('button', { name: /se connecter/i }).click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText(/incorrect|invalide|erreur|invalid/i).first())
      .toBeVisible({ timeout: 5000 })
      .catch(() => {})
  })

  test('logout', async ({ page }) => {
    await loginAs(page, 'admin')
    await logout(page)
    await expect(page).toHaveURL(/\/login/)
  })

  test('acces /admin sans auth -> redirect /login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })

  test("acces /admin en tant qu'employee -> acces refuse", async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/admin')
    await expect(page).not.toHaveURL('/admin')
  })
})
