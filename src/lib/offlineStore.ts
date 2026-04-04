import Dexie, { type Table } from "dexie";
import { apiClient, ApiError } from "@/lib/api";

export type OfflineEntityType =
  | "patients"
  | "formulas"
  | "modules"
  | "supplies"
  | "professionals"
  | "prescriptions"
  | "evolutions"
  | "hospitals"
  | "wards"
  | "settings";

export type OfflineOperationAction = "create" | "update" | "delete";

export interface PendingOperation {
  queueId: string;
  entityType: OfflineEntityType;
  entityId: string;
  hospitalId?: string;
  action: OfflineOperationAction;
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  payload?: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  status: "pending" | "processing" | "failed";
  lastError?: string;
}

interface SnapshotRow {
  entityType: OfflineEntityType;
  records: Array<Record<string, unknown>>;
  updatedAt: string;
}

interface ShadowRecord {
  key: string;
  entityType: OfflineEntityType;
  entityId: string;
  operation: OfflineOperationAction;
  data?: Record<string, unknown>;
  updatedAt: string;
}

interface IdMapping {
  key: string;
  entityType: OfflineEntityType;
  tempId: string;
  realId: string;
  createdAt: string;
}

class EnmetaOfflineDb extends Dexie {
  pendingOperations!: Table<PendingOperation, string>;
  snapshots!: Table<SnapshotRow, OfflineEntityType>;
  shadowRecords!: Table<ShadowRecord, string>;
  idMappings!: Table<IdMapping, string>;

  constructor() {
    super("enmeta-offline");

    this.version(1).stores({
      pendingOperations: "&queueId, status, entityType, createdAt",
      snapshots: "&entityType, updatedAt",
      shadowRecords: "&key, entityType, entityId, updatedAt",
      idMappings: "&key, entityType, tempId, realId",
    });
  }
}

export const offlineDb = new EnmetaOfflineDb();

const nowIso = () => new Date().toISOString();
const buildShadowKey = (entityType: OfflineEntityType, entityId: string) => `${entityType}:${entityId}`;
const buildMappingKey = (entityType: OfflineEntityType, tempId: string) => `${entityType}:${tempId}`;
const SESSION_STORAGE_KEY = "local_session";
const HOSPITAL_STORAGE_KEY = "userHospitalId";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const normalizeLookupKey = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();

const emitSyncChange = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("enmeta-sync-changed"));
  }
};

const replaceIdsDeep = (value: unknown, replacements: Record<string, string>): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => replaceIdsDeep(item, replacements));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        replaceIdsDeep(nested, replacements),
      ]),
    );
  }

  if (typeof value === "string" && replacements[value]) {
    return replacements[value];
  }

  return value;
};

const replaceIdsInText = (text: string, replacements: Record<string, string>) => {
  let next = text;
  Object.entries(replacements).forEach(([tempId, realId]) => {
    next = next.replaceAll(tempId, realId);
  });
  return next;
};

const isTemporaryId = (value?: string) => Boolean(value?.startsWith("local-"));

const getCurrentSessionHospitalId = () => {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(HOSPITAL_STORAGE_KEY) || undefined;
};

const getEntityDisplayName = (entityType: OfflineEntityType) => ({
  patients: "o cadastro do paciente",
  formulas: "o cadastro da formula",
  modules: "o cadastro do modulo",
  supplies: "o cadastro do insumo",
  professionals: "o cadastro do profissional",
  prescriptions: "a prescricao",
  evolutions: "a evolucao",
  hospitals: "o cadastro da unidade",
  wards: "o cadastro da ala",
  settings: "as configuracoes",
}[entityType] || "este cadastro");

const resolveOperationHospitalId = (params: {
  endpoint: string;
  payload?: Record<string, unknown>;
  localEntity?: Record<string, unknown>;
}) => {
  const payloadHospitalId =
    typeof params.payload?.hospitalId === "string"
      ? params.payload.hospitalId
      : typeof params.localEntity?.hospitalId === "string"
        ? params.localEntity.hospitalId
        : undefined;

  if (payloadHospitalId) return payloadHospitalId;

  const endpointMatch = params.endpoint.match(/[?&]hospitalId=([^&]+)/);
  if (endpointMatch?.[1]) {
    try {
      return decodeURIComponent(endpointMatch[1]);
    } catch {
      return endpointMatch[1];
    }
  }

  return getCurrentSessionHospitalId();
};

export const createTemporaryId = (entityType: OfflineEntityType) =>
  `local-${entityType.slice(0, -1)}-${crypto.randomUUID()}`;

export const getPendingOperationCount = async () =>
  (await offlineDb.pendingOperations.toArray()).filter((operation) => {
    const currentHospitalId = getCurrentSessionHospitalId();
    return (!currentHospitalId || !operation.hospitalId || operation.hospitalId === currentHospitalId)
      && (operation.status === "pending" || operation.status === "failed");
  }).length;

export const cacheSnapshot = async (
  entityType: OfflineEntityType,
  records: Array<Record<string, unknown>>,
) => {
  await offlineDb.snapshots.put({
    entityType,
    records: clone(records),
    updatedAt: nowIso(),
  });
  emitSyncChange();
};

export const getSnapshotRecords = async (entityType: OfflineEntityType) =>
  (await offlineDb.snapshots.get(entityType))?.records ?? [];

const findRecordById = (records: Array<Record<string, unknown>>, id?: unknown) =>
  records.find((record) => typeof id === "string" && record.id === id);

const findRecordByIdentity = (
  records: Array<Record<string, unknown>>,
  primaryName?: unknown,
  secondaryCode?: unknown,
) => {
  const nameKey = typeof primaryName === "string" ? normalizeLookupKey(primaryName) : "";
  const codeKey = typeof secondaryCode === "string" ? normalizeLookupKey(secondaryCode) : "";

  return records.find((record) => {
    const recordNameKey = normalizeLookupKey(typeof record.name === "string" ? record.name : undefined);
    const recordCodeKey = normalizeLookupKey(typeof record.code === "string" ? record.code : undefined);
    return (nameKey && recordNameKey === nameKey) || (codeKey && recordCodeKey === codeKey);
  });
};

const getShadowRecords = async (entityType: OfflineEntityType) =>
  offlineDb.shadowRecords.where("entityType").equals(entityType).toArray();

export const getMergedRecords = async (
  entityType: OfflineEntityType,
  baseRecords?: Array<Record<string, unknown>>,
) => {
  const source = clone(baseRecords ?? (await getSnapshotRecords(entityType)));
  const map = new Map<string, Record<string, unknown>>();

  source.forEach((record) => {
    const id = typeof record.id === "string" ? record.id : undefined;
    if (id) {
      map.set(id, record);
    }
  });

  const shadows = await getShadowRecords(entityType);
  shadows.forEach((shadow) => {
    if (shadow.operation === "delete") {
      map.delete(shadow.entityId);
      return;
    }

    if (shadow.data) {
      map.set(shadow.entityId, clone(shadow.data));
    }
  });

  return Array.from(map.values());
};

const getMergedRecordById = async (entityType: OfflineEntityType, entityId: string) => {
  const records = await getMergedRecords(entityType);
  return records.find((record) => record.id === entityId);
};

const putShadowRecord = async (
  entityType: OfflineEntityType,
  entityId: string,
  operation: OfflineOperationAction,
  data?: Record<string, unknown>,
) => {
  await offlineDb.shadowRecords.put({
    key: buildShadowKey(entityType, entityId),
    entityType,
    entityId,
    operation,
    data: data ? clone(data) : undefined,
    updatedAt: nowIso(),
  });
  emitSyncChange();
};

const removeShadowRecord = async (entityType: OfflineEntityType, entityId: string) => {
  await offlineDb.shadowRecords.delete(buildShadowKey(entityType, entityId));
  emitSyncChange();
};

const upsertSnapshotRecord = async (
  entityType: OfflineEntityType,
  entity: Record<string, unknown>,
) => {
  const records = await getSnapshotRecords(entityType);
  const next = records.filter((record) => record.id !== entity.id);
  next.unshift(clone(entity));
  await cacheSnapshot(entityType, next);
};

const removeSnapshotRecord = async (entityType: OfflineEntityType, entityId: string) => {
  const records = await getSnapshotRecords(entityType);
  await cacheSnapshot(
    entityType,
    records.filter((record) => record.id !== entityId),
  );
};

const addIdMapping = async (entityType: OfflineEntityType, tempId: string, realId: string) => {
  await offlineDb.idMappings.put({
    key: buildMappingKey(entityType, tempId),
    entityType,
    tempId,
    realId,
    createdAt: nowIso(),
  });
};

const getIdReplacements = async () => {
  const mappings = await offlineDb.idMappings.toArray();
  return Object.fromEntries(mappings.map((mapping) => [mapping.tempId, mapping.realId]));
};

const rewritePendingOperations = async (replacements: Record<string, string>) => {
  if (Object.keys(replacements).length === 0) return;

  const operations = await offlineDb.pendingOperations.toArray();
  await Promise.all(
    operations.map((operation) => {
      const nextEntityId = replacements[operation.entityId] || operation.entityId;
      const nextEndpoint = replaceIdsInText(operation.endpoint, replacements);
      const nextPayload = replaceIdsDeep(operation.payload, replacements) as Record<string, unknown> | undefined;

      return offlineDb.pendingOperations.put({
        ...operation,
        entityId: nextEntityId,
        endpoint: nextEndpoint,
        payload: nextPayload,
        updatedAt: nowIso(),
      });
    }),
  );
};

const rewriteShadowRecords = async (replacements: Record<string, string>) => {
  if (Object.keys(replacements).length === 0) return;

  const shadows = await offlineDb.shadowRecords.toArray();
  await Promise.all(
    shadows.map(async (shadow) => {
      const nextEntityId = replacements[shadow.entityId] || shadow.entityId;
      const nextData = replaceIdsDeep(shadow.data, replacements) as Record<string, unknown> | undefined;
      if (nextEntityId !== shadow.entityId) {
        await offlineDb.shadowRecords.delete(shadow.key);
      }
      await offlineDb.shadowRecords.put({
        key: buildShadowKey(shadow.entityType, nextEntityId),
        entityType: shadow.entityType,
        entityId: nextEntityId,
        operation: shadow.operation,
        data: nextData,
        updatedAt: nowIso(),
      });
    }),
  );
};

const rewriteSnapshots = async (replacements: Record<string, string>) => {
  if (Object.keys(replacements).length === 0) return;

  const snapshots = await offlineDb.snapshots.toArray();
  await Promise.all(
    snapshots.map(async (snapshot) => {
      const nextRecords = snapshot.records.map((record) =>
        replaceIdsDeep(record, replacements) as Record<string, unknown>,
      );
      await offlineDb.snapshots.put({
        ...snapshot,
        records: nextRecords,
        updatedAt: nowIso(),
      });
    }),
  );
};

export const queueEntityMutation = async (params: {
  entityType: OfflineEntityType;
  action: OfflineOperationAction;
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  entityId: string;
  payload?: Record<string, unknown>;
  localEntity?: Record<string, unknown>;
}) => {
  const queueId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();

  if (params.action === "delete") {
    await putShadowRecord(params.entityType, params.entityId, "delete");
  } else if (params.localEntity) {
    await putShadowRecord(params.entityType, params.entityId, params.action, params.localEntity);
    await upsertSnapshotRecord(params.entityType, params.localEntity);
  }

  await offlineDb.pendingOperations.put({
    queueId,
    entityType: params.entityType,
    entityId: params.entityId,
    hospitalId: resolveOperationHospitalId(params),
    action: params.action,
    endpoint: params.endpoint,
    method: params.method,
    payload: params.payload ? clone(params.payload) : undefined,
    idempotencyKey,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    attemptCount: 0,
    status: "pending",
  });

  emitSyncChange();

  return {
    queueId,
    idempotencyKey,
    entityId: params.entityId,
    queued: true,
  };
};

const shouldQueueError = (error: unknown) => {
  if (!(error instanceof ApiError)) return true;
  return [502, 503, 504].includes(error.status);
};

export const executeOrQueueMutation = async (params: {
  entityType: OfflineEntityType;
  action: OfflineOperationAction;
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  payload?: Record<string, unknown>;
  entityId: string;
  localEntity?: Record<string, unknown>;
  expectedVersion?: number;
}) => {
  const headers: Record<string, string> = {
    "x-idempotency-key": crypto.randomUUID(),
    "x-device-id": getDeviceId(),
  };

  if (typeof params.expectedVersion === "number") {
    headers["x-expected-version"] = String(params.expectedVersion);
  }

  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("offline");
    }

    const result = await apiClient.request(
      params.endpoint,
      {
        method: params.method,
        body: params.payload ? JSON.stringify(params.payload) : undefined,
      },
      { headers },
    );

    if (params.action === "delete") {
      await removeSnapshotRecord(params.entityType, params.entityId);
    } else if (params.localEntity) {
      const responseId =
        result && typeof result === "object" && "id" in (result as Record<string, unknown>)
          ? String((result as Record<string, unknown>).id)
          : params.entityId;
      const nextEntity = {
        ...params.localEntity,
        id: responseId,
        syncStatus: "synced",
      };
      await upsertSnapshotRecord(params.entityType, nextEntity);
    }

    await removeShadowRecord(params.entityType, params.entityId);
    return {
      ...(typeof result === "object" && result ? (result as Record<string, unknown>) : {}),
      entityId:
        result && typeof result === "object" && "id" in (result as Record<string, unknown>)
          ? String((result as Record<string, unknown>).id)
          : params.entityId,
      queued: false,
    };
  } catch (error) {
    if (!shouldQueueError(error) && !(error instanceof Error && error.message === "offline")) {
      throw error;
    }

    return queueEntityMutation(params);
  }
};

const getStoredAccessToken = () => {
  if (typeof window === "undefined") return null;
  const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!rawSession) return null;

  try {
    const parsed = JSON.parse(rawSession) as { access_token?: string };
    return typeof parsed.access_token === "string" && parsed.access_token.trim().length > 0
      ? parsed.access_token
      : null;
  } catch {
    return null;
  }
};

export const hasStoredAccessToken = () => Boolean(getStoredAccessToken());

const isAuthApiError = (error: unknown) => {
  if (!(error instanceof ApiError)) return false;

  if (error.status === 401 || error.status === 403) {
    return true;
  }

  const bodyError =
    error.body && typeof error.body === "object" && "error" in (error.body as Record<string, unknown>)
      ? String((error.body as Record<string, unknown>).error || "")
      : "";

  return /token|sess[aã]o expirada|autentica/i.test(bodyError);
};

const isAuthErrorText = (lastError?: string) =>
  Boolean(lastError && /token|sess[aã]o expirada|autentica/i.test(lastError));

export const reactivateAuthenticationFailures = async () => {
  const currentHospitalId = getCurrentSessionHospitalId();
  const operations = await offlineDb.pendingOperations.where("status").equals("failed").toArray();
  const authFailures = operations.filter(
    (operation) =>
      (!currentHospitalId || !operation.hospitalId || operation.hospitalId === currentHospitalId)
      && isAuthErrorText(operation.lastError),
  );

  if (authFailures.length === 0) return 0;

  await Promise.all(
    authFailures.map((operation) =>
      offlineDb.pendingOperations.put({
        ...operation,
        status: "pending",
        lastError: undefined,
        updatedAt: nowIso(),
      }),
    ),
  );

  emitSyncChange();
  return authFailures.length;
};

const reconcilePrescriptionReferences = async (payload?: Record<string, unknown>) => {
  if (!payload) return payload;

  const [formulaRecords, moduleRecords] = await Promise.all([
    getMergedRecords("formulas"),
    getMergedRecords("modules"),
  ]);

  const mapFormulaRef = (item: Record<string, unknown>) => {
    const current = findRecordById(formulaRecords, item.formulaId);
    if (current) {
      return {
        ...item,
        formulaId: current.id,
        formulaName: (current.name as string | undefined) || item.formulaName,
      };
    }

    const fallback = findRecordByIdentity(formulaRecords, item.formulaName, item.formulaCode);
    if (!fallback) return item;

    return {
      ...item,
      formulaId: fallback.id,
      formulaName: (fallback.name as string | undefined) || item.formulaName,
    };
  };

  const mapModuleRef = (item: Record<string, unknown>) => {
    const current = findRecordById(moduleRecords, item.moduleId);
    if (current) {
      return {
        ...item,
        moduleId: current.id,
        moduleName: (current.name as string | undefined) || item.moduleName,
      };
    }

    const fallback = findRecordByIdentity(moduleRecords, item.moduleName, item.moduleCode);
    if (!fallback) return item;

    return {
      ...item,
      moduleId: fallback.id,
      moduleName: (fallback.name as string | undefined) || item.moduleName,
    };
  };

  const nextPayload = clone(payload);

  if (Array.isArray(nextPayload.formulas)) {
    nextPayload.formulas = nextPayload.formulas.map((item) => mapFormulaRef(item as Record<string, unknown>));
  }

  if (Array.isArray(nextPayload.modules)) {
    nextPayload.modules = nextPayload.modules.map((item) => mapModuleRef(item as Record<string, unknown>));
  }

  if (nextPayload.enteralDetails && typeof nextPayload.enteralDetails === "object") {
    const enteralDetails = { ...(nextPayload.enteralDetails as Record<string, unknown>) };

    if (enteralDetails.closedFormula && typeof enteralDetails.closedFormula === "object") {
      enteralDetails.closedFormula = mapFormulaRef(enteralDetails.closedFormula as Record<string, unknown>);
    }

    if (Array.isArray(enteralDetails.openFormulas)) {
      enteralDetails.openFormulas = enteralDetails.openFormulas.map((item) =>
        mapFormulaRef(item as Record<string, unknown>),
      );
    }

    if (Array.isArray(enteralDetails.modules)) {
      enteralDetails.modules = enteralDetails.modules.map((item) =>
        mapModuleRef(item as Record<string, unknown>),
      );
    }

    nextPayload.enteralDetails = enteralDetails;
  }

  if (nextPayload.oralDetails && typeof nextPayload.oralDetails === "object") {
    const oralDetails = { ...(nextPayload.oralDetails as Record<string, unknown>) };

    if (Array.isArray(oralDetails.supplements)) {
      oralDetails.supplements = oralDetails.supplements.map((item) =>
        mapFormulaRef(item as Record<string, unknown>),
      );
    }

    if (Array.isArray(oralDetails.modules)) {
      oralDetails.modules = oralDetails.modules.map((item) =>
        mapModuleRef(item as Record<string, unknown>),
      );
    }

    if (oralDetails.thickenerFormulaId) {
      const current = findRecordById(formulaRecords, oralDetails.thickenerFormulaId);
      if (!current && typeof oralDetails.thickenerProduct === "string") {
        const fallback = findRecordByIdentity(formulaRecords, oralDetails.thickenerProduct, undefined);
        if (fallback) {
          oralDetails.thickenerFormulaId = fallback.id;
          oralDetails.thickenerProduct = fallback.name;
        }
      }
    }

    if (oralDetails.thickenerModuleId) {
      const current = findRecordById(moduleRecords, oralDetails.thickenerModuleId);
      if (!current && typeof oralDetails.thickenerProduct === "string") {
        const fallback = findRecordByIdentity(moduleRecords, oralDetails.thickenerProduct, undefined);
        if (fallback) {
          oralDetails.thickenerModuleId = fallback.id;
          oralDetails.thickenerProduct = fallback.name;
        }
      }
    }

    nextPayload.oralDetails = oralDetails;
  }

  return nextPayload;
};

export const flushPendingOperations = async () => {
  const currentHospitalId = getCurrentSessionHospitalId();
  const operations = (await offlineDb.pendingOperations.orderBy("createdAt").toArray()).filter(
    (operation) =>
      operation.status === "pending"
      && (!currentHospitalId || !operation.hospitalId || operation.hospitalId === currentHospitalId),
  );
  if (operations.length === 0) return { processed: 0, failed: 0 };
  if (!hasStoredAccessToken()) return { processed: 0, failed: 0 };

  const replacements = await getIdReplacements();
  let processed = 0;
  let failed = 0;

  for (const operation of operations) {
    await offlineDb.pendingOperations.put({
      ...operation,
      status: "processing",
      updatedAt: nowIso(),
    });

    const resolvedEntityId = replacements[operation.entityId] || operation.entityId;
    const endpoint = replaceIdsInText(operation.endpoint, replacements);
    let payload = replaceIdsDeep(operation.payload, replacements) as Record<string, unknown> | undefined;

    if (operation.entityType === "prescriptions" && payload) {
      payload = await reconcilePrescriptionReferences(payload);
    }

    try {
      const response = await apiClient.request(
        endpoint,
        {
          method: operation.method,
          body: payload ? JSON.stringify(payload) : undefined,
        },
        {
          headers: {
            "x-idempotency-key": operation.idempotencyKey,
            "x-device-id": getDeviceId(),
          },
        },
      );

      if (operation.action === "create" && isTemporaryId(operation.entityId)) {
        const realId =
          response && typeof response === "object" && "id" in (response as Record<string, unknown>)
            ? String((response as Record<string, unknown>).id)
            : operation.entityId;

        if (realId !== operation.entityId) {
          const nextReplacements = { [operation.entityId]: realId };
          await addIdMapping(operation.entityType, operation.entityId, realId);
          await rewritePendingOperations(nextReplacements);
          await rewriteShadowRecords(nextReplacements);
          await rewriteSnapshots(nextReplacements);
          replacements[operation.entityId] = realId;
        }
      }

      const finalEntityId = replacements[operation.entityId] || resolvedEntityId;
      if (operation.action === "delete") {
        await removeSnapshotRecord(operation.entityType, finalEntityId);
      } else {
        const shadow = await offlineDb.shadowRecords.get(buildShadowKey(operation.entityType, finalEntityId));
        if (shadow?.data) {
          await upsertSnapshotRecord(operation.entityType, {
            ...shadow.data,
            id: finalEntityId,
            syncStatus: "synced",
          });
        }
      }

      await removeShadowRecord(operation.entityType, finalEntityId);
      await offlineDb.pendingOperations.delete(operation.queueId);
      processed += 1;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404 && operation.action === "delete") {
        const finalEntityId = replacements[operation.entityId] || resolvedEntityId;
        await removeSnapshotRecord(operation.entityType, finalEntityId);
        await removeShadowRecord(operation.entityType, finalEntityId);
        await offlineDb.pendingOperations.delete(operation.queueId);
        processed += 1;
        continue;
      }

      failed += 1;
      const isClientError = error instanceof ApiError && error.status >= 400 && error.status < 500;
      const isAuthenticationError = isAuthApiError(error);
      const errorBody =
        error instanceof ApiError && error.body && typeof error.body === "object"
          ? (error.body as Record<string, unknown>)
          : undefined;
      const errorText =
        error instanceof ApiError && typeof error.body === "string"
          ? error.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)
          : undefined;
      const status = isClientError ? "failed" : "pending";
      const message =
        error instanceof ApiError
          ? error.status === 409
            ? `Conflito de versao: ${getEntityDisplayName(operation.entityType)} foi alterado em outro aparelho antes desta tentativa. Use "Usar dados atuais" na Central Sync para descartar esta alteracao local e recarregar a versao mais recente da unidade.`
            : `${error.message}${typeof errorBody?.error === "string" ? ` - ${errorBody.error}` : errorText ? ` - ${errorText}` : ""}`
          : error instanceof Error
            ? error.message
            : "Falha desconhecida";

      await offlineDb.pendingOperations.put({
        ...operation,
        entityId: resolvedEntityId,
        endpoint,
        payload,
        status,
        attemptCount: operation.attemptCount + 1,
        lastError: message,
        updatedAt: nowIso(),
      });

      if (isAuthenticationError || !(error instanceof ApiError) || error.status >= 500 || error.status === 409) {
        break;
      }
    }
  }

  emitSyncChange();
  return { processed, failed };
};

export const getDeviceId = () => {
  if (typeof window === "undefined") return "server";
  const storageKey = "enmeta-device-id";
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(storageKey, created);
  return created;
};

export const getPendingOperations = async () =>
  (await offlineDb.pendingOperations.orderBy("createdAt").toArray()).filter((operation) => {
    const currentHospitalId = getCurrentSessionHospitalId();
    return !currentHospitalId || !operation.hospitalId || operation.hospitalId === currentHospitalId;
  });

export const readLocalRecord = async (entityType: OfflineEntityType, entityId: string) =>
  getMergedRecordById(entityType, entityId);

export const discardPendingOperation = async (queueId: string) => {
  const operation = await offlineDb.pendingOperations.get(queueId);
  if (!operation) return;

  await offlineDb.pendingOperations.delete(queueId);
  const remainingForEntity = (await offlineDb.pendingOperations.toArray()).filter(
    (item) => item.entityId === operation.entityId && item.entityType === operation.entityType,
  ).length;

  if (remainingForEntity === 0) {
    await removeShadowRecord(operation.entityType, operation.entityId);
  }

  emitSyncChange();
};

export const retryPendingOperation = async (queueId: string) => {
  const operation = await offlineDb.pendingOperations.get(queueId);
  if (!operation) return;

  await offlineDb.pendingOperations.put({
    ...operation,
    status: "pending",
    lastError: undefined,
    updatedAt: nowIso(),
  });
  emitSyncChange();
};

/** Descarta todas as operações (pending + failed) do hospital atual. */
export const discardAllOperations = async () => {
  const currentHospitalId = getCurrentSessionHospitalId();
  const all = await offlineDb.pendingOperations.toArray();
  const toRemove = all.filter(
    (op) => !currentHospitalId || !op.hospitalId || op.hospitalId === currentHospitalId,
  );

  await Promise.all(
    toRemove.map(async (op) => {
      await offlineDb.pendingOperations.delete(op.queueId);
      const remaining = (await offlineDb.pendingOperations.toArray()).filter(
        (item) => item.entityId === op.entityId && item.entityType === op.entityType,
      ).length;
      if (remaining === 0) {
        await removeShadowRecord(op.entityType, op.entityId);
      }
    }),
  );

  emitSyncChange();
  return toRemove.length;
};

/** Descarta automaticamente operações irrecuperáveis (failed + padrão fatal) após N tentativas. */
const IRRECOVERABLE_PATTERNS = /formula not found|module not found|supply not found|patient not found|professional not found|hospital not found|ward not found|prescription not found|version conflict|conflito de versao|doctype|is not valid json|unexpected token/i;
const MAX_AUTO_DISCARD_ATTEMPTS = 3;

export const discardIrrecoverableOperations = async () => {
  const currentHospitalId = getCurrentSessionHospitalId();
  const failed = await offlineDb.pendingOperations.where("status").equals("failed").toArray();
  const irrecoverable = failed.filter(
    (op) =>
      (!currentHospitalId || !op.hospitalId || op.hospitalId === currentHospitalId) &&
      op.attemptCount >= MAX_AUTO_DISCARD_ATTEMPTS &&
      IRRECOVERABLE_PATTERNS.test(op.lastError || ""),
  );

  if (irrecoverable.length === 0) return 0;

  await Promise.all(
    irrecoverable.map(async (op) => {
      await offlineDb.pendingOperations.delete(op.queueId);
      const remaining = (await offlineDb.pendingOperations.toArray()).filter(
        (item) => item.entityId === op.entityId && item.entityType === op.entityType,
      ).length;
      if (remaining === 0) {
        await removeShadowRecord(op.entityType, op.entityId);
      }
    }),
  );

  emitSyncChange();
  return irrecoverable.length;
};
