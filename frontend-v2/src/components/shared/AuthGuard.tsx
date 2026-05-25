import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { Role } from "../../types";

interface AuthGuardProps {
  children: React.ReactNode;
  roles?: Role[];
}

export default function AuthGuard({ children, roles }: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
