import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // --- 1. Hospital & Wards ---
  const hospital = await prisma.hospital.upsert({
    where: { id: 'hb-001' },
    update: {},
    create: {
      id: 'hb-001',
      name: 'Hospital de Base de Brasília',
      address: 'SMHS Área Especial, Q. 101 - Asa Sul, Brasília - DF',
      isActive: true,
      wards: {
        create: [
          { id: 'ward-uti-trauma', name: 'UTI Trauma', type: 'ICU', bedCount: 20 },
          { id: 'ward-uti-geral', name: 'UTI Geral', type: 'ICU', bedCount: 30 },
          { id: 'ward-oncologia', name: 'Oncologia Internação', type: 'Ward', bedCount: 40 },
          { id: 'ward-clinica-med', name: 'Clínica Médica', type: 'Ward', bedCount: 60 },
        ],
      },
    },
  });

  // --- 2. App Settings ---
  await prisma.appSettings.upsert({
    where: { hospitalId: hospital.id },
    update: {},
    create: {
      hospitalId: hospital.id,
      nutritionistCostHour: 150.0,
      nurseCostHour: 80.0,
      technicianCostHour: 45.0,
      waterCostLiter: 0.05,
      energyCostKwh: 0.90,
    },
  });

  // --- 3. Professional ---
  const passwordHash = await bcrypt.hash('12345678', 10);
  const professional = await prisma.professional.upsert({
    where: { id: 'prof-001' },
    update: {},
    create: {
      id: 'prof-001',
      name: 'Dra. Ana Paula',
      registrationNumber: 'CRN: 12345/DF',
      role: 'nutritionist',
      hospitalId: hospital.id,
      passwordHash,
      isActive: true,
    },
  });

  // --- 4. Formulas, Modules, Supplies ---
  const formulasData = [
    { id: 'form-001', name: 'Isosource 1.5', type: 'polymeric', caloriesPerUnit: 1.5, proteinPerUnit: 0.06 },
    { id: 'form-002', name: 'Novasource Senior', type: 'polymeric', caloriesPerUnit: 1.5, proteinPerUnit: 0.08 },
    { id: 'form-003', name: 'Peptamen 1.5', type: 'oligomeric', caloriesPerUnit: 1.5, proteinPerUnit: 0.068 },
    { id: 'form-004', name: 'Ensure Plus', type: 'supplement', caloriesPerUnit: 1.5, proteinPerUnit: 0.062 }
  ];

  for (const f of formulasData) {
    await prisma.formula.upsert({
      where: { id: f.id },
      update: {},
      create: {
        id: f.id,
        name: f.name,
        type: f.type,
        caloriesPerUnit: f.caloriesPerUnit,
        proteinPerUnit: f.proteinPerUnit,
        isActive: true,
        hospitalId: hospital.id
      },
    });
  }

  await prisma.module.upsert({ 
    where: { id: 'mod-001' }, 
    update: {}, 
    create: { 
      id: 'mod-001', name: 'Módulo de Proteína (Whey)', density: 1.0, referenceAmount: 10, referenceTimesPerDay: 3, calories: 40, protein: 8, sodium: 10, potassium: 5, fiber: 0, freeWater: 0, isActive: true, hospitalId: hospital.id 
    } 
  });
  
  await prisma.supply.upsert({ 
    where: { id: 'sup-001' }, 
    update: {}, 
    create: { 
      id: 'sup-001', code: 'SNE12', name: 'Sonda Nasoenteral 12 Fr', type: 'equipment', unitPrice: 25.50, isActive: true, hospitalId: hospital.id 
    } 
  });

  // --- 5. Patients ---
  const patientsData = [
    { id: 'pat-001', name: 'Carlos Roberto Gomes', dob: new Date('1956-03-12'), record: 'PR-87129', weight: 65.5, height: 1.72, wardId: 'ward-uti-trauma', bed: 'Leito 01', nutritionType: 'enteral' },
    { id: 'pat-002', name: 'Maria Lúcia da Silva', dob: new Date('1961-07-22'), record: 'PR-54321', weight: 58.0, height: 1.60, wardId: 'ward-oncologia', bed: 'Leito 14', nutritionType: 'oral' },
    { id: 'pat-003', name: 'João Pedro Alves', dob: new Date('1980-11-05'), record: 'PR-11234', weight: 70.0, height: 1.75, wardId: 'ward-uti-geral', bed: 'Leito 08', nutritionType: 'enteral' },
  ];

  for (const p of patientsData) {
    await prisma.patient.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        birthDate: p.dob,
        recordNumber: p.record,
        weight: p.weight,
        height: p.height,
        status: 'active',
        wardId: p.wardId,
        bed: p.bed,
        nutritionType: p.nutritionType,
        targetKcal: p.weight * 25,
        targetProtein: p.weight * 1.5,
        targetVolume: 1500,
        hospitalId: hospital.id,
      },
    });
  }

  // --- 6. Prescriptions (For Carlos Roberto in UTI Trauma) ---
  const dbFormula = await prisma.formula.findFirst({ where: { name: 'Novasource Senior' } });

  const p1 = await prisma.prescription.create({
    data: {
      patientId: 'pat-001',
      professionalId: 'prof-001',
      hospitalId: hospital.id,
      therapyType: 'enteral',
      systemType: 'closed',
      startDate: new Date(),
      status: 'active',
      feedingRoute: 'SNE',
      totalVolume: 1000,
      totalCalories: 1500,
      totalProtein: 80,
      formulas: {
        create: [
          {
            formulaId: dbFormula!.id,
            volume: 1000,
            timesPerDay: 1,
            schedules: JSON.stringify(["08:00", "20:00"]),
          }
        ]
      }
    }
  });

  // --- 7. Daily Evolution (For Carlos Roberto) ---
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  await prisma.dailyEvolution.create({
    data: {
      patientId: 'pat-001',
      prescriptionId: p1.id,
      professionalId: 'prof-001',
      hospitalId: hospital.id,
      date: yesterday,
      prescribedVolume: 1000,
      infusedVolume: 800, 
      infusionPercentage: 80,
      proteinPrescribed: 80,
      proteinInfused: 64,
      gastricResidualVolume: 150,
      bowelMovements: 0,
      vomitingEpisodes: 0,
      weight: 65.5,
      notes: 'Apresentou distensão abdominal leve no período noturno. Reduzida a vazão.'
    }
  });

  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    require('fs').writeFileSync('seed-error.log', e.stack || e.toString());
    await prisma.$disconnect();
    process.exit(1);
  });
