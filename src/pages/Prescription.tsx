// Prescription.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calculator, Save, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import ScheduleSelector from "@/components/ScheduleSelector";
import { calcInfusionRate, calcTotals } from "@/lib/nutrition"; // assume existe
import { supabase } from "@/lib/supabase"; // opcional




/* ===========================
   Tipagens
   =========================== */

interface FormulaEntry {
  id: string;
  formulaId: string;
  volume: string; // volume por administração (mL)
  hours: string[]; // horários selecionados
  diluteUntilMl?: string; // "Diluir até" por fórmula (ml)

}

type ModuleType =
  | "moduliprotein"
  | "modulipulver"
  | "resource_protein"
  | "benfiber"
  | "maltodextrina"
  | "tcm"
  | "glutamin"
  | "proteina_isolada"
  | "cal_300"
  | "cal_400";

interface ModuleEntry {
  id: string;
  type: ModuleType | "";
  amount: string; // quantidade por administração
  hours: string[]; // horários
}

interface Patient {
  id?: string;
  name?: string;
  record?: string;
  weight?: number;
  height?: number;
  age?: number;
  sex?: string;
  diagnosis?: string;
  allergies?: string;
  [k: string]: any;
}

interface PrescriptionState {
  routeSelections: { oral: boolean; enteral: boolean; parenteral: boolean };
  clinic: string;
  infusionMode: string;
  system: "" | "aberto" | "fechado";
  infusionTime: string;
  diluteGlobal: boolean;
  diluteGlobalVolume: string;
  intercalar: "nao" | "sim";
  notes: string;

  enteralAccess: string;

  oralSupplementIds: string[];
  oralVolumeDay?: string;
  oralConsistency?: string;

  parenteralType?: string;
  parenteralCatheter?: string;
  parenteralOsmolarity?: string;
  parenteralVolume?: string;
  parenteralHydration?: string;

  waterVolume?: string;
  waterHours: string[];

  formulas: FormulaEntry[];
  modules: ModuleEntry[];
}

import { getAllFormulas } from "@/lib/formulasDatabase";

/* ===========================
   Dados estáticos (exemplo)
   =========================== */
const ALL_FORMULAS = getAllFormulas().map(f => ({
  id: f.id,
  name: f.name,
  calories: (f.composition.density || f.composition.calories / 100),
  protein: f.composition.protein,
  type: f.systemType === "closed" ? "fechado" : "aberto" as string,
}));

const MODULE_OPTIONS: { value: ModuleType; label: string; unit: "g" | "kcal" }[] = [
  { value: "moduliprotein", label: "Moduliprotein", unit: "g" },
  { value: "modulipulver", label: "Modulipulver", unit: "g" },
  { value: "resource_protein", label: "Resource Protein", unit: "g" },
  { value: "benfiber", label: "Benfiber", unit: "g" },
  { value: "maltodextrina", label: "Maltodextrina", unit: "g" },
  { value: "tcm", label: "TCM", unit: "g" },
  { value: "glutamin", label: "Glutamin", unit: "g" },
  { value: "proteina_isolada", label: "Proteína isolada (pó)", unit: "g" },
  { value: "cal_300", label: "Calórico 300 kcal", unit: "kcal" },
  { value: "cal_400", label: "Calórico 400 kcal", unit: "kcal" },
];

/* ===========================
   Componente
   =========================== */
export default function Prescription() {
  const navigate = useNavigate();
  const warnedFormulaConflictsRef = useRef(false);

  const [patient, setPatient] = useState<Patient>({});
  const [loadingPatient, setLoadingPatient] = useState(false);

  const [prescription, setPrescription] = useState<PrescriptionState>({
    routeSelections: { oral: false, enteral: false, parenteral: false },
    clinic: "",
    infusionMode: "",
    system: "",
    infusionTime: "",
    diluteGlobal: false,
    diluteGlobalVolume: "",
    intercalar: "nao",
    notes: "",
    enteralAccess: "",
    oralSupplementIds: [],
    oralVolumeDay: "",
    oralConsistency: "",
    parenteralType: "",
    parenteralCatheter: "",
    parenteralOsmolarity: "",
    parenteralVolume: "",
    parenteralHydration: "",
    waterVolume: "",
    waterHours: [],
    formulas: [{ id: Date.now().toString(), formulaId: "", volume: "", hours: [], diluteUntilMl: "" }],
    modules: [],
  });

  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const systemTriggerRef = useRef<HTMLDivElement | null>(null);

  const [calculations, setCalculations] = useState<{
    totalCalories: number;
    totalProtein: number;
    totalVolume: number;
    infusionRate: number;
    infusionRateLabel: "ml/h" | "gotas/min" | "";
  }>({
    totalCalories: 0,
    totalProtein: 0,
    totalVolume: 0,
    infusionRate: 0,
    infusionRateLabel: "",
  });


  const availableFormulas = prescription.system
    ? ALL_FORMULAS.filter((f) => f.type === prescription.system)
    : [];

  /* -------------------------
     Carregar paciente (tolerante: supabase -> api -> localStorage)
     ------------------------- */
  useEffect(() => {
    async function loadPatient() {
      setLoadingPatient(true);
      try {
        const stored = localStorage.getItem("patient");
        const patientId = localStorage.getItem("patientId") || "";

        if (stored) {
          setPatient(JSON.parse(stored));
          setLoadingPatient(false);
          return;
        }

        if (patientId && supabase) {
          const { data, error } = await supabase.from("patients").select("*").eq("id", patientId).single();
          if (!error && data) {
            setPatient(data);
            localStorage.setItem("patient", JSON.stringify(data));
            setLoadingPatient(false);
            return;
          }
        }

        if (patientId) {
          try {
            const res = await fetch(`/api/patients/${patientId}`);
            if (res.ok) {
              const json = await res.json();
              setPatient(json);
              localStorage.setItem("patient", JSON.stringify(json));
              setLoadingPatient(false);
              return;
            }
          } catch {
            // ignore
          }
        }

        setPatient({});
      } catch (err) {
        console.error("Erro carregando paciente:", err);
        setPatient({});
      } finally {
        setLoadingPatient(false);
      }
    }

    loadPatient();
  }, []);

  /* -------------------------
     Helpers
     ------------------------- */
  function setField<K extends keyof PrescriptionState>(field: K, value: PrescriptionState[K]) {
    setPrescription((p) => ({ ...p, [field]: value }));
  }

  function toggleRoute(route: "oral" | "enteral" | "parenteral") {
    setPrescription((p) => ({ ...p, routeSelections: { ...p.routeSelections, [route]: !p.routeSelections[route] } }));
  }
  useEffect(() => {
    if (!prescription.routeSelections.enteral) {
      setPrescription((p) => ({
        ...p,
        enteralAccess: "",
      }));
    }
  }, [prescription.routeSelections.enteral]);
  function addFormulaEntry() {
    if (prescription.system === "fechado") return;
    setPrescription((p) => ({ ...p, formulas: [...p.formulas, { id: Date.now().toString(), formulaId: "", volume: "", hours: [], diluteUntilMl: "" }] }));
  }

  function removeFormulaEntry(id: string) {
    setPrescription((p) => ({ ...p, formulas: p.formulas.filter((f) => f.id !== id) }));
  }

  function updateFormulaEntry(id: string, patch: Partial<FormulaEntry>) {
    setPrescription((p) => ({ ...p, formulas: p.formulas.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
  }

  function addModule() {
    setPrescription((p) => ({ ...p, modules: [...p.modules, { id: Date.now().toString(), type: "", amount: "", hours: [] }] }));
  }

  function removeModule(id: string) {
    setPrescription((p) => ({ ...p, modules: p.modules.filter((m) => m.id !== id) }));
  }

  function updateModule(id: string, patch: Partial<ModuleEntry>) {
    setPrescription((p) => ({ ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  }

  /* -------------------------
     limpar formulaId incompatíveis quando trocar system
     ------------------------- */
  useEffect(() => {
    if (!prescription.system) {
      setPrescription((p) => ({ ...p, formulas: p.formulas.map((f) => ({ ...f, formulaId: "" })) }));
      return;
    }
    setPrescription((p) => ({
      ...p,
      formulas: p.formulas.map((f) => (f.formulaId && !availableFormulas.some((af) => af.id === f.formulaId) ? { ...f, formulaId: "" } : f)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescription.system]);

  /* -------------------------
     Cálculos (enteral): fórmulas + módulos + água
     Regras:
       - totalVolumeFormula = volumePorAdm (ou diluteUntil ml se aberto) * nHorarios
       - água é volume total/dia (não multiplicar)
       - módulos: amount * nHorarios
     ------------------------- */
  useEffect(() => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalVolume = 0;

    // fórmulas
    for (const f of prescription.formulas) {
      const horarioCount = Math.max(1, (f.hours || []).length);
      const dietaPorEtapa = Number(f.volume || 0);
      const diluicaoPorEtapa = Number(f.diluteUntilMl || 0);

      // volume da DIETA (entra em kcal/proteína)
      const volumeDietaTotal = dietaPorEtapa * horarioCount;
      totalVolume += volumeDietaTotal;

      // água livre da diluição (SÓ sistema aberto)
      if (
        prescription.system === "aberto" &&
        diluicaoPorEtapa > dietaPorEtapa
      ) {
        const aguaLivreTotal =
          (diluicaoPorEtapa - dietaPorEtapa) * horarioCount;
        totalVolume += aguaLivreTotal;
      }


      if (f.formulaId) {
        const fo = ALL_FORMULAS.find((a) => a.id === f.formulaId);
        if (fo) {
          try {
            const totals = calcTotals(fo, volumeDietaTotal);

            if (totals && typeof totals.totalCalories !== "undefined") {
              totalCalories += Number(totals.totalCalories || 0);
            } else {
              totalCalories += (fo.calories || 0) * volumeDietaTotal;
            }
            if (totals && typeof totals.totalProtein !== "undefined") {
              totalProtein += Number(totals.totalProtein || 0);
            } else {
              totalProtein += ((fo.protein || 0) * volumeDietaTotal) / 100;
            }
          } catch {
            totalCalories += (fo.calories || 0) * volumeDietaTotal;
            totalProtein += ((fo.protein || 0) * volumeDietaTotal) / 100;
          }
        }
      }
    }

    // água (volume total do dia; não multiplicar)
    const waterVol = Number(prescription.waterVolume || 0);
    totalVolume += waterVol;

    // módulos
    for (const m of prescription.modules) {
      const horarioCount = Math.max(1, (m.hours || []).length);
      const amount = Number(m.amount || 0);
      if (!m.type || !amount) continue;

      const subtotal = amount * horarioCount;

      switch (m.type) {
        case "moduliprotein":
        case "modulipulver":
        case "resource_protein":
        case "proteina_isolada":
          totalProtein += subtotal;
          break;
        case "benfiber":
          // fibra — não soma kcal/protein
          break;
        case "maltodextrina":
          totalCalories += 4 * subtotal;
          break;
        case "tcm":
          totalCalories += 8.3 * subtotal;
          break;
        case "glutamin":
          totalCalories += 4 * subtotal;
          break;
        case "cal_300":
          totalCalories += 300 * horarioCount;
          break;
        case "cal_400":
          totalCalories += 400 * horarioCount;
          break;
        default:
          break;
      }
    }

    let infusionRate = 0;
    let infusionRateLabel: "ml/h" | "gotas/min" | "" = "";

    if (
      prescription.infusionMode !== "bolus" &&
      Number(prescription.infusionTime) > 0
    ) {
      const hours = Number(prescription.infusionTime);

      if (prescription.infusionMode === "bomba") {
        infusionRate = totalVolume / hours;
        infusionRateLabel = "ml/h";
      }

      if (prescription.infusionMode === "grav") {
        // 1 ml = 20 gotas
        infusionRate = (totalVolume * 20) / (hours * 60);
        infusionRateLabel = "gotas/min";
      }
    }


    setCalculations({
      totalCalories: Math.round(totalCalories * 100) / 100,
      totalProtein: Math.round(totalProtein * 100) / 100,
      infusionRate: Math.round(infusionRate * 100) / 100,
      infusionRateLabel,
      totalVolume: Math.round(totalVolume * 100) / 100,
    });

  }, [prescription.formulas, prescription.modules, prescription.waterVolume, prescription.infusionTime, prescription.system]);

  /* -------------------------
     Horários conflitando -> aviso
     ------------------------- */
  useEffect(() => {
    const hourCount: Record<string, number> = {};

    // SOMENTE FÓRMULAS
    for (const f of prescription.formulas) {
      for (const h of f.hours || []) {
        hourCount[h] = (hourCount[h] || 0) + 1;
      }
    }

    const conflicts = Object.entries(hourCount)
      .filter(([, count]) => count > 1)
      .map(([hour]) => hour);

    if (conflicts.length > 0 && !warnedFormulaConflictsRef.current) {
      toast.warning(
        `Atenção: mais de uma fórmula programada no mesmo horário: ${conflicts.join(", ")}`
      );
      warnedFormulaConflictsRef.current = true;
    }

    if (conflicts.length === 0) {
      warnedFormulaConflictsRef.current = false;
    }
  }, [
    prescription.formulas.map((f) => (f.hours || []).join(",")).join("|"),
  ]);

  /* -------------------------
     Salvar prescrição (monta payload)
     ------------------------- */
  async function handleSave() {
    const payload = {
      patient: patient || {},
      clinic: prescription.clinic,
      system: prescription.system,
      infusionTime: prescription.infusionTime,
      oral: prescription.routeSelections.oral ? {
        supplements: prescription.oralSupplementIds,
        volumeDay: prescription.oralVolumeDay,
        consistency: prescription.oralConsistency,
      } : "indeferido",
      enteral: prescription.routeSelections.enteral ? {
        access: prescription.enteralAccess,
        formulas: prescription.formulas,
        modules: prescription.modules,
        waterVolume: prescription.waterVolume,
        waterHours: prescription.waterHours,
      } : "indeferido",
      parenteral: prescription.routeSelections.parenteral ? {
        type: prescription.parenteralType,
        catheter: prescription.parenteralCatheter,
        osmolarity: prescription.parenteralOsmolarity,
        volume: prescription.parenteralVolume,
        hydration: prescription.parenteralHydration,
      } : "indeferido",
      calculations,
      notes: prescription.notes,
      createdAt: new Date().toISOString(),
    };

    try {
      // exemplo: salvar no supabase (descomente / ajuste se quiser)
      // const { data, error } = await supabase.from('prescriptions').insert([payload]);
      // if (error) throw error;

      toast.success("Prescrição salva!");
      console.log("Payload prescrição:", payload);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar prescrição");
    }
  }

  function handleClose() {
    navigate(-1);
  }

  /* ===========================
     RENDER
     =========================== */
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center py-8 px-4 bg-black/30">
      <div className="w-full max-w-6xl h-[90vh] overflow-auto bg-background rounded-lg shadow-lg p-6">
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleClose}><ArrowLeft /></Button>
            <div>
              <h1 className="text-2xl font-bold">Nova Prescrição Nutricional</h1>
              <p className="text-sm text-muted-foreground">Preencha os dados da prescrição</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => window.print()}>Imprimir</Button>
            <Button onClick={handleSave}><Save className="mr-2" /> Salvar</Button>
          </div>
        </div>

        {/* grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dados do paciente */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Paciente</CardTitle>
              <CardDescription>Dados carregados do Supabase/API/localStorage</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div>
                <Label>Nome</Label>
                <p className="font-medium">{patient.name ?? "—"}</p>
              </div>

              <div>
                <Label>Prontuário</Label>
                <p className="font-medium">{patient.record ?? "—"}</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Peso (kg)</Label>
                  <p className="font-medium">{patient.weight ?? "—"}</p>
                </div>
                <div>
                  <Label>Altura (cm)</Label>
                  <p className="font-medium">{patient.height ?? "—"}</p>
                </div>
              </div>

              <div>
                <Label>IMC</Label>
                <p className="font-semibold">
                  {patient.weight && patient.height ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1) : "—"}
                </p>
              </div>

              <Separator />

              <div>
                <Label>Idade</Label>
                <p className="font-medium">{patient.age ?? "—"}</p>
              </div>

              <div>
                <Label>Sexo</Label>
                <p className="font-medium">{patient.sex ?? "—"}</p>
              </div>

              <Separator />

              <div>
                <Label>Clínica / Unidade</Label>
                <Select value={prescription.clinic ?? ""} onValueChange={(v) => setField("clinic", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a clínica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinica_a">Clínica A</SelectItem>
                    <SelectItem value="clinica_b">Clínica B</SelectItem>
                    <SelectItem value="clinica_c">Clínica C</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Diagnóstico</Label>
                <p className="font-medium">{patient.diagnosis ?? "—"}</p>
              </div>

              <div>
                <Label>Alergias</Label>
                <p className="font-medium">{patient.allergies ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Prescrição */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Dados da Prescrição</CardTitle>
              <CardDescription>Active as vias clicando nos cards abaixo</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Cards toggle */}
              <div className="flex gap-3">
                {(["oral", "enteral", "parenteral"] as const).map((r) => {
                  const active = prescription.routeSelections[r];
                  return (
                    <button
                      key={r}
                      onClick={() => toggleRoute(r)}
                      className={`flex-1 border rounded p-3 text-left transition ${active ? "bg-primary/10 border-primary" : "bg-white/80"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="capitalize font-semibold">{r}</div>
                        <div className="text-sm">{active ? "Ativado" : "Desativado"}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Clique para {active ? "desativar" : "ativar"}</div>
                    </button>
                  );
                })}
              </div>
              {prescription.routeSelections.oral && (
                <Card className="bg-card">
                  <CardHeader>
                    <CardTitle>Terapia Oral</CardTitle>
                    <CardDescription>Preencha os dados da via oral</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Suplementos (IDs)</Label>
                        <Input
                          placeholder="IDs de suplementos (comma separated)"
                          value={prescription.oralSupplementIds.join(",")}
                          onChange={(e) => setField("oralSupplementIds", e.target.value.split(",").map((s) => s.trim()))}
                        />
                      </div>

                      <div>
                        <Label>Volume/dia (mL)</Label>
                        <Input type="number" value={prescription.oralVolumeDay ?? ""} onChange={(e) => setField("oralVolumeDay", e.target.value)} />
                      </div>

                      <div>
                        <Label>Consistência</Label>
                        <Select value={prescription.oralConsistency ?? ""} onValueChange={(v) => setField("oralConsistency", v)}>
                          <SelectTrigger><SelectValue placeholder="Consistência" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="liquida">Líquida</SelectItem>
                            <SelectItem value="pastosa">Pastosa</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Observações (oral)</Label>
                      <Textarea rows={3} value={prescription.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ENTERAL */}
              {prescription.routeSelections.enteral && (
                <Card className="bg-card">
                  <CardHeader>
                    <CardTitle>Terapia Nutricional Enteral</CardTitle>
                    <CardDescription>Preencha sistema, fórmulas, módulos e hidratação</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <Label>Acesso Enteral</Label>
                      <Select
                        value={prescription.enteralAccess ?? ""}
                        onValueChange={(v) => setField("enteralAccess", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o acesso enteral" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SOE">Sonda Oroenteral (SOE)</SelectItem>
                          <SelectItem value="SNE">Sonda Nasoenteral (SNE)</SelectItem>
                          <SelectItem value="SNG">Sonda Nasogástrica (SNG)</SelectItem>
                          <SelectItem value="GTT">Gastrostomia (GTT / PEG)</SelectItem>
                          <SelectItem value="JTT">Jejunostomia (JTT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />
                    <div className="relative">
                      <Label>Sistema</Label>
                      <div className="mt-2">
                        <button onClick={() => setSystemMenuOpen((s) => !s)} className="w-full border rounded px-3 py-2 text-left">
                          <div className="flex justify-between items-center">
                            <span>{prescription.system ? (prescription.system === "aberto" ? "Sistema: Aberto" : "Sistema: Fechado") : "Sistema"}</span>
                            <span className="text-sm opacity-60">{systemMenuOpen ? "▲" : "▼"}</span>
                          </div>
                        </button>
                      </div>
                      {systemMenuOpen && (
                        <div className="absolute z-20 mt-2 w-full bg-white border rounded shadow">
                          <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setField("system", "aberto"); setSystemMenuOpen(false); }}>Sistema Aberto</button>
                          <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setField("system", "fechado"); setSystemMenuOpen(false); }}>Sistema Fechado</button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Modo de infusão</Label>
                        <Select value={prescription.infusionMode ?? ""} onValueChange={(v) => setField("infusionMode", v)}>
                          <SelectTrigger><SelectValue placeholder="Modo de infusão" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bomba">Bomba de Infusão</SelectItem>
                            <SelectItem value="grav">Gravitacional</SelectItem>
                            {prescription.system === "aberto" && (
                              <SelectItem value="bolus">Bolus</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>



                      <div>
                        <Label>Tempo de infusão (horas)</Label>
                        <Input
                          type="number"
                          disabled={prescription.infusionMode === "bolus"}
                          placeholder={prescription.infusionMode === "bolus" ? "Não se aplica ao bolus" : ""}
                          value={prescription.infusionTime ?? ""}
                          onChange={(e) => setField("infusionTime", e.target.value)}
                        />

                      </div>
                      {prescription.infusionMode === "bolus" && (
                        <p className="text-sm text-muted-foreground">
                          Administração em bolus: não há velocidade de infusão.
                        </p>
                      )}

                    </div>

                    {/* Fórmulas */}
                    <div>
                      <Label>Fórmulas</Label>
                      <p className="text-sm text-muted-foreground mb-2">Escolha o sistema primeiro para liberar fórmulas compatíveis. Subtotal mostra apenas o total por fórmula (multiplicado por horários).</p>

                      <div className="space-y-3">
                        {prescription.formulas.map((entry, idx) => {
                          const selectedFormula = ALL_FORMULAS.find((f) => f.id === entry.formulaId);
                          const horarioCount = Math.max(1, (entry.hours || []).length);
                          const dietaPorEtapa = Number(entry.volume || 0);
                          const volumeDietaTotal = dietaPorEtapa * horarioCount;
                          const all = calcTotals(selectedFormula, volumeDietaTotal);


                          let subtotalKcal = 0;
                          let subtotalProtein = 0;
                          if (selectedFormula) {
                            try {
                              const all = calcTotals(selectedFormula, volumeDietaTotal);
                              if (all && typeof all.totalCalories !== "undefined") {
                                subtotalKcal = Number(all.totalCalories || 0);
                                subtotalProtein = Number(all.totalProtein || 0);
                              } else {
                                subtotalKcal = (selectedFormula.calories || 0) * volumeDietaTotal;
                                subtotalProtein = ((selectedFormula.protein || 0) * volumeDietaTotal) / 100;
                              }
                            } catch {
                              subtotalKcal = (selectedFormula.calories || 0) * volumeDietaTotal;
                              subtotalProtein = ((selectedFormula.protein || 0) * volumeDietaTotal) / 100;
                            }
                          }

                          return (
                            <Card key={entry.id} className="p-3">
                              <div className="flex flex-col md:flex-row md:items-start md:gap-4">
                                <div className="flex-1 space-y-2">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                                    <div>
                                      <Label>Fórmula {idx + 1}</Label>
                                      <Select value={entry.formulaId ?? ""} onValueChange={(v) => updateFormulaEntry(entry.id, { formulaId: v })} disabled={!prescription.system}>
                                        <SelectTrigger><SelectValue placeholder={prescription.system ? "Selecione a fórmula" : "Escolha o sistema primeiro"} /></SelectTrigger>
                                        <SelectContent>
                                          {availableFormulas.map((af) => (
                                            <SelectItem key={af.id} value={af.id}>
                                              <div className="flex justify-between w-full">
                                                {af.name}
                                                <Badge>{af.type}</Badge>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <Label>Volume (mL)</Label>
                                      <Input type="number" value={entry.volume ?? ""} onChange={(e) => updateFormulaEntry(entry.id, { volume: e.target.value })} />
                                    </div>

                                    <div>
                                      <Label>Diluir até (mL)</Label>
                                      <Input type="number" value={entry.diluteUntilMl ?? ""} onChange={(e) => updateFormulaEntry(entry.id, { diluteUntilMl: e.target.value })} />
                                    </div>
                                  </div>

                                  <div>
                                    <Label>Horários (para esta fórmula)</Label>
                                    <ScheduleSelector value={entry.hours || []} onChange={(v) => updateFormulaEntry(entry.id, { hours: v })} />
                                  </div>
                                </div>

                                <div className="flex-shrink-0 mt-3 md:mt-0 flex flex-col items-end gap-3">
                                  <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Subtotal</p>
                                    <p className="font-semibold">
                                      {selectedFormula && entry.volume ? `Total: ${Math.round(subtotalKcal * 100) / 100} kcal • ${Math.round(subtotalProtein * 100) / 100} g` : "—"}
                                      {prescription.system === "fechado" && entry.volume && (
                                        <p className="text-xs text-muted-foreground">
                                          A fórmula solicitada possui {entry.volume} mL por bolsa
                                        </p>
                                      )}
                                    </p>
                                  </div>

                                  <div className="flex gap-2">
                                    {prescription.formulas.length > 1 && <Button variant="destructive" onClick={() => removeFormulaEntry(entry.id)}>Remover</Button>}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button onClick={addFormulaEntry}>+ Adicionar fórmula</Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Módulos */}
                    <div>
                      <Label>Módulos (opcional)</Label>
                      <p className="text-sm text-muted-foreground mb-2">Adicione módulos e horários. A quantidade será multiplicada pela quantidade de horários. Subtotais exibem apenas o total do módulo (soma em g e kcal conforme tipo).</p>

                      <div className="space-y-3">
                        {prescription.modules.map((m) => {
                          const horarioCount = Math.max(1, (m.hours || []).length);
                          const amount = Number(m.amount || 0);
                          const subtotalGramas = amount * horarioCount;
                          let subtotalKcal = 0;
                          switch (m.type) {
                            case "moduliprotein":
                            case "modulipulver":
                            case "resource_protein":
                            case "proteina_isolada":
                              subtotalKcal = 0;
                              break;
                            case "benfiber":
                              subtotalKcal = 0;
                              break;
                            case "maltodextrina":
                              subtotalKcal = 4 * subtotalGramas;
                              break;
                            case "tcm":
                              subtotalKcal = 8.3 * subtotalGramas;
                              break;
                            case "glutamin":
                              subtotalKcal = 4 * subtotalGramas;
                              break;
                            case "cal_300":
                              subtotalKcal = 300 * horarioCount;
                              break;
                            case "cal_400":
                              subtotalKcal = 400 * horarioCount;
                              break;
                            default:
                              subtotalKcal = 0;
                          }

                          return (
                            <Card key={m.id} className="p-4">
                              <div className="flex flex-col md:flex-row md:items-start md:gap-4">
                                <div className="flex-1 space-y-3">
                                  <div>
                                    <Label>Módulo</Label>
                                    <Select value={m.type ?? ""} onValueChange={(v) => updateModule(m.id, { type: v as ModuleType })}>
                                      <SelectTrigger><SelectValue placeholder="Selecione módulo" /></SelectTrigger>
                                      <SelectContent>
                                        {MODULE_OPTIONS.map((mo) => (
                                          <SelectItem key={mo.value} value={mo.value}>
                                            {mo.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <Label>Quantidade (g)</Label>
                                      <Input type="number" value={m.amount ?? ""} onChange={(e) => updateModule(m.id, { amount: e.target.value })} />
                                    </div>

                                    <div>
                                      <Label>Horários</Label>
                                      <ScheduleSelector value={m.hours || []} onChange={(v) => updateModule(m.id, { hours: v })} />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex-shrink-0 mt-4 md:mt-0 flex flex-col items-end gap-3">
                                  <div className="text-right">
                                    <p className="text-sm text-muted-foreground mb-1">Subtotal</p>
                                    <p className="font-semibold">{subtotalGramas} g • {Math.round(subtotalKcal * 100) / 100} kcal</p>
                                  </div>

                                  <Button variant="destructive" onClick={() => removeModule(m.id)}>Remover</Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button onClick={addModule}>+ Adicionar módulo</Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Hidratação / água */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                      <div>
                        <Label>Água / Hidratação (mL/dia)</Label>
                        <Input type="number" value={prescription.waterVolume ?? ""} onChange={(e) => setField("waterVolume", e.target.value)} />
                      </div>

                      <div>
                        <Label>Horários da água</Label>
                        <ScheduleSelector value={prescription.waterHours || []} onChange={(v) => setField("waterHours", v)} />
                      </div>
                    </div>

                    <div>
                      <Label>Observações (enteral)</Label>
                      <Textarea rows={3} value={prescription.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSave} className="w-full"><Save className="mr-2" /> Salvar Prescrição</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PARENTERAL */}
              {prescription.routeSelections.parenteral && (
                <Card className="bg-card">
                  <CardHeader>
                    <CardTitle>Nutrição Parenteral</CardTitle>
                    <CardDescription>Preencha parâmetros da TN parenteral</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Tipo TN</Label>
                        <Select value={prescription.parenteralType ?? ""} onValueChange={(v) => setField("parenteralType", v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione tipo" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tnpa">TNPA</SelectItem>
                            <SelectItem value="tnpt">TNPT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Tipo de Cateter</Label>
                        <Select value={prescription.parenteralCatheter ?? ""} onValueChange={(v) => setField("parenteralCatheter", v)}>
                          <SelectTrigger><SelectValue placeholder="Tipo cateter" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="periferico">Periférico</SelectItem>
                            <SelectItem value="central">Central</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Osmolaridade (mOsm/L)</Label>
                        <Input type="number" value={prescription.parenteralOsmolarity ?? ""} onChange={(e) => setField("parenteralOsmolarity", e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Volume TN (mL)</Label>
                        <Input type="number" value={prescription.parenteralVolume ?? ""} onChange={(e) => setField("parenteralVolume", e.target.value)} />
                      </div>

                      <div>
                        <Label>Hidratação venosa (mL)</Label>
                        <Input type="number" value={prescription.parenteralHydration ?? ""} onChange={(e) => setField("parenteralHydration", e.target.value)} />
                      </div>

                      <div>
                        <Label>Tempo de infusão (horas)</Label>
                        <Input type="number" value={prescription.infusionTime ?? ""} onChange={(e) => setField("infusionTime", e.target.value)} />
                      </div>
                    </div>

                    <div>
                      <Label>Observações (parenteral)</Label>
                      <Textarea rows={3} value={prescription.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSave} className="w-full"><Save className="mr-2" /> Salvar Prescrição</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rodapé: cálculos */}
        <div className="mt-6">
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calculator /> Cálculos Nutricionais</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-muted-foreground text-sm">Volume total</p>
                  <p className="text-xl font-bold">{calculations.totalVolume} mL</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm">Calorias totais</p>
                  <p className="text-xl font-bold">{calculations.totalCalories} kcal</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm">Proteína total</p>
                  <p className="text-xl font-bold">{calculations.totalProtein} g</p>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm">
                    Velocidade da infusão
                  </p>

                  <p className="text-xl font-bold">
                    {prescription.infusionMode === "bolus"
                      ? "Bolus"
                      : calculations.infusionRateLabel
                        ? `${calculations.infusionRate} ${calculations.infusionRateLabel}`
                        : "—"}
                  </p>
                </div>

              </div>


              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">
                  Tempo de infusão
                </p>

                <p className="text-base">
                  Infundir em <strong>{prescription.infusionTime}</strong> horas/dia
                </p>



                {prescription.system === "fechado" &&
                  (() => {
                    const closedFormula = ALL_FORMULAS.find(
                      (f) => f.id === prescription.formulas[0]?.formulaId
                    ) as (typeof ALL_FORMULAS[number] & { bagVolume?: number }) | undefined;

                    if (!closedFormula?.bagVolume) return null;

                    return (
                      <p className="text-sm text-muted-foreground">
                        A fórmula solicitada possui{" "}
                        <strong>{closedFormula.bagVolume}</strong> ml em cada bolsa
                      </p>
                    );
                  })()}


              </div>

              <div>
                <p className="text-muted-foreground text-sm">
                  Volume prescrito para 24 horas
                </p>
                <p className="text-xl font-bold">
                  {calculations.totalVolume} mL
                </p>
              </div>



              <div className="mt-4 flex gap-3 p-4 bg-muted rounded-lg">
                <AlertCircle />
                <div className="space-y-1 text-sm">
                  <p>Recomendações gerais:</p>
                  <ul className="list-disc list-inside">
                    <li>25–30 kcal/kg/dia</li>
                    <li>1.0–1.5 g proteína/kg/dia</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}