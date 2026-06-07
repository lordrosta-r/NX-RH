// =============================================================================
// services/managerVisibility.js — Visibilité hiérarchique des managers
//
// Un manager voit par défaut ses subordonnés directs (User.managerId).
// Si la campagne lui accorde une visibilité étendue (extendedVisibility),
// il voit aussi les équipes des managers sous sa tutelle dans l'arbre
// hiérarchique — récursivement.
//
// Usage (dans une route) :
//   const { getVisibleUserIds } = require('../services/managerVisibility')
//   const ids = await getVisibleUserIds(managerId, campaign)
//   const evals = await Evaluation.find({ evaluateeId: { $in: ids }, campaignId })
// =============================================================================

const { User } = require('../models')

const MAX_DEPTH = 20

/**
 * Retourne la liste des sous-managers directs d'un manager
 * (utilisateurs ayant le rôle 'manager' avec managerId donné).
 *
 * @param {ObjectId|string} managerId
 * @returns {Promise<ObjectId[]>}
 */
async function getDirectSubManagers(managerId) {
  const subs = await User.find(
    { managerId, role: { $in: ['manager'] }, isActive: true },
    '_id'
  ).lean()
  return subs.map(u => u._id)
}

/**
 * Retourne tous les IDs des managers dans le sous-arbre d'un manager
 * (récursivement), en s'arrêtant si restrictedToManagers est fourni.
 *
 * @param {ObjectId|string}   managerId           Manager racine
 * @param {ObjectId[]|null}   restrictedToManagers Si non-vide, ne descend
 *                                                 que dans ces branches
 * @param {Set}               visited              Anti-boucle (usage interne)
 * @returns {Promise<ObjectId[]>}  Tous les IDs des managers sous la racine
 */
async function getSubManagerTree(managerId, restrictedToManagers = [], visited = new Set(), depth = 0) {
  if (depth > MAX_DEPTH) return []  // Anti-stack-overflow
  const key = managerId.toString()
  if (visited.has(key)) return []   // sécurité anti-cycle
  visited.add(key)

  let directSubs = await getDirectSubManagers(managerId)

  // Si une restriction est définie, on filtre pour ne garder que les branches
  // autorisées (et leurs descendants).
  if (restrictedToManagers && restrictedToManagers.length > 0) {
    const allowed = new Set(restrictedToManagers.map(id => id.toString()))
    directSubs = directSubs.filter(id => allowed.has(id.toString()))
  }

  if (directSubs.length === 0) return []

  const deeper = await Promise.all(
    directSubs.map(subId => getSubManagerTree(subId, [], visited, depth + 1))
  )

  return [...directSubs, ...deeper.flat()]
}

/**
 * Retourne les IDs de tous les utilisateurs dont les évaluations sont
 * visibles par le manager donné dans le contexte d'une campagne.
 *
 * Règle :
 *   1. Toujours : ses subordonnés directs (User.managerId === managerId).
 *   2. Si le manager est dans campaign.extendedVisibility :
 *      → aussi les subordonnés de chaque manager dans son sous-arbre
 *        (filtré par restrictedToManagers s'il est défini).
 *
 * @param {ObjectId|string} managerId
 * @param {object}          campaign   Document Campaign (avec extendedVisibility)
 * @returns {Promise<ObjectId[]>}
 */
async function getVisibleUserIds(managerId, campaign) {
  const managerIdStr = managerId.toString()

  // 1. Subordonnés directs (toujours visibles) + rattachés transverses
  //    (dottedLineManagerIds) — lien fonctionnel donnant la visibilité lecture.
  const [directReports, dottedReports] = await Promise.all([
    User.find({ managerId, isActive: true }, '_id').lean(),
    User.find({ dottedLineManagerIds: managerId, isActive: true }, '_id').lean(),
  ])

  const visibleIds = new Set([
    ...directReports.map(u => u._id.toString()),
    ...dottedReports.map(u => u._id.toString()),
  ])

  // 2. Visibilité étendue si configurée pour ce manager dans la campagne
  const grant = (campaign?.extendedVisibility ?? []).find(
    g => g.managerId.toString() === managerIdStr
  )

  if (grant) {
    const subManagers = await getSubManagerTree(
      managerId,
      grant.restrictedToManagers || []
    )

    if (subManagers.length > 0) {
      const subReports = await User.find(
        { managerId: { $in: subManagers }, isActive: true },
        '_id'
      ).lean()

      subReports.forEach(u => visibleIds.add(u._id.toString()))
      // Les managers eux-mêmes sont aussi des évaluataires potentiels
      subManagers.forEach(id => visibleIds.add(id.toString()))
    }
  }

  return [...visibleIds]
}

/**
 * Retourne les IDs de TOUS les utilisateurs (tous rôles) situés sous un
 * manager dans l'arbre hiérarchique — récursivement, sous-équipes incluses.
 *
 * Utilisé par GET /api/users quand le manager a canViewSubtree = true.
 * N'inclut PAS le manager racine lui-même.
 *
 * @param {ObjectId|string} rootManagerId
 * @returns {Promise<ObjectId[]>}
 */
async function getDescendantUserIds(rootManagerId) {
  const collected = new Set()
  let frontier = [rootManagerId]
  let depth = 0

  while (frontier.length > 0 && depth <= MAX_DEPTH) {
    const children = await User.find(
      { managerId: { $in: frontier }, isActive: true },
      '_id'
    ).lean()

    const next = []
    for (const child of children) {
      const key = child._id.toString()
      if (!collected.has(key)) {
        collected.add(key)
        next.push(child._id)  // on ne redescend que dans les nouveaux nœuds
      }
    }
    frontier = next
    depth += 1
  }

  return [...collected]
}

/**
 * Vérifie si un manager a le droit de voir l'évaluation d'un utilisateur
 * donné dans le contexte d'une campagne.
 *
 * @param {ObjectId|string} managerId
 * @param {ObjectId|string} evaluateeId
 * @param {object}          campaign
 * @returns {Promise<boolean>}
 */
async function canManagerSeeEvaluatee(managerId, evaluateeId, campaign) {
  const ids = await getVisibleUserIds(managerId, campaign)
  return ids.includes(evaluateeId.toString())
}

module.exports = { getVisibleUserIds, canManagerSeeEvaluatee, getSubManagerTree, getDescendantUserIds }
