import { Formula, Module, OralModuleSchedule, OralSupplementSchedule, Patient, Prescription } from "@/lib/database";

type FormulaLike = Pick<
  Formula,
  | "id"
  | "name"
  | "presentationForm"
  | "density"
  | "caloriesPerUnit"
  | "proteinPerUnit"
  | "proteinPct"
  | "carbPerUnit"
  | "carbPct"
  | "fatPerUnit"
  | "fatPct"
  | "fiberPerUnit"
  | "waterContent"
  | "sodiumPerUnit"
  | "potassiumPerUnit"
  | "calciumPerUnit"
  | "phosphorusPerUnit"
  | "plasticG"
  | "paperG"
  | "metalG"
  | "glassG"
  | "proteinSources"
  | "carbSources"
  | "fatSources"
  | "fiberSources"
>;

type ModuleLike = Pick<
  Module,
  | "id"
  | "name"
  | "density"
  | "referenceAmount"
  | "calories"
  | "protein"
  | "carbs"
  | "fat"
  | "fiber"
  | "freeWater"
  | "sodium"
  | "potassium"
  | "calcium"
  | "phosphorus"
  | "proteinSources"
  | "carbSources"
  | "fatSources"
  | "fiberSources"
>;

export interface NutritionAccumulator {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  freeWater: number;
  sodium: number;
  potassium: number;
  calcium: number;
  phosphorus: number;
  residuePlastic: number;
  residuePaper: number;
  residueMetal: number;
  residueGlass: number;
  proteinSources: Set<string>;
  carbSources: Set<string>;
  fatSources: Set<string>;
  fiberSources: Set<string>;
}

export interface WeightMetrics {
  bmi: number | null;
  idealWeight: number | null;
  actualWeight: number | null;
  isObese: boolean;
}

export interface FinalNutritionTotals {
  vet: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  freeWater: number;
  sodium: number;
  potassium: number;
  calcium: number;
  phosphorus: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  proteinPerKg: number;
  carbsPerKg: number;
  fatPerKg: number;
  freeWaterPerKg: number;
  vetPerKg: number;
  caloriesPerKg: number;
  vetPerKgIdeal: number | null;
  proteinPerKgIdeal: number | null;
  carbsPerKgIdeal: number | null;
  fatPerKgIdeal: number | null;
  freeWaterPerKgIdeal: number | null;
  caloriesPerKgIdeal: number | null;
  residueTotal: number;
  residue: number;
  proteinSources: string[];
  carbSources: string[];
  fatSources: string[];
  fiberSources: string[];
  residues: {
    plastic: number;
    paper: number;
    metal: number;
    glass: number;
  };
  sources: {
    protein: string[];
    carbs: string[];
    fat: string[];
    fiber: string[];
  };
  weightMetrics: WeightMetrics;
}

const hasNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const toNumber = (value: unknown): number | undefined => {
  if (hasNumber(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

const addSource = (sources: Set<string>, itemName: string | undefined, sourceValue: string | undefined) => {
  if (!sourceValue) return;
  sources.add(itemName ? `${itemName}: ${sourceValue}` : sourceValue);
};

const countSupplementSchedules = (schedule?: OralSupplementSchedule["schedules"] | OralModuleSchedule["schedules"]) =>
  Object.values(schedule || {}).filter((value) => value === true).length;

export const createNutritionAccumulator = (): NutritionAccumulator => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  freeWater: 0,
  sodium: 0,
  potassium: 0,
  calcium: 0,
  phosphorus: 0,
  residuePlastic: 0,
  residuePaper: 0,
  residueMetal: 0,
  residueGlass: 0,
  proteinSources: new Set<string>(),
  carbSources: new Set<string>(),
  fatSources: new Set<string>(),
  fiberSources: new Set<string>(),
});

export const addNutritionAccumulators = (
  target: NutritionAccumulator,
  source: NutritionAccumulator,
): NutritionAccumulator => {
  target.calories += source.calories;
  target.protein += source.protein;
  target.carbs += source.carbs;
  target.fat += source.fat;
  target.fiber += source.fiber;
  target.freeWater += source.freeWater;
  target.sodium += source.sodium;
  target.potassium += source.potassium;
  target.calcium += source.calcium;
  target.phosphorus += source.phosphorus;
  target.residuePlastic += source.residuePlastic;
  target.residuePaper += source.residuePaper;
  target.residueMetal += source.residueMetal;
  target.residueGlass += source.residueGlass;
  source.proteinSources.forEach((item) => target.proteinSources.add(item));
  source.carbSources.forEach((item) => target.carbSources.add(item));
  source.fatSources.forEach((item) => target.fatSources.add(item));
  source.fiberSources.forEach((item) => target.fiberSources.add(item));
  return target;
};

export const calculateBmi = (weight?: number | null, heightCm?: number | null): number | null => {
  if (!hasNumber(weight) || !hasNumber(heightCm) || heightCm <= 0) return null;
  const heightMeters = heightCm / 100;
  return weight / (heightMeters * heightMeters);
};

export const calculateIdealWeight = (heightCm?: number | null): number | null => {
  if (!hasNumber(heightCm) || heightCm <= 0) return null;
  const heightMeters = heightCm / 100;
  return 25 * heightMeters * heightMeters;
};

export const getWeightMetrics = (patient?: Pick<Patient, "weight" | "height"> | null): WeightMetrics => {
  const bmi = calculateBmi(patient?.weight, patient?.height);
  const idealWeight = calculateIdealWeight(patient?.height);
  const actualWeight = hasNumber(patient?.weight) ? patient.weight : null;
  const isObese = bmi !== null && bmi > 30 && idealWeight !== null;

  return {
    bmi,
    idealWeight,
    actualWeight,
    isObese,
  };
};

export const calculateFormulaNutrition = (
  formula: FormulaLike | undefined,
  totalAmount: number,
): NutritionAccumulator => {
  const totals = createNutritionAccumulator();

  if (!formula || !hasNumber(totalAmount) || totalAmount <= 0) return totals;

  const density =
    toNumber(formula.density)
    ?? (hasNumber(formula.caloriesPerUnit) ? formula.caloriesPerUnit / 100 : undefined)
    ?? 0;
  const nutrientFactor = totalAmount / 100;
  const totalCalories =
    density > 0
      ? totalAmount * density
      : nutrientFactor * (toNumber(formula.caloriesPerUnit) || 0);

  totals.calories += totalCalories;

  const proteinPct = toNumber(formula.proteinPct);
  const carbPct = toNumber(formula.carbPct);
  const fatPct = toNumber(formula.fatPct);

  totals.protein += hasNumber(proteinPct) && totalCalories > 0
    ? (totalCalories * (proteinPct / 100)) / 4
    : nutrientFactor * (toNumber(formula.proteinPerUnit) || 0);
  totals.carbs += hasNumber(carbPct) && totalCalories > 0
    ? (totalCalories * (carbPct / 100)) / 4
    : nutrientFactor * (toNumber(formula.carbPerUnit) || 0);
  totals.fat += hasNumber(fatPct) && totalCalories > 0
    ? (totalCalories * (fatPct / 100)) / 9
    : nutrientFactor * (toNumber(formula.fatPerUnit) || 0);

  totals.fiber += nutrientFactor * (toNumber(formula.fiberPerUnit) || 0);
  totals.freeWater += totalAmount * ((toNumber(formula.waterContent) || 0) / 100);
  totals.sodium += nutrientFactor * (toNumber(formula.sodiumPerUnit) || 0);
  totals.potassium += nutrientFactor * (toNumber(formula.potassiumPerUnit) || 0);
  totals.calcium += nutrientFactor * (toNumber(formula.calciumPerUnit) || 0);
  totals.phosphorus += nutrientFactor * (toNumber(formula.phosphorusPerUnit) || 0);

  const residueFactor = totalAmount / 1000;
  totals.residuePlastic += residueFactor * (toNumber(formula.plasticG) || 0);
  totals.residuePaper += residueFactor * (toNumber(formula.paperG) || 0);
  totals.residueMetal += residueFactor * (toNumber(formula.metalG) || 0);
  totals.residueGlass += residueFactor * (toNumber(formula.glassG) || 0);

  addSource(totals.proteinSources, formula.name, formula.proteinSources);
  addSource(totals.carbSources, formula.name, formula.carbSources);
  addSource(totals.fatSources, formula.name, formula.fatSources);
  addSource(totals.fiberSources, formula.name, formula.fiberSources);

  return totals;
};

export const calculateModuleNutrition = (
  moduleItem: ModuleLike | undefined,
  totalAmount: number,
): NutritionAccumulator => {
  const totals = createNutritionAccumulator();

  if (!moduleItem || !hasNumber(totalAmount) || totalAmount <= 0) return totals;

  const referenceAmount = hasNumber(moduleItem.referenceAmount) && moduleItem.referenceAmount > 0
    ? moduleItem.referenceAmount
    : 1;
  const factor = totalAmount / referenceAmount;
  const densityCalories = hasNumber(moduleItem.density) ? totalAmount * moduleItem.density : 0;
  const referenceCalories = factor * (toNumber(moduleItem.calories) || 0);

  totals.calories += densityCalories > 0 ? densityCalories : referenceCalories;
  totals.protein += factor * (toNumber(moduleItem.protein) || 0);
  totals.carbs += factor * (toNumber(moduleItem.carbs) || 0);
  totals.fat += factor * (toNumber(moduleItem.fat) || 0);
  totals.fiber += factor * (toNumber(moduleItem.fiber) || 0);
  totals.freeWater += factor * (toNumber(moduleItem.freeWater) || 0);
  totals.sodium += factor * (toNumber(moduleItem.sodium) || 0);
  totals.potassium += factor * (toNumber(moduleItem.potassium) || 0);
  totals.calcium += factor * (toNumber(moduleItem.calcium) || 0);
  totals.phosphorus += factor * (toNumber(moduleItem.phosphorus) || 0);

  addSource(totals.proteinSources, moduleItem.name, moduleItem.proteinSources);
  addSource(totals.carbSources, moduleItem.name, moduleItem.carbSources);
  addSource(totals.fatSources, moduleItem.name, moduleItem.fatSources);
  addSource(totals.fiberSources, moduleItem.name, moduleItem.fiberSources);

  return totals;
};

export const finalizeNutritionTotals = (
  totals: NutritionAccumulator,
  patient?: Pick<Patient, "weight" | "height"> | null,
): FinalNutritionTotals => {
  const weightMetrics = getWeightMetrics(patient);
  const actualWeight = weightMetrics.actualWeight;
  const idealWeight = weightMetrics.isObese ? weightMetrics.idealWeight : null;
  const proteinKcal = totals.protein * 4;
  const carbsKcal = totals.carbs * 4;
  const fatKcal = totals.fat * 9;
  const residueTotal = totals.residuePlastic + totals.residuePaper + totals.residueMetal + totals.residueGlass;

  return {
    vet: Math.round(totals.calories),
    calories: Math.round(totals.calories),
    protein: round1(totals.protein),
    carbs: round1(totals.carbs),
    fat: round1(totals.fat),
    fiber: round1(totals.fiber),
    freeWater: Math.round(totals.freeWater),
    sodium: round1(totals.sodium),
    potassium: round1(totals.potassium),
    calcium: round1(totals.calcium),
    phosphorus: round1(totals.phosphorus),
    proteinPct: totals.calories > 0 ? round1((proteinKcal / totals.calories) * 100) : 0,
    carbsPct: totals.calories > 0 ? round1((carbsKcal / totals.calories) * 100) : 0,
    fatPct: totals.calories > 0 ? round1((fatKcal / totals.calories) * 100) : 0,
    proteinPerKg: actualWeight ? round2(totals.protein / actualWeight) : 0,
    carbsPerKg: actualWeight ? round2(totals.carbs / actualWeight) : 0,
    fatPerKg: actualWeight ? round2(totals.fat / actualWeight) : 0,
    freeWaterPerKg: actualWeight ? round1(totals.freeWater / actualWeight) : 0,
    vetPerKg: actualWeight ? round1(totals.calories / actualWeight) : 0,
    caloriesPerKg: actualWeight ? round1(totals.calories / actualWeight) : 0,
    vetPerKgIdeal: idealWeight ? round1(totals.calories / idealWeight) : null,
    proteinPerKgIdeal: idealWeight ? round2(totals.protein / idealWeight) : null,
    carbsPerKgIdeal: idealWeight ? round2(totals.carbs / idealWeight) : null,
    fatPerKgIdeal: idealWeight ? round2(totals.fat / idealWeight) : null,
    freeWaterPerKgIdeal: idealWeight ? round1(totals.freeWater / idealWeight) : null,
    caloriesPerKgIdeal: idealWeight ? round1(totals.calories / idealWeight) : null,
    residueTotal: round1(residueTotal),
    residue: round1(residueTotal),
    proteinSources: Array.from(totals.proteinSources),
    carbSources: Array.from(totals.carbSources),
    fatSources: Array.from(totals.fatSources),
    fiberSources: Array.from(totals.fiberSources),
    residues: {
      plastic: round1(totals.residuePlastic),
      paper: round1(totals.residuePaper),
      metal: round1(totals.residueMetal),
      glass: round1(totals.residueGlass),
    },
    sources: {
      protein: Array.from(totals.proteinSources),
      carbs: Array.from(totals.carbSources),
      fat: Array.from(totals.fatSources),
      fiber: Array.from(totals.fiberSources),
    },
    weightMetrics,
  };
};

export const calculateStoredPrescriptionNutrition = ({
  prescription,
  patient,
  formulas,
  modules,
}: {
  prescription: Prescription;
  patient: Patient;
  formulas: Formula[];
  modules: Module[];
}): FinalNutritionTotals => {
  const totals = createNutritionAccumulator();

  if (prescription.therapyType === "parenteral") {
    totals.calories += prescription.parenteralDetails?.vetKcal ?? prescription.totalCalories ?? 0;
    totals.protein += prescription.parenteralDetails?.aminoacidsG ?? prescription.totalProtein ?? 0;
    totals.carbs += prescription.parenteralDetails?.glucoseG ?? prescription.totalCarbs ?? 0;
    totals.fat += prescription.parenteralDetails?.lipidsG ?? prescription.totalFat ?? 0;
    return finalizeNutritionTotals(totals, patient);
  }

  if (prescription.therapyType === "oral") {
    totals.calories += prescription.oralDetails?.estimatedVET ?? 0;
    totals.protein += prescription.oralDetails?.estimatedProtein ?? 0;

    if (prescription.oralDetails?.supplements?.length) {
      prescription.oralDetails.supplements.forEach((supplement) => {
        const formula = formulas.find((item) => item.id === supplement.supplementId);
        const totalAmount = (supplement.amount || 0) * countSupplementSchedules(supplement.schedules);
        addNutritionAccumulators(totals, calculateFormulaNutrition(formula, totalAmount));
      });
    } else {
      prescription.formulas.forEach((formulaRow) => {
        const formula = formulas.find((item) => item.id === formulaRow.formulaId);
        const totalAmount = (formulaRow.volume || 0) * (formulaRow.timesPerDay || 0);
        addNutritionAccumulators(totals, calculateFormulaNutrition(formula, totalAmount));
      });
    }

    if (prescription.oralDetails?.modules?.length) {
      prescription.oralDetails.modules.forEach((moduleRow) => {
        const moduleItem = modules.find((item) => item.id === moduleRow.moduleId);
        const totalAmount = (moduleRow.amount || 0) * countSupplementSchedules(moduleRow.schedules);
        addNutritionAccumulators(totals, calculateModuleNutrition(moduleItem, totalAmount));
      });
    } else {
      prescription.modules.forEach((moduleRow) => {
        const moduleItem = modules.find((item) => item.id === moduleRow.moduleId);
        const totalAmount = (moduleRow.amount || 0) * (moduleRow.timesPerDay || 0);
        addNutritionAccumulators(totals, calculateModuleNutrition(moduleItem, totalAmount));
      });
    }

    if (prescription.oralDetails?.needsThickener) {
      totals.freeWater += (prescription.oralDetails.thickenerVolume || 0) * (prescription.oralDetails.thickenerTimes?.length || 0);
    }

    return finalizeNutritionTotals(totals, patient);
  }

  if (prescription.systemType === "closed") {
    const formulaId = prescription.enteralDetails?.closedFormula?.formulaId || prescription.formulas[0]?.formulaId;
    const formula = formulas.find((item) => item.id === formulaId);
    const infusionMode = prescription.enteralDetails?.closedFormula?.infusionMode || prescription.infusionMode;
    const rate = toNumber(prescription.enteralDetails?.closedFormula?.rate)
      ?? (infusionMode === "gravity" ? prescription.infusionDropsMin : prescription.infusionRateMlH)
      ?? 0;
    const duration = toNumber(prescription.enteralDetails?.closedFormula?.duration)
      ?? prescription.infusionHoursPerDay
      ?? 0;

    let totalAmount = 0;
    if (rate > 0 && duration > 0) {
      totalAmount = infusionMode === "gravity" ? (rate / 20) * 60 * duration : rate * duration;
    } else if (prescription.formulas[0]?.volume) {
      totalAmount = prescription.formulas[0].volume;
    }

    addNutritionAccumulators(totals, calculateFormulaNutrition(formula, totalAmount));
  } else if (prescription.enteralDetails?.openFormulas?.length) {
    prescription.enteralDetails.openFormulas.forEach((formulaRow) => {
      const formula = formulas.find((item) => item.id === formulaRow.formulaId);
      const totalAmount = (toNumber(formulaRow.volume) || 0) * (formulaRow.times?.length || 0);
      addNutritionAccumulators(totals, calculateFormulaNutrition(formula, totalAmount));
    });
  } else {
    prescription.formulas.forEach((formulaRow) => {
      const formula = formulas.find((item) => item.id === formulaRow.formulaId);
      const totalAmount = (formulaRow.volume || 0) * (formulaRow.timesPerDay || 0);
      addNutritionAccumulators(totals, calculateFormulaNutrition(formula, totalAmount));
    });
  }

  if (prescription.enteralDetails?.modules?.length) {
    prescription.enteralDetails.modules.forEach((moduleRow) => {
      const moduleItem = modules.find((item) => item.id === moduleRow.moduleId);
      const totalAmount = (toNumber(moduleRow.quantity) || 0) * (moduleRow.times?.length || 0);
      addNutritionAccumulators(totals, calculateModuleNutrition(moduleItem, totalAmount));
    });
  } else {
    prescription.modules.forEach((moduleRow) => {
      const moduleItem = modules.find((item) => item.id === moduleRow.moduleId);
      const totalAmount = (moduleRow.amount || 0) * (moduleRow.timesPerDay || 0);
      addNutritionAccumulators(totals, calculateModuleNutrition(moduleItem, totalAmount));
    });
  }

  if (prescription.enteralDetails?.hydration?.volume && prescription.enteralDetails?.hydration?.times?.length) {
    totals.freeWater += (toNumber(prescription.enteralDetails.hydration.volume) || 0) * prescription.enteralDetails.hydration.times.length;
  } else {
    totals.freeWater += (prescription.hydrationVolume || 0) * (prescription.hydrationSchedules?.length || 0);
  }

  return finalizeNutritionTotals(totals, patient);
};
