import { Page, expect } from '@playwright/test'

/**
 * Attend que la page soit complètement chargée
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Vérifie qu'aucune erreur n'est affichée sur la page
 */
export async function expectNoErrors(page: Page) {
  await expect(page.locator('body')).not.toContainText(/erreur|error|échec|failed/i)
}

/**
 * Vérifie qu'aucun message d'accès refusé n'est affiché
 */
export async function expectNotUnauthorized(page: Page) {
  await expect(page.locator('body')).not.toContainText(/acces refuse|unauthorized|non autorise|forbidden/i)
}

/**
 * Scroll jusqu'à un élément
 */
export async function scrollToElement(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded()
}

/**
 * Attend qu'un élément soit visible et clique dessus
 */
export async function waitAndClick(page: Page, selector: string, timeout = 10000) {
  await page.locator(selector).waitFor({ state: 'visible', timeout })
  await page.locator(selector).click()
}

/**
 * Remplit un champ de formulaire de manière robuste
 */
export async function fillField(page: Page, labelPattern: RegExp, value: string) {
  const field = page.getByLabel(labelPattern).first()
  await field.waitFor({ state: 'visible', timeout: 10000 })
  await field.fill(value)
}

/**
 * Sélectionne une option dans un select
 */
export async function selectOption(page: Page, selectSelector: string, value: string) {
  const select = page.locator(selectSelector).first()
  if (await select.isVisible()) {
    await select.selectOption(value)
  }
}

/**
 * Génère un timestamp unique pour les tests
 */
export function generateTimestamp(): number {
  return Date.now()
}

/**
 * Génère un email unique pour les tests
 */
export function generateTestEmail(prefix = 'test'): string {
  return `${prefix}.${generateTimestamp()}@nx-rh.fr`
}

/**
 * Attend qu'un téléchargement soit complété
 */
export async function waitForDownload(page: Page, triggerAction: () => Promise<void>): Promise<string> {
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
  await triggerAction()
  const download = await downloadPromise
  return download.suggestedFilename()
}

/**
 * Prend un screenshot avec un nom personnalisé
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/screenshots/${name}-${Date.now()}.png`, fullPage: true })
}

/**
 * Vérifie si un élément existe dans le DOM (sans erreur si absent)
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    return await page.locator(selector).count() > 0
  } catch {
    return false
  }
}

/**
 * Attend un délai (à utiliser avec parcimonie)
 */
export async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
