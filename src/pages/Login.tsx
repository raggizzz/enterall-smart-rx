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

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    hospital: "",
    email: "",
    password: "",
    role: "nutritionist", // manager, nutritionist, technician
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hospital || !formData.email || !formData.password) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    // Mock login - in production this would call an API
    localStorage.setItem('userRole', formData.role); // Store role for later use
    toast.success(`Login realizado com sucesso como ${formData.role === 'manager' ? 'Gestor' : formData.role === 'nutritionist' ? 'Nutricionista' : 'Técnico'}!`);
    navigate("/dashboard");
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
                    <SelectItem value="HM-001">HM-001 - Hospital Municipal</SelectItem>
                    <SelectItem value="HE-002">HE-002 - Hospital Estadual</SelectItem>
                    <SelectItem value="HC-003">HC-003 - Hospital Central</SelectItem>
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
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nutri@enmeta.test"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
