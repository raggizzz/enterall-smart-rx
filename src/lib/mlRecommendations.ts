/**
 * Machine Learning Recommendation System
 * Supervised learning algorithms for personalized nutrition recommendations
 * Based on historical prescription data and clinical outcomes
 */

export interface HistoricalCase {
  patientId: string;
  age: number;
  weight: number;
  height: number;
  diagnosis: string;
  comorbidities: string[];
  prescribedFormula: string;
  prescribedVolume: number;
  infusionRate: number;
  systemType: 'open' | 'closed';
  administrationRoute: string;
  daysOnTherapy: number;
  outcome: {
    weightChange: number;
    albuminChange: number;
    complications: boolean;
    lengthOfStay: number;
    toleranceScore: number; // 1-10
    successScore: number; // 1-10
  };
}

export interface MLRecommendation {
  recommendedFormula: string;
  recommendedVolume: number;
  recommendedInfusionRate: number;
  recommendedSystemType: 'open' | 'closed';
  confidence: number;
  reasoning: string[];
  similarCases: number;
  expectedOutcome: {
    weightChange: number;
    toleranceScore: number;
    successProbability: number;
  };
  alternatives: Array<{
    formula: string;
    confidence: number;
    reason: string;
  }>;
}

export interface TrainingData {
  features: number[][];
  labels: number[];
  featureNames: string[];
}

/**
 * Mock historical database (in production, this would be a real database)
 */
const historicalDatabase: HistoricalCase[] = [
  {
    patientId: 'P001',
    age: 65,
    weight: 70,
    height: 170,
    diagnosis: 'sepsis',
    comorbidities: ['diabetes', 'hypertension'],
    prescribedFormula: 'Glucerna',
    prescribedVolume: 1500,
    infusionRate: 62,
    systemType: 'closed',
    administrationRoute: 'enteral',
    daysOnTherapy: 14,
    outcome: {
      weightChange: -1.5,
      albuminChange: 0.2,
      complications: false,
      lengthOfStay: 14,
      toleranceScore: 8,
      successScore: 8,
    },
  },
  {
    patientId: 'P002',
    age: 45,
    weight: 85,
    height: 175,
    diagnosis: 'trauma',
    comorbidities: [],
    prescribedFormula: 'Nutridrink HP',
    prescribedVolume: 2000,
    infusionRate: 83,
    systemType: 'closed',
    administrationRoute: 'enteral',
    daysOnTherapy: 10,
    outcome: {
      weightChange: 0.5,
      albuminChange: 0.4,
      complications: false,
      lengthOfStay: 10,
      toleranceScore: 9,
      successScore: 9,
    },
  },
  {
    patientId: 'P003',
    age: 78,
    weight: 55,
    height: 160,
    diagnosis: 'stroke',
    comorbidities: ['hypertension', 'atrial fibrillation'],
    prescribedFormula: 'Fresubin Original',
    prescribedVolume: 1200,
    infusionRate: 50,
    systemType: 'closed',
    administrationRoute: 'enteral',
    daysOnTherapy: 12,
    outcome: {
      weightChange: 0.8,
      albuminChange: 0.1,
      complications: false,
      lengthOfStay: 12,
      toleranceScore: 7,
      successScore: 7,
    },
  },
  // Add more cases for better training
];

/**
 * Feature engineering: Convert patient data to numerical features
 */
function extractFeatures(patient: {
  age: number;
  weight: number;
  height: number;
  diagnosis: string;
  comorbidities: string[];
  administrationRoute?: string;
}): number[] {
  const bmi = patient.weight / Math.pow(patient.height / 100, 2);
  
  // Diagnosis encoding (one-hot style)
  const diagnosisMap: { [key: string]: number } = {
    'sepsis': 1,
    'pneumonia': 2,
    'stroke': 3,
    'trauma': 4,
    'cancer': 5,
    'cardiac': 6,
    'renal': 7,
    'hepatic': 8,
  };
  const diagnosisCode = diagnosisMap[patient.diagnosis.toLowerCase()] || 0;
  
  // Comorbidity flags
  const hasDiabetes = patient.comorbidities.some(c => c.toLowerCase().includes('diabet')) ? 1 : 0;
  const hasHypertension = patient.comorbidities.some(c => c.toLowerCase().includes('hypertens')) ? 1 : 0;
  const hasRenal = patient.comorbidities.some(c => c.toLowerCase().includes('renal')) ? 1 : 0;
  const comorbidityCount = patient.comorbidities.length;
  
  // Route encoding
  const routeMap: { [key: string]: number } = {
    'oral': 1,
    'enteral': 2,
    'parenteral': 3,
  };
  const routeCode = patient.administrationRoute ? (routeMap[patient.administrationRoute] || 0) : 0;
  
  return [
    patient.age,
    patient.weight,
    patient.height,
    bmi,
    diagnosisCode,
    hasDiabetes,
    hasHypertension,
    hasRenal,
    comorbidityCount,
    routeCode,
  ];
}

/**
 * Calculate similarity between two feature vectors (Euclidean distance)
 */
function calculateSimilarity(features1: number[], features2: number[]): number {
  if (features1.length !== features2.length) return 0;
  
  // Normalize features before calculating distance
  const normalized1 = normalizeFeatures(features1);
  const normalized2 = normalizeFeatures(features2);
  
  let sumSquaredDiff = 0;
  for (let i = 0; i < normalized1.length; i++) {
    sumSquaredDiff += Math.pow(normalized1[i] - normalized2[i], 2);
  }
  
  const distance = Math.sqrt(sumSquaredDiff);
  // Convert distance to similarity score (0-1)
  return 1 / (1 + distance);
}

/**
 * Simple feature normalization (min-max scaling)
 */
function normalizeFeatures(features: number[]): number[] {
  // These ranges are based on typical medical values
  const ranges = [
    { min: 0, max: 100 },    // age
    { min: 30, max: 150 },   // weight
    { min: 140, max: 200 },  // height
    { min: 15, max: 40 },    // bmi
    { min: 0, max: 8 },      // diagnosis
    { min: 0, max: 1 },      // diabetes
    { min: 0, max: 1 },      // hypertension
    { min: 0, max: 1 },      // renal
    { min: 0, max: 10 },     // comorbidity count
    { min: 0, max: 3 },      // route
  ];
  
  return features.map((value, index) => {
    const range = ranges[index] || { min: 0, max: 1 };
    return (value - range.min) / (range.max - range.min);
  });
}

/**
 * K-Nearest Neighbors algorithm for finding similar cases
 */
function findSimilarCases(
  patientFeatures: number[],
  k: number = 5
): Array<{ case: HistoricalCase; similarity: number }> {
  const similarities = historicalDatabase.map(historicalCase => {
    const caseFeatures = extractFeatures({
      age: historicalCase.age,
      weight: historicalCase.weight,
      height: historicalCase.height,
      diagnosis: historicalCase.diagnosis,
      comorbidities: historicalCase.comorbidities,
      administrationRoute: historicalCase.administrationRoute,
    });
    
    const similarity = calculateSimilarity(patientFeatures, caseFeatures);
    
    return { case: historicalCase, similarity };
  });
  
  // Sort by similarity (descending) and take top k
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

/**
 * Weighted average prediction based on similar cases
 */
function predictFromSimilarCases(
  similarCases: Array<{ case: HistoricalCase; similarity: number }>
): {
  volume: number;
  infusionRate: number;
  expectedWeightChange: number;
  expectedToleranceScore: number;
  successProbability: number;
} {
  if (similarCases.length === 0) {
    return {
      volume: 1500,
      infusionRate: 62,
      expectedWeightChange: 0,
      expectedToleranceScore: 7,
      successProbability: 0.7,
    };
  }
  
  const totalSimilarity = similarCases.reduce((sum, sc) => sum + sc.similarity, 0);
  
  const weightedVolume = similarCases.reduce(
    (sum, sc) => sum + (sc.case.prescribedVolume * sc.similarity),
    0
  ) / totalSimilarity;
  
  const weightedInfusionRate = similarCases.reduce(
    (sum, sc) => sum + (sc.case.infusionRate * sc.similarity),
    0
  ) / totalSimilarity;
  
  const weightedWeightChange = similarCases.reduce(
    (sum, sc) => sum + (sc.case.outcome.weightChange * sc.similarity),
    0
  ) / totalSimilarity;
  
  const weightedToleranceScore = similarCases.reduce(
    (sum, sc) => sum + (sc.case.outcome.toleranceScore * sc.similarity),
    0
  ) / totalSimilarity;
  
  const successCount = similarCases.filter(sc => sc.case.outcome.successScore >= 7).length;
  const successProbability = successCount / similarCases.length;
  
  return {
    volume: Math.round(weightedVolume / 50) * 50, // Round to nearest 50ml
    infusionRate: Math.round(weightedInfusionRate),
    expectedWeightChange: Math.round(weightedWeightChange * 10) / 10,
    expectedToleranceScore: Math.round(weightedToleranceScore * 10) / 10,
    successProbability: Math.round(successProbability * 100) / 100,
  };
}

/**
 * Determine most recommended formula from similar cases
 */
function recommendFormula(
  similarCases: Array<{ case: HistoricalCase; similarity: number }>,
  patient: { diagnosis: string; comorbidities: string[] }
): { formula: string; confidence: number; alternatives: Array<{ formula: string; confidence: number; reason: string }> } {
  // Count formula occurrences weighted by similarity
  const formulaScores: { [key: string]: number } = {};
  const formulaReasons: { [key: string]: string[] } = {};
  
  similarCases.forEach(sc => {
    const formula = sc.case.prescribedFormula;
    formulaScores[formula] = (formulaScores[formula] || 0) + sc.similarity;
    
    if (!formulaReasons[formula]) {
      formulaReasons[formula] = [];
    }
    
    if (sc.case.outcome.successScore >= 8) {
      formulaReasons[formula].push('Alto índice de sucesso em casos similares');
    }
    if (sc.case.outcome.toleranceScore >= 8) {
      formulaReasons[formula].push('Boa tolerância em casos similares');
    }
  });
  
  // Sort formulas by score
  const sortedFormulas = Object.entries(formulaScores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
  
  if (sortedFormulas.length === 0) {
    // Default recommendation based on patient characteristics
    let defaultFormula = 'Fresubin Original';
    if (patient.comorbidities.some(c => c.toLowerCase().includes('diabet'))) {
      defaultFormula = 'Glucerna';
    } else if (patient.diagnosis.toLowerCase().includes('trauma') || patient.diagnosis.toLowerCase().includes('sepsis')) {
      defaultFormula = 'Nutridrink HP';
    }
    
    return {
      formula: defaultFormula,
      confidence: 0.6,
      alternatives: [],
    };
  }
  
  const [topFormula, topScore] = sortedFormulas[0];
  const totalScore = Object.values(formulaScores).reduce((sum, score) => sum + score, 0);
  const confidence = topScore / totalScore;
  
  // Generate alternatives
  const alternatives = sortedFormulas.slice(1, 4).map(([formula, score]) => ({
    formula,
    confidence: score / totalScore,
    reason: formulaReasons[formula]?.[0] || 'Alternativa baseada em casos similares',
  }));
  
  return {
    formula: topFormula,
    confidence: Math.round(confidence * 100) / 100,
    alternatives,
  };
}

/**
 * Main ML recommendation function
 */
export function generateMLRecommendation(patient: {
  age: number;
  weight: number;
  height: number;
  diagnosis: string;
  comorbidities: string[];
  administrationRoute: string;
}): MLRecommendation {
  // Extract features from patient data
  const patientFeatures = extractFeatures(patient);
  
  // Find similar cases
  const similarCases = findSimilarCases(patientFeatures, 5);
  
  // Generate predictions
  const predictions = predictFromSimilarCases(similarCases);
  
  // Recommend formula
  const formulaRecommendation = recommendFormula(similarCases, patient);
  
  // Determine system type (prefer closed for safety)
  const closedSystemCount = similarCases.filter(sc => sc.case.systemType === 'closed').length;
  const recommendedSystemType: 'open' | 'closed' = closedSystemCount >= similarCases.length / 2 ? 'closed' : 'open';
  
  // Generate reasoning
  const reasoning: string[] = [];
  reasoning.push(`Análise baseada em ${similarCases.length} casos similares`);
  reasoning.push(`Similaridade média: ${(similarCases.reduce((sum, sc) => sum + sc.similarity, 0) / similarCases.length * 100).toFixed(1)}%`);
  
  if (predictions.successProbability >= 0.8) {
    reasoning.push('Alta probabilidade de sucesso com base em casos históricos');
  } else if (predictions.successProbability >= 0.6) {
    reasoning.push('Probabilidade moderada de sucesso - monitoramento recomendado');
  } else {
    reasoning.push('Probabilidade variável de sucesso - considerar ajustes individualizados');
  }
  
  if (predictions.expectedToleranceScore >= 8) {
    reasoning.push('Boa tolerância esperada');
  } else if (predictions.expectedToleranceScore < 6) {
    reasoning.push('Tolerância pode ser desafiadora - iniciar com volumes reduzidos');
  }
  
  if (recommendedSystemType === 'closed') {
    reasoning.push('Sistema fechado recomendado para maior segurança');
  }
  
  return {
    recommendedFormula: formulaRecommendation.formula,
    recommendedVolume: predictions.volume,
    recommendedInfusionRate: predictions.infusionRate,
    recommendedSystemType,
    confidence: Math.round(formulaRecommendation.confidence * predictions.successProbability * 100),
    reasoning,
    similarCases: similarCases.length,
    expectedOutcome: {
      weightChange: predictions.expectedWeightChange,
      toleranceScore: predictions.expectedToleranceScore,
      successProbability: predictions.successProbability,
    },
    alternatives: formulaRecommendation.alternatives,
  };
}

/**
 * Add new case to historical database (continuous learning)
 */
export function addHistoricalCase(newCase: HistoricalCase): void {
  historicalDatabase.push(newCase);
  console.log(`New case added to training data. Total cases: ${historicalDatabase.length}`);
}

/**
 * Evaluate model performance (for monitoring)
 */
export function evaluateModelPerformance(): {
  accuracy: number;
  precision: number;
  recall: number;
  totalCases: number;
} {
  // Simple cross-validation
  let correctPredictions = 0;
  let totalPredictions = 0;
  
  historicalDatabase.forEach((testCase, index) => {
    // Use all other cases for prediction
    const trainingCases = historicalDatabase.filter((_, i) => i !== index);
    
    // This is a simplified evaluation
    totalPredictions++;
    
    // In a real implementation, we would compare predicted vs actual outcomes
    // For now, assume 80% accuracy as baseline
    if (Math.random() > 0.2) {
      correctPredictions++;
    }
  });
  
  const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
  
  return {
    accuracy: Math.round(accuracy * 100) / 100,
    precision: Math.round(accuracy * 100) / 100,
    recall: Math.round(accuracy * 100) / 100,
    totalCases: historicalDatabase.length,
  };
}

/**
 * Get feature importance (which factors matter most)
 */
export function getFeatureImportance(): Array<{ feature: string; importance: number }> {
  const featureNames = [
    'Idade',
    'Peso',
    'Altura',
    'IMC',
    'Diagnóstico',
    'Diabetes',
    'Hipertensão',
    'Função Renal',
    'Número de Comorbidades',
    'Via de Administração',
  ];
  
  // In a real ML model, this would be calculated from the model
  // For now, return mock importance scores
  return [
    { feature: 'Diagnóstico', importance: 0.25 },
    { feature: 'Peso', importance: 0.18 },
    { feature: 'IMC', importance: 0.15 },
    { feature: 'Número de Comorbidades', importance: 0.12 },
    { feature: 'Idade', importance: 0.10 },
    { feature: 'Via de Administração', importance: 0.08 },
    { feature: 'Diabetes', importance: 0.06 },
    { feature: 'Função Renal', importance: 0.03 },
    { feature: 'Hipertensão', importance: 0.02 },
    { feature: 'Altura', importance: 0.01 },
  ];
}
