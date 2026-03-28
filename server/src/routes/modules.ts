import { Router } from 'express';
import prisma from '../lib/prisma';
import { ensureScopedEntity, requireScopedHospitalId } from '../lib/hospital-scope';
import { assertExpectedVersion, resolveExpectedVersion, VersionConflictError, withIdempotency } from '../lib/request-guards';

const router = Router();

const toJsonString = (value: unknown) => {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'string') return value;
  return undefined;
};

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const mapModuleToClient = (moduleItem: any) => ({
  ...moduleItem,
  presentations: moduleItem.presentations ? JSON.parse(moduleItem.presentations) : [],
});

const buildModulePayload = (payload: any, hospitalId: string) => ({
  hospitalId,
  code: payload.code || undefined,
  name: payload.name,
  manufacturer: payload.manufacturer || undefined,
  description: payload.description || undefined,
  presentationForm: payload.presentationForm || undefined,
  presentations: toJsonString(payload.presentations),
  conversionFactor: toNumber(payload.conversionFactor),
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

router.get('/', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res);
    if (!hospitalId) return;

    const modules = await prisma.module.findMany({
      where: { isActive: true, hospitalId },
      orderBy: { name: 'asc' },
    });
    res.json(modules.map(mapModuleToClient));
  } catch {
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

router.post('/', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res);
    if (!hospitalId) return;

    await withIdempotency(prisma, req, res, async () => {
      const created = await prisma.module.create({
        data: buildModulePayload(req.body, hospitalId),
      });
      return { statusCode: 201, body: mapModuleToClient(created) };
    });
  } catch {
    res.status(500).json({ error: 'Failed to create module' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res);
    if (!hospitalId) return;

    await withIdempotency(prisma, req, res, async () => {
      const current = await prisma.module.findFirst({
        where: { id: req.params.id, hospitalId },
        select: { version: true, hospitalId: true },
      });

      if (!ensureScopedEntity(current, hospitalId)) {
        return { statusCode: 404, body: { error: 'Module not found' } };
      }

      assertExpectedVersion(current.version, resolveExpectedVersion(req), 'module');

      const updated = await prisma.module.update({
        where: { id: req.params.id },
        data: {
          ...buildModulePayload(req.body, hospitalId),
          version: { increment: 1 },
        },
      });

      return { body: mapModuleToClient(updated) };
    });
  } catch (error) {
    if (error instanceof VersionConflictError) {
      res.status(409).json({ error: 'Version conflict', currentVersion: error.currentVersion });
      return;
    }
    res.status(500).json({ error: 'Failed to update module' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res);
    if (!hospitalId) return;

    await withIdempotency(prisma, req, res, async () => {
      const current = await prisma.module.findFirst({
        where: { id: req.params.id, hospitalId },
        select: { id: true, hospitalId: true },
      });

      if (!ensureScopedEntity(current, hospitalId)) {
        return { statusCode: 404, body: { error: 'Module not found' } };
      }

      await prisma.module.update({
        where: { id: req.params.id },
        data: {
          isActive: false,
          version: { increment: 1 },
        },
      });

      return { body: { success: true } };
    });
  } catch {
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

export default router;
