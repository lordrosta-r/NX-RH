import { lazy, Suspense } from "react";
import { useAuth } from "../contexts/AuthContext";
import { usePerspective } from "../contexts/PerspectiveContext";

const DashboardAdminPage = lazy(() => import("./DashboardAdminPage"));
const DashboardHrPage = lazy(() => import("./DashboardHrPage"));
const DashboardManagerPage = lazy(() => import("./DashboardManagerPage"));
const DashboardEmployeePage = lazy(() => import("./DashboardEmployeePage"));

function Loader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-600">Chargement…</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const { perspective } = usePerspective();

  if (isLoading) return <Loader />;
  if (!user) return null;

  // « Mon espace » → vue collaborateur, quel que soit le rôle.
  const personal = perspective === "me";
  const role = personal ? "employee" : user.role;

  return (
    <Suspense fallback={<Loader />}>
      {role === "admin" && <DashboardAdminPage />}
      {role === "hr" && <DashboardHrPage />}
      {role === "manager" && <DashboardManagerPage />}
      {(role === "employee" || !["admin", "hr", "manager"].includes(role)) && (
        <DashboardEmployeePage />
      )}
    </Suspense>
  );
}
