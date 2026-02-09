/**
 * ParenteralTherapy Page
 * Pagina para prescricao de Terapia Nutricional Parenteral
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Syringe,
    Calculator,
    ArrowLeft,
    Save,
    AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Patient } from "@/lib/database";
import { usePatients } from "@/hooks/useDatabase";

export default function ParenteralTherapyPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patient');

    const { patients } = usePatients();
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    // Form state
    const [access, setAccess] = useState<'central' | 'peripheral' | 'picc'>('central');
    const [infusionTime, setInfusionTime] = useState<number>(24);
    const [vetKcal, setVetKcal] = useState<number>(0);
    const [aminoacidsG, setAminoacidsG] = useState<number>(0);
    const [lipidsG, setLipidsG] = useState<number>(0);
    const [glucoseG, setGlucoseG] = useState<number>(0);
    const [observations, setObservations] = useState('');


    // VET automatico conforme gramas dos macronutrientes
    useEffect(() => {
        const nextVet = (aminoacidsG * 4) + (lipidsG * 9) + (glucoseG * 3.4);
        setVetKcal(nextVet);
    }, [aminoacidsG, lipidsG, glucoseG]);
    // Load patient
    useEffect(() => {
        if (patientId && patients.length > 0) {
            const patient = patients.find(p => p.id === patientId);
            if (patient) {
                setSelectedPatient(patient);
            }
        }
    }, [patientId, patients]);

    // Calculate per kg values
    const perKgValues = useMemo(() => {
        const weight = selectedPatient?.weight || 0;
        if (!weight) return { kcal: 0, aminoacids: 0, lipids: 0, glucose: 0 };

        return {
            kcal: vetKcal / weight,
            aminoacids: aminoacidsG / weight,
            lipids: lipidsG / weight,
            glucose: glucoseG / weight,
        };
    }, [vetKcal, aminoacidsG, lipidsG, glucoseG, selectedPatient?.weight]);

    const handleSave = async () => {
        if (!selectedPatient) {
            toast.error("Selecione um paciente");
            return;
        }

        toast.success("Prescricao de nutricao parenteral salva!");
        navigate('/patients');
    };

    if (!patientId) {
        return (
            <div className="min-h-screen bg-background pb-20">
                <Header />
                <div className="container py-6">
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground mb-4">Selecione um paciente para prescrever nutricao parenteral</p>
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
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Syringe className="h-6 w-6" />
                            Terapia Nutricional Parenteral
                        </h1>
                        <p className="text-muted-foreground">
                            {selectedPatient?.name} - Prontuario: {selectedPatient?.record}
                            {selectedPatient?.weight && ` - Peso: ${selectedPatient.weight}kg`}
                        </p>
                    </div>
                </div>

                {/* Resumo - Sempre Visivel */}
                <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-violet-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                            <Calculator className="h-5 w-5" />
                            Resumo da Prescricao
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <div className="text-2xl font-bold text-purple-600">
                                    {vetKcal.toFixed(0)}
                                </div>
                                <div className="text-xs text-muted-foreground">kcal/dia</div>
                                {perKgValues.kcal > 0 && (
                                    <div className="text-sm font-semibold text-purple-700">
                                        {perKgValues.kcal.toFixed(1)} kcal/kg
                                    </div>
                                )}
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <div className="text-2xl font-bold text-blue-600">
                                    {aminoacidsG.toFixed(1)}
                                </div>
                                <div className="text-xs text-muted-foreground">g aminoacidos/dia</div>
                                {perKgValues.aminoacids > 0 && (
                                    <div className="text-sm font-semibold text-blue-700">
                                        {perKgValues.aminoacids.toFixed(2)} g/kg
                                    </div>
                                )}
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <div className="text-2xl font-bold text-amber-600">
                                    {lipidsG.toFixed(1)}
                                </div>
                                <div className="text-xs text-muted-foreground">g lipideos/dia</div>
                                {perKgValues.lipids > 0 && (
                                    <div className="text-sm font-semibold text-amber-700">
                                        {perKgValues.lipids.toFixed(2)} g/kg
                                    </div>
                                )}
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <div className="text-2xl font-bold text-green-600">
                                    {glucoseG.toFixed(1)}
                                </div>
                                <div className="text-xs text-muted-foreground">g glicose/dia</div>
                                {perKgValues.glucose > 0 && (
                                    <div className="text-sm font-semibold text-green-700">
                                        {perKgValues.glucose.toFixed(2)} g/kg
                                    </div>
                                )}
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* Acesso */}
                <Card>
                    <CardHeader>
                        <CardTitle>Acesso Venoso</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={access}
                            onValueChange={(val) => setAccess(val as typeof access)}
                            className="flex flex-wrap gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="central" id="central" />
                                <Label htmlFor="central" className="cursor-pointer">
                                    <Badge variant="default">Central</Badge>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="peripheral" id="peripheral" />
                                <Label htmlFor="peripheral" className="cursor-pointer">
                                    <Badge variant="secondary">Periferico</Badge>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="picc" id="picc" />
                                <Label htmlFor="picc" className="cursor-pointer">
                                    <Badge variant="outline">PICC</Badge>
                                </Label>
                            </div>
                        </RadioGroup>

                        {access === 'peripheral' && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-center gap-2 text-amber-700">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                        Atencao: Acesso periferico limita osmolaridade da solucao
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tempo de Infusao */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tempo de Infusao da Bolsa</CardTitle>
                        <CardDescription>
                            Defina o tempo total de infusao da bolsa
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <Input
                                type="number"
                                min="1"
                                max="24"
                                value={infusionTime}
                                onChange={(e) => setInfusionTime(parseInt(e.target.value) || 24)}
                                className="w-24"
                            />
                            <span className="text-lg">horas</span>
                            {infusionTime === 24 && (
                                <Badge variant="secondary">Infusao continua</Badge>
                            )}
                            {infusionTime < 24 && infusionTime > 0 && (
                                <Badge variant="outline">Infusao ciclica</Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Composicao */}
                <Card>
                    <CardHeader>
                        <CardTitle>Composicao da NP</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>VET (kcal/dia)</Label>
                                <Input
                                    type="number"
                                    value={vetKcal ? vetKcal.toFixed(0) : ''}
                                    readOnly
                                    placeholder="Calculado automaticamente"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Calculo automatico: aminoacidos x 4 + lipideos x 9 + glicose x 3.4
                                </p>
                                {selectedPatient?.weight && (
                                    <p className="text-xs text-muted-foreground">
                                        = {perKgValues.kcal.toFixed(1)} kcal/kg
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Aminoacidos (g/dia)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={aminoacidsG || ''}
                                    onChange={(e) => setAminoacidsG(parseFloat(e.target.value) || 0)}
                                    placeholder="Ex: 80"
                                />
                                {selectedPatient?.weight && (
                                    <p className="text-xs text-muted-foreground">
                                        = {perKgValues.aminoacids.toFixed(2)} g/kg
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Lipideos (g/dia)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={lipidsG || ''}
                                    onChange={(e) => setLipidsG(parseFloat(e.target.value) || 0)}
                                    placeholder="Ex: 60"
                                />
                                {selectedPatient?.weight && (
                                    <p className="text-xs text-muted-foreground">
                                        = {perKgValues.lipids.toFixed(2)} g/kg
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Glicose (g/dia)</Label>
                                <Input
                                    type="number"
                                    step="1"
                                    value={glucoseG || ''}
                                    onChange={(e) => setGlucoseG(parseFloat(e.target.value) || 0)}
                                    placeholder="Ex: 200"
                                />
                                {selectedPatient?.weight && (
                                    <p className="text-xs text-muted-foreground">
                                        = {perKgValues.glucose.toFixed(2)} g/kg
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Observacoes */}
                <Card>
                    <CardHeader>
                        <CardTitle>Observacoes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            placeholder="Anotacoes sobre a prescricao parenteral..."
                            rows={4}
                        />
                    </CardContent>
                </Card>

                {/* Salvar */}
                <Button
                    onClick={handleSave}
                    className="w-full"
                    size="lg"
                >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Prescricao Parenteral
                </Button>
            </div>
            <BottomNav />
        </div>
    );
}

