import { Prescription, Formula, Module, Supply, Patient } from '@/lib/database';
import { RequisitionData, DietMapItem, ConsolidatedItem } from '@/types/requisition';
import { getPrescriptionRateLabel } from '@/lib/prescriptionInfusion';

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
    const dietMap: DietMapItem[] = [];
    const consolidatedMap = new Map<string, ConsolidatedItem>();
    const patientsById = new Map(patients.map((patient) => [patient.id, patient]));
    const selectedTimeSet = new Set(selectedTimes.map((time) => normalizeScheduleTime(time)).filter(Boolean));

    // Helper to add to consolidated list
    const addToConsolidated = (
        code: string,
        name: string,
        amount: number,
        unit: string,
        price: number = 0,
        type: ConsolidatedItem['type']
    ) => {
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

    const findSupplyByCategory = (category: Supply['category']) =>
        supplies.find((s) => s.category === category && s.isActive && s.isBillable !== false);

    const activePrescriptions = prescriptions.filter(p => {
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

    // Duration in days
    const dayDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

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
                ? (p.oralDetails?.administrationRoute === 'translactation' ? 'Translactacao' : 'Oral')
                : p.feedingRoute || p.therapyType,
        };

        let dailySets = 0;
        let dailyBottles = 0;

        // --- Process Formulas ---
        p.formulas.forEach(f => {
            const matchingTimes = (f.schedules || [])
                .map((time) => normalizeScheduleTime(time))
                .filter((time) => selectedTimeSet.has(time));
            if (matchingTimes.length > 0) {
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
                    productCode: f.formulaId,
                    observation: p.systemType === 'closed'
                        ? 'Sistema fechado'
                        : p.infusionMode === 'bolus'
                            ? 'Sistema aberto - bolus'
                            : 'Sistema aberto'
                });

                const totalVol = f.volume * matchingTimes.length * dayDiff;
                const price = getFormulaPrice(f.formulaId);
                const equipmentVolumePerAdministration = p.systemType === 'open' && p.therapyType === 'enteral'
                    ? (p.equipmentVolume || 0)
                    : 0;

                // Formulas often billed by mL or Unit (bag).
                const formulaObj = formulas.find(item => item.id === f.formulaId);
                const billingUnit = formulaObj?.billingUnit || 'ml';
                const openFormulaEntry = p.enteralDetails?.openFormulas?.find((entry) => entry.formulaId === f.formulaId);
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

                if (billingUnit === 'ml' && formulaObj?.presentations && formulaObj.presentations.length > 0) {
                    // Calculate Bags
                    // User Rule: "quantidade de bolsas deve ser calculada utilizando arredondamento para cima"
                    // Use the first presentation as the standard bag size (e.g., 500, 1000)
                    const bagSize = formulaObj.presentations[0];
                    const dailyVolume = (f.volume * matchingTimes.length) + extraVolumePerDay;
                    const dailyBags = Math.ceil(dailyVolume / bagSize);
                    const totalBags = dailyBags * dayDiff;

                    // If price is per ml, we need to convert or assume price is per bag? 
                    // Usually if unit is ML, price is per ML. 
                    // But user wants to bill by BAGS.
                    // If we bill by bags, we should probably display Bags count, and price per BAG.
                    // Price per bag = Price/ml * bagSize
                    const pricePerBag = price * bagSize;

                    addToConsolidated(f.formulaId, f.formulaName, totalBags, 'bolsa', pricePerBag, 'formula');
                } else if (billingUnit === 'unit') {
                    // Already billed by unit (bag)
                    // Check if we need to calculate bags based on volume or just use quantity (if quantity existed)
                    // But formula prescription uses VOLUME (ml).
                    // So we must convert Volume -> Bags
                    const bagSize = formulaObj?.presentations?.[0] || 1000;
                    const dailyVolume = (f.volume * matchingTimes.length) + extraVolumePerDay;
                    const dailyBags = Math.ceil(dailyVolume / bagSize);
                    const totalBags = dailyBags * dayDiff;

                    addToConsolidated(f.formulaId, f.formulaName, totalBags, 'bolsa', price, 'formula');
                } else {
                    // Fallback: Bill by total volume (ml) or original unit
                    addToConsolidated(f.formulaId, f.formulaName, totalBillableAmount, billingUnit, price, 'formula');
                }

                // Heuristic for Bottles: If Open System, 1 bottle per administration?
                if (p.systemType === 'open') {
                    dailyBottles += matchingTimes.length;
                }
            }
        });

        // --- Process Modules ---
        p.modules.forEach(m => {
            const matchingTimes = (m.schedules || [])
                .map((time) => normalizeScheduleTime(time))
                .filter((time) => selectedTimeSet.has(time));
            if (matchingTimes.length > 0) {
                dietMap.push({
                    ...patientInfo,
                    type: 'module',
                    productName: m.moduleName,
                    volumeOrAmount: m.amount,
                    unit: m.unit || 'g',
                    times: matchingTimes,
                    productCode: m.moduleId,
                    observation: 'Modulo prescrito'
                });

                const totalAmount = m.amount * matchingTimes.length * dayDiff;
                const price = getModulePrice(m.moduleId);
                addToConsolidated(m.moduleId, m.moduleName, totalAmount, m.unit || 'g', price, 'module');
            }
        });

        if (p.therapyType === 'oral' && p.oralDetails?.needsThickener) {
            const thickenerTimes = (p.oralDetails.thickenerTimes || [])
                .map((time) => normalizeScheduleTime(time))
                .filter((time) => selectedTimeSet.has(time));
            const thickenerGrams = Number(p.oralDetails.thickenerGrams || 0);
            const thickenerVolume = Number(p.oralDetails.thickenerVolume || 0);
            const thickenerFormula = getFormulaByIdOrName(
                p.oralDetails.thickenerFormulaId,
                p.oralDetails.thickenerProduct,
            );

            if (thickenerTimes.length > 0) {
                dietMap.push({
                    ...patientInfo,
                    type: 'supplement',
                    productName: p.oralDetails.thickenerProduct || thickenerFormula?.name || 'Espessante',
                    volumeOrAmount: thickenerGrams || thickenerVolume,
                    unit: thickenerGrams > 0 ? 'g' : (thickenerFormula?.billingUnit || 'ml'),
                    stageVolume: thickenerVolume || undefined,
                    stageVolumeUnit: thickenerVolume > 0 ? 'ml' : undefined,
                    times: thickenerTimes,
                    productCode: thickenerFormula?.id,
                    observation: 'Agua espessada',
                });

                const dailyGrams = thickenerGrams * thickenerTimes.length;
                const dailyVolume = thickenerVolume * thickenerTimes.length;
                const billableUnit = thickenerFormula?.billingUnit || (thickenerGrams > 0 ? 'g' : 'ml');
                const conversionFactor = thickenerFormula?.conversionFactor || thickenerFormula?.presentations?.[0] || 0;

                let totalQuantity = billableUnit === 'ml' ? dailyVolume * dayDiff : dailyGrams * dayDiff;
                let unitPrice = thickenerFormula?.billingPrice || 0;

                if (billableUnit === 'unit' && conversionFactor > 0) {
                    totalQuantity = Math.ceil((dailyGrams * dayDiff) / conversionFactor);
                }

                addToConsolidated(
                    thickenerFormula?.id || 'THICKENER',
                    p.oralDetails.thickenerProduct || thickenerFormula?.name || 'Espessante',
                    totalQuantity,
                    billableUnit,
                    unitPrice,
                    'formula',
                );
            }
        }

        // --- Process Hydration ---
        if (p.hydrationVolume && p.hydrationSchedules) {
            const matchingTimes = p.hydrationSchedules
                .map((time) => normalizeScheduleTime(time))
                .filter((time) => selectedTimeSet.has(time));
            if (matchingTimes.length > 0) {
                dietMap.push({
                    ...patientInfo,
                    type: 'water',
                    productName: p.therapyType === 'oral' ? 'Agua para hidratacao' : 'Agua para diluicao/hidratacao',
                    volumeOrAmount: p.hydrationVolume,
                    unit: 'ml',
                    stageVolume: p.hydrationVolume,
                    stageVolumeUnit: 'ml',
                    rate: p.infusionMode === 'bolus' ? 'Bolus' : undefined,
                    times: matchingTimes,
                    productCode: 'WATER-001',
                    observation: 'Linha separada de hidratacao'
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
        if (selectedTimes.length > 0) { // Only charge if we are serving diets
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

    const typeOrder = { formula: 1, water: 2, module: 3, supplement: 4 };
    dietMap.sort((a, b) => {
        if (a.ward !== b.ward) return a.ward.localeCompare(b.ward);
        if (a.bed !== b.bed) return a.bed.localeCompare(b.bed);
        if (a.patientName !== b.patientName) return a.patientName.localeCompare(b.patientName);
        const leftTime = a.times[0] || '';
        const rightTime = b.times[0] || '';
        if (leftTime !== rightTime) return leftTime.localeCompare(rightTime);
        // @ts-ignore
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
        selectedTimes: Array.from(selectedTimeSet).sort(),
        dietMap,
        consolidated,
        signatures
    };
};
