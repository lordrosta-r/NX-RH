// Construit l'historique pluriannuel : 5 campagnes annuelles (2022→2026) reliées
// par clone (lignée des questions → « édition précédente »), pour un collaborateur.
// Les années passées sont remplies puis clôturées.  node e2e/multi-year.mjs
import { request } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'

const BASE = 'https://localhost'
const STATE = '/tmp/nxrh_admin_state.json'
const PWD = process.env.PROD_ADMIN_PASSWORD
  || (() => { try { return readFileSync('/tmp/nxrh_admin_pwd.txt', 'utf8').trim() } catch { return '' } })()

async function main() {
  const ctx = await request.newContext({ baseURL: BASE, ignoreHTTPSErrors: true, storageState: existsSync(STATE) ? STATE : undefined })
  if (!(await ctx.get('/api/auth/me')).ok()) {
    await ctx.post('/api/auth/login', { data: { email: 'admin-rh@nanoxplore.com', password: PWD } })
    await ctx.storageState({ path: STATE })
  }
  const j = async (r, l) => { if (!r.ok()) throw new Error(`${l} ${r.status()} ${await r.text()}`); return r.json() }
  const idOf = (o) => (o.data || o).id || (o.data || o)._id

  // collaborateur cible
  const users = (await (await ctx.get('/api/users?limit=200')).json())
  const list = users.data || users
  const lucas = list.find(u => u.email === 'lucas.bernard@nanoxplore.com')
  if (!lucas) throw new Error('Lucas introuvable')

  const ANSWERS = {
    2022: [{ questionId: 'q1', value: 3 }, { questionId: 'q2', value: 'Première année : prise de poste, montée en compétence.' }],
    2023: [{ questionId: 'q1', value: 3 }, { questionId: 'q2', value: 'Consolidation, premiers projets en autonomie.' }],
    2024: [{ questionId: 'q1', value: 4 }, { questionId: 'q2', value: 'Référent sur le module paie.' }],
    2025: [{ questionId: 'q1', value: 4 }, { questionId: 'q2', value: 'Livraison plateforme v2, mentorat d’un alternant.' }],
    2026: [{ questionId: 'q1', value: 5 }, { questionId: 'q2', value: 'Lead technique, pilotage du chantier infra.' }],
  }

  async function fillAndMaybeClose(campaignId, year, close) {
    await ctx.post(`/api/campaigns/${campaignId}/generate-evaluations`, { timeout: 120000 })
    const evs = (await (await ctx.get(`/api/evaluations?campaignId=${campaignId}&limit=50`)).json())
    const arr = evs.data || evs
    const ev = arr.find(e => (e.evaluateeId?.id || e.evaluateeId || e.evaluatee?.id) === lucas.id) || arr[0]
    if (ev) {
      await ctx.patch(`/api/evaluations/${ev.id || ev._id}`, { data: { answers: ANSWERS[year] } })
      await ctx.post(`/api/evaluations/${ev.id || ev._id}/submit`).catch(() => {})
    }
    await ctx.patch(`/api/campaigns/${campaignId}`, { data: { status: 'active' } })
    if (close) await ctx.patch(`/api/campaigns/${campaignId}`, { data: { status: 'closed' } })
    console.log(`  ✓ ${year} ${close ? 'clôturée' : 'active'} (éval remplie)`)
  }

  // 2022 — campagne de base
  const form = await j(await ctx.post('/api/forms', { data: {
    title: 'Auto-évaluation annuelle', formType: 'self_evaluation', filledBy: 'employee', visibleToEvaluatee: true,
    questions: [
      { id: 'q1', type: 'rating', label: 'Atteinte de vos objectifs ?', required: true, scale: 5, phase: 'self', carryPrevious: true },
      { id: 'q2', type: 'text', label: 'Vos principales réalisations ?', required: true, phase: 'self', carryPrevious: true },
    ],
  } }), 'form')
  const c2022 = await j(await ctx.post('/api/campaigns', { data: {
    name: 'Entretien annuel 2022', formId: idOf(form), status: 'draft',
    startDate: '2022-01-10', endDate: '2022-03-31', enableN1Context: true, n1VisibleToEmployee: true,
    targetScope: 'users', targetUserIds: [lucas.id],
  } }), 'c2022')
  let prevId = idOf(c2022)
  await ctx.post(`/api/campaigns/${prevId}/forms`, { data: { formId: idOf(form) } })
  await fillAndMaybeClose(prevId, 2022, true)

  // 2023→2026 par clone (lignée des questions conservée)
  for (const year of [2023, 2024, 2025, 2026]) {
    const cl = await j(await ctx.post(`/api/campaigns/${prevId}/clone`, { data: {
      name: `Entretien annuel ${year}`, startDate: `${year}-01-10`, endDate: `${year}-03-31`,
    } }), `clone ${year}`)
    const id = idOf(cl) || (cl.data?.id) || (cl.id)
    prevId = id
    await fillAndMaybeClose(id, year, year !== 2026)
  }

  // Vérif : contexte « édition précédente » sur l'éval 2026
  const evs2026 = (await (await ctx.get(`/api/evaluations?campaignId=${prevId}&limit=50`)).json())
  const a = evs2026.data || evs2026
  const ev2026 = a.find(e => (e.evaluateeId?.id || e.evaluateeId) === lucas.id) || a[0]
  if (ev2026) {
    const n1 = await ctx.get(`/api/evaluations/${ev2026.id || ev2026._id}/n1-context`)
    console.log('\nN-1 sur l’éval 2026 →', (await n1.text()).slice(0, 240))
    console.log('EVAL_2026_ID=' + (ev2026.id || ev2026._id))
  }
  console.log('CAMPAIGN_2026_ID=' + prevId)
  await ctx.dispose()
}
main().catch(e => { console.error('ÉCHEC:', e.message); process.exit(1) })
