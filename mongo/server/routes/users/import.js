'use strict'

// =============================================================================
// routes/users/import.js — Import CSV / JSON d'utilisateurs
//
// POST /api/users/import?dryRun=true|false
//   Corps : application/json (tableau) OU text/csv / text/plain (CSV)
//   Colonnes CSV / champs JSON : firstName, lastName, email, role, department,
//                                managerEmail, sectorName
//
// Rôles autorisés : admin, hr (déclaré dans index.js)
// =============================================================================

const express = require('express')
const crypto  = require('crypto')
const bcrypt  = require('bcrypt')
const router  = express.Router()

const User   = require('../../models/User')
const Sector = require('../../models/Sector')
const { ROLES, DEPARTMENTS, BCRYPT_ROUNDS } = require('../../config/constants')

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
        if (department && !DEPARTMENTS.includes(department)) {
          results.errors.push({ row: rowNum, field: 'department', message: `Département invalide : ${department}` })
          results.skipped++
          continue
        }

        // Résoudre managerEmail → managerId
        let managerId = null
        if (row.managerEmail && row.managerEmail.trim()) {
          const mgr = await User.findOne(
            { email: row.managerEmail.toLowerCase().trim() },
            '_id',
          ).lean()
          if (mgr) {
            managerId = mgr._id
          } else {
            results.warnings.push({ row: rowNum, field: 'managerEmail', message: `Manager introuvable : "${row.managerEmail}" — managerId sera null` })
          }
        }

        // Résoudre sectorName → sectorId
        let sectorId = null
        if (row.sectorName && row.sectorName.trim()) {
          const sec = await Sector.findOne({ name: row.sectorName.trim() }, '_id').lean()
          if (sec) sectorId = sec._id
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
          const existing   = await User.findOne({ email }, '_id').lean()
          preview.action   = existing ? 'update' : 'create'
          results.preview.push(preview)
          continue
        }

        // Upsert
        const existing = await User.findOne({ email })
        if (existing) {
          if (row.firstName && row.firstName.trim()) existing.firstName = row.firstName.trim()
          if (row.lastName  && row.lastName.trim())  existing.lastName  = row.lastName.trim()
          if (row.role      && ROLES.includes(role)) existing.role      = role
          if (department !== null)                   existing.department = department
          if (managerId !== null)                    existing.managerId  = managerId
          if (sectorId !== null)                     existing.sectorId   = sectorId
          try {
            await existing.save()
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
          const randomPw     = crypto.randomBytes(16).toString('hex')
          const passwordHash = await bcrypt.hash(randomPw, BCRYPT_ROUNDS)
          const newUser = new User({
            email,
            firstName:    row.firstName.trim(),
            lastName:     row.lastName.trim(),
            role,
            department,
            managerId,
            sectorId,
            authSource:   'local',
            isActive:     true,
            passwordHash,
          })
          try {
            await newUser.save()
            results.created++
          } catch (e) {
            results.errors.push({ row: rowNum, field: null, message: e.message })
            results.skipped++
          }
        }
      }

      res.json(results)
    } catch (err) {
      next(err)
    }
  },
)

module.exports = router
