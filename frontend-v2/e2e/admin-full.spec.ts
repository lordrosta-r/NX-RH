import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Admin - Pages admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test("portail admin s'affiche", async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/acces refuse/i)
  })

  test("journal d'audit accessible", async ({ page }) => {
    await page.goto('/admin/audit')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/acces refuse/i)
  })

  test("analytics s'affichent", async ({ page }) => {
    await page.goto('/analytics')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
  })

  test("organigramme s'affiche", async ({ page }) => {
    await page.goto('/org')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
  })

  test('parametres RH accessibles', async ({ page }) => {
    await page.goto('/admin/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/acces refuse/i)
  })

  test('templates email accessibles', async ({ page }) => {
    await page.goto('/admin/mail-templates')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/acces refuse/i)
  })
})
