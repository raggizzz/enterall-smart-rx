import type { DailyEvolution, Patient, Prescription, TNEGoals, UnintentionalCalories } from "@/lib/database";

type UnintentionalCaloriesSource = {
  unintentionalCalories?: UnintentionalCalories;
  nonIntentionalKcal?: number;
};

const round1 = (value: number) => Math.round(value * 10) / 10;
export const clampPercent = (value: number): number => Math.max(0, Math.min(value, 140));

export const calculateUnintentionalCaloriesBreakdown = (
  source?: UnintentionalCaloriesSource,
) => {
  const unintentional = source?.unintentionalCalories;

  if (!unintentional) {
    return {
      propofol: 0,
      glucose: 0,
      citrate: 0,
      total: round1(source?.nonIntentionalKcal || 0),
    };
  }

  const propofol = (unintentional.propofolMlH || 0) * 1.1 * 24;
  const glucose = (unintentional.glucoseGDay || 0) * 3.4;
  const citrate = (unintentional.citrateGDay || 0) * 2.47;

  return {
    propofol: round1(propofol),
    glucose: round1(glucose),
    citrate: round1(citrate),
    total: round1(propofol + glucose + citrate),
  };
};

export const getMonitoringWeight = (
  patient?: Pick<Patient, "weight"> | null,
  evolution?: Pick<DailyEvolution, "weight"> | null,
): number | undefined => {
  const weight = evolution?.weight ?? patient?.weight;
  return typeof weight === "number" && Number.isFinite(weight) ? weight : undefined;
};

export const getDailyGoals = (
  patient?: Pick<Patient, "tneGoals"> | null,
  evolution?: Pick<DailyEvolution, "tneGoals"> | null,
): TNEGoals => evolution?.tneGoals || patient?.tneGoals || {};

export const resolveTargetKcalForDay = ({
  patient,
  evolution,
  prescriptionsOnDay,
}: {
  patient?: Pick<Patient, "weight" | "tneGoals"> | null;
  evolution?: Pick<DailyEvolution, "weight" | "tneGoals"> | null;
  prescriptionsOnDay?: Prescription[];
}): number => {
  const goals = getDailyGoals(patient, evolution);
  const weight = getMonitoringWeight(patient, evolution);

  if (goals.targetKcalPerKg && weight) {
    return goals.targetKcalPerKg * weight;
  }

  const prescribedCalories = (prescriptionsOnDay || []).reduce(
    (sum, prescription) => sum + (prescription.totalCalories || 0),
    0,
  );

  if (prescribedCalories > 0) {
    return prescribedCalories;
  }

  if (weight) {
    return weight * 25;
  }

  return 0;
};
