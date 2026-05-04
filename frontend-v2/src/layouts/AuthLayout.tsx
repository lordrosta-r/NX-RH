import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">NX</span>
          </div>
          <span className="text-2xl font-bold text-slate-900">RH</span>
        </div>
        <p className="text-sm text-slate-500">L&apos;entretien annuel, simplifié.</p>
      </div>

      {/* Contenu de la page auth */}
      <div className="w-full max-w-md">
        <Outlet />
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-slate-400">
        © {new Date().getFullYear()} NX-RH · Tous droits réservés
      </p>
    </div>
  )
}
