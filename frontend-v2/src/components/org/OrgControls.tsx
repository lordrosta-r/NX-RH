import { ZoomIn, ZoomOut, Maximize2, Crosshair } from "lucide-react";
import { useReactFlow } from "@xyflow/react";

export default function OrgControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleCenter = () => {
    fitView({ padding: 0.1, duration: 400 });
  };

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
      <button
        onClick={() => zoomIn({ duration: 200 })}
        className="icon-btn"
        style={{ boxShadow: "var(--shadow-sm)" }}
        title="Zoom avant"
        aria-label="Zoom avant"
      >
        <ZoomIn size={16} />
      </button>
      <button
        onClick={() => zoomOut({ duration: 200 })}
        className="icon-btn"
        style={{ boxShadow: "var(--shadow-sm)" }}
        title="Zoom arrière"
        aria-label="Zoom arrière"
      >
        <ZoomOut size={16} />
      </button>
      <button
        onClick={handleCenter}
        className="icon-btn"
        style={{ boxShadow: "var(--shadow-sm)" }}
        title="Centrer"
        aria-label="Centrer"
      >
        <Crosshair size={16} />
      </button>
      <button
        onClick={() => fitView({ padding: 0.15, duration: 400 })}
        className="icon-btn"
        style={{ boxShadow: "var(--shadow-sm)" }}
        title="Ajuster à l'écran"
        aria-label="Ajuster à l'écran"
      >
        <Maximize2 size={16} />
      </button>
    </div>
  );
}
