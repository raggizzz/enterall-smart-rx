import type { Patient, Prescription } from "@/lib/database";
import { getPrescriptionRateLabel } from "@/lib/prescriptionInfusion";

interface SectorMapPrintProps {
  hospitalName?: string;
  wardName: string;
  patients: Patient[];
  prescriptions: Prescription[];
}

const todayLabel = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date());

const sortByMostRecentStartDate = (left: Prescription, right: Prescription): number =>
  right.startDate.localeCompare(left.startDate);

const getActivePrescriptionsForPatient = (prescriptionList: Prescription[], patientId?: string) =>
  prescriptionList
    .filter((prescription) => prescription.patientId === patientId && prescription.status === "active")
    .sort(sortByMostRecentStartDate);

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

const formatNumber = (value?: number | string, digits = 2) => {
  if (value === undefined || value === null || value === "" || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
};

const formatKcalPerKg = (value?: number, weight?: number, digits = 2) => {
  if (!value || !weight) return "-";
  return `${formatNumber(value / weight, digits)} kcal/kg`;
};

const formatGPerKg = (value?: number, weight?: number, digits = 2) => {
  if (!value || !weight) return "-";
  return `${formatNumber(value / weight, digits)} g/kg`;
};

const formatMgKgMin = (value?: number) => {
  if (!value) return "-";
  return `${formatNumber(value, 2)} mg/kg/min`;
};

const formatSchedules = (schedules?: string[]) => {
  if (!schedules || schedules.length === 0) return "-";
  return `${schedules.length}x/dia ${schedules.join(" ")}`;
};

const getOralScheduleNames = (schedule?: Record<string, unknown>) => {
  if (!schedule) return [];

  const labels: Array<[string, string]> = [
    ["breakfast", "desjejum"],
    ["midMorning", "colacao"],
    ["lunch", "almoco"],
    ["afternoon", "merenda"],
    ["dinner", "jantar"],
    ["supper", "ceia"],
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
  const source = patient?.unintentionalCalories;
  const propofol = (source?.propofolMlH || 0) * 1.1 * 24;
  const glucose = (source?.glucoseGDay || 0) * 3.4;
  const citrate = (source?.citrateGDay || 0) * 3;
  return {
    propofol,
    glucose,
    citrate,
    total: propofol + glucose + citrate,
  };
};

const joinNonEmpty = (items: Array<string | undefined | null>, separator = "   ") =>
  items.filter((item) => Boolean(item && String(item).trim())).join(separator);

const bold = (label: string, value: string) => `${label}${value}`;

const chunkPatients = (items: Patient[], size: number): Patient[][] => {
  const pages: Patient[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
};

const buildObservationLines = (
  patient: Patient,
  oralPrescription?: Prescription,
  enteralPrescription?: Prescription,
  parenteralPrescription?: Prescription,
) => {
  const lines: string[] = [];

  const pushLine = (text?: string, date?: string) => {
    if (!text || !text.trim()) return;
    lines.push(date ? `${date}: ${text.trim()}` : text.trim());
  };

  pushLine(patient.monitoringNotes);
  pushLine(patient.observation);
  pushLine(oralPrescription?.oralDetails?.observations, oralPrescription?.startDate);
  pushLine(enteralPrescription?.notes, enteralPrescription?.startDate);
  pushLine(parenteralPrescription?.parenteralDetails?.observations || parenteralPrescription?.notes, parenteralPrescription?.startDate);

  return lines.slice(0, 4);
};

const buildProteinTotalLabel = (protein?: number, weight?: number, idealWeight?: number | null) => {
  if (!protein || !weight) return "-";
  const actual = `${formatNumber(protein / weight, 2)} g/kg`;
  if (!idealWeight) return actual;
  return `${actual} PA   ${formatNumber(protein / idealWeight, 2)} g/kgPI`;
};

const PatientBlock = ({ patient, prescriptions }: { patient: Patient; prescriptions: Prescription[] }) => {
  const patientPrescriptions = getActivePrescriptionsForPatient(prescriptions, patient.id);
  const oralPrescription = patientPrescriptions.find((prescription) => prescription.therapyType === "oral");
  const enteralPrescription = patientPrescriptions.find((prescription) => prescription.therapyType === "enteral");
  const parenteralPrescription = patientPrescriptions.find((prescription) => prescription.therapyType === "parenteral");
  const bmi = calculateBmi(patient);
  const idealWeight = calculateIdealWeight(patient);
  const routeSummary = [
    oralPrescription ? "Oral" : null,
    enteralPrescription ? "Enteral" : null,
    parenteralPrescription ? "Parenteral" : null,
  ].filter(Boolean).join("; ");
  const observations = buildObservationLines(patient, oralPrescription, enteralPrescription, parenteralPrescription);
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

  const leftRows: string[] = [];

  if (oralPrescription) {
    leftRows.push(joinNonEmpty([
      bold("Oral: ", patient.consistency || oralPrescription.oralDetails?.dietConsistency || "-"),
      bold("Fracionamento: ", `${patient.mealCount || oralPrescription.oralDetails?.mealsPerDay || "-"} refeições`),
      bold("Fono: ", oralPrescription.oralDetails?.speechTherapy ? "Sim" : "Não"),
      bold("Consistência segura: ", patient.safeConsistency || oralPrescription.oralDetails?.safeConsistency || "-"),
    ]));

    leftRows.push(bold(
      "Características: ",
      oralPrescription.oralDetails?.dietCharacteristics || patient.observation || oralPrescription.notes || "-",
    ));

    if ((oralPrescription.oralDetails?.supplements || []).length > 0) {
      leftRows.push(bold(
        "TNVO: ",
        oralPrescription.oralDetails!.supplements!.map((supplement) =>
          `${supplement.supplementName}: ${formatNumber(supplement.amount)}${supplement.unit || "ml"} ${getOralScheduleNames(supplement.schedules).join(" / ") || "-"}`
        ).join("   "),
      ));
    }

    if ((oralPrescription.oralDetails?.modules || []).length > 0) {
      leftRows.push(bold(
        "Módulo VO: ",
        oralPrescription.oralDetails!.modules!.map((module) =>
          `${module.moduleName} ${formatNumber(module.amount)}${module.unit || "g"} ${getOralScheduleNames(module.schedules).join(" - ") || "-"}`
        ).join("   "),
      ));
    }

    leftRows.push(joinNonEmpty([
      bold("VET (VO): ", formatKcalPerKg(oralPrescription.totalCalories, patient.weight)),
      bold("Ptn: ", formatGPerKg(oralPrescription.totalProtein, patient.weight)),
    ]));
  }

  if (enteralPrescription) {
    leftRows.push(joinNonEmpty([
      bold("TNE: ", `Sistema ${enteralPrescription.systemType === "closed" ? "fechado" : "aberto"}`),
      bold("Acesso: ", enteralPrescription.feedingRoute || enteralPrescription.enteralDetails?.access || "-"),
      bold("Infusão: ", enteralPrescription.infusionMode === "pump" ? "Bomba de infusão" : enteralPrescription.infusionMode === "gravity" ? "Gravitacional" : enteralPrescription.infusionMode || "-"),
    ]));

    if (enteralPrescription.formulas.length > 0) {
      leftRows.push(bold(
        "Fórmula(s): ",
        enteralPrescription.formulas.map((formula) =>
          `${formula.formulaName} ${formatNumber(formula.volume)}ml - ${formatSchedules(formula.schedules)} ${getPrescriptionRateLabel(enteralPrescription, formula.volume) || ""}`.trim()
        ).join("   "),
      ));
    }

    if (enteralPrescription.modules.length > 0) {
      leftRows.push(bold(
        "Módulos: ",
        enteralPrescription.modules.map((module) =>
          `${module.moduleName} ${formatNumber(module.amount)}${module.unit || "g"} - ${formatSchedules(module.schedules)}`
        ).join("   "),
      ));
    }

    if (enteralPrescription.hydrationVolume || enteralPrescription.totalFreeWater) {
      leftRows.push(joinNonEmpty([
        bold("Água para hidratação: ", `${formatNumber(enteralPrescription.hydrationVolume)}ml ; ${enteralPrescription.hydrationSchedules?.length || 0}x/dia`),
        bold("Água livre total: ", `${formatNumber(enteralPrescription.totalFreeWater)} ml`),
      ]));
    }

    leftRows.push(joinNonEmpty([
      bold("VET TNE: ", formatKcalPerKg(enteralPrescription.totalCalories, patient.weight)),
      bold("Proteínas: ", formatGPerKg(enteralPrescription.totalProtein, patient.weight)),
      bold("Carboidratos: ", formatGPerKg(enteralPrescription.totalCarbs, patient.weight)),
      bold("Lipídeos: ", formatGPerKg(enteralPrescription.totalFat, patient.weight)),
    ]));
  }

  if (parenteralPrescription) {
    leftRows.push(joinNonEmpty([
      bold("TNP: ", formatKcalPerKg(parenteralPrescription.totalCalories, patient.weight)),
      bold("Aminoácidos: ", formatGPerKg(parenteralPrescription.parenteralDetails?.aminoacidsG, patient.weight)),
      bold("Glicose: ", formatGPerKg(parenteralPrescription.parenteralDetails?.glucoseG, patient.weight)),
      bold("TIG: ", formatMgKgMin(parenteralPrescription.parenteralDetails?.tigMgKgMin)),
      bold("Lipídeos: ", formatGPerKg(parenteralPrescription.parenteralDetails?.lipidsG, patient.weight)),
    ]));
  }

  if (unint.total > 0) {
    leftRows.push(bold("kcal não intenc: ", `Propofol - ${formatNumber(unint.propofol, 0)} kcal`));
  }

  if (totalKcal > 0 || totalProtein > 0) {
    leftRows.push(joinNonEmpty([
      bold("VET (todas as vias): ", formatKcalPerKg(totalKcal, patient.weight)),
      bold("Proteínas: ", buildProteinTotalLabel(totalProtein, patient.weight, idealWeight)),
    ]));
  }

  const totalRows = Math.max(leftRows.length, Math.max(2, observations.length + 1));

  return (
    <table className="w-full border-collapse text-[10px] leading-[1.15]">
      <colgroup>
        <col style={{ width: "66%" }} />
        <col style={{ width: "24%" }} />
        <col style={{ width: "10%" }} />
      </colgroup>
      <tbody>
        <tr>
          <td className="border border-black p-0 align-top">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="font-bold">
                  <td className="border-r border-black px-1 py-[2px]">Leito:{patient.bed || "-"}</td>
                  <td className="border-r border-black px-1 py-[2px]">Paciente: {patient.name}</td>
                  <td className="border-r border-black px-1 py-[2px]">Data de nasc: {patient.dob || "-"}</td>
                  <td className="px-1 py-[2px]">Vias de alimentação: {routeSummary || "-"}</td>
                </tr>
              </tbody>
            </table>
          </td>
          <td className="border border-black px-1 py-[2px] text-right font-bold align-top">
            Peso atual: {patient.weight ? `${formatNumber(patient.weight)} kg` : "-"}{" "}
            {bmi ? ` IMC: ${formatNumber(bmi, 2)} kg/m2` : ""}{" "}
            {idealWeight ? ` P ideal: ${formatNumber(idealWeight, 0)}kg` : ""}
          </td>
          <td rowSpan={totalRows + 1} className="border border-black px-2 py-2 align-top text-[11px] font-bold text-sky-700">
            <p>{bmi && bmi >= 30 ? "Paciente IMC >= 30" : "Paciente IM<30"}</p>
            <p className="mt-3">
              Paciente com {[
                oralPrescription ? "VO" : null,
                enteralPrescription ? "NE" : null,
                parenteralPrescription ? "NP" : null,
              ].filter(Boolean).join(" e ")}
            </p>
          </td>
        </tr>

        {Array.from({ length: totalRows }).map((_, index) => (
          <tr key={`${patient.id}-row-${index}`}>
            <td className="border border-black px-1 py-[2px] align-top">
              {leftRows[index] || ""}
            </td>
            <td className="border border-black px-1 py-[2px] align-top">
              {index === 0 ? (
                <strong>Observações:</strong>
              ) : (
                observations[index - 1] || ""
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const SectorMapPrint = ({ hospitalName, wardName, patients, prescriptions }: SectorMapPrintProps) => {
  const patientPages = chunkPatients(patients, 8);

  return (
    <div className="hidden print:block bg-white text-black">
      {patientPages.map((pagePatients, pageIndex) => (
        <section
          key={`page-${pageIndex + 1}`}
          className={`bg-white px-1 py-1 ${pageIndex < patientPages.length - 1 ? "break-after-page" : ""}`}
        >
          <table className="w-full border-collapse text-[12px]">
            <colgroup>
              <col style={{ width: "13%" }} />
              <col style={{ width: "39%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "28%" }} />
            </colgroup>
            <tbody>
              <tr className="font-bold">
                <td className="border border-black px-1 py-[2px]">Mapa de Pacientes</td>
                <td className="border border-black px-1 py-[2px]">Unidade : {hospitalName || "-"}</td>
                <td className="border border-black px-1 py-[2px]">Ala: {wardName}</td>
                <td className="border border-black px-1 py-[2px]">Data:{todayLabel}</td>
              </tr>
            </tbody>
          </table>

          <div className="space-y-[6px] pt-[4px]">
            {pagePatients.map((patient) => (
              <PatientBlock
                key={patient.id}
                patient={patient}
                prescriptions={prescriptions}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default SectorMapPrint;
