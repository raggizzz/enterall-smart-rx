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

const hasOwn = (payload: Record<string, unknown>, key: string) =>
    Object.prototype.hasOwnProperty.call(payload, key);

const toOptionalString = (value: unknown) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
};

const toOptionalNumber = (value: unknown) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const toOptionalDate = (value: unknown) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    if (typeof value !== 'string') return undefined;
    return toDate(value) ?? null;
};

const mapPatientToClient = (patient: any) => {
    const latestEvolution = patient.evolutions?.[0];
    const weight = typeof patient.weight === 'number' ? patient.weight : undefined;
    const targetKcalPerKg = latestEvolution?.tneGoals
        ? JSON.parse(latestEvolution.tneGoals).targetKcalPerKg
        : (weight && patient.targetKcal ? patient.targetKcal / weight : undefined);
    const targetProteinPerKgActual = latestEvolution?.tneGoals
        ? JSON.parse(latestEvolution.tneGoals).targetProteinPerKgActual
        : (weight && patient.targetProtein ? patient.targetProtein / weight : undefined);

    return {
        ...patient,
        record: patient.recordNumber ?? '',
        dob: patient.birthDate ? patient.birthDate.toISOString().split('T')[0] : '',
        ward: patient.ward?.name ?? '',
        monitoringNotes: latestEvolution?.notes ?? undefined,
        tneGoals: targetKcalPerKg || targetProteinPerKgActual
            ? {
                targetKcalPerKg,
                targetProteinPerKgActual,
                targetProteinPerKgIdeal: latestEvolution?.tneGoals
                    ? JSON.parse(latestEvolution.tneGoals).targetProteinPerKgIdeal
                    : undefined,
            }
            : undefined,
        infusionPercentage24h: latestEvolution?.infusionPercentage ?? undefined,
        tneInterruptions: latestEvolution?.tneInterruptions ? JSON.parse(latestEvolution.tneInterruptions) : undefined,
        unintentionalCalories: latestEvolution?.unintentionalCalories ? JSON.parse(latestEvolution.unintentionalCalories) : undefined,
    };
};

const resolveWardId = async (hospitalId?: string, ward?: string, wardId?: string) => {
    if (wardId) return wardId;
    if (!hospitalId || !ward) return undefined;

    const wardRecord = await prisma.ward.findFirst({
        where: {
            hospitalId,
            name: ward,
        },
    });

    return wardRecord?.id;
};

const buildPatientData = async (payload: any, hospitalId: string) => {
    const wardId = await resolveWardId(hospitalId, payload.ward, payload.wardId);
    const weight = typeof payload.weight === 'number' ? payload.weight : undefined;
    const targetKcal = payload.tneGoals?.targetKcalPerKg && weight
        ? payload.tneGoals.targetKcalPerKg * weight
        : (typeof payload.targetKcal === 'number' ? payload.targetKcal : undefined);
    const targetProtein = payload.tneGoals?.targetProteinPerKgActual && weight
        ? payload.tneGoals.targetProteinPerKgActual * weight
        : (typeof payload.targetProtein === 'number' ? payload.targetProtein : undefined);

    return {
        name: payload.name,
        bed: payload.bed || undefined,
        recordNumber: payload.record ?? payload.recordNumber ?? undefined,
        admissionDate: toDate(payload.admissionDate),
        birthDate: toDate(payload.dob ?? payload.birthDate),
        gender: payload.gender || undefined,
        weight,
        height: typeof payload.height === 'number' ? payload.height : undefined,
        diagnosis: payload.diagnosis || undefined,
        comorbidities: payload.comorbidities || undefined,
        allergies: payload.allergies || undefined,
        nutritionType: payload.nutritionType || undefined,
        targetKcal,
        targetProtein,
        targetVolume: typeof payload.targetVolume === 'number' ? payload.targetVolume : undefined,
        status: payload.status || undefined,
        observation: payload.observation ?? payload.notes ?? undefined,
        consistency: payload.consistency || undefined,
        safeConsistency: payload.safeConsistency || undefined,
        mealCount: typeof payload.mealCount === 'number' ? payload.mealCount : undefined,
        hospitalId,
        wardId,
    };
};

const buildPatientUpdateData = async (payload: Record<string, unknown>, hospitalId: string) => {
    const data: Record<string, unknown> = {};

    if (hasOwn(payload, 'name')) {
        const name = toOptionalString(payload.name);
        if (typeof name === 'string' && name.length > 0) {
            data.name = name;
        }
    }

    if (hasOwn(payload, 'bed')) data.bed = toOptionalString(payload.bed);
    if (hasOwn(payload, 'record') || hasOwn(payload, 'recordNumber')) {
        data.recordNumber = toOptionalString(payload.record ?? payload.recordNumber);
    }
    if (hasOwn(payload, 'admissionDate')) data.admissionDate = toOptionalDate(payload.admissionDate);
    if (hasOwn(payload, 'dob') || hasOwn(payload, 'birthDate')) {
        data.birthDate = toOptionalDate(payload.dob ?? payload.birthDate);
    }
    if (hasOwn(payload, 'gender')) data.gender = toOptionalString(payload.gender);
    if (hasOwn(payload, 'weight')) data.weight = toOptionalNumber(payload.weight);
    if (hasOwn(payload, 'height')) data.height = toOptionalNumber(payload.height);
    if (hasOwn(payload, 'diagnosis')) data.diagnosis = toOptionalString(payload.diagnosis);
    if (hasOwn(payload, 'comorbidities')) data.comorbidities = toOptionalString(payload.comorbidities);
    if (hasOwn(payload, 'allergies')) data.allergies = toOptionalString(payload.allergies);
    if (hasOwn(payload, 'nutritionType')) data.nutritionType = toOptionalString(payload.nutritionType);
    if (hasOwn(payload, 'status')) data.status = toOptionalString(payload.status) ?? 'active';
    if (hasOwn(payload, 'observation') || hasOwn(payload, 'notes')) {
        data.observation = toOptionalString(payload.observation ?? payload.notes);
    }
    if (hasOwn(payload, 'consistency')) data.consistency = toOptionalString(payload.consistency);
    if (hasOwn(payload, 'safeConsistency')) data.safeConsistency = toOptionalString(payload.safeConsistency);
    if (hasOwn(payload, 'mealCount')) data.mealCount = toOptionalNumber(payload.mealCount);
    if (hasOwn(payload, 'targetVolume')) data.targetVolume = toOptionalNumber(payload.targetVolume);

    if (hasOwn(payload, 'targetKcal')) {
        data.targetKcal = toOptionalNumber(payload.targetKcal);
    } else if (payload.tneGoals && typeof payload.tneGoals === 'object' && hasOwn(payload as Record<string, unknown>, 'weight')) {
        const weight = toOptionalNumber(payload.weight);
        const tneGoals = payload.tneGoals as Record<string, unknown>;
        if (typeof weight === 'number' && typeof tneGoals.targetKcalPerKg === 'number') {
            data.targetKcal = tneGoals.targetKcalPerKg * weight;
        }
    }

    if (hasOwn(payload, 'targetProtein')) {
        data.targetProtein = toOptionalNumber(payload.targetProtein);
    } else if (payload.tneGoals && typeof payload.tneGoals === 'object' && hasOwn(payload as Record<string, unknown>, 'weight')) {
        const weight = toOptionalNumber(payload.weight);
        const tneGoals = payload.tneGoals as Record<string, unknown>;
        if (typeof weight === 'number' && typeof tneGoals.targetProteinPerKgActual === 'number') {
            data.targetProtein = tneGoals.targetProteinPerKgActual * weight;
        }
    }

    data.hospitalId = hospitalId;

    if (hasOwn(payload, 'wardId')) {
        data.wardId = toOptionalString(payload.wardId);
    } else if (hasOwn(payload, 'ward')) {
        const hospitalId = typeof data.hospitalId === 'string'
            ? data.hospitalId
            : hospitalId;
        data.wardId = await resolveWardId(hospitalId, typeof payload.ward === 'string' ? payload.ward : undefined) ?? null;
    }

    return data;
};

// Get all active patients
router.get('/', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        const patients = await prisma.patient.findMany({
            where: { isActive: true, hospitalId },
            include: {
                ward: true,
                evolutions: {
                    orderBy: { date: 'desc' },
                    take: 1,
                },
            },
            orderBy: { name: 'asc' }
        });
        res.json(patients.map(mapPatientToClient));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch patients' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        const patient = await prisma.patient.findFirst({
            where: { id: req.params.id, hospitalId },
            include: {
                ward: true,
                evolutions: {
                    orderBy: { date: 'desc' },
                    take: 1,
                },
            },
        });

        if (!ensureScopedEntity(patient, hospitalId)) {
            res.status(404).json({ error: 'Patient not found' });
            return;
        }

        res.json(mapPatientToClient(patient));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch patient' });
    }
});

// Create a new patient
router.post('/', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        await withIdempotency(prisma, req, res, async () => {
            const newPatient = await prisma.patient.create({
                data: await buildPatientData(req.body, hospitalId)
            });
            return { statusCode: 201, body: { id: newPatient.id, version: newPatient.version } };
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create patient' });
    }
});

// Update a patient
router.put('/:id', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        await withIdempotency(prisma, req, res, async () => {
            const { id } = req.params;
            const current = await prisma.patient.findFirst({
                where: { id, hospitalId },
                select: { version: true, hospitalId: true },
            });

            if (!ensureScopedEntity(current, hospitalId)) {
                return { statusCode: 404, body: { error: 'Patient not found' } };
            }

            assertExpectedVersion(current.version, resolveExpectedVersion(req), 'patient');

            const updated = await prisma.patient.update({
                where: { id },
                data: {
                    ...(await buildPatientUpdateData(req.body as Record<string, unknown>, hospitalId)),
                    version: { increment: 1 },
                }
            });
            return { body: mapPatientToClient(updated) };
        });
    } catch (error) {
        if (error instanceof VersionConflictError) {
            res.status(409).json({ error: 'Version conflict', currentVersion: error.currentVersion });
            return;
        }
        console.error('Failed to update patient', req.params.id, error);
        res.status(500).json({ error: 'Failed to update patient' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        await withIdempotency(prisma, req, res, async () => {
            const { id } = req.params;
            const current = await prisma.patient.findFirst({
                where: { id, hospitalId },
                select: { id: true, hospitalId: true },
            });

            if (!ensureScopedEntity(current, hospitalId)) {
                return { statusCode: 404, body: { error: 'Patient not found' } };
            }

            await prisma.patient.update({
                where: { id },
                data: { isActive: false, version: { increment: 1 } },
            });
            return { body: { success: true } };
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete patient' });
    }
});

export default router;
