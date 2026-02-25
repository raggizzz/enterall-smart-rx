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
  const { hospitals } = useHospitals();


  const selectedHospitalName = hospitals.find((hospital) => hospital.id === formData.hospital)?.name || "";
  const hospitalProfessionals = professionals;

  useEffect(() => {
    if (hasActiveSession()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const syncRolePermissions = async () => {
    try {
      const rows = await rolePermissionsService.getAll();
      if (rows.length > 0) {
        applyRolePermissionsFromDatabase(rows);
      }
    } catch (error) {
      console.warn("Não foi possível carregar permissões do banco. Usando matriz padrão.", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hospital || !formData.identifier || !formData.password) {
      toast.error("Preencha todos os campos.");
      return;
    }

    const normalizedRole = normalizeRole(formData.role);

    if (hospitalProfessionals.length === 0 && normalizedRole === "general_manager") {
      toast.info("Modo de inicialização da unidade: nenhum profissional cadastrado. Acesso de gestor liberado.");
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

    const user = hospitalProfessionals.find((p) => {
      const isRoleMatch = normalizeRole(p.role) === normalizedRole;
      const isIdMatch = p.registrationNumber === formData.identifier;
      return isRoleMatch && isIdMatch;
    });

    if (user) {
      if (user.isActive === false) {
        toast.error("Usuário inativo. Contate o gestor.");
        return;
      }

      localStorage.setItem("userRole", normalizedRole);
      localStorage.setItem("userName", user.name);
      if (user.id) {
        localStorage.setItem("userProfessionalId", user.id);
      } else {
        localStorage.removeItem("userProfessionalId");
      }
      localStorage.setItem("userHospitalId", formData.hospital);
      localStorage.setItem("userHospitalName", selectedHospitalName);

      window.dispatchEvent(new Event("enmeta-session-updated"));
      await syncRolePermissions();
      toast.success(`Bem-vindo(a), ${user.name}!`);
      navigate("/dashboard");
      return;
    }

    if (normalizedRole !== "general_manager") {
      toast.error(`Acesso negado. ${ROLE_LABELS[normalizedRole]} deve ser cadastrado(a) pelo gestor.`);
    } else {
      toast.error("Gestor não encontrado. Verifique suas credenciais.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-medical-green-light via-background to-white p-4 lg:p-8">
      <div className="w-full max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-medical-green/20 bg-card/70 p-8 shadow-sm backdrop-blur">
            <LogoEnmeta size="lg" className="mx-auto mb-5" />
            <h1 className="text-center text-3xl font-bold text-medical-green-dark leading-tight">
              Nutrição Enteral Inteligente e Sustentável.
            </h1>
          </div>

          <Card className="border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Entrar</CardTitle>
              <CardDescription className="text-center">Acesse sua conta para continuar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hospital">Escolher Unidade</Label>
                  <Select
                    value={formData.hospital}
                    onValueChange={(value) => setFormData({ ...formData, hospital: value })}
                  >
                    <SelectTrigger id="hospital">
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map((hospital) => (
                        <SelectItem key={hospital.id} value={hospital.id || "unknown"}>
                          {hospital.name}
                        </SelectItem>
                      ))}
                      {hospitals.length === 0 && (
                        <SelectItem value="manual" disabled>Nenhuma unidade cadastrada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>


                <div className="space-y-2">
                  <Label htmlFor="role">Função</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Selecione sua função" />
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
                  <Label htmlFor="identifier">Matrícula</Label>
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
                      onClick={() => toast.info("Recuperação de senha em desenvolvimento")}
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

                <Button type="submit" className="w-full" size="lg">
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
