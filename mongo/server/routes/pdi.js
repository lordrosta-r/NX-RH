'use strict'

// =============================================================================
// routes/pdi.js — Routes REST pour les Plans de Développement Individuel
// =============================================================================

const router      = require('express').Router()
const pdiService  = require('../services/pdiService')
const apiResponse = require('../utils/apiResponse')

// GET /api/pdi — liste filtrée par rôle
router.get('/', async (req, res, next) => {
  try {
    const pdis = await pdiService.listPDIs(req.query, req.user.id, req.user.role)
    return apiResponse.success(res, pdis)
  } catch (err) { next(err) }
})

// POST /api/pdi — créer un PDI
router.post('/', async (req, res, next) => {
  try {
    const pdi = await pdiService.createPDI(req.body, req.user.id)
    return apiResponse.created(res, pdi)
  } catch (err) { next(err) }
})

// GET /api/pdi/:id — détail d'un PDI
router.get('/:id', async (req, res, next) => {
  try {
    const pdi = await pdiService.getPDIById(req.params.id, req.user.id, req.user.role)
    return apiResponse.success(res, pdi)
  } catch (err) { next(err) }
})

// POST /api/pdi/:id/actions — ajouter une action
router.post('/:id/actions', async (req, res, next) => {
  try {
    const pdi = await pdiService.addAction(req.params.id, req.body, req.user.id)
    return apiResponse.success(res, pdi)
  } catch (err) { next(err) }
})

// PATCH /api/pdi/:id/actions/:actionId — mettre à jour une action
router.patch('/:id/actions/:actionId', async (req, res, next) => {
  try {
    const pdi = await pdiService.updateAction(
      req.params.id,
      req.params.actionId,
      req.body,
      req.user.id,
    )
    return apiResponse.success(res, pdi)
  } catch (err) { next(err) }
})

// POST /api/pdi/:id/sign — signer le PDI
router.post('/:id/sign', async (req, res, next) => {
  try {
    // Le rôle de signature est déduit du rôle de l'utilisateur connecté
    // (employee → signe côté employé, manager/admin/hr → côté manager)
    const signingRole = req.user.role === 'employee' ? 'employee' : 'manager'
    const pdi = await pdiService.signPDI(req.params.id, req.user.id, signingRole)
    return apiResponse.success(res, pdi)
  } catch (err) { next(err) }
})

module.exports = router
