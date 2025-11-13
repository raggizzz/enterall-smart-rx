import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logoenmeta.png";
import { toast } from "sonner";

const Header = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <img src={logo} alt="ENMeta" className="h-10" />
          <span className="text-lg font-semibold text-medical-green-dark">ENMeta</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">Dr. Online</p>
            <p className="text-xs text-muted-foreground">Nutricionista</p>
          </div>
          <Button variant="outline" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
