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
import { usePatients, usePrescriptions } from "@/hooks/useDatabase";
import { Patient } from "@/lib/database";

export default function PatientMonitoringPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get("patient");

    const { patients, updatePatient } = usePatients();
    const { prescriptions } = usePrescriptions();
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
            </div>
            <BottomNav />
        </div>
    );
}
