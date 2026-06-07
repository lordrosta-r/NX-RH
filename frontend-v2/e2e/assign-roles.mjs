// L'admin attribue des rôles réalistes après import LDAP (l'AD ne porte pas
// les rôles). Tout titre encadrant → manager ; 2 personnes RH → hr.
//   node e2e/assign-roles.mjs
import { request } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'

const BASE = process.env.E2E_BASE_URL || 'https://localhost'
const EMAIL = process.env.PROD_ADMIN_EMAIL || 'admin-rh@nanoxplore.com'
const STATE = '/tmp/nxrh_admin_state.json'
const PWD_FILE = process.env.PROD_ADMIN_PASSWORD_FILE || '/tmp/nxrh_admin_pwd.txt'
const PASSWORD = process.env.PROD_ADMIN_PASSWORD
  || (() => { try { return readFileSync(PWD_FILE, 'utf8').trim() } catch { return '' } })()

const MANAGER_TITLES = ['PDG', 'Directeur', 'Manager']

async function main() {
  const ctx = await request.newContext({
    baseURL: BASE, ignoreHTTPSErrors: true,
    storageState: existsSync(STATE) ? STATE : undefined,
  })
  const me = await ctx.get('/api/auth/me')
  if (!me.ok()) {
    const r = await ctx.post('/api/auth/login', { data: { email: EMAIL, password: PASSWORD } })
    if (!r.ok()) throw new Error(`login → ${r.status()}`)
    await ctx.storageState({ path: STATE })
  }

  // Récupère tous les utilisateurs (pagination)
  const all = []
  for (let page = 1; page <= 5; page++) {
    const res = await ctx.get(`/api/users?limit=100&page=${page}`)
    const j = await res.json()
    const batch = j.data || j
    if (!batch.length) break
    all.push(...batch)
    if (batch.length < 100) break
  }
  const ldap = all.filter(u => u.authSource === 'ldap')
  console.log(`Utilisateurs LDAP: ${ldap.length}`)

  let managers = 0, hrs = 0
  // 1 — encadrants → manager
  for (const u of ldap) {
    const title = (u.position || '')
    if (MANAGER_TITLES.some(t => title.includes(t)) && u.role !== 'manager') {
      const r = await ctx.patch(`/api/users/${u.id}`, { data: { role: 'manager' } })
      if (r.ok()) managers++
      else console.log(`  ! ${u.email} → ${r.status()} ${await r.text()}`)
    }
  }
  // 2 — 2 personnes du département RH → hr
  const rh = ldap.filter(u => (u.department || '').toUpperCase() === 'RH').slice(0, 2)
  for (const u of rh) {
    const r = await ctx.patch(`/api/users/${u.id}`, { data: { role: 'hr' } })
    if (r.ok()) hrs++
    else console.log(`  ! hr ${u.email} → ${r.status()} ${await r.text()}`)
  }
  console.log(`✓ ${managers} managers, ${hrs} RH promus`)
  await ctx.dispose()
}
main().catch(e => { console.error('ÉCHEC:', e.message); process.exit(1) })
