// =============================================================================
// Campaigns — HR/admin campaign list
// Lists every campaign with status + completion stats.
// Reuses HRSidebar / AdminSidebar depending on the role.
// =============================================================================

import React, { useState, useEffect } from 'react'
import './campaigns.css'
import AppSidebar      from '../../components/ui/AppSidebar'
import {
  HomeIcon, FolderIcon, ClipboardIcon, DocumentIcon, GearIcon,
} from '../../components/ui/icons'
import AppTopbar       from '../../components/ui/AppTopbar'
import { t as pageT }  from './i18n'
import { useLocale }   from '../../hooks/useLocale'
import { useTheme }    from '../../hooks/useTheme'
import { useAuthUser } from '../../hooks/useAuthUser'

const STATUS_LABELS = {
  draft:    'cmp.status.draft',
  active:   'cmp.status.active',
  closed:   'cmp.status.closed',
  archived: 'cmp.status.archived',
}

function CampaignsSidebar({ t, role }) {
  const items = role === 'admin'
    ? [
        { id: 'overview',   href: '/admin',      Icon: HomeIcon,      label: t('cmp.nav.admin'),       active: false },
        { id: 'hr',         href: '/hr',         Icon: FolderIcon,    label: t('cmp.nav.hr'),          active: false },
        { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: t('cmp.nav.campaigns'),   active: true },
        { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: t('cmp.nav.formeditor'),  active: false },
        { id: 'settings',   href: '/settings',   Icon: GearIcon,      label: t('cmp.nav.settings'),    active: false },
      ]
    : [
        { id: 'overview',   href: '/hr',         Icon: HomeIcon,      label: t('cmp.nav.hr'),          active: false },
        { id: 'campaigns',  href: '/campaigns',  Icon: ClipboardIcon, label: t('cmp.nav.campaigns'),   active: true },
        { id: 'formeditor', href: '/formeditor', Icon: DocumentIcon,  label: t('cmp.nav.formeditor'),  active: false },
        { id: 'settings',   href: '/settings',   Icon: GearIcon,      label: t('cmp.nav.settings'),    active: false },
      ]

  return (
    <AppSidebar
      brandSub={role === 'admin' ? 'Admin Portal' : 'HR Portal'}
      navItems={items}
      labelNavigation={t('cmp.nav.label')}
      labelComingSoon={t('cmp.nav.coming_soon')}
    />
  )
}

export default function Campaigns() {
  const { t, locale, setLocale } = useLocale(pageT)
  const { theme, cycleTheme } = useTheme()
  const { user, loading: authLoading } = useAuthUser()

  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/campaigns', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => { if (!cancelled) setCampaigns(Array.isArray(data) ? data : (data.campaigns || [])) })
      .catch(() => { if (!cancelled) setError(t('cmp.error.load')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [t])

  if (authLoading) return null
  if (!user) return null
  if (!['hr', 'admin'].includes(user.role)) {
    window.location.href = '/employee'
    return null
  }

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    sessionStorage.clear()
    window.location.href = '/'
  }

  function fmtDate(d) {
    if (!d) return '—'
    const dt = new Date(d)
    return dt.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')
  }

  // tri : actives d'abord, puis par date de début descendante
  const sorted = [...campaigns].sort((a, b) => {
    const order = { active: 0, draft: 1, closed: 2, archived: 3 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    return new Date(b.startDate) - new Date(a.startDate)
  })

  // Sidebar adaptative
  return (
    <div className="db">
      <CampaignsSidebar t={t} role={user.role} />

      <div className="db-main">
        <AppTopbar
          t={t}
          theme={theme}
          cycleTheme={cycleTheme}
          locale={locale}
          setLocale={setLocale}
          user={user}
          onLogout={handleLogout}
          searchPlaceholder={t('cmp.search.placeholder')}
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
                <article key={c._id || c.id} className={`cmp-card cmp-card--${c.status}`}>
                  <header className="cmp-card__head">
                    <span className={`cmp-status cmp-status--${c.status}`}>
                      {t(STATUS_LABELS[c.status] || 'cmp.status.draft')}
                    </span>
                    <h2 className="cmp-card__name">{c.name}</h2>
                    {c.description && <p className="cmp-card__desc">{c.description}</p>}
                  </header>

                  <div className="cmp-card__meta">
                    <div>
                      <span className="cmp-meta__label">{t('cmp.meta.start')}</span>
                      <span className="cmp-meta__value">{fmtDate(c.startDate)}</span>
                    </div>
                    <div>
                      <span className="cmp-meta__label">{t('cmp.meta.end')}</span>
                      <span className="cmp-meta__value">{fmtDate(c.endDate)}</span>
                    </div>
                    {Array.isArray(c.targetDepartments) && c.targetDepartments.length > 0 && (
                      <div>
                        <span className="cmp-meta__label">{t('cmp.meta.departments')}</span>
                        <span className="cmp-meta__value">{c.targetDepartments.length}</span>
                      </div>
                    )}
                  </div>

                  {c.stats && (
                    <div className="cmp-card__progress">
                      <div className="cmp-progress__bar">
                        <div
                          className="cmp-progress__fill"
                          style={{ width: `${c.stats.completionPct || 0}%` }}
                        />
                      </div>
                      <span className="cmp-progress__pct">{c.stats.completionPct || 0}%</span>
                    </div>
                  )}
                </article>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
