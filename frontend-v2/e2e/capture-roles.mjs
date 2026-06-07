// Capture le ressenti par rôle : connexion réelle (LDAP) de chaque persona et
// navigation de ses pages clés.  node e2e/capture-roles.mjs
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'screenshots', 'roles')
const BASE = process.env.E2E_BASE_URL || 'https://localhost'
const PW = 'Test1234!'

const PERSONAS = [
  { role: 'manager', email: 'pierre.bernard.nx002@nxrh.local', pages: [
    ['dashboard', '/'], ['a-traiter', '/manager/todo'], ['evaluations', '/evaluations'], ['campagnes', '/campaigns'],
  ] },
  { role: 'employe', email: 'clara.andre.nx023@nxrh.local', pages: [
    ['dashboard', '/'], ['mes-evaluations', '/evaluations'], ['campagnes', '/campaigns'], ['profil', '/profile'],
  ] },
  { role: 'rh', email: 'marie.bernard.nx051@nxrh.local', pages: [
    ['dashboard', '/'], ['campagnes', '/campaigns'], ['collaborateurs', '/users'], ['analytique', '/analytics'],
  ] },
]

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  for (const p of PERSONAS) {
    const ctx = await browser.newContext({ baseURL: BASE, ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 }, locale: 'fr-FR' })
    const page = await ctx.newPage()
    try {
      await page.goto('/login')
      await page.getByTestId('login-email').fill(p.email)
      await page.getByTestId('login-password').fill(PW)
      await page.getByTestId('login-submit').click()
      await page.waitForURL('/', { timeout: 20000 }).catch(() => {})
      await page.waitForTimeout(1500)
      for (const [name, path] of p.pages) {
        await page.goto(path)
        await page.waitForLoadState('networkidle').catch(() => {})
        await page.waitForTimeout(1400)
        await page.screenshot({ path: join(OUT, `${p.role}-${name}.png`), fullPage: true })
        console.log(`✓ ${p.role}/${name}`)
      }
    } catch (e) { console.log(`! ${p.role}: ${e.message.split('\n')[0]}`) }
    await ctx.close()
  }
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
