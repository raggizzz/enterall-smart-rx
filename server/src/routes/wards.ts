import { Router } from 'express';
import prisma from '../lib/prisma';
import { ensureScopedEntity, requireScopedHospitalId } from '../lib/hospital-scope';
import { assertExpectedVersion, resolveExpectedVersion, VersionConflictError, withIdempotency } from '../lib/request-guards';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res);
    if (!hospitalId) return;

    const wards = await prisma.ward.findMany({
      where: { hospitalId },
    });
    res.json(wards);
  } catch (error) {
    console.error('Error fetching wards:', error);
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
});

router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res, req.params.hospitalId);
    if (!hospitalId) return;

    const wards = await prisma.ward.findMany({
      where: { hospitalId },
    });
    res.json(wards);
  } catch (error) {
    console.error('Error fetching wards:', error);
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
});

router.post('/', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res);
    if (!hospitalId) return;

    await withIdempotency(prisma, req, res, async () => {
      const created = await prisma.ward.create({
        data: {
          ...req.body,
          hospitalId,
        },
      });
      return { statusCode: 201, body: created };
    });
  } catch {
    res.status(500).json({ error: 'Failed to create ward' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res);
    if (!hospitalId) return;

    await withIdempotency(prisma, req, res, async () => {
      const current = await prisma.ward.findFirst({
        where: { id: req.params.id, hospitalId },
        select: { version: true, hospitalId: true },
      });

      if (!ensureScopedEntity(current, hospitalId)) {
        return { statusCode: 404, body: { error: 'Ward not found' } };
      }

      assertExpectedVersion(current.version, resolveExpectedVersion(req), 'ward');

      const updated = await prisma.ward.update({
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
    res.status(500).json({ error: 'Failed to update ward' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res);
    if (!hospitalId) return;

    await withIdempotency(prisma, req, res, async () => {
      const current = await prisma.ward.findFirst({
        where: { id: req.params.id, hospitalId },
        select: { id: true, hospitalId: true },
      });

      if (!ensureScopedEntity(current, hospitalId)) {
        return { statusCode: 404, body: { error: 'Ward not found' } };
      }

      await prisma.ward.delete({ where: { id: req.params.id } });
      return { statusCode: 204, body: null as unknown as { success: boolean } };
    });
  } catch {
    res.status(500).json({ error: 'Failed to delete ward' });
  }
});

export default router;
