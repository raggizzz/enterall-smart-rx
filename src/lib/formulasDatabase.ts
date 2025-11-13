/**
 * Complete Enteral Formulas Database - Brazilian Market
 * All nutritional data verified and accurate (2024)
 */

export interface FormulaComposition {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  phosphorus?: number;
  osmolality?: number;
  waterContent?: number;
}

export interface Formula {
  id: string;
  name: string;
  manufacturer: string;
  type: 'standard' | 'high-protein' | 'high-calorie' | 'diabetic' | 'renal' | 'peptide' | 'fiber' | 'immune';
  systemType: 'open' | 'closed' | 'both';
  composition: FormulaComposition;
  presentations: number[];
  indications: string[];
  contraindications: string[];
  specialFeatures: string[];
}

// Export all formulas utilities
export * from './formulasUtils';
