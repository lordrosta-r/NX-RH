// 1) déclenche une notif (employée soumet → manager notifié), capture le bandeau
//    (logo personnalisé + badge rouge). 2) capture les pages clés EN ANGLAIS.
import { request, chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'

const STATE = '/tmp/nxrh_admin_state.json'
const PWD = (() => { try { return readFileSync('/tmp/nxrh_admin_pwd.txt', 'utf8').trim() } catch { return '' } })()
const LDAP_PW = 'Test1234!'
const OUT_FR = 'e2e/screenshots/extras'
const OUT_EN = 'e2e/screenshots/en'

async function login(email, password) {
  const c = await request.newContext({ baseURL: 'https://localhost', ignoreHTTPSErrors: true })
  await c.post('/api/auth/login', { data: { email, password } })
  return c
}

async function main() {
  await mkdir(OUT_FR, { recursive: true }); await mkdir(OUT_EN, { recursive: true })
  const adm = await request.newContext({ baseURL: 'https://localhost', ignoreHTTPSErrors: true, storageState: existsSync(STATE) ? STATE : undefined })
  if (!(await adm.get('/api/auth/me')).ok()) { await adm.post('/api/auth/login', { data: { email: 'admin-rh@nanoxplore.com', password: PWD } }); await adm.storageState({ path: STATE }) }

  // Déclenche une notif pour le manager Pierre : une de ses subordonnées soumet
  const users = (await (await adm.get('/api/users?limit=300')).json())
  const list = users.data || users
  const pierre = list.find(u => u.email === 'pierre.bernard.nx002@nxrh.local')
  const sub = list.find(u => u.role === 'employee' && String(u.managerId) === String(pierre.id) && u.authSource === 'ldap')
  if (sub) {
    try {
      const emp = await login(sub.email, LDAP_PW)
      const es = await (await emp.get('/api/evaluations?evaluateeId=me&limit=20')).json()
      const arr = Array.isArray(es) ? es : (es.data?.data || es.data || [])
      const ev = arr.find(e => ['assigned', 'in_progress'].includes(e.status))
      if (ev) {
        const id = ev.id || ev._id
        await emp.patch(`/api/evaluations/${id}`, { data: { answers: [{ questionId: 'q1', value: 4 }, { questionId: 'q2', value: 'Bilan annuel.' }] } })
        const r = await emp.patch(`/api/evaluations/${id}`, { data: { status: 'submitted' } })
        console.log(`${sub.email} soumet → ${r.status()} (notifie Pierre)`)
      } else { console.log('pas d’éval à soumettre pour le sub') }
      await emp.dispose()
    } catch (e) { console.log('notif trigger ignoré :', e.message.split('\n')[0]) }
  }

  const browser = await chromium.launch()

  // --- Capture FR : bandeau de Pierre (logo custom + badge rouge de notif) ---
  {
    const pc = await login(pierre.email, LDAP_PW); await pc.storageState({ path: '/tmp/pierre_state.json' }); await pc.dispose()
    const ctx = await browser.newContext({ baseURL: 'https://localhost', ignoreHTTPSErrors: true, viewport: { width: 1440, height: 320 }, storageState: '/tmp/pierre_state.json', locale: 'fr-FR' })
    const p = await ctx.newPage()
    await p.goto('/'); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1500)
    await p.screenshot({ path: `${OUT_FR}/bandeau-logo-notif.png` })
    console.log('✓ bandeau (logo + badge notif)')
    await ctx.close()
  }

  // --- Captures EN : forcer la langue anglaise via localStorage ---
  const PAGES = [
    ['login', '/login', null],
    ['dashboard', '/', 'admin'],
    ['users', '/users', 'admin'],
    ['campaigns', '/campaigns', 'admin'],
    ['org', '/admin/orgchart', 'admin'],
    ['ldap', '/admin/ldap', 'admin'],
    ['documents', '/documents', 'hr'],
    ['evaluations', '/evaluations', 'employee'],
    ['help', '/help', 'admin'],
  ]
  const sessions = {
    admin: STATE,
    hr: await (async () => { const c = await login('marie.bernard.nx051@nxrh.local', LDAP_PW); await c.storageState({ path: '/tmp/hr_state.json' }); await c.dispose(); return '/tmp/hr_state.json' })(),
    employee: await (async () => { const c = await login('clara.andre.nx023@nxrh.local', LDAP_PW); await c.storageState({ path: '/tmp/emp_state.json' }); await c.dispose(); return '/tmp/emp_state.json' })(),
  }
  for (const [name, path, role] of PAGES) {
    const ctx = await browser.newContext({
      baseURL: 'https://localhost', ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 },
      storageState: role ? sessions[role] : undefined, locale: 'en-US',
    })
    await ctx.addInitScript(() => { try { localStorage.setItem('i18nextLng', 'en') } catch { /* ignore */ } })
    const p = await ctx.newPage()
    await p.goto(path); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1800)
    await p.screenshot({ path: `${OUT_EN}/${name}.png`, fullPage: true })
    console.log(`✓ EN ${name}`)
    await ctx.close()
  }
  await browser.close()
}
main().catch(e => { console.error('ÉCHEC:', e.message); process.exit(1) })
