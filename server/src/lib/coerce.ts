/**
 * Utilitários de coerção e normalização de tipos para as rotas da API.
 * Centraliza funções que eram duplicadas em múltiplos arquivos de rota.
 */

/** Converte string para Date. Retorna undefined se inválido. */
export const toDate = (value?: string | null): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

/**
 * Converte valor para número finito.
 * Aceita vírgula como separador decimal (ex: "3,14" → 3.14).
 */
export const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

/** Converte valor para string não vazia, ou null se vazio/nulo. undefined se ausente. */
export const toOptionalString = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

/** Converte valor para número ou null. undefined se ausente. */
export const toOptionalNumber = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Converte Date ou string ISO para formato YYYY-MM-DD. */
export const toDateOnly = (value?: Date | string | null): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') {
    return value.includes('T') ? value.split('T')[0] : value;
  }
  return value.toISOString().split('T')[0];
};

/** Serializa array ou string para JSON string. */
export const toJsonString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'string') return value;
  return undefined;
};

/** Verifica se um objeto possui uma chave própria. */
export const hasOwn = (payload: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(payload, key);
