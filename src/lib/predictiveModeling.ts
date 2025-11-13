/**
 * Predictive Statistical Modeling Module
 * Estimates consumption, nutritional evolution, and economic impact
 * Based on clinical and economic variables
 */

export interface PredictiveInputs {
  diagnosis: string;
  ageGroup: 'pediatric' | 'adult' | 'elderly';
  weight: number;
  administrationRoute: 'oral' | 'enteral' | 'parenteral';
  lengthOfStay: number;
  clinicalSeverity: 'low' | 'moderate' | 'high';
  comorbidityCount: number;
}

export interface ConsumptionPrediction {
  estimatedDailyVolume: number;
  estimatedTotalVolume: number;
  formulaType: string;
  confidence: number;
  factors: string[];
}

export interface NutritionalEvolution {
  expectedWeightChange: number;
  expectedAlbuminChange: number;
  expectedPrealbuminChange: number;
  timeToTarget: number; // days
  riskOfComplications: number; // percentage
  recommendations: string[];
}

export interface EconomicImpact {
  estimatedDailyCost: number;
  estimatedTotalCost: number;
  costByCategory: {
    formulas: number;
    equipment: number;
    labor: number;
    complications: number;
  };
  projectedMonthlyCost: number;
  projectedYearlyCost: number;
}

export interface ScenarioSimulation {
  scenarioName: string;
  description: string;
  consumption: ConsumptionPrediction;
  evolution: NutritionalEvolution;
  economics: EconomicImpact;
  comparison?: {
    volumeDifference: number;
    costDifference: number;
    outcomeDifference: string;
  };
}

/**
 * Historical data patterns for machine learning training
 * In production, this would be loaded from a database
 */
const historicalPatterns = {
  diagnoses: {
    'sepsis': { avgVolume: 1800, proteinMultiplier: 1.8, lengthOfStayAvg: 14, complicationRate: 25 },
    'pneumonia': { avgVolume: 1500, proteinMultiplier: 1.5, lengthOfStayAvg: 10, complicationRate: 15 },
    'stroke': { avgVolume: 1400, proteinMultiplier: 1.3, lengthOfStayAvg: 12, complicationRate: 20 },
    'trauma': { avgVolume: 2000, proteinMultiplier: 1.8, lengthOfStayAvg: 15, complicationRate: 30 },
    'cancer': { avgVolume: 1600, proteinMultiplier: 1.6, lengthOfStayAvg: 20, complicationRate: 35 },
    'cardiac': { avgVolume: 1300, proteinMultiplier: 1.2, lengthOfStayAvg: 8, complicationRate: 12 },
    'renal': { avgVolume: 1200, proteinMultiplier: 1.0, lengthOfStayAvg: 18, complicationRate: 28 },
    'hepatic': { avgVolume: 1400, proteinMultiplier: 1.1, lengthOfStayAvg: 16, complicationRate: 32 },
    'default': { avgVolume: 1500, proteinMultiplier: 1.2, lengthOfStayAvg: 10, complicationRate: 15 },
  },
  ageGroups: {
    'pediatric': { volumeMultiplier: 0.6, metabolismFactor: 1.2, recoveryFactor: 1.3 },
    'adult': { volumeMultiplier: 1.0, metabolismFactor: 1.0, recoveryFactor: 1.0 },
    'elderly': { volumeMultiplier: 0.85, metabolismFactor: 0.9, recoveryFactor: 0.8 },
  },
  routes: {
    'oral': { toleranceFactor: 0.9, absorptionRate: 0.95, costMultiplier: 0.8 },
    'enteral': { toleranceFactor: 0.85, absorptionRate: 0.90, costMultiplier: 1.0 },
    'parenteral': { toleranceFactor: 1.0, absorptionRate: 1.0, costMultiplier: 2.5 },
  },
};

/**
 * Predict formula consumption based on patient characteristics
 */
export function predictConsumption(inputs: PredictiveInputs): ConsumptionPrediction {
  const factors: string[] = [];
  
  // Get diagnosis pattern
  const diagnosisKey = inputs.diagnosis.toLowerCase();
  const diagnosisPattern = historicalPatterns.diagnoses[diagnosisKey as keyof typeof historicalPatterns.diagnoses] 
    || historicalPatterns.diagnoses.default;
  
  // Get age group pattern
  const agePattern = historicalPatterns.ageGroups[inputs.ageGroup];
  
  // Get route pattern
  const routePattern = historicalPatterns.routes[inputs.administrationRoute];
  
  // Calculate base volume
  let baseVolume = diagnosisPattern.avgVolume;
  
  // Adjust for age
  baseVolume *= agePattern.volumeMultiplier;
  factors.push(`Ajuste por faixa etária (${inputs.ageGroup}): ${(agePattern.volumeMultiplier * 100).toFixed(0)}%`);
  
  // Adjust for weight
  const weightFactor = inputs.weight / 70; // 70kg as reference
  baseVolume *= Math.min(Math.max(weightFactor, 0.7), 1.5); // Limit between 70% and 150%
  factors.push(`Ajuste por peso (${inputs.weight}kg): fator ${weightFactor.toFixed(2)}`);
  
  // Adjust for route tolerance
  baseVolume *= routePattern.toleranceFactor;
  factors.push(`Ajuste por via de administração (${inputs.administrationRoute}): ${(routePattern.toleranceFactor * 100).toFixed(0)}%`);
  
  // Adjust for clinical severity
  const severityMultipliers = { low: 0.9, moderate: 1.0, high: 1.2 };
  baseVolume *= severityMultipliers[inputs.clinicalSeverity];
  factors.push(`Ajuste por gravidade clínica (${inputs.clinicalSeverity}): ${(severityMultipliers[inputs.clinicalSeverity] * 100).toFixed(0)}%`);
  
  // Adjust for comorbidities
  const comorbidityFactor = 1 + (inputs.comorbidityCount * 0.05);
  baseVolume *= Math.min(comorbidityFactor, 1.3); // Max 30% increase
  if (inputs.comorbidityCount > 0) {
    factors.push(`Ajuste por comorbidades (${inputs.comorbidityCount}): ${(comorbidityFactor * 100).toFixed(0)}%`);
  }
  
  const estimatedDailyVolume = Math.round(baseVolume);
  const estimatedTotalVolume = Math.round(baseVolume * inputs.lengthOfStay);
  
  // Determine formula type
  let formulaType = 'Standard';
  if (diagnosisPattern.proteinMultiplier >= 1.6) {
    formulaType = 'Hiperproteica';
  } else if (inputs.diagnosis.toLowerCase().includes('diabet')) {
    formulaType = 'Específica para diabetes';
  } else if (inputs.diagnosis.toLowerCase().includes('renal')) {
    formulaType = 'Específica para renal';
  }
  
  // Calculate confidence based on data completeness
  let confidence = 85;
  if (inputs.comorbidityCount > 3) confidence -= 10;
  if (inputs.clinicalSeverity === 'high') confidence -= 5;
  confidence = Math.max(60, confidence);
  
  return {
    estimatedDailyVolume,
    estimatedTotalVolume,
    formulaType,
    confidence,
    factors,
  };
}

/**
 * Predict nutritional evolution and outcomes
 */
export function predictNutritionalEvolution(inputs: PredictiveInputs): NutritionalEvolution {
  const recommendations: string[] = [];
  
  // Get patterns
  const diagnosisKey = inputs.diagnosis.toLowerCase();
  const diagnosisPattern = historicalPatterns.diagnoses[diagnosisKey as keyof typeof historicalPatterns.diagnoses] 
    || historicalPatterns.diagnoses.default;
  const agePattern = historicalPatterns.ageGroups[inputs.ageGroup];
  const routePattern = historicalPatterns.routes[inputs.administrationRoute];
  
  // Predict weight change
  let expectedWeightChange = 0;
  if (inputs.lengthOfStay >= 7) {
    // Base weight change on clinical severity and recovery factors
    const baseChange = inputs.clinicalSeverity === 'high' ? -2 : inputs.clinicalSeverity === 'moderate' ? 0 : 1;
    expectedWeightChange = baseChange * agePattern.recoveryFactor * routePattern.absorptionRate;
    expectedWeightChange = Math.round(expectedWeightChange * 10) / 10;
  }
  
  if (expectedWeightChange < 0) {
    recommendations.push('Risco de perda de peso: considerar aumento do aporte calórico');
  } else if (expectedWeightChange > 0) {
    recommendations.push('Ganho de peso esperado: manter terapia nutricional adequada');
  }
  
  // Predict albumin change (g/dL)
  const expectedAlbuminChange = inputs.clinicalSeverity === 'high' ? -0.3 : 
                                 inputs.clinicalSeverity === 'moderate' ? 0.1 : 0.3;
  
  if (expectedAlbuminChange < 0) {
    recommendations.push('Risco de hipoalbuminemia: monitorar marcadores nutricionais semanalmente');
  }
  
  // Predict prealbumin change (mg/dL)
  const expectedPrealbuminChange = inputs.clinicalSeverity === 'high' ? -2 : 
                                    inputs.clinicalSeverity === 'moderate' ? 1 : 3;
  
  // Time to reach nutritional target
  const baseTimeToTarget = 7; // days
  const severityDelay = inputs.clinicalSeverity === 'high' ? 7 : inputs.clinicalSeverity === 'moderate' ? 3 : 0;
  const comorbidityDelay = inputs.comorbidityCount * 2;
  const timeToTarget = Math.min(baseTimeToTarget + severityDelay + comorbidityDelay, 21);
  
  recommendations.push(`Tempo estimado para atingir meta nutricional: ${timeToTarget} dias`);
  
  // Risk of complications
  let riskOfComplications = diagnosisPattern.complicationRate;
  riskOfComplications += inputs.comorbidityCount * 5;
  if (inputs.administrationRoute === 'parenteral') riskOfComplications += 10;
  if (inputs.ageGroup === 'elderly') riskOfComplications += 8;
  riskOfComplications = Math.min(riskOfComplications, 80);
  
  if (riskOfComplications > 30) {
    recommendations.push('Alto risco de complicações: monitoramento intensivo recomendado');
  }
  
  if (inputs.administrationRoute === 'enteral') {
    recommendations.push('Via enteral: monitorar tolerância gástrica e resíduo gástrico');
  }
  
  return {
    expectedWeightChange,
    expectedAlbuminChange: Math.round(expectedAlbuminChange * 10) / 10,
    expectedPrealbuminChange: Math.round(expectedPrealbuminChange * 10) / 10,
    timeToTarget,
    riskOfComplications: Math.round(riskOfComplications),
    recommendations,
  };
}

/**
 * Predict economic impact
 */
export function predictEconomicImpact(inputs: PredictiveInputs): EconomicImpact {
  const consumption = predictConsumption(inputs);
  const evolution = predictNutritionalEvolution(inputs);
  
  // Get route pattern for cost calculation
  const routePattern = historicalPatterns.routes[inputs.administrationRoute];
  
  // Base costs (Brazilian Real - R$)
  const formulaCostPerMl = 0.020; // R$ 0.02 per ml
  const equipmentCostPerDay = inputs.administrationRoute === 'parenteral' ? 50 : 
                               inputs.administrationRoute === 'enteral' ? 15 : 8;
  const laborCostPerDay = inputs.administrationRoute === 'parenteral' ? 60 : 
                          inputs.administrationRoute === 'enteral' ? 30 : 15;
  
  // Calculate formula costs
  const dailyFormulaCost = consumption.estimatedDailyVolume * formulaCostPerMl * routePattern.costMultiplier;
  const totalFormulaCost = dailyFormulaCost * inputs.lengthOfStay;
  
  // Calculate equipment costs
  const totalEquipmentCost = equipmentCostPerDay * inputs.lengthOfStay;
  
  // Calculate labor costs
  const totalLaborCost = laborCostPerDay * inputs.lengthOfStay;
  
  // Calculate complication costs
  const complicationCostPerCase = 5000;
  const expectedComplications = (evolution.riskOfComplications / 100);
  const totalComplicationCost = complicationCostPerCase * expectedComplications;
  
  const estimatedDailyCost = dailyFormulaCost + equipmentCostPerDay + laborCostPerDay;
  const estimatedTotalCost = totalFormulaCost + totalEquipmentCost + totalLaborCost + totalComplicationCost;
  
  // Project monthly and yearly costs
  const projectedMonthlyCost = estimatedDailyCost * 30;
  const projectedYearlyCost = estimatedDailyCost * 365;
  
  return {
    estimatedDailyCost: Math.round(estimatedDailyCost * 100) / 100,
    estimatedTotalCost: Math.round(estimatedTotalCost * 100) / 100,
    costByCategory: {
      formulas: Math.round(totalFormulaCost * 100) / 100,
      equipment: Math.round(totalEquipmentCost * 100) / 100,
      labor: Math.round(totalLaborCost * 100) / 100,
      complications: Math.round(totalComplicationCost * 100) / 100,
    },
    projectedMonthlyCost: Math.round(projectedMonthlyCost * 100) / 100,
    projectedYearlyCost: Math.round(projectedYearlyCost * 100) / 100,
  };
}

/**
 * Simulate different scenarios
 */
export function simulateScenarios(baseInputs: PredictiveInputs): ScenarioSimulation[] {
  const baseConsumption = predictConsumption(baseInputs);
  const baseEvolution = predictNutritionalEvolution(baseInputs);
  const baseEconomics = predictEconomicImpact(baseInputs);
  
  const scenarios: ScenarioSimulation[] = [
    {
      scenarioName: 'Cenário Base',
      description: 'Cenário atual com os parâmetros fornecidos',
      consumption: baseConsumption,
      evolution: baseEvolution,
      economics: baseEconomics,
    },
  ];
  
  // Scenario 1: Change formula type
  if (baseInputs.administrationRoute === 'enteral') {
    const enteralToOral = { ...baseInputs, administrationRoute: 'oral' as const };
    const oralConsumption = predictConsumption(enteralToOral);
    const oralEvolution = predictNutritionalEvolution(enteralToOral);
    const oralEconomics = predictEconomicImpact(enteralToOral);
    
    scenarios.push({
      scenarioName: 'Transição para Via Oral',
      description: 'Simulação de mudança de via enteral para oral',
      consumption: oralConsumption,
      evolution: oralEvolution,
      economics: oralEconomics,
      comparison: {
        volumeDifference: oralConsumption.estimatedDailyVolume - baseConsumption.estimatedDailyVolume,
        costDifference: oralEconomics.estimatedDailyCost - baseEconomics.estimatedDailyCost,
        outcomeDifference: 'Menor custo, mas requer boa tolerância oral',
      },
    });
  }
  
  // Scenario 2: Extended length of stay
  const extendedStay = { ...baseInputs, lengthOfStay: baseInputs.lengthOfStay * 1.5 };
  const extendedConsumption = predictConsumption(extendedStay);
  const extendedEvolution = predictNutritionalEvolution(extendedStay);
  const extendedEconomics = predictEconomicImpact(extendedStay);
  
  scenarios.push({
    scenarioName: 'Internação Prolongada (+50%)',
    description: `Simulação com tempo de internação estendido para ${Math.round(extendedStay.lengthOfStay)} dias`,
    consumption: extendedConsumption,
    evolution: extendedEvolution,
    economics: extendedEconomics,
    comparison: {
      volumeDifference: extendedConsumption.estimatedTotalVolume - baseConsumption.estimatedTotalVolume,
      costDifference: extendedEconomics.estimatedTotalCost - baseEconomics.estimatedTotalCost,
      outcomeDifference: 'Maior custo total, melhor chance de recuperação nutricional',
    },
  });
  
  // Scenario 3: Increased volume (high protein)
  const highProtein = { ...baseInputs, clinicalSeverity: 'high' as const };
  const highProteinConsumption = predictConsumption(highProtein);
  const highProteinEvolution = predictNutritionalEvolution(highProtein);
  const highProteinEconomics = predictEconomicImpact(highProtein);
  
  scenarios.push({
    scenarioName: 'Terapia Intensiva (Alta Gravidade)',
    description: 'Simulação com maior aporte proteico e calórico',
    consumption: highProteinConsumption,
    evolution: highProteinEvolution,
    economics: highProteinEconomics,
    comparison: {
      volumeDifference: highProteinConsumption.estimatedDailyVolume - baseConsumption.estimatedDailyVolume,
      costDifference: highProteinEconomics.estimatedDailyCost - baseEconomics.estimatedDailyCost,
      outcomeDifference: 'Maior custo, mas adequado para pacientes críticos',
    },
  });
  
  return scenarios;
}

/**
 * Generate comprehensive prediction report
 */
export function generatePredictionReport(inputs: PredictiveInputs): {
  consumption: ConsumptionPrediction;
  evolution: NutritionalEvolution;
  economics: EconomicImpact;
  scenarios: ScenarioSimulation[];
  summary: string;
} {
  const consumption = predictConsumption(inputs);
  const evolution = predictNutritionalEvolution(inputs);
  const economics = predictEconomicImpact(inputs);
  const scenarios = simulateScenarios(inputs);
  
  const summary = `
Análise Preditiva para ${inputs.diagnosis} (${inputs.ageGroup}, ${inputs.administrationRoute})

Volume Estimado: ${consumption.estimatedDailyVolume}ml/dia (${consumption.estimatedTotalVolume}ml total)
Fórmula Recomendada: ${consumption.formulaType}
Custo Estimado: R$ ${economics.estimatedDailyCost.toFixed(2)}/dia (R$ ${economics.estimatedTotalCost.toFixed(2)} total)
Tempo para Meta: ${evolution.timeToTarget} dias
Risco de Complicações: ${evolution.riskOfComplications}%

Confiança da Predição: ${consumption.confidence}%
  `.trim();
  
  return {
    consumption,
    evolution,
    economics,
    scenarios,
    summary,
  };
}
