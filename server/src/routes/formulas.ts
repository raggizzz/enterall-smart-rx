import { Router } from 'express';
import prisma from '../lib/prisma';
import { ensureScopedEntity, requireScopedHospitalId } from '../lib/hospital-scope';
import { assertExpectedVersion, resolveExpectedVersion, VersionConflictError, withIdempotency } from '../lib/request-guards';

const router = Router();

const toJsonString = (value: unknown) => {
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'string') return value;
    return undefined;
};

const toNumber = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value.replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const mapFormulaToClient = (formula: any) => ({
    ...formula,
    presentations: formula.presentations ? JSON.parse(formula.presentations) : [],
    formulaTypes: formula.formulaTypes ? JSON.parse(formula.formulaTypes) : undefined,
    administrationRoutes: formula.administrationRoutes ? JSON.parse(formula.administrationRoutes) : undefined,
});

const buildFormulaPayload = (payload: any, hospitalId: string) => ({
    hospitalId,
    code: payload.code || undefined,
    name: payload.name,
    manufacturer: payload.manufacturer || undefined,
    type: payload.type,
    classification: payload.classification || undefined,
    macronutrientComplexity: payload.macronutrientComplexity || undefined,
    ageGroup: payload.ageGroup || undefined,
    systemType: payload.systemType || undefined,
    formulaTypes: toJsonString(payload.formulaTypes),
    administrationRoutes: toJsonString(payload.administrationRoutes),
    presentationForm: payload.presentationForm || undefined,
    presentations: toJsonString(payload.presentations),
    presentationDescription: payload.presentationDescription || undefined,
    description: payload.description || undefined,
    billingUnit: payload.billingUnit || undefined,
    conversionFactor: toNumber(payload.conversionFactor),
    billingPrice: toNumber(payload.billingPrice),
    density: toNumber(payload.density),
    caloriesPerUnit: toNumber(payload.caloriesPerUnit) ?? 0,
    proteinPerUnit: toNumber(payload.proteinPerUnit) ?? 0,
    proteinPct: toNumber(payload.proteinPct),
    carbPerUnit: toNumber(payload.carbPerUnit),
    carbPct: toNumber(payload.carbPct),
    fatPerUnit: toNumber(payload.fatPerUnit),
    fatPct: toNumber(payload.fatPct),
    fiberPerUnit: toNumber(payload.fiberPerUnit),
    fiberType: payload.fiberType || undefined,
    sodiumPerUnit: toNumber(payload.sodiumPerUnit),
    potassiumPerUnit: toNumber(payload.potassiumPerUnit),
    calciumPerUnit: toNumber(payload.calciumPerUnit),
    phosphorusPerUnit: toNumber(payload.phosphorusPerUnit),
    waterContent: toNumber(payload.waterContent),
    osmolality: toNumber(payload.osmolality),
    proteinSources: payload.proteinSources || undefined,
    carbSources: payload.carbSources || undefined,
    fatSources: payload.fatSources || undefined,
    fiberSources: payload.fiberSources || undefined,
    specialCharacteristics: payload.specialCharacteristics || undefined,
    plasticG: toNumber(payload.plasticG),
    paperG: toNumber(payload.paperG),
    metalG: toNumber(payload.metalG),
    glassG: toNumber(payload.glassG),
    isActive: payload.isActive !== false,
});

router.get('/', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        const formulas = await prisma.formula.findMany({
            where: { isActive: true, hospitalId },
            orderBy: { name: 'asc' }
        });
        res.json(formulas.map(mapFormulaToClient));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch formulas' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        const formula = await prisma.formula.findFirst({
            where: { id: req.params.id, hospitalId },
        });

        if (!ensureScopedEntity(formula, hospitalId)) {
            res.status(404).json({ error: 'Formula not found' });
            return;
        }

        res.json(mapFormulaToClient(formula));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch formula' });
    }
});

router.post('/', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        await withIdempotency(prisma, req, res, async () => {
            const newFormula = await prisma.formula.create({
                data: buildFormulaPayload(req.body, hospitalId)
            });
            return { statusCode: 201, body: { id: newFormula.id, version: newFormula.version } };
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create formula' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const hospitalId = requireScopedHospitalId(req, res);
        if (!hospitalId) return;

        await withIdempotency(prisma, req, res, async () => {
            const { id } = req.params;
            const current = await prisma.formula.findFirst({
                where: { id, hospitalId },
                select: { version: true, hospitalId: true },
            });

            if (!ensureScopedEntity(current, hospitalId)) {
                return { statusCode: 404, body: { error: 'Formula not found' } };
            }

            assertExpectedVersion(current.version, resolveExpectedVersion(req), 'formula');

            const updated = await prisma.formula.update({
                where: { id },
                data: {
                    ...buildFormulaPayload(req.body, hospitalId),
                    version: { increment: 1 },
                }
            });

            return { body: mapFormulaToClient(updated) };
        });
    } catch (error) {
        if (error instanceof VersionConflictError) {
            res.status(409).json({ error: 'Version conflict', currentVersion: error.currentVersion });
            return;
        }
        res.status(500).json({ error: 'Failed to update formula' });
    }
});

export default router;
