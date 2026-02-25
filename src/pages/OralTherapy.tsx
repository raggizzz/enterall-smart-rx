/**
 * OralTherapy Page
 * Pagina para prescricao de Dieta Oral / Terapia Nutricional Via Oral
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    UtensilsCrossed,
    Mic,
    Plus,
    Trash2,
    Save,
    Calculator,
    ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import {
    OralSupplementSchedule,
    OralModuleSchedule,
    Patient
} from "@/lib/database";
import { usePatients, useFormulas, useModules, usePrescriptions } from "@/hooks/useDatabase";

const MEAL_SCHEDULES = [
    { key: 'breakfast', label: 'Desjejum' },
    { key: 'midMorning', label: 'Colação' },
    { key: 'lunch', label: 'Almoço' },
    { key: 'afternoon', label: 'Merenda' },
    { key: 'dinner', label: 'Jantar' },
    { key: 'supper', label: 'Ceia' },
];

const MEAL_TIME_MAP: Record<string, string> = {
    breakfast: "06:00",
    midMorning: "09:00",
    lunch: "12:00",
    afternoon: "15:00",
    dinner: "18:00",
    supper: "21:00",
};

export default function OralTherapyPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patient');

    const { patients, updatePatient } = usePatients();
    const { formulas } = useFormulas();
    const { modules } = useModules();
    const { prescriptions, createPrescription, updatePrescription } = usePrescriptions();

    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [dietConsistency, setDietConsistency] = useState('');
    const [dietCharacteristics, setDietCharacteristics] = useState('');
    const [mealsPerDay, setMealsPerDay] = useState<number>(6);

    // Fonoaudiologia
    const [speechTherapy, setSpeechTherapy] = useState(false);
    const [needsThickener, setNeedsThickener] = useState(false);
    const [safeConsistency, setSafeConsistency] = useState('');

    // Estimativas
    const [estimatedVET, setEstimatedVET] = useState<number>(0);
    const [estimatedProtein, setEstimatedProtein] = useState<number>(0);

    // Terapia nutricional oral
    const [hasOralTherapy, setHasOralTherapy] = useState(false);
    const [supplements, setSupplements] = useState<OralSupplementSchedule[]>([]);
    const [oralModules, setOralModules] = useState<OralModuleSchedule[]>([]);
    const [observations, setObservations] = useState('');

    // Load patient
    useEffect(() => {
        if (patientId && patients.length > 0) {
            const patient = patients.find(p => p.id === patientId);
            if (patient) {
                setSelectedPatient(patient);
            }
        }
    }, [patientId, patients]);

    // Get oral supplements (formulas marked as supplements)
    const availableSupplements = useMemo(() => {
        return formulas.filter(f =>
            f.type === 'standard' ||
            f.type === 'high-protein' ||
            f.type === 'high-calorie' ||
            f.type === 'oral-supplement' ||
            f.type === 'infant-formula'
        );
    }, [formulas]);

    // Calculate totals from supplements and modules
    const oralTotals = useMemo(() => {
        let kcal = estimatedVET;
        let protein = estimatedProtein;

        supplements.forEach(sup => {
            const formula = formulas.find(f => f.id === sup.supplementId);
            if (!formula) return;

            // Count selected meals
            const timesPerDay = Object.values(sup.schedules).filter(v => v === true).length;
            const volumePerServing = sup.amount || 200;
            const factor = (volumePerServing * timesPerDay) / 100;

            kcal += (formula.caloriesPerUnit || 0) * factor;
            protein += (formula.proteinPerUnit || 0) * factor;
        });

        oralModules.forEach(om => {
            const module = modules.find(m => m.id === om.moduleId);
            if (!module) return;

            const timesPerDay = Object.values(om.schedules).filter(v => v === true).length;
            const amount = om.amount || module.referenceAmount || 1;
            const factor = module.referenceAmount ? (amount / module.referenceAmount) : amount;

            kcal += (module.calories || 0) * timesPerDay * factor;
            protein += (module.protein || 0) * timesPerDay * factor;
        });

        return {
            kcal,
            protein,
            kcalPerKg: selectedPatient?.weight ? kcal / selectedPatient.weight : 0,
            proteinPerKg: selectedPatient?.weight ? protein / selectedPatient.weight : 0,
        };
    }, [estimatedVET, estimatedProtein, supplements, oralModules, formulas, modules, selectedPatient]);

    // Add supplement
    const addSupplement = () => {
        if (supplements.length >= 3) {
            toast.error("Maximo de 3 suplementos");
            return;
        }
        setSupplements([
            ...supplements,
            { supplementId: '', supplementName: '', amount: 200, unit: 'ml', schedules: {} }
        ]);
    };

    // Remove supplement
    const removeSupplement = (index: number) => {
        setSupplements(supplements.filter((_, i) => i !== index));
    };

    // Update supplement
    const updateSupplement = (index: number, field: string, value: any) => {
        const updated = [...supplements];
        if (field === 'supplementId') {
            const formula = formulas.find(f => f.id === value);
            updated[index] = {
                ...updated[index],
                supplementId: value,
                supplementName: formula?.name || ''
            };
        } else if (field === 'amount') {
            updated[index] = {
                ...updated[index],
                amount: value ? parseFloat(value) : undefined
            };
        } else if (field === 'unit') {
            updated[index] = {
                ...updated[index],
                unit: value
            };
        } else if (field.startsWith('schedule_')) {
            const scheduleKey = field.replace('schedule_', '');
            updated[index] = {
                ...updated[index],
                schedules: {
                    ...updated[index].schedules,
                    [scheduleKey]: value
                }
            };
        } else if (field === 'other') {
            updated[index] = {
                ...updated[index],
                schedules: {
                    ...updated[index].schedules,
                    other: value
                }
            };
        }
        setSupplements(updated);
    };

    // Add module
    const addModule = () => {
        if (oralModules.length >= 3) {
            toast.error("Maximo de 3 modulos");
            return;
        }
        setOralModules([
            ...oralModules,
            { moduleId: '', moduleName: '', amount: 1, unit: 'g', schedules: {} }
        ]);
    };

    // Remove module
    const removeModule = (index: number) => {
        setOralModules(oralModules.filter((_, i) => i !== index));
    };

    // Update module
    const updateModule = (index: number, field: string, value: any) => {
        const updated = [...oralModules];
        if (field === 'moduleId') {
            const module = modules.find(m => m.id === value);
            updated[index] = {
                ...updated[index],
                moduleId: value,
                moduleName: module?.name || ''
            };
        } else if (field === 'amount') {
            updated[index] = {
                ...updated[index],
                amount: value ? parseFloat(value) : undefined
            };
        } else if (field === 'unit') {
            updated[index] = {
                ...updated[index],
                unit: value
            };
        } else if (field.startsWith('schedule_')) {
            const scheduleKey = field.replace('schedule_', '');
            updated[index] = {
                ...updated[index],
                schedules: {
                    ...updated[index].schedules,
                    [scheduleKey]: value
                }
            };
        } else if (field === 'other') {
            updated[index] = {
                ...updated[index],
                schedules: {
                    ...updated[index].schedules,
                    other: value
                }
            };
        }
        setOralModules(updated);
    };

    const resolveScheduleTimes = (schedules: Record<string, unknown> | undefined): string[] => {
        if (!schedules) return [];

        const times = new Set<string>();
        Object.entries(MEAL_TIME_MAP).forEach(([mealKey, time]) => {
            if (schedules[mealKey] === true) {
                times.add(time);
            }
        });

        if (typeof schedules.other === "string" && schedules.other.trim().length > 0) {
            times.add(schedules.other.trim());
        }

        return Array.from(times).sort();
    };

    const handleSave = async () => {
        if (!selectedPatient) {
            toast.error("Selecione um paciente");
            return;
        }
        if (!selectedPatient.id) {
            toast.error("Paciente sem identificador");
            return;
        }

        const sessionHospitalId = typeof window !== "undefined" ? localStorage.getItem("userHospitalId") || undefined : undefined;
        const sessionProfessionalId = typeof window !== "undefined" ? localStorage.getItem("userProfessionalId") || undefined : undefined;
        const resolvedHospitalId = selectedPatient.hospitalId || sessionHospitalId;

        if (!resolvedHospitalId) {
            toast.error("Hospital da sessão não identificado. Refaça o login.");
            return;
        }

        const supplementItems = supplements
            .filter((supplement) => supplement.supplementId)
            .map((supplement) => {
                const selectedFormula = formulas.find((formula) => formula.id === supplement.supplementId);
                const schedules = resolveScheduleTimes(supplement.schedules as unknown as Record<string, unknown>);
                return {
                    formulaId: supplement.supplementId,
                    formulaName: selectedFormula?.name || supplement.supplementName || "Suplemento oral",
                    volume: supplement.amount || 0,
                    timesPerDay: schedules.length,
                    schedules,
                };
            });

        const oralModuleItems = oralModules
            .filter((moduleItem) => moduleItem.moduleId)
            .map((moduleItem) => {
                const selectedModule = modules.find((module) => module.id === moduleItem.moduleId);
                const schedules = resolveScheduleTimes(moduleItem.schedules as unknown as Record<string, unknown>);
                return {
                    moduleId: moduleItem.moduleId,
                    moduleName: selectedModule?.name || moduleItem.moduleName || "Modulo oral",
                    amount: moduleItem.amount || 0,
                    unit: moduleItem.unit || "g",
                    timesPerDay: schedules.length,
                    schedules,
                };
            });

        const notesParts = [
            dietConsistency ? `Consistencia: ${dietConsistency}` : "",
            dietCharacteristics ? `Caracteristicas: ${dietCharacteristics}` : "",
            `Refeicoes/dia: ${mealsPerDay}`,
            speechTherapy ? "Acompanhamento fonoaudiologico: sim" : "Acompanhamento fonoaudiologico: nao",
            speechTherapy && needsThickener ? `Água com espessante: sim (${safeConsistency || "consistência não informada"})` : "",
            speechTherapy && !needsThickener ? "Agua com espessante: nao" : "",
            observations ? `Observacoes: ${observations}` : "",
        ].filter(Boolean);

        const prescriptionPayload = {
            hospitalId: resolvedHospitalId,
            professionalId: sessionProfessionalId,
            patientId: selectedPatient.id,
            patientName: selectedPatient.name,
            patientRecord: selectedPatient.record,
            patientBed: selectedPatient.bed,
            patientWard: selectedPatient.ward,
            therapyType: "oral" as const,
            systemType: "open" as const,
            feedingRoute: "Oral",
            formulas: supplementItems,
            modules: oralModuleItems,
            totalCalories: Math.round(oralTotals.kcal),
            totalProtein: Math.round(oralTotals.protein * 10) / 10,
            status: "active" as const,
            startDate: new Date().toISOString().split("T")[0],
            notes: notesParts.join(" | "),
        };

        setIsSaving(true);
        try {
            const activeOralPrescription = prescriptions.find(
                (prescription) =>
                    prescription.patientId === selectedPatient.id &&
                    prescription.therapyType === "oral" &&
                    prescription.status === "active"
            );

            if (activeOralPrescription?.id) {
                await updatePrescription(activeOralPrescription.id, prescriptionPayload);
            } else {
                await createPrescription(prescriptionPayload);
            }

            await updatePatient(selectedPatient.id, {
                nutritionType: "oral",
                observation: dietCharacteristics || observations || selectedPatient.observation,
            });

            toast.success("Prescricao de dieta oral salva!");
            navigate("/patients");
        } catch (error) {
            console.error("Erro ao salvar dieta oral:", error);
            toast.error("Erro ao salvar dieta oral");
        } finally {
            setIsSaving(false);
        }
    };

    if (!patientId) {
        return (
            <div className="min-h-screen bg-background pb-20">
                <Header />
                <div className="container py-6">
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground mb-4">Selecione um paciente para prescrever dieta oral</p>
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
                        <h1 className="text-2xl font-bold">Dieta Oral / TNO</h1>
                        <p className="text-muted-foreground">
                            {selectedPatient?.name} - Prontuario: {selectedPatient?.record}
                        </p>
                    </div>
                </div>

                {/* Total Via Oral - Sempre Visivel */}
                <Card className="border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-orange-700">
                            <Calculator className="h-5 w-5" />
                            Total Ofertado Via Oral
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                <div className="text-3xl font-bold text-orange-600">
                                    {oralTotals.kcal.toFixed(0)}
                                </div>
                                <div className="text-sm text-muted-foreground">kcal/dia</div>
                                {oralTotals.kcalPerKg > 0 && (
                                    <div className="text-lg font-semibold text-orange-700 mt-1">
                                        {oralTotals.kcalPerKg.toFixed(1)} kcal/kg
                                    </div>
                                )}
                            </div>
                            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                <div className="text-3xl font-bold text-blue-600">
                                    {oralTotals.protein.toFixed(1)}
                                </div>
                                <div className="text-sm text-muted-foreground">g proteinas/dia</div>
                                {oralTotals.proteinPerKg > 0 && (
                                    <div className="text-lg font-semibold text-blue-700 mt-1">
                                        {oralTotals.proteinPerKg.toFixed(2)} g/kg
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Dados da Dieta */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UtensilsCrossed className="h-5 w-5" />
                            Dados da Dieta Oral
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Consistencia da dieta</Label>
                                <Input
                                    value={dietConsistency}
                                    onChange={(e) => setDietConsistency(e.target.value)}
                                    placeholder="Ex: Branda, Pastosa, Liquida"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Quantidade de refeicoes por dia</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={mealsPerDay}
                                    onChange={(e) => setMealsPerDay(parseInt(e.target.value) || 6)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Caracteristicas</Label>
                            <Textarea
                                value={dietCharacteristics}
                                onChange={(e) => setDietCharacteristics(e.target.value)}
                                placeholder="Ex: Hipossodica, Hipoglicidica, Rica em fibras..."
                                rows={2}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Acompanhamento Fonoaudiologico */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mic className="h-5 w-5" />
                            Acompanhamento Fonoaudiologico
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Label>Acompanhamento fonoaudiologico?</Label>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="speechNo"
                                    checked={!speechTherapy}
                                    onCheckedChange={() => setSpeechTherapy(false)}
                                />
                                <Label htmlFor="speechNo" className="font-normal">Nao</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="speechYes"
                                    checked={speechTherapy}
                                    onCheckedChange={() => setSpeechTherapy(true)}
                                />
                                <Label htmlFor="speechYes" className="font-normal">Sim</Label>
                            </div>
                        </div>

                        {speechTherapy && (
                            <div className="pl-4 border-l-2 border-blue-200 space-y-4">
                                <div className="flex items-center gap-4">
                                    <Label>Agua com espessante?</Label>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={!needsThickener}
                                            onCheckedChange={() => setNeedsThickener(false)}
                                        />
                                        <span className="text-sm">Nao</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={needsThickener}
                                            onCheckedChange={() => setNeedsThickener(true)}
                                        />
                                        <span className="text-sm">Sim</span>
                                    </div>
                                </div>

                                {needsThickener && (
                                    <div className="space-y-2">
                                        <Label>Consistencia segura para agua</Label>
                                        <Input
                                            value={safeConsistency}
                                            onChange={(e) => setSafeConsistency(e.target.value)}
                                            placeholder="Ex: Nectar, Mel, Pudim"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Estimativas */}
                <Card>
                    <CardHeader>
                        <CardTitle>Estimativas da Dieta</CardTitle>
                        <CardDescription>Valor estimado da alimentação oral (sem suplementos)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Valor energetico total estimado (kcal)</Label>
                                <Input
                                    type="number"
                                    value={estimatedVET || ''}
                                    onChange={(e) => setEstimatedVET(parseInt(e.target.value) || 0)}
                                    placeholder="Ex: 1500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Quantidade de proteinas (g/dia)</Label>
                                <Input
                                    type="number"
                                    value={estimatedProtein || ''}
                                    onChange={(e) => setEstimatedProtein(parseInt(e.target.value) || 0)}
                                    placeholder="Ex: 60"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Terapia Nutricional Oral */}
                <Card>
                    <CardHeader>
                        <CardTitle>Terapia Nutricional Via Oral</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Label>Terapia nutricional via oral?</Label>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={!hasOralTherapy}
                                    onCheckedChange={() => setHasOralTherapy(false)}
                                />
                                <span className="text-sm">Nao</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={hasOralTherapy}
                                    onCheckedChange={() => setHasOralTherapy(true)}
                                />
                                <span className="text-sm">Sim</span>
                            </div>
                        </div>

                        {hasOralTherapy && (
                            <div className="space-y-6 pt-4">
                                {/* Suplementos */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-lg font-semibold">Suplementos via oral</Label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={addSupplement}
                                            disabled={supplements.length >= 3}
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Adicionar ({supplements.length}/3)
                                        </Button>
                                    </div>

                                    {supplements.map((sup, index) => (
                                        <Card key={index} className="border-dashed">
                                            <CardContent className="pt-4 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Badge>Suplemento {index + 1}</Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeSupplement(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>

                                                <Select
                                                    value={sup.supplementId}
                                                    onValueChange={(val) => updateSupplement(index, 'supplementId', val)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o suplemento" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableSupplements.map(f => (
                                                            <SelectItem key={f.id} value={f.id!}>
                                                                {f.name} - {f.caloriesPerUnit}kcal/100ml
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-sm">Quantidade por oferta</Label>
                                                        <Input
                                                            type="number"
                                                            value={sup.amount || ''}
                                                            onChange={(e) => updateSupplement(index, 'amount', e.target.value)}
                                                            placeholder="Ex: 200"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-sm">Unidade</Label>
                                                        <Select value={sup.unit || 'ml'} onValueChange={(val) => updateSupplement(index, 'unit', val)}>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="ml">ml</SelectItem>
                                                                <SelectItem value="g">g</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-sm">Horarios</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {MEAL_SCHEDULES.map(meal => (
                                                            <div key={meal.key} className="flex items-center gap-1">
                                                                <Checkbox
                                                                    checked={sup.schedules[meal.key as keyof typeof sup.schedules] === true}
                                                                    onCheckedChange={(checked) =>
                                                                        updateSupplement(index, `schedule_${meal.key}`, !!checked)
                                                                    }
                                                                />
                                                                <span className="text-sm">{meal.label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Checkbox
                                                            checked={!!sup.schedules.other}
                                                            onCheckedChange={(checked) =>
                                                                updateSupplement(index, 'other', checked ? '' : undefined)
                                                            }
                                                        />
                                                        <span className="text-sm">Outro:</span>
                                                        {sup.schedules.other !== undefined && (
                                                            <Input
                                                                value={sup.schedules.other || ''}
                                                                onChange={(e) => updateSupplement(index, 'other', e.target.value)}
                                                                placeholder="Ex: 22h"
                                                                className="w-40"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                <Separator />

                                {/* Modulos */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-lg font-semibold">Modulos via oral</Label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={addModule}
                                            disabled={oralModules.length >= 3}
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Adicionar ({oralModules.length}/3)
                                        </Button>
                                    </div>

                                    {oralModules.map((om, index) => (
                                        <Card key={index} className="border-dashed">
                                            <CardContent className="pt-4 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Badge variant="secondary">Modulo {index + 1}</Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeModule(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>

                                                <Select
                                                    value={om.moduleId}
                                                    onValueChange={(val) => updateModule(index, 'moduleId', val)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o modulo" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {modules.map(m => (
                                                            <SelectItem key={m.id} value={m.id!}>
                                                                {m.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-sm">Quantidade por oferta</Label>
                                                        <Input
                                                            type="number"
                                                            value={om.amount || ''}
                                                            onChange={(e) => updateModule(index, 'amount', e.target.value)}
                                                            placeholder="Ex: 10"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-sm">Unidade</Label>
                                                        <Select value={om.unit || 'g'} onValueChange={(val) => updateModule(index, 'unit', val)}>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="g">g</SelectItem>
                                                                <SelectItem value="ml">ml</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-sm">Horarios</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {MEAL_SCHEDULES.map(meal => (
                                                            <div key={meal.key} className="flex items-center gap-1">
                                                                <Checkbox
                                                                    checked={om.schedules[meal.key as keyof typeof om.schedules] === true}
                                                                    onCheckedChange={(checked) =>
                                                                        updateModule(index, `schedule_${meal.key}`, !!checked)
                                                                    }
                                                                />
                                                                <span className="text-sm">{meal.label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Checkbox
                                                            checked={!!om.schedules.other}
                                                            onCheckedChange={(checked) =>
                                                                updateModule(index, 'other', checked ? '' : undefined)
                                                            }
                                                        />
                                                        <span className="text-sm">Outro:</span>
                                                        {om.schedules.other !== undefined && (
                                                            <Input
                                                                value={om.schedules.other || ''}
                                                                onChange={(e) => updateModule(index, 'other', e.target.value)}
                                                                placeholder="Ex: 22h"
                                                                className="w-40"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                <Separator />

                                {/* Observacoes */}
                                <div className="space-y-2">
                                    <Label>Observacoes</Label>
                                    <Textarea
                                        value={observations}
                                        onChange={(e) => setObservations(e.target.value)}
                                        placeholder="Preferências, alergias alimentares, aceitação..."
                                        rows={4}
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Salvar */}
                <Button onClick={handleSave} className="w-full" size="lg" disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Salvando..." : "Salvar Prescricao de Dieta Oral"}
                </Button>
            </div>
            <BottomNav />
        </div>
    );
}


