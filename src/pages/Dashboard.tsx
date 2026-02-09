import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  UserPlus,
  Building2,
  Utensils,
  Droplet,
  Syringe,
  BanIcon,
  Pill,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { DailyEvolutionDialog } from "@/components/DailyEvolutionDialog";
import { usePatients, usePrescriptions, useHospitals, useProfessionals, useWards } from "@/hooks/useDatabase";

interface WardBed {
  bed: string;
  patient: string | null;
  dob: string | null;
  record: string | null;
  feedingRoute: "oral" | "oral-supplement" | "enteral" | "parenteral" | "fasting" | "empty";
  status: "goal_met" | "below_goal" | "warning" | "no_diet" | null;
  prescribedVolume: number;
  prescribedCalories: number;
  patientId: string | null | undefined;
  prescriptionId?: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Profissional");
  const [userProfessionalId, setUserProfessionalId] = useState("");
  const [selectedHospital, setSelectedHospital] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const [evolutionDialogOpen, setEvolutionDialogOpen] = useState(false);
  const [selectedPatientForEvolution, setSelectedPatientForEvolution] = useState<WardBed | null>(null);

  const { patients } = usePatients();
  const { prescriptions } = usePrescriptions();
  const { hospitals } = useHospitals();
  const { wards } = useWards(selectedHospital);
  const { professionals } = useProfessionals(selectedHospital || undefined);

  const [patientSearch, setPatientSearch] = useState({ name: "", dob: "", record: "" });
  useEffect(() => {
    const syncSessionContext = () => {
      if (typeof window === "undefined") return;

      const storedName = localStorage.getItem("userName");
      const storedProfessionalId = localStorage.getItem("userProfessionalId") || "";
      const storedHospital = localStorage.getItem("userHospitalId") || "";
      const storedWard = localStorage.getItem("userWard") || "";

      if (storedName) setUserName(storedName);
      if (storedProfessionalId) setUserProfessionalId(storedProfessionalId);
      if (storedHospital) setSelectedHospital(storedHospital);
      if (storedWard) setSelectedWard(storedWard);
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

  useEffect(() => {
    if (!selectedHospital) return;
    const selected = hospitals.find((hospital) => hospital.id === selectedHospital);
    if (!selected?.name) return;
    localStorage.setItem("userHospitalName", selected.name);
    window.dispatchEvent(new Event("enmeta-session-updated"));
  }, [hospitals, selectedHospital]);
  // Generate ward beds from real patients
  const wardBeds = useMemo(() => {
    if (!selectedHospital || !selectedWard) return [];

    const activePatients = patients.filter(p =>
      p.status === 'active' &&
      p.hospitalId === selectedHospital &&
      p.ward === selectedWard
    );

    // Create beds from patients
    const patientBeds: WardBed[] = activePatients.map((patient, index) => {
      const patientPrescription = prescriptions.find((p) => p.patientId === patient.id && p.status === "active")
        || prescriptions.find((p) => p.patientId === patient.id);

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
        prescriptionId: patientPrescription?.id,
      };
    });

    // Add empty beds to fill up to 8 (or more if needed, but keeping 8 for now or until filled)
    const emptyBeds: WardBed[] = [];
    // Ensure at least 8 slots or enough to cover all patients
    const totalSlots = Math.max(8, patientBeds.length + (4 - (patientBeds.length % 4)));

    for (let i = patientBeds.length; i < totalSlots; i++) {
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
        prescriptionId: null,
      });
    }

    return [...patientBeds, ...emptyBeds];
  }, [patients, prescriptions, selectedHospital, selectedWard]);

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
        return <Badge className="bg-blue-600">Suplementacao Oral</Badge>;
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
        return <Badge className="bg-orange-500 hover:bg-orange-600">Atencao</Badge>;
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



  const handleOpenEvolution = (e: React.MouseEvent, patient: WardBed) => {
    e.stopPropagation(); // Prevent card click
    setSelectedPatientForEvolution(patient);
    setEvolutionDialogOpen(true);
  };

  const handleOpenPrescription = (patient: WardBed) => {
    if (!patient.patientId) return;
    const query = new URLSearchParams({ patient: patient.patientId });
    if (patient.prescriptionId) {
      query.set("prescription", patient.prescriptionId);
    }
    navigate(`/prescription?${query.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/35 to-background">
      <Header />

      <div className="container px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ola, {userName}</h1>
            <p className="text-muted-foreground">Bem-vindo ao sistema de nutricao enteral</p>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="bg-card/90 backdrop-blur border-primary/10">
          <CardHeader>
            <CardTitle>Acoes Rapidas</CardTitle>
            <CardDescription>Acesso rapido as principais funcionalidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hospital-select" className="text-sm font-medium" title="Selecione a unidade (hospital) para carregar os setores.">Selecionar Unidade</Label>
                <Select value={selectedHospital} onValueChange={(val) => {
                  const selected = hospitals.find((hospital) => hospital.id === val);
                  setSelectedHospital(val);
                  setSelectedWard("");
                  localStorage.setItem("userHospitalId", val);
                  localStorage.setItem("userHospitalName", selected?.name || "Unidade nao selecionada");
                  localStorage.removeItem("userWard");
                  window.dispatchEvent(new Event("enmeta-session-updated"));
                }}>
                  <SelectTrigger id="hospital-select" className="h-auto py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      <SelectValue placeholder="Selecione a unidade" />
                    </div>
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
                <Label htmlFor="ward-select" className="text-sm font-medium" title="Filtre os pacientes por setor ou ala da unidade.">Selecionar Setor</Label>
                <Select
                  value={selectedWard}
                  onValueChange={(value) => {
                    setSelectedWard(value);
                    localStorage.setItem("userWard", value);
                    window.dispatchEvent(new Event("enmeta-session-updated"));
                  }}
                  disabled={!selectedHospital}
                >
                  <SelectTrigger id="ward-select" className="h-auto py-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center text-muted-foreground">
                        <Building2 className="h-5 w-5" />
                      </span>
                      <SelectValue placeholder={!selectedHospital ? "Selecione uma unidade primeiro" : "Escolher setor da unidade"} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((ward) => (
                      <SelectItem key={ward.id} value={ward.name}>
                        {ward.name}
                      </SelectItem>
                    ))}
                    {wards.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground text-center">Nenhum setor cadastrado</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
                <DialogTrigger asChild>
                  <div className="space-y-2" title="Busque por nome, data de nascimento ou prontuario.">
                    <Label className="text-sm font-medium">Buscar Paciente</Label>
                    <Button variant="outline" className="h-auto py-4 w-full flex flex-col gap-2" title="Abrir busca detalhada de paciente">
                      <Search className="h-6 w-6" />
                      <span>Buscar Paciente</span>
                    </Button>
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Buscar Paciente</DialogTitle>
                    <DialogDescription>Busque por nome, data de nascimento ou Numero de Prontuario</DialogDescription>
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
                      <Label htmlFor="search-record">Numero de Prontuario</Label>
                      <Input
                        id="search-record"
                        placeholder="Digite o prontuario"
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
                <Label className="text-sm font-medium" title="Abre o cadastro completo de paciente.">Cadastrar Paciente</Label>
                <Button
                  variant="outline"
                  className="h-auto py-4 w-full flex flex-col gap-2"
                  title="Cadastrar novo paciente"
                  onClick={() => navigate('/patients')}
                >
                  <UserPlus className="h-6 w-6" />
                  <span>Cadastrar Paciente</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Ward Map - Only shows after ward selection */}
        {selectedWard && (
          <Card className="bg-card/90 backdrop-blur border-primary/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mapa do Setor - {selectedWard}</CardTitle>
                  <CardDescription>Visualizacao dos leitos e pacientes com vias alimentares</CardDescription>
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
                    <span className="text-sm">Suplementacao</span>
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
                      onClick={() => bed.patient && handleOpenPrescription(bed)}
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
                              <Button
                                variant="link"
                                className="p-0 h-auto text-primary text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPrescription(bed);
                                }}
                              >
                                Prescrever
                              </Button>
                              <Button
                                variant="link"
                                className="p-0 h-auto text-primary text-sm"
                                onClick={(e) => handleOpenEvolution(e, bed)}
                              >
                                Evoluir
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Leito disponivel</p>
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
          patientId={selectedPatientForEvolution.patientId}
          prescriptionId={selectedPatientForEvolution.prescriptionId ?? undefined}
          prescribedVolume={selectedPatientForEvolution.prescribedVolume}
          prescribedCalories={selectedPatientForEvolution.prescribedCalories}
        />
      )}
    </div>
  );
};

export default Dashboard;
