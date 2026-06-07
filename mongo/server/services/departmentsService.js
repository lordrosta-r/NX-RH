'use strict'

// =============================================================================
// services/departmentsService.js — Liste des départements gérée en DB
//
// Source : Config{key:'app.departments'}.value (tableau de chaînes).
// Repli  : constants.DEPARTMENTS (liste par défaut) si rien en base.
//
// Permet à un admin d'ajouter/retirer un département via l'UI sans redéploiement.
// =============================================================================

const Config = require('../models/Config')
const { DEPARTMENTS } = require('../config/constants')

const KEY = 'app.departments'

/** Retourne la liste des départements (DB si présente, sinon défaut). */
async function getDepartments() {
  try {
    const doc = await Config.findOne({ key: KEY }).lean()
    const list = doc?.value
    if (Array.isArray(list) && list.length) return list
  } catch (_) { /* repli sur le défaut */ }
  return [...DEPARTMENTS]
}

/**
 * Remplace la liste des départements (admin). Nettoie : chaînes uniques, non vides.
 * @param {string[]} list
 * @returns {Promise<string[]>}
 */
async function setDepartments(list) {
  if (!Array.isArray(list)) throw new Error('departments doit être un tableau')
  const cleaned = [...new Set(
    list.map(d => (typeof d === 'string' ? d.trim() : '')).filter(Boolean),
  )]
  if (!cleaned.length) throw new Error('La liste de départements ne peut pas être vide')
  await Config.findOneAndUpdate({ key: KEY }, { $set: { value: cleaned } }, { upsert: true })
  return cleaned
}

/** Vrai si `dept` est null/'' (autorisé) ou présent dans la liste courante. */
async function isValidDepartment(dept) {
  if (dept === null || dept === undefined || dept === '') return true
  const list = await getDepartments()
  return list.includes(dept)
}

module.exports = { getDepartments, setDepartments, isValidDepartment, KEY }
