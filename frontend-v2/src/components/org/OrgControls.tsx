import type React from "react";
import { ZoomIn, ZoomOut, Maximize2, Crosshair } from "lucide-react";
import { useReactFlow } from "@xyflow/react";

const btnStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#fff",
  border: "none",
  color: "var(--ink-2)",
  cursor: "pointer",
};

export default function OrgControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleCenter = () => {
    fitView({ padding: 0.18, duration: 400, maxZoom: 1 });
  };

  const onEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "var(--bg-alt)";
    e.currentTarget.style.color = "var(--blue)";
  };
  const onLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "#fff";
    e.currentTarget.style.color = "var(--ink-2)";
  };

  return (
    <div
      className="absolute bottom-4 right-4 z-10 flex flex-col"
      style={{
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => zoomIn({ duration: 200 })}
        style={btnStyle}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        title="Zoom avant"
        aria-label="Zoom avant"
      >
        <ZoomIn size={16} />
      </button>
      <span style={{ height: 1, background: "var(--line)" }} />
      <button
        onClick={() => zoomOut({ duration: 200 })}
        style={btnStyle}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        title="Zoom arrière"
        aria-label="Zoom arrière"
      >
        <ZoomOut size={16} />
      </button>
      <span style={{ height: 1, background: "var(--line)" }} />
      <button
        onClick={handleCenter}
        style={btnStyle}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        title="Centrer"
        aria-label="Centrer"
      >
        <Crosshair size={16} />
      </button>
      <span style={{ height: 1, background: "var(--line)" }} />
      <button
        onClick={() => fitView({ padding: 0.18, duration: 400, maxZoom: 1 })}
        style={btnStyle}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        title="Ajuster à l'écran"
        aria-label="Ajuster à l'écran"
      >
        <Maximize2 size={16} />
      </button>
    </div>
  );
}
