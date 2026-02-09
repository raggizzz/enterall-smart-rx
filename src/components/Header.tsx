import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logoenmeta.png";
import { toast } from "sonner";
import { clearPermissionMatrix, ROLE_LABELS } from "@/lib/permissions";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import { Badge } from "@/components/ui/badge";
import { useProfessionals } from "@/hooks/useDatabase";

const Header = () => {
  const navigate = useNavigate();
  const role = useCurrentRole();
  const [userName, setUserName] = useState("Usuario");
  const [userProfessionalId, setUserProfessionalId] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [hospitalName, setHospitalName] = useState("Unidade nao selecionada");
  const [wardName, setWardName] = useState("Setor nao selecionado");
  const { professionals } = useProfessionals(hospitalId || undefined);

  useEffect(() => {
    const syncSessionContext = () => {
      if (typeof window === "undefined") return;
      setUserName(localStorage.getItem("userName") || "Usuario");
      setUserProfessionalId(localStorage.getItem("userProfessionalId") || "");
      setHospitalId(localStorage.getItem("userHospitalId") || "");
      setHospitalName(localStorage.getItem("userHospitalName") || "Unidade nao selecionada");
      setWardName(localStorage.getItem("userWard") || "Setor nao selecionado");
    };

    syncSessionContext();
    window.addEventListener("enmeta-session-updated", syncSessionContext);
    return () => window.removeEventListener("enmeta-session-updated", syncSessionContext);
  }, []);

  useEffect(() => {
    if (!userProfessionalId || professionals.length === 0) return;
    const loggedUser = professionals.find((p) => p.id === userProfessionalId);
    if (!loggedUser?.name || loggedUser.name === userName) return;
    setUserName(loggedUser.name);
    if (typeof window !== "undefined") {
      localStorage.setItem("userName", loggedUser.name);
      window.dispatchEvent(new Event("enmeta-session-updated"));
    }
  }, [professionals, userName, userProfessionalId]);

  const handleLogout = () => {
    toast.success("Logout realizado com sucesso!");
    if (typeof window !== "undefined") {
      localStorage.removeItem("userRole");
      localStorage.removeItem("userName");
      localStorage.removeItem("userProfessionalId");
      localStorage.removeItem("userHospitalId");
      localStorage.removeItem("userHospitalName");
      localStorage.removeItem("userWard");
      clearPermissionMatrix();
      window.dispatchEvent(new Event("enmeta-session-updated"));
    }
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 shadow-sm">
      <div className="container flex h-18 min-h-[72px] items-center justify-between px-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-1.5">
            <img src={logo} alt="ENMeta" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <span className="block text-lg leading-none font-semibold text-medical-green-dark">ENMeta</span>
            <span className="block text-[11px] text-muted-foreground">Prescricao e Gestao Nutricional</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right max-w-[300px] hidden sm:block">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
            <div className="mt-1 flex flex-wrap justify-end gap-1">
              <Badge variant="outline" className="text-[10px] max-w-[170px] truncate">{hospitalName}</Badge>
              <Badge variant="secondary" className="text-[10px] max-w-[120px] truncate">{wardName}</Badge>
            </div>
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
