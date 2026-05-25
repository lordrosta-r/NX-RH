import { ChartBar } from 'lucide-react'

export default function AdminStatsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
        <ChartBar className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Statistiques</h1>
      <p className="text-slate-500 text-sm">En cours de développement</p>
      <p className="text-slate-400 text-xs max-w-sm text-center">
        Le tableau de bord statistiques global sera disponible prochainement.
      </p>
    </div>
  )
}
