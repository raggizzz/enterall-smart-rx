import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, UserPlus, Activity, Calculator } from "lucide-react";

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
    { path: "/utilities", icon: Calculator, label: "Utilidades", action: null },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
      <div className="container px-2">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item, index) => {
            const isActive = item.path && location.pathname === item.path;
            return (
              <Button
                key={item.label}
                variant="ghost"
                className={`flex flex-col gap-1 h-auto py-3 ${
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
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
