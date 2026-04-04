import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { can, normalizeRole, PermissionKey } from "@/lib/permissions";
import { useSession } from "@/hooks/useSession";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: PermissionKey[];
}

const ProtectedRoute = ({ children, requiredPermissions }: ProtectedRouteProps) => {
  const { isAuthenticated, hospitalId, role } = useSession();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!hospitalId) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const normalizedRole = normalizeRole(role);
    const isAllowed = requiredPermissions.some((permission) => can(normalizedRole, permission));
    if (!isAllowed) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
