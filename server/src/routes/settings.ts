import { Router } from 'express';
import prisma from '../lib/prisma';
import { assertExpectedVersion, resolveExpectedVersion, VersionConflictError, withIdempotency } from '../lib/request-guards';

const router = Router();

const parseJson = <T>(value?: string | null): T | undefined => {
    if (!value) return undefined;
    try {
        return JSON.parse(value) as T;
    } catch {
        return undefined;
    }
};

const stringifyJson = (value: unknown) => {
    if (value === undefined || value === null) return undefined;
    return JSON.stringify(value);
};

const mapSettingsToClient = (settings: any) => ({
    id: settings.id,
    hospitalId: settings.hospitalId,
    hospitalName: settings.hospital?.name || 'Unidade',
    defaultSignatures: parseJson(settings.defaultSignatures),
    labelSettings: parseJson(settings.labelSettings),
    nursingCosts: parseJson(settings.nursingCosts),
    indirectCosts: parseJson(settings.indirectCosts),
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
});

const buildDefaultSettingsResponse = async (hospitalId: string) => {
    const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
    });

    return {
        id: undefined,
        hospitalId,
        hospitalName: hospital?.name || 'Unidade',
        defaultSignatures: {
            rtName: 'RT nao cadastrado',
            rtCrn: 'CRN nao cadastrado',
        },
        labelSettings: {
            showConservation: true,
            defaultConservation: 'Conservacao: usar em ate 4h apos manipulacao, em temperatura ambiente.',
            openConservation: 'Conservacao: usar em ate 4h apos manipulacao, em temperatura ambiente.',
            closedConservation: 'Conservacao: em temperatura ambiente.',
        },
        nursingCosts: {
            timeOpenSystemPump: 0,
            timeClosedSystemPump: 0,
            timeOpenSystemGravity: 0,
            timeClosedSystemGravity: 0,
            timeBolus: 0,
            hourlyRate: 0,
        },
        indirectCosts: {
            laborCosts: 0,
        },
        createdAt: undefined,
        updatedAt: undefined,
    };
};

const buildSettingsPayload = (payload: any) => ({
    defaultSignatures: stringifyJson(payload.defaultSignatures),
    labelSettings: stringifyJson(payload.labelSettings),
    nursingCosts: stringifyJson(payload.nursingCosts),
    indirectCosts: stringifyJson(payload.indirectCosts),
});

router.get('/', async (_req, res) => {
    try {
        const settings = await prisma.appSettings.findMany({
            include: {
                hospital: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        res.json(settings.map(mapSettingsToClient));
    } catch (error) {
        console.error('Failed to fetch settings', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

router.get('/:hospitalId', async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const settings = await prisma.appSettings.findUnique({
            where: { hospitalId },
            include: {
                hospital: true,
            },
        });

        if (!settings) {
            res.json(await buildDefaultSettingsResponse(hospitalId));
            return;
        }

        res.json(mapSettingsToClient(settings));
    } catch (error) {
        console.error('Failed to fetch settings', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

router.put('/:hospitalId', async (req, res) => {
    try {
        await withIdempotency(prisma, req, res, async () => {
            const { hospitalId } = req.params;
            const payload = req.body || {};

            const hospital = await prisma.hospital.findUnique({
                where: { id: hospitalId },
            });

            if (!hospital) {
                return { statusCode: 404, body: { error: 'Hospital not found' } };
            }

            const existingSettings = await prisma.appSettings.findUnique({
                where: { hospitalId },
                select: { version: true },
            });

            assertExpectedVersion(existingSettings?.version ?? 1, resolveExpectedVersion(req), 'settings');

            if (payload.hospitalName && typeof payload.hospitalName === 'string' && payload.hospitalName.trim()) {
                await prisma.hospital.update({
                    where: { id: hospitalId },
                    data: {
                        name: payload.hospitalName.trim(),
                        version: { increment: 1 },
                    },
                });
            }

            const settings = await prisma.appSettings.upsert({
                where: { hospitalId },
                update: {
                    ...buildSettingsPayload(payload),
                    version: { increment: 1 },
                },
                create: {
                    hospitalId,
                    ...buildSettingsPayload(payload),
                },
                include: {
                    hospital: true,
                },
            });

            return { body: mapSettingsToClient(settings) };
        });
    } catch (error) {
        if (error instanceof VersionConflictError) {
            res.status(409).json({ error: 'Version conflict', currentVersion: error.currentVersion });
            return;
        }
        console.error('Failed to save settings', error, req.body);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

export default router;
