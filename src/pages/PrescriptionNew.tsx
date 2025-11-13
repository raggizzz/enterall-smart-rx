import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator, Save, Printer, ArrowLeft, AlertCircle, Plus, Trash2, Utensils, Droplet, Syringe, Pill } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { getAllFormulas, getFormulasBySystem, calculateNutritionalValues, getFormulaById } from "@/lib/formulasDatabase";

interface Formula {
  id: string;
  volume: string;
  times: string[];
  waterDilution: string;
  calories: number;
  protein: number;
}

interface BottleCalculation {
  size: number;
  quantity: number;
}

const PrescriptionNew = () => {
  const navigate = useNavigate();
  
  // Patient data
  const patient = {
    name: "Antonio Pereira",
    weight: 75,
    height: 172,
    record: "2024001",
    dob: "10/01/1978",
  };

  // Feeding routes state
  const [feedingRoutes, setFeedingRoutes] = useState({
    oral: false,
    oralSupplement: false,
    enteral: false,
    parenteral: false,
  });

  // Prescription state
  const [therapyType, setTherapyType] = useState<"oral" | "enteral" | "">("");
  const [oralDelivery, setOralDelivery] = useState<"cup" | "original" | "">("");
  const [enteralRoute, setEnteralRoute] = useState<"SNE" | "SOG" | "GTT" | "JTT" | "">("");
  const [systemType, setSystemType] = useState<"open" | "closed" | "">("");
  
  // Formulas state
  const [formulas, setFormulas] = useState<Formula[]>([
    { id: "1", volume: "", times: [], waterDilution: "", calories: 0, protein: 0 }
  ]);

  // Available formulas database
  const availableFormulas = [
    { id: "f1", name: "Nutrison Advanced Diason", caloriesPer100ml: 100, proteinPer100ml: 4.0, type: "closed" },
    { id: "f2", name: "Fresubin Original", caloriesPer100ml: 100, proteinPer100ml: 3.8, type: "closed" },
    { id: "f3", name: "Peptamen", caloriesPer100ml: 100, proteinPer100ml: 4.0, type: "closed" },
    { id: "f4", name: "Nutridrink", caloriesPer100ml: 150, proteinPer100ml: 6.0, type: "closed" },
    { id: "f5", name: "Fórmula Artesanal Padrão", caloriesPer100ml: 100, proteinPer100ml: 3.5, type: "open" },
    { id: "f6", name: "Fórmula Artesanal Hipercalórica", caloriesPer100ml: 150, proteinPer100ml: 5.0, type: "open" },
    { id: "f7", name: "Ensure Plus", caloriesPer100ml: 150, proteinPer100ml: 6.25, type: "closed" },
    { id: "f8", name: "Glucerna", caloriesPer100ml: 100, proteinPer100ml: 4.2, type: "closed" },
  ];

  const [selectedFormulas, setSelectedFormulas] = useState<{ [key: string]: string }>({});
  const [totalNutrition, setTotalNutrition] = useState({
    calories: 0,
    protein: 0,
    caloriesPerKg: 0,
    proteinPerKg: 0,
  });

  const [bottleCalculations, setBottleCalculations] = useState<{ [key: string]: BottleCalculation[] }>({});

  // Time options for infusion
  const timeOptions = [
    "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
  ];

  // Calculate bottles based on volume
  const calculateBottles = (volumePerTime: number): BottleCalculation[] => {
    const bottles: BottleCalculation[] = [];
    
    if (volumePerTime <= 100) {
      bottles.push({ size: 100, quantity: 1 });
    } else if (volumePerTime <= 300) {
      bottles.push({ size: 300, quantity: 1 });
    } else if (volumePerTime <= 500) {
      bottles.push({ size: 500, quantity: 1 });
    } else {
      // For volumes > 500ml, use multiple 500ml bottles
      const fullBottles = Math.floor(volumePerTime / 500);
      const remainder = volumePerTime % 500;
      
      if (fullBottles > 0) {
        bottles.push({ size: 500, quantity: fullBottles });
      }
      
      if (remainder > 0) {
        if (remainder <= 100) {
          bottles.push({ size: 100, quantity: 1 });
        } else if (remainder <= 300) {
          bottles.push({ size: 300, quantity: 1 });
        } else {
          bottles.push({ size: 500, quantity: 1 });
        }
      }
    }
    
    return bottles;
  };

  // Real-time calculation effect
  useEffect(() => {
    let totalCal = 0;
    let totalProt = 0;
    const newBottleCalcs: { [key: string]: BottleCalculation[] } = {};

    formulas.forEach((formula) => {
      const selectedFormulaId = selectedFormulas[formula.id];
      const formulaData = availableFormulas.find(f => f.id === selectedFormulaId);
      
      if (formulaData && formula.volume && formula.times.length > 0) {
        const volumePerTime = parseFloat(formula.volume) / formula.times.length;
        const totalVolume = parseFloat(formula.volume);
        
        // Calculate nutrition
        const calories = (totalVolume / 100) * formulaData.caloriesPer100ml;
        const protein = (totalVolume / 100) * formulaData.proteinPer100ml;
        
        totalCal += calories;
        totalProt += protein;

        // Calculate bottles for each time
        const bottles = calculateBottles(volumePerTime);
        newBottleCalcs[formula.id] = bottles;
      }
    });

    setTotalNutrition({
      calories: Math.round(totalCal),
      protein: Math.round(totalProt * 10) / 10,
      caloriesPerKg: Math.round((totalCal / patient.weight) * 10) / 10,
      proteinPerKg: Math.round((totalProt / patient.weight) * 10) / 10,
    });

    setBottleCalculations(newBottleCalcs);
  }, [formulas, selectedFormulas]);

  const addFormula = () => {
    const newId = (formulas.length + 1).toString();
    setFormulas([...formulas, { id: newId, volume: "", times: [], waterDilution: "", calories: 0, protein: 0 }]);
  };

  const removeFormula = (id: string) => {
    if (formulas.length > 1) {
      setFormulas(formulas.filter(f => f.id !== id));
      const newSelectedFormulas = { ...selectedFormulas };
      delete newSelectedFormulas[id];
      setSelectedFormulas(newSelectedFormulas);
    }
  };

  const updateFormula = (id: string, field: keyof Formula, value: any) => {
    setFormulas(formulas.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const toggleTime = (formulaId: string, time: string) => {
    const formula = formulas.find(f => f.id === formulaId);
    if (formula) {
      const times = formula.times.includes(time)
        ? formula.times.filter(t => t !== time)
        : [...formula.times, time].sort();
      updateFormula(formulaId, "times", times);
    }
  };

  const handleSave = () => {
    if (!therapyType) {
      toast.error("Selecione o tipo de terapia nutricional");
      return;
    }

    if (therapyType === "enteral" && !enteralRoute) {
      toast.error("Selecione a via de administração enteral");
      return;
    }

    if (therapyType === "enteral" && !systemType) {
      toast.error("Selecione o tipo de sistema (Aberto/Fechado)");
      return;
    }

    const hasValidFormula = formulas.some(f => 
      selectedFormulas[f.id] && f.volume && f.times.length > 0
    );

    if (!hasValidFormula) {
      toast.error("Configure pelo menos uma fórmula com volume e horários");
      return;
    }

    toast.success("Prescrição salva com sucesso!");
    navigate("/dashboard");
  };

  const filteredFormulas = availableFormulas.filter(f => 
    systemType === "" || f.type === systemType
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Prescrição de Nutrição</h1>
              <p className="text-muted-foreground">Prescrição completa de terapia nutricional</p>
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
              <div>
                <Label className="text-muted-foreground">Data de Nascimento</Label>
                <p className="font-medium">{patient.dob}</p>
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
              <CardTitle>1. Selecionar Paciente</CardTitle>
              <CardDescription>Paciente selecionado: {patient.name}</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Feeding Routes Selection */}
        <Card>
          <CardHeader>
            <CardTitle>2. Vias de Alimentação</CardTitle>
            <CardDescription>Selecione as vias de alimentação que aparecerão no mapa da ala</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <Checkbox
                  id="oral"
                  checked={feedingRoutes.oral}
                  onCheckedChange={(checked) => setFeedingRoutes({ ...feedingRoutes, oral: checked as boolean })}
                />
                <div className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-green-600" />
                  <Label htmlFor="oral" className="cursor-pointer">Oral</Label>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <Checkbox
                  id="oral-supplement"
                  checked={feedingRoutes.oralSupplement}
                  onCheckedChange={(checked) => setFeedingRoutes({ ...feedingRoutes, oralSupplement: checked as boolean })}
                />
                <div className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-blue-600" />
                  <Label htmlFor="oral-supplement" className="cursor-pointer">Suplementação Oral</Label>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <Checkbox
                  id="enteral"
                  checked={feedingRoutes.enteral}
                  onCheckedChange={(checked) => setFeedingRoutes({ ...feedingRoutes, enteral: checked as boolean })}
                />
                <div className="flex items-center gap-2">
                  <Droplet className="h-5 w-5 text-purple-600" />
                  <Label htmlFor="enteral" className="cursor-pointer">Enteral</Label>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <Checkbox
                  id="parenteral"
                  checked={feedingRoutes.parenteral}
                  onCheckedChange={(checked) => setFeedingRoutes({ ...feedingRoutes, parenteral: checked as boolean })}
                />
                <div className="flex items-center gap-2">
                  <Syringe className="h-5 w-5 text-orange-600" />
                  <Label htmlFor="parenteral" className="cursor-pointer">Parenteral</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Therapy Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>3. Prescrever Terapia Nutricional</CardTitle>
            <CardDescription>Escolha o tipo de terapia: Oral ou Enteral</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant={therapyType === "oral" ? "default" : "outline"}
                className="h-20"
                onClick={() => setTherapyType("oral")}
              >
                <div className="flex flex-col items-center gap-2">
                  <Utensils className="h-6 w-6" />
                  <span>Via Oral</span>
                </div>
              </Button>
              <Button
                variant={therapyType === "enteral" ? "default" : "outline"}
                className="h-20"
                onClick={() => setTherapyType("enteral")}
              >
                <div className="flex flex-col items-center gap-2">
                  <Droplet className="h-6 w-6" />
                  <span>Via Enteral</span>
                </div>
              </Button>
            </div>

            {/* Oral Therapy Options */}
            {therapyType === "oral" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold">Opções de Entrega - Via Oral</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant={oralDelivery === "cup" ? "default" : "outline"}
                    onClick={() => setOralDelivery("cup")}
                  >
                    Enviar no Copo
                  </Button>
                  <Button
                    variant={oralDelivery === "original" ? "default" : "outline"}
                    onClick={() => setOralDelivery("original")}
                  >
                    Embalagem Original
                  </Button>
                </div>
              </div>
            )}

            {/* Enteral Therapy Options */}
            {therapyType === "enteral" && (
              <div className="space-y-4">
                {/* Route Selection */}
                <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                  <Label htmlFor="enteral-route" className="font-semibold">Via de Administração Enteral *</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Obrigatória - determina onde o enfermeiro conectará a dieta
                  </p>
                  <Select value={enteralRoute} onValueChange={(value: any) => setEnteralRoute(value)}>
                    <SelectTrigger id="enteral-route">
                      <SelectValue placeholder="Selecione a via" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SNE">SNE - Sonda Nasoenteral</SelectItem>
                      <SelectItem value="SOG">SOG - Sonda Orogástrica</SelectItem>
                      <SelectItem value="GTT">GTT - Gastrostomia</SelectItem>
                      <SelectItem value="JTT">JTT - Jejunostomia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* System Type Selection */}
                <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                  <Label className="font-semibold">Tipo de Sistema *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <Button
                      variant={systemType === "open" ? "default" : "outline"}
                      onClick={() => setSystemType("open")}
                    >
                      Sistema Aberto
                    </Button>
                    <Button
                      variant={systemType === "closed" ? "default" : "outline"}
                      onClick={() => setSystemType("closed")}
                    >
                      Sistema Fechado
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formula Configuration - Only show if therapy type is selected */}
        {therapyType && (therapyType === "oral" || (therapyType === "enteral" && systemType)) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configuração de Fórmulas</CardTitle>
                  <CardDescription>
                    {therapyType === "oral" ? "Configure os produtos para via oral" : `Configure as fórmulas - Sistema ${systemType === "open" ? "Aberto" : "Fechado"}`}
                  </CardDescription>
                </div>
                <Button onClick={addFormula} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Fórmula
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {formulas.map((formula, index) => (
                <div key={formula.id} className="p-4 border rounded-lg space-y-4 bg-card">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Fórmula {index + 1}</h3>
                    {formulas.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFormula(formula.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {/* Formula Selection */}
                  <div className="space-y-2">
                    <Label>3.1 Escolher Fórmula *</Label>
                    <Select
                      value={selectedFormulas[formula.id] || ""}
                      onValueChange={(value) => setSelectedFormulas({ ...selectedFormulas, [formula.id]: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a fórmula" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredFormulas.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} ({f.caloriesPer100ml} kcal/100ml, {f.proteinPer100ml}g prot/100ml)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Water Dilution - Only for open system */}
                  {systemType === "open" && (
                    <div className="space-y-2">
                      <Label>Água de Diluição (ml)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 50"
                        value={formula.waterDilution}
                        onChange={(e) => updateFormula(formula.id, "waterDilution", e.target.value)}
                      />
                    </div>
                  )}

                  {/* Volume */}
                  <div className="space-y-2">
                    <Label>3.2 Volume Total (ml) *</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 1500"
                      value={formula.volume}
                      onChange={(e) => updateFormula(formula.id, "volume", e.target.value)}
                    />
                  </div>

                  {/* Infusion Times */}
                  <div className="space-y-2">
                    <Label>3.3 Horários de Infusão *</Label>
                    <p className="text-sm text-muted-foreground">Selecione os horários</p>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
                      {timeOptions.map((time) => (
                        <Button
                          key={time}
                          variant={formula.times.includes(time) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleTime(formula.id, time)}
                          className="text-xs"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                    {formula.times.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Selecionados: {formula.times.join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Bottle Calculation Display */}
                  {selectedFormulas[formula.id] && formula.volume && formula.times.length > 0 && bottleCalculations[formula.id] && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-2">Cálculo de Faturamento:</p>
                      <div className="space-y-1">
                        <p className="text-sm text-blue-800">
                          Volume por horário: {(parseFloat(formula.volume) / formula.times.length).toFixed(0)}ml
                        </p>
                        <p className="text-sm text-blue-800">
                          Frascos necessários por horário:
                        </p>
                        <ul className="list-disc list-inside text-sm text-blue-800 ml-4">
                          {bottleCalculations[formula.id].map((bottle, idx) => (
                            <li key={idx}>
                              {bottle.quantity}x Frasco de {bottle.size}ml
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm font-medium text-blue-900 mt-2">
                          Total de horários: {formula.times.length}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Real-time Nutritional Calculations */}
        {totalNutrition.calories > 0 && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Cálculos Nutricionais em Tempo Real
              </CardTitle>
              <CardDescription>Valores calculados automaticamente conforme você preenche</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-medical-green-light rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Calorias Totais</p>
                  <p className="text-3xl font-bold text-primary">{totalNutrition.calories}</p>
                  <p className="text-xs text-muted-foreground">kcal/dia</p>
                </div>
                <div className="text-center p-4 bg-medical-green-light rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Proteínas Totais</p>
                  <p className="text-3xl font-bold text-primary">{totalNutrition.protein}</p>
                  <p className="text-xs text-muted-foreground">g/dia</p>
                </div>
                <div className="text-center p-4 bg-medical-green-light rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Calorias/kg</p>
                  <p className="text-3xl font-bold text-primary">{totalNutrition.caloriesPerKg}</p>
                  <p className="text-xs text-muted-foreground">kcal/kg/dia</p>
                </div>
                <div className="text-center p-4 bg-medical-green-light rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Proteínas/kg</p>
                  <p className="text-3xl font-bold text-primary">{totalNutrition.proteinPerKg}</p>
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

export default PrescriptionNew;
