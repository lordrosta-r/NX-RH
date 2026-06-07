// Capture les vues "par département" : organigramme Équipes & Secteurs,
// annuaire (colonne département), analytics, ciblage campagne par département.
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'screenshots', 'departments')
const BASE = process.env.E2E_BASE_URL || 'https://localhost'
const STATE = '/tmp/nxrh_admin_state.json'

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    baseURL: BASE, ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 },
    storageState: existsSync(STATE) ? STATE : undefined, locale: 'fr-FR',
  })
  const page = await ctx.newPage()
  const shot = async (name, full = false) => {
    await page.waitForTimeout(1200)
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: full })
    console.log(`✓ ${name}`)
  }
  const click = async (text) => {
    const el = page.getByText(text, { exact: false }).first()
    if (await el.count()) { await el.click().catch(() => {}); await page.waitForTimeout(800) }
  }

  // 1 — Organigramme : vue Équipes
  await page.goto('/admin/orgchart'); await page.waitForLoadState('networkidle').catch(() => {})
  await click('Équipes'); await shot('orgchart-equipes')
  // 2 — Organigramme : vue Secteurs
  await click('Secteurs'); await shot('orgchart-secteurs')

  // 3 — Annuaire (colonne département + filtre)
  await page.goto('/users'); await page.waitForLoadState('networkidle').catch(() => {})
  await shot('users-departements', true)

  // 4 — Analytique
  await page.goto('/analytics'); await page.waitForLoadState('networkidle').catch(() => {})
  await shot('analytics', true)

  // 5 — Ciblage campagne par département
  await page.goto('/campaigns/new'); await page.waitForLoadState('networkidle').catch(() => {})
  // étape 1 : remplir les champs requis pour pouvoir avancer
  await page.getByPlaceholder(/Entretiens annuels/i).fill('Démonstration ciblage département').catch(() => {})
  const dates = page.locator('input[type="date"]')
  await dates.nth(0).fill('2026-01-15').catch(() => {})
  await dates.nth(1).fill('2026-03-15').catch(() => {})
  await click('Suivant')            // → Formulaires
  await page.waitForTimeout(600)
  await click('Suivant')            // → Public cible
  await page.waitForTimeout(600)
  await click('Département')         // sélectionner le périmètre par département
  await page.waitForTimeout(600)
  await shot('campaign-scope-departement', true)

  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
