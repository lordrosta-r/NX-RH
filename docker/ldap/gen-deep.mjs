// Génère des chaînes hiérarchiques PROFONDES (org tentaculaire) accrochées à
// des managers existants, dans plusieurs départements.  node docker/ldap/gen-deep.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const __dirname = dirname(fileURLToPath(import.meta.url))

const FN = ['Noah','Lina','Eden','Milo','Jade','Liam','Rose','Sacha','Nina','Aaron','Iris','Ethan','Lou','Marius','Anna','Tiago','Mila','Noe','Alba','Gabin','Romy','Eliott','Capucine','Raphael']
const LN = ['Colin','Brun','Renaud','Marchal','Pons','Barbier','Leclercq','Hardy','Breton','Schmitt','Carre','Roy','Gros','Masson','Charles','Renard','Coste','Marty','Aubry','Picard','Lacroix','Berger','Olivier','Tessier']
let k = 0
const name = () => ({ p: FN[k % FN.length], n: LN[(k++) % LN.length] })

// Chaque chaîne : un manager existant (anchor) → A → B → C → D (profondeur 4)
const CHAINS = [
  { anchor: 'nx008', dept: 'Produit',    titles: ['Lead Produit', 'Product Owner', 'PM Junior', 'Stagiaire Produit'] },
  { anchor: 'nx010', dept: 'Commercial', titles: ['Lead Commercial', 'Key Account', 'Commercial', 'SDR'] },
  { anchor: 'nx012', dept: 'Finance',    titles: ['Lead Finance', 'Controleur', 'Comptable', 'Assistant'] },
  { anchor: 'nx014', dept: 'Ingenierie', titles: ['Lead QA', 'QA Senior', 'QA', 'Testeur Junior'] },
]

let uid = 4100
let idx = 110
const lines = []
for (const chain of CHAINS) {
  let parent = `uid=${chain.anchor},ou=users,dc=nxrh,dc=local`
  for (const title of chain.titles) {
    const { p, n } = name()
    const id = `nx${idx++}`
    const dn = `uid=${id},ou=users,dc=nxrh,dc=local`
    lines.push(
      `dn: ${dn}`, 'objectClass: inetOrgPerson', 'objectClass: posixAccount',
      `uid: ${id}`, `cn: ${p} ${n}`, `sn: ${n}`, `givenName: ${p}`,
      `mail: ${p}.${n}.${id}`.toLowerCase() + '@nxrh.local',
      `title: ${title}`, `departmentNumber: ${chain.dept}`,
      `manager: ${parent}`,
      `uidNumber: ${uid}`, `gidNumber: ${uid}`, `homeDirectory: /home/${id}`, '',
    )
    parent = dn
    uid++
  }
}
writeFileSync(join(__dirname, 'seed-deep.ldif'), lines.join('\n'))
console.log(`${CHAINS.length} chaînes profondes (profondeur 4) → ${CHAINS.length * 4} users → seed-deep.ldif`)
