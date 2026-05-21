import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { server } from './msw/server'
import { renderWithProviders, makeUser } from './utils'
import CampaignsPage from '../pages/CampaignsPage'
import CampaignDetailPage from '../pages/CampaignDetailPage'

import type { Campaign } from '../types'

const campaignFixtures: Campaign[] = [
  {
    id: 'camp-draft',
    name: 'Campagne Brouillon',
    status: 'draft',
    startDate: '2025-01-01',
    endDate: '2025-02-01',
    description: 'Draft campaign',
  },
  {
    id: 'camp-active',
    name: 'Campagne Active',
    status: 'active',
    startDate: '2025-02-01',
    endDate: '2025-03-01',
    description: 'Active campaign',
    formId: 'form-1',
  },
  {
    id: 'camp-closed',
    name: 'Campagne Clôturée',
    status: 'closed',
    startDate: '2024-11-01',
    endDate: '2024-12-01',
  },
  {
    id: 'camp-archived',
    name: 'Campagne Archivée',
    status: 'archived',
    startDate: '2024-01-01',
    endDate: '2024-02-01',
  },
]

function campaignListHandler(campaigns: Campaign[]) {
  return http.get('http://localhost:5050/api/campaigns', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
    const filtered = campaigns.filter(campaign => {
      const matchesStatus = !status || campaign.status === status
      const matchesQuery = !q || campaign.name.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })

    return HttpResponse.json({
      data: filtered,
      total: filtered.length,
      page: 1,
      limit: 50,
    })
  })
}

function renderCampaignDetail(path: string, role: 'admin' | 'hr' = 'admin') {
  return renderWithProviders(
    <Routes>
      <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
    </Routes>,
    { initialEntries: [path], user: makeUser({ role }) }
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('CampaignsPage', () => {
  it('affiche la liste, filtre et recherche les campagnes', async () => {
    server.use(campaignListHandler(campaignFixtures))

    renderWithProviders(<CampaignsPage />, { user: makeUser({ role: 'admin' }) })

    await waitFor(() => {
      const table = screen.getByRole('table')
      expect(within(table).getAllByRole('link', { name: 'Campagne Active' })).toHaveLength(1)
      expect(within(table).getAllByRole('link', { name: 'Campagne Brouillon' })).toHaveLength(1)
    })

    await userEvent.click(screen.getByRole('button', { name: 'Brouillon' }))
    await waitFor(() => {
      const table = screen.getByRole('table')
      expect(within(table).getAllByRole('link', { name: 'Campagne Brouillon' })).toHaveLength(1)
      expect(within(table).queryAllByRole('link', { name: 'Campagne Active' })).toHaveLength(0)
    })

    await userEvent.click(screen.getByRole('button', { name: 'Tous' }))
    const search = screen.getByPlaceholderText('Rechercher une campagne…')
    await userEvent.clear(search)
    await userEvent.type(search, 'active')

    await waitFor(() => {
      const table = screen.getByRole('table')
      expect(within(table).getAllByRole('link', { name: 'Campagne Active' })).toHaveLength(1)
      expect(within(table).queryAllByRole('link', { name: 'Campagne Brouillon' })).toHaveLength(0)
    })
  })

  it('masque le bouton Nouvelle campagne pour employee', async () => {
    server.use(campaignListHandler([campaignFixtures[1]]))

    renderWithProviders(<CampaignsPage />, { user: makeUser({ role: 'employee' }) })
    await screen.findByRole('table')
    expect(screen.queryByRole('link', { name: 'Nouvelle campagne' })).not.toBeInTheDocument()
  })

  it('affiche le bouton Nouvelle campagne pour hr', async () => {
    server.use(campaignListHandler([campaignFixtures[1]]))

    renderWithProviders(<CampaignsPage />, { user: makeUser({ role: 'hr' }) })
    await screen.findByRole('table')
    expect(screen.getByRole('link', { name: 'Nouvelle campagne' })).toBeInTheDocument()
  })

  it('propose les actions selon le statut', async () => {
    server.use(campaignListHandler(campaignFixtures))

    renderWithProviders(<CampaignsPage />, { user: makeUser({ role: 'admin' }) })
    await screen.findByRole('table')

    const openMenu = async (name: string) => {
      const table = screen.getByRole('table')
      const row = within(table).getByText(name).closest('tr')
      expect(row).toBeTruthy()
      await userEvent.click(within(row as HTMLTableRowElement).getByRole('button'))
    }

    await openMenu('Campagne Active')
    expect(screen.getByRole('button', { name: 'Cloner' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archiver' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Archiver' }))
    await userEvent.click(screen.getByRole('button', { name: 'Brouillon' }))
    await openMenu('Campagne Brouillon')
    expect(screen.getByRole('button', { name: 'Cloner' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Archiver' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Tous' }))
    await openMenu('Campagne Archivée')
    expect(screen.getByRole('button', { name: 'Cloner' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Archiver' })).not.toBeInTheDocument()
  })

  it('appelle clone, archive et delete depuis le menu', async () => {
    const cloneCalled = vi.fn()
    const archiveCalled = vi.fn()
    const deleteCalled = vi.fn()

    server.use(
      campaignListHandler(campaignFixtures),
      http.post('http://localhost:5050/api/campaigns/:id/clone', ({ params }) => {
        cloneCalled(params.id as string)
        return HttpResponse.json({ ...campaignFixtures[1], id: 'camp-copy', name: 'Copie campagne', status: 'draft' })
      }),
      http.post('http://localhost:5050/api/campaigns/:id/archive', ({ params }) => {
        archiveCalled(params.id as string)
        return HttpResponse.json({ ...campaignFixtures[1], status: 'archived' })
      }),
      http.delete('http://localhost:5050/api/campaigns/:id', ({ params }) => {
        deleteCalled(params.id as string)
        return HttpResponse.json({ success: true })
      })
    )

    renderWithProviders(<CampaignsPage />, { user: makeUser({ role: 'admin' }) })
    await screen.findByRole('table')

    const openMenu = async (name: string) => {
      const table = screen.getByRole('table')
      const row = within(table).getByText(name).closest('tr')
      expect(row).toBeTruthy()
      await userEvent.click(within(row as HTMLTableRowElement).getByRole('button'))
    }

    await openMenu('Campagne Active')
    await userEvent.click(screen.getByRole('button', { name: 'Cloner' }))
    await waitFor(() => expect(cloneCalled).toHaveBeenCalledWith('camp-active'))

    await openMenu('Campagne Active')
    await userEvent.click(screen.getByRole('button', { name: 'Archiver' }))
    await waitFor(() => expect(archiveCalled).toHaveBeenCalledWith('camp-active'))

    await userEvent.click(screen.getByRole('button', { name: 'Brouillon' }))
    await openMenu('Campagne Brouillon')
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(deleteCalled).toHaveBeenCalledWith('camp-draft'))
  })

  it('affiche un empty state quand il n’y a aucun résultat', async () => {
    server.use(campaignListHandler([]))

    renderWithProviders(<CampaignsPage />, { user: makeUser({ role: 'admin' }) })

    expect(await screen.findByText('Aucune campagne')).toBeInTheDocument()
  })
})

describe('CampaignDetailPage', () => {
  it('affiche les informations de la campagne et les onglets navigables', async () => {
    server.use(
      http.get('http://localhost:5050/api/campaigns/:id', ({ params }) =>
        HttpResponse.json({
          id: params.id as string,
          name: 'Campagne Aperçu',
          status: 'active',
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          createdAt: '2024-12-01T00:00:00Z',
          formIds: ['form-1'],
        }))
    )

    renderCampaignDetail('/campaigns/camp-1', 'admin')

    expect(await screen.findByRole('heading', { name: 'Campagne Aperçu' })).toBeInTheDocument()
    expect(screen.getByText(/01\/01\/2025/i)).toBeInTheDocument()
    expect(screen.getByText(/31\/03\/2025/i)).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Évaluations' }))
    expect(screen.getByText(/Consultez les évaluations associées/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Formulaires' }))
    expect(screen.getByText(/Formulaire #form-1/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Aperçu' }))
    expect(screen.getByText(/Progression globale/i)).toBeInTheDocument()
  })

  it.each([
    ['draft', 'Activer la campagne', 'activate'],
    ['active', 'Clôturer la campagne', 'close'],
    ['closed', 'Archiver', 'archive'],
  ] as const)('affiche le bouton %s et appelle /%s', async (status, label, action) => {
    const called = vi.fn()

    server.use(
      http.get('http://localhost:5050/api/campaigns/:id', ({ params }) =>
        HttpResponse.json({
          id: params.id as string,
          name: `Campagne ${status}`,
          status,
          startDate: '2025-01-01',
          endDate: '2025-03-31',
        })),
      http.post(`http://localhost:5050/api/campaigns/:id/${action}`, ({ params }) => {
        called(params.id as string)
        return HttpResponse.json({ success: true })
      })
    )

    renderCampaignDetail(`/campaigns/camp-${status}`, 'admin')

    const button = await screen.findByRole('button', { name: new RegExp(label, 'i') })
    await userEvent.click(button)
    await waitFor(() => expect(called).toHaveBeenCalledWith(`camp-${status}`))
  })
})
