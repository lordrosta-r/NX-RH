import React from "react";
import type {
  DepartmentGroup,
  DepartmentTreeNode,
} from "../../hooks/useOrgChart";
import { ROLE_COLORS_HEX, initials } from "./orgUtils";

interface OrgDepartmentsViewProps {
  data: DepartmentGroup[];
  toolbar: React.ReactNode;
}

// Un nœud + ses descendants, en cascade (tentaculaire) via l'indentation.
function TreeNode({
  node,
  depth,
}: {
  node: DepartmentTreeNode;
  depth: number;
}) {
  const u = node.user;
  const color = ROLE_COLORS_HEX[u.role] ?? "var(--ink-3)";
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1"
        style={{
          paddingLeft: depth * 22,
          borderLeft: depth > 0 ? "1px solid var(--line)" : undefined,
          marginLeft: depth > 0 ? 10 : 0,
        }}
      >
        <div
          className="avatar flex-shrink-0"
          style={{
            width: depth === 0 ? 30 : 24,
            height: depth === 0 ? 30 : 24,
            fontSize: depth === 0 ? 12 : 10,
            backgroundColor: color,
          }}
        >
          {initials(u.firstName, u.lastName)}
        </div>
        <div className="min-w-0">
          <p
            className="truncate"
            style={{
              fontSize: depth === 0 ? 14 : 13,
              fontWeight: depth === 0 ? 700 : hasChildren ? 600 : 400,
              color: "var(--ink)",
            }}
          >
            {u.firstName} {u.lastName}
          </p>
          {u.position ? (
            <p className="small truncate" style={{ color: "var(--ink-3)" }}>
              {String(u.position)}
            </p>
          ) : null}
        </div>
        {hasChildren && (
          <span className="badge grey ml-auto" style={{ fontSize: 10 }}>
            {node.children.length}
          </span>
        )}
      </div>
      {hasChildren && (
        <div>
          {node.children.map((c) => (
            <TreeNode key={c.user.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgDepartmentsView({
  data,
  toolbar,
}: OrgDepartmentsViewProps) {
  return (
    <div className="relative flex-1 flex flex-col" style={{ overflow: "hidden" }}>
      {toolbar}
      <div className="flex-1 overflow-y-auto p-6 pt-20">
        {data.length === 0 ? (
          <p className="small" style={{ fontStyle: "italic" }}>
            Aucun département à afficher.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
            {data.map((group) => (
              <div key={group.department} className="tile" style={{ padding: 16 }}>
                <div
                  className="flex items-center gap-2 mb-3 pb-3"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <h3 className="h3 truncate" style={{ fontSize: 15 }}>
                    {group.department}
                  </h3>
                  <span className="badge blue" style={{ marginLeft: "auto" }}>
                    {group.count}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {group.roots.map((root) => (
                    <TreeNode key={root.user.id} node={root} depth={0} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
