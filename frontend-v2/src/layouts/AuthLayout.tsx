import { Outlet } from 'react-router-dom'
import nxLogo from '../assets/nx-logo.png'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center mb-2">
          <img src={nxLogo} alt="NanoXplore RH" className="h-10 w-auto" />
        </div>
        <p className="text-sm text-slate-500">L&apos;entretien annuel, simplifié.</p>
      </div>

      {/* Contenu de la page auth */}
      <div className="w-full max-w-md">
        <Outlet />
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-slate-500">
        © {new Date().getFullYear()} NX-RH · Tous droits réservés
      </p>
    </div>
  )
}
