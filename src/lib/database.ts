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
    code: string;
    name: string;
    manufacturer: string;
    type: 'standard' | 'high-protein' | 'high-calorie' | 'diabetic' | 'renal' | 'peptide' | 'fiber' | 'immune';
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
    name: string;
    role: 'manager' | 'nutritionist' | 'technician';
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
}

export interface Prescription {
    id?: string;
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
    patientId: string;
    prescriptionId: string;
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
    name: string;
    code: string;
    type: 'uti-adulto' | 'uti-pediatrica' | 'enfermaria' | 'ambulatorio' | 'other';
    isActive: boolean;
    createdAt: string;
}

export interface AppSettings {
    id?: string;
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

// ============================================
// CRUD SERVICES - Using Supabase
// ============================================

// --- PATIENTS ---
export const patientsService = {
    async getAll(): Promise<Patient[]> {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('name');
        if (error) throw error;
        return mapArrayToCamelCase<Patient>(data || []);
    },

    async getById(id: string): Promise<Patient | undefined> {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<Patient>(data) : undefined;
    },

    async getByRecord(record: string): Promise<Patient | undefined> {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('record', record)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<Patient>(data) : undefined;
    },

    async getActive(): Promise<Patient[]> {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('status', 'active');
        if (error) throw error;
        return mapArrayToCamelCase<Patient>(data || []);
    },

    async create(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const { data, error } = await supabase
            .from('patients')
            .insert(mapToSnakeCase(patient as Record<string, unknown>))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Patient>): Promise<void> {
        const { error } = await supabase
            .from('patients')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async search(query: string): Promise<Patient[]> {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .or(`name.ilike.%${query}%,record.ilike.%${query}%`);
        if (error) throw error;
        return mapArrayToCamelCase<Patient>(data || []);
    }
};

// --- FORMULAS ---
export const formulasService = {
    async getAll(): Promise<Formula[]> {
        const { data, error } = await supabase
            .from('formulas')
            .select('*')
            .order('name');
        if (error) throw error;
        return mapArrayToCamelCase<Formula>(data || []);
    },

    async getById(id: string): Promise<Formula | undefined> {
        const { data, error } = await supabase
            .from('formulas')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<Formula>(data) : undefined;
    },

    async getActive(): Promise<Formula[]> {
        const { data, error } = await supabase
            .from('formulas')
            .select('*')
            .eq('is_active', true);
        if (error) throw error;
        return mapArrayToCamelCase<Formula>(data || []);
    },

    async getBySystem(systemType: 'open' | 'closed'): Promise<Formula[]> {
        const { data, error } = await supabase
            .from('formulas')
            .select('*')
            .or(`system_type.eq.${systemType},system_type.eq.both`);
        if (error) throw error;
        return mapArrayToCamelCase<Formula>(data || []);
    },

    async create(formula: Omit<Formula, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const { data, error } = await supabase
            .from('formulas')
            .insert(mapToSnakeCase(formula as Record<string, unknown>))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Formula>): Promise<void> {
        const { error } = await supabase
            .from('formulas')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('formulas')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async search(query: string): Promise<Formula[]> {
        const { data, error } = await supabase
            .from('formulas')
            .select('*')
            .or(`name.ilike.%${query}%,code.ilike.%${query}%,manufacturer.ilike.%${query}%`);
        if (error) throw error;
        return mapArrayToCamelCase<Formula>(data || []);
    }
};

// --- MODULES ---
export const modulesService = {
    async getAll(): Promise<Module[]> {
        const { data, error } = await supabase
            .from('modules')
            .select('*')
            .order('name');
        if (error) throw error;
        return mapArrayToCamelCase<Module>(data || []);
    },

    async getById(id: string): Promise<Module | undefined> {
        const { data, error } = await supabase
            .from('modules')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<Module>(data) : undefined;
    },

    async create(module: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const { data, error } = await supabase
            .from('modules')
            .insert(mapToSnakeCase(module as Record<string, unknown>))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Module>): Promise<void> {
        const { error } = await supabase
            .from('modules')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('modules')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

// --- SUPPLIES ---
export const suppliesService = {
    async getAll(): Promise<Supply[]> {
        const { data, error } = await supabase
            .from('supplies')
            .select('*')
            .order('name');
        if (error) throw error;
        return mapArrayToCamelCase<Supply>(data || []);
    },

    async getById(id: string): Promise<Supply | undefined> {
        const { data, error } = await supabase
            .from('supplies')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<Supply>(data) : undefined;
    },

    async getActive(): Promise<Supply[]> {
        const { data, error } = await supabase
            .from('supplies')
            .select('*')
            .eq('is_active', true);
        if (error) throw error;
        return mapArrayToCamelCase<Supply>(data || []);
    },

    async create(supply: Omit<Supply, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const { data, error } = await supabase
            .from('supplies')
            .insert(mapToSnakeCase(supply as Record<string, unknown>))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Supply>): Promise<void> {
        const { error } = await supabase
            .from('supplies')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('supplies')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

// --- PROFESSIONALS ---
export const professionalsService = {
    async getAll(): Promise<Professional[]> {
        const { data, error } = await supabase
            .from('professionals')
            .select('*')
            .order('name');
        if (error) throw error;
        return mapArrayToCamelCase<Professional>(data || []);
    },

    async getById(id: string): Promise<Professional | undefined> {
        const { data, error } = await supabase
            .from('professionals')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<Professional>(data) : undefined;
    },

    async getActive(): Promise<Professional[]> {
        const { data, error } = await supabase
            .from('professionals')
            .select('*')
            .eq('is_active', true);
        if (error) throw error;
        return mapArrayToCamelCase<Professional>(data || []);
    },

    async create(professional: Omit<Professional, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const { data, error } = await supabase
            .from('professionals')
            .insert(mapToSnakeCase(professional as Record<string, unknown>))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Professional>): Promise<void> {
        const { error } = await supabase
            .from('professionals')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('professionals')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

// --- PRESCRIPTIONS ---
export const prescriptionsService = {
    async getAll(): Promise<Prescription[]> {
        const { data, error } = await supabase
            .from('prescriptions')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return mapArrayToCamelCase<Prescription>(data || []);
    },

    async getById(id: string): Promise<Prescription | undefined> {
        const { data, error } = await supabase
            .from('prescriptions')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<Prescription>(data) : undefined;
    },

    async getByPatient(patientId: string): Promise<Prescription[]> {
        const { data, error } = await supabase
            .from('prescriptions')
            .select('*')
            .eq('patient_id', patientId);
        if (error) throw error;
        return mapArrayToCamelCase<Prescription>(data || []);
    },

    async getActive(): Promise<Prescription[]> {
        const { data, error } = await supabase
            .from('prescriptions')
            .select('*')
            .eq('status', 'active');
        if (error) throw error;
        return mapArrayToCamelCase<Prescription>(data || []);
    },

    async getByDate(date: string): Promise<Prescription[]> {
        const { data, error } = await supabase
            .from('prescriptions')
            .select('*')
            .lte('start_date', date)
            .or(`end_date.gte.${date},end_date.is.null`);
        if (error) throw error;
        return mapArrayToCamelCase<Prescription>(data || []);
    },

    async create(prescription: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const { data, error } = await supabase
            .from('prescriptions')
            .insert(mapToSnakeCase(prescription as Record<string, unknown>))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Prescription>): Promise<void> {
        const { error } = await supabase
            .from('prescriptions')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('prescriptions')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

// --- DAILY EVOLUTIONS ---
export const evolutionsService = {
    async getAll(): Promise<DailyEvolution[]> {
        const { data, error } = await supabase
            .from('daily_evolutions')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        return mapArrayToCamelCase<DailyEvolution>(data || []);
    },

    async getByPatient(patientId: string): Promise<DailyEvolution[]> {
        const { data, error } = await supabase
            .from('daily_evolutions')
            .select('*')
            .eq('patient_id', patientId);
        if (error) throw error;
        return mapArrayToCamelCase<DailyEvolution>(data || []);
    },

    async getByDate(date: string): Promise<DailyEvolution[]> {
        const { data, error } = await supabase
            .from('daily_evolutions')
            .select('*')
            .eq('date', date);
        if (error) throw error;
        return mapArrayToCamelCase<DailyEvolution>(data || []);
    },

    async create(evolution: Omit<DailyEvolution, 'id' | 'createdAt'>): Promise<string> {
        const { data, error } = await supabase
            .from('daily_evolutions')
            .insert(mapToSnakeCase(evolution as Record<string, unknown>))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<DailyEvolution>): Promise<void> {
        const { error } = await supabase
            .from('daily_evolutions')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('daily_evolutions')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

// --- CLINICS ---
export const clinicsService = {
    async getAll(): Promise<Clinic[]> {
        const { data, error } = await supabase
            .from('clinics')
            .select('*')
            .order('name');
        if (error) throw error;
        return mapArrayToCamelCase<Clinic>(data || []);
    },

    async getActive(): Promise<Clinic[]> {
        const { data, error } = await supabase
            .from('clinics')
            .select('*')
            .eq('is_active', true);
        if (error) throw error;
        return mapArrayToCamelCase<Clinic>(data || []);
    },

    async create(clinic: Omit<Clinic, 'id' | 'createdAt'>): Promise<string> {
        const { data, error } = await supabase
            .from('clinics')
            .insert(mapToSnakeCase(clinic as Record<string, unknown>))
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    },

    async update(id: string, data: Partial<Clinic>): Promise<void> {
        const { error } = await supabase
            .from('clinics')
            .update(mapToSnakeCase(data as Record<string, unknown>))
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('clinics')
            .delete()
            .eq('id', id);
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

// --- SETTINGS ---
export const settingsService = {
    async get(): Promise<AppSettings | undefined> {
        const { data, error } = await supabase
            .from('app_settings')
            .select('*')
            .limit(1)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? mapToCamelCase<AppSettings>(data) : undefined;
    },

    async save(settings: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
        const existing = await this.get();

        if (existing?.id) {
            const { error } = await supabase
                .from('app_settings')
                .update(mapToSnakeCase(settings as Record<string, unknown>))
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('app_settings')
                .insert(mapToSnakeCase(settings as Record<string, unknown>));
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
