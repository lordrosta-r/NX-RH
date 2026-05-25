import { type ComponentType } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  type NodeTypes,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  OrgCircleNode,
  OrgControls,
  OrgDragConfirmDialog,
  OrgSectorsView,
  OrgSidePanel,
  OrgTeamsView,
  OrgToolbar,
} from "../components/org";
import { useOrgChart } from "../hooks/useOrgChart";
import type { OrgNodeData } from "../hooks/useOrgLayout";

const nodeTypes: NodeTypes = {
  orgCircle: OrgCircleNode as ComponentType<
    NodeProps & { data: OrgNodeData; type: string }
  >,
};

function OrgFlowInner() {
  const chart = useOrgChart();

  const toolbar = (
    <OrgToolbar
      activeView={chart.activeView}
      onViewChange={(v) => {
        chart.setActiveView(v);
        chart.setSelectedId(null);
      }}
      searchQuery={chart.searchQuery}
      onSearchChange={chart.setSearchQuery}
      activeRoles={chart.activeRoles}
      onRolesChange={chart.setActiveRoles}
      totalCount={chart.layoutNodes.length}
      filteredCount={chart.filteredTotal}
    />
  );

  if (chart.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">
            Chargement de l'organigramme…
          </p>
        </div>
      </div>
    );
  }

  if (chart.activeView === "teams")
    return <OrgTeamsView data={chart.teamsData} toolbar={toolbar} />;
  if (chart.activeView === "sector")
    return <OrgSectorsView data={chart.sectorData} toolbar={toolbar} />;

  return (
    <div className="relative flex-1" style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <ReactFlow
          nodes={chart.styledNodes}
          edges={chart.styledEdges}
          onNodesChange={chart.onNodesChange}
          onEdgesChange={chart.onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={chart.handleNodeClick}
          onPaneClick={chart.handlePaneClick}
          onNodeDragStop={chart.canEdit ? chart.handleNodeDragStop : undefined}
          nodesDraggable={chart.canEdit}
          nodesConnectable={false}
          elementsSelectable
          minZoom={0.05}
          maxZoom={2}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="var(--color-slate-200)"
          />
        </ReactFlow>
      </div>
      {toolbar}
      <OrgControls />
      {chart.selectedPerson && (
        <OrgSidePanel
          person={chart.selectedPerson}
          canEdit={chart.canEdit}
          onClose={() => chart.setSelectedId(null)}
          onNavigateTo={chart.handleNavigateTo}
          sectors={chart.sectors}
          allUsers={chart.allUsersData}
        />
      )}
      {chart.dragTarget && (
        <OrgDragConfirmDialog
          target={chart.dragTarget}
          allUsers={chart.allUsersData}
          isPending={chart.confirmMutation.isPending}
          onConfirm={() => chart.confirmMutation.mutate(chart.dragTarget!)}
          onCancel={() => chart.setDragTarget(null)}
        />
      )}
    </div>
  );
}

export default function OrgPage() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <ReactFlowProvider>
        <OrgFlowInner />
      </ReactFlowProvider>
    </div>
  );
}
