import type { Prescription } from "@/lib/database";

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const roundWhole = (value: number) => Math.round(value);

export const getOpenDurationHours = (prescription: Pick<Prescription, "infusionHoursPerDay" | "enteralDetails">): number | undefined =>
  toNumber(prescription.enteralDetails?.openDurationPerStep) ?? toNumber(prescription.infusionHoursPerDay);

export const calculateOpenStageRate = (
  stageVolumeMl: number | undefined,
  infusionMode: Prescription["infusionMode"],
  durationHours: number | undefined,
): { mlPerHour?: number; dropsPerMin?: number } => {
  if (!stageVolumeMl || stageVolumeMl <= 0 || !durationHours || durationHours <= 0) {
    return {};
  }

  const mlPerHour = stageVolumeMl / durationHours;
  if (infusionMode === "gravity") {
    return {
      mlPerHour,
      dropsPerMin: mlPerHour / 3,
    };
  }

  if (infusionMode === "pump") {
    return { mlPerHour };
  }

  return {};
};

export const getPrescriptionRateLabel = (
  prescription: Pick<Prescription, "systemType" | "infusionMode" | "infusionRateMlH" | "infusionDropsMin" | "infusionHoursPerDay" | "enteralDetails">,
  stageVolumeMl?: number,
): string | undefined => {
  if (prescription.infusionMode === "bolus") {
    return "Bolus";
  }

  if (prescription.systemType === "open") {
    const derived = calculateOpenStageRate(
      stageVolumeMl,
      prescription.infusionMode,
      getOpenDurationHours(prescription),
    );

    if (prescription.infusionMode === "gravity" && derived.dropsPerMin) {
      return `${roundWhole(derived.dropsPerMin)} gotas/min`;
    }

    if (prescription.infusionMode === "pump" && derived.mlPerHour) {
      return `${roundWhole(derived.mlPerHour)} ml/h`;
    }
  }

  if (prescription.infusionMode === "gravity" && prescription.infusionDropsMin && prescription.infusionDropsMin > 0) {
    return `${roundWhole(prescription.infusionDropsMin)} gotas/min`;
  }

  if (prescription.infusionRateMlH && prescription.infusionRateMlH > 0) {
    return `${roundWhole(prescription.infusionRateMlH)} ml/h`;
  }

  return undefined;
};
