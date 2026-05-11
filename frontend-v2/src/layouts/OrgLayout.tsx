import { Outlet } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { ToastContainer } from '../components/ui'

/**
 * Layout plein-écran pour l'organigramme.
 * Pas de container max-w-7xl ni de padding — React Flow occupe tout l'espace
 * sous la navbar.
 */
export default function OrgLayout() {
  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <Navbar />
      <main className="flex-1 flex flex-col pt-16 overflow-hidden" style={{ minHeight: 0 }}>
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  )
}
