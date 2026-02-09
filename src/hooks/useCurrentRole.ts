import { useEffect, useState } from "react";
import { getCurrentRole, UserRole } from "@/lib/permissions";

export const useCurrentRole = () => {
  const [role, setRole] = useState<UserRole>("nutritionist");

  useEffect(() => {
    const syncRole = () => setRole(getCurrentRole());
    syncRole();
    window.addEventListener("enmeta-session-updated", syncRole);
    return () => window.removeEventListener("enmeta-session-updated", syncRole);
  }, []);

  return role;
};
