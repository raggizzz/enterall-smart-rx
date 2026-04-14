export type ManualAdjustmentMode = "cancellation" | "extra";

export type ManualAdjustmentCategory = "formula" | "module" | "supply" | "diet";

export interface ManualBillingAdjustment {
  id: string;
  hospitalId?: string;
  ward: string;
  effectiveDate: string;
  mode: ManualAdjustmentMode;
  productCode?: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  category: ManualAdjustmentCategory;
  observation?: string;
  createdAt: string;
}

const STORAGE_KEY = "enterall_manual_billing_adjustments";

const readRawAdjustments = (): ManualBillingAdjustment[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getManualBillingAdjustments = (): ManualBillingAdjustment[] => readRawAdjustments();

export const addManualBillingAdjustment = (
  adjustment: Omit<ManualBillingAdjustment, "id" | "createdAt">,
): ManualBillingAdjustment => {
  const nextAdjustment: ManualBillingAdjustment = {
    ...adjustment,
    id: `manual-adjustment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const nextList = [...readRawAdjustments(), nextAdjustment];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
  }

  return nextAdjustment;
};

export const getManualBillingAdjustmentsForPeriod = (
  startDate: string,
  endDate: string,
  options?: { hospitalId?: string; ward?: string },
): ManualBillingAdjustment[] => {
  return readRawAdjustments().filter((adjustment) => {
    if (adjustment.effectiveDate < startDate || adjustment.effectiveDate > endDate) return false;
    if (options?.hospitalId && adjustment.hospitalId && adjustment.hospitalId !== options.hospitalId) return false;
    if (options?.ward && options.ward !== "all" && adjustment.ward !== options.ward) return false;
    return true;
  });
};
