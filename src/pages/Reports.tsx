import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Package, Recycle, TrendingUp, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useEvolutions,
  useFormulas,
  useHospitals,
  useModules,
  usePatients,
  usePrescriptions,
  useSettings,
  useSupplies,
  useWards,
} from "@/hooks/useDatabase";
import { can } from "@/lib/permissions";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import type { Formula, Module, Patient, Prescription, Supply } from "@/lib/database";

type ChartRow = {
  date: string;
  enteralPct: number;
  parenteralPct: number;
  nonIntentionalPct: number;
  totalPct: number;
};

type ProductCategory = "formula" | "module" | "supply";

type ProductUsageRow = {
  productId: string;
  productName: string;
  manufacturer: string;
  category: ProductCategory;
  therapyType: Prescription["therapyType"] | "mixed";
  billingUnit: string;
  totalQuantity: number;
  totalVolumeMl: number;
  estimatedUnits: number;
  patientDays: number;
  uniquePatients: number;
  uniquePrescriptions: number;
  totalCalories: number;
  totalCost: number;
  avgQuantityPerPatient: number;
  avgQuantityPerDay: number;
  avgCostPerPatient: number;
  costPerPatientDay: number;
  plasticG: number;
  paperG: number;
  metalG: number;
  glassG: number;
  wastePerPatient: number;
};

type UsageAccumulator = {
  productId: string;
  productName: string;
  manufacturer: string;
  category: ProductCategory;
  therapyTypes: Set<Prescription["therapyType"]>;
  billingUnit: string;
  totalQuantity: number;
  totalVolumeMl: number;
  estimatedUnits: number;
  patientDays: number;
  patientIds: Set<string>;
  prescriptionIds: Set<string>;
  totalCalories: number;
  totalCost: number;
  plasticG: number;
  paperG: number;
  metalG: number;
  glassG: number;
};

const MATERIAL_COLORS: Record<string, string> = {
  Plastico: "#2563eb",
  Papel: "#a16207",
  Metal: "#64748b",
  Vidro: "#16a34a",
};

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  formula: "Formula",
  module: "Modulo",
  supply: "Insumo",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const escapeXml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const formatCurrency = (value: number): string => currencyFormatter.format(value || 0);

const formatNumber = (value: number, digits = 1): string =>
  value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const clampPercent = (value: number): number => Math.max(0, Math.min(value, 140));

const buildDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const loop = new Date(start);

  while (loop <= end) {
    dates.push(loop.toISOString().split("T")[0]);
    loop.setDate(loop.getDate() + 1);
  }

  return dates;
};

const formatLabelDate = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00`);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
};

const calculateUnintentionalKcal = (patient?: Patient): number => {
  const unintentional = patient?.unintentionalCalories;
  if (!unintentional) return 0;

  const propofol = (unintentional.propofolMlH || 0) * 1.1 * 24;
  const glucose = (unintentional.glucoseGDay || 0) * 3.4;
  const citrate = (unintentional.citrateGDay || 0) * 3;

  return propofol + glucose + citrate;
};

const isPrescriptionActiveOn = (prescription: Prescription, day: string): boolean => {
  return prescription.startDate <= day && (!prescription.endDate || prescription.endDate >= day);
};

const sortByMostRecentStartDate = (left: Prescription, right: Prescription): number => {
  return right.startDate.localeCompare(left.startDate);
};

const pickPrescriptionForType = (
  prescriptions: Prescription[],
  therapyType: Prescription["therapyType"],
  preferredId?: string,
): Prescription | undefined => {
  const candidates = prescriptions.filter((prescription) => prescription.therapyType === therapyType);
  if (preferredId) {
    const exactMatch = candidates.find((prescription) => prescription.id === preferredId);
    if (exactMatch) return exactMatch;
  }

  return [...candidates].sort(sortByMostRecentStartDate)[0];
};

const getOverlapDays = (startDate: string, endDate: string | undefined, filterStart: string, filterEnd: string): number => {
  const effectiveStart = startDate > filterStart ? startDate : filterStart;
  const effectiveEnd = endDate && endDate < filterEnd ? endDate : filterEnd;

  if (effectiveStart > effectiveEnd) return 0;

  const start = new Date(`${effectiveStart}T00:00:00`);
  const end = new Date(`${effectiveEnd}T00:00:00`);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
};

const getAdministrationCount = (schedules?: string[], timesPerDay?: number): number => {
  if (schedules && schedules.length > 0) return schedules.length;
  if (timesPerDay && timesPerDay > 0) return timesPerDay;
  return 1;
};

const getFormulaByName = (formulas: Formula[], formulaName?: string) => {
  if (!formulaName) return undefined;
  const normalized = formulaName.trim().toLowerCase();
  return formulas.find((formula) => formula.name.trim().toLowerCase() === normalized);
};

const getPumpSupply = (supplies: Supply[]): Supply | undefined =>
  supplies.find((supply) => supply.isActive && supply.type === "set" && supply.name.toLowerCase().includes("bomba"))
  || supplies.find((supply) => supply.isActive && supply.type === "set");

const getGravitySupply = (supplies: Supply[]): Supply | undefined =>
  supplies.find((supply) => supply.isActive && supply.type === "set" && supply.name.toLowerCase().includes("gravit"))
  || supplies.find((supply) => supply.isActive && supply.type === "set");

const getBottleSupply = (supplies: Supply[]): Supply | undefined =>
  supplies.find((supply) => supply.isActive && supply.type === "bottle")
  || supplies.find((supply) => supply.isActive && supply.category === "feeding-bottle")
  || supplies.find((supply) => supply.isActive && supply.category === "baby-bottle");

const addWasteByFactor = (
  target: UsageAccumulator,
  residueSource: { plasticG?: number; paperG?: number; metalG?: number; glassG?: number },
  factor: number,
) => {
  target.plasticG += (residueSource.plasticG || 0) * factor;
  target.paperG += (residueSource.paperG || 0) * factor;
  target.metalG += (residueSource.metalG || 0) * factor;
  target.glassG += (residueSource.glassG || 0) * factor;
};

const getOrCreateAccumulator = (
  usageMap: Map<string, UsageAccumulator>,
  key: string,
  seed: Omit<UsageAccumulator, "therapyTypes" | "patientIds" | "totalQuantity" | "totalVolumeMl" | "estimatedUnits" | "patientDays" | "totalCalories" | "totalCost" | "plasticG" | "paperG" | "metalG" | "glassG">,
) => {
  const existing = usageMap.get(key);
  if (existing) return existing;

  const created: UsageAccumulator = {
    ...seed,
    therapyTypes: new Set<Prescription["therapyType"]>(),
    patientIds: new Set<string>(),
    prescriptionIds: new Set<string>(),
    totalQuantity: 0,
    totalVolumeMl: 0,
    estimatedUnits: 0,
    patientDays: 0,
    totalCalories: 0,
    totalCost: 0,
    plasticG: 0,
    paperG: 0,
    metalG: 0,
    glassG: 0,
  };
  usageMap.set(key, created);
  return created;
};

const Reports = () => {
  const navigate = useNavigate();
  const role = useCurrentRole();
  const isManagerView = can(role, "manage_units") || can(role, "manage_wards");

  const { patients, isLoading: patientsLoading } = usePatients();
  const { evolutions } = useEvolutions();
  const { prescriptions } = usePrescriptions();
  const { formulas, isLoading: formulasLoading } = useFormulas();
  const { modules, isLoading: modulesLoading } = useModules();
  const { supplies, isLoading: suppliesLoading } = useSupplies();
  const { settings } = useSettings();
  const { hospitals } = useHospitals();

  const [selectedHospital, setSelectedHospital] = useState("");
  const { wards } = useWards(selectedHospital || undefined);

  const [selectedWard, setSelectedWard] = useState("all");
  const [selectedPatient, setSelectedPatient] = useState("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>(["", "", ""]);

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(sevenDaysAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedHospital = localStorage.getItem("userHospitalId") || "";
    if (storedHospital) {
      setSelectedHospital(storedHospital);
      return;
    }

    if (hospitals.length > 0 && hospitals[0].id) {
      setSelectedHospital(hospitals[0].id);
    }
  }, [hospitals]);

  useEffect(() => {
    setSelectedWard("all");
  }, [selectedHospital]);

  const cohortPatients = useMemo(() => {
    return patients
      .filter((patient) => {
        if (selectedHospital && patient.hospitalId !== selectedHospital) return false;
        if (selectedWard !== "all" && patient.ward !== selectedWard) return false;
        return true;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [patients, selectedHospital, selectedWard]);

  useEffect(() => {
    if (selectedPatient === "all") return;
    const exists = cohortPatients.some((patient) => patient.id === selectedPatient);
    if (!exists) setSelectedPatient("all");
  }, [cohortPatients, selectedPatient]);

  const visiblePatientIds = useMemo(() => {
    const ids = new Set<string>();
    cohortPatients.forEach((patient) => {
      if (patient.id) ids.add(patient.id);
    });
    return ids;
  }, [cohortPatients]);

  const effectivePatientIds = useMemo(() => {
    if (selectedPatient !== "all") return new Set([selectedPatient]);
    return visiblePatientIds;
  }, [selectedPatient, visiblePatientIds]);

  const patientsById = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((patient) => {
      if (patient.id) map.set(patient.id, patient);
    });
    return map;
  }, [patients]);

  const formulasById = useMemo(() => {
    const map = new Map<string, Formula>();
    formulas.forEach((formula) => {
      if (formula.id) map.set(formula.id, formula);
    });
    return map;
  }, [formulas]);

  const modulesById = useMemo(() => {
    const map = new Map<string, Module>();
    modules.forEach((module) => {
      if (module.id) map.set(module.id, module);
    });
    return map;
  }, [modules]);

  const filteredEvolutions = useMemo(() => {
    return evolutions.filter((evolution) => {
      const matchesDate = evolution.date >= startDate && evolution.date <= endDate;
      return matchesDate && effectivePatientIds.has(evolution.patientId);
    });
  }, [evolutions, startDate, endDate, effectivePatientIds]);

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((prescription) => {
      const matchesPatient = effectivePatientIds.has(prescription.patientId);
      const overlapsPeriod = prescription.startDate <= endDate
        && (!prescription.endDate || prescription.endDate >= startDate);
      return matchesPatient && overlapsPeriod;
    });
  }, [prescriptions, effectivePatientIds, startDate, endDate]);

  const prescriptionsByPatient = useMemo(() => {
    const map = new Map<string, Prescription[]>();
    filteredPrescriptions.forEach((prescription) => {
      const list = map.get(prescription.patientId) || [];
      list.push(prescription);
      map.set(prescription.patientId, list);
    });
    return map;
  }, [filteredPrescriptions]);

  const daysInPeriod = useMemo(
    () => buildDateRange(startDate, endDate),
    [startDate, endDate],
  );

  const historyData = useMemo<ChartRow[]>(() => {
    const grouped: Record<string, { enteral: number; parenteral: number; nonIntentional: number; count: number }> = {};

    daysInPeriod.forEach((day) => {
      grouped[day] = { enteral: 0, parenteral: 0, nonIntentional: 0, count: 0 };
    });

    filteredEvolutions.forEach((evolution) => {
      if (!grouped[evolution.date]) return;

      const patient = patientsById.get(evolution.patientId);
      const prescriptionsOnDay = prescriptionsByPatient
        .get(evolution.patientId)
        ?.filter((prescription) => isPrescriptionActiveOn(prescription, evolution.date)) || [];

      const enteralPrescription = pickPrescriptionForType(
        prescriptionsOnDay,
        "enteral",
        evolution.prescriptionId,
      );
      const parenteralPrescription = pickPrescriptionForType(prescriptionsOnDay, "parenteral");

      const targetKcal = (() => {
        const tneGoal = patient?.tneGoals?.targetKcalPerKg;
        if (tneGoal && patient?.weight) return tneGoal * patient.weight;

        const prescriptionWithTarget = enteralPrescription
          || parenteralPrescription
          || [...prescriptionsOnDay].sort(sortByMostRecentStartDate).find((prescription) => (prescription.totalCalories || 0) > 0);

        if (prescriptionWithTarget?.totalCalories) return prescriptionWithTarget.totalCalories;
        if (patient?.weight) return patient.weight * 25;
        return 0;
      })();

      const enteralInfusedKcal = (enteralPrescription?.totalCalories || 0) * ((evolution.metaReached || 0) / 100);
      const parenteralKcal = parenteralPrescription?.totalCalories || 0;
      const nonIntentionalKcal = calculateUnintentionalKcal(patient);

      const enteralPct = targetKcal > 0 ? clampPercent((enteralInfusedKcal / targetKcal) * 100) : 0;
      const parenteralPct = targetKcal > 0 ? clampPercent((parenteralKcal / targetKcal) * 100) : 0;
      const nonIntentionalPct = targetKcal > 0 ? clampPercent((nonIntentionalKcal / targetKcal) * 100) : 0;

      grouped[evolution.date].enteral += enteralPct;
      grouped[evolution.date].parenteral += parenteralPct;
      grouped[evolution.date].nonIntentional += nonIntentionalPct;
      grouped[evolution.date].count += 1;
    });

    return daysInPeriod.map((day) => {
      const entry = grouped[day];
      const divisor = entry.count || 1;
      const enteralPct = entry.count > 0 ? Number((entry.enteral / divisor).toFixed(1)) : 0;
      const parenteralPct = entry.count > 0 ? Number((entry.parenteral / divisor).toFixed(1)) : 0;
      const nonIntentionalPct = entry.count > 0 ? Number((entry.nonIntentional / divisor).toFixed(1)) : 0;

      return {
        date: formatLabelDate(day),
        enteralPct,
        parenteralPct,
        nonIntentionalPct,
        totalPct: Number((enteralPct + parenteralPct + nonIntentionalPct).toFixed(1)),
      };
    });
  }, [daysInPeriod, filteredEvolutions, patientsById, prescriptionsByPatient]);

  const historySummary = useMemo(() => {
    const validRows = historyData.filter((row) => row.totalPct > 0);
    if (validRows.length === 0) {
      return { avgPercentage: "0.0", daysOnGoal: 0, daysBelow: 0 };
    }

    const avgPercentage = validRows.reduce((sum, row) => sum + row.totalPct, 0) / validRows.length;
    const daysOnGoal = validRows.filter((row) => row.totalPct >= 80).length;
    const daysBelow = validRows.filter((row) => row.totalPct < 80).length;

    return {
      avgPercentage: avgPercentage.toFixed(1),
      daysOnGoal,
      daysBelow,
    };
  }, [historyData]);

  const productUsage = useMemo<ProductUsageRow[]>(() => {
    const usageMap = new Map<string, UsageAccumulator>();

    filteredPrescriptions.forEach((prescription) => {
      const overlapDays = getOverlapDays(prescription.startDate, prescription.endDate, startDate, endDate);
      if (overlapDays <= 0) return;

      const patientId = prescription.patientId;

      prescription.formulas.forEach((entry) => {
        const formula = formulasById.get(entry.formulaId) || getFormulaByName(formulas, entry.formulaName);
        const administrationsPerDay = getAdministrationCount(entry.schedules, entry.timesPerDay);
        const dailyVolumeMl = entry.volume * administrationsPerDay;
        const totalVolumeMl = dailyVolumeMl * overlapDays;
        const equipmentVolumePerDay = prescription.systemType === "open" && prescription.therapyType === "enteral"
          ? (prescription.equipmentVolume || 0) * administrationsPerDay
          : 0;
        const billableUnit = formula?.billingUnit || "ml";
        const bagSize = formula?.presentations?.[0] || 0;
        const billingPrice = formula?.billingPrice || 0;
        const openFormulaEntry = prescription.enteralDetails?.openFormulas?.find((item) => item.formulaId === entry.formulaId);
        const diluteTo = Number(openFormulaEntry?.diluteTo || 0);
        const extraPowderPerAdministration = billableUnit === "g" && equipmentVolumePerDay > 0 && diluteTo > 0
          ? (entry.volume / diluteTo) * (prescription.equipmentVolume || 0)
          : 0;

        let totalQuantity = totalVolumeMl + (equipmentVolumePerDay * overlapDays);
        let estimatedUnits = bagSize > 0 ? totalQuantity / bagSize : 0;
        let totalCost = totalQuantity * billingPrice;

        if (billableUnit === "g") {
          totalQuantity = (entry.volume * administrationsPerDay + (extraPowderPerAdministration * administrationsPerDay)) * overlapDays;
          estimatedUnits = bagSize > 0 ? totalQuantity / bagSize : 0;
          totalCost = totalQuantity * billingPrice;
        } else if (billableUnit === "unit") {
          const dailyUnits = bagSize > 0
            ? Math.ceil((dailyVolumeMl + equipmentVolumePerDay) / bagSize)
            : dailyVolumeMl;
          totalQuantity = dailyUnits * overlapDays;
          estimatedUnits = totalQuantity;
          totalCost = totalQuantity * billingPrice;
        } else if (billableUnit === "ml" && bagSize > 0) {
          const dailyUnits = Math.ceil((dailyVolumeMl + equipmentVolumePerDay) / bagSize);
          estimatedUnits = dailyUnits * overlapDays;
        }

        const caloriesPerUnit = formula?.caloriesPerUnit || 0;
        const totalCalories = totalVolumeMl * caloriesPerUnit;

        const item = getOrCreateAccumulator(
          usageMap,
          `formula:${entry.formulaId || entry.formulaName}`,
          {
            productId: entry.formulaId || entry.formulaName,
            productName: entry.formulaName,
            manufacturer: formula?.manufacturer || "-",
            category: "formula",
            billingUnit: billableUnit,
          },
        );

        item.therapyTypes.add(prescription.therapyType);
        item.patientIds.add(patientId);
        if (prescription.id) item.prescriptionIds.add(prescription.id);
        item.totalQuantity += totalQuantity;
        item.totalVolumeMl += totalVolumeMl;
        item.estimatedUnits += estimatedUnits;
        item.patientDays += overlapDays;
        item.totalCalories += totalCalories;
        item.totalCost += totalCost;
        addWasteByFactor(item, formula || {}, totalVolumeMl / 1000);
      });

      prescription.modules.forEach((entry) => {
        const module = modulesById.get(entry.moduleId);
        const administrationsPerDay = getAdministrationCount(entry.schedules, entry.timesPerDay);
        const totalQuantity = entry.amount * administrationsPerDay * overlapDays;
        const referenceAmount = module?.referenceAmount || 1;
        const caloriesPerUnit = module ? (module.calories || 0) / referenceAmount : 0;
        const totalCalories = totalQuantity * caloriesPerUnit;

        const item = getOrCreateAccumulator(
          usageMap,
          `module:${entry.moduleId || entry.moduleName}`,
          {
            productId: entry.moduleId || entry.moduleName,
            productName: entry.moduleName,
            manufacturer: "-",
            category: "module",
            billingUnit: entry.unit || module?.billingUnit || "g",
          },
        );

        item.therapyTypes.add(prescription.therapyType);
        item.patientIds.add(patientId);
        if (prescription.id) item.prescriptionIds.add(prescription.id);
        item.totalQuantity += totalQuantity;
        item.totalVolumeMl += (entry.unit || module?.billingUnit) === "ml" ? totalQuantity : 0;
        item.patientDays += overlapDays;
        item.totalCalories += totalCalories;
        item.totalCost += totalQuantity * (module?.billingPrice || 0);
      });

      if (prescription.therapyType === "enteral") {
        const administrationCount = prescription.formulas.reduce(
          (sum, entry) => sum + getAdministrationCount(entry.schedules, entry.timesPerDay),
          0,
        );
        const hydrationCount = prescription.hydrationSchedules?.length || 0;
        const bottleCountPerDay = prescription.systemType === "open" ? administrationCount + hydrationCount : 0;

        const selectedSupply = prescription.infusionMode === "gravity"
          ? getGravitySupply(supplies)
          : getPumpSupply(supplies);

        if (selectedSupply && selectedSupply.isBillable !== false) {
          const item = getOrCreateAccumulator(
            usageMap,
            `supply:${selectedSupply.id || selectedSupply.code}`,
            {
              productId: selectedSupply.id || selectedSupply.code,
              productName: selectedSupply.name,
              manufacturer: "-",
              category: "supply",
              billingUnit: selectedSupply.billingUnit || "unit",
            },
          );

          const totalQuantity = overlapDays;
          item.therapyTypes.add("enteral");
          item.patientIds.add(patientId);
          if (prescription.id) item.prescriptionIds.add(prescription.id);
          item.totalQuantity += totalQuantity;
          item.patientDays += overlapDays;
          item.totalCost += totalQuantity * (selectedSupply.unitPrice || 0);
          addWasteByFactor(item, selectedSupply, totalQuantity);
        }

        const bottleSupply = getBottleSupply(supplies);
        if (bottleSupply && bottleSupply.isBillable !== false && bottleCountPerDay > 0) {
          const item = getOrCreateAccumulator(
            usageMap,
            `supply:${bottleSupply.id || bottleSupply.code}`,
            {
              productId: bottleSupply.id || bottleSupply.code,
              productName: bottleSupply.name,
              manufacturer: "-",
              category: "supply",
              billingUnit: bottleSupply.billingUnit || "unit",
            },
          );

          const totalQuantity = bottleCountPerDay * overlapDays;
          item.therapyTypes.add("enteral");
          item.patientIds.add(patientId);
          if (prescription.id) item.prescriptionIds.add(prescription.id);
          item.totalQuantity += totalQuantity;
          item.patientDays += overlapDays;
          item.totalCost += totalQuantity * (bottleSupply.unitPrice || 0);
          addWasteByFactor(item, bottleSupply, totalQuantity);
        }
      }
    });

    return [...usageMap.values()]
      .map((item) => {
        const uniquePatients = item.patientIds.size;
        const wasteTotalG = item.plasticG + item.paperG + item.metalG + item.glassG;
        const therapyType = item.therapyTypes.size === 1
          ? Array.from(item.therapyTypes)[0]
          : "mixed";

        return {
          productId: item.productId,
          productName: item.productName,
          manufacturer: item.manufacturer,
          category: item.category,
          therapyType,
          billingUnit: item.billingUnit,
          totalQuantity: Number(item.totalQuantity.toFixed(2)),
          totalVolumeMl: Number(item.totalVolumeMl.toFixed(0)),
          estimatedUnits: Number(item.estimatedUnits.toFixed(1)),
          patientDays: item.patientDays,
          uniquePatients,
          uniquePrescriptions: item.prescriptionIds.size,
          totalCalories: Number(item.totalCalories.toFixed(0)),
          totalCost: Number(item.totalCost.toFixed(2)),
          avgQuantityPerPatient: uniquePatients > 0 ? Number((item.totalQuantity / uniquePatients).toFixed(2)) : 0,
          avgQuantityPerDay: item.patientDays > 0 ? Number((item.totalQuantity / item.patientDays).toFixed(2)) : 0,
          avgCostPerPatient: uniquePatients > 0 ? Number((item.totalCost / uniquePatients).toFixed(2)) : 0,
          costPerPatientDay: item.patientDays > 0 ? Number((item.totalCost / item.patientDays).toFixed(2)) : 0,
          plasticG: Number(item.plasticG.toFixed(1)),
          paperG: Number(item.paperG.toFixed(1)),
          metalG: Number(item.metalG.toFixed(1)),
          glassG: Number(item.glassG.toFixed(1)),
          wastePerPatient: uniquePatients > 0 ? Number((wasteTotalG / uniquePatients).toFixed(2)) : 0,
        };
      })
      .sort((left, right) => {
        if (right.totalCost !== left.totalCost) return right.totalCost - left.totalCost;
        return right.totalQuantity - left.totalQuantity;
      });
  }, [filteredPrescriptions, startDate, endDate, formulasById, formulas, modulesById, supplies]);

  useEffect(() => {
    if (productUsage.length === 0) return;
    if (selectedProducts.some(Boolean)) return;
    setSelectedProducts(productUsage.slice(0, 3).map((item) => item.productId).concat(["", "", ""]).slice(0, 3));
  }, [productUsage, selectedProducts]);

  const managementSummary = useMemo(() => {
    const attendedPatients = new Set<string>();
    const patientDaySet = new Set<string>();
    let prescriptionDays = 0;
    let nursingCostTotal = 0;
    let materialCostTotal = 0;
    let therapyCostTotal = 0;

    filteredPrescriptions.forEach((prescription) => {
      const overlapDays = getOverlapDays(prescription.startDate, prescription.endDate, startDate, endDate);
      if (overlapDays <= 0) return;

      attendedPatients.add(prescription.patientId);
      prescriptionDays += overlapDays;
      nursingCostTotal += (prescription.nursingCostTotal || 0) * overlapDays;
      materialCostTotal += (prescription.materialCostTotal || 0) * overlapDays;
      therapyCostTotal += (prescription.totalCost || 0) * overlapDays;

      const effectiveStart = prescription.startDate > startDate ? prescription.startDate : startDate;
      const effectiveEnd = prescription.endDate && prescription.endDate < endDate ? prescription.endDate : endDate;
      buildDateRange(effectiveStart, effectiveEnd).forEach((day) => {
        patientDaySet.add(`${prescription.patientId}:${day}`);
      });
    });

    const formulasCost = productUsage
      .filter((item) => item.category === "formula")
      .reduce((sum, item) => sum + item.totalCost, 0);
    const modulesCost = productUsage
      .filter((item) => item.category === "module")
      .reduce((sum, item) => sum + item.totalCost, 0);
    const suppliesCost = productUsage
      .filter((item) => item.category === "supply")
      .reduce((sum, item) => sum + item.totalCost, 0);
    const totalProductCost = formulasCost + modulesCost + suppliesCost;
    const patientCount = attendedPatients.size;
    const patientDays = patientDaySet.size;

    return {
      patientCount,
      prescriptionCount: filteredPrescriptions.length,
      patientDays,
      prescriptionDays,
      productCount: productUsage.length,
      formulasCost,
      modulesCost,
      suppliesCost,
      totalProductCost,
      averageCostPerPatient: patientCount > 0 ? totalProductCost / patientCount : 0,
      averageCostPerPatientDay: patientDays > 0 ? totalProductCost / patientDays : 0,
      averageCostPerDay: daysInPeriod.length > 0 ? totalProductCost / daysInPeriod.length : 0,
      nursingCostTotal,
      materialCostTotal,
      therapyCostTotal,
      indirectCostPerDay: settings?.indirectCosts?.laborCosts || 0,
    };
  }, [filteredPrescriptions, startDate, endDate, productUsage, daysInPeriod, settings]);

  const comparisonRows = useMemo(() => {
    const selected = selectedProducts.filter(Boolean);
    const rows = (selected.length > 0
      ? selected
        .map((productId) => productUsage.find((item) => item.productId === productId))
        .filter((item): item is ProductUsageRow => Boolean(item))
      : productUsage.slice(0, 3));

    return rows.map((item) => ({
      product: item.productName,
      quantity: Number(item.totalQuantity.toFixed(1)),
      cost: Number(item.totalCost.toFixed(2)),
      calories: Number(item.totalCalories.toFixed(0)),
    }));
  }, [productUsage, selectedProducts]);

  const wasteSummary = useMemo(() => {
    return productUsage.reduce(
      (acc, item) => ({
        plasticG: acc.plasticG + item.plasticG,
        paperG: acc.paperG + item.paperG,
        metalG: acc.metalG + item.metalG,
        glassG: acc.glassG + item.glassG,
      }),
      { plasticG: 0, paperG: 0, metalG: 0, glassG: 0 },
    );
  }, [productUsage]);

  const wasteChartData = useMemo(() => ([
    { material: "Plastico", grams: Number(wasteSummary.plasticG.toFixed(1)) },
    { material: "Papel", grams: Number(wasteSummary.paperG.toFixed(1)) },
    { material: "Metal", grams: Number(wasteSummary.metalG.toFixed(1)) },
    { material: "Vidro", grams: Number(wasteSummary.glassG.toFixed(1)) },
  ]), [wasteSummary]);

  const attendedPatientCount = managementSummary.patientCount;
  const selectedHospitalName = hospitals.find((hospital) => hospital.id === selectedHospital)?.name || "Todas as unidades";
  const selectedPatientName = selectedPatient === "all"
    ? "Todos os pacientes"
    : cohortPatients.find((patient) => patient.id === selectedPatient)?.name || "Paciente selecionado";

  const reportXml = useMemo(() => {
    const generatedAt = new Date().toISOString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<relatorioGestao geradoEm="${escapeXml(generatedAt)}">
  <filtros>
    <unidade>${escapeXml(selectedHospitalName)}</unidade>
    <ala>${escapeXml(selectedWard === "all" ? "Todas as alas" : selectedWard)}</ala>
    <paciente>${escapeXml(selectedPatientName)}</paciente>
    <dataInicial>${escapeXml(startDate)}</dataInicial>
    <dataFinal>${escapeXml(endDate)}</dataFinal>
  </filtros>
  <resumo>
    <pacientesAtendidos>${managementSummary.patientCount}</pacientesAtendidos>
    <prescricoes>${managementSummary.prescriptionCount}</prescricoes>
    <pacienteDia>${managementSummary.patientDays}</pacienteDia>
    <produtos>${managementSummary.productCount}</produtos>
    <custoFormulas>${managementSummary.formulasCost.toFixed(2)}</custoFormulas>
    <custoModulos>${managementSummary.modulesCost.toFixed(2)}</custoModulos>
    <custoInsumos>${managementSummary.suppliesCost.toFixed(2)}</custoInsumos>
    <custoProdutos>${managementSummary.totalProductCost.toFixed(2)}</custoProdutos>
    <custoMedioPaciente>${managementSummary.averageCostPerPatient.toFixed(2)}</custoMedioPaciente>
    <custoMedioPacienteDia>${managementSummary.averageCostPerPatientDay.toFixed(2)}</custoMedioPacienteDia>
    <mediaProporcional>${escapeXml(historySummary.avgPercentage)}</mediaProporcional>
  </resumo>
  <historicoAssistencial>
    ${historyData.map((row) => `    <dia data="${escapeXml(row.date)}">
      <enteralPct>${row.enteralPct}</enteralPct>
      <parenteralPct>${row.parenteralPct}</parenteralPct>
      <caloriasNaoIntencionaisPct>${row.nonIntentionalPct}</caloriasNaoIntencionaisPct>
      <totalPct>${row.totalPct}</totalPct>
    </dia>`).join("\n")}
  </historicoAssistencial>
  <consumoProdutos>
    ${productUsage.map((item) => `    <produto id="${escapeXml(item.productId)}">
      <nome>${escapeXml(item.productName)}</nome>
      <categoria>${escapeXml(CATEGORY_LABEL[item.category])}</categoria>
      <fabricante>${escapeXml(item.manufacturer)}</fabricante>
      <via>${escapeXml(item.therapyType)}</via>
      <unidadeFaturamento>${escapeXml(item.billingUnit)}</unidadeFaturamento>
      <quantidadeTotal>${item.totalQuantity.toFixed(2)}</quantidadeTotal>
      <volumeMl>${item.totalVolumeMl.toFixed(0)}</volumeMl>
      <unidadesEstimadas>${item.estimatedUnits.toFixed(1)}</unidadesEstimadas>
      <pacientes>${item.uniquePatients}</pacientes>
      <prescricoes>${item.uniquePrescriptions}</prescricoes>
      <pacienteDia>${item.patientDays}</pacienteDia>
      <quantidadeMediaDia>${item.avgQuantityPerDay.toFixed(2)}</quantidadeMediaDia>
      <calorias>${item.totalCalories.toFixed(0)}</calorias>
      <custoTotal>${item.totalCost.toFixed(2)}</custoTotal>
      <custoPorPacienteDia>${item.costPerPatientDay.toFixed(2)}</custoPorPacienteDia>
      <plasticoG>${item.plasticG.toFixed(1)}</plasticoG>
      <papelG>${item.paperG.toFixed(1)}</papelG>
      <metalG>${item.metalG.toFixed(1)}</metalG>
      <vidroG>${item.glassG.toFixed(1)}</vidroG>
      <residuoMedioPaciente>${item.wastePerPatient.toFixed(2)}</residuoMedioPaciente>
    </produto>`).join("\n")}
  </consumoProdutos>
</relatorioGestao>`;
  }, [
    endDate,
    historyData,
    historySummary.avgPercentage,
    managementSummary,
    productUsage,
    selectedHospitalName,
    selectedPatientName,
    selectedWard,
    startDate,
  ]);

  const handleExportXml = () => {
    downloadTextFile(
      `relatorio-gestao-${startDate}-${endDate}.xml`,
      reportXml,
      "application/xml;charset=utf-8",
    );
  };

  const isLoading = patientsLoading || formulasLoading || modulesLoading || suppliesLoading;
  const totalWasteG = wasteSummary.plasticG + wasteSummary.paperG + wasteSummary.metalG + wasteSummary.glassG;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Relatorios gerenciais</h1>
            <p className="text-muted-foreground">
              Historico assistencial, consumo, custos, medias e residuos do periodo selecionado.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isManagerView && (
              <Button variant="outline" onClick={handleExportXml}>
                <Download className="mr-2 h-4 w-4" />
                Exportar XML
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" />
              Imprimir relatorio
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Defina periodo, unidade, ala e paciente para refinar os indicadores.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-1">
              <Label>Unidade</Label>
              <Select value={selectedHospital || "all"} onValueChange={(value) => setSelectedHospital(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {isManagerView && <SelectItem value="all">Todas as unidades</SelectItem>}
                  {hospitals.map((hospital) => (
                    <SelectItem key={hospital.id} value={hospital.id || ""}>
                      {hospital.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Ala</Label>
              <Select value={selectedWard} onValueChange={setSelectedWard}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a ala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as alas</SelectItem>
                  {wards.map((ward) => (
                    <SelectItem key={ward.id} value={ward.name}>
                      {ward.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Paciente</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pacientes</SelectItem>
                  {cohortPatients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id || ""}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Data inicial</Label>
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Data final</Label>
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>

            <div className="flex items-end">
              <div className="w-full rounded-lg border bg-muted/40 px-4 py-3 text-sm">
                <div className="font-medium">{selectedHospitalName}</div>
                <div className="text-muted-foreground">{selectedWard === "all" ? "Todas as alas" : selectedWard}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        ) : attendedPatientCount === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum paciente encontrado para os filtros selecionados.</p>
              <Button className="mt-4" onClick={() => navigate("/patients")}>
                Ir para Pacientes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{managementSummary.patientCount}</p>
                    <p className="text-sm text-muted-foreground">Pacientes atendidos</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-emerald-600">{formatCurrency(managementSummary.totalProductCost)}</p>
                    <p className="text-sm text-muted-foreground">Custo total de produtos</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-sky-600">{managementSummary.patientDays}</p>
                    <p className="text-sm text-muted-foreground">Paciente-dia</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-600">{formatNumber(totalWasteG, 1)}g</p>
                    <p className="text-sm text-muted-foreground">Residuos reciclaveis</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="gestao" className="space-y-4">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="gestao">Gestao</TabsTrigger>
                <TabsTrigger value="historico">Historico Assistencial</TabsTrigger>
                <TabsTrigger value="consumo">Consumo no Periodo</TabsTrigger>
                <TabsTrigger value="comparativo">Comparacao por Produto</TabsTrigger>
                <TabsTrigger value="residuos">Residuos Reciclaveis</TabsTrigger>
              </TabsList>

              <TabsContent value="gestao" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Prescricoes no periodo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{managementSummary.prescriptionCount}</p>
                      <p className="text-sm text-muted-foreground">
                        {managementSummary.prescriptionDays} dias de prescricao considerados.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Custo medio por paciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{formatCurrency(managementSummary.averageCostPerPatient)}</p>
                      <p className="text-sm text-muted-foreground">Baseado no subtotal de formulas, modulos e insumos.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Custo medio por paciente-dia</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{formatCurrency(managementSummary.averageCostPerPatientDay)}</p>
                      <p className="text-sm text-muted-foreground">Custo total dividido pelo total de paciente-dia.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Media diaria de custo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{formatCurrency(managementSummary.averageCostPerDay)}</p>
                      <p className="text-sm text-muted-foreground">Media no intervalo selecionado.</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle>Subtotais do periodo</CardTitle>
                      <CardDescription>Fechamento por categoria, seguindo formulas, modulos e insumos.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">Formulas</p>
                            <p className="text-sm text-muted-foreground">Produtos nutricionais principais</p>
                          </div>
                          <div className="text-right font-bold">{formatCurrency(managementSummary.formulasCost)}</div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">Modulos</p>
                            <p className="text-sm text-muted-foreground">Ajustes e complementos de macro e micronutrientes</p>
                          </div>
                          <div className="text-right font-bold">{formatCurrency(managementSummary.modulesCost)}</div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">Insumos</p>
                            <p className="text-sm text-muted-foreground">Equipos, frascos e demais itens faturaveis</p>
                          </div>
                          <div className="text-right font-bold">{formatCurrency(managementSummary.suppliesCost)}</div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                          <div>
                            <p className="font-medium">Total do periodo</p>
                            <p className="text-sm text-muted-foreground">{managementSummary.productCount} produto(s) utilizados</p>
                          </div>
                          <div className="text-right text-lg font-bold">{formatCurrency(managementSummary.totalProductCost)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Custos assistenciais registrados</CardTitle>
                      <CardDescription>Valores salvos na prescricao, quando preenchidos no fluxo assistencial.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">Material</p>
                          <p className="text-sm text-muted-foreground">Somatorio registrado nas prescricoes</p>
                        </div>
                        <div className="text-right font-bold">{formatCurrency(managementSummary.materialCostTotal)}</div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">Enfermagem</p>
                          <p className="text-sm text-muted-foreground">Tempo assistencial convertido em custo</p>
                        </div>
                        <div className="text-right font-bold">{formatCurrency(managementSummary.nursingCostTotal)}</div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">Custo total da terapia</p>
                          <p className="text-sm text-muted-foreground">Se o campo total da prescricao foi salvo</p>
                        </div>
                        <div className="text-right font-bold">{formatCurrency(managementSummary.therapyCostTotal)}</div>
                      </div>
                      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                        Custo indireto configurado por dia: <strong className="text-foreground">{formatCurrency(managementSummary.indirectCostPerDay)}</strong>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="historico" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Media do periodo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{historySummary.avgPercentage}%</p>
                      <p className="text-sm text-muted-foreground">NE, NP e calorias nao intencionais em relacao a meta.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Dias em meta</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-emerald-600">{historySummary.daysOnGoal}</p>
                      <p className="text-sm text-muted-foreground">Dias com total proporcional maior ou igual a 80%.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Dias abaixo da meta</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-amber-600">{historySummary.daysBelow}</p>
                      <p className="text-sm text-muted-foreground">Dias com total proporcional abaixo de 80%.</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Historico assistencial</CardTitle>
                    <CardDescription>Somatorio proporcional de enteral infundida, parenteral e calorias nao intencionais.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[380px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis unit="%" />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Legend />
                        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="6 4" label="Meta minima" />
                        <Bar dataKey="enteralPct" stackId="goal" fill="#7c3aed" name="NE infundida" />
                        <Bar dataKey="parenteralPct" stackId="goal" fill="#f97316" name="NP infundida" />
                        <Bar dataKey="nonIntentionalPct" stackId="goal" fill="#0ea5e9" name="Calorias nao intencionais" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="consumo" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Consumo de produtos no periodo</CardTitle>
                    <CardDescription>Consolidado com quantidade, custo, pacientes, media por paciente e paciente-dia.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr className="text-left">
                            <th className="p-3 font-medium">Produto</th>
                            <th className="p-3 font-medium">Categoria</th>
                            <th className="p-3 font-medium">Fabricante</th>
                            <th className="p-3 font-medium">Via</th>
                            <th className="p-3 font-medium text-right">Qtd total</th>
                            <th className="p-3 font-medium">Unid.</th>
                            <th className="p-3 font-medium text-right">Volume (ml)</th>
                            <th className="p-3 font-medium text-right">Unid. estimadas</th>
                            <th className="p-3 font-medium text-right">Pacientes</th>
                            <th className="p-3 font-medium text-right">Prescricoes</th>
                            <th className="p-3 font-medium text-right">Paciente-dia</th>
                            <th className="p-3 font-medium text-right">Media/dia</th>
                            <th className="p-3 font-medium text-right">Media/paciente</th>
                            <th className="p-3 font-medium text-right">Custo total</th>
                            <th className="p-3 font-medium text-right">Custo/produto-dia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productUsage.map((item) => (
                            <tr key={`${item.category}-${item.productId}`} className="border-t">
                              <td className="p-3 font-medium">{item.productName}</td>
                              <td className="p-3">
                                <Badge variant="outline">{CATEGORY_LABEL[item.category]}</Badge>
                              </td>
                              <td className="p-3 text-muted-foreground">{item.manufacturer}</td>
                              <td className="p-3">
                                <Badge variant="outline" className="capitalize">
                                  {item.therapyType === "mixed" ? "misto" : item.therapyType}
                                </Badge>
                              </td>
                              <td className="p-3 text-right">{numberFormatter.format(item.totalQuantity)}</td>
                              <td className="p-3">{item.billingUnit}</td>
                              <td className="p-3 text-right">{item.totalVolumeMl.toLocaleString("pt-BR")}</td>
                              <td className="p-3 text-right">{numberFormatter.format(item.estimatedUnits)}</td>
                              <td className="p-3 text-right">{item.uniquePatients}</td>
                              <td className="p-3 text-right">{item.uniquePrescriptions}</td>
                              <td className="p-3 text-right">{item.patientDays}</td>
                              <td className="p-3 text-right">{numberFormatter.format(item.avgQuantityPerDay)}</td>
                              <td className="p-3 text-right">{numberFormatter.format(item.avgQuantityPerPatient)}</td>
                              <td className="p-3 text-right font-medium">{formatCurrency(item.totalCost)}</td>
                              <td className="p-3 text-right">{formatCurrency(item.costPerPatientDay)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comparativo" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Comparacao por produto</CardTitle>
                    <CardDescription>Selecione ate 3 produtos para comparar quantidade, custo e calorias.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      {selectedProducts.map((productId, index) => (
                        <div key={`product-filter-${index}`} className="space-y-1">
                          <Label>Produto {index + 1}</Label>
                          <Select
                            value={productId || `empty-${index}`}
                            onValueChange={(value) => {
                              const updated = [...selectedProducts];
                              updated[index] = value.startsWith("empty-") ? "" : value;
                              setSelectedProducts(updated);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um produto" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={`empty-${index}`}>Nenhum</SelectItem>
                              {productUsage.map((item) => (
                                <SelectItem key={`${item.category}-${item.productId}`} value={item.productId}>
                                  {item.productName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={comparisonRows}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="product" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="quantity" fill="#2563eb" name="Quantidade total" />
                            <Bar dataKey="calories" fill="#16a34a" name="Calorias totais" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={comparisonRows}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="product" />
                            <YAxis />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="cost" fill="#f59e0b" name="Custo total" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="residuos" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-2xl font-bold text-sky-600">{formatNumber(wasteSummary.plasticG, 1)}g</p>
                      <p className="text-sm text-muted-foreground">Plastico</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-2xl font-bold text-amber-700">{formatNumber(wasteSummary.paperG, 1)}g</p>
                      <p className="text-sm text-muted-foreground">Papel</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-2xl font-bold text-slate-600">{formatNumber(wasteSummary.metalG, 1)}g</p>
                      <p className="text-sm text-muted-foreground">Metal</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{formatNumber(wasteSummary.glassG, 1)}g</p>
                      <p className="text-sm text-muted-foreground">Vidro</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Geracao de residuos reciclaveis</CardTitle>
                    <CardDescription>Estimativa por produto, com media de residuo por paciente que usou cada item.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={wasteChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="material" />
                          <YAxis unit="g" />
                          <Tooltip formatter={(value: number) => `${formatNumber(value, 1)} g`} />
                          <Bar dataKey="grams" name="Peso estimado">
                            {wasteChartData.map((entry) => (
                              <Cell key={entry.material} fill={MATERIAL_COLORS[entry.material]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg border bg-muted/40 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Recycle className="h-4 w-4 text-primary" />
                          Total estimado no periodo
                        </div>
                        <p className="mt-2 text-3xl font-bold">{formatNumber(totalWasteG, 1)}g</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Media por paciente atendido: {formatNumber(attendedPatientCount > 0 ? totalWasteG / attendedPatientCount : 0, 2)}g
                        </p>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Package className="h-4 w-4 text-primary" />
                          Base de calculo
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Formulas usam residuos cadastrados por 1000 ml. Insumos usam o peso cadastrado por unidade faturada.
                        </p>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Leitura rapida
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Use esta aba para comparar impacto ambiental entre produtos, setores e periodos.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Residuo por produto e por paciente</CardTitle>
                    <CardDescription>Detalhamento dos itens com maior geracao de residuos no periodo.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr className="text-left">
                            <th className="p-3 font-medium">Produto</th>
                            <th className="p-3 font-medium">Categoria</th>
                            <th className="p-3 font-medium text-right">Plastico (g)</th>
                            <th className="p-3 font-medium text-right">Papel (g)</th>
                            <th className="p-3 font-medium text-right">Metal (g)</th>
                            <th className="p-3 font-medium text-right">Vidro (g)</th>
                            <th className="p-3 font-medium text-right">Total (g)</th>
                            <th className="p-3 font-medium text-right">Media/paciente (g)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productUsage
                            .filter((item) => item.plasticG + item.paperG + item.metalG + item.glassG > 0)
                            .map((item) => (
                              <tr key={`waste-${item.category}-${item.productId}`} className="border-t">
                                <td className="p-3 font-medium">{item.productName}</td>
                                <td className="p-3">
                                  <Badge variant="outline">{CATEGORY_LABEL[item.category]}</Badge>
                                </td>
                                <td className="p-3 text-right">{formatNumber(item.plasticG, 1)}</td>
                                <td className="p-3 text-right">{formatNumber(item.paperG, 1)}</td>
                                <td className="p-3 text-right">{formatNumber(item.metalG, 1)}</td>
                                <td className="p-3 text-right">{formatNumber(item.glassG, 1)}</td>
                                <td className="p-3 text-right font-medium">{formatNumber(item.plasticG + item.paperG + item.metalG + item.glassG, 1)}</td>
                                <td className="p-3 text-right">{formatNumber(item.wastePerPatient, 2)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Reports;
