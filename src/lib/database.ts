/**
 * EnterAll Smart RX - API-backed data services
 * Main persistence flows use the local backend API with Prisma/PostgreSQL.
 * Browser storage is still used in a few places as session/cache support.
 */

import { apiClient } from './api';
import {
    cacheSnapshot,
    createTemporaryId,
    executeOrQueueMutation,
    getMergedRecords,
    readLocalRecord,
    type OfflineEntityType,
} from './offlineStore';

const appendHospitalIdQuery = (path: string, hospitalId?: string) => {
    if (!hospitalId) return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}hospitalId=${encodeURIComponent(hospitalId)}`;
};

// ============================================
// INTERFACES - Tipos de dados
// ============================================

// Motivos de Interrupção da TNE
export interface TNEInterruptions {
    procedures?: {
        airways?: boolean;
        therapeutic?: boolean;
        diagnostic?: boolean;
        nursing?: boolean;
    };
    gastrointestinal?: {
        residualVolume?: boolean;
        abdominalDistension?: boolean;
        diarrhea?: boolean;
        abdominalPain?: boolean;
        nausea?: boolean;
        vomiting?: boolean;
        aspiration?: boolean;
        giBleed?: boolean;
        ileus?: boolean;
    };
    hemodynamicInstability?: boolean;
    deviceProblems?: {
        obstruction?: boolean;
        displacement?: boolean;
        unplannedRemoval?: boolean;
    };
    other?: string;
}

export interface UnintentionalCalories {
    propofolMlH?: number;
    glucoseGDay?: number;
    citrateGDay?: number;
}

export interface TNEGoals {
    targetKcalPerKg?: number;
    targetProteinPerKgActual?: number;
    targetProteinPerKgIdeal?: number;
}

export interface Patient {
    id?: string;
    version?: number;
    syncStatus?: 'synced' | 'pending' | 'failed';
    name: string;
    record: string;
    dob: string;
    gender?: 'male' | 'female';
    weight?: number;
    height?: number;
    idealWeight?: number;
    bed?: string;
    ward?: string;
    hospitalId?: string;
    observation?: string;
    monitoringNotes?: string;
    admissionDate?: string;
    status: 'active' | 'inactive' | 'discharged' | 'deceased';
    dischargeDate?: string;
    dischargeReason?: string;
    nutritionType: 'enteral' | 'parenteral' | 'oral' | 'jejum';
    tneGoals?: TNEGoals;
    infusionPercentage24h?: number;
    tneInterruptions?: TNEInterruptions;
    unintentionalCalories?: UnintentionalCalories;
    consistency?: string;
    safeConsistency?: string;
    mealCount?: string | number;
    createdAt: string;
    updatedAt: string;
}

export interface Formula {
    id?: string;
    hospitalId?: string;
    version?: number;
    syncStatus?: 'synced' | 'pending' | 'failed';
    code: string;
    name: string;
    manufacturer: string;
    type: 'standard' | 'high-protein' | 'high-calorie' | 'diabetic' | 'renal' | 'peptide' | 'fiber' | 'immune' | 'oral-supplement' | 'infant-formula';
    classification?: string;
    macronutrientComplexity?: 'polymeric' | 'oligomeric';
    ageGroup?: 'adult' | 'pediatric' | 'infant';
    systemType: 'open' | 'closed' | 'both';
    formulaTypes?: string[];
    administrationRoutes?: Array<'enteral' | 'oral' | 'translactation'>;
    presentationForm?: 'liquido' | 'po';
    presentations: number[];
    presentationDescription?: string;
    description?: string;
    billingUnit?: 'ml' | 'g' | 'unit';
    conversionFactor?: number;
    billingPrice?: number;
    caloriesPerUnit: number;
    density?: number;
    proteinPerUnit: number;
    proteinPct?: number;
    carbPerUnit?: number;
    carbPct?: number;
    fatPerUnit?: number;
    fatPct?: number;
    fiberPerUnit?: number;
    fiberType?: string;
    sodiumPerUnit?: number;
    potassiumPerUnit?: number;
    calciumPerUnit?: number;
    phosphorusPerUnit?: number;
    waterContent?: number;
    osmolality?: number;
    proteinSources?: string;
    carbSources?: string;
    fatSources?: string;
    fiberSources?: string;
    specialCharacteristics?: string;
    plasticG?: number;
    paperG?: number;
    metalG?: number;
    glassG?: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Module {
    id?: string;
    hospitalId?: string;
    version?: number;
    syncStatus?: 'synced' | 'pending' | 'failed';
    name: string;
    description?: string;
    density: number;
    referenceAmount: number;
    referenceTimesPerDay: number;
    calories: number;
    protein: number;
    carbs?: number;
    fat?: number;
    sodium: number;
    potassium: number;
    calcium?: number;
    phosphorus?: number;
    fiber: number;
    freeWater: number;
    billingUnit?: 'g' | 'ml' | 'unit';
    billingPrice?: number;
    proteinSources?: string;
    carbSources?: string;
    fatSources?: string;
    fiberSources?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Supply {
    id?: string;
    hospitalId?: string;
    version?: number;
    syncStatus?: 'synced' | 'pending' | 'failed';
    code: string;
    name: string;
    type: 'bottle' | 'set' | 'other';
    category?: 'standard' | 'thickener' | 'cup' | 'baby-bottle' | 'feeding-bottle' | 'other';
    description?: string;
    billingUnit?: 'unit' | 'pack' | 'box' | 'other';
    capacityMl?: number;
    unitPrice: number;
    isBillable?: boolean;
    plasticG?: number;
    paperG?: number;
    metalG?: number;
    glassG?: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Professional {
    id?: string;
    hospitalId?: string;
    version?: number;
    syncStatus?: 'synced' | 'pending' | 'failed';
    name: string;
    role: 'manager' | 'general_manager' | 'local_manager' | 'nutritionist' | 'technician';
    registrationNumber: string;
    cpf?: string;
    crn?: string;
    cpe?: string;
    managingUnit?: string;
    passwordPin?: string;
    passwordConfigured?: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PrescriptionFormula {
    formulaId: string;
    formulaName: string;
    volume: number;
    timesPerDay: number;
    schedules: string[];
}

export interface PrescriptionModule {
    moduleId: string;
    moduleName: string;
    amount: number;
    timesPerDay: number;
    schedules?: string[];
    unit?: 'ml' | 'g';
}

export interface PrescriptionStatusEvent {
    id?: string;
    fromStatus?: string;
    toStatus: string;
    reason?: string;
    changedBy?: string;
    effectiveDate?: string;
    createdAt?: string;
}

export interface Prescription {
    id?: string;
    hospitalId?: string;
    version?: number;
    syncStatus?: 'synced' | 'pending' | 'failed';
    patientId: string;
    patientName: string;
    patientRecord: string;
    patientBed?: string;
    patientWard?: string;
    professionalId?: string;
    professionalName?: string;
    therapyType: 'oral' | 'enteral' | 'parenteral';
    systemType: 'open' | 'closed';
    feedingRoute?: string;
    infusionMode?: 'pump' | 'gravity' | 'bolus';
    infusionRateMlH?: number;
    infusionDropsMin?: number;
    infusionHoursPerDay?: number;
    equipmentVolume?: number;
    formulas: PrescriptionFormula[];
    modules: PrescriptionModule[];
    hydrationVolume?: number;
    hydrationSchedules?: string[];
    totalCalories?: number;
    totalProtein?: number;
    totalCarbs?: number;
    totalFat?: number;
    totalFiber?: number;
    totalVolume?: number;
    totalFreeWater?: number;
    nursingTimeMinutes?: number;
    nursingCostTotal?: number;
    materialCostTotal?: number;
    totalCost?: number;
    enteralDetails?: {
        access?: string;
        systemType?: 'open' | 'closed';
        infusionMode?: 'pump' | 'gravity' | 'bolus';
        equipmentVolume?: number | string;
        openDurationPerStep?: string;
        closedFormula?: {
            formulaId?: string;
            infusionMode?: 'pump' | 'gravity' | '';
            rate?: string;
            duration?: string;
            bagQuantities?: Record<string, number>;
        };
        openFormulas?: Array<{
            formulaId?: string;
            volume?: string;
            diluteTo?: string;
            times?: string[];
        }>;
        modules?: Array<{
            moduleId?: string;
            quantity?: string;
            unit?: 'ml' | 'g';
            times?: string[];
        }>;
        hydration?: {
            volume?: string;
            times?: string[];
        };
    };
    oralDetails?: {
        administrationRoute?: 'oral' | 'translactation';
        deliveryMethod?: 'cup' | 'baby-bottle' | 'feeding-bottle';
        dietConsistency?: string;
        dietCharacteristics?: string;
        mealsPerDay?: number;
        speechTherapy?: boolean;
        needsThickener?: boolean;
        safeConsistency?: string;
        thickenerProduct?: string;
        thickenerVolume?: number;
        thickenerTimes?: string[];
        estimatedVET?: number;
        estimatedProtein?: number;
        hasOralTherapy?: boolean;
        supplements?: OralSupplementSchedule[];
        modules?: OralModuleSchedule[];
        observations?: string;
    };
    parenteralDetails?: {
        access?: 'central' | 'peripheral' | 'picc';
        infusionTime?: number;
        aminoacidsG?: number;
        lipidsG?: number;
        glucoseG?: number;
        vetKcal?: number;
        tigMgKgMin?: number;
        observations?: string;
    };
    payloadSnapshot?: Record<string, unknown>;
    status: 'active' | 'suspended' | 'completed';
    statusReason?: string;
    statusChangedAt?: string;
    statusChangedBy?: string;
    statusEvents?: PrescriptionStatusEvent[];
    startDate: string;
    endDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface DailyEvolution {
    id?: string;
    hospitalId?: string;
    version?: number;
    syncStatus?: 'synced' | 'pending' | 'failed';
    patientId: string;
    prescriptionId?: string;
    professionalId?: string;
    date: string;
    volumeInfused: number;
    metaReached: number;
    oralKcal?: number;
    oralProtein?: number;
    enteralKcal?: number;
    enteralProtein?: number;
    parenteralKcal?: number;
    parenteralProtein?: number;
    nonIntentionalKcal?: number;
    intercurrences?: string[];
    notes?: string;
    createdAt: string;
}

export interface OralSupplementSchedule {
    supplementId: string;
    supplementName: string;
    amount?: number;
    unit?: 'ml' | 'g';
    schedules: {
        breakfast?: boolean;
        midMorning?: boolean;
        lunch?: boolean;
        afternoon?: boolean;
        dinner?: boolean;
        supper?: boolean;
        other?: string;
    };
}

export interface OralModuleSchedule {
    moduleId: string;
    moduleName: string;
    amount?: number;
    unit?: 'ml' | 'g';
    schedules: {
        breakfast?: boolean;
        midMorning?: boolean;
        lunch?: boolean;
        afternoon?: boolean;
        dinner?: boolean;
        supper?: boolean;
        other?: string;
    };
}

export interface OralTherapy {
    id?: string;
    patientId: string;
    dietConsistency?: string;
    dietCharacteristics?: string;
    mealsPerDay?: number;
    speechTherapy?: boolean;
    needsThickener?: boolean;
    safeConsistency?: string;
    estimatedVET?: number;
    estimatedProtein?: number;
    hasOralTherapy?: boolean;
    supplements?: OralSupplementSchedule[];
    modules?: OralModuleSchedule[];
    observations?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ParenteralTherapy {
    id?: string;
    patientId: string;
    access: 'central' | 'peripheral' | 'picc';
    infusionTime: number;
    vetKcal?: number;
    aminoacidsG?: number;
    lipidsG?: number;
    glucoseG?: number;
    observations?: string;
    createdAt: string;
    updatedAt: string;
}

export interface NursingCosts {
    timeOpenSystemPump?: number;
    timeClosedSystemPump?: number;
    timeOpenSystemGravity?: number;
    timeClosedSystemGravity?: number;
    timeBolus?: number;
    hourlyRate?: number;
}

export interface IndirectCosts {
    laborCosts?: number;
}

export interface Clinic {
    id?: string;
    hospitalId?: string;
    name: string;
    code: string;
    type: 'uti-adulto' | 'uti-pediatrica' | 'enfermaria' | 'ambulatorio' | 'other';
    isActive: boolean;
    createdAt: string;
}

export interface AppSettings {
    id?: string;
    hospitalId?: string;
    version?: number;
    syncStatus?: 'synced' | 'pending' | 'failed';
    hospitalName: string;
    hospitalLogo?: string;
    defaultSignatures?: {
        rtName: string;
        rtCrn: string;
    };
    labelSettings?: {
        showConservation: boolean;
        defaultConservation: string;
        openConservation?: string;
        closedConservation?: string;
    };
    nursingCosts?: NursingCosts;
    indirectCosts?: IndirectCosts;
    createdAt: string;
    updatedAt: string;
}

export interface Hospital {
    id?: string;
    version?: number;
    syncStatus?: 'synced' | 'pending' | 'failed';
    name: string;
    cnes?: string;
    cep?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface Ward {
    id?: string;
    version?: number;
    syncStatus?: 'synced' | 'pending' | 'failed';
    hospitalId: string;
    name: string;
    code?: string;
    type: 'uti-adulto' | 'uti-pediatrica' | 'enfermaria' | 'ambulatorio' | 'other';
    beds?: number;
    isActive: boolean;
    createdAt: string;
}

export interface RolePermission {
    id?: string;
    hospitalId?: string;
    role: 'general_manager' | 'local_manager' | 'nutritionist' | 'technician';
    permissionKey: string;
    allowed: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface AppTool {
    id?: string;
    hospitalId?: string;
    code: string;
    name: string;
    category: string;
    description?: string;
    link?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// ============================================
// API SERVICES (Replacing Supabase)
// ============================================

const toDateOnly = (value?: string | Date | null): string => {
    if (!value) return "";
    if (typeof value === "string") {
        return value.includes("T") ? value.split("T")[0] : value;
    }

    return value.toISOString().split("T")[0];
};

const toNumber = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const ensureArray = <T = string>(value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (typeof value === "string" && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed as T[] : [];
        } catch {
            return [];
        }
    }
    return [];
};

const normalizePatient = (raw: any): Patient => {
    const weight = toNumber(raw.weight);
    const targetKcalPerKg =
        raw.tneGoals?.targetKcalPerKg
        ?? (weight && raw.targetKcal ? Number(raw.targetKcal) / weight : undefined);
    const targetProteinPerKgActual =
        raw.tneGoals?.targetProteinPerKgActual
        ?? (weight && raw.targetProtein ? Number(raw.targetProtein) / weight : undefined);

    return {
        id: raw.id,
        version: toNumber(raw.version),
        syncStatus: raw.syncStatus ?? 'synced',
        name: raw.name || "",
        record: raw.record ?? raw.recordNumber ?? "",
        dob: toDateOnly(raw.dob ?? raw.birthDate),
        gender: raw.gender === "F" ? "female" : raw.gender === "M" ? "male" : raw.gender,
        weight,
        height: toNumber(raw.height),
        idealWeight: toNumber(raw.idealWeight),
        bed: raw.bed || "",
        ward: raw.ward ?? raw.wardName ?? raw.wardRelation?.name ?? raw.wardModel?.name ?? raw.wardInfo?.name ?? raw.wardRef?.name ?? raw.wardDetails?.name ?? raw.wardData?.name ?? raw.wardEntity?.name ?? raw.wardObj?.name ?? raw.wardItem?.name ?? raw.wardLink?.name ?? raw.wardRecord?.name ?? raw.wardResult?.name ?? raw.wardValue?.name ?? raw.wardModelName ?? raw.ward?.name ?? "",
        hospitalId: raw.hospitalId,
        observation: raw.observation ?? raw.notes ?? "",
        monitoringNotes: raw.monitoringNotes ?? raw.latestEvolutionNotes ?? raw.latestEvolution?.notes ?? raw.evolutions?.[0]?.notes ?? "",
        admissionDate: toDateOnly(raw.admissionDate),
        status: raw.status || "active",
        dischargeDate: toDateOnly(raw.dischargeDate),
        dischargeReason: raw.dischargeReason,
        nutritionType: raw.nutritionType || "enteral",
        tneGoals: targetKcalPerKg || targetProteinPerKgActual || raw.tneGoals?.targetProteinPerKgIdeal
            ? {
                targetKcalPerKg,
                targetProteinPerKgActual,
                targetProteinPerKgIdeal: raw.tneGoals?.targetProteinPerKgIdeal,
            }
            : undefined,
        infusionPercentage24h: toNumber(raw.infusionPercentage24h),
        tneInterruptions: raw.tneInterruptions,
        unintentionalCalories: raw.unintentionalCalories,
        consistency: raw.consistency,
        safeConsistency: raw.safeConsistency,
        mealCount: raw.mealCount,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    };
};

const normalizeFormula = (raw: any): Formula => ({
    id: raw.id,
    hospitalId: raw.hospitalId,
    version: toNumber(raw.version),
    syncStatus: raw.syncStatus ?? 'synced',
    code: raw.code ?? raw.id ?? "",
    name: raw.name || "",
    manufacturer: raw.manufacturer ?? "",
    type: raw.type ?? "standard",
    classification: raw.classification,
    macronutrientComplexity: raw.macronutrientComplexity,
    ageGroup: raw.ageGroup,
    systemType: raw.systemType ?? "both",
    formulaTypes: ensureArray<string>(raw.formulaTypes),
    administrationRoutes: ensureArray<NonNullable<Formula["administrationRoutes"]>[number]>(raw.administrationRoutes),
    presentationForm: raw.presentationForm,
    presentations: ensureArray<number>(raw.presentations),
    presentationDescription: raw.presentationDescription,
    description: raw.description,
    billingUnit: raw.billingUnit,
    conversionFactor: toNumber(raw.conversionFactor),
    billingPrice: toNumber(raw.billingPrice),
    caloriesPerUnit: toNumber(raw.caloriesPerUnit) ?? 0,
    density: toNumber(raw.density),
    proteinPerUnit: toNumber(raw.proteinPerUnit) ?? 0,
    proteinPct: toNumber(raw.proteinPct),
    carbPerUnit: toNumber(raw.carbPerUnit),
    carbPct: toNumber(raw.carbPct),
    fatPerUnit: toNumber(raw.fatPerUnit),
    fatPct: toNumber(raw.fatPct),
    fiberPerUnit: toNumber(raw.fiberPerUnit),
    fiberType: raw.fiberType,
    sodiumPerUnit: toNumber(raw.sodiumPerUnit),
    potassiumPerUnit: toNumber(raw.potassiumPerUnit),
    calciumPerUnit: toNumber(raw.calciumPerUnit),
    phosphorusPerUnit: toNumber(raw.phosphorusPerUnit),
    waterContent: toNumber(raw.waterContent),
    osmolality: toNumber(raw.osmolality),
    proteinSources: raw.proteinSources,
    carbSources: raw.carbSources,
    fatSources: raw.fatSources,
    fiberSources: raw.fiberSources,
    specialCharacteristics: raw.specialCharacteristics,
    plasticG: toNumber(raw.plasticG),
    paperG: toNumber(raw.paperG),
    metalG: toNumber(raw.metalG),
    glassG: toNumber(raw.glassG),
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
});

const normalizeModule = (raw: any): Module => ({
    id: raw.id,
    hospitalId: raw.hospitalId,
    version: toNumber(raw.version),
    syncStatus: raw.syncStatus ?? 'synced',
    name: raw.name || "",
    description: raw.description,
    density: toNumber(raw.density) ?? 0,
    referenceAmount: toNumber(raw.referenceAmount) ?? 0,
    referenceTimesPerDay: toNumber(raw.referenceTimesPerDay) ?? 0,
    calories: toNumber(raw.calories) ?? 0,
    protein: toNumber(raw.protein) ?? 0,
    carbs: toNumber(raw.carbs),
    fat: toNumber(raw.fat),
    sodium: toNumber(raw.sodium) ?? 0,
    potassium: toNumber(raw.potassium) ?? 0,
    calcium: toNumber(raw.calcium),
    phosphorus: toNumber(raw.phosphorus),
    fiber: toNumber(raw.fiber) ?? 0,
    freeWater: toNumber(raw.freeWater) ?? 0,
    billingUnit: raw.billingUnit,
    billingPrice: toNumber(raw.billingPrice),
    proteinSources: raw.proteinSources,
    carbSources: raw.carbSources,
    fatSources: raw.fatSources,
    fiberSources: raw.fiberSources,
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
});

const normalizeSupply = (raw: any): Supply => ({
    id: raw.id,
    hospitalId: raw.hospitalId,
    version: toNumber(raw.version),
    syncStatus: raw.syncStatus ?? 'synced',
    code: raw.code || "",
    name: raw.name || "",
    type: raw.type ?? "other",
    category: raw.category,
    description: raw.description,
    billingUnit: raw.billingUnit,
    capacityMl: toNumber(raw.capacityMl),
    unitPrice: toNumber(raw.unitPrice) ?? 0,
    isBillable: raw.isBillable !== false,
    plasticG: toNumber(raw.plasticG),
    paperG: toNumber(raw.paperG),
    metalG: toNumber(raw.metalG),
    glassG: toNumber(raw.glassG),
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
});

const normalizeProfessional = (raw: any): Professional => ({
    id: raw.id,
    hospitalId: raw.hospitalId,
    version: toNumber(raw.version),
    syncStatus: raw.syncStatus ?? 'synced',
    name: raw.name || "",
    role: raw.role ?? "nutritionist",
    registrationNumber: raw.registrationNumber || "",
    cpf: raw.cpf,
    crn: raw.crn,
    cpe: raw.cpe,
    managingUnit: raw.managingUnit,
    passwordConfigured: raw.passwordConfigured === true,
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
});

const normalizePrescription = (raw: any): Prescription => {
    const formulas = Array.isArray(raw.formulas) ? raw.formulas.map((formula: any) => ({
        formulaId: formula.formulaId,
        formulaName: formula.formulaName ?? formula.formula?.name ?? "",
        volume: toNumber(formula.volume) ?? 0,
        timesPerDay: toNumber(formula.timesPerDay) ?? 0,
        schedules: ensureArray<string>(formula.schedules),
    })) : [];

    const modules = Array.isArray(raw.modules) ? raw.modules.map((module: any) => ({
        moduleId: module.moduleId,
        moduleName: module.moduleName ?? module.module?.name ?? "",
        amount: toNumber(module.amount) ?? 0,
        timesPerDay: toNumber(module.timesPerDay) ?? 0,
        schedules: ensureArray<string>(module.schedules),
        unit: module.unit,
    })) : [];

    return {
        id: raw.id,
        hospitalId: raw.hospitalId,
        version: toNumber(raw.version),
        syncStatus: raw.syncStatus ?? 'synced',
        patientId: raw.patientId,
        patientName: raw.patientName ?? raw.patient?.name ?? "",
        patientRecord: raw.patientRecord ?? raw.patient?.record ?? raw.patient?.recordNumber ?? "",
        patientBed: raw.patientBed ?? raw.patient?.bed,
        patientWard: raw.patientWard ?? raw.patient?.ward ?? raw.patient?.ward?.name ?? "",
        professionalId: raw.professionalId,
        professionalName: raw.professionalName ?? raw.professional?.name,
        therapyType: raw.therapyType,
        systemType: raw.systemType ?? "open",
        feedingRoute: raw.feedingRoute,
        infusionMode: raw.infusionMode,
        infusionRateMlH: toNumber(raw.infusionRateMlH),
        infusionDropsMin: toNumber(raw.infusionDropsMin),
        infusionHoursPerDay: toNumber(raw.infusionHoursPerDay),
        equipmentVolume: toNumber(raw.equipmentVolume),
        formulas,
        modules,
        hydrationVolume: toNumber(raw.hydrationVolume),
        hydrationSchedules: ensureArray<string>(raw.hydrationSchedules),
        totalCalories: toNumber(raw.totalCalories),
        totalProtein: toNumber(raw.totalProtein),
        totalCarbs: toNumber(raw.totalCarbs),
        totalFat: toNumber(raw.totalFat),
        totalFiber: toNumber(raw.totalFiber),
        totalVolume: toNumber(raw.totalVolume),
        totalFreeWater: toNumber(raw.totalFreeWater),
        nursingTimeMinutes: toNumber(raw.nursingTimeMinutes),
        nursingCostTotal: toNumber(raw.nursingCostTotal),
        materialCostTotal: toNumber(raw.materialCostTotal),
        totalCost: toNumber(raw.totalCost),
        enteralDetails: raw.enteralDetails,
        oralDetails: raw.oralDetails,
        parenteralDetails: raw.parenteralDetails,
        payloadSnapshot: raw.payloadSnapshot,
        status: raw.status ?? "active",
        statusReason: raw.statusReason,
        statusChangedAt: toDateOnly(raw.statusChangedAt),
        statusChangedBy: raw.statusChangedBy,
        statusEvents: Array.isArray(raw.statusEvents)
            ? raw.statusEvents.map((event: any) => ({
                id: event.id,
                fromStatus: event.fromStatus,
                toStatus: event.toStatus,
                reason: event.reason,
                changedBy: event.changedBy,
                effectiveDate: toDateOnly(event.effectiveDate),
                createdAt: toDateOnly(event.createdAt),
            }))
            : [],
        startDate: toDateOnly(raw.startDate),
        endDate: toDateOnly(raw.endDate),
        notes: raw.notes,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    };
};

const normalizeEvolution = (raw: any): DailyEvolution => {
    const volumeInfused = toNumber(raw.volumeInfused ?? raw.infusedVolume) ?? 0;
    const metaReached =
        toNumber(raw.metaReached)
        ?? toNumber(raw.infusionPercentage)
        ?? (
            toNumber(raw.prescribedVolume) && volumeInfused
                ? (volumeInfused / (toNumber(raw.prescribedVolume) || 1)) * 100
                : 0
        );

    return {
        id: raw.id,
        hospitalId: raw.hospitalId,
        version: toNumber(raw.version),
        syncStatus: raw.syncStatus ?? 'synced',
        patientId: raw.patientId,
        prescriptionId: raw.prescriptionId,
        professionalId: raw.professionalId,
        date: toDateOnly(raw.date),
        volumeInfused,
        metaReached: Number(metaReached.toFixed(2)),
        oralKcal: toNumber(raw.oralKcal),
        oralProtein: toNumber(raw.oralProtein),
        enteralKcal: toNumber(raw.enteralKcal),
        enteralProtein: toNumber(raw.enteralProtein),
        parenteralKcal: toNumber(raw.parenteralKcal),
        parenteralProtein: toNumber(raw.parenteralProtein),
        nonIntentionalKcal: toNumber(raw.nonIntentionalKcal),
        intercurrences: raw.intercurrences ?? raw.tneInterruptions,
        notes: raw.notes,
        createdAt: raw.createdAt || new Date().toISOString(),
    };
};

const normalizeHospital = (raw: any): Hospital => ({
    id: raw.id,
    version: toNumber(raw.version),
    syncStatus: raw.syncStatus ?? 'synced',
    name: raw.name || "",
    cnes: raw.cnes,
    cep: raw.cep ?? raw.zipCode,
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
});

const normalizeWard = (raw: any): Ward => ({
    id: raw.id,
    version: toNumber(raw.version),
    syncStatus: raw.syncStatus ?? 'synced',
    hospitalId: raw.hospitalId,
    name: raw.name || "",
    code: raw.code,
    type: raw.type ?? "other",
    beds: toNumber(raw.beds ?? raw.bedCount),
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt || new Date().toISOString(),
});

const mapPatientPayload = (data: any) => ({
    name: data.name,
    record: data.record,
    recordNumber: data.record ?? data.recordNumber,
    dob: data.dob,
    birthDate: data.dob ?? data.birthDate,
    bed: data.bed,
    ward: data.ward,
    wardId: data.wardId,
    hospitalId: data.hospitalId,
    observation: data.observation ?? data.notes,
    gender: data.gender,
    weight: data.weight,
    height: data.height,
    nutritionType: data.nutritionType,
    status: data.status,
    consistency: data.consistency,
    safeConsistency: data.safeConsistency,
    mealCount: data.mealCount,
    dischargeDate: data.dischargeDate,
    dischargeReason: data.dischargeReason,
});

const mapPrescriptionPayload = (data: any) => ({
    ...data,
    hospitalId: data.hospitalId ?? (typeof window !== 'undefined' ? localStorage.getItem('userHospitalId') || undefined : undefined),
    startDate: toDateOnly(data.startDate),
    endDate: toDateOnly(data.endDate),
    enteralDetails: data.enteralDetails,
    oralDetails: data.oralDetails,
    parenteralDetails: data.parenteralDetails,
    hydrationSchedules: Array.isArray(data.hydrationSchedules) ? data.hydrationSchedules : undefined,
    formulas: Array.isArray(data.formulas)
        ? data.formulas
            .filter((formula: any) => typeof formula?.formulaId === 'string' && formula.formulaId.trim() !== '' && !formula.formulaId.startsWith('local-'))
            .map((formula: any) => ({
                ...formula,
                schedules: Array.isArray(formula.schedules) ? formula.schedules : [],
            }))
        : [],
    modules: Array.isArray(data.modules)
        ? data.modules
            .filter((module: any) => typeof module?.moduleId === 'string' && module.moduleId.trim() !== '' && !module.moduleId.startsWith('local-'))
            .map((module: any) => ({
                ...module,
                schedules: Array.isArray(module.schedules) ? module.schedules : [],
            }))
        : [],
});

const mapEvolutionPayload = (data: any) => ({
    ...data,
    date: toDateOnly(data.date),
});

const mapFormulaPayload = (data: any) => ({
    ...data,
    hospitalId: data.hospitalId ?? (typeof window !== 'undefined' ? localStorage.getItem('userHospitalId') || undefined : undefined),
    formulaTypes: Array.isArray(data.formulaTypes) ? data.formulaTypes : undefined,
    administrationRoutes: Array.isArray(data.administrationRoutes) ? data.administrationRoutes : undefined,
    presentations: Array.isArray(data.presentations) ? data.presentations : undefined,
});

const mapModulePayload = (data: any) => ({
    ...data,
    hospitalId: data.hospitalId ?? (typeof window !== 'undefined' ? localStorage.getItem('userHospitalId') || undefined : undefined),
});

const nowIso = () => new Date().toISOString();

const withSyncState = <T extends Record<string, unknown>>(
    entity: T,
    syncStatus: 'synced' | 'pending' | 'failed' = 'synced',
): T => ({
    ...entity,
    syncStatus,
});

const mergeRemoteWithOffline = async <T extends Record<string, unknown>>(
    entityType: OfflineEntityType,
    fetchRemote: () => Promise<T[]>,
): Promise<T[]> => {
    try {
        const remote = await fetchRemote();
        await cacheSnapshot(entityType, remote);
        return (await getMergedRecords(entityType, remote)).map((record) =>
            withSyncState(record as T, (record.syncStatus as T['syncStatus']) || 'synced'),
        ) as T[];
    } catch {
        return (await getMergedRecords(entityType)).map((record) =>
            withSyncState(record as T, (record.syncStatus as T['syncStatus']) || 'pending'),
        ) as T[];
    }
};

const buildCreateEntity = <T extends Record<string, unknown>>(
    entityType: OfflineEntityType,
    payload: Record<string, unknown>,
    normalizer: (raw: any) => T,
) => {
    const timestamp = nowIso();
    const tempId = createTemporaryId(entityType);
    return {
        entityId: tempId,
        localEntity: withSyncState(
            normalizer({
                ...payload,
                id: tempId,
                createdAt: timestamp,
                updatedAt: timestamp,
                version: 1,
            }) as Record<string, unknown>,
            'pending',
        ),
    };
};

const buildUpdatedEntity = async <T extends Record<string, unknown>>(
    entityType: OfflineEntityType,
    entityId: string,
    patch: Record<string, unknown>,
    normalizer: (raw: any) => T,
) => {
    const current = (await readLocalRecord(entityType, entityId)) as (T & { version?: number }) | undefined;
    const timestamp = nowIso();
    const version = current?.version ?? (typeof patch.version === 'number' ? patch.version : undefined) ?? 1;
    const localEntity = withSyncState(
        normalizer({
            ...(current || {}),
            ...patch,
            id: entityId,
            updatedAt: timestamp,
            createdAt: (current as Record<string, unknown> | undefined)?.createdAt || timestamp,
            version,
        }) as Record<string, unknown>,
        'pending',
    );

    return {
        expectedVersion: current?.version,
        localEntity,
    };
};

const queueCreate = async <T extends Record<string, unknown>>(
    entityType: OfflineEntityType,
    endpoint: string,
    payload: Record<string, unknown>,
    normalizer: (raw: any) => T,
) => {
    const { entityId, localEntity } = buildCreateEntity(entityType, payload, normalizer);
    return executeOrQueueMutation({
        entityType,
        action: 'create',
        endpoint,
        method: 'POST',
        payload,
        entityId,
        localEntity,
    });
};

const queueUpdate = async <T extends Record<string, unknown>>(
    entityType: OfflineEntityType,
    endpoint: string,
    entityId: string,
    payload: Record<string, unknown>,
    normalizer: (raw: any) => T,
) => {
    const { expectedVersion, localEntity } = await buildUpdatedEntity(entityType, entityId, payload, normalizer);
    return executeOrQueueMutation({
        entityType,
        action: 'update',
        endpoint,
        method: 'PUT',
        payload: expectedVersion !== undefined ? { ...payload, version: expectedVersion } : payload,
        entityId,
        localEntity,
        expectedVersion,
    });
};

const queueDelete = async (
    entityType: OfflineEntityType,
    endpoint: string,
    entityId: string,
) => {
    const current = await readLocalRecord(entityType, entityId) as { version?: number } | undefined;
    return executeOrQueueMutation({
        entityType,
        action: 'delete',
        endpoint,
        method: 'DELETE',
        entityId,
        expectedVersion: current?.version,
    });
};

export const patientsService = {
    async getAll() {
        const hospitalId = resolveSessionHospitalId();
        return mergeRemoteWithOffline('patients', async () =>
            ((await apiClient.get(appendHospitalIdQuery('/patients', hospitalId))) as any[]).map(normalizePatient),
        ) as Promise<Patient[]>;
    },
    async getActive() { return (await this.getAll()).filter((patient: Patient) => patient.status === 'active'); },
    async getById(id: string) {
        const local = await readLocalRecord('patients', id);
        if (local) return normalizePatient(local);
        return normalizePatient(await apiClient.get(`/patients/${id}`));
    },
    async create(data: any) {
        const result = await queueCreate('patients', '/patients', mapPatientPayload(data), normalizePatient);
        return String(result.entityId ?? result.id);
    },
    async update(id: string, data: any) {
        return queueUpdate('patients', `/patients/${id}`, id, mapPatientPayload(data), normalizePatient);
    },
    async delete(id: string) { return queueDelete('patients', `/patients/${id}`, id); },
    async search(query: string) { 
        const all = await this.getAll();
        const q = query.toLowerCase();
        return all.filter((p: any) => p.name.toLowerCase().includes(q) || p.record?.includes(q));
    }
};

export const formulasService = {
    async getAll() {
        const hospitalId = resolveSessionHospitalId();
        return mergeRemoteWithOffline('formulas', async () =>
            ((await apiClient.get(appendHospitalIdQuery('/formulas', hospitalId))) as any[]).map(normalizeFormula),
        ) as Promise<Formula[]>;
    },
    async getById(id: string) {
        const local = await readLocalRecord('formulas', id);
        if (local) return normalizeFormula(local);
        return normalizeFormula(await apiClient.get(`/formulas/${id}`));
    },
    async getBySystem(systemType: string) { return (await this.getAll()).filter((f: any) => f.type === systemType); },
    async create(data: any) {
        const result = await queueCreate('formulas', '/formulas', mapFormulaPayload(data), normalizeFormula);
        return String(result.entityId ?? result.id);
    },
    async update(id: string, data: any) { return queueUpdate('formulas', `/formulas/${id}`, id, mapFormulaPayload(data), normalizeFormula); },
    async delete(id: string) { return queueDelete('formulas', `/formulas/${id}`, id); },
    async search(query: string) { 
        const all = await this.getAll();
        const q = query.toLowerCase();
        return all.filter((f: any) => f.name.toLowerCase().includes(q));
    }
};

export const modulesService = {
    async getAll() {
        const hospitalId = resolveSessionHospitalId();
        return mergeRemoteWithOffline('modules', async () =>
            ((await apiClient.get(appendHospitalIdQuery('/modules', hospitalId))) as any[]).map(normalizeModule),
        ) as Promise<Module[]>;
    },
    async getById(id: string) {
        const local = await readLocalRecord('modules', id);
        if (local) return normalizeModule(local);
        return normalizeModule(await apiClient.get(`/modules/${id}`));
    },
    async create(data: any) {
        const result = await queueCreate('modules', '/modules', mapModulePayload(data), normalizeModule);
        return String(result.entityId ?? result.id);
    },
    async update(id: string, data: any) { return queueUpdate('modules', `/modules/${id}`, id, mapModulePayload(data), normalizeModule); },
    async delete(id: string) { return queueDelete('modules', `/modules/${id}`, id); },
    async search(query: string) { 
        const all = await this.getAll();
        const q = query.toLowerCase();
        return all.filter((m: any) => m.name.toLowerCase().includes(q));
    }
};

export const suppliesService = {
    async getAll() {
        const hospitalId = resolveSessionHospitalId();
        return mergeRemoteWithOffline('supplies', async () =>
            ((await apiClient.get(appendHospitalIdQuery('/supplies', hospitalId))) as any[]).map(normalizeSupply),
        ) as Promise<Supply[]>;
    },
    async getById(id: string) {
        const local = await readLocalRecord('supplies', id);
        if (local) return normalizeSupply(local);
        return normalizeSupply(await apiClient.get(`/supplies/${id}`));
    },
    async create(data: any) {
        const result = await queueCreate('supplies', '/supplies', data, normalizeSupply);
        return String(result.entityId ?? result.id);
    },
    async update(id: string, data: any) { return queueUpdate('supplies', `/supplies/${id}`, id, data, normalizeSupply); },
    async delete(id: string) { return queueDelete('supplies', `/supplies/${id}`, id); },
    async search(query: string) { 
        const all = await this.getAll();
        const q = query.toLowerCase();
        return all.filter((s: any) => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q));
    }
};

export const professionalsService = {
    async getAll() {
        const hospitalId = resolveSessionHospitalId();
        return mergeRemoteWithOffline('professionals', async () =>
            ((await apiClient.get(appendHospitalIdQuery('/professionals', hospitalId))) as any[]).map(normalizeProfessional),
        ) as Promise<Professional[]>;
    },
    async getByHospital(id: string) {
        return mergeRemoteWithOffline('professionals', async () =>
            ((await apiClient.get(`/professionals?hospitalId=${id}`)) as any[]).map(normalizeProfessional),
        ) as Promise<Professional[]>;
    },
    async create(data: any) {
        const result = await queueCreate('professionals', '/professionals', data, normalizeProfessional);
        return String(result.entityId ?? result.id);
    },
    async update(id: string, data: any) { return queueUpdate('professionals', `/professionals/${id}`, id, data, normalizeProfessional); },
    async delete(id: string) { return queueDelete('professionals', `/professionals/${id}`, id); }
};

export const prescriptionsService = {
    async getActiveByPatient(patientId: string) { 
        const all = await this.getAll();
        return all.find((p: any) => p.patientId === patientId && p.status === 'active');
    },
    async getHistoryByPatient(patientId: string) {
        const all = await this.getAll();
        return all.filter((p: any) => p.patientId === patientId);
    },
    async getByPatient(patientId: string) {
        const all = await this.getAll();
        return all.filter((p: any) => p.patientId === patientId);
    },
    async getHistory(id: string) {
        return (await apiClient.get(`/prescriptions/${id}/history`)).map((event: any) => ({
            id: event.id,
            fromStatus: event.fromStatus,
            toStatus: event.toStatus,
            reason: event.reason,
            changedBy: event.changedBy,
            effectiveDate: toDateOnly(event.effectiveDate),
            createdAt: toDateOnly(event.createdAt),
        })) as PrescriptionStatusEvent[];
    },
    async getAll() {
        const hospitalId = resolveSessionHospitalId();
        return mergeRemoteWithOffline('prescriptions', async () =>
            ((await apiClient.get(appendHospitalIdQuery('/prescriptions', hospitalId))) as any[]).map(normalizePrescription),
        ) as Promise<Prescription[]>;
    },
    async getActive() { return (await this.getAll()).filter((prescription: Prescription) => prescription.status === 'active'); },
    async getById(id: string) {
        const local = await readLocalRecord('prescriptions', id);
        if (local) return normalizePrescription(local);
        return normalizePrescription(await apiClient.get(`/prescriptions/${id}`));
    },
    async create(data: any) {
        const payload = mapPrescriptionPayload(data);
        const result = await queueCreate('prescriptions', '/prescriptions', payload, normalizePrescription);
        return String(result.entityId ?? result.id);
    },
    async update(id: string, data: any) {
        const payload = mapPrescriptionPayload(data);
        return queueUpdate('prescriptions', `/prescriptions/${id}`, id, payload, normalizePrescription);
    },
    async delete(id: string) { return queueDelete('prescriptions', `/prescriptions/${id}`, id); },
    async updateStatus(
        id: string,
        payload:
            | string
            | {
                status: Prescription["status"];
                reason?: string;
                changedBy?: string;
                effectiveDate?: string;
            },
    ) {
        const normalizedPayload = typeof payload === "string" ? { status: payload } : payload;
        return queueUpdate(
            'prescriptions',
            `/prescriptions/${id}/status`,
            id,
            normalizedPayload as Record<string, unknown>,
            normalizePrescription,
        );
    }
};

export const evolutionsService = {
    async getAll() {
        const hospitalId = resolveSessionHospitalId();
        return mergeRemoteWithOffline('evolutions', async () =>
            ((await apiClient.get(appendHospitalIdQuery('/evolutions', hospitalId)).catch(() => [])) as any[]).map(normalizeEvolution),
        ) as Promise<DailyEvolution[]>;
    },
    async getByDate(date: string) { return (await this.getAll()).filter((evolution: DailyEvolution) => evolution.date === toDateOnly(date)); },
    async getByPatient(patientId: string) {
        return (await this.getAll()).filter((evolution: DailyEvolution) => evolution.patientId === patientId);
    },
    async getByPatientAndDateRange(patientId: string, startDate: string, endDate: string) {
        const start = toDateOnly(startDate);
        const end = toDateOnly(endDate);
        return (await this.getByPatient(patientId)).filter((evolution: DailyEvolution) => evolution.date >= start && evolution.date <= end);
    },
    async create(data: any) {
        const payload = mapEvolutionPayload(data);
        const result = await queueCreate('evolutions', '/evolutions', payload, normalizeEvolution);
        return String(result.entityId ?? result.id);
    },
    async update(id: string, data: any) { return queueUpdate('evolutions', `/evolutions/${id}`, id, mapEvolutionPayload(data), normalizeEvolution); },
    async delete(id: string) { return queueDelete('evolutions', `/evolutions/${id}`, id); }
};

export const clinicsService = {
    async getAll() {
        const hospitalId = resolveSessionHospitalId();
        return apiClient.get(appendHospitalIdQuery('/clinics', hospitalId)).catch(() => []);
    },
    async getActive() {
        const hospitalId = resolveSessionHospitalId();
        return apiClient.get(appendHospitalIdQuery('/clinics', hospitalId)).catch(() => []);
    },
    async create(data: any) { return (await apiClient.post('/clinics', data)).id; },
    async update(id: string, data: any) { return apiClient.put(`/clinics/${id}`, data); },
    async delete(id: string) { return apiClient.delete(`/clinics/${id}`); }
};
export const hospitalsService = {
    async getAll() {
        const hospitalId = resolveSessionHospitalId();
        return mergeRemoteWithOffline('hospitals', async () =>
            ((await apiClient.get(appendHospitalIdQuery('/hospitals', hospitalId)).catch(() => [])) as any[]).map(normalizeHospital),
        ) as Promise<Hospital[]>;
    },
    async getActive() { return (await this.getAll()).filter((hospital: Hospital) => hospital.isActive); },
    async create(data: any) {
        const result = await queueCreate('hospitals', '/hospitals', data, normalizeHospital);
        return String(result.entityId ?? result.id);
    },
    async update(id: string, data: any) { return queueUpdate('hospitals', `/hospitals/${id}`, id, data, normalizeHospital); },
    async delete(id: string) { return queueDelete('hospitals', `/hospitals/${id}`, id); }
};
export const wardsService = {
    async getAll() {
        const hospitalId = resolveSessionHospitalId();
        return mergeRemoteWithOffline('wards', async () =>
            ((await apiClient.get(appendHospitalIdQuery('/wards', hospitalId)).catch(() => [])) as any[]).map(normalizeWard),
        ) as Promise<Ward[]>;
    },
    async getActive() { return (await this.getAll()).filter((ward: Ward) => ward.isActive); },
    async getByHospital(hospitalId: string) {
        return mergeRemoteWithOffline('wards', async () =>
            ((await apiClient.get(`/wards/hospital/${hospitalId}`).catch(() => [])) as any[]).map(normalizeWard),
        ) as Promise<Ward[]>;
    },
    async create(data: any) {
        const result = await queueCreate('wards', '/wards', data, normalizeWard);
        return String(result.entityId ?? result.id);
    },
    async update(id: string, data: any) { return queueUpdate('wards', `/wards/${id}`, id, data, normalizeWard); },
    async delete(id: string) { return queueDelete('wards', `/wards/${id}`, id); }
};

const resolveSessionHospitalId = () => {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem('userHospitalId') || undefined;
};

export const rolePermissionsService = {
    async getAll() {
        const hospitalId = resolveSessionHospitalId();
        const query = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
        return (await apiClient.get(`/role-permissions${query}`).catch(() => [])) as RolePermission[];
    },
    async saveAll(rows: Array<Pick<RolePermission, "role" | "permissionKey" | "allowed">>) {
        const hospitalId = resolveSessionHospitalId();
        const query = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
        return (await apiClient.request(`/role-permissions${query}`, {
            method: 'PUT',
            body: JSON.stringify({ rows }),
        })) as RolePermission[];
    },
};
export const appToolsService = {
    async getAll() {
        const hospitalId = resolveSessionHospitalId();
        const query = hospitalId ? `?hospitalId=${encodeURIComponent(hospitalId)}` : '';
        return (await apiClient.get(`/app-tools${query}`).catch(() => [])) as AppTool[];
    }
};

const SETTINGS_STORAGE_PREFIX = 'enterall-smart-rx:settings:';

const resolveSettingsHospitalId = () => {
    if (typeof window === 'undefined') return 'local-1';
    return localStorage.getItem('userHospitalId') || 'local-1';
};

const defaultSettingsForHospital = (hospitalId?: string): AppSettings => ({
    hospitalId: hospitalId || 'local-1',
    hospitalName: typeof window !== 'undefined'
        ? localStorage.getItem('userHospitalName') || 'Unidade'
        : 'Unidade',
    defaultSignatures: {
        rtName: 'RT não cadastrado',
        rtCrn: 'CRN não cadastrado',
    },
    labelSettings: {
        showConservation: true,
        defaultConservation: 'Conservação: usar em até 4h após manipulação, em temperatura ambiente.',
        openConservation: 'Conservação: usar em até 4h após manipulação, em temperatura ambiente.',
        closedConservation: 'Conservação: em temperatura ambiente.',
    },
    nursingCosts: {
        timeOpenSystemPump: 0,
        timeClosedSystemPump: 0,
        timeOpenSystemGravity: 0,
        timeClosedSystemGravity: 0,
        timeBolus: 0,
        hourlyRate: 0,
    },
    indirectCosts: {
        laborCosts: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});

const normalizeSettings = (raw: Partial<AppSettings> | undefined, hospitalId?: string): AppSettings => {
    const defaults = defaultSettingsForHospital(hospitalId);
    return {
        ...defaults,
        ...raw,
        version: toNumber(raw?.version),
        syncStatus: raw?.syncStatus ?? 'synced',
        hospitalId: hospitalId || raw?.hospitalId || defaults.hospitalId,
        hospitalName: raw?.hospitalName || defaults.hospitalName,
        defaultSignatures: {
            ...defaults.defaultSignatures,
            ...(raw?.defaultSignatures || {}),
        },
        labelSettings: {
            ...defaults.labelSettings,
            ...(raw?.labelSettings || {}),
        },
        nursingCosts: {
            ...defaults.nursingCosts,
            ...(raw?.nursingCosts || {}),
        },
        indirectCosts: {
            ...defaults.indirectCosts,
            ...(raw?.indirectCosts || {}),
        },
        createdAt: raw?.createdAt || defaults.createdAt,
        updatedAt: raw?.updatedAt || new Date().toISOString(),
    };
};

export const settingsService = {
    async get() {
        const hospitalId = resolveSettingsHospitalId();
        try {
            const remote = await apiClient.get(`/settings/${hospitalId}`);
            const normalized = normalizeSettings(remote, hospitalId);

            if (typeof window !== 'undefined') {
                localStorage.setItem(`${SETTINGS_STORAGE_PREFIX}${hospitalId}`, JSON.stringify(normalized));
                if (normalized.hospitalName) {
                    localStorage.setItem('userHospitalName', normalized.hospitalName);
                }
            }

            return normalized;
        } catch {
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem(`${SETTINGS_STORAGE_PREFIX}${hospitalId}`);
                if (stored) {
                    try {
                        return normalizeSettings(JSON.parse(stored), hospitalId);
                    } catch {
                        return defaultSettingsForHospital(hospitalId);
                    }
                }
            }

            return defaultSettingsForHospital(hospitalId);
        }
    },
    async save(data: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>) {
        const hospitalId = data.hospitalId || resolveSettingsHospitalId();
        const current = await this.get();
        const next = normalizeSettings(
            {
                ...current,
                ...data,
                hospitalId,
                updatedAt: new Date().toISOString(),
            },
            hospitalId,
        );

        let persisted = next;
        try {
            const remote = await apiClient.put(`/settings/${hospitalId}`, next, {
                headers: typeof current.version === 'number'
                    ? { 'x-expected-version': String(current.version) }
                    : undefined,
            });
            persisted = normalizeSettings(remote, hospitalId);
        } catch (error) {
            console.error('Error saving settings to API, keeping local fallback:', error);
        }

        if (typeof window !== 'undefined') {
            localStorage.setItem(`${SETTINGS_STORAGE_PREFIX}${hospitalId}`, JSON.stringify(persisted));
            if (persisted.hospitalName) {
                localStorage.setItem('userHospitalName', persisted.hospitalName);
            }
        }

        return persisted;
    }
};

export const initializeDatabase = async (): Promise<void> => {
    console.log('Connected to Local Database API');
};

export const supabase = {
    // Legacy no-op adapter kept only to avoid breaking older hooks while the app
    // finishes migrating away from the previous Supabase abstraction.
    channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) })
};
export const db = supabase;
