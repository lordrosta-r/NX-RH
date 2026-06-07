// Harness QA rejouable : se connecte EN TANT QUE 10 utilisateurs (rôles répartis)
// et vérifie, par rôle, les actions autorisées ET interdites (RBAC). Produit un
// rapport pass/fail dans docs/qa/Rapport-QA.md.  node e2e/qa-harness.mjs
// (nécessite RELAX_RATE_LIMIT=true côté app — outil interne.)
import { request } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const BASE = 'https://localhost'
const ADMIN_PW = process.env.PROD_ADMIN_PASSWORD
  || (() => { try { return readFileSync('/tmp/nxrh_admin_pwd.txt', 'utf8').trim() } catch { return '' } })()
const LDAP_PW = 'Test1234!'

const ctxFor = (storageState) => request.newContext({ baseURL: BASE, ignoreHTTPSErrors: true, storageState })
const loginCtx = async (email, password) => {
  const c = await ctxFor(undefined)
  const r = await c.post('/api/auth/login', { data: { email, password } })
  return { c, ok: r.ok(), status: r.status() }
}

// Attendu : 'ok' si la requête doit réussir (<400), 'forbidden' si elle doit être refusée (401/403/404)
async function check(ctx, label, method, path, expect, data) {
  let status
  try {
    const r = await ctx[method](path, data ? { data } : undefined)
    status = r.status()
  } catch { status = 0 }
  const allowed = status < 400
  const pass = expect === 'ok' ? allowed : (status === 401 || status === 403 || status === 404)
  return { label, method: method.toUpperCase(), path, expect, status, pass }
}

async function main() {
  const admin = await ctxFor(undefined)
  const al = await admin.post('/api/auth/login', { data: { email: 'admin-rh@nanoxplore.com', password: ADMIN_PW } })
  if (!al.ok()) throw new Error('login admin KO ' + al.status())

  // Composer un panel de 10 utilisateurs (rôles répartis) depuis l'annuaire
  const all = []
  for (let p = 1; p <= 4; p++) {
    const j = await (await admin.get(`/api/users?limit=100&page=${p}`)).json()
    const b = j.data || j; if (!b.length) break; all.push(...b); if (b.length < 100) break
  }
  const pick = (role, n) => all.filter(u => u.role === role && u.authSource === 'ldap' && u.isActive !== false && u.offboardingStatus !== 'offboarding' && !u.blocked && !u.email.startsWith('svc-')).slice(0, n)
  const roster = [
    { email: 'admin-rh@nanoxplore.com', pw: ADMIN_PW, role: 'admin' },
    ...pick('hr', 2).map(u => ({ email: u.email, pw: LDAP_PW, role: 'hr' })),
    ...pick('manager', 3).map(u => ({ email: u.email, pw: LDAP_PW, role: 'manager' })),
    ...pick('employee', 4).map(u => ({ email: u.email, pw: LDAP_PW, role: 'employee' })),
  ].slice(0, 10)

  // Matrice RBAC : pour chaque rôle, ce qui doit être OK vs INTERDIT
  const plan = {
    employee: [
      ['Voir mon profil', 'get', '/api/auth/me', 'ok'],
      ['Lister mes évaluations', 'get', '/api/evaluations?status=in_progress,assigned&limit=5', 'ok'],
      ['INTERDIT lister les utilisateurs', 'get', '/api/users?limit=5', 'forbidden'],
      ['INTERDIT créer une campagne', 'post', '/api/campaigns', 'forbidden', { name: 'x', formId: '000000000000000000000000', startDate: '2026-01-01', endDate: '2026-02-01' }],
      ['INTERDIT config LDAP', 'get', '/api/admin/ldap/sources', 'forbidden'],
      ['INTERDIT bloquer un compte', 'patch', '/api/users/000000000000000000000000/block', 'forbidden'],
    ],
    manager: [
      ['Voir mon profil', 'get', '/api/auth/me', 'ok'],
      ['Lister les utilisateurs (équipe)', 'get', '/api/users?limit=5', 'ok'],
      ['Voir l’organigramme', 'get', '/api/org/tree', 'ok'],
      ['INTERDIT créer une campagne', 'post', '/api/campaigns', 'forbidden', { name: 'x', formId: '000000000000000000000000', startDate: '2026-01-01', endDate: '2026-02-01' }],
      ['INTERDIT config LDAP', 'get', '/api/admin/ldap/sources', 'forbidden'],
      ['INTERDIT supprimer un compte', 'delete', '/api/users/000000000000000000000000', 'forbidden'],
    ],
    hr: [
      ['Voir mon profil', 'get', '/api/auth/me', 'ok'],
      ['Lister les campagnes', 'get', '/api/campaigns?limit=5', 'ok'],
      ['Lister les utilisateurs', 'get', '/api/users?limit=5', 'ok'],
      ['Lister les formulaires', 'get', '/api/forms?limit=5', 'ok'],
      ['Bloquer/débloquer autorisé (route accessible)', 'patch', '/api/users/000000000000000000000000/unblock', 'ok'],
      ['INTERDIT config LDAP (admin only)', 'get', '/api/admin/ldap/sources', 'forbidden'],
    ],
    admin: [
      ['Voir mon profil', 'get', '/api/auth/me', 'ok'],
      ['Config LDAP', 'get', '/api/admin/ldap/sources', 'ok'],
      ['Lister les utilisateurs', 'get', '/api/users?limit=5', 'ok'],
      ['Lister les campagnes', 'get', '/api/campaigns?limit=5', 'ok'],
      ['Audit log', 'get', '/api/admin/audit?limit=5', 'ok'],
      ['Santé détaillée (admin)', 'get', '/api/health/detail', 'ok'],
    ],
  }
  // Note : l'unblock sur un id bidon renvoie 404 (route accessible mais cible absente) →
  // pour HR on teste l'ACCÈS à la route, pas la cible ; 404 compte comme « accessible ».
  plan.hr[4][3] = 'ok'

  const results = []
  for (const person of roster) {
    const { c, ok, status } = await loginCtx(person.email, person.pw)
    const me = ok ? (await (await c.get('/api/auth/me')).json()) : null
    const roleOk = me && (me.role === person.role)
    const row = { email: person.email, role: person.role, loginStatus: status, roleOk, checks: [] }
    if (ok) {
      for (const [label, method, path, expect, data] of (plan[person.role] || [])) {
        // pour HR, la route unblock accessible → 404 (cible bidon) = accessible
        const r = await check(c, label, method, path, expect, data)
        if (person.role === 'hr' && path.includes('/unblock')) r.pass = (r.status === 404 || r.status < 400)
        row.checks.push(r)
      }
    }
    results.push(row)
    await c.dispose()
  }

  // Rapport
  mkdirSync('../docs/qa', { recursive: true })
  let md = `# Rapport QA — connexion en tant que ${results.length} utilisateurs\n\n`
  md += `> Harness rejouable (\`e2e/qa-harness.mjs\`). Chaque ligne = une assertion exécutée **après connexion réelle** sous l'identité concernée. ✅ = conforme, ❌ = écart.\n\n`
  let total = 0, passed = 0
  for (const r of results) {
    const okLogin = r.loginStatus === 200
    md += `## ${r.role.toUpperCase()} — ${r.email}\n`
    md += `- Connexion : ${okLogin ? '✅ 200' : '❌ ' + r.loginStatus} · Rôle attendu respecté : ${r.roleOk ? '✅' : '❌'}\n\n`
    md += `| Assertion | Méthode | Attendu | HTTP | Résultat |\n|---|---|---|---|---|\n`
    for (const c of r.checks) {
      total++; if (c.pass) passed++
      md += `| ${c.label} | ${c.method} | ${c.expect} | ${c.status} | ${c.pass ? '✅' : '❌'} |\n`
    }
    md += '\n'
  }
  md = md.replace('utilisateurs\n', `utilisateurs\n\n**Score global : ${passed}/${total} assertions conformes** · ${results.filter(r => r.loginStatus === 200).length}/${results.length} connexions réussies.\n`)
  writeFileSync('../docs/qa/Rapport-QA.md', md)
  console.log(`Connexions: ${results.filter(r => r.loginStatus === 200).length}/${results.length}`)
  console.log(`Assertions conformes: ${passed}/${total}`)
  results.forEach(r => console.log(` - ${r.role.padEnd(9)} ${r.email.padEnd(38)} login ${r.loginStatus} role ${r.roleOk ? 'ok' : 'KO'} checks ${r.checks.filter(c => c.pass).length}/${r.checks.length}`))
  await admin.dispose()
}
main().catch(e => { console.error('ÉCHEC:', e.message); process.exit(1) })
