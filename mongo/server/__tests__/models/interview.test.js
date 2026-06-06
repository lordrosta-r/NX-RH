'use strict'

// =============================================================================
// Tests — models/Interview.js
//
// Vérifie : exports, structure du schéma, index unique (campaignId, evaluateeId).
// Les tests nécessitant une connexion Mongoose sont séparés des tests statiques.
// =============================================================================

const { Schema } = require('mongoose')

describe('Interview model — module exports', () => {
  it('exporte bien Interview', () => {
    const { Interview } = require('../../models/Interview')
    expect(Interview).toBeDefined()
    expect(typeof Interview).toBe('function') // c'est un Model Mongoose
  })

  it('le modèle s\'appelle "Interview"', () => {
    const { Interview } = require('../../models/Interview')
    expect(Interview.modelName).toBe('Interview')
  })
})

describe('Interview model — champs du schéma', () => {
  let schemaPaths

  beforeAll(() => {
    const { Interview } = require('../../models/Interview')
    schemaPaths = Interview.schema.paths
  })

  it('a un champ campaignId requis', () => {
    expect(schemaPaths.campaignId).toBeDefined()
    expect(schemaPaths.campaignId.isRequired).toBe(true)
    expect(schemaPaths.campaignId.instance).toBe('ObjectId')
  })

  it('a un champ evaluateeId requis', () => {
    expect(schemaPaths.evaluateeId).toBeDefined()
    expect(schemaPaths.evaluateeId.isRequired).toBe(true)
    expect(schemaPaths.evaluateeId.instance).toBe('ObjectId')
  })

  it('a un champ managerId non requis (default null)', () => {
    expect(schemaPaths.managerId).toBeDefined()
    expect(schemaPaths.managerId.isRequired).toBeFalsy()
    expect(schemaPaths.managerId.instance).toBe('ObjectId')
  })

  it('a un champ evaluationIds tableau (default [])', () => {
    expect(schemaPaths['evaluationIds']).toBeDefined()
  })

  it('a les timestamps (createdAt, updatedAt)', () => {
    const { Interview } = require('../../models/Interview')
    const options = Interview.schema.options
    expect(options.timestamps).toBe(true)
  })

  it('n\'a pas de versionKey', () => {
    const { Interview } = require('../../models/Interview')
    const options = Interview.schema.options
    expect(options.versionKey).toBe(false)
  })
})

describe('Interview model — index unique (campaignId, evaluateeId)', () => {
  it('déclare bien un index unique composé { campaignId: 1, evaluateeId: 1 }', () => {
    const { Interview } = require('../../models/Interview')
    const indexes = Interview.schema.indexes()

    const uniqueIdx = indexes.find(([fields, opts]) => {
      return (
        fields.campaignId === 1 &&
        fields.evaluateeId === 1 &&
        opts.unique === true
      )
    })

    expect(uniqueIdx).toBeDefined()
  })
})

describe('Interview model — index simple sur campaignId et evaluateeId', () => {
  it('a un index sur campaignId', () => {
    const { Interview } = require('../../models/Interview')
    // Le champ campaignId est déclaré avec index: true dans le schéma
    expect(Interview.schema.paths.campaignId.options.index).toBe(true)
  })

  it('a un index sur evaluateeId', () => {
    const { Interview } = require('../../models/Interview')
    expect(Interview.schema.paths.evaluateeId.options.index).toBe(true)
  })
})

describe('Interview model — refs Mongoose', () => {
  it('campaignId ref "Campaign"', () => {
    const { Interview } = require('../../models/Interview')
    expect(Interview.schema.paths.campaignId.options.ref).toBe('Campaign')
  })

  it('evaluateeId ref "User"', () => {
    const { Interview } = require('../../models/Interview')
    expect(Interview.schema.paths.evaluateeId.options.ref).toBe('User')
  })

  it('managerId ref "User"', () => {
    const { Interview } = require('../../models/Interview')
    expect(Interview.schema.paths.managerId.options.ref).toBe('User')
  })
})
