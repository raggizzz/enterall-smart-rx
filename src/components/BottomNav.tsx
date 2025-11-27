import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, UserPlus, Activity, FileText, Settings, Users, Package, DollarSign, Utensils } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BottomNavProps {
  onAddPatient?: () => void;
}

const BottomNav = ({ onAddPatient }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
      <div className="container px-2">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item, index) => {
            if (item.label === "Fórmulas") {
              return (
                <DropdownMenu key={index}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`flex flex-col gap-1 h-auto py-3 ${location.pathname.includes("/formulas") || location.pathname.includes("/professionals") || location.pathname.includes("/supplies") ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
                    >
                      <Settings className="h-5 w-5" />
                      <span className="text-xs">Cadastros</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48 mb-2">
                    <DropdownMenuItem onClick={() => navigate("/formulas")}>
                      <Activity className="mr-2 h-4 w-4" />
                      <span>Fórmulas</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/professionals")}>
                      <Users className="mr-2 h-4 w-4" />
                      <span>Profissionais</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/supplies")}>
                      <Package className="mr-2 h-4 w-4" />
                      <span>Insumos</span>
                    </DropdownMenuItem>
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
                      className={`flex flex-col gap-1 h-auto py-3 ${location.pathname.includes("/reports") || location.pathname.includes("/billing") || location.pathname.includes("/oral-map") ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
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
                    <DropdownMenuItem onClick={() => navigate("/billing")}>
                      <DollarSign className="mr-2 h-4 w-4" />
                      <span>Faturamento</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/oral-map")}>
                      <Utensils className="mr-2 h-4 w-4" />
                      <span>Mapa Copa</span>
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
                className={`flex flex-col gap-1 h-auto py-3 ${isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
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
