import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { idempotencyReplaysTotal, syncConflictsTotal } from './metrics';

export class VersionConflictError extends Error {
  currentVersion: number;

  constructor(currentVersion: number) {
    super('Version conflict');
    this.currentVersion = currentVersion;
  }
}

const stableStringify = (value: unknown): string => {
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (value && typeof value === 'object' && typeof (value as { toJSON?: () => unknown }).toJSON === 'function') {
    return stableStringify((value as { toJSON: () => unknown }).toJSON());
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`).join(',')}}`;
  }

  return JSON.stringify(value);
};

const buildRequestHash = (req: Request) =>
  createHash('sha256')
    .update(stableStringify(req.body ?? {}))
    .digest('hex');

const normalizeStoredResponse = (statusCode: number, responseBody: string) => {
  try {
    return {
      statusCode,
      body: JSON.parse(responseBody),
    };
  } catch {
    return {
      statusCode,
      body: responseBody,
    };
  }
};

export const withIdempotency = async <T>(
  prisma: PrismaClient,
  req: Request,
  res: Response,
  operation: () => Promise<{ statusCode?: number; body: T }>,
) => {
  const idempotencyKey = req.header('x-idempotency-key');
  if (!idempotencyKey) {
    const result = await operation();
    res.status(result.statusCode ?? 200).json(result.body);
    return;
  }

  const method = req.method.toUpperCase();
  const path = req.originalUrl;
  const requestHash = buildRequestHash(req);

  const existing = await prisma.idempotencyRecord.findUnique({
    where: { key: idempotencyKey },
  });

  if (existing) {
    if (existing.method !== method || existing.path !== path || existing.requestHash !== requestHash) {
      res.status(409).json({
        error: 'Idempotency key reuse with different request payload',
      });
      return;
    }

    const stored = normalizeStoredResponse(existing.statusCode, existing.responseBody);
    idempotencyReplaysTotal.inc({ method, path });
    res.status(stored.statusCode).json(stored.body);
    return;
  }

  const result = await operation();
  const statusCode = result.statusCode ?? 200;
  const serializedBody = stableStringify(result.body);

  try {
    await prisma.idempotencyRecord.create({
      data: {
        key: idempotencyKey,
        method,
        path,
        requestHash,
        statusCode,
        responseBody: serializedBody,
      },
    });
  } catch {
    const stored = await prisma.idempotencyRecord.findUnique({
      where: { key: idempotencyKey },
    });

    if (stored) {
      const normalized = normalizeStoredResponse(stored.statusCode, stored.responseBody);
      idempotencyReplaysTotal.inc({ method, path });
      res.status(normalized.statusCode).json(normalized.body);
      return;
    }
  }

  res.status(statusCode).json(result.body);
};

export const resolveExpectedVersion = (req: Request) => {
  const headerValue = req.header('x-expected-version');
  const bodyValue = (req.body as Record<string, unknown> | undefined)?.version;
  const candidate = typeof bodyValue === 'number' ? bodyValue : Number(headerValue);
  return Number.isFinite(candidate) ? candidate : undefined;
};

export const assertExpectedVersion = (
  currentVersion: number,
  expectedVersion?: number,
  entity = 'unknown',
) => {
  if (expectedVersion === undefined) return;
  if (currentVersion !== expectedVersion) {
    syncConflictsTotal.inc({ entity });
    throw new VersionConflictError(currentVersion);
  }
};
