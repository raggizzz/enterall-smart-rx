/**
 * AI Recommendation Engine for Personalized Nutrition Prescriptions
 * Generates automated recommendations based on clinical and anthropometric data
 */

export interface PatientData {
  age: number;
  weight: number;
  height: number;
  diagnosis: string;
  comorbidities: string[];
  administrationRoute: 'oral' | 'enteral' | 'parenteral';
  restrictions: string[];
  clinicalCondition: 'critical' | 'moderate' | 'stable';
  renalFunction: 'normal' | 'impaired' | 'dialysis';
  hepaticFunction: 'normal' | 'impaired';
  diabetic: boolean;
  allergies: string[];
  currentWeight: number;
  idealWeight: number;
  stressLevel: 'low' | 'moderate' | 'high' | 'severe';
}

export interface NutritionRecommendation {
  recommendedFormulas: FormulaRecommendation[];
  totalCalories: number;
  totalProtein: number;
  caloriesPerKg: number;
  proteinPerKg: number;
  infusionSchedule: InfusionSchedule;
  systemType: 'open' | 'closed';
  rationale: string[];
  warnings: string[];
  confidence: number;
}

export interface FormulaRecommendation {
  formulaId: string;
  formulaName: string;
  volume: number;
  percentage: number;
  reason: string;
}

export interface InfusionSchedule {
  method: 'continuous' | 'intermittent' | 'bolus';
  rate?: number;
  times: string[];
  volumePerTime: number;
}

/**
 * Calculate Basal Energy Expenditure using Harris-Benedict Equation
 */
function calculateBEE(weight: number, height: number, age: number, gender: 'male' | 'female' = 'male'): number {
  if (gender === 'male') {
    return 66.5 + (13.75 * weight) + (5.003 * height) - (6.75 * age);
  } else {
    return 655.1 + (9.563 * weight) + (1.850 * height) - (4.676 * age);
  }
}

/**
 * Calculate Total Energy Expenditure with stress factors
 */
function calculateTEE(bee: number, stressLevel: string, activityFactor: number = 1.2): number {
  const stressFactors = {
    low: 1.0,
    moderate: 1.2,
    high: 1.5,
    severe: 1.8,
  };
  
  const stressFactor = stressFactors[stressLevel as keyof typeof stressFactors] || 1.2;
  return bee * activityFactor * stressFactor;
}

/**
 * Calculate protein requirements based on clinical condition
 */
function calculateProteinRequirement(weight: number, condition: string, renalFunction: string): number {
  let proteinPerKg = 1.2; // Default
  
  if (renalFunction === 'dialysis') {
    proteinPerKg = 1.5;
  } else if (renalFunction === 'impaired') {
    proteinPerKg = 0.8;
  } else if (condition === 'critical') {
    proteinPerKg = 1.8;
  } else if (condition === 'moderate') {
    proteinPerKg = 1.5;
  }
  
  return weight * proteinPerKg;
}

/**
 * Select appropriate formulas based on patient characteristics
 */
function selectFormulas(patient: PatientData, targetCalories: number, targetProtein: number): FormulaRecommendation[] {
  const recommendations: FormulaRecommendation[] = [];
  
  // Formula database with nutritional profiles
  const formulas = [
    { id: 'f1', name: 'Nutrison Advanced Diason', caloriesPer100ml: 100, proteinPer100ml: 4.0, type: 'diabetic', fiber: true },
    { id: 'f2', name: 'Fresubin Original', caloriesPer100ml: 100, proteinPer100ml: 3.8, type: 'standard', fiber: false },
    { id: 'f3', name: 'Peptamen', caloriesPer100ml: 100, proteinPer100ml: 4.0, type: 'peptide', fiber: false },
    { id: 'f4', name: 'Nutridrink HP', caloriesPer100ml: 150, proteinPer100ml: 6.0, type: 'high-protein', fiber: false },
    { id: 'f5', name: 'Fresubin Energy Fibre', caloriesPer100ml: 150, proteinPer100ml: 5.6, type: 'high-calorie', fiber: true },
    { id: 'f6', name: 'Nepro', caloriesPer100ml: 200, proteinPer100ml: 8.1, type: 'renal', fiber: false },
    { id: 'f7', name: 'Glucerna', caloriesPer100ml: 100, proteinPer100ml: 4.2, type: 'diabetic', fiber: true },
    { id: 'f8', name: 'Ensure Plus', caloriesPer100ml: 150, proteinPer100ml: 6.25, type: 'high-calorie', fiber: false },
  ];
  
  // Filter formulas based on patient conditions
  let suitableFormulas = formulas.filter(f => {
    if (patient.diabetic && f.type !== 'diabetic') return false;
    if (patient.renalFunction === 'dialysis' && f.type !== 'renal') return false;
    if (patient.restrictions.includes('lactose') && f.name.includes('Ensure')) return false;
    return true;
  });
  
  // If no suitable formulas, use standard ones
  if (suitableFormulas.length === 0) {
    suitableFormulas = formulas.filter(f => f.type === 'standard');
  }
  
  // Select primary formula
  let primaryFormula;
  if (patient.clinicalCondition === 'critical' || targetProtein / patient.weight > 1.5) {
    primaryFormula = suitableFormulas.find(f => f.type === 'high-protein') || suitableFormulas[0];
  } else if (patient.diabetic) {
    primaryFormula = suitableFormulas.find(f => f.type === 'diabetic') || suitableFormulas[0];
  } else if (patient.renalFunction === 'dialysis') {
    primaryFormula = suitableFormulas.find(f => f.type === 'renal') || suitableFormulas[0];
  } else {
    primaryFormula = suitableFormulas[0];
  }
  
  // Calculate volume needed
  const volumeNeeded = (targetCalories / primaryFormula.caloriesPer100ml) * 100;
  
  recommendations.push({
    formulaId: primaryFormula.id,
    formulaName: primaryFormula.name,
    volume: Math.round(volumeNeeded),
    percentage: 100,
    reason: `Fórmula selecionada com base em: ${patient.diabetic ? 'diabetes, ' : ''}${patient.clinicalCondition === 'critical' ? 'condição crítica, ' : ''}necessidades calóricas e proteicas`,
  });
  
  return recommendations;
}

/**
 * Determine optimal infusion schedule
 */
function determineInfusionSchedule(totalVolume: number, administrationRoute: string, clinicalCondition: string): InfusionSchedule {
  if (administrationRoute === 'parenteral') {
    return {
      method: 'continuous',
      rate: Math.round(totalVolume / 24),
      times: ['00:00'],
      volumePerTime: totalVolume,
    };
  }
  
  if (clinicalCondition === 'critical') {
    // Continuous infusion for critical patients
    return {
      method: 'continuous',
      rate: Math.round(totalVolume / 24),
      times: ['00:00'],
      volumePerTime: totalVolume,
    };
  }
  
  // Intermittent infusion - 6 times per day
  const times = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
  return {
    method: 'intermittent',
    times,
    volumePerTime: Math.round(totalVolume / times.length),
  };
}

/**
 * Determine system type (open vs closed)
 */
function determineSystemType(administrationRoute: string, clinicalCondition: string, hospitalPolicy?: string): 'open' | 'closed' {
  // Critical patients should use closed system to reduce infection risk
  if (clinicalCondition === 'critical') {
    return 'closed';
  }
  
  // Enteral route in ICU typically uses closed system
  if (administrationRoute === 'enteral') {
    return 'closed';
  }
  
  // Default to closed for safety
  return 'closed';
}

/**
 * Main AI Recommendation Engine
 */
export function generateNutritionRecommendation(patient: PatientData): NutritionRecommendation {
  const rationale: string[] = [];
  const warnings: string[] = [];
  
  // Calculate BMI
  const bmi = patient.weight / Math.pow(patient.height / 100, 2);
  rationale.push(`IMC calculado: ${bmi.toFixed(1)} kg/m²`);
  
  // Calculate energy requirements
  const bee = calculateBEE(patient.weight, patient.height, patient.age);
  const tee = calculateTEE(bee, patient.stressLevel);
  const targetCalories = Math.round(tee);
  const caloriesPerKg = Math.round(targetCalories / patient.weight);
  
  rationale.push(`Gasto energético basal: ${Math.round(bee)} kcal/dia`);
  rationale.push(`Gasto energético total (com fator de estresse ${patient.stressLevel}): ${targetCalories} kcal/dia`);
  rationale.push(`Meta calórica: ${caloriesPerKg} kcal/kg/dia`);
  
  // Calculate protein requirements
  const targetProtein = calculateProteinRequirement(patient.weight, patient.clinicalCondition, patient.renalFunction);
  const proteinPerKg = Math.round((targetProtein / patient.weight) * 10) / 10;
  
  rationale.push(`Meta proteica: ${proteinPerKg} g/kg/dia (${Math.round(targetProtein)}g/dia)`);
  
  // Add warnings based on patient condition
  if (patient.renalFunction === 'impaired') {
    warnings.push('Função renal comprometida: monitorar ureia e creatinina');
  }
  
  if (patient.diabetic) {
    warnings.push('Paciente diabético: monitorar glicemia e usar fórmulas específicas');
  }
  
  if (bmi < 18.5) {
    warnings.push('Paciente desnutrido: considerar aumento gradual do aporte calórico');
  } else if (bmi > 30) {
    warnings.push('Paciente obeso: ajustar cálculo para peso ideal ou ajustado');
  }
  
  if (patient.clinicalCondition === 'critical') {
    warnings.push('Paciente crítico: iniciar com 50-70% da meta e progredir conforme tolerância');
  }
  
  // Select formulas
  const recommendedFormulas = selectFormulas(patient, targetCalories, targetProtein);
  
  // Determine infusion schedule
  const totalVolume = recommendedFormulas.reduce((sum, f) => sum + f.volume, 0);
  const infusionSchedule = determineInfusionSchedule(totalVolume, patient.administrationRoute, patient.clinicalCondition);
  
  // Determine system type
  const systemType = determineSystemType(patient.administrationRoute, patient.clinicalCondition);
  rationale.push(`Sistema ${systemType === 'closed' ? 'fechado' : 'aberto'} recomendado para reduzir risco de contaminação`);
  
  // Calculate confidence score (0-100)
  let confidence = 85;
  if (patient.comorbidities.length > 3) confidence -= 10;
  if (patient.restrictions.length > 2) confidence -= 10;
  if (patient.clinicalCondition === 'critical') confidence -= 5;
  confidence = Math.max(60, confidence);
  
  return {
    recommendedFormulas,
    totalCalories: targetCalories,
    totalProtein: Math.round(targetProtein),
    caloriesPerKg,
    proteinPerKg,
    infusionSchedule,
    systemType,
    rationale,
    warnings,
    confidence,
  };
}

/**
 * Adjust recommendations based on tolerance and clinical evolution
 */
export function adjustRecommendation(
  currentRecommendation: NutritionRecommendation,
  tolerance: 'good' | 'moderate' | 'poor',
  daysOnTherapy: number
): NutritionRecommendation {
  const adjusted = { ...currentRecommendation };
  
  if (tolerance === 'poor') {
    // Reduce volume by 25%
    adjusted.recommendedFormulas = adjusted.recommendedFormulas.map(f => ({
      ...f,
      volume: Math.round(f.volume * 0.75),
    }));
    adjusted.rationale.push('Volume reduzido em 25% devido à má tolerância');
  } else if (tolerance === 'good' && daysOnTherapy >= 3) {
    // Can increase to full target if not already there
    adjusted.rationale.push('Tolerância adequada: manter ou progredir para meta completa');
  }
  
  return adjusted;
}
