import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { Role } from "../../types";

interface RBACGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  /** Renders this node instead of redirecting when access is denied. */
  fallback?: React.ReactNode;
}

export function RBACGuard({
  children,
  allowedRoles,
  fallback,
}: RBACGuardProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
