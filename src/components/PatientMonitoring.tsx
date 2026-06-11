/**
 * PatientMonitoring Component
 * Componente para acompanhamento da TNE do paciente
 * Inclui: metas, percentual de infusão, motivos de interrupção,
 * calorias não intencionais e aporte nutricional total
 */

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import { Progress } from "@/components/ui/progress";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Target,
    TrendingUp,
    AlertCircle,
    Syringe,
    ChevronDown,
    Save,
    Calculator
} from "lucide-react";
import { toast } from "sonner";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Legend,
} from "recharts";
import {
    Patient,
    DailyEvolution,
    TNEGoals,
    TNEInterruptions,
    UnintentionalCalories
} from "@/lib/database";
import { calculateBmi, calculateIdealWeight } from "@/lib/prescriptionCalculations";
import {
    calculateUnintentionalCaloriesBreakdown,
    getMonitoringWeight,
    resolveTargetKcalForDay,
} from "@/lib/monitoringCalculations";
import { formatLocalDateKey } from "@/lib/dateOnly";

const MONITORING_NOTE_MAX_LENGTH = 55;

interface MonitoringChartRow {
    date: string;
    oralPct?: number;
    enteralPct: number;
    parenteralPct: number;
    nonIntentionalPct: number;
    totalPct: number;
}

interface PatientMonitoringProps {
    patient: Patient;
    onSave: (data: Partial<Patient> & Partial<DailyEvolution>) => Promise<void>;
    // Dados das prescrições para calcular aporte total
    enteralKcal?: number;
    enteralProtein?: number;
    enteralCarbs?: number;
    enteralFat?: number;
    enteralFiber?: number;
    oralKcal?: number;
    oralProtein?: number;
    oralCarbs?: number;
    oralFat?: number;
    oralFiber?: number;
    parenteralKcal?: number;
    parenteralProtein?: number;
    parenteralCarbs?: number;
    parenteralFat?: number;
    parenteralFiber?: number;
    historyData?: MonitoringChartRow[];
    savedEvolution?: DailyEvolution;
    monitoringDate: string;
}

export const PatientMonitoring = ({
    patient,
    onSave,
    enteralKcal = 0,
    enteralProtein = 0,
    enteralCarbs = 0,
    enteralFat = 0,
    enteralFiber = 0,
    oralKcal = 0,
    oralProtein = 0,
    oralCarbs = 0,
    oralFat = 0,
    oralFiber = 0,
    parenteralKcal = 0,
    parenteralProtein = 0,
    parenteralCarbs = 0,
    parenteralFat = 0,
    parenteralFiber = 0,
    historyData,
    savedEvolution,
    monitoringDate,
}: PatientMonitoringProps) => {
    // Estados locais
    const [goals, setGoals] = useState<TNEGoals>(savedEvolution?.tneGoals || patient.tneGoals || {});
    const [infusionPercentageInput, setInfusionPercentageInput] = useState(
        savedEvolution?.metaReached !== undefined
            ? String(savedEvolution.metaReached)
            : ""
    );
    const [interruptions, setInterruptions] = useState<TNEInterruptions>(
        savedEvolution?.tneInterruptions || {}
    );
    const [unintentionalCal, setUnintentionalCal] = useState<UnintentionalCalories>(
        savedEvolution?.unintentionalCalories || patient.unintentionalCalories || {}
    );
    const [monitoringNotes, setMonitoringNotes] = useState((savedEvolution?.notes || patient.monitoringNotes || "").slice(0, MONITORING_NOTE_MAX_LENGTH));
    const [oralPercentageInput, setOralPercentageInput] = useState(
        savedEvolution?.oralKcal !== undefined && oralKcal > 0 ? String(Math.round((savedEvolution.oralKcal / oralKcal) * 100)) : ""
    );
    const [parenteralPercentageInput, setParenteralPercentageInput] = useState(
        savedEvolution?.parenteralKcal !== undefined && parenteralKcal > 0 ? String(Math.round((savedEvolution.parenteralKcal / parenteralKcal) * 100)) : ""
    );
    const [isSaving, setIsSaving] = useState(false);

    // Seções collapse
    const [interruptionsOpen, setInterruptionsOpen] = useState(false);
    const [proceduresOpen, setProceduresOpen] = useState(false);
    const [giOpen, setGiOpen] = useState(false);
    const [devicesOpen, setDevicesOpen] = useState(false);

    useEffect(() => {
        setGoals(savedEvolution?.tneGoals || patient.tneGoals || {});
        setInfusionPercentageInput(
            savedEvolution?.metaReached !== undefined
                ? String(savedEvolution.metaReached)
                : ""
        );
        setInterruptions(savedEvolution?.tneInterruptions || {});
        setUnintentionalCal(savedEvolution?.unintentionalCalories || patient.unintentionalCalories || {});
        setMonitoringNotes((savedEvolution?.notes || patient.monitoringNotes || "").slice(0, MONITORING_NOTE_MAX_LENGTH));
        setOralPercentageInput(savedEvolution?.oralKcal !== undefined && oralKcal > 0 ? String(Math.round((savedEvolution.oralKcal / oralKcal) * 100)) : "");
        setParenteralPercentageInput(savedEvolution?.parenteralKcal !== undefined && parenteralKcal > 0 ? String(Math.round((savedEvolution.parenteralKcal / parenteralKcal) * 100)) : "");
    }, [patient, savedEvolution, oralKcal, oralProtein, parenteralKcal, parenteralProtein]);

    // Calcular peso ideal (IMC 25)
    const monitoringWeight = useMemo(
        () => getMonitoringWeight(patient, savedEvolution),
        [patient, savedEvolution],
    );

    const idealWeight = useMemo(
        () => calculateIdealWeight(patient.height, patient.dob) ?? undefined,
        [patient.height, patient.dob],
    );

    // Calcular IMC
    const bmi = useMemo(
        () => calculateBmi(monitoringWeight, patient.height, patient.dob) ?? undefined,
        [monitoringWeight, patient.height, patient.dob],
    );

    // Calcular calorias não intencionais
    const unintentionalKcal = useMemo(
        () => calculateUnintentionalCaloriesBreakdown({ unintentionalCalories: unintentionalCal }),
        [unintentionalCal],
    );

    const infusionPercentage = Number(infusionPercentageInput) || 0;
    const oralPercentage = Number(oralPercentageInput) || 0;
    const parenteralPercentage = Number(parenteralPercentageInput) || 0;
    const oralActualKcal = Number(((oralKcal * oralPercentage) / 100).toFixed(1));
    const oralActualProtein = Number(((oralProtein * oralPercentage) / 100).toFixed(1));
    const parenteralActualKcal = Number(((parenteralKcal * parenteralPercentage) / 100).toFixed(1));
    const parenteralActualProtein = Number(((parenteralProtein * parenteralPercentage) / 100).toFixed(1));

    const actualEnteralKcal = useMemo(() => {
        return Number(((enteralKcal * infusionPercentage) / 100).toFixed(1));
    }, [enteralKcal, infusionPercentage]);

    const actualEnteralProtein = useMemo(() => {
        return Number(((enteralProtein * infusionPercentage) / 100).toFixed(1));
    }, [enteralProtein, infusionPercentage]);

    // Aporte nutricional total
    const totalNutrition = useMemo(() => {
        const intentionalKcal = enteralKcal + oralKcal + parenteralKcal;
        const totalKcal = intentionalKcal + unintentionalKcal.total;
        const totalProtein = enteralProtein + oralProtein + parenteralProtein;
        const totalCarbs = enteralCarbs + oralCarbs + parenteralCarbs;
        const totalFat = enteralFat + oralFat + parenteralFat;
        const totalFiber = enteralFiber + oralFiber + parenteralFiber;

        const kcalPerKg = monitoringWeight ? totalKcal / monitoringWeight : 0;
        const proteinPerKg = monitoringWeight ? totalProtein / monitoringWeight : 0;
        const proteinPerKgIdeal = idealWeight ? totalProtein / idealWeight : 0;
        const carbsPerKg = monitoringWeight ? totalCarbs / monitoringWeight : 0;
        const fatPerKg = monitoringWeight ? totalFat / monitoringWeight : 0;

        const protKcal = totalProtein * 4;
        const carbKcal = totalCarbs * 4;
        const fatKcal = totalFat * 9;

        const pctProt = totalKcal > 0 ? (protKcal / totalKcal) * 100 : 0;
        const pctCarb = totalKcal > 0 ? (carbKcal / totalKcal) * 100 : 0;
        const pctFat = totalKcal > 0 ? (fatKcal / totalKcal) * 100 : 0;

        const totalFreeWater = (patient.prescriptions || []).reduce((sum, rx) => sum + (rx.totalFreeWater || 0), 0);

        return {
            intentionalKcal,
            totalKcal,
            totalProtein,
            totalCarbs,
            totalFat,
            totalFiber,
            totalFreeWater,
            kcalPerKg,
            proteinPerKg,
            proteinPerKgIdeal,
            carbsPerKg,
            fatPerKg,
            pctProt,
            pctCarb,
            pctFat,
        };
    }, [
        enteralKcal, oralKcal, parenteralKcal,
        enteralProtein, oralProtein, parenteralProtein,
        enteralCarbs, oralCarbs, parenteralCarbs,
        enteralFat, oralFat, parenteralFat,
        enteralFiber, oralFiber, parenteralFiber,
        monitoringWeight, idealWeight, unintentionalKcal.total, patient.prescriptions,
    ]);

    const actualNutrition = useMemo(() => {
        const intentionalKcal = actualEnteralKcal + oralActualKcal + parenteralActualKcal;
        const totalKcal = intentionalKcal + unintentionalKcal.total;
        const totalProtein = actualEnteralProtein + oralActualProtein + parenteralActualProtein;

        return {
            intentionalKcal,
            totalKcal,
            totalProtein,
            kcalPerKg: monitoringWeight ? totalKcal / monitoringWeight : 0,
            proteinPerKg: monitoringWeight ? totalProtein / monitoringWeight : 0,
        };
    }, [actualEnteralKcal, oralActualKcal, parenteralActualKcal, actualEnteralProtein, oralActualProtein, parenteralActualProtein, monitoringWeight, unintentionalKcal.total]);

    const actualIntentionalNutrition = useMemo(() => ({
        totalKcal: actualEnteralKcal + oralActualKcal + parenteralActualKcal,
        totalProtein: actualEnteralProtein + oralActualProtein + parenteralActualProtein,
    }), [actualEnteralKcal, oralActualKcal, parenteralActualKcal, actualEnteralProtein, oralActualProtein, parenteralActualProtein]);

    const targetKcal = useMemo(() => {
        if (goals.targetKcalPerKg && monitoringWeight) {
            return goals.targetKcalPerKg * monitoringWeight;
        }

        const intentionalCalories = enteralKcal + oralKcal + parenteralKcal;
        if (intentionalCalories > 0) {
            return intentionalCalories;
        }

        return resolveTargetKcalForDay({
            patient,
            evolution: savedEvolution,
            prescriptionsOnDay: [],
        });
    }, [goals.targetKcalPerKg, monitoringWeight, enteralKcal, oralKcal, parenteralKcal, patient, savedEvolution]);

    const actualNutritionShare = useMemo(() => {
        if (targetKcal <= 0) {
            return {
                oralPct: 0,
                enteralPct: 0,
                parenteralPct: 0,
                nonIntentionalPct: 0,
                totalPct: 0,
            };
        }

        const oralPct = (oralActualKcal / targetKcal) * 100;
        const enteralPct = (actualEnteralKcal / targetKcal) * 100;
        const parenteralPct = (parenteralActualKcal / targetKcal) * 100;
        const nonIntentionalPct = (unintentionalKcal.total / targetKcal) * 100;

        return {
            oralPct,
            enteralPct,
            parenteralPct,
            nonIntentionalPct,
            totalPct: oralPct + enteralPct + parenteralPct + nonIntentionalPct,
        };
    }, [targetKcal, oralActualKcal, actualEnteralKcal, parenteralActualKcal, unintentionalKcal.total]);

    const chartData = useMemo<MonitoringChartRow[]>(() => {
        if (historyData && historyData.length > 0) {
            return historyData;
        }

        const today = new Date();
        const fallback: MonitoringChartRow[] = [];
        for (let i = 6; i >= 0; i -= 1) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dayLabel = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
            const enteralPct = i === 0 ? Math.max(0, Math.min(infusionPercentage || 0, 140)) : 0;
            fallback.push({
                date: dayLabel,
                oralPct: 0,
                enteralPct,
                parenteralPct: 0,
                nonIntentionalPct: 0,
                totalPct: enteralPct,
            });
        }

        return fallback;
    }, [historyData, infusionPercentage]);

    // Verificar metas
    const goalStatus = useMemo(() => {
        const kcalReached = goals.targetKcalPerKg
            ? (totalNutrition.kcalPerKg / goals.targetKcalPerKg) * 100
            : 0;
        const proteinReached = goals.targetProteinPerKgActual
            ? (totalNutrition.proteinPerKg / goals.targetProteinPerKgActual) * 100
            : 0;
        const proteinIdealReached = goals.targetProteinPerKgIdeal && bmi && bmi > 30
            ? (totalNutrition.proteinPerKgIdeal / goals.targetProteinPerKgIdeal) * 100
            : null;

        return { kcalReached, proteinReached, proteinIdealReached };
    }, [goals, totalNutrition, bmi]);

    const interruptionCount = useMemo(() => {
        const proceduresCount = interruptions.procedures
            ? Object.values(interruptions.procedures).filter(Boolean).length
            : 0;
        const giCount = interruptions.gastrointestinal
            ? Object.values(interruptions.gastrointestinal).filter(Boolean).length
            : 0;
        const deviceCount = interruptions.deviceProblems
            ? Object.values(interruptions.deviceProblems).filter(Boolean).length
            : 0;
        const hemodynamicCount = interruptions.hemodynamicInstability ? 1 : 0;
        const otherCount = interruptions.other?.trim() ? 1 : 0;

        return proceduresCount + giCount + deviceCount + hemodynamicCount + otherCount;
    }, [interruptions]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const interruptionsWithoutDoi = { ...interruptions };
            delete interruptionsWithoutDoi.doi;
            await onSave({
                tneGoals: goals,
                infusionPercentage24h: infusionPercentage,
                tneInterruptions: interruptionsWithoutDoi,
                unintentionalCalories: unintentionalCal,
                monitoringNotes,
                idealWeight: idealWeight,
                weight: monitoringWeight,
                oralKcal: oralActualKcal,
                oralProtein: oralActualProtein,
                enteralKcal: actualEnteralKcal,
                enteralProtein: actualEnteralProtein,
                parenteralKcal: parenteralActualKcal,
                parenteralProtein: parenteralActualProtein,
                nonIntentionalKcal: unintentionalKcal.total,
            });
            toast.success("Dados de acompanhamento salvos!");
        } catch (error) {
            toast.error("Erro ao salvar dados");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Metas movidas para a tela de prescrição */}

            <Card className="border-dashed border-primary/30 bg-gradient-to-r from-white to-sky-50/70">
                <CardHeader>
                    <CardTitle>Leitura Rápida</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-xl border bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Ontem executado</p>
                        <p className="mt-2 text-2xl font-bold text-sky-700">{actualNutrition.totalKcal.toFixed(0)} kcal</p>
                        <p className="text-sm text-muted-foreground">{actualNutrition.totalProtein.toFixed(1)} g de proteína</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {targetKcal > 0 ? `${actualNutritionShare.totalPct.toFixed(1)}% da meta energética` : "Meta energética ainda não definida"}
                        </p>
                    </div>
                    <div className="rounded-xl border bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Prescrição do dia acompanhado</p>
                        <p className="mt-2 text-2xl font-bold text-emerald-700">{totalNutrition.totalKcal.toFixed(0)} kcal</p>
                        <p className="text-sm text-muted-foreground">{totalNutrition.totalProtein.toFixed(1)} g de proteína</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {goalStatus.kcalReached > 0 ? `${goalStatus.kcalReached.toFixed(1)}% da meta kcal planejada` : "Cadastre uma meta para comparar a prescrição"}
                        </p>
                    </div>
                    <div className="rounded-xl border bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Intercorrências das últimas 24h</p>
                        <p className="mt-2 text-2xl font-bold text-amber-700">{interruptionCount}</p>
                        <p className="text-sm text-muted-foreground">itens registrados</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {infusionPercentageInput && infusionPercentage < 80 ? "Infusão abaixo de 80% da meta no fechamento do dia anterior." : "Sem alerta crítico automático de infusão no fechamento."}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Fechamento do dia anterior</p>
                <p className="text-sm text-muted-foreground">
                    Referência: <span className="font-semibold text-foreground">{formatLocalDateKey(monitoringDate)}</span>. Registrar aqui o que efetivamente aconteceu nesse dia.
                </p>
            </div>

            {/* Percentual de Infusão */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Infusão da dieta enteral em relação ao volume prescrito no dia anterior
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        {/* NE */}
                        <div className="space-y-3 rounded-lg border p-4 bg-sky-50/30">
                            <p className="font-semibold text-sky-700">NEinfundida/NEprescrita</p>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    max="100"
                                    value={infusionPercentageInput}
                                    onChange={(e) => setInfusionPercentageInput(e.target.value)}
                                    placeholder="%"
                                    className="w-full sm:w-24 bg-white"
                                />
                                <span className="text-lg font-medium text-sky-800">%</span>
                            </div>
                        </div>

                        {/* NP */}
                        <div className="space-y-3 rounded-lg border p-4 bg-orange-50/30">
                            <p className="font-semibold text-orange-700">NPinfundida/NPprescrita</p>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    max="100"
                                    value={parenteralPercentageInput}
                                    onChange={(e) => setParenteralPercentageInput(e.target.value)}
                                    placeholder="%"
                                    className="w-full sm:w-24 bg-white"
                                />
                                <span className="text-lg font-medium text-orange-800">%</span>
                            </div>
                        </div>

                        {/* VO */}
                        <div className="space-y-3 rounded-lg border p-4 bg-green-50/30">
                            <p className="font-semibold text-green-700">Aceitação/tolerância da via oral</p>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    max="100"
                                    value={oralPercentageInput}
                                    onChange={(e) => setOralPercentageInput(e.target.value)}
                                    placeholder="%"
                                    className="w-full sm:w-24 bg-white"
                                />
                                <span className="text-lg font-medium text-green-800">%</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="rounded-lg border bg-sky-50 p-4">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-sky-700">NE efetiva (consolidado executado do dia anterior)</span>
                                <Badge className="bg-sky-600">{infusionPercentageInput ? `${infusionPercentage}%` : "-"}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-sky-900">
                                {actualEnteralKcal.toFixed(0)} kcal e {actualEnteralProtein.toFixed(1)} g de proteína
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Calculada a partir do percentual de infusão efetivamente administrado nas últimas 24h.
                            </p>
                        </div>
                        <div className="rounded-lg border bg-white p-4">
                            <p className="font-medium">Resumo efetivo 24h (relativo ao dia anterior)</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {actualNutrition.totalKcal.toFixed(0)} kcal e {actualNutrition.totalProtein.toFixed(1)} g de proteína
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Intencional: {actualIntentionalNutrition.totalKcal.toFixed(0)} kcal
                            </p>
                            {patient.weight && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {actualNutrition.kcalPerKg.toFixed(1)} kcal/kg e {actualNutrition.proteinPerKg.toFixed(2)} g/kg
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-3 rounded-lg border bg-sky-50/60 p-4">
                            <p className="font-medium text-sky-700">Resumo efetivo por via - últimas 24h (dia anterior)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div className="rounded-md border bg-white p-3">
                                    <p className="font-semibold text-sky-700">NE</p>
                                    <p>{actualEnteralKcal.toFixed(0)} kcal / {actualEnteralProtein.toFixed(1)} g</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {targetKcal > 0 ? `${actualNutritionShare.enteralPct.toFixed(1)}% da meta` : "Meta kcal nao definida"}
                                    </p>
                                </div>
                                <div className="rounded-md border bg-white p-3">
                                    <p className="font-semibold text-green-700">VO</p>
                                    <p>{oralActualKcal.toFixed(0)} kcal / {oralActualProtein.toFixed(1)} g</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {targetKcal > 0 ? `${actualNutritionShare.oralPct.toFixed(1)}% da meta` : "Meta kcal nao definida"}
                                    </p>
                                </div>
                                <div className="rounded-md border bg-white p-3">
                                    <p className="font-semibold text-orange-700">NP</p>
                                    <p>{parenteralActualKcal.toFixed(0)} kcal / {parenteralActualProtein.toFixed(1)} g</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {targetKcal > 0 ? `${actualNutritionShare.parenteralPct.toFixed(1)}% da meta` : "Meta kcal nao definida"}
                                    </p>
                                </div>
                                <div className="rounded-md border bg-white p-3">
                                    <p className="font-semibold text-slate-700">Não intencional</p>
                                    <p>{unintentionalKcal.total.toFixed(0)} kcal</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {targetKcal > 0 ? `${actualNutritionShare.nonIntentionalPct.toFixed(1)}% da meta` : "Meta kcal nao definida"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-md border bg-white p-3 lg:col-span-2">
                            <p className="font-semibold text-emerald-700">Total efetivo</p>
                            <p>{actualNutrition.totalKcal.toFixed(0)} kcal / {actualNutrition.totalProtein.toFixed(1)} g</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {targetKcal > 0 ? `${actualNutritionShare.totalPct.toFixed(1)}% da meta` : "Meta kcal nao definida"}
                            </p>
                        </div>
                    </div>
                    {infusionPercentageInput && infusionPercentage < 80 && (
                        <p className="text-sm text-amber-600 mt-2">
                            ⚠️ Infusão abaixo de 80% da meta
                        </p>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Intercorrências do dia anterior</p>
                <p className="text-sm text-muted-foreground">
                    Documente o que limitou a oferta de terapia nutricional nas últimas 24h.
                </p>
            </div>

            {/* Motivos de Interrupção */}
            <Card>
                <Collapsible open={interruptionsOpen} onOpenChange={setInterruptionsOpen}>
                    <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors rounded-t-xl">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5" />
                                    Motivos de Interrupção da TNE (últimas 24h)
                                </CardTitle>
                                <ChevronDown className={`h-5 w-5 transition-transform text-muted-foreground ${interruptionsOpen ? 'rotate-180' : ''}`} />
                            </div>
                            <CardDescription>
                                Use esta seção para registrar os motivos das interrupções da terapia nutricional enteral. Os principais motivos de interrupção de NE foram baseados em revisões sistemáticas (Pouwels, Nieuwkoop e Ramnarain, 2025; Lu et al., 2025).
                            </CardDescription>
                        </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <CardContent className="space-y-4 pt-4 border-t">
                    {/* Procedimentos */}
                    <Collapsible open={proceduresOpen} onOpenChange={setProceduresOpen}>
                        <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-2 w-full p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <Checkbox
                                checked={!!interruptions.procedures}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setProceduresOpen(true);
                                    }
                                    setInterruptions({
                                        ...interruptions,
                                        procedures: checked ? {} : undefined
                                    });
                                }}
                            />
                            <span className="font-medium">Procedimentos</span>
                            <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${proceduresOpen ? 'rotate-180' : ''}`} />
                        </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-8 pt-2 space-y-2">
                            {[
                                { key: 'airways', label: 'Relacionados às vias aéreas (IOT, extubação, traqueostomia)' },
                                { key: 'therapeutic', label: 'Terapêuticos (cirurgias, diálise, drenagens, jejum medicações)' },
                                { key: 'diagnostic', label: 'Diagnósticos (exames imagem, endoscópicos)' },
                                { key: 'nursing', label: 'Enfermagem (banho, mudança decúbito, curativos)' },
                            ].map(({ key, label }) => (
                                <div key={key} className="flex items-center gap-2">
                                    <Checkbox
                                        checked={interruptions.procedures?.[key as keyof typeof interruptions.procedures] || false}
                                        onCheckedChange={(checked) => setInterruptions({
                                            ...interruptions,
                                            procedures: {
                                                ...interruptions.procedures,
                                                [key]: !!checked
                                            }
                                        })}
                                    />
                                    <span className="text-sm">{label}</span>
                                </div>
                            ))}
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Eventos Gastrointestinais */}
                    <Collapsible open={giOpen} onOpenChange={setGiOpen}>
                        <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-2 w-full p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <Checkbox
                                checked={!!interruptions.gastrointestinal}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setGiOpen(true);
                                    }
                                    setInterruptions({
                                        ...interruptions,
                                        gastrointestinal: checked ? {} : undefined
                                    });
                                }}
                            />
                            <span className="font-medium">Eventos Gastrointestinais</span>
                            <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${giOpen ? 'rotate-180' : ''}`} />
                        </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-8 pt-2 space-y-2">
                            {[
                                { key: 'residualVolume', label: 'Aumento do volume residual gástrico' },
                                { key: 'abdominalDistension', label: 'Distensão abdominal' },
                                { key: 'diarrhea', label: 'Diarreia' },
                                { key: 'abdominalPain', label: 'Dor abdominal' },
                                { key: 'nausea', label: 'Náusea' },
                                { key: 'vomiting', label: 'Vômitos' },
                                { key: 'aspiration', label: 'Broncoaspiração' },
                                { key: 'giBleed', label: 'Sangramento gastrointestinal' },
                                { key: 'ileus', label: 'Íleo Adinâmico' },
                            ].map(({ key, label }) => (
                                <div key={key} className="flex items-center gap-2">
                                    <Checkbox
                                        checked={interruptions.gastrointestinal?.[key as keyof typeof interruptions.gastrointestinal] || false}
                                        onCheckedChange={(checked) => setInterruptions({
                                            ...interruptions,
                                            gastrointestinal: {
                                                ...interruptions.gastrointestinal,
                                                [key]: !!checked
                                            }
                                        })}
                                    />
                                    <span className="text-sm">{label}</span>
                                </div>
                            ))}
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Instabilidade Hemodinâmica */}
                    <div className="flex items-center gap-2 p-2">
                        <Checkbox
                            checked={interruptions.hemodynamicInstability || false}
                            onCheckedChange={(checked) => setInterruptions({
                                ...interruptions,
                                hemodynamicInstability: !!checked
                            })}
                        />
                        <span className="font-medium">Instabilidade hemodinâmica</span>
                    </div>

                    {/* Problemas com dispositivos */}
                    <Collapsible open={devicesOpen} onOpenChange={setDevicesOpen}>
                        <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-2 w-full p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <Checkbox
                                checked={!!interruptions.deviceProblems}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setDevicesOpen(true);
                                    }
                                    setInterruptions({
                                        ...interruptions,
                                        deviceProblems: checked ? {} : undefined
                                    });
                                }}
                            />
                            <span className="font-medium">Problemas com dispositivos (sondas/ostomias)</span>
                            <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${devicesOpen ? 'rotate-180' : ''}`} />
                        </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-8 pt-2 space-y-2">
                            {[
                                { key: 'obstruction', label: 'Obstrução' },
                                { key: 'displacement', label: 'Deslocamento' },
                                { key: 'unplannedRemoval', label: 'Remoção não planejada' },
                            ].map(({ key, label }) => (
                                <div key={key} className="flex items-center gap-2">
                                    <Checkbox
                                        checked={interruptions.deviceProblems?.[key as keyof typeof interruptions.deviceProblems] || false}
                                        onCheckedChange={(checked) => setInterruptions({
                                            ...interruptions,
                                            deviceProblems: {
                                                ...interruptions.deviceProblems,
                                                [key]: !!checked
                                            }
                                        })}
                                    />
                                    <span className="text-sm">{label}</span>
                                </div>
                            ))}
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Outros */}
                    <div className="flex items-center gap-2 p-2">
                        <Checkbox
                            checked={!!interruptions.other}
                            onCheckedChange={(checked) => setInterruptions({
                                ...interruptions,
                                other: checked ? '' : undefined
                            })}
                        />
                        <span className="font-medium">Outros</span>
                        {interruptions.other !== undefined && (
                            <Input
                                value={interruptions.other}
                                onChange={(e) => setInterruptions({
                                    ...interruptions,
                                    other: e.target.value
                                })}
                                placeholder="Especifique..."
                                className="flex-1"
                            />
                        )}
                    </div>
                    <div className="rounded-md bg-muted/40 p-2 text-[10px] leading-snug text-muted-foreground">
                        <p className="font-semibold text-foreground/70">Referências:</p>
                        <p>POUWELS, Sjaak; VAN NIEUWKOOP, Monica M.; RAMNARAIN, Dharmanand. Enteral Nutrition Interruptions in the Intensive Care Unit: A Systematic Review of Frequency, Causes, and Nutritional Implications. Cureus, 2025.</p>
                        <p>LU, Xiaoyan; WANG, Xin; YU, Weixia; et al. Current status and influencing factors of enteral nutrition interruption among critical patients: a systematic review. Frontiers in Nutrition, v. 12, p. 1462131, 2025.</p>
                    </div>
                        </CardContent>
                    </CollapsibleContent>
                </Collapsible>
            </Card>

            {/* Calorias Não Intencionais - somente leitura (campos de entrada movidos para prescrição) */}
            {unintentionalKcal.total > 0 && (
                <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-700">
                                <Syringe className="h-4 w-4" />
                                <span className="text-sm font-medium">Calorias Não Intencionais (da prescrição):</span>
                            </div>
                            <Badge variant="secondary">{unintentionalKcal.total.toFixed(0)} kcal/dia</Badge>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Registro clínico</p>
                <p className="text-sm text-muted-foreground">
                    Use este campo para o resumo da evolução clínica e conduta nutricional. Estas informações serão adicionadas ao mapa do nutricionista.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Observações do Acompanhamento</CardTitle>
                    <CardDescription>
                        Máximo de {MONITORING_NOTE_MAX_LENGTH} caracteres: Resumo diário para o mapa do nutricionista.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Textarea
                        value={monitoringNotes}
                        onChange={(event) => setMonitoringNotes(event.target.value.slice(0, MONITORING_NOTE_MAX_LENGTH))}
                        placeholder="Ex: tolerou NE; reduzir NP."
                        maxLength={MONITORING_NOTE_MAX_LENGTH}
                        rows={2}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                        {monitoringNotes.length}/{MONITORING_NOTE_MAX_LENGTH} caracteres
                    </p>
                </CardContent>
            </Card>

            <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Prescrição do dia acompanhado</p>
                <p className="text-sm text-muted-foreground">
                    Esta parte apresenta o aporte prescrito para {formatLocalDateKey(monitoringDate)}, separado do fechamento efetivamente registrado.
                </p>
            </div>

            {/* Aporte Nutricional Total */}
            <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-green-700">
                        <Calculator className="h-5 w-5" />
                        Aporte Nutricional Total da Prescrição do Dia Acompanhado
                    </CardTitle>
                    <CardDescription>
                        Somatório das vias prescritas em {formatLocalDateKey(monitoringDate)}, com inclusão das calorias não intencionais no total calórico.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                            <div className="text-3xl font-bold text-green-600">
                                {totalNutrition.totalKcal.toFixed(0)}
                            </div>
                            <div className="text-sm text-muted-foreground">kcal</div>
                            {patient.weight && (
                                <div className="text-lg font-semibold text-green-700 mt-1">
                                    {totalNutrition.kcalPerKg.toFixed(1)} kcal/kg
                                </div>
                            )}
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                            <div className="text-3xl font-bold text-blue-600">
                                {totalNutrition.totalProtein.toFixed(1)}
                            </div>
                            <div className="text-sm text-muted-foreground">g proteínas</div>
                            {patient.weight && (
                                <div className="text-lg font-semibold text-blue-700 mt-1">
                                    {totalNutrition.proteinPerKg.toFixed(2)} g/kg
                                    {bmi && bmi > 30 && idealWeight && (
                                        <span className="text-xs block text-muted-foreground">
                                            ({totalNutrition.proteinPerKgIdeal.toFixed(2)} g/kg PI)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Macronutrientes % VET */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm border">
                            <div className="text-xl font-bold text-blue-600">{totalNutrition.pctProt.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">Proteínas</div>
                            <div className="text-xs text-blue-700 font-medium">{totalNutrition.totalProtein.toFixed(1)}g</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm border">
                            <div className="text-xl font-bold text-amber-600">{totalNutrition.pctCarb.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">Carboidratos</div>
                            <div className="text-xs text-amber-700 font-medium">{totalNutrition.totalCarbs.toFixed(1)}g</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm border">
                            <div className="text-xl font-bold text-red-500">{totalNutrition.pctFat.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">Lipídeos</div>
                            <div className="text-xs text-red-600 font-medium">{totalNutrition.totalFat.toFixed(1)}g</div>
                        </div>
                    </div>

                    {/* Água livre g/kg */}
                    {patient.weight && totalNutrition.totalFreeWater > 0 && (
                        <div className="mb-4 p-3 bg-white rounded-lg shadow-sm border border-cyan-200">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-cyan-700">Água livre:</span>
                                <div className="text-right">
                                    <span className="font-bold text-cyan-600">{totalNutrition.totalFreeWater.toFixed(0)} ml</span>
                                    <span className="text-sm text-muted-foreground ml-2">
                                        ({(totalNutrition.totalFreeWater / patient.weight).toFixed(1)} ml/kg)
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Detalhamento por via */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 text-sm">
                        <div className="p-2 bg-white rounded border">
                            <div className="font-semibold text-orange-600">Via Oral</div>
                            <div>{oralKcal} kcal / {oralProtein}g Prot</div>
                            <div className="text-xs text-muted-foreground mt-1">Carb: {oralCarbs}g | Lip: {oralFat}g | Fib: {oralFiber}g</div>
                        </div>
                        <div className="p-2 bg-white rounded border">
                            <div className="font-semibold text-blue-600">TNE</div>
                            <div>{enteralKcal} kcal / {enteralProtein}g Prot</div>
                            <div className="text-xs text-muted-foreground mt-1">Carb: {enteralCarbs}g | Lip: {enteralFat}g | Fib: {enteralFiber}g</div>
                        </div>
                        <div className="p-2 bg-white rounded border">
                            <div className="font-semibold text-purple-600">TNP</div>
                            <div>{parenteralKcal} kcal / {parenteralProtein}g Prot</div>
                            <div className="text-xs text-muted-foreground mt-1">Carb: {parenteralCarbs}g | Lip: {parenteralFat}g | Fib: {parenteralFiber}g</div>
                        </div>
                        <div className="p-2 bg-white rounded border">
                            <div className="font-semibold text-gray-600">Não Intencional</div>
                            <div>{unintentionalKcal.total.toFixed(0)} kcal</div>
                        </div>
                        <div className="p-2 bg-white rounded border">
                            <div className="font-semibold text-emerald-700">Total Geral</div>
                            <div>{totalNutrition.totalKcal.toFixed(0)} kcal</div>
                            <div className="text-xs text-muted-foreground space-y-1 mt-1 border-t pt-1">
                                <div><span className="font-medium text-blue-600">Prot:</span> {totalNutrition.totalProtein.toFixed(1)}g ({totalNutrition.pctProt.toFixed(1)}% VET)</div>
                                <div><span className="font-medium text-amber-600">Carb:</span> {totalNutrition.totalCarbs.toFixed(1)}g ({totalNutrition.pctCarb.toFixed(1)}% VET)</div>
                                <div><span className="font-medium text-red-500">Lip:</span> {totalNutrition.totalFat.toFixed(1)}g ({totalNutrition.pctFat.toFixed(1)}% VET)</div>
                                <div><span className="font-medium text-green-600">Fibra:</span> {totalNutrition.totalFiber.toFixed(1)}g</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tendência recente</p>
                <p className="text-sm text-muted-foreground">
                    Histórico visual dos últimos 7 dias em relação à meta energética.
                </p>
            </div>

            {/* Botão Salvar */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Tendência de oferta nutricional em relação à meta
                    </CardTitle>
                    <CardDescription>Últimos 7 dias, com empilhamento por via efetiva.</CardDescription>
                </CardHeader>
                <CardContent className="h-[260px] sm:h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 12, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis unit="%" domain={[0, 140]} width={38} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => `${Number(value).toFixed(1)}%`} />
                            <Legend wrapperStyle={{ fontSize: "12px" }} />
                            <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="3 3" label="Meta" />
                            <Bar dataKey="oralPct" stackId="meta" fill="#22c55e" name="VO efetiva" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="enteralPct" stackId="meta" fill="#0ea5e9" name="NE infundida" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="parenteralPct" stackId="meta" fill="#f97316" name="NP infundida" />
                            <Bar dataKey="nonIntentionalPct" stackId="meta" fill="#16a34a" name="Kcal não intencionais" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar Acompanhamento"}
            </Button>
        </div>
    );
};

export default PatientMonitoring;
