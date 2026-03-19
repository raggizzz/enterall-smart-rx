import { Router } from 'express';
import prisma from '../lib/prisma';
import { ensureScopedEntity, getScopedHospitalId, requireScopedHospitalId } from '../lib/hospital-scope';
import { assertExpectedVersion, resolveExpectedVersion, VersionConflictError, withIdempotency } from '../lib/request-guards';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const scopedHospitalId = getScopedHospitalId(req, req.query.hospitalId);
    const hospitals = await prisma.hospital.findMany({
      where: scopedHospitalId ? { id: scopedHospitalId } : undefined,
      orderBy: { name: 'asc' },
    });
    res.json(hospitals);
  } catch {
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

router.post('/', async (req, res) => {
  try {
    await withIdempotency(prisma, req, res, async () => {
      const created = await prisma.hospital.create({
        data: req.body,
      });
      return { statusCode: 201, body: created };
    });
  } catch {
    res.status(500).json({ error: 'Failed to create hospital' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res, req.params.id);
    if (!hospitalId) return;

    await withIdempotency(prisma, req, res, async () => {
      const current = await prisma.hospital.findUnique({
        where: { id: req.params.id },
        select: { id: true, version: true },
      });

      if (!current || current.id !== hospitalId) {
        return { statusCode: 404, body: { error: 'Hospital not found' } };
      }

      assertExpectedVersion(current.version, resolveExpectedVersion(req), 'hospital');

      const updated = await prisma.hospital.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
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
    res.status(500).json({ error: 'Failed to update hospital' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const hospitalId = requireScopedHospitalId(req, res, req.params.id);
    if (!hospitalId) return;

    await withIdempotency(prisma, req, res, async () => {
      const current = await prisma.hospital.findUnique({
        where: { id: req.params.id },
        select: { id: true },
      });

      if (!current || current.id !== hospitalId) {
        return { statusCode: 404, body: { error: 'Hospital not found' } };
      }

      await prisma.hospital.delete({ where: { id: req.params.id } });
      return { statusCode: 204, body: null as unknown as { success: boolean } };
    });
  } catch {
    res.status(500).json({ error: 'Failed to delete hospital' });
  }
});

export default router;
