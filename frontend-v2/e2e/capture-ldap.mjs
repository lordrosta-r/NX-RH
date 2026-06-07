// Capture la preuve du peuplement LDAP : sources connectées, organigramme, annuaire.
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'screenshots', 'ldap')
const BASE = process.env.E2E_BASE_URL || 'https://localhost'
const STATE = '/tmp/nxrh_admin_state.json'

const PAGES = [
  ['admin-ldap', '/admin/ldap', true],
  ['orgchart', '/admin/orgchart', false],
  ['users', '/users', true],
]

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    baseURL: BASE, ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 },
    storageState: existsSync(STATE) ? STATE : undefined, locale: 'fr-FR',
  })
  const page = await ctx.newPage()
  for (const [name, path, full] of PAGES) {
    await page.goto(path)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1500)
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: full })
    console.log(`✓ ${name}`)
  }
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
