// N-1 prouvé visuellement : setup piloté en admin (l'éval N-1 est remplie,
// soumise, relue → reviewed), puis on se connecte une fois comme l'employé pour
// capturer l'accordéon « édition précédente » sur son éval de l'année courante.
import { request, chromium } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'

const STATE = '/tmp/nxrh_admin_state.json'
const PWD = process.env.PROD_ADMIN_PASSWORD
  || (() => { try { return readFileSync('/tmp/nxrh_admin_pwd.txt', 'utf8').trim() } catch { return '' } })()
const EMP = process.argv[2] || 'laure.mercier.nx088@nxrh.local'
const LDAP_PW = 'Test1234!'

const idOf = (o) => { const x = o.data || o; return x.id || x._id }

async function main() {
  const admin = await request.newContext({ baseURL: 'https://localhost', ignoreHTTPSErrors: true, storageState: existsSync(STATE) ? STATE : undefined })
  if (!(await admin.get('/api/auth/me')).ok()) {
    await admin.post('/api/auth/login', { data: { email: 'admin-rh@nanoxplore.com', password: PWD } }); await admin.storageState({ path: STATE })
  }
  const j = async (r, l) => { if (!r.ok()) throw new Error(`${l} ${r.status()} ${await r.text()}`); return r.json() }
  const users = (await (await admin.get('/api/users?limit=300')).json())
  const emp = (users.data || users).find(u => u.email === EMP)
  if (!emp) throw new Error('employé introuvable: ' + EMP)
  const evalFor = async (cid) => {
    const es = await (await admin.get(`/api/evaluations?campaignId=${cid}&limit=50`)).json()
    const ev = (es.data || es).find(e => String(e.evaluateeId?._id || e.evaluateeId?.id || e.evaluateeId) === String(emp.id))
    if (!ev) throw new Error('pas d’éval pour ' + EMP); return idOf(ev)
  }
  const mkForm = (t) => admin.post('/api/forms', { data: {
    title: t, formType: 'self_evaluation', filledBy: 'employee', visibleToEvaluatee: true,
    questions: [
      { id: 'q1', type: 'rating', label: 'Atteinte de vos objectifs ?', required: true, scale: 5, phase: 'self', carryPrevious: true },
      { id: 'q2', type: 'text', label: 'Vos principales réalisations ?', required: true, phase: 'self', carryPrevious: true },
    ],
  } })

  // 2025 — remplie + soumise + relue (piloté admin) puis clôturée
  const f25 = await j(await mkForm('Auto-évaluation 2025'), 'f25')
  const c25 = await j(await admin.post('/api/campaigns', { data: {
    name: 'Cycle 2025', formId: idOf(f25), status: 'draft', startDate: '2025-01-10', endDate: '2025-03-31',
    enableN1Context: true, n1VisibleToEmployee: true, targetScope: 'users', targetUserIds: [emp.id],
  } }), 'c25')
  await admin.post(`/api/campaigns/${idOf(c25)}/forms`, { data: { formId: idOf(f25) } })
  await admin.post(`/api/campaigns/${idOf(c25)}/generate-evaluations`, { timeout: 120000 })
  await admin.patch(`/api/campaigns/${idOf(c25)}`, { data: { status: 'active' } })
  const e25 = await evalFor(idOf(c25))
  await admin.patch(`/api/evaluations/${e25}`, { data: { answers: [
    { questionId: 'q1', value: 4 },
    { questionId: 'q2', value: 'Année 2025 : référente paie, 2 projets livrés, montée en compétence infra.' },
  ] } })
  await admin.patch(`/api/evaluations/${e25}`, { data: { reviewerScore: 82, reviewerComment: 'Année solide, en nette progression.' } })
  await admin.patch(`/api/evaluations/${e25}`, { data: { status: 'submitted' } })
  await admin.patch(`/api/evaluations/${e25}`, { data: { status: 'reviewed' } })
  await admin.patch(`/api/campaigns/${idOf(c25)}`, { data: { status: 'closed' } })
  console.log('✓ 2025 reviewed + clôturée')

  // 2026 — campagne ciblée + previousCampaignId
  const f26 = await j(await mkForm('Auto-évaluation 2026'), 'f26')
  const c26 = await j(await admin.post('/api/campaigns', { data: {
    name: 'Cycle 2026', formId: idOf(f26), status: 'draft', startDate: '2026-01-10', endDate: '2026-03-31',
    enableN1Context: true, n1VisibleToEmployee: true, previousCampaignId: idOf(c25), targetScope: 'users', targetUserIds: [emp.id],
  } }), 'c26')
  await admin.post(`/api/campaigns/${idOf(c26)}/forms`, { data: { formId: idOf(f26) } })
  await admin.post(`/api/campaigns/${idOf(c26)}/generate-evaluations`, { timeout: 120000 })
  await admin.patch(`/api/campaigns/${idOf(c26)}`, { data: { status: 'active' } })
  const e26 = await evalFor(idOf(c26))
  const n1 = await admin.get(`/api/evaluations/${e26}/n1-context`)
  console.log('N-1 2026 →', n1.status(), (await n1.text()).slice(0, 220))

  // Connexion employé (frais) → capture de l'accordéon sur la vue de remplissage
  const ec = await request.newContext({ baseURL: 'https://localhost', ignoreHTTPSErrors: true })
  const lr = await ec.post('/api/auth/login', { data: { email: EMP, password: LDAP_PW } })
  if (!lr.ok()) throw new Error('login emp ' + lr.status() + ' ' + await lr.text())
  await ec.storageState({ path: '/tmp/emp_state.json' })

  await mkdir('e2e/screenshots/n1', { recursive: true })
  const b = await chromium.launch()
  const ctx = await b.newContext({ baseURL: 'https://localhost', ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1100 }, locale: 'fr-FR', storageState: '/tmp/emp_state.json' })
  const p = await ctx.newPage()
  await p.goto(`/evaluations/${e26}`); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(2500)
  for (const t of [/édition précédente/i, /année précédente/i, /n-1/i, /précédent/i, /rappel/i]) {
    await p.getByText(t).first().click({ timeout: 1200 }).catch(() => {})
  }
  await p.waitForTimeout(1200)
  await p.screenshot({ path: 'e2e/screenshots/n1/eval-2026-n1.png', fullPage: true })
  console.log('✓ capture employé')
  await b.close()
  console.log('EVAL_2026=' + e26)
}
main().catch(e => { console.error('ÉCHEC:', e.message); process.exit(1) })
