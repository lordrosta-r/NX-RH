import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import SetupBanner from "../components/layout/SetupBanner";
import ImpersonationBanner from "../components/layout/ImpersonationBanner";
import { ToastContainer } from "../components/ui";
import SearchOverlay from "../components/shared/SearchOverlay";
import { PerspectiveProvider } from "../contexts/PerspectiveContext";
import "../styles/app.css";

export default function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <PerspectiveProvider>
      <div className="min-h-screen bg-[#f5f5f9] dark:bg-slate-950 flex flex-col">
        {/* Accessibilité clavier : skip-to-main */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-white focus:text-blue-700 focus:font-semibold focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
        >
          Aller au contenu principal
        </a>
        {/* Navbar institutionnelle (scopée .nx-app en interne) */}
        <ImpersonationBanner />
        <Navbar onSearchClick={() => setSearchOpen(true)} />
        <SetupBanner />
        <main id="main-content" className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <Outlet />
          </div>
        </main>
        <Footer />
        <ToastContainer />
        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </PerspectiveProvider>
  );
}
