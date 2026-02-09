/**
 * PatientMonitoringPage
 * Pagina para acompanhamento de terapia nutricional do paciente
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PatientMonitoring from "@/components/PatientMonitoring";
import { usePatients, usePrescriptions, useEvolutions } from "@/hooks/useDatabase";
import { Patient, Prescription } from "@/lib/database";
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

type ChartRow = {
    date: string;
    enteralPct: number;
    parenteralPct: number;
    nonIntentionalPct: number;
    totalPct: number;
};

const clampPercent = (value: number): number => Math.max(0, Math.min(value, 140));

const formatLabelDate = (isoDate: string): string => {
    const date = new Date(`${isoDate}T00:00:00`);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
};

const buildLastSevenDays = (): string[] => {
    const days: string[] = [];
    const today = new Date();

    for (let offset = 6; offset >= 0; offset -= 1) {
        const current = new Date(today);
        current.setDate(today.getDate() - offset);
        days.push(current.toISOString().split("T")[0]);
    }

    return days;
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

export default function PatientMonitoringPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get("patient");

    const { patients, updatePatient } = usePatients();
    const { prescriptions } = usePrescriptions();
    const { evolutions } = useEvolutions();
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    useEffect(() => {
        if (patientId && patients.length > 0) {
            const patient = patients.find((p) => p.id === patientId);
            if (patient) {
                setSelectedPatient(patient);
            }
        }
    }, [patientId, patients]);

    const totals = useMemo(() => {
        if (!selectedPatient?.id) {
            return {
                enteralKcal: 0,
                enteralProtein: 0,
                oralKcal: 0,
                oralProtein: 0,
                parenteralKcal: 0,
                parenteralProtein: 0,
            };
        }

        const patientPrescriptions = prescriptions.filter(
            (p) => p.patientId === selectedPatient.id && p.status === "active",
        );

        return patientPrescriptions.reduce(
            (acc, prescription) => {
                const kcal = prescription.totalCalories || 0;
                const protein = prescription.totalProtein || 0;

                if (prescription.therapyType === "enteral") {
                    acc.enteralKcal += kcal;
                    acc.enteralProtein += protein;
                }

                if (prescription.therapyType === "oral") {
                    acc.oralKcal += kcal;
                    acc.oralProtein += protein;
                }

                if (prescription.therapyType === "parenteral") {
                    acc.parenteralKcal += kcal;
                    acc.parenteralProtein += protein;
                }

                return acc;
            },
            {
                enteralKcal: 0,
                enteralProtein: 0,
                oralKcal: 0,
                oralProtein: 0,
                parenteralKcal: 0,
                parenteralProtein: 0,
            },
        );
    }, [selectedPatient, prescriptions]);

    const chartData = useMemo<ChartRow[]>(() => {
        const days = buildLastSevenDays();

        if (!selectedPatient?.id) {
            return days.map((day) => ({
                date: formatLabelDate(day),
                enteralPct: 0,
                parenteralPct: 0,
                nonIntentionalPct: 0,
                totalPct: 0,
            }));
        }

        const patientIdValue = selectedPatient.id;
        const patientUnintentionalKcal = calculateUnintentionalKcal(selectedPatient);

        return days.map((day) => {
            const evolutionOnDay = evolutions.find(
                (evolution) => evolution.patientId === patientIdValue && evolution.date === day,
            );

            const prescriptionsOnDay = prescriptions.filter(
                (prescription) =>
                    prescription.patientId === patientIdValue &&
                    prescription.status === "active" &&
                    isPrescriptionActiveOn(prescription, day),
            );

            const targetKcal = (() => {
                const enteralPrescription = prescriptionsOnDay.find(
                    (prescription) => prescription.therapyType === "enteral" && (prescription.totalCalories || 0) > 0,
                );
                if (enteralPrescription?.totalCalories) return enteralPrescription.totalCalories;

                const fallbackPrescription = prescriptionsOnDay.find(
                    (prescription) => (prescription.totalCalories || 0) > 0,
                );
                if (fallbackPrescription?.totalCalories) return fallbackPrescription.totalCalories;

                if (selectedPatient.weight) return selectedPatient.weight * 25;
                return 0;
            })();

            const parenteralKcal = prescriptionsOnDay
                .filter((prescription) => prescription.therapyType === "parenteral")
                .reduce((sum, prescription) => sum + (prescription.totalCalories || 0), 0);

            const enteralPct = clampPercent(evolutionOnDay?.metaReached || 0);
            const parenteralPct = targetKcal > 0 ? clampPercent((parenteralKcal / targetKcal) * 100) : 0;
            const nonIntentionalPct = targetKcal > 0 ? clampPercent((patientUnintentionalKcal / targetKcal) * 100) : 0;

            return {
                date: formatLabelDate(day),
                enteralPct: Number(enteralPct.toFixed(1)),
                parenteralPct: Number(parenteralPct.toFixed(1)),
                nonIntentionalPct: Number(nonIntentionalPct.toFixed(1)),
                totalPct: Number((enteralPct + parenteralPct + nonIntentionalPct).toFixed(1)),
            };
        });
    }, [selectedPatient, evolutions, prescriptions]);

    const handleSave = async (data: Partial<Patient>) => {
        if (selectedPatient?.id) {
            await updatePatient(selectedPatient.id, data);
            setSelectedPatient((prev) => (prev ? { ...prev, ...data } : null));
        }
    };

    if (!patientId) {
        return (
            <div className="min-h-screen bg-background pb-20">
                <Header />
                <div className="container py-6">
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground mb-4">Selecione um paciente para acompanhamento</p>
                            <Button onClick={() => navigate("/patients")}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Ir para Pacientes
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                <BottomNav />
            </div>
        );
    }

    if (!selectedPatient) {
        return (
            <div className="min-h-screen bg-background pb-20">
                <Header />
                <div className="container py-6">
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground">Carregando...</p>
                        </CardContent>
                    </Card>
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />
            <div className="container py-6 space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Acompanhamento da Terapia Nutricional</h1>
                        <p className="text-muted-foreground">
                            {selectedPatient.name} - Prontuario: {selectedPatient.record}
                        </p>
                    </div>
                </div>

                <PatientMonitoring
                    patient={selectedPatient}
                    onSave={handleSave}
                    enteralKcal={totals.enteralKcal}
                    enteralProtein={totals.enteralProtein}
                    oralKcal={totals.oralKcal}
                    oralProtein={totals.oralProtein}
                    parenteralKcal={totals.parenteralKcal}
                    parenteralProtein={totals.parenteralProtein}
                />

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Acompanhamento da TN / Meta (kcal)
                        </CardTitle>
                        <CardDescription>
                            Ultimos 7 dias: NE infundida + NP infundida + calorias nao intencionais em relacao a meta
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 8, bottom: 8 }}>
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
            </div>
            <BottomNav />
        </div>
    );
}
