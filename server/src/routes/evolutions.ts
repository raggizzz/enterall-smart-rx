import { Router } from 'express';
import prisma from '../lib/prisma';
import { ensureScopedEntity, requireScopedHospitalId } from '../lib/hospital-scope';
import { assertExpectedVersion, resolveExpectedVersion, VersionConflictError, withIdempotency } from '../lib/request-guards';

const router = Router();

const toDate = (value?: string) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const toNumber = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
};

const toDateOnly = (value?: Date | string | null) => {
    if (!value) return undefined;
    if (typeof value === 'string') {
        return value.includes('T') ? value.split('T')[0] : value;
    }

    return value.toISOString().split('T')[0];
};

const mapEvolutionToClient = (evo: any) => ({
    ...evo,
    date: toDateOnly(evo.date),
    volumeInfused: evo.volumeInfused ?? evo.infusedVolume ?? 0,
    metaReached: evo.metaReached ?? evo.infusionPercentage ?? 0,
    oralKcal: evo.oralKcal ?? 0,
    oralProtein: evo.oralProtein ?? 0,
    enteralKcal: evo.enteralKcal ?? 0,
    enteralProtein: evo.enteralProtein ?? 0,
    parenteralKcal: evo.parenteralKcal ?? 0,
    parenteralProtein: evo.parenteralProtein ?? 0,
    nonIntentionalKcal: evo.nonIntentionalKcal ?? 0,
    tneGoals: evo.tneGoals ? JSON.parse(evo.tneGoals) : undefined,
    tneInterruptions: evo.tneInterruptions ? JSON.parse(evo.tneInterruptions) : undefined,
    unintentionalCalories: evo.unintentionalCalories ? JSON.parse(evo.unintentionalCalories) : undefined,
});

const buildEvolutionPayload = (payload: any, hospitalId: string) => {
    const intercurrenceNotes = Array.isArray(payload.intercurrences) && payload.intercurrences.length > 0
        ? payload.intercurrences.join(' | ')
        : undefined;
    const providedNotes = typeof payload.notes === 'string' && payload.notes.trim() !== ''
        ? payload.notes.trim()
        : undefined;
    const mergedNotes = [intercurrenceNotes, providedNotes].filter(Boolean).join(' | ') || undefined;

    return {
        hospitalId,
        patientId: payload.patientId,
        prescriptionId: payload.prescriptionId || undefined,
        professionalId: payload.professionalId || undefined,
        date: toDate(payload.date),
        prescribedVolume: toNumber(payload.prescribedVolume),
        infusedVolume: toNumber(payload.volumeInfused ?? payload.infusedVolume),
        infusionPercentage: toNumber(payload.metaReached ?? payload.infusionPercentage),
        proteinPrescribed: toNumber(payload.proteinPrescribed),
        proteinInfused: toNumber(payload.proteinInfused),
        oralKcal: toNumber(payload.oralKcal),
        oralProtein: toNumber(payload.oralProtein),
        enteralKcal: toNumber(payload.enteralKcal),
        enteralProtein: toNumber(payload.enteralProtein),
        parenteralKcal: toNumber(payload.parenteralKcal),
        parenteralProtein: toNumber(payload.parenteralProtein),
        nonIntentionalKcal: toNumber(payload.nonIntentionalKcal),
        tneGoals: payload.tneGoals ? JSON.stringify(payload.tneGoals) : undefined,
        tneInterruptions: payload.tneInterruptions ? JSON.stringify(payload.tneInterruptions) : undefined,
        unintentionalCalories: payload.unintentionalCalories ? JSON.stringify(payload.unintentionalCalories) : undefined,
        gastricResidualVolume: toNumber(payload.gastricResidualVolume),
        bowelMovements: toNumber(payload.bowelMovements),
        vomitingEpisodes: toNumber(payload.vomitingEpisodes),
        bloodGlucose: toNumber(payload.bloodGlucose),
        weight: toNumber(payload.weight),
        notes: mergedNotes,
    };
};

router.get('/', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        const evolutions = await prisma.dailyEvolution.findMany({
            where: { hospitalId },
            orderBy: { date: 'desc' }
        });
        res.json(evolutions.map(mapEvolutionToClient));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch all evolutions' });
    }
});

router.get('/patient/:patientId', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        const { patientId } = req.params;
        const evolutions = await prisma.dailyEvolution.findMany({
            where: { patientId, hospitalId },
            orderBy: { date: 'desc' }
        });
        res.json(evolutions.map(mapEvolutionToClient));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch evolutions' });
    }
});

router.post('/', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        await withIdempotency(prisma, req, res, async () => {
            const payload = buildEvolutionPayload(req.body, hospitalId);
            const targetDate = payload.date;

            const patient = await prisma.patient.findFirst({
                where: {
                    id: payload.patientId,
                    hospitalId,
                },
                select: { id: true, hospitalId: true },
            });

            if (!ensureScopedEntity(patient, hospitalId)) {
                return { statusCode: 404, body: { error: 'Patient not found' } };
            }

            const existingEvolution = targetDate
                ? await prisma.dailyEvolution.findFirst({
                    where: {
                        hospitalId,
                        patientId: payload.patientId,
                        date: targetDate,
                        prescriptionId: payload.prescriptionId || null,
                    }
                })
                : null;

            if (existingEvolution?.id) {
                const updatedExisting = await prisma.dailyEvolution.update({
                    where: { id: existingEvolution.id },
                    data: {
                        ...payload,
                        version: { increment: 1 },
                    },
                });
                return { body: { id: updatedExisting.id, version: updatedExisting.version } };
            }

            const newEvo = await prisma.dailyEvolution.create({ data: payload });
            return { statusCode: 201, body: { id: newEvo.id, version: newEvo.version } };
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create evolution' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        await withIdempotency(prisma, req, res, async () => {
            const { id } = req.params;
            const current = await prisma.dailyEvolution.findFirst({
                where: { id, hospitalId },
                select: { version: true, hospitalId: true },
            });

            if (!ensureScopedEntity(current, hospitalId)) {
                return { statusCode: 404, body: { error: 'Evolution not found' } };
            }

            assertExpectedVersion(current.version, resolveExpectedVersion(req), 'evolution');

            const updatedEvo = await prisma.dailyEvolution.update({
                where: { id },
                data: {
                    ...buildEvolutionPayload(req.body, hospitalId),
                    version: { increment: 1 },
                },
            });
            return { body: mapEvolutionToClient(updatedEvo) };
        });
    } catch (error) {
        if (error instanceof VersionConflictError) {
            res.status(409).json({ error: 'Version conflict', currentVersion: error.currentVersion });
            return;
        }
        res.status(500).json({ error: 'Failed to update evolution' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        await withIdempotency(prisma, req, res, async () => {
            const { id } = req.params;
            const current = await prisma.dailyEvolution.findFirst({
                where: { id, hospitalId },
                select: { id: true, hospitalId: true },
            });

            if (!ensureScopedEntity(current, hospitalId)) {
                return { statusCode: 404, body: { error: 'Evolution not found' } };
            }

            await prisma.dailyEvolution.delete({ where: { id } });
            return { statusCode: 204, body: null as unknown as { success: boolean } };
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete evolution' });
    }
});

export default router;
