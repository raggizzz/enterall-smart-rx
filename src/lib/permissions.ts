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
  | "manage_role_permissions"
  | "manage_supplies"
  | "manage_formulas"
  | "manage_costs"
  | "manage_patients"
  | "move_patients"
  | "manage_prescriptions"
  | "manage_monitoring"
  | "manage_billing"
  | "manage_labels"
  | "manage_oral_map"
  | "manage_tools"
  | "manage_reports";

type PermissionMatrix = Partial<Record<UserRole, Partial<Record<PermissionKey, boolean>>>>;

const ROLE_PERMISSION_STORAGE_KEY = "rolePermissionMatrixV1";

const DEFAULT_PERMISSION_MATRIX: Record<UserRole, Partial<Record<PermissionKey, boolean>>> = {
  general_manager: {
    manage_units: true,
    manage_wards: true,
    manage_managers: true,
    manage_role_permissions: true,
    manage_professionals: true,
    manage_supplies: true,
    manage_formulas: true,
    manage_costs: true,
    manage_patients: true,
    move_patients: true,
    manage_prescriptions: true,
    manage_monitoring: true,
    manage_billing: true,
    manage_labels: true,
    manage_oral_map: true,
    manage_tools: true,
    manage_reports: true,
  },
  local_manager: {
    manage_units: false,
    manage_wards: true,
    manage_managers: false,
    manage_role_permissions: true,
    manage_professionals: true,
    manage_supplies: true,
    manage_formulas: true,
    manage_costs: true,
    manage_patients: true,
    move_patients: true,
    manage_prescriptions: true,
    manage_monitoring: true,
    manage_billing: true,
    manage_labels: true,
    manage_oral_map: true,
    manage_tools: true,
    manage_reports: true,
  },
  nutritionist: {
    manage_units: false,
    manage_wards: false,
    manage_managers: false,
    manage_role_permissions: false,
    manage_professionals: false,
    manage_supplies: false,
    manage_formulas: false,
    manage_costs: false,
    manage_patients: true,
    move_patients: true,
    manage_prescriptions: true,
    manage_monitoring: true,
    manage_billing: true,
    manage_labels: true,
    manage_oral_map: true,
    manage_tools: true,
    manage_reports: true,
  },
  technician: {
    manage_units: false,
    manage_wards: false,
    manage_managers: false,
    manage_role_permissions: false,
    manage_professionals: false,
    manage_supplies: false,
    manage_formulas: false,
    manage_costs: false,
    manage_patients: false,
    move_patients: false,
    manage_prescriptions: false,
    manage_monitoring: false,
    manage_billing: true,
    manage_labels: true,
    manage_oral_map: true,
    manage_tools: false,
    manage_reports: false,
  },
  manager: {
    manage_units: true,
    manage_wards: true,
    manage_managers: true,
    manage_role_permissions: true,
    manage_professionals: true,
    manage_supplies: true,
    manage_formulas: true,
    manage_costs: true,
    manage_patients: true,
    move_patients: true,
    manage_prescriptions: true,
    manage_monitoring: true,
    manage_billing: true,
    manage_labels: true,
    manage_oral_map: true,
    manage_tools: true,
    manage_reports: true,
  },
};

export const getDefaultPermissionsForRole = (
  role: UserRole,
): Partial<Record<PermissionKey, boolean>> => ({ ...(DEFAULT_PERMISSION_MATRIX[normalizeRole(role)] || {}) });

export const PERMISSION_DEFINITIONS: Array<{
  key: PermissionKey;
  label: string;
  description: string;
}> = [
  { key: "manage_units", label: "Unidades", description: "Cadastrar e editar unidades hospitalares." },
  { key: "manage_wards", label: "Alas e setores", description: "Cadastrar e editar alas/setores." },
  { key: "manage_managers", label: "Gestores", description: "Cadastrar gestores gerais e locais." },
  { key: "manage_role_permissions", label: "Perfis e permissoes", description: "Configurar o que cada perfil pode fazer." },
  { key: "manage_professionals", label: "Profissionais", description: "Cadastrar nutricionistas e tecnicos." },
  { key: "manage_supplies", label: "Insumos", description: "Cadastrar frascos, equipos e demais insumos." },
  { key: "manage_formulas", label: "Formulas e modulos", description: "Cadastrar formulas, suplementos e modulos." },
  { key: "manage_costs", label: "Custos", description: "Alterar custos e parametros gerenciais." },
  { key: "manage_patients", label: "Pacientes", description: "Cadastrar e editar pacientes." },
  { key: "move_patients", label: "Mover pacientes", description: "Alterar unidade e setor do paciente." },
  { key: "manage_prescriptions", label: "Prescricoes", description: "Criar e editar prescricoes nutricionais." },
  { key: "manage_monitoring", label: "Acompanhamento", description: "Registrar evolucao e monitoramento nutricional." },
  { key: "manage_billing", label: "Faturamento", description: "Gerar requisicoes, faturamento e cancelamento tecnico." },
  { key: "manage_labels", label: "Etiquetas", description: "Gerar e imprimir etiquetas." },
  { key: "manage_oral_map", label: "Mapa da copa", description: "Visualizar e imprimir mapa da dieta oral." },
  { key: "manage_tools", label: "Ferramentas", description: "Usar calculadoras e ferramentas clinicas." },
  { key: "manage_reports", label: "Relatorios", description: "Visualizar e exportar relatorios gerenciais." },
];

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
