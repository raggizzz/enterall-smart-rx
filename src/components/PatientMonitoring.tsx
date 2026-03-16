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
    oralKcal?: number;
    oralProtein?: number;
    parenteralKcal?: number;
    parenteralProtein?: number;
    historyData?: MonitoringChartRow[];
    savedEvolution?: DailyEvolution;
}

export const PatientMonitoring = ({
    patient,
    onSave,
    enteralKcal = 0,
    enteralProtein = 0,
    oralKcal = 0,
    oralProtein = 0,
    parenteralKcal = 0,
    parenteralProtein = 0,
    historyData,
    savedEvolution,
}: PatientMonitoringProps) => {
    // Estados locais
    const [goals, setGoals] = useState<TNEGoals>(patient.tneGoals || {});
    const [infusionPercentage, setInfusionPercentage] = useState(
        savedEvolution?.metaReached ?? patient.infusionPercentage24h ?? 0
    );
    const [interruptions, setInterruptions] = useState<TNEInterruptions>(
        patient.tneInterruptions || {}
    );
    const [unintentionalCal, setUnintentionalCal] = useState<UnintentionalCalories>(
        patient.unintentionalCalories || {}
    );
    const [monitoringNotes, setMonitoringNotes] = useState(patient.monitoringNotes || "");
    const [oralActualKcal, setOralActualKcal] = useState(savedEvolution?.oralKcal ?? oralKcal);
    const [oralActualProtein, setOralActualProtein] = useState(savedEvolution?.oralProtein ?? oralProtein);
    const [parenteralActualKcal, setParenteralActualKcal] = useState(savedEvolution?.parenteralKcal ?? parenteralKcal);
    const [parenteralActualProtein, setParenteralActualProtein] = useState(savedEvolution?.parenteralProtein ?? parenteralProtein);
    const [isSaving, setIsSaving] = useState(false);

    // Seções collapse
    const [proceduresOpen, setProceduresOpen] = useState(false);
    const [giOpen, setGiOpen] = useState(false);
    const [devicesOpen, setDevicesOpen] = useState(false);

    useEffect(() => {
        setGoals(patient.tneGoals || {});
        setInfusionPercentage(savedEvolution?.metaReached ?? patient.infusionPercentage24h ?? 0);
        setInterruptions(patient.tneInterruptions || {});
        setUnintentionalCal(patient.unintentionalCalories || {});
        setMonitoringNotes(patient.monitoringNotes || "");
        setOralActualKcal(savedEvolution?.oralKcal ?? oralKcal);
        setOralActualProtein(savedEvolution?.oralProtein ?? oralProtein);
        setParenteralActualKcal(savedEvolution?.parenteralKcal ?? parenteralKcal);
        setParenteralActualProtein(savedEvolution?.parenteralProtein ?? parenteralProtein);
    }, [patient, savedEvolution, oralKcal, oralProtein, parenteralKcal, parenteralProtein]);

    // Calcular peso ideal (IMC 25)
    const idealWeight = useMemo(() => {
        if (!patient.height) return undefined;
        const heightM = patient.height / 100;
        return 25 * heightM * heightM;
    }, [patient.height]);

    // Calcular IMC
    const bmi = useMemo(() => {
        if (!patient.weight || !patient.height) return undefined;
        const heightM = patient.height / 100;
        return patient.weight / (heightM * heightM);
    }, [patient.weight, patient.height]);

    // Calcular calorias não intencionais
    const unintentionalKcal = useMemo(() => {
        const propofol = (unintentionalCal.propofolMlH || 0) * 1.1 * 24;
        const glucose = (unintentionalCal.glucoseGDay || 0) * 3.4;
        const citrate = (unintentionalCal.citrateGDay || 0) * 3.0;
        return { propofol, glucose, citrate, total: propofol + glucose + citrate };
    }, [unintentionalCal]);

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

        const kcalPerKg = patient.weight ? totalKcal / patient.weight : 0;
        const proteinPerKg = patient.weight ? totalProtein / patient.weight : 0;
        const proteinPerKgIdeal = idealWeight ? totalProtein / idealWeight : 0;

        return {
            intentionalKcal,
            totalKcal,
            totalProtein,
            kcalPerKg,
            proteinPerKg,
            proteinPerKgIdeal,
        };
    }, [enteralKcal, oralKcal, parenteralKcal,
        enteralProtein, oralProtein, parenteralProtein, patient.weight, idealWeight, unintentionalKcal.total]);

    const actualNutrition = useMemo(() => {
        const intentionalKcal = actualEnteralKcal + oralActualKcal + parenteralActualKcal;
        const totalKcal = intentionalKcal + unintentionalKcal.total;
        const totalProtein = actualEnteralProtein + oralActualProtein + parenteralActualProtein;

        return {
            intentionalKcal,
            totalKcal,
            totalProtein,
            kcalPerKg: patient.weight ? totalKcal / patient.weight : 0,
            proteinPerKg: patient.weight ? totalProtein / patient.weight : 0,
        };
    }, [actualEnteralKcal, oralActualKcal, parenteralActualKcal, actualEnteralProtein, oralActualProtein, parenteralActualProtein, patient.weight, unintentionalKcal.total]);

    const actualIntentionalNutrition = useMemo(() => ({
        totalKcal: actualEnteralKcal + oralActualKcal + parenteralActualKcal,
        totalProtein: actualEnteralProtein + oralActualProtein + parenteralActualProtein,
    }), [actualEnteralKcal, oralActualKcal, parenteralActualKcal, actualEnteralProtein, oralActualProtein, parenteralActualProtein]);

    const targetKcal = useMemo(() => {
        if (!goals.targetKcalPerKg || !patient.weight) return 0;
        return goals.targetKcalPerKg * patient.weight;
    }, [goals.targetKcalPerKg, patient.weight]);

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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                tneGoals: goals,
                infusionPercentage24h: infusionPercentage,
                tneInterruptions: interruptions,
                unintentionalCalories: unintentionalCal,
                monitoringNotes,
                idealWeight: idealWeight,
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
            {/* Metas para TNE */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Metas para Terapia Nutricional Enteral
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Meta kcal/kg</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={goals.targetKcalPerKg || ''}
                                onChange={(e) => setGoals({
                                    ...goals,
                                    targetKcalPerKg: parseFloat(e.target.value) || undefined
                                })}
                                placeholder="Ex: 25"
                            />
                            {targetKcal > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Meta calculada: {targetKcal.toFixed(0)} kcal/dia
                                </p>
                            )}
                            {goalStatus.kcalReached > 0 && (
                                <Progress value={Math.min(goalStatus.kcalReached, 100)} className="h-2" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Meta proteínas g/kg (peso atual)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={goals.targetProteinPerKgActual || ''}
                                onChange={(e) => setGoals({
                                    ...goals,
                                    targetProteinPerKgActual: parseFloat(e.target.value) || undefined
                                })}
                                placeholder="Ex: 1.2"
                            />
                            {goalStatus.proteinReached > 0 && (
                                <Progress value={Math.min(goalStatus.proteinReached, 100)} className="h-2" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Meta proteínas g/kg (peso ideal)</Label>
                            <p className="text-xs text-muted-foreground">Para IMC &gt; 30</p>
                            <Input
                                type="number"
                                step="0.1"
                                value={goals.targetProteinPerKgIdeal || ''}
                                onChange={(e) => setGoals({
                                    ...goals,
                                    targetProteinPerKgIdeal: parseFloat(e.target.value) || undefined
                                })}
                                placeholder="Ex: 2.0"
                                disabled={!bmi || bmi <= 30}
                            />
                            {goalStatus.proteinIdealReached !== null && goalStatus.proteinIdealReached > 0 && (
                                <Progress value={Math.min(goalStatus.proteinIdealReached, 100)} className="h-2" />
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Percentual de Infusão */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Percentual de Infusão do Dia Anterior (Últimas 24h)
                    </CardTitle>
                    <CardDescription>
                        A infusão registrada será contabilizada para o fechamento do dia anterior.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            value={infusionPercentage}
                            onChange={(e) => setInfusionPercentage(parseInt(e.target.value) || 0)}
                            className="w-full sm:w-24"
                        />
                        <span className="text-lg">%</span>
                        <Progress value={infusionPercentage} className="flex-1 h-4" />
                    </div>
                    <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="rounded-lg border bg-sky-50 p-4">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-sky-700">NE efetiva (automática)</span>
                                <Badge className="bg-sky-600">{infusionPercentage}%</Badge>
                            </div>
                            <p className="mt-2 text-sm text-sky-900">
                                {actualEnteralKcal.toFixed(0)} kcal e {actualEnteralProtein.toFixed(1)} g de proteína
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Calculada a partir do percentual de infusão das últimas 24h.
                            </p>
                        </div>
                        <div className="rounded-lg border bg-white p-4">
                            <p className="font-medium">Aporte efetivo total das últimas 24h</p>
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
                            <p className="font-medium text-sky-700">Resumo efetivo por via nas últimas 24h</p>
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
                        <div className="space-y-3 rounded-lg border p-4">
                            <p className="font-medium text-green-700">Via oral efetiva</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>kcal VO</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={oralActualKcal}
                                        onChange={(e) => setOralActualKcal(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Proteína VO (g)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={oralActualProtein}
                                        onChange={(e) => setOralActualProtein(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 rounded-lg border p-4 lg:col-span-2">
                            <p className="font-medium text-orange-700">Parenteral efetiva</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>kcal NP</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={parenteralActualKcal}
                                        onChange={(e) => setParenteralActualKcal(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Proteína NP (g)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={parenteralActualProtein}
                                        onChange={(e) => setParenteralActualProtein(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    {infusionPercentage < 80 && (
                        <p className="text-sm text-amber-600 mt-2">
                            ⚠️ Infusão abaixo de 80% da meta
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Motivos de Interrupção */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Motivos de Interrupção da TNE (últimas 24h)
                    </CardTitle>
                    <CardDescription>
                        Baseado em revisões sistemáticas (10.7759/cureus.8184 e 10.3389/fnut.2025.1462131)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
            </Card>

            {/* Calorias Não Intencionais */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Syringe className="h-5 w-5" />
                        Calorias Não Intencionais
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Propofol (ml/h)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={unintentionalCal.propofolMlH || ''}
                                onChange={(e) => setUnintentionalCal({
                                    ...unintentionalCal,
                                    propofolMlH: parseFloat(e.target.value) || undefined
                                })}
                                placeholder="Ex: 10"
                            />
                            <p className="text-xs text-muted-foreground">
                                = {unintentionalKcal.propofol.toFixed(0)} kcal/dia
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Glicose (g/dia)</Label>
                            <Input
                                type="number"
                                step="1"
                                value={unintentionalCal.glucoseGDay || ''}
                                onChange={(e) => setUnintentionalCal({
                                    ...unintentionalCal,
                                    glucoseGDay: parseFloat(e.target.value) || undefined
                                })}
                                placeholder="Ex: 50"
                            />
                            <p className="text-xs text-muted-foreground">
                                = {unintentionalKcal.glucose.toFixed(0)} kcal/dia
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Citrato (g/dia)</Label>
                            <Input
                                type="number"
                                step="1"
                                value={unintentionalCal.citrateGDay || ''}
                                onChange={(e) => setUnintentionalCal({
                                    ...unintentionalCal,
                                    citrateGDay: parseFloat(e.target.value) || undefined
                                })}
                                placeholder="Ex: 20"
                            />
                            <p className="text-xs text-muted-foreground">
                                = {unintentionalKcal.citrate.toFixed(0)} kcal/dia
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-amber-800">Subtotal Calorias Não Intencionais:</span>
                            <Badge variant="secondary" className="text-lg">
                                {unintentionalKcal.total.toFixed(0)} kcal/dia
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Observações do Acompanhamento</CardTitle>
                    <CardDescription>
                        Esse texto alimenta o mapa do nutricionista e acompanha a evolução clínica.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={monitoringNotes}
                        onChange={(event) => setMonitoringNotes(event.target.value)}
                        placeholder="Ex: 11/03: tolerou bem a NE. 12/03: reduzida NP e mantida progressão da enteral."
                        rows={4}
                    />
                </CardContent>
            </Card>

            {/* Aporte Nutricional Total */}
            <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-green-700">
                        <Calculator className="h-5 w-5" />
                        Aporte Nutricional Total
                    </CardTitle>
                    <CardDescription>
                        Somatório das vias prescritas com inclusão das calorias não intencionais no total calórico.
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

                    {/* Detalhamento por via */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 text-sm">
                        <div className="p-2 bg-white rounded border">
                            <div className="font-semibold text-orange-600">Via Oral</div>
                            <div>{oralKcal} kcal / {oralProtein}g</div>
                        </div>
                        <div className="p-2 bg-white rounded border">
                            <div className="font-semibold text-blue-600">TNE</div>
                            <div>{enteralKcal} kcal / {enteralProtein}g</div>
                        </div>
                        <div className="p-2 bg-white rounded border">
                            <div className="font-semibold text-purple-600">TNP</div>
                            <div>{parenteralKcal} kcal / {parenteralProtein}g</div>
                        </div>
                        <div className="p-2 bg-white rounded border">
                            <div className="font-semibold text-gray-600">Não Intencional</div>
                            <div>{unintentionalKcal.total.toFixed(0)} kcal</div>
                        </div>
                        <div className="p-2 bg-white rounded border">
                            <div className="font-semibold text-emerald-700">Total Geral</div>
                            <div>{totalNutrition.totalKcal.toFixed(0)} kcal</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Botão Salvar */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Somatório proporcional de NE infundida, NP infundida e calorias não intencionais em relação à meta
                    </CardTitle>
                    <CardDescription>Últimos 7 dias</CardDescription>
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
