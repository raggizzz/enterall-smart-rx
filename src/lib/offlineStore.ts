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

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

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

export const createTemporaryId = (entityType: OfflineEntityType) =>
  `local-${entityType.slice(0, -1)}-${crypto.randomUUID()}`;

export const getPendingOperationCount = async () =>
  offlineDb.pendingOperations.where("status").anyOf("pending", "failed").count();

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

export const flushPendingOperations = async () => {
  const operations = await offlineDb.pendingOperations.orderBy("createdAt").toArray();
  if (operations.length === 0) return { processed: 0, failed: 0 };

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
    const payload = replaceIdsDeep(operation.payload, replacements) as Record<string, unknown> | undefined;

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
      failed += 1;
      const status = error instanceof ApiError && error.status === 409 ? "failed" : "pending";
      const message =
        error instanceof ApiError
          ? `${error.message}${error.status === 409 ? " (conflito de versao)" : ""}`
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

      if (!(error instanceof ApiError) || error.status >= 500 || error.status === 409) {
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
  offlineDb.pendingOperations.orderBy("createdAt").toArray();

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
