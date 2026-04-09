const NUMERIC_COLLATOR = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

const BIRTH_DATE_DIGITS = 8;

const extractDigits = (value: string) => value.replace(/\D/g, "").slice(0, BIRTH_DATE_DIGITS);

export const formatBirthDateInput = (value: string): string => {
  const digits = extractDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export const isoDateToBirthDateInput = (value?: string | null): string => {
  if (!value) return "";
  const normalized = value.includes("T") ? value.split("T")[0] : value;
  const [year, month, day] = normalized.split("-");
  if (!year || !month || !day) return formatBirthDateInput(value);
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
};

export const birthDateInputToIso = (value: string): string | null => {
  const digits = extractDigits(value);
  if (digits.length !== BIRTH_DATE_DIGITS) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const candidate = new Date(year, month - 1, day);

  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const isCompleteBirthDateInput = (value: string): boolean => extractDigits(value).length === BIRTH_DATE_DIGITS;

export const formatBirthDateForDisplay = (value?: string | null): string => {
  if (!value) return "-";

  const masked = isoDateToBirthDateInput(value);
  if (isCompleteBirthDateInput(masked)) {
    return masked;
  }

  return value;
};

const normalizeBedLabel = (value?: string | null): string => {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/^leito\s*/i, "");
};

export const compareBedLabels = (left?: string | null, right?: string | null): number => {
  const normalizedLeft = normalizeBedLabel(left);
  const normalizedRight = normalizeBedLabel(right);

  if (!normalizedLeft && !normalizedRight) return 0;
  if (!normalizedLeft) return 1;
  if (!normalizedRight) return -1;

  return NUMERIC_COLLATOR.compare(normalizedLeft, normalizedRight);
};
