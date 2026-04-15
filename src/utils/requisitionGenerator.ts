import { Prescription, Formula, Module, Supply, Patient } from '@/lib/database';
import { RequisitionData, DietMapItem, ConsolidatedItem } from '@/types/requisition';
import { getPrescriptionRateLabel } from '@/lib/prescriptionInfusion';
import { compareBedLabels } from '@/lib/patientDisplay';

// Native Date helpers to replace date-fns
const startOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const endOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

const parseISO = (dateString: string): Date => {
    return new Date(dateString);
};

const normalizeScheduleTime = (value?: string | null): string => {
    if (!value) return "";

    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{1,2})(?::?(\d{2}))?\s*h?$/i);
    if (!match) return trimmed;

    const hours = match[1].padStart(2, "0");
    const minutes = (match[2] || "00").padStart(2, "0");
    return `${hours}:${minutes}`;
};

const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('pt-BR').format(date);
};

const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

const countInclusiveDays = (startDate: Date, endDate: Date): number => {
    const start = startOfDay(startDate);
    const end = startOfDay(endDate);
    const msPerDay = 1000 * 60 * 60 * 24;

    if (end < start) return 1;

    return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
};

const safeDateTime = (date?: string | null): number => {
    if (!date) return 0;
    const parsed = new Date(date).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

const comparePrescriptionRecency = (left: Prescription, right: Prescription): number => {
    const leftRank = [
        safeDateTime(left.startDate),
        safeDateTime(left.createdAt),
        safeDateTime(left.updatedAt),
    ];
    const rightRank = [
        safeDateTime(right.startDate),
        safeDateTime(right.createdAt),
        safeDateTime(right.updatedAt),
    ];

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

interface GenerateOptions {
    prescriptions: Prescription[];
    patients: Patient[];
    formulas: Formula[];
    modules: Module[];
    supplies: Supply[];
    unitName: string;
    therapyLabel: string;
    startDate: Date;
    endDate: Date;
    selectedTimes: string[];
    signatures: {
        technician: string;
        prescriber: string;
        manager: string;
    };
}

export const generateRequisitionData = ({
    prescriptions,
    patients,
    formulas,
    modules,
    supplies,
    unitName,
    therapyLabel,
    startDate,
    endDate,
    selectedTimes,
    signatures
}: GenerateOptions): RequisitionData => {
    const orderedSelectedTimes = [...selectedTimes]
        .map((time) => normalizeScheduleTime(time))
        .filter(Boolean);
    const scheduleOrder = new Map(orderedSelectedTimes.map((time, index) => [time, index]));
    const dietMap: DietMapItem[] = [];
    const consolidatedMap = new Map<string, ConsolidatedItem>();
    const patientsById = new Map(patients.map((patient) => [patient.id, patient]));
    const selectedTimeSet = new Set(orderedSelectedTimes);

    // Helper to add to consolidated list
    const addToConsolidated = (
        code: string,
        name: string,
        amount: number,
        unit: string,
        price: number = 0,
        type: ConsolidatedItem['type']
    ) => {
        if (!Number.isFinite(amount) || amount <= 0) return;

        const key = `${code}-${name}`;
        const existing = consolidatedMap.get(key);
        if (existing) {
            existing.totalQuantity += amount;
            existing.subtotal = existing.totalQuantity * existing.unitPrice;
        } else {
            consolidatedMap.set(key, {
                code,
                name,
                billingUnit: unit,
                totalQuantity: amount,
                unitPrice: price,
                subtotal: amount * price,
                type
            });
        }
    };

    // Helper: Find pricing
    const getFormulaPrice = (id: string) => formulas.find(f => f.id === id)?.billingPrice || 0;
    const getModulePrice = (id: string) => modules.find(m => m.id === id)?.billingPrice || 0;
    const getFormulaByIdOrName = (id?: string, name?: string) => {
        if (id) {
            const matchById = formulas.find((formula) => formula.id === id);
            if (matchById) return matchById;
        }
        const normalizedName = name?.trim().toLowerCase();
        if (!normalizedName) return undefined;
        return formulas.find((formula) => formula.name.trim().toLowerCase() === normalizedName);
    };
    const getModuleByIdOrName = (id?: string, name?: string) => {
        if (id) {
            const matchById = modules.find((moduleItem) => moduleItem.id === id);
            if (matchById) return matchById;
        }
        const normalizedName = name?.trim().toLowerCase();
        if (!normalizedName) return undefined;
        return modules.find((moduleItem) => moduleItem.name.trim().toLowerCase() === normalizedName);
    };

    const findSupplyByCategory = (category: Supply['category']) =>
        supplies.find((s) => s.category === category && s.isActive && s.isBillable !== false);

    const eligiblePrescriptions = prescriptions.filter(p => {
        if (p.status !== 'active') return false;
        if (unitName !== 'all' && p.patientWard !== unitName) return false;
        const pStart = parseISO(p.startDate);
        const pEnd = p.endDate ? parseISO(p.endDate) : null;
        const rangeStart = startOfDay(startDate);
        const rangeEnd = endOfDay(endDate);
        if (pStart > rangeEnd) return false;
        if (pEnd && pEnd < rangeStart) return false;
        return true;
    });
    const activePrescriptions = pickLatestPrescriptionPerPatientAndRoute(eligiblePrescriptions);

    // Inclusive period: 14/04-14/04 = 1 day, 14/04-15/04 = 2 days.
    const dayDiff = countInclusiveDays(startDate, endDate);

    activePrescriptions.forEach(p => {
        const patient = patientsById.get(p.patientId);
        const patientInfo = {
            patientId: p.patientId,
            patientName: patient?.name || p.patientName || 'Paciente sem nome',
            patientRecord: patient?.record || p.patientRecord || '-',
            bed: patient?.bed || p.patientBed || '-',
            ward: patient?.ward || p.patientWard || '-',
            dob: patient?.dob,
            route: p.therapyType === 'oral'
                ? (p.oralDetails?.administrationRoute === 'translactation' ? 'Translactação' : 'Oral')
                : p.feedingRoute || p.therapyType,
        };

        let dailySets = 0;
        let dailyBottles = 0;
        let hasMappedDelivery = false;

        // --- Process Formulas ---
        p.formulas.forEach(f => {
            const formulaObj = formulas.find(item => item.id === f.formulaId);
            const matchingTimes = (f.schedules || [])
                .map((time) => normalizeScheduleTime(time))
                .filter((time) => selectedTimeSet.has(time));
            matchingTimes.sort((left, right) => (scheduleOrder.get(left) ?? 999) - (scheduleOrder.get(right) ?? 999));
            if (matchingTimes.length > 0 && f.volume > 0) {
                hasMappedDelivery = true;
                const openFormulaEntry = p.enteralDetails?.openFormulas?.find((entry) => entry.formulaId === f.formulaId);
                const manipulationTimes = p.systemType === 'open' ? openFormulaEntry?.manipulationTimes || [] : [];
                const manipulationLabel = manipulationTimes.length > 0 ? `Manipulação: ${manipulationTimes.join(', ')} | ` : '';

                dietMap.push({
                    ...patientInfo,
                    type: 'formula',
                    productName: f.formulaName,
                    volumeOrAmount: f.volume,
                    unit: 'ml',
                    stageVolume: f.volume,
                    stageVolumeUnit: 'ml',
                    rate: getPrescriptionRateLabel(p, f.volume),
                    times: matchingTimes,
                    productCode: formulaObj?.code || f.formulaId,
                    observation: manipulationLabel + (p.systemType === 'closed'
                        ? 'Sistema fechado'
                        : p.infusionMode === 'bolus'
                            ? 'Sistema aberto - bolus'
                            : 'Sistema aberto')
                });

                const totalVol = f.volume * matchingTimes.length * dayDiff;
                const price = getFormulaPrice(f.formulaId);
                const equipmentVolumePerAdministration = p.systemType === 'open' && p.therapyType === 'enteral'
                    ? (p.equipmentVolume || 0)
                    : 0;
                let rowUnitPrice = price;
                let rowSubtotal = 0;

                // Formulas often billed by mL or Unit (bag).
                const billingUnit = formulaObj?.billingUnit || 'ml';
                const diluteTo = Number(openFormulaEntry?.diluteTo || 0);
                const extraVolumePerDay = equipmentVolumePerAdministration * matchingTimes.length;
                const totalExtraVolume = extraVolumePerDay * dayDiff;
                const extraPowderPerAdministration = equipmentVolumePerAdministration > 0
                    && billingUnit === 'g'
                    && diluteTo > 0
                    ? (f.volume / diluteTo) * equipmentVolumePerAdministration
                    : 0;
                const totalBillableAmount = billingUnit === 'g'
                    ? totalVol + (extraPowderPerAdministration * matchingTimes.length * dayDiff)
                    : totalVol + totalExtraVolume;

                if (p.systemType === 'closed') {
                    const bagSize = formulaObj?.presentations?.[0] || 1000;
                    const bagQuantities = p.enteralDetails?.closedFormula?.bagQuantities || {};
                    const bagQtyFromPrescription = Object.values(bagQuantities).reduce((sum: number, qty: unknown) => sum + (Number(qty) || 0), 0);
                    const dailyVolume = f.volume * matchingTimes.length;
                    const dailyBags = bagQtyFromPrescription > 0
                        ? bagQtyFromPrescription
                        : Math.ceil(dailyVolume / bagSize);
                    const totalBags = dailyBags * dayDiff;
                    const closedBillableQuantity = billingUnit === 'ml'
                        ? totalBags * bagSize
                        : totalBags;
                    const closedBillingUnit = billingUnit === 'ml' ? 'ml' : billingUnit;
                    rowUnitPrice = price;
                    rowSubtotal = closedBillableQuantity * price;

                    addToConsolidated(formulaObj?.code || f.formulaId, f.formulaName, closedBillableQuantity, closedBillingUnit, price, 'formula');
                } else if (billingUnit === 'ml' && formulaObj?.presentations && formulaObj.presentations.length > 0) {
                    rowUnitPrice = price;
                    rowSubtotal = totalBillableAmount * price;

                    addToConsolidated(formulaObj?.code || f.formulaId, f.formulaName, totalBillableAmount, 'ml', price, 'formula');
                } else if (billingUnit === 'unit') {
                    const bagSize = formulaObj?.presentations?.[0] || 1000;
                    const dailyVolume = (f.volume * matchingTimes.length) + extraVolumePerDay;
                    const dailyBags = Math.ceil(dailyVolume / bagSize);
                    const totalBags = dailyBags * dayDiff;
                    rowUnitPrice = price;
                    rowSubtotal = totalBags * price;

                    addToConsolidated(formulaObj?.code || f.formulaId, f.formulaName, totalBags, 'bolsa', price, 'formula');
                } else {
                    rowUnitPrice = price;
                    rowSubtotal = totalBillableAmount * price;
                    // Fallback: Bill by total volume (ml) or original unit
                    addToConsolidated(formulaObj?.code || f.formulaId, f.formulaName, totalBillableAmount, billingUnit, price, 'formula');
                }

                const formulaRow = dietMap[dietMap.length - 1];
                if (formulaRow?.productCode === f.formulaId && formulaRow.productName === f.formulaName) {
                    formulaRow.unitPrice = rowUnitPrice || 0;
                    formulaRow.subtotal = rowSubtotal || 0;
                }

                // Heuristic for Bottles: If Open System, 1 bottle per administration?
                if (p.systemType === 'open') {
                    dailyBottles += matchingTimes.length;
                }
            }
        });

        // --- Process Modules ---
        p.modules.forEach(m => {
            const moduleObj = modules.find(item => item.id === m.moduleId);
            const matchingTimes = (m.schedules || [])
                .map((time) => normalizeScheduleTime(time))
                .filter((time) => selectedTimeSet.has(time));
            matchingTimes.sort((left, right) => (scheduleOrder.get(left) ?? 999) - (scheduleOrder.get(right) ?? 999));
            if (matchingTimes.length > 0 && m.amount > 0) {
                hasMappedDelivery = true;
                dietMap.push({
                    ...patientInfo,
                    type: 'module',
                    productName: m.moduleName,
                    volumeOrAmount: m.amount,
                    unit: m.unit || 'g',
                    times: matchingTimes,
                    productCode: moduleObj?.code || m.moduleId,
                    observation: 'Módulo prescrito'
                });

                const totalAmount = m.amount * matchingTimes.length * dayDiff;
                const price = getModulePrice(m.moduleId);
                addToConsolidated(moduleObj?.code || m.moduleId, m.moduleName, totalAmount, m.unit || 'g', price, 'module');

                const moduleRow = dietMap[dietMap.length - 1];
                if (moduleRow?.productCode === m.moduleId && moduleRow.productName === m.moduleName) {
                    moduleRow.unitPrice = price || 0;
                    moduleRow.subtotal = totalAmount * (price || 0);
                }
            }
        });

        if (p.therapyType === 'oral' && p.oralDetails?.needsThickener) {
            const thickenerTimes = (p.oralDetails.thickenerTimes || [])
                .map((time) => normalizeScheduleTime(time))
                .filter((time) => selectedTimeSet.has(time));
            thickenerTimes.sort((left, right) => (scheduleOrder.get(left) ?? 999) - (scheduleOrder.get(right) ?? 999));
            const thickenerGrams = Number(p.oralDetails.thickenerGrams || 0);
            const thickenerVolume = Number(p.oralDetails.thickenerVolume || 0);
            const thickenerModule = getModuleByIdOrName(
                p.oralDetails.thickenerModuleId || p.oralDetails.thickenerFormulaId,
                p.oralDetails.thickenerProduct,
            );
            const legacyThickenerFormula = getFormulaByIdOrName(
                p.oralDetails.thickenerFormulaId,
                p.oralDetails.thickenerProduct,
            );
            const thickenerSource = thickenerModule || legacyThickenerFormula;

            if (thickenerTimes.length > 0 && (thickenerGrams > 0 || thickenerVolume > 0)) {
                hasMappedDelivery = true;
                dietMap.push({
                    ...patientInfo,
                    type: thickenerModule ? 'module' : 'supplement',
                    productName: p.oralDetails.thickenerProduct || thickenerSource?.name || 'Espessante',
                    volumeOrAmount: thickenerGrams || thickenerVolume,
                    unit: thickenerGrams > 0 ? 'g' : (thickenerSource?.billingUnit || 'ml'),
                    stageVolume: thickenerVolume || undefined,
                    stageVolumeUnit: thickenerVolume > 0 ? 'ml' : undefined,
                    times: thickenerTimes,
                    productCode: thickenerSource?.code || thickenerSource?.id,
                    observation: 'Água espessada',
                });

                const dailyGrams = thickenerGrams * thickenerTimes.length;
                const dailyVolume = thickenerVolume * thickenerTimes.length;
                const billableUnit = thickenerSource?.billingUnit || (thickenerGrams > 0 ? 'g' : 'ml');
                const conversionFactor = thickenerModule?.referenceAmount
                    || legacyThickenerFormula?.conversionFactor
                    || legacyThickenerFormula?.presentations?.[0]
                    || 0;

                let totalQuantity = billableUnit === 'ml' ? dailyVolume * dayDiff : dailyGrams * dayDiff;
                let unitPrice = thickenerSource?.billingPrice || 0;

                if (billableUnit === 'unit' && conversionFactor > 0) {
                    totalQuantity = Math.ceil((dailyGrams * dayDiff) / conversionFactor);
                }

                const rowSubtotal = totalQuantity * unitPrice;

                addToConsolidated(
                    thickenerSource?.code || thickenerSource?.id || 'THICKENER',
                    p.oralDetails.thickenerProduct || thickenerSource?.name || 'Espessante',
                    totalQuantity,
                    billableUnit,
                    unitPrice,
                    thickenerModule ? 'module' : 'formula',
                );

                const thickenerRow = dietMap[dietMap.length - 1];
                if (thickenerRow) {
                    thickenerRow.unitPrice = unitPrice || 0;
                    thickenerRow.subtotal = rowSubtotal || 0;
                }
            }
        }

        // --- Process Hydration ---
        if (p.hydrationVolume && p.hydrationSchedules) {
            const matchingTimes = p.hydrationSchedules
                .map((time) => normalizeScheduleTime(time))
                .filter((time) => selectedTimeSet.has(time));
            matchingTimes.sort((left, right) => (scheduleOrder.get(left) ?? 999) - (scheduleOrder.get(right) ?? 999));
            if (matchingTimes.length > 0 && p.hydrationVolume > 0) {
                hasMappedDelivery = true;
                dietMap.push({
                    ...patientInfo,
                    type: 'water',
                    productName: p.therapyType === 'oral' ? 'Água para hidratação' : 'Água para diluição/hidratação',
                    volumeOrAmount: p.hydrationVolume,
                    unit: 'ml',
                    stageVolume: p.hydrationVolume,
                    stageVolumeUnit: 'ml',
                    rate: p.infusionMode === 'bolus' ? 'Bolus' : undefined,
                    times: matchingTimes,
                    productCode: 'WATER-001',
                    observation: 'Linha separada de hidratação'
                });
                const totalVol = p.hydrationVolume * matchingTimes.length * dayDiff;
                // Exclude water from consolidated billing as requested
                // addToConsolidated('WATER-001', 'ÁGUA FILTRADA', totalVol, 'ml', 0, 'diet');

                // Hydration also uses bottles in open system
                if (p.systemType === 'open') {
                    dailyBottles += matchingTimes.length;
                }
            }
        }

        // --- Supplies Heuristics (Consolidated Only) ---
        if (selectedTimes.length > 0 && hasMappedDelivery) { // Only charge if this prescription generated map lines for selected times.
            if (p.infusionMode === 'pump') {
                const pumpSupply = supplies.find(s => s.name.toLowerCase().includes('bomba')) || supplies.find(s => s.type === 'set');

                if (pumpSupply) {
                    addToConsolidated(pumpSupply.code, pumpSupply.name, 1 * dayDiff, 'un', pumpSupply.unitPrice, 'supply');
                }
            } else if (p.infusionMode === 'gravity') {
                const gravSupply = supplies.find(s => s.name.toLowerCase().includes('gravitacional')) || supplies.find(s => s.type === 'set');
                if (gravSupply) {
                    addToConsolidated(gravSupply.code, gravSupply.name, 1 * dayDiff, 'un', gravSupply.unitPrice, 'supply');
                }
            }

            // Bottles (Frascos)
            if (dailyBottles > 0) {
                const bottleSupply = findSupplyByCategory('feeding-bottle') || supplies.find(s => s.type === 'bottle' && s.isActive && s.isBillable !== false);
                if (bottleSupply) {
                    addToConsolidated(bottleSupply.code, bottleSupply.name, dailyBottles * dayDiff, 'un', bottleSupply.unitPrice, 'supply');
                }
            }
        }

        if (p.therapyType === 'oral' && p.oralDetails?.deliveryMethod === 'feeding-bottle') {
            const feedingBottle = findSupplyByCategory('feeding-bottle') || supplies.find(s => s.type === 'bottle' && s.isActive && s.isBillable !== false);
            if (feedingBottle) {
                const oralAdministrations = p.formulas.reduce((sum, formula) => {
                    const matchingTimes = (formula.schedules || [])
                        .map((time) => normalizeScheduleTime(time))
                        .filter((time) => selectedTimeSet.has(time));
                    return sum + matchingTimes.length;
                }, 0);
                const totalUnits = Math.max(oralAdministrations, 1) * dayDiff;
                addToConsolidated(feedingBottle.code, feedingBottle.name, totalUnits, 'un', feedingBottle.unitPrice, 'supply');
            }
        }

    });

    const typeOrder: Record<DietMapItem['type'], number> = { formula: 1, water: 2, module: 3, supplement: 4 };
    dietMap.sort((a, b) => {
        if (a.ward !== b.ward) return a.ward.localeCompare(b.ward);
        const bedComparison = compareBedLabels(a.bed, b.bed);
        if (bedComparison !== 0) return bedComparison;
        if (a.patientName !== b.patientName) return a.patientName.localeCompare(b.patientName);
        const leftTime = a.times[0] || '';
        const rightTime = b.times[0] || '';
        if (leftTime !== rightTime) return leftTime.localeCompare(rightTime);
        if ((typeOrder[a.type] || 99) !== (typeOrder[b.type] || 99)) return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
        return a.productName.localeCompare(b.productName);
    });

    const consolidated = Array.from(consolidatedMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    return {
        unitName: unitName === 'all' ? 'Todas as Unidades' : unitName,
        therapyLabel,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        printDate: formatDateTime(new Date()),
        selectedTimes: orderedSelectedTimes,
        dietMap,
        consolidated,
        signatures
    };
};
