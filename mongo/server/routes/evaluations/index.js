'use strict'

// =============================================================================
// routes/evaluations/index.js — Routeur principal des évaluations
//
// Ce fichier monte toutes les sous-routes dans le bon ordre.
// IMPORTANT : les routes spécifiques (/history, /export, /bulk) sont
// déclarées AVANT les routes dynamiques (/:id) pour éviter les conflits.
// =============================================================================

const router = require('express').Router()

const { handleHistory, handleList, handleExport, handleDetail } = require('./queries')
const { handleCreate, handleUpdate, handleReassign, handleExpire } = require('./mutations')
const { handleBulkCreate, handleBulkAction } = require('./bulk')
const { handlePdf } = require('./pdf')

// Routes statiques en premier (ordre critique pour Express)
router.get('/history', handleHistory)
router.get('/export',  handleExport)
router.get('/',        handleList)

router.post('/bulk',  handleBulkCreate)
router.patch('/bulk', handleBulkAction)
router.post('/',      handleCreate)

// Routes dynamiques ensuite
router.get('/:id/pdf',        handlePdf)
router.patch('/:id/reassign', handleReassign)
router.get('/:id',            handleDetail)
router.patch('/:id',          handleUpdate)
router.post('/:id/expire',    handleExpire)

module.exports = router
