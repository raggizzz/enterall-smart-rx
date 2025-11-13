import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  AlertCircle,
  Activity,
  Search,
  UserPlus,
  Building2,
  ClipboardList,
  Calculator,
  FileBarChart,
  LogOut,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logoenmeta.png";
import BottomNav from "@/components/BottomNav";

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedWard, setSelectedWard] = useState("UTI-ADULTO");
  const [searchQuery, setSearchQuery] = useState("");

  const stats = [
    { label: "Prescrições do dia", value: "24", icon: FileText, color: "text-primary" },
    { label: "Alertas pendentes", value: "5", icon: AlertCircle, color: "text-warning" },
    { label: "Pacientes ativos", value: "42", icon: Users, color: "text-success" },
  ];

  const wardBeds = [
    { bed: "Leito 01", patient: "Antonio Pereira", dob: "10/01/1978", status: "enteral" },
    { bed: "Leito 02", patient: "Alicia Gomes", dob: "06/11/1981", status: "enteral" },
    { bed: "Leito 03", patient: "Renata Fortes", dob: "10/05/1980", status: "parenteral" },
    { bed: "Leito 04", patient: null, dob: null, status: "empty" },
    { bed: "Leito 05", patient: null, dob: null, status: "empty" },
    { bed: "Leito 06", patient: null, dob: null, status: "empty" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "enteral":
        return <Badge className="bg-success">Enteral</Badge>;
      case "parenteral":
        return <Badge className="bg-info">Parenteral</Badge>;
      case "empty":
        return <Badge variant="outline">Vazio</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="ENMeta" className="h-10" />
            <span className="text-lg font-semibold text-medical-green-dark">ENMeta</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">Dr. Online</p>
              <p className="text-xs text-muted-foreground">Nutricionista</p>
            </div>
            <Button variant="outline" size="icon">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Olá, Dr. Online 👋</h1>
            <p className="text-muted-foreground">Bem-vindo ao sistema de nutrição enteral</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedWard} onValueChange={setSelectedWard}>
              <SelectTrigger className="w-[180px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTI-ADULTO">UTI - Adulto</SelectItem>
                <SelectItem value="UTI-PEDIATRICA">UTI - Pediátrica</SelectItem>
                <SelectItem value="CLINICA-MEDICA">Clínica Médica</SelectItem>
                <SelectItem value="CIRURGIA">Cirurgia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesso rápido às principais funcionalidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                <Search className="h-6 w-6" />
                <span>Buscar Paciente</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                <UserPlus className="h-6 w-6" />
                <span>Cadastrar Paciente</span>
              </Button>
              <Button className="h-auto py-4 flex flex-col gap-2">
                <ClipboardList className="h-6 w-6" />
                <span>Nova Prescrição</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ward Map */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mapa do Setor - {selectedWard}</CardTitle>
                <CardDescription>Visualização dos leitos e pacientes</CardDescription>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar paciente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[200px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wardBeds.map((bed, index) => (
                <Card
                  key={index}
                  className={`border-2 ${bed.patient ? "border-primary" : "border-dashed border-muted"}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{bed.bed}</CardTitle>
                      {getStatusBadge(bed.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {bed.patient ? (
                      <div className="space-y-1">
                        <p className="font-medium">{bed.patient}</p>
                        <p className="text-sm text-muted-foreground">{bed.dob}</p>
                        <Button variant="link" className="p-0 h-auto text-primary">
                          Ver detalhes →
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Leito disponível</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
