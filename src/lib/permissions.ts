export type UserRole =
  | "general_manager"
  | "local_manager"
  | "nutritionist"
  | "technician"
  | "manager"; // legacy

export type PermissionKey =
  | "manage_units"
  | "manage_wards"
  | "manage_professionals"
  | "manage_managers"
  | "manage_supplies"
  | "manage_formulas"
  | "manage_costs"
  | "manage_patients"
  | "move_patients"
  | "manage_reports";

type PermissionMatrix = Partial<Record<UserRole, Partial<Record<PermissionKey, boolean>>>>;

const ROLE_PERMISSION_STORAGE_KEY = "rolePermissionMatrixV1";

const DEFAULT_PERMISSION_MATRIX: Record<UserRole, Partial<Record<PermissionKey, boolean>>> = {
  general_manager: {
    manage_units: true,
    manage_wards: true,
    manage_managers: true,
    manage_professionals: true,
    manage_supplies: true,
    manage_formulas: true,
    manage_costs: true,
    manage_patients: true,
    move_patients: true,
    manage_reports: true,
  },
  local_manager: {
    manage_units: false,
    manage_wards: true,
    manage_managers: false,
    manage_professionals: true,
    manage_supplies: true,
    manage_formulas: true,
    manage_costs: true,
    manage_patients: true,
    move_patients: true,
    manage_reports: true,
  },
  nutritionist: {
    manage_units: false,
    manage_wards: false,
    manage_managers: false,
    manage_professionals: true,
    manage_supplies: false,
    manage_formulas: false,
    manage_costs: false,
    manage_patients: true,
    move_patients: true,
    manage_reports: true,
  },
  technician: {
    manage_units: false,
    manage_wards: false,
    manage_managers: false,
    manage_professionals: true,
    manage_supplies: false,
    manage_formulas: false,
    manage_costs: false,
    manage_patients: true,
    move_patients: false,
    manage_reports: true,
  },
  manager: {
    manage_units: true,
    manage_wards: true,
    manage_managers: true,
    manage_professionals: true,
    manage_supplies: true,
    manage_formulas: true,
    manage_costs: true,
    manage_patients: true,
    move_patients: true,
    manage_reports: true,
  },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  general_manager: "Gestor geral",
  local_manager: "Gestor local",
  nutritionist: "Nutricionista",
  technician: "T\u00e9cnico",
  manager: "Gestor geral",
};

export const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "general_manager", label: "Gestor geral" },
  { value: "local_manager", label: "Gestor local" },
  { value: "nutritionist", label: "Nutricionista" },
  { value: "technician", label: "T\u00e9cnico" },
];

export const normalizeRole = (role?: string | null): UserRole => {
  if (!role) return "nutritionist";
  if (role === "manager") return "general_manager";
  if (role === "general_manager") return "general_manager";
  if (role === "local_manager") return "local_manager";
  if (role === "nutritionist") return "nutritionist";
  if (role === "technician") return "technician";
  return "nutritionist";
};

export const getRoleLabel = (role?: string | null): string => {
  return ROLE_LABELS[normalizeRole(role)];
};

export const getCurrentRole = (): UserRole => {
  if (typeof window === "undefined") return "nutritionist";
  return normalizeRole(localStorage.getItem("userRole"));
};

export const getCurrentHospitalId = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("userHospitalId");
};

export const hasActiveSession = (): boolean => {
  if (typeof window === "undefined") return false;
  const role = localStorage.getItem("userRole");
  const name = localStorage.getItem("userName");
  const hospitalId = localStorage.getItem("userHospitalId");
  return Boolean(role && name && hospitalId);
};

const getStoredPermissionMatrix = (): PermissionMatrix | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ROLE_PERMISSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PermissionMatrix;
  } catch {
    return null;
  }
};

export const clearPermissionMatrix = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ROLE_PERMISSION_STORAGE_KEY);
};

export const applyRolePermissionsFromDatabase = (
  rows: Array<{ role: string; permissionKey: string; allowed: boolean }>
): void => {
  if (typeof window === "undefined") return;

  const matrix: PermissionMatrix = {};

  for (const row of rows) {
    const role = normalizeRole(row.role);
    const permission = row.permissionKey as PermissionKey;
    if (!DEFAULT_PERMISSION_MATRIX[role] || !(permission in DEFAULT_PERMISSION_MATRIX[role])) {
      continue;
    }

    if (!matrix[role]) matrix[role] = {};
    matrix[role]![permission] = Boolean(row.allowed);
  }

  localStorage.setItem(ROLE_PERMISSION_STORAGE_KEY, JSON.stringify(matrix));
};

export const can = (role: UserRole, permission: PermissionKey): boolean => {
  const normalized = normalizeRole(role);
  const storedMatrix = getStoredPermissionMatrix();
  const storedPermission = storedMatrix?.[normalized]?.[permission];
  if (typeof storedPermission === "boolean") {
    return storedPermission;
  }

  return Boolean(DEFAULT_PERMISSION_MATRIX[normalized]?.[permission]);
};
