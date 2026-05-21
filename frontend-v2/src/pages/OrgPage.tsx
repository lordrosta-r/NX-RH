import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { orgApi } from '../api/org'
import { useAuth } from '../contexts/AuthContext'
import { useOrgLayout, type OrgNodeData } from '../hooks/useOrgLayout'
import OrgCircleNode from '../components/org/OrgCircleNode'
import OrgToolbar, { type OrgView } from '../components/org/OrgToolbar'
import OrgControls from '../components/org/OrgControls'
import OrgSidePanel from '../components/org/OrgSidePanel'
import type { OrgTreeNode, OrgTeamGroup, OrgSectorGroup, Role } from '../types'

// ─── Teams view ────────────────────────────────────────────────────────────
const ROLE_COLORS_HEX: Record<string, string> = {
  admin: '#0D9488', hr: '#059669', manager: '#2563EB', employee: '#64748B', director: '#7C3AED',
}
function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
}

function OrgTeamsView({ data, toolbar }: { data: OrgTeamGroup[]; toolbar: React.ReactNode }) {
  return (
    <div className="relative flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
      {toolbar}
      <div className="flex-1 overflow-y-auto p-6 pt-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
          {data.map((team) => {
            const mgr = team.manager
            const reports = team.directReports ?? []
            const color = ROLE_COLORS_HEX[mgr.role] ?? '#64748B'
            return (
              <div key={mgr._id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: color }}>
                    {initials(mgr.firstName, mgr.lastName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{mgr.firstName} {mgr.lastName}</p>
                    <p className="text-xs text-slate-500 truncate">{mgr.department ?? mgr.role}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {reports.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aucun collaborateur direct</p>
                  ) : reports.map(r => (
                    <div key={r._id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0" style={{ backgroundColor: ROLE_COLORS_HEX[r.role] ?? '#64748B' }}>
                        {initials(r.firstName, r.lastName)}
                      </div>
                      <span className="text-xs text-slate-700 truncate">{r.firstName} {r.lastName}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">{reports.length} membre{reports.length !== 1 ? 's' : ''}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Sectors view ──────────────────────────────────────────────────────────
function OrgSectorsView({ data, toolbar }: { data: OrgSectorGroup[]; toolbar: React.ReactNode }) {
  return (
    <div className="relative flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
      {toolbar}
      <div className="flex-1 overflow-y-auto p-6 pt-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
          {data.map((group, i) => {
            const sector = group.sector
            const users = group.users ?? []
            const sectorColor = sector?.color ?? '#0D9488'
            return (
              <div key={sector?._id ?? `no-sector-${i}`} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sectorColor }} />
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{sector ? sector.name : 'Sans secteur'}</h3>
                  <span className="ml-auto text-xs font-medium text-slate-400">{users.length}</span>
                </div>
                <div className="space-y-1.5">
                  {users.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aucun utilisateur</p>
                  ) : users.map(u => (
                    <div key={u._id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0" style={{ backgroundColor: ROLE_COLORS_HEX[u.role] ?? '#64748B' }}>
                        {initials(u.firstName, u.lastName)}
                      </div>
                      <span className="text-xs text-slate-700 truncate">{u.firstName} {u.lastName}</span>
                      <span className="text-[10px] text-slate-400 ml-auto capitalize">{u.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = { orgCircle: OrgCircleNode }

// Build a flat map of all nodes from the tree
function flattenToMap(nodes: OrgTreeNode[]): Map<string, OrgTreeNode> {
  const map = new Map<string, OrgTreeNode>()
  function walk(list: OrgTreeNode[]) {
    for (const n of list) {
      map.set(n._id, n)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return map
}

// Get all ancestor IDs of a node
function getAncestors(id: string, nodes: OrgTreeNode[]): Set<string> {
  const nodeMap = flattenToMap(nodes)
  const ancestors = new Set<string>()
  let current = nodeMap.get(id)
  while (current?.managerId) {
    const parent = nodeMap.get(current.managerId)
    if (!parent) break
    ancestors.add(parent._id)
    current = parent
  }
  return ancestors
}

// Get all descendant IDs of a node
function getDescendants(id: string, nodes: OrgTreeNode[]): Set<string> {
  const nodeMap = flattenToMap(nodes)
  const desc = new Set<string>()
  function walk(nid: string) {
    const n = nodeMap.get(nid)
    if (!n) return
    for (const child of n.children ?? []) {
      desc.add(child._id)
      walk(child._id)
    }
  }
  walk(id)
  return desc
}

// ─────────────────────────────────────────────────────────────
// Inner component (needs ReactFlowProvider context)
// ─────────────────────────────────────────────────────────────
function OrgFlowInner() {
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'hr'
  const queryClient = useQueryClient()
  const { fitView, setCenter, getNode } = useReactFlow()

  // Toolbar state
  const [activeView, setActiveView] = useState<OrgView>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeRoles, setActiveRoles] = useState<Role[]>([])

  // Selection + side panel
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Drag confirm
  const [dragTarget, setDragTarget] = useState<{ nodeId: string; newManagerId: string } | null>(null)

  // Org tree — refetches when activeView changes
  const { data: treeData = [], isLoading: treeLoading } = useQuery({
    queryKey: ['org', 'tree'],
    queryFn: () => orgApi.getOrgTree().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: activeView === 'all',
  })

  const { data: teamsData = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['org', 'teams'],
    queryFn: () => orgApi.getOrgTeams().then(r => r.data as unknown as OrgTeamGroup[]),
    staleTime: 5 * 60 * 1000,
    enabled: activeView === 'teams',
  })

  const { data: sectorData = [], isLoading: sectorLoading } = useQuery({
    queryKey: ['org', 'sectors-view'],
    queryFn: () => orgApi.getOrgSectors().then(r => r.data as unknown as OrgSectorGroup[]),
    staleTime: 5 * 60 * 1000,
    enabled: activeView === 'sector',
  })

  // Sectors
  const { data: sectors } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => orgApi.getSectors().then(r => r.data),
  })

  // Layout from Dagre
  const { nodes: layoutNodes, edges: layoutEdges } = useOrgLayout(treeData)

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<OrgNodeData>>(layoutNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(layoutEdges)

  // Update when layout changes
  useEffect(() => {
    setNodes(layoutNodes)
    setEdges(layoutEdges)
  }, [layoutNodes, layoutEdges])

  // Fit view on initial load
  useEffect(() => {
    if (layoutNodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 100)
    }
  }, [layoutNodes.length > 0])

  // Flat map for lookups — removed (unused)

  // All users as OrgNodeData (for side panel manager selector)
  const allUsersData = useMemo(
    () => layoutNodes.map(n => n.data),
    [layoutNodes]
  )

  // ─── Filter logic ───────────────────────────────────────────────────────────

  const { highlightIds, dimmedIds, filteredTotal } = useMemo(() => {
    const dimmed = new Set<string>()

    // Search filter
    let searchMatchIds = new Set<string>()
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      for (const n of layoutNodes) {
        const name = `${n.data.firstName} ${n.data.lastName}`.toLowerCase()
        if (name.includes(q)) searchMatchIds.add(n.id)
      }
    }

    // Role filter
    let roleMatchIds = new Set<string>()
    if (activeRoles.length > 0) {
      for (const n of layoutNodes) {
        if (activeRoles.includes(n.data.role)) roleMatchIds.add(n.id)
      }
    }

    // Combine
    const hasSearch = searchQuery.trim().length > 0
    const hasRole = activeRoles.length > 0

    let matchIds: Set<string>
    if (!hasSearch && !hasRole) {
      matchIds = new Set(layoutNodes.map(n => n.id))
    } else if (hasSearch && hasRole) {
      matchIds = new Set([...searchMatchIds].filter(id => roleMatchIds.has(id)))
    } else if (hasSearch) {
      matchIds = searchMatchIds
    } else {
      matchIds = roleMatchIds
    }

    for (const n of layoutNodes) {
      if (!matchIds.has(n.id)) dimmed.add(n.id)
    }

    return { highlightIds: matchIds, dimmedIds: dimmed, filteredTotal: matchIds.size }
  }, [searchQuery, activeRoles, layoutNodes])

  // ─── Selection chain highlight ──────────────────────────────────────────────

  const { chainIds } = useMemo(() => {
    if (!selectedId) return { chainIds: null }
    const ancestors = getAncestors(selectedId, treeData)
    const descendants = getDescendants(selectedId, treeData)
    const chain = new Set([selectedId, ...ancestors, ...descendants])
    return { chainIds: chain }
  }, [selectedId, treeData])

  // ─── Apply visual styles to nodes + edges ───────────────────────────────────

  const styledNodes = useMemo(() => {
    return nodes.map(n => {
      const isFiltered = dimmedIds.has(n.id)
      const isChainDimmed = chainIds !== null && !chainIds.has(n.id)
      const opacity = isFiltered || isChainDimmed ? 0.15 : 1

      return {
        ...n,
        selected: n.id === selectedId,
        draggable: canEdit,
        style: { opacity, transition: 'opacity 0.2s' },
      }
    })
  }, [nodes, dimmedIds, chainIds, selectedId, canEdit])

      const styledEdges = useMemo(() => {
    return edges.map(e => {
      const bothInChain = chainIds !== null && chainIds.has(e.source) && chainIds.has(e.target)
      const dimmedByFilter = dimmedIds.has(e.source) || dimmedIds.has(e.target)

      return {
        ...e,
        style: {
          stroke: bothInChain ? '#6366f1' : '#94a3b8',
          strokeWidth: bothInChain ? 2.5 : 1.5,
          strokeDasharray: bothInChain ? undefined : '6 3',
          opacity: chainIds !== null && !bothInChain ? 0.1 : dimmedByFilter ? 0.25 : 1,
        },
      }
    })
  }, [edges, chainIds, dimmedIds])

  // ─── Event handlers ─────────────────────────────────────────────────────────

  const handleNodeClick: NodeMouseHandler<Node<OrgNodeData>> = useCallback((_event, node) => {
    setSelectedId(prev => (prev === node.id ? null : node.id))
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedId(null)
  }, [])

  const handleNavigateTo = useCallback((id: string) => {
    const rfNode = getNode(id)
    if (rfNode) {
      setCenter(rfNode.position.x + (rfNode.width ?? 60) / 2, rfNode.position.y + (rfNode.height ?? 60) / 2, {
        zoom: 1.2,
        duration: 400,
      })
    }
    setSelectedId(id)
  }, [getNode, setCenter])

  // Drag & drop (admin/hr only)
  const confirmMutation = useMutation({
    mutationFn: ({ nodeId, newManagerId }: { nodeId: string; newManagerId: string }) =>
      orgApi.patchOrgUser(nodeId, { managerId: newManagerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org'] })
      setDragTarget(null)
    },
  })

  const handleNodeDragStop = useCallback<OnNodeDrag<Node<OrgNodeData>>>((_event, draggedNode) => {
    if (!canEdit) return
    // Find the node we're closest to
    const SNAP_DIST = 80
    let closest: Node<OrgNodeData> | null = null
    let minDist = SNAP_DIST

    for (const n of nodes) {
      if (n.id === draggedNode.id) continue
      const dx = (draggedNode.position.x + (draggedNode.width ?? 60) / 2) - (n.position.x + (n.width ?? 60) / 2)
      const dy = (draggedNode.position.y + (draggedNode.height ?? 60) / 2) - (n.position.y + (n.height ?? 60) / 2)
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minDist) {
        minDist = dist
        closest = n
      }
    }

    if (closest && closest.id !== draggedNode.data.managerId) {
      setDragTarget({ nodeId: draggedNode.id, newManagerId: closest.id })
    }
  }, [nodes, canEdit])

  // ─── Selected person data for side panel ────────────────────────────────────
  const selectedPerson = useMemo(
    () => selectedId ? allUsersData.find(u => u.id === selectedId) ?? null : null,
    [selectedId, allUsersData]
  )

  // ─── Auto-center on first search result ────────────────────────────────────
  useEffect(() => {
    if (searchQuery && highlightIds.size > 0) {
      const firstId = highlightIds.values().next().value
      if (firstId) {
        const rfNode = getNode(firstId)
        if (rfNode) {
          setCenter(rfNode.position.x + (rfNode.width ?? 60) / 2, rfNode.position.y + (rfNode.height ?? 60) / 2, {
            zoom: 1.2,
            duration: 400,
          })
        }
      }
    }
  }, [searchQuery, highlightIds])

  if (treeLoading || teamsLoading || sectorLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Chargement de l'organigramme…</p>
        </div>
      </div>
    )
  }

  const toolbar = (
    <OrgToolbar
      activeView={activeView}
      onViewChange={v => { setActiveView(v); setSelectedId(null) }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      activeRoles={activeRoles}
      onRolesChange={setActiveRoles}
      totalCount={layoutNodes.length}
      filteredCount={filteredTotal}
    />
  )

  if (activeView === 'teams') {
    return <OrgTeamsView data={teamsData} toolbar={toolbar} />
  }

  if (activeView === 'sector') {
    return <OrgSectorsView data={sectorData} toolbar={toolbar} />
  }

  return (
    <div className="relative flex-1" style={{ overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeDragStop={canEdit ? handleNodeDragStop : undefined}
        nodesDraggable={canEdit}
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.05}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="var(--color-slate-200)" />
      </ReactFlow>
      </div>{/* /absolute inset-0 */}

      {/* Floating toolbar */}
      {toolbar}

      {/* Zoom/fit controls */}
      <OrgControls />

      {/* Side panel */}
      {selectedPerson && (
        <OrgSidePanel
          person={selectedPerson}
          canEdit={canEdit}
          onClose={() => setSelectedId(null)}
          onNavigateTo={handleNavigateTo}
          sectors={sectors ?? []}
          allUsers={allUsersData}
        />
      )}

      {/* Drag & drop confirm dialog */}
      {dragTarget && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-slate-900 mb-2">Changer le manager ?</h3>
            <p className="text-sm text-slate-600 mb-5">
              Réaffecter <strong>{allUsersData.find(u => u.id === dragTarget.nodeId)?.firstName}</strong> sous{' '}
              <strong>{allUsersData.find(u => u.id === dragTarget.newManagerId)?.firstName} {allUsersData.find(u => u.id === dragTarget.newManagerId)?.lastName}</strong> ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDragTarget(null)}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={() => confirmMutation.mutate(dragTarget)}
                disabled={confirmMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-60"
              >
                {confirmMutation.isPending ? 'En cours…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main export — wraps with ReactFlowProvider
// (data fetching moved into OrgFlowInner so activeView drives it)
// ─────────────────────────────────────────────────────────────
export default function OrgPage() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <ReactFlowProvider>
        <OrgFlowInner />
      </ReactFlowProvider>
    </div>
  )
}
