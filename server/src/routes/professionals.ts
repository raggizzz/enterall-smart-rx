import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { assertExpectedVersion, resolveExpectedVersion, VersionConflictError, withIdempotency } from '../lib/request-guards';

const router = Router();

const sanitizeProfessional = (professional: any) => {
  if (!professional) return professional;
  const { passwordHash, ...safeProfessional } = professional;
  return {
    ...safeProfessional,
    passwordConfigured: Boolean(passwordHash),
  };
};

const buildProfessionalPayload = async (body: any) => {
  const {
    passwordPin,
    password,
    passwordHash,
    passwordConfigured,
    ...rest
  } = body || {};

  const payload: Record<string, unknown> = {
    ...rest,
  };

  const rawPin = typeof passwordPin === 'string'
    ? passwordPin
    : typeof password === 'string'
      ? password
      : undefined;

  if (rawPin !== undefined) {
    payload.passwordHash = rawPin ? await bcrypt.hash(rawPin, 10) : null;
  }

  return payload;
};

router.get('/', async (req, res) => {
  try {
    const hospitalId = typeof req.query.hospitalId === 'string' ? req.query.hospitalId : undefined;
    const professionals = await prisma.professional.findMany({
      where: {
        isActive: true,
        ...(hospitalId ? { hospitalId } : {}),
      },
      orderBy: { name: 'asc' },
    });
    res.json(professionals.map(sanitizeProfessional));
  } catch {
    res.status(500).json({ error: 'Failed to fetch professionals' });
  }
});

router.post('/', async (req, res) => {
  try {
    await withIdempotency(prisma, req, res, async () => {
      const data = await buildProfessionalPayload(req.body);
      const created = await prisma.professional.create({
        data,
      });
      return { statusCode: 201, body: sanitizeProfessional(created) };
    });
  } catch {
    res.status(500).json({ error: 'Failed to create professional' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    await withIdempotency(prisma, req, res, async () => {
      const current = await prisma.professional.findUnique({
        where: { id: req.params.id },
        select: { version: true },
      });

      if (!current) {
        return { statusCode: 404, body: { error: 'Professional not found' } };
      }

      assertExpectedVersion(current.version, resolveExpectedVersion(req), 'professional');
      const data = await buildProfessionalPayload(req.body);

      const updated = await prisma.professional.update({
        where: { id: req.params.id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
      return { body: sanitizeProfessional(updated) };
    });
  } catch (error) {
    if (error instanceof VersionConflictError) {
      res.status(409).json({ error: 'Version conflict', currentVersion: error.currentVersion });
      return;
    }
    res.status(500).json({ error: 'Failed to update professional' });
  }
});

export default router;
