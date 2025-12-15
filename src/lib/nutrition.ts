export function calcTotals(formula, volume) {
  if (!formula || !volume) return { totalCalories: 0, totalProtein: 0 };

  const cal = formula.calories * volume;
  const prot = formula.protein * (volume / 1000);

  return {
    totalCalories: Math.round(cal),
    totalProtein: Math.round(prot * 10) / 10,
  };
}

export function calcInfusionRate(volume, infusionTime, system) {
  volume = Number(volume);
  infusionTime = Number(infusionTime);

  if (!volume || !infusionTime || !system) return 0;

  // Sistema fechado = bomba → ml/h
  if (system === "fechado") {
    return Math.round(volume / infusionTime);
  }

  // Sistema aberto = gravitacional → gotas/min (macro = 20 gtt/mL)
  if (system === "aberto") {
    const gotasPorHora = (volume / infusionTime) * 20;
    return Math.round(gotasPorHora / 60); // gotas/min
  }

  return 0;
}
