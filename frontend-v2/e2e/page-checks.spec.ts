import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const ADMIN_PAGES = [
  '/', '/users', '/org', '/campaigns', '/forms', '/evaluations',
  '/evaluations/history', '/analytics', '/events', '/resources',
  '/admin', '/admin/audit', '/admin/settings', '/admin/mail-templates',
  '/offboarding',
]

const HR_PAGES = [
  '/', '/users', '/org', '/campaigns', '/forms', '/evaluations',
  '/analytics', '/events', '/resources', '/offboarding',
]

const MANAGER_PAGES = [
  '/', '/org', '/campaigns', '/evaluations', '/events', '/resources',
]

const EMPLOYEE_PAGES = [
  '/', '/evaluations', '/events', '/resources',
]

test.describe('Verification pages - Admin', () => {
  for (const pagePath of ADMIN_PAGES) {
    test(`page ${pagePath} - pas d'erreur critique`, async ({ page }) => {
      await loginAs(page, 'admin')
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')

      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toMatch(/erreur interne du serveur|\b500\b|Cannot GET/i)
      expect(bodyText).not.toMatch(/non autoris\u00e9?|\b401\b/i)
    })
  }
})

test.describe('Verification pages - HR', () => {
  for (const pagePath of HR_PAGES) {
    test(`page ${pagePath} - pas d'erreur critique`, async ({ page }) => {
      await loginAs(page, 'hr')
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')

      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toMatch(/erreur interne du serveur|\b500\b/i)
    })
  }
})

test.describe('Verification pages - Manager', () => {
  for (const pagePath of MANAGER_PAGES) {
    test(`page ${pagePath} - pas d'erreur critique`, async ({ page }) => {
      await loginAs(page, 'manager')
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')

      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toMatch(/erreur interne du serveur|\b500\b/i)
    })
  }
})

test.describe('Verification pages - Employee', () => {
  for (const pagePath of EMPLOYEE_PAGES) {
    test(`page ${pagePath} - pas d'erreur critique`, async ({ page }) => {
      await loginAs(page, 'employee')
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')

      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toMatch(/erreur interne du serveur|\b500\b/i)
    })
  }
})
