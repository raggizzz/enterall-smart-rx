import { Prescription, Formula, Module, Supply, Patient } from '@/lib/database';
import { RequisitionData, DietMapItem, ConsolidatedItem } from '@/types/requisition';
import { getPrescriptionRateLabel } from '@/lib/prescriptionInfusion';
import { compareBedLabels } from '@/lib/patientDisplay';
import { isPatientActiveForOperations } from '@/lib/patientStatus';
import { getOperationalSlotDate } from '@/lib/scheduleTimes';

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

const isSameCalendarDay = (left: Date, right: Date) => (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
);

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
    includeAutomaticSets?: boolean;
    includeAutomaticBottles?: boolean;
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
    signatures,
    includeAutomaticSets = true,
    includeAutomaticBottles = true,
}: GenerateOptions): RequisitionData => {
    const normalizeLookupText = (value?: string) =>
        (value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    const orderedSelectedTimes = [...selectedTimes]
        .map((time) => normalizeScheduleTime(time))
        .filter(Boolean);
    const scheduleOrder = new Map(orderedSelectedTimes.map((time, index) => [time, index]));
    const dietMap: DietMapItem[] = [];
    const consolidatedMap = new Map<string, ConsolidatedItem>();
    const patientsById = new Map(patients.map((patient) => [patient.id, patient]));
    const selectedTimeSet = new Set(orderedSelectedTimes);
    const operationalReferenceDate = (
        isSameCalendarDay(startDate, endDate) && isSameCalendarDay(startDate, new Date())
    ) ? new Date() : undefined;

    const formatOperationalHeaderTimeLabel = (time: string) => {
        const normalized = normalizeScheduleTime(time);
        if (!normalized) return time;
        const slotDate = getOperationalSlotDate(startDate, normalized, operationalReferenceDate);
        return `${formatDate(slotDate)} ${normalized}`;
    };

    const formatDietMapTimeLabel = (time: string) => {
        const normalized = normalizeScheduleTime(time);
        return normalized || time;
    };

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
    const getOralScheduleNames = (schedule?: Record<string, unknown>) => {
        if (!schedule) return [];

        const labels: Array<[string, string]> = [
            ['breakfast', 'Desjejum'],
            ['midMorning', 'Colacao'],
            ['lunch', 'Almoco'],
            ['afternoon', 'Merenda'],
            ['dinner', 'Jantar'],
            ['supper', 'Ceia'],
        ];
        const enabled = labels
            .filter(([key]) => Boolean(schedule[key]))
            .map(([, label]) => label);

        if (typeof schedule.other === 'string' && schedule.other.trim()) {
            enabled.push(schedule.other.trim());
        }

        return enabled;
    };
    const oralScheduleToBillingTime: Record<string, string> = {
        desjejum: '06:00',
        colacao: '09:00',
        almoco: '12:00',
        merenda: '15:00',
        jantar: '18:00',
        ceia: '18:00',
    };
    const mapOralScheduleToBillingTime = (value: string) =>
        oralScheduleToBillingTime[normalizeLookupText(value)] || normalizeScheduleTime(value);
    const isClockSchedule = (value: string) => /^\d{1,2}(?::?\d{2})?\s*h?$/i.test(value.trim());
    const getMatchingSchedules = (scheduleTimes: string[] = [], therapyType?: Prescription['therapyType']) => {
        const normalizedSchedules = scheduleTimes
            .map((time) => therapyType === 'oral' && !isClockSchedule(time)
                ? mapOralScheduleToBillingTime(time)
                : normalizeScheduleTime(time))
            .filter(Boolean);

        return normalizedSchedules
            .filter((time) => selectedTimeSet.has(time))
            .sort((left, right) => (scheduleOrder.get(left) ?? 999) - (scheduleOrder.get(right) ?? 999));
    };

    const findSupplyByCategory = (...categories: Array<Supply['category']>) =>
        supplies.find((s) => categories.includes(s.category) && s.isActive && s.isBillable !== false);
    const findSetByName = (matcher: (name: string) => boolean) =>
        supplies.find((s) => s.isActive && s.isBillable !== false && s.type === 'set' && matcher(normalizeLookupText(s.name)));
    const createAutomaticSupply = (
        code: string,
        name: string,
        type: Supply['type'],
        category: Supply['category'],
    ): Supply => ({
        code,
        name,
        type,
        category,
        billingUnit: 'unit',
        unitPrice: 0,
        isBillable: true,
        isActive: true,
        createdAt: '',
        updatedAt: '',
    });
    const getPumpSupply = (systemType?: string) => {
        const preferredCategory = systemType === 'closed' ? 'closed-pump-set' : systemType === 'open' ? 'open-pump-set' : 'pump-set';
        return findSupplyByCategory(preferredCategory as Supply['category'])
            || (systemType === 'closed'
                ? findSetByName((name) => name.includes('bomba') && (/\bsf\b/.test(name) || name.includes('sistema fechado')))
                : undefined)
            || (systemType === 'open'
                ? findSetByName((name) => name.includes('bomba') && (/\bsab\b/.test(name) || name.includes('sistema aberto')))
                : undefined)
            || findSupplyByCategory('pump-set')
            || findSetByName((name) => name.includes('bomba'))
            || supplies.find((s) => s.isActive && s.isBillable !== false && s.type === 'set')
            || createAutomaticSupply(
                systemType === 'closed' ? 'AUTO-EQUIPO-BOMBA-SF' : 'AUTO-EQUIPO-BOMBA-SA',
                `Equipo para bomba - sistema ${systemType === 'closed' ? 'fechado' : 'aberto'}`,
                'set',
                'pump-set',
            );
    };
    const getGravitySupply = () =>
        findSupplyByCategory('gravity-set')
        || supplies.find((s) => s.isActive && s.isBillable !== false && s.type === 'set' && s.name.toLowerCase().includes('gravit'))
        || supplies.find((s) => s.isActive && s.isBillable !== false && s.type === 'set')
        || createAutomaticSupply('AUTO-EQUIPO-GRAVITACIONAL', 'Equipo gravitacional', 'set', 'gravity-set');
    const getBolusSupply = () =>
        findSupplyByCategory('bolus-set')
        || supplies.find((s) => s.isActive && s.isBillable !== false && s.type === 'set' && s.name.toLowerCase().includes('bolus'))
        || createAutomaticSupply('AUTO-EQUIPO-BOLUS', 'Equipo para bolus', 'set', 'bolus-set');
    const getBottleRangeLabel = (stageVolume: number) => {
        if (stageVolume <= 100) return '0-100 mL';
        if (stageVolume <= 300) return '101-300 mL';
        if (stageVolume <= 500) return '301-500 mL';
        return 'acima de 500 mL';
    };
    const getBottleSupplyForVolume = (stageVolume: number) => {
        const activeBottleSupplies = supplies
            .filter((s) =>
                s.type === 'bottle'
                && s.isActive
                && s.isBillable !== false
                && s.category !== 'hydration-water'
                && (s.category === 'feeding-bottle'
                    || s.category === 'baby-bottle'
                    || normalizeLookupText(s.name).includes('frasco')
                    || normalizeLookupText(s.name).includes('mamadeira'))
            )
            .sort((left, right) => Number(left.capacityMl || 0) - Number(right.capacityMl || 0));

        if (activeBottleSupplies.length === 0) {
            return createAutomaticSupply(
                `AUTO-FRASCO-${getBottleRangeLabel(stageVolume).replace(/\D/g, '') || '500'}`,
                'Frasco para dieta',
                'bottle',
                'feeding-bottle',
            );
        }

        const classifiedBottle = activeBottleSupplies.find((supply) => {
            const capacity = Number(supply.capacityMl || 0);
            if (stageVolume <= 100) return capacity > 0 && capacity <= 100;
            if (stageVolume <= 300) return capacity >= 101 && capacity <= 300;
            if (stageVolume <= 500) return capacity >= 301 && capacity <= 500;
            return false;
        });

        if (classifiedBottle) return classifiedBottle;

        return activeBottleSupplies.find((supply) => Number(supply.capacityMl || 0) >= stageVolume)
            || activeBottleSupplies[activeBottleSupplies.length - 1];
    };
    const getWaterSupply = () =>
        findSupplyByCategory('hydration-water')
        || supplies.find((s) => s.isActive && s.isBillable !== false && normalizeLookupText(s.name).includes('agua'));
    const addSupplyCharge = (supply: Supply | undefined, requestedAmount: number) => {
        if (!supply || !Number.isFinite(requestedAmount) || requestedAmount <= 0) return;

        const billingUnit = supply.billingUnit || 'unit';
        const capacityMl = Number(supply.capacityMl || 0);
        const billedByContainer = billingUnit === 'ml' && capacityMl > 0;
        const totalQuantity = billedByContainer
            ? Math.ceil(requestedAmount / capacityMl)
            : billingUnit === 'ml'
                ? requestedAmount
                : requestedAmount;

        addToConsolidated(
            supply.code,
            supply.name,
            totalQuantity,
            billedByContainer ? 'unit' : billingUnit,
            supply.unitPrice || 0,
            'supply',
        );
    };

    const addBottleCharge = (stageVolume: number, administrations: number) => {
        if (!includeAutomaticBottles) return;
        if (!Number.isFinite(stageVolume) || stageVolume <= 0) return;
        if (!Number.isFinite(administrations) || administrations <= 0) return;

        const bottleSupply = getBottleSupplyForVolume(stageVolume);
        if (!bottleSupply) return;
        const rangeLabel = getBottleRangeLabel(stageVolume);

        addToConsolidated(
            bottleSupply.code,
            `${bottleSupply.name} (${rangeLabel})`,
            administrations,
            bottleSupply.billingUnit === 'unit' ? 'unit' : bottleSupply.billingUnit || 'unit',
            bottleSupply.unitPrice || 0,
            'supply',
        );
    };

    const eligiblePrescriptions = prescriptions.filter(p => {
        const patient = patientsById.get(p.patientId);
        if (p.status !== 'active') return false;
        if (!isPatientActiveForOperations(patient, endDate)) return false;
        if (unitName !== 'all' && (patient?.ward || p.patientWard) !== unitName) return false;
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
        const resolvedSystemType = p.systemType || p.enteralDetails?.systemType;
        const resolvedInfusionMode = p.infusionMode
            || p.enteralDetails?.infusionMode
            || p.enteralDetails?.closedFormula?.infusionMode;
        const patient = patientsById.get(p.patientId);
        const patientInfo = {
            patientId: p.patientId,
            patientName: patient?.name || p.patientName || 'Paciente sem nome',
            patientRecord: patient?.record || p.patientRecord || '-',
            bed: patient?.bed || p.patientBed || '-',
            ward: patient?.ward || p.patientWard || '-',
            dob: patient?.dob,
            route: p.therapyType === 'oral'
                ? (p.oralDetails?.administrationRoute === 'translactation' ? 'Translactacao' : 'Oral')
                : p.therapyType === 'enteral'
                    ? (p.feedingRoute || p.enteralDetails?.access || p.therapyType)
                    : p.feedingRoute || p.therapyType,
        };

        let mainDailySetCount = 0;
        let hydrationDailySetCount = 0;
        let hasMappedDelivery = false;
        const isEnteralViaOral = p.therapyType === 'enteral' && (p.enteralDetails?.access === 'VO' || p.feedingRoute === 'VO');
        const formulaEntries = p.formulas.length > 0
            ? p.formulas
            : p.therapyType === 'oral'
                ? (p.oralDetails?.supplements || []).map((supplement) => ({
                    formulaId: supplement.supplementId,
                    formulaName: supplement.supplementName,
                    volume: Number(supplement.amount || 0),
                    timesPerDay: getOralScheduleNames(supplement.schedules).length,
                    schedules: getOralScheduleNames(supplement.schedules),
                }))
                : [];
        const moduleEntries = p.modules.length > 0
            ? p.modules
            : p.therapyType === 'oral'
                ? (p.oralDetails?.modules || []).map((moduleItem) => ({
                    moduleId: moduleItem.moduleId,
                    moduleName: moduleItem.moduleName,
                    amount: Number(moduleItem.amount || 0),
                    timesPerDay: getOralScheduleNames(moduleItem.schedules).length,
                    schedules: getOralScheduleNames(moduleItem.schedules),
                    unit: moduleItem.unit,
                }))
                : [];

        // --- Process Formulas ---
        formulaEntries.forEach((f, formulaIndex) => {
            const formulaObj = formulas.find(item => item.id === f.formulaId);
            const matchingTimes = getMatchingSchedules(f.schedules || [], p.therapyType);
            if (matchingTimes.length > 0 && f.volume > 0) {
                hasMappedDelivery = true;
                const openFormulaEntry = p.enteralDetails?.openFormulas?.[formulaIndex]
                    || p.enteralDetails?.openFormulas?.find((entry) => entry.formulaId === f.formulaId);
                const diluteTo = Number(openFormulaEntry?.diluteTo || 0);
                const formulaLookupText = normalizeLookupText(`${formulaObj?.name || ''} ${f.formulaName || ''}`);
                const isPowderFormula = formulaObj?.presentationForm === 'po'
                    || formulaLookupText.includes(' po')
                    || formulaLookupText.includes(' em po')
                    || formulaLookupText.includes('po ')
                    || formulaLookupText.includes('po-');
                const finalStageVolume = resolvedSystemType === 'open' && diluteTo > 0
                    ? diluteTo
                    : isPowderFormula
                        ? undefined
                        : f.volume;
                const dilutionWater = !isPowderFormula && resolvedSystemType === 'open' && diluteTo > f.volume ? diluteTo - f.volume : 0;
                const formulaUnit = isPowderFormula ? 'g' : 'ml';
                const productionNotes = p.enteralDetails?.productionNotes?.trim();
                const observation = productionNotes || (dilutionWater > 0 ? `Agua de diluicao: ${Math.round(dilutionWater)} ml` : '');

                dietMap.push({
                    ...patientInfo,
                    type: 'formula',
                    productName: f.formulaName,
                    volumeOrAmount: f.volume,
                    unit: formulaUnit,
                    stageVolume: finalStageVolume,
                    stageVolumeUnit: finalStageVolume ? 'ml' : undefined,
                    rate: isEnteralViaOral ? undefined : getPrescriptionRateLabel({ ...p, infusionMode: resolvedInfusionMode, systemType: resolvedSystemType }, finalStageVolume),
                    times: matchingTimes.map(formatDietMapTimeLabel),
                    productCode: formulaObj?.code || f.formulaId,
                    observation,
                });

                if (p.therapyType === 'oral') {
                    const oralFormulaRow = dietMap[dietMap.length - 1];
                    oralFormulaRow.unitPrice = 0;
                    oralFormulaRow.subtotal = 0;
                    return;
                }

                const administrationsForVolume = resolvedSystemType === 'closed' ? 1 : matchingTimes.length;
                const totalVol = f.volume * administrationsForVolume * dayDiff;
                const price = getFormulaPrice(f.formulaId);
                const equipmentVolumePerAdministration = resolvedSystemType === 'open' && p.therapyType === 'enteral'
                    ? (p.equipmentVolume || 0)
                    : 0;
                let rowUnitPrice = price;
                let rowSubtotal = 0;

                // Formulas often billed by mL or Unit (bag).
                const billingUnit = isPowderFormula ? 'g' : formulaObj?.billingUnit || 'ml';
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

                if (resolvedSystemType === 'closed') {
                    const bagSize = formulaObj?.presentations?.[0] || 1000;
                    const bagQuantities = p.enteralDetails?.closedFormula?.bagQuantities || {};
                    const hasExplicitBagQuantities = Boolean(p.enteralDetails?.closedFormula?.bagQuantitiesProvided)
                        || Object.keys(bagQuantities).length > 0;
                    const bagQtyFromPrescription = Object.values(bagQuantities).reduce((sum: number, qty: unknown) => sum + (Number(qty) || 0), 0);
                    const selectedExplicitBags = Object.entries(bagQuantities)
                        .filter(([time]) => selectedTimeSet.has(normalizeScheduleTime(time)))
                        .reduce((sum: number, [, qty]) => sum + (Number(qty) || 0), 0);
                    const hasSingleClosedFormula = formulaEntries.length <= 1;
                    const dailyVolume = f.volume;
                    const dailyBags = hasExplicitBagQuantities && hasSingleClosedFormula
                        ? bagQtyFromPrescription
                        : Math.ceil(dailyVolume / bagSize);
                    const selectedDailyBags = hasExplicitBagQuantities && hasSingleClosedFormula
                        ? selectedExplicitBags
                        : matchingTimes.length;
                    const totalBags = dailyBags * dayDiff;
                    const closedBillableQuantity = billingUnit === 'ml'
                        ? totalBags * bagSize
                        : totalBags;
                    const closedBillingUnit = billingUnit === 'ml' ? 'ml' : billingUnit;
                    rowUnitPrice = price;
                    rowSubtotal = closedBillableQuantity * price;

                    addToConsolidated(formulaObj?.code || f.formulaId, f.formulaName, closedBillableQuantity, closedBillingUnit, price, 'formula');
                    if (hasExplicitBagQuantities && !hasSingleClosedFormula) {
                        mainDailySetCount = Math.max(mainDailySetCount, selectedExplicitBags);
                    } else {
                        mainDailySetCount += selectedDailyBags;
                    }
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
                if (resolvedSystemType === 'open') {
                    if (!isEnteralViaOral) {
                        addBottleCharge(finalStageVolume, matchingTimes.length * dayDiff);
                        mainDailySetCount = 1;
                    }
                }
            }
        });

        // --- Process Modules ---
        moduleEntries.forEach(m => {
            const moduleObj = modules.find(item => item.id === m.moduleId);
            const moduleDescription = moduleObj?.description || m.moduleName;
            const matchingTimes = getMatchingSchedules(m.schedules || [], p.therapyType);
            if (matchingTimes.length > 0 && m.amount > 0) {
                hasMappedDelivery = true;
                dietMap.push({
                    ...patientInfo,
                    type: 'module',
                    productName: moduleDescription,
                    volumeOrAmount: m.amount,
                    unit: m.unit || 'g',
                    times: matchingTimes.map(formatDietMapTimeLabel),
                    productCode: moduleObj?.code || m.moduleId,
                    observation: p.enteralDetails?.productionNotes?.trim() || ''
                });

                const totalAmount = m.amount * matchingTimes.length * dayDiff;
                const price = getModulePrice(m.moduleId);
                addToConsolidated(moduleObj?.code || m.moduleId, moduleDescription, totalAmount, m.unit || 'g', price, 'module');

                const moduleRow = dietMap[dietMap.length - 1];
                if (moduleRow?.productCode === (moduleObj?.code || m.moduleId) && moduleRow.productName === moduleDescription) {
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
                    productName: thickenerModule?.description || p.oralDetails.thickenerProduct || thickenerSource?.name || 'Espessante',
                    volumeOrAmount: thickenerGrams || thickenerVolume,
                    unit: thickenerGrams > 0 ? 'g' : (thickenerSource?.billingUnit || 'ml'),
                    stageVolume: thickenerVolume || undefined,
                    stageVolumeUnit: thickenerVolume > 0 ? 'ml' : undefined,
                    times: thickenerTimes.map(formatDietMapTimeLabel),
                    productCode: thickenerSource?.code || thickenerSource?.id,
                    observation: p.oralDetails?.observations || 'Água espessada',
                });

                const dailyGrams = thickenerGrams * thickenerTimes.length;
                const dailyVolume = thickenerVolume * thickenerTimes.length;
                const billableUnit = thickenerSource?.billingUnit || (thickenerGrams > 0 ? 'g' : 'ml');
                const conversionFactor = thickenerModule?.referenceAmount
                    || legacyThickenerFormula?.conversionFactor
                    || legacyThickenerFormula?.presentations?.[0]
                    || 0;

                let totalQuantity = billableUnit === 'ml' ? dailyVolume * dayDiff : dailyGrams * dayDiff;
                const unitPrice = thickenerSource?.billingPrice || 0;

                if (billableUnit === 'unit' && conversionFactor > 0) {
                    totalQuantity = Math.ceil((dailyGrams * dayDiff) / conversionFactor);
                }

                const rowSubtotal = totalQuantity * unitPrice;

                addToConsolidated(
                    thickenerSource?.code || thickenerSource?.id || 'THICKENER',
                    thickenerModule?.description || p.oralDetails.thickenerProduct || thickenerSource?.name || 'Espessante',
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
                const waterSupply = getWaterSupply();
                hasMappedDelivery = true;
                dietMap.push({
                    ...patientInfo,
                    type: 'water',
                    productName: waterSupply?.name || (p.therapyType === 'oral' ? 'Agua para hidratacao' : 'Agua para diluicao/hidratacao'),
                    volumeOrAmount: p.hydrationVolume,
                    unit: 'ml',
                    stageVolume: p.hydrationVolume,
                    stageVolumeUnit: 'ml',
                    rate: isEnteralViaOral ? undefined : resolvedInfusionMode === 'bolus' ? 'Bolus' : undefined,
                    times: matchingTimes.map(formatDietMapTimeLabel),
                    productCode: waterSupply?.code || 'WATER-001',
                    observation: p.enteralDetails?.productionNotes?.trim() || ''
                });
                const totalVol = p.hydrationVolume * matchingTimes.length * dayDiff;
                addSupplyCharge(waterSupply, totalVol);
                // Exclude water from consolidated billing as requested
                // addToConsolidated('WATER-001', 'ÁGUA FILTRADA', totalVol, 'ml', 0, 'diet');

                if (!isEnteralViaOral) {
                    addBottleCharge(p.hydrationVolume, matchingTimes.length * dayDiff);
                    hydrationDailySetCount = 1;
                }
            }
        }

        // --- Supplies Heuristics (Consolidated Only) ---
        if (selectedTimes.length > 0 && hasMappedDelivery) { // Only charge if this prescription generated map lines for selected times.
            if (includeAutomaticSets && !isEnteralViaOral && mainDailySetCount > 0) {
                if (resolvedInfusionMode === 'pump') {
                    addSupplyCharge(getPumpSupply(resolvedSystemType), mainDailySetCount * dayDiff);
                } else if (resolvedInfusionMode === 'gravity') {
                    addSupplyCharge(getGravitySupply(), mainDailySetCount * dayDiff);
                } else if (resolvedInfusionMode === 'bolus') {
                    addSupplyCharge(getBolusSupply(), mainDailySetCount * dayDiff);
                }
            }

            if (includeAutomaticSets && !isEnteralViaOral && hydrationDailySetCount > 0) {
                addSupplyCharge(getGravitySupply(), hydrationDailySetCount * dayDiff);
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
        selectedTimes: orderedSelectedTimes.map(formatOperationalHeaderTimeLabel),
        dietMap,
        consolidated,
        signatures
    };
};
