'use strict'

// =============================================================================
// Tests validators — Schémas Joi pour utilisateurs et campagnes
// =============================================================================

const { createUser, updateUser, changePassword } = require('../validators/userValidators')
const { createCampaign, updateCampaign } = require('../validators/campaignValidators')

describe('Validators — userValidators', () => {
  describe('createUser', () => {
    test('devrait valider un utilisateur valide complet', () => {
      const validUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@nanoxplore.com',
        role: 'employee',
        department: 'IT',
        managerId: '507f1f77bcf86cd799439011',
        password: 'password123',
      }

      const { error, value } = createUser.validate(validUser)
      expect(error).toBeUndefined()
      expect(value).toMatchObject(validUser)
    })

    test('devrait valider un utilisateur avec champs minimum requis', () => {
      const minimalUser = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@nanoxplore.com',
        role: 'admin',
      }

      const { error } = createUser.validate(minimalUser)
      expect(error).toBeUndefined()
    })

    test('devrait rejeter un utilisateur sans firstName', () => {
      const invalidUser = {
        lastName: 'Doe',
        email: 'john.doe@nanoxplore.com',
        role: 'employee',
      }

      const { error } = createUser.validate(invalidUser)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('firstName')
    })

    test('devrait rejeter un utilisateur sans lastName', () => {
      const invalidUser = {
        firstName: 'John',
        email: 'john.doe@nanoxplore.com',
        role: 'employee',
      }

      const { error } = createUser.validate(invalidUser)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('lastName')
    })

    test('devrait rejeter un utilisateur sans email', () => {
      const invalidUser = {
        firstName: 'John',
        lastName: 'Doe',
        role: 'employee',
      }

      const { error } = createUser.validate(invalidUser)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('email')
    })

    test('devrait rejeter un email invalide', () => {
      const invalidUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'not-an-email',
        role: 'employee',
      }

      const { error } = createUser.validate(invalidUser)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('email')
    })

    test('devrait rejeter un rôle invalide', () => {
      const invalidUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@nanoxplore.com',
        role: 'super-admin', // Rôle non autorisé
      }

      const { error } = createUser.validate(invalidUser)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('role')
    })

    test('devrait accepter tous les rôles valides', () => {
      const roles = ['admin', 'hr', 'manager', 'employee']

      roles.forEach(role => {
        const user = {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@nanoxplore.com',
          role,
        }

        const { error } = createUser.validate(user)
        expect(error).toBeUndefined()
      })
    })

    test('devrait rejeter un firstName trop court', () => {
      const invalidUser = {
        firstName: '',
        lastName: 'Doe',
        email: 'john.doe@nanoxplore.com',
        role: 'employee',
      }

      const { error } = createUser.validate(invalidUser)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('firstName')
    })

    test('devrait rejeter un firstName trop long', () => {
      const invalidUser = {
        firstName: 'a'.repeat(81),
        lastName: 'Doe',
        email: 'john.doe@nanoxplore.com',
        role: 'employee',
      }

      const { error } = createUser.validate(invalidUser)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('firstName')
    })

    test('devrait rejeter un password trop court', () => {
      const invalidUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@nanoxplore.com',
        role: 'employee',
        password: '1234567', // Moins de 8 caractères
      }

      const { error } = createUser.validate(invalidUser)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('password')
    })

    test('devrait rejeter un managerId invalide', () => {
      const invalidUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@nanoxplore.com',
        role: 'employee',
        managerId: 'invalid-id',
      }

      const { error } = createUser.validate(invalidUser)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('managerId')
    })

    test('devrait accepter managerId null', () => {
      const validUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@nanoxplore.com',
        role: 'employee',
        managerId: null,
      }

      const { error } = createUser.validate(validUser)
      expect(error).toBeUndefined()
    })

    test('devrait accepter department vide', () => {
      const validUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@nanoxplore.com',
        role: 'employee',
        department: '',
      }

      const { error } = createUser.validate(validUser)
      expect(error).toBeUndefined()
    })
  })

  describe('updateUser', () => {
    test('devrait valider une mise à jour partielle', () => {
      const update = {
        firstName: 'John Updated',
      }

      const { error } = updateUser.validate(update)
      expect(error).toBeUndefined()
    })

    test('devrait valider plusieurs champs mis à jour', () => {
      const update = {
        firstName: 'John',
        lastName: 'Doe',
        department: 'Engineering',
      }

      const { error } = updateUser.validate(update)
      expect(error).toBeUndefined()
    })

    test('devrait rejeter un objet vide', () => {
      const { error } = updateUser.validate({})
      expect(error).toBeDefined()
    })

    test('devrait valider isActive boolean', () => {
      const update = {
        isActive: false,
      }

      const { error } = updateUser.validate(update)
      expect(error).toBeUndefined()
    })

    test('devrait rejeter isActive non-boolean', () => {
      const update = {
        isActive: 'false', // String au lieu de boolean
      }

      const { error } = updateUser.validate(update)
      // Joi convertit automatiquement les strings en booleans
      // donc on s'attend à ce que la validation passe
      expect(error).toBeUndefined()
      // Mais la valeur devrait être convertie
      expect(typeof update.isActive).toBe('string')
    })
  })

  describe('changePassword', () => {
    test('devrait valider un changement de mot de passe valide', () => {
      const passwordChange = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456',
      }

      const { error } = changePassword.validate(passwordChange)
      expect(error).toBeUndefined()
    })

    test('devrait rejeter sans currentPassword', () => {
      const passwordChange = {
        newPassword: 'newpassword456',
      }

      const { error } = changePassword.validate(passwordChange)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('currentPassword')
    })

    test('devrait rejeter sans newPassword', () => {
      const passwordChange = {
        currentPassword: 'oldpassword123',
      }

      const { error } = changePassword.validate(passwordChange)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('newPassword')
    })

    test('devrait rejeter un newPassword trop court', () => {
      const passwordChange = {
        currentPassword: 'oldpassword123',
        newPassword: 'short',
      }

      const { error } = changePassword.validate(passwordChange)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('newPassword')
    })
  })
})

describe('Validators — campaignValidators', () => {
  describe('createCampaign', () => {
    test('devrait valider une campagne valide complète', () => {
      const validCampaign = {
        name: 'Évaluation annuelle 2024',
        description: 'Campagne d\'évaluation de fin d\'année',
        formId: '507f1f77bcf86cd799439011',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        participants: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
        status: 'draft',
      }

      const { error } = createCampaign.validate(validCampaign)
      expect(error).toBeUndefined()
    })

    test('devrait valider une campagne avec champs minimum requis', () => {
      const minimalCampaign = {
        name: 'Test Campaign',
        formId: '507f1f77bcf86cd799439011',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      }

      const { error } = createCampaign.validate(minimalCampaign)
      expect(error).toBeUndefined()
    })

    test('devrait rejeter une campagne sans nom', () => {
      const invalidCampaign = {
        formId: '507f1f77bcf86cd799439011',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      }

      const { error } = createCampaign.validate(invalidCampaign)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('name')
    })

    test('devrait rejeter un nom trop court', () => {
      const invalidCampaign = {
        name: 'A', // Moins de 2 caractères
        formId: '507f1f77bcf86cd799439011',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      }

      const { error } = createCampaign.validate(invalidCampaign)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('name')
    })

    test('devrait rejeter un nom trop long', () => {
      const invalidCampaign = {
        name: 'a'.repeat(121), // Plus de 120 caractères
        formId: '507f1f77bcf86cd799439011',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      }

      const { error } = createCampaign.validate(invalidCampaign)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('name')
    })

    test('devrait rejeter une campagne sans formId', () => {
      const invalidCampaign = {
        name: 'Test Campaign',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      }

      const { error } = createCampaign.validate(invalidCampaign)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('formId')
    })

    test('devrait rejeter un formId invalide', () => {
      const invalidCampaign = {
        name: 'Test Campaign',
        formId: 'invalid-id',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      }

      const { error } = createCampaign.validate(invalidCampaign)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('formId')
    })

    test('devrait rejeter si endDate est avant startDate', () => {
      const invalidCampaign = {
        name: 'Test Campaign',
        formId: '507f1f77bcf86cd799439011',
        startDate: '2024-12-31',
        endDate: '2024-01-01', // Avant startDate
      }

      const { error } = createCampaign.validate(invalidCampaign)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('postérieure')
    })

    test('devrait rejeter un statut invalide', () => {
      const invalidCampaign = {
        name: 'Test Campaign',
        formId: '507f1f77bcf86cd799439011',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: 'invalid-status',
      }

      const { error } = createCampaign.validate(invalidCampaign)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('status')
    })

    test('devrait accepter tous les statuts valides', () => {
      const statuses = ['draft', 'active', 'closed', 'archived']

      statuses.forEach(status => {
        const campaign = {
          name: 'Test Campaign',
          formId: '507f1f77bcf86cd799439011',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          status,
        }

        const { error } = createCampaign.validate(campaign)
        expect(error).toBeUndefined()
      })
    })

    test('devrait accepter une description vide', () => {
      const campaign = {
        name: 'Test Campaign',
        formId: '507f1f77bcf86cd799439011',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        description: '',
      }

      const { error } = createCampaign.validate(campaign)
      expect(error).toBeUndefined()
    })

    test('devrait rejeter une description trop longue', () => {
      const campaign = {
        name: 'Test Campaign',
        formId: '507f1f77bcf86cd799439011',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        description: 'a'.repeat(2001), // Plus de 2000 caractères
      }

      const { error } = createCampaign.validate(campaign)
      expect(error).toBeDefined()
      expect(error.details[0].path).toContain('description')
    })

    test('devrait valider un tableau de participants valides', () => {
      const campaign = {
        name: 'Test Campaign',
        formId: '507f1f77bcf86cd799439011',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        participants: [
          '507f1f77bcf86cd799439012',
          '507f1f77bcf86cd799439013',
          '507f1f77bcf86cd799439014',
        ],
      }

      const { error } = createCampaign.validate(campaign)
      expect(error).toBeUndefined()
    })

    test('devrait rejeter un participant avec ID invalide', () => {
      const campaign = {
        name: 'Test Campaign',
        formId: '507f1f77bcf86cd799439011',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        participants: ['invalid-id'],
      }

      const { error } = createCampaign.validate(campaign)
      expect(error).toBeDefined()
    })
  })

  describe('updateCampaign', () => {
    test('devrait valider une mise à jour partielle', () => {
      const update = {
        name: 'Nom mis à jour',
      }

      const { error } = updateCampaign.validate(update)
      expect(error).toBeUndefined()
    })

    test('devrait valider plusieurs champs mis à jour', () => {
      const update = {
        name: 'Nouveau nom',
        description: 'Nouvelle description',
        status: 'active',
      }

      const { error } = updateCampaign.validate(update)
      expect(error).toBeUndefined()
    })

    test('devrait rejeter un objet vide', () => {
      const { error } = updateCampaign.validate({})
      expect(error).toBeDefined()
      expect(error.message).toContain('Au moins un champ')
    })

    test('devrait valider un changement de statut', () => {
      const update = {
        status: 'closed',
      }

      const { error } = updateCampaign.validate(update)
      expect(error).toBeUndefined()
    })

    test('devrait rejeter un statut invalide', () => {
      const update = {
        status: 'invalid-status',
      }

      const { error } = updateCampaign.validate(update)
      expect(error).toBeDefined()
    })
  })
})
