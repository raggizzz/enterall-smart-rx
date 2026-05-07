import type { AppSettings, Formula, Module, Prescription } from "@/lib/database";

type CostSummary = {
  materialCostTotal: number;
  nursingTimeSeconds: number;
  nursingTimeMinutes: number;
  nursingCostTotal: number;
  indirectCostTotal: number;
  totalCost: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const getAdministrationCount = (schedules?: string[], timesPerDay?: number) => {
  if (Array.isArray(schedules) && schedules.length > 0) return schedules.length;
  return Math.max(Number(timesPerDay) || 0, 0);
};

const getExplicitDailyBagCount = (prescription: Prescription) => {
  if (prescription.therapyType !== "enteral" || prescription.systemType !== "closed") return 0;

  const bagQuantities = prescription.enteralDetails?.closedFormula?.bagQuantities || {};
  return Object.values(bagQuantities).reduce((sum, quantity) => sum + (Number(quantity) || 0), 0);
};

const getFormulaDailyBagCount = (
  prescription: Prescription,
  formulaEntry: Prescription["formulas"][number],
  formula?: Formula,
) => {
  if (prescription.therapyType !== "enteral" || prescription.systemType !== "closed") return 0;

  const explicitDailyBags = getExplicitDailyBagCount(prescription);
  if (explicitDailyBags > 0 && prescription.formulas.length <= 1) return explicitDailyBags;

  const totalVolume = formulaEntry.volume || 0;
  const bagSize = formula?.presentations?.[0] || 0;
  if (bagSize > 0 && totalVolume > 0) return Math.ceil(totalVolume / bagSize);

  return Math.max(getAdministrationCount(formulaEntry.schedules, formulaEntry.timesPerDay), 1);
};

const calculateFormulaMaterialCost = (prescription: Prescription, formulaEntry: Prescription["formulas"][number], formula?: Formula) => {
  if (!formula) return 0;

  const billingUnit = formula.billingUnit || "ml";
  const billingPrice = Number(formula.billingPrice || 0);
  const presentationSize = formula.presentations?.[0] || 0;
  const administrationsPerDay = prescription.therapyType === "enteral" && prescription.systemType === "closed"
    ? 1
    : getAdministrationCount(formulaEntry.schedules, formulaEntry.timesPerDay);
  const dailyAmount = (formulaEntry.volume || 0) * administrationsPerDay;

  if (prescription.therapyType === "enteral" && prescription.systemType === "closed") {
    const dailyBags = getFormulaDailyBagCount(prescription, formulaEntry, formula);
    if (billingUnit === "unit") return dailyBags * billingPrice;
    if (billingUnit === "ml" && presentationSize > 0) return dailyBags * presentationSize * billingPrice;
  }

  if (billingUnit === "unit" && presentationSize > 0) {
    return Math.ceil(dailyAmount / presentationSize) * billingPrice;
  }

  return dailyAmount * billingPrice;
};

const calculateModuleMaterialCost = (moduleEntry: Prescription["modules"][number], moduleItem?: Module) => {
  if (!moduleItem) return 0;

  const billingUnit = moduleItem.billingUnit || "g";
  const billingPrice = Number(moduleItem.billingPrice || 0);
  const administrationsPerDay = getAdministrationCount(moduleEntry.schedules, moduleEntry.timesPerDay);
  const dailyAmount = (moduleEntry.amount || 0) * administrationsPerDay;
  const referenceAmount = Number(moduleItem.referenceAmount || 0);

  if (billingUnit === "unit" && referenceAmount > 0) {
    return Math.ceil(dailyAmount / referenceAmount) * billingPrice;
  }

  return dailyAmount * billingPrice;
};

const calculateOralThickenerCost = (prescription: Prescription, modules: Module[], formulas: Formula[]) => {
  const oralDetails = prescription.oralDetails;
  if (prescription.therapyType !== "oral" || !oralDetails?.needsThickener) return 0;

  const timesPerDay = getAdministrationCount(oralDetails.thickenerTimes);
  const gramsPerDose = Number(oralDetails.thickenerGrams || 0);
  const volumePerDose = Number(oralDetails.thickenerVolume || 0);
  if (timesPerDay <= 0 || (gramsPerDose <= 0 && volumePerDose <= 0)) return 0;

  const moduleItem = modules.find((item) =>
    item.id === oralDetails.thickenerModuleId
    || item.id === oralDetails.thickenerFormulaId
    || item.name === oralDetails.thickenerProduct
  );
  if (moduleItem) {
    const dailyAmount = (gramsPerDose > 0 ? gramsPerDose : volumePerDose) * timesPerDay;
    return calculateModuleMaterialCost({
      moduleId: moduleItem.id || "",
      moduleName: moduleItem.name,
      amount: dailyAmount,
      timesPerDay: 1,
      schedules: oralDetails.thickenerTimes,
      unit: gramsPerDose > 0 ? "g" : "ml",
    }, moduleItem);
  }

  const legacyFormula = formulas.find((item) =>
    item.id === oralDetails.thickenerFormulaId
    || item.name === oralDetails.thickenerProduct
  );
  if (!legacyFormula) return 0;

  return calculateFormulaMaterialCost(prescription, {
    formulaId: legacyFormula.id || "",
    formulaName: legacyFormula.name,
    volume: volumePerDose > 0 ? volumePerDose : gramsPerDose,
    timesPerDay,
    schedules: oralDetails.thickenerTimes || [],
  }, legacyFormula);
};

export const calculatePrescriptionCosts = ({
  prescription,
  formulas,
  modules,
  settings,
  includeIndirectCost = true,
}: {
  prescription: Prescription;
  formulas: Formula[];
  modules: Module[];
  settings?: AppSettings | null;
  includeIndirectCost?: boolean;
}): CostSummary => {
  const nursingCosts = settings?.nursingCosts;
  const indirectCosts = settings?.indirectCosts;

  let materialCostTotal = 0;
  let nursingTimeSeconds = 0;

  prescription.formulas.forEach((formulaEntry) => {
    const formula = formulas.find((item) => item.id === formulaEntry.formulaId);
    materialCostTotal += calculateFormulaMaterialCost(prescription, formulaEntry, formula);
  });

  prescription.modules.forEach((moduleEntry) => {
    const moduleItem = modules.find((item) => item.id === moduleEntry.moduleId);
    materialCostTotal += calculateModuleMaterialCost(moduleEntry, moduleItem);
  });

  materialCostTotal += calculateOralThickenerCost(prescription, modules, formulas);

  if (prescription.therapyType === "enteral" && nursingCosts) {
    const dailyHydrationStages = prescription.hydrationSchedules?.length || 0;

    if (prescription.systemType === "open") {
      const dailyStages = prescription.formulas.reduce(
        (sum, formulaEntry) => sum + getAdministrationCount(formulaEntry.schedules, formulaEntry.timesPerDay),
        0,
      );
      const openTimePerStage = prescription.infusionMode === "pump"
        ? nursingCosts.timeOpenSystemPump
        : prescription.infusionMode === "gravity"
          ? nursingCosts.timeOpenSystemGravity
          : nursingCosts.timeBolus;
      nursingTimeSeconds += dailyStages * (openTimePerStage || 0);
    } else {
      const explicitDailyBags = getExplicitDailyBagCount(prescription);
      const dailyBags = explicitDailyBags > 0
        ? explicitDailyBags
        : prescription.formulas.reduce((sum, formulaEntry) => {
          const formula = formulas.find((item) => item.id === formulaEntry.formulaId);
          return sum + getFormulaDailyBagCount(prescription, formulaEntry, formula);
        }, 0);
      const closedTimePerBag = prescription.infusionMode === "pump"
        ? nursingCosts.timeClosedSystemPump
        : nursingCosts.timeClosedSystemGravity;
      nursingTimeSeconds += dailyBags * (closedTimePerBag || 0);
    }

    if (dailyHydrationStages > 0) {
      nursingTimeSeconds += dailyHydrationStages * (nursingCosts.timeBolus || 0);
    }
  }

  const nursingTimeMinutes = nursingTimeSeconds / 60;
  const nursingCostTotal = (nursingCosts?.hourlyRate || 0) > 0
    ? (nursingTimeSeconds / 3600) * (nursingCosts?.hourlyRate || 0)
    : 0;
  const indirectCostTotal = includeIndirectCost ? (indirectCosts?.laborCosts || 0) : 0;
  const totalCost = materialCostTotal + nursingCostTotal + indirectCostTotal;

  return {
    materialCostTotal: round2(materialCostTotal),
    nursingTimeSeconds: round2(nursingTimeSeconds),
    nursingTimeMinutes: round2(nursingTimeMinutes),
    nursingCostTotal: round2(nursingCostTotal),
    indirectCostTotal: round2(indirectCostTotal),
    totalCost: round2(totalCost),
  };
};
