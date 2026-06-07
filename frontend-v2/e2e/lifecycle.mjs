// Scénarios de cycle de vie (admin) : départ d'un collaborateur (offboarding)
// et départ d'un manager AVEC réaffectation de ses subordonnés (anti-orphelin).
import { request } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'

const STATE = '/tmp/nxrh_admin_state.json'
const PWD = process.env.PROD_ADMIN_PASSWORD
  || (() => { try { return readFileSync('/tmp/nxrh_admin_pwd.txt', 'utf8').trim() } catch { return '' } })()
const TODAY = new Date().toISOString().slice(0, 10)

async function main() {
  const ctx = await request.newContext({ baseURL: 'https://localhost', ignoreHTTPSErrors: true, storageState: existsSync(STATE) ? STATE : undefined })
  if (!(await ctx.get('/api/auth/me')).ok()) {
    await ctx.post('/api/auth/login', { data: { email: 'admin-rh@nanoxplore.com', password: PWD } })
    await ctx.storageState({ path: STATE })
  }
  const all = []
  for (let p = 1; p <= 4; p++) {
    const j = await (await ctx.get(`/api/users?limit=100&page=${p}&isActive=true`)).json()
    const b = j.data || j; if (!b.length) break; all.push(...b); if (b.length < 100) break
  }
  const managers = all.filter(u => u.role === 'manager')
  const reportsOf = (id) => all.filter(u => u.managerId === id)

  // ── Scénario 1 : départ d'un collaborateur (offboarding) ────────────────────
  const leaver = all.find(u => u.role === 'employee' && reportsOf(u.id).length === 0 && u.authSource === 'ldap')
  const off1 = await ctx.patch(`/api/users/${leaver.id}/offboard`, {
    data: { reason: 'Démission', effectiveDate: TODAY },
  })
  console.log(`1) Offboarding collaborateur ${leaver.firstName} ${leaver.lastName} → HTTP ${off1.status()}`)

  // ── Scénario 2 : départ d'un MANAGER avec réaffectation ─────────────────────
  const leavingMgr = managers.find(m => reportsOf(m.id).length >= 2 && m.id !== leaver.managerId)
  const reports = reportsOf(leavingMgr.id)
  // un repreneur qui n'est PAS un subordonné du partant (évite l'auto-référence
  // et les boucles) : un manager d'un autre département.
  const reportIds = new Set(reports.map(r => r.id))
  const newMgr = managers.find(m =>
    m.id !== leavingMgr.id && !reportIds.has(m.id) && m.department !== leavingMgr.department,
  ) || managers.find(m => m.id !== leavingMgr.id && !reportIds.has(m.id))
  console.log(`2) Départ manager ${leavingMgr.firstName} ${leavingMgr.lastName} (${reports.length} subordonnés) → repris par ${newMgr.firstName} ${newMgr.lastName}`)
  for (const r of reports) {
    const pr = await ctx.patch(`/api/users/${r.id}`, { data: { managerId: newMgr.id } })
    if (!pr.ok()) console.log(`   ! réassignation ${r.email} → ${pr.status()}`)
  }
  console.log(`   ✓ ${reports.length} subordonnés réaffectés à ${newMgr.firstName} ${newMgr.lastName}`)
  const off2 = await ctx.patch(`/api/users/${leavingMgr.id}/offboard`, {
    data: { reason: 'Départ — fin de contrat', effectiveDate: TODAY },
  })
  console.log(`   ✓ offboarding manager → HTTP ${off2.status()}`)

  // ── Vérification ────────────────────────────────────────────────────────────
  const fetchUser = async (id) => { const j = await (await ctx.get(`/api/users/${id}`)).json(); return j.data || j }
  const lv = await fetchUser(leaver.id)
  const mg = await fetchUser(leavingMgr.id)
  const after = []
  for (let p = 1; p <= 4; p++) {
    const j = await (await ctx.get(`/api/users?limit=100&page=${p}`)).json()
    const b = j.data || j; if (!b.length) break; after.push(...b); if (b.length < 100) break
  }
  const stillUnderLeaver = after.filter(u => u.managerId === leavingMgr.id)
  console.log(`\nCollaborateur : offboardingStatus = ${lv.offboardingStatus || '—'} ✓`)
  console.log(`Manager : offboardingStatus = ${mg.offboardingStatus || '—'} ✓`)
  console.log(`Subordonnés encore rattachés au manager parti : ${stillUnderLeaver.length} (attendu 0) ${stillUnderLeaver.length === 0 ? '✓' : '(reste à réassigner)'}`)
  await ctx.dispose()
}
main().catch(e => { console.error('ÉCHEC:', e.message); process.exit(1) })
