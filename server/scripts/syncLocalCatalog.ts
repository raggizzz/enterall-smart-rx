import { PrismaClient } from "@prisma/client";
import { getAllFormulas, getAllModules } from "../../src/lib/formulasDatabase";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const normalizeCatalogKey = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();

const ensureSystemTypes = (systemType: string, formulaTypes?: string[]) => {
  if (formulaTypes?.length) return formulaTypes;
  if (systemType === "both") return ["open", "closed"];
  return [systemType];
};

async function main() {
  const formulas = getAllFormulas();
  const modules = getAllModules();
  const hospital = await prisma.hospital.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  for (const formula of formulas) {
    const existing = await prisma.formula.findFirst({
      where: {
        OR: [
          { code: formula.code || undefined },
          { name: formula.name },
        ],
      },
    });

    const formulaId = existing?.id || `catalog-formula-${formula.id}`;
    const density = formula.composition.density ?? formula.composition.calories / 100;

    await prisma.formula.upsert({
      where: { id: formulaId },
      update: {
        hospitalId: existing?.hospitalId || hospital?.id,
        code: formula.code,
        name: formula.name,
        manufacturer: formula.manufacturer,
        type: formula.type,
        classification: formula.classification,
        systemType: formula.systemType,
        formulaTypes: JSON.stringify(ensureSystemTypes(formula.systemType, formula.formulaTypes)),
        presentationForm: formula.presentationForm,
        presentations: JSON.stringify(formula.presentations || []),
        presentationDescription: formula.presentationDescription,
        description: formula.description || formula.descriptionForEvolution,
        billingUnit: formula.billingUnit,
        conversionFactor: formula.conversionFactor,
        billingPrice: formula.billingPrice,
        density,
        caloriesPerUnit: density,
        proteinPerUnit: formula.composition.protein / 100,
        carbPerUnit: formula.composition.carbohydrates ? formula.composition.carbohydrates / 100 : undefined,
        fatPerUnit: formula.composition.fat ? formula.composition.fat / 100 : undefined,
        fiberPerUnit: formula.composition.fiber ? formula.composition.fiber / 100 : undefined,
        sodiumPerUnit: formula.composition.sodium,
        potassiumPerUnit: formula.composition.potassium,
        calciumPerUnit: formula.composition.calcium,
        phosphorusPerUnit: formula.composition.phosphorus,
        waterContent: formula.composition.waterContent,
        osmolality: formula.composition.osmolality,
        plasticG: formula.residueInfo?.plastic,
        paperG: formula.residueInfo?.paper,
        metalG: formula.residueInfo?.metal,
        glassG: formula.residueInfo?.glass,
        isActive: true,
      },
      create: {
        id: formulaId,
        hospitalId: hospital?.id,
        code: formula.code,
        name: formula.name,
        manufacturer: formula.manufacturer,
        type: formula.type,
        classification: formula.classification,
        systemType: formula.systemType,
        formulaTypes: JSON.stringify(ensureSystemTypes(formula.systemType, formula.formulaTypes)),
        presentationForm: formula.presentationForm,
        presentations: JSON.stringify(formula.presentations || []),
        presentationDescription: formula.presentationDescription,
        description: formula.description || formula.descriptionForEvolution,
        billingUnit: formula.billingUnit,
        conversionFactor: formula.conversionFactor,
        billingPrice: formula.billingPrice,
        density,
        caloriesPerUnit: density,
        proteinPerUnit: formula.composition.protein / 100,
        carbPerUnit: formula.composition.carbohydrates ? formula.composition.carbohydrates / 100 : undefined,
        fatPerUnit: formula.composition.fat ? formula.composition.fat / 100 : undefined,
        fiberPerUnit: formula.composition.fiber ? formula.composition.fiber / 100 : undefined,
        sodiumPerUnit: formula.composition.sodium,
        potassiumPerUnit: formula.composition.potassium,
        calciumPerUnit: formula.composition.calcium,
        phosphorusPerUnit: formula.composition.phosphorus,
        waterContent: formula.composition.waterContent,
        osmolality: formula.composition.osmolality,
        plasticG: formula.residueInfo?.plastic,
        paperG: formula.residueInfo?.paper,
        metalG: formula.residueInfo?.metal,
        glassG: formula.residueInfo?.glass,
        isActive: true,
      },
    });
  }

  for (const module of modules) {
    const existing = await prisma.module.findFirst({
      where: {
        name: module.name,
      },
    });

    const moduleId = existing?.id || `catalog-module-${normalizeCatalogKey(module.name)}`;

    await prisma.module.upsert({
      where: { id: moduleId },
      update: {
        hospitalId: existing?.hospitalId || hospital?.id,
        name: module.name,
        density: module.density,
        referenceAmount: module.referenceAmount,
        referenceTimesPerDay: module.referenceTimesPerDay,
        calories: module.calories,
        protein: module.protein,
        sodium: module.sodium,
        potassium: module.potassium,
        fiber: module.fiber,
        freeWater: module.freeWater,
        isActive: true,
      },
      create: {
        id: moduleId,
        hospitalId: hospital?.id,
        name: module.name,
        density: module.density,
        referenceAmount: module.referenceAmount,
        referenceTimesPerDay: module.referenceTimesPerDay,
        calories: module.calories,
        protein: module.protein,
        sodium: module.sodium,
        potassium: module.potassium,
        fiber: module.fiber,
        freeWater: module.freeWater,
        isActive: true,
      },
    });
  }

  console.log(`Catalog synced: ${formulas.length} formulas and ${modules.length} modules.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
