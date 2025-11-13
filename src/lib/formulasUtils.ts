/**
 * Formulas Utilities
 * Helper functions for formula management and calculations
 */

import { Formula, FormulaComposition } from './formulasDatabase';
import { FORMULAS_DATABASE } from './formulasData';

/**
 * Get all formulas
 */
export function getAllFormulas(): Formula[] {
  return FORMULAS_DATABASE;
}

/**
 * Get formula by ID
 */
export function getFormulaById(id: string): Formula | undefined {
  return FORMULAS_DATABASE.find(f => f.id === id);
}

/**
 * Get formulas by type
 */
export function getFormulasByType(type: Formula['type']): Formula[] {
  return FORMULAS_DATABASE.filter(f => f.type === type);
}

/**
 * Get formulas by manufacturer
 */
export function getFormulasByManufacturer(manufacturer: string): Formula[] {
  return FORMULAS_DATABASE.filter(f => 
    f.manufacturer.toLowerCase().includes(manufacturer.toLowerCase())
  );
}

/**
 * Get formulas by system type
 */
export function getFormulasBySystem(systemType: 'open' | 'closed'): Formula[] {
  return FORMULAS_DATABASE.filter(f => 
    f.systemType === systemType || f.systemType === 'both'
  );
}

/**
 * Search formulas by name or manufacturer
 */
export function searchFormulas(query: string): Formula[] {
  const lowerQuery = query.toLowerCase();
  return FORMULAS_DATABASE.filter(f =>
    f.name.toLowerCase().includes(lowerQuery) ||
    f.manufacturer.toLowerCase().includes(lowerQuery) ||
    f.specialFeatures.some(feature => feature.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get formulas suitable for patient condition
 */
export function getFormulasForCondition(conditions: {
  diabetic?: boolean;
  renalImpairment?: boolean;
  renalDialysis?: boolean;
  highProteinNeeds?: boolean;
  highCalorieNeeds?: boolean;
  malabsorption?: boolean;
  needsFiber?: boolean;
  criticalCare?: boolean;
  immuneSupport?: boolean;
}): Formula[] {
  let formulas = [...FORMULAS_DATABASE];

  if (conditions.diabetic) {
    formulas = formulas.filter(f => f.type === 'diabetic');
  }

  if (conditions.renalDialysis) {
    formulas = formulas.filter(f => f.type === 'renal');
  } else if (conditions.renalImpairment) {
    // Exclude high protein formulas for non-dialysis renal patients
    formulas = formulas.filter(f => 
      f.type !== 'renal' && 
      f.type !== 'high-protein' && 
      f.composition.protein < 6.0
    );
  }

  if (conditions.highProteinNeeds && !conditions.renalImpairment) {
    formulas = formulas.filter(f => 
      f.type === 'high-protein' || f.composition.protein >= 6.0
    );
  }

  if (conditions.highCalorieNeeds) {
    formulas = formulas.filter(f => 
      f.type === 'high-calorie' || f.composition.calories >= 150
    );
  }

  if (conditions.malabsorption) {
    formulas = formulas.filter(f => f.type === 'peptide');
  }

  if (conditions.needsFiber) {
    formulas = formulas.filter(f => 
      f.type === 'fiber' || (f.composition.fiber && f.composition.fiber > 0)
    );
  }

  if (conditions.criticalCare) {
    formulas = formulas.filter(f => 
      f.type === 'high-protein' || 
      f.type === 'immune' || 
      f.type === 'peptide' ||
      f.composition.protein >= 5.0
    );
  }

  if (conditions.immuneSupport) {
    formulas = formulas.filter(f => f.type === 'immune');
  }

  return formulas;
}

/**
 * Compare two formulas
 */
export function compareFormulas(id1: string, id2: string): {
  formula1: Formula;
  formula2: Formula;
  differences: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
    sodium: number;
    potassium: number;
  };
  recommendation: string;
} | null {
  const formula1 = getFormulaById(id1);
  const formula2 = getFormulaById(id2);

  if (!formula1 || !formula2) return null;

  const differences = {
    calories: formula1.composition.calories - formula2.composition.calories,
    protein: formula1.composition.protein - formula2.composition.protein,
    carbohydrates: formula1.composition.carbohydrates - formula2.composition.carbohydrates,
    fat: formula1.composition.fat - formula2.composition.fat,
    fiber: (formula1.composition.fiber || 0) - (formula2.composition.fiber || 0),
    sodium: (formula1.composition.sodium || 0) - (formula2.composition.sodium || 0),
    potassium: (formula1.composition.potassium || 0) - (formula2.composition.potassium || 0),
  };

  let recommendation = '';
  if (Math.abs(differences.calories) < 10) {
    recommendation = 'Fórmulas com densidade calórica similar.';
  } else if (differences.calories > 0) {
    recommendation = `${formula1.name} é mais calórica (+${differences.calories} kcal/100ml).`;
  } else {
    recommendation = `${formula2.name} é mais calórica (+${Math.abs(differences.calories)} kcal/100ml).`;
  }

  if (Math.abs(differences.protein) > 1) {
    recommendation += ` Diferença proteica significativa: ${Math.abs(differences.protein).toFixed(1)}g/100ml.`;
  }

  return {
    formula1,
    formula2,
    differences,
    recommendation,
  };
}

/**
 * Get all manufacturers
 */
export function getAllManufacturers(): string[] {
  const manufacturers = new Set(FORMULAS_DATABASE.map(f => f.manufacturer));
  return Array.from(manufacturers).sort();
}

/**
 * Get all formula types
 */
export function getAllTypes(): Array<{type: Formula['type'], label: string, count: number}> {
  const types: Formula['type'][] = ['standard', 'high-protein', 'high-calorie', 'diabetic', 'renal', 'peptide', 'fiber', 'immune'];
  const labels: Record<Formula['type'], string> = {
    'standard': 'Padrão',
    'high-protein': 'Hiperproteica',
    'high-calorie': 'Hipercalórica',
    'diabetic': 'Para Diabetes',
    'renal': 'Para Renal',
    'peptide': 'Peptídica',
    'fiber': 'Com Fibras',
    'immune': 'Imunomoduladora',
  };

  return types.map(type => ({
    type,
    label: labels[type],
    count: getFormulasByType(type).length,
  }));
}

/**
 * Calculate nutritional values for a given volume
 */
export function calculateNutritionalValues(formulaId: string, volumeMl: number): FormulaComposition | null {
  const formula = getFormulaById(formulaId);
  if (!formula) return null;

  const factor = volumeMl / 100;
  const comp = formula.composition;

  return {
    calories: Math.round(comp.calories * factor),
    protein: Math.round(comp.protein * factor * 10) / 10,
    carbohydrates: Math.round(comp.carbohydrates * factor * 10) / 10,
    fat: Math.round(comp.fat * factor * 10) / 10,
    fiber: comp.fiber ? Math.round(comp.fiber * factor * 10) / 10 : undefined,
    sodium: comp.sodium ? Math.round(comp.sodium * factor) : undefined,
    potassium: comp.potassium ? Math.round(comp.potassium * factor) : undefined,
    calcium: comp.calcium ? Math.round(comp.calcium * factor) : undefined,
    phosphorus: comp.phosphorus ? Math.round(comp.phosphorus * factor) : undefined,
    osmolality: comp.osmolality,
    waterContent: comp.waterContent ? Math.round(comp.waterContent * factor) : undefined,
  };
}

/**
 * Calculate total nutrition for multiple formulas
 */
export function calculateTotalNutrition(formulas: Array<{id: string, volume: number}>): FormulaComposition {
  const total: FormulaComposition = {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    potassium: 0,
    calcium: 0,
    phosphorus: 0,
  };

  formulas.forEach(({id, volume}) => {
    const nutrition = calculateNutritionalValues(id, volume);
    if (nutrition) {
      total.calories += nutrition.calories;
      total.protein += nutrition.protein;
      total.carbohydrates += nutrition.carbohydrates;
      total.fat += nutrition.fat;
      total.fiber = (total.fiber || 0) + (nutrition.fiber || 0);
      total.sodium = (total.sodium || 0) + (nutrition.sodium || 0);
      total.potassium = (total.potassium || 0) + (nutrition.potassium || 0);
      total.calcium = (total.calcium || 0) + (nutrition.calcium || 0);
      total.phosphorus = (total.phosphorus || 0) + (nutrition.phosphorus || 0);
    }
  });

  // Round all values
  total.protein = Math.round(total.protein * 10) / 10;
  total.carbohydrates = Math.round(total.carbohydrates * 10) / 10;
  total.fat = Math.round(total.fat * 10) / 10;
  if (total.fiber) total.fiber = Math.round(total.fiber * 10) / 10;

  return total;
}

/**
 * Get formula statistics
 */
export function getFormulaStatistics() {
  const byType = getAllTypes();
  const byManufacturer = getAllManufacturers().reduce((acc, manufacturer) => {
    acc[manufacturer] = getFormulasByManufacturer(manufacturer).length;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: FORMULAS_DATABASE.length,
    byType,
    byManufacturer,
    bySystem: {
      open: getFormulasBySystem('open').length,
      closed: getFormulasBySystem('closed').length,
    },
  };
}

/**
 * Validate formula selection for patient
 */
export function validateFormulaForPatient(
  formulaId: string,
  patientConditions: {
    diabetic?: boolean;
    renalImpairment?: boolean;
    hepaticImpairment?: boolean;
    allergies?: string[];
  }
): {
  isValid: boolean;
  warnings: string[];
  contraindications: string[];
} {
  const formula = getFormulaById(formulaId);
  const warnings: string[] = [];
  const contraindications: string[] = [];

  if (!formula) {
    return {
      isValid: false,
      warnings: [],
      contraindications: ['Fórmula não encontrada'],
    };
  }

  // Check contraindications
  if (patientConditions.allergies?.includes('lactose') || patientConditions.allergies?.includes('leite')) {
    if (formula.contraindications.some(c => c.toLowerCase().includes('galactosemia') || c.toLowerCase().includes('leite'))) {
      contraindications.push('Paciente com alergia à proteína do leite');
    }
  }

  // Check diabetes
  if (patientConditions.diabetic && formula.type !== 'diabetic') {
    warnings.push('Paciente diabético: considere fórmula específica para diabetes');
  }

  // Check renal function
  if (patientConditions.renalImpairment) {
    if (formula.type === 'high-protein' || formula.composition.protein > 6.0) {
      warnings.push('Paciente com insuficiência renal: alto teor proteico pode não ser adequado');
    }
    if (formula.composition.potassium && formula.composition.potassium > 150) {
      warnings.push('Atenção ao teor de potássio em paciente renal');
    }
    if (formula.composition.phosphorus && formula.composition.phosphorus > 100) {
      warnings.push('Atenção ao teor de fósforo em paciente renal');
    }
  }

  // Check hepatic function
  if (patientConditions.hepaticImpairment) {
    if (formula.type === 'high-protein') {
      warnings.push('Paciente com insuficiência hepática: monitorar tolerância proteica');
    }
  }

  return {
    isValid: contraindications.length === 0,
    warnings,
    contraindications,
  };
}

/**
 * Suggest alternative formulas
 */
export function suggestAlternatives(
  formulaId: string,
  reason: 'cost' | 'availability' | 'tolerance' | 'clinical'
): Formula[] {
  const formula = getFormulaById(formulaId);
  if (!formula) return [];

  let alternatives = FORMULAS_DATABASE.filter(f => f.id !== formulaId);

  // Filter by same type
  alternatives = alternatives.filter(f => f.type === formula.type);

  // Sort by similarity
  alternatives.sort((a, b) => {
    const diffA = Math.abs(a.composition.calories - formula.composition.calories) +
                  Math.abs(a.composition.protein - formula.composition.protein);
    const diffB = Math.abs(b.composition.calories - formula.composition.calories) +
                  Math.abs(b.composition.protein - formula.composition.protein);
    return diffA - diffB;
  });

  // Return top 3 alternatives
  return alternatives.slice(0, 3);
}

/**
 * Export formulas to CSV
 */
export function exportFormulasToCSV(): string {
  const headers = ['ID', 'Nome', 'Fabricante', 'Tipo', 'Sistema', 'Calorias', 'Proteínas', 'Carboidratos', 'Gorduras', 'Fibras'];
  const rows = FORMULAS_DATABASE.map(f => [
    f.id,
    f.name,
    f.manufacturer,
    f.type,
    f.systemType,
    f.composition.calories,
    f.composition.protein,
    f.composition.carbohydrates,
    f.composition.fat,
    f.composition.fiber || 0,
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Get formula recommendations based on nutritional goals
 */
export function recommendFormulasForGoals(goals: {
  targetCalories: number;
  targetProtein: number;
  maxVolume: number;
  needsFiber?: boolean;
  systemPreference?: 'open' | 'closed';
}): Array<{
  formula: Formula;
  volume: number;
  achievedCalories: number;
  achievedProtein: number;
  score: number;
}> {
  let formulas = [...FORMULAS_DATABASE];

  // Filter by system preference
  if (goals.systemPreference) {
    formulas = formulas.filter(f => 
      f.systemType === goals.systemPreference || f.systemType === 'both'
    );
  }

  // Filter by fiber if needed
  if (goals.needsFiber) {
    formulas = formulas.filter(f => f.composition.fiber && f.composition.fiber > 0);
  }

  // Calculate recommendations
  const recommendations = formulas.map(formula => {
    // Calculate volume needed to meet calorie goal
    const volumeForCalories = (goals.targetCalories / formula.composition.calories) * 100;
    // Calculate volume needed to meet protein goal
    const volumeForProtein = (goals.targetProtein / formula.composition.protein) * 100;
    
    // Use the higher volume (to meet both goals)
    let recommendedVolume = Math.max(volumeForCalories, volumeForProtein);
    
    // Cap at max volume
    recommendedVolume = Math.min(recommendedVolume, goals.maxVolume);
    
    const achievedCalories = (recommendedVolume / 100) * formula.composition.calories;
    const achievedProtein = (recommendedVolume / 100) * formula.composition.protein;
    
    // Calculate score (how well it meets goals within volume constraint)
    const calorieScore = Math.min(achievedCalories / goals.targetCalories, 1);
    const proteinScore = Math.min(achievedProtein / goals.targetProtein, 1);
    const volumeScore = 1 - (recommendedVolume / goals.maxVolume);
    
    const score = (calorieScore * 0.4) + (proteinScore * 0.4) + (volumeScore * 0.2);
    
    return {
      formula,
      volume: Math.round(recommendedVolume),
      achievedCalories: Math.round(achievedCalories),
      achievedProtein: Math.round(achievedProtein * 10) / 10,
      score: Math.round(score * 100),
    };
  });

  // Sort by score (descending)
  recommendations.sort((a, b) => b.score - a.score);

  // Return top 5
  return recommendations.slice(0, 5);
}
