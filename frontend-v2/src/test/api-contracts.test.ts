import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from './msw/server'

import { authApi } from '@/api/auth'
import { usersApi } from '@/api/users'
import { campaignsApi } from '@/api/campaigns'
import { evaluationsApi } from '@/api/evaluations'
import { formsApi } from '@/api/forms'
import { analyticsApi } from '@/api/analytics'
import { offboardingApi } from '@/api/offboarding'

describe('API contracts', () => {
  describe('authApi', () => {
    it('login appelle POST /api/auth/login', async () => {
      let capturedBody: unknown

      server.use(
        http.post('http://localhost:5050/api/auth/login', async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ user: { id: 'test' } })
        })
      )

      await authApi.login('test@test.com', 'pass', false)

      expect(capturedBody).toEqual({
        email: 'test@test.com',
        password: 'pass',
        remember: false,
      })
    })

    it('logout appelle POST /api/auth/logout', async () => {
      let called = false

      server.use(
        http.post('http://localhost:5050/api/auth/logout', () => {
          called = true
          return HttpResponse.json({ message: 'ok' })
        })
      )

      await authApi.logout()

      expect(called).toBe(true)
    })

    it('getMe appelle GET /api/auth/me', async () => {
      let called = false

      server.use(
        http.get('http://localhost:5050/api/auth/me', () => {
          called = true
          return HttpResponse.json({ user: { id: 'test' } })
        })
      )

      await authApi.getMe()

      expect(called).toBe(true)
    })

    it('updatePreferences appelle PATCH /api/auth/preferences', async () => {
      let capturedBody: unknown

      server.use(
        http.patch('http://localhost:5050/api/auth/preferences', async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({})
        })
      )

      await authApi.updatePreferences({
        locale: 'fr',
        theme: 'dark',
        notificationPrefs: { email: true },
      })

      expect(capturedBody).toEqual({
        locale: 'fr',
        theme: 'dark',
        notificationPrefs: { email: true },
      })
    })
  })

  describe('usersApi', () => {
    it('getUsers appelle GET /api/users avec les params', async () => {
      let searchParams: URLSearchParams | undefined

      server.use(
        http.get('http://localhost:5050/api/users', ({ request }) => {
          searchParams = new URL(request.url).searchParams
          return HttpResponse.json({ data: [], total: 0, page: 1, limit: 20 })
        })
      )

      await usersApi.getUsers({ q: 'test', role: 'employee', isActive: true })

      expect(searchParams?.get('q')).toBe('test')
      expect(searchParams?.get('role')).toBe('employee')
      expect(searchParams?.get('isActive')).toBe('true')
    })

    it('getUser appelle GET /api/users/user-1', async () => {
      let called = false

      server.use(
        http.get('http://localhost:5050/api/users/:id', () => {
          called = true
          return HttpResponse.json({ id: 'user-1' })
        })
      )

      await usersApi.getUser('user-1')

      expect(called).toBe(true)
    })

    it('createUser appelle POST /api/users', async () => {
      let capturedBody: unknown

      server.use(
        http.post('http://localhost:5050/api/users', async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ id: 'user-1' })
        })
      )

      await usersApi.createUser({ firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' })

      expect(capturedBody).toEqual({
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean@example.com',
      })
    })

    it('updateUser appelle PATCH /api/users/user-1', async () => {
      let capturedBody: unknown

      server.use(
        http.patch('http://localhost:5050/api/users/:id', async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ id: 'user-1' })
        })
      )

      await usersApi.updateUser('user-1', { firstName: 'Marie', isActive: false })

      expect(capturedBody).toEqual({ firstName: 'Marie', isActive: false })
    })

    it('deleteUser appelle DELETE /api/users/user-1', async () => {
      let called = false

      server.use(
        http.delete('http://localhost:5050/api/users/:id', () => {
          called = true
          return new HttpResponse(null, { status: 204 })
        })
      )

      await usersApi.deleteUser('user-1')

      expect(called).toBe(true)
    })

    it('offboard appelle POST /api/users/user-1/offboarding', async () => {
      let capturedBody: unknown

      server.use(
        http.post('http://localhost:5050/api/users/:id/offboarding', async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ success: true })
        })
      )

      await usersApi.offboard('user-1', { reason: 'resignation', lastDay: '2025-07-01' })

      expect(capturedBody).toEqual({
        reason: 'resignation',
        lastDay: '2025-07-01',
      })
    })

    it('anonymize appelle POST /api/users/user-1/anonymize', async () => {
      let called = false

      server.use(
        http.post('http://localhost:5050/api/users/:id/anonymize', () => {
          called = true
          return HttpResponse.json({ success: true })
        })
      )

      await usersApi.anonymize('user-1')

      expect(called).toBe(true)
    })

    it('exportGdpr appelle GET /api/users/user-1/gdpr-export', async () => {
      let called = false

      server.use(
        http.get('http://localhost:5050/api/users/:id/gdpr-export', () => {
          called = true
          return new HttpResponse(new Blob(['{}'], { type: 'application/json' }))
        })
      )

      await usersApi.exportGdpr('user-1')

      expect(called).toBe(true)
    })
  })

  describe('campaignsApi', () => {
    it('getCampaigns appelle GET /api/campaigns avec status=active', async () => {
      let searchParams: URLSearchParams | undefined

      server.use(
        http.get('http://localhost:5050/api/campaigns', ({ request }) => {
          searchParams = new URL(request.url).searchParams
          return HttpResponse.json({ data: [], total: 0, page: 1, limit: 20 })
        })
      )

      await campaignsApi.getCampaigns({ status: 'active' })

      expect(searchParams?.get('status')).toBe('active')
    })

    it('createCampaign appelle POST /api/campaigns', async () => {
      let capturedBody: unknown

      server.use(
        http.post('http://localhost:5050/api/campaigns', async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ _id: 'c-1' })
        })
      )

      await campaignsApi.createCampaign({ name: 'Campagne 1' })

      expect(capturedBody).toEqual({ name: 'Campagne 1' })
    })

    it('activateCampaign appelle POST /api/campaigns/c-1/activate', async () => {
      let called = false

      server.use(
        http.post('http://localhost:5050/api/campaigns/:id/activate', () => {
          called = true
          return HttpResponse.json({ success: true })
        })
      )

      await campaignsApi.activateCampaign('c-1')

      expect(called).toBe(true)
    })

    it('closeCampaign appelle POST /api/campaigns/c-1/close', async () => {
      let called = false

      server.use(
        http.post('http://localhost:5050/api/campaigns/:id/close', () => {
          called = true
          return HttpResponse.json({ success: true })
        })
      )

      await campaignsApi.closeCampaign('c-1')

      expect(called).toBe(true)
    })

    it('archiveCampaign appelle POST /api/campaigns/c-1/archive', async () => {
      let called = false

      server.use(
        http.post('http://localhost:5050/api/campaigns/:id/archive', () => {
          called = true
          return HttpResponse.json({ success: true })
        })
      )

      await campaignsApi.archiveCampaign('c-1')

      expect(called).toBe(true)
    })

    it('cloneCampaign appelle POST /api/campaigns/c-1/clone', async () => {
      let called = false

      server.use(
        http.post('http://localhost:5050/api/campaigns/:id/clone', () => {
          called = true
          return HttpResponse.json({ _id: 'c-clone' })
        })
      )

      await campaignsApi.cloneCampaign('c-1')

      expect(called).toBe(true)
    })

    it('getCampaignAnalytics appelle GET /api/campaigns/c-1/analytics', async () => {
      let called = false

      server.use(
        http.get('http://localhost:5050/api/campaigns/:id/analytics', () => {
          called = true
          return HttpResponse.json({ campaignId: 'c-1' })
        })
      )

      await campaignsApi.getCampaignAnalytics('c-1')

      expect(called).toBe(true)
    })
  })

  describe('evaluationsApi', () => {
    it('getEvaluations appelle GET /api/evaluations avec evaluateeId=user-1', async () => {
      let searchParams: URLSearchParams | undefined

      server.use(
        http.get('http://localhost:5050/api/evaluations', ({ request }) => {
          searchParams = new URL(request.url).searchParams
          return HttpResponse.json({ data: [], total: 0, page: 1, limit: 20 })
        })
      )

      await evaluationsApi.getEvaluations({ evaluateeId: 'user-1' })

      expect(searchParams?.get('evaluateeId')).toBe('user-1')
    })

    it('updateEvaluation appelle PATCH /api/evaluations/e-1', async () => {
      let capturedBody: unknown

      server.use(
        http.patch('http://localhost:5050/api/evaluations/:id', async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ _id: 'e-1' })
        })
      )

      await evaluationsApi.updateEvaluation('e-1', { status: 'in_progress' })

      expect(capturedBody).toEqual({ status: 'in_progress' })
    })

    it('submitEvaluation appelle POST /api/evaluations/e-1/submit', async () => {
      let called = false

      server.use(
        http.post('http://localhost:5050/api/evaluations/:id/submit', () => {
          called = true
          return HttpResponse.json({ _id: 'e-1' })
        })
      )

      await evaluationsApi.submitEvaluation('e-1')

      expect(called).toBe(true)
    })

    it('signEvaluation appelle POST /api/evaluations/e-1/sign', async () => {
      let called = false

      server.use(
        http.post('http://localhost:5050/api/evaluations/:id/sign', () => {
          called = true
          return HttpResponse.json({ _id: 'e-1' })
        })
      )

      await evaluationsApi.signEvaluation('e-1')

      expect(called).toBe(true)
    })

    it('validateEvaluation appelle POST /api/evaluations/e-1/validate', async () => {
      let called = false

      server.use(
        http.post('http://localhost:5050/api/evaluations/:id/validate', () => {
          called = true
          return HttpResponse.json({ _id: 'e-1' })
        })
      )

      await evaluationsApi.validateEvaluation('e-1')

      expect(called).toBe(true)
    })
  })

  describe('formsApi', () => {
    it('getForms appelle GET /api/forms avec limit=100', async () => {
      let searchParams: URLSearchParams | undefined

      server.use(
        http.get('http://localhost:5050/api/forms', ({ request }) => {
          searchParams = new URL(request.url).searchParams
          return HttpResponse.json({ data: [], total: 0, page: 1, limit: 20 })
        })
      )

      await formsApi.getForms({ limit: 100 })

      expect(searchParams?.get('limit')).toBe('100')
    })

    it('freezeForm appelle POST /api/forms/f-1/freeze', async () => {
      let called = false

      server.use(
        http.post('http://localhost:5050/api/forms/:id/freeze', () => {
          called = true
          return HttpResponse.json({ success: true })
        })
      )

      await formsApi.freezeForm('f-1')

      expect(called).toBe(true)
    })

    it('unfreezeForm appelle POST /api/forms/f-1/unfreeze', async () => {
      let called = false

      server.use(
        http.post('http://localhost:5050/api/forms/:id/unfreeze', () => {
          called = true
          return HttpResponse.json({ success: true })
        })
      )

      await formsApi.unfreezeForm('f-1')

      expect(called).toBe(true)
    })

    it('cloneForm appelle POST /api/forms/f-1/clone', async () => {
      let called = false

      server.use(
        http.post('http://localhost:5050/api/forms/:id/clone', () => {
          called = true
          return HttpResponse.json({ _id: 'f-clone' })
        })
      )

      await formsApi.cloneForm('f-1')

      expect(called).toBe(true)
    })

    it('exportForm appelle GET /api/forms/f-1/export', async () => {
      let called = false

      server.use(
        http.get('http://localhost:5050/api/forms/:id/export', () => {
          called = true
          return new HttpResponse(new Blob(['{}'], { type: 'application/json' }))
        })
      )

      await formsApi.exportForm('f-1')

      expect(called).toBe(true)
    })
  })

  describe('analyticsApi', () => {
    it('getSummary appelle GET /api/analytics/summary', async () => {
      let called = false

      server.use(
        http.get('http://localhost:5050/api/analytics/summary', () => {
          called = true
          return HttpResponse.json({ totalEvaluations: 1 })
        })
      )

      await analyticsApi.getSummary()

      expect(called).toBe(true)
    })

    it('getCampaignAnalytics appelle GET /api/analytics/campaigns/c-1', async () => {
      let called = false

      server.use(
        http.get('http://localhost:5050/api/analytics/campaigns/:id', () => {
          called = true
          return HttpResponse.json({ campaignId: 'c-1' })
        })
      )

      await analyticsApi.getCampaignAnalytics('c-1')

      expect(called).toBe(true)
    })
  })

  describe('offboardingApi', () => {
    it('getOffboardings appelle GET /api/offboarding', async () => {
      let called = false

      server.use(
        http.get('http://localhost:5050/api/offboarding', () => {
          called = true
          return HttpResponse.json({ data: [], total: 0 })
        })
      )

      await offboardingApi.getOffboardings()

      expect(called).toBe(true)
    })

    it('createOffboarding appelle POST /api/offboarding', async () => {
      let capturedBody: unknown

      server.use(
        http.post('http://localhost:5050/api/offboarding', async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ id: 'off-1' })
        })
      )

      await offboardingApi.createOffboarding({
        userId: 'user-1',
        reason: 'resignation',
        lastDay: '2025-07-01',
      })

      expect(capturedBody).toEqual({
        userId: 'user-1',
        reason: 'resignation',
        lastDay: '2025-07-01',
      })
    })

    it('changeStatus appelle PATCH /api/offboarding/off-1/status', async () => {
      let capturedBody: unknown

      server.use(
        http.patch('http://localhost:5050/api/offboarding/:id/status', async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ id: 'off-1' })
        })
      )

      await offboardingApi.changeStatus('off-1', 'completed')

      expect(capturedBody).toEqual({ status: 'completed' })
    })

    it('toggleChecklistItem appelle PATCH /api/offboarding/off-1/checklist/2', async () => {
      let called = false

      server.use(
        http.patch('http://localhost:5050/api/offboarding/:id/checklist/:index', () => {
          called = true
          return HttpResponse.json({ id: 'off-1' })
        })
      )

      await offboardingApi.toggleChecklistItem('off-1', 2)

      expect(called).toBe(true)
    })
  })
})
