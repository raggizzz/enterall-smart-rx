import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mic, ArrowLeft, Check, ChevronDown, ChevronRight, Droplet, Plus, Trash2, Utensils, Syringe, Calculator, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { getAllFormulas, getAllModules } from "@/lib/formulasDatabase";
import { usePatients, usePrescriptions, useFormulas, useModules as useDbModules } from "@/hooks/useDatabase";
import { Patient, Prescription, OralSupplementSchedule, OralModuleSchedule } from "@/lib/database";

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

const PrescriptionNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient");
  const prescriptionIdFromUrl = searchParams.get("prescription");

  // Usar pacientes e prescricoes do banco de dados
  const { patients, isLoading: patientsLoading } = usePatients();
  const { prescriptions, createPrescription, updatePrescription } = usePrescriptions();
  const [isSaving, setIsSaving] = useState(false);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(prescriptionIdFromUrl);
  const [editingStartDate, setEditingStartDate] = useState<string | null>(null);
  const [hydratedFromPrescription, setHydratedFromPrescription] = useState(false);

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
    bagQuantities: {} as Record<string, number> // Quantidade de bolsas por horario
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

  // --- Oral Inline State (Step 8) ---
  const [oralDietConsistency, setOralDietConsistency] = useState('');
  const [oralDietCharacteristics, setOralDietCharacteristics] = useState('');
  const [oralMealsPerDay, setOralMealsPerDay] = useState<number>(6);
  const [oralSpeechTherapy, setOralSpeechTherapy] = useState(false);
  const [oralNeedsThickener, setOralNeedsThickener] = useState(false);
  const [oralSafeConsistency, setOralSafeConsistency] = useState('');
  const [oralEstimatedVET, setOralEstimatedVET] = useState<number>(0);
  const [oralEstimatedProtein, setOralEstimatedProtein] = useState<number>(0);
  const [oralHasTherapy, setOralHasTherapy] = useState(false);
  const [oralSupplements, setOralSupplements] = useState<OralSupplementSchedule[]>([]);
  const [oralTherapyModules, setOralTherapyModules] = useState<OralModuleSchedule[]>([]);
  const [oralObservations, setOralObservations] = useState('');

  // --- Parenteral Inline State (Step 9) ---
  const [parenteralAccess, setParenteralAccess] = useState<'central' | 'peripheral' | 'picc'>('central');
  const [parenteralInfusionTime, setParenteralInfusionTime] = useState<number>(24);
  const [parenteralAminoacids, setParenteralAminoacids] = useState<number>(0);
  const [parenteralLipids, setParenteralLipids] = useState<number>(0);
  const [parenteralGlucose, setParenteralGlucose] = useState<number>(0);
  const [parenteralObservations, setParenteralObservations] = useState('');

  // Parenteral VET auto-calc
  const parenteralVET = useMemo(() => {
    return (parenteralAminoacids * 4) + (parenteralLipids * 9) + (parenteralGlucose * 3.4);
  }, [parenteralAminoacids, parenteralLipids, parenteralGlucose]);

  const parenteralPerKg = useMemo(() => {
    const w = selectedPatient?.weight || 0;
    if (!w) return { kcal: 0, amino: 0, lipids: 0, glucose: 0 };
    return { kcal: parenteralVET / w, amino: parenteralAminoacids / w, lipids: parenteralLipids / w, glucose: parenteralGlucose / w };
  }, [parenteralVET, parenteralAminoacids, parenteralLipids, parenteralGlucose, selectedPatient?.weight]);

  // --- DB hooks for oral supplements ---
  const { formulas: dbFormulas } = useFormulas();
  const { modules: dbModules } = useDbModules();

  const ORAL_MEAL_SCHEDULES = useMemo(() => [
    { key: 'breakfast', label: 'Desjejum' },
    { key: 'midMorning', label: 'Colação' },
    { key: 'lunch', label: 'Almoço' },
    { key: 'afternoon', label: 'Merenda' },
    { key: 'dinner', label: 'Jantar' },
    { key: 'supper', label: 'Ceia' },
  ], []);

  const oralAvailableSupplements = useMemo(() => {
    return dbFormulas.filter(f => f.type === 'standard' || f.type === 'high-protein' || f.type === 'high-calorie' || f.type === 'oral-supplement' || f.type === 'infant-formula');
  }, [dbFormulas]);

  // Oral totals
  const oralTotals = useMemo(() => {
    let kcal = oralEstimatedVET;
    let protein = oralEstimatedProtein;
    oralSupplements.forEach(sup => {
      const formula = dbFormulas.find(f => f.id === sup.supplementId);
      if (!formula) return;
      const timesPerDay = Object.values(sup.schedules).filter(v => v === true).length;
      const volumePerServing = sup.amount || 200;
      const factor = (volumePerServing * timesPerDay) / 100;
      kcal += (formula.caloriesPerUnit || 0) * factor;
      protein += (formula.proteinPerUnit || 0) * factor;
    });
    oralTherapyModules.forEach(om => {
      const mod = dbModules.find(m => m.id === om.moduleId);
      if (!mod) return;
      const timesPerDay = Object.values(om.schedules).filter(v => v === true).length;
      const amount = om.amount || mod.referenceAmount || 1;
      const factor = mod.referenceAmount ? (amount / mod.referenceAmount) : amount;
      kcal += (mod.calories || 0) * timesPerDay * factor;
      protein += (mod.protein || 0) * timesPerDay * factor;
    });
    return {
      kcal, protein,
      kcalPerKg: selectedPatient?.weight ? kcal / selectedPatient.weight : 0,
      proteinPerKg: selectedPatient?.weight ? protein / selectedPatient.weight : 0,
    };
  }, [oralEstimatedVET, oralEstimatedProtein, oralSupplements, oralTherapyModules, dbFormulas, dbModules, selectedPatient]);

  // Oral supplement handlers
  const addOralSupplement = () => {
    if (oralSupplements.length >= 3) { toast.error("Máximo de 3 suplementos"); return; }
    setOralSupplements([...oralSupplements, { supplementId: '', supplementName: '', amount: 200, unit: 'ml', schedules: {} }]);
  };
  const removeOralSupplement = (i: number) => setOralSupplements(oralSupplements.filter((_, idx) => idx !== i));
  const updateOralSupplement = (i: number, field: string, value: any) => {
    const updated = [...oralSupplements];
    if (field === 'supplementId') {
      const formula = dbFormulas.find(f => f.id === value);
      updated[i] = { ...updated[i], supplementId: value, supplementName: formula?.name || '' };
    } else if (field === 'amount') {
      updated[i] = { ...updated[i], amount: value ? parseFloat(value) : undefined };
    } else if (field === 'unit') {
      updated[i] = { ...updated[i], unit: value };
    } else if (field.startsWith('schedule_')) {
      updated[i] = { ...updated[i], schedules: { ...updated[i].schedules, [field.replace('schedule_', '')]: value } };
    }
    setOralSupplements(updated);
  };

  // Oral module handlers
  const addOralModule = () => {
    if (oralTherapyModules.length >= 3) { toast.error("Máximo de 3 módulos"); return; }
    setOralTherapyModules([...oralTherapyModules, { moduleId: '', moduleName: '', amount: 1, unit: 'g', schedules: {} }]);
  };
  const removeOralModule = (i: number) => setOralTherapyModules(oralTherapyModules.filter((_, idx) => idx !== i));
  const updateOralModule = (i: number, field: string, value: any) => {
    const updated = [...oralTherapyModules];
    if (field === 'moduleId') {
      const mod = dbModules.find(m => m.id === value);
      updated[i] = { ...updated[i], moduleId: value, moduleName: mod?.name || '' };
    } else if (field === 'amount') {
      updated[i] = { ...updated[i], amount: value ? parseFloat(value) : undefined };
    } else if (field === 'unit') {
      updated[i] = { ...updated[i], unit: value };
    } else if (field.startsWith('schedule_')) {
      updated[i] = { ...updated[i], schedules: { ...updated[i].schedules, [field.replace('schedule_', '')]: value } };
    }
    setOralTherapyModules(updated);
  };

  // --- DYNAMIC STEP DEFINITIONS ---
  const STEP_DEFS: { id: number; title: string; condition: () => boolean }[] = useMemo(() => [
    { id: 1, title: "Selecionar Paciente", condition: () => true },
    { id: 2, title: "Via de Alimentação", condition: () => true },
    { id: 3, title: "Acesso Enteral", condition: () => feedingRoutes.enteral },
    { id: 4, title: "Tipo de Sistema", condition: () => feedingRoutes.enteral },
    { id: 5, title: "Configurar Dieta", condition: () => feedingRoutes.enteral },
    { id: 6, title: "Módulos (Opcional)", condition: () => feedingRoutes.enteral },
    { id: 7, title: "Hidratação", condition: () => feedingRoutes.enteral },
    { id: 8, title: "Prescrição Oral", condition: () => feedingRoutes.oral },
    { id: 9, title: "Prescrição Parenteral", condition: () => feedingRoutes.parenteral },
    { id: 10, title: "Resumo", condition: () => true },
  ], [feedingRoutes]);

  const activeSteps = useMemo(() => STEP_DEFS.filter(s => s.condition()), [STEP_DEFS]);

  const getNextStep = (current: number): number => {
    const idx = activeSteps.findIndex(s => s.id === current);
    return idx >= 0 && idx < activeSteps.length - 1 ? activeSteps[idx + 1].id : current;
  };

  const getPrevStep = (current: number): number => {
    const idx = activeSteps.findIndex(s => s.id === current);
    return idx > 0 ? activeSteps[idx - 1].id : current;
  };

  const applyLoadedPrescription = useCallback((prescription: Prescription) => {
    const isEnteral = prescription.therapyType === "enteral";
    const isOral = prescription.therapyType === "oral";
    const isParenteral = prescription.therapyType === "parenteral";

    setFeedingRoutes({
      oral: isOral,
      enteral: isEnteral,
      parenteral: isParenteral,
    });

    setEnteralAccess(prescription.feedingRoute || "");
    setSystemType(prescription.systemType || "");
    setEditingPrescriptionId(prescription.id || null);
    setEditingStartDate(prescription.startDate || null);

    if (prescription.systemType === "closed") {
      const firstFormula = prescription.formulas?.[0];
      const bagQuantities = (firstFormula?.schedules || []).reduce((acc, time) => {
        acc[time] = (acc[time] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setClosedFormula({
        formulaId: firstFormula?.formulaId || "",
        infusionMode: prescription.infusionMode === "gravity" ? "gravity" : prescription.infusionMode === "pump" ? "pump" : "",
        rate: prescription.infusionRateMlH ? String(prescription.infusionRateMlH) : "",
        duration: prescription.infusionHoursPerDay ? String(prescription.infusionHoursPerDay) : "",
        bagQuantities,
      });

      setOpenInfusionMode("");
      setOpenDurationPerStep("");
      setOpenFormulas([{ id: "1", formulaId: "", volume: "", diluteTo: "", times: [] }]);
    } else {
      setOpenInfusionMode((prescription.infusionMode as "pump" | "gravity" | "bolus" | "") || "");
      setOpenDurationPerStep(prescription.infusionHoursPerDay ? String(prescription.infusionHoursPerDay) : "");
      setOpenFormulas(
        prescription.formulas && prescription.formulas.length > 0
          ? prescription.formulas.map((formula, index) => ({
            id: `loaded-formula-${index + 1}`,
            formulaId: formula.formulaId,
            volume: formula.volume ? String(formula.volume) : "",
            diluteTo: "",
            times: formula.schedules || [],
          }))
          : [{ id: "1", formulaId: "", volume: "", diluteTo: "", times: [] }]
      );

      setClosedFormula({
        formulaId: "",
        infusionMode: "",
        rate: "",
        duration: "",
        bagQuantities: {},
      });
    }

    setModules(
      (prescription.modules || []).map((module, index) => {
        return {
          id: `loaded-module-${index + 1}`,
          moduleId: module.moduleId,
          quantity: module.amount ? String(module.amount) : "",
          unit: module.unit || "g",
          times:
            module.schedules ||
            SCHEDULE_TIMES.slice(0, Math.max(0, module.timesPerDay || 0)),
        };
      })
    );

    setHydration({
      volume: prescription.hydrationVolume ? String(prescription.hydrationVolume) : "",
      times: prescription.hydrationSchedules || [],
    });

    if (isEnteral) {
      setCompletedSteps([1, 2, 3, 4, 5, 6, 7, 10]);
      setCurrentStep(10);
    } else {
      setCompletedSteps([1, 2, 10]);
      setCurrentStep(2);
    }
  }, []);

  // Load patient from URL
  useEffect(() => {
    if (patientId && patients.length > 0) {
      const patient = patients.find(p => p.id === patientId);
      if (patient && !hydratedFromPrescription) {
        setSelectedPatient(patient);
        setCompletedSteps([1]);
        setCurrentStep(2);
      }
    }
  }, [patientId, patients, hydratedFromPrescription]);

  useEffect(() => {
    if (hydratedFromPrescription || patients.length === 0 || prescriptions.length === 0) return;

    let targetPrescription: Prescription | undefined;
    if (prescriptionIdFromUrl) {
      targetPrescription = prescriptions.find((p) => p.id === prescriptionIdFromUrl);
    }

    if (!targetPrescription && patientId) {
      targetPrescription =
        prescriptions.find((p) => p.patientId === patientId && p.status === "active") ||
        prescriptions.find((p) => p.patientId === patientId);
    }

    if (!targetPrescription) return;

    const patient = patients.find((p) => p.id === targetPrescription!.patientId);
    if (patient) {
      setSelectedPatient(patient);
    }

    applyLoadedPrescription(targetPrescription);
    setHydratedFromPrescription(true);
  }, [
    hydratedFromPrescription,
    patients,
    prescriptions,
    patientId,
    prescriptionIdFromUrl,
    applyLoadedPrescription,
  ]);

  const completeStep = (step: number) => {
    if (!completedSteps.includes(step)) setCompletedSteps([...completedSteps, step]);
    setCurrentStep(getNextStep(step));
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
    let totalResiduePlastic = 0;
    let totalResiduePaper = 0;
    let totalResidueMetal = 0;
    let totalResidueGlass = 0;

    // --- ENTERAL totals (only when enteral is active) ---
    if (feedingRoutes.enteral) {
      if (systemType === "closed" && closedFormula.formulaId) {
        const formula = availableFormulas.find(f => f.id === closedFormula.formulaId);
        if (formula) {
          const rate = parseFloat(closedFormula.rate) || 0;
          const duration = parseFloat(closedFormula.duration) || 0;
          let totalVolume = closedFormula.infusionMode === "pump" ? rate * duration : (rate / 20) * 60 * duration;
          const density = formula.composition.density || formula.composition.calories / 100;
          totalCalories += totalVolume * density;
          totalProtein += (totalVolume / 100) * formula.composition.protein;
          totalFreeWater += (totalVolume * (formula.composition.waterContent || 80)) / 100;
          if (formula.residueInfo) {
            const factor = totalVolume / 1000;
            totalResiduePlastic += (formula.residueInfo.plastic || 0) * factor;
            totalResiduePaper += (formula.residueInfo.paper || 0) * factor;
            totalResidueMetal += (formula.residueInfo.metal || 0) * factor;
            totalResidueGlass += (formula.residueInfo.glass || 0) * factor;
          }
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
            if (formula.residueInfo) {
              const factor = totalVolume / 1000;
              totalResiduePlastic += (formula.residueInfo.plastic || 0) * factor;
              totalResiduePaper += (formula.residueInfo.paper || 0) * factor;
              totalResidueMetal += (formula.residueInfo.metal || 0) * factor;
              totalResidueGlass += (formula.residueInfo.glass || 0) * factor;
            }
          }
        });
      }

      modules.forEach(mod => {
        const module = availableModules.find(m => m.id === mod.moduleId);
        if (module && mod.quantity && mod.times.length > 0) {
          const totalQty = parseFloat(mod.quantity) * mod.times.length;
          totalCalories += totalQty * module.density;
          const proteinRatio = (module.protein > 0 && module.referenceAmount > 0) ? (module.protein / module.referenceAmount) : 0;
          totalProtein += totalQty * proteinRatio;
        }
      });

      if (hydration.volume && hydration.times.length > 0) {
        totalFreeWater += parseFloat(hydration.volume) * hydration.times.length;
      }
    }

    // --- ORAL totals (add to enteral if both active) ---
    if (feedingRoutes.oral) {
      totalCalories += oralTotals.kcal;
      totalProtein += oralTotals.protein;
    }

    // --- PARENTERAL totals (add to enteral if both active) ---
    if (feedingRoutes.parenteral) {
      totalCalories += parenteralVET;
      totalProtein += parenteralAminoacids; // aminoacids in grams of protein
    }

    const weight = selectedPatient?.weight || 70;
    return {
      vet: Math.round(totalCalories),
      vetPerKg: Math.round((totalCalories / weight) * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      proteinPerKg: Math.round((totalProtein / weight) * 10) / 10,
      freeWater: Math.round(totalFreeWater),
      freeWaterPerKg: Math.round((totalFreeWater / weight) * 10) / 10,
      residues: {
        plastic: Math.round(totalResiduePlastic * 10) / 10,
        paper: Math.round(totalResiduePaper * 10) / 10,
        metal: Math.round(totalResidueMetal * 10) / 10,
        glass: Math.round(totalResidueGlass * 10) / 10,
      },
      residueTotal: Math.round((totalResiduePlastic + totalResiduePaper + totalResidueMetal + totalResidueGlass) * 10) / 10,
    };
  }, [systemType, closedFormula, openFormulas, modules, hydration, selectedPatient, availableFormulas, availableModules, feedingRoutes, oralTotals, parenteralVET, parenteralAminoacids]);

  const bmi = useMemo(() => {
    if (!selectedPatient?.weight || !selectedPatient?.height) return null;
    const heightM = selectedPatient.height / 100;
    return selectedPatient.weight / (heightM * heightM);
  }, [selectedPatient]);

  const idealWeight = useMemo(() => {
    if (!selectedPatient?.height) return null;
    const heightM = selectedPatient.height / 100;
    return 25 * heightM * heightM;
  }, [selectedPatient]);

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

  const handleSave = async () => {
    if (!selectedPatient) {
      toast.error("Nenhum paciente selecionado.");
      return;
    }
    if (!selectedPatient.id) {
      toast.error("Paciente sem identificador no banco.");
      return;
    }

    const sessionHospitalId = typeof window !== "undefined" ? localStorage.getItem("userHospitalId") || undefined : undefined;
    const sessionProfessionalId = typeof window !== "undefined" ? localStorage.getItem("userProfessionalId") || undefined : undefined;
    const resolvedHospitalId = selectedPatient.hospitalId || sessionHospitalId;

    if (!resolvedHospitalId) {
      toast.error("Hospital da sessão não identificado. Refaça o login.");
      return;
    }

    setIsSaving(true);
    try {
      // Montar objeto da prescricao
      // Determine therapyType based on active routes
      const therapyType: 'enteral' | 'oral' | 'parenteral' =
        feedingRoutes.enteral ? 'enteral' : feedingRoutes.oral ? 'oral' : 'parenteral';

      // Build notes with oral and parenteral data
      const notesParts: string[] = [];
      if (feedingRoutes.oral) {
        notesParts.push(`[ORAL] Consist\u00eancia: ${oralDietConsistency || '-'} | Refei\u00e7\u00f5es: ${oralMealsPerDay}/dia | Caracter\u00edsticas: ${oralDietCharacteristics || '-'} | Fono: ${oralSpeechTherapy ? 'Sim' : 'N\u00e3o'} | VET oral: ${oralTotals.kcal.toFixed(0)}kcal | Prot oral: ${oralTotals.protein.toFixed(1)}g | Obs: ${oralObservations || '-'}`);
      }
      if (feedingRoutes.parenteral) {
        notesParts.push(`[PARENTERAL] Acesso: ${parenteralAccess} | Infus\u00e3o: ${parenteralInfusionTime}h | VET: ${parenteralVET.toFixed(0)}kcal | Amino: ${parenteralAminoacids}g | Lip: ${parenteralLipids}g | Glic: ${parenteralGlucose}g | Obs: ${parenteralObservations || '-'}`);
      }

      // Only include enteral formulas/modules/hydration if enteral is active
      const enteralFormulas = feedingRoutes.enteral
        ? (systemType === 'closed' && closedFormula.formulaId ? [{
          formulaId: closedFormula.formulaId,
          formulaName: availableFormulas.find(f => f.id === closedFormula.formulaId)?.name || '',
          volume: parseFloat(closedFormula.rate) * parseFloat(closedFormula.duration) || 0,
          timesPerDay: Object.keys(closedFormula.bagQuantities).length || 1,
          schedules: Object.keys(closedFormula.bagQuantities)
        }] : openFormulas.filter(f => f.formulaId).map(f => ({
          formulaId: f.formulaId,
          formulaName: availableFormulas.find(af => af.id === f.formulaId)?.name || '',
          volume: parseFloat(f.volume) || 0,
          timesPerDay: f.times.length,
          schedules: f.times
        })))
        : [];

      const enteralModules = feedingRoutes.enteral
        ? modules.filter(m => m.moduleId).map(m => ({
          moduleId: m.moduleId,
          moduleName: availableModules.find(am => am.id === m.moduleId)?.name || '',
          amount: parseFloat(m.quantity) || 0,
          timesPerDay: m.times.length,
          schedules: m.times,
          unit: m.unit
        }))
        : [];

      const prescriptionData = {
        hospitalId: resolvedHospitalId,
        professionalId: sessionProfessionalId,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientRecord: selectedPatient.record,
        patientBed: selectedPatient.bed,
        patientWard: selectedPatient.ward,
        therapyType,
        systemType: (feedingRoutes.enteral ? systemType || 'open' : 'open') as 'open' | 'closed',
        feedingRoute: feedingRoutes.enteral ? enteralAccess || undefined : undefined,
        infusionMode: feedingRoutes.enteral ? (systemType === 'closed' ? closedFormula.infusionMode : openInfusionMode) as 'pump' | 'gravity' | 'bolus' | undefined : undefined,
        infusionRateMlH: feedingRoutes.enteral && systemType === 'closed' ? parseFloat(closedFormula.rate) || undefined : undefined,
        infusionHoursPerDay: feedingRoutes.enteral && systemType === 'closed' ? parseFloat(closedFormula.duration) || undefined : undefined,
        formulas: enteralFormulas,
        modules: enteralModules,
        hydrationVolume: feedingRoutes.enteral ? parseFloat(hydration.volume) || undefined : undefined,
        hydrationSchedules: feedingRoutes.enteral && hydration.times.length > 0 ? hydration.times : undefined,
        totalCalories: nutritionSummary.vet,
        totalProtein: nutritionSummary.protein,
        totalFreeWater: nutritionSummary.freeWater,
        notes: notesParts.length > 0 ? notesParts.join(' | ') : undefined,
        status: 'active' as const,
        startDate: editingStartDate || new Date().toISOString().split('T')[0]
      };

      if (editingPrescriptionId) {
        await updatePrescription(editingPrescriptionId, prescriptionData);
        toast.success("Prescrição atualizada com sucesso!");
      } else {
        await createPrescription(prescriptionData);
        toast.success("Prescrição salva com sucesso!");
      }
      navigate("/dashboard");
    } catch (error) {
      console.error('Erro ao salvar prescrição:', error);
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Verifique a conexão e as migrações do banco";
      toast.error(`Erro ao salvar prescrição: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const StepIndicator = ({ step, title, isActive, isCompleted }: { step: number; title: string; isActive: boolean; isCompleted: boolean }) => (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${isActive ? "bg-primary/10 border-2 border-primary" : isCompleted ? "bg-green-50 border border-green-200" : "bg-muted/50"}`} onClick={() => isCompleted && setCurrentStep(step)}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isActive ? "bg-primary text-white" : isCompleted ? "bg-green-500 text-white" : "bg-muted-foreground/20"}`}>
        {isCompleted ? <Check className="h-4 w-4" /> : step}
      </div>
      <span className={`font-medium ${isActive ? "text-primary" : isCompleted ? "text-green-700" : "text-muted-foreground"}`}>{title}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/35 to-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-3xl font-bold">Prescrição de Dietas</h1>
            <p className="text-muted-foreground">
              Prescrição nutricional passo a passo
              {editingPrescriptionId ? " - modo edição ativa" : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Steps */}
          <div className="space-y-2">
            {activeSteps.map(s => (
              <StepIndicator key={s.id} step={s.id} title={s.title} isActive={currentStep === s.id} isCompleted={completedSteps.includes(s.id)} />
            ))}

            {/* RESUMO NUTRICIONAL SEMPRE VISIVEL */}
            {selectedPatient && currentStep > 1 && (
              <Card className="mt-4 border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-primary">
                    <Calculator className="h-4 w-4" />
                    Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3 space-y-2">
                  <div className="text-xs text-muted-foreground mb-2">
                    <strong>{selectedPatient.name}</strong>
                    <br />Peso: {selectedPatient.weight || '-'}kg
                    {bmi && <span> | IMC: {bmi.toFixed(1)}</span>}
                    {idealWeight && <span> | Peso ideal (IMC 25): {idealWeight.toFixed(1)}kg</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded p-2 text-center shadow-sm">
                      <div className="text-lg font-bold text-orange-600">
                        {nutritionSummary.vet}
                      </div>
                      <div className="text-xs text-muted-foreground">kcal</div>
                      <div className="text-xs font-semibold text-orange-700">
                        {nutritionSummary.vetPerKg} kcal/kg
                      </div>
                    </div>
                    <div className="bg-white rounded p-2 text-center shadow-sm">
                      <div className="text-lg font-bold text-blue-600">
                        {nutritionSummary.protein}g
                      </div>
                      <div className="text-xs text-muted-foreground">proteínas</div>
                      <div className="text-xs font-semibold text-blue-700">
                        {nutritionSummary.proteinPerKg} g/kg
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded p-2 text-center shadow-sm">
                      <div className="text-sm font-bold text-cyan-600">
                        {nutritionSummary.freeWater}ml
                      </div>
                      <div className="text-xs text-muted-foreground">água livre</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center shadow-sm">
                      <div className="text-sm font-bold text-green-600">
                        {feedingRoutes.enteral ? `${nutritionSummary.residueTotal.toFixed(1)}g` : "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {feedingRoutes.enteral ? "resíduos totais" : "resíduos (somente via enteral)"}
                      </div>
                    </div>
                  </div>

                  {/* Info das vias selecionadas */}
                  <div className="pt-2 border-t mt-2">
                    <div className="text-xs text-muted-foreground">
                      <strong>Vias:</strong>{' '}
                      {feedingRoutes.oral && <span className="text-green-600">Oral </span>}
                      {feedingRoutes.enteral && <span className="text-purple-600">Enteral </span>}
                      {feedingRoutes.parenteral && <span className="text-orange-600">Parenteral</span>}
                      {!feedingRoutes.oral && !feedingRoutes.enteral && !feedingRoutes.parenteral && '-'}
                    </div>
                    {enteralAccess && (
                      <div className="text-xs text-muted-foreground">
                        <strong>Acesso:</strong> {enteralAccess}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Step 1 */}
            {currentStep === 1 && (
              <Card>
                <CardHeader><CardTitle>1. Selecionar Paciente</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {patientsLoading ? (
                    <p className="text-center text-muted-foreground py-8">Carregando pacientes...</p>
                  ) : patients.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Nenhum paciente cadastrado</p>
                      <Button onClick={() => navigate('/patients?action=add')}>Cadastrar Paciente</Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {patients.filter(p => p.status === 'active').map(p => (
                        <Card key={p.id} className={`cursor-pointer hover:shadow-md ${selectedPatient?.id === p.id ? "ring-2 ring-primary bg-primary/5" : ""}`} onClick={() => {
                          setSelectedPatient(p);
                          // Auto-load last prescription for this patient
                          const lastRx = prescriptions
                            .filter(rx => rx.patientId === p.id)
                            .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))[0];
                          if (lastRx) {
                            applyLoadedPrescription(lastRx);
                            // Keep the previous prescription ID so saving overwrites it
                            setEditingPrescriptionId(lastRx.id || null);
                            setEditingStartDate(lastRx.startDate || null);
                            toast.info("Prescrição anterior carregada. Ao salvar, ela será atualizada.");
                          }
                        }}>
                          <CardContent className="p-4">
                            <div className="flex justify-between"><div><p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">{p.record} - {p.bed || 'Sem leito'}</p></div>{selectedPatient?.id === p.id && <Check className="h-5 w-5 text-primary" />}</div>
                            <Separator className="my-2" />
                            <div className="grid grid-cols-2 gap-2 text-sm"><div>Peso: {p.weight || '-'}kg</div><div>Altura: {p.height || '-'}cm</div></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end"><Button onClick={() => completeStep(1)} disabled={!canProceed(1)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 2 */}
            {currentStep === 2 && (
              <Card>
                <CardHeader><CardTitle>2. Via de Alimentação</CardTitle><CardDescription>Selecione a(s) via(s) de alimentação. Enteral pode ser combinada com Oral e/ou Parenteral.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[{ key: "oral", icon: Utensils, label: "Oral", color: "green" }, { key: "enteral", icon: Droplet, label: "Enteral", color: "purple" }, { key: "parenteral", icon: Syringe, label: "Parenteral", color: "orange" }].map(r => (
                      <div key={r.key} className={`p-6 border-2 rounded-lg cursor-pointer ${feedingRoutes[r.key as keyof typeof feedingRoutes] ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => {
                        const key = r.key as keyof typeof feedingRoutes;
                        const newValue = !feedingRoutes[key];

                        if (key === "enteral") {
                          // Toggling enteral: if turning off, also clear oral/parenteral
                          if (!newValue) {
                            setFeedingRoutes({ oral: false, enteral: false, parenteral: false });
                          } else {
                            setFeedingRoutes({ ...feedingRoutes, enteral: true });
                          }
                        } else {
                          // Oral or Parenteral
                          if (feedingRoutes.enteral) {
                            // When Enteral is active, allow combining
                            setFeedingRoutes({ ...feedingRoutes, [key]: newValue });
                          } else {
                            // Without Enteral, only one at a time
                            setFeedingRoutes({
                              oral: key === "oral" ? newValue : false,
                              enteral: false,
                              parenteral: key === "parenteral" ? newValue : false,
                            });
                          }
                        }
                      }}>
                        <div className="flex items-center gap-3"><Checkbox checked={feedingRoutes[r.key as keyof typeof feedingRoutes]} /><r.icon className={`h-8 w-8 text-${r.color}-600`} /><span className="font-semibold text-lg">{r.label}</span></div>
                      </div>
                    ))}
                  </div>
                  {!feedingRoutes.enteral && (feedingRoutes.oral || feedingRoutes.parenteral) && (
                    <p className="text-xs text-muted-foreground">Sem Enteral ativa, apenas uma via pode ser selecionada por vez.</p>
                  )}
                  {feedingRoutes.enteral && (feedingRoutes.oral || feedingRoutes.parenteral) && (
                    <p className="text-xs text-muted-foreground">Via Enteral ativa — Oral e Parenteral podem ser combinadas.</p>
                  )}
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>Voltar</Button>
                    <Button onClick={() => {
                      if (!completedSteps.includes(2)) setCompletedSteps([...completedSteps, 2]);
                      setCurrentStep(getNextStep(2));
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
                    {[{ v: "SNE", l: "Sonda Nasoenteral (SNE)" }, { v: "SNG", l: "Sonda Nasogástrica (SNG)" }, { v: "SOG", l: "Sonda Orogástrica (SOG)" }, { v: "GTT", l: "Gastrostomia (GTT)" }, { v: "JTT", l: "Jejunostomia (JTT)" }, { v: "VO", l: "Via Oral (VO - fórmulas infantis/suplementos)" }].map(a => (
                      <div key={a.v} className={`p-4 border-2 rounded-lg cursor-pointer ${enteralAccess === a.v ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setEnteralAccess(a.v)}>
                        <div className="flex items-center gap-3"><div className={`w-4 h-4 rounded-full border-2 ${enteralAccess === a.v ? "border-primary bg-primary" : "border-muted-foreground"}`} /><span className="font-medium">{a.l}</span></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(getPrevStep(3))}>Voltar</Button><Button onClick={() => completeStep(3)} disabled={!canProceed(3)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
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

                    </div>
                    <div className={`p-6 border-2 rounded-lg cursor-pointer ${systemType === "open" ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setSystemType("open")}>
                      <div className="flex items-center gap-3 mb-3"><div className={`w-5 h-5 rounded-full border-2 ${systemType === "open" ? "border-primary bg-primary" : "border-muted-foreground"}`} /><span className="font-semibold text-lg">Sistema Aberto</span></div>

                    </div>
                  </div>
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(getPrevStep(4))}>Voltar</Button><Button onClick={() => completeStep(4)} disabled={!canProceed(4)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
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
                  {bagCalculation && <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg"><p className="font-semibold text-blue-800">Volume prescrito para 24h: {bagCalculation.totalVolume} ml</p><p className="text-blue-700">A fórmula possui {bagCalculation.bagSize} ml por bolsa</p><p className="font-medium text-blue-800">Enviar para 24h: {bagCalculation.numBags} bolsa(s) necessárias</p></div>}
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
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(getPrevStep(5))}>Voltar</Button><Button onClick={() => completeStep(5)} disabled={!closedFormula.formulaId || !closedFormula.infusionMode || !closedFormula.rate || !closedFormula.duration}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
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
                          <div className="space-y-2"><Label>Diluir até (ml) - opcional</Label><Input type="number" value={f.diluteTo} onChange={e => updateOpenFormula(f.id, "diluteTo", e.target.value)} /></div>
                        </div>
                        <div className="space-y-2"><Label>Horários</Label><div className="flex flex-wrap gap-2">{SCHEDULE_TIMES.map(t => <Button key={t} variant={f.times.includes(t) ? "default" : "outline"} size="sm" onClick={() => toggleFormulaTime(f.id, t)}>{t}</Button>)}</div></div>
                        {f.formulaId && f.volume && f.times.length > 0 && <div className="text-sm text-muted-foreground bg-muted p-2 rounded">Subtotal: {(() => { const af = availableFormulas.find(x => x.id === f.formulaId); if (!af) return ""; const vol = parseFloat(f.volume) * f.times.length; return `${Math.round(vol * (af.composition.density || af.composition.calories / 100))} kcal, ${Math.round((vol / 100) * af.composition.protein * 10) / 10}g PTN`; })()}</div>}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(getPrevStep(5))}>Voltar</Button><Button onClick={() => completeStep(5)} disabled={!openInfusionMode || openFormulas.every(f => !f.formulaId)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
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
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(getPrevStep(6))}>Voltar</Button><Button onClick={() => completeStep(6)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
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
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(getPrevStep(7))}>Voltar</Button><Button onClick={() => completeStep(7)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 8 - Oral Prescription (FULL) */}
            {currentStep === 8 && feedingRoutes.oral && (
              <div className="space-y-6">
                {/* Total Ofertado Via Oral */}
                <Card className="border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50">
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-orange-700"><Calculator className="h-5 w-5" />Total Ofertado Via Oral</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                        <div className="text-3xl font-bold text-orange-600">{oralTotals.kcal.toFixed(0)}</div>
                        <div className="text-sm text-muted-foreground">kcal/dia</div>
                        {oralTotals.kcalPerKg > 0 && <div className="text-lg font-semibold text-orange-700 mt-1">{oralTotals.kcalPerKg.toFixed(1)} kcal/kg</div>}
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                        <div className="text-3xl font-bold text-blue-600">{oralTotals.protein.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">g proteínas/dia</div>
                        {oralTotals.proteinPerKg > 0 && <div className="text-lg font-semibold text-blue-700 mt-1">{oralTotals.proteinPerKg.toFixed(2)} g/kg</div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dados da Dieta Oral */}
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Utensils className="h-5 w-5" />Dados da Dieta Oral</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Consistência da dieta</Label><Input value={oralDietConsistency} onChange={e => setOralDietConsistency(e.target.value)} placeholder="Ex: Branda, Pastosa, Líquida" /></div>
                      <div className="space-y-2"><Label>Quantidade de refeições por dia</Label><Input type="number" min="1" max="12" value={oralMealsPerDay} onChange={e => setOralMealsPerDay(parseInt(e.target.value) || 6)} /></div>
                    </div>
                    <div className="space-y-2"><Label>Características</Label><Textarea value={oralDietCharacteristics} onChange={e => setOralDietCharacteristics(e.target.value)} placeholder="Ex: Hipossódica, Hipoglicidíca, Rica em fibras..." rows={2} /></div>
                  </CardContent>
                </Card>

                {/* Acompanhamento Fonoaudiológico */}
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Mic className="h-5 w-5" />Acompanhamento Fonoaudiológico</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label>Acompanhamento fonoaudiológico?</Label>
                      <div className="flex items-center gap-2"><Checkbox checked={!oralSpeechTherapy} onCheckedChange={() => setOralSpeechTherapy(false)} /><span className="text-sm">Não</span></div>
                      <div className="flex items-center gap-2"><Checkbox checked={oralSpeechTherapy} onCheckedChange={() => setOralSpeechTherapy(true)} /><span className="text-sm">Sim</span></div>
                    </div>
                    {oralSpeechTherapy && (
                      <div className="pl-4 border-l-2 border-blue-200 space-y-4">
                        <div className="flex items-center gap-4">
                          <Label>Água com espessante?</Label>
                          <div className="flex items-center gap-2"><Checkbox checked={!oralNeedsThickener} onCheckedChange={() => setOralNeedsThickener(false)} /><span className="text-sm">Não</span></div>
                          <div className="flex items-center gap-2"><Checkbox checked={oralNeedsThickener} onCheckedChange={() => setOralNeedsThickener(true)} /><span className="text-sm">Sim</span></div>
                        </div>
                        {oralNeedsThickener && (
                          <div className="space-y-2"><Label>Consistência segura para água</Label><Input value={oralSafeConsistency} onChange={e => setOralSafeConsistency(e.target.value)} placeholder="Ex: Néctar, Mel, Pudim" /></div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Estimativas da Dieta */}
                <Card>
                  <CardHeader><CardTitle>Estimativas da Dieta</CardTitle><CardDescription>Valor estimado da alimentação oral (sem suplementos)</CardDescription></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Valor energético total estimado (kcal)</Label><Input type="number" value={oralEstimatedVET || ''} onChange={e => setOralEstimatedVET(parseInt(e.target.value) || 0)} placeholder="Ex: 1500" /></div>
                      <div className="space-y-2"><Label>Quantidade de proteínas (g/dia)</Label><Input type="number" value={oralEstimatedProtein || ''} onChange={e => setOralEstimatedProtein(parseInt(e.target.value) || 0)} placeholder="Ex: 60" /></div>
                    </div>
                  </CardContent>
                </Card>

                {/* Terapia Nutricional Via Oral */}
                <Card>
                  <CardHeader><CardTitle>Terapia Nutricional Via Oral</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label>Terapia nutricional via oral?</Label>
                      <div className="flex items-center gap-2"><Checkbox checked={!oralHasTherapy} onCheckedChange={() => setOralHasTherapy(false)} /><span className="text-sm">Não</span></div>
                      <div className="flex items-center gap-2"><Checkbox checked={oralHasTherapy} onCheckedChange={() => setOralHasTherapy(true)} /><span className="text-sm">Sim</span></div>
                    </div>

                    {oralHasTherapy && (
                      <div className="space-y-6 pt-4">
                        {/* Suplementos */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-lg font-semibold">Suplementos via oral</Label>
                            <Button variant="outline" size="sm" onClick={addOralSupplement} disabled={oralSupplements.length >= 3}><Plus className="h-4 w-4 mr-1" />Adicionar ({oralSupplements.length}/3)</Button>
                          </div>
                          {oralSupplements.map((sup, index) => (
                            <Card key={index} className="border-dashed">
                              <CardContent className="pt-4 space-y-4">
                                <div className="flex items-center justify-between">
                                  <Badge>Suplemento {index + 1}</Badge>
                                  <Button variant="ghost" size="icon" onClick={() => removeOralSupplement(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                                <Select value={sup.supplementId} onValueChange={val => updateOralSupplement(index, 'supplementId', val)}>
                                  <SelectTrigger><SelectValue placeholder="Selecione o suplemento" /></SelectTrigger>
                                  <SelectContent>{oralAvailableSupplements.map(f => <SelectItem key={f.id} value={f.id!}>{f.name} - {f.caloriesPerUnit}kcal/100ml</SelectItem>)}</SelectContent>
                                </Select>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1"><Label className="text-sm">Quantidade por oferta</Label><Input type="number" value={sup.amount || ''} onChange={e => updateOralSupplement(index, 'amount', e.target.value)} placeholder="Ex: 200" /></div>
                                  <div className="space-y-1"><Label className="text-sm">Unidade</Label><Select value={sup.unit || 'ml'} onValueChange={val => updateOralSupplement(index, 'unit', val)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ml">ml</SelectItem><SelectItem value="g">g</SelectItem></SelectContent></Select></div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm">Horários</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {ORAL_MEAL_SCHEDULES.map(meal => (
                                      <div key={meal.key} className="flex items-center gap-1">
                                        <Checkbox checked={sup.schedules[meal.key as keyof typeof sup.schedules] === true} onCheckedChange={checked => updateOralSupplement(index, `schedule_${meal.key}`, !!checked)} />
                                        <span className="text-sm">{meal.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        <Separator />

                        {/* Módulos */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-lg font-semibold">Módulos via oral</Label>
                            <Button variant="outline" size="sm" onClick={addOralModule} disabled={oralTherapyModules.length >= 3}><Plus className="h-4 w-4 mr-1" />Adicionar ({oralTherapyModules.length}/3)</Button>
                          </div>
                          {oralTherapyModules.map((om, index) => (
                            <Card key={index} className="border-dashed">
                              <CardContent className="pt-4 space-y-4">
                                <div className="flex items-center justify-between">
                                  <Badge variant="secondary">Módulo {index + 1}</Badge>
                                  <Button variant="ghost" size="icon" onClick={() => removeOralModule(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                                <Select value={om.moduleId} onValueChange={val => updateOralModule(index, 'moduleId', val)}>
                                  <SelectTrigger><SelectValue placeholder="Selecione o módulo" /></SelectTrigger>
                                  <SelectContent>{dbModules.map(m => <SelectItem key={m.id} value={m.id!}>{m.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1"><Label className="text-sm">Quantidade por oferta</Label><Input type="number" value={om.amount || ''} onChange={e => updateOralModule(index, 'amount', e.target.value)} placeholder="Ex: 10" /></div>
                                  <div className="space-y-1"><Label className="text-sm">Unidade</Label><Select value={om.unit || 'g'} onValueChange={val => updateOralModule(index, 'unit', val)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="g">g</SelectItem><SelectItem value="ml">ml</SelectItem></SelectContent></Select></div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm">Horários</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {ORAL_MEAL_SCHEDULES.map(meal => (
                                      <div key={meal.key} className="flex items-center gap-1">
                                        <Checkbox checked={om.schedules[meal.key as keyof typeof om.schedules] === true} onCheckedChange={checked => updateOralModule(index, `schedule_${meal.key}`, !!checked)} />
                                        <span className="text-sm">{meal.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Observações */}
                    <div className="space-y-2 pt-4"><Label>Observações</Label><Textarea value={oralObservations} onChange={e => setOralObservations(e.target.value)} placeholder="Anotações sobre a dieta oral..." rows={3} /></div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(getPrevStep(8))}>Voltar</Button>
                  <Button onClick={() => completeStep(8)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}

            {/* Step 9 - Parenteral Prescription (FULL) */}
            {currentStep === 9 && feedingRoutes.parenteral && (
              <div className="space-y-6">
                {/* Resumo da Prescrição */}
                <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-violet-50">
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-purple-700"><Calculator className="h-5 w-5" />Resumo da Prescrição</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                        <div className="text-2xl font-bold text-purple-600">{parenteralVET.toFixed(0)}</div>
                        <div className="text-xs text-muted-foreground">kcal/dia</div>
                        {parenteralPerKg.kcal > 0 && <div className="text-sm font-semibold text-purple-700">{parenteralPerKg.kcal.toFixed(1)} kcal/kg</div>}
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                        <div className="text-2xl font-bold text-blue-600">{parenteralAminoacids.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">g aminoácidos/dia</div>
                        {parenteralPerKg.amino > 0 && <div className="text-sm font-semibold text-blue-700">{parenteralPerKg.amino.toFixed(2)} g/kg</div>}
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                        <div className="text-2xl font-bold text-amber-600">{parenteralLipids.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">g lipídeos/dia</div>
                        {parenteralPerKg.lipids > 0 && <div className="text-sm font-semibold text-amber-700">{parenteralPerKg.lipids.toFixed(2)} g/kg</div>}
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                        <div className="text-2xl font-bold text-green-600">{parenteralGlucose.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">g glicose/dia</div>
                        {parenteralPerKg.glucose > 0 && <div className="text-sm font-semibold text-green-700">{parenteralPerKg.glucose.toFixed(2)} g/kg</div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Acesso Venoso */}
                <Card>
                  <CardHeader><CardTitle>Acesso Venoso</CardTitle></CardHeader>
                  <CardContent>
                    <RadioGroup value={parenteralAccess} onValueChange={(v) => setParenteralAccess(v as typeof parenteralAccess)} className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="central" id="pn-central" /><Label htmlFor="pn-central" className="cursor-pointer"><Badge variant="default">Central</Badge></Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="peripheral" id="pn-peripheral" /><Label htmlFor="pn-peripheral" className="cursor-pointer"><Badge variant="secondary">Periférico</Badge></Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="picc" id="pn-picc" /><Label htmlFor="pn-picc" className="cursor-pointer"><Badge variant="outline">PICC</Badge></Label></div>
                    </RadioGroup>
                    {parenteralAccess === 'peripheral' && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700">
                        <AlertCircle className="h-4 w-4" /><span className="text-sm font-medium">Atenção: Acesso periférico limita osmolaridade da solução</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tempo de Infusão */}
                <Card>
                  <CardHeader><CardTitle>Tempo de Infusão da Bolsa</CardTitle><CardDescription>Defina o tempo total de infusão da bolsa</CardDescription></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Input type="number" min="1" max="24" value={parenteralInfusionTime} onChange={e => setParenteralInfusionTime(parseInt(e.target.value) || 24)} className="w-24" />
                      <span className="text-lg">horas</span>
                      {parenteralInfusionTime === 24 && <Badge variant="secondary">Infusão contínua</Badge>}
                      {parenteralInfusionTime < 24 && parenteralInfusionTime > 0 && <Badge variant="outline">Infusão cíclica</Badge>}
                    </div>
                  </CardContent>
                </Card>

                {/* Composição da NP */}
                <Card>
                  <CardHeader><CardTitle>Composição da NP</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>VET (kcal/dia)</Label>
                        <Input type="number" value={parenteralVET ? parenteralVET.toFixed(0) : ''} readOnly placeholder="Calculado automaticamente" />
                        <p className="text-xs text-muted-foreground">Cálculo automático: aminoácidos x 4 + lipídeos x 9 + glicose x 3.4</p>
                        {selectedPatient?.weight && <p className="text-xs text-muted-foreground">= {parenteralPerKg.kcal.toFixed(1)} kcal/kg</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Aminoácidos (g/dia)</Label>
                        <Input type="number" step="0.1" value={parenteralAminoacids || ''} onChange={e => setParenteralAminoacids(parseFloat(e.target.value) || 0)} placeholder="Ex: 80" />
                        {selectedPatient?.weight && <p className="text-xs text-muted-foreground">= {parenteralPerKg.amino.toFixed(2)} g/kg</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Lipídeos (g/dia)</Label>
                        <Input type="number" step="0.1" value={parenteralLipids || ''} onChange={e => setParenteralLipids(parseFloat(e.target.value) || 0)} placeholder="Ex: 60" />
                        {selectedPatient?.weight && <p className="text-xs text-muted-foreground">= {parenteralPerKg.lipids.toFixed(2)} g/kg</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Glicose (g/dia)</Label>
                        <Input type="number" step="1" value={parenteralGlucose || ''} onChange={e => setParenteralGlucose(parseFloat(e.target.value) || 0)} placeholder="Ex: 200" />
                        {selectedPatient?.weight && <p className="text-xs text-muted-foreground">= {parenteralPerKg.glucose.toFixed(2)} g/kg</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Observações */}
                <Card>
                  <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
                  <CardContent>
                    <Textarea value={parenteralObservations} onChange={e => setParenteralObservations(e.target.value)} placeholder="Anotações sobre a prescrição parenteral..." rows={4} />
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(getPrevStep(9))}>Voltar</Button>
                  <Button onClick={() => completeStep(9)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}

            {/* Step 10 - Summary */}
            {currentStep === 10 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-6 w-6 text-primary" />Resumo da Prescrição Nutricional</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {selectedPatient && <div className="p-4 bg-muted rounded-lg"><p className="font-semibold">{selectedPatient.name}</p><p className="text-sm text-muted-foreground">{selectedPatient.bed} - Peso: {selectedPatient.weight}kg {bmi && `(IMC: ${bmi.toFixed(1)})`} {idealWeight && `(PI: ${idealWeight.toFixed(1)}kg)`}</p></div>}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-primary/10 rounded-lg text-center"><p className="text-2xl font-bold text-primary">{nutritionSummary.vet}</p><p className="text-sm text-muted-foreground">({nutritionSummary.vetPerKg} kcal/kg)</p><p className="text-xs font-medium mt-1">VET</p></div>
                    <div className="p-4 bg-blue-100 rounded-lg text-center"><p className="text-2xl font-bold text-blue-700">{nutritionSummary.protein}g</p><p className="text-sm text-muted-foreground">({nutritionSummary.proteinPerKg} g/kg)</p><p className="text-xs font-medium mt-1">Proteínas</p></div>
                    <div className="p-4 bg-cyan-100 rounded-lg text-center"><p className="text-2xl font-bold text-cyan-700">{nutritionSummary.freeWater}ml</p><p className="text-sm text-muted-foreground">({nutritionSummary.freeWaterPerKg} ml/kg)</p><p className="text-xs font-medium mt-1">Água Livre</p></div>
                    <div className="p-4 bg-green-100 rounded-lg text-center"><p className="text-2xl font-bold text-green-700">{feedingRoutes.enteral ? `${nutritionSummary.residueTotal.toFixed(1)}g` : "-"}</p><p className="text-xs font-medium mt-1">{feedingRoutes.enteral ? "Resíduos Recicláveis" : "Resíduos (somente enteral)"}</p></div>
                  </div>
                  <Collapsible open={showDetails} onOpenChange={setShowDetails}><CollapsibleTrigger asChild><Button variant="outline" className="w-full"><ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showDetails ? "rotate-180" : ""}`} />{showDetails ? "Ocultar Detalhes" : "Mais Detalhes"}</Button></CollapsibleTrigger><CollapsibleContent className="mt-4 p-4 border rounded-lg space-y-2"><p><strong>Via:</strong> {feedingRoutes.enteral && `Enteral (${enteralAccess})`} {feedingRoutes.oral && "Oral"} {feedingRoutes.parenteral && "Parenteral"}</p>{systemType === "closed" && closedFormula.formulaId && <><p><strong>Fórmula:</strong> {availableFormulas.find(f => f.id === closedFormula.formulaId)?.name}</p><p><strong>Infusão:</strong> {closedFormula.rate} {closedFormula.infusionMode === "pump" ? "ml/h" : "gotas/min"} por {closedFormula.duration}h</p></>}{modules.length > 0 && <p><strong>Módulos:</strong> {modules.map(m => availableModules.find(am => am.id === m.moduleId)?.name).join(", ")}</p>}{feedingRoutes.oral && <p><strong>Oral:</strong> {oralDietConsistency || 'Consistência não definida'} - {oralMealsPerDay} refeições/dia</p>}{feedingRoutes.parenteral && <p><strong>Parenteral:</strong> Acesso {parenteralAccess} - VET {parenteralVET.toFixed(0)} kcal - {parenteralInfusionTime}h infusão</p>}{feedingRoutes.enteral && <div className="pt-2"><p><strong>Resíduos (g/dia):</strong></p><p className="text-sm text-muted-foreground">Plástico: {nutritionSummary.residues.plastic.toFixed(1)}g | Papel: {nutritionSummary.residues.paper.toFixed(1)}g | Metal: {nutritionSummary.residues.metal.toFixed(1)}g | Vidro: {nutritionSummary.residues.glass.toFixed(1)}g</p></div>}</CollapsibleContent></Collapsible>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(getPrevStep(10))}>Voltar</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700"><Save className="h-4 w-4 mr-2" />{isSaving ? "Salvando..." : "Salvar Prescrição"}</Button>
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

export default PrescriptionNew;



