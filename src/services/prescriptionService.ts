import { supabase } from "@/lib/supabase";

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
    // Check if Supabase is configured
    if (!import.meta.env.VITE_SUPABASE_URL) {
        console.warn("Supabase not configured. Mocking save.");
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { data: { id: 'mock-id-' + Date.now() }, error: null };
    }

    const { data: result, error } = await supabase
        .from('prescriptions')
        .insert([data])
        .select()
        .single();

    if (error) {
        console.error("Error saving prescription:", error);
        throw error;
    }

    return { data: result, error: null };
};
