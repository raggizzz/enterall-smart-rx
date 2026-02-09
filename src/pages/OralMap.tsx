import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Utensils, Droplet, AlertCircle, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { usePatients, useClinics } from "@/hooks/useDatabase";

const OralMap = () => {
    const { patients, isLoading: patientsLoading } = usePatients();
    const { clinics } = useClinics();

    const [selectedClinic, setSelectedClinic] = useState<string>("all");

    // Filtrar pacientes ativos com dieta oral
    const oralPatients = useMemo(() => {
        let filtered = patients.filter(p =>
            p.status === 'active' &&
            (p.nutritionType === 'oral' || p.nutritionType === 'enteral')
        );

        if (selectedClinic !== "all") {
            filtered = filtered.filter(p => p.ward === selectedClinic);
        }

        return filtered;
    }, [patients, selectedClinic]);

    const handlePrint = () => {
        window.print();
    };

    // Obter lista única de setores
    const wards = useMemo(() => {
        const uniqueWards = new Set<string>();
        patients.forEach(p => {
            if (p.ward) uniqueWards.add(p.ward);
        });
        return Array.from(uniqueWards);
    }, [patients]);

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />
            <div className="container py-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Mapa de Dieta Oral (Copa)</h1>
                        <p className="text-muted-foreground">Resumo para distribuição de dietas e suplementos</p>
                    </div>
                    <div className="flex gap-2">
                        <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filtrar por setor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os setores</SelectItem>
                                {wards.map(ward => (
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

                {patientsLoading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Carregando pacientes...</p>
                    </div>
                ) : oralPatients.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Nenhum paciente com dieta oral encontrado</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Cadastre pacientes na seção de Pacientes
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {oralPatients.map((patient) => (
                            <Card
                                key={patient.id}
                                className={`border-l-4 ${patient.nutritionType === 'jejum'
                                        ? "border-l-red-500"
                                        : patient.nutritionType === 'oral'
                                            ? "border-l-green-500"
                                            : "border-l-purple-500"
                                    }`}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg">{patient.bed || 'Sem leito'}</CardTitle>
                                            <p className="text-sm font-medium text-muted-foreground">{patient.name}</p>
                                            <p className="text-xs text-muted-foreground">Prontuário: {patient.record}</p>
                                        </div>
                                        <Badge variant={
                                            patient.nutritionType === 'jejum'
                                                ? "destructive"
                                                : patient.nutritionType === 'oral'
                                                    ? "default"
                                                    : "secondary"
                                        }>
                                            {patient.nutritionType === 'oral' ? 'Dieta Oral' :
                                                patient.nutritionType === 'enteral' ? 'Enteral' :
                                                    patient.nutritionType === 'jejum' ? 'Jejum' : patient.nutritionType}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">Setor:</span> {patient.ward || '-'}
                                    </div>

                                    {patient.weight && patient.height && (
                                        <div className="flex gap-4 text-sm">
                                            <span><strong>Peso:</strong> {patient.weight}kg</span>
                                            <span><strong>Altura:</strong> {patient.height}cm</span>
                                        </div>
                                    )}

                                    {patient.nutritionType === 'oral' && (
                                        <div className="text-sm bg-green-50 p-2 rounded border border-green-200">
                                            <p className="font-medium text-green-800">Caracteristicas da dieta</p>
                                            <p className="text-green-700">{patient.observation || 'Nao informado'}</p>
                                        </div>
                                    )}

                                    {patient.observation && patient.nutritionType !== 'oral' && (
                                        <div className="flex items-start gap-2 text-sm bg-yellow-50 p-2 rounded text-yellow-800">
                                            <AlertCircle className="h-4 w-4 mt-0.5" />
                                            <span>{patient.observation}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Legenda */}
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
            <BottomNav />
        </div>
    );
};

export default OralMap;
