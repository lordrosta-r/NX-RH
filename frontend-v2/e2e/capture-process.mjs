// Capture ordonnée du processus RH sur la prod locale (https://localhost).
// Produit des screenshots numérotés + un manifeste JSON pour générer le PDF.
//
//   PROD_ADMIN_PASSWORD='...' node e2e/capture-process.mjs
//
import { chromium } from '@playwright/test'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'screenshots', 'process')
const BASE = process.env.E2E_BASE_URL || 'https://localhost'
const EMAIL = process.env.PROD_ADMIN_EMAIL || 'admin-rh@nanoxplore.com'
const PWD_FILE = process.env.PROD_ADMIN_PASSWORD_FILE || '/tmp/nxrh_admin_pwd.txt'
const PASSWORD = process.env.PROD_ADMIN_PASSWORD
  || (() => { try { return readFileSync(PWD_FILE, 'utf8').trim() } catch { return '' } })()
if (!PASSWORD) { console.error(`Mot de passe admin introuvable (env ou ${PWD_FILE})`); process.exit(1) }

const manifest = []
let n = 0

async function main() {
  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })

  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    baseURL: BASE,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
    locale: 'fr-FR',
  })
  const page = await ctx.newPage()

  // step(slug, title, desc, fn) — exécute fn (best-effort) puis capture.
  async function step(slug, title, desc, fn, { full = false } = {}) {
    n += 1
    const id = String(n).padStart(2, '0')
    let note = ''
    try { if (fn) await fn() } catch (e) { note = `(action partielle : ${e.message.split('\n')[0]})` }
    await page.waitForTimeout(600)
    const file = `${id}-${slug}.png`
    await page.screenshot({ path: join(OUT, file), fullPage: full })
    manifest.push({ id, file, title, desc: desc + (note ? `  ${note}` : '') })
    console.log(`✓ ${id} ${title} ${note}`)
  }

  const goto = async (path) => { await page.goto(path); await page.waitForLoadState('networkidle').catch(() => {}) }

  // 1 — Connexion
  await step('login', 'Connexion administrateur',
    'Page de connexion sécurisée (HTTPS, cookies httpOnly). L’administrateur initial a été créé au déploiement ; tout le reste se configure depuis l’interface.',
    async () => {
      await goto('/login')
      await page.getByTestId('login-email').fill(EMAIL)
      await page.getByTestId('login-password').fill(PASSWORD)
    })

  // 2 — Tableau de bord
  await step('dashboard', 'Tableau de bord',
    'Après connexion, l’administrateur arrive sur son tableau de bord : point d’entrée vers les campagnes, utilisateurs, formulaires et l’administration.',
    async () => {
      await page.getByTestId('login-submit').click()
      await page.waitForURL('/', { timeout: 20000 }).catch(() => {})
      await page.waitForLoadState('networkidle').catch(() => {})
    })

  // 3 — Départements
  await step('departments-empty', 'Gestion des départements',
    'Première étape de paramétrage : définir les départements de l’entreprise. Ils servent ensuite à cibler les campagnes et à organiser les utilisateurs.',
    async () => { await goto('/admin/departments') })

  await step('departments-create', 'Création d’un département',
    'On saisit un nom et on valide. Les départements créés ici alimentent les listes déroulantes des fiches utilisateurs et le ciblage des campagnes.',
    async () => {
      for (const d of ['Ingénierie', 'Ressources Humaines', 'Commercial']) {
        const input = page.getByPlaceholder(/Nouveau département/i)
        await input.fill(d)
        await input.press('Enter')
        await page.waitForTimeout(800)
      }
    })

  // 4 — Utilisateurs : manager
  await step('user-new-manager', 'Création d’un manager',
    'On crée d’abord un responsable. Le formulaire impose nom, prénom, email et rôle ; le département reprend la liste créée précédemment.',
    async () => {
      await goto('/users/new')
      await page.locator('#firstName').fill('Pierre')
      await page.locator('#lastName').fill('Martin')
      await page.locator('#email').fill('pierre.martin@nanoxplore.com')
      await page.locator('#role').selectOption('manager')
      await page.locator('#department').fill('Ingénierie').catch(() => {})
      await page.locator('#position').fill('Responsable Ingénierie').catch(() => {})
    })

  await step('user-created-password', 'Mot de passe généré',
    'À la création, l’application génère un mot de passe temporaire affiché une seule fois (copiable). L’utilisateur devra le changer à sa première connexion.',
    async () => {
      await page.getByRole('button', { name: /Créer|Enregistrer/i }).first().click()
      await page.waitForTimeout(1500)
    })

  // 5 — Utilisateurs : employé rattaché
  await step('user-new-employee', 'Création d’un collaborateur rattaché',
    'On crée ensuite un collaborateur et on le rattache à son responsable direct (champ « Responsable direct »). Cette hiérarchie pilote la visibilité manager et les entretiens.',
    async () => {
      await goto('/users/new')
      await page.locator('#firstName').fill('Lucas')
      await page.locator('#lastName').fill('Bernard')
      await page.locator('#email').fill('lucas.bernard@nanoxplore.com')
      await page.locator('#role').selectOption('employee')
      await page.locator('#department').fill('Ingénierie').catch(() => {})
      await page.locator('#position').fill('Développeur').catch(() => {})
      // Responsable direct = Pierre Martin (select par libellé si présent)
      await page.locator('#managerId').selectOption({ label: /Martin/i }).catch(() => {})
    })

  await step('users-list', 'Annuaire des utilisateurs',
    'Une fois les comptes créés, ils apparaissent dans l’annuaire, filtrable par rôle et département. C’est la base humaine sur laquelle s’appuient les campagnes.',
    async () => {
      await page.getByRole('button', { name: /Créer|Enregistrer/i }).first().click().catch(() => {})
      await page.waitForTimeout(1200)
      await goto('/users')
    }, { full: true })

  // 6 — Organigramme
  await step('orgchart', 'Organigramme',
    'La hiérarchie saisie sur les fiches se matérialise en organigramme : chaque manager voit son équipe. C’est aussi la source de vérité pour l’étape entretien.',
    async () => { await goto('/admin/orgchart') })

  // 7 — Formulaires
  await step('forms', 'Bibliothèque de formulaires',
    'Les formulaires définissent les questions d’évaluation (auto-évaluation, manager, objectifs…). Ils sont réutilisables et liés à une campagne.',
    async () => { await goto('/forms') })

  await step('form-new', 'Création d’un formulaire',
    'Le créateur de formulaire permet d’ajouter des catégories et des questions, de choisir qui le remplit, et d’activer le rappel de « l’édition précédente » par question.',
    async () => { await goto('/forms/new') }, { full: true })

  // 8 — Campagnes
  await step('campaigns', 'Campagnes d’évaluation',
    'Une campagne est un cycle RH (annuel le plus souvent). Elle regroupe un périmètre de population, des formulaires et des échéances.',
    async () => { await goto('/campaigns') })

  await step('campaign-new', 'Nouvelle campagne — périmètre',
    'À la création, on définit les dates, les formulaires et le périmètre ciblé (toute l’entreprise, un rôle, un département, un secteur, un groupe ou des utilisateurs précis).',
    async () => { await goto('/campaigns/new') }, { full: true })

  // 9 — Évaluations
  await step('evaluations', 'Évaluations',
    'Une fois la campagne lancée, les évaluations sont générées pour la population ciblée. Chaque collaborateur remplit la sienne ; le manager la complète à son tour.',
    async () => { await goto('/evaluations') })

  // 10 — Manager : à traiter
  await step('manager-todo', 'Espace manager — à traiter',
    'Le manager retrouve ici, sous forme de cartes par collaborateur, ce qu’il doit traiter : valider les évaluations et lancer les entretiens.',
    async () => { await goto('/manager/todo') })

  // 11 — Entretien
  await step('interview', 'Entretien individuel',
    'La vue entretien est qualitative : pour chaque question les deux parties commentent et fixent une « position retenue », on revoit les objectifs, on rédige une synthèse, et le manager signe (l’employé signe depuis sa fiche). Un désaccord peut être marqué.',
    async () => { await goto('/interview') }, { full: true })

  // 12 — Analytique
  await step('analytics', 'Analytique RH',
    'La RH suit l’avancement et les résultats agrégés des campagnes : taux de complétion, répartition, points d’attention.',
    async () => { await goto('/analytics') })

  // 13 — Administration / intégrations
  await step('admin-hub', 'Centre d’administration',
    'Tout se configure depuis l’UI : utilisateurs, départements, et les intégrations (LDAP/Active Directory, SMTP, certificat SSL).',
    async () => { await goto('/admin') }, { full: true })

  await step('admin-ssl', 'Certificat SSL (téléversement)',
    'L’administrateur peut téléverser le certificat TLS (fullchain + clé privée). Le serveur valide réellement la cohérence clé/cert et l’expiration avant installation.',
    async () => { await goto('/admin/ssl') })

  await step('admin-ldap', 'Connexion annuaire (LDAP/AD)',
    'La connexion à un annuaire Active Directory / LDAP se paramètre ici, avec test de connexion et prévisualisation des utilisateurs avant synchronisation.',
    async () => { await goto('/admin/ldap') })

  await step('admin-mail', 'Configuration SMTP',
    'L’envoi des emails (notifications, rappels d’échéance) se configure ici — un préréglage OVH est fourni. Un email de test valide la configuration.',
    async () => { await goto('/admin/mail-config') })

  await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  await browser.close()
  console.log(`\n${manifest.length} captures → ${OUT}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
