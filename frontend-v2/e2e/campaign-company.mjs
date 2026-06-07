// Campagne entreprise (périmètre : tous) → 1 évaluation par collaborateur,
// pour peupler les vues manager (/manager/todo) et employé (/evaluations).
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

  const year = new Date().getFullYear()
  const form = await j(await ctx.post('/api/forms', { data: {
    title: `Auto-évaluation annuelle ${year}`,
    formType: 'self_evaluation', filledBy: 'employee', visibleToEvaluatee: true,
    questions: [
      { id: 'q1', type: 'rating', label: 'Atteinte de vos objectifs cette année ?', required: true, scale: 5, phase: 'self' },
      { id: 'q2', type: 'text', label: 'Vos principales réalisations ?', required: true, phase: 'self' },
      { id: 'q3', type: 'choice', label: 'Axe de progression prioritaire ?', required: true, options: ['Technique', 'Management', 'Communication', 'Autonomie'], phase: 'self' },
    ],
  } }), 'form')
  const formId = (form.data || form).id

  const camp = await j(await ctx.post('/api/campaigns', { data: {
    name: `Campagne annuelle entreprise ${year}`,
    description: 'Évaluation annuelle de tous les collaborateurs.',
    formId, status: 'draft', startDate: `${year}-01-10`, endDate: `${year}-03-31`,
    enableN1Context: true, n1VisibleToEmployee: true, targetScope: 'all',
  } }), 'campaign')
  const campaignId = (camp.data || camp).id || (camp.data || camp)._id

  await ctx.post(`/api/campaigns/${campaignId}/forms`, { data: { formId } })
  const gen = await ctx.post(`/api/campaigns/${campaignId}/generate-evaluations`, { timeout: 180000 })
  console.log('génération →', gen.status(), (await gen.text()).slice(0, 120))
  await ctx.patch(`/api/campaigns/${campaignId}`, { data: { status: 'active' } })
  console.log(`✓ campagne entreprise active ${campaignId}`)
  await ctx.dispose()
}
main().catch(e => { console.error('ÉCHEC:', e.message); process.exit(1) })
