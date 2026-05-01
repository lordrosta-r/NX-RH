'use strict'

const jwt = require('jsonwebtoken')

// =============================================================================
// Tests — middleware/errorHandler.js
// =============================================================================

const { errorHandler } = require('../../middleware/errorHandler')

const makeRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json   = jest.fn().mockReturnValue(res)
  return res
}

describe('errorHandler', () => {
  let res

  beforeEach(() => {
    res = makeRes()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns 400 for Mongoose ValidationError', () => {
    const err = { name: 'ValidationError', errors: { email: { message: 'invalid email' } } }
    errorHandler(err, {}, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('invalid email') })
  })

  it('returns 400 for Mongoose CastError', () => {
    const err = { name: 'CastError', path: '_id', value: 'bad' }
    errorHandler(err, {}, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('_id') })
  })

  it('returns 409 for MongoDB duplicate key (code 11000)', () => {
    const err = { code: 11000, keyValue: { email: 'x@y.com' } }
    errorHandler(err, {}, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('email') })
  })

  it('returns 401 for JWT JsonWebTokenError', () => {
    const err = new jwt.JsonWebTokenError('invalid signature')
    errorHandler(err, {}, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide' })
  })

  it('returns 401 for JWT TokenExpiredError', () => {
    const err = new jwt.TokenExpiredError('expired', new Date())
    errorHandler(err, {}, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Session expirée' })
  })

  it('uses err.status when set', () => {
    const err = { status: 403, message: 'Forbidden' }
    errorHandler(err, {}, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' })
  })

  it('falls back to 500 for unknown errors', () => {
    const err = new Error('Unexpected failure')
    errorHandler(err, {}, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unexpected failure' })
  })
})
