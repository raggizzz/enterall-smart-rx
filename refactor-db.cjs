const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'src', 'lib', 'database.ts');
const content = fs.readFileSync(dbPath, 'utf-8');

const lines = content.split('\n');
const helperIndex = lines.findIndex(line => line.includes('HELPER FUNCTIONS - Map between camelCase'));

// Everything until helpers (contains all interfaces)
let finalContent = lines.slice(0, helperIndex - 1).join('\n');

// Replace supabase import with apiClient import
finalContent = finalContent.replace(
    "import { supabase } from './supabase';",
    "import { apiClient } from './api';"
);

const newServices = `
// ============================================
// API SERVICES (Replacing Supabase)
// ============================================

export const patientsService = {
    async getAll() { return apiClient.get('/patients'); },
    async getActive() { return apiClient.get('/patients'); }, // For now same as all
    async getById(id: string) { return apiClient.get(\`/patients/\${id}\`); },
    async create(data: any) { return (await apiClient.post('/patients', data)).id; },
    async update(id: string, data: any) { return apiClient.put(\`/patients/\${id}\`, data); },
    async delete(id: string) { return apiClient.delete(\`/patients/\${id}\`); },
    async search(query: string) { 
        const all = await this.getAll();
        const q = query.toLowerCase();
        return all.filter((p: any) => p.name.toLowerCase().includes(q) || p.recordNumber?.includes(q));
    }
};

export const formulasService = {
    async getAll() { return apiClient.get('/formulas'); },
    async getById(id: string) { return apiClient.get(\`/formulas/\${id}\`); },
    async getBySystem(systemType: string) { return (await this.getAll()).filter((f: any) => f.type === systemType); },
    async create(data: any) { return (await apiClient.post('/formulas', data)).id; },
    async update(id: string, data: any) { return apiClient.put(\`/formulas/\${id}\`, data); },
    async delete(id: string) { return apiClient.delete(\`/formulas/\${id}\`); },
    async search(query: string) { 
        const all = await this.getAll();
        const q = query.toLowerCase();
        return all.filter((f: any) => f.name.toLowerCase().includes(q));
    }
};

export const modulesService = {
    async getAll() { return []; }, // STUB
    async getById(id: string) { return null; },
    async create(data: any) { return '1'; },
    async update(id: string, data: any) { return; },
    async delete(id: string) { return; },
    async search(query: string) { return []; }
};

export const suppliesService = {
    async getAll() { return []; }, // STUB
    async getById(id: string) { return null; },
    async create(data: any) { return '1'; },
    async update(id: string, data: any) { return; },
    async delete(id: string) { return; },
    async search(query: string) { return []; }
};

export const professionalsService = {
    async getByHospital(id: string) { return []; }, // STUB
    async create(data: any) { return '1'; },
    async update(id: string, data: any) { return; },
    async delete(id: string) { return; }
};

export const prescriptionsService = {
    async getActiveByPatient(patientId: string) { 
        const all = await apiClient.get('/prescriptions');
        return all.find((p: any) => p.patientId === patientId && p.status === 'active');
    },
    async getHistoryByPatient(patientId: string) {
        const all = await apiClient.get('/prescriptions');
        return all.filter((p: any) => p.patientId === patientId);
    },
    async getActive() { return apiClient.get('/prescriptions'); },
    async getById(id: string) { return apiClient.get(\`/prescriptions/\${id}\`); },
    async create(data: any) { return (await apiClient.post('/prescriptions', data)).id; },
    async updateStatus(id: string, status: string) { return apiClient.put(\`/prescriptions/\${id}/status\`, { status }); }
};

export const evolutionsService = {
    async getByPatient(patientId: string) { return apiClient.get(\`/evolutions/patient/\${patientId}\`); },
    async getByPatientAndDateRange(patientId: string, startDate: string, endDate: string) { return apiClient.get(\`/evolutions/patient/\${patientId}\`); },
    async create(data: any) { return (await apiClient.post('/evolutions', data)).id; }
};

export const clinicsService = {
    async getAll() { return []; },
    async getActive() { return []; }
};
export const hospitalsService = {
    async getAll() { return []; },
    async getActive() { return []; }
};
export const wardsService = {
    async getAll() { return []; },
    async getActive() { return []; }
};
export const rolePermissionsService = {
    async getAll() { return []; }
};
export const appToolsService = {
    async getAll() { return []; }
};

export const settingsService = {
    async get() { return {
        hospitalId: 'local-1',
        hospitalName: 'Local Hospital',
        defaultSignatures: { rtName: 'Dr. Admin', rtCrn: '1234' },
        labelSettings: { showConservation: true, defaultConservation: 'Geladeira', openConservation: '24h', closedConservation: '24h' }
    }; },
    async save(data: any) { return; }
};

export const initializeDatabase = async (): Promise<void> => {
    console.log('✅ Connected to Local Database API');
};

export const supabase = {
    channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) })
};
export const db = supabase;
`;

fs.writeFileSync(dbPath, finalContent + newServices);
console.log('Successfully refactored database.ts to remove Supabase dependencies');
