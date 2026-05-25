'use strict'

// =============================================================================
// utils/paginate.js — Helper de pagination générique Mongoose
//
// Usage :
//   const { paginate } = require('../utils/paginate')
//   const result = await paginate(User, { isActive: true }, {
//     page: 1, limit: 20, sort: { lastName: 1 },
//     populate: [{ path: 'managerId', select: 'firstName lastName' }],
//     select: '-passwordHash -ldapDn',
//   })
//   // → { data, total, page, limit, pages, hasNext, hasPrev }
// =============================================================================

/**
 * Pagine une collection Mongoose.
 *
 * @param {import('mongoose').Model} Model   - Modèle Mongoose
 * @param {object}  filter                   - Filtre passé à .find() et .countDocuments()
 * @param {object}  options
 * @param {number}  [options.page=1]
 * @param {number}  [options.limit=20]
 * @param {object}  [options.sort={ createdAt: -1 }]
 * @param {string|object|Array} [options.populate]  - spec(s) populate, tableau ou objet unique
 * @param {string}  [options.select]                - projection de champs
 * @returns {Promise<{
 *   data:    any[],
 *   total:   number,
 *   page:    number,
 *   limit:   number,
 *   pages:   number,
 *   hasNext: boolean,
 *   hasPrev: boolean,
 * }>}
 */
async function paginate(Model, filter = {}, options = {}) {
  const {
    page     = 1,
    limit    = 20,
    sort     = { createdAt: -1 },
    populate,
    select,
  } = options

  const safePage  = Math.max(1, parseInt(page,  10) || 1)
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
  const skip      = (safePage - 1) * safeLimit

  let query = Model.find(filter).sort(sort).skip(skip).limit(safeLimit)

  if (populate) {
    const pops = Array.isArray(populate) ? populate : [populate]
    for (const pop of pops) query = query.populate(pop)
  }
  if (select) query = query.select(select)

  const [data, total] = await Promise.all([
    query.lean(),
    Model.countDocuments(filter),
  ])

  const pages = Math.ceil(total / safeLimit) || 1

  return {
    data,
    total,
    page:    safePage,
    limit:   safeLimit,
    pages,
    hasNext: safePage < pages,
    hasPrev: safePage > 1,
  }
}

module.exports = { paginate }
