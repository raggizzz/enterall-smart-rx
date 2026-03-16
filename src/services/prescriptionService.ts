export interface PrescriptionData {
    patient_name: string;
    patient_record: string;
    therapy_type: string;
    feeding_routes: any;
    formulas: any[];
    modules: any[];
    hydration: any;
    parenteral: any;
    oral_diet: any;
    tno_list: any[];
    non_intentional_calories: number;
    total_nutrition: any;
    created_at?: string;
}

export const savePrescription = async (data: PrescriptionData) => {
    const id = `local-prescription-${Date.now()}`;
    const existing = JSON.parse(localStorage.getItem("legacy_prescriptions") || "[]");
    const record = { id, ...data, created_at: data.created_at || new Date().toISOString() };

    localStorage.setItem("legacy_prescriptions", JSON.stringify([...existing, record]));
    return { data: record, error: null };
};
