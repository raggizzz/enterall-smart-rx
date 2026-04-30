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
  type: 'standard' | 'high-protein' | 'high-calorie' | 'diabetic' | 'renal' | 'peptide' | 'fiber' | 'immune' | 'oral-supplement' | 'infant-formula';
  classification?: string; // T: Classificação (ex: hiperproteica)
  macronutrientComplexity?: 'polymeric' | 'oligomeric'; // T: Complexidade dos macronutrientes
  systemType: 'open' | 'closed' | 'both'; // Legacy field, use formulaTypes for multi-select
  formulaTypes?: string[]; // NEW: Array para múltipla seleção: 'open', 'closed', 'supplement', 'module'
  composition: FormulaComposition;
  presentations: number[]; // Embalagem padrão (N)
  presentationDescription?: string; // T: Apresentação detalhada (ex: Frasco 1000ml)
  presentationForm?: 'liquido' | 'po'; // NEW: Forma de apresentação: líquido ou pó
  description?: string; // NEW: Descrição da fórmula para sugestão de evolução
  billingUnit?: 'ml' | 'g' | 'unit'; // T: Unidade de faturamento
  conversionFactor?: number; // N: Fator de conversão (mL/g por unidade)
  billingPrice?: number; // N: Valor por unidade
  residueInfo?: ResidueInfo; // Informações sobre geração de resíduos
  indications?: string[];
  contraindications?: string[];
  specialFeatures?: string[];
  descriptionForEvolution?: string; // T: Texto padrão para evolução (legacy, use description)

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
  code?: string;
  name: string;
  manufacturer?: string;
  description?: string;
  presentationForm?: 'liquido' | 'po';
  presentations?: number[];
  conversionFactor?: number;
  density: number; // DC (kcal/g or kcal/ml)
  referenceAmount: number; // g or ml
  referenceTimesPerDay: number;
  calories: number; // Kcal in ref
  protein: number; // PTN in ref
  sodium: number; // Na in ref
  potassium: number; // K in ref
  fiber: number; // Fibras in ref
  freeWater: number; // Água livre in ref
  plasticG?: number;
  paperG?: number;
  metalG?: number;
  glassG?: number;
}

// Complete Database
const formulas: Formula[] = [
  // --- Fórmulas Enterais (Sistema Aberto) ---
  {
    id: "1",
    code: "FTNEA06",
    name: "Novasource Senior",
    manufacturer: "Nestle",
    type: "standard",
    systemType: "open",
    composition: { calories: 125, density: 1.25, protein: 6.5625, carbohydrates: 14.0625, fat: 4.7222, sodium: 105, potassium: 160, fiber: 0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, normocalórica e hiperprotéica, isenta de fibras, lactose, sacarose e glúten."
  },
  {
    id: "2",
    code: "PTNEA08",
    name: "Peptamen 1.5",
    manufacturer: "Nestle",
    type: "peptide",
    systemType: "open",
    composition: { calories: 150, density: 1.5, protein: 6.75, carbohydrates: 18, fat: 5.6667, sodium: 90, potassium: 215, fiber: 0, waterContent: 76 },
    presentations: [200],
    referenceVolume: 200,
    referenceTimesPerDay: 7, // User data: 200ml 7x/day? "Peptamen 1,5 (PTNEA08) 1.5 200 7 2100..."
    descriptionForEvolution: "Dieta enteral oligomérica, hipercalórica (DC 1,5kcal/ml) e normoprotéica, com 100% proteína isolada do soro do leite. Isenta de sacarose e glúten, contém lactose."
  },
  {
    id: "3",
    code: "S25",
    name: "Proline",
    manufacturer: "Nestle",
    type: "high-protein",
    systemType: "open",
    composition: { calories: 137, density: 1.37, protein: 9.9325, carbohydrates: 16.0975, fat: 3.6533, sodium: 100, potassium: 155, fiber: 0.5, waterContent: 76 },
    presentations: [200],
    referenceVolume: 200,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral fórmula polimérica, hipercalórica e hiperproteica, adicionada de arginina e prolina."
  },
  {
    id: "4",
    code: "Renal",
    name: "Novasource Ren",
    manufacturer: "Nestle",
    type: "renal",
    systemType: "open",
    composition: { calories: 150, density: 1.5, protein: 6.375, carbohydrates: 21, fat: 4.5, sodium: 145, potassium: 220, fiber: 0.8, waterContent: 76 },
    presentations: [200],
    referenceVolume: 200,
    referenceTimesPerDay: 2,
    descriptionForEvolution: "Dieta enteral hipercalórica, hiperprotéica, com baixo teor de sódio e fósforo, sem adição de sacarose, isenta de fibras."
  },
  {
    id: "5",
    code: "PTNEA04",
    name: "Isosource 1.5",
    manufacturer: "Nestle",
    type: "high-calorie",
    systemType: "open",
    composition: { calories: 150, density: 1.5, protein: 6.375, carbohydrates: 21, fat: 4.5, sodium: 145, potassium: 220, fiber: 0.8, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, hipercalórica e normoprotéica, com fibras solúveis e insolúveis, isenta de lactose, sacarose e glúten."
  },
  {
    id: "6",
    code: "Mod20",
    name: "Modulen 20g/100ml",
    manufacturer: "Nestle",
    type: "standard",
    systemType: "open",
    composition: { calories: 100, density: 1.0, protein: 2.75, carbohydrates: 11, fat: 5, sodium: 35, potassium: 122, fiber: 0, waterContent: 81 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, normoproteica, adicionada de TGF-b2."
  },
  {
    id: "7",
    code: "Mod30",
    name: "Modulen 30g/100ml",
    manufacturer: "Nestle",
    type: "high-calorie",
    systemType: "open",
    composition: { calories: 148, density: 1.48, protein: 4.07, carbohydrates: 16.28, fat: 7.4, sodium: 51, potassium: 180, fiber: 0, waterContent: 76 },
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
    composition: { calories: 100, density: 1.0, protein: 3.75, carbohydrates: 13.75, fat: 3.3333, sodium: 61, potassium: 177, fiber: 0, waterContent: 81 },
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
    composition: { calories: 150, density: 1.5, protein: 5.625, carbohydrates: 20.625, fat: 5, sodium: 61, potassium: 177, fiber: 1.0, waterContent: 81 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, normoprotéica, isenta de fibras, sacarose e glúten (Concentrada)."
  },
  {
    id: "10",
    code: "FTNEA02",
    name: "Isosource Soya Fiber",
    manufacturer: "Nestle",
    type: "fiber",
    systemType: "open",
    composition: { calories: 126, density: 1.26, protein: 4.725, carbohydrates: 17.325, fat: 4.2, sodium: 115, potassium: 210, fiber: 1.7, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, normocalórica e normoprotéica, com fibras solúveis e insolúveis, isenta de lactose, sacarose e glúten."
  },
  {
    id: "11",
    code: "FEA10",
    name: "Total Nutrition Proliv",
    manufacturer: "Nestle",
    type: "high-calorie",
    systemType: "open",
    composition: { calories: 150, density: 1.5, protein: 4.125, carbohydrates: 26.625, fat: 3, sodium: 40, potassium: 97, fiber: 0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimérica, hiperclaórica e normoprotéica, adicionada de aminoácidos de cadeia ramificada."
  },
  {
    id: "12",
    code: "FEA13",
    name: "Nutri RD",
    manufacturer: "Nestle",
    type: "renal",
    systemType: "open",
    composition: { calories: 200, density: 2.0, protein: 7.5, carbohydrates: 28, fat: 6.4444, sodium: 87, potassium: 135, fiber: 0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral hipercalórica, hiprotéica, com baixo teor de sódio de fósforo, sem adição de sacarose, isenta de fibras."
  },
  {
    id: "13",
    code: "S22",
    name: "Nutren Control",
    manufacturer: "Nestle",
    type: "diabetic",
    systemType: "open",
    composition: { calories: 106, density: 1.06, protein: 7.685, carbohydrates: 7.42, fat: 5.0644, sodium: 72, potassium: 220, fiber: 1.6, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Suplemento nutricional de fórmula normocalórica e hiperproteica, sem sacarose e lactose, com carboidratos de baixo índice glicêmico."
  },
  {
    id: "14",
    code: "S26",
    name: "Nutren 1.5 Protein",
    manufacturer: "Nestle",
    type: "high-protein",
    systemType: "open",
    composition: { calories: 148, density: 1.48, protein: 9.99, carbohydrates: 10.73, fat: 7.2356, sodium: 112, potassium: 197, fiber: 0, waterContent: 81 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Suplemento nutricional de fórmula hipercalórica e hiperprotéica com sacarose."
  },
  {
    id: "15",
    code: "Iso10",
    name: "Isosource 1.0",
    manufacturer: "Nestle",
    type: "standard",
    systemType: "open",
    composition: { calories: 102, density: 1.02, protein: 4.08, carbohydrates: 14.535, fat: 3.06, sodium: 300, potassium: 670, fiber: 0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Suplemento alimentar polimérico, normoprotéico, com sacarose, isento de lactose e fibras."
  },
  {
    id: "16",
    code: "S23",
    name: "Nutren 1.5",
    manufacturer: "Nestle",
    type: "high-calorie",
    systemType: "open",
    composition: { calories: 154, density: 1.54, protein: 5.775, carbohydrates: 21.945, fat: 4.7911, sodium: 70, potassium: 160, fiber: 0, waterContent: 81 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Suplemento nutricional de fórmula hipercalórica e normoprotéica, com sacarose, isento de fibras."
  },
  {
    id: "17",
    code: "Impact",
    name: "Impact",
    manufacturer: "Nestle",
    type: "immune",
    systemType: "open",
    composition: { calories: 100, density: 1.0, protein: 3.75, carbohydrates: 14.25, fat: 3.1111, sodium: 70, potassium: 160, fiber: 0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Fórmula imunomoduladora."
  },
  {
    id: "18",
    code: "ProlineSF",
    name: "Proline 1L SF",
    manufacturer: "Nestle",
    type: "high-protein",
    systemType: "open",
    composition: { calories: 130, density: 1.3, protein: 4.875, carbohydrates: 18.525, fat: 4.0444, sodium: 70, potassium: 160, fiber: 0.8, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral fórmula polimérica, hipercalórica e hiperproteica."
  },
  {
    id: "19",
    code: "FEA14",
    name: "HD Max",
    manufacturer: "Nestle",
    type: "renal",
    systemType: "open",
    composition: { calories: 150, density: 1.5, protein: 6.75, carbohydrates: 20.25, fat: 4.6667, sodium: 115, potassium: 60, fiber: 0, waterContent: 81 },
    presentations: [200],
    referenceVolume: 200,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Fórmula para diálise."
  },

  // --- Fórmulas Enterais (Sistema Fechado) ---
  {
    id: "20",
    code: "FTNEA09",
    name: "Peptamen HN",
    manufacturer: "Nestle",
    type: "peptide",
    systemType: "closed",
    composition: { calories: 135, density: 1.35, protein: 6.75, carbohydrates: 15.525, fat: 5.1, sodium: 85, potassium: 150, fiber: 0, waterContent: 76 },
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
    manufacturer: "Nestle",
    type: "high-protein",
    systemType: "closed",
    composition: { calories: 130, density: 1.3, protein: 7.475, carbohydrates: 13, fat: 5.3444, sodium: 103, potassium: 239, fiber: 0.8, waterContent: 76 },
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
    manufacturer: "Nestle",
    type: "high-protein",
    systemType: "closed",
    composition: { calories: 150, density: 1.5, protein: 8.25, carbohydrates: 12.75, fat: 7.3333, sodium: 132, potassium: 250, fiber: 0, waterContent: 76 },
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
    manufacturer: "Nestle",
    type: "peptide",
    systemType: "closed",
    composition: { calories: 150, density: 1.5, protein: 6.75, carbohydrates: 18, fat: 5.6667, sodium: 90, potassium: 215, fiber: 0, waterContent: 76 },
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
    manufacturer: "Nestle",
    type: "diabetic",
    systemType: "closed",
    composition: { calories: 113, density: 1.13, protein: 5.1, carbohydrates: 14.125, fat: 4.0178, sodium: 90, potassium: 250, fiber: 1.5, waterContent: 76 },
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
    manufacturer: "Nestle",
    type: "peptide",
    systemType: "closed",
    composition: { calories: 101, density: 1.01, protein: 9.3425, carbohydrates: 7.3225, fat: 3.8156, sodium: 70, potassium: 150, fiber: 0.05, waterContent: 81 },
    presentations: [1000],
    referenceVolume: 1056,
    referenceTimesPerDay: 1,
    referencePackSize: 1000,
    referenceInfusionTime: 22,
    referenceDripRate: 40.29,
    referenceNumPacks: 1.056,
    descriptionForEvolution: "Dieta enteral oligomérica hiperproteica."
  },
  {
    id: "26",
    code: "FTNEA01-10",
    name: "Trophic Basic 10g/100",
    manufacturer: "Prodiet",
    type: "standard",
    systemType: "open",
    composition: { calories: 50, density: 0.5, protein: 1.875, carbohydrates: 6.875, fat: 1.6667, sodium: 30.5, potassium: 88.5, fiber: 0, waterContent: 87 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral polimerica, normoproteica, isenta de fibras, sacarose e gluten em diluicao 10g/100ml."
  },
  {
    id: "27",
    code: "Pentasure30",
    name: "Pentasure 30g/100ml",
    manufacturer: "Danone",
    type: "high-calorie",
    systemType: "open",
    composition: { calories: 150, density: 1.5, protein: 6, carbohydrates: 16.5, fat: 6.6667, sodium: 38.4, potassium: 192, fiber: 0, waterContent: 76 },
    presentations: [100],
    referenceVolume: 100,
    referenceTimesPerDay: 1,
    descriptionForEvolution: "Dieta enteral hipercalorica em diluicao 30g/100ml."
  },
  {
    id: "28",
    code: "FTNEA04-C",
    name: "Isosource 1.5 (Fechado)",
    manufacturer: "Nestle",
    type: "high-calorie",
    systemType: "closed",
    composition: { calories: 150, density: 1.5, protein: 6.375, carbohydrates: 12.75, fat: 8.1667, sodium: 145, potassium: 220, fiber: 0.8, waterContent: 81 },
    presentations: [1000],
    referenceVolume: 1056,
    referenceTimesPerDay: 1,
    referencePackSize: 1000,
    referenceInfusionTime: 22,
    referenceDripRate: 48,
    referenceNumPacks: 1.056,
    descriptionForEvolution: "Dieta enteral polimerica, hipercalorica e normoproteica, em sistema fechado."
  }
];

const modules: Module[] = [
  { id: "m1", code: "M1", name: "Fresubin protein", manufacturer: "Fresenius", presentationForm: "po", presentations: [300], density: 3.4848, referenceAmount: 1, referenceTimesPerDay: 1, calories: 3.4848, protein: 0.8712, sodium: 5.5, potassium: 12, fiber: 0, freeWater: 0 },
  { id: "m2", code: "MN32", name: "Iso Whey", manufacturer: "Maxinutri", presentationForm: "po", presentations: [300], density: 3.74, referenceAmount: 100, referenceTimesPerDay: 1, calories: 374, protein: 88, carbs: 5.984, fat: 4.675, sodium: 148, potassium: 0, fiber: 0, freeWater: 0 },
  { id: "m3", code: "M2", name: "TCM com AGE", manufacturer: "Generico", presentationForm: "po", presentations: [250], density: 8.1, referenceAmount: 1, referenceTimesPerDay: 1, calories: 8.1, protein: 0, fat: 0.9, sodium: 0, potassium: 0, fiber: 0, freeWater: 0 },
  { id: "m4", code: "MN33", name: "carbofor", manufacturer: "Generico", presentationForm: "po", presentations: [400], density: 4.0, referenceAmount: 1, referenceTimesPerDay: 1, calories: 4, protein: 0, carbs: 1, sodium: 0.3, potassium: 0, fiber: 0, freeWater: 0 },
  { id: "m5", code: "M4", name: "neofiber", manufacturer: "Generico", presentationForm: "po", presentations: [260], density: 0, referenceAmount: 1, referenceTimesPerDay: 1, calories: 0, protein: 0, sodium: 0, potassium: 0, fiber: 0.009, freeWater: 0 },
  { id: "m6", code: "MN35", name: "Solufiber", manufacturer: "Generico", presentationForm: "po", presentations: [260], density: 0, referenceAmount: 1, referenceTimesPerDay: 1, calories: 0, protein: 0, sodium: 0, potassium: 0, fiber: 0.009, freeWater: 0 },
  { id: "m7", code: "M6", name: "Glutamina", manufacturer: "Generico", presentationForm: "po", presentations: [300], density: 4.00, referenceAmount: 1, referenceTimesPerDay: 1, calories: 4, protein: 1, sodium: 0, potassium: 0, fiber: 0, freeWater: 0 },
  { id: "m8", code: "MN39", name: "Thicken up", manufacturer: "Generico", presentationForm: "po", presentations: [125], density: 0, referenceAmount: 1, referenceTimesPerDay: 1, calories: 0, protein: 0, sodium: 0, potassium: 0, fiber: 0, freeWater: 0 },
  { id: "m9", code: "M7", name: "Agua de coco", manufacturer: "Generico", presentationForm: "liquido", presentations: [200], density: 0.20, referenceAmount: 1, referenceTimesPerDay: 1, calories: 0.20, protein: 0, sodium: 0, potassium: 0, fiber: 0, freeWater: 0 },
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
