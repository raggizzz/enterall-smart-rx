import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getRequiredEnv } from './env';

type AuthPayload = jwt.JwtPayload & {
  hospitalId?: string;
  professionalId?: string;
  role?: string;
};

const getJwtSecret = (): string => {
  return getRequiredEnv('JWT_SECRET', '[security] JWT_SECRET environment variable is required. Set it in your .env file.');
};

const normalizeHospitalId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getAuthPayload = (req: Request): AuthPayload | undefined => {
  const authorization = req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) return undefined;

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) return undefined;

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded && typeof decoded === 'object') {
      return decoded as AuthPayload;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

export const getScopedHospitalId = (
  req: Request,
  ...fallbackValues: Array<unknown>
): string | undefined => {
  const authHospitalId = normalizeHospitalId(getAuthPayload(req)?.hospitalId);
  if (authHospitalId) return authHospitalId;

  const fallbackCandidates: Array<unknown> = [
    ...fallbackValues,
    req.query?.hospitalId,
    req.params?.hospitalId,
    (req.body as Record<string, unknown> | undefined)?.hospitalId,
  ];

  for (const candidate of fallbackCandidates) {
    const hospitalId = normalizeHospitalId(candidate);
    if (hospitalId) return hospitalId;
  }

  return undefined;
};

export const requireScopedHospitalId = (
  req: Request,
  res: Response,
  ...fallbackValues: Array<unknown>
): string | null => {
  const hospitalId = getScopedHospitalId(req, ...fallbackValues);
  if (hospitalId) return hospitalId;

  res.status(400).json({ error: 'Hospital scope is required' });
  return null;
};

export const ensureScopedEntity = <T extends { hospitalId?: string | null }>(
  entity: T | null,
  hospitalId: string,
): entity is T => Boolean(entity && entity.hospitalId === hospitalId);
