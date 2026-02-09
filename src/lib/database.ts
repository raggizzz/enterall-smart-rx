/**
 * EnterAll Smart RX - Supabase Database Services
 * Cloud-First Solution for Multi-Device Sync
 * 
 * All data is stored in Supabase PostgreSQL, enabling real-time sync
 */

import { supabase } from './supabase';

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
    admissionDate?: string;
    status: 'active' | 'inactive' | 'discharged' | 'deceased';
    dischargeDate?: string;
    dischargeReason?: string;
    nutritionType: 'enteral' | 'parenteral' | 'oral' | 'jejum';
    tneGoals?: TNEGoals;
    infusionPercentage24h?: number;
    tneInterruptions?: TNEInterruptions;
    unintentionalCalories?: UnintentionalCalories;
    createdAt: string;
    updatedAt: string;
}

export interface Formula {
    id?: string;
    hospitalId?: string;
    code: string;
    name: string;
    manufacturer: string;
    type: 'standard' | 'high-protein' | 'high-calorie' | 'diabetic' | 'renal' | 'peptide' | 'fiber' | 'immune' | 'oral-supplement' | 'infant-formula';
    classification?: string;
    systemType: 'open' | 'closed' | 'both';
    formulaTypes?: string[];
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
    name: string;
    density: number;
    referenceAmount: number;
    referenceTimesPerDay: number;
    calories: number;
    protein: number;
    carbs?: number;
    fat?: number;
    sodium: number;
    potassium: number;
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
    code: string;
    name: string;
    type: 'bottle' | 'set' | 'other';
    billingUnit?: 'unit' | 'pack' | 'box' | 'other';
    capacityMl?: number;
    unitPrice: number;
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
    name: string;
    role: 'manager' | 'general_manager' | 'local_manager' | 'nutritionist' | 'technician';
    registrationNumber: string;
    cpf?: string;
    crn?: string;
    cpe?: string;
    managingUnit?: string;
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

export interface Prescription {
    id?: string;
    hospitalId?: string;
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
    status: 'active' | 'suspended' | 'completed';
    startDate: string;
    endDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface DailyEvolution {
    id?: string;
    hospitalId?: string;
    patientId: string;
    prescriptionId?: string;
    professionalId?: string;
    date: string;
    volumeInfused: number;
    metaReached: number;
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
    hospitalName: string;
    hospitalLogo?: string;
    defaultSignatures?: {
        rtName: string;
        rtCrn: string;
    };
    labelSettings?: {
        showConservation: boolean;
        defaultConservation: string;
    };
    nursingCosts?: NursingCosts;
    indirectCosts?: IndirectCosts;
    createdAt: string;
    updatedAt: string;
}

export interface Hospital {
    id?: string;
    name: string;
    cnes?: string;
    cep?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface Ward {
    id?: string;
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
// HELPER FUNCTIONS - Map between camelCase and snake_case
// ============================================

const toSnakeCase = (str: string): string => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

const toCamelCase = (str: string): string => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

const mapToSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[toSnakeCase(key)] = obj[key];
        }
    }
    return result;
};

const mapToCamelCase = <T>(obj: Record<string, unknown>): T => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[toCamelCase(key)] = obj[key];
        }
    }
    return result as T;
};

const mapArrayToCamelCase = <T>(arr: Record<string, unknown>[]): T[] => {
    return arr.map(item => mapToCamelCase<T>(item));
};

type SupabaseLikeError = {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
};

const getErrorText = (error: SupabaseLikeError | null | undefined): string => {
    return `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
};

const isNoRowsError = (error: SupabaseLikeError | null | undefined): boolean => {
    return error?.code === 'PGRST116';
};

const isMissingTableError = (error: SupabaseLikeError | null | undefined): boolean => {
    return error?.code === '42P01';
};

const isMissingColumnError = (error: SupabaseLikeError | null | undefined, column?: string): boolean => {
    const text = getErrorText(error);
    if (error?.code === '42703' || error?.code === 'PGRST204') return true;
    if (column && text.includes(column.toLowerCase())) return true;
    return text.includes('column') && text.includes('does not exist')
        || text.includes('could not find the')
        || text.includes('not found in the schema cache');
};

const isRecoverableSchemaError = (error: SupabaseLikeError | null | undefined): boolean => {
    return Boolean(error && (isMissingColumnError(error) || error.code === 'PGRST100'));
};

const compactObject = <T extends Record<string, unknown>>(obj: T): Record<string, unknown> => {
    return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined)
    );
};

const toNumberOrUndefined = (value: unknown): number | undefined => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const n = Number(value);
        return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
};

const getCurrentHospitalId = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('userHospitalId');
};

const withHospitalFilter = <T>(query: T, column: string = 'hospital_id'): T => {
    const hospitalId = getCurrentHospitalId();
    if (!hospitalId) return query;
    return (query as { eq: (col: string, value: string) => T }).eq(column, hospitalId);
};

const withHospitalPayload = <T extends Record<string, unknown>>(payload: T): T => {
    const hospitalId = getCurrentHospitalId();
    if (!hospitalId) return payload;
    if (payload.hospitalId || payload.hospital_id) return payload;
    return { ...payload, hospitalId } as T;
};

const buildLegacyPrescriptionPayload = (prescription: Partial<Prescription>): Record<string, unknown> => {
    const therapyType = prescription.therapyType || 'enteral';
    const feedingRoutes: Record<string, unknown> = {
        oral: therapyType === 'oral',
        enteral: therapyType === 'enteral',
        parenteral: therapyType === 'parenteral',
        systemType: prescription.systemType,
        feedingRoute: prescription.feedingRoute,
        infusionMode: prescription.infusionMode,
        infusionRateMlH: prescription.infusionRateMlH,
        infusionDropsMin: prescription.infusionDropsMin,
        infusionHoursPerDay: prescription.infusionHoursPerDay,
        equipmentVolume: prescription.equipmentVolume,
    };

    const hydration: Record<string, unknown> = {
        volume: prescription.hydrationVolume,
        times: prescription.hydrationSchedules,
    };

    const totalNutrition: Record<string, unknown> = {
        calories: prescription.totalCalories,
        protein: prescription.totalProtein,
        carbs: prescription.totalCarbs,
        fat: prescription.totalFat,
        fiber: prescription.totalFiber,
        volume: prescription.totalVolume,
        freeWater: prescription.totalFreeWater,
        nursingTimeMinutes: prescription.nursingTimeMinutes,
        nursingCostTotal: prescription.nursingCostTotal,
        materialCostTotal: prescription.materialCostTotal,
        totalCost: prescription.totalCost,
    };

    return compactObject({
        patientId: prescription.patientId,
        professionalId: prescription.professionalId,
        patientName: prescription.patientName,
        patientRecord: prescription.patientRecord,
        therapyType,
        feedingRoutes: compactObject(feedingRoutes),
        formulas: prescription.formulas || [],
        modules: prescription.modules || [],
        hydration: compactObject(hydration),
        parenteral: therapyType === 'parenteral' ? { infusionMode: prescription.infusionMode } : undefined,
        oralDiet: therapyType === 'oral' ? { notes: prescription.notes } : undefined,
        tnoList: [],
        nonIntentionalCalories: 0,
        totalNutrition: compactObject(totalNutrition),
    });
};

const normalizePrescription = (record: Record<string, unknown>): Prescription => {
    const mapped = mapToCamelCase<Prescription & {
        hydration?: Record<string, unknown>;
        totalNutrition?: Record<string, unknown>;
        feedingRoutes?: Record<string, unknown>;
    }>(record);

    const hydration = mapped.hydration || {};
    const totalNutrition = mapped.totalNutrition || {};
    const feedingRoutes = mapped.feedingRoutes || {};

    const createdAtDate = typeof mapped.createdAt === 'string'
        ? mapped.createdAt.slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    return {
        ...mapped,
        formulas: Array.isArray(mapped.formulas) ? mapped.formulas : [],
        modules: Array.isArray(mapped.modules) ? mapped.modules : [],
        therapyType: mapped.therapyType || (feedingRoutes.enteral ? 'enteral' : feedingRoutes.parenteral ? 'parenteral' : 'oral'),
        systemType: mapped.systemType || (feedingRoutes.systemType === 'closed' ? 'closed' : 'open'),
        hydrationVolume: mapped.hydrationVolume ?? toNumberOrUndefined(hydration.volume),
        hydrationSchedules: mapped.hydrationSchedules ?? (Array.isArray(hydration.times) ? hydration.times as string[] : undefined),
        totalCalories: mapped.totalCalories ?? toNumberOrUndefined(totalNutrition.calories ?? totalNutrition.kcal),
        totalProtein: mapped.totalProtein ?? toNumberOrUndefined(totalNutrition.protein),
        totalCarbs: mapped.totalCarbs ?? toNumberOrUndefined(totalNutrition.carbs),
        totalFat: mapped.totalFat ?? toNumberOrUndefined(totalNutrition.fat),
        totalFiber: mapped.totalFiber ?? toNumberOrUndefined(totalNutrition.fiber),
        totalVolume: mapped.totalVolume ?? toNumberOrUndefined(totalNutrition.volume),
        totalFreeWater: mapped.totalFreeWater ?? toNumberOrUndefined(totalNutrition.freeWater),
        status: mapped.status || 'active',
        startDate: mapped.startDate || createdAtDate,
    };
};

const normalizePrescriptionArray = (rows: Record<string, unknown>[]): Prescription[] => {
    return rows.map(normalizePrescription);
};

// ============================================
// CRUD SERVICES - Using Supabase
// ============================================

// --- PATIENTS ---
export const patientsService = {
    async getAll(): Promise<Patient[]> {
        const query = withHospitalFilter(
            supabase
            .from('patients')
            .select('*')
            .order('name')
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<Patient>(data || []);
    },

    async getById(id: string): Promise<Patient | undefined> {
        const query = withHospitalFilter(
            supabase
            .from('patients')
            .select('*')
            .eq('id', id)
        );
        const { data, error } = await query.single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<Patient>(data) : undefined;
    },

    async getByRecord(record: string): Promise<Patient | undefined> {
        const query = withHospitalFilter(
            supabase
            .from('patients')
            .select('*')
            .eq('record', record)
        );
        const { data, error } = await query.single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<Patient>(data) : undefined;
    },

    async getActive(): Promise<Patient[]> {
        const query = withHospitalFilter(
            supabase
            .from('patients')
            .select('*')
            .eq('status', 'active')
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<Patient>(data || []);
    },

    async create(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const payload = withHospitalPayload(patient as Record<string, unknown>);
        const { data, error } = await supabase
            .from('patients')
            .insert(mapToSnakeCase(payload))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Patient>): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('patients')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('patients')
            .delete()
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    },

    async search(query: string): Promise<Patient[]> {
        const scopedQuery = withHospitalFilter(
            supabase
            .from('patients')
            .select('*')
            .or(`name.ilike.%${query}%,record.ilike.%${query}%`)
        );
        const { data, error } = await scopedQuery;
        if (error) throw error;
        return mapArrayToCamelCase<Patient>(data || []);
    }
};

// --- FORMULAS ---
export const formulasService = {
    async getAll(): Promise<Formula[]> {
        const query = withHospitalFilter(
            supabase
            .from('formulas')
            .select('*')
            .order('name')
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<Formula>(data || []);
    },

    async getById(id: string): Promise<Formula | undefined> {
        const query = withHospitalFilter(
            supabase
            .from('formulas')
            .select('*')
            .eq('id', id)
        );
        const { data, error } = await query.single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<Formula>(data) : undefined;
    },

    async getActive(): Promise<Formula[]> {
        const query = withHospitalFilter(
            supabase
            .from('formulas')
            .select('*')
            .eq('is_active', true)
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<Formula>(data || []);
    },

    async getBySystem(systemType: 'open' | 'closed'): Promise<Formula[]> {
        const query = withHospitalFilter(
            supabase
            .from('formulas')
            .select('*')
            .or(`system_type.eq.${systemType},system_type.eq.both`)
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<Formula>(data || []);
    },

    async create(formula: Omit<Formula, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const payload = withHospitalPayload(formula as Record<string, unknown>);
        const { data, error } = await supabase
            .from('formulas')
            .insert(mapToSnakeCase(payload))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Formula>): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('formulas')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('formulas')
            .delete()
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    },

    async search(query: string): Promise<Formula[]> {
        const scopedQuery = withHospitalFilter(
            supabase
            .from('formulas')
            .select('*')
            .or(`name.ilike.%${query}%,code.ilike.%${query}%,manufacturer.ilike.%${query}%`)
        );
        const { data, error } = await scopedQuery;
        if (error) throw error;
        return mapArrayToCamelCase<Formula>(data || []);
    }
};

// --- MODULES ---
export const modulesService = {
    async getAll(): Promise<Module[]> {
        const query = withHospitalFilter(
            supabase
            .from('modules')
            .select('*')
            .order('name')
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<Module>(data || []);
    },

    async getById(id: string): Promise<Module | undefined> {
        const query = withHospitalFilter(
            supabase
            .from('modules')
            .select('*')
            .eq('id', id)
        );
        const { data, error } = await query.single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<Module>(data) : undefined;
    },

    async create(module: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const payload = withHospitalPayload(module as Record<string, unknown>);
        const { data, error } = await supabase
            .from('modules')
            .insert(mapToSnakeCase(payload))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Module>): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('modules')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('modules')
            .delete()
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    }
};

// --- SUPPLIES ---
export const suppliesService = {
    async getAll(): Promise<Supply[]> {
        const query = withHospitalFilter(
            supabase
            .from('supplies')
            .select('*')
            .order('name')
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<Supply>(data || []);
    },

    async getById(id: string): Promise<Supply | undefined> {
        const query = withHospitalFilter(
            supabase
            .from('supplies')
            .select('*')
            .eq('id', id)
        );
        const { data, error } = await query.single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<Supply>(data) : undefined;
    },

    async getActive(): Promise<Supply[]> {
        const query = withHospitalFilter(
            supabase
            .from('supplies')
            .select('*')
            .eq('is_active', true)
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<Supply>(data || []);
    },

    async create(supply: Omit<Supply, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const payload = withHospitalPayload(supply as Record<string, unknown>);
        const { data, error } = await supabase
            .from('supplies')
            .insert(mapToSnakeCase(payload))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Supply>): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('supplies')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('supplies')
            .delete()
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    }
};

// --- PROFESSIONALS ---
export const professionalsService = {
    async getAll(): Promise<Professional[]> {
        const query = withHospitalFilter(
            supabase
            .from('professionals')
            .select('*')
            .order('name')
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<Professional>(data || []);
    },

    async getByHospital(hospitalId: string): Promise<Professional[]> {
        const { data, error } = await supabase
            .from('professionals')
            .select('*')
            .eq('hospital_id', hospitalId)
            .order('name');
        if (error) throw error;
        return mapArrayToCamelCase<Professional>(data || []);
    },

    async getById(id: string): Promise<Professional | undefined> {
        const query = withHospitalFilter(
            supabase
            .from('professionals')
            .select('*')
            .eq('id', id)
        );
        const { data, error } = await query.single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<Professional>(data) : undefined;
    },

    async getActive(): Promise<Professional[]> {
        const query = withHospitalFilter(
            supabase
            .from('professionals')
            .select('*')
            .eq('is_active', true)
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<Professional>(data || []);
    },

    async create(professional: Omit<Professional, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const payload = withHospitalPayload(professional as Record<string, unknown>);
        const { data, error } = await supabase
            .from('professionals')
            .insert(mapToSnakeCase(payload))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Professional>): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('professionals')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('professionals')
            .delete()
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    }
};

// --- PRESCRIPTIONS ---
export const prescriptionsService = {
    async getAll(): Promise<Prescription[]> {
        const query = withHospitalFilter(
            supabase
            .from('prescriptions')
            .select('*')
            .order('created_at', { ascending: false })
        );
        const { data, error } = await query;
        if (error) throw error;
        return normalizePrescriptionArray(data || []);
    },

    async getById(id: string): Promise<Prescription | undefined> {
        const query = withHospitalFilter(
            supabase
            .from('prescriptions')
            .select('*')
            .eq('id', id)
        );
        const { data, error } = await query.single();
        if (error && !isNoRowsError(error)) throw error;
        return data ? normalizePrescription(data) : undefined;
    },

    async getByPatient(patientId: string): Promise<Prescription[]> {
        const query = withHospitalFilter(
            supabase
            .from('prescriptions')
            .select('*')
            .eq('patient_id', patientId)
        );
        const { data, error } = await query;
        if (error) throw error;
        return normalizePrescriptionArray(data || []);
    },

    async getActive(): Promise<Prescription[]> {
        const query = withHospitalFilter(
            supabase
            .from('prescriptions')
            .select('*')
            .eq('status', 'active')
        );
        const { data, error } = await query;
        if (error && isMissingColumnError(error, 'status')) {
            const fallbackQuery = withHospitalFilter(
                supabase
                .from('prescriptions')
                .select('*')
            );
            const fallback = await fallbackQuery;
            if (fallback.error) throw fallback.error;
            return normalizePrescriptionArray((fallback.data || []).filter((row) => {
                const mapped = normalizePrescription(row);
                return mapped.status === 'active';
            }));
        }
        if (error) throw error;
        return normalizePrescriptionArray(data || []);
    },

    async getByDate(date: string): Promise<Prescription[]> {
        const query = withHospitalFilter(
            supabase
            .from('prescriptions')
            .select('*')
            .lte('start_date', date)
            .or(`end_date.gte.${date},end_date.is.null`)
        );
        const { data, error } = await query;
        if (error && isMissingColumnError(error, 'start_date')) {
            const fallbackQuery = withHospitalFilter(
                supabase
                .from('prescriptions')
                .select('*')
            );
            const fallback = await fallbackQuery;
            if (fallback.error) throw fallback.error;
            return normalizePrescriptionArray((fallback.data || []).filter((row) => {
                const mapped = normalizePrescription(row);
                return mapped.startDate <= date && (!mapped.endDate || mapped.endDate >= date);
            }));
        }
        if (error) throw error;
        return normalizePrescriptionArray(data || []);
    },

    async create(prescription: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const modernPayload = compactObject(withHospitalPayload(prescription as Record<string, unknown>));
        const legacyPayload = compactObject(withHospitalPayload(buildLegacyPrescriptionPayload(prescription)));

        const payloadCandidates = [
            modernPayload,
            legacyPayload,
            compactObject((() => {
                const clone = { ...modernPayload };
                delete clone.hospitalId;
                delete clone.hospital_id;
                return clone;
            })()),
            compactObject((() => {
                const clone = { ...legacyPayload };
                delete clone.hospitalId;
                delete clone.hospital_id;
                return clone;
            })()),
        ];

        let lastError: SupabaseLikeError | null = null;
        for (const payload of payloadCandidates) {
            const { data, error } = await supabase
                .from('prescriptions')
                .insert(mapToSnakeCase(payload))
                .select('id')
                .single();

            if (!error) return data.id;
            lastError = error;
            if (!isRecoverableSchemaError(error)) break;
        }

        throw lastError;
    },

    async update(id: string, data: Partial<Prescription>): Promise<void> {
        const modernPayload = compactObject(withHospitalPayload(data as Record<string, unknown>));
        const legacyPayload = compactObject(withHospitalPayload(buildLegacyPrescriptionPayload(data)));

        const payloadCandidates = [
            modernPayload,
            legacyPayload,
            compactObject((() => {
                const clone = { ...modernPayload };
                delete clone.hospitalId;
                delete clone.hospital_id;
                return clone;
            })()),
            compactObject((() => {
                const clone = { ...legacyPayload };
                delete clone.hospitalId;
                delete clone.hospital_id;
                return clone;
            })()),
        ];

        let lastError: SupabaseLikeError | null = null;

        for (const payload of payloadCandidates) {
            const scopedQuery = withHospitalFilter(
                supabase
                .from('prescriptions')
                .update(mapToSnakeCase(payload))
                .eq('id', id)
            );
            let { error } = await scopedQuery;

            if (error && isMissingColumnError(error, 'hospital_id')) {
                const unscoped = await supabase
                    .from('prescriptions')
                    .update(mapToSnakeCase(payload))
                    .eq('id', id);
                error = unscoped.error;
            }

            if (!error) return;
            lastError = error;
            if (!isRecoverableSchemaError(error)) break;
        }

        throw lastError;
    },

    async delete(id: string): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('prescriptions')
            .delete()
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    }
};

// --- DAILY EVOLUTIONS ---
export const evolutionsService = {
    async getAll(): Promise<DailyEvolution[]> {
        const query = withHospitalFilter(
            supabase
            .from('daily_evolutions')
            .select('*')
            .order('date', { ascending: false })
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<DailyEvolution>(data || []);
    },

    async getByPatient(patientId: string): Promise<DailyEvolution[]> {
        const query = withHospitalFilter(
            supabase
            .from('daily_evolutions')
            .select('*')
            .eq('patient_id', patientId)
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<DailyEvolution>(data || []);
    },

    async getByDate(date: string): Promise<DailyEvolution[]> {
        const query = withHospitalFilter(
            supabase
            .from('daily_evolutions')
            .select('*')
            .eq('date', date)
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<DailyEvolution>(data || []);
    },

    async create(evolution: Omit<DailyEvolution, 'id' | 'createdAt'>): Promise<string> {
        const payload = compactObject(withHospitalPayload(evolution as Record<string, unknown>));
        const { data, error } = await supabase
            .from('daily_evolutions')
            .insert(mapToSnakeCase(payload))
            .select('id')
            .single();

        if (!error) return data.id;
        if (isMissingColumnError(error, 'notes')) {
            const fallbackPayload = { ...payload };
            delete fallbackPayload.notes;
            const fallback = await supabase
                .from('daily_evolutions')
                .insert(mapToSnakeCase(fallbackPayload))
                .select('id')
                .single();
            if (fallback.error) throw fallback.error;
            return fallback.data.id;
        }
        throw error;
    },

    async update(id: string, data: Partial<DailyEvolution>): Promise<void> {
        const payload = compactObject(data as Record<string, unknown>);
        const query = withHospitalFilter(
            supabase
            .from('daily_evolutions')
            .update(mapToSnakeCase(payload))
            .eq('id', id)
        );
        let { error } = await query;

        if (error && isMissingColumnError(error, 'notes')) {
            const fallbackPayload = { ...payload };
            delete fallbackPayload.notes;
            const fallbackQuery = withHospitalFilter(
                supabase
                .from('daily_evolutions')
                .update(mapToSnakeCase(fallbackPayload))
                .eq('id', id)
            );
            const fallback = await fallbackQuery;
            error = fallback.error;
        }

        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('daily_evolutions')
            .delete()
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    }
};

// --- CLINICS ---
export const clinicsService = {
    async getAll(): Promise<Clinic[]> {
        const query = withHospitalFilter(
            supabase
            .from('clinics')
            .select('*')
            .order('name')
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<Clinic>(data || []);
    },

    async getActive(): Promise<Clinic[]> {
        const query = withHospitalFilter(
            supabase
            .from('clinics')
            .select('*')
            .eq('is_active', true)
        );
        const { data, error } = await query;
        if (error) throw error;
        return mapArrayToCamelCase<Clinic>(data || []);
    },

    async create(clinic: Omit<Clinic, 'id' | 'createdAt'>): Promise<string> {
        const payload = withHospitalPayload(clinic as Record<string, unknown>);
        const { data, error } = await supabase
            .from('clinics')
            .insert(mapToSnakeCase(payload))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Clinic>): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('clinics')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const query = withHospitalFilter(
            supabase
            .from('clinics')
            .delete()
            .eq('id', id)
        );
        const { error } = await query;
        if (error) throw error;
    }
};

// --- HOSPITALS ---
export const hospitalsService = {
    async getAll(): Promise<Hospital[]> {
        const { data, error } = await supabase
            .from('hospitals')
            .select('*')
            .order('name');
        if (error) throw error;
        return mapArrayToCamelCase<Hospital>(data || []);
    },

    async getActive(): Promise<Hospital[]> {
        const { data, error } = await supabase
            .from('hospitals')
            .select('*')
            .eq('is_active', true);
        if (error) throw error;
        return mapArrayToCamelCase<Hospital>(data || []);
    },

    async create(hospital: Omit<Hospital, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const { data, error } = await supabase
            .from('hospitals')
            .insert(mapToSnakeCase(hospital as Record<string, unknown>))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Hospital>): Promise<void> {
        const { error } = await supabase
            .from('hospitals')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('hospitals')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

// --- WARDS ---
export const wardsService = {
    async getAll(): Promise<Ward[]> {
        const { data, error } = await supabase
            .from('wards')
            .select('*')
            .order('name');
        if (error) throw error;
        return mapArrayToCamelCase<Ward>(data || []);
    },

    async getByHospital(hospitalId: string): Promise<Ward[]> {
        const { data, error } = await supabase
            .from('wards')
            .select('*')
            .eq('hospital_id', hospitalId);
        if (error) throw error;
        return mapArrayToCamelCase<Ward>(data || []);
    },

    async getActive(): Promise<Ward[]> {
        const { data, error } = await supabase
            .from('wards')
            .select('*')
            .eq('is_active', true);
        if (error) throw error;
        return mapArrayToCamelCase<Ward>(data || []);
    },

    async create(ward: Omit<Ward, 'id' | 'createdAt'>): Promise<string> {
        const { data, error } = await supabase
            .from('wards')
            .insert(mapToSnakeCase(ward as Record<string, unknown>))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Ward>): Promise<void> {
        const { error } = await supabase
            .from('wards')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('wards')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

// --- ROLE PERMISSIONS ---
export const rolePermissionsService = {
    async getAll(): Promise<RolePermission[]> {
        const { data, error } = await supabase
            .from('role_permissions')
            .select('*')
            .order('role')
            .order('permission_key');

        // Table may not exist yet in older environments
        if (error && (error as { code?: string }).code === '42P01') return [];
        if (error) throw error;
        return mapArrayToCamelCase<RolePermission>(data || []);
    },
};

// --- APP TOOLS CATALOG ---
export const appToolsService = {
    async getAll(): Promise<AppTool[]> {
        const hospitalId = getCurrentHospitalId();
        const buildBaseQuery = () => supabase
            .from('app_tools')
            .select('*')
            .eq('is_active', true)
            .order('category')
            .order('name');

        let data: Record<string, unknown>[] | null = null;
        let error: SupabaseLikeError | null = null;

        if (hospitalId) {
            const scopedResult = await buildBaseQuery().or(`hospital_id.eq.${hospitalId},hospital_id.is.null`);
            data = scopedResult.data;
            error = scopedResult.error;

            if (error && (isMissingColumnError(error, 'hospital_id') || error.code === 'PGRST100')) {
                const fallbackResult = await buildBaseQuery();
                data = fallbackResult.data;
                error = fallbackResult.error;
            }
        } else {
            const result = await buildBaseQuery();
            data = result.data;
            error = result.error;
        }

        if (error && isMissingTableError(error)) return [];
        if (error) throw error;
        return mapArrayToCamelCase<AppTool>(data || []);
    },
};

// --- SETTINGS ---
export const settingsService = {
    async get(): Promise<AppSettings | undefined> {
        const hospitalId = getCurrentHospitalId();
        const buildQuery = () => {
            let query = supabase
                .from('app_settings')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(1);
            if (hospitalId) {
                query = query.eq('hospital_id', hospitalId);
            }
            return query;
        };

        let { data, error } = await buildQuery().maybeSingle();

        if (error && isMissingColumnError(error, 'hospital_id')) {
            const fallback = await supabase
                .from('app_settings')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            data = fallback.data;
            error = fallback.error;
        }

        if (error && isMissingTableError(error)) return undefined;
        if (error && !isNoRowsError(error)) throw error;
        return data ? mapToCamelCase<AppSettings>(data) : undefined;
    },

    async save(settings: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
        const existing = await this.get();
        const payload = withHospitalPayload(settings as Record<string, unknown>);

        if (existing?.id) {
            const { error } = await supabase
                .from('app_settings')
                .update(mapToSnakeCase(payload))
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('app_settings')
                .insert(mapToSnakeCase(payload));
            if (error) throw error;
        }
    }
};

// ============================================
// DATABASE INITIALIZATION (for hooks compatibility)
// ============================================

export const initializeDatabase = async (): Promise<void> => {
    // Database is in Supabase - no local initialization needed
    console.log('✅ Connected to Supabase database');
};

// Export supabase client for direct access if needed
export { supabase };
export const db = supabase; // Alias for compatibility
