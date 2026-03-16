import { Router } from 'express';
import prisma from '../lib/prisma';
import { assertExpectedVersion, resolveExpectedVersion, VersionConflictError, withIdempotency } from '../lib/request-guards';

const router = Router();

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const buildModulePayload = (payload: any) => ({
  hospitalId: payload.hospitalId || undefined,
  name: payload.name,
  description: payload.description || undefined,
  density: toNumber(payload.density) ?? 0,
  referenceAmount: toNumber(payload.referenceAmount) ?? 1,
  referenceTimesPerDay: Math.round(toNumber(payload.referenceTimesPerDay) ?? 1),
  calories: toNumber(payload.calories) ?? 0,
  protein: toNumber(payload.protein) ?? 0,
  carbs: toNumber(payload.carbs),
  fat: toNumber(payload.fat),
  sodium: toNumber(payload.sodium) ?? 0,
  potassium: toNumber(payload.potassium) ?? 0,
  calcium: toNumber(payload.calcium),
  phosphorus: toNumber(payload.phosphorus),
  fiber: toNumber(payload.fiber) ?? 0,
  freeWater: toNumber(payload.freeWater) ?? 0,
  billingUnit: payload.billingUnit || undefined,
  billingPrice: toNumber(payload.billingPrice),
  proteinSources: payload.proteinSources || undefined,
  carbSources: payload.carbSources || undefined,
  fatSources: payload.fatSources || undefined,
  fiberSources: payload.fiberSources || undefined,
  isActive: payload.isActive !== false,
});

router.get('/', async (_req, res) => {
  try {
    const modules = await prisma.module.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(modules);
  } catch {
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

router.post('/', async (req, res) => {
  try {
    await withIdempotency(prisma, req, res, async () => {
      const created = await prisma.module.create({
        data: buildModulePayload(req.body),
      });
      return { statusCode: 201, body: created };
    });
  } catch {
    res.status(500).json({ error: 'Failed to create module' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    await withIdempotency(prisma, req, res, async () => {
      const current = await prisma.module.findUnique({
        where: { id: req.params.id },
        select: { version: true },
      });

      if (!current) {
        return { statusCode: 404, body: { error: 'Module not found' } };
      }

      assertExpectedVersion(current.version, resolveExpectedVersion(req), 'module');

      const updated = await prisma.module.update({
        where: { id: req.params.id },
        data: {
          ...buildModulePayload(req.body),
          version: { increment: 1 },
        },
      });

      return { body: updated };
    });
  } catch (error) {
    if (error instanceof VersionConflictError) {
      res.status(409).json({ error: 'Version conflict', currentVersion: error.currentVersion });
      return;
    }
    res.status(500).json({ error: 'Failed to update module' });
  }
});

export default router;
