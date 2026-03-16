import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

const register = new Registry();

collectDefaultMetrics({
  register,
  prefix: 'enmeta_',
});

export const httpRequestsTotal = new Counter({
  name: 'enmeta_http_requests_total',
  help: 'Total de requisicoes HTTP processadas pelo backend.',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'enmeta_http_request_duration_seconds',
  help: 'Tempo de resposta das requisicoes HTTP em segundos.',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

export const databaseHealth = new Gauge({
  name: 'enmeta_database_up',
  help: 'Indica se a conexao com o banco esta saudavel (1 = ok, 0 = falha).',
  registers: [register],
});

export const syncConflictsTotal = new Counter({
  name: 'enmeta_sync_conflicts_total',
  help: 'Total de conflitos de versao detectados nas escritas do backend.',
  labelNames: ['entity'] as const,
  registers: [register],
});

export const idempotencyReplaysTotal = new Counter({
  name: 'enmeta_idempotency_replays_total',
  help: 'Total de respostas servidas a partir do cache de idempotencia.',
  labelNames: ['method', 'path'] as const,
  registers: [register],
});

export const getMetrics = async () => register.metrics();
export const getMetricsContentType = () => register.contentType;
