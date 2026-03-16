import { Router } from 'express';
import prisma from '../lib/prisma';
import { assertExpectedVersion, resolveExpectedVersion, VersionConflictError, withIdempotency } from '../lib/request-guards';

const router = Router();

const toJsonString = (value: unknown) => {
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'string') return value;
    return undefined;
};

const mapFormulaToClient = (formula: any) => ({
    ...formula,
    presentations: formula.presentations ? JSON.parse(formula.presentations) : [],
    formulaTypes: formula.formulaTypes ? JSON.parse(formula.formulaTypes) : undefined,
    administrationRoutes: formula.administrationRoutes ? JSON.parse(formula.administrationRoutes) : undefined,
});

const buildFormulaPayload = (payload: any) => ({
    hospitalId: payload.hospitalId || undefined,
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
    conversionFactor: typeof payload.conversionFactor === 'number' ? payload.conversionFactor : undefined,
    billingPrice: typeof payload.billingPrice === 'number' ? payload.billingPrice : undefined,
    density: typeof payload.density === 'number' ? payload.density : undefined,
    caloriesPerUnit: payload.caloriesPerUnit,
    proteinPerUnit: payload.proteinPerUnit,
    proteinPct: typeof payload.proteinPct === 'number' ? payload.proteinPct : undefined,
    carbPerUnit: typeof payload.carbPerUnit === 'number' ? payload.carbPerUnit : undefined,
    carbPct: typeof payload.carbPct === 'number' ? payload.carbPct : undefined,
    fatPerUnit: typeof payload.fatPerUnit === 'number' ? payload.fatPerUnit : undefined,
    fatPct: typeof payload.fatPct === 'number' ? payload.fatPct : undefined,
    fiberPerUnit: typeof payload.fiberPerUnit === 'number' ? payload.fiberPerUnit : undefined,
    fiberType: payload.fiberType || undefined,
    sodiumPerUnit: typeof payload.sodiumPerUnit === 'number' ? payload.sodiumPerUnit : undefined,
    potassiumPerUnit: typeof payload.potassiumPerUnit === 'number' ? payload.potassiumPerUnit : undefined,
    calciumPerUnit: typeof payload.calciumPerUnit === 'number' ? payload.calciumPerUnit : undefined,
    phosphorusPerUnit: typeof payload.phosphorusPerUnit === 'number' ? payload.phosphorusPerUnit : undefined,
    waterContent: typeof payload.waterContent === 'number' ? payload.waterContent : undefined,
    osmolality: typeof payload.osmolality === 'number' ? payload.osmolality : undefined,
    proteinSources: payload.proteinSources || undefined,
    carbSources: payload.carbSources || undefined,
    fatSources: payload.fatSources || undefined,
    fiberSources: payload.fiberSources || undefined,
    specialCharacteristics: payload.specialCharacteristics || undefined,
    plasticG: typeof payload.plasticG === 'number' ? payload.plasticG : undefined,
    paperG: typeof payload.paperG === 'number' ? payload.paperG : undefined,
    metalG: typeof payload.metalG === 'number' ? payload.metalG : undefined,
    glassG: typeof payload.glassG === 'number' ? payload.glassG : undefined,
    isActive: payload.isActive !== false,
});

router.get('/', async (req, res) => {
    try {
        const formulas = await prisma.formula.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });
        res.json(formulas.map(mapFormulaToClient));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch formulas' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const formula = await prisma.formula.findUnique({
            where: { id: req.params.id },
        });

        if (!formula) {
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
        await withIdempotency(prisma, req, res, async () => {
            const newFormula = await prisma.formula.create({
                data: buildFormulaPayload(req.body)
            });
            return { statusCode: 201, body: { id: newFormula.id, version: newFormula.version } };
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create formula' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        await withIdempotency(prisma, req, res, async () => {
            const { id } = req.params;
            const current = await prisma.formula.findUnique({
                where: { id },
                select: { version: true },
            });

            if (!current) {
                return { statusCode: 404, body: { error: 'Formula not found' } };
            }

            assertExpectedVersion(current.version, resolveExpectedVersion(req), 'formula');

            const updated = await prisma.formula.update({
                where: { id },
                data: {
                    ...buildFormulaPayload(req.body),
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
