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
import { ArrowLeft, Check, ChevronDown, ChevronRight, Droplet, Plus, Trash2, Utensils, Syringe, Calculator } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { getAllFormulas, getAllModules } from "@/lib/formulasDatabase";

// Tipos
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

// Horários disponíveis
const SCHEDULE_TIMES = ["03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00"];

// Mock patients
const mockPatients: Patient[] = [
    { id: "1", name: "Antonio Pereira", weight: 75, height: 172, record: "2024001", dob: "10/01/1978", bed: "Leito 01", ward: "UTI-ADULTO" },
    { id: "2", name: "Alicia Gomes", weight: 62, height: 165, record: "2024002", dob: "06/11/1981", bed: "Leito 02", ward: "UTI-ADULTO" },
    { id: "3", name: "Renata Fortes", weight: 68, height: 160, record: "2024003", dob: "10/05/1980", bed: "Leito 03", ward: "UTI-ADULTO" },
];

const DietPrescription = () => {
    const navigate = useNavigate();
    const availableFormulas = getAllFormulas();
    const availableModules = getAllModules();

    // Estado do Wizard
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    // Passo 1: Paciente
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    // Passo 2: Via de Alimentação
    const [feedingRoutes, setFeedingRoutes] = useState({ oral: false, enteral: false, parenteral: false });

    // Passo 3: Acesso Enteral
    const [enteralAccess, setEnteralAccess] = useState<string>("");

    // Passo 4: Tipo de Sistema
    const [systemType, setSystemType] = useState<"open" | "closed" | "">("");

    // Sistema Fechado
    const [closedFormula, setClosedFormula] = useState({ formulaId: "", infusionMode: "" as "pump" | "gravity" | "", rate: "", duration: "", bagVolume: "", bagTimes: [] as string[] });

    // Sistema Aberto
    const [openInfusionMode, setOpenInfusionMode] = useState<"pump" | "gravity" | "bolus" | "">("");
    const [openDurationPerStep, setOpenDurationPerStep] = useState("");
    const [openFormulas, setOpenFormulas] = useState<FormulaEntry[]>([{ id: "1", formulaId: "", volume: "", diluteTo: "", times: [] }]);

    // Módulos
    const [modules, setModules] = useState<ModuleEntry[]>([]);

    // Hidratação
    const [hydration, setHydration] = useState<HydrationEntry>({ volume: "", times: [] });

    // Resumo expandido
    const [showDetails, setShowDetails] = useState(false);

    // Funções de navegação
    const completeStep = (step: number) => {
        if (!completedSteps.includes(step)) {
            setCompletedSteps([...completedSteps, step]);
        }
        setCurrentStep(step + 1);
    };

    const canProceed = (step: number): boolean => {
        switch (step) {
            case 1: return !!selectedPatient;
            case 2: return feedingRoutes.oral || feedingRoutes.enteral || feedingRoutes.parenteral;
            case 3: return !feedingRoutes.enteral || !!enteralAccess;
            case 4: return !feedingRoutes.enteral || !!systemType;
            default: return true;
        }
    };

    // Cálculos nutricionais
    const nutritionSummary = useMemo(() => {
        let totalCalories = 0;
        let totalProtein = 0;
        let totalFreeWater = 0;
        let totalResidues = 0;

        if (systemType === "closed" && closedFormula.formulaId) {
            const formula = availableFormulas.find(f => f.id === closedFormula.formulaId);
            if (formula) {
                const rate = parseFloat(closedFormula.rate) || 0;
                const duration = parseFloat(closedFormula.duration) || 0;
                let totalVolume = 0;

                if (closedFormula.infusionMode === "pump") {
                    totalVolume = rate * duration;
                } else if (closedFormula.infusionMode === "gravity") {
                    totalVolume = (rate / 20) * 60 * duration;
                }

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
                    const volumePerTime = parseFloat(entry.volume) || 0;
                    const totalVolume = volumePerTime * entry.times.length;
                    const density = formula.composition.density || formula.composition.calories / 100;
                    totalCalories += totalVolume * density;
                    totalProtein += (totalVolume / 100) * formula.composition.protein;
                    totalFreeWater += (totalVolume * (formula.composition.waterContent || 80)) / 100;
                }
            });
        }

        // Módulos
        modules.forEach(mod => {
            const module = availableModules.find(m => m.id === mod.moduleId);
            if (module && mod.quantity && mod.times.length > 0) {
                const qtyPerTime = parseFloat(mod.quantity) || 0;
                const totalQty = qtyPerTime * mod.times.length;
                totalCalories += totalQty * module.density;
                totalProtein += totalQty * (module.protein / module.referenceAmount);
            }
        });

        // Hidratação
        if (hydration.volume && hydration.times.length > 0) {
            const waterPerTime = parseFloat(hydration.volume) || 0;
            totalFreeWater += waterPerTime * hydration.times.length;
        }

        const weight = selectedPatient?.weight || 70;
        return {
            vet: Math.round(totalCalories),
            vetPerKg: Math.round((totalCalories / weight) * 10) / 10,
            protein: Math.round(totalProtein * 10) / 10,
            proteinPerKg: Math.round((totalProtein / weight) * 10) / 10,
            freeWater: Math.round(totalFreeWater),
            freeWaterPerKg: Math.round((totalFreeWater / weight) * 10) / 10,
            residues: Math.round(totalResidues),
        };
    }, [systemType, closedFormula, openFormulas, modules, hydration, selectedPatient, availableFormulas, availableModules]);

    // Cálculo de bolsas (sistema fechado)
    const bagCalculation = useMemo(() => {
        if (systemType !== "closed" || !closedFormula.formulaId) return null;

        const rate = parseFloat(closedFormula.rate) || 0;
        const duration = parseFloat(closedFormula.duration) || 0;
        let totalVolume = 0;

        if (closedFormula.infusionMode === "pump") {
            totalVolume = rate * duration;
        } else if (closedFormula.infusionMode === "gravity") {
            totalVolume = (rate / 20) * 60 * duration;
        }

        const formula = availableFormulas.find(f => f.id === closedFormula.formulaId);
        const bagSize = formula?.presentations[0] || 1000;
        const numBags = Math.ceil(totalVolume / bagSize);

        return { totalVolume: Math.round(totalVolume), bagSize, numBags };
    }, [closedFormula, systemType, availableFormulas]);

    // Handlers
    const addOpenFormula = () => {
        setOpenFormulas([...openFormulas, { id: Date.now().toString(), formulaId: "", volume: "", diluteTo: "", times: [] }]);
    };

    const removeOpenFormula = (id: string) => {
        if (openFormulas.length > 1) {
            setOpenFormulas(openFormulas.filter(f => f.id !== id));
        }
    };

    const updateOpenFormula = (id: string, field: keyof FormulaEntry, value: any) => {
        setOpenFormulas(openFormulas.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const toggleFormulaTime = (formulaId: string, time: string) => {
        const formula = openFormulas.find(f => f.id === formulaId);
        if (formula) {
            const newTimes = formula.times.includes(time) ? formula.times.filter(t => t !== time) : [...formula.times, time].sort();
            updateOpenFormula(formulaId, "times", newTimes);
        }
    };

    const addModule = () => {
        if (modules.length < 3) {
            setModules([...modules, { id: Date.now().toString(), moduleId: "", quantity: "", unit: "g", times: [] }]);
        } else {
            toast.error("Máximo de 3 módulos permitidos");
        }
    };

    const removeModule = (id: string) => {
        setModules(modules.filter(m => m.id !== id));
    };

    const updateModule = (id: string, field: keyof ModuleEntry, value: any) => {
        setModules(modules.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const toggleModuleTime = (moduleId: string, time: string) => {
        const mod = modules.find(m => m.id === moduleId);
        if (mod) {
            const newTimes = mod.times.includes(time) ? mod.times.filter(t => t !== time) : [...mod.times, time].sort();
            updateModule(moduleId, "times", newTimes);
        }
    };

    const toggleHydrationTime = (time: string) => {
        const newTimes = hydration.times.includes(time) ? hydration.times.filter(t => t !== time) : [...hydration.times, time].sort();
        setHydration({ ...hydration, times: newTimes });
    };

    const toggleBagTime = (time: string) => {
        const newTimes = closedFormula.bagTimes.includes(time) ? closedFormula.bagTimes.filter(t => t !== time) : [...closedFormula.bagTimes, time].sort();
        setClosedFormula({ ...closedFormula, bagTimes: newTimes });
    };

    const handleSave = () => {
        toast.success("Prescrição salva com sucesso!");
        navigate("/dashboard");
    };

    const StepIndicator = ({ step, title, isActive, isCompleted }: { step: number; title: string; isActive: boolean; isCompleted: boolean }) => (
        <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive ? "bg-primary/10 border-2 border-primary" : isCompleted ? "bg-green-50 border border-green-200" : "bg-muted/50 border border-transparent"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isActive ? "bg-primary text-primary-foreground" : isCompleted ? "bg-green-500 text-white" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                {isCompleted ? <Check className="h-4 w-4" /> : step}
            </div>
            <span className={`font-medium ${isActive ? "text-primary" : isCompleted ? "text-green-700" : "text-muted-foreground"}`}>{title}</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />
            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Prescrição de Dietas</h1>
                        <p className="text-muted-foreground">Prescrição nutricional passo a passo</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar - Steps */}
                    <div className="space-y-2">
                        <StepIndicator step={1} title="Selecionar Paciente" isActive={currentStep === 1} isCompleted={completedSteps.includes(1)} />
                        <StepIndicator step={2} title="Via de Alimentação" isActive={currentStep === 2} isCompleted={completedSteps.includes(2)} />
                        {feedingRoutes.enteral && <StepIndicator step={3} title="Acesso Enteral" isActive={currentStep === 3} isCompleted={completedSteps.includes(3)} />}
                        {feedingRoutes.enteral && <StepIndicator step={4} title="Tipo de Sistema" isActive={currentStep === 4} isCompleted={completedSteps.includes(4)} />}
                        {feedingRoutes.enteral && systemType && <StepIndicator step={5} title="Configurar Dieta" isActive={currentStep === 5} isCompleted={completedSteps.includes(5)} />}
                        {feedingRoutes.enteral && systemType && <StepIndicator step={6} title="Módulos (Opcional)" isActive={currentStep === 6} isCompleted={completedSteps.includes(6)} />}
                        {feedingRoutes.enteral && systemType && <StepIndicator step={7} title="Hidratação" isActive={currentStep === 7} isCompleted={completedSteps.includes(7)} />}
                        <StepIndicator step={8} title="Resumo" isActive={currentStep === 8} isCompleted={completedSteps.includes(8)} />
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Step 1: Selecionar Paciente */}
                        {currentStep === 1 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                                        Selecionar Paciente
                                    </CardTitle>
                                    <CardDescription>Escolha o paciente para iniciar a prescrição</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {mockPatients.map(patient => (
                                            <Card key={patient.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedPatient?.id === patient.id ? "ring-2 ring-primary bg-primary/5" : ""}`} onClick={() => setSelectedPatient(patient)}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="font-semibold">{patient.name}</p>
                                                            <p className="text-sm text-muted-foreground">Prontuário: {patient.record}</p>
                                                            <p className="text-sm text-muted-foreground">{patient.bed} - {patient.ward}</p>
                                                        </div>
                                                        {selectedPatient?.id === patient.id && <Check className="h-5 w-5 text-primary" />}
                                                    </div>
                                                    <Separator className="my-2" />
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div><span className="text-muted-foreground">Peso:</span> {patient.weight} kg</div>
                                                        <div><span className="text-muted-foreground">Altura:</span> {patient.height} cm</div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                    <div className="flex justify-end">
                                        <Button onClick={() => completeStep(1)} disabled={!canProceed(1)}>
                                            Próximo <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 2: Via de Alimentação */}
                        {currentStep === 2 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                                        Via de Alimentação
                                    </CardTitle>
                                    <CardDescription>Selecione as vias de alimentação (pode selecionar mais de uma)</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${feedingRoutes.oral ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`} onClick={() => setFeedingRoutes({ ...feedingRoutes, oral: !feedingRoutes.oral })}>
                                            <div className="flex items-center gap-3">
                                                <Checkbox checked={feedingRoutes.oral} />
                                                <Utensils className="h-8 w-8 text-green-600" />
                                                <span className="font-semibold text-lg">Oral</span>
                                            </div>
                                        </div>
                                        <div className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${feedingRoutes.enteral ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`} onClick={() => setFeedingRoutes({ ...feedingRoutes, enteral: !feedingRoutes.enteral })}>
                                            <div className="flex items-center gap-3">
                                                <Checkbox checked={feedingRoutes.enteral} />
                                                <Droplet className="h-8 w-8 text-purple-600" />
                                                <span className="font-semibold text-lg">Enteral</span>
                                            </div>
                                        </div>
                                        <div className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${feedingRoutes.parenteral ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`} onClick={() => setFeedingRoutes({ ...feedingRoutes, parenteral: !feedingRoutes.parenteral })}>
                                            <div className="flex items-center gap-3">
                                                <Checkbox checked={feedingRoutes.parenteral} />
                                                <Syringe className="h-8 w-8 text-orange-600" />
                                                <span className="font-semibold text-lg">Parenteral</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <Button variant="outline" onClick={() => setCurrentStep(1)}>Voltar</Button>
                                        <Button onClick={() => completeStep(2)} disabled={!canProceed(2)}>
                                            {feedingRoutes.enteral ? "Próximo" : "Ir para Resumo"} <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 3: Acesso Enteral */}
                        {currentStep === 3 && feedingRoutes.enteral && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                                        Acesso Enteral
                                    </CardTitle>
                                    <CardDescription>Selecione o tipo de acesso para nutrição enteral</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[
                                            { value: "SNE", label: "Sonda Nasoenteral (SNE)" },
                                            { value: "SNG", label: "Sonda Nasogástrica (SNG)" },
                                            { value: "SOG", label: "Sonda Orogástrica (SOG)" },
                                            { value: "GTT", label: "Gastrostomia (GTT)" },
                                            { value: "JTT", label: "Jejunostomia (JTT)" },
                                        ].map(access => (
                                            <div key={access.value} className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${enteralAccess === access.value ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`} onClick={() => setEnteralAccess(access.value)}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-full border-2 ${enteralAccess === access.value ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                                                    <span className="font-medium">{access.label}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between">
                                        <Button variant="outline" onClick={() => setCurrentStep(2)}>Voltar</Button>
                                        <Button onClick={() => completeStep(3)} disabled={!canProceed(3)}>
                                            Próximo <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 4: Tipo de Sistema */}
                        {currentStep === 4 && feedingRoutes.enteral && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
                                        Tipo de Sistema
                                    </CardTitle>
                                    <CardDescription>Escolha entre sistema aberto ou fechado</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${systemType === "closed" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`} onClick={() => setSystemType("closed")}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`w-5 h-5 rounded-full border-2 ${systemType === "closed" ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                                                <span className="font-semibold text-lg">Sistema Fechado</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Fórmulas prontas em bolsas. Apenas um tipo de fórmula. Validade de 24h.</p>
                                        </div>
                                        <div className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${systemType === "open" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`} onClick={() => setSystemType("open")}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`w-5 h-5 rounded-full border-2 ${systemType === "open" ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                                                <span className="font-semibold text-lg">Sistema Aberto</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">Fórmulas em pó reconstituídas. Permite múltiplas fórmulas intercaladas. Validade de 4h.</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <Button variant="outline" onClick={() => setCurrentStep(3)}>Voltar</Button>
                                        <Button onClick={() => completeStep(4)} disabled={!canProceed(4)}>
                                            Próximo <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 5: Configurar Dieta - Sistema Fechado */}
                        {currentStep === 5 && systemType === "closed" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
                                        Configurar Dieta - Sistema Fechado
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Fórmula */}
                                    <div className="space-y-2">
                                        <Label>Fórmula *</Label>
                                        <Select value={closedFormula.formulaId} onValueChange={(v) => setClosedFormula({ ...closedFormula, formulaId: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecione a fórmula" /></SelectTrigger>
                                            <SelectContent>
                                                {availableFormulas.filter(f => f.systemType === "closed" || f.systemType === "both").map(f => (
                                                    <SelectItem key={f.id} value={f.id}>{f.name} ({f.composition.density} kcal/ml)</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Modo de Infusão */}
                                    <div className="space-y-2">
                                        <Label>Modo de Infusão *</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className={`p-4 border-2 rounded-lg cursor-pointer ${closedFormula.infusionMode === "pump" ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setClosedFormula({ ...closedFormula, infusionMode: "pump" })}>
                                                <span className="font-medium">Bomba de Infusão</span>
                                                <p className="text-xs text-muted-foreground">Velocidade em ml/h</p>
                                            </div>
                                            <div className={`p-4 border-2 rounded-lg cursor-pointer ${closedFormula.infusionMode === "gravity" ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setClosedFormula({ ...closedFormula, infusionMode: "gravity" })}>
                                                <span className="font-medium">Gravitacional</span>
                                                <p className="text-xs text-muted-foreground">Velocidade em gotas/min (1ml = 20 gotas)</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Velocidade de Infusão */}
                                    {closedFormula.infusionMode && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Velocidade de Infusão *</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input type="number" value={closedFormula.rate} onChange={(e) => setClosedFormula({ ...closedFormula, rate: e.target.value })} placeholder={closedFormula.infusionMode === "pump" ? "Ex: 50" : "Ex: 20"} />
                                                    <span className="text-sm font-medium whitespace-nowrap">{closedFormula.infusionMode === "pump" ? "ml/h" : "gotas/min"}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Tempo de Infusão *</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input type="number" value={closedFormula.duration} onChange={(e) => setClosedFormula({ ...closedFormula, duration: e.target.value })} placeholder="Ex: 22" />
                                                    <span className="text-sm font-medium">horas/dia</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Cálculo Automático */}
                                    {bagCalculation && (
                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                            <p className="font-semibold text-blue-800">Volume prescrito para 24 horas: {bagCalculation.totalVolume} ml</p>
                                            <p className="text-blue-700">A fórmula solicitada possui {bagCalculation.bagSize} ml em cada bolsa</p>
                                            <p className="font-medium text-blue-800">Enviar: {bagCalculation.numBags} bolsa(s)</p>
                                        </div>
                                    )}

                                    {/* Horários das Bolsas */}
                                    {bagCalculation && bagCalculation.numBags > 0 && (
                                        <div className="space-y-2">
                                            <Label>Horários de Envio das Bolsas</Label>
                                            <p className="text-xs text-muted-foreground">Selecione os horários para entrega das bolsas</p>
                                            <div className="flex flex-wrap gap-2">
                                                {SCHEDULE_TIMES.map(time => (
                                                    <Button key={time} variant={closedFormula.bagTimes.includes(time) ? "default" : "outline"} size="sm" onClick={() => toggleBagTime(time)}>{time}</Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between">
                                        <Button variant="outline" onClick={() => setCurrentStep(4)}>Voltar</Button>
                                        <Button onClick={() => completeStep(5)} disabled={!closedFormula.formulaId || !closedFormula.infusionMode || !closedFormula.rate || !closedFormula.duration}>
                                            Próximo <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 5: Configurar Dieta - Sistema Aberto */}
                        {currentStep === 5 && systemType === "open" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
                                        Configurar Dieta - Sistema Aberto
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Modo de Infusão */}
                                    <div className="space-y-2">
                                        <Label>Modo de Infusão *</Label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                { value: "pump", label: "Bomba de Infusão", desc: "ml/h" },
                                                { value: "gravity", label: "Gravitacional", desc: "gotas/min" },
                                                { value: "bolus", label: "Bolus", desc: "Tudo de uma vez" },
                                            ].map(mode => (
                                                <div key={mode.value} className={`p-4 border-2 rounded-lg cursor-pointer ${openInfusionMode === mode.value ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setOpenInfusionMode(mode.value as any)}>
                                                    <span className="font-medium">{mode.label}</span>
                                                    <p className="text-xs text-muted-foreground">{mode.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tempo por etapa */}
                                    {(openInfusionMode === "pump" || openInfusionMode === "gravity") && (
                                        <div className="space-y-2">
                                            <Label>Infundir cada etapa em:</Label>
                                            <div className="flex items-center gap-2 max-w-xs">
                                                <Input type="number" value={openDurationPerStep} onChange={(e) => setOpenDurationPerStep(e.target.value)} placeholder="Ex: 2" />
                                                <span className="text-sm font-medium">horas</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Fórmulas */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-lg">Fórmulas</Label>
                                            <Button variant="outline" size="sm" onClick={addOpenFormula}><Plus className="h-4 w-4 mr-1" /> Adicionar Fórmula</Button>
                                        </div>

                                        {openFormulas.map((formula, index) => (
                                            <div key={formula.id} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-semibold">Fórmula {index + 1}</h4>
                                                    {openFormulas.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeOpenFormula(formula.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Fórmula</Label>
                                                        <Select value={formula.formulaId} onValueChange={(v) => updateOpenFormula(formula.id, "formulaId", v)}>
                                                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                            <SelectContent>
                                                                {availableFormulas.filter(f => f.systemType === "open" || f.systemType === "both").map(f => (
                                                                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Quantidade por etapa (ml ou g)</Label>
                                                        <Input type="number" value={formula.volume} onChange={(e) => updateOpenFormula(formula.id, "volume", e.target.value)} placeholder="Ex: 100" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Diluir ATÉ (ml)</Label>
                                                        <Input type="number" value={formula.diluteTo} onChange={(e) => updateOpenFormula(formula.id, "diluteTo", e.target.value)} placeholder="Ex: 200" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Horários</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {SCHEDULE_TIMES.map(time => (
                                                            <Button key={time} variant={formula.times.includes(time) ? "default" : "outline"} size="sm" onClick={() => toggleFormulaTime(formula.id, time)}>{time}</Button>
                                                        ))}
                                                    </div>
                                                </div>
                                                {formula.formulaId && formula.volume && formula.times.length > 0 && (
                                                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                                        Subtotal: {(() => {
                                                            const f = availableFormulas.find(af => af.id === formula.formulaId);
                                                            if (!f) return "0 kcal, 0g PTN";
                                                            const vol = parseFloat(formula.volume) * formula.times.length;
                                                            const kcal = Math.round(vol * (f.composition.density || f.composition.calories / 100));
                                                            const ptn = Math.round((vol / 100) * f.composition.protein * 10) / 10;
                                                            return `${kcal} kcal, ${ptn}g PTN`;
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between">
                                        <Button variant="outline" onClick={() => setCurrentStep(4)}>Voltar</Button>
                                        <Button onClick={() => completeStep(5)} disabled={!openInfusionMode || openFormulas.every(f => !f.formulaId)}>
                                            Próximo <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 6: Módulos */}
                        {currentStep === 6 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">6</span>
                                        Módulos para Nutrição Enteral (Opcional)
                                    </CardTitle>
                                    <CardDescription>Programar a adição de módulos na água ou à parte (máx. 3)</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <Button variant="outline" onClick={addModule} disabled={modules.length >= 3}>
                                        <Plus className="h-4 w-4 mr-2" /> Adicionar Módulo
                                    </Button>

                                    {modules.map((mod, index) => (
                                        <div key={mod.id} className="p-4 border rounded-lg space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold">Módulo {index + 1}</h4>
                                                <Button variant="ghost" size="sm" onClick={() => removeModule(mod.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Módulo</Label>
                                                    <Select value={mod.moduleId} onValueChange={(v) => updateModule(mod.id, "moduleId", v)}>
                                                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                        <SelectContent>
                                                            {availableModules.map(m => (
                                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Quantidade</Label>
                                                    <Input type="number" value={mod.quantity} onChange={(e) => updateModule(mod.id, "quantity", e.target.value)} placeholder="Ex: 10" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Unidade</Label>
                                                    <Select value={mod.unit} onValueChange={(v) => updateModule(mod.id, "unit", v as "ml" | "g")}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="g">gramas (g)</SelectItem>
                                                            <SelectItem value="ml">mililitros (ml)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Horários</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {SCHEDULE_TIMES.map(time => (
                                                        <Button key={time} variant={mod.times.includes(time) ? "default" : "outline"} size="sm" onClick={() => toggleModuleTime(mod.id, time)}>{time}</Button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {modules.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum módulo adicionado</p>}

                                    <div className="flex justify-between">
                                        <Button variant="outline" onClick={() => setCurrentStep(5)}>Voltar</Button>
                                        <Button onClick={() => completeStep(6)}>
                                            Próximo <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 7: Hidratação */}
                        {currentStep === 7 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">7</span>
                                        Água/Hidratação
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Volume por horário (ml)</Label>
                                        <Input type="number" value={hydration.volume} onChange={(e) => setHydration({ ...hydration, volume: e.target.value })} placeholder="Ex: 100" className="max-w-xs" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Horários</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {SCHEDULE_TIMES.map(time => (
                                                <Button key={time} variant={hydration.times.includes(time) ? "default" : "outline"} size="sm" onClick={() => toggleHydrationTime(time)}>{time}</Button>
                                            ))}
                                        </div>
                                    </div>
                                    {hydration.volume && hydration.times.length > 0 && (
                                        <p className="text-sm text-muted-foreground">Total: {parseFloat(hydration.volume) * hydration.times.length} ml/dia</p>
                                    )}
                                    <div className="flex justify-between">
                                        <Button variant="outline" onClick={() => setCurrentStep(6)}>Voltar</Button>
                                        <Button onClick={() => completeStep(7)}>
                                            Ir para Resumo <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 8: Resumo */}
                        {currentStep === 8 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calculator className="h-6 w-6 text-primary" />
                                        Resumo da Prescrição Nutricional
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {selectedPatient && (
                                        <div className="p-4 bg-muted rounded-lg">
                                            <p className="font-semibold">{selectedPatient.name}</p>
                                            <p className="text-sm text-muted-foreground">{selectedPatient.bed} - Peso: {selectedPatient.weight}kg</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 bg-primary/10 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-primary">{nutritionSummary.vet}</p>
                                            <p className="text-sm text-muted-foreground">kcal ({nutritionSummary.vetPerKg} kcal/kg)</p>
                                            <p className="text-xs font-medium mt-1">VET</p>
                                        </div>
                                        <div className="p-4 bg-blue-100 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-blue-700">{nutritionSummary.protein}g</p>
                                            <p className="text-sm text-muted-foreground">({nutritionSummary.proteinPerKg} g/kg)</p>
                                            <p className="text-xs font-medium mt-1">Proteínas</p>
                                        </div>
                                        <div className="p-4 bg-cyan-100 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-cyan-700">{nutritionSummary.freeWater}ml</p>
                                            <p className="text-sm text-muted-foreground">({nutritionSummary.freeWaterPerKg} ml/kg)</p>
                                            <p className="text-xs font-medium mt-1">Água Livre</p>
                                        </div>
                                        <div className="p-4 bg-green-100 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-green-700">{nutritionSummary.residues}g</p>
                                            <p className="text-xs font-medium mt-1">Resíduos Recicláveis</p>
                                        </div>
                                    </div>

                                    <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                                        <CollapsibleTrigger asChild>
                                            <Button variant="outline" className="w-full">
                                                <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showDetails ? "rotate-180" : ""}`} />
                                                {showDetails ? "Ocultar Detalhes" : "Mais Detalhes"}
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-4 p-4 border rounded-lg space-y-2">
                                            <p><strong>Via:</strong> {feedingRoutes.enteral && `Enteral (${enteralAccess})`} {feedingRoutes.oral && "Oral"} {feedingRoutes.parenteral && "Parenteral"}</p>
                                            <p><strong>Sistema:</strong> {systemType === "closed" ? "Fechado" : systemType === "open" ? "Aberto" : "-"}</p>
                                            {systemType === "closed" && closedFormula.formulaId && (
                                                <>
                                                    <p><strong>Fórmula:</strong> {availableFormulas.find(f => f.id === closedFormula.formulaId)?.name}</p>
                                                    <p><strong>Infusão:</strong> {closedFormula.rate} {closedFormula.infusionMode === "pump" ? "ml/h" : "gotas/min"} por {closedFormula.duration}h</p>
                                                </>
                                            )}
                                            {modules.length > 0 && <p><strong>Módulos:</strong> {modules.map(m => availableModules.find(am => am.id === m.moduleId)?.name).join(", ")}</p>}
                                        </CollapsibleContent>
                                    </Collapsible>

                                    <div className="flex justify-between">
                                        <Button variant="outline" onClick={() => setCurrentStep(feedingRoutes.enteral ? 7 : 2)}>Voltar</Button>
                                        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                                            <Check className="h-4 w-4 mr-2" /> Salvar Prescrição
                                        </Button>
                                    </div>
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

export default DietPrescription;
