// Démontre : arrivée de nouveaux users via re-sync + exclusion d'un compte
// de service via un userFilter affiné.  node e2e/demo-onboarding.mjs
import { request } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'

const BASE = 'https://localhost'
const STATE = '/tmp/nxrh_admin_state.json'
const PWD = process.env.PROD_ADMIN_PASSWORD
  || (() => { try { return readFileSync('/tmp/nxrh_admin_pwd.txt', 'utf8').trim() } catch { return '' } })()

const NX_BASE = {
  host: 'ldap://openldap:389', baseDN: 'dc=nxrh,dc=local',
  bindDN: 'cn=admin,dc=nxrh,dc=local', bindPassword: 'adminpass',
  attrEmail: 'mail', attrFirstName: 'givenName', attrLastName: 'sn',
  attrDepartment: 'departmentNumber', attrTitle: 'title', attrManager: 'manager',
  defaultRole: 'employee',
}

async function main() {
  const ctx = await request.newContext({ baseURL: BASE, ignoreHTTPSErrors: true, storageState: existsSync(STATE) ? STATE : undefined })
  if (!(await ctx.get('/api/auth/me')).ok()) {
    await ctx.post('/api/auth/login', { data: { email: 'admin-rh@nanoxplore.com', password: PWD } })
    await ctx.storageState({ path: STATE })
  }
  const txt = async (r) => { try { return JSON.stringify(await r.json()) } catch { return await r.text() } }

  // 1 — un filtre NAÏF capterait le compte de service
  const naive = await ctx.post('/api/admin/ldap/preview', { data: { config: { ...NX_BASE, userFilter: '(uid=svc-*)' } } })
  const nj = await naive.json().catch(() => ({}))
  const svc = (nj.users || nj.data || nj || []).map(u => u.email || u.mail)
  console.log(`1) Preview filtre naïf "(uid=svc-*)" → ${svc.length} compte(s) système capté(s):`, svc.join(', '))

  // 2 — userFilter AFFINÉ : personnes uniquement, hors comptes de service
  const SAFE_FILTER = '(&(objectClass=inetOrgPerson)(!(uid=svc-*)))'
  const sources = (await (await ctx.get('/api/admin/ldap/sources')).json()).sources
    || (await (await ctx.get('/api/admin/ldap/sources')).json())
  const updated = sources.map(s => s.id === 'nxrh' ? { ...s, userFilter: SAFE_FILTER, bindPassword: 'adminpass' } : s)
  await ctx.put('/api/admin/ldap/sources', { data: { sources: updated } })
  console.log(`2) userFilter source "nxrh" affiné → ${SAFE_FILTER}`)

  // 3 — re-sync : importe les recrues, ignore le compte de service
  const sync = await ctx.post('/api/admin/ldap/sync', { data: { sourceId: 'nxrh' }, timeout: 180000 })
  console.log('3) re-sync nxrh →', await txt(sync))

  // 4 — vérifications
  const all = []
  for (let p = 1; p <= 4; p++) {
    const j = await (await ctx.get(`/api/users?limit=100&page=${p}`)).json()
    const b = j.data || j; if (!b.length) break; all.push(...b); if (b.length < 100) break
  }
  const svcImported = all.find(u => (u.email || '').startsWith('svc-backup'))
  const newcomers = all.filter(u => /nx08[5-9]|nx09[0-3]/.test(u.email || ''))
  console.log(`4) Compte de service importé ? ${svcImported ? 'OUI (problème)' : 'NON ✓'}`)
  console.log(`   Recrues importées: ${newcomers.length}/9`)
  newcomers.slice(0, 4).forEach(u => console.log(`   - ${u.firstName} ${u.lastName} (${u.position}) managerId=${u.managerId ? 'oui' : 'NON'}`))
  await ctx.dispose()
}
main().catch(e => { console.error('ÉCHEC:', e.message); process.exit(1) })
