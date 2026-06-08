import type { PrismaClient } from '@prisma/client';
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

export const httpRequestBytesTotal = new Counter({
  name: 'enmeta_http_request_bytes_total',
  help: 'Total de bytes recebidos pelo backend via HTTP.',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

export const httpResponseBytesTotal = new Counter({
  name: 'enmeta_http_response_bytes_total',
  help: 'Total de bytes enviados pelo backend via HTTP.',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

export const httpActiveRequests = new Gauge({
  name: 'enmeta_http_active_requests',
  help: 'Quantidade de requisicoes HTTP em andamento no backend.',
  labelNames: ['method', 'route'] as const,
  registers: [register],
});

export const httpErrorsTotal = new Counter({
  name: 'enmeta_http_errors_total',
  help: 'Total de respostas HTTP com erro por familia de status.',
  labelNames: ['method', 'route', 'status_family'] as const,
  registers: [register],
});

export const databaseHealth = new Gauge({
  name: 'enmeta_database_up',
  help: 'Indica se a conexao com o banco esta saudavel (1 = ok, 0 = falha).',
  registers: [register],
});

export const clientEventsTotal = new Counter({
  name: 'enmeta_client_events_total',
  help: 'Eventos de jornada emitidos pelo frontend.',
  labelNames: ['event', 'route', 'role', 'online', 'server_reachable'] as const,
  registers: [register],
});

export const clientErrorsTotal = new Counter({
  name: 'enmeta_client_errors_total',
  help: 'Erros capturados no frontend.',
  labelNames: ['source', 'route', 'role'] as const,
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

export const entitiesTotal = new Gauge({
  name: 'enmeta_entities_total',
  help: 'Quantidade total de registros por entidade de negocio.',
  labelNames: ['entity'] as const,
  registers: [register],
});

export const activeEntitiesTotal = new Gauge({
  name: 'enmeta_active_entities_total',
  help: 'Quantidade de registros ativos por entidade de negocio.',
  labelNames: ['entity'] as const,
  registers: [register],
});

export const prescriptionsByRouteTotal = new Gauge({
  name: 'enmeta_prescriptions_by_route_total',
  help: 'Quantidade de prescricoes por modalidade/via efetiva.',
  labelNames: ['therapy_type', 'status'] as const,
  registers: [register],
});

export const offlineRelevantClinicalRecordsTotal = new Gauge({
  name: 'enmeta_clinical_records_total',
  help: 'Quantidade de registros clinicos essenciais para acompanhamento e fila offline.',
  labelNames: ['entity'] as const,
  registers: [register],
});

export const refreshApplicationMetrics = async (prisma: PrismaClient) => {
  const [
    hospitals,
    activeHospitals,
    wards,
    activeWards,
    patients,
    activePatients,
    professionals,
    activeProfessionals,
    formulas,
    activeFormulas,
    modules,
    activeModules,
    supplies,
    activeSupplies,
    prescriptions,
    activePrescriptions,
    evolutions,
    settings,
    rolePermissions,
    appTools,
    activeEnteralPrescriptions,
    activeOralPrescriptions,
    activeParenteralPrescriptions,
    inactiveEnteralPrescriptions,
    inactiveOralPrescriptions,
    inactiveParenteralPrescriptions,
  ] = await Promise.all([
    prisma.hospital.count(),
    prisma.hospital.count({ where: { isActive: true } }),
    prisma.ward.count(),
    prisma.ward.count({ where: { isActive: true } }),
    prisma.patient.count(),
    prisma.patient.count({ where: { isActive: true, status: 'active' } }),
    prisma.professional.count(),
    prisma.professional.count({ where: { isActive: true } }),
    prisma.formula.count(),
    prisma.formula.count({ where: { isActive: true } }),
    prisma.module.count(),
    prisma.module.count({ where: { isActive: true } }),
    prisma.supply.count(),
    prisma.supply.count({ where: { isActive: true } }),
    prisma.prescription.count(),
    prisma.prescription.count({ where: { status: 'active' } }),
    prisma.dailyEvolution.count(),
    prisma.appSettings.count(),
    prisma.rolePermission.count(),
    prisma.appTool.count(),
    prisma.prescription.count({ where: { therapyType: 'enteral', status: 'active' } }),
    prisma.prescription.count({ where: { therapyType: 'oral', status: 'active' } }),
    prisma.prescription.count({ where: { therapyType: 'parenteral', status: 'active' } }),
    prisma.prescription.count({ where: { therapyType: 'enteral', status: { not: 'active' } } }),
    prisma.prescription.count({ where: { therapyType: 'oral', status: { not: 'active' } } }),
    prisma.prescription.count({ where: { therapyType: 'parenteral', status: { not: 'active' } } }),
  ]);

  entitiesTotal.set({ entity: 'hospitals' }, hospitals);
  entitiesTotal.set({ entity: 'wards' }, wards);
  entitiesTotal.set({ entity: 'patients' }, patients);
  entitiesTotal.set({ entity: 'professionals' }, professionals);
  entitiesTotal.set({ entity: 'formulas' }, formulas);
  entitiesTotal.set({ entity: 'modules' }, modules);
  entitiesTotal.set({ entity: 'supplies' }, supplies);
  entitiesTotal.set({ entity: 'prescriptions' }, prescriptions);
  entitiesTotal.set({ entity: 'evolutions' }, evolutions);
  entitiesTotal.set({ entity: 'settings' }, settings);
  entitiesTotal.set({ entity: 'role_permissions' }, rolePermissions);
  entitiesTotal.set({ entity: 'app_tools' }, appTools);

  activeEntitiesTotal.set({ entity: 'hospitals' }, activeHospitals);
  activeEntitiesTotal.set({ entity: 'wards' }, activeWards);
  activeEntitiesTotal.set({ entity: 'patients' }, activePatients);
  activeEntitiesTotal.set({ entity: 'professionals' }, activeProfessionals);
  activeEntitiesTotal.set({ entity: 'formulas' }, activeFormulas);
  activeEntitiesTotal.set({ entity: 'modules' }, activeModules);
  activeEntitiesTotal.set({ entity: 'supplies' }, activeSupplies);
  activeEntitiesTotal.set({ entity: 'prescriptions' }, activePrescriptions);

  prescriptionsByRouteTotal.set({ therapy_type: 'enteral', status: 'active' }, activeEnteralPrescriptions);
  prescriptionsByRouteTotal.set({ therapy_type: 'oral', status: 'active' }, activeOralPrescriptions);
  prescriptionsByRouteTotal.set({ therapy_type: 'parenteral', status: 'active' }, activeParenteralPrescriptions);
  prescriptionsByRouteTotal.set({ therapy_type: 'enteral', status: 'inactive' }, inactiveEnteralPrescriptions);
  prescriptionsByRouteTotal.set({ therapy_type: 'oral', status: 'inactive' }, inactiveOralPrescriptions);
  prescriptionsByRouteTotal.set({ therapy_type: 'parenteral', status: 'inactive' }, inactiveParenteralPrescriptions);

  offlineRelevantClinicalRecordsTotal.set({ entity: 'patients' }, patients);
  offlineRelevantClinicalRecordsTotal.set({ entity: 'prescriptions' }, prescriptions);
  offlineRelevantClinicalRecordsTotal.set({ entity: 'evolutions' }, evolutions);
  offlineRelevantClinicalRecordsTotal.set({ entity: 'formulas' }, formulas);
  offlineRelevantClinicalRecordsTotal.set({ entity: 'modules' }, modules);
  offlineRelevantClinicalRecordsTotal.set({ entity: 'supplies' }, supplies);
};

export const getMetrics = async () => register.metrics();
export const getMetricsContentType = () => register.contentType;
