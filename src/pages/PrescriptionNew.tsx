import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator, Save, Printer, ArrowLeft, AlertCircle, Plus, Trash2, Utensils, Droplet, Syringe, Pill } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { getAllFormulas } from "@/lib/formulasDatabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import LabelPreview from "@/components/LabelPreview";
import { format } from "date-fns";
import { savePrescription, PrescriptionData } from "@/services/prescriptionService";

interface Formula {
  id: string;
  volume: string; // Total volume or calculated
  rate?: string; // ml/h
  dropsPerMin?: string; // drops/min
  duration?: string; // hours
  times: string[];
  waterDilution: string;
  calories: number;
  protein: number;
}

interface Module {
  id: string;
  name: string;
  quantity: string; // g or ml
  times: string[];
  caloriesPerUnit: number; // kcal per g/ml
  proteinPerUnit: number; // g per g/ml
}

interface Hydration {
  volume: string;
  mode: 'bolus' | 'gravity' | 'pump';
  times: string[];
}

interface BottleCalculation {
  size: number;
  quantity: number;
}

interface ParenteralFormula {
  vet: string; // Kcal/dia
  aminoAcids: string; // g/kg/dia
  glucose: string; // g/kg/dia
  lipids: string; // g/kg/dia
}

interface OralDiet {
  consistency: string;
  frequency: string;
  volume?: string;
  observation?: string;
}

interface TNO {
  id: string;
  formulaName: string;
  volume: string;
  times: string[];
  dilution?: string;
  calories: number;
  protein: number;
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
  const [therapyType, setTherapyType] = useState<"oral" | "enteral" | "parenteral" | "">("");
  const [oralDelivery, setOralDelivery] = useState<"cup" | "original" | "">("");
  const [enteralRoute, setEnteralRoute] = useState<"SNE" | "SOG" | "SOE" | "GTT" | "JST" | "">("");
  const [infusionMode, setInfusionMode] = useState<"gravity" | "pump" | "">("");
  const [systemType, setSystemType] = useState<"open" | "closed" | "">("");

  // Formulas state
  const [formulas, setFormulas] = useState<Formula[]>([
    { id: "1", volume: "", rate: "", dropsPerMin: "", duration: "", times: [], waterDilution: "", calories: 0, protein: 0 }
  ]);
  const [modules, setModules] = useState<Module[]>([]);
  const [hydration, setHydration] = useState<Hydration>({ volume: "", mode: "bolus", times: [] });
  const [parenteral, setParenteral] = useState<ParenteralFormula>({ vet: "", aminoAcids: "", glucose: "", lipids: "" });
  const [oralDiet, setOralDiet] = useState<OralDiet>({ consistency: "", frequency: "", volume: "", observation: "" });
  const [tnoList, setTnoList] = useState<TNO[]>([]);
  const [nonIntentionalCalories, setNonIntentionalCalories] = useState<string>("");
  const [isLabelOpen, setIsLabelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mock Modules Data
  const availableModules = [
    { id: "m1", name: "Fresubin Protein", caloriesPerUnit: 3.6, proteinPerUnit: 0.9 }, // 90% protein approx (based on 0.9 density? User said DC 0.90, 7g ref -> 171kcal? No, 7g ref -> 171kcal is weird. Wait. 
    // User data: Fresubin protein DC 0.90, g 7, kcal 171? No, 7g is likely volume. 
    // Let's re-read: Fresubin protein DC 0.90, g 7, kcal 171? 7 * 0.9 = 6.3 kcal. 171 is way off.
    // Maybe 7 is scoops? 
    // Let's use standard values for these common modules if user data is ambiguous, or try to interpret.
    // User: Fresubin protein | DC 0.90 | 7 | 7 | 171 | 43
    // If 7 is "x/dia" (times per day), and "g" is 7. So 7g * 7 times = 49g total.
    // 49g * 3.6kcal/g (protein) ~= 176 kcal. Close to 171.
    // So "g" is dose, "x/dia" is frequency.
    // Fresubin Protein Powder is usually ~3.6 kcal/g and ~0.9g protein/g.
    // I will use these standard factors.

    { id: "m1", name: "Fresubin Protein", caloriesPerUnit: 3.6, proteinPerUnit: 0.9 },
    { id: "m2", name: "TCM com AGE", caloriesPerUnit: 8.8, proteinPerUnit: 0 }, // Fat module
    { id: "m3", name: "Carbofor", caloriesPerUnit: 3.8, proteinPerUnit: 0 }, // Maltodextrin
    { id: "m4", name: "Neofiber", caloriesPerUnit: 2.0, proteinPerUnit: 0 }, // Fiber
    { id: "m5", name: "Solufiber", caloriesPerUnit: 2.0, proteinPerUnit: 0 }, // Fiber
    { id: "m6", name: "Glutamina", caloriesPerUnit: 4.0, proteinPerUnit: 1.0 }, // Amino acid
    { id: "m7", name: "Água de Coco", caloriesPerUnit: 0.2, proteinPerUnit: 0 }, // Hydration/Electrolytes
  ];

  // Available formulas database
  const availableFormulas = getAllFormulas();

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

      if (formulaData) {
        let totalVolume = 0;
        let volumePerTime = 0;

        if (systemType === 'closed') {
          // Closed system: Rate * Duration
          let rate = parseFloat(formula.rate || '0');
          if (infusionMode === 'gravity' && formula.dropsPerMin) {
            // 1 ml = 20 drops -> rate (ml/h) = drops * 3
            rate = parseFloat(formula.dropsPerMin) * 3;
          }
          const duration = parseFloat(formula.duration || '0');
          totalVolume = rate * duration;
          volumePerTime = totalVolume; // Usually continuous or single bag logic
        } else {
          // Open system: Volume defined directly
          totalVolume = parseFloat(formula.volume || '0');
          if (formula.times.length > 0) {
            volumePerTime = totalVolume / formula.times.length;
          }
        }

        if (totalVolume > 0) {
          // Calculate nutrition using Density if available, otherwise caloriesPer100ml
          const density = formulaData.composition.density || (formulaData.composition.calories / 100);

          const calories = totalVolume * density;
          const protein = (totalVolume / 100) * formulaData.composition.protein;

          totalCal += calories;
          totalProt += protein;

          // Calculate bottles for each time
          const bottles = calculateBottles(volumePerTime);
          newBottleCalcs[formula.id] = bottles;
        }
      }
    });

    // Add Modules Nutrition
    modules.forEach(mod => {
      const qty = parseFloat(mod.quantity || '0');
      const totalQty = qty * (mod.times.length || 1);
      totalCal += totalQty * mod.caloriesPerUnit;
      totalProt += totalQty * mod.proteinPerUnit;
    });

    // Add TNO Nutrition
    tnoList.forEach(tno => {
      const formula = availableFormulas.find(f => f.name === tno.formulaName);
      if (formula) {
        const vol = parseFloat(tno.volume || '0');
        const density = formula.composition.density || (formula.composition.calories / 100);
        const totalVol = vol * (tno.times.length || 1);

        totalCal += totalVol * density;
        totalProt += (totalVol / 100) * formula.composition.protein;
      } else {
        // Check modules
        const module = availableModules.find(m => m.name === tno.formulaName);
        if (module) {
          const vol = parseFloat(tno.volume || '0');
          const totalVol = vol * (tno.times.length || 1);
          totalCal += totalVol * module.caloriesPerUnit;
          totalProt += totalVol * module.proteinPerUnit;
        }
      }
    });

    // Add Non-intentional Calories
    totalCal += parseFloat(nonIntentionalCalories || '0');

    setTotalNutrition({
      calories: Math.round(totalCal),
      protein: Math.round(totalProt * 10) / 10,
      caloriesPerKg: Math.round((totalCal / patient.weight) * 10) / 10,
      proteinPerKg: Math.round((totalProt / patient.weight) * 10) / 10,
    });

    setBottleCalculations(newBottleCalcs);
  }, [formulas, selectedFormulas, modules, tnoList, nonIntentionalCalories]);

  const addFormula = () => {
    const newId = (formulas.length + 1).toString();
    setFormulas([...formulas, { id: newId, volume: "", rate: "", dropsPerMin: "", duration: "", times: [], waterDilution: "", calories: 0, protein: 0 }]);
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

  const addModule = () => {
    if (modules.length < 3) {
      setModules([...modules, { id: Date.now().toString(), name: "", quantity: "", times: [], caloriesPerUnit: 0, proteinPerUnit: 0 }]);
    } else {
      toast.error("Máximo de 3 módulos permitidos");
    }
  };

  const removeModule = (id: string) => {
    setModules(modules.filter(m => m.id !== id));
  };

  const updateModule = (id: string, field: keyof Module, value: any) => {
    if (field === 'name') {
      const selected = availableModules.find(m => m.name === value);
      if (selected) {
        setModules(modules.map(m => m.id === id ? { ...m, name: value, caloriesPerUnit: selected.caloriesPerUnit, proteinPerUnit: selected.proteinPerUnit } : m));
        return;
      }
    }
    setModules(modules.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const toggleModuleTime = (moduleId: string, time: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module) {
      const times = module.times.includes(time)
        ? module.times.filter(t => t !== time)
        : [...module.times, time].sort();
      updateModule(moduleId, "times", times);
    }
  };

  const toggleHydrationTime = (time: string) => {
    const times = hydration.times.includes(time)
      ? hydration.times.filter(t => t !== time)
      : [...hydration.times, time].sort();
    setHydration({ ...hydration, times });
  };

  const addTno = () => {
    setTnoList([...tnoList, { id: Date.now().toString(), formulaName: "", volume: "", times: [], calories: 0, protein: 0 }]);
  };

  const removeTno = (id: string) => {
    setTnoList(tnoList.filter(t => t.id !== id));
  };

  const updateTno = (id: string, field: keyof TNO, value: any) => {
    setTnoList(tnoList.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const toggleTnoTime = (tnoId: string, time: string) => {
    const tno = tnoList.find(t => t.id === tnoId);
    if (tno) {
      const times = tno.times.includes(time)
        ? tno.times.filter(t => t !== time)
        : [...tno.times, time].sort();
      updateTno(tnoId, "times", times);
    }
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

  const handleSave = async () => {
    if (!therapyType) {
      toast.error("Selecione o tipo de terapia nutricional");
      return;
    }

    if (therapyType === "enteral" && !enteralRoute) {
      toast.error("Selecione a via de administração enteral");
      return;
    }

    if (therapyType === "enteral" && !infusionMode) {
      toast.error("Selecione o modo de infusão (Gravitacional/Bomba)");
      return;
    }

    if (therapyType === "enteral" && !systemType) {
      toast.error("Selecione o tipo de sistema (Aberto/Fechado)");
      return;
    }

    const hasValidFormula = formulas.some(f =>
      selectedFormulas[f.id] && (
        (systemType === 'closed' && f.duration && (f.rate || f.dropsPerMin)) ||
        (systemType === 'open' && f.volume && f.times.length > 0)
      )
    );

    if (therapyType === "enteral" && !hasValidFormula) {
      toast.error("Configure pelo menos uma fórmula com volume e horários/velocidade");
      return;
    }

    setIsSaving(true);
    try {
      const prescriptionData: PrescriptionData = {
        patient_name: patient.name,
        patient_record: patient.record,
        therapy_type: therapyType,
        feeding_routes: feedingRoutes,
        formulas: formulas.map(f => ({ ...f, formulaName: availableFormulas.find(af => af.id === selectedFormulas[f.id])?.name })),
        modules: modules,
        hydration: hydration,
        parenteral: parenteral,
        oral_diet: oralDiet,
        tno_list: tnoList,
        non_intentional_calories: parseFloat(nonIntentionalCalories || '0'),
        total_nutrition: totalNutrition
      };

      await savePrescription(prescriptionData);
      toast.success("Prescrição salva com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Erro ao salvar prescrição");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredFormulas = availableFormulas.filter(f =>
    systemType === "" || f.systemType === systemType
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
            <Dialog open={isLabelOpen} onOpenChange={setIsLabelOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  Gerar Etiqueta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Etiqueta de Nutrição Enteral</DialogTitle>
                </DialogHeader>
                {formulas.length > 0 && selectedFormulas[formulas[0].id] && (
                  <div className="flex justify-center">
                    <LabelPreview data={{
                      patientName: patient.name,
                      bed: "Leito 01",
                      dob: patient.dob,
                      formulaName: availableFormulas.find(f => f.id === selectedFormulas[formulas[0].id])?.name || "",
                      totalVolume: systemType === 'closed'
                        ? (parseFloat(formulas[0].rate || (parseFloat(formulas[0].dropsPerMin || '0') * 3).toString()) * parseFloat(formulas[0].duration || '0'))
                        : parseFloat(formulas[0].volume || '0'),
                      infusionRate: systemType === 'closed'
                        ? (infusionMode === 'pump' ? `${formulas[0].rate} ml/h` : `${formulas[0].dropsPerMin} gts/min`)
                        : `${(parseFloat(formulas[0].volume || '0') / (formulas[0].times.length || 1)).toFixed(0)} ml/horário`,
                      route: enteralRoute || "N/A",
                      manipulationDate: format(new Date(), "dd/MM/yyyy HH:mm"),
                      validity: systemType === 'open' ? format(new Date(Date.now() + 4 * 60 * 60 * 1000), "dd/MM HH:mm") : format(new Date(Date.now() + 24 * 60 * 60 * 1000), "dd/MM HH:mm"),
                      conservation: systemType === 'open' ? "Temp. Ambiente (4h)" : "Temp. Ambiente (24h)",
                      rtName: "Nutricionista Responsável",
                      rtCrn: "12345",
                      lot: "Lote 123",
                      systemType: systemType as 'open' | 'closed'
                    }} />
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Prescrição"}
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
                <div className="flex items-baseline gap-2">
                  <p className="font-medium text-lg">
                    {(patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1)} kg/m²
                  </p>
                  {(patient.weight / Math.pow(patient.height / 100, 2)) > 30 && (
                    <Badge variant="destructive">Obesidade (IMC &gt; 30)</Badge>
                  )}
                </div>
                {(patient.weight / Math.pow(patient.height / 100, 2)) > 30 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <p className="font-semibold text-yellow-800">Peso Ideal (PI): {(25 * Math.pow(patient.height / 100, 2)).toFixed(1)} kg</p>
                    <p className="text-xs text-yellow-700">Cálculos devem considerar PA e PI</p>
                  </div>
                )}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Button
                variant={therapyType === "parenteral" ? "default" : "outline"}
                className="h-20"
                onClick={() => setTherapyType("parenteral")}
              >
                <div className="flex flex-col items-center gap-2">
                  <Syringe className="h-6 w-6" />
                  <span>Via Parenteral</span>
                </div>
              </Button>
            </div>

            {/* Oral Therapy Options */}
            {therapyType === "oral" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Dieta Oral</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Consistência</Label>
                        <Select value={oralDiet.consistency} onValueChange={(v) => setOralDiet({ ...oralDiet, consistency: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a consistência" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="livre">Livre</SelectItem>
                            <SelectItem value="branda">Branda</SelectItem>
                            <SelectItem value="pastosa">Pastosa</SelectItem>
                            <SelectItem value="liquida-pastosa">Líquida-Pastosa</SelectItem>
                            <SelectItem value="liquida">Líquida</SelectItem>
                            <SelectItem value="zero">Zero</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Fracionamento</Label>
                        <Input
                          placeholder="Ex: 3/3h, 6 refeições"
                          value={oralDiet.frequency}
                          onChange={(e) => setOralDiet({ ...oralDiet, frequency: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Volume Aceito (%)</Label>
                        <Input
                          placeholder="Ex: 100%"
                          value={oralDiet.volume}
                          onChange={(e) => setOralDiet({ ...oralDiet, volume: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Observações</Label>
                        <Input
                          placeholder="Ex: Preferências, aversões"
                          value={oralDiet.observation}
                          onChange={(e) => setOralDiet({ ...oralDiet, observation: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Suplementação (TNO)</CardTitle>
                      <Button onClick={addTno} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Suplemento
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {tnoList.map((tno, index) => (
                      <div key={tno.id} className="p-4 border rounded-lg space-y-4 bg-card">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Suplemento {index + 1}</h3>
                          <Button variant="ghost" size="sm" onClick={() => removeTno(tno.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Produto (Fórmula ou Módulo)</Label>
                            <Select value={tno.formulaName} onValueChange={(v) => updateTno(tno.id, 'formulaName', v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o produto" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="header-formulas" disabled className="font-bold text-muted-foreground">--- Fórmulas ---</SelectItem>
                                {availableFormulas.map(f => (
                                  <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                                ))}
                                <SelectItem value="header-modules" disabled className="font-bold text-muted-foreground">--- Módulos ---</SelectItem>
                                {availableModules.map(m => (
                                  <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Volume por Horário (ml)</Label>
                            <Input
                              type="number"
                              placeholder="Ex: 200"
                              value={tno.volume}
                              onChange={(e) => updateTno(tno.id, 'volume', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Horários</Label>
                          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                            {timeOptions.map((time) => (
                              <Button
                                key={time}
                                variant={tno.times.includes(time) ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleTnoTime(tno.id, time)}
                                className="text-xs"
                              >
                                {time}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    {tnoList.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum suplemento adicionado.</p>}
                  </CardContent>
                </Card>
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
                      <SelectItem value="SOG">SOG - Sonda Orogástrica</SelectItem>
                      <SelectItem value="SNE">SNE - Sonda Nasoenteral / SNG - Nasogástrica</SelectItem>
                      <SelectItem value="SOE">SOE - Sonda Oroenteral</SelectItem>
                      <SelectItem value="GTT">GTT - Gastrostomia</SelectItem>
                      <SelectItem value="JST">JST - Jejunostomia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Infusion Mode Selection */}
                <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                  <Label className="font-semibold">Modo de Infusão *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <Button
                      variant={infusionMode === "gravity" ? "default" : "outline"}
                      onClick={() => setInfusionMode("gravity")}
                    >
                      Gravitacional (Gotas)
                    </Button>
                    <Button
                      variant={infusionMode === "pump" ? "default" : "outline"}
                      onClick={() => setInfusionMode("pump")}
                    >
                      Bomba de Infusão (ml/h)
                    </Button>
                  </div>
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
                            {f.name} ({f.composition.calories} kcal/100ml, {f.composition.protein}g prot/100ml)
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

                  {/* System Specific Inputs */}
                  {systemType === 'closed' ? (
                    <div className="grid grid-cols-2 gap-4">
                      {infusionMode === 'pump' ? (
                        <div className="space-y-2">
                          <Label>Velocidade (ml/h) *</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 60"
                            value={formula.rate}
                            onChange={(e) => updateFormula(formula.id, "rate", e.target.value)}
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Velocidade (gotas/min) *</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 20"
                            value={formula.dropsPerMin}
                            onChange={(e) => updateFormula(formula.id, "dropsPerMin", e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Equiv: {parseFloat(formula.dropsPerMin || '0') * 3} ml/h
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Tempo de Infusão (h) *</Label>
                        <Input
                          type="number"
                          placeholder="Ex: 22"
                          value={formula.duration}
                          onChange={(e) => updateFormula(formula.id, "duration", e.target.value)}
                        />
                      </div>

                      <div className="col-span-2 text-sm text-muted-foreground p-2 bg-muted rounded">
                        Volume Total Estimado: {
                          infusionMode === 'pump'
                            ? parseFloat(formula.rate || '0') * parseFloat(formula.duration || '0')
                            : (parseFloat(formula.dropsPerMin || '0') * 3) * parseFloat(formula.duration || '0')
                        } ml
                      </div>

                      <div className="col-span-2 space-y-2">
                        <Label>Horários de Envio das Bolsas</Label>
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                          {timeOptions.filter((_, i) => i % 3 === 0).map((time) => (
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
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Volume por Horário (ml) *</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 300"
                            value={formula.volume}
                            onChange={(e) => updateFormula(formula.id, "volume", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tempo de Infusão da Etapa (h)</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 1"
                            value={formula.duration}
                            onChange={(e) => updateFormula(formula.id, "duration", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Horários de Infusão *</Label>
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
                      </div>
                    </>
                  )}

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

        {/* Parenteral Configuration */}
        {therapyType === "parenteral" && (
          <Card>
            <CardHeader>
              <CardTitle>Configuração Parenteral</CardTitle>
              <CardDescription>Defina os parâmetros da nutrição parenteral</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>VET (Kcal/dia)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 2000"
                    value={parenteral.vet}
                    onChange={(e) => setParenteral({ ...parenteral, vet: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Aminoácidos (g/kg/dia)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 1.5"
                    value={parenteral.aminoAcids}
                    onChange={(e) => setParenteral({ ...parenteral, aminoAcids: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Glicose (g/kg/dia)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 3.0"
                    value={parenteral.glucose}
                    onChange={(e) => setParenteral({ ...parenteral, glucose: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lipídios (g/kg/dia)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 1.0"
                    value={parenteral.lipids}
                    onChange={(e) => setParenteral({ ...parenteral, lipids: e.target.value })}
                  />
                </div>
              </div>

              {/* Parenteral Calculations Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-muted-foreground">TIG (Taxa de Infusão de Glicose)</Label>
                  <p className="text-lg font-semibold">
                    {parenteral.glucose && patient.weight
                      ? `${((parseFloat(parenteral.glucose) * 1000) / (24 * 60)).toFixed(2)} mg/kg/min`
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Relação Cal. Não Proteicas / gN</Label>
                  <p className="text-lg font-semibold">
                    {parenteral.aminoAcids && parenteral.glucose && parenteral.lipids && patient.weight
                      ? (() => {
                        const aa = parseFloat(parenteral.aminoAcids) * patient.weight;
                        const gluc = parseFloat(parenteral.glucose) * patient.weight;
                        const lip = parseFloat(parenteral.lipids) * patient.weight;
                        const npc = (gluc * 3.4) + (lip * 9);
                        const n = aa / 6.25;
                        return n > 0 ? `${(npc / n).toFixed(1)} : 1` : "-";
                      })()
                      : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modules Section */}
        {therapyType === "enteral" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Módulos (Opcional)</CardTitle>
                  <CardDescription>Adicione módulos de proteína, fibras, etc.</CardDescription>
                </div>
                <Button onClick={addModule} variant="outline" disabled={modules.length >= 3}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Módulo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {modules.map((module, index) => (
                <div key={module.id} className="p-4 border rounded-lg space-y-4 bg-card">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Módulo {index + 1}</h3>
                    <Button variant="ghost" size="sm" onClick={() => removeModule(module.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Módulo</Label>
                      <Select value={module.name} onValueChange={(value) => updateModule(module.id, "name", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o módulo" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModules.map(m => (
                            <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantidade (g/ml)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 10"
                        value={module.quantity}
                        onChange={(e) => updateModule(module.id, "quantity", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Horários</Label>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                      {timeOptions.map((time) => (
                        <Button
                          key={time}
                          variant={module.times.includes(time) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleModuleTime(module.id, time)}
                          className="text-xs"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {modules.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum módulo adicionado.</p>}
            </CardContent>
          </Card>
        )}

        {/* Non-intentional Calories */}
        <Card>
          <CardHeader>
            <CardTitle>Outros Aportes Calóricos</CardTitle>
            <CardDescription>Calorias não intencionais (Propofol, Citrato, etc.)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Calorias (Kcal)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 150"
                  value={nonIntentionalCalories}
                  onChange={(e) => setNonIntentionalCalories(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hydration Section */}
        {therapyType === "enteral" && (
          <Card>
            <CardHeader>
              <CardTitle>5. Hidratação</CardTitle>
              <CardDescription>Configure a hidratação do paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Volume por Horário (ml)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 200"
                    value={hydration.volume}
                    onChange={(e) => setHydration({ ...hydration, volume: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modo de Infusão</Label>
                  <Select value={hydration.mode} onValueChange={(v: any) => setHydration({ ...hydration, mode: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bolus">Bolus (Seringa)</SelectItem>
                      <SelectItem value="gravity">Gravitacional</SelectItem>
                      <SelectItem value="pump">Bomba de Infusão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Horários de Hidratação</Label>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                  {timeOptions.map((time) => (
                    <Button
                      key={time}
                      variant={hydration.times.includes(time) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleHydrationTime(time)}
                      className="text-xs"
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
