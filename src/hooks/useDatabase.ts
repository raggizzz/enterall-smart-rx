/**
 * React Hooks for Database Access
 * Uses Supabase for cloud-based data storage
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
    initializeDatabase,
    supabase
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

    useEffect(() => {
        fetchPatients();

        // Set up real-time subscription
        const subscription = supabase
            .channel('patients_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
                fetchPatients();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchPatients]);

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

    useEffect(() => {
        patientsService.getActive()
            .then(setPatients)
            .finally(() => setIsLoading(false));
    }, []);

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

    useEffect(() => {
        fetchFormulas();

        const subscription = supabase
            .channel('formulas_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'formulas' }, () => {
                fetchFormulas();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchFormulas]);

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

    useEffect(() => {
        formulasService.getBySystem(systemType)
            .then(setFormulas)
            .finally(() => setIsLoading(false));
    }, [systemType]);

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

    useEffect(() => {
        fetchModules();

        const subscription = supabase
            .channel('modules_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'modules' }, () => {
                fetchModules();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchModules]);

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

    useEffect(() => {
        fetchSupplies();

        const subscription = supabase
            .channel('supplies_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'supplies' }, () => {
                fetchSupplies();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchSupplies]);

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

export function useProfessionals() {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfessionals = useCallback(async () => {
        try {
            const data = await professionalsService.getAll();
            setProfessionals(data);
        } catch (error) {
            console.error('Error fetching professionals:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfessionals();

        const subscription = supabase
            .channel('professionals_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'professionals' }, () => {
                fetchProfessionals();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchProfessionals]);

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

    useEffect(() => {
        fetchPrescriptions();

        const subscription = supabase
            .channel('prescriptions_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => {
                fetchPrescriptions();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchPrescriptions]);

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

    useEffect(() => {
        if (patientId) {
            prescriptionsService.getByPatient(patientId)
                .then(setPrescriptions)
                .finally(() => setIsLoading(false));
        } else {
            setPrescriptions([]);
            setIsLoading(false);
        }
    }, [patientId]);

    return { prescriptions, isLoading };
}

export function useActivePrescriptions() {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        prescriptionsService.getActive()
            .then(setPrescriptions)
            .finally(() => setIsLoading(false));
    }, []);

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

    useEffect(() => {
        fetchEvolutions();

        const subscription = supabase
            .channel('evolutions_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_evolutions' }, () => {
                fetchEvolutions();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchEvolutions]);

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

    useEffect(() => {
        if (patientId) {
            evolutionsService.getByPatient(patientId)
                .then(setEvolutions)
                .finally(() => setIsLoading(false));
        } else {
            setEvolutions([]);
            setIsLoading(false);
        }
    }, [patientId]);

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

    useEffect(() => {
        fetchClinics();

        const subscription = supabase
            .channel('clinics_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clinics' }, () => {
                fetchClinics();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchClinics]);

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
            setHospitals(data);
        } catch (error) {
            console.error('Error fetching hospitals:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHospitals();

        const subscription = supabase
            .channel('hospitals_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, () => {
                fetchHospitals();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchHospitals]);

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

    useEffect(() => {
        fetchWards();

        const subscription = supabase
            .channel('wards_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wards' }, () => {
                fetchWards();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchWards]);

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

    useEffect(() => {
        fetchSettings();

        const subscription = supabase
            .channel('settings_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
                fetchSettings();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchSettings]);

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

    useEffect(() => {
        const fetchData = async () => {
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
        };

        fetchData();
    }, []);

    return { ...data, isLoading };
}

export function useLabelData(date?: string) {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
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
        };

        fetchData();
    }, [date]);

    return { prescriptions, isLoading };
}
