import { apiClient } from "./api";

type SupabaseResult<T> = Promise<{ data: T | null; error: Error | null }>;

const buildResourcePath = (table: string, filters: Record<string, unknown>) => {
  if (table === "patients" && typeof filters.id === "string") {
    return `/patients/${filters.id}`;
  }

  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return `/${table}${suffix}`;
};

const buildSelectQuery = <T>(table: string) => {
  const filters: Record<string, unknown> = {};

  const execute = async (): SupabaseResult<T> => {
    try {
      const data = await apiClient.get(buildResourcePath(table, filters));
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error("Erro ao consultar recurso local."),
      };
    }
  };

  return {
    eq(column: string, value: unknown) {
      filters[column] = value;
      return this;
    },
    async single() {
      return execute();
    },
  };
};

const buildInsertQuery = <T>(table: string, rows: unknown[]) => {
  const payload = rows[0];

  return {
    select() {
      return {
        async single(): SupabaseResult<T> {
          try {
            const data = await apiClient.post(`/${table}`, payload);
            return { data, error: null };
          } catch (error) {
            return {
              data: null,
              error: error instanceof Error ? error : new Error("Erro ao salvar recurso local."),
            };
          }
        },
      };
    },
  };
};

export const supabase = {
  from<T = any>(table: string) {
    return {
      select() {
        return buildSelectQuery<T>(table);
      },
      insert(rows: unknown[]) {
        return buildInsertQuery<T>(table, rows);
      },
    };
  },
};

export default supabase;
