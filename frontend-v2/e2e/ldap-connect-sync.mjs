// L'admin connecte les 2 annuaires LDAP indépendants et les synchronise.
// Réutilise la session admin en cache.  node e2e/ldap-connect-sync.mjs
import { request } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'

const BASE = process.env.E2E_BASE_URL || 'https://localhost'
const EMAIL = process.env.PROD_ADMIN_EMAIL || 'admin-rh@nanoxplore.com'
const STATE = '/tmp/nxrh_admin_state.json'
const PWD_FILE = process.env.PROD_ADMIN_PASSWORD_FILE || '/tmp/nxrh_admin_pwd.txt'
const PASSWORD = process.env.PROD_ADMIN_PASSWORD
  || (() => { try { return readFileSync(PWD_FILE, 'utf8').trim() } catch { return '' } })()

const SOURCES = [
  {
    id: 'nxrh', label: 'Annuaire NanoXplore', enabled: true,
    host: 'ldap://openldap:389', baseDN: 'dc=nxrh,dc=local',
    bindDN: 'cn=admin,dc=nxrh,dc=local', bindPassword: 'adminpass',
    userFilter: '(objectClass=inetOrgPerson)',
    attrEmail: 'mail', attrFirstName: 'givenName', attrLastName: 'sn',
    attrDepartment: 'departmentNumber', attrTitle: 'title', attrManager: 'manager',
    defaultRole: 'employee',
  },
  {
    id: 'partner', label: 'Annuaire Partner', enabled: true,
    host: 'ldap://openldap2:389', baseDN: 'dc=partner,dc=local',
    bindDN: 'cn=admin,dc=partner,dc=local', bindPassword: 'partnerpass',
    userFilter: '(objectClass=inetOrgPerson)',
    attrEmail: 'mail', attrFirstName: 'givenName', attrLastName: 'sn',
    attrDepartment: 'departmentNumber', attrTitle: 'title', attrManager: 'manager',
    defaultRole: 'employee',
  },
]

async function main() {
  const ctx = await request.newContext({
    baseURL: BASE, ignoreHTTPSErrors: true,
    storageState: existsSync(STATE) ? STATE : undefined,
  })
  const me = await ctx.get('/api/auth/me')
  if (!me.ok()) {
    const r = await ctx.post('/api/auth/login', { data: { email: EMAIL, password: PASSWORD } })
    if (!r.ok()) throw new Error(`login → ${r.status()} ${await r.text()}`)
    await ctx.storageState({ path: STATE })
    console.log('✓ login admin (session cache)')
  } else console.log('✓ session réutilisée')

  // 1 — sauvegarder les 2 sources
  const put = await ctx.put('/api/admin/ldap/sources', { data: { sources: SOURCES } })
  console.log(`✓ sources sauvegardées → HTTP ${put.status()}`)

  // 2 — tester + 3 — synchroniser chaque source
  for (const s of SOURCES) {
    const test = await ctx.post('/api/admin/ldap/test', { data: { sourceId: s.id } })
    console.log(`  · test ${s.id} → HTTP ${test.status()} ${test.ok() ? '' : await test.text()}`)
    const sync = await ctx.post('/api/admin/ldap/sync', { data: { sourceId: s.id }, timeout: 180000 })
    const body = await sync.text()
    console.log(`  · sync ${s.id} → HTTP ${sync.status()} ${body.slice(0, 200)}`)
  }

  // 4 — vérification : total + orphelins
  const usersRes = await ctx.get('/api/users?limit=300')
  const uj = await usersRes.json()
  const users = uj.data || uj
  const total = users.length
  const withMgr = users.filter(u => u.managerId).length
  const orphans = users.filter(u => !u.managerId && u.authSource === 'ldap')
  console.log(`\nUtilisateurs: ${total} (dont ${withMgr} avec manager)`)
  console.log(`Racines LDAP (sans manager, normal): ${orphans.length}`)
  orphans.slice(0, 6).forEach(o => console.log(`  - ${o.firstName} ${o.lastName} <${o.email}> ${o.position || ''}`))
  await ctx.dispose()
}
main().catch(e => { console.error('ÉCHEC:', e.message); process.exit(1) })
