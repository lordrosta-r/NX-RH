'use strict'

// =============================================================================
// routes/users/import.js — Import CSV / JSON d'utilisateurs
//
// POST /api/users/import?dryRun=true|false
//   Corps : application/json (tableau) OU text/csv / text/plain (CSV)
//   Colonnes CSV / champs JSON : firstName, lastName, email, role, department,
//                                managerEmail, sector
//
// Rôles autorisés : admin, hr (déclaré dans index.js)
// =============================================================================

const express = require('express')
const crypto  = require('crypto')
const bcrypt  = require('bcrypt')
const router  = express.Router()

const User   = require('../../models/User')
const Sector = require('../../models/Sector')
const { ROLES, BCRYPT_ROUNDS } = require('../../config/constants')
const { getDepartments } = require('../../services/departmentsService')
const notificationService = require('../../services/mailNotificationService')
const logger              = require('../../utils/logger')

// ── Utilitaires ───────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  // Auto-détection du séparateur sur la première ligne
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim())

  return lines.slice(1).map(line => {
    const values = line.split(sep).map(v => v.trim())
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

// ── POST / ────────────────────────────────────────────────────────────────────

router.post(
  '/',
  // Middleware conditionnel : parser le body CSV si content-type text/*
  (req, res, next) => {
    const ct = (req.headers['content-type'] || '').toLowerCase()
    if (ct.includes('text/csv') || ct.includes('text/plain')) {
      return express.text({ type: ['text/csv', 'text/plain'], limit: '5mb' })(req, res, next)
    }
    next()
  },
  async (req, res, next) => {
    try {
      const dryRun = req.query.dryRun === 'true'
      const ct     = (req.headers['content-type'] || '').toLowerCase()

      let rows
      if (ct.includes('application/json')) {
        if (!Array.isArray(req.body)) {
          return res.status(400).json({ error: 'Body JSON doit être un tableau' })
        }
        rows = req.body
      } else {
        const text = typeof req.body === 'string' ? req.body : ''
        if (!text.trim()) {
          return res.status(400).json({ error: 'Body CSV vide ou manquant. Envoyez text/csv ou application/json.' })
        }
        rows = parseCSV(text)
      }

      if (rows.length === 0) {
        return res.status(400).json({ error: 'Aucune donnée à importer' })
      }

      const results = { created: 0, updated: 0, skipped: 0, errors: [], warnings: [], preview: [] }

      // ── Batch pre-fetch (1 query per collection instead of N per row) ──────
      const rowEmails     = [...new Set(rows.map(r => (r.email || '').toLowerCase().trim()).filter(Boolean))]
      const managerEmails = [...new Set(rows.map(r => (r.managerEmail || '').toLowerCase().trim()).filter(Boolean))]
      const sectorNames   = [...new Set(rows.map(r => ((r.sectorName || r.sector) || '').trim()).filter(Boolean))]

      const allEmailsToFetch = [...new Set([...rowEmails, ...managerEmails])]

      const [fetchedUsers, fetchedSectors] = await Promise.all([
        allEmailsToFetch.length
          ? User.find({ email: { $in: allEmailsToFetch } }, '_id email').lean()
          : Promise.resolve([]),
        sectorNames.length
          ? Sector.find({ name: { $in: sectorNames } }, '_id name').lean()
          : Promise.resolve([]),
      ])

      const userByEmail   = new Map(fetchedUsers.map(u => [u.email.toLowerCase(), u]))
      const sectorByName  = new Map(fetchedSectors.map(s => [s.name, s._id]))
      const validDepartments = await getDepartments()
      // ──────────────────────────────────────────────────────────────────────

      for (let i = 0; i < rows.length; i++) {
        const row    = rows[i]
        const rowNum = i + 1

        // Valider email
        const email = (row.email || '').toLowerCase().trim()
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.errors.push({ row: rowNum, field: 'email', message: 'Email invalide' })
          results.skipped++
          continue
        }

        // Valider role
        const role = (row.role || 'employee').trim()
        if (row.role && !ROLES.includes(role)) {
          results.errors.push({ row: rowNum, field: 'role', message: `Rôle invalide : ${role}` })
          results.skipped++
          continue
        }

        // Valider department
        const department = (row.department || '').trim() || null
        if (department && !validDepartments.includes(department)) {
          results.errors.push({ row: rowNum, field: 'department', message: `Département invalide : ${department}` })
          results.skipped++
          continue
        }

        // Résoudre managerEmail → managerId (map lookup, sans query)
        let managerId = null
        if (row.managerEmail && row.managerEmail.trim()) {
          const mgrKey = row.managerEmail.toLowerCase().trim()
          const mgr    = userByEmail.get(mgrKey)
          if (mgr) {
            managerId = mgr._id
          } else {
            results.warnings.push({ row: rowNum, field: 'managerEmail', message: `Manager introuvable : "${row.managerEmail}" — managerId sera null` })
          }
        }

        // Résoudre sector / sectorName → sectorId (map lookup, sans query)
        let sectorId = null
        const sectorName = (row.sectorName || row.sector || '').trim()
        if (sectorName) {
          sectorId = sectorByName.get(sectorName) || null
        }

        const preview = {
          email,
          firstName:  row.firstName || null,
          lastName:   row.lastName  || null,
          role,
          department,
          managerId,
          sectorId,
        }

        if (dryRun) {
          preview.action = userByEmail.has(email) ? 'update' : 'create'
          results.preview.push(preview)
          continue
        }

        // Upsert
        const existingDoc = userByEmail.get(email)
        if (existingDoc) {
          const updates = {}
          if (row.firstName && row.firstName.trim()) updates.firstName  = row.firstName.trim()
          if (row.lastName  && row.lastName.trim())  updates.lastName   = row.lastName.trim()
          if (row.role      && ROLES.includes(role)) updates.role       = role
          if (department !== null)                   updates.department = department
          if (managerId !== null)                    updates.managerId  = managerId
          if (sectorId !== null)                     updates.sectorId   = sectorId
          try {
            await User.updateOne({ email }, { $set: updates })
            results.updated++
          } catch (e) {
            results.errors.push({ row: rowNum, field: null, message: e.message })
            results.skipped++
          }
        } else {
          if (!row.firstName || !row.firstName.trim() || !row.lastName || !row.lastName.trim()) {
            results.errors.push({
              row: rowNum,
              field: 'firstName/lastName',
              message: 'firstName et lastName requis pour la création',
            })
            results.skipped++
            continue
          }
          const tempPassword = crypto.randomBytes(8).toString('hex') // 16 chars hex
          const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS)
          const newUser = new User({
            email,
            firstName:          row.firstName.trim(),
            lastName:           row.lastName.trim(),
            role,
            department,
            managerId,
            sectorId,
            authSource:         'local',
            isActive:           true,
            passwordHash,
            mustChangePassword: true,
          })
          try {
            await newUser.save()
            results.created++
          } catch (e) {
            results.errors.push({ row: rowNum, field: null, message: e.message })
            results.skipped++
            continue
          }
          // Email de bienvenue — non-bloquant, isolé du résultat d'import
          notificationService.sendToUser(newUser._id, 'welcome_import', {
            firstName:   newUser.firstName,
            email:       newUser.email,
            tempPassword,
            loginUrl:    process.env.FRONTEND_URL || 'http://localhost:5173',
          }).catch(err => logger.error('[import welcome email]', { error: err.message }))
        }
      }

      res.json(results)
    } catch (err) {
      next(err)
    }
  },
)

module.exports = router
