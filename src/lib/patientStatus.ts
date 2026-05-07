import type { Patient } from "@/lib/database";

const toDayTime = (value?: string | Date | null, endOfDay = false): number | null => {
  if (!value) return null;

  const date = value instanceof Date
    ? new Date(value)
    : new Date(`${String(value).split("T")[0]}T${endOfDay ? "23:59:59" : "00:00:00"}`);

  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
};

export const isPatientActiveForOperations = (patient?: Patient | null, referenceDate?: Date): boolean => {
  if (!patient) return true;

  const status = patient.status || "active";
  if (status !== "active") return false;

  const referenceTime = toDayTime(referenceDate || new Date());
  const dischargeTime = toDayTime(patient.dischargeDate, true);

  if (referenceTime !== null && dischargeTime !== null && dischargeTime <= referenceTime) {
    return false;
  }

  return true;
};
