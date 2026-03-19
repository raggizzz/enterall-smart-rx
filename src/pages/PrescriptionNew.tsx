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
import { getAllFormulas, getAllModules, Formula as CatalogFormula, Module as CatalogModule } from "@/lib/formulasDatabase";
import { usePatients, usePrescriptions, useFormulas, useModules as useDbModules, useSupplies } from "@/hooks/useDatabase";
import { Patient, Prescription, OralSupplementSchedule, OralModuleSchedule } from "@/lib/database";
import {
  addNutritionAccumulators,
  calculateFormulaNutrition,
  calculateModuleNutrition,
  createNutritionAccumulator,
  finalizeNutritionTotals,
} from "@/lib/prescriptionCalculations";

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

const isPersistedDbId = (value?: string) => Boolean(value && !value.startsWith("local-"));

const SCHEDULE_TIMES = ["03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00"];
type TherapyType = Prescription["therapyType"];
type ExtendedCatalogFormula = CatalogFormula & {
  macronutrientComplexity?: "polymeric" | "oligomeric";
  ageGroup?: "adult" | "pediatric" | "infant";
  administrationRoutes?: Array<"enteral" | "oral" | "translactation">;
  fiberType?: string;
  specialCharacteristics?: string;
  density?: number;
  caloriesPerUnit?: number;
  proteinPerUnit?: number;
  proteinPct?: number;
  carbPerUnit?: number;
  carbPct?: number;
  fatPerUnit?: number;
  fatPct?: number;
  fiberPerUnit?: number;
  waterContent?: number;
  sodiumPerUnit?: number;
  potassiumPerUnit?: number;
  calciumPerUnit?: number;
  phosphorusPerUnit?: number;
  plasticG?: number;
  paperG?: number;
  metalG?: number;
  glassG?: number;
  proteinSources?: string;
  carbSources?: string;
  fatSources?: string;
  fiberSources?: string;
};

type ExtendedCatalogModule = CatalogModule & {
  carbs?: number;
  fat?: number;
  calcium?: number;
  phosphorus?: number;
  proteinSources?: string;
  carbSources?: string;
  fatSources?: string;
  fiberSources?: string;
};

const sortByMostRecentStartDate = (left: Prescription, right: Prescription) =>
  (right.startDate || "").localeCompare(left.startDate || "");

const normalizeCatalogKey = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();

const normalizeFormulaType = (type?: string): CatalogFormula["type"] => {
  switch (type) {
    case "high-protein":
    case "high-calorie":
    case "diabetic":
    case "renal":
    case "peptide":
    case "fiber":
    case "immune":
    case "standard":
    case "oral-supplement":
    case "infant-formula":
      return type;
    case "supplement":
      return "high-calorie";
    default:
      return "standard";
  }
};

const normalizeSystemType = (systemType?: string, formulaTypes?: string[]): CatalogFormula["systemType"] => {
  if (systemType === "open" && (!formulaTypes || formulaTypes.length === 0)) {
    return "both";
  }

  if (systemType === "open" || systemType === "closed" || systemType === "both") {
    return systemType;
  }

  if (formulaTypes?.includes("closed") && formulaTypes?.includes("open")) return "both";
  if (formulaTypes?.includes("closed")) return "closed";
  if (formulaTypes?.includes("open")) return "open";
  return "both";
};

const getPatientAgeYears = (patient?: Patient | null) => {
  if (!patient?.dob) return undefined;
  const birth = new Date(patient.dob);
  if (Number.isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
};

const getSuggestedAgeGroup = (patient?: Patient | null): ExtendedCatalogFormula["ageGroup"] | undefined => {
  const age = getPatientAgeYears(patient);
  if (age === undefined) return undefined;
  if (age < 2) return "infant";
  if (age < 18) return "pediatric";
  return "adult";
};

const allowsAdministrationRoute = (
  formula: Pick<ExtendedCatalogFormula, "administrationRoutes">,
  route: "enteral" | "oral" | "translactation",
) => {
  if (!formula.administrationRoutes || formula.administrationRoutes.length === 0) {
    return true;
  }

  if (formula.administrationRoutes.includes(route)) {
    return true;
  }

  return route === "translactation" && formula.administrationRoutes.includes("oral");
};

const buildFallbackCatalogFormula = (formula: any): ExtendedCatalogFormula => {
  const density = formula.density || formula.caloriesPerUnit || 1;
  const proteinPer100 = typeof formula.proteinPerUnit === "number"
    ? (formula.proteinPerUnit <= 1 ? formula.proteinPerUnit * 100 : formula.proteinPerUnit)
    : 0;

  return {
    id: formula.id,
    code: formula.code,
    name: formula.name || "",
    manufacturer: formula.manufacturer || "",
    type: normalizeFormulaType(formula.type),
    classification: formula.classification,
    macronutrientComplexity: formula.macronutrientComplexity,
    ageGroup: formula.ageGroup,
    systemType: normalizeSystemType(formula.systemType, formula.formulaTypes),
    formulaTypes: formula.formulaTypes,
    administrationRoutes: formula.administrationRoutes,
    presentationForm: formula.presentationForm,
    presentations: Array.isArray(formula.presentations) && formula.presentations.length > 0 ? formula.presentations : [1000],
    presentationDescription: formula.presentationDescription,
    description: formula.description,
    billingUnit: formula.billingUnit,
    conversionFactor: formula.conversionFactor,
    billingPrice: formula.billingPrice,
    fiberType: formula.fiberType,
    specialCharacteristics: formula.specialCharacteristics,
    density,
    caloriesPerUnit: formula.caloriesPerUnit,
    proteinPerUnit: formula.proteinPerUnit,
    proteinPct: formula.proteinPct,
    carbPerUnit: formula.carbPerUnit,
    carbPct: formula.carbPct,
    fatPerUnit: formula.fatPerUnit,
    fatPct: formula.fatPct,
    fiberPerUnit: formula.fiberPerUnit,
    waterContent: formula.waterContent,
    sodiumPerUnit: formula.sodiumPerUnit,
    potassiumPerUnit: formula.potassiumPerUnit,
    calciumPerUnit: formula.calciumPerUnit,
    phosphorusPerUnit: formula.phosphorusPerUnit,
    plasticG: formula.plasticG,
    paperG: formula.paperG,
    metalG: formula.metalG,
    glassG: formula.glassG,
    proteinSources: formula.proteinSources,
    carbSources: formula.carbSources,
    fatSources: formula.fatSources,
    fiberSources: formula.fiberSources,
    composition: {
      calories: Math.round(density * 100),
      density,
      protein: proteinPer100,
      carbohydrates: typeof formula.carbPerUnit === "number"
        ? (formula.carbPerUnit <= 1 ? formula.carbPerUnit * 100 : formula.carbPerUnit)
        : undefined,
      fat: typeof formula.fatPerUnit === "number"
        ? (formula.fatPerUnit <= 1 ? formula.fatPerUnit * 100 : formula.fatPerUnit)
        : undefined,
      fiber: typeof formula.fiberPerUnit === "number"
        ? (formula.fiberPerUnit <= 1 ? formula.fiberPerUnit * 100 : formula.fiberPerUnit)
        : undefined,
      sodium: formula.sodiumPerUnit,
      potassium: formula.potassiumPerUnit,
      calcium: formula.calciumPerUnit,
      phosphorus: formula.phosphorusPerUnit,
      waterContent: formula.waterContent,
      osmolality: formula.osmolality,
    },
    residueInfo: {
      plastic: formula.plasticG || 0,
      paper: formula.paperG || 0,
      metal: formula.metalG || 0,
      glass: formula.glassG || 0,
    },
  };
};

const mergeFormulasWithCatalog = (dbFormulas: any[], staticFormulas: CatalogFormula[]): ExtendedCatalogFormula[] => {
  if (dbFormulas.length === 0) return staticFormulas;

  return dbFormulas.map((dbFormula) => {
    const dbKey = normalizeCatalogKey(dbFormula.code || dbFormula.name);
    const staticMatch = staticFormulas.find((formula) =>
      normalizeCatalogKey(formula.code) === dbKey || normalizeCatalogKey(formula.name) === dbKey,
    );

    if (!staticMatch) return buildFallbackCatalogFormula(dbFormula);

    return {
      ...staticMatch,
      id: dbFormula.id || staticMatch.id,
      code: dbFormula.code || staticMatch.code,
      manufacturer: dbFormula.manufacturer || staticMatch.manufacturer,
      type: normalizeFormulaType(dbFormula.type || staticMatch.type),
      classification: dbFormula.classification || staticMatch.classification,
      macronutrientComplexity: dbFormula.macronutrientComplexity ?? (staticMatch as ExtendedCatalogFormula).macronutrientComplexity,
      ageGroup: dbFormula.ageGroup ?? (staticMatch as ExtendedCatalogFormula).ageGroup,
      systemType: normalizeSystemType(dbFormula.systemType || staticMatch.systemType, dbFormula.formulaTypes || staticMatch.formulaTypes),
      formulaTypes: dbFormula.formulaTypes?.length ? dbFormula.formulaTypes : staticMatch.formulaTypes,
      administrationRoutes: dbFormula.administrationRoutes?.length ? dbFormula.administrationRoutes : (staticMatch as ExtendedCatalogFormula).administrationRoutes,
      presentationForm: dbFormula.presentationForm || staticMatch.presentationForm,
      presentations: dbFormula.presentations?.length ? dbFormula.presentations : staticMatch.presentations,
      presentationDescription: dbFormula.presentationDescription || staticMatch.presentationDescription,
      description: dbFormula.description || staticMatch.description,
      billingUnit: dbFormula.billingUnit || staticMatch.billingUnit,
      conversionFactor: dbFormula.conversionFactor ?? staticMatch.conversionFactor,
      billingPrice: dbFormula.billingPrice ?? staticMatch.billingPrice,
      fiberType: dbFormula.fiberType ?? (staticMatch as ExtendedCatalogFormula).fiberType,
      specialCharacteristics: dbFormula.specialCharacteristics ?? (staticMatch as ExtendedCatalogFormula).specialCharacteristics,
      density: dbFormula.density ?? staticMatch.composition.density,
      caloriesPerUnit: dbFormula.caloriesPerUnit ?? staticMatch.composition.calories,
      proteinPerUnit: dbFormula.proteinPerUnit ?? staticMatch.composition.protein,
      proteinPct: dbFormula.proteinPct ?? staticMatch.composition.proteinPct,
      carbPerUnit: dbFormula.carbPerUnit ?? staticMatch.composition.carbohydrates,
      carbPct: dbFormula.carbPct ?? staticMatch.composition.carbohydratesPct,
      fatPerUnit: dbFormula.fatPerUnit ?? staticMatch.composition.fat,
      fatPct: dbFormula.fatPct ?? staticMatch.composition.fatPct,
      fiberPerUnit: dbFormula.fiberPerUnit ?? staticMatch.composition.fiber,
      waterContent: dbFormula.waterContent ?? staticMatch.composition.waterContent,
      sodiumPerUnit: dbFormula.sodiumPerUnit ?? staticMatch.composition.sodium,
      potassiumPerUnit: dbFormula.potassiumPerUnit ?? staticMatch.composition.potassium,
      calciumPerUnit: dbFormula.calciumPerUnit ?? staticMatch.composition.calcium,
      phosphorusPerUnit: dbFormula.phosphorusPerUnit ?? staticMatch.composition.phosphorus,
      plasticG: dbFormula.plasticG ?? staticMatch.residueInfo?.plastic ?? 0,
      paperG: dbFormula.paperG ?? staticMatch.residueInfo?.paper ?? 0,
      metalG: dbFormula.metalG ?? staticMatch.residueInfo?.metal ?? 0,
      glassG: dbFormula.glassG ?? staticMatch.residueInfo?.glass ?? 0,
      proteinSources: dbFormula.proteinSources,
      carbSources: dbFormula.carbSources,
      fatSources: dbFormula.fatSources,
      fiberSources: dbFormula.fiberSources,
      composition: {
        ...staticMatch.composition,
        density: dbFormula.density ?? staticMatch.composition.density,
        calories: dbFormula.density ? dbFormula.density * 100 : staticMatch.composition.calories,
        protein: typeof dbFormula.proteinPerUnit === "number"
          ? (dbFormula.proteinPerUnit <= 1 ? dbFormula.proteinPerUnit * 100 : dbFormula.proteinPerUnit)
          : staticMatch.composition.protein,
        carbohydrates: typeof dbFormula.carbPerUnit === "number"
          ? (dbFormula.carbPerUnit <= 1 ? dbFormula.carbPerUnit * 100 : dbFormula.carbPerUnit)
          : staticMatch.composition.carbohydrates,
        fat: typeof dbFormula.fatPerUnit === "number"
          ? (dbFormula.fatPerUnit <= 1 ? dbFormula.fatPerUnit * 100 : dbFormula.fatPerUnit)
          : staticMatch.composition.fat,
        fiber: typeof dbFormula.fiberPerUnit === "number"
          ? (dbFormula.fiberPerUnit <= 1 ? dbFormula.fiberPerUnit * 100 : dbFormula.fiberPerUnit)
          : staticMatch.composition.fiber,
        sodium: dbFormula.sodiumPerUnit ?? staticMatch.composition.sodium,
        potassium: dbFormula.potassiumPerUnit ?? staticMatch.composition.potassium,
        calcium: dbFormula.calciumPerUnit ?? staticMatch.composition.calcium,
        phosphorus: dbFormula.phosphorusPerUnit ?? staticMatch.composition.phosphorus,
        waterContent: dbFormula.waterContent ?? staticMatch.composition.waterContent,
        osmolality: dbFormula.osmolality ?? staticMatch.composition.osmolality,
      },
      residueInfo: {
        plastic: dbFormula.plasticG ?? staticMatch.residueInfo?.plastic ?? 0,
        paper: dbFormula.paperG ?? staticMatch.residueInfo?.paper ?? 0,
        metal: dbFormula.metalG ?? staticMatch.residueInfo?.metal ?? 0,
        glass: dbFormula.glassG ?? staticMatch.residueInfo?.glass ?? 0,
      },
    };
  });
};

const mergeModulesWithCatalog = (dbModules: any[], staticModules: CatalogModule[]): ExtendedCatalogModule[] => {
  if (dbModules.length === 0) return staticModules;

  return dbModules.map((dbModule) => {
    const dbKey = normalizeCatalogKey(dbModule.name);
    const staticMatch = staticModules.find((module) => normalizeCatalogKey(module.name) === dbKey);

    return {
      ...(staticMatch || {
        id: dbModule.id,
        name: dbModule.name || "",
        density: dbModule.density || 0,
        referenceAmount: dbModule.referenceAmount || 0,
        referenceTimesPerDay: dbModule.referenceTimesPerDay || 0,
        calories: dbModule.calories || 0,
        protein: dbModule.protein || 0,
        sodium: dbModule.sodium || 0,
        potassium: dbModule.potassium || 0,
        fiber: dbModule.fiber || 0,
        freeWater: dbModule.freeWater || 0,
      }),
      id: dbModule.id || staticMatch?.id || "",
      name: dbModule.name || staticMatch?.name || "",
      density: dbModule.density ?? staticMatch?.density ?? 0,
      referenceAmount: dbModule.referenceAmount ?? staticMatch?.referenceAmount ?? 0,
      referenceTimesPerDay: dbModule.referenceTimesPerDay ?? staticMatch?.referenceTimesPerDay ?? 0,
      calories: dbModule.calories ?? staticMatch?.calories ?? 0,
      protein: dbModule.protein ?? staticMatch?.protein ?? 0,
      carbs: dbModule.carbs ?? (staticMatch as ExtendedCatalogModule | undefined)?.carbs,
      fat: dbModule.fat ?? (staticMatch as ExtendedCatalogModule | undefined)?.fat,
      sodium: dbModule.sodium ?? staticMatch?.sodium ?? 0,
      potassium: dbModule.potassium ?? staticMatch?.potassium ?? 0,
      calcium: dbModule.calcium ?? (staticMatch as ExtendedCatalogModule | undefined)?.calcium,
      phosphorus: dbModule.phosphorus ?? (staticMatch as ExtendedCatalogModule | undefined)?.phosphorus,
      fiber: dbModule.fiber ?? staticMatch?.fiber ?? 0,
      freeWater: dbModule.freeWater ?? staticMatch?.freeWater ?? 0,
      proteinSources: dbModule.proteinSources,
      carbSources: dbModule.carbSources,
      fatSources: dbModule.fatSources,
      fiberSources: dbModule.fiberSources,
    };
  });
};

const toFormulaCalculationInput = (formula: ExtendedCatalogFormula) => ({
  id: formula.id,
  name: formula.name,
  presentationForm: formula.presentationForm,
  density: formula.density ?? formula.composition.density,
  caloriesPerUnit: formula.caloriesPerUnit ?? formula.composition.calories,
  proteinPerUnit: formula.proteinPerUnit ?? formula.composition.protein,
  proteinPct: formula.proteinPct ?? formula.composition.proteinPct,
  carbPerUnit: formula.carbPerUnit ?? formula.composition.carbohydrates,
  carbPct: formula.carbPct ?? formula.composition.carbohydratesPct,
  fatPerUnit: formula.fatPerUnit ?? formula.composition.fat,
  fatPct: formula.fatPct ?? formula.composition.fatPct,
  fiberPerUnit: formula.fiberPerUnit ?? formula.composition.fiber,
  waterContent: formula.waterContent ?? formula.composition.waterContent,
  sodiumPerUnit: formula.sodiumPerUnit ?? formula.composition.sodium,
  potassiumPerUnit: formula.potassiumPerUnit ?? formula.composition.potassium,
  calciumPerUnit: formula.calciumPerUnit ?? formula.composition.calcium,
  phosphorusPerUnit: formula.phosphorusPerUnit ?? formula.composition.phosphorus,
  plasticG: formula.plasticG ?? formula.residueInfo?.plastic,
  paperG: formula.paperG ?? formula.residueInfo?.paper,
  metalG: formula.metalG ?? formula.residueInfo?.metal,
  glassG: formula.glassG ?? formula.residueInfo?.glass,
  proteinSources: formula.proteinSources,
  carbSources: formula.carbSources,
  fatSources: formula.fatSources,
  fiberSources: formula.fiberSources,
});

const PrescriptionNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient");
  const prescriptionIdFromUrl = searchParams.get("prescription");

  // Usar pacientes e prescricoes do banco de dados
  const { patients, isLoading: patientsLoading, updatePatient } = usePatients();
  const { prescriptions, createPrescription, updatePrescription } = usePrescriptions();
  const [isSaving, setIsSaving] = useState(false);
  const [editingPrescriptionIds, setEditingPrescriptionIds] = useState<Record<TherapyType, string | null>>({
    oral: null,
    enteral: null,
    parenteral: null,
  });
  const [editingStartDates, setEditingStartDates] = useState<Record<TherapyType, string | null>>({
    oral: null,
    enteral: null,
    parenteral: null,
  });
  const [hydratedFromPrescription, setHydratedFromPrescription] = useState(false);

  const staticFormulas = useMemo(() => getAllFormulas(), []);
  const staticModules = useMemo(() => getAllModules(), []);

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
  const [equipmentVolume, setEquipmentVolume] = useState("");

  // Summary expanded
  const [showDetails, setShowDetails] = useState(false);

  // --- Oral Inline State (Step 8) ---
  const [oralDietConsistency, setOralDietConsistency] = useState('');
  const [oralDietCharacteristics, setOralDietCharacteristics] = useState('');
  const [oralAdministrationRoute, setOralAdministrationRoute] = useState<'oral' | 'translactation'>('oral');
  const [oralDeliveryMethod, setOralDeliveryMethod] = useState<'cup' | 'baby-bottle' | 'feeding-bottle'>('cup');
  const [oralMealsPerDay, setOralMealsPerDay] = useState<number>(6);
  const [oralSpeechTherapy, setOralSpeechTherapy] = useState(false);
  const [oralNeedsThickener, setOralNeedsThickener] = useState(false);
  const [oralSafeConsistency, setOralSafeConsistency] = useState('');
  const [oralThickenerProduct, setOralThickenerProduct] = useState('');
  const [oralThickenerVolume, setOralThickenerVolume] = useState('');
  const [oralThickenerTimes, setOralThickenerTimes] = useState<string[]>([]);
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
    if (!w) return { kcal: 0, amino: 0, lipids: 0, glucose: 0, tig: 0 };
    return {
      kcal: parenteralVET / w,
      amino: parenteralAminoacids / w,
      lipids: parenteralLipids / w,
      glucose: parenteralGlucose / w,
      tig: (parenteralGlucose * 1000) / (w * 1440),
    };
  }, [parenteralVET, parenteralAminoacids, parenteralLipids, parenteralGlucose, selectedPatient?.weight]);

  // --- DB hooks for oral supplements ---
  const { formulas: dbFormulas } = useFormulas();
  const { modules: dbModules } = useDbModules();
  const { supplies } = useSupplies();
  const availableFormulas = useMemo<ExtendedCatalogFormula[]>(
    () => mergeFormulasWithCatalog(dbFormulas, staticFormulas),
    [dbFormulas, staticFormulas],
  );
  const availableModules = useMemo<ExtendedCatalogModule[]>(
    () => mergeModulesWithCatalog(dbModules, staticModules),
    [dbModules, staticModules],
  );

  const ORAL_MEAL_SCHEDULES = useMemo(() => [
    { key: 'breakfast', label: 'Desjejum' },
    { key: 'midMorning', label: 'Colação' },
    { key: 'lunch', label: 'Almoço' },
    { key: 'afternoon', label: 'Merenda' },
    { key: 'dinner', label: 'Jantar' },
    { key: 'supper', label: 'Ceia' },
  ], []);

  const suggestedAgeGroup = useMemo(() => getSuggestedAgeGroup(selectedPatient), [selectedPatient]);
  const suggestedAgeGroupLabel = suggestedAgeGroup === "infant"
    ? "Infantil"
    : suggestedAgeGroup === "pediatric"
      ? "Pediatrico"
      : suggestedAgeGroup === "adult"
        ? "Adulto"
        : null;

  const formulaMatchesPatient = useCallback((formula: ExtendedCatalogFormula) => {
    if (!formula.ageGroup || !suggestedAgeGroup) return true;
    return formula.ageGroup === suggestedAgeGroup;
  }, [suggestedAgeGroup]);

  const enteralAvailableClosedFormulas = useMemo(() => {
    return availableFormulas.filter((formula) =>
      (formula.systemType === "closed" || formula.systemType === "both")
      && formulaMatchesPatient(formula)
      && allowsAdministrationRoute(formula, "enteral"),
    );
  }, [availableFormulas, formulaMatchesPatient]);

  const enteralAvailableOpenFormulas = useMemo(() => {
    return availableFormulas.filter((formula) =>
      (formula.systemType === "open" || formula.systemType === "both")
      && formulaMatchesPatient(formula)
      && allowsAdministrationRoute(formula, "enteral"),
    );
  }, [availableFormulas, formulaMatchesPatient]);

  const oralAvailableSupplements = useMemo(() => {
    return availableFormulas.filter((formula) =>
      [
        "standard",
        "high-protein",
        "high-calorie",
        "diabetic",
        "renal",
        "fiber",
        "immune",
        "peptide",
        "oral-supplement",
        "infant-formula",
      ].includes(formula.type)
      && formulaMatchesPatient(formula)
      && allowsAdministrationRoute(formula, oralAdministrationRoute),
    );
  }, [availableFormulas, formulaMatchesPatient, oralAdministrationRoute]);

  const thickenerSupplies = useMemo(
    () => supplies.filter((supply) => supply.category === "thickener" && supply.isActive !== false),
    [supplies],
  );

  const shouldShowInfantFeedingControls = useMemo(() => {
    if (suggestedAgeGroup === "infant") return true;
    return oralSupplements.some((supplement) => {
      const formula = availableFormulas.find((item) => item.id === supplement.supplementId);
      return formula?.type === "infant-formula" || formula?.ageGroup === "infant";
    });
  }, [availableFormulas, oralSupplements, suggestedAgeGroup]);

  const buildOralNutritionAccumulator = useCallback(() => {
    const totals = createNutritionAccumulator();

    totals.calories += oralEstimatedVET;
    totals.protein += oralEstimatedProtein;

    oralSupplements.forEach((supplement) => {
      const formula = availableFormulas.find((item) => item.id === supplement.supplementId);
      if (!formula) return;

      const totalAmount = (supplement.amount || 200) * Object.values(supplement.schedules).filter((value) => value === true).length;
      addNutritionAccumulators(totals, calculateFormulaNutrition(toFormulaCalculationInput(formula), totalAmount));
    });

    oralTherapyModules.forEach((oralModule) => {
      const moduleItem = availableModules.find((item) => item.id === oralModule.moduleId);
      if (!moduleItem) return;

      const totalAmount = (oralModule.amount || moduleItem.referenceAmount || 1)
        * Object.values(oralModule.schedules).filter((value) => value === true).length;
      addNutritionAccumulators(totals, calculateModuleNutrition(moduleItem, totalAmount));
    });

    if (oralNeedsThickener && oralThickenerVolume && oralThickenerTimes.length > 0) {
      totals.freeWater += (parseFloat(oralThickenerVolume) || 0) * oralThickenerTimes.length;
    }

    return totals;
  }, [
    oralEstimatedVET,
    oralEstimatedProtein,
    oralSupplements,
    oralTherapyModules,
    availableFormulas,
    availableModules,
    oralNeedsThickener,
    oralThickenerVolume,
    oralThickenerTimes,
  ]);

  const oralTotals = useMemo(
    () => finalizeNutritionTotals(buildOralNutritionAccumulator(), selectedPatient),
    [buildOralNutritionAccumulator, selectedPatient],
  );

  // Oral supplement handlers
  const addOralSupplement = () => {
    if (oralSupplements.length >= 3) { toast.error("Máximo de 3 suplementos"); return; }
    setOralSupplements([...oralSupplements, { supplementId: '', supplementName: '', amount: 200, unit: 'ml', schedules: {} }]);
  };
  const removeOralSupplement = (i: number) => setOralSupplements(oralSupplements.filter((_, idx) => idx !== i));
  const updateOralSupplement = (i: number, field: string, value: any) => {
    const updated = [...oralSupplements];
    if (field === 'supplementId') {
      const formula = availableFormulas.find(f => f.id === value);
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
      const mod = availableModules.find(m => m.id === value);
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

  const toggleOralThickenerTime = (time: string) => {
    setOralThickenerTimes((current) =>
      current.includes(time)
        ? current.filter((item) => item !== time)
        : [...current, time].sort(),
    );
  };

  useEffect(() => {
    if (!oralNeedsThickener) {
      setOralThickenerProduct('');
      setOralThickenerVolume('');
      setOralThickenerTimes([]);
    }
  }, [oralNeedsThickener]);

  useEffect(() => {
    if (!shouldShowInfantFeedingControls && oralAdministrationRoute === "translactation") {
      setOralAdministrationRoute("oral");
    }
    if (!shouldShowInfantFeedingControls) {
      setOralDeliveryMethod("cup");
    }
  }, [oralAdministrationRoute, shouldShowInfantFeedingControls]);

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

  const applyLoadedPrescription = useCallback((prescription: Prescription, options?: { editMode?: boolean; resetRoutes?: boolean }) => {
    const editMode = options?.editMode ?? false;
    const resetRoutes = options?.resetRoutes ?? false;

    if (resetRoutes) {
      setFeedingRoutes({
        oral: prescription.therapyType === "oral",
        enteral: prescription.therapyType === "enteral",
        parenteral: prescription.therapyType === "parenteral",
      });
    } else {
      setFeedingRoutes((current) => ({
        oral: current.oral || prescription.therapyType === "oral",
        enteral: current.enteral || prescription.therapyType === "enteral",
        parenteral: current.parenteral || prescription.therapyType === "parenteral",
      }));
    }

    if (editMode) {
      setEditingPrescriptionIds((current) => ({
        ...current,
        [prescription.therapyType]: prescription.id || null,
      }));
      setEditingStartDates((current) => ({
        ...current,
        [prescription.therapyType]: prescription.startDate || null,
      }));
    }

    if (prescription.therapyType === "enteral") {
      const enteralDetails = prescription.enteralDetails;
      setEnteralAccess(enteralDetails?.access || prescription.feedingRoute || "");
      setSystemType(enteralDetails?.systemType || prescription.systemType || "");

      if ((enteralDetails?.systemType || prescription.systemType) === "closed") {
        const firstFormula = prescription.formulas?.[0];
        const bagQuantities = enteralDetails?.closedFormula?.bagQuantities || (firstFormula?.schedules || []).reduce((acc, time) => {
          acc[time] = (acc[time] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setClosedFormula({
          formulaId: enteralDetails?.closedFormula?.formulaId || firstFormula?.formulaId || "",
          infusionMode: enteralDetails?.closedFormula?.infusionMode || (prescription.infusionMode === "gravity" ? "gravity" : prescription.infusionMode === "pump" ? "pump" : ""),
          rate: enteralDetails?.closedFormula?.rate || (prescription.infusionRateMlH ? String(prescription.infusionRateMlH) : ""),
          duration: enteralDetails?.closedFormula?.duration || (prescription.infusionHoursPerDay ? String(prescription.infusionHoursPerDay) : ""),
          bagQuantities,
        });

        setOpenInfusionMode("");
        setOpenDurationPerStep("");
        setOpenFormulas([{ id: "1", formulaId: "", volume: "", diluteTo: "", times: [] }]);
      } else {
        setOpenInfusionMode(enteralDetails?.infusionMode || (prescription.infusionMode as "pump" | "gravity" | "bolus" | "") || "");
        setOpenDurationPerStep(enteralDetails?.openDurationPerStep || (prescription.infusionHoursPerDay ? String(prescription.infusionHoursPerDay) : ""));
        setOpenFormulas(
          enteralDetails?.openFormulas && enteralDetails.openFormulas.length > 0
            ? enteralDetails.openFormulas.map((formula, index) => ({
              id: `loaded-formula-${index + 1}`,
              formulaId: formula.formulaId || "",
              volume: formula.volume || "",
              diluteTo: formula.diluteTo || "",
              times: formula.times || [],
            }))
            : prescription.formulas && prescription.formulas.length > 0
            ? prescription.formulas.map((formula, index) => ({
              id: `loaded-formula-${index + 1}`,
              formulaId: formula.formulaId,
              volume: formula.volume ? String(formula.volume) : "",
              diluteTo: "",
              times: formula.schedules || [],
            }))
            : [{ id: "1", formulaId: "", volume: "", diluteTo: "", times: [] }],
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
        (enteralDetails?.modules || []).length > 0
          ? (enteralDetails?.modules || []).map((module, index) => ({
            id: `loaded-module-${index + 1}`,
            moduleId: module.moduleId || "",
            quantity: module.quantity || "",
            unit: module.unit || "g",
            times: module.times || [],
          }))
          : (prescription.modules || []).map((module, index) => ({
          id: `loaded-module-${index + 1}`,
          moduleId: module.moduleId,
          quantity: module.amount ? String(module.amount) : "",
          unit: module.unit || "g",
          times: module.schedules || SCHEDULE_TIMES.slice(0, Math.max(0, module.timesPerDay || 0)),
        })),
      );

      setHydration({
        volume: enteralDetails?.hydration?.volume || (prescription.hydrationVolume ? String(prescription.hydrationVolume) : ""),
        times: enteralDetails?.hydration?.times || prescription.hydrationSchedules || [],
      });
      setEquipmentVolume(
        enteralDetails?.equipmentVolume
          ? String(enteralDetails.equipmentVolume)
          : prescription.equipmentVolume
            ? String(prescription.equipmentVolume)
            : "",
      );
    }

    if (prescription.therapyType === "oral") {
      const oralDetails = prescription.oralDetails;
      setOralAdministrationRoute(oralDetails?.administrationRoute || "oral");
      setOralDeliveryMethod(oralDetails?.deliveryMethod || "cup");
      setOralDietConsistency(oralDetails?.dietConsistency || "");
      setOralDietCharacteristics(oralDetails?.dietCharacteristics || "");
      setOralMealsPerDay(oralDetails?.mealsPerDay || 6);
      setOralSpeechTherapy(Boolean(oralDetails?.speechTherapy));
      setOralNeedsThickener(Boolean(oralDetails?.needsThickener));
      setOralSafeConsistency(oralDetails?.safeConsistency || "");
      setOralThickenerProduct(oralDetails?.thickenerProduct || "");
      setOralThickenerVolume(oralDetails?.thickenerVolume ? String(oralDetails.thickenerVolume) : "");
      setOralThickenerTimes(oralDetails?.thickenerTimes || []);
      setOralEstimatedVET(oralDetails?.estimatedVET ?? prescription.totalCalories ?? 0);
      setOralEstimatedProtein(oralDetails?.estimatedProtein ?? prescription.totalProtein ?? 0);
      setOralHasTherapy(Boolean(oralDetails?.hasOralTherapy));
      setOralObservations(oralDetails?.observations || "");
      setOralSupplements(
        (oralDetails?.supplements || []).length > 0
          ? (oralDetails?.supplements || [])
          : (prescription.formulas || []).map((formula) => ({
          supplementId: formula.formulaId,
          supplementName: formula.formulaName,
          amount: formula.volume || 0,
          unit: "ml",
          schedules: (formula.schedules || []).reduce((acc, schedule) => {
            const meal = ORAL_MEAL_SCHEDULES.find((entry) => entry.label === schedule || entry.key === schedule);
            if (meal) acc[meal.key as keyof OralSupplementSchedule["schedules"]] = true;
            return acc;
          }, {} as OralSupplementSchedule["schedules"]),
        })),
      );
      setOralTherapyModules(
        (oralDetails?.modules || []).length > 0
          ? (oralDetails?.modules || [])
          : (prescription.modules || []).map((module) => ({
          moduleId: module.moduleId,
          moduleName: module.moduleName,
          amount: module.amount || 0,
          unit: module.unit || "g",
          schedules: (module.schedules || []).reduce((acc, schedule) => {
            const meal = ORAL_MEAL_SCHEDULES.find((entry) => entry.label === schedule || entry.key === schedule);
            if (meal) acc[meal.key as keyof OralModuleSchedule["schedules"]] = true;
            return acc;
          }, {} as OralModuleSchedule["schedules"]),
        })),
      );
    }

    if (prescription.therapyType === "parenteral") {
      const parenteralDetails = prescription.parenteralDetails;
      setParenteralAccess(parenteralDetails?.access || (prescription.feedingRoute as "central" | "peripheral" | "picc") || "central");
      setParenteralInfusionTime(Math.round(parenteralDetails?.infusionTime || prescription.infusionHoursPerDay || 24));
      setParenteralAminoacids(parenteralDetails?.aminoacidsG ?? prescription.totalProtein ?? 0);
      setParenteralLipids(parenteralDetails?.lipidsG ?? prescription.totalFat ?? 0);
      setParenteralGlucose(parenteralDetails?.glucoseG ?? prescription.totalCarbs ?? 0);
      setParenteralObservations(parenteralDetails?.observations || prescription.notes || "");
    }

    setCompletedSteps([1, 2]);
    setCurrentStep(2);
  }, [ORAL_MEAL_SCHEDULES]);

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

  const hydratePatientPrescriptions = useCallback((patientPrescriptions: Prescription[]) => {
    if (patientPrescriptions.length === 0) return;

    setFeedingRoutes({ oral: false, enteral: false, parenteral: false });
    setEditingPrescriptionIds({ oral: null, enteral: null, parenteral: null });
    setEditingStartDates({ oral: null, enteral: null, parenteral: null });

    patientPrescriptions
      .sort(sortByMostRecentStartDate)
      .forEach((prescription, index) => {
        applyLoadedPrescription(prescription, { editMode: true, resetRoutes: index === 0 });
      });
  }, [applyLoadedPrescription]);

  useEffect(() => {
    const resolvedPatientId = selectedPatient?.id || patientId;
    if (hydratedFromPrescription || patients.length === 0 || prescriptions.length === 0 || !resolvedPatientId) return;

    const targetPrescription = prescriptionIdFromUrl
      ? prescriptions.find((prescription) => prescription.id === prescriptionIdFromUrl)
      : undefined;

    const patient = patients.find((currentPatient) =>
      currentPatient.id === (targetPrescription?.patientId || resolvedPatientId),
    );
    if (!patient) return;

    setSelectedPatient(patient);
    setOralAdministrationRoute("oral");
    setOralDeliveryMethod("cup");
    setOralDietConsistency(patient.consistency || "");
    setOralSafeConsistency(patient.safeConsistency || "");
    setOralMealsPerDay(Number(patient.mealCount) || 6);
      setOralDietCharacteristics(patient.observation || "");
      setOralObservations(patient.observation || "");
      setOralSpeechTherapy(Boolean(patient.safeConsistency));
      setOralNeedsThickener(Boolean(patient.safeConsistency));
      setEquipmentVolume("");
      setOralThickenerProduct("");
      setOralThickenerVolume("");
      setOralThickenerTimes([]);

    const activeOrReferencedPrescriptions = prescriptions.filter((prescription) =>
      prescription.patientId === patient.id
      && (
        prescription.status === "active"
        || prescription.id === prescriptionIdFromUrl
      ),
    );

    if (activeOrReferencedPrescriptions.length > 0) {
      hydratePatientPrescriptions(activeOrReferencedPrescriptions);
    }

    setHydratedFromPrescription(true);
  }, [hydratedFromPrescription, patientId, selectedPatient?.id, patients, prescriptions, prescriptionIdFromUrl, hydratePatientPrescriptions]);

  const latestPrescriptionsByType = useMemo(() => {
    if (!selectedPatient?.id) return { enteral: undefined, oral: undefined, parenteral: undefined } as Record<TherapyType, Prescription | undefined>;

    const patientPrescriptions = prescriptions
      .filter((prescription) => prescription.patientId === selectedPatient.id)
      .sort(sortByMostRecentStartDate);

    return {
      enteral: patientPrescriptions.find((prescription) => prescription.therapyType === "enteral"),
      oral: patientPrescriptions.find((prescription) => prescription.therapyType === "oral"),
      parenteral: patientPrescriptions.find((prescription) => prescription.therapyType === "parenteral"),
    } satisfies Record<TherapyType, Prescription | undefined>;
  }, [selectedPatient, prescriptions]);

  const handleRepeatPrescription = (therapyType: TherapyType) => {
    const sourcePrescription = latestPrescriptionsByType[therapyType];
    if (!sourcePrescription) {
      toast.error(`Nenhuma prescrição anterior de ${therapyType === "enteral" ? "terapia enteral" : therapyType === "oral" ? "via oral" : "nutrição parenteral"} encontrada.`);
      return;
    }

    applyLoadedPrescription(sourcePrescription, { editMode: false });
    setEditingPrescriptionIds((current) => ({
      ...current,
      [therapyType]: null,
    }));
    setEditingStartDates((current) => ({
      ...current,
      [therapyType]: null,
    }));
    toast.success("Dados da prescrição anterior carregados para repetição.");
  };

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
    const totals = createNutritionAccumulator();

    if (feedingRoutes.enteral) {
      if (systemType === "closed" && closedFormula.formulaId) {
        const formula = availableFormulas.find((item) => item.id === closedFormula.formulaId);
        if (formula) {
          const rate = parseFloat(closedFormula.rate) || 0;
          const duration = parseFloat(closedFormula.duration) || 0;
          const totalAmount = closedFormula.infusionMode === "pump" ? rate * duration : (rate / 20) * 60 * duration;
          addNutritionAccumulators(totals, calculateFormulaNutrition(toFormulaCalculationInput(formula), totalAmount));
        }
      }

      if (systemType === "open") {
        openFormulas.forEach((entry) => {
          const formula = availableFormulas.find((item) => item.id === entry.formulaId);
          if (formula && entry.volume && entry.times.length > 0) {
            const totalAmount = parseFloat(entry.volume) * entry.times.length;
            addNutritionAccumulators(totals, calculateFormulaNutrition(toFormulaCalculationInput(formula), totalAmount));
          }
        });
      }

      modules.forEach((moduleEntry) => {
        const moduleItem = availableModules.find((item) => item.id === moduleEntry.moduleId);
        if (moduleItem && moduleEntry.quantity && moduleEntry.times.length > 0) {
          const totalAmount = parseFloat(moduleEntry.quantity) * moduleEntry.times.length;
          addNutritionAccumulators(totals, calculateModuleNutrition(moduleItem, totalAmount));
        }
      });

      if (hydration.volume && hydration.times.length > 0) {
        totals.freeWater += parseFloat(hydration.volume) * hydration.times.length;
      }
    }

    if (feedingRoutes.oral) {
      addNutritionAccumulators(totals, buildOralNutritionAccumulator());
    }

    if (feedingRoutes.parenteral) {
      totals.calories += parenteralVET;
      totals.protein += parenteralAminoacids;
      totals.carbs += parenteralGlucose;
      totals.fat += parenteralLipids;
    }

    return finalizeNutritionTotals(totals, selectedPatient);
  }, [systemType, closedFormula, openFormulas, modules, hydration, selectedPatient, availableFormulas, availableModules, feedingRoutes, buildOralNutritionAccumulator, parenteralVET, parenteralAminoacids, parenteralGlucose, parenteralLipids]);

  const bmi = nutritionSummary.weightMetrics.bmi;
  const idealWeight = nutritionSummary.weightMetrics.idealWeight;

  const sidebarSummary = useMemo(() => {
    if (currentStep === 8 && feedingRoutes.oral) {
      return {
        title: "Resumo da via oral",
        calories: oralTotals.vet.toFixed(0),
        caloriesPerKg: oralTotals.vetPerKg.toFixed(1),
        protein: oralTotals.protein.toFixed(1),
        proteinPerKg: oralTotals.proteinPerKg.toFixed(2),
        freeWater: "-",
        residues: "-",
      };
    }

    if (currentStep === 9 && feedingRoutes.parenteral) {
      return {
        title: "Resumo da parenteral",
        calories: parenteralVET.toFixed(0),
        caloriesPerKg: parenteralPerKg.kcal.toFixed(1),
        protein: parenteralAminoacids.toFixed(1),
        proteinPerKg: parenteralPerKg.amino.toFixed(2),
        freeWater: "-",
        residues: "-",
      };
    }

    if (feedingRoutes.enteral) {
      return {
        title: currentStep === 10 ? "Resumo das vias selecionadas" : "Resumo da enteral",
        calories: String(nutritionSummary.vet),
        caloriesPerKg: String(nutritionSummary.vetPerKg),
        protein: `${nutritionSummary.protein}`,
        proteinPerKg: String(nutritionSummary.proteinPerKg),
        freeWater: `${nutritionSummary.freeWater}ml`,
        residues: `${nutritionSummary.residueTotal.toFixed(1)}g`,
      };
    }

    return {
      title: "Resumo da prescrição",
      calories: String(nutritionSummary.vet),
      caloriesPerKg: String(nutritionSummary.vetPerKg),
      protein: `${nutritionSummary.protein}`,
      proteinPerKg: String(nutritionSummary.proteinPerKg),
      freeWater: `${nutritionSummary.freeWater}ml`,
      residues: feedingRoutes.enteral ? `${nutritionSummary.residueTotal.toFixed(1)}g` : "-",
    };
  }, [currentStep, feedingRoutes, oralTotals, parenteralVET, parenteralPerKg, parenteralAminoacids, nutritionSummary]);

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

    const sessionProfessionalName = typeof window !== "undefined" ? localStorage.getItem("userName") || undefined : undefined;
    const resolvedHospitalId = selectedPatient.hospitalId || undefined;

    if (!resolvedHospitalId) {
      toast.error("Paciente sem unidade vinculada. Atualize o cadastro do paciente antes de prescrever.");
      return;
    }

    setIsSaving(true);
    try {
      const hasPendingClosedFormula =
        feedingRoutes.enteral &&
        systemType === "closed" &&
        closedFormula.formulaId &&
        !isPersistedDbId(closedFormula.formulaId);

      const hasPendingOpenFormula = openFormulas.some((formula) => formula.formulaId && !isPersistedDbId(formula.formulaId));
      const hasPendingEnteralModule = modules.some((module) => module.moduleId && !isPersistedDbId(module.moduleId));
      const hasPendingOralFormula = oralSupplements.some((supplement) => supplement.supplementId && !isPersistedDbId(supplement.supplementId));
      const hasPendingOralModule = oralTherapyModules.some((module) => module.moduleId && !isPersistedDbId(module.moduleId));

      if (
        hasPendingClosedFormula ||
        hasPendingOpenFormula ||
        hasPendingEnteralModule ||
        hasPendingOralFormula ||
        hasPendingOralModule
      ) {
        toast.error("Sincronize formulas e modulos cadastrados antes de salvar a prescricao.");
        setIsSaving(false);
        return;
      }

      const enteralFormulas = feedingRoutes.enteral
        ? (systemType === 'closed' && closedFormula.formulaId ? [{
          formulaId: closedFormula.formulaId,
          formulaName: availableFormulas.find(f => f.id === closedFormula.formulaId)?.name || '',
          volume: parseFloat(closedFormula.rate) * parseFloat(closedFormula.duration) || 0,
          timesPerDay: Object.keys(closedFormula.bagQuantities).length || 1,
          schedules: Object.keys(closedFormula.bagQuantities)
        }] : openFormulas.filter(f => isPersistedDbId(f.formulaId)).map(f => ({
          formulaId: f.formulaId,
          formulaName: availableFormulas.find(af => af.id === f.formulaId)?.name || '',
          volume: parseFloat(f.volume) || 0,
          timesPerDay: f.times.length,
          schedules: f.times
        })))
        : [];

      const enteralModules = feedingRoutes.enteral
        ? modules.filter(m => isPersistedDbId(m.moduleId)).map(m => ({
          moduleId: m.moduleId,
          moduleName: availableModules.find(am => am.id === m.moduleId)?.name || '',
          amount: parseFloat(m.quantity) || 0,
          timesPerDay: m.times.length,
          schedules: m.times,
          unit: m.unit
        }))
        : [];

      const mealLabelByKey = Object.fromEntries(ORAL_MEAL_SCHEDULES.map((entry) => [entry.key, entry.label]));
      const oralFormulas = feedingRoutes.oral
        ? oralSupplements
          .filter((supplement) => isPersistedDbId(supplement.supplementId))
          .map((supplement) => {
            const activeSchedules = Object.entries(supplement.schedules || {})
              .filter(([, enabled]) => enabled === true)
              .map(([key]) => mealLabelByKey[key] || key);
            return {
              formulaId: supplement.supplementId,
              formulaName: supplement.supplementName,
              volume: supplement.amount || 0,
              timesPerDay: activeSchedules.length,
              schedules: activeSchedules,
            };
          })
        : [];

      const oralModulesPayload = feedingRoutes.oral
        ? oralTherapyModules
          .filter((module) => isPersistedDbId(module.moduleId))
          .map((module) => {
            const activeSchedules = Object.entries(module.schedules || {})
              .filter(([, enabled]) => enabled === true)
              .map(([key]) => mealLabelByKey[key] || key);
            return {
              moduleId: module.moduleId,
              moduleName: module.moduleName,
              amount: module.amount || 0,
              timesPerDay: activeSchedules.length,
              schedules: activeSchedules,
              unit: module.unit || "g",
            };
          })
        : [];

      const basePrescriptionData = {
        hospitalId: resolvedHospitalId,
        professionalId: undefined,
        professionalName: sessionProfessionalName,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientRecord: selectedPatient.record,
        patientBed: selectedPatient.bed,
        patientWard: selectedPatient.ward,
        status: 'active' as const,
      };

      const today = new Date().toISOString().split('T')[0];
      const persistPrescription = async (therapyType: TherapyType, data: Record<string, unknown>) => {
        const payload = {
          ...basePrescriptionData,
          ...data,
          therapyType,
          startDate: editingStartDates[therapyType] || today,
        };

        if (editingPrescriptionIds[therapyType]) {
          await updatePrescription(editingPrescriptionIds[therapyType] as string, payload);
          return;
        }

        await createPrescription(payload as Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>);
      };

      const savedRoutes: string[] = [];

      if (feedingRoutes.enteral) {
        await persistPrescription("enteral", {
          systemType: systemType || 'open',
          feedingRoute: enteralAccess || undefined,
          infusionMode: (systemType === 'closed' ? closedFormula.infusionMode : openInfusionMode) || undefined,
          infusionRateMlH: systemType === 'closed' ? parseFloat(closedFormula.rate) || undefined : undefined,
          infusionHoursPerDay: systemType === 'closed' ? parseFloat(closedFormula.duration) || undefined : parseFloat(openDurationPerStep) || undefined,
          equipmentVolume: systemType === 'open' ? parseFloat(equipmentVolume) || undefined : undefined,
          formulas: enteralFormulas,
          modules: enteralModules,
          hydrationVolume: parseFloat(hydration.volume) || undefined,
          hydrationSchedules: hydration.times.length > 0 ? hydration.times : undefined,
          totalCalories: nutritionSummary.vet,
          totalProtein: nutritionSummary.protein,
          totalCarbs: nutritionSummary.carbs,
          totalFat: nutritionSummary.fat,
          totalFiber: nutritionSummary.fiber,
          totalFreeWater: nutritionSummary.freeWater,
          enteralDetails: {
            access: enteralAccess || undefined,
            systemType: systemType || undefined,
            infusionMode: (systemType === "closed" ? closedFormula.infusionMode : openInfusionMode) || undefined,
            equipmentVolume: systemType === "open" ? parseFloat(equipmentVolume) || undefined : undefined,
            openDurationPerStep: openDurationPerStep || undefined,
            closedFormula: systemType === "closed"
              ? {
                formulaId: closedFormula.formulaId || undefined,
                infusionMode: closedFormula.infusionMode || undefined,
                rate: closedFormula.rate || undefined,
                duration: closedFormula.duration || undefined,
                bagQuantities: closedFormula.bagQuantities,
              }
              : undefined,
            openFormulas: systemType === "open"
              ? openFormulas.map((formula) => ({
                formulaId: formula.formulaId || undefined,
                volume: formula.volume || undefined,
                diluteTo: formula.diluteTo || undefined,
                times: formula.times,
              }))
              : undefined,
            modules: modules.map((module) => ({
              moduleId: module.moduleId || undefined,
              quantity: module.quantity || undefined,
              unit: module.unit,
              times: module.times,
            })),
            hydration: {
              volume: hydration.volume || undefined,
              times: hydration.times,
            },
          },
          notes: `TNE: ${systemType === "closed" ? "sistema fechado" : "sistema aberto"} | Acesso: ${enteralAccess || "-"} | Infusão: ${(systemType === "closed" ? closedFormula.infusionMode : openInfusionMode) || "-"} | Volume para equipo: ${systemType === "open" ? (equipmentVolume || "-") : "n/a"} ml`,
        });
        savedRoutes.push("TNE");
      }

      if (feedingRoutes.oral) {
        await persistPrescription("oral", {
          systemType: "open",
          feedingRoute: "oral",
          formulas: oralFormulas,
          modules: oralModulesPayload,
          totalCalories: oralTotals.vet,
          totalProtein: oralTotals.protein,
          totalCarbs: oralTotals.carbs,
          totalFat: oralTotals.fat,
          totalFiber: oralTotals.fiber,
          totalFreeWater: oralTotals.freeWater,
          oralDetails: {
            administrationRoute: oralAdministrationRoute,
            deliveryMethod: shouldShowInfantFeedingControls ? oralDeliveryMethod : undefined,
            dietConsistency: oralDietConsistency || undefined,
            dietCharacteristics: oralDietCharacteristics || undefined,
            mealsPerDay: oralMealsPerDay,
            speechTherapy: oralSpeechTherapy,
            needsThickener: oralNeedsThickener,
            safeConsistency: oralSafeConsistency || undefined,
            thickenerProduct: oralNeedsThickener ? oralThickenerProduct || undefined : undefined,
            thickenerVolume: oralNeedsThickener ? parseFloat(oralThickenerVolume) || undefined : undefined,
            thickenerTimes: oralNeedsThickener && oralThickenerTimes.length > 0 ? oralThickenerTimes : undefined,
            estimatedVET: oralEstimatedVET || undefined,
            estimatedProtein: oralEstimatedProtein || undefined,
            hasOralTherapy: oralHasTherapy,
            supplements: oralSupplements,
            modules: oralTherapyModules,
            observations: oralObservations || undefined,
          },
          notes: `Via oral: ${oralAdministrationRoute === "translactation" ? "Translactacao" : "Oral"}${shouldShowInfantFeedingControls ? ` | Oferta: ${oralDeliveryMethod === "feeding-bottle" ? "Frasco" : oralDeliveryMethod === "baby-bottle" ? "Mamadeira" : "Copo"}` : ""} | Consistencia: ${oralDietConsistency || "-"} | Refeicoes: ${oralMealsPerDay}/dia | Caracteristicas: ${oralDietCharacteristics || "-"} | Fono: ${oralSpeechTherapy ? "Sim" : "Nao"} | Agua com espessante: ${oralNeedsThickener ? "Sim" : "Nao"}${oralNeedsThickener ? ` | Espessante: ${oralThickenerProduct || "-"} | Volume de agua: ${oralThickenerVolume || "-"} ml | Horarios: ${oralThickenerTimes.length > 0 ? oralThickenerTimes.join(", ") : "-"}` : ""} | Consistencia segura para agua: ${oralSafeConsistency || "-"} | Observacoes: ${oralObservations || "-"}`,
        });
        savedRoutes.push("Via oral");
      }

      if (feedingRoutes.parenteral) {
        await persistPrescription("parenteral", {
          systemType: "open",
          feedingRoute: parenteralAccess,
          infusionHoursPerDay: parenteralInfusionTime,
          totalCalories: parenteralVET,
          totalProtein: parenteralAminoacids,
          totalCarbs: parenteralGlucose,
          totalFat: parenteralLipids,
          parenteralDetails: {
            access: parenteralAccess,
            infusionTime: parenteralInfusionTime,
            aminoacidsG: parenteralAminoacids,
            lipidsG: parenteralLipids,
            glucoseG: parenteralGlucose,
            vetKcal: parenteralVET,
            tigMgKgMin: parenteralPerKg.tig || undefined,
            observations: parenteralObservations || undefined,
          },
          notes: parenteralObservations || `Acesso: ${parenteralAccess} | Infusao: ${parenteralInfusionTime}h | TIG: ${parenteralPerKg.tig.toFixed(2)} mg/kg/min`,
        });
        savedRoutes.push("TNP");
      }

      try {
        await updatePatient(selectedPatient.id, {
          name: selectedPatient.name,
          record: selectedPatient.record,
          dob: selectedPatient.dob,
          bed: selectedPatient.bed,
          ward: selectedPatient.ward,
          hospitalId: selectedPatient.hospitalId,
          nutritionType: feedingRoutes.enteral ? "enteral" : feedingRoutes.oral ? "oral" : feedingRoutes.parenteral ? "parenteral" : selectedPatient.nutritionType,
          consistency: feedingRoutes.oral ? oralDietConsistency || undefined : selectedPatient.consistency,
          safeConsistency: feedingRoutes.oral && oralSpeechTherapy ? oralSafeConsistency || undefined : undefined,
          mealCount: feedingRoutes.oral ? oralMealsPerDay : selectedPatient.mealCount,
          observation: feedingRoutes.oral ? oralDietCharacteristics || selectedPatient.observation : selectedPatient.observation,
        });
      } catch (patientSyncError) {
        console.error("Erro ao sincronizar dados resumidos do paciente:", patientSyncError);
      }

      toast.success(`Prescrição salva com sucesso para: ${savedRoutes.join(", ")}.`);
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
    <div className={`flex min-w-[220px] shrink-0 items-center gap-3 p-3 rounded-lg transition-all cursor-pointer lg:min-w-0 ${isActive ? "bg-primary/10 border-2 border-primary" : isCompleted ? "bg-green-50 border border-green-200" : "bg-muted/50"}`} onClick={() => isCompleted && setCurrentStep(step)}>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Prescrição de Dietas</h1>
            <p className="text-muted-foreground">
              Prescrição nutricional passo a passo
              {Object.values(editingPrescriptionIds).some(Boolean) ? " - modo edição ativa" : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sidebar Steps */}
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible">
              {activeSteps.map(s => (
                <StepIndicator key={s.id} step={s.id} title={s.title} isActive={currentStep === s.id} isCompleted={completedSteps.includes(s.id)} />
              ))}
            </div>

            {/* RESUMO NUTRICIONAL SEMPRE VISIVEL */}
            {selectedPatient && currentStep > 1 && (
              <Card className="mt-4 border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-primary">
                    <Calculator className="h-4 w-4" />
                    {sidebarSummary.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3 space-y-2">
                  <div className="text-xs text-muted-foreground mb-2">
                    <strong>{selectedPatient.name}</strong>
                    <br />Peso: {selectedPatient.weight || '-'}kg
                    {bmi && <span> | IMC: {bmi.toFixed(1)}</span>}
                    {idealWeight && <span> | Peso ideal (IMC 25): {idealWeight.toFixed(1)}kg</span>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="rounded-lg border bg-muted/30 p-3"><p className="font-semibold">Carboidratos</p><p>{nutritionSummary.carbs} g/dia</p><p className="text-muted-foreground">{nutritionSummary.weightMetrics.isObese && nutritionSummary.carbsPerKgIdeal !== null ? `${nutritionSummary.carbsPerKg} g/kg PA | ${nutritionSummary.carbsPerKgIdeal} g/kg PI` : `${nutritionSummary.carbsPerKg} g/kg`} | {nutritionSummary.carbPct}% VET</p></div>
                    <div className="rounded-lg border bg-muted/30 p-3"><p className="font-semibold">Lipidios</p><p>{nutritionSummary.fat} g/dia</p><p className="text-muted-foreground">{nutritionSummary.weightMetrics.isObese && nutritionSummary.fatPerKgIdeal !== null ? `${nutritionSummary.fatPerKg} g/kg PA | ${nutritionSummary.fatPerKgIdeal} g/kg PI` : `${nutritionSummary.fatPerKg} g/kg`} | {nutritionSummary.fatPct}% VET</p></div>
                    <div className="rounded-lg border bg-muted/30 p-3"><p className="font-semibold">Fibras</p><p>{nutritionSummary.fiber} g/dia</p><p className="text-muted-foreground">Resumo global das vias</p></div>
                    <div className="rounded-lg border bg-muted/30 p-3"><p className="font-semibold">Micronutrientes</p><p>Na {nutritionSummary.sodium} | K {nutritionSummary.potassium}</p><p className="text-muted-foreground">Ca {nutritionSummary.calcium} | P {nutritionSummary.phosphorus} mg/dia</p></div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded p-2 text-center shadow-sm">
                      <div className="text-lg font-bold text-orange-600">
                        {sidebarSummary.calories}
                      </div>
                      <div className="text-xs text-muted-foreground">kcal</div>
                      <div className="text-xs font-semibold text-orange-700">
                        {nutritionSummary.weightMetrics.isObese && nutritionSummary.caloriesPerKgIdeal !== null ? `${sidebarSummary.caloriesPerKg} kcal/kg PA | ${nutritionSummary.caloriesPerKgIdeal} kcal/kg PI` : `${sidebarSummary.caloriesPerKg} kcal/kg`}
                      </div>
                    </div>
                    <div className="bg-white rounded p-2 text-center shadow-sm">
                      <div className="text-lg font-bold text-blue-600">
                        {sidebarSummary.protein}g
                      </div>
                      <div className="text-xs text-muted-foreground">proteínas</div>
                      <div className="text-xs font-semibold text-blue-700">
                        {nutritionSummary.weightMetrics.isObese && nutritionSummary.proteinPerKgIdeal !== null ? `${sidebarSummary.proteinPerKg} g/kg PA | ${nutritionSummary.proteinPerKgIdeal} g/kg PI` : `${sidebarSummary.proteinPerKg} g/kg`}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded p-2 text-center shadow-sm">
                      <div className="text-sm font-bold text-cyan-600">
                        {sidebarSummary.freeWater}
                      </div>
                      <div className="text-xs text-muted-foreground">água livre</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center shadow-sm">
                      <div className="text-sm font-bold text-green-600">
                        {sidebarSummary.residues}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sidebarSummary.residues === "-" ? "resíduos indisponíveis" : "resíduos totais"}
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
          <div className="xl:col-span-3 space-y-6">
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
                          setEditingPrescriptionIds({ oral: null, enteral: null, parenteral: null });
                          setEditingStartDates({ oral: null, enteral: null, parenteral: null });
                          setHydratedFromPrescription(false);
                          setFeedingRoutes({ oral: false, enteral: false, parenteral: false });
                          setEnteralAccess("");
                          setSystemType("");
                          setClosedFormula({ formulaId: "", infusionMode: "", rate: "", duration: "", bagQuantities: {} });
                          setOpenInfusionMode("");
                          setOpenDurationPerStep("");
                          setOpenFormulas([{ id: "1", formulaId: "", volume: "", diluteTo: "", times: [] }]);
                          setModules([]);
                          setHydration({ volume: "", times: [] });
                          setEquipmentVolume("");
                          setOralAdministrationRoute("oral");
                          setOralDeliveryMethod("cup");
                          setOralDietConsistency(p.consistency || "");
                            setOralDietCharacteristics(p.observation || "");
                            setOralMealsPerDay(Number(p.mealCount) || 6);
                            setOralSpeechTherapy(Boolean(p.safeConsistency));
                            setOralNeedsThickener(Boolean(p.safeConsistency));
                            setOralSafeConsistency(p.safeConsistency || "");
                            setOralThickenerProduct("");
                            setOralThickenerVolume("");
                            setOralThickenerTimes([]);
                            setOralEstimatedVET(0);
                          setOralEstimatedProtein(0);
                          setOralHasTherapy(false);
                          setOralSupplements([]);
                          setOralTherapyModules([]);
                          setOralObservations(p.observation || "");
                          setParenteralAccess("central");
                          setParenteralInfusionTime(24);
                          setParenteralAminoacids(0);
                          setParenteralLipids(0);
                          setParenteralGlucose(0);
                          setParenteralObservations("");
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
                  {selectedPatient && (
                    <div className="space-y-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
                      <div>
                        <p className="font-medium text-primary">Repetir prescrição anterior</p>
                        <p className="text-sm text-muted-foreground">
                          Carrega os dados da última prescrição para facilitar uma nova prescrição sem sobrescrever automaticamente a anterior.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" disabled={!latestPrescriptionsByType.enteral} onClick={() => handleRepeatPrescription("enteral")}>
                          Repetir TNE
                        </Button>
                        <Button type="button" variant="outline" disabled={!latestPrescriptionsByType.oral} onClick={() => handleRepeatPrescription("oral")}>
                          Repetir Via Oral
                        </Button>
                        <Button type="button" variant="outline" disabled={!latestPrescriptionsByType.parenteral} onClick={() => handleRepeatPrescription("parenteral")}>
                          Repetir TNP
                        </Button>
                      </div>
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
                  {suggestedAgeGroupLabel && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Mostrando formulas de uso <strong>{suggestedAgeGroupLabel}</strong> para via enteral, respeitando o cadastro da formula.
                    </div>
                  )}
                  {enteralAvailableClosedFormulas.length === 0 && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      Nenhuma formula fechada compativel com a faixa etaria e a rota cadastradas para este paciente.
                    </div>
                  )}
                  <div className="space-y-2"><Label>Fórmula *</Label><Select value={closedFormula.formulaId} onValueChange={v => setClosedFormula({ ...closedFormula, formulaId: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{enteralAvailableClosedFormulas.map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.composition.density} kcal/ml)</SelectItem>)}</SelectContent></Select></div>
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
                  {suggestedAgeGroupLabel && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Mostrando formulas de uso <strong>{suggestedAgeGroupLabel}</strong> para via enteral, respeitando o cadastro da formula.
                    </div>
                  )}
                  {enteralAvailableOpenFormulas.length === 0 && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      Nenhuma formula aberta compativel com a faixa etaria e a rota cadastradas para este paciente.
                    </div>
                  )}
                  <div className="space-y-2"><Label>Modo de Infusão *</Label><div className="grid grid-cols-3 gap-4">{[{ v: "pump", l: "Bomba", d: "ml/h" }, { v: "gravity", l: "Gravitacional", d: "gotas/min" }, { v: "bolus", l: "Bolus", d: "Tudo de uma vez" }].map(m => <div key={m.v} className={`p-4 border-2 rounded-lg cursor-pointer ${openInfusionMode === m.v ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setOpenInfusionMode(m.v as any)}><span className="font-medium">{m.l}</span><p className="text-xs text-muted-foreground">{m.d}</p></div>)}</div></div>
                  {(openInfusionMode === "pump" || openInfusionMode === "gravity") && <div className="space-y-2"><Label>Infundir cada etapa em:</Label><div className="flex items-center gap-2 max-w-xs"><Input type="number" value={openDurationPerStep} onChange={e => setOpenDurationPerStep(e.target.value)} /><span className="text-sm">horas</span></div></div>}
                  <div className="space-y-4"><div className="flex justify-between items-center"><Label className="text-lg">Fórmulas</Label><Button variant="outline" size="sm" onClick={addOpenFormula}><Plus className="h-4 w-4 mr-1" />Adicionar</Button></div>
                    {openFormulas.map((f, i) => (
                      <div key={f.id} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                        <div className="flex justify-between"><h4 className="font-semibold">Fórmula {i + 1}</h4>{openFormulas.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeOpenFormula(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2"><Label>Fórmula</Label><Select value={f.formulaId} onValueChange={v => updateOpenFormula(f.id, "formulaId", v)}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{enteralAvailableOpenFormulas.map(af => <SelectItem key={af.id} value={af.id}>{af.name}</SelectItem>)}</SelectContent></Select></div>
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
                  {systemType === "open" && (
                    <div className="space-y-2">
                      <Label>Volume para equipo por frasco (ml)</Label>
                      <Input type="number" value={equipmentVolume} onChange={e => setEquipmentVolume(e.target.value)} className="max-w-xs" placeholder="Ex: 20" />
                      <p className="text-sm text-muted-foreground">Esse volume entra só no faturamento da dieta enteral aberta. Não entra nos cálculos nutricionais.</p>
                    </div>
                  )}
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
                        <div className="text-3xl font-bold text-orange-600">{oralTotals.vet.toFixed(0)}</div>
                        <div className="text-sm text-muted-foreground">kcal/dia</div>
                        {oralTotals.vetPerKg > 0 && <div className="text-lg font-semibold text-orange-700 mt-1">{oralTotals.weightMetrics.isObese && oralTotals.vetPerKgIdeal !== null ? `${oralTotals.vetPerKg.toFixed(1)} kcal/kg PA | ${oralTotals.vetPerKgIdeal.toFixed(1)} kcal/kg PI` : `${oralTotals.vetPerKg.toFixed(1)} kcal/kg`}</div>}
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                        <div className="text-3xl font-bold text-blue-600">{oralTotals.protein.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">g proteínas/dia</div>
                        {oralTotals.proteinPerKg > 0 && <div className="text-lg font-semibold text-blue-700 mt-1">{oralTotals.weightMetrics.isObese && oralTotals.proteinPerKgIdeal !== null ? `${oralTotals.proteinPerKg.toFixed(2)} g/kg PA | ${oralTotals.proteinPerKgIdeal.toFixed(2)} g/kg PI` : `${oralTotals.proteinPerKg.toFixed(2)} g/kg`}</div>}
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
                    {suggestedAgeGroup && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Faixa etaria sugerida: <strong>{suggestedAgeGroup === "infant" ? "Infantil" : suggestedAgeGroup === "pediatric" ? "Pediatrico" : "Adulto"}</strong>. As formulas abaixo respeitam idade e rota permitida no cadastro.
                      </div>
                    )}
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Produto espessante</Label>
                              {thickenerSupplies.length > 0 ? (
                                <Select value={oralThickenerProduct} onValueChange={setOralThickenerProduct}>
                                  <SelectTrigger><SelectValue placeholder="Selecione o espessante" /></SelectTrigger>
                                  <SelectContent>
                                    {thickenerSupplies.map((supply) => <SelectItem key={supply.id} value={supply.name}>{supply.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input value={oralThickenerProduct} onChange={e => setOralThickenerProduct(e.target.value)} placeholder="Ex: Resource ThickenUp" />
                              )}
                            </div>
                            <div className="space-y-2"><Label>Volume de agua por oferta (ml)</Label><Input type="number" value={oralThickenerVolume} onChange={e => setOralThickenerVolume(e.target.value)} placeholder="Ex: 150" /></div>
                          </div>
                        )}
                        {oralNeedsThickener && (
                          <div className="space-y-2">
                            <Label>Horarios da agua espessada</Label>
                            <div className="flex flex-wrap gap-2">
                              {SCHEDULE_TIMES.map(time => (
                                <Button key={time} type="button" variant={oralThickenerTimes.includes(time) ? "default" : "outline"} size="sm" onClick={() => toggleOralThickenerTime(time)}>{time}</Button>
                              ))}
                            </div>
                          </div>
                        )}
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
                        <Card className="border-dashed">
                          <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Via de administracao</Label>
                                <Select value={oralAdministrationRoute} onValueChange={(value: "oral" | "translactation") => setOralAdministrationRoute(value)}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="oral">Via oral</SelectItem>
                                    {shouldShowInfantFeedingControls && <SelectItem value="translactation">Translactacao</SelectItem>}
                                  </SelectContent>
                                </Select>
                              </div>
                              {shouldShowInfantFeedingControls && (
                                <div className="space-y-2">
                                  <Label>Forma de oferta</Label>
                                  <Select value={oralDeliveryMethod} onValueChange={(value: "cup" | "baby-bottle" | "feeding-bottle") => setOralDeliveryMethod(value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cup">Copo</SelectItem>
                                      <SelectItem value="baby-bottle">Mamadeira</SelectItem>
                                      <SelectItem value="feeding-bottle">Frasco para dieta</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <p className="text-xs text-muted-foreground">Copo e mamadeira nao sao cobrados automaticamente. Frasco para dieta entra no faturamento quando houver insumo faturavel cadastrado.</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

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
                                  <SelectContent>{oralAvailableSupplements.map(f => <SelectItem key={f.id} value={f.id!}>{f.name} - {f.caloriesPerUnit}kcal/100ml{f.ageGroup ? ` | ${f.ageGroup}` : ""}</SelectItem>)}</SelectContent>
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
                    {selectedPatient?.weight && (
                      <div className="rounded-lg border border-purple-200 bg-white/80 px-4 py-3 text-sm">
                        <span className="font-semibold text-purple-700">TIG:</span> {parenteralPerKg.tig.toFixed(2)} mg/kg/min
                      </div>
                    )}
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
                      <div className="space-y-2">
                        <Label>TIG (mg/kg/min)</Label>
                        <Input type="number" value={selectedPatient?.weight ? parenteralPerKg.tig.toFixed(2) : ''} readOnly placeholder="Informe o peso do paciente" />
                        <p className="text-xs text-muted-foreground">CÃ¡lculo: glicose (g/dia) x 1000 / peso / 1440</p>
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
                    <div className="p-4 bg-primary/10 rounded-lg text-center"><p className="text-2xl font-bold text-primary">{nutritionSummary.vet}</p><p className="text-sm text-muted-foreground">({nutritionSummary.weightMetrics.isObese && nutritionSummary.vetPerKgIdeal !== null ? `${nutritionSummary.vetPerKg} kcal/kg PA | ${nutritionSummary.vetPerKgIdeal} kcal/kg PI` : `${nutritionSummary.vetPerKg} kcal/kg`})</p><p className="text-xs font-medium mt-1">VET</p></div>
                    <div className="p-4 bg-blue-100 rounded-lg text-center"><p className="text-2xl font-bold text-blue-700">{nutritionSummary.protein}g</p><p className="text-sm text-muted-foreground">({nutritionSummary.weightMetrics.isObese && nutritionSummary.proteinPerKgIdeal !== null ? `${nutritionSummary.proteinPerKg} g/kg PA | ${nutritionSummary.proteinPerKgIdeal} g/kg PI` : `${nutritionSummary.proteinPerKg} g/kg`})</p><p className="text-xs font-medium mt-1">Proteínas</p></div>
                    <div className="p-4 bg-cyan-100 rounded-lg text-center"><p className="text-2xl font-bold text-cyan-700">{nutritionSummary.freeWater}ml</p><p className="text-sm text-muted-foreground">({nutritionSummary.weightMetrics.isObese && nutritionSummary.freeWaterPerKgIdeal !== null ? `${nutritionSummary.freeWaterPerKg} ml/kg PA | ${nutritionSummary.freeWaterPerKgIdeal} ml/kg PI` : `${nutritionSummary.freeWaterPerKg} ml/kg`})</p><p className="text-xs font-medium mt-1">Água Livre</p></div>
                    <div className="p-4 bg-green-100 rounded-lg text-center"><p className="text-2xl font-bold text-green-700">{feedingRoutes.enteral ? `${nutritionSummary.residueTotal.toFixed(1)}g` : "-"}</p><p className="text-xs font-medium mt-1">{feedingRoutes.enteral ? "Resíduos Recicláveis" : "Resíduos (somente enteral)"}</p></div>
                  </div>
                  <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showDetails ? "rotate-180" : ""}`} />
                        {showDetails ? "Ocultar Detalhes" : "Mais Detalhes"}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 p-4 border rounded-lg space-y-4 text-sm">
                      <p><strong>Via:</strong> {feedingRoutes.enteral && `Enteral (${enteralAccess})`} {feedingRoutes.oral && "Oral"} {feedingRoutes.parenteral && "Parenteral"}</p>
                      
                      {/* Macros */}
                      <div>
                        <h4 className="font-semibold mb-2">Macronutrientes</h4>
                        <p><strong>Proteínas:</strong> {nutritionSummary.protein}g ({nutritionSummary.proteinPerKg}g/kg) - {nutritionSummary.proteinPct}% VET</p>
                        {nutritionSummary.sources.protein.length > 0 && <p className="text-muted-foreground ml-2 text-xs">Fontes: {nutritionSummary.sources.protein.join("; ")}</p>}
                        <p><strong>Carboidratos:</strong> {nutritionSummary.carbs}g ({nutritionSummary.carbsPerKg}g/kg) - {nutritionSummary.carbsPct}% VET</p>
                        {nutritionSummary.sources.carbs.length > 0 && <p className="text-muted-foreground ml-2 text-xs">Fontes: {nutritionSummary.sources.carbs.join("; ")}</p>}
                        <p><strong>Lipídeos:</strong> {nutritionSummary.fat}g ({nutritionSummary.fatPerKg}g/kg) - {nutritionSummary.fatPct}% VET</p>
                        {nutritionSummary.sources.fat.length > 0 && <p className="text-muted-foreground ml-2 text-xs">Fontes: {nutritionSummary.sources.fat.join("; ")}</p>}
                        <p><strong>Fibras:</strong> {nutritionSummary.fiber}g/dia</p>
                        {nutritionSummary.sources.fiber.length > 0 && <p className="text-muted-foreground ml-2 text-xs">Fontes: {nutritionSummary.sources.fiber.join("; ")}</p>}
                      </div>

                      <Separator />

                      {/* Micros */}
                      <div>
                        <h4 className="font-semibold mb-2">Micronutrientes (Estimativa)</h4>
                        <p><strong>Cálcio:</strong> {nutritionSummary.calcium.toFixed(1)} mg/dia</p>
                        <p><strong>Fósforo:</strong> {nutritionSummary.phosphorus.toFixed(1)} mg/dia</p>
                        <p><strong>Sódio:</strong> {nutritionSummary.sodium.toFixed(1)} mg/dia</p>
                        <p><strong>Potássio:</strong> {nutritionSummary.potassium.toFixed(1)} mg/dia</p>
                      </div>

                      <Separator />

                      {/* Residuos e Enfermagem */}
                      <div>
                        <h4 className="font-semibold mb-2">Resíduos e Enfermagem</h4>
                        <p><strong>Resíduos Potencialmente Recicláveis:</strong> {nutritionSummary.residueTotal.toFixed(1)} g/dia</p>
                        <p className="text-muted-foreground ml-2 text-xs">
                          Plástico: {nutritionSummary.residues.plastic.toFixed(1)}g | Papel: {nutritionSummary.residues.paper.toFixed(1)}g | Metal: {nutritionSummary.residues.metal.toFixed(1)}g | Vidro: {nutritionSummary.residues.glass.toFixed(1)}g
                        </p>
                        <p><strong>Tempo Estimado de Enfermagem:</strong> {systemType === "closed" ? "45 minutos/dia" : (openFormulas.reduce((acc, f) => acc + f.times.length, 0) * 15) + " minutos/dia"}</p>
                      </div>

                      {feedingRoutes.enteral && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-semibold mb-2">Sugestão de Registro em Prontuário</h4>
                            <div className="bg-muted p-3 rounded text-xs select-all">
                              {systemType === "closed" && closedFormula.formulaId && (() => {
                                const f = availableFormulas.find(x => x.id === closedFormula.formulaId);
                                const fiberText = f?.fiberPerUnit && f.fiberPerUnit > 0 ? `com fibras (${f.fiberSources || 'presentes'})` : 'isenta de fibras';
                                const modText = modules.map(m => {
                                  const am = availableModules.find(x => x.id === m.moduleId);
                                  return am ? `${am.name} ${m.quantity}${m.unit}, ${m.times.length} vezes ao dia` : '';
                                }).filter(Boolean).join("; ");
                                const totalVol = bagCalculation?.totalVolume || 0;
                                return `Sistema fechado: ${f?.name || ''} ${f?.macronutrientComplexity === 'polymeric' ? 'polimérica' : 'oligomérica'}, ${f?.classification || 'padrão'}, ${fiberText}, ${totalVol} ml/dia, com infusão de ${closedFormula.duration}h e velocidade de ${closedFormula.rate} ${closedFormula.infusionMode === "pump" ? "ml/h" : "gotas/min"}, administrada via ${closedFormula.infusionMode === "pump" ? "bomba de infusão" : "gravitacional"}, através de ${enteralAccess}.${modText ? ` Módulos: ${modText}.` : ''} Água livre total: ${nutritionSummary.freeWater} ml/dia (${nutritionSummary.freeWaterPerKg} ml/kg/dia). Oferecendo VET: ${nutritionSummary.vet} kcal (${nutritionSummary.vetPerKg} kcal/kg); Proteínas: ${nutritionSummary.protein}g (${nutritionSummary.proteinPerKg}g/kg); Carb.: ${nutritionSummary.carbs}g; Lip.: ${nutritionSummary.fat}g; Fibras: ${nutritionSummary.fiber}g/dia.`;
                              })()}
                              
                              {systemType === "open" && (() => {
                                const formulasText = openFormulas.map(of => {
                                  const f = availableFormulas.find(x => x.id === of.formulaId);
                                  const fiberText = f?.fiberPerUnit && f.fiberPerUnit > 0 ? `com fibras (${f.fiberSources || 'presentes'})` : 'isenta de fibras';
                                  return `${f?.name || ''} ${f?.macronutrientComplexity === 'polymeric' ? 'polimérica' : 'oligomérica'}, ${f?.classification || 'padrão'}, ${fiberText}, fracionado em ${of.times.length} etapas de ${of.volume} ml/dia`;
                                }).join("; ");
                                const modText = modules.map(m => {
                                  const am = availableModules.find(x => x.id === m.moduleId);
                                  return am ? `${am.name} ${m.quantity}${m.unit}, ${m.times.length} vezes ao dia` : '';
                                }).filter(Boolean).join("; ");
                                return `Sistema aberto: ${formulasText}, administrada através de ${enteralAccess}.${modText ? ` Módulos: ${modText}.` : ''} Água livre total: ${nutritionSummary.freeWater} ml/dia (${nutritionSummary.freeWaterPerKg} ml/kg/dia). Oferecendo VET: ${nutritionSummary.vet} kcal (${nutritionSummary.vetPerKg} kcal/kg); Proteínas: ${nutritionSummary.protein}g (${nutritionSummary.proteinPerKg}g/kg); Carb.: ${nutritionSummary.carbs}g; Lip.: ${nutritionSummary.fat}g; Fibras: ${nutritionSummary.fiber}g/dia.`;
                              })()}
                            </div>
                          </div>
                        </>
                      )}

                      {feedingRoutes.oral && (
                        <>
                          <Separator />
                          <p><strong>Oral:</strong> {oralAdministrationRoute === "translactation" ? "Translactação" : "Via oral"} | {oralDietConsistency || 'Consistência não definida'} - {oralMealsPerDay} refeições/dia{shouldShowInfantFeedingControls ? ` | Oferta: ${oralDeliveryMethod === "feeding-bottle" ? "Frasco" : oralDeliveryMethod === "baby-bottle" ? "Mamadeira" : "Copo"}` : ""}</p>
                        </>
                      )}

                      {feedingRoutes.parenteral && (
                        <>
                          <Separator />
                          <p><strong>Parenteral:</strong> Acesso {parenteralAccess} - VET {parenteralVET.toFixed(0)} kcal - {parenteralInfusionTime}h infusão</p>
                        </>
                      )}

                      <Separator />

                      {/* Custos */}
                      <div>
                        <h4 className="font-semibold mb-2">Custos Estimados (Diários)</h4>
                        <p><strong>Custo Material (Fórmulas e Módulos):</strong> R$ {(() => {
                            let cost = 0;
                            if (systemType === "closed" && closedFormula.formulaId) {
                                const f = availableFormulas.find(x => x.id === closedFormula.formulaId);
                                cost += (bagCalculation?.numBags || 1) * (f?.billingPrice || 100);
                            } else if (systemType === "open") {
                                openFormulas.forEach(of => {
                                    const f = availableFormulas.find(x => x.id === of.formulaId);
                                    const mlTotal = (parseFloat(of.volume) || 0) * of.times.length;
                                    const costPerMl = (f?.billingPrice || 50) / (f?.presentations?.[0] || 1000);
                                    cost += mlTotal * costPerMl;
                                });
                            }
                            modules.forEach(m => {
                              const am = availableModules.find(x => x.id === m.moduleId);
                              const totalP = (parseFloat(m.quantity) || 0) * m.times.length;
                              const costPerUnit = (am?.billingPrice || 80) / (am?.referenceAmount || 100);
                              cost += totalP * costPerUnit;
                            });
                            return cost.toFixed(2).replace('.', ',');
                        })()}</p>
                        <p><strong>Custos de Enfermagem:</strong> R$ {(() => {
                            const time = systemType === "closed" ? 45 : (openFormulas.reduce((acc, f) => acc + f.times.length, 0) * 15);
                            return ((time / 60) * 40).toFixed(2).replace('.', ',');
                        })()}</p>
                        <p><strong>Outros Custos (Indiretos / Insumos):</strong> R$ 25,00</p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
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



