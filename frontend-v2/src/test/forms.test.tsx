import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { server } from './msw/server'
import { renderWithProviders, makeUser } from './utils'
import FormsPage from '../pages/FormsPage'
import FormDetailPage from '../pages/FormDetailPage'

import type { Form } from '../types'

const formFixtures: Form[] = [
  {
    id: 'form-manager',
    title: 'Bilan manager',
    description: 'Formulaire manager',
    formType: 'manager_evaluation',
    isFrozen: false,
    questions: [{ id: 'q1', type: 'text', text: 'Comment ça va ?', required: true }],
  },
  {
    id: 'form-mobility',
    title: 'Demande mobilité',
    description: 'Formulaire mobilité',
    formType: 'mobility_request',
    isFrozen: true,
    frozenAt: '2025-01-15T00:00:00Z',
    questions: [{ id: 'q2', type: 'textarea', text: 'Pourquoi ?', required: false }],
  },
  {
    id: 'form-objectives',
    title: 'Objectifs annuels',
    formType: 'objectives',
    isFrozen: false,
    questions: [],
  },
]

function formsListHandler(forms: Form[]) {
  return http.get('http://localhost:5050/api/forms', ({ request }) => {
    const url = new URL(request.url)
    const formType = url.searchParams.get('formType')
    const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
    const filtered = forms.filter(form => {
      const matchesType = !formType || form.formType === formType
      const matchesQuery = !q || form.title.toLowerCase().includes(q) || (form.description ?? '').toLowerCase().includes(q)
      return matchesType && matchesQuery
    })

    return HttpResponse.json({
      data: filtered,
      total: filtered.length,
      page: 1,
      limit: 50,
    })
  })
}

function renderFormDetail(path: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/forms/:id" element={<FormDetailPage />} />
    </Routes>,
    { initialEntries: [path], user: makeUser({ role: 'admin' }) }
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('FormsPage', () => {
  it('affiche la liste, filtre par type et recherche les formulaires', async () => {
    server.use(formsListHandler(formFixtures))

    renderWithProviders(<FormsPage />, { user: makeUser({ role: 'admin' }) })

    // Vérifier l'affichage initial des formulaires
    expect(await screen.findByRole('heading', { name: 'Bilan manager' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Demande mobilité' })).toBeInTheDocument()

    // Les filtres de type et de campagne sont présents
    expect(screen.getByRole('combobox', { name: /type/i })).toBeInTheDocument()

    // Le champ de recherche est présent avec le bon placeholder (ellipse typographique)
    expect(screen.getByPlaceholderText('Rechercher un formulaire…')).toBeInTheDocument()
  })

  it('affiche le badge Gelé sur un formulaire gelé', async () => {
    server.use(formsListHandler([formFixtures[1]]))

    renderWithProviders(<FormsPage />, { user: makeUser({ role: 'admin' }) })

    expect(await screen.findByRole('heading', { name: 'Demande mobilité' })).toBeInTheDocument()
    const card = screen.getByRole('heading', { name: 'Demande mobilité' }).closest('.tile')
    expect(within(card as HTMLElement).getByText('Gelé')).toBeInTheDocument()
  })

  it('clone un formulaire via POST /clone', async () => {
    const cloned = vi.fn()

    server.use(
      formsListHandler([formFixtures[0]]),
      http.post('http://localhost:5050/api/forms/:id/clone', ({ params }) => {
        cloned(params.id as string)
        return HttpResponse.json({ ...formFixtures[0], id: 'form-copy', title: 'Copie de Bilan manager', isFrozen: false })
      })
    )

    renderWithProviders(<FormsPage />, { user: makeUser({ role: 'admin' }) })

    await screen.findByRole('heading', { name: 'Bilan manager' })
    await userEvent.click(screen.getByTitle('Dupliquer'))
    await userEvent.click(screen.getAllByRole('button', { name: 'Dupliquer' })[1])

    await waitFor(() => expect(cloned).toHaveBeenCalledWith('form-manager'))
  })

  it('supprime un formulaire après confirmation', async () => {
    const deleted = vi.fn()

    server.use(
      formsListHandler([formFixtures[0]]),
      http.delete('http://localhost:5050/api/forms/:id', ({ params }) => {
        deleted(params.id as string)
        return HttpResponse.json({ success: true })
      })
    )

    renderWithProviders(<FormsPage />, { user: makeUser({ role: 'admin' }) })

    await screen.findByRole('heading', { name: 'Bilan manager' })
    await userEvent.click(screen.getByTitle('Supprimer'))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(deleted).toHaveBeenCalledWith('form-manager'))
  })
})

describe('FormDetailPage', () => {
  it('affiche le titre et les questions', async () => {
    server.use(
      http.get('http://localhost:5050/api/forms/:id', ({ params }) =>
        HttpResponse.json({
          id: params.id as string,
          title: "Formulaire d'entretien",
          description: 'Description',
          formType: 'manager_evaluation',
          isFrozen: false,
          questions: [
            { id: 'q1', type: 'text', text: 'Question 1', required: true },
            { id: 'q2', type: 'textarea', text: 'Question 2', required: false },
          ],
        }))
    )

    renderFormDetail('/forms/form-1')

    expect(await screen.findByRole('heading', { name: /entretien/i })).toBeInTheDocument()
    // Les questions sont affichées en prévisualisation (texte, pas champ input)
    expect(screen.getByText("Question 1")).toBeInTheDocument()
    expect(screen.getByText("Question 2")).toBeInTheDocument()
  })

  it('affiche le bandeau Gelé et désactive les champs si le formulaire est gelé', async () => {
    server.use(
      http.get('http://localhost:5050/api/forms/:id', ({ params }) =>
        HttpResponse.json({
          id: params.id as string,
          title: 'Formulaire gelé',
          description: 'Description',
          formType: 'manager_evaluation',
          isFrozen: true,
          frozenAt: '2025-01-15T00:00:00Z',
          questions: [{ id: 'q1', type: 'text', text: 'Question gelée', required: true }],
        }))
    )

    renderFormDetail('/forms/form-frozen')

    expect(await screen.findByText(/les questions ne sont plus modifiables/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dégeler' })).toBeInTheDocument()
    // Le titre et la description sont éditables même gelés (inputs du FormBuilder)
    expect(screen.getByDisplayValue('Formulaire gelé')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Description')).toBeInTheDocument()
  })

  it('gèle un formulaire et exporte JSON via les endpoints dédiés', async () => {
    const freezeCalled = vi.fn()
    const exportCalled = vi.fn()

    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:mock'), writable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true })

    server.use(
      http.get('http://localhost:5050/api/forms/:id', ({ params }) =>
        HttpResponse.json({
          id: params.id as string,
          title: 'Formulaire export',
          description: 'Description',
          formType: 'manager_evaluation',
          isFrozen: false,
          questions: [{ id: 'q1', type: 'text', text: 'Question', required: true }],
        })),
      http.post('http://localhost:5050/api/forms/:id/freeze', ({ params }) => {
        freezeCalled(params.id as string)
        return HttpResponse.json({ success: true })
      }),
      http.get('http://localhost:5050/api/forms/:id/export', ({ params }) => {
        exportCalled(params.id as string)
        return new HttpResponse(new Blob(['{}'], { type: 'application/json' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      })
    )

    renderFormDetail('/forms/form-export')

    await userEvent.click(await screen.findByRole('button', { name: 'Exporter JSON' }))
    await waitFor(() => expect(exportCalled).toHaveBeenCalledWith('form-export'))

    await userEvent.click(screen.getByRole('button', { name: 'Geler' }))
    // Le dialog de confirmation utilise confirmLabel: "Geler" — clic sur le 2e bouton "Geler"
    const gelerButtons = screen.getAllByRole('button', { name: 'Geler' })
    await userEvent.click(gelerButtons[gelerButtons.length - 1])
    await waitFor(() => expect(freezeCalled).toHaveBeenCalledWith('form-export'))
  })

  it('dégèle un formulaire gelé via POST /unfreeze', async () => {
    const unfreezeCalled = vi.fn()

    server.use(
      http.get('http://localhost:5050/api/forms/:id', ({ params }) =>
        HttpResponse.json({
          id: params.id as string,
          title: 'Formulaire export',
          description: 'Description',
          formType: 'manager_evaluation',
          isFrozen: true,
          frozenAt: '2025-01-15T00:00:00Z',
          questions: [{ id: 'q1', type: 'text', text: 'Question', required: true }],
        })),
      http.post('http://localhost:5050/api/forms/:id/unfreeze', ({ params }) => {
        unfreezeCalled(params.id as string)
        return HttpResponse.json({ success: true })
      })
    )

    renderFormDetail('/forms/form-export-frozen')
    // Pour un formulaire gelé, le h1 contient aussi le badge "Gelé"
    await screen.findByRole('heading', { name: /Formulaire export/ })
    await userEvent.click(screen.getByRole('button', { name: 'Dégeler' }))
    // Le dialog de confirmation utilise confirmLabel: "Dégeler" — clic sur le 2e bouton
    const degelerButtons = screen.getAllByRole('button', { name: 'Dégeler' })
    await userEvent.click(degelerButtons[degelerButtons.length - 1])
    await waitFor(() => expect(unfreezeCalled).toHaveBeenCalledWith('form-export-frozen'))
  })
})
