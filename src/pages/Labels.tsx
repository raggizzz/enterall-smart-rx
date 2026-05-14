import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Printer, Search, Tag, Clock, Building, User, Database } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import LabelPreview, { LabelData } from "@/components/LabelPreview";
import { useClinics, useFormulas, useModules, usePatients, usePrescriptions, useSettings, useSupplies, useWards } from "@/hooks/useDatabase";
import type { Prescription } from "@/lib/database";
import { getPrescriptionRateLabel } from "@/lib/prescriptionInfusion";
import { DEFAULT_SCHEDULE_TIMES, findWardByReference, getOperationalSlotDate, resolveConfiguredScheduleTimes, sortScheduleTimes } from "@/lib/scheduleTimes";
import { isPatientActiveForOperations } from "@/lib/patientStatus";
import { printElementInPopup } from "@/lib/printPopup";

const SCHEDULE_TIMES = sortScheduleTimes([...DEFAULT_SCHEDULE_TIMES]);

const printLabelSheetStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 6.3333cm)",
    gridAutoRows: "4.66cm",
    columnGap: "0.3cm",
    rowGap: "0cm",
    width: "19.6cm",
    margin: "0",
    alignItems: "start",
    justifyItems: "start",
};

const printLabelItemStyle: CSSProperties = {
    width: "6.3333cm",
    minWidth: "6.3333cm",
    maxWidth: "6.3333cm",
    height: "4.66cm",
    minHeight: "4.66cm",
    maxHeight: "4.66cm",
    margin: 0,
    overflow: "hidden",
    breakInside: "avoid",
    pageBreakInside: "avoid",
};

const toDateOnly = (date: Date): string => new Intl.DateTimeFormat('pt-BR').format(date);
const toDateOnlyFromIso = (value?: string): string | undefined => {
    if (!value) return undefined;
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return toDateOnly(parsed);
};

const normalize = (value?: string | null): string => {
    if (!value) return "-";
    return value;
};

const normalizeFilterText = (value?: string | null): string => (
    value || ""
)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeScheduleTime = (value?: string | null): string => {
    if (!value) return "";

    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{1,2})(?::?(\d{2}))?\s*h?$/i);
    if (!match) return trimmed;

    const hours = match[1].padStart(2, "0");
    const minutes = (match[2] || "00").padStart(2, "0");
    return `${hours}:${minutes}`;
};

const truncate = (text: string, limit: number): string => {
    if (text.length <= limit) return text;
    return `${text.slice(0, limit - 3)}...`;
};

const safeDateTime = (date?: string | null): number => {
    if (!date) return 0;
    const parsed = new Date(date).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

const comparePrescriptionRecency = (left: Prescription, right: Prescription): number => {
    const leftRank = [safeDateTime(left.startDate), safeDateTime(left.createdAt), safeDateTime(left.updatedAt)];
    const rightRank = [safeDateTime(right.startDate), safeDateTime(right.createdAt), safeDateTime(right.updatedAt)];

    for (let index = 0; index < leftRank.length; index += 1) {
        if (leftRank[index] !== rightRank[index]) return leftRank[index] - rightRank[index];
    }

    return 0;
};

const pickLatestPrescriptionPerPatientAndRoute = (prescriptions: Prescription[]) => {
    const latestByKey = new Map<string, Prescription>();

    prescriptions.forEach((prescription) => {
        const key = `${prescription.patientId || prescription.patientName}:${prescription.therapyType}`;
        const current = latestByKey.get(key);

        if (!current || comparePrescriptionRecency(prescription, current) >= 0) {
            latestByKey.set(key, prescription);
        }
    });

    return Array.from(latestByKey.values());
};

const Labels = () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [clinic, setClinic] = useState("all");
    const [patientSearch, setPatientSearch] = useState("");
    const [selectedTimes, setSelectedTimes] = useState<string[]>([...SCHEDULE_TIMES]);
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

    const { prescriptions, isLoading: prescriptionsLoading } = usePrescriptions();
    const { patients } = usePatients();
    const { clinics } = useClinics();
    const { settings } = useSettings();
    const { formulas } = useFormulas();
    const { modules } = useModules();
    const { supplies } = useSupplies();
    const currentHospitalId = typeof window !== "undefined" ? localStorage.getItem("userHospitalId") || "" : "";
    const { wards: wardObjects } = useWards(currentHospitalId || undefined);

    const patientsById = useMemo(() => {
        const map = new Map<string, (typeof patients)[number]>();
        patients.forEach((patient) => {
            if (patient.id) {
                map.set(patient.id, patient);
            }
        });
        return map;
    }, [patients]);

    const uniquePrescriptions = useMemo(() => {
        const seenIds = new Set<string>();
        const uniqueById = prescriptions.filter((prescription) => {
            if (currentHospitalId && prescription.hospitalId && prescription.hospitalId !== currentHospitalId) return false;
            if (!prescription.id) return true;
            if (seenIds.has(prescription.id)) return false;
            seenIds.add(prescription.id);
            return true;
        });

        return pickLatestPrescriptionPerPatientAndRoute(uniqueById);
    }, [currentHospitalId, prescriptions]);

    const formulaMap = useMemo(() => {
        const map = new Map<string, {
            type?: string;
            presentationForm?: string;
            name?: string;
            manufacturer?: string;
            classification?: string;
            density?: number;
            caloriesPerUnit?: number;
            proteinPerUnit?: number;
            carbPerUnit?: number;
            fatPerUnit?: number;
            fiberPerUnit?: number;
            waterContent?: number;
            proteinSources?: string;
            carbSources?: string;
            fatSources?: string;
            fiberSources?: string;
        }>();
        formulas.forEach((formula) => {
            if (formula.id) {
                map.set(formula.id, {
                    type: formula.type,
                    presentationForm: formula.presentationForm,
                    name: formula.name,
                    manufacturer: formula.manufacturer,
                    classification: formula.classification,
                    density: formula.density,
                    caloriesPerUnit: formula.caloriesPerUnit,
                    proteinPerUnit: formula.proteinPerUnit,
                    carbPerUnit: formula.carbPerUnit,
                    fatPerUnit: formula.fatPerUnit,
                    fiberPerUnit: formula.fiberPerUnit,
                    waterContent: formula.waterContent,
                    proteinSources: formula.proteinSources,
                    carbSources: formula.carbSources,
                    fatSources: formula.fatSources,
                    fiberSources: formula.fiberSources,
                });
            }
        });
        return map;
    }, [formulas]);

    const moduleMap = useMemo(() => {
        const map = new Map<string, { name?: string; code?: string }>();
        modules.forEach((moduleItem) => {
            if (moduleItem.id) {
                map.set(moduleItem.id, {
                    name: moduleItem.name,
                    code: moduleItem.code,
                });
            }
        });
        return map;
    }, [modules]);

    const waterSupply = useMemo(
        () => supplies.find((supply) =>
            supply.isActive
            && supply.isBillable !== false
            && (
                supply.category === "hydration-water"
                || normalizeFilterText(supply.name).includes("agua")
            )),
        [supplies],
    );

    const activeDate = useMemo(() => date || new Date(), [date]);
    const operationalReferenceDate = useMemo(() => {
        const today = new Date();
        return (
            activeDate.getFullYear() === today.getFullYear()
            && activeDate.getMonth() === today.getMonth()
            && activeDate.getDate() === today.getDate()
        )
            ? today
            : undefined;
    }, [activeDate]);

    const clinicOptions = useMemo(() => {
        const fromData = new Set<string>();
        prescriptions.forEach((p) => {
            const patient = patientsById.get(p.patientId);
            if (currentHospitalId && p.hospitalId && p.hospitalId !== currentHospitalId) return;
            if (!isPatientActiveForOperations(patient, activeDate)) return;
            if (patient?.ward || p.patientWard) fromData.add(patient?.ward || p.patientWard || "");
        });
        patients.forEach((p) => {
            if (currentHospitalId && p.hospitalId && p.hospitalId !== currentHospitalId) return;
            if (!isPatientActiveForOperations(p, activeDate)) return;
            if (p.ward) fromData.add(p.ward);
        });
        clinics.forEach((c) => {
            if (!c.isActive) return;
            if (currentHospitalId && c.hospitalId && c.hospitalId !== currentHospitalId) return;
            if (c.name) fromData.add(c.name);
        });
        wardObjects.forEach((ward) => {
            if (!ward.isActive) return;
            if (currentHospitalId && ward.hospitalId !== currentHospitalId) return;
            if (ward.name) fromData.add(ward.name);
        });

        return Array.from(fromData).sort((a, b) => a.localeCompare(b));
    }, [activeDate, clinics, currentHospitalId, patients, patientsById, prescriptions, wardObjects]);

    const availableScheduleTimes = useMemo(() => {
        if (clinic === "all") return resolveConfiguredScheduleTimes({ settings });
        const wardObj = findWardByReference(wardObjects, undefined, clinic);
        return resolveConfiguredScheduleTimes({ settings, ward: wardObj });
    }, [clinic, settings, wardObjects]);

    useEffect(() => {
        setSelectedTimes([...availableScheduleTimes]);
    }, [availableScheduleTimes]);

    const selectedTimeSet = useMemo(
        () => new Set(selectedTimes.map((time) => normalizeScheduleTime(time)).filter(Boolean)),
        [selectedTimes],
    );

    const labels = useMemo<LabelData[]>(() => {
        const list: LabelData[] = [];
        const generatedLabelKeys = new Set<string>();

        const rtName = settings?.defaultSignatures?.rtName || "RT não cadastrado";
        const rtCrn = settings?.defaultSignatures?.rtCrn || "CRN não cadastrado";
        const normalizeConservationText = (value: string) =>
            value.replace(/^conserva[çc][aã]o:\s*/i, "").trim();

        const conservationOpen = normalizeConservationText(
            settings?.labelSettings?.openConservation ||
            settings?.labelSettings?.defaultConservation ||
            "usar em até 4h após manipulação, em temperatura ambiente.",
        );
        const conservationClosed = normalizeConservationText(
            settings?.labelSettings?.closedConservation ||
            "em temperatura ambiente.",
        );

        const getRate = (prescription: any, stageVolume?: number): string | undefined =>
            getPrescriptionRateLabel(prescription, stageVolume);

                const buildControl = (
                    prescriptionId: string | undefined,
                    time: string | undefined,
                    suffix: string,
                    slotDate?: Date,
        ): string => {
            const controlDate = slotDate || activeDate;
            const yyyy = controlDate.getFullYear();
            const mm = String(controlDate.getMonth() + 1).padStart(2, '0');
            const dd = String(controlDate.getDate()).padStart(2, '0');
            const dateKey = `${yyyy}${mm}${dd}`;

            const normalizedTime = normalizeScheduleTime(time);
            const timeKey = (normalizedTime || "00:00").replace(":", "");
            const idKey = (prescriptionId || "XXXX").replace(/-/g, "").slice(0, 6).toUpperCase();
                    return `${dateKey}-${timeKey}-${suffix}-${idKey}`;
                };

                const getSlotDateMeta = (time: string) => {
                    const slotDate = getOperationalSlotDate(activeDate, time, operationalReferenceDate);
                    return {
                        slotDate,
                        slotDateText: toDateOnly(slotDate),
                    };
                };

        const getOpenFormulaDetail = (prescription: any, formula: any, index: number) => {
            const openFormulas = prescription.enteralDetails?.openFormulas || [];
            return openFormulas[index] || openFormulas.find((entry: any) => entry.formulaId === formula.formulaId);
        };

        const getFormulaDiluteTo = (prescription: any, formula: any, index: number): number => {
            const openFormula = getOpenFormulaDetail(prescription, formula, index);
            return Number(openFormula?.diluteTo || formula.diluteTo || 0);
        };

        const getFormulaStageVolume = (prescription: any, formula: any, index: number): number => {
            const diluteTo = getFormulaDiluteTo(prescription, formula, index);
            const formulaVolume = Number(formula.volume || 0);
            return prescription.systemType === "open" && diluteTo > 0 ? diluteTo : formulaVolume;
        };

        const describeFormula = (formula: any) => {
            const meta = formula.formulaId ? formulaMap.get(formula.formulaId) : undefined;
            const isPowder = meta?.presentationForm === "po";
            const details = [];
            if (isPowder && formula.volume) details.push(`${Math.round(formula.volume)} g`);
            if (!isPowder && formula.volume) details.push(`${Math.round(formula.volume)} mL`);
            if (formula.diluteTo) details.push(`Água para diluição ${Math.round(formula.diluteTo)} mL`);
            if (meta?.classification) details.push(meta.classification);
            return truncate(details.join(", "), 180);
        };

        const formatGrams = (value?: number) => {
            if (!Number.isFinite(value) || !value) return undefined;
            return `${Number(value.toFixed(1)).toLocaleString("pt-BR")} g`;
        };

        const calculateNutrientGrams = (valuePerUnit?: number, volume = 0, usePerMlUnits = false) => {
            if (!Number.isFinite(valuePerUnit) || !valuePerUnit || !volume) return undefined;
            const numericValue = Number(valuePerUnit);
            const factor = usePerMlUnits ? volume : volume / 100;
            return numericValue * factor;
        };

        const buildFormulaComposition = (formula: any, extraLines: string[] = []) => {
            const meta = formula.formulaId ? formulaMap.get(formula.formulaId) : undefined;
            const volume = Number(formula.volume || 0);
            const usesLegacyPerMlUnits = !meta?.density && Boolean(meta?.caloriesPerUnit && meta.caloriesPerUnit <= 10);
            const formulaDetails = describeFormula(formula);
            const quantitative = [
                meta?.proteinPerUnit ? `Prot. ${formatGrams(calculateNutrientGrams(meta.proteinPerUnit, volume, usesLegacyPerMlUnits))}` : "",
                meta?.carbPerUnit ? `Carb. ${formatGrams(calculateNutrientGrams(meta.carbPerUnit, volume, usesLegacyPerMlUnits))}` : "",
                meta?.fatPerUnit ? `Lip. ${formatGrams(calculateNutrientGrams(meta.fatPerUnit, volume, usesLegacyPerMlUnits))}` : "",
                meta?.fiberPerUnit ? `Fibra ${formatGrams(calculateNutrientGrams(meta.fiberPerUnit, volume, usesLegacyPerMlUnits))}` : "",
            ].filter(Boolean);
            const sources = [
                meta?.proteinSources ? `Fonte prot.: ${meta.proteinSources}` : "",
                meta?.carbSources ? `Fonte carb.: ${meta.carbSources}` : "",
                meta?.fatSources ? `Fonte lip.: ${meta.fatSources}` : "",
                meta?.fiberSources ? `Fonte fibra: ${meta.fiberSources}` : "",
            ].filter(Boolean);
            const lines = [
                formulaDetails,
                quantitative.join(", "),
                sources.join("; "),
                ...extraLines,
            ].filter(Boolean);

            return truncate(lines.join("\n"), 260) || undefined;
        };

        const describeModules = (entries: any[]) => truncate(
            entries
                .map((module) => {
                    return `${module.moduleName} ${module.amount || 0}${module.unit || "g"}`;
                })
                .join("\n"),
            180
        );

        const describeOralContext = (prescription: any) => {
            const details = [];
            if (prescription.oralDetails?.needsThickener) {
                const thickenerName = prescription.oralDetails?.thickenerProduct
                    || (prescription.oralDetails?.thickenerModuleId ? moduleMap.get(prescription.oralDetails.thickenerModuleId)?.name : undefined)
                    || (prescription.oralDetails?.thickenerFormulaId ? formulaMap.get(prescription.oralDetails.thickenerFormulaId)?.name : undefined)
                    || "espessante";
                const thickenerParts = [
                    thickenerName,
                    prescription.oralDetails?.thickenerGrams ? `${Math.round(prescription.oralDetails.thickenerGrams)} g` : "",
                    prescription.oralDetails?.thickenerVolume ? `${Math.round(prescription.oralDetails.thickenerVolume)} mL de água` : "",
                ].filter(Boolean);
                details.push(`Água espessada: ${thickenerParts.join(", ")}`);
            }
            return truncate(details.join(" | "), 120);
        };

        const isPowderFormula = (formula: any) => {
            const meta = formula.formulaId ? formulaMap.get(formula.formulaId) : undefined;
            const merged = `${meta?.name || ""} ${formula.formulaName}`.toLowerCase();
            return meta?.presentationForm === "po" || merged.includes(" po") || merged.includes(" em po") || merged.includes("pó");
        };

        const buildFormulaNameText = (formula: any) => {
            if (isPowderFormula(formula) && formula.volume) {
                return `${formula.formulaName} ${Math.round(formula.volume)}g`;
            }
            return formula.formulaName;
        };

        const buildFormulaVolumeText = (prescription: any, formula: any, index: number) => {
            const stageVolume = getFormulaStageVolume(prescription, formula, index);
            return stageVolume > 0 ? `${Math.round(stageVolume)} mL` : undefined;
        };

        uniquePrescriptions
            .filter((prescription) => {
                if (prescription.status !== "active") return false;
                if (currentHospitalId && prescription.hospitalId && prescription.hospitalId !== currentHospitalId) return false;

                const patient = patientsById.get(prescription.patientId);
                if (!isPatientActiveForOperations(patient, activeDate)) return false;

                const prescriptionStart = new Date(`${prescription.startDate}T00:00:00`);
                const prescriptionEnd = prescription.endDate ? new Date(`${prescription.endDate}T23:59:59`) : null;

                if (!Number.isNaN(prescriptionStart.getTime()) && prescriptionStart > activeDate) return false;
                if (prescriptionEnd && !Number.isNaN(prescriptionEnd.getTime()) && prescriptionEnd < activeDate) return false;

                return true;
            })
            .forEach((prescription) => {
                const patient = patientsById.get(prescription.patientId);
                const patientName = normalize(prescription.patientName || patient?.name);
                const bed = normalize(prescription.patientBed || patient?.bed);
                const record = normalize(prescription.patientRecord || patient?.record);
                const dob = toDateOnlyFromIso(patient?.dob) || "-";
                const clinicName = normalize(patient?.ward || prescription.patientWard || "Sem setor");
                const route = normalize(
                    prescription.therapyType === "oral"
                        ? "VO"
                        : prescription.feedingRoute || "SNE"
                );
                const formulaEntries = prescription.formulas || [];
                const moduleEntries = prescription.modules || [];

                const getSafeSchedules = (val: any): string[] => {
                    const dedupe = (items: string[]) => Array.from(new Set(items.map((item) => normalizeScheduleTime(item)).filter(Boolean)));

                    if (!val) return [];
                    if (Array.isArray(val)) return dedupe(val.map(String));
                    if (typeof val === 'string') {
                        try {
                            const parsed = JSON.parse(val);
                            if (Array.isArray(parsed)) return dedupe(parsed.map(String));
                        } catch (e) {
                            // If it's a comma-separated string
                            if (val.includes(',')) return dedupe(val.split(','));
                            return dedupe([val]);
                        }
                    }
                    return dedupe([String(val)]);
                };

                const formulaSchedules = Array.from(
                    new Set(formulaEntries.flatMap((formula) => getSafeSchedules(formula.schedules)))
                );
                const moduleSchedules = Array.from(
                    new Set(moduleEntries.flatMap((module) => getSafeSchedules(module.schedules)))
                );
                const hydrationSchedules = Array.from(new Set(getSafeSchedules(prescription.hydrationSchedules)));

                const baseSchedules: string[] =
                    formulaSchedules.length > 0
                        ? (formulaSchedules as string[])
                        : moduleSchedules.length > 0
                            ? (moduleSchedules as string[])
                            : hydrationSchedules.length > 0
                                ? (hydrationSchedules as string[])
                                : ["09:00"];

                // formulaSummary removed as we now iterate formulas individually


                const modulesSummary = describeModules(moduleEntries);

                const hasPowderLike = formulaEntries.some((formula) => {
                    const meta = formulaMap.get(formula.formulaId);
                    const merged = `${meta?.name || ""} ${formula.formulaName}`.toLowerCase();
                    const isInfant = meta?.type === "infant-formula" || merged.includes("infantil");
                    const isPowder = meta?.presentationForm === "po" || merged.includes(" po") || merged.includes(" em po") || merged.includes("pó");
                    return isInfant || isPowder;
                });

                const hasOralSupplement = formulaEntries.some((formula) => {
                    const meta = formulaMap.get(formula.formulaId);
                    const merged = `${meta?.name || ""} ${formula.formulaName}`.toLowerCase();
                    return meta?.type === "oral-supplement" || merged.includes("suplement");
                });

                const hasDilution = (prescription.hydrationVolume || 0) > 0;

                const pushLabel = (data: Omit<LabelData, "id">, key: string) => {
                    const scheduleKey = data.scheduleTime || "00:00";
                    const labelKey = [
                        prescription.patientId || prescription.patientName,
                        prescription.therapyType,
                        key,
                        scheduleKey,
                        data.templateTitle,
                        data.formulaText,
                        data.volumeText,
                        data.route,
                    ].join("|");

                    if (generatedLabelKeys.has(labelKey)) return;
                    generatedLabelKeys.add(labelKey);

                    list.push({
                        ...data,
                        id: `${prescription.id || "sem-id"}-${key}-${scheduleKey}`,
                    });
                };

                if (prescription.therapyType === "enteral") {
                    if (prescription.systemType === "closed") {
                        // For closed system: split by formula
                        if (formulaEntries.length > 0) {
                            formulaEntries.forEach((formula, idx) => {
                                const formulaSchedule = getSafeSchedules(formula.schedules).length > 0 ? getSafeSchedules(formula.schedules) : baseSchedules;
                                formulaSchedule.forEach((time: string) => {
                                    const { slotDate, slotDateText } = getSlotDateMeta(time);
                                    pushLabel(
                                        {
                                            clinic: clinicName,
                                            templateTitle: "Dieta Enteral Sistema Fechado",
                                            patientName,
                                            bed,
                                            record,
                                            dob,
                                            scheduleTime: time,
                                            infusionRate: getRate(prescription, getFormulaStageVolume(prescription, formula, idx)),
                                            route,
                                            formulaText: buildFormulaNameText(formula),
                                            compositionText: buildFormulaComposition(formula),
                                            volumeText: buildFormulaVolumeText(prescription, formula, idx),
                                            manipulationDate: slotDateText,
                                            manipulationTime: undefined,
                                            validityText: "Validade: 24h após conexão com equipo.",
                                            controlText: buildControl(prescription.id, time, "FE", slotDate),
                                            conservationText: conservationClosed,
                                            rtName,
                                            rtCrn,
                                        },
                                        `enteral-closed-${idx}`
                                    );
                                });
                            });
                        } else {
                            // Fallback if no formulas defined but type is closed (rare)
                            baseSchedules.forEach((time: string) => {
                                const { slotDate, slotDateText } = getSlotDateMeta(time);
                                pushLabel(
                                    {
                                        clinic: clinicName,
                                        templateTitle: "Dieta Enteral Sistema Fechado",
                                        patientName,
                                        bed,
                                        record,
                                        dob,
                                        scheduleTime: time,
                                        infusionRate: getRate(prescription),
                                        route,
                                        formulaText: "Fórmula enteral",
                                        compositionText: undefined,
                                        volumeText: prescription.totalVolume ? `${Math.round(prescription.totalVolume)} mL` : undefined,
                                        manipulationDate: slotDateText,
                                        manipulationTime: undefined,
                                        validityText: "Validade: 24h após conexão com equipo.",
                                        controlText: buildControl(prescription.id, time, "FE", slotDate),
                                        conservationText: conservationClosed,
                                        rtName,
                                        rtCrn,
                                    },
                                    "enteral-closed-fallback"
                                );
                            });
                        }
                    } else {
                        // Open system
                        const openTitle = "Dieta Enteral Sistema Aberto";

                        if (formulaEntries.length > 0) {
                            formulaEntries.forEach((formula, idx) => {
                                const formulaSchedule = getSafeSchedules(formula.schedules).length > 0 ? getSafeSchedules(formula.schedules) : baseSchedules;
                                formulaSchedule.forEach((time: string) => {
                                    const { slotDate, slotDateText } = getSlotDateMeta(time);
                                    pushLabel(
                                        {
                                            clinic: clinicName,
                                            templateTitle: openTitle,
                                            patientName,
                                            bed,
                                            record,
                                            dob,
                                            scheduleTime: time,
                                            infusionRate: getRate(prescription, getFormulaStageVolume(prescription, formula, idx)),
                                            route,
                                            formulaText: buildFormulaNameText(formula),
                                            compositionText: buildFormulaComposition(formula, [
                                                modulesSummary || "",
                                            ]),
                                            volumeText: buildFormulaVolumeText(prescription, formula, idx),
                                            manipulationDate: slotDateText,
                                            manipulationTime: time,
                                            validityText: "Validade: 4h após manipulação.",
                                            controlText: buildControl(prescription.id, time, "AB", slotDate),
                                            conservationText: conservationOpen,
                                            rtName,
                                            rtCrn,
                                        },
                                        `enteral-open-${idx}`
                                    );
                                });
                            });
                        } else {
                            baseSchedules.forEach((time: string) => {
                                const { slotDate, slotDateText } = getSlotDateMeta(time);
                                pushLabel(
                                    {
                                        clinic: clinicName,
                                        templateTitle: openTitle,
                                        patientName,
                                        bed,
                                        record,
                                        dob,
                                        scheduleTime: time,
                                        infusionRate: getRate(prescription),
                                        route,
                                        formulaText: "Fórmula enteral",
                                        compositionText: undefined,
                                        volumeText: prescription.totalVolume ? `${Math.round(prescription.totalVolume)} mL` : undefined,
                                        manipulationDate: slotDateText,
                                        manipulationTime: time,
                                        validityText: "Validade: 4h após manipulação.",
                                        controlText: buildControl(prescription.id, time, "AB", slotDate),
                                        conservationText: conservationOpen,
                                        rtName,
                                        rtCrn,
                                    },
                                    "enteral-open-fallback"
                                );
                            });
                        }

                    }

                    if (moduleEntries.length > 0 || (prescription.hydrationVolume || 0) > 0) {
                        const waterSchedules = hydrationSchedules.length > 0
                            ? hydrationSchedules
                            : moduleSchedules.length > 0
                                ? moduleSchedules
                                : baseSchedules;
                        const baseWaterName = waterSupply?.name || "ÁGUA";
                        const waterCodeSuffix = waterSupply?.code ? ` (COD. ${waterSupply.code})` : "";
                        const waterTitle = modulesSummary
                            ? `${baseWaterName.toUpperCase()} COM MÓDULOS`
                            : baseWaterName.toUpperCase();

                        waterSchedules.forEach((time: string) => {
                            const { slotDate, slotDateText } = getSlotDateMeta(time);
                            pushLabel(
                                {
                                    clinic: clinicName,
                                    templateTitle: waterTitle,
                                    patientName,
                                    bed,
                                    record,
                                    dob,
                                    scheduleTime: time,
                                    infusionRate: getRate(prescription),
                                    route,
                                    formulaText: prescription.hydrationVolume
                                        ? `${baseWaterName}${waterCodeSuffix} ${Math.round(prescription.hydrationVolume)} mL`
                                        : `${baseWaterName}${waterCodeSuffix}`,
                                    compositionText: modulesSummary || undefined,
                                    volumeText: prescription.hydrationVolume
                                        ? `${Math.round(prescription.hydrationVolume)} mL`
                                        : undefined,
                                    manipulationDate: slotDateText,
                                    manipulationTime: time,
                                    validityText: "Validade: 4h após manipulação.",
                                    controlText: buildControl(prescription.id, time, "AG", slotDate),
                                    conservationText: conservationOpen,
                                    rtName,
                                    rtCrn,
                                },
                                "water-modules"
                            );
                        });
                    }
                }

                if (prescription.therapyType === "oral") {
                    if (moduleEntries.length > 0) {
                        const oralModuleSchedules = moduleSchedules.length > 0 ? moduleSchedules : ["09:00"];
                        oralModuleSchedules.forEach((time: string) => {
                            const { slotDate, slotDateText } = getSlotDateMeta(time);
                            pushLabel(
                                {
                                    clinic: clinicName,
                                    templateTitle: prescription.oralDetails?.administrationRoute === "translactation"
                                        ? "MÓDULOS de translactação"
                                        : "MÓDULOS de via oral",
                                    patientName,
                                    bed,
                                    record,
                                    dob,
                                    scheduleTime: time,
                                    route,
                                    formulaText: undefined,
                                    compositionText: [
                                        modulesSummary ? `Módulos: ${modulesSummary}` : "",
                                        describeOralContext(prescription),
                                    ].filter(Boolean).join(" | ") || undefined,
                                    manipulationDate: slotDateText,
                                    manipulationTime: time,
                                    validityText: "Validade: 4h após manipulação.",
                                    controlText: buildControl(prescription.id, time, "VO", slotDate),
                                    conservationText: conservationOpen,
                                    rtName,
                                    rtCrn,
                                },
                                "oral-modules"
                            );
                        });
                    }

                    if (formulaEntries.length > 0) {
                        formulaEntries.forEach((formula, index) => {
                            const meta = formulaMap.get(formula.formulaId);
                            const merged = `${meta?.name || ""} ${formula.formulaName}`.toLowerCase();
                            const isPowder = meta?.presentationForm === "po" || merged.includes(" po") || merged.includes(" em po") || merged.includes("pó");
                            const isLiquidSupplement = hasOralSupplement && !isPowder;
                            const isTranslactation = prescription.oralDetails?.administrationRoute === "translactation";
                            const isInfantFormula = meta?.type === "infant-formula";

                            const formulaSchedulesList = getSafeSchedules(formula.schedules).length > 0 ? getSafeSchedules(formula.schedules) : ["09:00"];
                            formulaSchedulesList.forEach((time: string) => {
                                const { slotDate, slotDateText } = getSlotDateMeta(time);
                                pushLabel(
                                    {
                                        clinic: clinicName,
                                        templateTitle: isTranslactation
                                            ? "DIETA por translactação"
                                            : isInfantFormula
                                                ? "DIETA fórmula infantil"
                                                : isLiquidSupplement
                                            ? "Suplementos via oral líquidos"
                                            : isPowder
                                                ? "DIETA - Suplementos via oral em pó"
                                                : "DIETA via oral",
                                        patientName,
                                        bed,
                                        record,
                                        dob,
                                        scheduleTime: time,
                                        route,
                                        formulaText: buildFormulaNameText(formula),
                                        compositionText: buildFormulaComposition(formula, [
                                            describeOralContext(prescription),
                                        ]),
                                        volumeText: buildFormulaVolumeText(prescription, formula, index),
                                        manipulationDate: slotDateText,
                                        manipulationTime: time,
                                        validityText: "Validade: 4h após manipulação.",
                                        controlText: buildControl(prescription.id, time, "OR", slotDate),
                                        conservationText: conservationOpen,
                                        rtName,
                                        rtCrn,
                                    },
                                    `oral-formula-${index + 1}`
                                );
                            });
                        });
                    }

                    if (prescription.oralDetails?.needsThickener && prescription.oralDetails?.thickenerTimes?.length) {
                        const thickenerName = prescription.oralDetails?.thickenerProduct
                            || (prescription.oralDetails?.thickenerModuleId ? moduleMap.get(prescription.oralDetails.thickenerModuleId)?.name : undefined)
                            || (prescription.oralDetails?.thickenerFormulaId ? formulaMap.get(prescription.oralDetails.thickenerFormulaId)?.name : undefined)
                            || "Espessante";
                        prescription.oralDetails.thickenerTimes
                            .map((time) => normalizeScheduleTime(time))
                            .filter(Boolean)
                            .forEach((time) => {
                                const { slotDate, slotDateText } = getSlotDateMeta(time);
                                pushLabel(
                                    {
                                        clinic: clinicName,
                                        templateTitle: "ÁGUA ESPESSADA",
                                        patientName,
                                        bed,
                                        record,
                                        dob,
                                        scheduleTime: time,
                                        route,
                                        formulaText: prescription.oralDetails?.thickenerVolume
                                            ? `ÁGUA ${Math.round(prescription.oralDetails.thickenerVolume)} mL`
                                            : "ÁGUA",
                                        compositionText: [
                                            `${thickenerName} ${Math.round(prescription.oralDetails?.thickenerGrams || 0)}g`,
                                        ].filter(Boolean).join(", ") || undefined,
                                        volumeText: prescription.oralDetails?.thickenerVolume
                                            ? `${Math.round(prescription.oralDetails.thickenerVolume)} mL`
                                            : undefined,
                                        manipulationDate: slotDateText,
                                        manipulationTime: time,
                                        validityText: "Validade: 4h após manipulação.",
                                        controlText: buildControl(prescription.id, time, "ES", slotDate),
                                        conservationText: conservationOpen,
                                        rtName,
                                        rtCrn,
                                    },
                                    "oral-thickener"
                                );
                            });
                    }
                }
            });

        return list;
    }, [activeDate, currentHospitalId, formulaMap, moduleMap, operationalReferenceDate, patientsById, settings, uniquePrescriptions, waterSupply]);

    const filteredLabels = useMemo(() => {
        return labels.filter((label) => {
            const matchClinic = clinic === "all" || normalizeFilterText(label.clinic) === normalizeFilterText(clinic);
            const matchPatient = normalizeFilterText(label.patientName).includes(normalizeFilterText(patientSearch));
            const matchTime = label.scheduleTime ? selectedTimeSet.has(normalizeScheduleTime(label.scheduleTime)) : true;
            return matchClinic && matchPatient && matchTime;
        });
    }, [clinic, labels, patientSearch, selectedTimeSet]);

    useEffect(() => {
        const filteredIds = new Set(filteredLabels.map((label) => label.id));
        setSelectedLabels((prev) => prev.filter((id) => filteredIds.has(id)));
    }, [filteredLabels]);

    const toggleTime = (time: string) => {
        setSelectedTimes((current) =>
            current.includes(time)
                ? sortScheduleTimes(current.filter((item) => item !== time))
                : sortScheduleTimes([...current, time])
        );
    };

    const selectAllTimes = () => setSelectedTimes([...availableScheduleTimes]);
    const clearAllTimes = () => setSelectedTimes([]);

    const toggleLabel = (id: string) => {
        setSelectedLabels((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
        );
    };

    const selectAllLabels = () => setSelectedLabels(filteredLabels.map((label) => label.id));
    const clearAllLabels = () => setSelectedLabels([]);

    const handlePrint = () => {
        printElementInPopup("labels-print-document", "Etiquetas clínicas de nutrição");
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background pb-20">
            <div className="print:hidden">
                <Header />
            </div>
            <div className="container py-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Tag className="h-6 w-6" />
                            Etiquetas clínicas de nutrição
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Impressão alinhada ao padrão operacional da RDC 503/2021
                        </p>
                    </div>
                    <Button variant="outline" onClick={handlePrint} disabled={selectedLabels.length === 0}>
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir selecionadas ({selectedLabels.length})
                    </Button>
                </div>

                <div className="print:hidden">
                    {/* Campos obrigatórios card removido */}
                </div>

                <div className="print:hidden">
                    <Card className="border-primary/10 bg-card/90 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Filtros</CardTitle>
                            <CardDescription>Selecione os critérios para gerar as etiquetas</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Content omitted for brevity, logic remains the same */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Building className="h-4 w-4" />
                                        Unidade / setor
                                    </Label>
                                    <Select value={clinic} onValueChange={setClinic}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            {clinicOptions.map((name) => (
                                                <SelectItem key={name} value={name}>{name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Paciente
                                    </Label>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar por nome..."
                                            className="pl-8"
                                            value={patientSearch}
                                            onChange={(event) => setPatientSearch(event.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4" />
                                        Data de manipulação
                                    </Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {date ? new Intl.DateTimeFormat('pt-BR').format(date) : <span>Selecione</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <Label className="font-semibold">Horários</Label>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={selectAllTimes}>Todos</Button>
                                        <Button variant="outline" size="sm" onClick={clearAllTimes}>Limpar</Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                    {availableScheduleTimes.map((time) => (
                                        <button
                                            key={time}
                                            type="button"
                                            onClick={() => toggleTime(time)}
                                            className={`px-3 py-2 rounded-lg text-center transition-all border-2 ${selectedTimes.includes(time)
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-muted/50 border-muted hover:border-primary/50"
                                                }`}
                                        >
                                            <span className="text-sm font-medium">{time}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="print:hidden">
                    <Card className="border-primary/10 bg-card/90 backdrop-blur">
                        <CardHeader>
                            <div className="flex justify-between items-center gap-3">
                                <div>
                                    <CardTitle>Etiquetas disponíveis</CardTitle>
                                    <CardDescription>
                                        {prescriptionsLoading
                                            ? "Carregando prescrições..."
                                            : `${filteredLabels.length} etiqueta(s) pronta(s) para impressão`
                                        }
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={selectAllLabels}>Selecionar todas</Button>
                                    <Button variant="outline" size="sm" onClick={clearAllLabels}>Limpar seleção</Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {prescriptionsLoading ? (
                                <div className="text-center py-8 text-muted-foreground">Carregando prescrições do banco...</div>
                            ) : filteredLabels.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhuma etiqueta encontrada para os filtros selecionados.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredLabels.map((label) => (
                                        <button
                                            key={label.id}
                                            type="button"
                                            className={`relative text-left rounded-xl p-2 border transition-all ${selectedLabels.includes(label.id)
                                                ? "border-primary ring-2 ring-primary/40"
                                                : "border-border hover:border-primary/50"
                                                }`}
                                            onClick={() => toggleLabel(label.id)}
                                        >
                                            <div className="absolute top-2 right-2 h-5 w-5 rounded-full border text-[10px] font-bold flex items-center justify-center bg-background">
                                                {selectedLabels.includes(label.id) ? "OK" : ""}
                                            </div>
                                            <LabelPreview data={label} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div id="labels-print-document" className="hidden print:block">
                    <div className="print-label-sheet print:grid print:grid-cols-3 print:gap-x-[3mm] print:gap-y-0" style={printLabelSheetStyle}>
                        {filteredLabels
                            .filter((label) => selectedLabels.includes(label.id))
                            .map((label) => (
                                <div key={label.id} className="print-label-item break-inside-avoid" style={printLabelItemStyle}>
                                    <LabelPreview data={label} />
                                </div>
                            ))}
                    </div>
                </div>
            </div>
            <div className="print:hidden">
                <BottomNav />
            </div>
        </div>
    );
};

export default Labels;
