'use strict'

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const respond = require('../utils/response');
const mobilityService = require('../services/mobilityService');

// GET /api/mobility — liste (HR/admin voit tout, employé voit les siennes)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await mobilityService.listRequests(req.user, req.query);
    return respond.paginated(res, result);
  } catch (err) { next(err); }
});

// POST /api/mobility — créer une demande
router.post('/', authenticate, async (req, res, next) => {
  try {
    const populated = await mobilityService.createRequest(req.body, req.user);
    return respond.created(res, populated);
  } catch (err) { next(err); }
});

// GET /api/mobility/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const request = await mobilityService.getRequestById(req.params.id, req.user);
    return respond.item(res, request);
  } catch (err) { next(err); }
});

// PATCH /api/mobility/:id — update statut (HR/admin) ou motivation (employee)
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const request = await mobilityService.updateRequest(req.params.id, req.body, req.user);
    return respond.item(res, request);
  } catch (err) { next(err); }
});

// DELETE /api/mobility/:id — annuler (owner si pending, admin toujours)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await mobilityService.deleteRequest(req.params.id, req.user);
    return respond.deleted(res);
  } catch (err) { next(err); }
});

module.exports = router;
