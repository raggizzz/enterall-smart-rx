import type { Request } from 'express';

export interface PaginationParams {
  limit: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

/**
 * Extrai parâmetros de paginação cursor-based da query string.
 * Usa ?limit=N&cursor=<id> para paginar resultados.
 */
export function parsePagination(req: Request, defaultLimit = 100, maxLimit = 500): PaginationParams {
  const rawLimit = parseInt(String(req.query.limit ?? defaultLimit), 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, maxLimit)
    : defaultLimit;

  const cursor = typeof req.query.cursor === 'string' && req.query.cursor.trim()
    ? req.query.cursor.trim()
    : undefined;

  return { limit, cursor };
}

/**
 * Formata a resposta paginada.
 * Busca limit+1 registros para determinar se há próxima página.
 */
export function buildPaginatedResult<T extends { id: string }>(
  items: T[],
  limit: number,
): PaginatedResult<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return {
    data,
    pagination: { limit, nextCursor, hasMore },
  };
}
