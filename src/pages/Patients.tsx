import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, UserPlus, FileText, Stethoscope, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

interface Patient {
  id: string;
  name: string;
  dob: string;
  record: string;
  bed: string;
  ward: string;
  weight: number;
  height: number;
  status: "active" | "inactive";
  nutritionType: "enteral" | "parenteral" | "oral" | "jejum";
}

const Patients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    dob: "",
    record: "",
    bed: "",
    weight: "",
    height: "",
    notes: "",
  });

  const mockPatients: Patient[] = [
    {
      id: "1",
      name: "Antonio Pereira",
      dob: "10/01/1978",
      record: "2024001",
      bed: "Leito 01",
      ward: "UTI-ADULTO",
      weight: 75,
      height: 172,
      status: "active",
      nutritionType: "enteral",
    },
    {
      id: "2",
      name: "Alicia Gomes",
      dob: "06/11/1981",
      record: "2024002",
      bed: "Leito 02",
      ward: "UTI-ADULTO",
      weight: 62,
      height: 165,
      status: "active",
      nutritionType: "enteral",
    },
    {
      id: "3",
      name: "Renata Fortes",
      dob: "10/05/1980",
      record: "2024003",
      bed: "Leito 03",
      ward: "UTI-ADULTO",
      weight: 68,
      height: 160,
      status: "active",
      nutritionType: "parenteral",
    },
  ];

  const filteredPatients = mockPatients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.record.includes(searchQuery) ||
      patient.dob.includes(searchQuery)
  );

  const handleAddPatient = () => {
    if (!newPatient.name || !newPatient.dob || !newPatient.record) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    toast.success("Paciente cadastrado com sucesso!");
    setIsDialogOpen(false);
    setNewPatient({
      name: "",
      dob: "",
      record: "",
      bed: "",
      weight: "",
      height: "",
      notes: "",
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground">Gerenciar todos os pacientes do hospital</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Cadastrar Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
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
                  <Label htmlFor="record">Número de Prontuário *</Label>
                  <Input
                    id="record"
                    value={newPatient.record}
                    onChange={(e) => setNewPatient({ ...newPatient, record: e.target.value })}
                    placeholder="Ex: 2024001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bed">Leito</Label>
                <Input
                  id="bed"
                  value={newPatient.bed}
                  onChange={(e) => setNewPatient({ ...newPatient, bed: e.target.value })}
                  placeholder="Ex: Leito 01"
                />
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
                <Label htmlFor="notes">Anotações</Label>
                <Textarea
                  id="notes"
                  value={newPatient.notes}
                  onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                  placeholder="Diagnóstico, observações, etc."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddPatient}>Cadastrar Paciente</Button>
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
              <div className="relative flex-1 md:w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, prontuário ou data..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Prontuário</TableHead>
                <TableHead>Data Nasc.</TableHead>
                <TableHead>Leito/Ala</TableHead>
                <TableHead>Peso/Altura</TableHead>
                <TableHead>Via Nutricional</TableHead>
                <TableHead>Ações</TableHead>
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
                      {patient.dob}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{patient.bed}</div>
                      <div className="text-muted-foreground">{patient.ward}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{patient.weight} kg</div>
                      <div className="text-muted-foreground">{patient.height} cm</div>
                    </div>
                  </TableCell>
                  <TableCell>{getNutritionBadge(patient.nutritionType)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/prescription?patient=${patient.id}`)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Prescrever
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Stethoscope className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Patients;
