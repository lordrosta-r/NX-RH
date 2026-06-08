'use strict'

// =============================================================================
// Unit tests — services/campaignService.js (collecte des formulaires managers)
// Couvre : requestForms / cancelFormRequest / submitFormRequest /
//          decideFormRequest / getMyFormRequests
// Mocked: ../../models (Campaign, Form, User), ./inAppNotificationService
// =============================================================================

const mongoose = require('mongoose')

jest.mock('../../models', () => ({
  Campaign:   { findById: jest.fn(), find: jest.fn() },
  Form:       { findById: jest.fn() },
  User:       { find: jest.fn(), findById: jest.fn() },
  Evaluation: { aggregate: jest.fn() },
  CAMPAIGN_TRANSITIONS: { draft: ['active'], active: ['closed'], closed: ['archived'], archived: [] },
}))

jest.mock('../../services/inAppNotificationService', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}))

const { Campaign, Form, User } = require('../../models')
const inApp = require('../../services/inAppNotificationService')
const {
  requestForms,
  cancelFormRequest,
  submitFormRequest,
  decideFormRequest,
  getMyFormRequests,
} = require('../../services/campaignService')

const CAMP   = '507f1f77bcf86cd799439011'
const MGR_A  = '507f1f77bcf86cd799439021'
const MGR_B  = '507f1f77bcf86cd799439022'
const FORM_1 = '507f1f77bcf86cd799439031'

// Construit un doc Campaign mocké : .populate() se renvoie lui-même, .save() résout.
function campaignDoc(overrides = {}) {
  const doc = {
    _id: CAMP,
    name: 'Campagne 2026',
    status: 'draft',
    createdBy: '507f1f77bcf86cd799439099',
    formRequests: [],
    formIds: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  doc.populate = jest.fn().mockReturnValue(doc)
  return doc
}

function leanChain(value) {
  return { lean: jest.fn().mockResolvedValue(value) }
}

beforeEach(() => { jest.clearAllMocks() })

// ── requestForms ────────────────────────────────────────────────────────────
describe('campaignService — requestForms()', () => {
  test('ajoute des requêtes pending (dédoublonnées) et notifie les managers', async () => {
    const doc = campaignDoc({
      formRequests: [{ managerId: MGR_A, status: 'pending' }], // déjà sollicité
    })
    Campaign.findById.mockReturnValue(doc)
    User.find.mockReturnValue(leanChain([
      { _id: MGR_A, firstName: 'A', lastName: 'A' },
      { _id: MGR_B, firstName: 'B', lastName: 'B' },
    ]))

    const res = await requestForms(CAMP, [MGR_A, MGR_B])

    expect(res.requested).toEqual([MGR_B])          // MGR_A déjà présent → ignoré
    expect(doc.save).toHaveBeenCalledTimes(1)
    expect(inApp.createNotification).toHaveBeenCalledTimes(1)
    expect(inApp.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: MGR_B, type: 'campaign_form_request' }),
    )
  })

  test('refuse si la campagne n\'est pas en brouillon', async () => {
    Campaign.findById.mockReturnValue(campaignDoc({ status: 'active' }))
    User.find.mockReturnValue(leanChain([{ _id: MGR_A }]))
    await expect(requestForms(CAMP, [MGR_A])).rejects.toMatchObject({ status: 409 })
  })

  test('refuse un tableau vide', async () => {
    await expect(requestForms(CAMP, [])).rejects.toMatchObject({ status: 400 })
  })
})

// ── cancelFormRequest ────────────────────────────────────────────────────────
describe('campaignService — cancelFormRequest()', () => {
  test('retire la demande ciblant le manager', async () => {
    const doc = campaignDoc({ formRequests: [{ managerId: MGR_A, status: 'pending' }] })
    Campaign.findById.mockReturnValue(doc)

    await cancelFormRequest(CAMP, MGR_A)

    expect(doc.formRequests).toHaveLength(0)
    expect(doc.save).toHaveBeenCalled()
  })

  test('404 si aucune demande', async () => {
    Campaign.findById.mockReturnValue(campaignDoc({ formRequests: [] }))
    await expect(cancelFormRequest(CAMP, MGR_A)).rejects.toMatchObject({ status: 404 })
  })
})

// ── submitFormRequest ────────────────────────────────────────────────────────
describe('campaignService — submitFormRequest()', () => {
  test('attache le formulaire du manager et passe en submitted', async () => {
    const req = { managerId: MGR_A, status: 'pending', formId: null }
    const doc = campaignDoc({ formRequests: [req] })
    Campaign.findById.mockReturnValue(doc)
    Form.findById.mockReturnValue(leanChain({ _id: FORM_1, title: 'Form Nathan', formType: 'objectives', createdBy: MGR_A }))
    User.findById.mockReturnValue(leanChain({ _id: MGR_A, firstName: 'Nathan', lastName: 'D' }))

    const res = await submitFormRequest(CAMP, FORM_1, MGR_A)

    expect(res.status).toBe('submitted')
    expect(req.status).toBe('submitted')
    expect(req.formId).toBe(FORM_1)
    expect(inApp.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'campaign_form_submitted' }),
    )
  })

  test('403 si le formulaire n\'appartient pas au manager (anti-IDOR)', async () => {
    const doc = campaignDoc({ formRequests: [{ managerId: MGR_A, status: 'pending' }] })
    Campaign.findById.mockReturnValue(doc)
    Form.findById.mockReturnValue(leanChain({ _id: FORM_1, createdBy: MGR_B })) // autre proprio

    await expect(submitFormRequest(CAMP, FORM_1, MGR_A)).rejects.toMatchObject({ status: 403 })
  })

  test('403 si aucune demande ne cible le manager', async () => {
    const doc = campaignDoc({ formRequests: [] })
    Campaign.findById.mockReturnValue(doc)
    Form.findById.mockReturnValue(leanChain({ _id: FORM_1, createdBy: MGR_A }))
    await expect(submitFormRequest(CAMP, FORM_1, MGR_A)).rejects.toMatchObject({ status: 403 })
  })
})

// ── decideFormRequest ────────────────────────────────────────────────────────
describe('campaignService — decideFormRequest()', () => {
  test('accepted : le formId rejoint formIds', async () => {
    const req = { managerId: MGR_A, status: 'submitted', formId: FORM_1 }
    const doc = campaignDoc({ formRequests: [req], formIds: [] })
    Campaign.findById.mockReturnValue(doc)
    Form.findById.mockReturnValue(leanChain({ _id: FORM_1, formType: 'objectives' }))

    const res = await decideFormRequest(CAMP, MGR_A, 'accepted')

    expect(res.status).toBe('accepted')
    expect(doc.formIds.map(String)).toContain(FORM_1)
    expect(inApp.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'campaign_form_decision' }),
    )
  })

  test('declined : ne touche pas formIds', async () => {
    const req = { managerId: MGR_A, status: 'submitted', formId: FORM_1 }
    const doc = campaignDoc({ formRequests: [req], formIds: [] })
    Campaign.findById.mockReturnValue(doc)

    const res = await decideFormRequest(CAMP, MGR_A, 'declined')

    expect(res.status).toBe('declined')
    expect(doc.formIds).toHaveLength(0)
  })

  test('409 si le manager n\'a pas encore soumis', async () => {
    const doc = campaignDoc({ formRequests: [{ managerId: MGR_A, status: 'pending', formId: null }] })
    Campaign.findById.mockReturnValue(doc)
    await expect(decideFormRequest(CAMP, MGR_A, 'accepted')).rejects.toMatchObject({ status: 409 })
  })
})

// ── getMyFormRequests ────────────────────────────────────────────────────────
describe('campaignService — getMyFormRequests()', () => {
  test('mappe les demandes ciblant le manager', async () => {
    Campaign.find.mockReturnValue(leanChain([
      {
        _id: CAMP, name: 'Campagne 2026', status: 'draft',
        formRequests: [{ managerId: MGR_A, status: 'pending', formId: null, requestedAt: new Date() }],
      },
    ]))

    const rows = await getMyFormRequests(MGR_A)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ campaignId: CAMP, campaignName: 'Campagne 2026', status: 'pending' })
  })

  test('ID invalide → 400', async () => {
    await expect(getMyFormRequests('pas-un-id')).rejects.toMatchObject({ status: 400 })
  })

  test('les fixtures utilisent des ObjectId valides', () => {
    for (const id of [CAMP, MGR_A, MGR_B, FORM_1]) {
      expect(mongoose.isValidObjectId(id)).toBe(true)
    }
  })
})
