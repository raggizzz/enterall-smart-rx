/**
 * EnterAll Smart RX - Local Database (IndexedDB)
 * 100% Offline-First Solution for Hospital Use
 * 
 * Uses Dexie.js as IndexedDB wrapper for reliable local storage
 */

import Dexie, { Table } from 'dexie';

// ============================================
// INTERFACES - Tipos de dados
// ============================================

// Motivos de Interrupção da TNE
export interface TNEInterruptions {
    // Procedimentos
    procedures?: {
        airways?: boolean; // IOT, extubação, traqueostomia
        therapeutic?: boolean; // cirurgias, diálise, drenagens, jejum medicações
        diagnostic?: boolean; // exames imagem, endoscópicos
        nursing?: boolean; // banho, mudança decúbito, curativos
    };
    // Eventos Gastrointestinais
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
    // Problemas com dispositivos
    deviceProblems?: {
        obstruction?: boolean;
        displacement?: boolean;
        unplannedRemoval?: boolean;
    };
    other?: string;
}

// Calorias Não Intencionais
export interface UnintentionalCalories {
    propofolMlH?: number; // ml/h - cálculo: 1.1 * ml * 24h
    glucoseGDay?: number; // g/dia - cálculo: g * 3.4
    citrateGDay?: number; // g/dia - cálculo: g * 3.0
}

// Metas para TNE
export interface TNEGoals {
    targetKcalPerKg?: number;
    targetProteinPerKgActual?: number;
    targetProteinPerKgIdeal?: number; // para pacientes com IMC > 30
}

export interface Patient {
    id?: string;
    name: string;
    record: string; // Prontuário
    dob: string;
    gender?: 'male' | 'female';
    weight?: number;
    height?: number;
    idealWeight?: number; // Peso ideal calculado (IMC 25)
    bed?: string;
    ward?: string;
    hospitalId?: string; // New field
    observation?: string;
    admissionDate?: string;
    status: 'active' | 'inactive' | 'discharged' | 'deceased';
    dischargeDate?: string;
    dischargeReason?: string;
    nutritionType: 'enteral' | 'parenteral' | 'oral' | 'jejum';

    // Metas para TNE
    tneGoals?: TNEGoals;

    // Acompanhamento TNE (últimas 24h)
    infusionPercentage24h?: number;
    tneInterruptions?: TNEInterruptions;

    // Calorias não intencionais
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

    // Composição
    caloriesPerUnit: number; // kcal/100ml or kcal/100g
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

    // Fontes de macronutrientes (para "Mais Detalhes")
    proteinSources?: string; // ex: "80% caseinato de cálcio e 20% soro do leite"
    carbSources?: string; // ex: "maltodextrina"
    fatSources?: string; // ex: "óleo de canola e TCM"
    fiberSources?: string; // ex: "50% FOS e 50% inulina"

    // Resíduos
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

    // Fontes de nutrientes (para "Mais Detalhes")
    proteinSources?: string; // ex: "100% proteína do soro de leite hidrolisado"
    carbSources?: string;
    fatSources?: string;
    fiberSources?: string; // ex: "100% goma guar"

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
    feedingRoute?: string; // sonda nasoenteral, gastrostomia, etc.

    // Modo de infusão
    infusionMode?: 'pump' | 'gravity' | 'bolus';
    infusionRateMlH?: number; // ml/h para bomba
    infusionDropsMin?: number; // gotas/min para gravitacional
    infusionHoursPerDay?: number; // horas por dia de infusão

    // Volume de equipo (para pediatria - apenas fórmulas líquidas em bomba)
    equipmentVolume?: number;

    formulas: PrescriptionFormula[];
    modules: PrescriptionModule[];

    // Hidratação
    hydrationVolume?: number;
    hydrationSchedules?: string[];

    // Totais calculados
    totalCalories?: number;
    totalProtein?: number;
    totalCarbs?: number;
    totalFat?: number;
    totalFiber?: number;
    totalVolume?: number;
    totalFreeWater?: number;

    // Cálculos de custos
    nursingTimeMinutes?: number; // tempo total de enfermagem em minutos
    nursingCostTotal?: number; // custo total de enfermagem
    materialCostTotal?: number; // custo de materiais
    totalCost?: number; // custo total da terapia

    // Status
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
    metaReached: number; // Percentage
    intercurrences?: string[];
    notes?: string;
    createdAt: string;
}

// ============================================
// DIETA ORAL INTERFACES
// ============================================

export interface OralSupplementSchedule {
    supplementId: string;
    supplementName: string;
    schedules: {
        breakfast?: boolean; // Desjejum
        midMorning?: boolean; // Colação
        lunch?: boolean; // Almoço
        afternoon?: boolean; // Merenda
        dinner?: boolean; // Jantar
        supper?: boolean; // Ceia
        other?: string; // Horário específico
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

    // Dados básicos da dieta
    dietConsistency?: string;
    dietCharacteristics?: string;
    mealsPerDay?: number;

    // Acompanhamento fonoaudiológico
    speechTherapy?: boolean;
    needsThickener?: boolean;
    safeConsistency?: string;

    // Estimativas
    estimatedVET?: number;
    estimatedProtein?: number;

    // Terapia nutricional oral
    hasOralTherapy?: boolean;
    supplements?: OralSupplementSchedule[]; // até 3 suplementos
    modules?: OralModuleSchedule[]; // até 3 módulos

    observations?: string;

    createdAt: string;
    updatedAt: string;
}

// ============================================
// NUTRIÇÃO PARENTERAL INTERFACES
// ============================================

export interface ParenteralTherapy {
    id?: string;
    patientId: string;

    access: 'central' | 'peripheral' | 'picc';
    infusionTime: number; // horas

    vetKcal?: number;
    aminoacidsG?: number;
    lipidsG?: number;
    glucoseG?: number;

    // TIG calculada: (glicose_g/kg/dia * 1000) / 60 / tempo_infusão
    // Resultado em mg/kg/min

    observations?: string;

    createdAt: string;
    updatedAt: string;
}

// ============================================
// CUSTOS DE ENFERMAGEM
// ============================================

export interface NursingCosts {
    // Tempos em segundos
    timeOpenSystemPump?: number; // Sistema aberto em bomba
    timeClosedSystemPump?: number; // Sistema fechado em bomba
    timeOpenSystemGravity?: number; // Sistema aberto gravitacional
    timeClosedSystemGravity?: number; // Sistema fechado gravitacional
    timeBolus?: number; // Frasco em bolus

    // Custo por hora de trabalho (R$)
    hourlyRate?: number;
}

export interface IndirectCosts {
    // Mão-de-obra de manipuladores, estoquistas, etc.
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

    // Custos de Enfermagem
    nursingCosts?: NursingCosts;

    // Custos Indiretos
    indirectCosts?: IndirectCosts;

    createdAt: string;
    updatedAt: string;
}

// ============================================
// DATABASE CLASS
// ============================================

export interface Hospital {
    id?: string;
    name: string;
    cnes?: string;
    cep?: string; // Changed from address to cep
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

// Database Schema
class EnterAllDatabase extends Dexie {
    patients!: Table<Patient>;
    formulas!: Table<Formula>;
    modules!: Table<Module>;
    supplies!: Table<Supply>;
    professionals!: Table<Professional>;
    prescriptions!: Table<Prescription>;
    dailyEvolutions!: Table<DailyEvolution>;
    clinics!: Table<Clinic>;
    settings!: Table<AppSettings>;
    hospitals!: Table<Hospital>; // New
    wards!: Table<Ward>; // New

    constructor() {
        super('EnterAllSmartRX');
        this.version(1).stores({
            patients: 'id, name, record, ward, status, hospitalId, createdAt',
            formulas: 'id, code, name, manufacturer, type, systemType, isActive',
            modules: 'id, name, isActive',
            supplies: 'id, code, name, type, isActive',
            professionals: 'id, name, role, registrationNumber, isActive',
            prescriptions: 'id, patientId, patientRecord, status, startDate, createdAt',
            dailyEvolutions: 'id, patientId, prescriptionId, date',
            clinics: 'id, code, name, isActive',
            settings: 'id',
            hospitals: 'id, name, isActive', // New
            wards: 'id, hospitalId, name, isActive' // New
        });
    }
}

// Singleton instance
export const db = new EnterAllDatabase();

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const generateId = (): string => {
    return crypto.randomUUID ? crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
};

export const now = (): string => new Date().toISOString();

// ============================================
// CRUD SERVICES
// ============================================

// --- PATIENTS ---
export const patientsService = {
    async getAll(): Promise<Patient[]> {
        return await db.patients.orderBy('name').toArray();
    },

    async getById(id: string): Promise<Patient | undefined> {
        return await db.patients.get(id);
    },

    async getByRecord(record: string): Promise<Patient | undefined> {
        return await db.patients.where('record').equals(record).first();
    },

    async getActive(): Promise<Patient[]> {
        return await db.patients.where('status').equals('active').toArray();
    },

    async create(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = generateId();
        const timestamp = now();
        await db.patients.add({
            ...patient,
            id,
            createdAt: timestamp,
            updatedAt: timestamp
        });
        return id;
    },

    async update(id: string, data: Partial<Patient>): Promise<void> {
        await db.patients.update(id, { ...data, updatedAt: now() });
    },

    async delete(id: string): Promise<void> {
        await db.patients.delete(id);
    },

    async search(query: string): Promise<Patient[]> {
        const lowerQuery = query.toLowerCase();
        return await db.patients
            .filter(p =>
                p.name.toLowerCase().includes(lowerQuery) ||
                p.record.toLowerCase().includes(lowerQuery)
            )
            .toArray();
    }
};

// --- FORMULAS ---
export const formulasService = {
    async getAll(): Promise<Formula[]> {
        return await db.formulas.orderBy('name').toArray();
    },

    async getById(id: string): Promise<Formula | undefined> {
        return await db.formulas.get(id);
    },

    async getActive(): Promise<Formula[]> {
        return await db.formulas.where('isActive').equals(1).toArray();
    },

    async getBySystem(systemType: 'open' | 'closed'): Promise<Formula[]> {
        return await db.formulas
            .filter(f => f.systemType === systemType || f.systemType === 'both')
            .toArray();
    },

    async create(formula: Omit<Formula, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = generateId();
        const timestamp = now();
        await db.formulas.add({
            ...formula,
            id,
            createdAt: timestamp,
            updatedAt: timestamp
        });
        return id;
    },

    async update(id: string, data: Partial<Formula>): Promise<void> {
        await db.formulas.update(id, { ...data, updatedAt: now() });
    },

    async delete(id: string): Promise<void> {
        await db.formulas.delete(id);
    },

    async search(query: string): Promise<Formula[]> {
        const lowerQuery = query.toLowerCase();
        return await db.formulas
            .filter(f =>
                f.name.toLowerCase().includes(lowerQuery) ||
                f.code.toLowerCase().includes(lowerQuery) ||
                f.manufacturer.toLowerCase().includes(lowerQuery)
            )
            .toArray();
    }
};

// --- MODULES ---
export const modulesService = {
    async getAll(): Promise<Module[]> {
        return await db.modules.orderBy('name').toArray();
    },

    async getById(id: string): Promise<Module | undefined> {
        return await db.modules.get(id);
    },

    async create(module: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = generateId();
        const timestamp = now();
        await db.modules.add({
            ...module,
            id,
            createdAt: timestamp,
            updatedAt: timestamp
        });
        return id;
    },

    async update(id: string, data: Partial<Module>): Promise<void> {
        await db.modules.update(id, { ...data, updatedAt: now() });
    },

    async delete(id: string): Promise<void> {
        await db.modules.delete(id);
    }
};

// --- SUPPLIES ---
export const suppliesService = {
    async getAll(): Promise<Supply[]> {
        return await db.supplies.orderBy('name').toArray();
    },

    async getById(id: string): Promise<Supply | undefined> {
        return await db.supplies.get(id);
    },

    async getActive(): Promise<Supply[]> {
        return await db.supplies.where('isActive').equals(1).toArray();
    },

    async create(supply: Omit<Supply, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = generateId();
        const timestamp = now();
        await db.supplies.add({
            ...supply,
            id,
            createdAt: timestamp,
            updatedAt: timestamp
        });
        return id;
    },

    async update(id: string, data: Partial<Supply>): Promise<void> {
        await db.supplies.update(id, { ...data, updatedAt: now() });
    },

    async delete(id: string): Promise<void> {
        await db.supplies.delete(id);
    }
};

// --- PROFESSIONALS ---
export const professionalsService = {
    async getAll(): Promise<Professional[]> {
        return await db.professionals.orderBy('name').toArray();
    },

    async getById(id: string): Promise<Professional | undefined> {
        return await db.professionals.get(id);
    },

    async getActive(): Promise<Professional[]> {
        return await db.professionals.where('isActive').equals(1).toArray();
    },

    async create(professional: Omit<Professional, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = generateId();
        const timestamp = now();
        await db.professionals.add({
            ...professional,
            id,
            createdAt: timestamp,
            updatedAt: timestamp
        });
        return id;
    },

    async update(id: string, data: Partial<Professional>): Promise<void> {
        await db.professionals.update(id, { ...data, updatedAt: now() });
    },

    async delete(id: string): Promise<void> {
        await db.professionals.delete(id);
    }
};

// --- PRESCRIPTIONS ---
export const prescriptionsService = {
    async getAll(): Promise<Prescription[]> {
        return await db.prescriptions.orderBy('createdAt').reverse().toArray();
    },

    async getById(id: string): Promise<Prescription | undefined> {
        return await db.prescriptions.get(id);
    },

    async getByPatient(patientId: string): Promise<Prescription[]> {
        return await db.prescriptions.where('patientId').equals(patientId).toArray();
    },

    async getActive(): Promise<Prescription[]> {
        return await db.prescriptions.where('status').equals('active').toArray();
    },

    async getByDate(date: string): Promise<Prescription[]> {
        return await db.prescriptions
            .filter(p => p.startDate <= date && (!p.endDate || p.endDate >= date))
            .toArray();
    },

    async create(prescription: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = generateId();
        const timestamp = now();
        await db.prescriptions.add({
            ...prescription,
            id,
            createdAt: timestamp,
            updatedAt: timestamp
        });
        return id;
    },

    async update(id: string, data: Partial<Prescription>): Promise<void> {
        await db.prescriptions.update(id, { ...data, updatedAt: now() });
    },

    async delete(id: string): Promise<void> {
        await db.prescriptions.delete(id);
    }
};

// --- DAILY EVOLUTIONS ---
export const evolutionsService = {
    async getAll(): Promise<DailyEvolution[]> {
        return await db.dailyEvolutions.orderBy('date').reverse().toArray();
    },

    async getByPatient(patientId: string): Promise<DailyEvolution[]> {
        return await db.dailyEvolutions.where('patientId').equals(patientId).toArray();
    },

    async getByDate(date: string): Promise<DailyEvolution[]> {
        return await db.dailyEvolutions.where('date').equals(date).toArray();
    },

    async create(evolution: Omit<DailyEvolution, 'id' | 'createdAt'>): Promise<string> {
        const id = generateId();
        await db.dailyEvolutions.add({
            ...evolution,
            id,
            createdAt: now()
        });
        return id;
    },

    async update(id: string, data: Partial<DailyEvolution>): Promise<void> {
        await db.dailyEvolutions.update(id, data);
    },

    async delete(id: string): Promise<void> {
        await db.dailyEvolutions.delete(id);
    }
};

// --- CLINICS ---
export const clinicsService = {
    async getAll(): Promise<Clinic[]> {
        return await db.clinics.orderBy('name').toArray();
    },

    async getActive(): Promise<Clinic[]> {
        return await db.clinics.where('isActive').equals(1).toArray();
    },

    async create(clinic: Omit<Clinic, 'id' | 'createdAt'>): Promise<string> {
        const id = generateId();
        await db.clinics.add({
            ...clinic,
            id,
            createdAt: now()
        });
        return id;
    },

    async update(id: string, data: Partial<Clinic>): Promise<void> {
        await db.clinics.update(id, data);
    },

    async delete(id: string): Promise<void> {
        await db.clinics.delete(id);
    }
};

// --- HOSPITALS ---
export const hospitalsService = {
    async getAll(): Promise<Hospital[]> {
        return await db.hospitals.orderBy('name').toArray();
    },

    async getActive(): Promise<Hospital[]> {
        return await db.hospitals.where('isActive').equals(1).toArray();
    },

    async create(hospital: Omit<Hospital, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = generateId();
        const timestamp = now();
        await db.hospitals.add({
            ...hospital,
            id,
            createdAt: timestamp,
            updatedAt: timestamp
        });
        return id;
    },

    async update(id: string, data: Partial<Hospital>): Promise<void> {
        await db.hospitals.update(id, { ...data, updatedAt: now() });
    },

    async delete(id: string): Promise<void> {
        await db.hospitals.delete(id);
    }
};

// --- WARDS ---
export const wardsService = {
    async getAll(): Promise<Ward[]> {
        return await db.wards.orderBy('name').toArray();
    },

    async getByHospital(hospitalId: string): Promise<Ward[]> {
        return await db.wards.where('hospitalId').equals(hospitalId).toArray();
    },

    async getActive(): Promise<Ward[]> {
        return await db.wards.where('isActive').equals(1).toArray();
    },

    async create(ward: Omit<Ward, 'id' | 'createdAt'>): Promise<string> {
        const id = generateId();
        await db.wards.add({
            ...ward,
            id,
            createdAt: now()
        });
        return id;
    },

    async update(id: string, data: Partial<Ward>): Promise<void> {
        await db.wards.update(id, data);
    },

    async delete(id: string): Promise<void> {
        await db.wards.delete(id);
    }
};


// --- SETTINGS ---
export const settingsService = {
    async get(): Promise<AppSettings | undefined> {
        const all = await db.settings.toArray();
        return all[0];
    },

    async save(settings: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
        const existing = await this.get();
        const timestamp = now();

        if (existing?.id) {
            await db.settings.update(existing.id, { ...settings, updatedAt: timestamp });
        } else {
            await db.settings.add({
                ...settings,
                id: generateId(),
                createdAt: timestamp,
                updatedAt: timestamp
            });
        }
    }
};

// ============================================
// EXPORT/IMPORT FUNCTIONS (Backup)
// ============================================

export interface DatabaseBackup {
    version: number;
    exportedAt: string;
    hospitalName?: string;
    data: {
        patients: Patient[];
        formulas: Formula[];
        modules: Module[];
        supplies: Supply[];
        professionals: Professional[];
        prescriptions: Prescription[];
        dailyEvolutions: DailyEvolution[];
        clinics: Clinic[];
        settings: AppSettings[];
    };
}

export const backupService = {
    async exportAll(): Promise<DatabaseBackup> {
        const settings = await db.settings.toArray();

        return {
            version: 1,
            exportedAt: now(),
            hospitalName: settings[0]?.hospitalName,
            data: {
                patients: await db.patients.toArray(),
                formulas: await db.formulas.toArray(),
                modules: await db.modules.toArray(),
                supplies: await db.supplies.toArray(),
                professionals: await db.professionals.toArray(),
                prescriptions: await db.prescriptions.toArray(),
                dailyEvolutions: await db.dailyEvolutions.toArray(),
                clinics: await db.clinics.toArray(),
                settings: settings
            }
        };
    },

    async importAll(backup: DatabaseBackup, options?: { clearExisting?: boolean }): Promise<void> {
        if (options?.clearExisting) {
            await db.patients.clear();
            await db.formulas.clear();
            await db.modules.clear();
            await db.supplies.clear();
            await db.professionals.clear();
            await db.prescriptions.clear();
            await db.dailyEvolutions.clear();
            await db.clinics.clear();
            await db.settings.clear();
        }

        // Import all data
        if (backup.data.patients?.length) await db.patients.bulkPut(backup.data.patients);
        if (backup.data.formulas?.length) await db.formulas.bulkPut(backup.data.formulas);
        if (backup.data.modules?.length) await db.modules.bulkPut(backup.data.modules);
        if (backup.data.supplies?.length) await db.supplies.bulkPut(backup.data.supplies);
        if (backup.data.professionals?.length) await db.professionals.bulkPut(backup.data.professionals);
        if (backup.data.prescriptions?.length) await db.prescriptions.bulkPut(backup.data.prescriptions);
        if (backup.data.dailyEvolutions?.length) await db.dailyEvolutions.bulkPut(backup.data.dailyEvolutions);
        if (backup.data.clinics?.length) await db.clinics.bulkPut(backup.data.clinics);
        if (backup.data.settings?.length) await db.settings.bulkPut(backup.data.settings);
    },

    downloadBackup(backup: DatabaseBackup): void {
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `enterall-backup-${backup.hospitalName || 'hospital'}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// ============================================
// DATABASE INITIALIZATION
// ============================================

export const initializeDatabase = async (): Promise<void> => {
    // Check if formulas exist, if not, seed with default data
    const formulasCount = await db.formulas.count();

    if (formulasCount === 0) {
        console.log('🔄 Seeding database with default formulas...');
        await seedDefaultFormulas();
        await seedDefaultModules();
        await seedDefaultClinics();
        console.log('✅ Database seeded successfully!');
    }

    // Cleanup mock hospitals if they exist (Proactive fix for user request)
    await removeMockHospitals();
};

// Seed functions
async function seedDefaultFormulas(): Promise<void> {
    const defaultFormulas: Omit<Formula, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
            code: "FTNEA06",
            name: "Novasource Senior",
            manufacturer: "Nestlé",
            type: "standard",
            systemType: "open",
            presentations: [100],
            caloriesPerUnit: 125,
            density: 1.3,
            proteinPerUnit: 7.0,
            sodiumPerUnit: 105,
            potassiumPerUnit: 160,
            fiberPerUnit: 0,
            waterContent: 76,
            isActive: true
        },
        {
            code: "PTNEA08",
            name: "Peptamen 1.5",
            manufacturer: "Nestlé",
            type: "peptide",
            systemType: "open",
            presentations: [200],
            caloriesPerUnit: 150,
            density: 1.5,
            proteinPerUnit: 7.1,
            sodiumPerUnit: 95,
            potassiumPerUnit: 126,
            fiberPerUnit: 0,
            waterContent: 76,
            isActive: true
        },
        {
            code: "S25",
            name: "Proline",
            manufacturer: "Nestlé",
            type: "high-protein",
            systemType: "open",
            presentations: [200],
            caloriesPerUnit: 137,
            density: 1.4,
            proteinPerUnit: 8.0,
            sodiumPerUnit: 100,
            potassiumPerUnit: 155,
            fiberPerUnit: 0.5,
            waterContent: 76,
            isActive: true
        },
        {
            code: "Renal",
            name: "Novasource Ren",
            manufacturer: "Nestlé",
            type: "renal",
            systemType: "open",
            presentations: [200],
            caloriesPerUnit: 200,
            density: 2.0,
            proteinPerUnit: 8.0,
            sodiumPerUnit: 70,
            potassiumPerUnit: 105,
            fiberPerUnit: 0,
            waterContent: 70,
            isActive: true
        },
        {
            code: "PTNEA04",
            name: "Isosource 1.5",
            manufacturer: "Nestlé",
            type: "high-calorie",
            systemType: "open",
            presentations: [100],
            caloriesPerUnit: 150,
            density: 1.5,
            proteinPerUnit: 6.0,
            sodiumPerUnit: 145,
            potassiumPerUnit: 220,
            fiberPerUnit: 0.8,
            waterContent: 76,
            isActive: true
        },
        {
            code: "FTNEA02",
            name: "Isosource Soya Fiber",
            manufacturer: "Nestlé",
            type: "fiber",
            systemType: "open",
            presentations: [100],
            caloriesPerUnit: 126,
            density: 1.3,
            proteinPerUnit: 4.0,
            sodiumPerUnit: 115,
            potassiumPerUnit: 210,
            fiberPerUnit: 1.7,
            waterContent: 76,
            isActive: true
        },
        {
            code: "S22",
            name: "Nutren Control",
            manufacturer: "Nestlé",
            type: "diabetic",
            systemType: "open",
            presentations: [100],
            caloriesPerUnit: 106,
            density: 1.1,
            proteinPerUnit: 8.0,
            sodiumPerUnit: 73,
            potassiumPerUnit: 220,
            fiberPerUnit: 2.0,
            waterContent: 76,
            isActive: true
        },
        {
            code: "S26",
            name: "Fresubin Energy Protein",
            manufacturer: "Fresenius",
            type: "high-protein",
            systemType: "open",
            presentations: [100],
            caloriesPerUnit: 148,
            density: 1.5,
            proteinPerUnit: 10.0,
            sodiumPerUnit: 112,
            potassiumPerUnit: 197,
            fiberPerUnit: 0,
            waterContent: 81,
            isActive: true
        },
        {
            code: "FTNEA09",
            name: "Peptamen HN",
            manufacturer: "Nestlé",
            type: "peptide",
            systemType: "closed",
            presentations: [500, 1000],
            caloriesPerUnit: 135,
            density: 1.35,
            proteinPerUnit: 6.7,
            sodiumPerUnit: 85,
            potassiumPerUnit: 150,
            fiberPerUnit: 0.8,
            waterContent: 76,
            isActive: true
        },
        {
            code: "FEA15",
            name: "Novasource Proline",
            manufacturer: "Nestlé",
            type: "high-protein",
            systemType: "closed",
            presentations: [1000],
            caloriesPerUnit: 130,
            density: 1.3,
            proteinPerUnit: 7.5,
            sodiumPerUnit: 103,
            potassiumPerUnit: 239,
            fiberPerUnit: 0.8,
            waterContent: 76,
            isActive: true
        },
        {
            code: "FTNEA03",
            name: "Novasource GC",
            manufacturer: "Nestlé",
            type: "diabetic",
            systemType: "closed",
            presentations: [1000],
            caloriesPerUnit: 113,
            density: 1.13,
            proteinPerUnit: 5.1,
            sodiumPerUnit: 90,
            potassiumPerUnit: 250,
            fiberPerUnit: 1.5,
            waterContent: 76,
            isActive: true
        }
    ];

    for (const formula of defaultFormulas) {
        await formulasService.create(formula);
    }
}

async function seedDefaultModules(): Promise<void> {
    const defaultModules: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>[] = [
        { name: "Fresubin protein", density: 0.90, referenceAmount: 7, referenceTimesPerDay: 7, calories: 171, protein: 43, sodium: 270, potassium: 588, fiber: 0, freeWater: 0, isActive: true },
        { name: "TCM com AGE", density: 9.00, referenceAmount: 1, referenceTimesPerDay: 1, calories: 9, protein: 0, sodium: 0, potassium: 0, fiber: 0, freeWater: 0, isActive: true },
        { name: "Carbofor", density: 3.72, referenceAmount: 1, referenceTimesPerDay: 1, calories: 4, protein: 0, sodium: 0, potassium: 0, fiber: 0, freeWater: 0, isActive: true },
        { name: "Neofiber", density: 0, referenceAmount: 0, referenceTimesPerDay: 0, calories: 0, protein: 0, sodium: 0, potassium: 0, fiber: 0, freeWater: 0, isActive: true },
        { name: "Solufiber", density: 0, referenceAmount: 0, referenceTimesPerDay: 0, calories: 0, protein: 0, sodium: 0, potassium: 0, fiber: 0, freeWater: 0, isActive: true },
        { name: "Glutamina", density: 4.00, referenceAmount: 1, referenceTimesPerDay: 1, calories: 4, protein: 1, sodium: 0, potassium: 0, fiber: 0, freeWater: 0, isActive: true }
    ];

    for (const module of defaultModules) {
        await modulesService.create(module);
    }
}

async function seedDefaultClinics(): Promise<void> {
    const defaultClinics: Omit<Clinic, 'id' | 'createdAt'>[] = [
        { name: "UTI Adulto", code: "UTI-A", type: "uti-adulto", isActive: true },
        { name: "UTI Pediátrica", code: "UTI-P", type: "uti-pediatrica", isActive: true },
        { name: "Enfermaria Geral", code: "ENF-G", type: "enfermaria", isActive: true },
        { name: "Ambulatório", code: "AMB", type: "ambulatorio", isActive: true }
    ];

    for (const clinic of defaultClinics) {
        await clinicsService.create(clinic);
    }
}

async function removeMockHospitals(): Promise<void> {
    const mockCnes = ['HM-001', 'HE-002', 'HC-003'];
    const hospitals = await db.hospitals.toArray();

    for (const hospital of hospitals) {
        if (hospital.cnes && mockCnes.includes(hospital.cnes)) {
            console.log(`🗑️ Removing mock hospital: ${hospital.name} (${hospital.cnes})`);
            if (hospital.id) await db.hospitals.delete(hospital.id);
        }
    }
}

export default db;
