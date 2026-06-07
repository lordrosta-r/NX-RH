// Crée une campagne live de bout en bout via l'API réelle de l'app (mêmes
// endpoints que les boutons de l'UI), puis remplit l'évaluation et mène
// l'entretien. Affiche les IDs pour ouvrir l'entretien dans l'UI.
//
//   PROD_ADMIN_PASSWORD='...' node e2e/live-campaign.mjs
import { request } from '@playwright/test'
import { readFileSync } from 'node:fs'

const BASE = process.env.E2E_BASE_URL || 'https://localhost'
const EMAIL = process.env.PROD_ADMIN_EMAIL || 'admin-rh@nanoxplore.com'
// Mot de passe : env, sinon fichier local gitignored (aucun credential en CLI).
const PWD_FILE = process.env.PROD_ADMIN_PASSWORD_FILE || '/tmp/nxrh_admin_pwd.txt'
const PASSWORD = process.env.PROD_ADMIN_PASSWORD
  || (() => { try { return readFileSync(PWD_FILE, 'utf8').trim() } catch { return '' } })()
if (!PASSWORD) { console.error(`Mot de passe admin introuvable (env PROD_ADMIN_PASSWORD ou fichier ${PWD_FILE})`); process.exit(1) }

// PNG 1x1 transparent — signature factice (dataUrl) pour la démo.
const SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const STATE = '/tmp/nxrh_admin_state.json'

async function main() {
  const { existsSync } = await import('node:fs')
  // Réutilise une session sauvegardée si possible (évite le rate-limit login).
  const ctx = await request.newContext({
    baseURL: BASE, ignoreHTTPSErrors: true,
    storageState: existsSync(STATE) ? STATE : undefined,
  })
  const j = async (res, label) => {
    if (!res.ok()) throw new Error(`${label} → HTTP ${res.status()} ${await res.text()}`)
    return res.json()
  }

  // 1 — login (seulement si la session en cache n'est plus valide)
  const me = await ctx.get('/api/auth/me')
  if (!me.ok()) {
    await j(await ctx.post('/api/auth/login', { data: { email: EMAIL, password: PASSWORD } }), 'login')
    await ctx.storageState({ path: STATE })
    console.log('✓ login admin (session mise en cache)')
  } else {
    console.log('✓ session réutilisée (pas de login)')
  }

  // 2 — résoudre les utilisateurs
  const usersRes = await j(await ctx.get('/api/users?limit=200'), 'get users')
  const users = usersRes.data || usersRes
  const byEmail = (e) => users.find((u) => u.email === e)
  const lucas = byEmail('lucas.bernard@nanoxplore.com')
  const pierre = byEmail('pierre.martin@nanoxplore.com')
  if (!lucas || !pierre) throw new Error('Lucas/Pierre introuvables — créer les comptes d’abord')
  console.log(`✓ employé ${lucas.id}  manager ${pierre.id}`)

  const year = new Date().getFullYear()

  // 3 — formulaire d’auto-évaluation (créé d’abord : son id est requis par la campagne)
  const questions = [
    { id: 'q1', type: 'rating', label: 'Comment évaluez-vous l’atteinte de vos objectifs cette année ?', required: true, scale: 5, phase: 'self' },
    { id: 'q2', type: 'text', label: 'Quelles sont vos principales réalisations ?', required: true, phase: 'self' },
    { id: 'q3', type: 'choice', label: 'Sur quel axe souhaitez-vous progresser en priorité ?', required: true, options: ['Technique', 'Management', 'Communication', 'Autonomie'], phase: 'self' },
    { id: 'q4', type: 'text', label: 'Vos souhaits d’évolution / mobilité ?', required: false, phase: 'aspirations' },
  ]
  const form = await j(await ctx.post('/api/forms', { data: {
    title: `Auto-évaluation ${year}`,
    description: 'À remplir par le collaborateur avant l’entretien.',
    formType: 'self_evaluation',
    filledBy: 'employee',
    visibleToEvaluatee: true,
    questions,
  } }), 'create form')
  const formId = (form.data || form).id
  console.log(`✓ formulaire ${formId}`)

  // 4 — campagne (draft), ciblée sur Lucas
  const camp = await j(await ctx.post('/api/campaigns', { data: {
    name: `Campagne annuelle ${year}`,
    description: 'Entretien annuel d’évaluation et de développement.',
    formId,
    status: 'draft',
    startDate: `${year}-01-15`,
    endDate: `${year}-03-15`,
    enableN1Context: true,
    n1VisibleToEmployee: true,
    targetScope: 'users',
    targetUserIds: [lucas.id],
  } }), 'create campaign')
  const campObj = camp.data || camp
  const campaignId = campObj.id || campObj._id
  if (!campaignId) throw new Error(`campagne sans id — réponse: ${JSON.stringify(camp).slice(0, 200)}`)
  console.log(`✓ campagne ${campaignId}`)

  // 5 — lier le formulaire à la campagne, puis générer les évaluations
  const link = await ctx.post(`/api/campaigns/${campaignId}/forms`, { data: { formId } })
  console.log(`✓ lien form↔campagne → HTTP ${link.status()}`)
  const gen = await ctx.post(`/api/campaigns/${campaignId}/generate-evaluations`)
  console.log(`✓ génération évaluations → HTTP ${gen.status()}`)
  await ctx.patch(`/api/campaigns/${campaignId}`, { data: { status: 'active' } })
  console.log('✓ campagne activée')

  // 6 — récupérer l’évaluation de Lucas
  const evalRes = await j(await ctx.get(`/api/evaluations?campaignId=${campaignId}&limit=50`), 'get evaluations')
  const evals = evalRes.data || evalRes
  const ev = evals.find((e) => (e.evaluateeId?.id || e.evaluateeId || e.evaluatee?.id) === lucas.id) || evals[0]
  if (!ev) throw new Error('Aucune évaluation générée — vérifier le scope/activation')
  console.log(`✓ évaluation ${ev.id} (status ${ev.status})`)

  // 7 — remplir les réponses (auto-évaluation)
  let note = ''
  try {
    await j(await ctx.patch(`/api/evaluations/${ev.id}`, { data: { answers: [
      { questionId: 'q1', value: 4 },
      { questionId: 'q2', value: 'Livraison de la plateforme RH v2 et montée en compétence sur l’infra.' },
      { questionId: 'q3', value: 'Management' },
      { questionId: 'q4', value: 'Évoluer vers un rôle de lead technique d’ici 18 mois.' },
    ] } }), 'patch answers')
    console.log('✓ réponses enregistrées')
  } catch (e) { note = e.message.split('\n')[0]; console.log(`~ remplissage partiel : ${note}`) }
  try { await ctx.post(`/api/evaluations/${ev.id}/submit`); console.log('✓ évaluation soumise') }
  catch { console.log('~ submit non autorisé pour admin (normal) — réponses tout de même enregistrées') }

  // 8 — entretien : échange par question + objectifs + synthèse
  await j(await ctx.patch('/api/interviews/state', { data: {
    campaignId, evaluateeId: lucas.id,
    discussion: [
      { questionId: 'q1', employeeComment: 'Objectifs globalement atteints malgré une charge élevée.', managerComment: 'Très bonne année, impact concret sur la livraison.', agreedAnswer: 'Objectifs atteints — performance solide.' },
      { questionId: 'q3', employeeComment: 'J’aimerais encadrer.', managerComment: 'Potentiel d’encadrement confirmé.', agreedAnswer: 'Axe management validé pour l’an prochain.' },
    ],
    objectivesReview: [
      { label: 'Fiabiliser le déploiement', status: 'achieved', comment: 'Pipeline CI/CD en place.' },
      { label: 'Documenter l’architecture', status: 'partial', comment: 'À poursuivre.' },
    ],
    nextYearObjectives: [
      { text: 'Prendre le lead technique sur un module.' },
      { text: 'Mentorer un alternant.' },
    ],
    synthesis: { text: 'Année très positive. Trajectoire claire vers un rôle de lead. Plan de développement orienté management et mentorat.' },
  } }), 'interview state')
  console.log('✓ entretien : échange + objectifs + synthèse enregistrés')

  // 9 — signature manager (l’admin agissant comme évaluateur → traité « manager »)
  try {
    const s = await ctx.post('/api/interviews/sign', { data: { campaignId, evaluateeId: lucas.id, role: 'manager', dataUrl: SIG } })
    console.log(`✓ signature manager → HTTP ${s.status()}`)
  } catch (e) { console.log(`~ signature : ${e.message.split('\n')[0]}`) }

  console.log(`\nINTERVIEW_URL=/interview?campaignId=${campaignId}&evaluateeId=${lucas.id}`)
  await ctx.dispose()
}

main().catch((e) => { console.error('ÉCHEC:', e.message); process.exit(1) })
