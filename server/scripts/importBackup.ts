import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

type BackupPrescriptionFormula = {
  formulaId: string;
  volume?: number;
  timesPerDay?: number;
  schedules?: string[];
};

type BackupPrescriptionModule = {
  moduleId: string;
  amount?: number;
  timesPerDay?: number;
  schedules?: string[];
  unit?: string;
};

type BackupPrescriptionStatusEvent = {
  fromStatus?: string;
  toStatus: string;
  reason?: string;
  changedBy?: string;
  effectiveDate?: string;
  createdAt?: string;
};

type BackupPrescription = {
  id?: string;
  hospitalId?: string;
  patientId: string;
  patientName?: string;
  patientRecord?: string;
  patientBed?: string;
  patientWard?: string;
  professionalId?: string;
  professionalName?: string;
  therapyType: string;
  systemType: string;
  feedingRoute?: string;
  infusionMode?: string;
  infusionRateMlH?: number;
  infusionDropsMin?: number;
  infusionHoursPerDay?: number;
  equipmentVolume?: number;
  hydrationVolume?: number;
  hydrationSchedules?: string[];
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  totalFiber?: number;
  totalVolume?: number;
  totalFreeWater?: number;
  nursingTimeMinutes?: number;
  nursingCostTotal?: number;
  materialCostTotal?: number;
  totalCost?: number;
  enteralDetails?: Record<string, unknown>;
  oralDetails?: Record<string, unknown>;
  parenteralDetails?: Record<string, unknown>;
  payloadSnapshot?: Record<string, unknown>;
  status: string;
  statusReason?: string;
  statusChangedAt?: string;
  statusChangedBy?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  formulas?: BackupPrescriptionFormula[];
  modules?: BackupPrescriptionModule[];
  statusEvents?: BackupPrescriptionStatusEvent[];
};

type BackupFile = {
  version: number;
  exportedAt: string;
  hospitalName?: string;
  data: {
    patients?: any[];
    formulas?: any[];
    modules?: any[];
    supplies?: any[];
    professionals?: any[];
    prescriptions?: BackupPrescription[];
    dailyEvolutions?: any[];
    hospitals?: any[];
    wards?: any[];
    settings?: any;
  };
};

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const [, , inputPath] = process.argv;

if (!inputPath) {
  console.error("Uso: npm run backup:import -- <caminho-do-backup.json>");
  process.exit(1);
}

const ensureDate = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const stringifyIfNeeded = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

const stringifyArray = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;
  return JSON.stringify(value);
};

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const readBackup = (filePath: string): BackupFile => {
  const absolutePath = path.resolve(filePath);
  const content = fs.readFileSync(absolutePath, "utf-8");
  return JSON.parse(content) as BackupFile;
};

const clearDatabase = async () => {
  await prisma.$transaction([
    prisma.prescriptionStatusEvent.deleteMany(),
    prisma.dailyEvolution.deleteMany(),
    prisma.prescriptionSupply.deleteMany(),
    prisma.prescriptionModule.deleteMany(),
    prisma.prescriptionFormula.deleteMany(),
    prisma.prescription.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.professional.deleteMany(),
    prisma.formula.deleteMany(),
    prisma.module.deleteMany(),
    prisma.supply.deleteMany(),
    prisma.appSettings.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.appTool.deleteMany(),
    prisma.ward.deleteMany(),
    prisma.hospital.deleteMany(),
  ]);
};

const main = async () => {
  const backup = readBackup(inputPath);
  const data = backup.data || {};

  console.log(`Importando backup exportado em ${backup.exportedAt}...`);

  await clearDatabase();

  if (data.hospitals?.length) {
    await prisma.hospital.createMany({
      data: data.hospitals.map((hospital) => ({
        id: hospital.id,
        name: hospital.name,
        cnpj: hospital.cnpj,
        zipCode: hospital.cep ?? hospital.zipCode,
        isActive: hospital.isActive !== false,
        createdAt: ensureDate(hospital.createdAt) || new Date(),
        updatedAt: ensureDate(hospital.updatedAt) || new Date(),
      })),
    });
  }

  if (data.wards?.length) {
    await prisma.ward.createMany({
      data: data.wards.map((ward) => ({
        id: ward.id,
        hospitalId: ward.hospitalId,
        name: ward.name,
        type: ward.type || "other",
        bedCount: Math.round(toNumber(ward.beds ?? ward.bedCount) || 0),
        isActive: ward.isActive !== false,
        createdAt: ensureDate(ward.createdAt) || new Date(),
        updatedAt: ensureDate(ward.updatedAt) || new Date(),
      })),
    });
  }

  if (data.professionals?.length) {
    const defaultPasswordHash = await bcrypt.hash("12345678", 10);
    await prisma.professional.createMany({
      data: data.professionals.map((professional) => ({
        id: professional.id,
        hospitalId: professional.hospitalId,
        name: professional.name,
        role: professional.role,
        registrationNumber: professional.registrationNumber || professional.crn || professional.cpf || professional.id,
        cpf: professional.cpf,
        crn: professional.crn,
        cpe: professional.cpe,
        managingUnit: professional.managingUnit,
        passwordHash: (professional as any).passwordHash || defaultPasswordHash,
        isActive: professional.isActive !== false,
        createdAt: ensureDate(professional.createdAt) || new Date(),
        updatedAt: ensureDate(professional.updatedAt) || new Date(),
      })),
    });
  }

  if (data.patients?.length) {
    await prisma.patient.createMany({
      data: data.patients.map((patient) => ({
        id: patient.id,
        hospitalId: patient.hospitalId,
        wardId: patient.wardId,
        name: patient.name,
        bed: patient.bed,
        recordNumber: patient.record ?? patient.recordNumber,
        admissionDate: ensureDate(patient.admissionDate),
        birthDate: ensureDate(patient.dob ?? patient.birthDate),
        gender: patient.gender === "female" ? "F" : patient.gender === "male" ? "M" : patient.gender,
        weight: toNumber(patient.weight),
        height: toNumber(patient.height),
        diagnosis: patient.diagnosis,
        nutritionType: patient.nutritionType,
        targetKcal: toNumber(patient.targetKcal),
        targetProtein: toNumber(patient.targetProtein),
        targetVolume: toNumber(patient.targetVolume),
        status: patient.status || "active",
        observation: patient.observation,
        consistency: patient.consistency,
        safeConsistency: patient.safeConsistency,
        mealCount: Math.round(toNumber(patient.mealCount) || 0) || null,
        isActive: patient.status !== "inactive",
        createdAt: ensureDate(patient.createdAt) || new Date(),
        updatedAt: ensureDate(patient.updatedAt) || new Date(),
      })),
    });
  }

  if (data.formulas?.length) {
    await prisma.formula.createMany({
      data: data.formulas.map((formula) => ({
        id: formula.id,
        hospitalId: formula.hospitalId,
        code: formula.code,
        name: formula.name,
        manufacturer: formula.manufacturer,
        type: formula.type,
        classification: formula.classification,
        macronutrientComplexity: formula.macronutrientComplexity,
        ageGroup: formula.ageGroup,
        systemType: formula.systemType,
        formulaTypes: stringifyArray(formula.formulaTypes),
        administrationRoutes: stringifyArray(formula.administrationRoutes),
        presentationForm: formula.presentationForm,
        presentations: stringifyArray(formula.presentations),
        presentationDescription: formula.presentationDescription,
        description: formula.description,
        billingUnit: formula.billingUnit,
        conversionFactor: toNumber(formula.conversionFactor),
        billingPrice: toNumber(formula.billingPrice),
        density: toNumber(formula.density),
        caloriesPerUnit: toNumber(formula.caloriesPerUnit) || 0,
        proteinPerUnit: toNumber(formula.proteinPerUnit) || 0,
        proteinPct: toNumber(formula.proteinPct),
        carbPerUnit: toNumber(formula.carbPerUnit),
        carbPct: toNumber(formula.carbPct),
        fatPerUnit: toNumber(formula.fatPerUnit),
        fatPct: toNumber(formula.fatPct),
        fiberPerUnit: toNumber(formula.fiberPerUnit),
        fiberType: formula.fiberType,
        sodiumPerUnit: toNumber(formula.sodiumPerUnit),
        potassiumPerUnit: toNumber(formula.potassiumPerUnit),
        calciumPerUnit: toNumber(formula.calciumPerUnit),
        phosphorusPerUnit: toNumber(formula.phosphorusPerUnit),
        waterContent: toNumber(formula.waterContent),
        osmolality: toNumber(formula.osmolality),
        proteinSources: formula.proteinSources,
        carbSources: formula.carbSources,
        fatSources: formula.fatSources,
        fiberSources: formula.fiberSources,
        specialCharacteristics: formula.specialCharacteristics,
        plasticG: toNumber(formula.plasticG),
        paperG: toNumber(formula.paperG),
        metalG: toNumber(formula.metalG),
        glassG: toNumber(formula.glassG),
        isActive: formula.isActive !== false,
        createdAt: ensureDate(formula.createdAt) || new Date(),
        updatedAt: ensureDate(formula.updatedAt) || new Date(),
      })),
    });
  }

  if (data.modules?.length) {
    await prisma.module.createMany({
      data: data.modules.map((moduleItem) => ({
        id: moduleItem.id,
        hospitalId: moduleItem.hospitalId,
        name: moduleItem.name,
        description: moduleItem.description,
        density: toNumber(moduleItem.density) || 0,
        referenceAmount: toNumber(moduleItem.referenceAmount) || 0,
        referenceTimesPerDay: Math.round(toNumber(moduleItem.referenceTimesPerDay) || 0),
        calories: toNumber(moduleItem.calories) || 0,
        protein: toNumber(moduleItem.protein) || 0,
        carbs: toNumber(moduleItem.carbs),
        fat: toNumber(moduleItem.fat),
        sodium: toNumber(moduleItem.sodium) || 0,
        potassium: toNumber(moduleItem.potassium) || 0,
        calcium: toNumber(moduleItem.calcium),
        phosphorus: toNumber(moduleItem.phosphorus),
        fiber: toNumber(moduleItem.fiber) || 0,
        freeWater: toNumber(moduleItem.freeWater) || 0,
        billingUnit: moduleItem.billingUnit,
        billingPrice: toNumber(moduleItem.billingPrice),
        proteinSources: moduleItem.proteinSources,
        carbSources: moduleItem.carbSources,
        fatSources: moduleItem.fatSources,
        fiberSources: moduleItem.fiberSources,
        isActive: moduleItem.isActive !== false,
        createdAt: ensureDate(moduleItem.createdAt) || new Date(),
        updatedAt: ensureDate(moduleItem.updatedAt) || new Date(),
      })),
    });
  }

  if (data.supplies?.length) {
    await prisma.supply.createMany({
      data: data.supplies.map((supply) => ({
        id: supply.id,
        hospitalId: supply.hospitalId,
        code: supply.code,
        name: supply.name,
        type: supply.type,
        category: supply.category,
        description: supply.description,
        billingUnit: supply.billingUnit,
        capacityMl: toNumber(supply.capacityMl),
        unitPrice: toNumber(supply.unitPrice) || 0,
        isBillable: supply.isBillable !== false,
        plasticG: toNumber(supply.plasticG),
        paperG: toNumber(supply.paperG),
        metalG: toNumber(supply.metalG),
        glassG: toNumber(supply.glassG),
        isActive: supply.isActive !== false,
        createdAt: ensureDate(supply.createdAt) || new Date(),
        updatedAt: ensureDate(supply.updatedAt) || new Date(),
      })),
    });
  }

  if (data.prescriptions?.length) {
    for (const prescription of data.prescriptions) {
      await prisma.prescription.create({
        data: {
          id: prescription.id,
          hospitalId: prescription.hospitalId,
          patientId: prescription.patientId,
          patientName: prescription.patientName,
          patientRecord: prescription.patientRecord,
          patientBed: prescription.patientBed,
          patientWard: prescription.patientWard,
          professionalId: prescription.professionalId,
          professionalName: prescription.professionalName,
          therapyType: prescription.therapyType,
          systemType: prescription.systemType,
          feedingRoute: prescription.feedingRoute,
          infusionMode: prescription.infusionMode,
          infusionRateMlH: toNumber(prescription.infusionRateMlH),
          infusionDropsMin: toNumber(prescription.infusionDropsMin),
          infusionHoursPerDay: toNumber(prescription.infusionHoursPerDay),
          equipmentVolume: toNumber(prescription.equipmentVolume),
          hydrationVolume: toNumber(prescription.hydrationVolume),
          hydrationSchedules: stringifyArray(prescription.hydrationSchedules),
          totalCalories: toNumber(prescription.totalCalories),
          totalProtein: toNumber(prescription.totalProtein),
          totalCarbs: toNumber(prescription.totalCarbs),
          totalFat: toNumber(prescription.totalFat),
          totalFiber: toNumber(prescription.totalFiber),
          totalVolume: toNumber(prescription.totalVolume),
          totalFreeWater: toNumber(prescription.totalFreeWater),
          nursingTimeMinutes: toNumber(prescription.nursingTimeMinutes),
          nursingCostTotal: toNumber(prescription.nursingCostTotal),
          materialCostTotal: toNumber(prescription.materialCostTotal),
          totalCost: toNumber(prescription.totalCost),
          enteralDetails: stringifyIfNeeded(prescription.enteralDetails),
          oralDetails: stringifyIfNeeded(prescription.oralDetails),
          parenteralDetails: stringifyIfNeeded(prescription.parenteralDetails),
          payloadSnapshot: stringifyIfNeeded(prescription.payloadSnapshot),
          status: prescription.status || "active",
          statusReason: prescription.statusReason,
          statusChangedAt: ensureDate(prescription.statusChangedAt),
          statusChangedBy: prescription.statusChangedBy,
          startDate: ensureDate(prescription.startDate) || new Date(),
          endDate: ensureDate(prescription.endDate),
          notes: prescription.notes,
          formulas: prescription.formulas?.length
            ? {
                create: prescription.formulas.map((formula) => ({
                  formulaId: formula.formulaId,
                  volume: toNumber(formula.volume) || 0,
                  timesPerDay: Math.round(toNumber(formula.timesPerDay) || 0),
                  schedules: JSON.stringify(Array.isArray(formula.schedules) ? formula.schedules : []),
                })),
              }
            : undefined,
          modules: prescription.modules?.length
            ? {
                create: prescription.modules.map((moduleItem) => ({
                  moduleId: moduleItem.moduleId,
                  amount: toNumber(moduleItem.amount) || 0,
                  timesPerDay: Math.round(toNumber(moduleItem.timesPerDay) || 0),
                  schedules: JSON.stringify(Array.isArray(moduleItem.schedules) ? moduleItem.schedules : []),
                  unit: moduleItem.unit,
                })),
              }
            : undefined,
          statusEvents: prescription.statusEvents?.length
            ? {
                create: prescription.statusEvents.map((event) => ({
                  fromStatus: event.fromStatus,
                  toStatus: event.toStatus,
                  reason: event.reason,
                  changedBy: event.changedBy,
                  effectiveDate: ensureDate(event.effectiveDate),
                  createdAt: ensureDate(event.createdAt) || new Date(),
                })),
              }
            : undefined,
        },
      });
    }
  }

  if (data.dailyEvolutions?.length) {
    await prisma.dailyEvolution.createMany({
      data: data.dailyEvolutions.map((evolution) => ({
        id: evolution.id,
        hospitalId: evolution.hospitalId,
        patientId: evolution.patientId,
        prescriptionId: evolution.prescriptionId,
        professionalId: evolution.professionalId,
        date: ensureDate(evolution.date) || new Date(),
        infusedVolume: toNumber(evolution.volumeInfused ?? evolution.infusedVolume),
        infusionPercentage: toNumber(evolution.metaReached ?? evolution.infusionPercentage),
        oralKcal: toNumber(evolution.oralKcal),
        oralProtein: toNumber(evolution.oralProtein),
        enteralKcal: toNumber(evolution.enteralKcal),
        enteralProtein: toNumber(evolution.enteralProtein),
        parenteralKcal: toNumber(evolution.parenteralKcal),
        parenteralProtein: toNumber(evolution.parenteralProtein),
        nonIntentionalKcal: toNumber(evolution.nonIntentionalKcal),
        tneInterruptions: stringifyIfNeeded(evolution.intercurrences ?? evolution.tneInterruptions),
        notes: evolution.notes,
        createdAt: ensureDate(evolution.createdAt) || new Date(),
        updatedAt: ensureDate(evolution.createdAt) || new Date(),
      })),
    });
  }

  if (data.settings) {
    const fallbackHospitalId =
      data.settings.hospitalId
      || data.hospitals?.[0]?.id
      || data.patients?.[0]?.hospitalId
      || data.formulas?.[0]?.hospitalId;

    if (fallbackHospitalId) {
      await prisma.appSettings.create({
        data: {
          id: data.settings.id,
          hospitalId: fallbackHospitalId,
          defaultSignatures: stringifyIfNeeded(data.settings.defaultSignatures),
          labelSettings: stringifyIfNeeded(data.settings.labelSettings),
          nursingCosts: stringifyIfNeeded(data.settings.nursingCosts),
          indirectCosts: stringifyIfNeeded(data.settings.indirectCosts),
          createdAt: ensureDate(data.settings.createdAt) || new Date(),
          updatedAt: ensureDate(data.settings.updatedAt) || new Date(),
        },
      });
    }
  }

  console.log("Importacao concluida com sucesso.");
  console.log(`Hospitais: ${data.hospitals?.length || 0}`);
  console.log(`Pacientes: ${data.patients?.length || 0}`);
  console.log(`Formulas: ${data.formulas?.length || 0}`);
  console.log(`Prescricoes: ${data.prescriptions?.length || 0}`);
};

main()
  .catch((error) => {
    console.error("Falha ao importar backup:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
