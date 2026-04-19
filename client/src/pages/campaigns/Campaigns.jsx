// =============================================================================
// Campaigns — HR/admin campaign list
// Lists every campaign with status + completion stats.
// Reuses HRSidebar / AdminSidebar depending on the role.
// =============================================================================

import React, { useState, useEffect } from 'react'
import './campaigns.css'
import AppSidebar      from '../../components/ui/AppSidebar'
import {
  HomeIcon, FolderIcon, ClipboardIcon, DocumentIcon, GearIcon, SearchIcon,
  PlusIcon,
} from '../../components/ui/icons'
import AppTopbar       from '../../components/ui/AppTopbar'
import { t as pageT }  from './i18n'
import { useLocale }   from '../../hooks/useLocale'
import { useTheme }    from '../../hooks/useTheme'
import { useAuthUser } from '../../hooks/useAuthUser'

import CampaignCard          from './CampaignCard'
import CampaignDetailModal   from './CampaignDetailModal'
import CampaignFormModal     from './CampaignFormModal'
import AssignEvaluationsModal from './AssignEvaluationsModal'

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Data', 'Security', 'Infrastructure',
  'Finance', 'Legal', 'HR', 'Sales', 'Marketing', 'Customer Success',
  'Operations', 'Executive',
]

function CampaignsSidebar({ t, role, sidebarOpen, setSidebarOpen }) {
  const items = role === 'admin'
    ? [
        { id: 'overview',   href: '/admin',      Icon: HomeIcon,      label: t('cmp.nav.admin'),       active: false },
        { id: 'users',      href: '/users',      Icon: SearchIcon,    label: t('cmp.nav.users'),       active: false },
        { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: t('cmp.nav.campaigns'),   active: true },
        { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: t('cmp.nav.formeditor'),  active: false },
        { id: 'resources',  href: '/resources',  Icon: FolderIcon,    label: t('cmp.nav.resources'),   active: false },
        { id: 'settings',   href: '/settings',   Icon: GearIcon,      label: t('cmp.nav.settings'),    active: false },
      ]
    : [
        { id: 'overview',   href: '/hr',         Icon: HomeIcon,      label: t('cmp.nav.hr'),          active: false },
        { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: t('cmp.nav.campaigns'),   active: true },
        { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: t('cmp.nav.formeditor'),  active: false },
        { id: 'resources',  href: '/resources',  Icon: FolderIcon,    label: t('cmp.nav.resources'),   active: false },
        { id: 'settings',   href: '/settings',   Icon: GearIcon,      label: t('cmp.nav.settings'),    active: false },
      ]

  return (
    <AppSidebar
      brandSub={role === 'admin' ? 'Admin Portal' : 'HR Portal'}
      navItems={items}
      labelNavigation={t('cmp.nav.label')}
      labelComingSoon={t('cmp.nav.coming_soon')}
      sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
    />
  )
}

export default function Campaigns() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme } = useTheme()
  const { user, loading: authLoading } = useAuthUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // Wizard modal state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardForm, setWizardForm] = useState({
    name: '', description: '', startDate: '', endDate: '', targetDepartments: [],
  })
  const [wizardSaving, setWizardSaving] = useState(false)

  // Detail view state
  const [detail, setDetail]               = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Edit modal state
  const [editOpen, setEditOpen]   = useState(false)
  const [editForm, setEditForm]   = useState({})
  const [editSaving, setEditSaving] = useState(false)

  // Assign evaluations modal state
  const [assignOpen, setAssignOpen]         = useState(false)
  const [assignCampaign, setAssignCampaign] = useState(null)
  const [forms, setForms]                   = useState([])
  const [users, setUsers]                   = useState([])
  const [assignForm, setAssignForm]         = useState({ formId: '', evaluateeIds: [], mode: 'self', evaluatorId: '' })
  const [assignSaving, setAssignSaving]     = useState(false)

  function loadCampaigns() {
    setLoading(true)
    fetch('/api/campaigns', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => { setCampaigns(Array.isArray(data) ? data : (data.campaigns || [])); setError(null) })
      .catch(() => setError(t('cmp.error.load')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCampaigns() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authLoading && user && !['hr', 'admin'].includes(user.role)) {
      window.location.href = '/employee'
    }
  }, [authLoading, user])

  if (authLoading) return null
  if (!user) return null
  if (!['hr', 'admin'].includes(user.role)) return null

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    window.location.href = '/'
  }

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')
  }

  // ── Create ───────────────────────────────────────────────────────────────
  function toggleDept(dept) {
    setWizardForm(prev => ({
      ...prev,
      targetDepartments: prev.targetDepartments.includes(dept)
        ? prev.targetDepartments.filter(d => d !== dept)
        : [...prev.targetDepartments, dept],
    }))
  }

  async function handleCreateCampaign(e) {
    e.preventDefault()
    setWizardSaving(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardForm),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setWizardOpen(false)
      setWizardForm({ name: '', description: '', startDate: '', endDate: '', targetDepartments: [] })
      loadCampaigns()
    } catch (err) { setError(err.message || t('cmp.error.create')) }
    finally { setWizardSaving(false) }
  }

  // ── Detail ───────────────────────────────────────────────────────────────
  async function openDetail(id) {
    setDetailLoading(true)
    setDetail(null)
    try {
      const r = await fetch(`/api/campaigns/${id}`, { credentials: 'include' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setDetail(await r.json())
    } catch { setError(t('cmp.error.load')) }
    finally { setDetailLoading(false) }
  }

  // ── Status transition ────────────────────────────────────────────────────
  async function handleTransition(id, newStatus) {
    try {
      const r = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.error || `HTTP ${r.status}`)
      }
      loadCampaigns()
      if (detail && (detail._id === id || detail.id === id)) openDetail(id)
    } catch (err) { setError(err.message) }
  }

  // ── Clone campaign ───────────────────────────────────────────────────────
  async function handleClone(c) {
    const id = c._id || c.id
    if (!id) return
    if (!window.confirm(t('cmp.confirm.clone'))) return
    try {
      const r = await fetch(`/api/campaigns/${id}/clone`, {
        method: 'POST', credentials: 'include',
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.error || `HTTP ${r.status}`)
      }
      loadCampaigns()
    } catch (err) { setError(err.message) }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  function openEdit(c) {
    setEditForm({
      id: c._id || c.id,
      name: c.name || '',
      description: c.description || '',
      startDate: c.startDate?.slice(0, 10) || '',
      endDate: c.endDate?.slice(0, 10) || '',
      targetDepartments: c.targetDepartments || [],
    })
    setEditOpen(true)
  }

  function toggleEditDept(dept) {
    setEditForm(prev => ({
      ...prev,
      targetDepartments: prev.targetDepartments.includes(dept)
        ? prev.targetDepartments.filter(d => d !== dept)
        : [...prev.targetDepartments, dept],
    }))
  }

  async function handleEditCampaign(e) {
    e.preventDefault()
    setEditSaving(true)
    try {
      const { id, ...body } = editForm
      const r = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.error || `HTTP ${r.status}`)
      }
      setEditOpen(false)
      loadCampaigns()
      if (detail && (detail._id === id || detail.id === id)) openDetail(id)
    } catch (err) { setError(err.message || t('cmp.error.edit')) }
    finally { setEditSaving(false) }
  }

  // ── Assign ───────────────────────────────────────────────────────────────
  async function openAssign(campaign) {
    setAssignCampaign(campaign)
    setAssignForm({ formId: '', evaluateeIds: [], mode: 'self', evaluatorId: '' })
    setAssignOpen(true)
    try {
      const [fRes, uRes] = await Promise.all([
        fetch('/api/forms', { credentials: 'include' }),
        fetch('/api/users?isActive=true', { credentials: 'include' }),
      ])
      if (fRes.ok) {
        const fd = await fRes.json()
        setForms(Array.isArray(fd) ? fd : (fd.data || []))
      }
      if (uRes.ok) {
        const ud = await uRes.json()
        setUsers(Array.isArray(ud) ? ud : (ud.data || []))
      }
    } catch { /* ignore */ }
  }

  async function handleAssign(e) {
    e.preventDefault()
    if (!assignForm.formId || assignForm.evaluateeIds.length === 0) return
    setAssignSaving(true)
    try {
      const evaluations = assignForm.evaluateeIds.map(uid => ({
        campaignId: assignCampaign._id || assignCampaign.id,
        formId: assignForm.formId,
        evaluatorId: assignForm.mode === 'specific' && assignForm.evaluatorId ? assignForm.evaluatorId : uid,
        evaluateeId: uid,
      }))
      const r = await fetch('/api/evaluations/bulk', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluations }),
      })
      if (!r.ok && r.status !== 207) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.error || `HTTP ${r.status}`)
      }
      setAssignOpen(false)
      setError(null)
      loadCampaigns()
    } catch (err) { setError(err.message || t('cmp.error.assign')) }
    finally { setAssignSaving(false) }
  }

  // ── Sorted campaigns ────────────────────────────────────────────────────
  const sorted = [...campaigns].sort((a, b) => {
    const order = { active: 0, draft: 1, closed: 2, archived: 3 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    return new Date(b.startDate) - new Date(a.startDate)
  })

  return (
    <div className="db">
      <CampaignsSidebar t={t} role={user.role} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="db-main">
        <AppTopbar
          t={t}
          theme={theme} cycleTheme={cycleTheme}
          locale={locale} setLocale={setLocale}
          user={user} onLogout={handleLogout}
          searchPlaceholder={t('cmp.search.placeholder')}
          onMenuToggle={() => setSidebarOpen(o => !o)}
          tKeys={{
            help:   { aria: 'cmp.help.aria',   title: 'cmp.help.title' },
            theme:  { to_light: 'cmp.theme.to_light', to_sidebar: 'cmp.theme.to_sidebar', to_dark: 'cmp.theme.to_dark' },
            logout: { aria: 'cmp.logout.aria', title: 'cmp.logout.title' },
            bell:   'cmp.notifications.aria_bell',
          }}
        />

        <main id="main-content" className="db-content cmp">
          {/* Hero */}
          <section className="cmp-hero">
            <p className="cmp-hero__eyebrow">{t('cmp.hero.eyebrow')}</p>
            <h1 className="cmp-hero__title">{t('cmp.hero.title')}</h1>
            <p className="cmp-hero__sub">{t('cmp.hero.sub')}</p>
          </section>

          {/* Action bar */}
          <div className="cmp-actions">
            <button type="button" className="cmp-btn cmp-btn--primary" onClick={() => setWizardOpen(true)}>
              <PlusIcon size={16} /> {t('cmp.cta.create')}
            </button>
          </div>

          {error && <p className="cmp-error" role="alert">{error}</p>}
          {loading && <p className="cmp-loading">{t('cmp.loading')}</p>}

          {!loading && !error && sorted.length === 0 && (
            <section className="cmp-empty">
              <p className="cmp-empty__title">{t('cmp.empty.title')}</p>
              <p className="cmp-empty__sub">{t('cmp.empty.sub')}</p>
              <a className="cmp-empty__cta" href="/formeditor">{t('cmp.empty.cta')}</a>
            </section>
          )}

          {!loading && !error && sorted.length > 0 && (
            <section className="cmp-grid">
              {sorted.map(c => (
                <CampaignCard key={c._id || c.id} c={c} t={t} fmtDate={fmtDate}
                  onDetail={openDetail} onEdit={openEdit}
                  onTransition={handleTransition} onAssign={openAssign}
                  onClone={handleClone} />
              ))}
            </section>
          )}

          {/* Create campaign wizard */}
          {wizardOpen && (
            <CampaignFormModal
              title={t('cmp.wizard.title')} titleId="cmp-wizard-title"
              form={wizardForm} setForm={setWizardForm}
              departments={DEPARTMENTS} toggleDept={toggleDept}
              onSubmit={handleCreateCampaign} onCancel={() => setWizardOpen(false)}
              saving={wizardSaving} submitLabel={t('cmp.wizard.submit')} t={t}
            />
          )}

          {/* Campaign detail */}
          <CampaignDetailModal
            detail={detail} detailLoading={detailLoading}
            t={t} fmtDate={fmtDate}
            onTransition={handleTransition} onAssign={openAssign}
            onEdit={openEdit} onClose={() => setDetail(null)}
            onClone={handleClone}
          />

          {/* Edit campaign */}
          {editOpen && (
            <CampaignFormModal
              title={t('cmp.edit.title')} titleId="cmp-edit-title"
              form={editForm} setForm={setEditForm}
              departments={DEPARTMENTS} toggleDept={toggleEditDept}
              onSubmit={handleEditCampaign} onCancel={() => setEditOpen(false)}
              saving={editSaving} submitLabel={t('cmp.edit.save')} t={t}
            />
          )}

          {/* Assign evaluations */}
          {assignOpen && (
            <AssignEvaluationsModal
              campaign={assignCampaign} forms={forms} users={users}
              assignForm={assignForm} setAssignForm={setAssignForm}
              onSubmit={handleAssign} onCancel={() => setAssignOpen(false)}
              saving={assignSaving} t={t}
            />
          )}
        </main>
      </div>
    </div>
  )
}
