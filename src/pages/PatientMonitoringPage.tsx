/**
 * PatientMonitoringPage
 * Página para acompanhamento de pacientes em TNE
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PatientMonitoring from "@/components/PatientMonitoring";
import { usePatients } from "@/hooks/useDatabase";
import { Patient } from "@/lib/database";

export default function PatientMonitoringPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patient');

    const { patients, updatePatient } = usePatients();
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    // Load patient
    useEffect(() => {
        if (patientId && patients.length > 0) {
            const patient = patients.find(p => p.id === patientId);
            if (patient) {
                setSelectedPatient(patient);
            }
        }
    }, [patientId, patients]);

    // Handle save
    const handleSave = async (data: Partial<Patient>) => {
        if (selectedPatient?.id) {
            await updatePatient(selectedPatient.id, data);
            // Refresh local state
            setSelectedPatient(prev => prev ? { ...prev, ...data } : null);
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
                            <Button onClick={() => navigate('/patients')}>
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

    // TODO: In real implementation, fetch prescription data from database
    // For now, using default values
    const enteralKcal = 0;
    const enteralProtein = 0;
    const oralKcal = 0;
    const oralProtein = 0;
    const parenteralKcal = 0;
    const parenteralProtein = 0;

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />
            <div className="container py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Acompanhamento TNE</h1>
                        <p className="text-muted-foreground">
                            {selectedPatient.name} - Prontuário: {selectedPatient.record}
                        </p>
                    </div>
                </div>

                {/* Patient Monitoring Component */}
                <PatientMonitoring
                    patient={selectedPatient}
                    onSave={handleSave}
                    enteralKcal={enteralKcal}
                    enteralProtein={enteralProtein}
                    oralKcal={oralKcal}
                    oralProtein={oralProtein}
                    parenteralKcal={parenteralKcal}
                    parenteralProtein={parenteralProtein}
                />
            </div>
            <BottomNav />
        </div>
    );
}
