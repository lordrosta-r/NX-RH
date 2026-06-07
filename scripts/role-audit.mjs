// =============================================================================
// scripts/role-audit.mjs — Audit fonctionnel par rôle (API)
//
// Vérifie, contre la stack en marche (https://localhost via nginx) :
//   • RBAC : accès autorisé/refusé par rôle sur les endpoints sensibles
//   • Cycle de vie : campagne → assignation → saisie → soumission → review →
//     signatures → validation
//   • Offboarding en pleine campagne : les évals en cours passent à 'archived'
//
// Usage : NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/role-audit.mjs
// Pré-requis : stack dev up + seed (node mongo/database/seed.js)
// =============================================================================

const BASE = process.env.E2E_BASE_URL || 'https://localhost'
const PW = 'Test1234!'
const results = []
const log = (ok, label, detail = '') =>
  results.push({ ok, label, detail }) && console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`)

async function login(email) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PW }),
  })
  const cookie = (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ')
  return { status: r.status, cookie }
}
const api = (cookie, method, path, body) =>
  fetch(`${BASE}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  })
const json = async (r) => { try { return await r.json() } catch { return null } }

// ─── Sessions ────────────────────────────────────────────────────────────────
const sessions = {}
for (const [role, email] of Object.entries({
  admin: 'admin@nx-rh.fr', hr: 'rh@nx-rh.fr',
  manager: 'mgr-eng@nx-rh.fr', employee: 'emp-elodie@nx-rh.fr',
})) {
  const s = await login(email)
  sessions[role] = s.cookie
  log(s.status === 200 && !!s.cookie, `login ${role} (${email})`, `HTTP ${s.status}`)
}

// ─── RBAC matrix ─────────────────────────────────────────────────────────────
// [méthode, path, { role: statusAttendu }]  (2xx = autorisé, 403 = refusé)
const probes = [
  ['GET', '/org/tree?view=teams', { admin: 200, hr: 200, manager: 200, employee: 403 }],
  ['GET', '/users?limit=5',       { admin: 200, hr: 200, manager: 200, employee: 403 }],  // manager: 200 mais scopé à son équipe (cf. canViewSubtree)
  ['GET', '/campaigns',           { admin: 200, hr: 200, manager: 200, employee: 200 }],
  ['GET', '/admin/ldap/sources',  { admin: 200, hr: 403, manager: 403, employee: 403 }],
  ['GET', '/admin/config',        { admin: 200, hr: 403, manager: 403, employee: 403 }],
]
console.log('\n── RBAC ──')
for (const [method, path, expected] of probes) {
  for (const [role, want] of Object.entries(expected)) {
    const r = await api(sessions[role], method, path)
    const ok = want === 200 ? r.status < 300 : r.status === want
    log(ok, `${role} ${method} ${path}`, `attendu ${want}, reçu ${r.status}`)
  }
}

// ─── Cycle de vie campagne ───────────────────────────────────────────────────
console.log('\n── Cycle campagne/évaluation/signature ──')
const hr = sessions.hr
// formulaires seedés
const forms = await json(await api(hr, 'GET', '/forms'))
const formList = Array.isArray(forms) ? forms : (forms?.data || [])
const selfForm = formList.find(f => f.formType === 'self_evaluation')
log(!!selfForm, 'formulaire self_evaluation seedé', selfForm ? selfForm.title : 'absent')

// utilisateurs : un employé + son manager
const usersResp = await json(await api(hr, 'GET', '/users?limit=100'))
const users = usersResp?.data || usersResp || []
const emp = users.find(u => u.email === 'emp-elodie@nx-rh.fr')
const mgr = users.find(u => u.email === 'mgr-eng@nx-rh.fr')

// créer une campagne
const campResp = await api(hr, 'POST', '/campaigns', {
  name: 'Audit — cycle complet', description: 'Campagne créée par le role-audit',
  startDate: '2026-01-01', endDate: '2026-12-31',
  deadlineEmployee: '2026-06-30', deadlineManager: '2026-09-30',
  formId: selfForm?._id,
})
const camp = await json(campResp)
const campId = camp?._id || camp?.id || camp?.data?._id
log(campResp.status < 300 && !!campId, 'HR crée une campagne', `HTTP ${campResp.status}`)

// assigner une self-eval à l'employé
let evalId = null
if (campId && selfForm && emp) {
  const bulk = await api(hr, 'POST', '/evaluations/bulk', {
    evaluations: [{ campaignId: campId, formId: selfForm._id, evaluatorId: emp._id, evaluateeId: emp._id }],
  })
  log(bulk.status < 300, 'HR assigne une self-évaluation', `HTTP ${bulk.status}`)
  // retrouver l'éval de l'employé
  const mine = await json(await api(sessions.employee, 'GET', '/evaluations?mine=1'))
  const list = mine?.data || mine || []
  evalId = (list.find(e => String(e.campaignId?._id || e.campaignId) === String(campId)) || list[0])?._id
  log(!!evalId, 'Employé voit son évaluation assignée', evalId ? `id ${evalId}` : 'introuvable')
}

// employé : self-évaluation (sauvegarde + soumission)
if (evalId) {
  const save = await api(sessions.employee, 'PATCH', `/evaluations/${evalId}`, {
    answers: [{ questionId: 's1', value: 4 }, { questionId: 's2', value: 'Bonne année' }, { questionId: 's3', value: true }],
  })
  log(save.status < 300, 'Employé enregistre sa self-évaluation', `HTTP ${save.status}`)
  const submit = await api(sessions.employee, 'PATCH', `/evaluations/${evalId}`, { status: 'submitted' })
  log(submit.status < 300, 'Employé soumet sa self-évaluation (→ submitted)', `HTTP ${submit.status}`)
}

// Chaîne COMPLÈTE de signature sur une évaluation MANAGER (evaluator=manager, evaluatee=employé)
const mgrForm = formList.find(f => f.formType === 'manager_evaluation')
let mEvalId = null
if (campId && mgrForm && emp && mgr) {
  await api(hr, 'POST', '/evaluations/bulk', {
    evaluations: [{ campaignId: campId, formId: mgrForm._id, evaluatorId: mgr._id, evaluateeId: emp._id }],
  })
  const mlist = (await json(await api(hr, 'GET', `/evaluations?evaluateeId=${emp._id}`)))?.data || []
  mEvalId = mlist.find(e => String(e.formId?._id || e.formId) === String(mgrForm._id))?._id
  log(!!mEvalId, 'HR assigne une évaluation manager', mEvalId ? `id ${mEvalId}` : 'introuvable')
}
if (mEvalId) {
  const fill = await api(sessions.manager, 'PATCH', `/evaluations/${mEvalId}`, { answers: [{ questionId: 'm1', value: 4 }, { questionId: 'm2', value: 'OK' }, { questionId: 'm3', value: true }] })
  log(fill.status < 300, 'Manager remplit l’évaluation', `HTTP ${fill.status}`)
  const sub = await api(sessions.manager, 'PATCH', `/evaluations/${mEvalId}`, { status: 'submitted' })
  log(sub.status < 300, 'Manager soumet (→ submitted)', `HTTP ${sub.status}`)
  const rev = await api(sessions.manager, 'PATCH', `/evaluations/${mEvalId}`, { status: 'reviewed' })
  log(rev.status < 300, 'Manager passe en reviewed (→ reviewed)', `HTTP ${rev.status}`)
  const s1 = await api(sessions.employee, 'POST', `/evaluations/${mEvalId}/sign`)
  log(s1.status < 300, 'Signature évalué (→ signed_evaluatee)', `HTTP ${s1.status}`)
  const s2 = await api(sessions.manager, 'POST', `/evaluations/${mEvalId}/sign`)
  log(s2.status < 300, 'Signature manager (→ signed_manager)', `HTTP ${s2.status}`)
  const s3 = await api(hr, 'POST', `/evaluations/${mEvalId}/sign`)
  log(s3.status < 300, 'Signature RH (→ signed_hr)', `HTTP ${s3.status}`)
  const val = await api(hr, 'PATCH', `/evaluations/${mEvalId}`, { status: 'validated' })
  log(val.status < 300, 'RH valide (→ validated)', `HTTP ${val.status}`)
}

// ─── Offboarding en pleine campagne ──────────────────────────────────────────
console.log('\n── Offboarding en pleine campagne ──')
const emp2 = users.find(u => u.email === 'emp-thomas@nx-rh.fr')
if (campId && selfForm && emp2) {
  await api(hr, 'POST', '/evaluations/bulk', {
    evaluations: [{ campaignId: campId, formId: selfForm._id, evaluatorId: emp2._id, evaluateeId: emp2._id }],
  })
  const off = await json(await api(hr, 'POST', '/offboarding', {
    userId: emp2._id, reason: 'resignation', lastDay: '2026-07-31', notes: 'audit',
  }))
  const offId = off?._id || off?.id
  log(!!offId, 'HR crée une demande offboarding', offId ? `id ${offId}` : 'échec')
  if (offId) {
    const done = await api(hr, 'PATCH', `/offboarding/${offId}`, { status: 'completed' })
    log(done.status < 300, 'HR complète l’offboarding', `HTTP ${done.status}`)
    // vérifier que les évals de emp2 sont archived
    const evs = await json(await api(hr, 'GET', `/evaluations?evaluateeId=${emp2._id}`))
    const evlist = evs?.data || evs || []
    const archived = evlist.length > 0 && evlist.every(e => e.status === 'archived' || e.status === 'validated')
    log(archived, 'Évaluations du sortant archivées', `statuts: ${evlist.map(e => e.status).join(',') || 'n/a'}`)
  }
}

// ─── Résumé ──────────────────────────────────────────────────────────────────
const pass = results.filter(r => r.ok).length
console.log(`\n=== ${pass}/${results.length} checks OK ===`)
process.exit(0)
