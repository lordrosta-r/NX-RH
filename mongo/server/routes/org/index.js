'use strict'

// =============================================================================
// routes/org/index.js — Organigramme & gestion des secteurs
//
// GET    /api/org/tree?view=all|teams|sector  → arbre organisationnel
// PATCH  /api/org/users/:id                   → mise à jour org d'un utilisateur
// GET    /api/org/sectors                     → liste des secteurs
// POST   /api/org/sectors                     → créer un secteur
// PATCH  /api/org/sectors/:id/assign-users    → assigner des users en lot à un secteur
// PATCH  /api/org/sectors/:id                 → modifier un secteur
// DELETE /api/org/sectors/:id                 → supprimer un secteur
//
// Rôles autorisés : admin, hr (toutes routes sauf GET /tree)
//                   manager (GET /tree — vue scopée)
// =============================================================================

const router   = require('express').Router()
const mongoose = require('mongoose')
const User     = require('../../models/User')
const Sector   = require('../../models/Sector')
const Config   = require('../../models/Config')
const { ROLES } = require('../../config/constants')
const { cacheResponse } = require('../../middleware/cacheMiddleware')
const cache = require('../../utils/cache')

// ─── GET /api/org/tree ────────────────────────────────────────────────────────

router.get('/tree', cacheResponse(120, req => `GET:${req.originalUrl}:${req.user.id}`), async (req, res, next) => {
  try {
    let { view = 'all' } = req.query
    if (view === 'team') view = 'teams'  // alias singulier → pluriel
    if (!['all', 'teams', 'sector'].includes(view)) {
      return res.status(400).json({ error: 'view invalide : all, teams ou sector attendu' })
    }

    const role   = req.user.role
    const userId = (req.user.id || req.user._id).toString()

    // Déterminer les IDs accessibles selon le rôle
    let scopeIds = null // null = accès complet (admin/hr)

    if (role === 'manager') {
      const directReports = await User.find({ managerId: userId, isActive: true }).select('_id').lean()
      scopeIds = new Set([userId, ...directReports.map(u => u._id.toString())])
    } else if (!['admin', 'hr'].includes(role)) {
      return res.status(403).json({ error: 'Accès interdit' })
    }

    // Les comptes admin sont des comptes système : ils ne font pas partie de
    // l'organigramme des collaborateurs et n'y apparaissent pas.
    let users = await User.find({ isActive: true, role: { $ne: 'admin' } })
      .select('_id firstName lastName email role department position sectorId managerId dottedLineManagerIds avatar')
      .lean()

    if (scopeIds) {
      users = users.filter(u => scopeIds.has(u._id.toString()))
    }

    // ── all : arbre récursif depuis les racines ────────────────────────────
    if (view === 'all') {
      const nodeMap = {}
      for (const u of users) nodeMap[u._id.toString()] = { ...u, children: [] }

      const roots = []
      for (const u of users) {
        const node = nodeMap[u._id.toString()]
        if (!u.managerId) {
          roots.push(node)
        } else {
          const parent = nodeMap[u.managerId.toString()]
          if (parent) parent.children.push(node)
          else roots.push(node) // parent introuvable → traité comme racine
        }
      }

      const sortChildren = (node) => {
        node.children.sort((a, b) => a.lastName.localeCompare(b.lastName))
        node.children.forEach(sortChildren)
      }
      roots.sort((a, b) => a.lastName.localeCompare(b.lastName))
      roots.forEach(sortChildren)

      return res.json(roots)
    }

    // ── teams : groupé par manager direct ─────────────────────────────────
    if (view === 'teams') {
      const userById = {}
      for (const u of users) userById[u._id.toString()] = u

      const groups = {}
      for (const u of users) {
        if (!u.managerId) continue
        const mid = u.managerId.toString()
        if (!groups[mid]) {
          groups[mid] = {
            manager: userById[mid] || { _id: u.managerId },
            directReports: [],
            subManagers: [],
          }
        }
        groups[mid].directReports.push(u)
      }

      // Peupler subManagers (managers ayant eux-mêmes un manager dans les groupes)
      for (const [mid, group] of Object.entries(groups)) {
        const mgr = userById[mid]
        if (mgr?.managerId) {
          const pmid = mgr.managerId.toString()
          if (groups[pmid]) groups[pmid].subManagers.push(group.manager)
        }
      }

      return res.json(Object.values(groups).filter(g => g.directReports.length > 0))
    }

    // ── sector : groupé par secteur ────────────────────────────────────────
    if (view === 'sector') {
      const sectors = await Sector.find({ isActive: true }).lean()
      const sectorMap = {}
      for (const s of sectors) sectorMap[s._id.toString()] = s

      const sectorGroups = {}
      const unassigned = []

      for (const u of users) {
        if (!u.sectorId) {
          unassigned.push(u)
        } else {
          const sid = u.sectorId.toString()
          if (!sectorGroups[sid]) {
            sectorGroups[sid] = {
              sector: sectorMap[sid] || { _id: u.sectorId },
              users: [],
            }
          }
          sectorGroups[sid].users.push(u)
        }
      }

      const result = Object.values(sectorGroups)
        .sort((a, b) => (a.sector?.name || '').localeCompare(b.sector?.name || ''))

      if (unassigned.length > 0) result.push({ sector: null, users: unassigned })

      return res.json(result)
    }
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/org/users/:id ─────────────────────────────────────────────────

router.patch('/users/:id', async (req, res, next) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit' })
    }
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const { managerId, sectorId, role, dottedLineManagerIds } = req.body

    if (managerId !== undefined && managerId !== null) {
      if (!mongoose.isValidObjectId(managerId)) {
        return res.status(400).json({ error: 'managerId invalide' })
      }
      const manager = await User.findById(managerId, '_id').lean()
      if (!manager) return res.status(400).json({ error: 'Manager introuvable' })
    }

    if (dottedLineManagerIds !== undefined) {
      if (!Array.isArray(dottedLineManagerIds)) {
        return res.status(400).json({ error: 'dottedLineManagerIds doit être un tableau' })
      }
      if (dottedLineManagerIds.some(m => !mongoose.isValidObjectId(m))) {
        return res.status(400).json({ error: 'dottedLineManagerIds contient un ID invalide' })
      }
      if (dottedLineManagerIds.length) {
        const found = await User.countDocuments({ _id: { $in: dottedLineManagerIds } })
        if (found !== new Set(dottedLineManagerIds.map(String)).size) {
          return res.status(400).json({ error: 'Un responsable transverse est introuvable' })
        }
      }
    }

    if (sectorId !== undefined && sectorId !== null) {
      if (!mongoose.isValidObjectId(sectorId)) {
        return res.status(400).json({ error: 'sectorId invalide' })
      }
      const sector = await Sector.findById(sectorId, '_id').lean()
      if (!sector) return res.status(400).json({ error: 'Secteur introuvable' })
    }

    if (role !== undefined && !ROLES.includes(role)) {
      return res.status(400).json({ error: `Rôle invalide : ${role}` })
    }

    const user = await User.findById(id)
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    // Anti lock-out : interdit de démotionner le dernier administrateur actif.
    if (role !== undefined && role !== 'admin' && user.role === 'admin') {
      const otherAdmins = await User.countDocuments({ _id: { $ne: user._id }, role: 'admin', isActive: true })
      if (otherAdmins === 0) {
        return res.status(409).json({ error: "Action refusée : c'est le dernier administrateur actif." })
      }
    }

    if (managerId !== undefined) user.managerId = managerId || null
    if (sectorId !== undefined) user.sectorId = sectorId || null
    if (role !== undefined) user.role = role
    if (dottedLineManagerIds !== undefined) user.dottedLineManagerIds = dottedLineManagerIds

    // anti-cycle géré par le pre-save hook de User
    await user.save()

    cache.invalidatePattern('GET:/api/org')
    cache.invalidatePattern('GET:/api/v1/org')

    const result = user.toObject()
    delete result.passwordHash
    delete result.ldapDn
    res.json(result)
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message })
    next(err)
  }
})

// ─── GET /api/org/sectors ─────────────────────────────────────────────────────

router.get('/sectors', cacheResponse(300), async (req, res, next) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit' })
    }
    const sectors = await Sector.find({ isActive: true })
      .sort({ name: 1 })
      .populate('createdBy', 'firstName lastName')
      .lean()
    res.json(sectors)
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/org/sectors ────────────────────────────────────────────────────

router.post('/sectors', async (req, res, next) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit' })
    }
    const { name, description, color } = req.body

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'name est requis (2–100 caractères)' })
    }

    const sector = new Sector({
      name:        name.trim(),
      description: description || '',
      color:       color || '#17A8D4',
      createdBy:   req.user.id,
    })

    await sector.save()
    cache.invalidatePattern('GET:/api/org')
    cache.invalidatePattern('GET:/api/v1/org')
    res.status(201).json(sector.toObject())
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Un secteur avec ce nom existe déjà' })
    next(err)
  }
})

// ─── PATCH /api/org/sectors/:id/assign-users ──────────────────────────────────

router.patch('/sectors/:id/assign-users', async (req, res, next) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit' })
    }
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'ID invalide' })

    const { userIds } = req.body
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds doit être un tableau non vide' })
    }

    const sector = await Sector.findById(id, '_id').lean()
    if (!sector) return res.status(404).json({ error: 'Secteur introuvable' })

    const result = await User.updateMany({ _id: { $in: userIds } }, { sectorId: id })
    cache.invalidatePattern('GET:/api/org')
    cache.invalidatePattern('GET:/api/v1/org')
    res.json({ updated: result.modifiedCount })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/org/sectors/:id ───────────────────────────────────────────────

router.patch('/sectors/:id', async (req, res, next) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit' })
    }
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'ID invalide' })

    const { name, description, color, isActive } = req.body
    const updates = {}
    if (name !== undefined)        updates.name        = name
    if (description !== undefined) updates.description = description
    if (color !== undefined)       updates.color       = color
    if (isActive !== undefined)    updates.isActive    = isActive

    const sector = await Sector.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).populate('createdBy', 'firstName lastName')

    if (!sector) return res.status(404).json({ error: 'Secteur introuvable' })
    cache.invalidatePattern('GET:/api/org')
    cache.invalidatePattern('GET:/api/v1/org')
    res.json(sector.toObject())
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Un secteur avec ce nom existe déjà' })
    next(err)
  }
})

// ─── DELETE /api/org/sectors/:id ──────────────────────────────────────────────

router.delete('/sectors/:id', async (req, res, next) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit' })
    }
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'ID invalide' })

    const sector = await Sector.findById(id).lean()
    if (!sector) return res.status(404).json({ error: 'Secteur introuvable' })

    const count = await User.countDocuments({ sectorId: id })
    if (count > 0) {
      return res.status(409).json({
        error: `Secteur utilisé par ${count} utilisateur${count > 1 ? 's' : ''}`,
      })
    }

    await Sector.deleteOne({ _id: id })
    cache.invalidatePattern('GET:/api/org')
    cache.invalidatePattern('GET:/api/v1/org')
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// ─── Légende de l'organigramme (configurable par l'admin) ─────────────────────
// Stockée dans Config sous la clé 'org.legend'. Labels + couleurs des liens
// (hiérarchique / transverse) et des rôles. Le graphe consomme ces mêmes
// couleurs côté front pour rester cohérent avec la légende.

const DEFAULT_LEGEND = {
  edges: {
    hierarchical: { label: 'Lien hiérarchique', color: '#94A3B8' },
    transverse:   { label: 'Lien transverse',   color: '#D97706' },
  },
  roles: {
    admin:    { label: 'Admin',         color: '#0D9488' },
    hr:       { label: 'RH',            color: '#059669' },
    manager:  { label: 'Responsable',   color: '#2563EB' },
    employee: { label: 'Collaborateur', color: '#64748B' },
  },
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

// Construit une entrée propre {label, color} à partir d'une entrée libre,
// en retombant sur la valeur par défaut si invalide.
function pickEntry(entry, def) {
  const label = (typeof entry?.label === 'string' && entry.label.trim() && entry.label.trim().length <= 40)
    ? entry.label.trim() : def.label
  const color = (typeof entry?.color === 'string' && HEX_COLOR.test(entry.color))
    ? entry.color : def.color
  return { label, color }
}

// Fusionne/valide une légende libre par-dessus les valeurs par défaut.
function sanitizeLegend(body) {
  const b = body || {}
  return {
    edges: {
      hierarchical: pickEntry(b.edges?.hierarchical, DEFAULT_LEGEND.edges.hierarchical),
      transverse:   pickEntry(b.edges?.transverse,   DEFAULT_LEGEND.edges.transverse),
    },
    roles: {
      admin:    pickEntry(b.roles?.admin,    DEFAULT_LEGEND.roles.admin),
      hr:       pickEntry(b.roles?.hr,       DEFAULT_LEGEND.roles.hr),
      manager:  pickEntry(b.roles?.manager,  DEFAULT_LEGEND.roles.manager),
      employee: pickEntry(b.roles?.employee, DEFAULT_LEGEND.roles.employee),
    },
  }
}

// GET /api/org/legend — lisible par tous les visualisateurs de l'organigramme.
router.get('/legend', async (req, res, next) => {
  try {
    const doc = await Config.findOne({ key: 'org.legend' }).lean()
    res.json(doc?.value ? sanitizeLegend(doc.value) : DEFAULT_LEGEND)
  } catch (err) {
    next(err)
  }
})

// PUT /api/org/legend — modifiable par l'admin uniquement.
router.put('/legend', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Réservé à l'administrateur" })
    }
    const value = sanitizeLegend(req.body)
    await Config.findOneAndUpdate(
      { key: 'org.legend' },
      { $set: { value } },
      { upsert: true, new: true },
    )
    cache.invalidatePattern('GET:/api/org')
    cache.invalidatePattern('GET:/api/v1/org')
    res.json(value)
  } catch (err) {
    next(err)
  }
})

module.exports = router
