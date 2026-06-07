'use strict'

// =============================================================================
// services/formCategoriesService.js — Catégories de formulaires gérées en DB
//
// Source : Config{key:'app.formCategories'}.value (tableau { id, label, types? }).
// Repli  : constants.FORM_CATEGORIES (liste par défaut) si rien en base.
//
// Permet à un admin/RH d'ajouter une catégorie via l'UI sans redéploiement.
// Une catégorie personnalisée a un `types` vide → les formulaires associés
// utilisent le formType générique 'custom'.
// =============================================================================

const Config = require('../models/Config')
const { FORM_CATEGORIES } = require('../config/constants')

const KEY = 'app.formCategories'

/** slugifie un label en id stable (a-z0-9 + tirets). */
function slugify(label) {
  return String(label)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Normalise une entrée brute en { id, label, types }. */
function normalize(cat) {
  if (!cat || typeof cat !== 'object') return null
  const label = typeof cat.label === 'string' ? cat.label.trim() : ''
  if (!label) return null
  const id = (typeof cat.id === 'string' && cat.id.trim()) || slugify(label)
  if (!id) return null
  const types = Array.isArray(cat.types)
    ? cat.types.filter((t) => typeof t === 'string' && t.trim())
    : []
  return { id, label, types }
}

/** Retourne la liste des catégories (DB si présente, sinon défaut). */
async function getCategories() {
  try {
    const doc = await Config.findOne({ key: KEY }).lean()
    const list = doc?.value
    if (Array.isArray(list) && list.length) {
      return list.map(normalize).filter(Boolean)
    }
  } catch (_) {
    /* repli sur le défaut */
  }
  return FORM_CATEGORIES.map((c) => ({ ...c }))
}

/**
 * Remplace la liste des catégories (admin/RH). Nettoie : ids uniques, labels non vides.
 * @param {Array<{id?:string,label:string,types?:string[]}>} list
 */
async function setCategories(list) {
  if (!Array.isArray(list)) throw new Error('categories doit être un tableau')
  const seen = new Set()
  const cleaned = []
  for (const raw of list) {
    const cat = normalize(raw)
    if (!cat || seen.has(cat.id)) continue
    seen.add(cat.id)
    cleaned.push(cat)
  }
  if (!cleaned.length) throw new Error('La liste de catégories ne peut pas être vide')
  await Config.findOneAndUpdate({ key: KEY }, { $set: { value: cleaned } }, { upsert: true })
  return cleaned
}

/**
 * Ajoute une catégorie personnalisée (label) et retourne la liste complète.
 * Idempotent : si la catégorie existe déjà, on renvoie simplement la liste
 * courante (l'UI la sélectionnera) plutôt que d'échouer.
 */
async function addCategory(label) {
  const cat = normalize({ label })
  if (!cat) throw new Error('Le label de catégorie est requis')
  const list = await getCategories()
  if (list.some((c) => c.id === cat.id)) return list
  return setCategories([...list, cat])
}

/** Vrai si `cat` est null/'' (autorisé) ou présent dans la liste courante. */
async function isValidCategory(cat) {
  if (cat === null || cat === undefined || cat === '') return true
  const list = await getCategories()
  return list.some((c) => c.id === cat)
}

module.exports = { getCategories, setCategories, addCategory, isValidCategory, KEY }
