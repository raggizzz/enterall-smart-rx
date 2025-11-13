/**
 * Cost-Effectiveness Analysis Module
 * Compares open vs closed enteral nutrition systems
 * Simulates different scenarios and calculates economic impact
 */

export interface SystemCostData {
  systemType: 'open' | 'closed';
  formulaCostPerMl: number;
  equipmentCostPerDay: number;
  administrationTime: number; // minutes per day
  nursingCostPerHour: number;
  contaminationRate: number; // percentage
  wasteRate: number; // percentage
  reinfusionRate: number; // percentage
}

export interface ScenarioParameters {
  daysOfUse: number;
  prescribedVolume: number;
  infusedVolume: number;
  numberOfPatients: number;
  systemType: 'open' | 'closed';
}

export interface CostAnalysisResult {
  totalCost: number;
  formulaCost: number;
  equipmentCost: number;
  laborCost: number;
  wasteCost: number;
  contaminationCost: number;
  costPerPatientDay: number;
  costPerMlInfused: number;
  savings?: number;
  recommendation: string;
  breakdown: CostBreakdown[];
}

export interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface ComparativeAnalysis {
  openSystem: CostAnalysisResult;
  closedSystem: CostAnalysisResult;
  difference: number;
  percentageDifference: number;
  recommendation: string;
  breakEvenPoint: number; // days
  projections: {
    monthly: { open: number; closed: number; savings: number };
    yearly: { open: number; closed: number; savings: number };
  };
}

/**
 * Default cost data for Brazilian hospital context
 */
const DEFAULT_OPEN_SYSTEM: SystemCostData = {
  systemType: 'open',
  formulaCostPerMl: 0.015, // R$ 0.015 per ml
  equipmentCostPerDay: 5.0, // R$ 5.00 (syringes, containers, etc.)
  administrationTime: 45, // 45 minutes per day
  nursingCostPerHour: 30.0, // R$ 30.00 per hour
  contaminationRate: 3.5, // 3.5% contamination rate
  wasteRate: 15, // 15% waste
  reinfusionRate: 5, // 5% reinfusion
};

const DEFAULT_CLOSED_SYSTEM: SystemCostData = {
  systemType: 'closed',
  formulaCostPerMl: 0.025, // R$ 0.025 per ml (higher formula cost)
  equipmentCostPerDay: 15.0, // R$ 15.00 (closed system bags)
  administrationTime: 20, // 20 minutes per day (less handling)
  nursingCostPerHour: 30.0, // R$ 30.00 per hour
  contaminationRate: 0.5, // 0.5% contamination rate (much lower)
  wasteRate: 5, // 5% waste (less waste)
  reinfusionRate: 1, // 1% reinfusion
};

/**
 * Calculate contamination costs
 * Includes treatment costs, extended stay, and additional interventions
 */
function calculateContaminationCost(contaminationRate: number, numberOfPatients: number): number {
  const costPerContaminationCase = 5000; // R$ 5,000 per case (antibiotics, extended stay, etc.)
  const contaminationCases = (contaminationRate / 100) * numberOfPatients;
  return contaminationCases * costPerContaminationCase;
}

/**
 * Calculate waste costs
 */
function calculateWasteCost(prescribedVolume: number, wasteRate: number, formulaCostPerMl: number): number {
  const wastedVolume = prescribedVolume * (wasteRate / 100);
  return wastedVolume * formulaCostPerMl;
}

/**
 * Calculate labor costs
 */
function calculateLaborCost(administrationTime: number, nursingCostPerHour: number, daysOfUse: number): number {
  const hoursPerDay = administrationTime / 60;
  return hoursPerDay * nursingCostPerHour * daysOfUse;
}

/**
 * Main cost analysis function
 */
export function analyzeCost(
  scenario: ScenarioParameters,
  systemData?: SystemCostData
): CostAnalysisResult {
  const data = systemData || (scenario.systemType === 'open' ? DEFAULT_OPEN_SYSTEM : DEFAULT_CLOSED_SYSTEM);
  
  // Calculate individual cost components
  const formulaCost = scenario.prescribedVolume * data.formulaCostPerMl * scenario.daysOfUse;
  const equipmentCost = data.equipmentCostPerDay * scenario.daysOfUse;
  const laborCost = calculateLaborCost(data.administrationTime, data.nursingCostPerHour, scenario.daysOfUse);
  const wasteCost = calculateWasteCost(scenario.prescribedVolume * scenario.daysOfUse, data.wasteRate, data.formulaCostPerMl);
  const contaminationCost = calculateContaminationCost(data.contaminationRate, scenario.numberOfPatients);
  
  const totalCost = formulaCost + equipmentCost + laborCost + wasteCost + contaminationCost;
  const costPerPatientDay = totalCost / (scenario.numberOfPatients * scenario.daysOfUse);
  const costPerMlInfused = totalCost / (scenario.infusedVolume * scenario.daysOfUse);
  
  // Create breakdown
  const breakdown: CostBreakdown[] = [
    { category: 'Fórmulas', amount: formulaCost, percentage: (formulaCost / totalCost) * 100 },
    { category: 'Equipamentos', amount: equipmentCost, percentage: (equipmentCost / totalCost) * 100 },
    { category: 'Mão de obra', amount: laborCost, percentage: (laborCost / totalCost) * 100 },
    { category: 'Desperdício', amount: wasteCost, percentage: (wasteCost / totalCost) * 100 },
    { category: 'Contaminação', amount: contaminationCost, percentage: (contaminationCost / totalCost) * 100 },
  ];
  
  const recommendation = generateRecommendation(data.systemType, costPerPatientDay);
  
  return {
    totalCost,
    formulaCost,
    equipmentCost,
    laborCost,
    wasteCost,
    contaminationCost,
    costPerPatientDay,
    costPerMlInfused,
    recommendation,
    breakdown,
  };
}

/**
 * Compare open vs closed systems
 */
export function compareSystemCosts(scenario: ScenarioParameters): ComparativeAnalysis {
  const openScenario = { ...scenario, systemType: 'open' as const };
  const closedScenario = { ...scenario, systemType: 'closed' as const };
  
  const openSystem = analyzeCost(openScenario);
  const closedSystem = analyzeCost(closedScenario);
  
  const difference = openSystem.totalCost - closedSystem.totalCost;
  const percentageDifference = (difference / openSystem.totalCost) * 100;
  
  // Calculate break-even point
  const dailyCostDifference = (openSystem.costPerPatientDay - closedSystem.costPerPatientDay) * scenario.numberOfPatients;
  const breakEvenPoint = dailyCostDifference !== 0 ? Math.abs(difference / dailyCostDifference) : 0;
  
  // Generate recommendation
  let recommendation = '';
  if (closedSystem.totalCost < openSystem.totalCost) {
    const savings = openSystem.totalCost - closedSystem.totalCost;
    recommendation = `Sistema fechado é mais econômico, gerando economia de R$ ${savings.toFixed(2)} (${Math.abs(percentageDifference).toFixed(1)}%) no período analisado.`;
  } else {
    const extraCost = closedSystem.totalCost - openSystem.totalCost;
    recommendation = `Sistema aberto é mais econômico, mas considere os benefícios de segurança do sistema fechado. Custo adicional: R$ ${extraCost.toFixed(2)} (${Math.abs(percentageDifference).toFixed(1)}%).`;
  }
  
  // Calculate projections
  const daysInMonth = 30;
  const daysInYear = 365;
  
  const monthlyOpen = (openSystem.totalCost / scenario.daysOfUse) * daysInMonth;
  const monthlyClosed = (closedSystem.totalCost / scenario.daysOfUse) * daysInMonth;
  const monthlySavings = monthlyOpen - monthlyClosed;
  
  const yearlyOpen = (openSystem.totalCost / scenario.daysOfUse) * daysInYear;
  const yearlyClosed = (closedSystem.totalCost / scenario.daysOfUse) * daysInYear;
  const yearlySavings = yearlyOpen - yearlyClosed;
  
  return {
    openSystem,
    closedSystem,
    difference,
    percentageDifference,
    recommendation,
    breakEvenPoint,
    projections: {
      monthly: { open: monthlyOpen, closed: monthlyClosed, savings: monthlySavings },
      yearly: { open: yearlyOpen, closed: yearlyClosed, savings: yearlySavings },
    },
  };
}

/**
 * Simulate different scenarios
 */
export function simulateScenarios(baseScenario: ScenarioParameters): {
  baseline: ComparativeAnalysis;
  scenarios: Array<{ name: string; analysis: ComparativeAnalysis; description: string }>;
} {
  const baseline = compareSystemCosts(baseScenario);
  
  const scenarios = [
    {
      name: 'Volume Reduzido (75%)',
      description: 'Simulação com 75% do volume prescrito sendo efetivamente infundido',
      analysis: compareSystemCosts({
        ...baseScenario,
        infusedVolume: baseScenario.prescribedVolume * 0.75,
      }),
    },
    {
      name: 'Longo Prazo (30 dias)',
      description: 'Análise de custo para internação prolongada de 30 dias',
      analysis: compareSystemCosts({
        ...baseScenario,
        daysOfUse: 30,
      }),
    },
    {
      name: 'Alta Demanda (20 pacientes)',
      description: 'Cenário com maior número de pacientes',
      analysis: compareSystemCosts({
        ...baseScenario,
        numberOfPatients: 20,
      }),
    },
    {
      name: 'Volume Alto (2000ml)',
      description: 'Prescrição de alto volume diário',
      analysis: compareSystemCosts({
        ...baseScenario,
        prescribedVolume: 2000,
        infusedVolume: 2000,
      }),
    },
  ];
  
  return { baseline, scenarios };
}

/**
 * Generate recommendation text
 */
function generateRecommendation(systemType: string, costPerDay: number): string {
  if (systemType === 'closed') {
    return `Sistema fechado oferece maior segurança microbiológica e menor tempo de manipulação. Custo: R$ ${costPerDay.toFixed(2)}/paciente/dia.`;
  } else {
    return `Sistema aberto tem menor custo inicial mas requer maior tempo de manipulação e apresenta maior risco de contaminação. Custo: R$ ${costPerDay.toFixed(2)}/paciente/dia.`;
  }
}

/**
 * Calculate ROI for switching systems
 */
export function calculateROI(
  currentSystem: 'open' | 'closed',
  proposedSystem: 'open' | 'closed',
  scenario: ScenarioParameters,
  implementationCost: number
): {
  roi: number;
  paybackPeriod: number;
  netSavings: number;
  recommendation: string;
} {
  const comparison = compareSystemCosts(scenario);
  
  const currentCost = currentSystem === 'open' ? comparison.openSystem.totalCost : comparison.closedSystem.totalCost;
  const proposedCost = proposedSystem === 'open' ? comparison.openSystem.totalCost : comparison.closedSystem.totalCost;
  
  const annualSavings = ((currentCost - proposedCost) / scenario.daysOfUse) * 365;
  const netSavings = annualSavings - implementationCost;
  const roi = (netSavings / implementationCost) * 100;
  const paybackPeriod = implementationCost / (annualSavings / 12); // months
  
  let recommendation = '';
  if (roi > 20) {
    recommendation = `Excelente retorno sobre investimento (${roi.toFixed(1)}%). Período de payback: ${paybackPeriod.toFixed(1)} meses.`;
  } else if (roi > 0) {
    recommendation = `Retorno positivo sobre investimento (${roi.toFixed(1)}%). Período de payback: ${paybackPeriod.toFixed(1)} meses.`;
  } else {
    recommendation = `Retorno negativo sobre investimento (${roi.toFixed(1)}%). Não recomendado do ponto de vista econômico.`;
  }
  
  return {
    roi,
    paybackPeriod,
    netSavings,
    recommendation,
  };
}
