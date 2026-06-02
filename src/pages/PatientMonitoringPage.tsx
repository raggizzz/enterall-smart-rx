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
import {
    calculateUnintentionalCaloriesBreakdown,
    clampPercent,
    resolveTargetKcalForDay,
} from "@/lib/monitoringCalculations";
import { getLocalDateKey, getPreviousLocalDateKey } from "@/lib/dateOnly";

type ChartRow = {
    date: string;
    oralPct?: number;
    enteralPct: number;
    parenteralPct: number;
    nonIntentionalPct: number;
    totalPct: number;
};

const formatLabelDate = (isoDate: string): string => {
    const date = new Date(`${isoDate}T00:00:00`);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
};

const buildLastSevenDays = (): string[] => {
    const days: string[] = [];
    const lastCompletedDay = new Date();
    lastCompletedDay.setDate(lastCompletedDay.getDate() - 1);

    for (let offset = 6; offset >= 0; offset -= 1) {
        const current = new Date(lastCompletedDay);
        current.setDate(lastCompletedDay.getDate() - offset);
        days.push(getLocalDateKey(current));
    }

    return days;
};

const isPrescriptionActiveOn = (prescription: Prescription, day: string): boolean => {
    return prescription.startDate <= day && (!prescription.endDate || prescription.endDate >= day);
};

const sortByMostRecentStartDate = (left: Prescription, right: Prescription): number => {
    return (
        right.startDate.localeCompare(left.startDate) ||
        right.createdAt.localeCompare(left.createdAt)
    );
};

const getEvolutionTimestamp = (evolution: DailyEvolution): number => {
    const value = evolution.updatedAt || evolution.createdAt || evolution.date;
    const timestamp = value ? new Date(value).getTime() : 0;
    return Number.isFinite(timestamp) ? timestamp : 0;
};

const pickLatestEvolutionForDate = (
    evolutions: DailyEvolution[],
    patientId: string,
    date: string,
): DailyEvolution | undefined => {
    return evolutions
        .filter((evolution) => evolution.patientId === patientId && evolution.date === date)
        .sort((left, right) => getEvolutionTimestamp(right) - getEvolutionTimestamp(left))[0];
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
                enteralCarbs: 0,
                enteralFat: 0,
                enteralFiber: 0,
                oralKcal: 0,
                oralProtein: 0,
                oralCarbs: 0,
                oralFat: 0,
                oralFiber: 0,
                parenteralKcal: 0,
                parenteralProtein: 0,
                parenteralCarbs: 0,
                parenteralFat: 0,
                parenteralFiber: 0,
            };
        }

        const targetDate = getPreviousLocalDateKey();
        const prescriptionsOnTargetDate = prescriptions.filter(
            (prescription) =>
                prescription.patientId === selectedPatient.id &&
                isPrescriptionActiveOn(prescription, targetDate),
        );
        const patientPrescriptions = [
            pickPrescriptionForType(prescriptionsOnTargetDate, "enteral"),
            pickPrescriptionForType(prescriptionsOnTargetDate, "oral"),
            pickPrescriptionForType(prescriptionsOnTargetDate, "parenteral"),
        ].filter((prescription): prescription is NonNullable<typeof prescription> => Boolean(prescription));

        return patientPrescriptions.reduce(
            (acc, prescription) => {
                const kcal = prescription.totalCalories || 0;
                const protein = prescription.totalProtein || 0;
                const carbs = prescription.totalCarbs || 0;
                const fat = prescription.totalFat || 0;
                const fiber = prescription.totalFiber || 0;

                if (prescription.therapyType === "enteral") {
                    acc.enteralKcal += kcal;
                    acc.enteralProtein += protein;
                    acc.enteralCarbs += carbs;
                    acc.enteralFat += fat;
                    acc.enteralFiber += fiber;
                }

                if (prescription.therapyType === "oral") {
                    acc.oralKcal += kcal;
                    acc.oralProtein += protein;
                    acc.oralCarbs += carbs;
                    acc.oralFat += fat;
                    acc.oralFiber += fiber;
                }

                if (prescription.therapyType === "parenteral") {
                    acc.parenteralKcal += kcal;
                    acc.parenteralProtein += protein;
                    acc.parenteralCarbs += carbs;
                    acc.parenteralFat += fat;
                    acc.parenteralFiber += fiber;
                }

                return acc;
            },
            {
                enteralKcal: 0,
                enteralProtein: 0,
                enteralCarbs: 0,
                enteralFat: 0,
                enteralFiber: 0,
                oralKcal: 0,
                oralProtein: 0,
                oralCarbs: 0,
                oralFat: 0,
                oralFiber: 0,
                parenteralKcal: 0,
                parenteralProtein: 0,
                parenteralCarbs: 0,
                parenteralFat: 0,
                parenteralFiber: 0,
            },
        );
    }, [selectedPatient, prescriptions]);

    const savedEvolution = useMemo(() => {
        if (!selectedPatient?.id) return undefined;

        const targetDate = getPreviousLocalDateKey();
        return pickLatestEvolutionForDate(evolutions, selectedPatient.id, targetDate);
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
            const evolutionOnDay = pickLatestEvolutionForDate(evolutions, patientIdValue, day);

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
            const targetKcal = resolveTargetKcalForDay({
                patient: selectedPatient,
                evolution: evolutionOnDay,
                prescriptionsOnDay,
            });

            const oralKcal = evolutionOnDay?.oralKcal ?? 0;
            const enteralInfusedKcal = evolutionOnDay?.enteralKcal
                ?? (enteralPrescription?.totalCalories || 0) * ((evolutionOnDay?.metaReached || 0) / 100);
            const parenteralKcal = evolutionOnDay?.parenteralKcal ?? 0;
            const nonIntentionalKcal = evolutionOnDay
                ? calculateUnintentionalCaloriesBreakdown(evolutionOnDay).total
                : 0;

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
            const targetDate = getPreviousLocalDateKey();
            const prescriptionsOnTargetDate = prescriptions.filter(
                (prescription) =>
                    prescription.patientId === selectedPatient.id &&
                    isPrescriptionActiveOn(prescription, targetDate),
            );
            const enteralPrescription = pickPrescriptionForType(prescriptionsOnTargetDate, "enteral");
            const existingEvolution = pickLatestEvolutionForDate(evolutions, selectedPatient.id, targetDate);

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
                prescriptionId: enteralPrescription?.id,
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
                nonIntentionalKcal: data.nonIntentionalKcal ?? calculateUnintentionalCaloriesBreakdown(updatedPatient).total,
                tneGoals: data.tneGoals ?? updatedPatient.tneGoals,
                tneInterruptions: data.tneInterruptions ?? updatedPatient.tneInterruptions,
                unintentionalCalories: data.unintentionalCalories ?? updatedPatient.unintentionalCalories,
                weight: data.weight ?? updatedPatient.weight,
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
                    enteralCarbs={totals.enteralCarbs}
                    enteralFat={totals.enteralFat}
                    enteralFiber={totals.enteralFiber}
                    oralKcal={totals.oralKcal}
                    oralProtein={totals.oralProtein}
                    oralCarbs={totals.oralCarbs}
                    oralFat={totals.oralFat}
                    oralFiber={totals.oralFiber}
                    parenteralKcal={totals.parenteralKcal}
                    parenteralProtein={totals.parenteralProtein}
                    parenteralCarbs={totals.parenteralCarbs}
                    parenteralFat={totals.parenteralFat}
                    parenteralFiber={totals.parenteralFiber}
                    historyData={chartData}
                    savedEvolution={savedEvolution}
                    monitoringDate={getPreviousLocalDateKey()}
                />
            </div>
            <BottomNav />
        </div>
    );
}
