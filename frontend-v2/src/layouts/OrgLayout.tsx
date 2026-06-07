import { Outlet } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { ToastContainer } from "../components/ui";
import { PerspectiveProvider } from "../contexts/PerspectiveContext";

/**
 * Layout plein-écran pour l'organigramme.
 * Pas de container max-w-7xl ni de padding — React Flow occupe tout l'espace
 * sous la navbar.
 *
 * La Navbar utilise usePerspective() → il FAUT envelopper dans
 * PerspectiveProvider (sinon crash « usePerspective must be used within
 * PerspectiveProvider »), comme AppLayout.
 */
export default function OrgLayout() {
  return (
    <PerspectiveProvider>
      <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
        <Navbar />
        <main
          className="flex-1 flex flex-col pt-16 overflow-hidden"
          style={{ minHeight: 0 }}
        >
          <Outlet />
        </main>
        <ToastContainer />
      </div>
    </PerspectiveProvider>
  );
}
