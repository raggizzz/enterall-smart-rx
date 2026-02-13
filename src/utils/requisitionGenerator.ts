import { Prescription, Formula, Module, Supply } from '@/lib/database';
import { RequisitionData, DietMapItem, ConsolidatedItem } from '@/types/requisition';

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
    formulas: Formula[];
    modules: Module[];
    supplies: Supply[];
    unitName: string;
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
    formulas,
    modules,
    supplies,
    unitName,
    startDate,
    endDate,
    selectedTimes,
    signatures
}: GenerateOptions): RequisitionData => {
    const dietMap: DietMapItem[] = [];
    const consolidatedMap = new Map<string, ConsolidatedItem>();

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

    // Helper: Find supply (naive search by type/name)
    const findSupply = (type: string, capacity?: number) => {
        // This logic is heuristic as we don't have explicit supply linking in prescription
        // returning the first active supply of that type
        return supplies.find(s => s.type === type && s.isActive);
    };

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
        const patientInfo = {
            patientId: p.patientId,
            patientName: p.patientName,
            bed: p.patientBed || '-',
            ward: p.patientWard || '-',
            dob: undefined, // Requires patient lookup if needed
            route: p.feedingRoute || p.therapyType,
        };

        let dailySets = 0;
        let dailyBottles = 0;

        // --- Process Formulas ---
        p.formulas.forEach(f => {
            const matchingTimes = f.schedules.filter(t => selectedTimes.includes(t));
            if (matchingTimes.length > 0) {
                dietMap.push({
                    ...patientInfo,
                    type: 'formula',
                    productName: f.formulaName,
                    volumeOrAmount: f.volume,
                    unit: 'ml',
                    rate: p.infusionRateMlH ? `${p.infusionRateMlH} ml/h` : undefined,
                    times: matchingTimes,
                    productCode: f.formulaId
                });

                const totalVol = f.volume * matchingTimes.length * dayDiff;
                const price = getFormulaPrice(f.formulaId);

                // Formulas often billed by mL or Unit (bag).
                const formulaObj = formulas.find(item => item.id === f.formulaId);
                const billingUnit = formulaObj?.billingUnit || 'ml';

                if (billingUnit === 'ml' && formulaObj?.presentations && formulaObj.presentations.length > 0) {
                    // Calculate Bags
                    // User Rule: "quantidade de bolsas deve ser calculada utilizando arredondamento para cima"
                    // Use the first presentation as the standard bag size (e.g., 500, 1000)
                    const bagSize = formulaObj.presentations[0];
                    const dailyVolume = f.volume * matchingTimes.length;
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
                    const dailyVolume = f.volume * matchingTimes.length;
                    const dailyBags = Math.ceil(dailyVolume / bagSize);
                    const totalBags = dailyBags * dayDiff;

                    addToConsolidated(f.formulaId, f.formulaName, totalBags, 'bolsa', price, 'formula');
                } else {
                    // Fallback: Bill by total volume (ml) or original unit
                    addToConsolidated(f.formulaId, f.formulaName, totalVol, billingUnit, price, 'formula');
                }

                // Heuristic for Bottles: If Open System, 1 bottle per administration?
                if (p.systemType === 'open') {
                    dailyBottles += matchingTimes.length;
                }
            }
        });

        // --- Process Modules ---
        p.modules.forEach(m => {
            const matchingTimes = (m.schedules || []).filter(t => selectedTimes.includes(t));
            if (matchingTimes.length > 0) {
                dietMap.push({
                    ...patientInfo,
                    type: 'module',
                    productName: m.moduleName,
                    volumeOrAmount: m.amount,
                    unit: m.unit || 'g',
                    times: matchingTimes,
                    productCode: m.moduleId
                });

                const totalAmount = m.amount * matchingTimes.length * dayDiff;
                const price = getModulePrice(m.moduleId);
                addToConsolidated(m.moduleId, m.moduleName, totalAmount, m.unit || 'g', price, 'module');
            }
        });

        // --- Process Hydration ---
        if (p.hydrationVolume && p.hydrationSchedules) {
            const matchingTimes = p.hydrationSchedules.filter(t => selectedTimes.includes(t));
            if (matchingTimes.length > 0) {
                dietMap.push({
                    ...patientInfo,
                    type: 'water',
                    productName: 'ÁGUA FILTRADA',
                    volumeOrAmount: p.hydrationVolume,
                    unit: 'ml',
                    times: matchingTimes,
                    productCode: 'WATER-001'
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
                const bottleSupply = supplies.find(s => s.type === 'bottle');
                if (bottleSupply) {
                    addToConsolidated(bottleSupply.code, bottleSupply.name, dailyBottles * dayDiff, 'un', bottleSupply.unitPrice, 'supply');
                }
            }
        }

    });

    // Sorting (same as before)
    dietMap.sort((a, b) => {
        if (a.ward !== b.ward) return a.ward.localeCompare(b.ward);
        if (a.bed !== b.bed) return a.bed.localeCompare(b.bed);
        return a.patientName.localeCompare(b.patientName);
    });

    const typeOrder = { formula: 1, water: 2, module: 3, supplement: 4 };
    dietMap.sort((a, b) => {
        if (a.patientId !== b.patientId) return 0;
        // @ts-ignore
        return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
    });

    const consolidated = Array.from(consolidatedMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    return {
        unitName: unitName === 'all' ? 'Todas as Unidades' : unitName,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        printDate: formatDateTime(new Date()),
        selectedTimes: selectedTimes.sort(),
        dietMap,
        consolidated,
        signatures
    };
};
