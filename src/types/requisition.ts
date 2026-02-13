export interface DietMapItem {
    patientId: string;
    patientName: string;
    bed: string;
    ward: string;
    dob?: string;
    route: string; // 'SNE', 'GTT', 'Oral', etc.
    type: 'formula' | 'module' | 'water' | 'supplement';
    productName: string;
    volumeOrAmount: number; // ml or g
    unit: string; // 'ml', 'g', 'un'
    rate?: string; // e.g., '60ml/h'
    times: string[]; // e.g., ['09:00', '12:00']
    productCode?: string;
}

export interface ConsolidatedItem {
    code: string;
    name: string;
    billingUnit: string;
    totalQuantity: number;
    unitPrice: number;
    subtotal: number;
    type: 'formula' | 'module' | 'supply' | 'diet';
}

export interface RequisitionData {
    unitName: string;
    startDate: string;
    endDate: string;
    printDate: string;
    selectedTimes: string[];
    dietMap: DietMapItem[];
    consolidated: ConsolidatedItem[];
    signatures: {
        technician: string;
        prescriber: string;
        manager: string;
    };
}
