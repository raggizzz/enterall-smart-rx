-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ward" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Professional" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "cpf" TEXT,
    "crn" TEXT,
    "cpe" TEXT,
    "managingUnit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "passwordHash" TEXT,

    CONSTRAINT "Professional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "wardId" TEXT,
    "name" TEXT NOT NULL,
    "bed" TEXT,
    "recordNumber" TEXT,
    "admissionDate" TIMESTAMP(3),
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "diagnosis" TEXT,
    "comorbidities" TEXT,
    "allergies" TEXT,
    "nutritionType" TEXT,
    "targetKcal" DOUBLE PRECISION,
    "targetProtein" DOUBLE PRECISION,
    "targetVolume" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "observation" TEXT,
    "consistency" TEXT,
    "safeConsistency" TEXT,
    "mealCount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formula" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "type" TEXT NOT NULL,
    "classification" TEXT,
    "macronutrientComplexity" TEXT,
    "ageGroup" TEXT,
    "systemType" TEXT,
    "formulaTypes" TEXT,
    "administrationRoutes" TEXT,
    "presentationForm" TEXT,
    "presentations" TEXT,
    "presentationDescription" TEXT,
    "description" TEXT,
    "billingUnit" TEXT,
    "conversionFactor" DOUBLE PRECISION,
    "billingPrice" DOUBLE PRECISION,
    "density" DOUBLE PRECISION,
    "caloriesPerUnit" DOUBLE PRECISION NOT NULL,
    "proteinPerUnit" DOUBLE PRECISION NOT NULL,
    "proteinPct" DOUBLE PRECISION,
    "carbPerUnit" DOUBLE PRECISION,
    "carbPct" DOUBLE PRECISION,
    "fatPerUnit" DOUBLE PRECISION,
    "fatPct" DOUBLE PRECISION,
    "fiberPerUnit" DOUBLE PRECISION,
    "fiberType" TEXT,
    "sodiumPerUnit" DOUBLE PRECISION,
    "potassiumPerUnit" DOUBLE PRECISION,
    "calciumPerUnit" DOUBLE PRECISION,
    "phosphorusPerUnit" DOUBLE PRECISION,
    "waterContent" DOUBLE PRECISION,
    "osmolality" DOUBLE PRECISION,
    "proteinSources" TEXT,
    "carbSources" TEXT,
    "fatSources" TEXT,
    "fiberSources" TEXT,
    "specialCharacteristics" TEXT,
    "plasticG" DOUBLE PRECISION,
    "paperG" DOUBLE PRECISION,
    "metalG" DOUBLE PRECISION,
    "glassG" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Formula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "density" DOUBLE PRECISION NOT NULL,
    "referenceAmount" DOUBLE PRECISION NOT NULL,
    "referenceTimesPerDay" INTEGER NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION NOT NULL,
    "potassium" DOUBLE PRECISION NOT NULL,
    "calcium" DOUBLE PRECISION,
    "phosphorus" DOUBLE PRECISION,
    "fiber" DOUBLE PRECISION NOT NULL,
    "freeWater" DOUBLE PRECISION NOT NULL,
    "billingUnit" TEXT,
    "billingPrice" DOUBLE PRECISION,
    "proteinSources" TEXT,
    "carbSources" TEXT,
    "fatSources" TEXT,
    "fiberSources" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT,
    "conversionFactor" DOUBLE PRECISION,
    "manufacturer" TEXT,
    "presentationForm" TEXT,
    "presentations" TEXT,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supply" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "billingUnit" TEXT,
    "capacityMl" DOUBLE PRECISION,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "plasticG" DOUBLE PRECISION,
    "paperG" DOUBLE PRECISION,
    "metalG" DOUBLE PRECISION,
    "glassG" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT,
    "patientRecord" TEXT,
    "patientBed" TEXT,
    "patientWard" TEXT,
    "professionalId" TEXT,
    "professionalName" TEXT,
    "therapyType" TEXT NOT NULL,
    "systemType" TEXT NOT NULL,
    "feedingRoute" TEXT,
    "infusionMode" TEXT,
    "infusionRateMlH" DOUBLE PRECISION,
    "infusionDropsMin" DOUBLE PRECISION,
    "infusionHoursPerDay" DOUBLE PRECISION,
    "equipmentVolume" DOUBLE PRECISION,
    "hydrationVolume" DOUBLE PRECISION,
    "hydrationSchedules" TEXT,
    "totalCalories" DOUBLE PRECISION,
    "totalProtein" DOUBLE PRECISION,
    "totalCarbs" DOUBLE PRECISION,
    "totalFat" DOUBLE PRECISION,
    "totalFiber" DOUBLE PRECISION,
    "totalVolume" DOUBLE PRECISION,
    "totalFreeWater" DOUBLE PRECISION,
    "nursingTimeMinutes" DOUBLE PRECISION,
    "nursingCostTotal" DOUBLE PRECISION,
    "materialCostTotal" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "enteralDetails" TEXT,
    "oralDetails" TEXT,
    "parenteralDetails" TEXT,
    "payloadSnapshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "statusReason" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "statusChangedBy" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionStatusEvent" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionFormula" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "timesPerDay" INTEGER NOT NULL,
    "schedules" TEXT NOT NULL,

    CONSTRAINT "PrescriptionFormula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionModule" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "timesPerDay" INTEGER NOT NULL,
    "schedules" TEXT,
    "unit" TEXT,

    CONSTRAINT "PrescriptionModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionSupply" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "PrescriptionSupply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyEvolution" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "patientId" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "professionalId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "prescribedVolume" DOUBLE PRECISION,
    "infusedVolume" DOUBLE PRECISION,
    "infusionPercentage" DOUBLE PRECISION,
    "proteinPrescribed" DOUBLE PRECISION,
    "proteinInfused" DOUBLE PRECISION,
    "oralKcal" DOUBLE PRECISION,
    "oralProtein" DOUBLE PRECISION,
    "enteralKcal" DOUBLE PRECISION,
    "enteralProtein" DOUBLE PRECISION,
    "parenteralKcal" DOUBLE PRECISION,
    "parenteralProtein" DOUBLE PRECISION,
    "nonIntentionalKcal" DOUBLE PRECISION,
    "tneGoals" TEXT,
    "tneInterruptions" TEXT,
    "unintentionalCalories" TEXT,
    "gastricResidualVolume" DOUBLE PRECISION,
    "bowelMovements" INTEGER,
    "vomitingEpisodes" INTEGER,
    "bloodGlucose" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "DailyEvolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "nutritionistCostHour" DOUBLE PRECISION,
    "nurseCostHour" DOUBLE PRECISION,
    "technicianCostHour" DOUBLE PRECISION,
    "waterCostLiter" DOUBLE PRECISION,
    "energyCostKwh" DOUBLE PRECISION,
    "defaultSignatures" TEXT,
    "labelSettings" TEXT,
    "nursingCosts" TEXT,
    "indirectCosts" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "role" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppTool" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "link" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AppTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseBody" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ward_hospitalId_isActive_name_idx" ON "Ward"("hospitalId", "isActive", "name");

-- CreateIndex
CREATE INDEX "Professional_hospitalId_isActive_role_idx" ON "Professional"("hospitalId", "isActive", "role");

-- CreateIndex
CREATE INDEX "Professional_hospitalId_registrationNumber_idx" ON "Professional"("hospitalId", "registrationNumber");

-- CreateIndex
CREATE INDEX "Patient_hospitalId_status_wardId_idx" ON "Patient"("hospitalId", "status", "wardId");

-- CreateIndex
CREATE INDEX "Patient_hospitalId_name_idx" ON "Patient"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "Patient_hospitalId_recordNumber_idx" ON "Patient"("hospitalId", "recordNumber");

-- CreateIndex
CREATE INDEX "Formula_hospitalId_isActive_type_idx" ON "Formula"("hospitalId", "isActive", "type");

-- CreateIndex
CREATE INDEX "Formula_hospitalId_code_idx" ON "Formula"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "Formula_hospitalId_name_idx" ON "Formula"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "Module_hospitalId_isActive_name_idx" ON "Module"("hospitalId", "isActive", "name");

-- CreateIndex
CREATE INDEX "Supply_hospitalId_isActive_type_idx" ON "Supply"("hospitalId", "isActive", "type");

-- CreateIndex
CREATE INDEX "Supply_hospitalId_category_idx" ON "Supply"("hospitalId", "category");

-- CreateIndex
CREATE INDEX "Supply_hospitalId_code_idx" ON "Supply"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "Prescription_patientId_therapyType_status_idx" ON "Prescription"("patientId", "therapyType", "status");

-- CreateIndex
CREATE INDEX "Prescription_hospitalId_status_idx" ON "Prescription"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "Prescription_startDate_endDate_idx" ON "Prescription"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "PrescriptionStatusEvent_prescriptionId_createdAt_idx" ON "PrescriptionStatusEvent"("prescriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "DailyEvolution_hospitalId_date_idx" ON "DailyEvolution"("hospitalId", "date");

-- CreateIndex
CREATE INDEX "DailyEvolution_patientId_date_idx" ON "DailyEvolution"("patientId", "date");

-- CreateIndex
CREATE INDEX "DailyEvolution_prescriptionId_date_idx" ON "DailyEvolution"("prescriptionId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_hospitalId_key" ON "AppSettings"("hospitalId");

-- CreateIndex
CREATE INDEX "AppSettings_hospitalId_idx" ON "AppSettings"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_hospitalId_role_permissionKey_key" ON "RolePermission"("hospitalId", "role", "permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "AppTool_hospitalId_code_key" ON "AppTool"("hospitalId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_createdAt_idx" ON "IdempotencyRecord"("createdAt");

-- AddForeignKey
ALTER TABLE "Ward" ADD CONSTRAINT "Ward_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Professional" ADD CONSTRAINT "Professional_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formula" ADD CONSTRAINT "Formula_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supply" ADD CONSTRAINT "Supply_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionStatusEvent" ADD CONSTRAINT "PrescriptionStatusEvent_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionFormula" ADD CONSTRAINT "PrescriptionFormula_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "Formula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionFormula" ADD CONSTRAINT "PrescriptionFormula_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionModule" ADD CONSTRAINT "PrescriptionModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionModule" ADD CONSTRAINT "PrescriptionModule_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionSupply" ADD CONSTRAINT "PrescriptionSupply_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionSupply" ADD CONSTRAINT "PrescriptionSupply_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEvolution" ADD CONSTRAINT "DailyEvolution_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEvolution" ADD CONSTRAINT "DailyEvolution_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEvolution" ADD CONSTRAINT "DailyEvolution_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEvolution" ADD CONSTRAINT "DailyEvolution_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppTool" ADD CONSTRAINT "AppTool_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;
