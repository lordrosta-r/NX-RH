// Génère 2 LDIF (annuaire principal + partenaire) totalisant 120 utilisateurs
// avec une hiérarchie `manager` complète (aucun orphelin : chaque user a un
// manager, sauf l'unique racine de chaque annuaire).
//   node docker/ldap/gen-120.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const __dirname = dirname(fileURLToPath(import.meta.url))

const PRENOMS = ['Marie','Pierre','Sophie','Lucas','Emma','Hugo','Julie','Thomas','Camille','Nicolas','Laura','Antoine','Chloe','Maxime','Sarah','Paul','Lea','Julien','Manon','Alexandre','Ines','Romain','Clara','Mathis','Anais','Quentin','Elise','Florian','Marine','Adrien','Oceane','Theo','Justine','Valentin','Pauline','Bastien','Audrey','Damien','Melanie','Cedric','Charlotte','Vincent','Amelie','Guillaume','Celine','Benjamin','Aurelie','Mathieu','Caroline','Fabien']
const NOMS = ['Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau','Simon','Laurent','Lefebvre','Michel','Garcia','David','Bertrand','Roux','Vincent','Fournier','Morel','Girard','Andre','Lefevre','Mercier','Dupont','Lambert','Bonnet','Francois','Martinez','Legrand','Garnier','Faure','Rousseau','Blanc','Guerin','Muller','Henry','Roussel','Nicolas','Perrin','Morin','Mathieu','Clement','Gauthier','Dumont','Lopez','Fontaine','Chevalier','Robin']

let pi = 0, ni = 0
const nextName = () => {
  const p = PRENOMS[pi % PRENOMS.length]
  const n = NOMS[ni % NOMS.length]
  pi++; if (pi % PRENOMS.length === 0) ni++
  ni++
  return { p, n }
}

function buildDir({ domain, base, deptList, prefix, startUid, plan }) {
  const lines = [`dn: ou=users,${base}`, 'objectClass: organizationalUnit', 'ou: users', '']
  let uid = startUid
  const entries = []
  let idx = 0
  const make = (role, dept, managerDn) => {
    const { p, n } = nextName()
    const id = `${prefix}${String(++idx).padStart(3, '0')}`
    const email = `${p}.${n}.${id}`.toLowerCase().replace(/[^a-z0-9.]/g, '') + `@${domain}`
    const dn = `uid=${id},ou=users,${base}`
    entries.push({ id, dn, p, n, email, role, dept, managerDn })
    uid++
    return dn
  }
  // racine
  const ceoDn = make('PDG', deptList[0], null)
  // directeurs
  const dirs = []
  for (let d = 0; d < plan.directors; d++) dirs.push(make('Directeur', deptList[d % deptList.length], ceoDn))
  // managers sous chaque directeur
  const managers = []
  dirs.forEach((dDn, di) => {
    for (let m = 0; m < plan.managersPerDir; m++) managers.push(make('Manager', deptList[di % deptList.length], dDn))
  })
  // employés sous chaque manager, jusqu'à atteindre le total
  let mi = 0
  while (entries.length < plan.total) {
    const mgr = managers[mi % managers.length]
    make('Collaborateur', mgr ? entries.find(e => e.dn === mgr)?.dept : deptList[0], mgr)
    mi++
  }
  // rendu LDIF
  let u = startUid
  for (const e of entries) {
    lines.push(
      `dn: ${e.dn}`,
      'objectClass: inetOrgPerson',
      'objectClass: posixAccount',
      `uid: ${e.id}`,
      `cn: ${e.p} ${e.n}`,
      `sn: ${e.n}`,
      `givenName: ${e.p}`,
      `mail: ${e.email}`,
      `title: ${e.role}`,
      `departmentNumber: ${e.dept}`,
      ...(e.managerDn ? [`manager: ${e.managerDn}`] : []),
      `uidNumber: ${u}`,
      `gidNumber: ${u}`,
      `homeDirectory: /home/${e.id}`,
      '',
    )
    u++
  }
  return { ldif: lines.join('\n'), count: entries.length }
}

const main = buildDir({
  domain: 'nxrh.local', base: 'dc=nxrh,dc=local', prefix: 'nx',
  deptList: ['Ingenierie', 'Produit', 'Commercial', 'Finance', 'RH'],
  startUid: 2000, plan: { directors: 5, managersPerDir: 3, total: 84 },
})
const partner = buildDir({
  domain: 'partner.local', base: 'dc=partner,dc=local', prefix: 'pa',
  deptList: ['Services', 'Support', 'Conseil'],
  startUid: 5000, plan: { directors: 3, managersPerDir: 2, total: 36 },
})

writeFileSync(join(__dirname, 'seed-120-main.ldif'), main.ldif)
writeFileSync(join(__dirname, 'seed-120-partner.ldif'), partner.ldif)
console.log(`main: ${main.count} users → seed-120-main.ldif`)
console.log(`partner: ${partner.count} users → seed-120-partner.ldif`)
console.log(`TOTAL: ${main.count + partner.count}`)
