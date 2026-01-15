import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  AlertCircle,
  Search,
  UserPlus,
  Building2,
  LogOut,
  Utensils,
  Droplet,
  Syringe,
  BanIcon,
  Pill,
  Database,
  Settings,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import logo from "@/assets/logoenmeta.png";
import BottomNav from "@/components/BottomNav";
import { DailyEvolutionDialog } from "@/components/DailyEvolutionDialog";
import { usePatients, usePrescriptions, useDashboardData, useClinics } from "@/hooks/useDatabase";

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedWard, setSelectedWard] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const [evolutionDialogOpen, setEvolutionDialogOpen] = useState(false);
  const [selectedPatientForEvolution, setSelectedPatientForEvolution] = useState<any>(null);

  const { patients } = usePatients();
  const { prescriptions } = usePrescriptions();
  const dashboardData = useDashboardData();
  const { clinics } = useClinics();

  const [patientSearch, setPatientSearch] = useState({ name: "", dob: "", record: "" });

  // Stats from real database
  const stats = [
    { label: "Prescrições ativas", value: dashboardData.activePrescriptions.toString(), icon: FileText, color: "text-primary" },
    { label: "Evoluções hoje", value: dashboardData.todayEvolutions.toString(), icon: AlertCircle, color: "text-warning" },
    { label: "Pacientes ativos", value: dashboardData.patientsCount.toString(), icon: Users, color: "text-success" },
  ];

  // Generate ward beds from real patients
  const wardBeds = useMemo(() => {
    const activePatients = patients.filter(p => p.status === 'active');

    // Create beds from patients
    const patientBeds = activePatients.map((patient, index) => {
      const patientPrescription = prescriptions.find(p => p.patientId === patient.id);

      let feedingRoute = 'oral';
      if (patient.nutritionType === 'enteral') feedingRoute = 'enteral';
      else if (patient.nutritionType === 'parenteral') feedingRoute = 'parenteral';
      else if (patient.nutritionType === 'jejum') feedingRoute = 'fasting';

      return {
        bed: patient.bed || `Leito ${String(index + 1).padStart(2, '0')}`,
        patient: patient.name,
        dob: patient.dob ? new Date(patient.dob).toLocaleDateString('pt-BR') : '-',
        record: patient.record,
        feedingRoute,
        status: patientPrescription ? 'goal_met' : 'no_diet',
        prescribedVolume: patientPrescription?.totalVolume || 0,
        prescribedCalories: patientPrescription?.totalCalories || 0,
        patientId: patient.id,
      };
    });

    // Add empty beds to fill up to 8
    const emptyBeds = [];
    for (let i = patientBeds.length; i < 8; i++) {
      emptyBeds.push({
        bed: `Leito ${String(i + 1).padStart(2, '0')}`,
        patient: null,
        dob: null,
        record: null,
        feedingRoute: 'empty',
        status: null,
        prescribedVolume: 0,
        prescribedCalories: 0,
        patientId: null,
      });
    }

    return [...patientBeds, ...emptyBeds].slice(0, 8);
  }, [patients, prescriptions]);

  const getFeedingIcon = (route: string) => {
    switch (route) {
      case "oral":
        return <Utensils className="h-6 w-6 text-green-600" />;
      case "oral-supplement":
        return <Pill className="h-6 w-6 text-blue-600" />;
      case "enteral":
        return <Droplet className="h-6 w-6 text-purple-600" />;
      case "parenteral":
        return <Syringe className="h-6 w-6 text-orange-600" />;
      case "fasting":
        return <BanIcon className="h-6 w-6 text-red-600" />;
      default:
        return null;
    }
  };

  const getFeedingBadge = (route: string) => {
    switch (route) {
      case "oral":
        return <Badge className="bg-green-600">Oral</Badge>;
      case "oral-supplement":
        return <Badge className="bg-blue-600">Suplementação Oral</Badge>;
      case "enteral":
        return <Badge className="bg-purple-600">Enteral</Badge>;
      case "parenteral":
        return <Badge className="bg-orange-600">Parenteral</Badge>;
      case "fasting":
        return <Badge className="bg-red-600">Jejum</Badge>;
      case "empty":
        return <Badge variant="outline">Vazio</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "goal_met":
        return <Badge className="bg-green-500 hover:bg-green-600">Meta Atingida</Badge>;
      case "below_goal":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Abaixo da Meta</Badge>;
      case "warning":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Atenção</Badge>;
      case "no_diet":
        return <Badge variant="secondary">Sem Dieta</Badge>;
      default:
        return null;
    }
  };

  const handleSearchPatient = () => {
    if (!patientSearch.name && !patientSearch.dob && !patientSearch.record) {
      toast.error("Preencha pelo menos um campo de busca");
      return;
    }
    toast.success("Buscando paciente...");
    setSearchDialogOpen(false);
  };



  const handleOpenEvolution = (e: React.MouseEvent, patient: any) => {
    e.stopPropagation(); // Prevent card click
    setSelectedPatientForEvolution(patient);
    setEvolutionDialogOpen(true);
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
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Olá, Dr. Online 👋</h1>
            <p className="text-muted-foreground">Bem-vindo ao sistema de nutrição enteral</p>
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
              <div className="space-y-2">
                <Label htmlFor="ward-select" className="text-sm font-medium">Selecionar Ala</Label>
                <Select value={selectedWard} onValueChange={setSelectedWard}>
                  <SelectTrigger id="ward-select" className="h-auto py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      <SelectValue placeholder="Escolher setor do hospital" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTI-ADULTO">UTI - Adulto</SelectItem>
                    <SelectItem value="UTI-PEDIATRICA">UTI - Pediátrica</SelectItem>
                    <SelectItem value="CLINICA-MEDICA">Clínica Médica</SelectItem>
                    <SelectItem value="CIRURGIA">Cirurgia</SelectItem>
                    <SelectItem value="CARDIOLOGIA">Cardiologia</SelectItem>
                    <SelectItem value="NEUROLOGIA">Neurologia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
                <DialogTrigger asChild>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Buscar Paciente</Label>
                    <Button variant="outline" className="h-auto py-4 w-full flex flex-col gap-2">
                      <Search className="h-6 w-6" />
                      <span>Buscar Paciente</span>
                    </Button>
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Buscar Paciente</DialogTitle>
                    <DialogDescription>Busque por nome, data de nascimento ou número de prontuário</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="search-name">Nome do Paciente</Label>
                      <Input
                        id="search-name"
                        placeholder="Digite o nome"
                        value={patientSearch.name}
                        onChange={(e) => setPatientSearch({ ...patientSearch, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="search-dob">Data de Nascimento</Label>
                      <Input
                        id="search-dob"
                        type="date"
                        value={patientSearch.dob}
                        onChange={(e) => setPatientSearch({ ...patientSearch, dob: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="search-record">Número de Prontuário</Label>
                      <Input
                        id="search-record"
                        placeholder="Digite o prontuário"
                        value={patientSearch.record}
                        onChange={(e) => setPatientSearch({ ...patientSearch, record: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleSearchPatient} className="w-full">
                      <Search className="h-4 w-4 mr-2" />
                      Buscar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Cadastrar Paciente</Label>
                <Button
                  variant="outline"
                  className="h-auto py-4 w-full flex flex-col gap-2"
                  onClick={() => navigate('/patients')}
                >
                  <UserPlus className="h-6 w-6" />
                  <span>Cadastrar Paciente</span>
                </Button>
              </div>
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

        {/* Ward Map - Only shows after ward selection */}
        {selectedWard && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mapa do Setor - {selectedWard}</CardTitle>
                  <CardDescription>Visualização dos leitos e pacientes com vias alimentares</CardDescription>
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
              {/* Legend */}
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-3">Legenda - Vias Alimentares:</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Oral</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-blue-600" />
                    <span className="text-sm">Suplementação</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplet className="h-5 w-5 text-purple-600" />
                    <span className="text-sm">Enteral</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Syringe className="h-5 w-5 text-orange-600" />
                    <span className="text-sm">Parenteral</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BanIcon className="h-5 w-5 text-red-600" />
                    <span className="text-sm">Jejum</span>
                  </div>
                </div>
              </div>

              {/* Ward Beds Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {wardBeds
                  .filter((bed) =>
                    !searchQuery ||
                    bed.patient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    bed.record?.includes(searchQuery)
                  )
                  .map((bed, index) => (
                    <Card
                      key={index}
                      className={`border-2 transition-all hover:shadow-lg cursor-pointer ${bed.patient ? "border-primary" : "border-dashed border-muted"
                        }`}
                      onClick={() => bed.patient && navigate("/prescription")}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{bed.bed}</CardTitle>
                          <div className="flex items-center gap-2">
                            {getFeedingIcon(bed.feedingRoute)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {bed.patient ? (
                          <div className="space-y-2">
                            <p className="font-medium">{bed.patient}</p>
                            <p className="text-xs text-muted-foreground">Nasc: {bed.dob}</p>
                            <p className="text-xs text-muted-foreground">Pront: {bed.record}</p>
                            <div className="pt-2 flex flex-wrap gap-2">
                              {getFeedingBadge(bed.feedingRoute)}
                              {getStatusBadge(bed.status)}
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button variant="link" className="p-0 h-auto text-primary text-sm">
                                Prescrever →
                              </Button>
                              <Button
                                variant="link"
                                className="p-0 h-auto text-primary text-sm"
                                onClick={(e) => handleOpenEvolution(e, bed)}
                              >
                                Evoluir →
                              </Button>
                            </div>
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
        )}
      </div>

      <BottomNav />

      {selectedPatientForEvolution && (
        <DailyEvolutionDialog
          open={evolutionDialogOpen}
          onOpenChange={setEvolutionDialogOpen}
          patientName={selectedPatientForEvolution.patient}
          prescribedVolume={selectedPatientForEvolution.prescribedVolume}
          prescribedCalories={selectedPatientForEvolution.prescribedCalories}
        />
      )}
    </div>
  );
};

export default Dashboard;
