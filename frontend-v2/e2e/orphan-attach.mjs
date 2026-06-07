// Cas 2 : une recrue arrivée SANS manager (orpheline) → rattachement dans l'app
// via la fiche (« Responsable direct »). Avant/après dans la vue Départements.
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'screenshots', 'orphan')
const STATE = '/tmp/nxrh_admin_state.json'
const RECRUE_ID = process.argv[2]            // id de la recrue orpheline
const MANAGER = process.argv[3] || 'Pierre Bernard'

async function main() {
  await mkdir(OUT, { recursive: true })
  const b = await chromium.launch()
  const ctx = await b.newContext({ baseURL: 'https://localhost', ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 }, storageState: existsSync(STATE) ? STATE : undefined, locale: 'fr-FR' })
  const p = await ctx.newPage()
  const deptShot = async (name) => {
    await p.goto('/admin/orgchart'); await p.waitForLoadState('networkidle').catch(() => {})
    await p.waitForTimeout(1500)
    await p.getByText('Départements', { exact: false }).first().click().catch(() => {})
    await p.waitForTimeout(2000)
    await p.screenshot({ path: join(OUT, name), fullPage: true })
    console.log('✓', name)
  }

  // AVANT : la recrue est un nœud racine isolé dans son département
  await deptShot('01-avant-orpheline.png')

  // RATTACHEMENT via la fiche : Responsable direct = manager
  await p.goto(`/users/${RECRUE_ID}/edit`); await p.waitForLoadState('networkidle').catch(() => {})
  await p.waitForTimeout(1200)
  await p.screenshot({ path: join(OUT, '02-fiche-sans-manager.png') })
  console.log('✓ 02-fiche-sans-manager.png')
  await p.locator('#managerId').selectOption({ label: new RegExp(MANAGER, 'i') }).catch(async () => {
    // fallback : choisir la 1re option non vide contenant un nom
    await p.locator('#managerId').selectOption({ index: 1 }).catch(() => {})
  })
  await p.waitForTimeout(400)
  await p.screenshot({ path: join(OUT, '03-manager-choisi.png') })
  console.log('✓ 03-manager-choisi.png')
  await p.getByRole('button', { name: /Enregistrer/i }).first().click()
  await p.waitForTimeout(1800)

  // APRÈS : la recrue est désormais imbriquée sous son manager
  await deptShot('04-apres-rattachee.png')
  await b.close()
}
main().catch(e => { console.error(e); process.exit(1) })
