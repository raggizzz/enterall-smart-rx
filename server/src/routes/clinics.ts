import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});

const mapWardToClinic = (ward: any) => ({
    id: ward.id,
    hospitalId: ward.hospitalId,
    name: ward.name,
    code: ward.id,
    type: ward.type || 'other',
    isActive: ward.isActive !== false,
    createdAt: ward.createdAt?.toISOString?.() || new Date().toISOString(),
});

router.get('/', async (_req, res) => {
    try {
        const wards = await prisma.ward.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });

        res.json(wards.map(mapWardToClinic));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch clinics' });
    }
});

router.post('/', async (_req, res) => {
    res.status(501).json({ error: 'Clinics are managed from wards in local mode' });
});

router.put('/:id', async (_req, res) => {
    res.status(501).json({ error: 'Clinics are managed from wards in local mode' });
});

router.delete('/:id', async (_req, res) => {
    res.status(501).json({ error: 'Clinics are managed from wards in local mode' });
});

export default router;
