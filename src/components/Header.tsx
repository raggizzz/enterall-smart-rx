import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LogoEnmeta from "@/components/LogoEnmeta";
import { toast } from "sonner";
import { clearPermissionMatrix, ROLE_LABELS } from "@/lib/permissions";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import { Badge } from "@/components/ui/badge";
import { useHospitals, useProfessionals } from "@/hooks/useDatabase";
import SyncCenterDialog from "@/components/SyncCenterDialog";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import { useSession } from "@/hooks/useSession";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient, ApiError } from "@/lib/api";

const Header = () => {
  const navigate = useNavigate();
  const role = useCurrentRole();
  const { name, professionalId, hospitalId, hospitalName, ward, saveSession, clearSession } = useSession();
  const { professionals } = useProfessionals(hospitalId || undefined);
  const { hospitals } = useHospitals();
  const canSwitchHospital = role === "general_manager";

  useEffect(() => {
    if (!professionalId || professionals.length === 0) return;
    const loggedUser = professionals.find((p) => p.id === professionalId);
    if (!loggedUser?.name || loggedUser.name === name) return;
    saveSession({
      token: localStorage.getItem('local_session') ? JSON.parse(localStorage.getItem('local_session')!).access_token : '',
      role: role,
      name: loggedUser.name,
      professionalId,
      hospitalId: hospitalId ?? '',
      hospitalName: hospitalName ?? '',
      ward: ward ?? undefined,
    });
  }, [professionals, name, professionalId, role, hospitalId, hospitalName, ward, saveSession]);

  const handleLogout = () => {
    toast.success("Logout realizado com sucesso!");
    clearPermissionMatrix();
    clearSession();
    navigate("/");
  };

  const handleHospitalChange = async (nextHospitalId: string) => {
    if (!canSwitchHospital || !nextHospitalId || nextHospitalId === hospitalId) return;

    const nextHospital = hospitals.find((hospital) => hospital.id === nextHospitalId);
    if (!nextHospital?.id) return;

    try {
      const response = await apiClient.post("/auth/switch-hospital", { hospitalId: nextHospital.id }) as {
        user: {
          id?: string;
          name: string;
          role: string;
        };
        session: {
          access_token: string;
          refresh_token?: string;
        };
      };

      saveSession({
        token: response.session.access_token,
        refreshToken: response.session.refresh_token,
        role: response.user.role,
        name: response.user.name,
        professionalId: response.user.id || professionalId || "",
        hospitalId: nextHospital.id,
        hospitalName: nextHospital.name || "Unidade",
      });
      toast.success(`Unidade alterada para ${nextHospital.name}.`);
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof ApiError
        && typeof error.body === "object"
        && error.body
        && "error" in error.body
        ? String((error.body as Record<string, unknown>).error)
        : "Nao foi possivel trocar a unidade.";
      toast.error(message);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="container flex h-18 min-h-[72px] items-center justify-between px-4">
        <div className="flex cursor-pointer items-center gap-3" onClick={() => navigate("/dashboard")}>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-1.5">
            <LogoEnmeta size="sm" />
          </div>
          <div>
            <span className="block text-lg font-semibold leading-none text-medical-green-dark">ENMeta</span>
            <span className="block text-[11px] text-muted-foreground">Prescricao e Gestao Nutricional</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden max-w-[360px] text-right sm:block">
            <div className="flex items-center justify-end gap-2">
              <p className="text-sm font-medium">{name ?? "Usuario"}</p>
              <SyncStatusBadge />
            </div>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
            <div className="mt-1 flex flex-wrap justify-end gap-1">
              {canSwitchHospital ? (
                <Select value={hospitalId || ""} onValueChange={handleHospitalChange}>
                  <SelectTrigger className="h-6 min-w-[170px] text-[10px]">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital.id} value={hospital.id || ""}>
                        {hospital.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="max-w-[170px] truncate text-[10px]">{hospitalName ?? "Unidade nao selecionada"}</Badge>
              )}
              <Badge variant="secondary" className="max-w-[120px] truncate text-[10px]">{ward ?? "Setor nao selecionado"}</Badge>
            </div>
          </div>
          <div className="block">
            <SyncCenterDialog />
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
