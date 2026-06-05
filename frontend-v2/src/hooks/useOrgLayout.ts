import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import dagre from "dagre";
import type { OrgTreeNode, OrgLegend, Role } from "../types";

const DEFAULT_ROLE_COLORS: Record<Role, string> = {
  admin: "#0D9488",
  hr: "#059669",
  manager: "#2563EB",
  employee: "#64748B",
};
const DEFAULT_HIERARCHICAL_COLOR = "#94A3B8";
const DEFAULT_TRANSVERSE_COLOR = "#D97706";

function getNodeSize(reportCount: number): number {
  if (reportCount === 0) return 48;
  if (reportCount <= 2) return 56;
  if (reportCount <= 5) return 64;
  if (reportCount <= 10) return 72;
  return 80;
}

function flattenTree(
  nodes: OrgTreeNode[],
  parentId: string | null = null,
  allNodes: { node: OrgTreeNode; parentId: string | null }[] = [],
  allEdges: { source: string; target: string }[] = [],
): {
  allNodes: { node: OrgTreeNode; parentId: string | null }[];
  allEdges: { source: string; target: string }[];
} {
  for (const node of nodes) {
    allNodes.push({ node, parentId });
    if (parentId) {
      allEdges.push({ source: parentId, target: node._id });
    }
    if (node.children?.length) {
      flattenTree(node.children, node._id, allNodes, allEdges);
    }
  }
  return { allNodes, allEdges };
}

export interface OrgNodeData {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
  department?: string;
  email?: string;
  sectorId?: string;
  managerId?: string;
  dottedLineManagerIds?: string[];
  avatar?: string;
  reportCount: number;
  size: number;
  color: string;
  initials: string;
  hasNoManager: boolean;
  [key: string]: unknown;
}

const VIRTUAL_ROOT = "__virtual_root__";

export function useOrgLayout(
  treeData: OrgTreeNode[] | undefined,
  legend?: OrgLegend,
): {
  nodes: Node<OrgNodeData>[];
  edges: Edge[];
} {
  const roleColors: Record<Role, string> = {
    admin: legend?.roles?.admin?.color ?? DEFAULT_ROLE_COLORS.admin,
    hr: legend?.roles?.hr?.color ?? DEFAULT_ROLE_COLORS.hr,
    manager: legend?.roles?.manager?.color ?? DEFAULT_ROLE_COLORS.manager,
    employee: legend?.roles?.employee?.color ?? DEFAULT_ROLE_COLORS.employee,
  };
  const hierarchicalColor =
    legend?.edges?.hierarchical?.color ?? DEFAULT_HIERARCHICAL_COLOR;
  const transverseColor =
    legend?.edges?.transverse?.color ?? DEFAULT_TRANSVERSE_COLOR;

  return useMemo(() => {
    if (!treeData?.length) return { nodes: [], edges: [] };

    const { allNodes, allEdges } = flattenTree(treeData);

    // Identify root nodes (no parent edge targets them)
    const hasParent = new Set(allEdges.map((e) => e.target));
    const rootIds = allNodes
      .filter(({ node }) => !hasParent.has(node._id))
      .map(({ node }) => node._id);

    const useVirtualRoot = rootIds.length > 1;

    // Build dagre graph
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: "TB",
      ranksep: 140,
      nodesep: 70,
      marginx: 60,
      marginy: 60,
    });
    g.setDefaultEdgeLabel(() => ({}));

    // Map reportCount per node
    const reportCountMap = new Map<string, number>();
    for (const { node } of allNodes) {
      reportCountMap.set(node._id, node.children?.length ?? 0);
    }

    // Add virtual root if needed
    if (useVirtualRoot) {
      g.setNode(VIRTUAL_ROOT, { width: 1, height: 1 });
    }

    // Add real nodes to dagre
    for (const { node } of allNodes) {
      const size = getNodeSize(reportCountMap.get(node._id) ?? 0);
      g.setNode(node._id, { width: size + 80, height: size + 60 });
    }

    // Add real edges to dagre
    for (const { source, target } of allEdges) {
      g.setEdge(source, target);
    }

    // Add virtual edges from virtual root to each real root
    if (useVirtualRoot) {
      for (const rid of rootIds) {
        g.setEdge(VIRTUAL_ROOT, rid);
      }
    }

    dagre.layout(g);

    // Build React Flow nodes (exclude virtual root)
    const rfNodes: Node<OrgNodeData>[] = allNodes.map(({ node }) => {
      const gNode = g.node(node._id);
      const reportCount = reportCountMap.get(node._id) ?? 0;
      const size = getNodeSize(reportCount);
      const color = roleColors[node.role as Role] ?? "#64748B";
      const initials =
        `${node.firstName?.[0] ?? ""}${node.lastName?.[0] ?? ""}`.toUpperCase();

      return {
        id: node._id,
        type: "orgCircle",
        position: {
          x: gNode.x - (size + 80) / 2,
          y: gNode.y - (size + 60) / 2,
        },
        data: {
          id: node._id,
          firstName: node.firstName,
          lastName: node.lastName,
          role: node.role as Role,
          department: node.department,
          email: node.email,
          sectorId: node.sectorId ?? undefined,
          managerId: node.managerId ?? undefined,
          dottedLineManagerIds: node.dottedLineManagerIds ?? undefined,
          avatar: node.avatar ?? undefined,
          reportCount,
          size,
          color,
          initials,
          hasNoManager: !node.managerId,
        },
      };
    });

    // Build React Flow edges (exclude virtual root edges)
    const rfEdges: Edge[] = allEdges.map(({ source, target }) => ({
      id: `e-${source}-${target}`,
      source,
      target,
      type: "smoothstep",
      style: {
        stroke: hierarchicalColor,
        strokeWidth: 1.5,
        strokeDasharray: "6 3",
      },
    }));

    // Liens transverses (matriciel) — rendus distincts : ambre, pointillés fins.
    // Ajoutés uniquement si le responsable transverse est lui-même visible.
    const nodeIdSet = new Set(allNodes.map(({ node }) => node._id));
    for (const { node } of allNodes) {
      for (const mid of node.dottedLineManagerIds ?? []) {
        if (!nodeIdSet.has(mid)) continue;
        rfEdges.push({
          id: `dotted-${mid}-${node._id}`,
          source: mid,
          target: node._id,
          type: "smoothstep",
          style: {
            stroke: transverseColor,
            strokeWidth: 1.5,
            strokeDasharray: "1 5",
          },
        });
      }
    }

    return { nodes: rfNodes, edges: rfEdges };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- couleurs incluses via primitives ci-dessous
  }, [
    treeData,
    hierarchicalColor,
    transverseColor,
    roleColors.admin,
    roleColors.hr,
    roleColors.manager,
    roleColors.employee,
  ]);
}
