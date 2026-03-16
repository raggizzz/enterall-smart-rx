import { Router } from 'express';
import prisma from '../lib/prisma';
import { assertExpectedVersion, resolveExpectedVersion, VersionConflictError, withIdempotency } from '../lib/request-guards';

const router = Router();

const toDate = (value?: string) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const toDateOnly = (value?: Date | string | null) => {
    if (!value) return undefined;
    if (typeof value === 'string') {
        return value.includes('T') ? value.split('T')[0] : value;
    }

    return value.toISOString().split('T')[0];
};

const toJsonString = (value: unknown) => {
    if (Array.isArray(value)) return JSON.stringify(value);
    if (value && typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string') return value;
    return undefined;
};

const toNumber = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const mapPrescriptionToClient = (prescription: any) => ({
    ...prescription,
    patientName: prescription.patientName ?? prescription.patient?.name ?? '',
    patientRecord: prescription.patientRecord ?? prescription.patient?.recordNumber ?? '',
    patientBed: prescription.patientBed ?? prescription.patient?.bed ?? '',
    patientWard: prescription.patientWard ?? prescription.patient?.ward?.name ?? '',
    professionalName: prescription.professionalName ?? prescription.professional?.name,
    startDate: toDateOnly(prescription.startDate),
    endDate: toDateOnly(prescription.endDate),
    hydrationSchedules: prescription.hydrationSchedules ? JSON.parse(prescription.hydrationSchedules) : undefined,
    enteralDetails: prescription.enteralDetails ? JSON.parse(prescription.enteralDetails) : undefined,
    oralDetails: prescription.oralDetails ? JSON.parse(prescription.oralDetails) : undefined,
    parenteralDetails: prescription.parenteralDetails ? JSON.parse(prescription.parenteralDetails) : undefined,
    payloadSnapshot: prescription.payloadSnapshot ? JSON.parse(prescription.payloadSnapshot) : undefined,
    statusReason: prescription.statusReason ?? undefined,
    statusChangedAt: toDateOnly(prescription.statusChangedAt),
    statusChangedBy: prescription.statusChangedBy ?? undefined,
    statusEvents: (prescription.statusEvents || []).map((event: any) => ({
        id: event.id,
        fromStatus: event.fromStatus ?? undefined,
        toStatus: event.toStatus,
        reason: event.reason ?? undefined,
        changedBy: event.changedBy ?? undefined,
        effectiveDate: toDateOnly(event.effectiveDate),
        createdAt: toDateOnly(event.createdAt),
    })),
    formulas: (prescription.formulas || []).map((formula: any) => ({
        ...formula,
        formulaName: formula.formulaName ?? formula.formula?.name ?? '',
        schedules: formula.schedules ? JSON.parse(formula.schedules) : [],
    })),
    modules: (prescription.modules || []).map((module: any) => ({
        ...module,
        moduleName: module.moduleName ?? module.module?.name ?? '',
        schedules: module.schedules ? JSON.parse(module.schedules) : [],
    })),
});

const buildPrescriptionData = (payload: any) => ({
    hospitalId: payload.hospitalId || undefined,
    patientId: payload.patientId,
    patientName: payload.patientName || undefined,
    patientRecord: payload.patientRecord || undefined,
    patientBed: payload.patientBed || undefined,
    patientWard: payload.patientWard || undefined,
    professionalId: payload.professionalId || undefined,
    professionalName: payload.professionalName || undefined,
    therapyType: payload.therapyType,
    systemType: payload.systemType,
    feedingRoute: payload.feedingRoute || undefined,
    infusionMode: payload.infusionMode || undefined,
    infusionRateMlH: toNumber(payload.infusionRateMlH),
    infusionDropsMin: toNumber(payload.infusionDropsMin),
    infusionHoursPerDay: toNumber(payload.infusionHoursPerDay),
    equipmentVolume: toNumber(payload.equipmentVolume),
    hydrationVolume: toNumber(payload.hydrationVolume),
    hydrationSchedules: toJsonString(payload.hydrationSchedules),
    totalCalories: toNumber(payload.totalCalories),
    totalProtein: toNumber(payload.totalProtein),
    totalCarbs: toNumber(payload.totalCarbs),
    totalFat: toNumber(payload.totalFat),
    totalFiber: toNumber(payload.totalFiber),
    totalVolume: toNumber(payload.totalVolume),
    totalFreeWater: toNumber(payload.totalFreeWater),
    nursingTimeMinutes: toNumber(payload.nursingTimeMinutes),
    nursingCostTotal: toNumber(payload.nursingCostTotal),
    materialCostTotal: toNumber(payload.materialCostTotal),
    totalCost: toNumber(payload.totalCost),
    enteralDetails: toJsonString(payload.enteralDetails),
    oralDetails: toJsonString(payload.oralDetails),
    parenteralDetails: toJsonString(payload.parenteralDetails),
    payloadSnapshot: JSON.stringify(payload),
    status: payload.status || 'active',
    statusReason: payload.statusReason || undefined,
    statusChangedAt: toDate(payload.statusChangedAt),
    statusChangedBy: payload.statusChangedBy || undefined,
    startDate: toDate(payload.startDate),
    endDate: toDate(payload.endDate),
    notes: payload.notes || undefined,
});

const buildFormulaCreates = (formulas?: any[]) =>
    Array.isArray(formulas)
        ? formulas
            .filter((formula) => typeof formula?.formulaId === 'string' && formula.formulaId.trim().length > 0)
            .map((formula) => ({
            formulaId: formula.formulaId,
            volume: toNumber(formula.volume) ?? 0,
            timesPerDay: Math.round(toNumber(formula.timesPerDay) ?? 0),
            schedules: JSON.stringify(Array.isArray(formula.schedules) ? formula.schedules : []),
        }))
        : [];

const buildModuleCreates = (modules?: any[]) =>
    Array.isArray(modules)
        ? modules
            .filter((module) => typeof module?.moduleId === 'string' && module.moduleId.trim().length > 0)
            .map((module) => ({
            moduleId: module.moduleId,
            amount: toNumber(module.amount) ?? 0,
            timesPerDay: Math.round(toNumber(module.timesPerDay) ?? 0),
            schedules: JSON.stringify(Array.isArray(module.schedules) ? module.schedules : []),
            unit: module.unit || undefined,
        }))
        : [];

const buildSupplyCreates = (supplies?: any[]) =>
    Array.isArray(supplies)
        ? supplies
            .filter((supply) => typeof supply?.supplyId === 'string' && supply.supplyId.trim().length > 0)
            .map((supply) => ({
                supplyId: supply.supplyId,
                quantity: Math.round(toNumber(supply.quantity) ?? 0),
            }))
        : [];

// Get all active prescriptions
router.get('/', async (req, res) => {
    try {
        const prescriptions = await prisma.prescription.findMany({
            include: {
                patient: { include: { ward: true } },
                professional: true,
                formulas: { include: { formula: true } },
                modules: { include: { module: true } },
                supplies: { include: { supply: true } },
                statusEvents: { orderBy: { createdAt: 'desc' } },
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(prescriptions.map(mapPrescriptionToClient));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const prescription = await prisma.prescription.findUnique({
            where: { id: req.params.id },
            include: {
                patient: { include: { ward: true } },
                professional: true,
                formulas: { include: { formula: true } },
                modules: { include: { module: true } },
                supplies: { include: { supply: true } },
                statusEvents: { orderBy: { createdAt: 'desc' } },
            },
        });

        if (!prescription) {
            res.status(404).json({ error: 'Prescription not found' });
            return;
        }

        res.json(mapPrescriptionToClient(prescription));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch prescription' });
    }
});

// Create a new prescription
router.post('/', async (req, res) => {
    try {
        await withIdempotency(prisma, req, res, async () => {
            const { formulas, modules, supplies, ...prescriptionData } = req.body;
            const normalizedData = buildPrescriptionData(prescriptionData);

            const previousEndDate = normalizedData.startDate
                ? new Date(normalizedData.startDate.getTime())
                : undefined;
            if (previousEndDate) {
                previousEndDate.setDate(previousEndDate.getDate() - 1);
            }

            if (normalizedData.patientId && normalizedData.therapyType) {
                const previousActivePrescriptions = await prisma.prescription.findMany({
                    where: {
                        patientId: normalizedData.patientId,
                        therapyType: normalizedData.therapyType,
                        status: 'active',
                        NOT: previousEndDate ? { startDate: { gt: previousEndDate } } : undefined,
                    },
                    select: {
                        id: true,
                        status: true,
                    },
                });

                if (previousActivePrescriptions.length > 0) {
                    await prisma.prescription.updateMany({
                        where: {
                            id: { in: previousActivePrescriptions.map((item) => item.id) },
                        },
                        data: {
                            status: 'completed',
                            statusReason: 'Substituida por nova prescricao da mesma via.',
                            statusChangedAt: previousEndDate || new Date(),
                            endDate: previousEndDate,
                            version: { increment: 1 },
                        },
                    });

                    await prisma.prescriptionStatusEvent.createMany({
                        data: previousActivePrescriptions.map((item) => ({
                            prescriptionId: item.id,
                            fromStatus: item.status,
                            toStatus: 'completed',
                            reason: 'Substituida por nova prescricao da mesma via.',
                            effectiveDate: previousEndDate || new Date(),
                        })),
                    });
                }
            }

            const newPrescription = await prisma.prescription.create({
                data: {
                    ...normalizedData,
                    formulas: formulas ? { create: buildFormulaCreates(formulas) } : undefined,
                    modules: modules ? { create: buildModuleCreates(modules) } : undefined,
                    supplies: supplies ? { create: buildSupplyCreates(supplies) } : undefined,
                    statusEvents: {
                        create: {
                            fromStatus: null,
                            toStatus: normalizedData.status || 'active',
                            reason: normalizedData.statusReason || 'Prescricao criada.',
                            changedBy: normalizedData.professionalName || undefined,
                            effectiveDate: normalizedData.startDate || new Date(),
                        },
                    },
                }
            });
            return { statusCode: 201, body: { id: newPrescription.id, version: newPrescription.version } };
        });
    } catch (error) {
        console.error('Failed to create prescription', error, req.body);
        res.status(500).json({ error: 'Failed to create prescription' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.body || typeof req.body !== 'object') {
            res.status(400).json({ error: 'Prescription payload is required' });
            return;
        }

        await withIdempotency(prisma, req, res, async () => {
            const current = await prisma.prescription.findUnique({
                where: { id },
                select: { version: true },
            });

            if (!current) {
                return { statusCode: 404, body: { error: 'Prescription not found' } };
            }

            assertExpectedVersion(current.version, resolveExpectedVersion(req), 'prescription');

            const { formulas, modules, supplies, ...prescriptionData } = req.body;
            const normalizedData = buildPrescriptionData(prescriptionData);

            await prisma.$transaction([
                prisma.prescriptionFormula.deleteMany({ where: { prescriptionId: id } }),
                prisma.prescriptionModule.deleteMany({ where: { prescriptionId: id } }),
                prisma.prescriptionSupply.deleteMany({ where: { prescriptionId: id } }),
                prisma.prescription.update({
                    where: { id },
                    data: {
                        ...normalizedData,
                        formulas: formulas ? { create: buildFormulaCreates(formulas) } : undefined,
                        modules: modules ? { create: buildModuleCreates(modules) } : undefined,
                        supplies: supplies ? { create: buildSupplyCreates(supplies) } : undefined,
                        version: { increment: 1 },
                    },
                }),
            ]);

            const updated = await prisma.prescription.findUnique({
                where: { id },
                include: {
                    patient: { include: { ward: true } },
                    professional: true,
                    formulas: { include: { formula: true } },
                    modules: { include: { module: true } },
                    supplies: { include: { supply: true } },
                    statusEvents: { orderBy: { createdAt: 'desc' } },
                },
            });

            return { body: updated ? mapPrescriptionToClient(updated) : { success: true } };
        });
    } catch (error) {
        if (error instanceof VersionConflictError) {
            res.status(409).json({ error: 'Version conflict', currentVersion: error.currentVersion });
            return;
        }
        console.error('Failed to update prescription', req.params.id, error, req.body);
        res.status(500).json({ error: 'Failed to update prescription' });
    }
});

// Update prescription status
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.body || typeof req.body !== 'object') {
            res.status(400).json({ error: 'Prescription status payload is required' });
            return;
        }
        const { status, reason, changedBy, effectiveDate, endDate } = req.body as Record<string, unknown>;
        const nextStatus = typeof status === 'string' && status.trim().length > 0 ? status : 'active';
        const effectiveStatusDate = toDate(
            typeof effectiveDate === 'string'
                ? effectiveDate
                : typeof endDate === 'string'
                    ? endDate
                    : undefined,
        );

        const current = await prisma.prescription.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                version: true,
            },
        });

        if (!current) {
            res.status(404).json({ error: 'Prescription not found' });
            return;
        }

        await withIdempotency(prisma, req, res, async () => {
            const expectedVersion = resolveExpectedVersion(req);
            const updated = await prisma.$transaction(async (tx) => {
                assertExpectedVersion(current.version, expectedVersion, 'prescription');
                const updatedPrescription = await tx.prescription.update({
                    where: { id },
                    data: {
                        status: nextStatus,
                        statusReason: typeof reason === 'string' && reason.trim().length > 0 ? reason.trim() : null,
                        statusChangedBy: typeof changedBy === 'string' && changedBy.trim().length > 0 ? changedBy.trim() : null,
                        statusChangedAt: effectiveStatusDate || new Date(),
                        endDate: nextStatus === 'active' ? null : effectiveStatusDate || new Date(),
                        version: { increment: 1 },
                    }
                });

                await tx.prescriptionStatusEvent.create({
                    data: {
                        prescriptionId: id,
                        fromStatus: current.status,
                        toStatus: nextStatus,
                        reason: typeof reason === 'string' && reason.trim().length > 0 ? reason.trim() : null,
                        changedBy: typeof changedBy === 'string' && changedBy.trim().length > 0 ? changedBy.trim() : null,
                        effectiveDate: effectiveStatusDate || new Date(),
                    },
                });

                return updatedPrescription;
            });

            return { body: mapPrescriptionToClient(updated) };
        });
        
    } catch (error) {
        if (error instanceof VersionConflictError) {
            res.status(409).json({ error: 'Version conflict', currentVersion: error.currentVersion });
            return;
        }
        res.status(500).json({ error: 'Failed to update prescription status' });
    }
});

router.get('/:id/history', async (req, res) => {
    try {
        const events = await prisma.prescriptionStatusEvent.findMany({
            where: { prescriptionId: req.params.id },
            orderBy: { createdAt: 'desc' },
        });

        res.json(events.map((event) => ({
            id: event.id,
            prescriptionId: event.prescriptionId,
            fromStatus: event.fromStatus ?? undefined,
            toStatus: event.toStatus,
            reason: event.reason ?? undefined,
            changedBy: event.changedBy ?? undefined,
            effectiveDate: toDateOnly(event.effectiveDate),
            createdAt: toDateOnly(event.createdAt),
        })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch prescription history' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await withIdempotency(prisma, req, res, async () => {
            const { id } = req.params;
            await prisma.prescription.delete({ where: { id } });
            return { body: { success: true } };
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete prescription' });
    }
});

export default router;
