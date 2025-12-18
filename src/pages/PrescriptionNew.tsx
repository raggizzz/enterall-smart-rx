import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Check, ChevronDown, ChevronRight, Droplet, Plus, Trash2, Utensils, Syringe, Calculator, Save } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { getAllFormulas, getAllModules } from "@/lib/formulasDatabase";

interface Patient {
  id: string;
  name: string;
  weight: number;
  height: number;
  record: string;
  dob: string;
  bed: string;
  ward: string;
}

interface FormulaEntry {
  id: string;
  formulaId: string;
  volume: string;
  diluteTo: string;
  times: string[];
}

interface ModuleEntry {
  id: string;
  moduleId: string;
  quantity: string;
  unit: "ml" | "g";
  times: string[];
}

interface HydrationEntry {
  volume: string;
  times: string[];
}

const SCHEDULE_TIMES = ["03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00"];

const mockPatients: Patient[] = [
  { id: "1", name: "Antonio Pereira", weight: 75, height: 172, record: "2024001", dob: "10/01/1978", bed: "Leito 01", ward: "UTI-ADULTO" },
  { id: "2", name: "Alicia Gomes", weight: 62, height: 165, record: "2024002", dob: "06/11/1981", bed: "Leito 02", ward: "UTI-ADULTO" },
  { id: "3", name: "Renata Fortes", weight: 68, height: 160, record: "2024003", dob: "10/05/1980", bed: "Leito 03", ward: "UTI-ADULTO" },
];

const PrescriptionNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient");

  const availableFormulas = getAllFormulas();
  const availableModules = getAllModules();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1: Patient
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Step 2: Feeding Routes
  const [feedingRoutes, setFeedingRoutes] = useState({ oral: false, enteral: false, parenteral: false });

  // Step 3: Enteral Access
  const [enteralAccess, setEnteralAccess] = useState<string>("");

  // Step 4: System Type
  const [systemType, setSystemType] = useState<"open" | "closed" | "">("");

  // Closed System
  const [closedFormula, setClosedFormula] = useState({
    formulaId: "",
    infusionMode: "" as "pump" | "gravity" | "",
    rate: "",
    duration: "",
    bagQuantities: {} as Record<string, number> // Quantidade de bolsas por horário
  });

  // Open System
  const [openInfusionMode, setOpenInfusionMode] = useState<"pump" | "gravity" | "bolus" | "">("");
  const [openDurationPerStep, setOpenDurationPerStep] = useState("");
  const [openFormulas, setOpenFormulas] = useState<FormulaEntry[]>([{ id: "1", formulaId: "", volume: "", diluteTo: "", times: [] }]);

  // Modules
  const [modules, setModules] = useState<ModuleEntry[]>([]);

  // Hydration
  const [hydration, setHydration] = useState<HydrationEntry>({ volume: "", times: [] });

  // Summary expanded
  const [showDetails, setShowDetails] = useState(false);

  // Load patient from URL
  useEffect(() => {
    if (patientId) {
      const patient = mockPatients.find(p => p.id === patientId);
      if (patient) {
        setSelectedPatient(patient);
        setCompletedSteps([1]);
        setCurrentStep(2);
      }
    }
  }, [patientId]);

  const completeStep = (step: number) => {
    if (!completedSteps.includes(step)) setCompletedSteps([...completedSteps, step]);

    // Determina próximo passo
    let nextStep = step + 1;
    if (step === 2) {
      nextStep = feedingRoutes.enteral ? 3 : 8;
    } else if (step === 4) {
      nextStep = 5;
    } else if (step === 5) {
      nextStep = 6;
    } else if (step === 6) {
      nextStep = 7;
    } else if (step === 7) {
      nextStep = 8;
    }

    setCurrentStep(nextStep);
  };

  const canProceed = (step: number): boolean => {
    switch (step) {
      case 1: return !!selectedPatient;
      case 2: return feedingRoutes.oral || feedingRoutes.enteral || feedingRoutes.parenteral;
      case 3: return !!enteralAccess;
      case 4: return !!systemType;
      default: return true;
    }
  };

  // Nutrition calculations
  const nutritionSummary = useMemo(() => {
    let totalCalories = 0, totalProtein = 0, totalFreeWater = 0;

    if (systemType === "closed" && closedFormula.formulaId) {
      const formula = availableFormulas.find(f => f.id === closedFormula.formulaId);
      if (formula) {
        const rate = parseFloat(closedFormula.rate) || 0;
        const duration = parseFloat(closedFormula.duration) || 0;
        let totalVolume = closedFormula.infusionMode === "pump" ? rate * duration : (rate / 20) * 60 * duration;
        const density = formula.composition.density || formula.composition.calories / 100;
        totalCalories = totalVolume * density;
        totalProtein = (totalVolume / 100) * formula.composition.protein;
        totalFreeWater = (totalVolume * (formula.composition.waterContent || 80)) / 100;
      }
    }

    if (systemType === "open") {
      openFormulas.forEach(entry => {
        const formula = availableFormulas.find(f => f.id === entry.formulaId);
        if (formula && entry.volume && entry.times.length > 0) {
          const totalVolume = parseFloat(entry.volume) * entry.times.length;
          const density = formula.composition.density || formula.composition.calories / 100;
          totalCalories += totalVolume * density;
          totalProtein += (totalVolume / 100) * formula.composition.protein;
          totalFreeWater += (totalVolume * (formula.composition.waterContent || 80)) / 100;
        }
      });
    }

    modules.forEach(mod => {
      const module = availableModules.find(m => m.id === mod.moduleId);
      if (module && mod.quantity && mod.times.length > 0) {
        const totalQty = parseFloat(mod.quantity) * mod.times.length;
        totalCalories += totalQty * module.density;
        totalProtein += totalQty * (module.protein / module.referenceAmount);
      }
    });

    if (hydration.volume && hydration.times.length > 0) {
      totalFreeWater += parseFloat(hydration.volume) * hydration.times.length;
    }

    const weight = selectedPatient?.weight || 70;
    return {
      vet: Math.round(totalCalories),
      vetPerKg: Math.round((totalCalories / weight) * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      proteinPerKg: Math.round((totalProtein / weight) * 10) / 10,
      freeWater: Math.round(totalFreeWater),
      freeWaterPerKg: Math.round((totalFreeWater / weight) * 10) / 10,
    };
  }, [systemType, closedFormula, openFormulas, modules, hydration, selectedPatient, availableFormulas, availableModules]);

  // Bag calculation (closed system)
  const bagCalculation = useMemo(() => {
    if (systemType !== "closed" || !closedFormula.formulaId) return null;
    const rate = parseFloat(closedFormula.rate) || 0;
    const duration = parseFloat(closedFormula.duration) || 0;
    let totalVolume = closedFormula.infusionMode === "pump" ? rate * duration : (rate / 20) * 60 * duration;
    const formula = availableFormulas.find(f => f.id === closedFormula.formulaId);
    const bagSize = formula?.presentations[0] || 1000;
    return { totalVolume: Math.round(totalVolume), bagSize, numBags: Math.ceil(totalVolume / bagSize) };
  }, [closedFormula, systemType, availableFormulas]);

  // Handlers
  const addOpenFormula = () => setOpenFormulas([...openFormulas, { id: Date.now().toString(), formulaId: "", volume: "", diluteTo: "", times: [] }]);
  const removeOpenFormula = (id: string) => { if (openFormulas.length > 1) setOpenFormulas(openFormulas.filter(f => f.id !== id)); };
  const updateOpenFormula = (id: string, field: keyof FormulaEntry, value: any) => setOpenFormulas(openFormulas.map(f => f.id === id ? { ...f, [field]: value } : f));
  const toggleFormulaTime = (formulaId: string, time: string) => {
    const f = openFormulas.find(f => f.id === formulaId);
    if (f) updateOpenFormula(formulaId, "times", f.times.includes(time) ? f.times.filter(t => t !== time) : [...f.times, time].sort());
  };

  const addModule = () => { if (modules.length < 3) setModules([...modules, { id: Date.now().toString(), moduleId: "", quantity: "", unit: "g", times: [] }]); else toast.error("Máximo de 3 módulos"); };
  const removeModule = (id: string) => setModules(modules.filter(m => m.id !== id));
  const updateModule = (id: string, field: keyof ModuleEntry, value: any) => setModules(modules.map(m => m.id === id ? { ...m, [field]: value } : m));
  const toggleModuleTime = (moduleId: string, time: string) => {
    const m = modules.find(m => m.id === moduleId);
    if (m) updateModule(moduleId, "times", m.times.includes(time) ? m.times.filter(t => t !== time) : [...m.times, time].sort());
  };

  const toggleHydrationTime = (time: string) => setHydration({ ...hydration, times: hydration.times.includes(time) ? hydration.times.filter(t => t !== time) : [...hydration.times, time].sort() });
  const updateBagQuantity = (time: string, quantity: number) => {
    const newQuantities = { ...closedFormula.bagQuantities };
    if (quantity > 0) {
      newQuantities[time] = quantity;
    } else {
      delete newQuantities[time];
    }
    setClosedFormula({ ...closedFormula, bagQuantities: newQuantities });
  };

  const handleSave = () => { toast.success("Prescrição salva com sucesso!"); navigate("/dashboard"); };

  const StepIndicator = ({ step, title, isActive, isCompleted }: { step: number; title: string; isActive: boolean; isCompleted: boolean }) => (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${isActive ? "bg-primary/10 border-2 border-primary" : isCompleted ? "bg-green-50 border border-green-200" : "bg-muted/50"}`} onClick={() => isCompleted && setCurrentStep(step)}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isActive ? "bg-primary text-white" : isCompleted ? "bg-green-500 text-white" : "bg-muted-foreground/20"}`}>
        {isCompleted ? <Check className="h-4 w-4" /> : step}
      </div>
      <span className={`font-medium ${isActive ? "text-primary" : isCompleted ? "text-green-700" : "text-muted-foreground"}`}>{title}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-3xl font-bold">Prescrição de Dietas</h1>
            <p className="text-muted-foreground">Prescrição nutricional passo a passo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Steps */}
          <div className="space-y-2">
            <StepIndicator step={1} title="Selecionar Paciente" isActive={currentStep === 1} isCompleted={completedSteps.includes(1)} />
            <StepIndicator step={2} title="Via de Alimentação" isActive={currentStep === 2} isCompleted={completedSteps.includes(2)} />
            {(feedingRoutes.enteral || currentStep >= 3) && <StepIndicator step={3} title="Acesso Enteral" isActive={currentStep === 3} isCompleted={completedSteps.includes(3)} />}
            {(feedingRoutes.enteral || currentStep >= 4) && <StepIndicator step={4} title="Tipo de Sistema" isActive={currentStep === 4} isCompleted={completedSteps.includes(4)} />}
            {((feedingRoutes.enteral && systemType) || currentStep >= 5) && <StepIndicator step={5} title="Configurar Dieta" isActive={currentStep === 5} isCompleted={completedSteps.includes(5)} />}
            {((feedingRoutes.enteral && systemType) || currentStep >= 6) && <StepIndicator step={6} title="Módulos (Opcional)" isActive={currentStep === 6} isCompleted={completedSteps.includes(6)} />}
            {((feedingRoutes.enteral && systemType) || currentStep >= 7) && <StepIndicator step={7} title="Hidratação" isActive={currentStep === 7} isCompleted={completedSteps.includes(7)} />}
            <StepIndicator step={8} title="Resumo" isActive={currentStep === 8} isCompleted={completedSteps.includes(8)} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Step 1 */}
            {currentStep === 1 && (
              <Card>
                <CardHeader><CardTitle>1. Selecionar Paciente</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mockPatients.map(p => (
                      <Card key={p.id} className={`cursor-pointer hover:shadow-md ${selectedPatient?.id === p.id ? "ring-2 ring-primary bg-primary/5" : ""}`} onClick={() => setSelectedPatient(p)}>
                        <CardContent className="p-4">
                          <div className="flex justify-between"><div><p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">{p.record} - {p.bed}</p></div>{selectedPatient?.id === p.id && <Check className="h-5 w-5 text-primary" />}</div>
                          <Separator className="my-2" />
                          <div className="grid grid-cols-2 gap-2 text-sm"><div>Peso: {p.weight}kg</div><div>Altura: {p.height}cm</div></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="flex justify-end"><Button onClick={() => completeStep(1)} disabled={!canProceed(1)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 2 */}
            {currentStep === 2 && (
              <Card>
                <CardHeader><CardTitle>2. Via de Alimentação</CardTitle><CardDescription>Selecione: Oral e/ou Enteral e/ou Parenteral</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[{ key: "oral", icon: Utensils, label: "Oral", color: "green" }, { key: "enteral", icon: Droplet, label: "Enteral", color: "purple" }, { key: "parenteral", icon: Syringe, label: "Parenteral", color: "orange" }].map(r => (
                      <div key={r.key} className={`p-6 border-2 rounded-lg cursor-pointer ${feedingRoutes[r.key as keyof typeof feedingRoutes] ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setFeedingRoutes({ ...feedingRoutes, [r.key]: !feedingRoutes[r.key as keyof typeof feedingRoutes] })}>
                        <div className="flex items-center gap-3"><Checkbox checked={feedingRoutes[r.key as keyof typeof feedingRoutes]} /><r.icon className={`h-8 w-8 text-${r.color}-600`} /><span className="font-semibold text-lg">{r.label}</span></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>Voltar</Button>
                    <Button onClick={() => {
                      if (!completedSteps.includes(2)) setCompletedSteps([...completedSteps, 2]);
                      if (feedingRoutes.enteral) {
                        setCurrentStep(3);
                      } else {
                        // Oral ou Parenteral sem Enteral - por enquanto vai pro resumo
                        toast.info("Fluxo detalhado para Oral/Parenteral em desenvolvimento. Avançando para resumo.");
                        setCurrentStep(8);
                      }
                    }} disabled={!canProceed(2)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3 - Enteral Access */}
            {currentStep === 3 && (
              <Card>
                <CardHeader><CardTitle>3. Acesso Enteral</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[{ v: "SNE", l: "Sonda Nasoenteral (SNE)" }, { v: "SNG", l: "Sonda Nasogástrica (SNG)" }, { v: "SOG", l: "Sonda Orogástrica (SOG)" }, { v: "GTT", l: "Gastrostomia (GTT)" }, { v: "JTT", l: "Jejunostomia (JTT)" }].map(a => (
                      <div key={a.v} className={`p-4 border-2 rounded-lg cursor-pointer ${enteralAccess === a.v ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setEnteralAccess(a.v)}>
                        <div className="flex items-center gap-3"><div className={`w-4 h-4 rounded-full border-2 ${enteralAccess === a.v ? "border-primary bg-primary" : "border-muted-foreground"}`} /><span className="font-medium">{a.l}</span></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(2)}>Voltar</Button><Button onClick={() => completeStep(3)} disabled={!canProceed(3)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 4 - System Type */}
            {currentStep === 4 && (
              <Card>
                <CardHeader><CardTitle>4. Tipo de Sistema</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 border-2 rounded-lg cursor-pointer ${systemType === "closed" ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setSystemType("closed")}>
                      <div className="flex items-center gap-3 mb-3"><div className={`w-5 h-5 rounded-full border-2 ${systemType === "closed" ? "border-primary bg-primary" : "border-muted-foreground"}`} /><span className="font-semibold text-lg">Sistema Fechado</span></div>
                      <p className="text-sm text-muted-foreground">Apenas um tipo de fórmula. Infusão contínua.</p>
                    </div>
                    <div className={`p-6 border-2 rounded-lg cursor-pointer ${systemType === "open" ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setSystemType("open")}>
                      <div className="flex items-center gap-3 mb-3"><div className={`w-5 h-5 rounded-full border-2 ${systemType === "open" ? "border-primary bg-primary" : "border-muted-foreground"}`} /><span className="font-semibold text-lg">Sistema Aberto</span></div>
                      <p className="text-sm text-muted-foreground">Múltiplas fórmulas. Pode intercalar.</p>
                    </div>
                  </div>
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(3)}>Voltar</Button><Button onClick={() => completeStep(4)} disabled={!canProceed(4)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 5 - Closed System */}
            {currentStep === 5 && systemType === "closed" && (
              <Card>
                <CardHeader><CardTitle>5. Sistema Fechado</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2"><Label>Fórmula *</Label><Select value={closedFormula.formulaId} onValueChange={v => setClosedFormula({ ...closedFormula, formulaId: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{availableFormulas.filter(f => f.systemType === "closed" || f.systemType === "both").map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.composition.density} kcal/ml)</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Modo de Infusão *</Label><div className="grid grid-cols-2 gap-4">{[{ v: "pump", l: "Bomba de Infusão", d: "ml/h" }, { v: "gravity", l: "Gravitacional", d: "gotas/min (1ml=20gotas)" }].map(m => <div key={m.v} className={`p-4 border-2 rounded-lg cursor-pointer ${closedFormula.infusionMode === m.v ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setClosedFormula({ ...closedFormula, infusionMode: m.v as any })}><span className="font-medium">{m.l}</span><p className="text-xs text-muted-foreground">{m.d}</p></div>)}</div></div>
                  {closedFormula.infusionMode && <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Velocidade *</Label><div className="flex items-center gap-2"><Input type="number" value={closedFormula.rate} onChange={e => setClosedFormula({ ...closedFormula, rate: e.target.value })} /><span className="text-sm whitespace-nowrap">{closedFormula.infusionMode === "pump" ? "ml/h" : "gotas/min"}</span></div></div><div className="space-y-2"><Label>Tempo de Infusão *</Label><div className="flex items-center gap-2"><Input type="number" value={closedFormula.duration} onChange={e => setClosedFormula({ ...closedFormula, duration: e.target.value })} /><span className="text-sm">horas/dia</span></div></div></div>}
                  {bagCalculation && <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg"><p className="font-semibold text-blue-800">Volume prescrito para 24h: {bagCalculation.totalVolume} ml</p><p className="text-blue-700">A fórmula possui {bagCalculation.bagSize} ml por bolsa</p><p className="font-medium text-blue-800">Enviar: {bagCalculation.numBags} bolsa(s)</p></div>}
                  {bagCalculation && <div className="space-y-3">
                    <Label>Horários de Envio das Bolsas</Label>
                    <p className="text-xs text-muted-foreground">Preencher com o número de bolsas a ser entregue em cada horário</p>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                      {SCHEDULE_TIMES.map(t => (
                        <div key={t} className="space-y-1">
                          <Label className="text-xs text-center block">{t}</Label>
                          <Input
                            type="number"
                            min="0"
                            className="text-center h-10"
                            value={closedFormula.bagQuantities[t] || ""}
                            onChange={e => updateBagQuantity(t, parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total de bolsas selecionadas: {Object.values(closedFormula.bagQuantities).reduce((sum, val) => sum + val, 0)} / {bagCalculation.numBags} necessárias
                    </p>
                  </div>}
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(4)}>Voltar</Button><Button onClick={() => completeStep(5)} disabled={!closedFormula.formulaId || !closedFormula.infusionMode || !closedFormula.rate || !closedFormula.duration}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 5 - Open System */}
            {currentStep === 5 && systemType === "open" && (
              <Card>
                <CardHeader><CardTitle>5. Sistema Aberto</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2"><Label>Modo de Infusão *</Label><div className="grid grid-cols-3 gap-4">{[{ v: "pump", l: "Bomba", d: "ml/h" }, { v: "gravity", l: "Gravitacional", d: "gotas/min" }, { v: "bolus", l: "Bolus", d: "Tudo de uma vez" }].map(m => <div key={m.v} className={`p-4 border-2 rounded-lg cursor-pointer ${openInfusionMode === m.v ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setOpenInfusionMode(m.v as any)}><span className="font-medium">{m.l}</span><p className="text-xs text-muted-foreground">{m.d}</p></div>)}</div></div>
                  {(openInfusionMode === "pump" || openInfusionMode === "gravity") && <div className="space-y-2"><Label>Infundir cada etapa em:</Label><div className="flex items-center gap-2 max-w-xs"><Input type="number" value={openDurationPerStep} onChange={e => setOpenDurationPerStep(e.target.value)} /><span className="text-sm">horas</span></div></div>}
                  <div className="space-y-4"><div className="flex justify-between items-center"><Label className="text-lg">Fórmulas</Label><Button variant="outline" size="sm" onClick={addOpenFormula}><Plus className="h-4 w-4 mr-1" />Adicionar</Button></div>
                    {openFormulas.map((f, i) => (
                      <div key={f.id} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                        <div className="flex justify-between"><h4 className="font-semibold">Fórmula {i + 1}</h4>{openFormulas.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeOpenFormula(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2"><Label>Fórmula</Label><Select value={f.formulaId} onValueChange={v => updateOpenFormula(f.id, "formulaId", v)}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{availableFormulas.filter(af => af.systemType === "open" || af.systemType === "both").map(af => <SelectItem key={af.id} value={af.id}>{af.name}</SelectItem>)}</SelectContent></Select></div>
                          <div className="space-y-2"><Label>Quantidade por etapa (ml ou g)</Label><Input type="number" value={f.volume} onChange={e => updateOpenFormula(f.id, "volume", e.target.value)} /></div>
                          <div className="space-y-2"><Label>Diluir ATÉ (ml)</Label><Input type="number" value={f.diluteTo} onChange={e => updateOpenFormula(f.id, "diluteTo", e.target.value)} /></div>
                        </div>
                        <div className="space-y-2"><Label>Horários</Label><div className="flex flex-wrap gap-2">{SCHEDULE_TIMES.map(t => <Button key={t} variant={f.times.includes(t) ? "default" : "outline"} size="sm" onClick={() => toggleFormulaTime(f.id, t)}>{t}</Button>)}</div></div>
                        {f.formulaId && f.volume && f.times.length > 0 && <div className="text-sm text-muted-foreground bg-muted p-2 rounded">Subtotal: {(() => { const af = availableFormulas.find(x => x.id === f.formulaId); if (!af) return ""; const vol = parseFloat(f.volume) * f.times.length; return `${Math.round(vol * (af.composition.density || af.composition.calories / 100))} kcal, ${Math.round((vol / 100) * af.composition.protein * 10) / 10}g PTN`; })()}</div>}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(4)}>Voltar</Button><Button onClick={() => completeStep(5)} disabled={!openInfusionMode || openFormulas.every(f => !f.formulaId)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 6 - Modules */}
            {currentStep === 6 && (
              <Card>
                <CardHeader><CardTitle>6. Módulos para Nutrição Enteral (Opcional)</CardTitle><CardDescription>Programar a adição de módulos na água ou à parte (máx. 3)</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                  <Button variant="outline" onClick={addModule} disabled={modules.length >= 3}><Plus className="h-4 w-4 mr-2" />Adicionar Módulo</Button>
                  {modules.map((m, i) => (
                    <div key={m.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex justify-between"><h4 className="font-semibold">Módulo {i + 1}</h4><Button variant="ghost" size="sm" onClick={() => removeModule(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Módulo</Label><Select value={m.moduleId} onValueChange={v => updateModule(m.id, "moduleId", v)}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{availableModules.map(am => <SelectItem key={am.id} value={am.id}>{am.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Quantidade</Label><Input type="number" value={m.quantity} onChange={e => updateModule(m.id, "quantity", e.target.value)} /></div>
                        <div className="space-y-2"><Label>Unidade</Label><Select value={m.unit} onValueChange={v => updateModule(m.id, "unit", v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="g">g</SelectItem><SelectItem value="ml">ml</SelectItem></SelectContent></Select></div>
                      </div>
                      <div className="space-y-2"><Label>Horários</Label><div className="flex flex-wrap gap-2">{SCHEDULE_TIMES.map(t => <Button key={t} variant={m.times.includes(t) ? "default" : "outline"} size="sm" onClick={() => toggleModuleTime(m.id, t)}>{t}</Button>)}</div></div>
                      {m.moduleId && m.quantity && m.times.length > 0 && <p className="text-sm text-muted-foreground">Total: {parseFloat(m.quantity) * m.times.length} {m.unit}/dia</p>}
                    </div>
                  ))}
                  {modules.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum módulo adicionado</p>}
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(5)}>Voltar</Button><Button onClick={() => completeStep(6)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 7 - Hydration */}
            {currentStep === 7 && (
              <Card>
                <CardHeader><CardTitle>7. Água/Hidratação</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2"><Label>Volume por horário (ml)</Label><Input type="number" value={hydration.volume} onChange={e => setHydration({ ...hydration, volume: e.target.value })} className="max-w-xs" /></div>
                  <div className="space-y-2"><Label>Horários</Label><div className="flex flex-wrap gap-2">{SCHEDULE_TIMES.map(t => <Button key={t} variant={hydration.times.includes(t) ? "default" : "outline"} size="sm" onClick={() => toggleHydrationTime(t)}>{t}</Button>)}</div></div>
                  {hydration.volume && hydration.times.length > 0 && <p className="text-sm text-muted-foreground">Total: {parseFloat(hydration.volume) * hydration.times.length} ml/dia</p>}
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(6)}>Voltar</Button><Button onClick={() => completeStep(7)}>Ir para Resumo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 8 - Summary */}
            {currentStep === 8 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-6 w-6 text-primary" />Resumo da Prescrição Nutricional</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {selectedPatient && <div className="p-4 bg-muted rounded-lg"><p className="font-semibold">{selectedPatient.name}</p><p className="text-sm text-muted-foreground">{selectedPatient.bed} - Peso: {selectedPatient.weight}kg</p></div>}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-primary/10 rounded-lg text-center"><p className="text-2xl font-bold text-primary">{nutritionSummary.vet}</p><p className="text-sm text-muted-foreground">({nutritionSummary.vetPerKg} kcal/kg)</p><p className="text-xs font-medium mt-1">VET</p></div>
                    <div className="p-4 bg-blue-100 rounded-lg text-center"><p className="text-2xl font-bold text-blue-700">{nutritionSummary.protein}g</p><p className="text-sm text-muted-foreground">({nutritionSummary.proteinPerKg} g/kg)</p><p className="text-xs font-medium mt-1">Proteínas</p></div>
                    <div className="p-4 bg-cyan-100 rounded-lg text-center"><p className="text-2xl font-bold text-cyan-700">{nutritionSummary.freeWater}ml</p><p className="text-sm text-muted-foreground">({nutritionSummary.freeWaterPerKg} ml/kg)</p><p className="text-xs font-medium mt-1">Água Livre</p></div>
                    <div className="p-4 bg-green-100 rounded-lg text-center"><p className="text-2xl font-bold text-green-700">0g</p><p className="text-xs font-medium mt-1">Resíduos Recicláveis</p></div>
                  </div>
                  <Collapsible open={showDetails} onOpenChange={setShowDetails}><CollapsibleTrigger asChild><Button variant="outline" className="w-full"><ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showDetails ? "rotate-180" : ""}`} />{showDetails ? "Ocultar Detalhes" : "Mais Detalhes"}</Button></CollapsibleTrigger><CollapsibleContent className="mt-4 p-4 border rounded-lg space-y-2"><p><strong>Via:</strong> {feedingRoutes.enteral && `Enteral (${enteralAccess})`} {feedingRoutes.oral && "Oral"} {feedingRoutes.parenteral && "Parenteral"}</p><p><strong>Sistema:</strong> {systemType === "closed" ? "Fechado" : systemType === "open" ? "Aberto" : "-"}</p>{systemType === "closed" && closedFormula.formulaId && <><p><strong>Fórmula:</strong> {availableFormulas.find(f => f.id === closedFormula.formulaId)?.name}</p><p><strong>Infusão:</strong> {closedFormula.rate} {closedFormula.infusionMode === "pump" ? "ml/h" : "gotas/min"} por {closedFormula.duration}h</p></>}{modules.length > 0 && <p><strong>Módulos:</strong> {modules.map(m => availableModules.find(am => am.id === m.moduleId)?.name).join(", ")}</p>}</CollapsibleContent></Collapsible>
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(feedingRoutes.enteral ? 7 : 2)}>Voltar</Button><Button onClick={handleSave} className="bg-green-600 hover:bg-green-700"><Save className="h-4 w-4 mr-2" />Salvar Prescrição</Button></div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default PrescriptionNew;
