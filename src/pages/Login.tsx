import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import LogoEnmeta from "@/components/LogoEnmeta";
import { useProfessionals, useHospitals } from "@/hooks/useDatabase";
import { ApiError, apiClient } from "@/lib/api";
import { rolePermissionsService } from "@/lib/database";
import {
  applyRolePermissionsFromDatabase,
  ROLE_OPTIONS,
  ROLE_LABELS,
  hasActiveSession,
  normalizeRole,
} from "@/lib/permissions";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    hospital: "",
    identifier: "",
    password: "",
    role: "nutritionist",
  });
  const { professionals } = useProfessionals(formData.hospital || undefined);
  const { hospitals, isLoading: hospitalsLoading } = useHospitals();

  const selectedHospitalName = hospitals.find((hospital) => hospital.id === formData.hospital)?.name || "";
  const hospitalProfessionals = professionals;

  useEffect(() => {
    if (hospitals.length > 0 && !formData.hospital) {
      setFormData((prev) => ({ ...prev, hospital: hospitals[0].id || "" }));
    }
  }, [hospitals, formData.hospital]);

  useEffect(() => {
    if (hasActiveSession()) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const syncRolePermissions = async () => {
    try {
      const rows = await rolePermissionsService.getAll();
      applyRolePermissionsFromDatabase(rows);
    } catch (error) {
      console.warn("Nao foi possivel carregar permissoes do banco. Usando matriz padrao.", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hospital || !formData.identifier || !formData.password || !formData.role) {
      toast.error("Preencha todos os campos.");
      return;
    }

    const normalizedRole = normalizeRole(formData.role);

    if (hospitalProfessionals.length === 0 && normalizedRole === "general_manager") {
      toast.info("Modo de inicializacao da unidade: nenhum profissional cadastrado. Acesso de gestor liberado.");
      localStorage.setItem("userRole", normalizedRole);
      localStorage.setItem("userName", "Gestor Inicial");
      localStorage.removeItem("userProfessionalId");
      localStorage.setItem("userHospitalId", formData.hospital);
      localStorage.setItem("userHospitalName", selectedHospitalName);

      window.dispatchEvent(new Event("enmeta-session-updated"));
      await syncRolePermissions();
      navigate("/dashboard");
      return;
    }

    const user = hospitalProfessionals.find((professional) => {
      const isRoleMatch = normalizeRole(professional.role) === normalizedRole;
      const isIdMatch = professional.registrationNumber === formData.identifier;
      return isRoleMatch && isIdMatch;
    });

    if (user?.isActive === false) {
      toast.error("Usuario inativo. Contate o gestor.");
      return;
    }

    try {
      const response = await apiClient.post("/auth/login", {
        hospitalId: formData.hospital,
        identifier: formData.identifier,
        password: formData.password,
        role: normalizedRole,
      }) as {
        user: {
          id?: string;
          name: string;
          role: string;
        };
        session: {
          access_token: string;
        };
      };

      localStorage.setItem("local_session", JSON.stringify(response.session));
      localStorage.setItem("userRole", normalizeRole(response.user.role));
      localStorage.setItem("userName", response.user.name);
      if (response.user.id) {
        localStorage.setItem("userProfessionalId", response.user.id);
      } else {
        localStorage.removeItem("userProfessionalId");
      }
      localStorage.setItem("userHospitalId", formData.hospital);
      localStorage.setItem("userHospitalName", selectedHospitalName);

      window.dispatchEvent(new Event("enmeta-session-updated"));
      await syncRolePermissions();
      toast.success(`Bem-vindo(a), ${response.user.name}!`);
      navigate("/dashboard");
      return;
    } catch (error) {
      if (error instanceof ApiError) {
        const message = typeof error.body === "object" && error.body && "error" in (error.body as Record<string, unknown>)
          ? String((error.body as Record<string, unknown>).error)
          : "";

        if (message === "Password not configured") {
          toast.error("Profissional sem senha cadastrada. Configure uma senha de 8 digitos no cadastro.");
          return;
        }
      }
    }

    if (normalizedRole !== "general_manager") {
      toast.error(`Acesso negado. ${ROLE_LABELS[normalizedRole]} deve ser cadastrado(a) pelo gestor.`);
    } else {
      toast.error("Gestor nao encontrado. Verifique suas credenciais.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-medical-green-light via-background to-white p-4 lg:p-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-pulse-soft pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 rounded-full bg-medical-green/5 blur-3xl animate-pulse-soft pointer-events-none" style={{ animationDelay: "1s" }} />
      <div className="w-full max-w-5xl animate-fade-in relative z-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-medical-green/20 bg-card/60 p-8 shadow-lg backdrop-blur-md">
            <LogoEnmeta size="lg" className="mx-auto mb-5" />
            <h1 className="text-center text-3xl font-bold text-medical-green-dark leading-tight">
              Nutricao Enteral Inteligente e Sustentavel.
            </h1>
          </div>

          <Card className="border-border shadow-xl bg-card/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Entrar</CardTitle>
              <CardDescription className="text-center">Acesse sua conta para continuar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hospital">Hospital</Label>
                  <Select
                    value={formData.hospital}
                    onValueChange={(value) => setFormData({ ...formData, hospital: value })}
                    disabled={hospitalsLoading || hospitals.length === 0}
                  >
                    <SelectTrigger id="hospital">
                      <SelectValue placeholder={hospitalsLoading ? "Carregando hospitais..." : "Selecione o hospital"} />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map((hospital) => (
                        <SelectItem key={hospital.id} value={hospital.id || ""}>
                          {hospital.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Funcao</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Selecione sua funcao" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identifier">Matricula</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="000000"
                    value={formData.identifier}
                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="text-xs text-primary p-0 h-auto"
                      onClick={() => toast.info("Para redefinir sua senha, entre em contato com o gestor da sua unidade.")}
                    >
                      Esqueceu a senha?
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="********"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={hospitalsLoading || hospitals.length === 0}>
                  Entrar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
