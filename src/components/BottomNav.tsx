import { useLocation, useNavigate } from "react-router-dom";
import { Activity, Calculator, DollarSign, FileText, Home, Package, Settings, UserPlus, Users, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { can } from "@/lib/permissions";
import { useCurrentRole } from "@/hooks/useCurrentRole";

interface BottomNavProps {
  onAddPatient?: () => void;
}

const BottomNav = ({ onAddPatient }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useCurrentRole();

  const canManagePatients = can(role, "manage_patients");
  const canManageProfessionals = can(role, "manage_professionals");
  const canManageFormulas = can(role, "manage_formulas");
  const canManageSupplies = can(role, "manage_supplies");
  const canManageSettings =
    can(role, "manage_units")
    || can(role, "manage_wards")
    || can(role, "manage_costs")
    || can(role, "manage_role_permissions");
  const canManageReports = can(role, "manage_reports");
  const canManageBilling = can(role, "manage_billing");
  const canManageLabels = can(role, "manage_labels");
  const canManageOralMap = can(role, "manage_oral_map");
  const canManageTools = can(role, "manage_tools");

  const navClassName = "fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 shadow-[0_-8px_20px_rgba(0,0,0,0.08)]";
  const navStyle = { paddingBottom: "env(safe-area-inset-bottom)" };

  const handleAddPatient = () => {
    if (onAddPatient) {
      onAddPatient();
      return;
    }
    navigate("/patients?action=add");
  };

  if (role === "technician") {
    return (
      <nav className={navClassName} style={navStyle}>
        <div className="container px-2 py-1">
          <div className="grid grid-cols-4 gap-1 rounded-xl border border-border/80 bg-background/70 p-1">
            <Button variant="ghost" className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${location.pathname === "/dashboard" ? "text-primary bg-primary/10" : "text-muted-foreground"}`} onClick={() => navigate("/dashboard")}>
              <Home className="h-5 w-5" />
              <span className="text-xs">Inicio</span>
            </Button>
            <Button variant="ghost" className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${location.pathname === "/billing" ? "text-primary bg-primary/10" : "text-muted-foreground"}`} onClick={() => navigate("/billing")}>
              <DollarSign className="h-5 w-5" />
              <span className="text-xs">Faturamento</span>
            </Button>
            <Button variant="ghost" className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${location.pathname === "/labels" ? "text-primary bg-primary/10" : "text-muted-foreground"}`} onClick={() => navigate("/labels")}>
              <FileText className="h-5 w-5" />
              <span className="text-xs">Etiquetas</span>
            </Button>
            <Button variant="ghost" className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${location.pathname === "/oral-map" ? "text-primary bg-primary/10" : "text-muted-foreground"}`} onClick={() => navigate("/oral-map")}>
              <Utensils className="h-5 w-5" />
              <span className="text-xs">Mapa Copa</span>
            </Button>
          </div>
        </div>
      </nav>
    );
  }

  if (role === "nutritionist") {
    return (
      <nav className={navClassName} style={navStyle}>
        <div className="container px-2 py-1">
          <div className="grid grid-cols-4 gap-1 rounded-xl border border-border/80 bg-background/70 p-1">
            <Button variant="ghost" className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${location.pathname === "/dashboard" ? "text-primary bg-primary/10" : "text-muted-foreground"}`} onClick={() => navigate("/dashboard")}>
              <Home className="h-5 w-5" />
              <span className="text-xs">Inicio</span>
            </Button>
            <Button variant="ghost" className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${location.pathname === "/patients" ? "text-primary bg-primary/10" : "text-muted-foreground"}`} onClick={() => navigate("/patients")}>
              <Users className="h-5 w-5" />
              <span className="text-xs">Pacientes</span>
            </Button>
            <Button variant="ghost" className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${location.pathname === "/tools" ? "text-primary bg-primary/10" : "text-muted-foreground"}`} onClick={() => navigate("/tools")}>
              <Calculator className="h-5 w-5" />
              <span className="text-xs">Ferramentas</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${location.pathname.includes("/reports") || location.pathname.includes("/labels") || location.pathname.includes("/oral-map") || location.pathname.includes("/billing") ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">Operacao</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 mb-2">
                {canManageReports && (
                  <DropdownMenuItem onClick={() => navigate("/reports")}>
                    <Activity className="mr-2 h-4 w-4" />
                    <span>Historico</span>
                  </DropdownMenuItem>
                )}
                {canManageLabels && (
                  <DropdownMenuItem onClick={() => navigate("/labels")}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Etiquetas</span>
                  </DropdownMenuItem>
                )}
                {canManageOralMap && (
                  <DropdownMenuItem onClick={() => navigate("/oral-map")}>
                    <Utensils className="mr-2 h-4 w-4" />
                    <span>Mapa Copa</span>
                  </DropdownMenuItem>
                )}
                {canManageBilling && (
                  <DropdownMenuItem onClick={() => navigate("/billing")}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    <span>Faturamento</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    );
  }

  const cadastrosActive = location.pathname.includes("/formulas")
    || location.pathname.includes("/professionals")
    || location.pathname.includes("/supplies")
    || location.pathname.includes("/settings");
  const operacaoActive = location.pathname.includes("/reports")
    || location.pathname.includes("/billing")
    || location.pathname.includes("/labels")
    || location.pathname.includes("/oral-map")
    || location.pathname.includes("/tools");

  return (
    <nav className={navClassName} style={navStyle}>
      <div className="container px-2 py-1">
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-border/80 bg-background/70 p-1">
          <Button
            variant="ghost"
            className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${location.pathname === "/dashboard" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            onClick={() => navigate("/dashboard")}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Inicio</span>
          </Button>

          <Button
            variant="ghost"
            className="flex flex-col gap-1 h-auto py-2.5 rounded-lg text-muted-foreground"
            onClick={handleAddPatient}
            disabled={!canManagePatients}
          >
            <UserPlus className="h-5 w-5" />
            <span className="text-xs">Adicionar</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${cadastrosActive ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
              >
                <Settings className="h-5 w-5" />
                <span className="text-xs">Cadastros</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52 mb-2">
              {canManageFormulas && (
                <DropdownMenuItem onClick={() => navigate("/formulas")}>
                  <Activity className="mr-2 h-4 w-4" />
                  <span>Formulas</span>
                </DropdownMenuItem>
              )}
              {canManageProfessionals && (
                <DropdownMenuItem onClick={() => navigate("/professionals")}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>Profissionais</span>
                </DropdownMenuItem>
              )}
              {canManageSupplies && (
                <DropdownMenuItem onClick={() => navigate("/supplies")}>
                  <Package className="mr-2 h-4 w-4" />
                  <span>Insumos</span>
                </DropdownMenuItem>
              )}
              {canManageSettings && (
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuracoes</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${operacaoActive ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs">Operacao</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52 mb-2">
              {canManageReports && (
                <DropdownMenuItem onClick={() => navigate("/reports")}>
                  <Activity className="mr-2 h-4 w-4" />
                  <span>Relatorios</span>
                </DropdownMenuItem>
              )}
              {canManageLabels && (
                <DropdownMenuItem onClick={() => navigate("/labels")}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Etiquetas</span>
                </DropdownMenuItem>
              )}
              {canManageBilling && (
                <DropdownMenuItem onClick={() => navigate("/billing")}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  <span>Faturamento</span>
                </DropdownMenuItem>
              )}
              {canManageOralMap && (
                <DropdownMenuItem onClick={() => navigate("/oral-map")}>
                  <Utensils className="mr-2 h-4 w-4" />
                  <span>Mapa Copa</span>
                </DropdownMenuItem>
              )}
              {canManageTools && (
                <DropdownMenuItem onClick={() => navigate("/tools")}>
                  <Calculator className="mr-2 h-4 w-4" />
                  <span>Ferramentas</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
