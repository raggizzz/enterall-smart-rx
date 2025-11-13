import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calculator, Save, Printer, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";

const Prescription = () => {
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState({
    patientId: "",
    formula: "",
    volume: "",
    frequency: "",
    route: "",
    flowRate: "",
    startTime: "",
    calories: "",
    protein: "",
    notes: "",
  });

  const [calculations, setCalculations] = useState({
    totalCalories: 0,
    totalProtein: 0,
    caloriesPerKg: 0,
    proteinPerKg: 0,
  });

  // Mock patient data
  const patient = {
    name: "Antonio Pereira",
    weight: 75,
    height: 172,
    record: "2024001",
  };

  const formulas = [
    { id: "1", name: "Nutrison Advanced Diason", calories: 1.0, protein: 4.0, type: "Fechado" },
    { id: "2", name: "Fresubin Original", calories: 1.0, protein: 3.8, type: "Fechado" },
    { id: "3", name: "Peptamen", calories: 1.0, protein: 4.0, type: "Fechado" },
    { id: "4", name: "Nutridrink", calories: 1.5, protein: 6.0, type: "Fechado" },
    { id: "5", name: "Fórmula Artesanal Padrão", calories: 1.0, protein: 3.5, type: "Aberto" },
  ];

  const handleCalculate = () => {
    const volume = parseFloat(prescription.volume) || 0;
    const selectedFormula = formulas.find((f) => f.id === prescription.formula);

    if (!selectedFormula) {
      toast.error("Selecione uma fórmula");
      return;
    }

    const totalCal = (volume / 1000) * selectedFormula.calories * 1000;
    const totalProt = (volume / 1000) * selectedFormula.protein;
    const calPerKg = totalCal / patient.weight;
    const protPerKg = totalProt / patient.weight;

    setCalculations({
      totalCalories: Math.round(totalCal),
      totalProtein: Math.round(totalProt * 10) / 10,
      caloriesPerKg: Math.round(calPerKg * 10) / 10,
      proteinPerKg: Math.round(protPerKg * 10) / 10,
    });

    toast.success("Cálculos realizados com sucesso!");
  };

  const handleSave = () => {
    if (!prescription.formula || !prescription.volume || !prescription.route) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    toast.success("Prescrição salva com sucesso!");
    navigate("/dashboard");
  };

  const getSystemBadge = (type: string) => {
    return type === "Fechado" ? (
      <Badge className="bg-success">Sistema Fechado</Badge>
    ) : (
      <Badge className="bg-info">Sistema Aberto</Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nova Prescrição</h1>
            <p className="text-muted-foreground">Prescrição de nutrição enteral</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info("Função em desenvolvimento")}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Prescrição
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Dados do Paciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Nome</Label>
              <p className="font-medium">{patient.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Prontuário</Label>
              <p className="font-medium">{patient.record}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Peso</Label>
                <p className="font-medium text-lg">{patient.weight} kg</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Altura</Label>
                <p className="font-medium text-lg">{patient.height} cm</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">IMC</Label>
              <p className="font-medium text-lg">
                {(patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1)} kg/m²
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Prescription Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados da Prescrição</CardTitle>
            <CardDescription>Preencha os dados da dieta enteral</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="formula">Fórmula Enteral *</Label>
              <Select
                value={prescription.formula}
                onValueChange={(value) => setPrescription({ ...prescription, formula: value })}
              >
                <SelectTrigger id="formula">
                  <SelectValue placeholder="Selecione a fórmula" />
                </SelectTrigger>
                <SelectContent>
                  {formulas.map((formula) => (
                    <SelectItem key={formula.id} value={formula.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{formula.name}</span>
                        {getSystemBadge(formula.type)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="volume">Volume Total (ml) *</Label>
                <Input
                  id="volume"
                  type="number"
                  value={prescription.volume}
                  onChange={(e) => setPrescription({ ...prescription, volume: e.target.value })}
                  placeholder="Ex: 1500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequência</Label>
                <Select
                  value={prescription.frequency}
                  onValueChange={(value) => setPrescription({ ...prescription, frequency: value })}
                >
                  <SelectTrigger id="frequency">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="continua">Contínua</SelectItem>
                    <SelectItem value="intermitente">Intermitente</SelectItem>
                    <SelectItem value="bolus">Bolus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="route">Via de Administração *</Label>
                <Select
                  value={prescription.route}
                  onValueChange={(value) => setPrescription({ ...prescription, route: value })}
                >
                  <SelectTrigger id="route">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sng">Sonda Nasogástrica (SNG)</SelectItem>
                    <SelectItem value="sne">Sonda Nasoenteral (SNE)</SelectItem>
                    <SelectItem value="gtt">Gastrostomia (GTT)</SelectItem>
                    <SelectItem value="jejunostomia">Jejunostomia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="flowRate">Taxa de Infusão (ml/h)</Label>
                <Input
                  id="flowRate"
                  type="number"
                  value={prescription.flowRate}
                  onChange={(e) => setPrescription({ ...prescription, flowRate: e.target.value })}
                  placeholder="Ex: 60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Horário de Início</Label>
              <Input
                id="startTime"
                type="time"
                value={prescription.startTime}
                onChange={(e) => setPrescription({ ...prescription, startTime: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={prescription.notes}
                onChange={(e) => setPrescription({ ...prescription, notes: e.target.value })}
                placeholder="Anotações adicionais, cuidados especiais, etc."
                rows={3}
              />
            </div>

            <Button onClick={handleCalculate} variant="outline" className="w-full">
              <Calculator className="h-4 w-4 mr-2" />
              Calcular Valores Nutricionais
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Nutritional Calculations */}
      {calculations.totalCalories > 0 && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Cálculos Nutricionais
            </CardTitle>
            <CardDescription>Valores calculados com base na prescrição</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-medical-green-light rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Calorias Totais</p>
                <p className="text-2xl font-bold text-primary">{calculations.totalCalories}</p>
                <p className="text-xs text-muted-foreground">kcal/dia</p>
              </div>
              <div className="text-center p-4 bg-medical-green-light rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Proteínas Totais</p>
                <p className="text-2xl font-bold text-primary">{calculations.totalProtein}</p>
                <p className="text-xs text-muted-foreground">g/dia</p>
              </div>
              <div className="text-center p-4 bg-medical-green-light rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Calorias/kg</p>
                <p className="text-2xl font-bold text-primary">{calculations.caloriesPerKg}</p>
                <p className="text-xs text-muted-foreground">kcal/kg/dia</p>
              </div>
              <div className="text-center p-4 bg-medical-green-light rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Proteínas/kg</p>
                <p className="text-2xl font-bold text-primary">{calculations.proteinPerKg}</p>
                <p className="text-xs text-muted-foreground">g/kg/dia</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-info mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Recomendações:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Calorias: 25-30 kcal/kg/dia (adultos em geral)</li>
                  <li>Proteínas: 1.0-1.5 g/kg/dia (adultos em geral)</li>
                  <li>Valores podem variar conforme condição clínica</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};

export default Prescription;
