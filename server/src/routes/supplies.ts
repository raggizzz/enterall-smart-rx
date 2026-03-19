import { Router } from 'express';
import prisma from '../lib/prisma';
import { ensureScopedEntity, requireScopedHospitalId } from '../lib/hospital-scope';
import { assertExpectedVersion, resolveExpectedVersion, VersionConflictError, withIdempotency } from '../lib/request-guards';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res);
    if (!hospitalId) return;

    const supplies = await prisma.supply.findMany({
      where: { isActive: true, hospitalId },
      orderBy: { name: 'asc' },
    });
    res.json(supplies);
  } catch {
    res.status(500).json({ error: 'Failed to fetch supplies' });
  }
});

router.post('/', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res);
    if (!hospitalId) return;

    await withIdempotency(prisma, req, res, async () => {
      const created = await prisma.supply.create({
        data: {
          ...req.body,
          hospitalId,
        },
      });
      return { statusCode: 201, body: created };
    });
  } catch {
    res.status(500).json({ error: 'Failed to create supply' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res);
    if (!hospitalId) return;

    await withIdempotency(prisma, req, res, async () => {
      const current = await prisma.supply.findFirst({
        where: { id: req.params.id, hospitalId },
        select: { version: true, hospitalId: true },
      });

      if (!ensureScopedEntity(current, hospitalId)) {
        return { statusCode: 404, body: { error: 'Supply not found' } };
      }

      assertExpectedVersion(current.version, resolveExpectedVersion(req), 'supply');

      const updated = await prisma.supply.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          hospitalId,
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
    res.status(500).json({ error: 'Failed to update supply' });
  }
});

export default router;
