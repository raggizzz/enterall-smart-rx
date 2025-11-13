import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Users, Activity, Calculator, FileBarChart } from "lucide-react";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", icon: Home, label: "Início" },
    { path: "/patients", icon: Users, label: "Pacientes" },
    { path: "/formulas", icon: Activity, label: "Fórmulas" },
    { path: "/utilities", icon: Calculator, label: "Utilidades" },
    { path: "/reports", icon: FileBarChart, label: "Relatórios" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
      <div className="container px-2">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={`flex flex-col gap-1 h-auto py-3 ${
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`}
                onClick={() => navigate(item.path)}
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
