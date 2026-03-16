import { Router } from 'express';
import prisma from '../lib/prisma';
import { assertExpectedVersion, resolveExpectedVersion, VersionConflictError, withIdempotency } from '../lib/request-guards';

const router = Router();

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
        data: req.body,
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
    res.status(500).json({ error: 'Failed to update module' });
  }
});

export default router;
