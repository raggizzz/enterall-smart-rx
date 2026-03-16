import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, AlertCircle, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { usePatients, usePrescriptions } from "@/hooks/useDatabase";

const OralMap = () => {
    const { patients, isLoading: patientsLoading } = usePatients();
    const { prescriptions, isLoading: prescriptionsLoading } = usePrescriptions();
    const [selectedClinic, setSelectedClinic] = useState<string>("all");

    const oralMapPatients = useMemo(() => {
        let filtered = patients.filter((patient) =>
            patient.status === 'active' &&
            (patient.nutritionType === 'oral' || patient.nutritionType === 'enteral' || patient.nutritionType === 'jejum')
        );

        if (selectedClinic !== "all") {
            filtered = filtered.filter((patient) => patient.ward === selectedClinic);
        }

        return [...filtered].sort((a, b) => {
            const bedA = (a.bed || "").toLowerCase();
            const bedB = (b.bed || "").toLowerCase();
            if (bedA !== bedB) return bedA.localeCompare(bedB);
            return a.name.localeCompare(b.name);
        });
    }, [patients, selectedClinic]);

    const wards = useMemo(() => {
        const uniqueWards = new Set<string>();
        patients.forEach((patient) => {
            if (patient.ward) uniqueWards.add(patient.ward);
        });
        return Array.from(uniqueWards).sort((a, b) => a.localeCompare(b));
    }, [patients]);

    const mapTitle = selectedClinic === "all" ? "Todos os setores" : selectedClinic;
    const printPatients = useMemo(
        () => oralMapPatients.filter((patient) => patient.nutritionType === "oral"),
        [oralMapPatients],
    );

    const getDietLabel = (nutritionType: string) => {
        if (nutritionType === 'oral') return 'Dieta Oral';
        if (nutritionType === 'enteral') return 'Enteral';
        if (nutritionType === 'jejum') return 'Jejum';
        return nutritionType;
    };

    const getDietBadgeClass = (nutritionType: string) => {
        if (nutritionType === 'oral') return 'bg-green-600';
        if (nutritionType === 'enteral') return 'bg-purple-600';
        if (nutritionType === 'jejum') return 'bg-red-600';
        return 'bg-slate-600';
    };

    const getDietCharacteristics = (nutritionType: string, observation?: string) => {
        if (nutritionType === 'oral') return observation || 'Não informado';
        if (nutritionType === 'enteral') return observation || 'Terapia enteral';
        if (nutritionType === 'jejum') return observation || 'Jejum';
        return observation || '-';
    };

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
                        <p className="text-muted-foreground">Resumo para distribuição de dietas e suplementos</p>
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
                            <p className="text-muted-foreground">Nenhum paciente no mapa da copa</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {oralMapPatients.map((patient) => {
                            // Find active enteral prescription for this patient if nutrition type is enteral
                            const activeEnteralPrescription = patient.nutritionType === 'enteral'
                                ? prescriptions.find(p => p.patientId === patient.id && p.therapyType === 'enteral' && p.status === 'active')
                                : null;

                            return (
                                <Card
                                    key={patient.id}
                                    className={`border-l-4 ${patient.nutritionType === 'oral'
                                        ? 'border-l-green-500'
                                        : patient.nutritionType === 'enteral'
                                            ? 'border-l-purple-500'
                                            : 'border-l-red-500'
                                        }`}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start gap-3">
                                            <div>
                                                <CardTitle className="text-lg">{patient.bed || 'Sem leito'}</CardTitle>
                                                <p className="text-sm font-medium text-muted-foreground">{patient.name}</p>
                                                <p className="text-xs text-muted-foreground">Prontuário: {patient.record}</p>
                                            </div>
                                            <Badge className={getDietBadgeClass(patient.nutritionType)}>
                                                {getDietLabel(patient.nutritionType)}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">Setor:</span> {patient.ward || '-'}
                                        </div>

                                        <div className="text-sm">
                                            <span className="text-muted-foreground">Nascimento:</span> {patient.dob ? new Date(patient.dob).toLocaleDateString('pt-BR') : '-'}
                                        </div>

                                        <div className="flex flex-col gap-1 text-sm bg-slate-50 p-2 rounded border border-slate-100">
                                            <p className="font-medium text-slate-800 border-b pb-1 mb-1">Informações de Dieta Oral</p>
                                            <div className="flex justify-between">
                                                <span><strong>Consistência:</strong> {patient.consistency || '-'}</span>
                                                <span><strong>Refeições:</strong> {patient.mealCount || '-'}</span>
                                            </div>
                                            <div>
                                                <strong>Consistência Segura:</strong> {patient.safeConsistency || '–'}
                                            </div>
                                            <div>
                                                <strong>Fono:</strong> {patient.safeConsistency ? 'Sim' : '-'}
                                            </div>
                                        </div>

                                        {activeEnteralPrescription && (
                                            <div className="flex flex-col gap-1 text-sm bg-purple-50 p-2 rounded border border-purple-100">
                                                <p className="font-medium text-purple-800 border-b border-purple-200 pb-1 mb-1">Terapia Nutricional Enteral</p>
                                                <div className="text-purple-700">
                                                    {activeEnteralPrescription.formulas?.map((f, i) => (
                                                        <span key={i} className="block">• {f.formulaName} - {f.volume}ml x {f.timesPerDay} {f.timesPerDay > 1 ? 'doses' : 'dose'}</span>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between mt-1 pt-1 border-t border-purple-100 text-purple-700">
                                                    <span><strong>Kcal:</strong> {activeEnteralPrescription.totalCalories}</span>
                                                    <span><strong>Ptn:</strong> {activeEnteralPrescription.totalProtein}g</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="text-sm bg-green-50 p-2 rounded border border-green-200">
                                            <p className="font-medium text-green-800">Características da dieta</p>
                                            <p className="text-green-700">{getDietCharacteristics(patient.nutritionType, patient.observation)}</p>
                                        </div>

                                        {patient.observation && patient.nutritionType !== 'oral' && (
                                            <div className="flex items-start gap-2 text-sm bg-yellow-50 p-2 rounded text-yellow-800">
                                                <AlertCircle className="h-4 w-4 mt-0.5 min-w-4" />
                                                <span>{patient.observation}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}

                <div className="flex gap-4 text-sm text-muted-foreground justify-center pt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded" />
                        <span>Dieta Oral</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-500 rounded" />
                        <span>Enteral</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded" />
                        <span>Jejum</span>
                    </div>
                </div>
            </div>

            <div className="hidden print:block p-4 text-black bg-white">
                <h1 className="text-xl font-bold mb-1">Mapa da Copa - Dietas e Suplementos</h1>
                <p className="text-sm mb-4">Setor: {mapTitle} | Total de pacientes (oral): {printPatients.length}</p>

                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            <th className="border border-black p-2 text-left">Leito</th>
                            <th className="border border-black p-2 text-left">Paciente</th>
                            <th className="border border-black p-2 text-left">Nascimento</th>
                            <th className="border border-black p-2 text-left">Via / Fórmulas</th>
                            <th className="border border-black p-2 text-left">Consistência</th>
                            <th className="border border-black p-2 text-left">Consist. Segura</th>
                            <th className="border border-black p-2 text-left">Características</th>
                        </tr>
                    </thead>
                    <tbody>
                        {printPatients.map((patient) => {
                            const activeEnteralPrescription = patient.nutritionType === 'enteral'
                                ? prescriptions.find(p => p.patientId === patient.id && p.therapyType === 'enteral' && p.status === 'active')
                                : null;

                            return (
                                <tr key={`print-${patient.id}`}>
                                    <td className="border border-black p-2">{patient.bed || '-'}</td>
                                    <td className="border border-black p-2">{patient.name}</td>
                                    <td className="border border-black p-2">{patient.dob ? new Date(patient.dob).toLocaleDateString('pt-BR') : '-'}</td>
                                    <td className="border border-black p-2">
                                        <div className="font-bold">{getDietLabel(patient.nutritionType)}</div>
                                        {activeEnteralPrescription && activeEnteralPrescription.formulas && (
                                            <div className="text-xs mt-1">
                                                {activeEnteralPrescription.formulas.map((f, i) => (
                                                    <div key={i}>• {f.formulaName} ({f.volume}ml x{f.timesPerDay})</div>
                                                ))}
                                                <div className="mt-1 font-medium">{activeEnteralPrescription.totalCalories} kcal | {activeEnteralPrescription.totalProtein}g ptn</div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="border border-black p-2">{patient.consistency || '-'} <br /> <span className="text-xs text-gray-500">Refeições: {patient.mealCount || '-'}</span></td>
                                    <td className="border border-black p-2">{patient.safeConsistency || '–'} <br /> <span className="text-xs text-gray-500">Fono: {patient.safeConsistency ? 'Sim' : '-'}</span></td>
                                    <td className="border border-black p-2">{getDietCharacteristics(patient.nutritionType, patient.observation)}</td>
                                </tr>
                            )
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
