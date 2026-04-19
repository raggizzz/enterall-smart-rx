import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireRole } from '../lib/auth-middleware';
import { requireScopedHospitalId } from '../lib/hospital-scope';

const router = Router();
const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});

const mapRolePermissionToClient = (permission: any) => ({
    id: permission.id,
    hospitalId: permission.hospitalId ?? undefined,
    role: permission.role,
    permissionKey: permission.permissionKey,
    allowed: permission.allowed,
    createdAt: permission.createdAt,
    updatedAt: permission.updatedAt,
});

router.get('/', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        const permissions = await prisma.rolePermission.findMany({
            where: {
                OR: [
                    { hospitalId },
                    { hospitalId: null },
                ],
            },
            orderBy: [
                { hospitalId: 'desc' },
                { role: 'asc' },
                { permissionKey: 'asc' },
            ],
        });

        const merged = new Map<string, any>();
        for (const permission of permissions) {
            const key = `${permission.role}:${permission.permissionKey}`;
            if (!merged.has(key)) {
                merged.set(key, permission);
            }
        }

        res.json(Array.from(merged.values()).map(mapRolePermissionToClient));
    } catch (error) {
        console.error('Failed to fetch role permissions', error);
        res.status(500).json({ error: 'Failed to fetch role permissions' });
    }
});

router.put('/', requireRole('general_manager', 'local_manager'), async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

        await prisma.$transaction(async (tx) => {
            await tx.rolePermission.deleteMany({
                where: { hospitalId },
            });

            if (rows.length === 0) {
                return;
            }

            await tx.rolePermission.createMany({
                data: rows
                    .filter((row: any) => row?.role && row?.permissionKey)
                    .map((row: any) => ({
                        hospitalId,
                        role: String(row.role),
                        permissionKey: String(row.permissionKey),
                        allowed: Boolean(row.allowed),
                    })),
            });
        });

        const permissions = await prisma.rolePermission.findMany({
            where: { hospitalId },
            orderBy: [{ role: 'asc' }, { permissionKey: 'asc' }],
        });

        res.json(permissions.map(mapRolePermissionToClient));
    } catch (error) {
        console.error('Failed to save role permissions', error);
        res.status(500).json({ error: 'Failed to save role permissions' });
    }
});

export default router;
