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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mic, ArrowLeft, Check, ChevronDown, ChevronRight, Droplet, Plus, Trash2, Utensils, Syringe, Calculator, Save, AlertCircle, Clock, Target, Flame } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import EnteralIcon from "@/components/icons/EnteralIcon";
import SupplementIcon from "@/components/icons/SupplementIcon";
import type { Formula as CatalogFormula, Module as CatalogModule } from "@/lib/formulasDatabase";
import { usePatients, usePrescriptions, useFormulas, useModules as useDbModules, useSettings, useSupplies, useWards } from "@/hooks/useDatabase";
import { Patient, Prescription, OralSupplementSchedule, OralModuleSchedule } from "@/lib/database";
import { can } from "@/lib/permissions";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import {
  addNutritionAccumulators,
  calculateFormulaNutrition,
  calculateModuleNutrition,
  createNutritionAccumulator,
  finalizeNutritionTotals,
  calculateUnintentionalCalories,
  getWeightConfig,
} from "@/lib/prescriptionCalculations";
import type { UnintentionalCaloriesInput } from "@/lib/prescriptionCalculations";
import { calculateOpenStageRate } from "@/lib/prescriptionInfusion";
import { ParenteralStep, deriveParenteralValues } from "@/components/prescription/ParenteralStep";
import type { ParenteralValues, GlucoseConcentration, LipidType } from "@/components/prescription/ParenteralStep";
import {
  DEFAULT_SCHEDULE_TIMES,
  areScheduleTimesEqual,
  findWardByReference,
  normalizeScheduleTime,
  resolveConfiguredScheduleTimes,
  resolvePatientScheduleTimes,
  sanitizeScheduleTimes,
  sortScheduleTimes,
} from "@/lib/scheduleTimes";

interface FormulaEntry {
  id: string;
  formulaId: string;
  volume: string;
  diluteTo: string;
  times: string[];
  manipulationTimes: string[];
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

type TherapyType = Prescription["therapyType"];
type ScheduleSource = "patient" | "ward" | "unit";
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
  if (age <= 3) return "infant";
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
    descriptionForEvolution: formula.descriptionForEvolution,
    billingUnit: formula.billingUnit,
    conversionFactor: formula.conversionFactor,
    billingPrice: formula.billingPrice,
    fiberType: formula.fiberType,
    specialCharacteristics: formula.specialCharacteristics,
    specialFeatures: formula.specialFeatures,
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

const buildFallbackCatalogModule = (moduleItem: any): ExtendedCatalogModule => ({
  id: moduleItem.id,
  code: moduleItem.code,
  name: moduleItem.name || "",
  manufacturer: moduleItem.manufacturer || "",
  description: moduleItem.description,
  presentationForm: moduleItem.presentationForm,
  presentations: Array.isArray(moduleItem.presentations) ? moduleItem.presentations : undefined,
  conversionFactor: moduleItem.conversionFactor,
  density: moduleItem.density || 0,
  referenceAmount: moduleItem.referenceAmount || 0,
  referenceTimesPerDay: moduleItem.referenceTimesPerDay || 0,
  calories: moduleItem.calories || 0,
  protein: moduleItem.protein || 0,
  carbs: moduleItem.carbs,
  fat: moduleItem.fat,
  sodium: moduleItem.sodium || 0,
  potassium: moduleItem.potassium || 0,
  calcium: moduleItem.calcium,
  phosphorus: moduleItem.phosphorus,
  fiber: moduleItem.fiber || 0,
  freeWater: moduleItem.freeWater || 0,
  proteinSources: moduleItem.proteinSources,
  carbSources: moduleItem.carbSources,
  fatSources: moduleItem.fatSources,
  fiberSources: moduleItem.fiberSources,
});

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

const collectPrescriptionScheduleTimes = (prescription: Prescription): string[] => {
  const closedFormulaTimes = Object.keys(prescription.enteralDetails?.closedFormula?.bagQuantities || {});
  const openFormulaTimes = (prescription.enteralDetails?.openFormulas || []).flatMap((formula) => formula.times || []);
  const openManipulationTimes = (prescription.enteralDetails?.openFormulas || []).flatMap((formula) => formula.manipulationTimes || []);
  const enteralModuleTimes = (prescription.enteralDetails?.modules || []).flatMap((module) => module.times || []);
  const hydrationTimes = prescription.enteralDetails?.hydration?.times || prescription.hydrationSchedules || [];
  const oralThickenerTimes = prescription.oralDetails?.thickenerTimes || [];
  const formulaSchedules = (prescription.formulas || []).flatMap((formula) => formula.schedules || []);
  const moduleSchedules = (prescription.modules || []).flatMap((module) => module.schedules || []);

  return sanitizeScheduleTimes([
    ...closedFormulaTimes,
    ...openFormulaTimes,
    ...openManipulationTimes,
    ...enteralModuleTimes,
    ...hydrationTimes,
    ...oralThickenerTimes,
    ...formulaSchedules,
    ...moduleSchedules,
  ]);
};

const toNumericValue = (value?: string | number | null): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const formatDecimalValue = (value?: number | null): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
};

const cleanNoteText = (value?: string | null): string =>
  (value || "").replace(/\s+/g, " ").trim().replace(/[.;,:]+$/, "");

const formatEnteralAccessLabel = (access?: string): string => {
  switch (access) {
    case "SNE":
      return "SNE";
    case "SNG":
      return "SNG";
    case "SOG":
      return "SOG";
    case "GTT":
      return "GTT";
    case "JTT":
      return "JTT";
    case "VO":
      return "via oral";
    default:
      return access || "via enteral";
  }
};

const buildGenericFormulaDescriptor = (formula?: ExtendedCatalogFormula): string => {
  const preferredDescription = cleanNoteText(formula?.description || formula?.descriptionForEvolution);
  if (preferredDescription) {
    return preferredDescription;
  }

  const complexity =
    formula?.macronutrientComplexity === "oligomeric"
      ? "oligomérica"
      : formula?.macronutrientComplexity === "polymeric"
        ? "polimérica"
        : "";
  const fiberText = formula?.fiberPerUnit && formula.fiberPerUnit > 0
    ? formula.fiberSources
      ? `com fibras (${formula.fiberSources})`
      : "com fibras"
    : "isenta de fibras";
  const otherCharacteristics = cleanNoteText(
    [formula?.classification, formula?.specialCharacteristics].filter(Boolean).join(", "),
  );

  return [
    "Dieta enteral",
    complexity,
    otherCharacteristics,
    fiberText,
  ]
    .filter(Boolean)
    .join(", ");
};

const buildGenericModuleDescriptor = (moduleItem?: ExtendedCatalogModule): string =>
  cleanNoteText(moduleItem?.description) || moduleItem?.name || "Módulo";

const PrescriptionNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient");
  const prescriptionIdFromUrl = searchParams.get("prescription");

  // Usar pacientes e prescricoes do banco de dados
  const { patients, isLoading: patientsLoading, updatePatient } = usePatients();
  const { prescriptions, createPrescription, updatePrescription, updatePrescriptionStatus } = usePrescriptions();
  const role = useCurrentRole();
  const canConfigurePrescriptionSchedules = can(role, "manage_units") || can(role, "manage_wards");
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
  const [openFormulas, setOpenFormulas] = useState<FormulaEntry[]>([{ id: "1", formulaId: "", volume: "", diluteTo: "", times: [], manipulationTimes: [] }]);

  // Modules
  const [modules, setModules] = useState<ModuleEntry[]>([]);

  // Hydration
  const [hydration, setHydration] = useState<HydrationEntry>({ volume: "", times: [] });
  const [equipmentVolume, setEquipmentVolume] = useState("");
  const [prescriptionScheduleTimes, setPrescriptionScheduleTimes] = useState<string[]>([...DEFAULT_SCHEDULE_TIMES]);
  const [customScheduleInput, setCustomScheduleInput] = useState("");

  // --- DB hooks for formulas/modules/auxiliary catalogs ---
  const { formulas: dbFormulas } = useFormulas();
  const { modules: dbModules } = useDbModules();
  const { supplies } = useSupplies();
  const { wards } = useWards();
  const { settings } = useSettings();
  const availableFormulas = useMemo<ExtendedCatalogFormula[]>(
    () => dbFormulas.map((formula) => buildFallbackCatalogFormula(formula)),
    [dbFormulas],
  );
  const availableModules = useMemo<ExtendedCatalogModule[]>(
    () => dbModules.map((moduleItem) => buildFallbackCatalogModule(moduleItem)),
    [dbModules],
  );

  // Summary expanded
  const [showDetails, setShowDetails] = useState(false);
  const [highSpeedAlertOpen, setHighSpeedAlertOpen] = useState(false);
  const [highSpeedAlertMessage, setHighSpeedAlertMessage] = useState("");

  const checkHighSpeed = (rateVal: string, mode: "pump" | "gravity" | "bolus" | "") => {
    const num = Number(rateVal);
    if (!num) return;
    if (mode === "pump" && num > 150) {
      setHighSpeedAlertMessage(`A velocidade de infusão informada (${num} ml/h) é superior a 150 ml/h.`);
      setHighSpeedAlertOpen(true);
    } else if (mode === "gravity" && num > 50) {
      setHighSpeedAlertMessage(`A velocidade de infusão informada (${num} gotas/min) é superior a 50 gotas/min.`);
      setHighSpeedAlertOpen(true);
    }
  };

  const checkHighSpeedOpen = (durVal: string) => {
    if (openInfusionMode !== "pump" && openInfusionMode !== "gravity") return;
    const dur = Number(durVal);
    if (!dur) return;

    let maxVol = 0;
    openFormulas.forEach((formula) => {
      const vol = Number(formula.diluteTo || formula.volume);
      if (vol && vol > maxVol) maxVol = vol;
    });

    if (maxVol > 0) {
      const rate = calculateOpenStageRate(maxVol, openInfusionMode as any, dur);
      if (openInfusionMode === "pump" && rate.mlPerHour && rate.mlPerHour > 150) {
        setHighSpeedAlertMessage(`A velocidade de infusão calculada da dieta aberta (${rate.mlPerHour.toFixed(1)} ml/h) é superior a 150 ml/h, considerando o volume de ${maxVol} ml.`);
        setHighSpeedAlertOpen(true);
      } else if (openInfusionMode === "gravity" && rate.dropsPerMin && rate.dropsPerMin > 50) {
        setHighSpeedAlertMessage(`A velocidade de infusão calculada da dieta aberta (${rate.dropsPerMin.toFixed(1)} gotas/min) é superior a 50 gotas/min, considerando o volume de ${maxVol} ml.`);
        setHighSpeedAlertOpen(true);
      }
    }
  };

  const checkVolumeDivergence = useCallback(() => {
    if (systemType !== "open" || !feedingRoutes.enteral) return;
    const volumes = openFormulas
      .filter((formula) => isPersistedDbId(formula.formulaId) && formula.volume)
      .map((formula) => toNumericValue(formula.diluteTo) || toNumericValue(formula.volume) || 0)
      .filter((volume) => volume > 0);

    if (volumes.length < 2) return;

    const uniqueVolumes = Array.from(new Set(volumes.map((volume) => volume.toFixed(1))));
    if (uniqueVolumes.length > 1) {
      setHighSpeedAlertMessage(
        `Os volumes das etapas são diferentes (${uniqueVolumes.join(" / ")} mL). Verifique se esta diferença é intencional.`,
      );
      setHighSpeedAlertOpen(true);
    }
  }, [feedingRoutes.enteral, openFormulas, systemType]);

  const checkScheduleOverlap = useCallback(() => {
    if (!feedingRoutes.enteral || systemType !== "open") return;

    const scheduleMap = new Map<string, string[]>();
    openFormulas.forEach((formula) => {
      if (!isPersistedDbId(formula.formulaId)) return;
      const name = availableFormulas.find((item) => item.id === formula.formulaId)?.name || "Formula";
      formula.times.forEach((time) => {
        const existing = scheduleMap.get(time) || [];
        existing.push(name);
        scheduleMap.set(time, existing);
      });
    });

    const overlaps: string[] = [];
    scheduleMap.forEach((items, time) => {
      if (items.length > 1) {
        overlaps.push(`${time} -> ${items.join(", ")}`);
      }
    });

    if (overlaps.length > 0) {
      toast.warning(
        `Sobreposição de horários detectada:\n${overlaps.slice(0, 5).join("\n")}${overlaps.length > 5 ? `\n...e mais ${overlaps.length - 5}` : ""}`,
        { duration: 8000 },
      );
    }
  }, [availableFormulas, feedingRoutes.enteral, openFormulas, systemType]);

  useEffect(() => {
    if (!feedingRoutes.enteral || enteralAccess !== "VO") return;

    setSystemType("open");
    setOpenInfusionMode("bolus");
    setClosedFormula({ formulaId: "", infusionMode: "", rate: "", duration: "", bagQuantities: {} });
    if (currentStep === 5) {
      setCurrentStep(6);
    }
  }, [currentStep, enteralAccess, feedingRoutes.enteral]);

  // --- Oral Inline State (Step 8) ---
  const [oralDietConsistency, setOralDietConsistency] = useState('');
  const [oralDietCharacteristics, setOralDietCharacteristics] = useState('');
  const [oralMealsPerDay, setOralMealsPerDay] = useState<number>(6);
  const [oralSpeechTherapy, setOralSpeechTherapy] = useState(false);
  const [oralNeedsThickener, setOralNeedsThickener] = useState(false);
  const [oralSafeConsistency, setOralSafeConsistency] = useState('');
  const [oralThickenerModuleId, setOralThickenerModuleId] = useState('');
  const [oralThickenerProduct, setOralThickenerProduct] = useState('');
  const [oralThickenerGrams, setOralThickenerGrams] = useState('');
  const [oralThickenerVolume, setOralThickenerVolume] = useState('');
  const [oralThickenerTimes, setOralThickenerTimes] = useState<string[]>([]);
  const [oralEstimatedVET, setOralEstimatedVET] = useState<number>(0);
  const [oralEstimatedProtein, setOralEstimatedProtein] = useState<number>(0);
  const [oralEstimatedCarbs, setOralEstimatedCarbs] = useState<number>(0);
  const [oralEstimatedLipids, setOralEstimatedLipids] = useState<number>(0);
  const [oralHasTherapy, setOralHasTherapy] = useState(false);
  const [oralSupplements, setOralSupplements] = useState<OralSupplementSchedule[]>([]);
  const [oralTherapyModules, setOralTherapyModules] = useState<OralModuleSchedule[]>([]);
  const [oralObservations, setOralObservations] = useState('');

  // --- Parenteral Inline State (Step 9) ---
  const [parenteralValues, setParenteralValues] = useState<ParenteralValues>({
    aminoacidsMl: 0,
    lipidsMl: 0,
    lipidType: "tcm-tcl",
    glucoseMl: 0,
    glucoseConc: 50 as GlucoseConcentration,
    multivitamin: false,
    traceElements: false,
    access: 'central',
    infusionTime: 24,
    observations: '',
  });

  const handleParenteralChange = (partial: Partial<ParenteralValues>) => {
    setParenteralValues(prev => ({ ...prev, ...partial }));
  };

  // --- Unintentional Calories State ---
  const [unintentionalCal, setUnintentionalCal] = useState<UnintentionalCaloriesInput>({});

  // --- Nutrition Goals State ---
  const [goalTargetKcalPerKg, setGoalTargetKcalPerKg] = useState<number | undefined>();
  const [goalTargetProteinPerKgActual, setGoalTargetProteinPerKgActual] = useState<number | undefined>();
  const [goalTargetProteinPerKgIdeal, setGoalTargetProteinPerKgIdeal] = useState<number | undefined>();

  // --- Weight Config Override (per patient) ---
  type WeightChoice = 'actual' | 'ideal';
  const [weightChoice, setWeightChoice] = useState<WeightChoice | null>(null); // null = auto

  // Parenteral derived values (auto-calc from ml inputs)
  const parenteralDerived = useMemo(
    () => deriveParenteralValues(parenteralValues, selectedPatient?.weight),
    [parenteralValues, selectedPatient?.weight],
  );

  // Shorthand aliases for backward compat in save handler
  const parenteralVET = parenteralDerived.vet;
  const parenteralAminoacids = parenteralDerived.aminoacidsG;
  const parenteralLipids = parenteralDerived.lipidsG;
  const parenteralGlucose = parenteralDerived.glucoseG;
  const parenteralPerKg = parenteralDerived.perKg;
  const parenteralAccess = parenteralValues.access;
  const parenteralInfusionTime = parenteralValues.infusionTime;
  const parenteralObservations = parenteralValues.observations;

  // Unintentional calories calculation
  const unintentionalResult = useMemo(
    () => calculateUnintentionalCalories(unintentionalCal),
    [unintentionalCal],
  );

  // Weight config auto-determined by BMI (computed from patient data directly)
  const autoWeightConfig = useMemo(() => {
    const w = selectedPatient?.weight;
    const h = selectedPatient?.height;
    if (!w || !h || h <= 0) return getWeightConfig(null, null);
    const heightM = h > 3 ? h / 100 : h;
    const patientBmi = w / (heightM * heightM);
    const patientIdealWeight = 25 * heightM * heightM;
    return getWeightConfig(patientBmi, patientIdealWeight);
  }, [selectedPatient?.weight, selectedPatient?.height]);

  // Effective weight config = manual override > auto suggestion
  const effectiveWeight = weightChoice || autoWeightConfig.energyWeight;
  const weightConfig = useMemo(() => ({
    energyWeight: effectiveWeight,
    proteinWeight: effectiveWeight,
    label: autoWeightConfig.label,
  }), [effectiveWeight, autoWeightConfig]);

  // Calculated weights for display
  const calculatedIdealWeight = useMemo(() => {
    const h = selectedPatient?.height;
    if (!h || h <= 0) return null;
    const heightM = h > 3 ? h / 100 : h;
    return 25 * heightM * heightM;
  }, [selectedPatient?.height]);

  // Selected reference weight value
  const referenceWeight = useMemo(() => {
    if (effectiveWeight === 'ideal' && calculatedIdealWeight) return calculatedIdealWeight;
    return selectedPatient?.weight || 0;
  }, [effectiveWeight, calculatedIdealWeight, selectedPatient?.weight]);

  const calculatedBmi = useMemo(() => {
    const w = selectedPatient?.weight;
    const h = selectedPatient?.height;
    if (!w || !h || h <= 0) return null;
    const heightM = h > 3 ? h / 100 : h;
    return w / (heightM * heightM);
  }, [selectedPatient?.weight, selectedPatient?.height]);

  const ORAL_MEAL_SCHEDULES = useMemo(() => [
    { key: 'breakfast', label: 'Desjejum' },
    { key: 'midMorning', label: 'Colação' },
    { key: 'lunch', label: 'Almoço' },
    { key: 'afternoon', label: 'Merenda' },
    { key: 'dinner', label: 'Jantar' },
    { key: 'supper', label: 'Ceia' },
  ], []);

  const patientAgeYears = useMemo(() => getPatientAgeYears(selectedPatient), [selectedPatient]);
  const suggestedAgeGroup = useMemo(() => getSuggestedAgeGroup(selectedPatient), [selectedPatient]);
  const suggestedAgeGroupLabel = suggestedAgeGroup === "infant"
    ? "Infantil"
    : suggestedAgeGroup === "pediatric"
      ? "Pediatrico"
      : suggestedAgeGroup === "adult"
        ? "Adulto"
        : null;
  const ageFilterHint = suggestedAgeGroupLabel
    ? `Faixa etaria do paciente: ${suggestedAgeGroupLabel}. A lista abaixo respeita idade e rota cadastradas. Formulas infantis permanecem disponiveis ate 3 anos completos.`
    : null;

  const formulaMatchesPatient = useCallback((formula: ExtendedCatalogFormula) => {
    if (patientAgeYears === undefined) return true;

    if (formula.type === "infant-formula" && patientAgeYears > 3) {
      return false;
    }

    if (formula.ageGroup === "infant") {
      return patientAgeYears <= 3;
    }

    if (formula.ageGroup === "pediatric") {
      return patientAgeYears < 18;
    }

    if (formula.ageGroup === "adult") {
      return patientAgeYears >= 18;
    }

    return true;
  }, [patientAgeYears]);

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
      && allowsAdministrationRoute(formula, "oral"),
    );
  }, [availableFormulas, formulaMatchesPatient]);

  const thickenerModuleOptions = useMemo(() => {
    const explicitThickeners = availableModules.filter((moduleItem) => {
      const haystack = [
        moduleItem.name,
        moduleItem.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes("espess") || haystack.includes("thicken");
    });

    if (explicitThickeners.length > 0) {
      return explicitThickeners;
    }

    return availableModules;
  }, [availableModules]);

  const buildOralNutritionAccumulator = useCallback(() => {
    const totals = createNutritionAccumulator();

    totals.calories += oralEstimatedVET;
    totals.protein += oralEstimatedProtein;
    totals.carbs += oralEstimatedCarbs;
    totals.fat += oralEstimatedLipids;

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
    oralEstimatedCarbs,
    oralEstimatedLipids,
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

  const selectedWard = useMemo(
    () => findWardByReference(wards, selectedPatient?.wardId, selectedPatient?.ward),
    [selectedPatient?.ward, selectedPatient?.wardId, wards],
  );

  const wardScheduleTimes = useMemo(
    () => resolveConfiguredScheduleTimes({ settings, ward: selectedWard }),
    [selectedWard, settings],
  );

  const patientDefaultScheduleTimes = useMemo(
    () => sanitizeScheduleTimes(selectedPatient?.defaultSchedules || []),
    [selectedPatient?.defaultSchedules],
  );

  const baseScheduleTimes = useMemo(
    () => resolvePatientScheduleTimes({ settings, ward: selectedWard, patient: selectedPatient }),
    [selectedPatient, selectedWard, settings],
  );

  const baseScheduleSource = useMemo<ScheduleSource>(() => {
    if (patientDefaultScheduleTimes.length > 0) return "patient";
    if (selectedWard?.defaultSchedules && sanitizeScheduleTimes(selectedWard.defaultSchedules).length > 0) return "ward";
    return "unit";
  }, [patientDefaultScheduleTimes, selectedWard?.defaultSchedules]);

  const currentScheduleStatus = useMemo(() => {
    if (patientDefaultScheduleTimes.length > 0 && areScheduleTimesEqual(prescriptionScheduleTimes, patientDefaultScheduleTimes)) {
      return "Usando padrao do paciente";
    }

    if (areScheduleTimesEqual(prescriptionScheduleTimes, wardScheduleTimes)) {
      return baseScheduleSource === "ward" ? "Usando padrao da ala" : "Usando padrao global da unidade";
    }

    return "Usando horario personalizado";
  }, [baseScheduleSource, patientDefaultScheduleTimes, prescriptionScheduleTimes, wardScheduleTimes]);

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
        ? sortScheduleTimes(current.filter((item) => item !== time))
        : sortScheduleTimes([...current, time]),
    );
  };

  useEffect(() => {
    if (!oralNeedsThickener) {
      setOralThickenerModuleId('');
      setOralThickenerProduct('');
      setOralThickenerGrams('');
      setOralThickenerVolume('');
      setOralThickenerTimes([]);
    }
  }, [oralNeedsThickener]);

  useEffect(() => {
    if (oralThickenerModuleId || !oralThickenerProduct) return;
    const matched = thickenerModuleOptions.find((moduleItem) => moduleItem.name === oralThickenerProduct);
    if (matched?.id) {
      setOralThickenerModuleId(matched.id);
    }
  }, [oralThickenerModuleId, oralThickenerProduct, thickenerModuleOptions]);

  useEffect(() => {
    if (!selectedPatient || hydratedFromPrescription) return;
    setPrescriptionScheduleTimes(baseScheduleTimes);
  }, [baseScheduleTimes, hydratedFromPrescription, selectedPatient]);

  const applyPrescriptionScheduleTimes = useCallback((times: string[]) => {
    const nextTimes = sanitizeScheduleTimes(times);
    if (nextTimes.length === 0) {
      toast.error("Mantenha pelo menos um horario disponivel para a prescricao.");
      return;
    }

    setPrescriptionScheduleTimes(nextTimes);
    setClosedFormula((current) => ({
      ...current,
      bagQuantities: Object.fromEntries(
        Object.entries(current.bagQuantities).filter(([time]) => nextTimes.includes(time)),
      ),
    }));
    setOpenFormulas((current) =>
      current.map((formula) => ({
        ...formula,
        times: sortScheduleTimes(formula.times.filter((time) => nextTimes.includes(time))),
        manipulationTimes: sortScheduleTimes(formula.manipulationTimes.filter((time) => nextTimes.includes(time))),
      })),
    );
    setModules((current) =>
      current.map((module) => ({
        ...module,
        times: sortScheduleTimes(module.times.filter((time) => nextTimes.includes(time))),
      })),
    );
    setHydration((current) => ({
      ...current,
      times: sortScheduleTimes(current.times.filter((time) => nextTimes.includes(time))),
    }));
    setOralThickenerTimes((current) => sortScheduleTimes(current.filter((time) => nextTimes.includes(time))));
  }, []);

  const addCustomPrescriptionTime = useCallback(() => {
    const normalized = normalizeScheduleTime(customScheduleInput);
    if (!normalized) {
      toast.error("Informe um horario valido no formato HH:MM.");
      return;
    }

    applyPrescriptionScheduleTimes([...prescriptionScheduleTimes, normalized]);
    setCustomScheduleInput("");
  }, [applyPrescriptionScheduleTimes, customScheduleInput, prescriptionScheduleTimes]);

  const removePrescriptionTime = useCallback((time: string) => {
    applyPrescriptionScheduleTimes(prescriptionScheduleTimes.filter((entry) => entry !== time));
  }, [applyPrescriptionScheduleTimes, prescriptionScheduleTimes]);

  const restoreBaseScheduleTimes = useCallback(() => {
    applyPrescriptionScheduleTimes(baseScheduleTimes);
  }, [applyPrescriptionScheduleTimes, baseScheduleTimes]);

  const savePatientSchedulePattern = useCallback(async () => {
    if (!canConfigurePrescriptionSchedules) return;
    if (!selectedPatient?.id) return;

    await updatePatient(selectedPatient.id, { defaultSchedules: prescriptionScheduleTimes });
    setSelectedPatient((current) => current ? { ...current, defaultSchedules: prescriptionScheduleTimes } : current);
    toast.success("Padrao de horarios salvo para este paciente.");
  }, [canConfigurePrescriptionSchedules, prescriptionScheduleTimes, selectedPatient?.id, updatePatient]);

  const clearPatientSchedulePattern = useCallback(async () => {
    if (!canConfigurePrescriptionSchedules) return;
    if (!selectedPatient?.id) return;

    await updatePatient(selectedPatient.id, { defaultSchedules: [] });
    setSelectedPatient((current) => current ? { ...current, defaultSchedules: [] } : current);
    applyPrescriptionScheduleTimes(wardScheduleTimes);
    toast.success("Padrao personalizado do paciente removido.");
  }, [applyPrescriptionScheduleTimes, canConfigurePrescriptionSchedules, selectedPatient?.id, updatePatient, wardScheduleTimes]);

  // --- DYNAMIC STEP DEFINITIONS ---
  const STEP_DEFS: { id: number; title: string; condition: () => boolean }[] = useMemo(() => [
    { id: 1, title: "Selecionar Paciente", condition: () => true },
    { id: 2, title: "Metas e Calorias NI", condition: () => true },
    { id: 3, title: "Via de Alimentação", condition: () => true },
    { id: 4, title: "Acesso Enteral", condition: () => feedingRoutes.enteral },
    { id: 5, title: "Tipo de Sistema", condition: () => feedingRoutes.enteral && enteralAccess !== "VO" },
    { id: 6, title: "Configurar Dieta", condition: () => feedingRoutes.enteral },
    { id: 7, title: "Módulos (Opcional)", condition: () => feedingRoutes.enteral },
    { id: 8, title: "Hidratação", condition: () => feedingRoutes.enteral },
    { id: 9, title: "Prescrição Oral", condition: () => feedingRoutes.oral },
    { id: 10, title: "Prescrição Parenteral", condition: () => feedingRoutes.parenteral },
    { id: 11, title: "Resumo", condition: () => true },
  ], [enteralAccess, feedingRoutes]);

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
    const loadedScheduleTimes = collectPrescriptionScheduleTimes(prescription);

    if (prescription.tneGoals) {
      setGoalTargetKcalPerKg(prescription.tneGoals.targetKcalPerKg);
      setGoalTargetProteinPerKgActual(prescription.tneGoals.targetProteinPerKgActual);
      setGoalTargetProteinPerKgIdeal(prescription.tneGoals.targetProteinPerKgIdeal);
    }
    if (prescription.unintentionalCalories) {
      setUnintentionalCal(prescription.unintentionalCalories);
    }

    if (loadedScheduleTimes.length > 0) {
      setPrescriptionScheduleTimes((current) => (
        resetRoutes
          ? loadedScheduleTimes
          : sanitizeScheduleTimes([...current, ...loadedScheduleTimes])
      ));
    }

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

        setClosedFormula({
          formulaId: enteralDetails?.closedFormula?.formulaId || firstFormula?.formulaId || "",
          infusionMode: enteralDetails?.closedFormula?.infusionMode || (prescription.infusionMode === "gravity" ? "gravity" : prescription.infusionMode === "pump" ? "pump" : ""),
          rate: enteralDetails?.closedFormula?.rate || (prescription.infusionRateMlH ? String(prescription.infusionRateMlH) : ""),
          duration: enteralDetails?.closedFormula?.duration || (prescription.infusionHoursPerDay ? String(prescription.infusionHoursPerDay) : ""),
          bagQuantities: {},
        });

        setOpenInfusionMode("");
        setOpenDurationPerStep("");
        setOpenFormulas([{ id: "1", formulaId: "", volume: "", diluteTo: "", times: [], manipulationTimes: [] }]);
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
              times: sanitizeScheduleTimes(formula.times || []),
              manipulationTimes: sanitizeScheduleTimes(formula.manipulationTimes || formula.times || []),
            }))
            : prescription.formulas && prescription.formulas.length > 0
            ? prescription.formulas.map((formula, index) => ({
              id: `loaded-formula-${index + 1}`,
              formulaId: formula.formulaId,
              volume: formula.volume ? String(formula.volume) : "",
              diluteTo: "",
              times: sanitizeScheduleTimes(formula.schedules || []),
              manipulationTimes: sanitizeScheduleTimes(formula.schedules || []),
            }))
            : [{ id: "1", formulaId: "", volume: "", diluteTo: "", times: [], manipulationTimes: [] }],
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
            times: sanitizeScheduleTimes(module.times || []),
          }))
          : (prescription.modules || []).map((module, index) => ({
          id: `loaded-module-${index + 1}`,
          moduleId: module.moduleId,
          quantity: module.amount ? String(module.amount) : "",
          unit: module.unit || "g",
          times: sanitizeScheduleTimes(
            module.schedules || baseScheduleTimes.slice(0, Math.max(0, module.timesPerDay || 0)),
          ),
        })),
      );

      setHydration({
        volume: enteralDetails?.hydration?.volume || (prescription.hydrationVolume ? String(prescription.hydrationVolume) : ""),
        times: sanitizeScheduleTimes(enteralDetails?.hydration?.times || prescription.hydrationSchedules || []),
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
      setOralDietConsistency(oralDetails?.dietConsistency || "");
      setOralDietCharacteristics(oralDetails?.dietCharacteristics || "");
      setOralMealsPerDay(oralDetails?.mealsPerDay || 6);
      setOralSpeechTherapy(Boolean(oralDetails?.speechTherapy));
      setOralNeedsThickener(Boolean(oralDetails?.needsThickener));
      setOralSafeConsistency(oralDetails?.safeConsistency || "");
      setOralThickenerModuleId(oralDetails?.thickenerModuleId || oralDetails?.thickenerFormulaId || "");
      setOralThickenerProduct(oralDetails?.thickenerProduct || "");
      setOralThickenerGrams(oralDetails?.thickenerGrams ? String(oralDetails.thickenerGrams) : "");
      setOralThickenerVolume(oralDetails?.thickenerVolume ? String(oralDetails.thickenerVolume) : "");
      setOralThickenerTimes(sanitizeScheduleTimes(oralDetails?.thickenerTimes || []));
      setOralEstimatedVET(oralDetails?.estimatedVET ?? prescription.totalCalories ?? 0);
      setOralEstimatedProtein(oralDetails?.estimatedProtein ?? prescription.totalProtein ?? 0);
      setOralEstimatedCarbs(oralDetails?.estimatedCarbs ?? prescription.totalCarbs ?? 0);
      setOralEstimatedLipids(oralDetails?.estimatedLipids ?? prescription.totalFat ?? 0);
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
      const pd = prescription.parenteralDetails;
      const aaG = pd?.aminoacidsG ?? prescription.totalProtein ?? 0;
      const lipG = pd?.lipidsG ?? prescription.totalFat ?? 0;
      const gluG = pd?.glucoseG ?? prescription.totalCarbs ?? 0;
      const gluConc = (pd as any)?.glucoseConc || 50;
      setParenteralValues({
        aminoacidsMl: (pd as any)?.aminoacidsMl || (aaG / 0.10),
        lipidsMl: (pd as any)?.lipidsMl || (lipG / 0.20),
        lipidType: ((pd as any)?.lipidType || "tcm-tcl") as LipidType,
        glucoseMl: (pd as any)?.glucoseMl || (gluG / (gluConc / 100)),
        glucoseConc: gluConc as GlucoseConcentration,
        multivitamin: !!(pd as any)?.multivitamin,
        traceElements: !!(pd as any)?.traceElements,
        access: pd?.access || (prescription.feedingRoute as "central" | "peripheral" | "picc") || "central",
        infusionTime: Math.round(pd?.infusionTime || prescription.infusionHoursPerDay || 24),
        observations: pd?.observations || prescription.notes || "",
      });
    }

    setCompletedSteps([1, 2]);
    setCurrentStep(2);
  }, [ORAL_MEAL_SCHEDULES, baseScheduleTimes]);

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
    setOralDietConsistency(patient.consistency || "");
    setOralSafeConsistency(patient.safeConsistency || "");
    setOralMealsPerDay(Number(patient.mealCount) || 6);
      setOralDietCharacteristics(patient.observation || "");
      setOralObservations(patient.observation || "");
      setOralSpeechTherapy(Boolean(patient.safeConsistency));
      setOralNeedsThickener(Boolean(patient.safeConsistency));
      setEquipmentVolume("");
      setOralThickenerModuleId("");
      setOralThickenerProduct("");
      setOralThickenerGrams("");
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

  const activePrescriptionsByType = useMemo(() => {
    if (!selectedPatient?.id) return { enteral: undefined, oral: undefined, parenteral: undefined } as Record<TherapyType, Prescription | undefined>;

    const patientPrescriptions = prescriptions
      .filter((prescription) => prescription.patientId === selectedPatient.id && prescription.status === "active")
      .sort(sortByMostRecentStartDate);

    return {
      enteral: patientPrescriptions.find((prescription) => prescription.therapyType === "enteral"),
      oral: patientPrescriptions.find((prescription) => prescription.therapyType === "oral"),
      parenteral: patientPrescriptions.find((prescription) => prescription.therapyType === "parenteral"),
    } satisfies Record<TherapyType, Prescription | undefined>;
  }, [selectedPatient, prescriptions]);

  const hasExistingActiveRoute = Boolean(
    activePrescriptionsByType.enteral || activePrescriptionsByType.oral || activePrescriptionsByType.parenteral,
  );

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
      case 3: return feedingRoutes.oral || feedingRoutes.enteral || feedingRoutes.parenteral || hasExistingActiveRoute;
      case 4: return !feedingRoutes.enteral || !!enteralAccess;
      case 5: return enteralAccess === "VO" || !!systemType;
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
            const dilutedAmountPerStage = toNumericValue(entry.diluteTo);
            addNutritionAccumulators(
              totals,
              calculateFormulaNutrition(toFormulaCalculationInput(formula), totalAmount, {
                dilutedAmount: dilutedAmountPerStage
                  ? dilutedAmountPerStage * entry.times.length
                  : undefined,
              }),
            );
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

    // Integrate unintentional calories
    const niCalc = calculateUnintentionalCalories(unintentionalCal);
    if (niCalc.propofolKcal > 0) {
      totals.calories += niCalc.propofolKcal;
      totals.fat += niCalc.propofolLipidsG;
    }
    if (niCalc.glucoseKcal > 0) {
      totals.calories += niCalc.glucoseKcal;
      totals.carbs += niCalc.glucoseCarbsG;
    }
    if (niCalc.citrateKcal > 0) {
      totals.calories += niCalc.citrateKcal; // VET only, no macronutrient
    }

    return finalizeNutritionTotals(totals, selectedPatient);
  }, [systemType, closedFormula, openFormulas, modules, hydration, selectedPatient, availableFormulas, availableModules, feedingRoutes, buildOralNutritionAccumulator, parenteralVET, parenteralAminoacids, parenteralGlucose, parenteralLipids, unintentionalCal]);

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
  const selectedBagTotal = useMemo(
    () => Object.values(closedFormula.bagQuantities).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [closedFormula.bagQuantities],
  );
  const hasRequiredClosedBags = !bagCalculation || selectedBagTotal === bagCalculation.numBags;

  const bmi = nutritionSummary.weightMetrics.bmi;
  const idealWeight = nutritionSummary.weightMetrics.idealWeight;
  const goalSummary = useMemo(() => {
    const energyGoal = goalTargetKcalPerKg && referenceWeight > 0
      ? goalTargetKcalPerKg * referenceWeight
      : undefined;
    const proteinGoal = goalTargetProteinPerKgActual && referenceWeight > 0
      ? goalTargetProteinPerKgActual * referenceWeight
      : undefined;
    const idealProteinGoal = goalTargetProteinPerKgIdeal && calculatedIdealWeight
      ? goalTargetProteinPerKgIdeal * calculatedIdealWeight
      : undefined;

    return {
      energyGoal,
      proteinGoal,
      idealProteinGoal,
      energyPct: energyGoal ? (nutritionSummary.vet / energyGoal) * 100 : undefined,
      proteinPct: proteinGoal ? (nutritionSummary.protein / proteinGoal) * 100 : undefined,
      label: effectiveWeight === "ideal" ? "PI" : "PA",
    };
  }, [
    calculatedIdealWeight,
    effectiveWeight,
    goalTargetKcalPerKg,
    goalTargetProteinPerKgActual,
    goalTargetProteinPerKgIdeal,
    nutritionSummary.protein,
    nutritionSummary.vet,
    referenceWeight,
  ]);

  const unintentionalNoteLines = useMemo(() => {
    const lines: string[] = [];
    if (unintentionalResult.propofolKcal > 0) {
      lines.push(`propofol ${formatDecimalValue(unintentionalResult.propofolKcal)} kcal (${formatDecimalValue(unintentionalResult.propofolLipidsG)} g de lipídeos)`);
    }
    if (unintentionalResult.glucoseKcal > 0) {
      lines.push(`glicose ${formatDecimalValue(unintentionalResult.glucoseKcal)} kcal (${formatDecimalValue(unintentionalResult.glucoseCarbsG)} g de carboidratos)`);
    }
    if (unintentionalResult.citrateKcal > 0) {
      lines.push(`citrato ${formatDecimalValue(unintentionalResult.citrateKcal)} kcal`);
    }
    return lines;
  }, [
    unintentionalResult.citrateKcal,
    unintentionalResult.glucoseCarbsG,
    unintentionalResult.glucoseKcal,
    unintentionalResult.propofolKcal,
    unintentionalResult.propofolLipidsG,
  ]);

  const chartNoteSuggestion = useMemo(() => {
    if (!feedingRoutes.enteral || !systemType) return "";

    const lines: string[] = ["Registro em Prontuário:"];
    const routeLabel = formatEnteralAccessLabel(enteralAccess);

    if (goalSummary.energyGoal || goalSummary.proteinGoal || goalSummary.idealProteinGoal) {
      lines.push("Metas nutricionais:");
      if (goalSummary.energyGoal) {
        lines.push(`- Energia: ${formatDecimalValue(goalSummary.energyGoal)} kcal/dia (${goalTargetKcalPerKg} kcal/kg ${goalSummary.label});`);
      }
      if (goalSummary.proteinGoal) {
        lines.push(`- Proteínas: ${formatDecimalValue(goalSummary.proteinGoal)} g/dia (${goalTargetProteinPerKgActual} g/kg ${goalSummary.label});`);
      }
      if (goalSummary.idealProteinGoal && goalSummary.label !== "PI") {
        lines.push(`- Proteínas por peso ideal: ${formatDecimalValue(goalSummary.idealProteinGoal)} g/dia (${goalTargetProteinPerKgIdeal} g/kg PI);`);
      }
    }

    if (systemType === "closed" && closedFormula.formulaId) {
      const formula = availableFormulas.find((item) => item.id === closedFormula.formulaId);
      const totalVolume = bagCalculation?.totalVolume || 0;
      const rateLabel = closedFormula.infusionMode === "pump"
        ? `${closedFormula.rate} ml/h`
        : `${closedFormula.rate} gotas/min`;

      lines.push("SISTEMA FECHADO:");
      lines.push(`Dieta enteral em sistema fechado, administrada através de ${routeLabel}:`);
      lines.push(
        `- ${buildGenericFormulaDescriptor(formula)}, com velocidade de infusão de ${rateLabel}, totalizando ${formatDecimalValue(totalVolume)} ml/dia;`,
      );
    }

    if (systemType === "open") {
      const durationHours = toNumericValue(openDurationPerStep);
      const openFormulaLines = openFormulas
        .filter((entry) => isPersistedDbId(entry.formulaId) && entry.times.length > 0)
        .map((entry) => {
          const formula = availableFormulas.find((item) => item.id === entry.formulaId);
          const stageVolume = toNumericValue(entry.diluteTo) || toNumericValue(entry.volume) || 0;
          const stageCount = entry.times.length;

          if (!formula || stageVolume <= 0 || stageCount <= 0) return "";

          if (openInfusionMode === "bolus") {
            return `- ${buildGenericFormulaDescriptor(formula)}, fracionada em ${stageCount} etapas de ${formatDecimalValue(stageVolume)} ml, em bolus;`;
          }

          const derivedRate = calculateOpenStageRate(stageVolume, openInfusionMode, durationHours);
          const rateLabel = openInfusionMode === "gravity"
            ? (derivedRate.dropsPerMin ? `${formatDecimalValue(derivedRate.dropsPerMin)} gotas/min` : "velocidade não calculada")
            : (derivedRate.mlPerHour ? `${formatDecimalValue(derivedRate.mlPerHour)} ml/h` : "velocidade não calculada");

          return `- ${buildGenericFormulaDescriptor(formula)}, fracionada em ${stageCount} etapas de ${formatDecimalValue(stageVolume)} ml, com velocidade de infusão de ${rateLabel};`;
        })
        .filter(Boolean);

      if (openFormulaLines.length > 0) {
        lines.push("SISTEMA ABERTO:");
        lines.push(`Dieta enteral em sistema aberto, administrada através de ${routeLabel}:`);
        lines.push(...openFormulaLines);
      }
    }

    const moduleLines = modules
      .filter((moduleEntry) => isPersistedDbId(moduleEntry.moduleId) && moduleEntry.times.length > 0)
      .map((moduleEntry) => {
        const moduleItem = availableModules.find((item) => item.id === moduleEntry.moduleId);
        const quantity = toNumericValue(moduleEntry.quantity) || 0;
        if (!moduleItem || quantity <= 0) return "";
        return `${buildGenericModuleDescriptor(moduleItem)} ${formatDecimalValue(quantity)} ${moduleEntry.unit}, ${moduleEntry.times.length} vezes ao dia`;
      })
      .filter(Boolean);

    if (moduleLines.length > 0) {
      lines.push(`- Módulos: ${moduleLines.join("; ")};`);
    }

    if (hydration.volume && hydration.times.length > 0) {
      lines.push(`- Água para hidratação: ${hydration.volume} ml, ${hydration.times.length} vezes ao dia;`);
    }

    if (unintentionalNoteLines.length > 0) {
      lines.push(`- Kcal não intencionais: ${unintentionalNoteLines.join("; ")};`);
    }

    lines.push("Oferecendo:");
    const vetLabel = unintentionalResult.totalKcal > 0
      ? "VET (nutrição enteral + kcal não intencionais)"
      : "VET";
    lines.push(
      `${vetLabel}: ${nutritionSummary.vet} kcal (${nutritionSummary.vetPerKg} kcal/kg); Proteínas: ${nutritionSummary.protein}g (${nutritionSummary.proteinPerKg}g/kg); Carb.: ${nutritionSummary.carbs}g; Lip.: ${nutritionSummary.fat}g; Fibras: ${nutritionSummary.fiber}g/dia.`,
    );
    lines.push(`Água livre total: ${nutritionSummary.freeWater} ml/dia (${nutritionSummary.freeWaterPerKg} ml/kg/dia).`);
    if (goalSummary.energyPct || goalSummary.proteinPct) {
      lines.push(`A prescrição atual atende ${goalSummary.energyPct ? `${formatDecimalValue(goalSummary.energyPct)}% das metas de energia` : "meta de energia não informada"} e ${goalSummary.proteinPct ? `${formatDecimalValue(goalSummary.proteinPct)}% das metas de proteínas` : "meta de proteínas não informada"}.`);
    }

    return lines.join("\n");
  }, [
    availableFormulas,
    availableModules,
    bagCalculation?.totalVolume,
    closedFormula.formulaId,
    closedFormula.infusionMode,
    closedFormula.rate,
    enteralAccess,
    feedingRoutes.enteral,
    goalSummary.energyGoal,
    goalSummary.energyPct,
    goalSummary.idealProteinGoal,
    goalSummary.label,
    goalSummary.proteinGoal,
    goalSummary.proteinPct,
    goalTargetKcalPerKg,
    goalTargetProteinPerKgActual,
    goalTargetProteinPerKgIdeal,
    hydration.times,
    hydration.volume,
    modules,
    nutritionSummary.carbs,
    nutritionSummary.fat,
    nutritionSummary.fiber,
    nutritionSummary.freeWater,
    nutritionSummary.freeWaterPerKg,
    nutritionSummary.protein,
    nutritionSummary.proteinPerKg,
    nutritionSummary.vet,
    nutritionSummary.vetPerKg,
    openDurationPerStep,
    openFormulas,
    openInfusionMode,
    systemType,
    unintentionalNoteLines,
    unintentionalResult.totalKcal,
  ]);

  const parenteralChartNoteSuggestion = useMemo(() => {
    if (!feedingRoutes.parenteral) return "";

    const accessLabel: Record<typeof parenteralAccess, string> = {
      central: "central",
      peripheral: "periférico",
      picc: "PICC",
    };
    const lipidTypeLabel = parenteralValues.lipidType === "complex-fish-oil"
      ? "lipídeos complexos com óleo de peixe"
      : "TCM/TCL";
    const lines = [
      "Registro em Prontuário:",
      `Terapia nutricional parenteral por acesso ${accessLabel[parenteralAccess] || parenteralAccess}, infundida em ${parenteralInfusionTime || 24} horas.`,
      `${formatDecimalValue(parenteralValues.aminoacidsMl)} ml de aminoácidos a 10% - ${formatDecimalValue(parenteralAminoacids)} g de aminoácidos/dia${parenteralPerKg.amino ? ` (${formatDecimalValue(parenteralPerKg.amino)} g/kg)` : ""}.`,
      `${formatDecimalValue(parenteralValues.glucoseMl)} ml de glicose a ${parenteralValues.glucoseConc}% - ${formatDecimalValue(parenteralGlucose)} g de glicose/dia${parenteralPerKg.glucose ? ` (${formatDecimalValue(parenteralPerKg.glucose)} g/kg)` : ""} - TIG: ${formatDecimalValue(parenteralPerKg.tig)} mg/kg/min.`,
      `${formatDecimalValue(parenteralValues.lipidsMl)} ml de emulsão lipídica 20% (${lipidTypeLabel}) - ${formatDecimalValue(parenteralLipids)} g de lipídeos/dia${parenteralPerKg.lipids ? ` (${formatDecimalValue(parenteralPerKg.lipids)} g/kg)` : ""}.`,
    ];

    if (parenteralValues.multivitamin) {
      lines.push("1 ampola de polivitamínico padrão.");
    }
    if (parenteralValues.traceElements) {
      lines.push("1 ampola de oligoelementos padrão.");
    }

    lines.push(`Ofertando: VET ${formatDecimalValue(parenteralVET)} kcal/dia${parenteralPerKg.kcal ? ` (${formatDecimalValue(parenteralPerKg.kcal)} kcal/kg/dia)` : ""}.`);

    if (parenteralObservations) {
      lines.push(`Observações: ${parenteralObservations}`);
    }

    return lines.join("\n");
  }, [
    feedingRoutes.parenteral,
    parenteralAccess,
    parenteralAminoacids,
    parenteralGlucose,
    parenteralInfusionTime,
    parenteralLipids,
    parenteralObservations,
    parenteralPerKg.amino,
    parenteralPerKg.glucose,
    parenteralPerKg.kcal,
    parenteralPerKg.lipids,
    parenteralPerKg.tig,
    parenteralVET,
    parenteralValues.aminoacidsMl,
    parenteralValues.glucoseConc,
    parenteralValues.glucoseMl,
    parenteralValues.lipidType,
    parenteralValues.lipidsMl,
    parenteralValues.multivitamin,
    parenteralValues.traceElements,
  ]);

  const oralChartNoteSuggestion = useMemo(() => {
    if (!feedingRoutes.oral) return "";

    const lines = ["Registro em Prontuário:"];
    const kcalSuffix = [
      oralTotals.vetPerKg > 0 ? `${formatDecimalValue(oralTotals.vetPerKg)} kcal/kg PA` : "",
      oralTotals.vetPerKgIdeal ? `${formatDecimalValue(oralTotals.vetPerKgIdeal)} kcal/kg PI` : "",
    ].filter(Boolean);
    const proteinSuffix = [
      oralTotals.proteinPerKg > 0 ? `${formatDecimalValue(oralTotals.proteinPerKg)} g/kg PA` : "",
      oralTotals.proteinPerKgIdeal ? `${formatDecimalValue(oralTotals.proteinPerKgIdeal)} g/kg PI` : "",
    ].filter(Boolean);

    lines.push(
      `Dieta oral em consistência ${oralDietConsistency || "-"}, fracionada em ${oralMealsPerDay || "-"} refeições/dia${oralDietCharacteristics ? `, ${oralDietCharacteristics}` : ""}, com VET estimado de ${formatDecimalValue(oralTotals.vet)} kcal${kcalSuffix.length ? ` (${kcalSuffix.join(" / ")})` : ""}, proteínas ${formatDecimalValue(oralTotals.protein)} g${proteinSuffix.length ? ` (${proteinSuffix.join(" / ")})` : ""}, ${formatDecimalValue(oralTotals.carbs)} g de carboidratos e ${formatDecimalValue(oralTotals.fat)} g de lipídeos.`,
    );

    if (oralSupplements.length > 0) {
      oralSupplements
        .filter((supplement) => supplement.supplementName || supplement.supplementId)
        .forEach((supplement) => {
          const schedules = Object.entries(supplement.schedules || {})
            .filter(([, enabled]) => enabled === true)
            .map(([key]) => ORAL_MEAL_SCHEDULES.find((meal) => meal.key === key)?.label || key);
          lines.push(`- Suplemento oral ${supplement.supplementName || "não informado"}, ${formatDecimalValue(Number(supplement.amount || 0))} ${supplement.unit || "ml"}, ${schedules.length || 0} vezes ao dia${schedules.length ? ` (${schedules.join(", ")})` : ""}.`);
        });
    }

    if (oralTherapyModules.length > 0) {
      oralTherapyModules
        .filter((moduleItem) => moduleItem.moduleName || moduleItem.moduleId)
        .forEach((moduleItem) => {
          const schedules = Object.entries(moduleItem.schedules || {})
            .filter(([, enabled]) => enabled === true)
            .map(([key]) => ORAL_MEAL_SCHEDULES.find((meal) => meal.key === key)?.label || key);
          lines.push(`- Módulo ${moduleItem.moduleName || "não informado"}, ${formatDecimalValue(Number(moduleItem.amount || 0))} ${moduleItem.unit || "g"}, ${schedules.length || 0} vezes ao dia${schedules.length ? ` (${schedules.join(", ")})` : ""}.`);
        });
    }

    if (oralNeedsThickener) {
      lines.push(`- Água espessada com ${oralThickenerProduct || "espessante não informado"}, ${oralThickenerGrams || "-"} g para ${oralThickenerVolume || "-"} ml de água, horários: ${oralThickenerTimes.length > 0 ? oralThickenerTimes.join(", ") : "-"}.`);
    }

    if (oralObservations) {
      lines.push(`Orientações ao manipulador: ${oralObservations}`);
    }

    return lines.join("\n");
  }, [
    ORAL_MEAL_SCHEDULES,
    feedingRoutes.oral,
    oralDietCharacteristics,
    oralDietConsistency,
    oralMealsPerDay,
    oralNeedsThickener,
    oralObservations,
    oralSupplements,
    oralTherapyModules,
    oralThickenerGrams,
    oralThickenerProduct,
    oralThickenerTimes,
    oralThickenerVolume,
    oralTotals.carbs,
    oralTotals.fat,
    oralTotals.protein,
    oralTotals.proteinPerKg,
    oralTotals.proteinPerKgIdeal,
    oralTotals.vet,
    oralTotals.vetPerKg,
    oralTotals.vetPerKgIdeal,
  ]);

  const sidebarSummary = useMemo(() => {
    if (currentStep === 9 && feedingRoutes.oral) {
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

    if (currentStep === 10 && feedingRoutes.parenteral) {
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
        title: currentStep === 11 ? "Resumo das vias selecionadas" : "Resumo da Terapia Nutricional",
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

  // Handlers
  const addOpenFormula = () => setOpenFormulas([...openFormulas, { id: Date.now().toString(), formulaId: "", volume: "", diluteTo: "", times: [], manipulationTimes: [] }]);
  const removeOpenFormula = (id: string) => { if (openFormulas.length > 1) setOpenFormulas(openFormulas.filter(f => f.id !== id)); };
  const updateOpenFormula = (id: string, field: keyof FormulaEntry, value: any) => setOpenFormulas(openFormulas.map(f => f.id === id ? { ...f, [field]: value } : f));
  const toggleFormulaTime = (formulaId: string, time: string) => {
    const f = openFormulas.find(f => f.id === formulaId);
    if (f) {
      updateOpenFormula(
        formulaId,
        "times",
        f.times.includes(time)
          ? sortScheduleTimes(f.times.filter(t => t !== time))
          : sortScheduleTimes([...f.times, time]),
      );
    }
  };

  const toggleFormulaManipulationTime = (formulaId: string, time: string) => {
    const formula = openFormulas.find((item) => item.id === formulaId);
    if (!formula) return;

    updateOpenFormula(
      formulaId,
      "manipulationTimes",
      formula.manipulationTimes.includes(time)
        ? sortScheduleTimes(formula.manipulationTimes.filter((item) => item !== time))
        : sortScheduleTimes([...formula.manipulationTimes, time]),
    );
  };

  const addModule = () => { if (modules.length < 4) setModules([...modules, { id: Date.now().toString(), moduleId: "", quantity: "", unit: "g", times: [] }]); else toast.error("Máximo de 4 módulos"); };
  const removeModule = (id: string) => setModules(modules.filter(m => m.id !== id));
  const updateModule = (id: string, field: keyof ModuleEntry, value: any) => setModules(modules.map(m => m.id === id ? { ...m, [field]: value } : m));
  const toggleModuleTime = (moduleId: string, time: string) => {
    const m = modules.find(m => m.id === moduleId);
    if (m) {
      updateModule(
        moduleId,
        "times",
        m.times.includes(time)
          ? sortScheduleTimes(m.times.filter(t => t !== time))
          : sortScheduleTimes([...m.times, time]),
      );
    }
  };

  const toggleHydrationTime = (time: string) => setHydration({
    ...hydration,
    times: hydration.times.includes(time)
      ? sortScheduleTimes(hydration.times.filter(t => t !== time))
      : sortScheduleTimes([...hydration.times, time]),
  });
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

    if (!feedingRoutes.enteral && !feedingRoutes.oral && !feedingRoutes.parenteral && !hasExistingActiveRoute) {
      toast.error("Selecione pelo menos uma via de alimentacao.");
      return;
    }

    checkVolumeDivergence();
    checkScheduleOverlap();

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
          volume: bagCalculation?.totalVolume || 0,
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

      const openStageVolumes = openFormulas
        .filter((formula) => isPersistedDbId(formula.formulaId))
        .map((formula) => toNumericValue(formula.diluteTo) || toNumericValue(formula.volume) || 0)
        .filter((volume) => volume > 0);

      const uniqueOpenStageVolumes = Array.from(new Set(openStageVolumes.map((volume) => volume.toFixed(2))));
      const openRateBaseVolume = uniqueOpenStageVolumes.length === 1 ? Number(uniqueOpenStageVolumes[0]) : undefined;
      const openDerivedRate = calculateOpenStageRate(
        openRateBaseVolume,
        openInfusionMode,
        parseFloat(openDurationPerStep) || undefined,
      );
      const enteralTotalVolume = systemType === "open"
        ? openFormulas
          .filter((formula) => isPersistedDbId(formula.formulaId))
          .reduce(
            (sum, formula) =>
              sum + ((toNumericValue(formula.diluteTo) || toNumericValue(formula.volume) || 0) * formula.times.length),
            0,
          )
        : enteralFormulas.reduce(
          (sum, formula) => sum + ((formula.volume || 0) * (formula.timesPerDay || 0)),
          0,
        );

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
      const tneGoalsPayload = goalTargetKcalPerKg || goalTargetProteinPerKgActual || goalTargetProteinPerKgIdeal
        ? {
          targetKcalPerKg: goalTargetKcalPerKg,
          targetProteinPerKgActual: goalTargetProteinPerKgActual,
          targetProteinPerKgIdeal: goalTargetProteinPerKgIdeal,
        }
        : undefined;
      const unintentionalCaloriesPayload = unintentionalResult.totalKcal > 0 ? unintentionalCal : undefined;
      const persistPrescription = async (therapyType: TherapyType, data: Record<string, unknown>) => {
        const payload = {
          ...basePrescriptionData,
          ...data,
          tneGoals: tneGoalsPayload,
          unintentionalCalories: unintentionalCaloriesPayload,
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
      const discontinuedRoutes: string[] = [];
      const closeDeselectedRoute = async (therapyType: TherapyType, label: string) => {
        const activePrescription = activePrescriptionsByType[therapyType];
        if (!activePrescription?.id || activePrescription.status !== "active") return;

        await updatePrescriptionStatus(activePrescription.id, {
          status: "completed",
          reason: "Via removida na nova prescricao.",
          effectiveDate: today,
        });
        discontinuedRoutes.push(label);
      };

      if (feedingRoutes.enteral) {
        await persistPrescription("enteral", {
          systemType: systemType || 'open',
          feedingRoute: enteralAccess || undefined,
          infusionMode: (systemType === 'closed' ? closedFormula.infusionMode : openInfusionMode) || undefined,
          infusionRateMlH: systemType === 'closed'
            ? parseFloat(closedFormula.rate) || undefined
            : openInfusionMode === "pump"
              ? openDerivedRate.mlPerHour
              : undefined,
          infusionDropsMin: systemType === 'closed'
            ? closedFormula.infusionMode === "gravity"
              ? parseFloat(closedFormula.rate) || undefined
              : undefined
            : openInfusionMode === "gravity"
              ? openDerivedRate.dropsPerMin
              : undefined,
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
          totalVolume: enteralTotalVolume || undefined,
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
                manipulationTimes: formula.manipulationTimes.length > 0 ? formula.manipulationTimes : formula.times,
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
          notes: `TNE: ${systemType === "closed" ? "Fórmula Enteral de Sistema Fechado" : "Fórmula Enteral de Sistema Aberto"} | Acesso: ${enteralAccess || "-"} | Infusão: ${(systemType === "closed" ? closedFormula.infusionMode : openInfusionMode) || "-"} | Volume para equipo: ${systemType === "open" ? (equipmentVolume || "-") : "n/a"} ml`,
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
            dietConsistency: oralDietConsistency || undefined,
            dietCharacteristics: oralDietCharacteristics || undefined,
            mealsPerDay: oralMealsPerDay,
            speechTherapy: oralSpeechTherapy,
            needsThickener: oralNeedsThickener,
            safeConsistency: oralSafeConsistency || undefined,
            thickenerModuleId: oralNeedsThickener ? oralThickenerModuleId || undefined : undefined,
            thickenerFormulaId: undefined,
            thickenerProduct: oralNeedsThickener ? oralThickenerProduct || undefined : undefined,
            thickenerGrams: oralNeedsThickener ? parseFloat(oralThickenerGrams) || undefined : undefined,
            thickenerVolume: oralNeedsThickener ? parseFloat(oralThickenerVolume) || undefined : undefined,
            thickenerTimes: oralNeedsThickener && oralThickenerTimes.length > 0 ? oralThickenerTimes : undefined,
            estimatedVET: oralEstimatedVET || undefined,
            estimatedProtein: oralEstimatedProtein || undefined,
            estimatedCarbs: oralEstimatedCarbs || undefined,
            estimatedLipids: oralEstimatedLipids || undefined,
            hasOralTherapy: oralHasTherapy,
            supplements: oralSupplements,
            modules: oralTherapyModules,
            observations: oralObservations || undefined,
          },
          notes: `Via oral | Consistencia: ${oralDietConsistency || "-"} | Refeicoes: ${oralMealsPerDay}/dia | Caracteristicas: ${oralDietCharacteristics || "-"} | Fono: ${oralSpeechTherapy ? "Sim" : "Nao"} | Agua com espessante: ${oralNeedsThickener ? "Sim" : "Nao"}${oralNeedsThickener ? ` | Espessante: ${oralThickenerProduct || "-"} | Quantidade: ${oralThickenerGrams || "-"} g | Agua para diluicao: ${oralThickenerVolume || "-"} ml | Horarios: ${oralThickenerTimes.length > 0 ? oralThickenerTimes.join(", ") : "-"}` : ""} | Carboidratos manuais: ${oralEstimatedCarbs || 0} g/dia | Lipidios manuais: ${oralEstimatedLipids || 0} g/dia | Consistencia segura para agua: ${oralSafeConsistency || "-"} | Observacoes: ${oralObservations || "-"}`,
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
            aminoacidsMl: parenteralValues.aminoacidsMl,
            lipidsG: parenteralLipids,
            lipidsMl: parenteralValues.lipidsMl,
            lipidType: parenteralValues.lipidType,
            glucoseG: parenteralGlucose,
            glucoseMl: parenteralValues.glucoseMl,
            glucoseConc: parenteralValues.glucoseConc,
            multivitamin: parenteralValues.multivitamin || undefined,
            traceElements: parenteralValues.traceElements || undefined,
            vetKcal: parenteralVET,
            tigMgKgMin: parenteralPerKg.tig || undefined,
            observations: parenteralObservations || undefined,
          },
          notes: parenteralObservations || `Acesso: ${parenteralAccess} | Infusao: ${parenteralInfusionTime}h | TIG: ${parenteralPerKg.tig.toFixed(2)} mg/kg/min`,
        });
        savedRoutes.push("TNP");
      }

      if (!feedingRoutes.enteral) {
        await closeDeselectedRoute("enteral", "TNE");
      }

      if (!feedingRoutes.oral) {
        await closeDeselectedRoute("oral", "Via oral");
      }

      if (!feedingRoutes.parenteral) {
        await closeDeselectedRoute("parenteral", "TNP");
      }

      if (savedRoutes.length === 0 && discontinuedRoutes.length > 0) {
        savedRoutes.push(`vias encerradas: ${discontinuedRoutes.join(", ")}`);
      }

      try {
        const nextNutritionType = feedingRoutes.enteral
          ? "enteral"
          : feedingRoutes.oral
            ? "oral"
            : feedingRoutes.parenteral
              ? "parenteral"
              : "jejum";
        await updatePatient(selectedPatient.id, {
          name: selectedPatient.name,
          record: selectedPatient.record,
          dob: selectedPatient.dob,
          bed: selectedPatient.bed,
          ward: selectedPatient.ward,
          hospitalId: selectedPatient.hospitalId,
          nutritionType: nextNutritionType,
          consistency: feedingRoutes.oral ? oralDietConsistency || undefined : undefined,
          safeConsistency: feedingRoutes.oral && oralSpeechTherapy ? oralSafeConsistency || undefined : undefined,
          mealCount: feedingRoutes.oral ? oralMealsPerDay : undefined,
          observation: selectedPatient.observation,
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
                    {bmi && bmi > 30 && idealWeight && <span> | PI: {idealWeight.toFixed(1)}kg</span>}
                  </div>
                  {weightConfig.label && (
                    <div className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 font-medium">
                      {weightConfig.label}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded p-2 text-center shadow-sm">
                      <div className="text-lg font-bold text-orange-600">
                        {sidebarSummary.calories}
                      </div>
                      <div className="text-xs text-muted-foreground">kcal total</div>
                      <div className="text-xs font-semibold text-orange-700">
                        {nutritionSummary.weightMetrics.isObese && nutritionSummary.caloriesPerKgIdeal !== null ? `${sidebarSummary.caloriesPerKg} kcal/kg PA | ${nutritionSummary.caloriesPerKgIdeal} kcal/kg PI` : `${sidebarSummary.caloriesPerKg} kcal/kg`}
                      </div>
                      {unintentionalResult.totalKcal > 0 && (
                        <div className="text-xs text-amber-600 mt-0.5">NI: {unintentionalResult.totalKcal.toFixed(0)} kcal</div>
                      )}
                    </div>
                    <div className="bg-white rounded p-2 text-center shadow-sm">
                      <div className="text-lg font-bold text-blue-600">
                        {sidebarSummary.protein}g
                      </div>
                      <div className="text-xs text-muted-foreground">proteínas ({nutritionSummary.proteinPct}% VET)</div>
                      <div className="text-xs font-semibold text-blue-700">
                        {nutritionSummary.weightMetrics.isObese && nutritionSummary.proteinPerKgIdeal !== null ? `${sidebarSummary.proteinPerKg} g/kg PA | ${nutritionSummary.proteinPerKgIdeal} g/kg PI` : `${sidebarSummary.proteinPerKg} g/kg`}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <div className="bg-white rounded p-1.5 text-center shadow-sm">
                      <div className="font-bold text-amber-600">{nutritionSummary.carbs}g</div>
                      <div className="text-muted-foreground">Carb {nutritionSummary.carbsPct}%</div>
                    </div>
                    <div className="bg-white rounded p-1.5 text-center shadow-sm">
                      <div className="font-bold text-red-500">{nutritionSummary.fat}g</div>
                      <div className="text-muted-foreground">Lip {nutritionSummary.fatPct}%</div>
                    </div>
                    <div className="bg-white rounded p-1.5 text-center shadow-sm">
                      <div className="font-bold text-green-600">{nutritionSummary.fiber}g</div>
                      <div className="text-muted-foreground">Fibras</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded p-2 text-center shadow-sm">
                      <div className="text-sm font-bold text-cyan-600">
                        {sidebarSummary.freeWater}
                      </div>
                      <div className="text-xs text-muted-foreground">água livre</div>
                      {selectedPatient.weight && nutritionSummary.freeWater > 0 && (
                        <div className="text-xs font-semibold text-cyan-700">{nutritionSummary.freeWaterPerKg} ml/kg</div>
                      )}
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
                          const patientWard = findWardByReference(wards, p.wardId, p.ward);
                          const initialScheduleTimes = resolvePatientScheduleTimes({
                            settings,
                            ward: patientWard,
                            patient: p,
                          });
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
                          setOpenFormulas([{ id: "1", formulaId: "", volume: "", diluteTo: "", times: [], manipulationTimes: [] }]);
                          setModules([]);
                          setHydration({ volume: "", times: [] });
                          setEquipmentVolume("");
                          setPrescriptionScheduleTimes(initialScheduleTimes);
                          setCustomScheduleInput("");
                          setOralDietConsistency(p.consistency || "");
                            setOralDietCharacteristics(p.observation || "");
                            setOralMealsPerDay(Number(p.mealCount) || 6);
                            setOralSpeechTherapy(Boolean(p.safeConsistency));
                            setOralNeedsThickener(Boolean(p.safeConsistency));
                            setOralSafeConsistency(p.safeConsistency || "");
                            setOralThickenerModuleId("");
                            setOralThickenerProduct("");
                            setOralThickenerGrams("");
                            setOralThickenerVolume("");
                            setOralThickenerTimes([]);
                            setOralEstimatedVET(0);
                            setOralEstimatedProtein(0);
                            setOralEstimatedCarbs(0);
                            setOralEstimatedLipids(0);
                            setOralHasTherapy(false);
                            setOralSupplements([]);
                            setOralTherapyModules([]);
                            setOralObservations(p.observation || "");
                          setParenteralValues({
                            aminoacidsMl: 0,
                            lipidsMl: 0,
                            lipidType: "tcm-tcl",
                            glucoseMl: 0,
                            glucoseConc: 50 as GlucoseConcentration,
                            multivitamin: false,
                            traceElements: false,
                            access: 'central',
                            infusionTime: 24,
                            observations: '',
                          });
                          setUnintentionalCal({});
                          setGoalTargetKcalPerKg(undefined);
                          setGoalTargetProteinPerKgActual(undefined);
                          setGoalTargetProteinPerKgIdeal(undefined);
                          setWeightChoice(null);
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

            {/* Step 2 — Metas Nutricionais + Calorias Não Intencionais */}
            {currentStep === 2 && selectedPatient && (
              <div className="space-y-6">
                {/* Metas Nutricionais */}
                <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <Target className="h-5 w-5" />Metas Nutricionais
                      </div>
                      <div className="flex items-center gap-2">
                        {calculatedBmi && <Badge variant="outline" className="text-xs">IMC {calculatedBmi.toFixed(1)}</Badge>}
                        <div className="flex rounded-lg border overflow-hidden">
                          <button
                            type="button"
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                              effectiveWeight === 'actual'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-muted-foreground hover:bg-gray-50'
                            }`}
                            onClick={() => setWeightChoice('actual')}
                          >
                            PA {selectedPatient.weight ? `(${selectedPatient.weight}kg)` : ''}
                          </button>
                          <button
                            type="button"
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                              effectiveWeight === 'ideal'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-muted-foreground hover:bg-gray-50'
                            }`}
                            onClick={() => setWeightChoice('ideal')}
                          >
                            PI {calculatedIdealWeight ? `(${calculatedIdealWeight.toFixed(1)}kg)` : ''}
                          </button>
                        </div>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Peso de referência: <strong>{effectiveWeight === 'ideal' ? 'Peso Ideal' : 'Peso Atual'}</strong> ({referenceWeight.toFixed(1)}kg)
                      {autoWeightConfig.label && <span className="ml-2 text-xs text-blue-600">• Sugestão: {autoWeightConfig.label}</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Meta kcal/kg ({effectiveWeight === 'ideal' ? 'PI' : 'PA'})</Label>
                        <Input type="number" step="0.1" value={goalTargetKcalPerKg || ''} onChange={e => setGoalTargetKcalPerKg(parseFloat(e.target.value) || undefined)} placeholder="Ex: 25" />
                        {goalTargetKcalPerKg && (
                          <p className="text-xs text-muted-foreground">
                            Meta: {(goalTargetKcalPerKg * referenceWeight).toFixed(0)} kcal/dia
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Meta proteínas g/kg ({effectiveWeight === 'ideal' ? 'PI' : 'PA'})</Label>
                        <Input type="number" step="0.1" value={goalTargetProteinPerKgActual || ''} onChange={e => setGoalTargetProteinPerKgActual(parseFloat(e.target.value) || undefined)} placeholder="Ex: 1.2" />
                        {goalTargetProteinPerKgActual && (
                          <p className="text-xs text-muted-foreground">
                            Meta: {(goalTargetProteinPerKgActual * referenceWeight).toFixed(1)}g/dia
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Meta proteínas g/kg (peso ideal)</Label>
                        <p className="text-xs text-muted-foreground">Para IMC &gt; 30 — referência adicional</p>
                        <Input type="number" step="0.1" value={goalTargetProteinPerKgIdeal || ''} onChange={e => setGoalTargetProteinPerKgIdeal(parseFloat(e.target.value) || undefined)} placeholder="Ex: 2.0" disabled={!calculatedBmi || calculatedBmi <= 30} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Calorias Não Intencionais */}
                <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                      <Flame className="h-5 w-5" />Calorias Não Intencionais
                    </CardTitle>
                    <CardDescription>Infusões que contribuem calorias sem objetivo nutricional direto. São somadas ao VET total.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 p-3 rounded-lg border bg-white">
                        <Label>Propofol (ml/h)</Label>
                        <Input type="number" step="0.1" value={unintentionalCal.propofolMlH || ''} onChange={e => setUnintentionalCal({ ...unintentionalCal, propofolMlH: parseFloat(e.target.value) || undefined })} placeholder="Ex: 10" />
                        <p className="text-xs text-muted-foreground">= {unintentionalResult.propofolKcal.toFixed(0)} kcal/dia</p>
                        <p className="text-xs text-muted-foreground">= {unintentionalResult.propofolLipidsG.toFixed(1)} g lipídeos</p>
                      </div>
                      <div className="space-y-2 p-3 rounded-lg border bg-white">
                        <Label>Glicose (g/dia)</Label>
                        <Input type="number" step="1" value={unintentionalCal.glucoseGDay || ''} onChange={e => setUnintentionalCal({ ...unintentionalCal, glucoseGDay: parseFloat(e.target.value) || undefined })} placeholder="Ex: 50" />
                        <p className="text-xs text-muted-foreground">= {unintentionalResult.glucoseKcal.toFixed(0)} kcal/dia</p>
                        <p className="text-xs text-muted-foreground">Distribuído como carboidrato</p>
                      </div>
                      <div className="space-y-2 p-3 rounded-lg border bg-white">
                        <Label>Citrato (kcal/dia)</Label>
                        <Input type="number" step="1" value={unintentionalCal.citrateKcalDay || ''} onChange={e => setUnintentionalCal({ ...unintentionalCal, citrateKcalDay: parseFloat(e.target.value) || undefined })} placeholder="Ex: 100" />
                        <p className="text-xs text-muted-foreground">Somente no VET, sem macronutriente</p>
                      </div>
                    </div>
                    {unintentionalResult.totalKcal > 0 && (
                      <div className="mt-4 p-3 bg-amber-100 rounded-lg border border-amber-300">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-amber-800">Subtotal Calorias Não Intencionais:</span>
                          <Badge variant="secondary" className="text-lg">{unintentionalResult.totalKcal.toFixed(0)} kcal/dia</Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>Voltar</Button>
                  <Button onClick={() => completeStep(2)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}

            {/* Step 3 — Via de Alimentação */}
            {currentStep === 3 && (
              <Card>
                <CardHeader><CardTitle>3. Via de Alimentação</CardTitle><CardDescription>Selecione a(s) via(s) de alimentação. Enteral pode ser combinada com Oral e/ou Parenteral.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[{ key: "oral", icon: SupplementIcon, label: "Oral", colorClass: "text-sky-600" }, { key: "enteral", icon: EnteralIcon, label: "Enteral", colorClass: "text-violet-600" }, { key: "parenteral", icon: Syringe, label: "Parenteral", colorClass: "text-orange-600" }].map(r => (
                      <div key={r.key} className={`p-6 border-2 rounded-lg cursor-pointer ${feedingRoutes[r.key as keyof typeof feedingRoutes] ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => {
                        const key = r.key as keyof typeof feedingRoutes;
                        const newValue = !feedingRoutes[key];

                        if (key === "enteral") {
                          if (!newValue) {
                            setFeedingRoutes((current) => ({ ...current, enteral: false }));
                          } else {
                            setFeedingRoutes((current) => ({ ...current, enteral: true }));
                          }
                        } else {
                          if (feedingRoutes.enteral) {
                            setFeedingRoutes((current) => ({ ...current, [key]: newValue }));
                          } else {
                            if (!newValue) {
                              setFeedingRoutes((current) => ({ ...current, [key]: false }));
                            } else {
                              setFeedingRoutes({
                                oral: key === "oral",
                                enteral: false,
                                parenteral: key === "parenteral",
                              });
                            }
                          }
                        }
                      }}>
                        <div className="flex items-center gap-3"><Checkbox checked={feedingRoutes[r.key as keyof typeof feedingRoutes]} /><r.icon className={`h-8 w-8 ${r.colorClass}`} /><span className="font-semibold text-lg">{r.label}</span></div>
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
                    <Button variant="outline" onClick={() => setCurrentStep(getPrevStep(currentStep))}>Voltar</Button>
                    <Button onClick={() => {
                      if (!completedSteps.includes(currentStep)) setCompletedSteps([...completedSteps, currentStep]);
                      setCurrentStep(getNextStep(currentStep));
                    }} disabled={!canProceed(currentStep)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4 - Enteral Access */}
            {currentStep === 4 && (
              <Card>
                <CardHeader><CardTitle>4. Acesso Enteral</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[{ v: "SNE", l: "Sonda Nasoenteral (SNE)" }, { v: "SNG", l: "Sonda Nasogástrica (SNG)" }, { v: "SOG", l: "Sonda Orogástrica (SOG)" }, { v: "GTT", l: "Gastrostomia (GTT)" }, { v: "JTT", l: "Jejunostomia (JTT)" }, { v: "VO", l: "Via Oral (VO - fórmulas infantis/suplementos)" }].map(a => (
                      <div key={a.v} className={`p-4 border-2 rounded-lg cursor-pointer ${enteralAccess === a.v ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setEnteralAccess(a.v)}>
                        <div className="flex items-center gap-3"><div className={`w-4 h-4 rounded-full border-2 ${enteralAccess === a.v ? "border-primary bg-primary" : "border-muted-foreground"}`} /><span className="font-medium">{a.l}</span></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(getPrevStep(4))}>Voltar</Button><Button onClick={() => completeStep(4)} disabled={!canProceed(4)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 5 - System Type */}
            {currentStep === 5 && (
              <Card>
                <CardHeader><CardTitle>5. Tipo de Sistema</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 border-2 rounded-lg cursor-pointer ${systemType === "closed" ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setSystemType("closed")}>
                      <div className="flex items-center gap-3 mb-3"><div className={`w-5 h-5 rounded-full border-2 ${systemType === "closed" ? "border-primary bg-primary" : "border-muted-foreground"}`} /><span className="font-semibold text-lg">Sistema Fechado</span></div>

                    </div>
                    <div className={`p-6 border-2 rounded-lg cursor-pointer ${systemType === "open" ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setSystemType("open")}>
                      <div className="flex items-center gap-3 mb-3"><div className={`w-5 h-5 rounded-full border-2 ${systemType === "open" ? "border-primary bg-primary" : "border-muted-foreground"}`} /><span className="font-semibold text-lg">Sistema Aberto</span></div>

                    </div>
                  </div>
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(getPrevStep(5))}>Voltar</Button><Button onClick={() => completeStep(5)} disabled={!canProceed(5)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 5 - Closed System */}
            {currentStep === 6 && systemType === "closed" && (
              <Card>
                <CardHeader><CardTitle>5. Sistema Fechado</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {ageFilterHint && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {ageFilterHint}
                    </div>
                  )}
                  {enteralAvailableClosedFormulas.length === 0 && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      Nenhuma formula fechada compativel com a faixa etaria e a rota cadastradas para este paciente.
                    </div>
                  )}
                  <div className="space-y-2"><Label>Fórmula *</Label><Select value={closedFormula.formulaId} onValueChange={v => setClosedFormula({ ...closedFormula, formulaId: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{enteralAvailableClosedFormulas.map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.composition.density} kcal/ml)</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Modo de Infusão *</Label><div className="grid grid-cols-2 gap-4">{[{ v: "pump", l: "Infusão através de BIC", d: "velocidade calculada em ml/h" }, { v: "gravity", l: "Infusão em modo gravitacional", d: "velocidade calculada em gotas/min" }].map(m => <div key={m.v} className={`p-4 border-2 rounded-lg cursor-pointer ${closedFormula.infusionMode === m.v ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setClosedFormula({ ...closedFormula, infusionMode: m.v as any })}><span className="font-medium">{m.l}</span><p className="text-xs text-muted-foreground">{m.d}</p></div>)}</div></div>
                  {closedFormula.infusionMode && <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Velocidade *</Label><div className="flex items-center gap-2"><Input type="number" value={closedFormula.rate} onChange={e => setClosedFormula({ ...closedFormula, rate: e.target.value })} onBlur={e => checkHighSpeed(e.target.value, closedFormula.infusionMode)} /><span className="text-sm whitespace-nowrap">{closedFormula.infusionMode === "pump" ? "ml/h" : "gotas/min"}</span></div></div><div className="space-y-2"><Label>Tempo de Infusão *</Label><div className="flex items-center gap-2"><Input type="number" value={closedFormula.duration} onChange={e => setClosedFormula({ ...closedFormula, duration: e.target.value })} /><span className="text-sm">horas/dia</span></div></div></div>}
                  {bagCalculation && <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg"><p className="font-semibold text-blue-800">Volume prescrito para 24h: {bagCalculation.totalVolume} ml</p><p className="text-blue-700">A fórmula possui {bagCalculation.bagSize} ml por bolsa</p><p className="font-medium text-blue-800">Enviar para 24h: {bagCalculation.numBags} bolsa(s) necessárias</p></div>}
                  {bagCalculation && <div className="space-y-3">
                    <Label>Horários de Envio das Bolsas</Label>
                    <p className="text-xs text-muted-foreground">Preencher com o número de bolsas a ser entregue em cada horário</p>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                      {prescriptionScheduleTimes.map(t => (
                        <div key={t} className="space-y-1">
                          <Label className="text-xs text-center block">{t}</Label>
                          <Input
                            type="number"
                            className="text-center h-10"
                            value={closedFormula.bagQuantities[t] || ""}
                            onChange={e => updateBagQuantity(t, parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total de bolsas selecionadas: {selectedBagTotal} / {bagCalculation.numBags} necessárias
                    </p>
                    {!hasRequiredClosedBags && (
                      <p className="text-sm text-destructive">
                        Distribua exatamente {bagCalculation.numBags} bolsa(s) nos horários antes de avançar.
                      </p>
                    )}
                  </div>}
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(getPrevStep(6))}>Voltar</Button><Button onClick={() => completeStep(6)} disabled={!closedFormula.formulaId || !closedFormula.infusionMode || !closedFormula.rate || !closedFormula.duration || !hasRequiredClosedBags}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 5 - Open System */}
            {currentStep === 6 && systemType === "open" && (
              <Card>
                <CardHeader><CardTitle>5. Sistema Aberto</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {ageFilterHint && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {ageFilterHint}
                    </div>
                  )}
                  {enteralAvailableOpenFormulas.length === 0 && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      Nenhuma formula aberta compativel com a faixa etaria e a rota cadastradas para este paciente.
                    </div>
                  )}
                  <div className="space-y-2"><Label>Modo de Infusão *</Label><div className="grid grid-cols-3 gap-4">{[{ v: "pump", l: "Infusão através de BIC", d: "velocidade calculada em ml/h" }, { v: "gravity", l: "Infusão em modo gravitacional", d: "velocidade calculada em gotas/min" }, { v: "bolus", l: "Bolus", d: "Infusão do volume total em um curto período de tempo" }].map(m => <div key={m.v} className={`p-4 border-2 rounded-lg cursor-pointer ${openInfusionMode === m.v ? "border-primary bg-primary/5" : "border-muted"}`} onClick={() => setOpenInfusionMode(m.v as any)}><span className="font-medium">{m.l}</span><p className="text-xs text-muted-foreground">{m.d}</p></div>)}</div></div>
                  {(openInfusionMode === "pump" || openInfusionMode === "gravity") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tempo para infusão de cada etapa de NE</Label>
                        <div className="flex items-center gap-2 max-w-xs">
                          <Input type="number" value={openDurationPerStep} onChange={e => setOpenDurationPerStep(e.target.value)} onBlur={e => checkHighSpeedOpen(e.target.value)} />
                          <span className="text-sm">horas</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Tempo previsto para correr cada etapa da dieta aberta. Ex.: cada oferta de 200 mL administrada ao longo de 2 horas.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Volume adicionado em cada etapa de NE (mL)</Label>
                        <Input type="number" value={equipmentVolume} onChange={e => setEquipmentVolume(e.target.value)} className="max-w-xs" placeholder="Ex: 20" />
                        <p className="text-sm text-muted-foreground">Usado no faturamento da dieta aberta. Este volume é faturado mas não é considerado aporte nutricional.</p>
                        {(() => {
                          const totalCalcVol = openFormulas.reduce((sum, formula) => sum + Number(formula.diluteTo || formula.volume || 0), 0);
                          if (equipmentVolume && Number(equipmentVolume) !== totalCalcVol && totalCalcVol > 0) {
                            return (
                              <div className="mt-2 text-amber-600 text-sm flex items-center gap-1 bg-amber-50 p-2 rounded border border-amber-200">
                                <AlertCircle className="h-4 w-4" />
                                <span>O volume ajustado para o equipo ({equipmentVolume} ml) difere do volume total calculado da dieta ({totalCalcVol} ml).</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  )}
                  <div className="space-y-4"><div className="flex justify-between items-center"><Label className="text-lg">Fórmulas</Label><Button variant="outline" size="sm" onClick={addOpenFormula}><Plus className="h-4 w-4 mr-1" />Adicionar</Button></div>
                    {openFormulas.map((f, i) => (
                      <div key={f.id} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                        <div className="flex justify-between"><h4 className="font-semibold">Fórmula {i + 1}</h4>{openFormulas.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeOpenFormula(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2"><Label>Fórmula</Label><Select value={f.formulaId} onValueChange={v => updateOpenFormula(f.id, "formulaId", v)}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{enteralAvailableOpenFormulas.map(af => <SelectItem key={af.id} value={af.id}>{af.name}</SelectItem>)}</SelectContent></Select></div>
                          <div className="space-y-2"><Label>Quantidade por etapa (ml ou g)</Label><Input type="number" value={f.volume} onChange={e => updateOpenFormula(f.id, "volume", e.target.value)} /></div>
                          <div className="space-y-2"><Label>Diluir até (ml) - opcional</Label><Input type="number" value={f.diluteTo} onChange={e => updateOpenFormula(f.id, "diluteTo", e.target.value)} /></div>
                        </div>
                        <p className="text-sm text-muted-foreground">Preencher volume total somente se for necessário adicionar água para diluição da fórmula. A velocidade de infusão será baseada no volume total.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Horários de manipulação/preparo</Label>
                            <div className="flex flex-wrap gap-2">
                              {prescriptionScheduleTimes.map(t => <Button key={t} variant={f.manipulationTimes.includes(t) ? "default" : "outline"} size="sm" onClick={() => toggleFormulaManipulationTime(f.id, t)}>{t}</Button>)}
                            </div>
                            <p className="text-xs text-muted-foreground">Usado para orientar produção/manipulação da dieta aberta.</p>
                          </div>
                          <div className="space-y-2">
                            <Label>Horários de infusão/administração</Label>
                            <div className="flex flex-wrap gap-2">
                              {prescriptionScheduleTimes.map(t => <Button key={t} variant={f.times.includes(t) ? "default" : "outline"} size="sm" onClick={() => toggleFormulaTime(f.id, t)}>{t}</Button>)}
                            </div>
                            <p className="text-xs text-muted-foreground">Usado para cálculo nutricional, mapa e faturamento.</p>
                          </div>
                        </div>
                        {f.formulaId && f.volume && f.times.length > 0 && <div className="text-sm text-muted-foreground bg-muted p-2 rounded">Subtotal: {(() => { const af = availableFormulas.find(x => x.id === f.formulaId); if (!af) return ""; const vol = parseFloat(f.volume) * f.times.length; return `${Math.round(vol * (af.composition.density || af.composition.calories / 100))} kcal, ${Math.round((vol / 100) * af.composition.protein * 10) / 10}g PTN`; })()}</div>}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(getPrevStep(6))}>Voltar</Button><Button onClick={() => completeStep(6)} disabled={!openInfusionMode || openFormulas.every(f => !f.formulaId)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 7 - Modules */}
            {currentStep === 7 && (
              <Card>
                <CardHeader><CardTitle>6. Módulos para Nutrição Enteral (Opcional)</CardTitle><CardDescription>Caso necessário, adicione módulos à agua para hidratação. Caso não acrescente água para hidratação, o módulo será enviado à parte (máx. 4).</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                  <Button variant="outline" onClick={addModule} disabled={modules.length >= 4}><Plus className="h-4 w-4 mr-2" />Adicionar Módulo</Button>
                  {modules.map((m, i) => (
                    <div key={m.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex justify-between"><h4 className="font-semibold">Módulo {i + 1}</h4><Button variant="ghost" size="sm" onClick={() => removeModule(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Módulo</Label><Select value={m.moduleId} onValueChange={v => updateModule(m.id, "moduleId", v)}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{availableModules.map(am => <SelectItem key={am.id} value={am.id}>{am.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Quantidade</Label><Input type="number" value={m.quantity} onChange={e => updateModule(m.id, "quantity", e.target.value)} /></div>
                        <div className="space-y-2"><Label>Unidade</Label><Select value={m.unit} onValueChange={v => updateModule(m.id, "unit", v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="g">g</SelectItem><SelectItem value="ml">ml</SelectItem></SelectContent></Select></div>
                      </div>
                      <div className="space-y-2"><Label>Horários</Label><div className="flex flex-wrap gap-2">{prescriptionScheduleTimes.map(t => <Button key={t} variant={m.times.includes(t) ? "default" : "outline"} size="sm" onClick={() => toggleModuleTime(m.id, t)}>{t}</Button>)}</div></div>
                      {m.moduleId && m.quantity && m.times.length > 0 && <p className="text-sm text-muted-foreground">Total: {parseFloat(m.quantity) * m.times.length} {m.unit}/dia</p>}
                    </div>
                  ))}
                  {modules.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum módulo adicionado</p>}
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(getPrevStep(7))}>Voltar</Button><Button onClick={() => completeStep(7)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 8 - Hydration */}
            {currentStep === 8 && (
              <Card>
                <CardHeader><CardTitle>7. Água/Hidratação</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2"><Label>Volume por horário (ml)</Label><Input type="number" value={hydration.volume} onChange={e => setHydration({ ...hydration, volume: e.target.value })} className="max-w-xs" /></div>
                  <div className="space-y-2"><Label>Horários</Label><div className="flex flex-wrap gap-2">{prescriptionScheduleTimes.map(t => <Button key={t} variant={hydration.times.includes(t) ? "default" : "outline"} size="sm" onClick={() => toggleHydrationTime(t)}>{t}</Button>)}</div></div>
                  {hydration.volume && hydration.times.length > 0 && <p className="text-sm text-muted-foreground">Total: {parseFloat(hydration.volume) * hydration.times.length} ml/dia</p>}
                  <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(getPrevStep(8))}>Voltar</Button><Button onClick={() => completeStep(8)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Step 9 - Oral Prescription (FULL) */}
            {currentStep === 9 && feedingRoutes.oral && (
              <div className="space-y-6">
                {/* Total Ofertado Via Oral */}
                <Card className="border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-orange-700"><Calculator className="h-5 w-5" />Total Ofertado Via Oral</CardTitle>
                    <CardDescription className="text-amber-600 font-medium">Aporte oferecido sem considerar módulos e suplementos</CardDescription>
                  </CardHeader>
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
                    {ageFilterHint && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {ageFilterHint}
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
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Modulo espessante</Label>
                              {thickenerModuleOptions.length > 0 ? (
                                <Select
                                  value={thickenerModuleOptions.some((moduleItem) => moduleItem.id === oralThickenerModuleId) ? oralThickenerModuleId : ""}
                                  onValueChange={(value) => {
                                    const selectedModule = thickenerModuleOptions.find((moduleItem) => moduleItem.id === value);
                                    setOralThickenerModuleId(value);
                                    setOralThickenerProduct(selectedModule?.name || "");
                                  }}
                                >
                                  <SelectTrigger><SelectValue placeholder={oralThickenerProduct || "Selecione o modulo espessante"} /></SelectTrigger>
                                  <SelectContent>
                                    {thickenerModuleOptions.map((moduleItem) => <SelectItem key={moduleItem.id} value={moduleItem.id!}>{moduleItem.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={oralThickenerProduct}
                                  onChange={e => {
                                    setOralThickenerModuleId("");
                                    setOralThickenerProduct(e.target.value);
                                  }}
                                  placeholder="Ex: Espessante"
                                />
                              )}
                            </div>
                            <div className="space-y-2"><Label>Quantidade por oferta (g)</Label><Input type="number" value={oralThickenerGrams} onChange={e => setOralThickenerGrams(e.target.value)} placeholder="Ex: 4" /></div>
                            <div className="space-y-2"><Label>Volume de agua para diluicao (ml)</Label><Input type="number" value={oralThickenerVolume} onChange={e => setOralThickenerVolume(e.target.value)} placeholder="Ex: 150" /></div>
                          </div>
                        )}
                        {oralNeedsThickener && (
                          <div className="space-y-2">
                            <Label>Horarios da agua espessada</Label>
                            <div className="flex flex-wrap gap-2">
                              {prescriptionScheduleTimes.map(time => (
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
                  <CardHeader>
                    <CardTitle>Estimativas da Dieta</CardTitle>
                    <CardDescription>Aporte oferecido sem considerar módulos e suplementos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      O valor calórico e a quantidade de macronutrientes serão adicionados ao aporte total de acordo com os valores preenchidos. Caso não sejam especificados valores, estes não serão somados ao aporte total.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      <div className="space-y-2"><Label>Valor energetico total estimado (kcal)</Label><Input type="number" value={oralEstimatedVET || ''} onChange={e => setOralEstimatedVET(parseInt(e.target.value) || 0)} placeholder="Ex: 1500" /></div>
                      <div className="space-y-2"><Label>Quantidade de proteinas (g/dia)</Label><Input type="number" value={oralEstimatedProtein || ''} onChange={e => setOralEstimatedProtein(parseInt(e.target.value) || 0)} placeholder="Ex: 60" /></div>
                      <div className="space-y-2"><Label>Carboidratos (g/dia)</Label><Input type="number" value={oralEstimatedCarbs || ''} onChange={e => setOralEstimatedCarbs(parseInt(e.target.value) || 0)} placeholder="Ex: 180" /></div>
                      <div className="space-y-2"><Label>Lipidios (g/dia)</Label><Input type="number" value={oralEstimatedLipids || ''} onChange={e => setOralEstimatedLipids(parseInt(e.target.value) || 0)} placeholder="Ex: 45" /></div>
                    </div>
                  </CardContent>
                </Card>
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
                    <div className="space-y-2 pt-4">
                      <Label>Orientações ao manipulador</Label>
                      <Textarea
                        value={oralObservations}
                        onChange={e => setOralObservations(e.target.value)}
                        placeholder="Ex: enviar em copo, mamadeira, xuca, bico adaptado ou outra orientação necessária."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(getPrevStep(9))}>Voltar</Button>
                  <Button onClick={() => completeStep(9)}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}

            {/* Step 10 - Parenteral Prescription */}
            {currentStep === 10 && feedingRoutes.parenteral && (
              <ParenteralStep
                values={parenteralValues}
                selectedPatient={selectedPatient}
                onValuesChange={handleParenteralChange}
                onBack={() => setCurrentStep(getPrevStep(10))}
                onNext={() => completeStep(10)}
              />
            )}

            {/* Step 11 - Summary */}
            {currentStep === 11 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-6 w-6 text-primary" />Resumo da Prescrição Nutricional</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {selectedPatient && <div className="p-4 bg-muted rounded-lg"><p className="font-semibold">{selectedPatient.name}</p><p className="text-sm text-muted-foreground">{selectedPatient.bed} - Peso: {selectedPatient.weight}kg {bmi && `(IMC: ${bmi.toFixed(1)})`} {bmi && bmi > 30 && idealWeight && `(PI: ${idealWeight.toFixed(1)}kg)`}</p></div>}
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
                            <h4 className="font-semibold mb-2">Registro em Prontuário</h4>
                            <div className="bg-muted p-3 rounded text-xs select-all whitespace-pre-line">
                              {chartNoteSuggestion}
                            </div>
                          </div>
                        </>
                      )}

                      {feedingRoutes.oral && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-semibold mb-2">Registro em Prontuário - Via Oral</h4>
                            <div className="bg-muted p-3 rounded text-xs select-all whitespace-pre-line">
                              {oralChartNoteSuggestion}
                            </div>
                          </div>
                        </>
                      )}

                      {feedingRoutes.parenteral && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-semibold mb-2">Registro em Prontuário - Parenteral</h4>
                            <div className="bg-muted p-3 rounded text-xs select-all whitespace-pre-line">
                              {parenteralChartNoteSuggestion}
                            </div>
                          </div>
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
                    <Button variant="outline" onClick={() => setCurrentStep(getPrevStep(11))}>Voltar</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700"><Save className="h-4 w-4 mr-2" />{isSaving ? "Salvando..." : "Salvar Prescrição"}</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
      <Dialog open={highSpeedAlertOpen} onOpenChange={setHighSpeedAlertOpen}>
        <DialogContent className="max-w-md border-l-4 border-l-amber-500">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-6 w-6" />
              Alerta de Seguranca
            </DialogTitle>
            <DialogDescription className="text-base pt-2 text-foreground font-medium">
              {highSpeedAlertMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground pb-4">
            Velocidades elevadas de infusao podem trazer riscos associados. Revise o valor antes de seguir.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHighSpeedAlertOpen(false)}>
              Entendi
            </Button>
            <Button onClick={() => setHighSpeedAlertOpen(false)}>
              Manter valor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrescriptionNew;



