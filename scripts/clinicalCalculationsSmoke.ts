import assert from "node:assert/strict";
import {
  calculateChumleaEstimates,
  calculateEnergyEstimates,
  calculateNoradrenalineDose,
  calculateNitrogenBalance,
  calculateVasopressinDose,
} from "../src/lib/clinicalCalculations";

const male = calculateEnergyEstimates({
  ageYears: 65,
  weightKg: 70,
  heightCm: 170,
  sex: "male",
  pocketKcalKg: 25,
});

assert.equal(male.iretonJones, 1906);
assert.equal(male.pocketFormula, 1750);
assert.equal(Math.round(male.harrisBenedict * 10) / 10, 1440.6);
assert.match(male.formulas.iretonJones, /1925/);

const nitrogen = calculateNitrogenBalance(100, 12, 4);
assert.equal(nitrogen.nitrogenIntake, 16);
assert.equal(nitrogen.nitrogenOutput, 9.6);
assert.equal(nitrogen.balance, 6.4);
assert.equal(nitrogen.status, "Anabolismo");

assert.equal(calculateNitrogenBalance(0, 0, 0).status, "Equilibrio");

const chumlea = calculateChumleaEstimates({
  ageYears: 65,
  kneeHeightCm: 50,
  armCircumferenceCm: 30,
  sex: "male",
  race: "white",
});
assert.equal(Math.round(chumlea.heightCm * 100) / 100, 165.85);
assert.equal(Math.round(chumlea.weightKg * 100) / 100, 71.29);

assert.equal(Math.round(calculateNoradrenalineDose({
  weightKg: 50,
  rateMlH: 10,
  dilutionMl: 250,
  ampoules: 5,
}) * 1000) / 1000, 0.267);
assert.equal(Math.round(calculateVasopressinDose({
  rateMlH: 2,
  dilutionMl: 100,
  ampoules: 2,
}) * 1000) / 1000, 0.027);

console.log("clinical calculations smoke: ok");
