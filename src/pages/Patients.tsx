import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  UserPlus,
  FileText,
  Stethoscope,
  Calendar,
  Edit,
  Trash2,
  MoreHorizontal,
  Activity,
  LogOut,
  XCircle,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { usePatients, useClinics, useHospitals, useWards, usePrescriptions } from "@/hooks/useDatabase";
import { Patient } from "@/lib/database";
import { can } from "@/lib/permissions";
import { useCurrentRole } from "@/hooks/useCurrentRole";

const Patients = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // active, all, discharged, deceased
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Status Confirmation State
  const [statusDialogData, setStatusDialogData] = useState<{
    open: boolean;
    patientId: string;
    newStatus: 'discharged' | 'deceased';
    patientName: string;
  }>({
    open: false,
    patientId: "",
    newStatus: "discharged",
    patientName: ""
  });

  const [newPatient, setNewPatient] = useState({
    name: "",
    dob: "",
    record: "",
    bed: "",
    ward: "",
    hospitalId: "",
    weight: "",
    height: "",
    notes: "",
    gender: "male" as "male" | "female",
    nutritionType: "enteral" as "enteral" | "parenteral" | "oral" | "jejum",
  });

  const { patients, isLoading, createPatient, updatePatient, deletePatient } = usePatients();
  const { prescriptions } = usePrescriptions();
  const { clinics } = useClinics();
  const { hospitals } = useHospitals();
  // Fetch wards based on selected hospital in the form
  const { wards } = useWards(newPatient.hospitalId);
  const role = useCurrentRole();
  const canMovePatients = can(role, "move_patients");
  const isEditing = Boolean(editingPatient);
  const disableWardFields = isEditing && !canMovePatients;

  useEffect(() => {
    // If we are editing, we might have a hospitalId. 
    // If not (legacy data), we rely on ward name string match if we wanted to be smart, 
    // but for now we just show what we have.
  }, [editingPatient]);





  const filteredPatients = patients.filter(
    (patient) => {
      const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.record.includes(searchQuery) ||
        patient.dob?.includes(searchQuery);

      if (statusFilter === 'all') return matchesSearch;
      if (statusFilter === 'active') return matchesSearch && (patient.status === 'active' || !patient.status);
      return matchesSearch && patient.status === statusFilter;
    }
  );

  const resetForm = () => {
    setNewPatient({
      name: "",
      dob: "",
      record: "",
      bed: "",
      ward: "",
      hospitalId: "",
      weight: "",
      height: "",
      notes: "",
      gender: "male",
      nutritionType: "enteral",
    });
    setEditingPatient(null);
  };

  const handleAddPatient = async () => {
    if (!newPatient.name || !newPatient.dob || !newPatient.record) {
      toast.error("Preencha todos os campos obrigatorios");
      return;
    }

    try {
      if (editingPatient?.id) {
        const updateData = {
          name: newPatient.name,
          dob: newPatient.dob,
          record: newPatient.record,
          bed: newPatient.bed,
          ward: newPatient.ward,
          hospitalId: newPatient.hospitalId,
          weight: newPatient.weight ? parseFloat(newPatient.weight) : undefined,
          height: newPatient.height ? parseFloat(newPatient.height) : undefined,
          observation: newPatient.notes,
          gender: newPatient.gender,
          nutritionType: newPatient.nutritionType,
        };

        if (!canMovePatients) {
          updateData.ward = editingPatient.ward;
          updateData.hospitalId = editingPatient.hospitalId;
        }

        await updatePatient(editingPatient.id, updateData);
        toast.success("Paciente atualizado com sucesso!");
      } else {
        await createPatient({
          name: newPatient.name,
          dob: newPatient.dob,
          record: newPatient.record,
          bed: newPatient.bed,
          ward: newPatient.ward,
          hospitalId: newPatient.hospitalId,
          weight: newPatient.weight ? parseFloat(newPatient.weight) : undefined,
          height: newPatient.height ? parseFloat(newPatient.height) : undefined,
          observation: newPatient.notes,
          gender: newPatient.gender,
          nutritionType: newPatient.nutritionType,
          status: "active",
        });
        toast.success("Paciente cadastrado com sucesso!");
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving patient:", error);
      toast.error("Erro ao salvar paciente");
    }
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setNewPatient({
      name: patient.name,
      dob: patient.dob,
      record: patient.record,
      bed: patient.bed || "",
      ward: patient.ward || "",
      hospitalId: patient.hospitalId || "",
      weight: patient.weight?.toString() || "",
      height: patient.height?.toString() || "",
      notes: patient.observation || "",
      gender: patient.gender || "male",
      nutritionType: patient.nutritionType,
    });
    setIsDialogOpen(true);
  };



  const confirmUpdateStatus = async () => {
    const { patientId, newStatus } = statusDialogData;
    if (!patientId) return;

    try {
      await updatePatient(patientId, {
        status: newStatus,
        dischargeDate: new Date().toISOString(),
      });
      toast.success(newStatus === 'discharged' ? "Alta registrada com sucesso" : "Obito registrado com sucesso");
      setStatusDialogData({ ...statusDialogData, open: false });
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const openStatusDialog = (patient: Patient, status: 'discharged' | 'deceased') => {
    if (!patient.id) return;
    setStatusDialogData({
      open: true,
      patientId: patient.id,
      newStatus: status,
      patientName: patient.name
    });
  };

  const getNutritionBadge = (type: string) => {
    const badges = {
      enteral: <Badge className="bg-success">Enteral</Badge>,
      parenteral: <Badge className="bg-info">Parenteral</Badge>,
      oral: <Badge className="bg-primary">Oral</Badge>,
      jejum: <Badge variant="outline">Jejum</Badge>,
    };
    return badges[type as keyof typeof badges];
  };

  const buildPrescriptionUrl = (patientId?: string) => {
    if (!patientId) return "/prescription";
    const params = new URLSearchParams({ patient: patientId });
    const activePrescription = prescriptions.find(
      (prescription) => prescription.patientId === patientId && prescription.status === "active"
    ) || prescriptions.find((prescription) => prescription.patientId === patientId);

    if (activePrescription?.id) {
      params.set("prescription", activePrescription.id);
    }

    return `/prescription?${params.toString()}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
            <p className="text-muted-foreground">Gerenciar todos os pacientes do hospital</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Cadastrar Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPatient ? 'Editar' : 'Cadastrar Novo'} Paciente</DialogTitle>
                <DialogDescription>
                  Preencha os dados do paciente para realizar o cadastro
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dob">Data de Nascimento *</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={newPatient.dob}
                      onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="record">Numero de Prontuario *</Label>
                    <Input
                      id="record"
                      value={newPatient.record}
                      onChange={(e) => setNewPatient({ ...newPatient, record: e.target.value })}
                      placeholder="Ex: 2024001"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Sexo</Label>
                  <Select
                    value={newPatient.gender}
                    onValueChange={(val: "male" | "female") => setNewPatient({ ...newPatient, gender: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Via nutricional sera definida na prescricao, nao no cadastro inicial.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bed">Leito</Label>
                    <Input
                      id="bed"
                      value={newPatient.bed}
                      onChange={(e) => setNewPatient({ ...newPatient, bed: e.target.value })}
                      placeholder="Ex: Leito 01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospital">Unidade</Label>
                    <Select
                      value={newPatient.hospitalId}
                      onValueChange={(val) => setNewPatient({ ...newPatient, hospitalId: val, ward: "" })}
                      disabled={disableWardFields}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {hospitals.map(h => (
                          <SelectItem key={h.id} value={h.id || "temp"}>
                            {h.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ward">Ala/Setor</Label>
                    <Select
                      value={newPatient.ward}
                      onValueChange={(val) => setNewPatient({ ...newPatient, ward: val })}
                      disabled={disableWardFields || (!newPatient.hospitalId && hospitals.length > 0)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent>
                        {wards.map(ward => (
                          <SelectItem key={ward.id} value={ward.name}>{ward.name}</SelectItem>
                        ))}
                        {!newPatient.hospitalId && clinics.map(clinic => (
                          <SelectItem key={clinic.id} value={clinic.name}>{clinic.name}</SelectItem>
                        ))}
                        {wards.length === 0 && !newPatient.hospitalId && (
                          <>
                            <SelectItem value="UTI-ADULTO">UTI Adulto</SelectItem>
                            <SelectItem value="UTI-PEDIATRICA">UTI Pediatrica</SelectItem>
                            <SelectItem value="ENFERMARIA">Enfermaria</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso Atual (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      value={newPatient.weight}
                      onChange={(e) => setNewPatient({ ...newPatient, weight: e.target.value })}
                      placeholder="Ex: 75"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Estatura (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={newPatient.height}
                      onChange={(e) => setNewPatient({ ...newPatient, height: e.target.value })}
                      placeholder="Ex: 172"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Anotacoes</Label>
                  <Textarea
                    id="notes"
                    value={newPatient.notes}
                    onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                    placeholder="Diagnostico, observacoes, etc."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleAddPatient}>
                  {editingPatient ? 'Salvar Alteracoes' : 'Cadastrar Paciente'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Lista de Pacientes</CardTitle>
                <CardDescription>
                  {filteredPatients.length} paciente(s) encontrado(s)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Pacientes Ativos</SelectItem>
                    <SelectItem value="all">Todos os Pacientes</SelectItem>
                    <SelectItem value="discharged">Pacientes com Alta</SelectItem>
                    <SelectItem value="deceased">Obitos</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1 md:w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, prontuario ou data..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando pacientes...
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum paciente encontrado</p>
                <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                  Cadastrar primeiro paciente
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Prontuario</TableHead>
                    <TableHead>Data Nasc.</TableHead>
                    <TableHead>Leito/Ala</TableHead>
                    <TableHead>Peso/Altura</TableHead>
                    <TableHead>Via Nutricional</TableHead>
                    <TableHead>Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>{patient.record}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(patient.dob)}
                          {patient.status === 'discharged' && (
                            <Badge variant="outline" className="border-green-500 text-green-600 flex gap-1 items-center">
                              <CheckCircle2 className="h-3 w-3" /> Alta
                            </Badge>
                          )}
                          {patient.status === 'deceased' && (
                            <Badge variant="outline" className="border-red-500 text-red-600 flex gap-1 items-center">
                              <XCircle className="h-3 w-3" /> Obito
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{patient.bed || '-'}</div>
                          <div className="text-muted-foreground">{patient.ward || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{patient.weight ? `${patient.weight} kg` : '-'}</div>
                          <div className="text-muted-foreground">{patient.height ? `${patient.height} cm` : '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getNutritionBadge(patient.nutritionType)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(buildPrescriptionUrl(patient.id))}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Prescrever
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/patient-monitoring?patient=${patient.id}`)}
                              >
                                <Activity className="h-4 w-4 mr-2 text-blue-600" />
                                Acompanhamento TNE
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openStatusDialog(patient, 'discharged')}>
                                <LogOut className="h-4 w-4 mr-2 text-green-600" />
                                Alta do Paciente
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openStatusDialog(patient, 'deceased')}>
                                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                Registrar Obito
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditPatient(patient)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar Paciente
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomNav onAddPatient={() => setIsDialogOpen(true)} />

      <Dialog open={statusDialogData.open} onOpenChange={(open) => setStatusDialogData(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusDialogData.newStatus === 'discharged' ? 'Confirmar Alta' : 'Registrar Obito'}
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja {statusDialogData.newStatus === 'discharged' ? 'dar alta para' : 'registrar o obito de'}
              <strong> {statusDialogData.patientName}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setStatusDialogData(prev => ({ ...prev, open: false }))}>
              Cancelar
            </Button>
            <Button
              variant={statusDialogData.newStatus === 'deceased' ? 'destructive' : 'default'}
              onClick={confirmUpdateStatus}
              className={statusDialogData.newStatus === 'discharged' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {statusDialogData.newStatus === 'discharged' ? 'Confirmar Alta' : 'Confirmar Obito'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Patients;

