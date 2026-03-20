import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { usePatients, usePrescriptions } from "@/hooks/useDatabase";

const OralMap = () => {
    const { patients, isLoading: patientsLoading } = usePatients();
    const { prescriptions, isLoading: prescriptionsLoading } = usePrescriptions();
    const [selectedClinic, setSelectedClinic] = useState<string>("all");

    const activeOralPrescriptionsByPatientId = useMemo(() => {
        const map = new Map<string, typeof prescriptions>();

        prescriptions
            .filter((prescription) => prescription.status === "active" && prescription.therapyType === "oral")
            .forEach((prescription) => {
                const current = map.get(prescription.patientId) || [];
                current.push(prescription);
                map.set(prescription.patientId, current);
            });

        return map;
    }, [prescriptions]);

    const oralMapPatients = useMemo(() => {
        let filtered = patients.filter((patient) => {
            if (patient.status !== "active") return false;

            const activeOralPrescriptions = activeOralPrescriptionsByPatientId.get(patient.id || "") || [];
            if (activeOralPrescriptions.length > 0) {
                return true;
            }

            return patient.nutritionType === "oral";
        });

        if (selectedClinic !== "all") {
            filtered = filtered.filter((patient) => patient.ward === selectedClinic);
        }

        return [...filtered].sort((a, b) => {
            const bedA = (a.bed || "").toLowerCase();
            const bedB = (b.bed || "").toLowerCase();
            if (bedA !== bedB) return bedA.localeCompare(bedB);
            return a.name.localeCompare(b.name);
        });
    }, [activeOralPrescriptionsByPatientId, patients, selectedClinic]);

    const wards = useMemo(() => {
        const uniqueWards = new Set<string>();
        patients.forEach((patient) => {
            if (patient.ward) uniqueWards.add(patient.ward);
        });
        return Array.from(uniqueWards).sort((a, b) => a.localeCompare(b));
    }, [patients]);

    const mapTitle = selectedClinic === "all" ? "Todos os setores" : selectedClinic;
    const printPatients = oralMapPatients;

    const getActiveOralPrescription = (patientId?: string) => {
        const activeOralPrescriptions = activeOralPrescriptionsByPatientId.get(patientId || "") || [];
        return activeOralPrescriptions[0] || null;
    };

    const getDietCharacteristics = (observation?: string) => observation || "Nao informado";

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-background pb-20 print:pb-0 print:bg-white">
            <div className="print:hidden">
                <Header />
            </div>

            <div className="container py-6 space-y-6 print:hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Mapa de Dieta Oral (Copa)</h1>
                        <p className="text-muted-foreground">Resumo para distribuicao de dietas orais e suplementos</p>
                    </div>
                    <div className="flex gap-2">
                        <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Filtrar por setor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os setores</SelectItem>
                                {wards.map((ward) => (
                                    <SelectItem key={ward} value={ward}>{ward}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handlePrint}>
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimir Mapa
                        </Button>
                    </div>
                </div>

                {patientsLoading || prescriptionsLoading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Carregando dados...</p>
                    </div>
                ) : oralMapPatients.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Nenhum paciente com dieta oral ou suplementos no mapa da copa</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {oralMapPatients.map((patient) => {
                            const activeOralPrescription = getActiveOralPrescription(patient.id);

                            return (
                                <Card key={patient.id} className="border-l-4 border-l-green-500">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start gap-3">
                                            <div>
                                                <CardTitle className="text-lg">{patient.bed || "Sem leito"}</CardTitle>
                                                <p className="text-sm font-medium text-muted-foreground">{patient.name}</p>
                                                <p className="text-xs text-muted-foreground">Prontuario: {patient.record}</p>
                                            </div>
                                            <Badge className="bg-green-600">Dieta oral / suplementos</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">Setor:</span> {patient.ward || "-"}
                                        </div>

                                        <div className="text-sm">
                                            <span className="text-muted-foreground">Nascimento:</span> {patient.dob ? new Date(patient.dob).toLocaleDateString("pt-BR") : "-"}
                                        </div>

                                        <div className="flex flex-col gap-1 text-sm bg-slate-50 p-2 rounded border border-slate-100">
                                            <p className="font-medium text-slate-800 border-b pb-1 mb-1">Informacoes de dieta oral</p>
                                            <div className="flex justify-between">
                                                <span><strong>Consistencia:</strong> {patient.consistency || "-"}</span>
                                                <span><strong>Refeicoes:</strong> {patient.mealCount || "-"}</span>
                                            </div>
                                            <div>
                                                <strong>Consistencia segura:</strong> {patient.safeConsistency || "-"}
                                            </div>
                                            <div>
                                                <strong>Fono:</strong> {patient.safeConsistency ? "Sim" : "-"}
                                            </div>
                                        </div>

                                        {activeOralPrescription && activeOralPrescription.formulas && activeOralPrescription.formulas.length > 0 && (
                                            <div className="flex flex-col gap-1 text-sm bg-emerald-50 p-2 rounded border border-emerald-100">
                                                <p className="font-medium text-emerald-800 border-b border-emerald-200 pb-1 mb-1">Suplementos / formulas via oral</p>
                                                <div className="text-emerald-700">
                                                    {activeOralPrescription.formulas.map((formula, index) => (
                                                        <span key={index} className="block">• {formula.formulaName} - {formula.volume}{formula.volume ? " mL" : ""} x {formula.timesPerDay} {formula.timesPerDay > 1 ? "ofertas" : "oferta"}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="text-sm bg-green-50 p-2 rounded border border-green-200">
                                            <p className="font-medium text-green-800">Caracteristicas da dieta</p>
                                            <p className="text-green-700">{getDietCharacteristics(patient.observation)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                <div className="flex gap-4 text-sm text-muted-foreground justify-center pt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded" />
                        <span>Dieta oral e suplementos</span>
                    </div>
                </div>
            </div>

            <div className="hidden print:block p-4 text-black bg-white">
                <h1 className="text-xl font-bold mb-1">Mapa da Copa - Dietas e Suplementos</h1>
                <p className="text-sm mb-4">Setor: {mapTitle} | Total de pacientes: {printPatients.length}</p>

                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            <th className="border border-black p-2 text-left">Leito</th>
                            <th className="border border-black p-2 text-left">Paciente</th>
                            <th className="border border-black p-2 text-left">Nascimento</th>
                            <th className="border border-black p-2 text-left">Suplementos / formulas</th>
                            <th className="border border-black p-2 text-left">Consistencia</th>
                            <th className="border border-black p-2 text-left">Consist. segura</th>
                            <th className="border border-black p-2 text-left">Caracteristicas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {printPatients.map((patient) => {
                            const activeOralPrescription = getActiveOralPrescription(patient.id);

                            return (
                                <tr key={`print-${patient.id}`}>
                                    <td className="border border-black p-2">{patient.bed || "-"}</td>
                                    <td className="border border-black p-2">{patient.name}</td>
                                    <td className="border border-black p-2">{patient.dob ? new Date(patient.dob).toLocaleDateString("pt-BR") : "-"}</td>
                                    <td className="border border-black p-2">
                                        <div className="font-bold">Dieta oral / suplementos</div>
                                        {activeOralPrescription && activeOralPrescription.formulas && activeOralPrescription.formulas.length > 0 && (
                                            <div className="text-xs mt-1">
                                                {activeOralPrescription.formulas.map((formula, index) => (
                                                    <div key={index}>• {formula.formulaName} ({formula.volume} mL x{formula.timesPerDay})</div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="border border-black p-2">{patient.consistency || "-"} <br /> <span className="text-xs text-gray-500">Refeicoes: {patient.mealCount || "-"}</span></td>
                                    <td className="border border-black p-2">{patient.safeConsistency || "-"} <br /> <span className="text-xs text-gray-500">Fono: {patient.safeConsistency ? "Sim" : "-"}</span></td>
                                    <td className="border border-black p-2">{getDietCharacteristics(patient.observation)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="print:hidden">
                <BottomNav />
            </div>
        </div>
    );
};

export default OralMap;
