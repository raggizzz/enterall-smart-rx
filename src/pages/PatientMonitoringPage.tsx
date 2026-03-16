/**
 * PatientMonitoringPage
 * Pagina para acompanhamento de terapia nutricional do paciente
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PatientMonitoring from "@/components/PatientMonitoring";
import { usePatients, usePrescriptions, useEvolutions } from "@/hooks/useDatabase";
import { DailyEvolution, Patient, Prescription } from "@/lib/database";

type ChartRow = {
    date: string;
    oralPct?: number;
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

const calculateUnintentionalKcal = (source?: { unintentionalCalories?: Patient["unintentionalCalories"]; nonIntentionalKcal?: number }): number => {
    if (typeof source?.nonIntentionalKcal === "number") return source.nonIntentionalKcal;

    const unintentional = source?.unintentionalCalories;
    if (!unintentional) return 0;

    const propofol = (unintentional.propofolMlH || 0) * 1.1 * 24;
    const glucose = (unintentional.glucoseGDay || 0) * 3.4;
    const citrate = (unintentional.citrateGDay || 0) * 3;

    return propofol + glucose + citrate;
};

const isPrescriptionActiveOn = (prescription: Prescription, day: string): boolean => {
    return prescription.startDate <= day && (!prescription.endDate || prescription.endDate >= day);
};

const getPreviousDay = (): string => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
};

const sortByMostRecentStartDate = (left: Prescription, right: Prescription): number => {
    return right.startDate.localeCompare(left.startDate);
};

const pickPrescriptionForType = (
    prescriptions: Prescription[],
    therapyType: Prescription["therapyType"],
    preferredId?: string,
): Prescription | undefined => {
    const candidates = prescriptions.filter((prescription) => prescription.therapyType === therapyType);
    if (preferredId) {
        const exactMatch = candidates.find((prescription) => prescription.id === preferredId);
        if (exactMatch) return exactMatch;
    }

    return [...candidates].sort(sortByMostRecentStartDate)[0];
};

export default function PatientMonitoringPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get("patient");

    const { patients, updatePatient } = usePatients();
    const { prescriptions } = usePrescriptions();
    const { evolutions, createEvolution, updateEvolution } = useEvolutions();
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

    const savedEvolution = useMemo(() => {
        if (!selectedPatient?.id) return undefined;

        const targetDate = getPreviousDay();
        return evolutions.find(
            (evolution) => evolution.patientId === selectedPatient.id && evolution.date === targetDate,
        );
    }, [selectedPatient, evolutions]);

    const chartData = useMemo<ChartRow[]>(() => {
        const days = buildLastSevenDays();

        if (!selectedPatient?.id) {
            return days.map((day) => ({
                date: formatLabelDate(day),
                oralPct: 0,
                enteralPct: 0,
                parenteralPct: 0,
                nonIntentionalPct: 0,
                totalPct: 0,
            }));
        }

        const patientIdValue = selectedPatient.id;
        return days.map((day) => {
            const evolutionOnDay = evolutions.find(
                (evolution) => evolution.patientId === patientIdValue && evolution.date === day,
            );

            const prescriptionsOnDay = prescriptions.filter(
                (prescription) =>
                    prescription.patientId === patientIdValue &&
                    isPrescriptionActiveOn(prescription, day),
            );

            const enteralPrescription = pickPrescriptionForType(
                prescriptionsOnDay,
                "enteral",
                evolutionOnDay?.prescriptionId,
            );
            const oralPrescription = pickPrescriptionForType(prescriptionsOnDay, "oral");
            const parenteralPrescription = pickPrescriptionForType(prescriptionsOnDay, "parenteral");

            const targetKcal = (() => {
                const tneGoal = selectedPatient.tneGoals?.targetKcalPerKg;
                if (tneGoal && selectedPatient.weight) return tneGoal * selectedPatient.weight;

                if (enteralPrescription?.totalCalories) return enteralPrescription.totalCalories;
                if (parenteralPrescription?.totalCalories) return parenteralPrescription.totalCalories;

                const fallbackPrescription = [...prescriptionsOnDay]
                    .sort(sortByMostRecentStartDate)
                    .find((prescription) => (prescription.totalCalories || 0) > 0);
                if (fallbackPrescription?.totalCalories) return fallbackPrescription.totalCalories;

                if (selectedPatient.weight) return selectedPatient.weight * 25;
                return 0;
            })();

            const oralKcal = evolutionOnDay?.oralKcal ?? oralPrescription?.totalCalories ?? 0;
            const enteralInfusedKcal = evolutionOnDay?.enteralKcal
                ?? (enteralPrescription?.totalCalories || 0) * ((evolutionOnDay?.metaReached || 0) / 100);
            const parenteralKcal = evolutionOnDay?.parenteralKcal ?? parenteralPrescription?.totalCalories ?? 0;
            const nonIntentionalKcal = calculateUnintentionalKcal(evolutionOnDay || selectedPatient);

            const oralPct = targetKcal > 0 ? clampPercent((oralKcal / targetKcal) * 100) : 0;
            const enteralPct = targetKcal > 0 ? clampPercent((enteralInfusedKcal / targetKcal) * 100) : 0;
            const parenteralPct = targetKcal > 0 ? clampPercent((parenteralKcal / targetKcal) * 100) : 0;
            const nonIntentionalPct = targetKcal > 0 ? clampPercent((nonIntentionalKcal / targetKcal) * 100) : 0;

            return {
                date: formatLabelDate(day),
                oralPct: Number(oralPct.toFixed(1)),
                enteralPct: Number(enteralPct.toFixed(1)),
                parenteralPct: Number(parenteralPct.toFixed(1)),
                nonIntentionalPct: Number(nonIntentionalPct.toFixed(1)),
                totalPct: Number((oralPct + enteralPct + parenteralPct + nonIntentionalPct).toFixed(1)),
            };
        });
    }, [selectedPatient, evolutions, prescriptions]);

    const handleSave = async (data: Partial<Patient> & Partial<DailyEvolution>) => {
        if (selectedPatient?.id) {
            const updatedPatient = { ...selectedPatient, ...data };
            const targetDate = getPreviousDay();
            const prescriptionsOnTargetDate = prescriptions.filter(
                (prescription) =>
                    prescription.patientId === selectedPatient.id &&
                    isPrescriptionActiveOn(prescription, targetDate),
            );
            const enteralPrescription = pickPrescriptionForType(prescriptionsOnTargetDate, "enteral");
            const referencePrescription = enteralPrescription || [...prescriptionsOnTargetDate].sort(sortByMostRecentStartDate)[0];
            const existingEvolution = evolutions.find(
                (evolution) =>
                    evolution.patientId === selectedPatient.id &&
                    evolution.date === targetDate &&
                    (!referencePrescription?.id || evolution.prescriptionId === referencePrescription.id),
            ) || evolutions.find(
                (evolution) => evolution.patientId === selectedPatient.id && evolution.date === targetDate,
            );

            await updatePatient(selectedPatient.id, {
                tneGoals: data.tneGoals,
                infusionPercentage24h: data.infusionPercentage24h,
                tneInterruptions: data.tneInterruptions,
                unintentionalCalories: data.unintentionalCalories,
                monitoringNotes: data.monitoringNotes,
                idealWeight: data.idealWeight,
            });

            const infusionPercentage = data.infusionPercentage24h ?? updatedPatient.infusionPercentage24h ?? 0;
            const prescribedVolume = enteralPrescription?.totalVolume || 0;
            const infusedVolume = prescribedVolume > 0
                ? Number(((prescribedVolume * infusionPercentage) / 100).toFixed(2))
                : 0;
            const enteralInfusedKcal = data.enteralKcal ?? ((enteralPrescription?.totalCalories || 0) * infusionPercentage) / 100;
            const enteralInfusedProtein = data.enteralProtein ?? ((enteralPrescription?.totalProtein || 0) * infusionPercentage) / 100;
            const sessionHospitalId = typeof window !== "undefined" ? localStorage.getItem("userHospitalId") || undefined : undefined;

            const evolutionPayload = {
                hospitalId: updatedPatient.hospitalId || sessionHospitalId,
                patientId: selectedPatient.id,
                prescriptionId: enteralPrescription?.id ?? referencePrescription?.id,
                professionalId: typeof window !== "undefined" ? localStorage.getItem("userProfessionalId") || undefined : undefined,
                date: targetDate,
                prescribedVolume,
                volumeInfused: infusedVolume,
                metaReached: infusionPercentage,
                proteinPrescribed: enteralPrescription?.totalProtein || 0,
                proteinInfused: enteralInfusedProtein,
                oralKcal: data.oralKcal ?? savedEvolution?.oralKcal ?? totals.oralKcal,
                oralProtein: data.oralProtein ?? savedEvolution?.oralProtein ?? totals.oralProtein,
                enteralKcal: enteralInfusedKcal,
                enteralProtein: enteralInfusedProtein,
                parenteralKcal: data.parenteralKcal ?? savedEvolution?.parenteralKcal ?? totals.parenteralKcal,
                parenteralProtein: data.parenteralProtein ?? savedEvolution?.parenteralProtein ?? totals.parenteralProtein,
                nonIntentionalKcal: data.nonIntentionalKcal ?? calculateUnintentionalKcal(updatedPatient),
                tneGoals: data.tneGoals ?? updatedPatient.tneGoals,
                tneInterruptions: data.tneInterruptions ?? updatedPatient.tneInterruptions,
                unintentionalCalories: data.unintentionalCalories ?? updatedPatient.unintentionalCalories,
                notes: data.monitoringNotes ?? updatedPatient.monitoringNotes,
            };

            if (existingEvolution?.id) {
                await updateEvolution(existingEvolution.id, evolutionPayload);
            } else {
                await createEvolution(evolutionPayload);
            }

            setSelectedPatient(updatedPatient);
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
            <div className="container px-4 py-6 space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Acompanhamento da Terapia Nutricional</h1>
                        <p className="text-muted-foreground">
                            {selectedPatient.name} - Prontuário: {selectedPatient.record}
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
                    historyData={chartData}
                    savedEvolution={savedEvolution}
                />
            </div>
            <BottomNav />
        </div>
    );
}
