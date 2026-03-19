/**
 * React hooks for app data access.
 * The main CRUD flow uses the backend API; legacy realtime hooks remain as no-op compatibility shims.
 */

import { useState, useEffect, useCallback } from 'react';
import {
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
    AppTool,
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
    appToolsService,
    initializeDatabase,
    supabase
} from '@/lib/database';
import { hasActiveSession } from '@/lib/permissions';

const AUTO_REFRESH_INTERVAL_MS = 10000;

const useAutoRefresh = (refresh: () => Promise<void>, deps: unknown[] = []) => {
    useEffect(() => {
        let cancelled = false;

        const runRefresh = async () => {
            if (cancelled) return;
            if (typeof navigator !== 'undefined' && !navigator.onLine) return;

            try {
                await refresh();
            } catch (error) {
                console.error('Auto refresh error:', error);
            }
        };

        void runRefresh();

        const handleFocus = () => {
            void runRefresh();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void runRefresh();
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                void runRefresh();
            }
        }, AUTO_REFRESH_INTERVAL_MS);

        return () => {
            cancelled = true;
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.clearInterval(intervalId);
        };
    }, [refresh, ...deps]);
};

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
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPatients = useCallback(async () => {
        try {
            const data = await patientsService.getAll();
            setPatients(data);
        } catch (error) {
            console.error('Error fetching patients:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useAutoRefresh(fetchPatients, [fetchPatients]);

    const createPatient = useCallback(async (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
        const id = await patientsService.create(patient);
        await fetchPatients();
        return id;
    }, [fetchPatients]);

    const updatePatient = useCallback(async (id: string, data: Partial<Patient>) => {
        await patientsService.update(id, data);
        await fetchPatients();
    }, [fetchPatients]);

    const deletePatient = useCallback(async (id: string) => {
        await patientsService.delete(id);
        await fetchPatients();
    }, [fetchPatients]);

    const searchPatients = useCallback(async (query: string) => {
        return await patientsService.search(query);
    }, []);

    return {
        patients,
        isLoading,
        createPatient,
        updatePatient,
        deletePatient,
        searchPatients,
        refetch: fetchPatients
    };
}

export function usePatient(id: string | undefined) {
    const [patient, setPatient] = useState<Patient | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            patientsService.getById(id)
                .then(setPatient)
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [id]);

    return { patient, isLoading };
}

export function useActivePatients() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchActivePatients = useCallback(async () => {
        try {
            const data = await patientsService.getActive();
            setPatients(data);
        } catch (error) {
            console.error('Error fetching active patients:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useAutoRefresh(fetchActivePatients, [fetchActivePatients]);

    return { patients, isLoading };
}

// ============================================
// FORMULAS HOOKS
// ============================================

export function useFormulas() {
    const [formulas, setFormulas] = useState<Formula[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFormulas = useCallback(async () => {
        try {
            const data = await formulasService.getAll();
            setFormulas(data);
        } catch (error) {
            console.error('Error fetching formulas:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useAutoRefresh(fetchFormulas, [fetchFormulas]);

    const createFormula = useCallback(async (formula: Omit<Formula, 'id' | 'createdAt' | 'updatedAt'>) => {
        const id = await formulasService.create(formula);
        await fetchFormulas();
        return id;
    }, [fetchFormulas]);

    const updateFormula = useCallback(async (id: string, data: Partial<Formula>) => {
        await formulasService.update(id, data);
        await fetchFormulas();
    }, [fetchFormulas]);

    const deleteFormula = useCallback(async (id: string) => {
        await formulasService.delete(id);
        await fetchFormulas();
    }, [fetchFormulas]);

    const searchFormulas = useCallback(async (query: string) => {
        return await formulasService.search(query);
    }, []);

    return {
        formulas,
        isLoading,
        createFormula,
        updateFormula,
        deleteFormula,
        searchFormulas,
        refetch: fetchFormulas
    };
}

export function useFormula(id: string | undefined) {
    const [formula, setFormula] = useState<Formula | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            formulasService.getById(id)
                .then(setFormula)
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [id]);

    return { formula, isLoading };
}

export function useFormulasBySystem(systemType: 'open' | 'closed') {
    const [formulas, setFormulas] = useState<Formula[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFormulasBySystem = useCallback(async () => {
        try {
            const data = await formulasService.getBySystem(systemType);
            setFormulas(data);
        } catch (error) {
            console.error('Error fetching formulas by system:', error);
        } finally {
            setIsLoading(false);
        }
    }, [systemType]);

    useAutoRefresh(fetchFormulasBySystem, [fetchFormulasBySystem]);

    return { formulas, isLoading };
}

// ============================================
// MODULES HOOKS
// ============================================

export function useModules() {
    const [modules, setModules] = useState<Module[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchModules = useCallback(async () => {
        try {
            const data = await modulesService.getAll();
            setModules(data);
        } catch (error) {
            console.error('Error fetching modules:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useAutoRefresh(fetchModules, [fetchModules]);

    const createModule = useCallback(async (module: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>) => {
        const id = await modulesService.create(module);
        await fetchModules();
        return id;
    }, [fetchModules]);

    const updateModule = useCallback(async (id: string, data: Partial<Module>) => {
        await modulesService.update(id, data);
        await fetchModules();
    }, [fetchModules]);

    const deleteModule = useCallback(async (id: string) => {
        await modulesService.delete(id);
        await fetchModules();
    }, [fetchModules]);

    return {
        modules,
        isLoading,
        createModule,
        updateModule,
        deleteModule,
        refetch: fetchModules
    };
}

// ============================================
// SUPPLIES HOOKS
// ============================================

export function useSupplies() {
    const [supplies, setSupplies] = useState<Supply[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSupplies = useCallback(async () => {
        try {
            const data = await suppliesService.getAll();
            setSupplies(data);
        } catch (error) {
            console.error('Error fetching supplies:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useAutoRefresh(fetchSupplies, [fetchSupplies]);

    const createSupply = useCallback(async (supply: Omit<Supply, 'id' | 'createdAt' | 'updatedAt'>) => {
        const id = await suppliesService.create(supply);
        await fetchSupplies();
        return id;
    }, [fetchSupplies]);

    const updateSupply = useCallback(async (id: string, data: Partial<Supply>) => {
        await suppliesService.update(id, data);
        await fetchSupplies();
    }, [fetchSupplies]);

    const deleteSupply = useCallback(async (id: string) => {
        await suppliesService.delete(id);
        await fetchSupplies();
    }, [fetchSupplies]);

    return {
        supplies,
        isLoading,
        createSupply,
        updateSupply,
        deleteSupply,
        refetch: fetchSupplies
    };
}

// ============================================
// PROFESSIONALS HOOKS
// ============================================

export function useProfessionals(hospitalId?: string) {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfessionals = useCallback(async () => {
        if (!hospitalId) {
            setProfessionals([]);
            setIsLoading(false);
            return;
        }
        try {
            const data = await professionalsService.getByHospital(hospitalId);
            setProfessionals(data);
        } catch (error) {
            console.error('Error fetching professionals:', error);
        } finally {
            setIsLoading(false);
        }
    }, [hospitalId]);

    useAutoRefresh(fetchProfessionals, [fetchProfessionals]);

    const createProfessional = useCallback(async (professional: Omit<Professional, 'id' | 'createdAt' | 'updatedAt'>) => {
        const id = await professionalsService.create(professional);
        await fetchProfessionals();
        return id;
    }, [fetchProfessionals]);

    const updateProfessional = useCallback(async (id: string, data: Partial<Professional>) => {
        await professionalsService.update(id, data);
        await fetchProfessionals();
    }, [fetchProfessionals]);

    const deleteProfessional = useCallback(async (id: string) => {
        await professionalsService.delete(id);
        await fetchProfessionals();
    }, [fetchProfessionals]);

    return {
        professionals,
        isLoading,
        createProfessional,
        updateProfessional,
        deleteProfessional,
        refetch: fetchProfessionals
    };
}

// ============================================
// PRESCRIPTIONS HOOKS
// ============================================

export function usePrescriptions() {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPrescriptions = useCallback(async () => {
        try {
            const data = await prescriptionsService.getAll();
            setPrescriptions(data);
        } catch (error) {
            console.error('Error fetching prescriptions:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useAutoRefresh(fetchPrescriptions, [fetchPrescriptions]);

    const createPrescription = useCallback(async (prescription: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>) => {
        const id = await prescriptionsService.create(prescription);
        await fetchPrescriptions();
        return id;
    }, [fetchPrescriptions]);

    const updatePrescription = useCallback(async (id: string, data: Partial<Prescription>) => {
        await prescriptionsService.update(id, data);
        await fetchPrescriptions();
    }, [fetchPrescriptions]);

    const deletePrescription = useCallback(async (id: string) => {
        await prescriptionsService.delete(id);
        await fetchPrescriptions();
    }, [fetchPrescriptions]);

    return {
        prescriptions,
        isLoading,
        createPrescription,
        updatePrescription,
        deletePrescription,
        refetch: fetchPrescriptions
    };
}

export function usePrescription(id: string | undefined) {
    const [prescription, setPrescription] = useState<Prescription | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            prescriptionsService.getById(id)
                .then(setPrescription)
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [id]);

    return { prescription, isLoading };
}

export function usePatientPrescriptions(patientId: string | undefined) {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPatientPrescriptions = useCallback(async () => {
        if (!patientId) {
            setPrescriptions([]);
            setIsLoading(false);
            return;
        }

        try {
            const data = await prescriptionsService.getByPatient(patientId);
            setPrescriptions(data);
        } catch (error) {
            console.error('Error fetching patient prescriptions:', error);
        } finally {
            setIsLoading(false);
        }
    }, [patientId]);

    useAutoRefresh(fetchPatientPrescriptions, [fetchPatientPrescriptions]);

    return { prescriptions, isLoading };
}

export function useActivePrescriptions() {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchActivePrescriptions = useCallback(async () => {
        try {
            const data = await prescriptionsService.getActive();
            setPrescriptions(data);
        } catch (error) {
            console.error('Error fetching active prescriptions:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useAutoRefresh(fetchActivePrescriptions, [fetchActivePrescriptions]);

    return { prescriptions, isLoading };
}

// ============================================
// DAILY EVOLUTIONS HOOKS
// ============================================

export function useEvolutions() {
    const [evolutions, setEvolutions] = useState<DailyEvolution[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEvolutions = useCallback(async () => {
        try {
            const data = await evolutionsService.getAll();
            setEvolutions(data);
        } catch (error) {
            console.error('Error fetching evolutions:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useAutoRefresh(fetchEvolutions, [fetchEvolutions]);

    const createEvolution = useCallback(async (evolution: Omit<DailyEvolution, 'id' | 'createdAt'>) => {
        const id = await evolutionsService.create(evolution);
        await fetchEvolutions();
        return id;
    }, [fetchEvolutions]);

    const updateEvolution = useCallback(async (id: string, data: Partial<DailyEvolution>) => {
        await evolutionsService.update(id, data);
        await fetchEvolutions();
    }, [fetchEvolutions]);

    const deleteEvolution = useCallback(async (id: string) => {
        await evolutionsService.delete(id);
        await fetchEvolutions();
    }, [fetchEvolutions]);

    return {
        evolutions,
        isLoading,
        createEvolution,
        updateEvolution,
        deleteEvolution,
        refetch: fetchEvolutions
    };
}

export function usePatientEvolutions(patientId: string | undefined) {
    const [evolutions, setEvolutions] = useState<DailyEvolution[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPatientEvolutions = useCallback(async () => {
        if (!patientId) {
            setEvolutions([]);
            setIsLoading(false);
            return;
        }

        try {
            const data = await evolutionsService.getByPatient(patientId);
            setEvolutions(data);
        } catch (error) {
            console.error('Error fetching patient evolutions:', error);
        } finally {
            setIsLoading(false);
        }
    }, [patientId]);

    useAutoRefresh(fetchPatientEvolutions, [fetchPatientEvolutions]);

    return { evolutions, isLoading };
}

// ============================================
// CLINICS HOOKS
// ============================================

export function useClinics() {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchClinics = useCallback(async () => {
        try {
            const data = await clinicsService.getAll();
            setClinics(data);
        } catch (error) {
            console.error('Error fetching clinics:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useAutoRefresh(fetchClinics, [fetchClinics]);

    const createClinic = useCallback(async (clinic: Omit<Clinic, 'id' | 'createdAt'>) => {
        const id = await clinicsService.create(clinic);
        await fetchClinics();
        return id;
    }, [fetchClinics]);

    const updateClinic = useCallback(async (id: string, data: Partial<Clinic>) => {
        await clinicsService.update(id, data);
        await fetchClinics();
    }, [fetchClinics]);

    const deleteClinic = useCallback(async (id: string) => {
        await clinicsService.delete(id);
        await fetchClinics();
    }, [fetchClinics]);

    return {
        clinics,
        isLoading,
        createClinic,
        updateClinic,
        deleteClinic,
        refetch: fetchClinics
    };
}

// ============================================
// HOSPITALS HOOKS
// ============================================

export function useHospitals() {
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHospitals = useCallback(async () => {
        try {
            const data = await hospitalsService.getAll();
            if (typeof window !== 'undefined' && hasActiveSession()) {
                const currentHospitalId = localStorage.getItem('userHospitalId');
                setHospitals(currentHospitalId ? data.filter((hospital) => hospital.id === currentHospitalId) : data);
            } else {
                setHospitals(data);
            }
        } catch (error) {
            console.error('Error fetching hospitals:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useAutoRefresh(fetchHospitals, [fetchHospitals]);

    const createHospital = useCallback(async (hospital: Omit<Hospital, 'id' | 'createdAt' | 'updatedAt'>) => {
        const id = await hospitalsService.create(hospital);
        await fetchHospitals();
        return id;
    }, [fetchHospitals]);

    const updateHospital = useCallback(async (id: string, data: Partial<Hospital>) => {
        await hospitalsService.update(id, data);
        await fetchHospitals();
    }, [fetchHospitals]);

    const deleteHospital = useCallback(async (id: string) => {
        await hospitalsService.delete(id);
        await fetchHospitals();
    }, [fetchHospitals]);

    return {
        hospitals,
        isLoading,
        createHospital,
        updateHospital,
        deleteHospital,
        refetch: fetchHospitals
    };
}

// ============================================
// WARDS HOOKS
// ============================================

export function useWards(hospitalId?: string) {
    const [wards, setWards] = useState<Ward[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchWards = useCallback(async () => {
        try {
            const data = hospitalId
                ? await wardsService.getByHospital(hospitalId)
                : await wardsService.getAll();
            setWards(data);
        } catch (error) {
            console.error('Error fetching wards:', error);
        } finally {
            setIsLoading(false);
        }
    }, [hospitalId]);

    useAutoRefresh(fetchWards, [fetchWards]);

    const createWard = useCallback(async (ward: Omit<Ward, 'id' | 'createdAt'>) => {
        const id = await wardsService.create(ward);
        await fetchWards();
        return id;
    }, [fetchWards]);

    const updateWard = useCallback(async (id: string, data: Partial<Ward>) => {
        await wardsService.update(id, data);
        await fetchWards();
    }, [fetchWards]);

    const deleteWard = useCallback(async (id: string) => {
        await wardsService.delete(id);
        await fetchWards();
    }, [fetchWards]);

    return {
        wards,
        isLoading,
        createWard,
        updateWard,
        deleteWard,
        refetch: fetchWards
    };
}

// ============================================
// SETTINGS HOOKS
// ============================================

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        try {
            const data = await settingsService.get();
            setSettings(data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useAutoRefresh(fetchSettings, [fetchSettings]);

    const saveSettings = useCallback(async (data: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>) => {
        await settingsService.save(data);
        await fetchSettings();
    }, [fetchSettings]);

    return {
        settings,
        isLoading,
        saveSettings,
        refetch: fetchSettings
    };
}

// ============================================
// TOOLS CATALOG HOOKS
// ============================================

export function useAppTools() {
    const [tools, setTools] = useState<AppTool[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTools = useCallback(async () => {
        try {
            const data = await appToolsService.getAll();
            setTools(data);
        } catch (error) {
            console.error('Error fetching app tools:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useAutoRefresh(fetchTools, [fetchTools]);

    return {
        tools,
        isLoading,
        refetch: fetchTools
    };
}

// ============================================
// BACKUP HOOKS (Supabase version)
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
        hospitals: Hospital[];
        wards: Ward[];
        settings?: AppSettings;
    };
}

export function useBackup() {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const exportBackup = useCallback(async (): Promise<DatabaseBackup> => {
        setIsExporting(true);
        try {
            const [patients, formulas, modules, supplies, professionals, prescriptions, evolutions, clinics, hospitals, wards, settings] = await Promise.all([
                patientsService.getAll(),
                formulasService.getAll(),
                modulesService.getAll(),
                suppliesService.getAll(),
                professionalsService.getAll(),
                prescriptionsService.getAll(),
                evolutionsService.getAll(),
                clinicsService.getAll(),
                hospitalsService.getAll(),
                wardsService.getAll(),
                settingsService.get()
            ]);

            const backup: DatabaseBackup = {
                version: 2,
                exportedAt: new Date().toISOString(),
                hospitalName: settings?.hospitalName,
                data: {
                    patients,
                    formulas,
                    modules,
                    supplies,
                    professionals,
                    prescriptions,
                    dailyEvolutions: evolutions,
                    clinics,
                    hospitals,
                    wards,
                    settings
                }
            };

            // Download the backup
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

            return backup;
        } finally {
            setIsExporting(false);
        }
    }, []);

    const importBackup = useCallback(async (file: File): Promise<DatabaseBackup> => {
        setIsImporting(true);
        try {
            const text = await file.text();
            const backup: DatabaseBackup = JSON.parse(text);

            // Import data to Supabase (this will overwrite existing data with same IDs)
            // Note: In production, you'd want more sophisticated conflict resolution
            console.log('📦 Importing backup...', backup);

            // For now, just return the backup - actual import would need careful handling
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
    const [data, setData] = useState({
        patientsCount: 0,
        activePrescriptions: 0,
        todayEvolutions: 0,
        formulasCount: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            const [patients, prescriptions, evolutions, formulas] = await Promise.all([
                patientsService.getAll(),
                prescriptionsService.getActive(),
                evolutionsService.getByDate(today),
                formulasService.getAll()
            ]);

            setData({
                patientsCount: patients.length,
                activePrescriptions: prescriptions.length,
                todayEvolutions: evolutions.length,
                formulasCount: formulas.length
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useAutoRefresh(fetchDashboardData, [fetchDashboardData]);

    return { ...data, isLoading };
}

export function useLabelData(date?: string) {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLabelData = useCallback(async () => {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const active = await prescriptionsService.getActive();
            const filtered = active.filter(p =>
                p.startDate <= targetDate && (!p.endDate || p.endDate >= targetDate)
            );
            setPrescriptions(filtered);
        } catch (error) {
            console.error('Error fetching label data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [date]);

    useAutoRefresh(fetchLabelData, [fetchLabelData]);

    return { prescriptions, isLoading };
}
