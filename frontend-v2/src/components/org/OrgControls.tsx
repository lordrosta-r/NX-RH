import { ZoomIn, ZoomOut, Maximize2, Crosshair } from 'lucide-react'
import { useReactFlow } from '@xyflow/react'

export default function OrgControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  const handleCenter = () => {
    fitView({ padding: 0.1, duration: 400 })
  }

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
      <button
        onClick={() => zoomIn({ duration: 200 })}
        className="w-9 h-9 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        title="Zoom avant"
      >
        <ZoomIn size={16} />
      </button>
      <button
        onClick={() => zoomOut({ duration: 200 })}
        className="w-9 h-9 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        title="Zoom arrière"
      >
        <ZoomOut size={16} />
      </button>
      <button
        onClick={handleCenter}
        className="w-9 h-9 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        title="Centrer"
      >
        <Crosshair size={16} />
      </button>
      <button
        onClick={() => fitView({ padding: 0.15, duration: 400 })}
        className="w-9 h-9 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        title="Ajuster à l'écran"
      >
        <Maximize2 size={16} />
      </button>
    </div>
  )
}
