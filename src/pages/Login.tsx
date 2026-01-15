import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Activity } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logoenmeta.png";
import { useProfessionals, useHospitals } from "@/hooks/useDatabase";
import { useEffect } from "react";

const Login = () => {
  const navigate = useNavigate();
  const { professionals } = useProfessionals();
  const { hospitals } = useHospitals();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    hospital: "",
    identifier: "", // Replaces email, can be CRN or Matrícula
    password: "",
    role: "nutritionist", // manager, nutritionist, technician
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hospital || !formData.identifier || !formData.password) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    // Bypass for empty database (Bootstrap mode)
    if (professionals.length === 0 && formData.role === 'manager') {
      toast.info("Modo de Inicialização: Nenhum profissional cadastrado. Acesso de Gestor liberado.");
      localStorage.setItem('userRole', formData.role);
      localStorage.setItem('userName', "Gestor Inicial");
      navigate("/dashboard");
      return;
    }

    // Validation
    const user = professionals.find(p => {
      const isRoleMatch = p.role === formData.role;
      // Check CRN for nutritionist, or Registration/CPF for others if needed. 
      // For simplicity/user request, matching "identifier" against CRN or Matricula
      const isIdMatch = p.crn === formData.identifier || p.registrationNumber === formData.identifier;
      // In a real app, we would hash/check password here. 
      // Current DB doesn't store passwords, so we check if record exists + basic password presence
      return isRoleMatch && isIdMatch;
    });

    if (user) {
      if (!user.isActive) {
        toast.error("Usuário inativo. Contate o gestor.");
        return;
      }
      localStorage.setItem('userRole', formData.role);
      localStorage.setItem('userName', user.name);
      toast.success(`Bem-vindo(a), ${user.name}!`);
      navigate("/dashboard");
    } else {
      if (formData.role !== 'manager') {
        toast.error(`Acesso negado. ${formData.role === 'nutritionist' ? 'Nutricionista' : 'Técnico'} deve ser cadastrado pelo Gestor.`);
      } else {
        toast.error("Gestor não encontrado. Verifique suas credenciais.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-medical-green-light via-background to-medical-green-light p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="ENMeta Logo" className="h-32 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-medical-green-dark mb-2">Nutrição Enteral Inteligente</h1>
          <p className="text-muted-foreground">Desenvolvido para uso clínico beira-leito</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Entrar</CardTitle>
            <CardDescription className="text-center">Acesse sua conta para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hospital">Código do Hospital</Label>
                <Select
                  value={formData.hospital}
                  onValueChange={(value) => setFormData({ ...formData, hospital: value })}
                >
                  <SelectTrigger id="hospital">
                    <SelectValue placeholder="Selecione o hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital.id} value={hospital.cnes || hospital.id || "unknown"}>
                        {hospital.cnes ? `${hospital.cnes} - ` : ""}{hospital.name}
                      </SelectItem>
                    ))}
                    {hospitals.length === 0 && (
                      <SelectItem value="manual" disabled>Nenhum hospital cadastrado</SelectItem>
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
                    <SelectItem value="manager">Gestor</SelectItem>
                    <SelectItem value="nutritionist">Nutricionista</SelectItem>
                    <SelectItem value="technician">Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="identifier">
                  {formData.role === 'nutritionist' ? 'CRN' : 'Matrícula'}
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder={formData.role === 'nutritionist' ? 'CRN-0000' : '000000'}
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
                    onClick={() => toast.info("Função de recuperação de senha em desenvolvimento")}
                  >
                    Esqueceu a senha?
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
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

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Activity className="inline-block h-4 w-4 mr-1" />
          Sistema de prescrição e análise de nutrição enteral
        </div>
      </div>
    </div>
  );
};

export default Login;
