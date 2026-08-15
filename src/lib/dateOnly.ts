export const getLocalDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getPreviousLocalDateKey = (date = new Date()): string => {
  const previousDay = new Date(date);
  previousDay.setDate(previousDay.getDate() - 1);
  return getLocalDateKey(previousDay);
};

/** Data clinica do acompanhamento: registra o dia completo encerrado. */
export const getClinicalMonitoringDateKey = (date = new Date()): string =>
  getPreviousLocalDateKey(date);

export const formatLocalDateKey = (dateKey: string): string => {
  const [year, month, day] = dateKey.split("-");
  return year && month && day ? `${day}/${month}/${year}` : dateKey;
};
