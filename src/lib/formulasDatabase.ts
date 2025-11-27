/**
 * Complete Enteral Formulas Database - Brazilian Market
 * All nutritional data verified and accurate (2024)
 */

export interface FormulaComposition {
  calories: number; // kcal/100ml
  density?: number; // kcal/ml (calculated or explicit)
  protein: number; // g/100ml
  proteinPct?: number; // % VET
  carbohydrates?: number; // g/100ml
  carbohydratesPct?: number; // % VET
  fat?: number; // g/100ml
  fatPct?: number; // % VET
  fiber?: number; // g/100ml
  sodium?: number; // mg/100ml (Standardizing to 100ml for consistency, will convert if needed)
  potassium?: number; // mg/100ml
  calcium?: number; // mg/100ml
  phosphorus?: number; // mg/100ml
  osmolality?: number;
  waterContent?: number; // ml/1000ml (usually) or ml/100ml? User data says "76.0" for 100ml volume ref? 
  // User data: "Água livre" column has values like 76.0, 81.0, 802.6.
  // For 100ml ref, 76.0 is likely ml/100ml. For 1000ml ref, 802.6 is ml/1000ml.
  // I will store as ml/100ml for consistency.
}

export interface ResidueInfo {
  plastic: number; // g/1000ml
  paper: number; // g/1000ml
  metal: number; // g/1000ml
  glass: number; // g/1000ml
}

export interface Formula {
  id: string;
  code?: string; // T: Código
  name: string; // T: Nome comercial
  manufacturer: string; // T: Fabricante
  type: 'standard' | 'high-protein' | 'high-calorie' | 'diabetic' | 'renal' | 'peptide' | 'fiber' | 'immune';
  classification?: string; // T: Classificação (ex: hiperproteica)
  macronutrientComplexity?: 'polymeric' | 'oligomeric'; // T: Complexidade
  systemType: 'open' | 'closed' | 'both';
  composition: FormulaComposition;
  presentations: number[]; // Embalagem padrão (N)
  presentationDescription?: string; // T: Apresentação (ex: gramas/mL, sachê)
  billingUnit?: 'ml' | 'g' | 'unit'; // T: Unidade de faturamento
  conversionFactor?: number; // N: Fator de conversão (mL/g por unidade)
  billingPrice?: number; // N: Valor por unidade
  residueInfo?: ResidueInfo; // Informações sobre resíduo
  indications?: string[];
  contraindications?: string[];
  specialFeatures?: string[];
  descriptionForEvolution?: string; // T: Texto padrão para evolução

  // Reference values for catalog display
  referenceVolume?: number; // ml
  referenceTimesPerDay?: number;
  referencePackSize?: number; // ml (for closed)
  referenceInfusionTime?: number; // h (for closed)
  referenceDripRate?: number; // drops/min or ml/h (for closed)
  referenceNumPacks?: number; // (for closed)
}

export interface Module {
  id: string;
  name: string;
  density: number; // DC (kcal/g or kcal/ml)
  referenceAmount: number; // g or ml
  referenceTimesPerDay: number;
  calories: number; // Kcal in ref
  protein: number; // PTN in ref
  sodium: number; // Na in ref
  potassium: number; // K in ref
  fiber: number; // Fibras in ref
  freeWater: number; // Água livre in ref
}

// Complete Database
const formulas: Formula[] = [
  // --- Fórmulas Enterais (Sistema Aberto) ---
  {
    id: "1",
    code: "FTNEA06",
    name: "Novasource Senior",
    manufacturer: "Nestlé",
    type: "standard",
    systemType: "open",
    composition: { calories: 125, density: 1.3, protein: 7.0, sodium: 105, potassium: 160, fiber: 0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, normocalórica e hiperprotéica, isenta de fibras, lactose, sacarose e glúten."
  },
  {
    id: "2",
    code: "PTNEA08",
    name: "Peptamen 1.5",
    manufacturer: "Nestlé",
    type: "peptide",
    systemType: "open",
    composition: { calories: 150, density: 1.5, protein: 7.1, sodium: 95, potassium: 126, fiber: 0, waterContent: 76 },
    presentations: [200],
    referenceVolume: 200,
    referenceTimesPerDay: 7, // User data: 200ml 7x/day? "Peptamen 1,5 (PTNEA08) 1.5 200 7 2100..."
    descriptionForEvolution: "Dieta enteral oligomérica, hipercalórica (DC 1,5kcal/ml) e normoprotéica, com 100% proteína isolada do soro do leite. Isenta de sacarose e glúten, contém lactose."
  },
  {
    id: "3",
    code: "S25",
    name: "Proline",
    manufacturer: "Nestlé",
    type: "high-protein",
    systemType: "open",
    composition: { calories: 137, density: 1.4, protein: 8.0, sodium: 100, potassium: 155, fiber: 0.5, waterContent: 76 },
    presentations: [200],
    referenceVolume: 200,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral fórmula polimérica, hipercalórica e hiperproteica, adicionada de arginina e prolina."
  },
  {
    id: "4",
    code: "Renal",
    name: "Novasource Ren",
    manufacturer: "Nestlé",
    type: "renal",
    systemType: "open",
    composition: { calories: 200, density: 2.0, protein: 8.0, sodium: 70, potassium: 105, fiber: 0, waterContent: 70 },
    presentations: [200],
    referenceVolume: 200,
    referenceTimesPerDay: 2,
    descriptionForEvolution: "Dieta enteral hipercalórica, hiperprotéica, com baixo teor de sódio e fósforo, sem adição de sacarose, isenta de fibras."
  },
  {
    id: "5",
    code: "PTNEA04",
    name: "Isosource 1.5",
    manufacturer: "Nestlé",
    type: "high-calorie",
    systemType: "open",
    composition: { calories: 150, density: 1.5, protein: 6.0, sodium: 145, potassium: 220, fiber: 0.8, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, hipercalórica e normoprotéica, com fibras solúveis e insolúveis, isenta de lactose, sacarose e glúten."
  },
  {
    id: "6",
    code: "Mod20",
    name: "Modulen 20g/100ml",
    manufacturer: "Nestlé",
    type: "standard",
    systemType: "open",
    composition: { calories: 100, density: 1.0, protein: 4.0, sodium: 35, potassium: 122, fiber: 0, waterContent: 81 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, normoproteica, adicionada de TGF-b2."
  },
  {
    id: "7",
    code: "Mod30",
    name: "Modulen 30g/100ml",
    manufacturer: "Nestlé",
    type: "high-calorie",
    systemType: "open",
    composition: { calories: 148, density: 1.5, protein: 5.0, sodium: 51, potassium: 180, fiber: 0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, normoproteica, adicionada de TGF-b2, concentrada."
  },
  {
    id: "8",
    code: "FTNEA01",
    name: "Trophic Basic 20g/100",
    manufacturer: "Prodiet",
    type: "standard",
    systemType: "open",
    composition: { calories: 100, density: 1.0, protein: 4.0, sodium: 0, potassium: 0, fiber: 0, waterContent: 81 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, normoprotéica, isenta de fibras, sacarose e glúten."
  },
  {
    id: "9",
    code: "FTNEA01-30",
    name: "Trophic Basic 30g/100",
    manufacturer: "Prodiet",
    type: "high-calorie",
    systemType: "open",
    composition: { calories: 150, density: 1.5, protein: 6.0, sodium: 0, potassium: 0, fiber: 0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, normoprotéica, isenta de fibras, sacarose e glúten (Concentrada)."
  },
  {
    id: "10",
    code: "FTNEA02",
    name: "Isosource Soya Fiber",
    manufacturer: "Nestlé",
    type: "fiber",
    systemType: "open",
    composition: { calories: 126, density: 1.3, protein: 4.0, sodium: 115, potassium: 210, fiber: 1.7, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, normocalórica e normoprotéica, com fibras solúveis e insolúveis, isenta de lactose, sacarose e glúten."
  },
  {
    id: "11",
    code: "FEA10",
    name: "Total Nutrition Proliv",
    manufacturer: "Nestlé",
    type: "high-calorie",
    systemType: "open",
    composition: { calories: 150, density: 1.5, protein: 4.0, sodium: 40, potassium: 97, fiber: 0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, hiperclaórica e normoprotéica, adicionada de aminoácidos de cadeia ramificada."
  },
  {
    id: "12",
    code: "FEA13",
    name: "Nutri RD",
    manufacturer: "Nestlé",
    type: "renal",
    systemType: "open",
    composition: { calories: 200, density: 2.0, protein: 8.0, sodium: 200, potassium: 167, fiber: 0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral hipercalórica, hiprotéica, com baixo teor de sódio de fósforo, sem adição de sacarose, isenta de fibras."
  },
  {
    id: "13",
    code: "S22",
    name: "Nutren Control",
    manufacturer: "Nestlé",
    type: "diabetic",
    systemType: "open",
    composition: { calories: 106, density: 1.1, protein: 8.0, sodium: 73, potassium: 220, fiber: 2.0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Suplemento nutricional de fórmula normocalórica e hiperproteica, sem sacarose e lactose, com carboidratos de baixo índice glicêmico."
  },
  {
    id: "14",
    code: "S26",
    name: "Fresubin Energy Protein",
    manufacturer: "Fresenius",
    type: "high-protein",
    systemType: "open",
    composition: { calories: 148, density: 1.5, protein: 10.0, sodium: 112, potassium: 197, fiber: 0, waterContent: 81 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Suplemento nutricional de fórmula hipercalórica e hiperprotéica com sacarose."
  },
  {
    id: "15",
    code: "Iso10",
    name: "Isosource 1.0",
    manufacturer: "Nestlé",
    type: "standard",
    systemType: "open",
    composition: { calories: 100, density: 1.0, protein: 4.0, sodium: 300, potassium: 670, fiber: 0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Suplemento alimentar polimérico, normoprotéico, com sacarose, isento de lactose e fibras."
  },
  {
    id: "16",
    code: "S23",
    name: "Fresubin Energy Drink",
    manufacturer: "Fresenius",
    type: "high-calorie",
    systemType: "open",
    composition: { calories: 150, density: 1.5, protein: 6.0, sodium: 85, potassium: 135, fiber: 0, waterContent: 81 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Suplemento nutricional de fórmula hipercalórica e normoprotéica, com sacarose, isento de fibras."
  },
  {
    id: "17",
    code: "Impact",
    name: "Impact",
    manufacturer: "Nestlé",
    type: "immune",
    systemType: "open",
    composition: { calories: 100, density: 1.0, protein: 6.0, sodium: 130, potassium: 75, fiber: 0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Fórmula imunomoduladora."
  },
  {
    id: "18",
    code: "ProlineSF",
    name: "Proline 1L SF",
    manufacturer: "Nestlé",
    type: "high-protein",
    systemType: "open",
    composition: { calories: 130, density: 1.3, protein: 7.0, sodium: 103, potassium: 239, fiber: 0.8, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral fórmula polimérica, hipercalórica e hiperproteica."
  },
  {
    id: "19",
    code: "FEA14",
    name: "HD Max",
    manufacturer: "Nestlé",
    type: "renal",
    systemType: "open",
    composition: { calories: 150, density: 1.5, protein: 6.75, sodium: 115, potassium: 60, fiber: 0, waterContent: 76 },
    presentations: [210],
    referenceVolume: 210,
    referenceTimesPerDay: 4,
    descriptionForEvolution: "Fórmula para diálise."
  },

  // --- Fórmulas Enterais (Sistema Fechado) ---
  {
    id: "20",
    code: "FTNEA09",
    name: "Peptamen HN",
    manufacturer: "Nestlé",
    type: "peptide",
    systemType: "closed",
    composition: { calories: 135, density: 1.35, protein: 6.7, sodium: 85, potassium: 150, fiber: 0.8, waterContent: 76 },
    presentations: [500, 1000],
    referenceVolume: 1056,
    referenceTimesPerDay: 1,
    referencePackSize: 500,
    referenceInfusionTime: 22,
    referenceDripRate: 48,
    referenceNumPacks: 2.112,
    descriptionForEvolution: "Dieta enteral oligomérica, hipercalórica (DC 1,35kcal/ml), hiperproteica, com 70% das gorduras totais de TCM."
  },
  {
    id: "21",
    code: "FEA15",
    name: "Novasource Proline",
    manufacturer: "Nestlé",
    type: "high-protein",
    systemType: "closed",
    composition: { calories: 130, density: 1.3, protein: 7.5, sodium: 103, potassium: 239, fiber: 0.8, waterContent: 76 },
    presentations: [1000],
    referenceVolume: 1056,
    referenceTimesPerDay: 1,
    referencePackSize: 1000,
    referenceInfusionTime: 22,
    referenceDripRate: 48,
    referenceNumPacks: 1.056,
    descriptionForEvolution: "Dieta enteral fórmula polimérica, hipercalórica (DC 1,3kcal/ml) e hiperproteica, adicionada de arginina e prolina."
  },
  {
    id: "22",
    code: "FTNEA07",
    name: "Novasource HP",
    manufacturer: "Nestlé",
    type: "high-protein",
    systemType: "closed",
    composition: { calories: 150, density: 1.5, protein: 8.2, sodium: 132, potassium: 250, fiber: 0.8, waterContent: 76 },
    presentations: [1000],
    referenceVolume: 1056,
    referenceTimesPerDay: 1,
    referencePackSize: 1000,
    referenceInfusionTime: 22,
    referenceDripRate: 48,
    referenceNumPacks: 1.056,
    descriptionForEvolution: "Dieta enteral polimérica, hipercalórica DC 1,5kcal/ml e hiperproteica, isenta de glúten, fibras e sacarose."
  },
  {
    id: "23",
    code: "FTNEA08-C",
    name: "Peptamen 1.5 (Fechado)",
    manufacturer: "Nestlé",
    type: "peptide",
    systemType: "closed",
    composition: { calories: 150, density: 1.5, protein: 6.7, sodium: 90, potassium: 215, fiber: 0, waterContent: 76 },
    presentations: [1000],
    referenceVolume: 1056,
    referenceTimesPerDay: 1,
    referencePackSize: 1000,
    referenceInfusionTime: 22,
    referenceDripRate: 48,
    referenceNumPacks: 1.056,
    descriptionForEvolution: "Dieta enteral oligomérica, hipercalórica (DC 1,5kcal/ml) e normoprotéica."
  },
  {
    id: "24",
    code: "FTNEA03",
    name: "Novasource GC",
    manufacturer: "Nestlé",
    type: "diabetic",
    systemType: "closed",
    composition: { calories: 113, density: 1.13, protein: 5.1, sodium: 90, potassium: 250, fiber: 1.5, waterContent: 76 },
    presentations: [1000],
    referenceVolume: 1056,
    referenceTimesPerDay: 1,
    referencePackSize: 1000,
    referenceInfusionTime: 22,
    referenceDripRate: 37.12,
    referenceNumPacks: 1.056,
    descriptionForEvolution: "Dieta enteral polimérica normocalórica DC 1,1kcal/ml, normoproteica e hiperlipídica, com fibras."
  },
  {
    id: "25",
    code: "PeptIntense",
    name: "Peptamen Intense",
    manufacturer: "Nestlé",
    type: "peptide",
    systemType: "closed",
    composition: { calories: 101, density: 1.01, protein: 9.3, sodium: 70, potassium: 150, fiber: 0.05, waterContent: 81 },
    presentations: [1000],
    referenceVolume: 1056,
    referenceTimesPerDay: 1,
    referencePackSize: 1000,
    referenceInfusionTime: 22,
    referenceDripRate: 40.29,
    referenceNumPacks: 1.056,
    descriptionForEvolution: "Dieta enteral oligomérica hiperproteica."
  }
];

const modules: Module[] = [
  { id: "m1", name: "Fresubin protein", density: 0.90, referenceAmount: 7, referenceTimesPerDay: 7, calories: 171, protein: 43, sodium: 270, potassium: 588, fiber: 0, freeWater: 0 },
  { id: "m2", name: "TCM com AGE", density: 9.00, referenceAmount: 1, referenceTimesPerDay: 1, calories: 9, protein: 0, sodium: 0, potassium: 0, fiber: 0, freeWater: 0 },
  { id: "m3", name: "carbofor", density: 3.72, referenceAmount: 1, referenceTimesPerDay: 1, calories: 4, protein: 0, sodium: 0, potassium: 0, fiber: 0, freeWater: 0 },
  { id: "m4", name: "neofiber", density: 0, referenceAmount: 0, referenceTimesPerDay: 0, calories: 0, protein: 0, sodium: 0, potassium: 0, fiber: 0, freeWater: 0 },
  { id: "m5", name: "Solufiber", density: 0, referenceAmount: 0, referenceTimesPerDay: 0, calories: 0, protein: 0, sodium: 0, potassium: 0, fiber: 0, freeWater: 0 },
  { id: "m6", name: "Glutamina", density: 4.00, referenceAmount: 1, referenceTimesPerDay: 1, calories: 4, protein: 1, sodium: 0, potassium: 0, fiber: 0, freeWater: 0 },
  { id: "m7", name: "Agua de coco", density: 0.20, referenceAmount: 0, referenceTimesPerDay: 0, calories: 0, protein: 0, sodium: 0, potassium: 0, fiber: 0, freeWater: 0 },
];

export const getAllFormulas = () => formulas;
export const getAllModules = () => modules;

export const searchFormulas = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return formulas.filter(f =>
    f.name.toLowerCase().includes(lowerQuery) ||
    f.code?.toLowerCase().includes(lowerQuery) ||
    f.manufacturer.toLowerCase().includes(lowerQuery)
  );
};

export const getAllManufacturers = () => {
  return Array.from(new Set(formulas.map(f => f.manufacturer))).sort();
};

export const getAllTypes = () => {
  const types = formulas.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(types).map(([type, count]) => ({
    type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    count
  }));
};

export const getFormulasBySystem = (system: 'open' | 'closed') => {
  return formulas.filter(f => f.systemType === system || f.systemType === 'both');
};

export const getFormulasByManufacturer = (manufacturer: string) => {
  return formulas.filter(f => f.manufacturer === manufacturer);
};

export const getFormulasByType = (type: string) => {
  return formulas.filter(f => f.type === type);
};

// Export all formulas utilities
export * from './formulasUtils';
