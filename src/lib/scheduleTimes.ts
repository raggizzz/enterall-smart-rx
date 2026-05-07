import type { AppSettings, Patient, Ward } from "@/lib/database";

export const DEFAULT_SCHEDULE_TIMES = ["03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00"];

const ANCHOR_MINUTES = 3 * 60;

export const normalizeScheduleTime = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const toAnchoredMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  const total = (hours * 60) + minutes;
  return total < ANCHOR_MINUTES ? total + (24 * 60) : total;
};

export const sortScheduleTimes = (times: string[]): string[] => (
  [...times]
    .map((time) => normalizeScheduleTime(time))
    .filter((time): time is string => Boolean(time))
    .sort((left, right) => toAnchoredMinutes(left) - toAnchoredMinutes(right))
);

export const sanitizeScheduleTimes = (times: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  times.forEach((time) => {
    const next = normalizeScheduleTime(time);
    if (!next || seen.has(next)) return;
    seen.add(next);
    normalized.push(next);
  });

  return sortScheduleTimes(normalized);
};

export const areScheduleTimesEqual = (left: Array<string | null | undefined>, right: Array<string | null | undefined>) => {
  const normalizedLeft = sanitizeScheduleTimes(left);
  const normalizedRight = sanitizeScheduleTimes(right);

  if (normalizedLeft.length !== normalizedRight.length) return false;

  return normalizedLeft.every((time, index) => time === normalizedRight[index]);
};

const normalizeLookupKey = (value?: string | null) => (
  value || ""
)
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

export const findWardByReference = (
  wards: Ward[],
  wardId?: string | null,
  wardName?: string | null,
): Ward | undefined => {
  const normalizedWardId = normalizeLookupKey(wardId);
  const normalizedWardName = normalizeLookupKey(wardName);

  return wards.find((ward) => {
    if (wardId && ward.id === wardId) return true;
    const wardKeys = [
      ward.id,
      ward.code,
      ward.name,
    ]
      .map(normalizeLookupKey)
      .filter(Boolean);

    if (normalizedWardId && wardKeys.includes(normalizedWardId)) return true;
    if (normalizedWardName) {
      if (wardKeys.includes(normalizedWardName)) return true;
      if (wardKeys.some((key) => key.includes(normalizedWardName) || normalizedWardName.includes(key))) return true;
    }
    return false;
  });
};

export const resolveConfiguredScheduleTimes = ({
  settings,
  ward,
}: {
  settings?: AppSettings | null;
  ward?: Ward | null;
}): string[] => {
  const wardSchedules = sanitizeScheduleTimes(ward?.defaultSchedules || []);
  if (wardSchedules.length > 0) return wardSchedules;

  const unitSchedules = sanitizeScheduleTimes(settings?.labelSettings?.defaultDietSchedules || []);
  if (unitSchedules.length > 0) return unitSchedules;

  return [...DEFAULT_SCHEDULE_TIMES];
};

export const resolvePatientScheduleTimes = ({
  settings,
  ward,
  patient,
}: {
  settings?: AppSettings | null;
  ward?: Ward | null;
  patient?: Patient | null;
}): string[] => {
  const patientSchedules = sanitizeScheduleTimes(patient?.defaultSchedules || []);
  if (patientSchedules.length > 0) return patientSchedules;

  return resolveConfiguredScheduleTimes({ settings, ward });
};
