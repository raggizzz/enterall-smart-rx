import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// ─── Primitivos reutilizáveis (Zod v4) ──────────────────────────────────────

const dateString = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: 'Data inválida' });

const optionalDateString = dateString.nullish();

// Zod v4: z.coerce.number() em vez de z.number({ coerce: true })
const positiveNumber = z.coerce.number().nonnegative();
const optionalPositiveNumber = positiveNumber.nullish();

const ROLES = ['general_manager', 'local_manager', 'nutritionist', 'technician'] as const;
const STATUSES = ['active', 'suspended', 'cancelled', 'completed'] as const;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  hospitalId: z.string().min(1, 'hospitalId obrigatório'),
  identifier: z.string().min(1, 'identifier obrigatório'),
  password: z.string().min(1, 'password obrigatório'),
  // Zod v4: parâmetro de erro usa 'error' em vez de 'errorMap'
  role: z.enum(ROLES, { error: 'role inválido' }),
});

// ─── Pacientes ────────────────────────────────────────────────────────────────

export const createPatientSchema = z.object({
  hospitalId: z.string().min(1).optional(),
  name: z.string().min(1, 'Nome obrigatório'),
  bed: z.string().nullish(),
  record: z.string().nullish(),
  recordNumber: z.string().nullish(),
  admissionDate: optionalDateString,
  dob: optionalDateString,
  birthDate: optionalDateString,
  gender: z.string().nullish(),
  weight: optionalPositiveNumber,
  height: optionalPositiveNumber,
  diagnosis: z.string().nullish(),
  comorbidities: z.string().nullish(),
  allergies: z.string().nullish(),
  nutritionType: z.string().nullish(),
  targetKcal: optionalPositiveNumber,
  targetProtein: optionalPositiveNumber,
  targetVolume: optionalPositiveNumber,
  status: z.string().nullish(),
  observation: z.string().nullish(),
  notes: z.string().nullish(),
  consistency: z.string().nullish(),
  safeConsistency: z.string().nullish(),
  mealCount: z.coerce.number().int().nonnegative().nullish(),
  defaultSchedules: z.array(z.string()).nullish(),
  ward: z.string().nullish(),
  wardId: z.string().nullish(),
  tneGoals: z.record(z.string(), z.unknown()).nullish(),
});

// ─── Prescrições ──────────────────────────────────────────────────────────────

export const prescriptionStatusSchema = z.object({
  status: z.enum(STATUSES, { error: 'Status inválido' }),
  reason: z.string().nullish(),
  changedBy: z.string().nullish(),
  effectiveDate: optionalDateString,
});

// ─── Profissionais ────────────────────────────────────────────────────────────

export const createProfessionalSchema = z.object({
  hospitalId: z.string().min(1).optional(),
  name: z.string().min(1, 'Nome obrigatório'),
  role: z.enum(ROLES, { error: 'role inválido' }),
  registrationNumber: z.string().min(1, 'Número de registro obrigatório'),
  cpf: z.string().nullish(),
  crn: z.string().nullish(),
  cpe: z.string().nullish(),
  managingUnit: z.string().nullish(),
  password: z.string().nullish(),
  passwordPin: z.string().nullish(),
});

// ─── Unidades (Wards) ─────────────────────────────────────────────────────────

export const createWardSchema = z.object({
  hospitalId: z.string().min(1, 'hospitalId obrigatório'),
  name: z.string().min(1, 'Nome obrigatório'),
  type: z.string().nullish(),
  bedCount: z.coerce.number().int().nonnegative().nullish(),
});

// ─── Fórmulas ─────────────────────────────────────────────────────────────────

export const createFormulaSchema = z.object({
  hospitalId: z.string().min(1).optional(),
  name: z.string().min(1, 'Nome obrigatório'),
  type: z.string().min(1, 'Tipo obrigatório'),
  code: z.string().nullish(),
  manufacturer: z.string().nullish(),
  classification: z.string().nullish(),
  calories: z.coerce.number().nonnegative().nullish(),
  protein: z.coerce.number().nonnegative().nullish(),
  carbohydrate: z.coerce.number().nonnegative().nullish(),
  lipid: z.coerce.number().nonnegative().nullish(),
  fiber: z.coerce.number().nonnegative().nullish(),
  water: z.coerce.number().nonnegative().nullish(),
  osmolarity: z.coerce.number().nonnegative().nullish(),
  density: z.coerce.number().nonnegative().nullish(),
  presentations: z.union([z.array(z.unknown()), z.string()]).nullish(),
  formulaTypes: z.union([z.array(z.unknown()), z.string()]).nullish(),
  administrationRoutes: z.union([z.array(z.unknown()), z.string()]).nullish(),
}).passthrough();

// ─── Módulos ──────────────────────────────────────────────────────────────────

export const createModuleSchema = z.object({
  hospitalId: z.string().min(1).optional(),
  name: z.string().min(1, 'Nome obrigatório'),
  code: z.string().nullish(),
  manufacturer: z.string().nullish(),
  description: z.string().nullish(),
  presentationForm: z.string().nullish(),
  presentations: z.union([z.array(z.unknown()), z.string()]).nullish(),
  calories: z.coerce.number().nonnegative().nullish(),
  protein: z.coerce.number().nonnegative().nullish(),
  density: z.coerce.number().nonnegative().nullish(),
  referenceAmount: z.coerce.number().nonnegative().nullish(),
  referenceTimesPerDay: z.coerce.number().int().nonnegative().nullish(),
}).passthrough();

// ─── Suprimentos ─────────────────────────────────────────────────────────────

export const createSupplySchema = z.object({
  hospitalId: z.string().min(1).optional(),
  name: z.string().min(1, 'Nome obrigatório'),
  code: z.string().nullish(),
  type: z.string().nullish(),
  category: z.string().nullish(),
  description: z.string().nullish(),
  billingUnit: z.string().nullish(),
  capacityMl: z.coerce.number().nonnegative().nullish(),
  unitPrice: z.coerce.number().nonnegative().nullish(),
  isBillable: z.boolean().nullish(),
  plasticG: z.coerce.number().nonnegative().nullish(),
  paperG: z.coerce.number().nonnegative().nullish(),
  metalG: z.coerce.number().nonnegative().nullish(),
  glassG: z.coerce.number().nonnegative().nullish(),
});

// ─── Helper: middleware de validação ─────────────────────────────────────────

/**
 * Cria um middleware Express que valida req.body contra um schema Zod.
 * Em caso de erro, responde 400 com os detalhes dos campos inválidos.
 */
export function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Zod v4: result.error.issues (antes era result.error.errors)
      const details = result.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ error: 'Dados inválidos', details });
      return;
    }
    req.body = result.data;
    next();
  };
}
