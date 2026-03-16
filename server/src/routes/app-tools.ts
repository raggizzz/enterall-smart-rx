import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});

const normalizeHospitalId = (value: unknown): string | null | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed === 'global') return null;
    return trimmed;
};

const mapAppToolToClient = (tool: any) => ({
    id: tool.id,
    hospitalId: tool.hospitalId ?? undefined,
    code: tool.code,
    name: tool.name,
    category: tool.category,
    description: tool.description ?? undefined,
    link: tool.link ?? undefined,
    isActive: tool.isActive !== false,
    createdAt: tool.createdAt,
    updatedAt: tool.updatedAt,
});

router.get('/', async (req, res) => {
    try {
        const hospitalId = normalizeHospitalId(req.query.hospitalId);
        const tools = await prisma.appTool.findMany({
            where: hospitalId === undefined
                ? { isActive: true }
                : {
                    isActive: true,
                    OR: [
                        { hospitalId },
                        { hospitalId: null },
                    ],
                },
            orderBy: [
                { hospitalId: 'desc' },
                { category: 'asc' },
                { name: 'asc' },
            ],
        });

        if (hospitalId === undefined || hospitalId === null) {
            res.json(tools.map(mapAppToolToClient));
            return;
        }

        const merged = new Map<string, any>();
        for (const tool of tools) {
            if (!merged.has(tool.code)) {
                merged.set(tool.code, tool);
            }
        }

        res.json(Array.from(merged.values()).map(mapAppToolToClient));
    } catch (error) {
        console.error('Failed to fetch app tools', error);
        res.status(500).json({ error: 'Failed to fetch app tools' });
    }
});

router.post('/', async (req, res) => {
    try {
        const data = req.body || {};
        const created = await prisma.appTool.create({
            data: {
                hospitalId: normalizeHospitalId(data.hospitalId) ?? undefined,
                code: String(data.code),
                name: String(data.name),
                category: String(data.category),
                description: data.description ? String(data.description) : undefined,
                link: data.link ? String(data.link) : undefined,
                isActive: data.isActive !== false,
            },
        });

        res.status(201).json(mapAppToolToClient(created));
    } catch (error) {
        console.error('Failed to create app tool', error);
        res.status(500).json({ error: 'Failed to create app tool' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const data = req.body || {};
        const updated = await prisma.appTool.update({
            where: { id: req.params.id },
            data: {
                hospitalId: normalizeHospitalId(data.hospitalId) ?? undefined,
                code: data.code ? String(data.code) : undefined,
                name: data.name ? String(data.name) : undefined,
                category: data.category ? String(data.category) : undefined,
                description: data.description === null ? null : data.description ? String(data.description) : undefined,
                link: data.link === null ? null : data.link ? String(data.link) : undefined,
                isActive: typeof data.isActive === 'boolean' ? data.isActive : undefined,
            },
        });

        res.json(mapAppToolToClient(updated));
    } catch (error) {
        console.error('Failed to update app tool', error);
        res.status(500).json({ error: 'Failed to update app tool' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await prisma.appTool.delete({
            where: { id: req.params.id },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Failed to delete app tool', error);
        res.status(500).json({ error: 'Failed to delete app tool' });
    }
});

export default router;
