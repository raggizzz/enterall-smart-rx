import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { can, getCurrentHospitalId, getCurrentRole, hasActiveSession, PermissionKey } from "@/lib/permissions";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: PermissionKey[];
}

const ProtectedRoute = ({ children, requiredPermissions }: ProtectedRouteProps) => {
  if (!hasActiveSession()) {
    return <Navigate to="/" replace />;
  }

  if (!getCurrentHospitalId()) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const role = getCurrentRole();
    const isAllowed = requiredPermissions.some((permission) => can(role, permission));
    if (!isAllowed) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
