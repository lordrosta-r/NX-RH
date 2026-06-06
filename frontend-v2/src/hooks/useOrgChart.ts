import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type OnNodeDrag,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import { orgApi } from "../api/org";
import { useAuth } from "../contexts/AuthContext";
import { useOrgLayout, type OrgNodeData } from "./useOrgLayout";
import type {
  OrgTreeNode,
  OrgTeamGroup,
  OrgSectorGroup,
  Sector,
  Role,
  OrgLegend,
} from "../types";
import type { OrgView } from "../components/org/OrgToolbar";
import type { DragTarget } from "../components/org/OrgDragConfirmDialog";
import { queryKeys } from "../lib/queryKeys";

// ─── Tree traversal helpers ──────────────────────────────────────────────────

function flattenToMap(nodes: OrgTreeNode[]): Map<string, OrgTreeNode> {
  const map = new Map<string, OrgTreeNode>();
  function walk(list: OrgTreeNode[]) {
    for (const n of list) {
      map.set(n._id, n);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(nodes);
  return map;
}

function getAncestors(id: string, nodes: OrgTreeNode[]): Set<string> {
  const nodeMap = flattenToMap(nodes);
  const ancestors = new Set<string>();
  let current = nodeMap.get(id);
  while (current?.managerId) {
    const parent = nodeMap.get(current.managerId);
    if (!parent) break;
    ancestors.add(parent._id);
    current = parent;
  }
  return ancestors;
}

function getDescendants(id: string, nodes: OrgTreeNode[]): Set<string> {
  const nodeMap = flattenToMap(nodes);
  const desc = new Set<string>();
  function walk(nid: string) {
    const n = nodeMap.get(nid);
    if (!n) return;
    for (const child of n.children ?? []) {
      desc.add(child._id);
      walk(child._id);
    }
  }
  walk(id);
  return desc;
}

// ─── Return type ─────────────────────────────────────────────────────────────

export interface UseOrgChartReturn {
  activeView: OrgView;
  setActiveView: (v: OrgView) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeRoles: Role[];
  setActiveRoles: (r: Role[]) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  dragTarget: DragTarget | null;
  setDragTarget: (t: DragTarget | null) => void;
  teamsData: OrgTeamGroup[];
  sectorData: OrgSectorGroup[];
  sectors: Sector[];
  isLoading: boolean;
  styledNodes: Node<OrgNodeData>[];
  styledEdges: Edge[];
  onNodesChange: OnNodesChange<Node<OrgNodeData>>;
  onEdgesChange: OnEdgesChange;
  filteredTotal: number;
  layoutNodes: Node<OrgNodeData>[];
  handleNodeClick: NodeMouseHandler<Node<OrgNodeData>>;
  handlePaneClick: () => void;
  handleNavigateTo: (id: string) => void;
  handleNodeDragStop: OnNodeDrag<Node<OrgNodeData>>;
  confirmMutation: { mutate: (t: DragTarget) => void; isPending: boolean };
  selectedPerson: OrgNodeData | null;
  allUsersData: OrgNodeData[];
  canEdit: boolean;
  legend?: OrgLegend;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
// Must be called inside a ReactFlowProvider

export function useOrgChart(): UseOrgChartReturn {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "hr";
  const queryClient = useQueryClient();
  const { fitView, setCenter, getNode } = useReactFlow();

  const [activeView, setActiveView] = useState<OrgView>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRoles, setActiveRoles] = useState<Role[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: treeData = [], isLoading: treeLoading } = useQuery({
    queryKey: ["org", "tree"],
    queryFn: () => orgApi.getOrgTree().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: activeView === "all",
  });

  const { data: teamsData = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["org", "teams"],
    queryFn: () => orgApi.getOrgTeams().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: activeView === "teams",
  });

  const { data: sectorData = [], isLoading: sectorLoading } = useQuery({
    queryKey: ["org", "sectors-view"],
    queryFn: () => orgApi.getOrgSectors().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: activeView === "sector",
  });

  const { data: sectors = [] } = useQuery({
    queryKey: ["sectors"],
    queryFn: () => orgApi.getSectors().then((r) => r.data),
  });

  const { data: legend } = useQuery({
    queryKey: ["org", "legend"],
    queryFn: () => orgApi.getLegend().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // ─── Layout + React Flow state ─────────────────────────────────────────────

  const { nodes: layoutNodes, edges: layoutEdges } = useOrgLayout(
    treeData,
    legend,
  );

  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node<OrgNodeData>>(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(layoutEdges);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  // Recadrage automatique : se relance quand le nombre de nœuds change (premier
  // chargement, bascule de vue, refetch). On laisse React Flow mesurer les
  // nœuds avant d'ajuster, sinon le fitView se cale sur des dimensions vides et
  // tasse le graphe en bas du canvas.
  const nodeCount = layoutNodes.length;
  useEffect(() => {
    if (nodeCount === 0) return;
    const id = setTimeout(
      () => fitView({ padding: 0.18, duration: 400, maxZoom: 1 }),
      160,
    );
    return () => clearTimeout(id);
  }, [nodeCount, fitView]);

  const allUsersData = useMemo(
    () => layoutNodes.map((n) => n.data),
    [layoutNodes],
  );

  // ─── Filter logic ──────────────────────────────────────────────────────────

  const { highlightIds, dimmedIds, filteredTotal } = useMemo(() => {
    const dimmed = new Set<string>();

    const searchMatchIds = new Set<string>();
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      for (const n of layoutNodes) {
        if (
          `${n.data.firstName} ${n.data.lastName}`.toLowerCase().includes(q)
        ) {
          searchMatchIds.add(n.id);
        }
      }
    }

    const roleMatchIds = new Set<string>();
    if (activeRoles.length > 0) {
      for (const n of layoutNodes) {
        if (activeRoles.includes(n.data.role)) roleMatchIds.add(n.id);
      }
    }

    const hasSearch = searchQuery.trim().length > 0;
    const hasRole = activeRoles.length > 0;

    let matchIds: Set<string>;
    if (!hasSearch && !hasRole) {
      matchIds = new Set(layoutNodes.map((n) => n.id));
    } else if (hasSearch && hasRole) {
      matchIds = new Set(
        [...searchMatchIds].filter((id) => roleMatchIds.has(id)),
      );
    } else if (hasSearch) {
      matchIds = searchMatchIds;
    } else {
      matchIds = roleMatchIds;
    }

    for (const n of layoutNodes) {
      if (!matchIds.has(n.id)) dimmed.add(n.id);
    }

    return {
      highlightIds: matchIds,
      dimmedIds: dimmed,
      filteredTotal: matchIds.size,
    };
  }, [searchQuery, activeRoles, layoutNodes]);

  // ─── Selection chain highlight ─────────────────────────────────────────────

  const chainIds = useMemo(() => {
    if (!selectedId) return null;
    const ancestors = getAncestors(selectedId, treeData);
    const descendants = getDescendants(selectedId, treeData);
    return new Set([selectedId, ...ancestors, ...descendants]);
  }, [selectedId, treeData]);

  // ─── Styled nodes + edges ──────────────────────────────────────────────────

  const styledNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedId,
        draggable: canEdit,
        style: {
          opacity:
            dimmedIds.has(n.id) || (chainIds !== null && !chainIds.has(n.id))
              ? 0.15
              : 1,
          transition: "opacity 0.2s",
        },
      })),
    [nodes, dimmedIds, chainIds, selectedId, canEdit],
  );

  const styledEdges = useMemo(
    () =>
      edges.map((e) => {
        const bothInChain =
          chainIds !== null && chainIds.has(e.source) && chainIds.has(e.target);
        const dimmedByFilter =
          dimmedIds.has(e.source) || dimmedIds.has(e.target);
        // Les liens transverses portent leur propre pointillé fin via le layout.
        // On le préserve ; seuls les liens hiérarchiques restent pleins.
        const isTransverse = e.id.startsWith("dotted-");
        return {
          ...e,
          style: {
            ...e.style,
            stroke: bothInChain
              ? "var(--blue)"
              : isTransverse
                ? "var(--amber)"
                : "var(--line-strong)",
            strokeWidth: bothInChain ? 2.5 : isTransverse ? 1.5 : 1.5,
            strokeDasharray: isTransverse ? "1 5" : undefined,
            opacity:
              chainIds !== null && !bothInChain
                ? 0.1
                : dimmedByFilter
                  ? 0.25
                  : 1,
          },
        };
      }),
    [edges, chainIds, dimmedIds],
  );

  // ─── Event handlers ────────────────────────────────────────────────────────

  const handleNodeClick: NodeMouseHandler<Node<OrgNodeData>> = useCallback(
    (_event, node) =>
      setSelectedId((prev) => (prev === node.id ? null : node.id)),
    [],
  );

  const handlePaneClick = useCallback(() => setSelectedId(null), []);

  const handleNavigateTo = useCallback(
    (id: string) => {
      const rfNode = getNode(id);
      if (rfNode) {
        setCenter(
          rfNode.position.x + (rfNode.width ?? 60) / 2,
          rfNode.position.y + (rfNode.height ?? 60) / 2,
          { zoom: 1.2, duration: 400 },
        );
      }
      setSelectedId(id);
    },
    [getNode, setCenter],
  );

  const confirmMutation = useMutation({
    mutationFn: ({ nodeId, newManagerId }: DragTarget) =>
      orgApi.patchOrgUser(nodeId, { managerId: newManagerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.org.all });
      setDragTarget(null);
    },
  });

  const handleNodeDragStop = useCallback<OnNodeDrag<Node<OrgNodeData>>>(
    (_event, draggedNode) => {
      if (!canEdit) return;
      const SNAP_DIST = 80;
      let closest: Node<OrgNodeData> | null = null;
      let minDist = SNAP_DIST;
      for (const n of nodes) {
        if (n.id === draggedNode.id) continue;
        const dx =
          draggedNode.position.x +
          (draggedNode.width ?? 60) / 2 -
          (n.position.x + (n.width ?? 60) / 2);
        const dy =
          draggedNode.position.y +
          (draggedNode.height ?? 60) / 2 -
          (n.position.y + (n.height ?? 60) / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          closest = n;
        }
      }
      if (closest && closest.id !== draggedNode.data.managerId) {
        setDragTarget({ nodeId: draggedNode.id, newManagerId: closest.id });
      }
    },
    [nodes, canEdit],
  );

  // ─── Auto-center on first search result ────────────────────────────────────

  useEffect(() => {
    if (!searchQuery || highlightIds.size === 0) return;
    const firstId = highlightIds.values().next().value as string | undefined;
    if (!firstId) return;
    const rfNode = getNode(firstId);
    if (rfNode) {
      setCenter(
        rfNode.position.x + (rfNode.width ?? 60) / 2,
        rfNode.position.y + (rfNode.height ?? 60) / 2,
        { zoom: 1.2, duration: 400 },
      );
    }
  }, [searchQuery, highlightIds, getNode, setCenter]);

  const selectedPerson = useMemo(
    () =>
      selectedId
        ? (allUsersData.find((u) => u.id === selectedId) ?? null)
        : null,
    [selectedId, allUsersData],
  );

  return {
    activeView,
    setActiveView,
    searchQuery,
    setSearchQuery,
    activeRoles,
    setActiveRoles,
    selectedId,
    setSelectedId,
    dragTarget,
    setDragTarget,
    teamsData,
    sectorData,
    sectors,
    isLoading: treeLoading || teamsLoading || sectorLoading,
    styledNodes,
    styledEdges,
    onNodesChange,
    onEdgesChange,
    filteredTotal,
    layoutNodes,
    handleNodeClick,
    handlePaneClick,
    handleNavigateTo,
    handleNodeDragStop,
    confirmMutation: {
      mutate: confirmMutation.mutate,
      isPending: confirmMutation.isPending,
    },
    selectedPerson,
    allUsersData,
    canEdit,
    legend,
  };
}
