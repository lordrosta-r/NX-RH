// =============================================================================
// AdminOrgChart.jsx — Organigramme hiérarchique, route /admin/org-chart
// 4 modes : arbre complet, ligne managériale, hub équipe, diagnostic
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { t as pageT } from './i18n'
import { AlertTriangle } from 'lucide-react'

const MODES = ['full', 'managerial', 'hub', 'diagnostic']

function buildTree(users) {
  const byId = {}
  users.forEach(u => { byId[u._id || u.id] = { ...u, children: [] } })
  const roots = []
  users.forEach(u => {
    const node = byId[u._id || u.id]
    const mgr  = u.managerId && byId[u.managerId]
    if (mgr) mgr.children.push(node)
    else roots.push(node)
  })
  return roots
}

function TreeNode({ node, showOrphans, t }) {
  const isOrphan = showOrphans && !node.managerId
  return (
    <li>
      <div className={`adm-tree-node${isOrphan ? ' adm-tree-node--orphan' : ''}`}>
        <span className="adm-tree-node__name">{node.firstName} {node.lastName}</span>
        <span className="adm-tree-node__role">{node.position || node.department || ''}</span>
        <span className="adm-tree-node__badge">
          <span className={`adm-role__badge adm-role__badge--${node.role}`}>{node.role}</span>
        </span>
      </div>
      {node.children?.length > 0 && (
        <ul className="adm-tree">
          {node.children.map(child => (
            <TreeNode key={child._id || child.id} node={child} showOrphans={showOrphans} t={t} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function AdminOrgChart() {
  const { user, loading } = useAuth()
  const { t } = useLocale(pageT)
  const navigate = useNavigate()
  const [mode, setMode] = useState('full')
  const [selectedMgrId, setSelectedMgrId] = useState('')

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') navigate('/employee', { replace: true })
  }, [loading, user, navigate])

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () =>
      fetch('/api/users?limit=500', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? d : (d.users || [])),
    enabled: !!user && user.role === 'admin',
  })

  const allIds = useMemo(() => new Set(users.map(u => u._id || u.id)), [users])

  const orphans = useMemo(
    () => users.filter(u => u.managerId && !allIds.has(u.managerId)),
    [users, allIds]
  )

  const roots    = useMemo(() => buildTree(users), [users])
  const managers = useMemo(
    () => users.filter(u => users.some(x => x.managerId === (u._id || u.id))),
    [users]
  )

  const displayRoots = useMemo(() => {
    if (mode === 'managerial') return roots.filter(n => n.children?.length > 0)
    if (mode === 'hub') {
      if (!selectedMgrId) return []
      const mgr = users.find(u => (u._id || u.id) === selectedMgrId)
      if (!mgr) return []
      const tree = buildTree(users)
      function findNode(nodes, id) {
        for (const n of nodes) {
          if ((n._id || n.id) === id) return n
          const found = findNode(n.children || [], id)
          if (found) return found
        }
        return null
      }
      const node = findNode(tree, selectedMgrId)
      return node ? [node] : []
    }
    return roots
  }, [mode, roots, selectedMgrId, users])

  if (loading || !user) return null
  if (user.role !== 'admin') return null

  return (
    <div className="adm">
      <header className="adm-hero">
        <p className="adm-hero__eyebrow">{t('admin.orgchart.hero.eyebrow')}</p>
        <h1 className="adm-hero__title">
          <span className="adm-hero__accent">{t('admin.orgchart.hero.title')}</span>
        </h1>
        <p className="adm-hero__sub">{t('admin.orgchart.hero.sub')}</p>
      </header>

      {orphans.length > 0 && (
        <div className="adm-callout adm-callout--warn" role="alert">
          <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
          <span>{orphans.length} {t('admin.orgchart.orphan.alert')}</span>
        </div>
      )}

      <div className="adm-tabs" role="tablist" aria-label="Mode d'affichage">
        {MODES.map(m => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={`adm-tab${mode === m ? ' adm-tab--active' : ''}`}
            onClick={() => setMode(m)}
          >
            {t(`admin.orgchart.mode.${m}`)}
          </button>
        ))}
      </div>

      {mode === 'hub' && (
        <div className="adm-form-group" style={{ maxWidth: 320, marginBottom: '1rem' }}>
          <select
            className="adm-select"
            value={selectedMgrId}
            onChange={e => setSelectedMgrId(e.target.value)}
            aria-label={t('admin.orgchart.hub.select')}
          >
            <option value="">{t('admin.orgchart.hub.select')}</option>
            {managers.map(m => (
              <option key={m._id || m.id} value={m._id || m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>
        </div>
      )}

      <section className="adm-card">
        {isLoading && <p className="adm-loading">{t('admin.loading')}</p>}
        {!isLoading && users.length === 0 && <p className="adm-empty">{t('admin.orgchart.empty')}</p>}
        {!isLoading && users.length > 0 && (
          <>
            {mode === 'diagnostic' && orphans.length === 0 && (
              <p className="adm-empty">{t('admin.orgchart.orphan.none')}</p>
            )}
            {mode === 'diagnostic' && orphans.length > 0 && (
              <ul className="adm-tree">
                {orphans.map(u => (
                  <TreeNode
                    key={u._id || u.id}
                    node={{ ...u, children: [] }}
                    showOrphans
                    t={t}
                  />
                ))}
              </ul>
            )}
            {mode !== 'diagnostic' && (
              <ul className="adm-tree">
                {displayRoots.map(n => (
                  <TreeNode key={n._id || n.id} node={n} showOrphans={false} t={t} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  )
}
