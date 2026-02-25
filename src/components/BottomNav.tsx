import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, UserPlus, Activity, FileText, Settings, Users, Package, DollarSign, Utensils, Calculator } from "lucide-react";
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

  const canManageFormulas = can(role, "manage_formulas");
  const canManageSupplies = can(role, "manage_supplies");
  const canManageProfessionals = can(role, "manage_professionals");
  const canManageSettings =
    can(role, "manage_units") || can(role, "manage_wards") || can(role, "manage_costs");

  const handleAddPatient = () => {
    if (onAddPatient) {
      onAddPatient();
    } else {
      navigate("/patients?action=add");
    }
  };

  const navItems = [
    { path: "/dashboard", icon: Home, label: "Início", action: null },
    { path: null, icon: UserPlus, label: "Adicionar", action: handleAddPatient },
    { path: "/formulas", icon: Activity, label: "Fórmulas", action: null },
    { path: "/reports", icon: FileText, label: "Relatórios", action: null },
  ];

  // ----- Técnico: menu restrito (Início, Faturamento, Etiquetas, Mapa Copa) -----
  if (role === "technician") {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 shadow-[0_-8px_20px_rgba(0,0,0,0.08)]">
        <div className="container px-2 py-1">
          <div className="grid grid-cols-4 gap-1 rounded-xl border border-border/80 bg-background/70 p-1">
            <Button variant="ghost" className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${location.pathname === "/dashboard" ? "text-primary bg-primary/10" : "text-muted-foreground"}`} onClick={() => navigate("/dashboard")}>
              <Home className="h-5 w-5" />
              <span className="text-xs">Início</span>
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

  // ----- Nutricionista e demais perfis -----
  const registrationLabel = role === "nutritionist" ? "Ferramentas" : "Cadastros";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 shadow-[0_-8px_20px_rgba(0,0,0,0.08)]">
      <div className="container px-2 py-1">
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-border/80 bg-background/70 p-1">
          {navItems.map((item, index) => {
            if (item.label === "Fórmulas") {
              return (
                <DropdownMenu key={index}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${location.pathname.includes("/formulas") || location.pathname.includes("/professionals") || location.pathname.includes("/supplies") ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
                    >
                      <Settings className="h-5 w-5" />
                      <span className="text-xs">{registrationLabel}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48 mb-2">
                    {canManageFormulas && (
                      <DropdownMenuItem onClick={() => navigate("/formulas")}>
                        <Activity className="mr-2 h-4 w-4" />
                        <span>Fórmulas</span>
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
                        <span>Configurações</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            if (item.label === "Relatórios") {
              return (
                <DropdownMenu key={index}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${location.pathname.includes("/reports") || location.pathname.includes("/billing") || location.pathname.includes("/oral-map") || location.pathname.includes("/tools") ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-xs">Relatórios</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48 mb-2">
                    <DropdownMenuItem onClick={() => navigate("/reports")}>
                      <Activity className="mr-2 h-4 w-4" />
                      <span>Histórico</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/labels")}>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Etiquetas</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/billing")}>
                      <DollarSign className="mr-2 h-4 w-4" />
                      <span>Faturamento</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/oral-map")}>
                      <Utensils className="mr-2 h-4 w-4" />
                      <span>Mapa Copa</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/tools")}>
                      <Calculator className="mr-2 h-4 w-4" />
                      <span>Ferramentas</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            const isActive = item.path && location.pathname === item.path;
            return (
              <Button
                key={item.label}
                variant="ghost"
                className={`flex flex-col gap-1 h-auto py-2.5 rounded-lg ${isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
                  }`}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;


