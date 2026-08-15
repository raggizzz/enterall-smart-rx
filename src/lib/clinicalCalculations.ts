/** Regras clinicas compartilhadas pelas ferramentas e calculos automatizados. */

export type ClinicalSex = "male" | "female";
export type ChumleaRace = "white" | "black";

export type EnergyEstimates = {
  iretonJones: number;
  harrisBenedict: number;
  pocketFormula: number;
  pocketKcalKg: number;
  formulas: {
    iretonJones: string;
    harrisBenedict: string;
    pocketFormula: string;
  };
};

export type NitrogenBalanceResult = {
  nitrogenIntake: number;
  nitrogenOutput: number;
  balance: number;
  status: "Equilibrio" | "Anabolismo" | "Catabolismo";
};

export type ChumleaResult = {
  ageGroup: "19-59" | "60-80";
  heightCm: number;
  weightKg: number;
  heightFormula: string;
  weightFormula: string;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Ireton-Jones 1992, sem fatores de trauma ou queimadura. */
export const calculateIretonJones = (ageYears: number, weightKg: number, sex: ClinicalSex): number => {
  if (ageYears <= 0 || weightKg <= 0) return 0;
  return 1925 - (10 * ageYears) + (5 * weightKg) + (sex === "male" ? 281 : 0);
};

/** Harris-Benedict revisada, com estatura em centimetros. */
export const calculateHarrisBenedict = (
  ageYears: number,
  weightKg: number,
  heightCm: number,
  sex: ClinicalSex,
): number => {
  if (ageYears <= 0 || weightKg <= 0 || heightCm <= 0) return 0;
  return sex === "male"
    ? 66.5 + (13.7516 * weightKg) + (5.0033 * heightCm) - (6.7555 * ageYears)
    : 655.0955 + (9.5634 * weightKg) + (1.8496 * heightCm) - (4.6756 * ageYears);
};

export const calculatePocketFormula = (weightKg: number, kcalPerKg: number): number => (
  weightKg > 0 && kcalPerKg > 0 ? weightKg * kcalPerKg : 0
);

export const calculateEnergyEstimates = ({
  ageYears,
  weightKg,
  heightCm,
  sex,
  pocketKcalKg,
}: {
  ageYears: number;
  weightKg: number;
  heightCm: number;
  sex: ClinicalSex;
  pocketKcalKg: number;
}): EnergyEstimates => ({
  iretonJones: calculateIretonJones(ageYears, weightKg, sex),
  harrisBenedict: calculateHarrisBenedict(ageYears, weightKg, heightCm, sex),
  pocketFormula: calculatePocketFormula(weightKg, pocketKcalKg),
  pocketKcalKg,
  formulas: {
    iretonJones: `1925 - (10 x idade) + (5 x peso)${sex === "male" ? " + 281" : ""}`,
    harrisBenedict: sex === "male"
      ? "66,5 + (13,7516 x peso) + (5,0033 x estatura) - (6,7555 x idade)"
      : "655,0955 + (9,5634 x peso) + (1,8496 x estatura) - (4,6756 x idade)",
    pocketFormula: "peso x kcal/kg",
  },
});

/** Balanço nitrogenado com perdas adicionais informadas pelo profissional. */
export const calculateNitrogenBalance = (
  proteinIntakeGPerDay: number,
  urinaryUreaGPerDay: number,
  additionalLossesGPerDay = 4,
): NitrogenBalanceResult => {
  const nitrogenIntake = proteinIntakeGPerDay > 0 ? proteinIntakeGPerDay / 6.25 : 0;
  const urinaryNitrogen = urinaryUreaGPerDay > 0 ? urinaryUreaGPerDay / 2.14 : 0;
  const nitrogenOutput = urinaryNitrogen + Math.max(0, additionalLossesGPerDay);
  const balance = nitrogenIntake - nitrogenOutput;

  return {
    nitrogenIntake: round1(nitrogenIntake),
    nitrogenOutput: round1(nitrogenOutput),
    balance: round1(balance),
    status: balance > 0 ? "Anabolismo" : balance < 0 ? "Catabolismo" : "Equilibrio",
  };
};

/** Chumlea simplified equations provided in the clinical workbook. */
export const calculateChumleaEstimates = ({
  ageYears,
  kneeHeightCm,
  armCircumferenceCm,
  sex,
  race,
}: {
  ageYears: number;
  kneeHeightCm: number;
  armCircumferenceCm: number;
  sex: ClinicalSex;
  race: ChumleaRace;
}): ChumleaResult => {
  const ageGroup = ageYears >= 60 ? "60-80" : "19-59";
  const older = ageGroup === "60-80";
  const heightCm = sex === "female"
    ? race === "white"
      ? older ? 75 + (1.91 * kneeHeightCm) - (0.17 * ageYears) : 70.25 + (1.87 * kneeHeightCm) - (0.06 * ageYears)
      : older ? 58.72 + (1.96 * kneeHeightCm) : 68.1 + (1.86 * kneeHeightCm) - (0.06 * ageYears)
    : race === "white"
      ? 71.85 + (1.88 * kneeHeightCm)
      : older ? 95.79 + (1.37 * kneeHeightCm) : 73.42 + (1.79 * kneeHeightCm);

  const weightKg = sex === "female"
    ? race === "white"
      ? older ? (1.09 * kneeHeightCm) + (2.68 * armCircumferenceCm) - 65.51 : (1.01 * kneeHeightCm) + (2.81 * armCircumferenceCm) - 66.04
      : older ? (1.5 * kneeHeightCm) + (2.58 * armCircumferenceCm) - 84.22 : (1.24 * kneeHeightCm) + (2.97 * armCircumferenceCm) - 82.48
    : race === "white"
      ? older ? (1.1 * kneeHeightCm) + (3.07 * armCircumferenceCm) - 75.81 : (1.19 * kneeHeightCm) + (3.21 * armCircumferenceCm) - 86.82
      : older ? (0.44 * kneeHeightCm) + (2.86 * armCircumferenceCm) - 39.21 : (1.09 * kneeHeightCm) + (3.14 * armCircumferenceCm) - 83.72;

  const heightFormula = sex === "female"
    ? race === "white"
      ? older ? "75 + (1,91 x altura do joelho) - (0,17 x idade)" : "70,25 + (1,87 x altura do joelho) - (0,06 x idade)"
      : older ? "58,72 + (1,96 x altura do joelho)" : "68,10 + (1,86 x altura do joelho) - (0,06 x idade)"
    : race === "white"
      ? "71,85 + (1,88 x altura do joelho)"
      : older ? "95,79 + (1,37 x altura do joelho)" : "73,42 + (1,79 x altura do joelho)";

  const weightFormula = sex === "female"
    ? race === "white"
      ? older ? "(altura do joelho x 1,09) + (circunferencia do braco x 2,68) - 65,51" : "(altura do joelho x 1,01) + (circunferencia do braco x 2,81) - 66,04"
      : older ? "(altura do joelho x 1,50) + (circunferencia do braco x 2,58) - 84,22" : "(altura do joelho x 1,24) + (circunferencia do braco x 2,97) - 82,48"
    : race === "white"
      ? older ? "(altura do joelho x 1,10) + (circunferencia do braco x 3,07) - 75,81" : "(altura do joelho x 1,19) + (circunferencia do braco x 3,21) - 86,82"
      : older ? "(altura do joelho x 0,44) + (circunferencia do braco x 2,86) - 39,21" : "(altura do joelho x 1,09) + (circunferencia do braco x 3,14) - 83,72";

  return {
    ageGroup,
    heightCm: Number.isFinite(heightCm) && heightCm > 0 ? heightCm : 0,
    weightKg: Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 0,
    heightFormula,
    weightFormula,
  };
};

export const calculateNoradrenalineDose = ({
  weightKg,
  rateMlH,
  dilutionMl,
  ampoules,
}: {
  weightKg: number;
  rateMlH: number;
  dilutionMl: number;
  ampoules: number;
}): number => {
  if (weightKg <= 0 || rateMlH < 0 || dilutionMl <= 0 || ampoules < 0) return 0;
  return ((ampoules * 4 * 1000) / dilutionMl) * (rateMlH / 60) / weightKg;
};

export const calculateVasopressinDose = ({
  rateMlH,
  dilutionMl,
  ampoules,
}: {
  rateMlH: number;
  dilutionMl: number;
  ampoules: number;
}): number => {
  if (rateMlH < 0 || dilutionMl <= 0 || ampoules < 0) return 0;
  return ((ampoules * 40) / dilutionMl) * (rateMlH / 60);
};
