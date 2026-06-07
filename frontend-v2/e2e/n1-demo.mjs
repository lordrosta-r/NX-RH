// Démo bout-en-bout du contexte « édition précédente » avec un vrai binôme LDAP :
// l'employée remplit+soumet 2025, le manager relit (→ reviewed), on clôture, on
// clone vers 2026, et on vérifie que le rappel N-1 s'affiche sur l'éval 2026.
import { request, chromium } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'

const STATE = '/tmp/nxrh_admin_state.json'
const PWD = process.env.PROD_ADMIN_PASSWORD
  || (() => { try { return readFileSync('/tmp/nxrh_admin_pwd.txt', 'utf8').trim() } catch { return '' } })()
const LDAP_PW = 'Test1234!'
const EMP = 'elise.bonnet.nx077@nxrh.local'
const MGR = 'pierre.bernard.nx002@nxrh.local'

const newCtx = async (storageState) => request.newContext({ baseURL: 'https://localhost', ignoreHTTPSErrors: true, storageState })
const login = async (email, password) => {
  const c = await newCtx(undefined)
  const r = await c.post('/api/auth/login', { data: { email, password } })
  if (!r.ok()) throw new Error(`login ${email} → ${r.status()} ${await r.text()}`)
  return c
}
const idOf = (o) => { const x = o.data || o; return x.id || x._id }

async function main() {
  const admin = await newCtx(existsSync(STATE) ? STATE : undefined)
  if (!(await admin.get('/api/auth/me')).ok()) {
    await admin.post('/api/auth/login', { data: { email: 'admin-rh@nanoxplore.com', password: PWD } })
    await admin.storageState({ path: STATE })
  }
  const j = async (r, l) => { if (!r.ok()) throw new Error(`${l} ${r.status()} ${await r.text()}`); return r.json() }

  const users = (await (await admin.get('/api/users?limit=300')).json())
  const list = users.data || users
  const emp = list.find(u => u.email === EMP)
  const evalIdFor = async (campaignId) => {
    const es = await (await admin.get(`/api/evaluations?campaignId=${campaignId}&limit=50`)).json()
    const arr = es.data || es
    const ev = arr.find(e => String(e.evaluateeId?.id || e.evaluateeId?._id || e.evaluateeId) === String(emp.id))
    if (!ev) throw new Error(`aucune éval pour Élise dans la campagne ${campaignId} (générées: ${arr.length})`)
    return idOf(ev)
  }
  const mkForm = (title) => admin.post('/api/forms', { data: {
    title, formType: 'self_evaluation', filledBy: 'employee', visibleToEvaluatee: true,
    questions: [
      { id: 'q1', type: 'rating', label: 'Atteinte de vos objectifs ?', required: true, scale: 5, phase: 'self', carryPrevious: true },
      { id: 'q2', type: 'text', label: 'Vos principales réalisations ?', required: true, phase: 'self', carryPrevious: true },
    ],
  } })

  // 1 — Admin : formulaire (carryPrevious) + campagne 2025 ciblée sur l'employée
  const form = await j(await mkForm('Auto-évaluation 2025'), 'form2025')
  const c2025 = await j(await admin.post('/api/campaigns', { data: {
    name: 'Cycle annuel 2025 (démo N-1)', formId: idOf(form), status: 'draft',
    startDate: '2025-01-10', endDate: '2025-03-31', enableN1Context: true, n1VisibleToEmployee: true,
    targetScope: 'users', targetUserIds: [emp.id],
  } }), 'c2025')
  const id2025 = idOf(c2025)
  await admin.post(`/api/campaigns/${id2025}/forms`, { data: { formId: idOf(form) } })
  await admin.post(`/api/campaigns/${id2025}/generate-evaluations`, { timeout: 120000 })
  await admin.patch(`/api/campaigns/${id2025}`, { data: { status: 'active' } })
  const eval2025 = await evalIdFor(id2025)
  console.log('✓ campagne 2025 + éval', eval2025)

  // 2 — L'EMPLOYÉE (Élise) remplit et soumet son auto-évaluation 2025
  const empCtx = await login(EMP, LDAP_PW)
  await empCtx.storageState({ path: '/tmp/elise_state.json' })   // session réutilisée pour la capture UI
  await j(await empCtx.patch(`/api/evaluations/${eval2025}`, { data: { answers: [
    { questionId: 'q1', value: 4 },
    { questionId: 'q2', value: 'Montée en compétence sur la paie, 2 projets livrés dans les délais.' },
  ] } }), 'emp fill')
  const sub = await empCtx.patch(`/api/evaluations/${eval2025}`, { data: { status: 'submitted' } })
  console.log('✓ employée : rempli + soumis →', sub.status(), sub.ok() ? '' : (await sub.text()).slice(0, 100))

  // 3 — LE MANAGER (Pierre) relit → statut 'reviewed'
  const mgrCtx = await login(MGR, LDAP_PW)
  await mgrCtx.patch(`/api/evaluations/${eval2025}`, { data: { reviewerComment: 'Année solide, en progression.', reviewerScore: 82 } })
  const rev = await mgrCtx.patch(`/api/evaluations/${eval2025}`, { data: { status: 'reviewed' } })
  console.log('✓ manager : relu (reviewed) →', rev.status(), (await rev.text()).slice(0, 80))

  // 4 — Admin : clôture 2025, crée la campagne 2026 ciblée sur l'employée avec
  //     previousCampaignId = 2025 (la lignée q1/q2 + carryPrevious porte le rappel)
  await admin.patch(`/api/campaigns/${id2025}`, { data: { status: 'closed' } })
  const form26 = await j(await mkForm('Auto-évaluation 2026'), 'form2026')
  const c2026 = await j(await admin.post('/api/campaigns', { data: {
    name: 'Cycle annuel 2026 (démo N-1)', formId: idOf(form26), status: 'draft',
    startDate: '2026-01-10', endDate: '2026-03-31', enableN1Context: true, n1VisibleToEmployee: true,
    previousCampaignId: id2025, targetScope: 'users', targetUserIds: [emp.id],
  } }), 'c2026')
  const id2026 = idOf(c2026)
  await admin.post(`/api/campaigns/${id2026}/forms`, { data: { formId: idOf(form26) } })
  await admin.post(`/api/campaigns/${id2026}/generate-evaluations`, { timeout: 120000 })
  await admin.patch(`/api/campaigns/${id2026}`, { data: { status: 'active' } })
  const eval2026 = await evalIdFor(id2026)
  console.log('✓ campagne 2026 + éval', eval2026)

  // 5 — Vérif API : le contexte N-1 est-il alimenté ?
  const n1 = await admin.get(`/api/evaluations/${eval2026}/n1-context`)
  console.log('\nN-1 sur éval 2026 →', n1.status(), (await n1.text()).slice(0, 300))

  // 6 — Capture côté EMPLOYÉE : l'accordéon « édition précédente » sur son éval 2026
  await mkdir('e2e/screenshots/n1', { recursive: true })
  const browser = await chromium.launch()
  const bctx = await browser.newContext({ baseURL: 'https://localhost', ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 }, locale: 'fr-FR', storageState: '/tmp/elise_state.json' })
  const page = await bctx.newPage()
  await page.goto(`/evaluations/${eval2026}`)
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(2000)
  // déplier un éventuel accordéon « édition précédente »
  await page.getByText(/édition précédente|année précédente|n-1/i).first().click().catch(() => {})
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'e2e/screenshots/n1/eval-2026-n1.png', fullPage: true })
  console.log('✓ capture éval 2026 (employée)')
  await browser.close()
  console.log('EVAL_2026=' + eval2026)
}
main().catch(e => { console.error('ÉCHEC:', e.message); process.exit(1) })
