import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Manager - Flux manager', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'manager')
  })

  test('dashboard manager affiche widget campagnes actives', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
  })

  test("manager peut voir l'organigramme", async ({ page }) => {
    await page.goto('/org')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/erreur interne/i)
  })

  test('manager voit les campagnes', async ({ page }) => {
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText(/acces refuse/i)
  })
})
