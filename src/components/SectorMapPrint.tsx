import type { ReactNode } from "react";
import type { Patient, Prescription } from "@/lib/database";
import { getPrescriptionRateLabel } from "@/lib/prescriptionInfusion";

interface SectorMapPrintProps {
  hospitalName?: string;
  wardName: string;
  patients: Patient[];
  prescriptions: Prescription[];
}

const calculateBmi = (patient: Patient): number | null => {
  if (!patient.weight || !patient.height) return null;
  const heightMeters = patient.height / 100;
  if (!heightMeters) return null;
  return patient.weight / (heightMeters * heightMeters);
};

const calculateIdealWeight = (patient: Patient): number | null => {
  const bmi = calculateBmi(patient);
  if (!bmi || bmi < 30 || !patient.height) return null;
  const heightMeters = patient.height / 100;
  return 25 * heightMeters * heightMeters;
};

const sortByMostRecentStartDate = (left: Prescription, right: Prescription): number =>
  right.startDate.localeCompare(left.startDate);

const getActivePrescriptionsForPatient = (prescriptions: Prescription[], patientId?: string) =>
  prescriptions
    .filter((prescription) => prescription.patientId === patientId && prescription.status === "active")
    .sort(sortByMostRecentStartDate);

const formatSchedules = (schedules?: string[]) => {
  if (!schedules || schedules.length === 0) return "-";
  return `${schedules.length}x/dia (${schedules.join(", ")})`;
};

const formatPerKg = (value?: number, weight?: number, unit = "g/kg") => {
  if (!value || !weight) return "-";
  return `${(value / weight).toFixed(unit === "kcal/kg" ? 1 : 2)} ${unit}`;
};

const formatAmount = (value?: number, unit = "") => {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return `${Number(value).toFixed(Number.isInteger(value) ? 0 : 1)}${unit ? ` ${unit}` : ""}`;
};

const getOralScheduleNames = (schedule?: Record<string, unknown>) => {
  if (!schedule) return [];
  const labels: Array<[string, string]> = [
    ["breakfast", "Cafe"],
    ["midMorning", "Lanche manha"],
    ["lunch", "Almoco"],
    ["afternoon", "Lanche tarde"],
    ["dinner", "Jantar"],
    ["supper", "Ceia"],
  ];

  const enabled = labels
    .filter(([key]) => Boolean(schedule[key]))
    .map(([, label]) => label);

  if (typeof schedule.other === "string" && schedule.other.trim()) {
    enabled.push(schedule.other.trim());
  }

  return enabled;
};

const getUnintentionalBreakdown = (patient?: Patient) => {
  const unintentional = patient?.unintentionalCalories;
  const propofol = (unintentional?.propofolMlH || 0) * 1.1 * 24;
  const glucose = (unintentional?.glucoseGDay || 0) * 3.4;
  const citrate = (unintentional?.citrateGDay || 0) * 3;
  return {
    propofol,
    glucose,
    citrate,
    total: propofol + glucose + citrate,
  };
};

const todayLabel = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
}).format(new Date());

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-2 border border-black p-3">
    <h3 className="text-sm font-bold uppercase">{title}</h3>
    <div className="space-y-1">{children}</div>
  </section>
);

const MetricRow = ({ label, value }: { label: string; value: string }) => (
  <p className="text-sm">
    <strong>{label}:</strong> {value}
  </p>
);

const chunkPatients = (patients: Patient[], size: number): Patient[][] => {
  const pages: Patient[][] = [];
  for (let index = 0; index < patients.length; index += size) {
    pages.push(patients.slice(index, index + size));
  }
  return pages;
};

const SectorMapPrint = ({ hospitalName, wardName, patients, prescriptions }: SectorMapPrintProps) => {
  const patientPages = chunkPatients(patients, 8);

  return (
    <div className="hidden print:block bg-white text-black">
      {patientPages.map((pagePatients, pageIndex) => (
        <section
          key={`page-${pageIndex + 1}`}
          className={`space-y-4 bg-white p-4 ${pageIndex < patientPages.length - 1 ? "break-after-page" : ""}`}
        >
          <header className="border-b-2 border-black pb-3">
            <h1 className="text-xl font-bold">Mapa do Nutricionista</h1>
            <p className="text-sm">
              Unidade: {hospitalName || "-"} | Setor: {wardName} | Emissao: {todayLabel} | Pagina {pageIndex + 1}/{patientPages.length || 1}
            </p>
          </header>

          {pagePatients.map((patient) => {
        const patientPrescriptions = getActivePrescriptionsForPatient(prescriptions, patient.id);
        const oralPrescription = patientPrescriptions.find((prescription) => prescription.therapyType === "oral");
        const enteralPrescription = patientPrescriptions.find((prescription) => prescription.therapyType === "enteral");
        const parenteralPrescription = patientPrescriptions.find((prescription) => prescription.therapyType === "parenteral");
        const bmi = calculateBmi(patient);
        const idealWeight = calculateIdealWeight(patient);
        const unint = getUnintentionalBreakdown(patient);

        const totalKcal =
          (oralPrescription?.totalCalories || 0)
          + (enteralPrescription?.totalCalories || 0)
          + (parenteralPrescription?.totalCalories || 0)
          + unint.total;
        const totalProtein =
          (oralPrescription?.totalProtein || 0)
          + (enteralPrescription?.totalProtein || 0)
          + (parenteralPrescription?.totalProtein || 0);
        const totalCarbs =
          (oralPrescription?.totalCarbs || 0)
          + (enteralPrescription?.totalCarbs || 0)
          + (parenteralPrescription?.parenteralDetails?.glucoseG || 0);
        const totalFat =
          (oralPrescription?.totalFat || 0)
          + (enteralPrescription?.totalFat || 0)
          + (parenteralPrescription?.parenteralDetails?.lipidsG || 0);
        const totalFiber =
          (oralPrescription?.totalFiber || 0)
          + (enteralPrescription?.totalFiber || 0);
        const totalFreeWater =
          (oralPrescription?.totalFreeWater || 0)
          + (enteralPrescription?.totalFreeWater || 0);

        const routeLabels = [
          oralPrescription ? "Oral" : null,
          enteralPrescription ? "Enteral" : null,
          parenteralPrescription ? "Parenteral" : null,
          patient.nutritionType === "jejum" ? "Jejum" : null,
        ].filter(Boolean).join(" ; ");

        return (
          <article key={patient.id} className="break-inside-avoid-page space-y-3 border-2 border-black p-4">
            <div className="grid grid-cols-2 gap-3 border-b border-black pb-3 text-sm">
              <div>
                <p><strong>Leito:</strong> {patient.bed || "-"}</p>
                <p><strong>Paciente:</strong> {patient.name}</p>
                <p><strong>Data de nasc.:</strong> {patient.dob || "-"}</p>
                <p><strong>Prontuario:</strong> {patient.record || "-"}</p>
              </div>
              <div>
                <p><strong>Peso atual:</strong> {patient.weight ? `${patient.weight} kg` : "-"}</p>
                <p><strong>Estatura:</strong> {patient.height ? `${patient.height} cm` : "-"}</p>
                <p><strong>IMC:</strong> {bmi ? `${bmi.toFixed(1)} kg/m2` : "-"}</p>
                {idealWeight && <p><strong>Peso ideal:</strong> {idealWeight.toFixed(1)} kg</p>}
              </div>
            </div>

            <p className="text-sm"><strong>Vias de alimentacao:</strong> {routeLabels || "-"}</p>

            <div className="space-y-3">
              {oralPrescription && (
                <Section title="VO">
                  <MetricRow label="Consistencia" value={patient.consistency || oralPrescription.oralDetails?.dietConsistency || "-"} />
                  <MetricRow label="Via de oferta" value={oralPrescription.oralDetails?.administrationRoute === "translactation" ? "Translactacao" : "Via oral"} />
                  {oralPrescription.oralDetails?.deliveryMethod && (
                    <MetricRow
                      label="Forma de oferta"
                      value={
                        oralPrescription.oralDetails.deliveryMethod === "feeding-bottle"
                          ? "Frasco para dieta"
                          : oralPrescription.oralDetails.deliveryMethod === "baby-bottle"
                            ? "Mamadeira"
                            : "Copo"
                      }
                    />
                  )}
                  <MetricRow label="Consistencia segura para agua" value={patient.safeConsistency || oralPrescription.oralDetails?.safeConsistency || "-"} />
                  <MetricRow label="Fracionamento" value={`${patient.mealCount || oralPrescription.oralDetails?.mealsPerDay || "-"} refeicoes`} />
                  <MetricRow label="Fono" value={oralPrescription.oralDetails?.speechTherapy ? "Sim" : "Nao"} />
                  <MetricRow label="Caracteristicas" value={oralPrescription.oralDetails?.dietCharacteristics || oralPrescription.oralDetails?.observations || patient.observation || oralPrescription.notes || "-"} />
                  {oralPrescription.formulas.map((formula) => (
                    <p key={`${oralPrescription.id}-${formula.formulaId}`} className="text-sm">
                      <strong>Suplemento:</strong> {formula.formulaName || formula.formulaId} | {formatAmount(formula.volume, "ml")} | {formatSchedules(formula.schedules)}
                    </p>
                  ))}
                  {oralPrescription.oralDetails?.supplements?.map((supplement) => (
                    <p key={`${oralPrescription.id}-${supplement.supplementId}`} className="text-sm">
                      <strong>Suplemento oral:</strong> {supplement.supplementName} | {formatAmount(supplement.amount, supplement.unit || "ml")} | {getOralScheduleNames(supplement.schedules).join(", ") || "-"}
                    </p>
                  ))}
                  {oralPrescription.modules.map((module) => (
                    <p key={`${oralPrescription.id}-${module.moduleId}`} className="text-sm">
                      <strong>Modulo:</strong> {module.moduleName || module.moduleId} | {formatAmount(module.amount, module.unit || "g")} | {formatSchedules(module.schedules)}
                    </p>
                  ))}
                  {oralPrescription.oralDetails?.modules?.map((module) => (
                    <p key={`${oralPrescription.id}-${module.moduleId}-oral`} className="text-sm">
                      <strong>Modulo oral:</strong> {module.moduleName} | {formatAmount(module.amount, module.unit || "g")} | {getOralScheduleNames(module.schedules).join(", ") || "-"}
                    </p>
                  ))}
                  {oralPrescription.oralDetails?.needsThickener && (
                    <p className="text-sm">
                      <strong>Espessante:</strong> {oralPrescription.oralDetails.thickenerProduct || "-"} | {formatAmount(oralPrescription.oralDetails.thickenerGrams, "g")} + {formatAmount(oralPrescription.oralDetails.thickenerVolume, "ml")} | {formatSchedules(oralPrescription.oralDetails.thickenerTimes)}
                    </p>
                  )}
                  <p className="text-sm">
                    <strong>Resumo VO:</strong> {formatPerKg(oralPrescription.totalCalories, patient.weight, "kcal/kg")} | {formatPerKg(oralPrescription.totalProtein, patient.weight)} | CHO {formatAmount(oralPrescription.totalCarbs, "g")} | Lip {formatAmount(oralPrescription.totalFat, "g")} | Fibra {formatAmount(oralPrescription.totalFiber, "g")}
                  </p>
                </Section>
              )}

              {enteralPrescription && (
                <Section title="NE">
                  <MetricRow label="Sistema" value={enteralPrescription.systemType === "closed" ? "Fechado" : "Aberto"} />
                  <MetricRow label="Acesso" value={enteralPrescription.feedingRoute || enteralPrescription.enteralDetails?.access || "-"} />
                  <MetricRow label="Infusao" value={enteralPrescription.infusionMode || enteralPrescription.enteralDetails?.infusionMode || "-"} />
                  <MetricRow
                    label="Velocidade"
                    value={getPrescriptionRateLabel(enteralPrescription, enteralPrescription.formulas[0]?.volume) || "-"}
                  />
                  <MetricRow label="Volume para equipo" value={formatAmount(enteralPrescription.equipmentVolume, "ml")} />
                  {enteralPrescription.formulas.map((formula) => (
                    <p key={`${enteralPrescription.id}-${formula.formulaId}`} className="text-sm">
                      <strong>Formula:</strong> {formula.formulaName || formula.formulaId} | {formatAmount(formula.volume, "ml")} | {formatSchedules(formula.schedules)}
                    </p>
                  ))}
                  {enteralPrescription.enteralDetails?.closedFormula?.bagQuantities && (
                    <p className="text-sm">
                      <strong>Bolsas por horario:</strong>{" "}
                      {Object.entries(enteralPrescription.enteralDetails.closedFormula.bagQuantities)
                        .map(([time, quantity]) => `${time}: ${quantity}`)
                        .join(" | ")}
                    </p>
                  )}
                  {enteralPrescription.modules.map((module) => (
                    <p key={`${enteralPrescription.id}-${module.moduleId}`} className="text-sm">
                      <strong>Modulo:</strong> {module.moduleName || module.moduleId} | {formatAmount(module.amount, module.unit || "g")} | {formatSchedules(module.schedules)}
                    </p>
                  ))}
                  {enteralPrescription.hydrationVolume && (
                    <p className="text-sm">
                      <strong>Agua de hidratacao:</strong> {formatAmount(enteralPrescription.hydrationVolume, "ml")} | {formatSchedules(enteralPrescription.hydrationSchedules)}
                    </p>
                  )}
                  <p className="text-sm">
                    <strong>Resumo TNE:</strong> {formatPerKg(enteralPrescription.totalCalories, patient.weight, "kcal/kg")} | {formatPerKg(enteralPrescription.totalProtein, patient.weight)} | CHO {formatAmount(enteralPrescription.totalCarbs, "g")} | Lip {formatAmount(enteralPrescription.totalFat, "g")} | Fibra {formatAmount(enteralPrescription.totalFiber, "g")} | Agua livre {formatAmount(enteralPrescription.totalFreeWater, "ml")}
                  </p>
                </Section>
              )}

              {parenteralPrescription && (
                <Section title="NP">
                  <MetricRow label="Acesso" value={parenteralPrescription.parenteralDetails?.access || "-"} />
                  <MetricRow label="Tempo de infusao" value={formatAmount(parenteralPrescription.parenteralDetails?.infusionTime, "h")} />
                  <MetricRow label="Aminoacidos" value={formatAmount(parenteralPrescription.parenteralDetails?.aminoacidsG, "g")} />
                  <MetricRow label="Lipideos" value={formatAmount(parenteralPrescription.parenteralDetails?.lipidsG, "g")} />
                  <MetricRow label="Glicose" value={formatAmount(parenteralPrescription.parenteralDetails?.glucoseG, "g")} />
                  <MetricRow label="TIG" value={formatAmount(parenteralPrescription.parenteralDetails?.tigMgKgMin, "mg/kg/min")} />
                  <MetricRow label="Observacoes" value={parenteralPrescription.parenteralDetails?.observations || parenteralPrescription.notes || "-"} />
                  <p className="text-sm">
                    <strong>Resumo TNP:</strong> {formatPerKg(parenteralPrescription.totalCalories, patient.weight, "kcal/kg")} | {formatPerKg(parenteralPrescription.totalProtein, patient.weight)} | VET {formatAmount(parenteralPrescription.parenteralDetails?.vetKcal || parenteralPrescription.totalCalories, "kcal")}
                  </p>
                </Section>
              )}

              {unint.total > 0 && (
                <Section title="Calorias Nao Intencionais">
                  <MetricRow label="Propofol" value={formatAmount(unint.propofol, "kcal/24h")} />
                  <MetricRow label="Glicose" value={formatAmount(unint.glucose, "kcal/24h")} />
                  <MetricRow label="Citrato" value={formatAmount(unint.citrate, "kcal/24h")} />
                  <MetricRow label="Total" value={formatAmount(unint.total, "kcal/24h")} />
                </Section>
              )}

              {(patient.monitoringNotes || patient.observation) && (
                <Section title="Observacoes">
                  <p className="text-sm">{patient.monitoringNotes || patient.observation}</p>
                </Section>
              )}

              <Section title="Total das Vias">
                <MetricRow label="VET total" value={patient.weight ? `${(totalKcal / patient.weight).toFixed(1)} kcal/kg` : `${totalKcal.toFixed(0)} kcal`} />
                <MetricRow label="Proteinas totais" value={patient.weight ? `${(totalProtein / patient.weight).toFixed(2)} g/kg` : `${totalProtein.toFixed(1)} g`} />
                <MetricRow label="Carboidratos totais" value={formatAmount(totalCarbs, "g")} />
                <MetricRow label="Lipideos totais" value={formatAmount(totalFat, "g")} />
                <MetricRow label="Fibras totais" value={formatAmount(totalFiber, "g")} />
                <MetricRow label="Agua livre total" value={formatAmount(totalFreeWater, "ml")} />
              </Section>
            </div>
          </article>
        );
      })}
        </section>
      ))}
    </div>
  );
};

export default SectorMapPrint;
