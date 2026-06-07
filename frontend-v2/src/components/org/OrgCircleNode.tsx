import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import type { OrgNodeData } from "../../hooks/useOrgLayout";
import OrgTooltip from "./OrgTooltip";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  hr: "RH",
  manager: "Responsable",
  employee: "Collaborateur",
};

function OrgCircleNode({ data, selected }: NodeProps<Node<OrgNodeData>>) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const {
    size,
    color,
    initials,
    firstName,
    lastName,
    role,
    hasNoManager,
    reportCount,
  } = data;

  const fullName = `${firstName} ${lastName}`;
  const truncatedName =
    fullName.length > 14 ? fullName.slice(0, 13) + "…" : fullName;

  const handleMouseEnter = () => {
    tooltipTimerRef.current = setTimeout(() => setShowTooltip(true), 300);
  };

  const handleMouseLeave = () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = null;
    setShowTooltip(false);
  };

  const fontSize = size >= 72 ? 18 : size >= 64 ? 16 : size >= 56 ? 14 : 12;

  return (
    <div
      className="flex flex-col items-center cursor-pointer select-none relative"
      style={{ width: size + 60, paddingBottom: 4 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {/* Circle */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Dashed ring for no-manager (admin/hr view) */}
        {hasNoManager && (
          <div
            className="absolute inset-0 rounded-full border-2 border-dashed"
            style={{
              width: size + 6,
              height: size + 6,
              left: -3,
              top: -3,
              borderColor: "var(--amber)",
            }}
          />
        )}

        {/* Main circle */}
        <div
          className="avatar rounded-full flex items-center justify-center font-semibold transition-all duration-200"
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            color: "#fff",
            fontSize,
            border: "2px solid #fff",
            boxShadow: selected
              ? `0 0 0 2px #fff, 0 0 0 4px var(--blue), 0 6px 16px -6px rgba(27,27,120,0.45)`
              : showTooltip
                ? "var(--shadow)"
                : "var(--shadow-sm)",
            transform: showTooltip ? "scale(1.06)" : "scale(1)",
          }}
        >
          {initials}
        </div>
      </div>

      {/* Name */}
      <span
        className="mt-2 text-center leading-tight"
        style={{
          maxWidth: size + 56,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--ink)",
        }}
      >
        {truncatedName}
      </span>

      {/* Role badge */}
      <span
        className="mt-1 px-1.5 py-0.5"
        style={{
          fontSize: 9,
          lineHeight: 1.2,
          letterSpacing: "0.02em",
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: 999,
          color: "var(--ink-3)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {ROLE_LABELS[role] ?? role}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <OrgTooltip
          firstName={firstName}
          lastName={lastName}
          role={role}
          color={color}
          department={data.department}
          email={data.email}
          reportCount={reportCount}
        />
      )}
    </div>
  );
}

export default memo(OrgCircleNode);
