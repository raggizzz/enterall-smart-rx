/**
 * React Hooks for Database Access
 * Provides easy-to-use hooks for all database operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    db,
    Patient,
    Formula,
    Module,
    Supply,
    Professional,
    Prescription,
    DailyEvolution,
    Clinic,
    AppSettings,
    Hospital,
    Ward,
    patientsService,
    formulasService,
    modulesService,
    suppliesService,
    professionalsService,
    prescriptionsService,
    evolutionsService,
    clinicsService,
    settingsService,
    hospitalsService,
    wardsService,
    backupService,
    initializeDatabase,
    DatabaseBackup
} from '@/lib/database';

// ============================================
// DATABASE INITIALIZATION HOOK
// ============================================

export function useDatabaseInit() {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        initializeDatabase()
            .then(() => setIsReady(true))
            .catch((err) => {
                console.error('Database initialization error:', err);
                setError(err);
            });
    }, []);

    return { isReady, error };
}

// ============================================
// PATIENTS HOOKS
// ============================================

export function usePatients() {
    const patients = useLiveQuery(() => patientsService.getAll());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (patients !== undefined) {
            setIsLoading(false);
        }
    }, [patients]);

    const createPatient = useCallback(async (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
        return await patientsService.create(patient);
    }, []);

    const updatePatient = useCallback(async (id: string, data: Partial<Patient>) => {
        await patientsService.update(id, data);
    }, []);

    const deletePatient = useCallback(async (id: string) => {
        await patientsService.delete(id);
    }, []);

    const searchPatients = useCallback(async (query: string) => {
        return await patientsService.search(query);
    }, []);

    return {
        patients: patients || [],
        isLoading,
        createPatient,
        updatePatient,
        deletePatient,
        searchPatients
    };
}

export function usePatient(id: string | undefined) {
    const patient = useLiveQuery(
        () => id ? patientsService.getById(id) : undefined,
        [id]
    );

    return { patient, isLoading: patient === undefined && !!id };
}

export function useActivePatients() {
    const patients = useLiveQuery(() => patientsService.getActive());
    return { patients: patients || [], isLoading: patients === undefined };
}

// ============================================
// FORMULAS HOOKS
// ============================================

export function useFormulas() {
    const formulas = useLiveQuery(() => formulasService.getAll());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (formulas !== undefined) {
            setIsLoading(false);
        }
    }, [formulas]);

    const createFormula = useCallback(async (formula: Omit<Formula, 'id' | 'createdAt' | 'updatedAt'>) => {
        return await formulasService.create(formula);
    }, []);

    const updateFormula = useCallback(async (id: string, data: Partial<Formula>) => {
        await formulasService.update(id, data);
    }, []);

    const deleteFormula = useCallback(async (id: string) => {
        await formulasService.delete(id);
    }, []);

    const searchFormulas = useCallback(async (query: string) => {
        return await formulasService.search(query);
    }, []);

    return {
        formulas: formulas || [],
        isLoading,
        createFormula,
        updateFormula,
        deleteFormula,
        searchFormulas
    };
}

export function useFormula(id: string | undefined) {
    const formula = useLiveQuery(
        () => id ? formulasService.getById(id) : undefined,
        [id]
    );

    return { formula, isLoading: formula === undefined && !!id };
}

export function useFormulasBySystem(systemType: 'open' | 'closed') {
    const formulas = useLiveQuery(
        () => formulasService.getBySystem(systemType),
        [systemType]
    );

    return { formulas: formulas || [], isLoading: formulas === undefined };
}

// ============================================
// MODULES HOOKS
// ============================================

export function useModules() {
    const modules = useLiveQuery(() => modulesService.getAll());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (modules !== undefined) {
            setIsLoading(false);
        }
    }, [modules]);

    const createModule = useCallback(async (module: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>) => {
        return await modulesService.create(module);
    }, []);

    const updateModule = useCallback(async (id: string, data: Partial<Module>) => {
        await modulesService.update(id, data);
    }, []);

    const deleteModule = useCallback(async (id: string) => {
        await modulesService.delete(id);
    }, []);

    return {
        modules: modules || [],
        isLoading,
        createModule,
        updateModule,
        deleteModule
    };
}

// ============================================
// SUPPLIES HOOKS
// ============================================

export function useSupplies() {
    const supplies = useLiveQuery(() => suppliesService.getAll());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (supplies !== undefined) {
            setIsLoading(false);
        }
    }, [supplies]);

    const createSupply = useCallback(async (supply: Omit<Supply, 'id' | 'createdAt' | 'updatedAt'>) => {
        return await suppliesService.create(supply);
    }, []);

    const updateSupply = useCallback(async (id: string, data: Partial<Supply>) => {
        await suppliesService.update(id, data);
    }, []);

    const deleteSupply = useCallback(async (id: string) => {
        await suppliesService.delete(id);
    }, []);

    return {
        supplies: supplies || [],
        isLoading,
        createSupply,
        updateSupply,
        deleteSupply
    };
}

// ============================================
// PROFESSIONALS HOOKS
// ============================================

export function useProfessionals() {
    const professionals = useLiveQuery(() => professionalsService.getAll());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (professionals !== undefined) {
            setIsLoading(false);
        }
    }, [professionals]);

    const createProfessional = useCallback(async (professional: Omit<Professional, 'id' | 'createdAt' | 'updatedAt'>) => {
        return await professionalsService.create(professional);
    }, []);

    const updateProfessional = useCallback(async (id: string, data: Partial<Professional>) => {
        await professionalsService.update(id, data);
    }, []);

    const deleteProfessional = useCallback(async (id: string) => {
        await professionalsService.delete(id);
    }, []);

    return {
        professionals: professionals || [],
        isLoading,
        createProfessional,
        updateProfessional,
        deleteProfessional
    };
}

// ============================================
// PRESCRIPTIONS HOOKS
// ============================================

export function usePrescriptions() {
    const prescriptions = useLiveQuery(() => prescriptionsService.getAll());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (prescriptions !== undefined) {
            setIsLoading(false);
        }
    }, [prescriptions]);

    const createPrescription = useCallback(async (prescription: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>) => {
        return await prescriptionsService.create(prescription);
    }, []);

    const updatePrescription = useCallback(async (id: string, data: Partial<Prescription>) => {
        await prescriptionsService.update(id, data);
    }, []);

    const deletePrescription = useCallback(async (id: string) => {
        await prescriptionsService.delete(id);
    }, []);

    return {
        prescriptions: prescriptions || [],
        isLoading,
        createPrescription,
        updatePrescription,
        deletePrescription
    };
}

export function usePrescription(id: string | undefined) {
    const prescription = useLiveQuery(
        () => id ? prescriptionsService.getById(id) : undefined,
        [id]
    );

    return { prescription, isLoading: prescription === undefined && !!id };
}

export function usePatientPrescriptions(patientId: string | undefined) {
    const prescriptions = useLiveQuery(
        () => patientId ? prescriptionsService.getByPatient(patientId) : [],
        [patientId]
    );

    return { prescriptions: prescriptions || [], isLoading: prescriptions === undefined };
}

export function useActivePrescriptions() {
    const prescriptions = useLiveQuery(() => prescriptionsService.getActive());
    return { prescriptions: prescriptions || [], isLoading: prescriptions === undefined };
}

// ============================================
// DAILY EVOLUTIONS HOOKS
// ============================================

export function useEvolutions() {
    const evolutions = useLiveQuery(() => evolutionsService.getAll());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (evolutions !== undefined) {
            setIsLoading(false);
        }
    }, [evolutions]);

    const createEvolution = useCallback(async (evolution: Omit<DailyEvolution, 'id' | 'createdAt'>) => {
        return await evolutionsService.create(evolution);
    }, []);

    const updateEvolution = useCallback(async (id: string, data: Partial<DailyEvolution>) => {
        await evolutionsService.update(id, data);
    }, []);

    const deleteEvolution = useCallback(async (id: string) => {
        await evolutionsService.delete(id);
    }, []);

    return {
        evolutions: evolutions || [],
        isLoading,
        createEvolution,
        updateEvolution,
        deleteEvolution
    };
}

export function usePatientEvolutions(patientId: string | undefined) {
    const evolutions = useLiveQuery(
        () => patientId ? evolutionsService.getByPatient(patientId) : [],
        [patientId]
    );

    return { evolutions: evolutions || [], isLoading: evolutions === undefined };
}

// ============================================
// CLINICS HOOKS
// ============================================

export function useClinics() {
    const clinics = useLiveQuery(() => clinicsService.getAll());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (clinics !== undefined) {
            setIsLoading(false);
        }
    }, [clinics]);

    const createClinic = useCallback(async (clinic: Omit<Clinic, 'id' | 'createdAt'>) => {
        return await clinicsService.create(clinic);
    }, []);

    const updateClinic = useCallback(async (id: string, data: Partial<Clinic>) => {
        await clinicsService.update(id, data);
    }, []);

    const deleteClinic = useCallback(async (id: string) => {
        await clinicsService.delete(id);
    }, []);

    return {
        clinics: clinics || [],
        isLoading,
        createClinic,
        updateClinic,
        deleteClinic
    };
}

// ============================================
// HOSPITALS HOOKS
// ============================================

export function useHospitals() {
    const hospitals = useLiveQuery(() => hospitalsService.getAll());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (hospitals !== undefined) {
            setIsLoading(false);
        }
    }, [hospitals]);

    const createHospital = useCallback(async (hospital: Omit<Hospital, 'id' | 'createdAt' | 'updatedAt'>) => {
        return await hospitalsService.create(hospital);
    }, []);

    const updateHospital = useCallback(async (id: string, data: Partial<Hospital>) => {
        await hospitalsService.update(id, data);
    }, []);

    const deleteHospital = useCallback(async (id: string) => {
        await hospitalsService.delete(id);
    }, []);

    return {
        hospitals: hospitals || [],
        isLoading,
        createHospital,
        updateHospital,
        deleteHospital
    };
}

// ============================================
// WARDS HOOKS
// ============================================

export function useWards(hospitalId?: string) {
    const wards = useLiveQuery(() =>
        hospitalId ? wardsService.getByHospital(hospitalId) : wardsService.getAll()
        , [hospitalId]);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (wards !== undefined) {
            setIsLoading(false);
        }
    }, [wards]);

    const createWard = useCallback(async (ward: Omit<Ward, 'id' | 'createdAt'>) => {
        return await wardsService.create(ward);
    }, []);

    const updateWard = useCallback(async (id: string, data: Partial<Ward>) => {
        await wardsService.update(id, data);
    }, []);

    const deleteWard = useCallback(async (id: string) => {
        await wardsService.delete(id);
    }, []);

    return {
        wards: wards || [],
        isLoading,
        createWard,
        updateWard,
        deleteWard
    };
}

// ============================================
// SETTINGS HOOKS
// ============================================

export function useSettings() {
    const settings = useLiveQuery(() => settingsService.get());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (settings !== undefined) {
            setIsLoading(false);
        }
    }, [settings]);

    const saveSettings = useCallback(async (data: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>) => {
        await settingsService.save(data);
    }, []);

    return {
        settings,
        isLoading,
        saveSettings
    };
}

// ============================================
// BACKUP HOOKS
// ============================================

export function useBackup() {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const exportBackup = useCallback(async () => {
        setIsExporting(true);
        try {
            const backup = await backupService.exportAll();
            backupService.downloadBackup(backup);
            return backup;
        } finally {
            setIsExporting(false);
        }
    }, []);

    const importBackup = useCallback(async (file: File, clearExisting?: boolean) => {
        setIsImporting(true);
        try {
            const text = await file.text();
            const backup: DatabaseBackup = JSON.parse(text);
            await backupService.importAll(backup, { clearExisting });
            return backup;
        } finally {
            setIsImporting(false);
        }
    }, []);

    return {
        exportBackup,
        importBackup,
        isExporting,
        isImporting
    };
}

// ============================================
// COMBINED DATA HOOKS
// ============================================

export function useDashboardData() {
    const patientsCount = useLiveQuery(() => db.patients.count());
    const activePrescriptions = useLiveQuery(() => db.prescriptions.where('status').equals('active').count());
    const todayEvolutions = useLiveQuery(async () => {
        const today = new Date().toISOString().split('T')[0];
        return await db.dailyEvolutions.where('date').equals(today).count();
    });
    const formulasCount = useLiveQuery(() => db.formulas.count());

    return {
        patientsCount: patientsCount || 0,
        activePrescriptions: activePrescriptions || 0,
        todayEvolutions: todayEvolutions || 0,
        formulasCount: formulasCount || 0,
        isLoading: patientsCount === undefined
    };
}

export function useLabelData(date?: string) {
    const prescriptions = useLiveQuery(async () => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const active = await prescriptionsService.getActive();
        return active.filter(p => p.startDate <= targetDate && (!p.endDate || p.endDate >= targetDate));
    }, [date]);

    return { prescriptions: prescriptions || [], isLoading: prescriptions === undefined };
}
