// Harness QA APPROFONDI : se connecte EN TANT QUE 10 utilisateurs (rôles répartis)
// et vérifie, par rôle, (1) les assertions RBAC existantes ET (2) un échantillon
// d'ACTIONS MÉTIER RÉELLES via l'API (les mêmes endpoints que l'UI) — lecture, et
// là où c'est sûr, écriture réversible (création + suppression d'un formulaire de test).
// Inclut les invariants de sécurité (doivent échouer) + l'anti-auto-blocage.
// Produit un rapport pass/fail dans docs/qa/Rapport-QA-complet.md.
//
//   cd frontend-v2 && node e2e/qa-harness-full.mjs
//   (nécessite RELAX_RATE_LIMIT=true côté app — outil interne.)
//
// Ce fichier NE MODIFIE AUCUN fichier existant : il s'ajoute à qa-harness.mjs.
import { request } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const BASE = 'https://localhost'
const ADMIN_PW = process.env.PROD_ADMIN_PASSWORD
  || (() => { try { return readFileSync('/tmp/nxrh_admin_pwd.txt', 'utf8').trim() } catch { return '' } })()
const LDAP_PW = 'Test1234!'

const ctxFor = (storageState) => request.newContext({ baseURL: BASE, ignoreHTTPSErrors: true, storageState })
const loginCtx = async (email, password) => {
  const c = await ctxFor(undefined)
  let status = 0, ok = false
  try { const r = await c.post('/api/auth/login', { data: { email, password } }); status = r.status(); ok = r.ok() } catch { /* réseau */ }
  return { c, ok, status }
}

// Exécute une requête en tolérant les erreurs réseau ; renvoie { status, json }.
async function call(ctx, method, path, data) {
  try {
    const r = await ctx[method](path, data ? { data } : undefined)
    let json = null
    try { json = await r.json() } catch { /* pas de corps JSON */ }
    return { status: r.status(), json }
  } catch { return { status: 0, json: null } }
}

// Évalue une assertion. `expect` :
//   'ok'        → la requête doit réussir (status < 400)
//   'forbidden' → la requête doit être refusée (401/403/404)
//   'rejected'  → la requête doit être rejetée par une règle métier (400/401/403/409)
//                 (ex : anti-auto-blocage renvoie 400, pas 403)
function verdict(expect, status) {
  if (expect === 'ok')        return status > 0 && status < 400
  if (expect === 'forbidden') return status === 401 || status === 403 || status === 404
  if (expect === 'rejected')  return [400, 401, 403, 409].includes(status)
  return false
}

async function check(ctx, label, method, path, expect, data) {
  const { status } = await call(ctx, method, path, data)
  return { label, method: method.toUpperCase(), path, expect, status, pass: verdict(expect, status) }
}

// Déballe { data }, { success, data } ou un tableau/objet nu.
function unwrap(json) {
  if (json == null) return null
  if (Array.isArray(json)) return json
  if (json.data !== undefined) return json.data
  return json
}

async function main() {
  const admin = await ctxFor(undefined)
  const al = await admin.post('/api/auth/login', { data: { email: 'admin-rh@nanoxplore.com', password: ADMIN_PW } })
  if (!al.ok()) throw new Error('login admin KO ' + al.status())

  // Panel de 10 utilisateurs (rôles répartis) depuis l'annuaire.
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

  const results = []
  let createdFormIds = [] // nettoyage (filet de sécurité) si une suppression échoue

  for (const person of roster) {
    const { c, ok, status } = await loginCtx(person.email, person.pw)
    const me = ok ? unwrap((await call(c, 'get', '/api/auth/me')).json) : null
    const selfId = me ? (me._id || me.id) : '000000000000000000000000'
    const roleOk = me && (me.role === person.role)
    const row = { email: person.email, role: person.role, loginStatus: status, roleOk, checks: [] }

    if (ok) {
      const checks = row.checks
      const push = (r) => checks.push(r)

      if (person.role === 'employee') {
        // --- Actions métier (lecture) ---
        push(await check(c, 'Voir mon profil', 'get', '/api/auth/me', 'ok'))
        push(await check(c, 'Lister MES évaluations (scope perso)', 'get', `/api/evaluations?evaluateeId=${selfId}&limit=5`, 'ok'))
        push(await check(c, 'Lire ma fiche utilisateur (self)', 'get', `/api/users/${selfId}`, 'ok'))
        // NB : /api/documents n'existe pas dans cette API — les documents/ressources
        // partagés sont servis par /api/resources. On teste les deux : l'endpoint réel
        // (doit réussir) ET l'endpoint du brief (exposé comme finding s'il est absent).
        push(await check(c, 'Lister mes ressources/documents (/api/resources)', 'get', '/api/resources?limit=5', 'ok'))
        push(await check(c, 'Lister mes documents (/api/documents — endpoint du brief)', 'get', '/api/documents', 'ok'))
        // --- Invariants de sécurité (doivent échouer) ---
        push(await check(c, 'INTERDIT lister les utilisateurs', 'get', '/api/users?limit=5', 'forbidden'))
        push(await check(c, 'INTERDIT créer une campagne', 'post', '/api/campaigns', 'forbidden', { name: 'x', formId: '000000000000000000000000', startDate: '2026-01-01', endDate: '2026-02-01' }))
        push(await check(c, 'INTERDIT config LDAP', 'get', '/api/admin/ldap/sources', 'forbidden'))
        push(await check(c, 'INTERDIT voir l’organigramme', 'get', '/api/org/tree', 'forbidden'))
      }

      if (person.role === 'manager') {
        // --- Actions métier (lecture) ---
        push(await check(c, 'Voir mon profil', 'get', '/api/auth/me', 'ok'))
        push(await check(c, 'Voir l’organigramme (org/tree)', 'get', '/api/org/tree', 'ok'))
        push(await check(c, 'Lister mon équipe (/api/users)', 'get', '/api/users?limit=10', 'ok'))
        // Accéder à une éval de son périmètre (liste scopée côté serveur)
        push(await check(c, 'Lister les évaluations de mon périmètre', 'get', '/api/evaluations?limit=5', 'ok'))
        // --- Invariants de sécurité (doivent échouer) ---
        push(await check(c, 'INTERDIT créer une campagne', 'post', '/api/campaigns', 'forbidden', { name: 'x', formId: '000000000000000000000000', startDate: '2026-01-01', endDate: '2026-02-01' }))
        push(await check(c, 'INTERDIT config LDAP', 'get', '/api/admin/ldap/sources', 'forbidden'))
        push(await check(c, 'INTERDIT supprimer un compte', 'delete', '/api/users/000000000000000000000000', 'forbidden'))
      }

      if (person.role === 'hr') {
        // --- Actions métier (lecture) ---
        push(await check(c, 'Voir mon profil', 'get', '/api/auth/me', 'ok'))
        push(await check(c, 'Lister les campagnes', 'get', '/api/campaigns?limit=5', 'ok'))
        push(await check(c, 'Lister les utilisateurs', 'get', '/api/users?limit=5', 'ok'))
        push(await check(c, 'Lister les formulaires', 'get', '/api/forms?limit=5', 'ok'))
        // --- Écriture réversible : créer un formulaire puis le supprimer ---
        const created = await call(c, 'post', '/api/forms', {
          title: `[QA-HARNESS] form ${Date.now()}`,
          formType: 'self_evaluation',
          description: 'Formulaire de test créé par qa-harness-full.mjs (à supprimer).',
          questions: [],
        })
        const body = unwrap(created.json) || {}
        const formId = body.id || body._id || (created.json && created.json.id)
        push({ label: 'Créer un formulaire (POST /api/forms)', method: 'POST', path: '/api/forms', expect: 'ok', status: created.status, pass: verdict('ok', created.status) })
        if (formId) {
          createdFormIds.push(formId)
          const del = await call(c, 'delete', `/api/forms/${formId}`)
          push({ label: 'Supprimer le formulaire de test (cleanup)', method: 'DELETE', path: `/api/forms/${formId}`, expect: 'ok', status: del.status, pass: verdict('ok', del.status) })
          if (verdict('ok', del.status)) createdFormIds = createdFormIds.filter(i => i !== formId)
        } else {
          push({ label: 'Supprimer le formulaire de test (cleanup)', method: 'DELETE', path: '/api/forms/<id>', expect: 'ok', status: 0, pass: false })
        }
        // --- Invariant de sécurité : LDAP réservé admin ---
        push(await check(c, 'INTERDIT config LDAP (admin only)', 'get', '/api/admin/ldap/sources', 'forbidden'))
      }

      if (person.role === 'admin') {
        // --- Actions métier (lecture) ---
        push(await check(c, 'Voir mon profil', 'get', '/api/auth/me', 'ok'))
        push(await check(c, 'Sources LDAP (admin)', 'get', '/api/admin/ldap/sources', 'ok'))
        push(await check(c, 'Journal d’audit (admin)', 'get', '/api/admin/audit?limit=5', 'ok'))
        push(await check(c, 'Branding (GET)', 'get', '/api/branding', 'ok'))
        push(await check(c, 'Santé détaillée (admin)', 'get', '/api/health/detail', 'ok'))
        push(await check(c, 'Lister les utilisateurs', 'get', '/api/users?limit=5', 'ok'))
        push(await check(c, 'Lister les campagnes', 'get', '/api/campaigns?limit=5', 'ok'))
        // --- Invariant : anti-auto-blocage (bloquer son PROPRE compte → refusé) ---
        push(await check(c, 'ANTI-AUTO-BLOCAGE : bloquer mon propre compte', 'patch', `/api/users/${selfId}/block`, 'rejected', { reason: 'qa-harness self-block test' }))
      }
    }

    results.push(row)
    await c.dispose()
  }

  // Filet de sécurité : supprimer (en admin) tout formulaire de test resté en base.
  for (const id of createdFormIds) {
    try { await admin.delete(`/api/forms/${id}`) } catch { /* best effort */ }
  }

  // --- Rapport ---
  mkdirSync('../docs/qa', { recursive: true })
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  let total = 0, passed = 0
  const fails = []
  let body = ''
  for (const r of results) {
    const okLogin = r.loginStatus === 200
    body += `## ${r.role.toUpperCase()} — ${r.email}\n`
    body += `- Connexion : ${okLogin ? '✅ 200' : '❌ ' + r.loginStatus} · Rôle attendu respecté : ${r.roleOk ? '✅' : '❌'}\n\n`
    body += `| Assertion | Méthode | Attendu | HTTP | Résultat |\n|---|---|---|---|---|\n`
    for (const c of r.checks) {
      total++; if (c.pass) passed++; else fails.push({ role: r.role, email: r.email, ...c })
      body += `| ${c.label} | ${c.method} | ${c.expect} | ${c.status} | ${c.pass ? '✅' : '❌'} |\n`
    }
    body += '\n'
  }

  const nLogins = results.filter(r => r.loginStatus === 200).length
  let md = `# Rapport QA approfondi — actions métier par rôle\n\n`
  md += `> Harness rejouable (\`e2e/qa-harness-full.mjs\`). Chaque ligne = une assertion exécutée **après connexion réelle** sous l'identité concernée, contre les **mêmes endpoints que l'UI**. Inclut lecture, écriture réversible (formulaire créé puis supprimé) et invariants de sécurité. ✅ = conforme, ❌ = écart.\n\n`
  md += `**Date :** ${now}\n\n`
  md += `**Score global : ${passed}/${total} assertions conformes** · ${nLogins}/${results.length} connexions réussies.\n\n`
  if (fails.length) {
    md += `### Écarts (❌) à investiguer\n\n`
    md += `| Rôle | Assertion | Méthode | Attendu | HTTP |\n|---|---|---|---|---|\n`
    for (const f of fails) md += `| ${f.role} | ${f.label} | ${f.method} | ${f.expect} | ${f.status} |\n`
    md += '\n'
  } else {
    md += `_Aucun écart : toutes les assertions sont conformes._\n\n`
  }
  md += body
  writeFileSync('../docs/qa/Rapport-QA-complet.md', md)

  console.log(`Connexions: ${nLogins}/${results.length}`)
  console.log(`Assertions conformes: ${passed}/${total}`)
  results.forEach(r => console.log(` - ${r.role.padEnd(9)} ${r.email.padEnd(38)} login ${r.loginStatus} role ${r.roleOk ? 'ok' : 'KO'} checks ${r.checks.filter(c => c.pass).length}/${r.checks.length}`))
  if (fails.length) {
    console.log('\nÉcarts (❌):')
    fails.forEach(f => console.log(`   [${f.role}] ${f.label} → ${f.method} ${f.path} attendu=${f.expect} reçu=${f.status}`))
  }
  await admin.dispose()
}
main().catch(e => { console.error('ÉCHEC:', e.message); process.exit(1) })
