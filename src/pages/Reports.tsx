import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
} from 'recharts';
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { usePatients, useEvolutions, usePrescriptions } from "@/hooks/useDatabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import { can } from "@/lib/permissions";
import type { Patient, Prescription } from "@/lib/database";

type ChartRow = {
    date: string;
    enteralPct: number;
    parenteralPct: number;
    nonIntentionalPct: number;
    totalPct: number;
};

const clampPercent = (value: number): number => Math.max(0, Math.min(value, 140));

const buildDateRange = (startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const loop = new Date(start);

    while (loop <= end) {
        dates.push(loop.toISOString().split('T')[0]);
        loop.setDate(loop.getDate() + 1);
    }

    return dates;
};

const formatLabelDate = (isoDate: string): string => {
    const date = new Date(`${isoDate}T00:00:00`);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

const calculateUnintentionalKcal = (patient?: Patient): number => {
    const unintentional = patient?.unintentionalCalories;
    if (!unintentional) return 0;

    const propofol = (unintentional.propofolMlH || 0) * 1.1 * 24;
    const glucose = (unintentional.glucoseGDay || 0) * 3.4;
    const citrate = (unintentional.citrateGDay || 0) * 3;

    return propofol + glucose + citrate;
};

const isPrescriptionActiveOn = (prescription: Prescription, day: string): boolean => {
    return prescription.startDate <= day && (!prescription.endDate || prescription.endDate >= day);
};

const Reports = () => {
    const navigate = useNavigate();
    const { patients, isLoading } = usePatients();
    const { evolutions } = useEvolutions();
    const { prescriptions } = usePrescriptions();
    const [selectedPatient, setSelectedPatient] = useState("all");
    const role = useCurrentRole();
    const isManagerView = can(role, "manage_units") || can(role, "manage_wards");

    const activePatients = useMemo(() => {
        return patients.filter((p) => p.status === 'active');
    }, [patients]);

    useEffect(() => {
        if (!isManagerView && selectedPatient === "all" && activePatients.length > 0) {
            setSelectedPatient(activePatients[0].id || "all");
        }
    }, [isManagerView, selectedPatient, activePatients]);

    const statistics = useMemo(() => {
        const total = activePatients.length;
        const byType = {
            oral: activePatients.filter((p) => p.nutritionType === 'oral').length,
            enteral: activePatients.filter((p) => p.nutritionType === 'enteral').length,
            parenteral: activePatients.filter((p) => p.nutritionType === 'parenteral').length,
            jejum: activePatients.filter((p) => p.nutritionType === 'jejum').length,
        };
        return { total, byType };
    }, [activePatients]);

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const [startDate, setStartDate] = useState(sevenDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const forceLastSevenDays = isManagerView && selectedPatient === "all";
    const effectiveStartDate = forceLastSevenDays ? sevenDaysAgo.toISOString().split('T')[0] : startDate;
    const effectiveEndDate = forceLastSevenDays ? today.toISOString().split('T')[0] : endDate;

    const daysInPeriod = useMemo(
        () => buildDateRange(effectiveStartDate, effectiveEndDate),
        [effectiveStartDate, effectiveEndDate]
    );

    const patientsById = useMemo(() => {
        const map = new Map<string, Patient>();
        patients.forEach((patient) => {
            if (patient.id) map.set(patient.id, patient);
        });
        return map;
    }, [patients]);

    const filteredEvolutions = useMemo(() => {
        return evolutions.filter((evo) => {
            const matchesDate = evo.date >= effectiveStartDate && evo.date <= effectiveEndDate;
            const matchesPatient = selectedPatient === 'all' || evo.patientId === selectedPatient;
            return matchesDate && matchesPatient;
        });
    }, [evolutions, effectiveStartDate, effectiveEndDate, selectedPatient]);

    const filteredPrescriptions = useMemo(() => {
        return prescriptions.filter((prescription) => {
            const matchesPatient = selectedPatient === 'all' || prescription.patientId === selectedPatient;
            const matchesPeriod = prescription.startDate <= effectiveEndDate
                && (!prescription.endDate || prescription.endDate >= effectiveStartDate);
            return matchesPatient && matchesPeriod;
        });
    }, [prescriptions, selectedPatient, effectiveStartDate, effectiveEndDate]);

    const prescriptionsByPatient = useMemo(() => {
        const map = new Map<string, Prescription[]>();
        filteredPrescriptions.forEach((prescription) => {
            const list = map.get(prescription.patientId) || [];
            list.push(prescription);
            map.set(prescription.patientId, list);
        });
        return map;
    }, [filteredPrescriptions]);

    const historyData = useMemo<ChartRow[]>(() => {
        const grouped: Record<string, { enteral: number; parenteral: number; nonIntentional: number; count: number }> = {};

        daysInPeriod.forEach((day) => {
            grouped[day] = { enteral: 0, parenteral: 0, nonIntentional: 0, count: 0 };
        });

        filteredEvolutions.forEach((evo) => {
            if (!grouped[evo.date]) return;

            const patient = patientsById.get(evo.patientId);
            const patientPrescriptions = prescriptionsByPatient
                .get(evo.patientId)
                ?.filter((prescription) => isPrescriptionActiveOn(prescription, evo.date)) || [];

            const targetKcal = (() => {
                const prescriptionWithTarget = patientPrescriptions.find((prescription) => (prescription.totalCalories || 0) > 0);
                if (prescriptionWithTarget?.totalCalories) return prescriptionWithTarget.totalCalories;
                if (patient?.weight) return patient.weight * 25;
                return 0;
            })();

            const parenteralKcal = patientPrescriptions
                .filter((prescription) => prescription.therapyType === 'parenteral')
                .reduce((sum, prescription) => sum + (prescription.totalCalories || 0), 0);

            const nonIntentionalKcal = calculateUnintentionalKcal(patient);

            const enteralPct = clampPercent(evo.metaReached || 0);
            const parenteralPct = targetKcal > 0 ? clampPercent((parenteralKcal / targetKcal) * 100) : 0;
            const nonIntentionalPct = targetKcal > 0 ? clampPercent((nonIntentionalKcal / targetKcal) * 100) : 0;

            grouped[evo.date].enteral += enteralPct;
            grouped[evo.date].parenteral += parenteralPct;
            grouped[evo.date].nonIntentional += nonIntentionalPct;
            grouped[evo.date].count += 1;
        });

        return daysInPeriod.map((day) => {
            const entry = grouped[day];
            const divisor = entry.count || 1;
            const enteralPct = entry.count > 0 ? Number((entry.enteral / divisor).toFixed(1)) : 0;
            const parenteralPct = entry.count > 0 ? Number((entry.parenteral / divisor).toFixed(1)) : 0;
            const nonIntentionalPct = entry.count > 0 ? Number((entry.nonIntentional / divisor).toFixed(1)) : 0;
            return {
                date: formatLabelDate(day),
                enteralPct,
                parenteralPct,
                nonIntentionalPct,
                totalPct: Number((enteralPct + parenteralPct + nonIntentionalPct).toFixed(1)),
            };
        });
    }, [daysInPeriod, filteredEvolutions, patientsById, prescriptionsByPatient]);

    const summary = useMemo(() => {
        const totalEvolutions = filteredEvolutions.length;
        if (totalEvolutions === 0) {
            return { avgPercentage: "0.0", daysOnGoal: 0, daysBelow: 0 };
        }

        const avgPercentage = filteredEvolutions.reduce((sum, evolution) => sum + (evolution.metaReached || 0), 0) / totalEvolutions;
        const daysOnGoal = filteredEvolutions.filter((evolution) => (evolution.metaReached || 0) >= 80).length;
        const daysBelow = filteredEvolutions.filter((evolution) => (evolution.metaReached || 0) < 80).length;

        return {
            avgPercentage: avgPercentage.toFixed(1),
            daysOnGoal,
            daysBelow,
        };
    }, [filteredEvolutions]);

    const routeDistribution = useMemo(() => {
        const oral = new Set<string>();
        const enteral = new Set<string>();
        const parenteral = new Set<string>();

        daysInPeriod.forEach((day) => {
            filteredPrescriptions.forEach((prescription) => {
                if (!isPrescriptionActiveOn(prescription, day)) return;
                if (!prescription.patientId) return;

                const key = `${day}:${prescription.patientId}`;
                if (prescription.therapyType === 'oral') oral.add(key);
                if (prescription.therapyType === 'enteral') enteral.add(key);
                if (prescription.therapyType === 'parenteral') parenteral.add(key);
            });
        });

        return {
            oral: oral.size,
            enteral: enteral.size,
            parenteral: parenteral.size,
        };
    }, [daysInPeriod, filteredPrescriptions]);

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />

            <div className="container px-4 py-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Relatorios</h1>
                        <p className="text-muted-foreground">Acompanhamento da terapia nutricional</p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Selecione o Paciente" />
                            </SelectTrigger>
                            <SelectContent>
                                {isManagerView && <SelectItem value="all">Conjunto</SelectItem>}
                                {activePatients.map((patient) => (
                                    <SelectItem key={patient.id} value={patient.id || ''}>{patient.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-2 items-end">
                        <div className="space-y-1">
                            <Label className="text-xs">Inicio</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                                className="w-[140px]"
                                disabled={forceLastSevenDays}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Fim</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(event) => setEndDate(event.target.value)}
                                className="w-[140px]"
                                disabled={forceLastSevenDays}
                            />
                        </div>
                        <Button variant="outline" className="mb-[1px]">
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                        </Button>
                    </div>
                </div>

                {forceLastSevenDays && (
                    <p className="text-xs text-muted-foreground">
                        No modo conjunto, o grafico considera automaticamente os ultimos 7 dias.
                    </p>
                )}

                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Carregando dados...</p>
                    </div>
                ) : activePatients.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Nenhum paciente ativo encontrado</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Cadastre pacientes para visualizar relatorios
                            </p>
                            <Button className="mt-4" onClick={() => navigate('/patients')}>
                                Ir para Pacientes
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-primary">{statistics.total}</p>
                                        <p className="text-sm text-muted-foreground">Pacientes Ativos</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-green-600">{statistics.byType.oral}</p>
                                        <p className="text-sm text-muted-foreground">Dieta Oral</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-purple-600">{statistics.byType.enteral}</p>
                                        <p className="text-sm text-muted-foreground">TNE</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-orange-600">{statistics.byType.parenteral}</p>
                                        <p className="text-sm text-muted-foreground">TNP</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5" />
                                        Acompanhamento da TN / Meta (kcal)
                                    </CardTitle>
                                    <CardDescription>
                                        Somatorio proporcional de NE infundida, NP infundida e calorias nao intencionais em relacao a meta
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={historyData} margin={{ top: 20, right: 20, left: 8, bottom: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis unit="%" domain={[0, 140]} />
                                            <Tooltip formatter={(value: number) => `${value}%`} />
                                            <Legend />
                                            <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="3 3" label="Meta" />
                                            <Bar dataKey="enteralPct" stackId="meta" fill="#0ea5e9" name="NE infundida em relacao a meta" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="parenteralPct" stackId="meta" fill="#f97316" name="NP infundida em relacao a meta" />
                                            <Bar dataKey="nonIntentionalPct" stackId="meta" fill="#16a34a" name="Kcal nao intencionais em relacao a meta" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Resumo no periodo</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="text-muted-foreground">Media de infusao</span>
                                            <span className="font-bold text-lg">{summary.avgPercentage}%</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="text-muted-foreground">Infusao {'>'}80% prescrito</span>
                                            <span className="font-bold text-lg text-green-600">{summary.daysOnGoal}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="text-muted-foreground">Infusao {'<'}80% prescrito</span>
                                            <span className="font-bold text-lg text-red-600">{summary.daysBelow}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Vias de Terapia Nutricional</CardTitle>
                                    <CardDescription>Pacientes-dia no periodo selecionado</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full bg-green-500" />
                                            <span className="flex-1">Dieta Oral</span>
                                            <span className="font-medium">{routeDistribution.oral} pacientes-dia</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full bg-purple-500" />
                                            <span className="flex-1">Terapia Nutricional Enteral</span>
                                            <span className="font-medium">{routeDistribution.enteral} pacientes-dia</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full bg-orange-500" />
                                            <span className="flex-1">Terapia Nutricional Parenteral</span>
                                            <span className="font-medium">{routeDistribution.parenteral} pacientes-dia</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default Reports;
