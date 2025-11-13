/**
 * Automated Calculations Module
 * Eliminates manual spreadsheets and minimizes human errors
 * Calculates macronutrients, micronutrients, volumes, infusion rates, and costs
 */

export interface NutritionalCalculation {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  phosphorus?: number;
}

export interface VolumeCalculation {
  totalVolume: number;
  volumePerTime: number;
  numberOfTimes: number;
  infusionRate?: number;
  duration?: number;
}

export interface CostCalculation {
  formulaCost: number;
  equipmentCost: number;
  laborCost: number;
  totalCost: number;
  costPerDay: number;
  costPerMl: number;
}

export interface PatientCalculation {
  patientId: string;
  bedNumber: string;
  nutritional: NutritionalCalculation;
  volume: VolumeCalculation;
  cost: CostCalculation;
  date: Date;
}

export interface WardCalculation {
  wardName: string;
  totalPatients: number;
  totalVolume: number;
  totalCalories: number;
  totalProtein: number;
  totalCost: number;
  averageCostPerPatient: number;
  patients: PatientCalculation[];
}

/**
 * Calculate nutritional values from formula and volume
 */
export function calculateNutrition(
  formulaComposition: {
    caloriesPer100ml: number;
    proteinPer100ml: number;
    carbohydratesPer100ml?: number;
    fatPer100ml?: number;
    fiberPer100ml?: number;
    sodium?: number;
    potassium?: number;
    calcium?: number;
    phosphorus?: number;
  },
  volume: number
): NutritionalCalculation {
  const factor = volume / 100;

  return {
    calories: Math.round(formulaComposition.caloriesPer100ml * factor),
    protein: Math.round(formulaComposition.proteinPer100ml * factor * 10) / 10,
    carbohydrates: formulaComposition.carbohydratesPer100ml 
      ? Math.round(formulaComposition.carbohydratesPer100ml * factor * 10) / 10 
      : 0,
    fat: formulaComposition.fatPer100ml 
      ? Math.round(formulaComposition.fatPer100ml * factor * 10) / 10 
      : 0,
    fiber: formulaComposition.fiberPer100ml 
      ? Math.round(formulaComposition.fiberPer100ml * factor * 10) / 10 
      : undefined,
    sodium: formulaComposition.sodium 
      ? Math.round(formulaComposition.sodium * factor) 
      : undefined,
    potassium: formulaComposition.potassium 
      ? Math.round(formulaComposition.potassium * factor) 
      : undefined,
    calcium: formulaComposition.calcium 
      ? Math.round(formulaComposition.calcium * factor) 
      : undefined,
    phosphorus: formulaComposition.phosphorus 
      ? Math.round(formulaComposition.phosphorus * factor) 
      : undefined,
  };
}

/**
 * Calculate volume distribution and infusion rates
 */
export function calculateVolume(
  totalVolume: number,
  infusionTimes: string[],
  infusionMethod: 'continuous' | 'intermittent' | 'bolus' = 'intermittent'
): VolumeCalculation {
  const numberOfTimes = infusionTimes.length;
  const volumePerTime = numberOfTimes > 0 ? Math.round(totalVolume / numberOfTimes) : totalVolume;

  let infusionRate: number | undefined;
  let duration: number | undefined;

  if (infusionMethod === 'continuous') {
    // Continuous over 24 hours
    infusionRate = Math.round(totalVolume / 24);
    duration = 24;
  } else if (infusionMethod === 'intermittent') {
    // Intermittent: assume 1 hour per infusion
    infusionRate = volumePerTime;
    duration = 1;
  } else if (infusionMethod === 'bolus') {
    // Bolus: rapid administration
    infusionRate = volumePerTime;
    duration = 0.25; // 15 minutes
  }

  return {
    totalVolume,
    volumePerTime,
    numberOfTimes,
    infusionRate,
    duration,
  };
}

/**
 * Calculate costs for a prescription
 */
export function calculateCost(
  volume: number,
  formulaCostPerMl: number,
  equipmentCostPerDay: number,
  laborCostPerDay: number,
  days: number = 1
): CostCalculation {
  const formulaCost = volume * formulaCostPerMl * days;
  const equipmentCost = equipmentCostPerDay * days;
  const laborCost = laborCostPerDay * days;
  const totalCost = formulaCost + equipmentCost + laborCost;
  const costPerDay = totalCost / days;
  const costPerMl = totalCost / (volume * days);

  return {
    formulaCost: Math.round(formulaCost * 100) / 100,
    equipmentCost: Math.round(equipmentCost * 100) / 100,
    laborCost: Math.round(laborCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    costPerDay: Math.round(costPerDay * 100) / 100,
    costPerMl: Math.round(costPerMl * 1000) / 1000,
  };
}

/**
 * Calculate per patient metrics
 */
export function calculatePatientMetrics(
  patientId: string,
  bedNumber: string,
  formulaComposition: any,
  volume: number,
  infusionTimes: string[],
  costPerMl: number,
  equipmentCostPerDay: number,
  laborCostPerDay: number,
  infusionMethod: 'continuous' | 'intermittent' | 'bolus' = 'intermittent'
): PatientCalculation {
  const nutritional = calculateNutrition(formulaComposition, volume);
  const volumeCalc = calculateVolume(volume, infusionTimes, infusionMethod);
  const cost = calculateCost(volume, costPerMl, equipmentCostPerDay, laborCostPerDay);

  return {
    patientId,
    bedNumber,
    nutritional,
    volume: volumeCalc,
    cost,
    date: new Date(),
  };
}

/**
 * Calculate ward-level aggregations
 */
export function calculateWardMetrics(
  wardName: string,
  patients: PatientCalculation[]
): WardCalculation {
  const totalPatients = patients.length;
  const totalVolume = patients.reduce((sum, p) => sum + p.volume.totalVolume, 0);
  const totalCalories = patients.reduce((sum, p) => sum + p.nutritional.calories, 0);
  const totalProtein = patients.reduce((sum, p) => sum + p.nutritional.protein, 0);
  const totalCost = patients.reduce((sum, p) => sum + p.cost.totalCost, 0);
  const averageCostPerPatient = totalPatients > 0 ? totalCost / totalPatients : 0;

  return {
    wardName,
    totalPatients,
    totalVolume: Math.round(totalVolume),
    totalCalories: Math.round(totalCalories),
    totalProtein: Math.round(totalProtein * 10) / 10,
    totalCost: Math.round(totalCost * 100) / 100,
    averageCostPerPatient: Math.round(averageCostPerPatient * 100) / 100,
    patients,
  };
}

/**
 * Calculate nutritional adequacy (percentage of target met)
 */
export function calculateAdequacy(
  actual: number,
  target: number
): { percentage: number; status: 'below' | 'adequate' | 'above' } {
  const percentage = target > 0 ? Math.round((actual / target) * 100) : 0;
  
  let status: 'below' | 'adequate' | 'above';
  if (percentage < 80) {
    status = 'below';
  } else if (percentage > 120) {
    status = 'above';
  } else {
    status = 'adequate';
  }

  return { percentage, status };
}

/**
 * Calculate BMI and nutritional status
 */
export function calculateBMI(weight: number, height: number): {
  bmi: number;
  classification: string;
  nutritionalStatus: string;
} {
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  const roundedBMI = Math.round(bmi * 10) / 10;

  let classification: string;
  let nutritionalStatus: string;

  if (bmi < 16) {
    classification = 'Magreza grave';
    nutritionalStatus = 'Desnutrição severa';
  } else if (bmi < 17) {
    classification = 'Magreza moderada';
    nutritionalStatus = 'Desnutrição moderada';
  } else if (bmi < 18.5) {
    classification = 'Magreza leve';
    nutritionalStatus = 'Desnutrição leve';
  } else if (bmi < 25) {
    classification = 'Normal';
    nutritionalStatus = 'Eutrófico';
  } else if (bmi < 30) {
    classification = 'Sobrepeso';
    nutritionalStatus = 'Sobrepeso';
  } else if (bmi < 35) {
    classification = 'Obesidade grau I';
    nutritionalStatus = 'Obesidade';
  } else if (bmi < 40) {
    classification = 'Obesidade grau II';
    nutritionalStatus = 'Obesidade severa';
  } else {
    classification = 'Obesidade grau III';
    nutritionalStatus = 'Obesidade mórbida';
  }

  return {
    bmi: roundedBMI,
    classification,
    nutritionalStatus,
  };
}

/**
 * Calculate ideal body weight (Devine formula)
 */
export function calculateIdealWeight(height: number, gender: 'male' | 'female'): number {
  const heightInInches = height / 2.54;
  
  if (gender === 'male') {
    return Math.round(50 + 2.3 * (heightInInches - 60));
  } else {
    return Math.round(45.5 + 2.3 * (heightInInches - 60));
  }
}

/**
 * Calculate adjusted body weight for obese patients
 */
export function calculateAdjustedWeight(
  actualWeight: number,
  idealWeight: number,
  adjustmentFactor: number = 0.25
): number {
  if (actualWeight <= idealWeight) {
    return actualWeight;
  }
  
  return Math.round(idealWeight + (actualWeight - idealWeight) * adjustmentFactor);
}

/**
 * Calculate fluid requirements
 */
export function calculateFluidRequirements(weight: number, age: number): {
  minimum: number;
  maximum: number;
  recommended: number;
} {
  let mlPerKg: number;

  if (age < 18) {
    mlPerKg = 50; // Pediatric
  } else if (age >= 65) {
    mlPerKg = 25; // Elderly
  } else {
    mlPerKg = 30; // Adult
  }

  const recommended = Math.round(weight * mlPerKg);
  const minimum = Math.round(recommended * 0.8);
  const maximum = Math.round(recommended * 1.2);

  return {
    minimum,
    maximum,
    recommended,
  };
}

/**
 * Calculate nitrogen balance
 */
export function calculateNitrogenBalance(
  proteinIntake: number,
  urinaryNitrogen: number,
  additionalLosses: number = 4
): {
  nitrogenIntake: number;
  nitrogenOutput: number;
  balance: number;
  status: string;
} {
  const nitrogenIntake = proteinIntake / 6.25; // 1g protein = 0.16g nitrogen
  const nitrogenOutput = urinaryNitrogen + additionalLosses;
  const balance = nitrogenIntake - nitrogenOutput;

  let status: string;
  if (balance < -5) {
    status = 'Catabolismo severo';
  } else if (balance < 0) {
    status = 'Catabolismo leve';
  } else if (balance < 2) {
    status = 'Equilíbrio';
  } else {
    status = 'Anabolismo';
  }

  return {
    nitrogenIntake: Math.round(nitrogenIntake * 10) / 10,
    nitrogenOutput: Math.round(nitrogenOutput * 10) / 10,
    balance: Math.round(balance * 10) / 10,
    status,
  };
}

/**
 * Generate comprehensive calculation report
 */
export function generateCalculationReport(
  patientData: {
    weight: number;
    height: number;
    age: number;
    gender: 'male' | 'female';
  },
  prescription: {
    formulaComposition: any;
    volume: number;
    infusionTimes: string[];
  },
  costs: {
    formulaCostPerMl: number;
    equipmentCostPerDay: number;
    laborCostPerDay: number;
  }
): {
  anthropometric: any;
  nutritional: NutritionalCalculation;
  volume: VolumeCalculation;
  cost: CostCalculation;
  adequacy: any;
  summary: string;
} {
  // Anthropometric calculations
  const bmiData = calculateBMI(patientData.weight, patientData.height);
  const idealWeight = calculateIdealWeight(patientData.height, patientData.gender);
  const adjustedWeight = calculateAdjustedWeight(patientData.weight, idealWeight);
  const fluidReq = calculateFluidRequirements(patientData.weight, patientData.age);

  // Nutritional calculations
  const nutritional = calculateNutrition(prescription.formulaComposition, prescription.volume);
  
  // Volume calculations
  const volume = calculateVolume(prescription.volume, prescription.infusionTimes);
  
  // Cost calculations
  const cost = calculateCost(
    prescription.volume,
    costs.formulaCostPerMl,
    costs.equipmentCostPerDay,
    costs.laborCostPerDay
  );

  // Adequacy calculations
  const targetCalories = patientData.weight * 25; // 25 kcal/kg as baseline
  const targetProtein = patientData.weight * 1.2; // 1.2 g/kg as baseline
  const calorieAdequacy = calculateAdequacy(nutritional.calories, targetCalories);
  const proteinAdequacy = calculateAdequacy(nutritional.protein, targetProtein);

  const summary = `
Paciente: ${patientData.weight}kg, ${patientData.height}cm, ${patientData.age} anos
IMC: ${bmiData.bmi} kg/m² (${bmiData.classification})
Peso Ideal: ${idealWeight}kg | Peso Ajustado: ${adjustedWeight}kg

Prescrição: ${prescription.volume}ml/dia
Calorias: ${nutritional.calories} kcal/dia (${calorieAdequacy.percentage}% da meta)
Proteínas: ${nutritional.protein}g/dia (${proteinAdequacy.percentage}% da meta)

Custo Total: R$ ${cost.totalCost.toFixed(2)}/dia
  `.trim();

  return {
    anthropometric: {
      bmi: bmiData,
      idealWeight,
      adjustedWeight,
      fluidRequirements: fluidReq,
    },
    nutritional,
    volume,
    cost,
    adequacy: {
      calories: calorieAdequacy,
      protein: proteinAdequacy,
    },
    summary,
  };
}

/**
 * Validate calculations and check for errors
 */
export function validateCalculations(calculations: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for negative or zero values
  if (calculations.nutritional?.calories <= 0) {
    errors.push('Calorias devem ser maior que zero');
  }
  if (calculations.nutritional?.protein <= 0) {
    errors.push('Proteínas devem ser maior que zero');
  }
  if (calculations.volume?.totalVolume <= 0) {
    errors.push('Volume total deve ser maior que zero');
  }

  // Check for unrealistic values
  if (calculations.nutritional?.calories > 5000) {
    warnings.push('Calorias muito altas (>5000 kcal/dia)');
  }
  if (calculations.nutritional?.protein > 200) {
    warnings.push('Proteínas muito altas (>200g/dia)');
  }
  if (calculations.volume?.totalVolume > 3000) {
    warnings.push('Volume muito alto (>3000ml/dia)');
  }

  // Check adequacy
  if (calculations.adequacy?.calories?.percentage < 70) {
    warnings.push('Aporte calórico abaixo de 70% da meta');
  }
  if (calculations.adequacy?.protein?.percentage < 70) {
    warnings.push('Aporte proteico abaixo de 70% da meta');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
