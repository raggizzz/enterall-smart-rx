/**
 * PrescriptionDetails Component
 * Exibe os detalhes completos da prescrição nutricional
 * Inclui: VET, macronutrientes, fontes, gráfico de pizza, micronutrientes,
 * custos e texto formatado para prontuário
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Flame,
    Beef,
    Wheat,
    Droplets,
    Leaf,
    Clock,
    DollarSign,
    FileText,
    Copy,
    PieChart
} from "lucide-react";
import { toast } from "sonner";
import { Prescription, Patient, Formula, Module, AppSettings } from "@/lib/database";

interface PrescriptionDetailsProps {
    prescription: Prescription;
    patient: Patient;
    formulas: Formula[];
    modules: Module[];
    settings?: AppSettings;
}

// Componente de gráfico de pizza simples usando CSS
const MacroPieChart = ({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) => {
    const total = protein + carbs + fat;
    if (total === 0) return null;

    const proteinPct = (protein / total) * 100;
    const carbsPct = (carbs / total) * 100;
    const fatPct = (fat / total) * 100;

    // Criar gradiente cônico para o gráfico de pizza
    const gradient = `conic-gradient(
        #ef4444 0deg ${proteinPct * 3.6}deg,
        #f59e0b ${proteinPct * 3.6}deg ${(proteinPct + carbsPct) * 3.6}deg,
        #3b82f6 ${(proteinPct + carbsPct) * 3.6}deg 360deg
    )`;

    return (
        <div className="flex items-center gap-6">
            <div
                className="w-32 h-32 rounded-full shadow-lg"
                style={{ background: gradient }}
            />
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">Proteínas: {proteinPct.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm">Carboidratos: {carbsPct.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Lipídeos: {fatPct.toFixed(1)}%</span>
                </div>
            </div>
        </div>
    );
};

export const PrescriptionDetails = ({
    prescription,
    patient,
    formulas,
    modules,
    settings
}: PrescriptionDetailsProps) => {
    // Calcular peso ideal (IMC 25) se paciente tiver altura
    const idealWeight = useMemo(() => {
        if (!patient.height) return undefined;
        const heightM = patient.height / 100;
        return 25 * heightM * heightM;
    }, [patient.height]);

    // Calcular totais nutricionais
    const nutritionTotals = useMemo(() => {
        let calories = 0;
        let protein = 0;
        let carbs = 0;
        let fat = 0;
        let fiber = 0;
        let calcium = 0;
        let phosphorus = 0;
        let sodium = 0;
        let potassium = 0;
        let freeWater = 0;
        let residue = 0;

        // Fontes
        const proteinSources: string[] = [];
        const carbSources: string[] = [];
        const fatSources: string[] = [];
        const fiberSources: string[] = [];

        // Calcular de fórmulas
        prescription.formulas.forEach((pf) => {
            const formula = formulas.find(f => f.id === pf.formulaId);
            if (!formula) return;

            const totalVolume = pf.volume * pf.timesPerDay;
            const factor = totalVolume / 100; // valores são por 100ml

            calories += (formula.caloriesPerUnit || 0) * factor;
            protein += (formula.proteinPerUnit || 0) * factor;
            carbs += (formula.carbPerUnit || 0) * factor;
            fat += (formula.fatPerUnit || 0) * factor;
            fiber += (formula.fiberPerUnit || 0) * factor;
            calcium += (formula.calciumPerUnit || 0) * factor;
            phosphorus += (formula.phosphorusPerUnit || 0) * factor;
            sodium += (formula.sodiumPerUnit || 0) * factor;
            potassium += (formula.potassiumPerUnit || 0) * factor;
            freeWater += ((formula.waterContent || 0) / 100) * totalVolume;

            // Resíduos
            residue += (formula.plasticG || 0) + (formula.paperG || 0) +
                (formula.metalG || 0) + (formula.glassG || 0);

            // Fontes
            if (formula.proteinSources) {
                proteinSources.push(`${formula.name}: ${formula.proteinSources}`);
            }
            if (formula.carbSources) {
                carbSources.push(`${formula.name}: ${formula.carbSources}`);
            }
            if (formula.fatSources) {
                fatSources.push(`${formula.name}: ${formula.fatSources}`);
            }
            if (formula.fiberSources) {
                fiberSources.push(`${formula.name}: ${formula.fiberSources}`);
            }
        });

        // Calcular de módulos
        prescription.modules.forEach((pm) => {
            const module = modules.find(m => m.id === pm.moduleId);
            if (!module) return;

            const factor = pm.amount * pm.timesPerDay;

            calories += (module.calories || 0) * factor;
            protein += (module.protein || 0) * factor;
            carbs += (module.carbs || 0) * factor;
            fat += (module.fat || 0) * factor;
            fiber += (module.fiber || 0) * factor;
            sodium += (module.sodium || 0) * factor;
            potassium += (module.potassium || 0) * factor;
            freeWater += (module.freeWater || 0) * factor;

            // Fontes dos módulos
            if (module.proteinSources) {
                proteinSources.push(`${module.name}: ${module.proteinSources}`);
            }
            if (module.carbSources) {
                carbSources.push(`${module.name}: ${module.carbSources}`);
            }
            if (module.fatSources) {
                fatSources.push(`${module.name}: ${module.fatSources}`);
            }
            if (module.fiberSources) {
                fiberSources.push(`${module.name}: ${module.fiberSources}`);
            }
        });

        // Água de hidratação
        freeWater += (prescription.hydrationVolume || 0) *
            (prescription.hydrationSchedules?.length || 0);

        // Calcular percentuais VET
        const proteinKcal = protein * 4;
        const carbsKcal = carbs * 4;
        const fatKcal = fat * 9;
        const totalKcal = proteinKcal + carbsKcal + fatKcal;

        return {
            calories,
            protein,
            carbs,
            fat,
            fiber,
            calcium,
            phosphorus,
            sodium,
            potassium,
            freeWater,
            residue,
            proteinPct: totalKcal > 0 ? (proteinKcal / totalKcal) * 100 : 0,
            carbsPct: totalKcal > 0 ? (carbsKcal / totalKcal) * 100 : 0,
            fatPct: totalKcal > 0 ? (fatKcal / totalKcal) * 100 : 0,
            proteinSources,
            carbSources,
            fatSources,
            fiberSources
        };
    }, [prescription, formulas, modules]);

    // Calcular custos
    const costs = useMemo(() => {
        const nursingCosts = settings?.nursingCosts;
        const indirectCosts = settings?.indirectCosts;

        let materialCost = 0;
        let nursingTimeSeconds = 0;

        // Custo de materiais (fórmulas e módulos)
        prescription.formulas.forEach((pf) => {
            const formula = formulas.find(f => f.id === pf.formulaId);
            if (formula?.billingPrice) {
                materialCost += formula.billingPrice * pf.timesPerDay;
            }

            // Tempo de enfermagem por frasco
            if (nursingCosts) {
                const timePerBottle = prescription.systemType === 'open'
                    ? (prescription.infusionMode === 'pump'
                        ? nursingCosts.timeOpenSystemPump
                        : prescription.infusionMode === 'gravity'
                            ? nursingCosts.timeOpenSystemGravity
                            : nursingCosts.timeBolus)
                    : (prescription.infusionMode === 'pump'
                        ? nursingCosts.timeClosedSystemPump
                        : nursingCosts.timeClosedSystemGravity);

                nursingTimeSeconds += (timePerBottle || 0) * pf.timesPerDay;
            }
        });

        prescription.modules.forEach((pm) => {
            const module = modules.find(m => m.id === pm.moduleId);
            if (module?.billingPrice) {
                materialCost += module.billingPrice * pm.timesPerDay;
            }
        });

        // Tempo de enfermagem para água
        if (prescription.hydrationSchedules?.length && nursingCosts?.timeBolus) {
            nursingTimeSeconds += nursingCosts.timeBolus * prescription.hydrationSchedules.length;
        }

        const nursingTimeMinutes = nursingTimeSeconds / 60;
        const nursingCostTotal = nursingCosts?.hourlyRate
            ? (nursingTimeMinutes / 60) * nursingCosts.hourlyRate
            : 0;

        const laborCosts = indirectCosts?.laborCosts || 0;
        const totalCost = materialCost + nursingCostTotal + laborCosts;

        return {
            materialCost,
            nursingTimeMinutes,
            nursingCostTotal,
            laborCosts,
            totalCost
        };
    }, [prescription, formulas, modules, settings]);

    // Gerar texto para prontuário
    const generateMedicalRecordText = () => {
        const weight = patient.weight || 0;
        const lines: string[] = [];

        // Tipo de sistema
        if (prescription.systemType === 'closed') {
            lines.push(`Dieta enteral administrada por ${prescription.feedingRoute || 'sonda nasoenteral'}.`);

            prescription.formulas.forEach((pf) => {
                const formula = formulas.find(f => f.id === pf.formulaId);
                if (!formula) return;

                const infusionMethod = prescription.infusionMode === 'pump'
                    ? 'em bomba'
                    : 'em modo gravitacional';
                const rate = prescription.infusionMode === 'pump'
                    ? `${prescription.infusionRateMlH || '?'} ml/h`
                    : `${prescription.infusionDropsMin || '?'} gotas/min`;

                lines.push(`Fórmula ${formula.name}, infundida ${infusionMethod}, velocidade de ${rate}, por ${prescription.infusionHoursPerDay || '?'} horas/dia, totalizando ${pf.volume * pf.timesPerDay} ml.`);
            });
        } else {
            // Sistema aberto
            lines.push(`Dieta enteral administrada por ${prescription.feedingRoute || 'sonda nasoenteral'}.`);

            prescription.formulas.forEach((pf, index) => {
                const formula = formulas.find(f => f.id === pf.formulaId);
                if (!formula) return;

                if (prescription.infusionMode === 'bolus') {
                    lines.push(`Fórmula ${formula.name}, fracionada em ${pf.timesPerDay} etapas, ${pf.volume}ml por etapa, em bolus.`);
                } else {
                    const infusionMethod = prescription.infusionMode === 'pump'
                        ? 'em bomba'
                        : 'em modo gravitacional';
                    const rate = prescription.infusionMode === 'pump'
                        ? `${prescription.infusionRateMlH || '?'} ml/h`
                        : `${prescription.infusionDropsMin || '?'} gotas/min`;

                    lines.push(`Fórmula ${formula.name}, infundida ${infusionMethod}, fracionada em ${pf.timesPerDay} etapas, ${pf.volume}ml por etapa, velocidade de ${rate}.`);
                }
            });
        }

        // Módulos
        if (prescription.modules.length > 0) {
            lines.push(`\nMódulos adicionados:`);
            prescription.modules.forEach((pm) => {
                const module = modules.find(m => m.id === pm.moduleId);
                if (module) {
                    lines.push(`${module.name}, ${pm.timesPerDay} vezes ao dia.`);
                }
            });
        }

        // Água
        if (prescription.hydrationVolume && prescription.hydrationSchedules?.length) {
            lines.push(`\nÁgua livre adicionada: ${prescription.hydrationVolume}ml, ${prescription.hydrationSchedules.length} vezes ao dia.`);
        }

        // Perfazendo
        lines.push(`\nPerfazendo:`);
        lines.push(`VET: ${nutritionTotals.calories.toFixed(0)} kcal – ${weight > 0 ? (nutritionTotals.calories / weight).toFixed(1) : '?'} kcal/kg`);

        const proteinPerKg = weight > 0 ? (nutritionTotals.protein / weight).toFixed(2) : '?';
        let proteinLine = `Proteínas: ${nutritionTotals.protein.toFixed(1)}g/dia - ${proteinPerKg} g/kg`;
        if (patient.weight && patient.height) {
            const imc = patient.weight / Math.pow(patient.height / 100, 2);
            if (imc > 30 && idealWeight) {
                proteinLine += ` - ${(nutritionTotals.protein / idealWeight).toFixed(2)} g/kg de peso ideal`;
            }
        }
        lines.push(proteinLine);

        lines.push(`Carboidratos: ${nutritionTotals.carbs.toFixed(1)}g/dia - ${weight > 0 ? (nutritionTotals.carbs / weight).toFixed(2) : '?'} g/kg`);
        lines.push(`Lipídeos: ${nutritionTotals.fat.toFixed(1)}g/dia - ${weight > 0 ? (nutritionTotals.fat / weight).toFixed(2) : '?'} g/kg`);
        lines.push(`Fibras: ${nutritionTotals.fiber.toFixed(1)}g/dia`);
        lines.push(`Água livre total: ${nutritionTotals.freeWater.toFixed(0)}ml/dia – ${weight > 0 ? (nutritionTotals.freeWater / weight).toFixed(1) : '?'} ml/kg/dia`);

        // Custos
        lines.push(`\n--- CUSTOS ---`);
        lines.push(`Custo Material: R$ ${costs.materialCost.toFixed(2)}`);
        lines.push(`Custos de Enfermagem: ${costs.nursingTimeMinutes.toFixed(0)} minutos / R$ ${costs.nursingCostTotal.toFixed(2)}`);
        lines.push(`Custo Total da Terapia Nutricional: R$ ${costs.totalCost.toFixed(2)}`);

        return lines.join('\n');
    };

    const copyToClipboard = () => {
        const text = generateMedicalRecordText();
        navigator.clipboard.writeText(text).then(() => {
            toast.success("Texto copiado para a área de transferência!");
        }).catch(() => {
            toast.error("Não foi possível copiar o texto");
        });
    };

    return (
        <div className="space-y-6">
            {/* VET Total */}
            <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                        <Flame className="h-5 w-5" />
                        Valor Energético Total (VET)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-orange-600">
                        {nutritionTotals.calories.toFixed(0)} kcal
                        {patient.weight && (
                            <span className="text-lg font-normal ml-2">
                                ({(nutritionTotals.calories / patient.weight).toFixed(1)} kcal/kg)
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Macronutrientes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Proteínas */}
                <Card className="border-red-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-red-700 text-sm">
                            <Beef className="h-4 w-4" />
                            Proteínas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">
                            {nutritionTotals.protein.toFixed(1)}g
                            <span className="text-sm font-normal ml-1">
                                ({nutritionTotals.proteinPct.toFixed(0)}% VET)
                            </span>
                        </div>
                        {patient.weight && (
                            <div className="text-sm text-muted-foreground">
                                {(nutritionTotals.protein / patient.weight).toFixed(2)} g/kg
                            </div>
                        )}
                        {nutritionTotals.proteinSources.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                                <strong>Fontes:</strong>
                                {nutritionTotals.proteinSources.map((src, i) => (
                                    <div key={i}>{src}</div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Carboidratos */}
                <Card className="border-amber-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-amber-700 text-sm">
                            <Wheat className="h-4 w-4" />
                            Carboidratos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">
                            {nutritionTotals.carbs.toFixed(1)}g
                            <span className="text-sm font-normal ml-1">
                                ({nutritionTotals.carbsPct.toFixed(0)}% VET)
                            </span>
                        </div>
                        {patient.weight && (
                            <div className="text-sm text-muted-foreground">
                                {(nutritionTotals.carbs / patient.weight).toFixed(2)} g/kg
                            </div>
                        )}
                        {nutritionTotals.carbSources.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                                <strong>Fontes:</strong>
                                {nutritionTotals.carbSources.map((src, i) => (
                                    <div key={i}>{src}</div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Lipídeos */}
                <Card className="border-blue-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-blue-700 text-sm">
                            <Droplets className="h-4 w-4" />
                            Lipídeos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">
                            {nutritionTotals.fat.toFixed(1)}g
                            <span className="text-sm font-normal ml-1">
                                ({nutritionTotals.fatPct.toFixed(0)}% VET)
                            </span>
                        </div>
                        {patient.weight && (
                            <div className="text-sm text-muted-foreground">
                                {(nutritionTotals.fat / patient.weight).toFixed(2)} g/kg
                            </div>
                        )}
                        {nutritionTotals.fatSources.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                                <strong>Fontes:</strong>
                                {nutritionTotals.fatSources.map((src, i) => (
                                    <div key={i}>{src}</div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico de Pizza */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <PieChart className="h-4 w-4" />
                        Distribuição de Macronutrientes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <MacroPieChart
                        protein={nutritionTotals.protein * 4}
                        carbs={nutritionTotals.carbs * 4}
                        fat={nutritionTotals.fat * 9}
                    />
                </CardContent>
            </Card>

            {/* Fibras e Micronutrientes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-green-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-green-700 mb-1">
                            <Leaf className="h-4 w-4" />
                            <span className="text-sm font-semibold">Fibras</span>
                        </div>
                        <div className="text-lg font-bold">{nutritionTotals.fiber.toFixed(1)}g/dia</div>
                        {nutritionTotals.fiberSources.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                                {nutritionTotals.fiberSources.join(', ')}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground mb-1">Cálcio</div>
                        <div className="text-lg font-bold">{nutritionTotals.calcium.toFixed(0)} mg/dia</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground mb-1">Fósforo</div>
                        <div className="text-lg font-bold">{nutritionTotals.phosphorus.toFixed(0)} mg/dia</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground mb-1">Resíduos</div>
                        <div className="text-lg font-bold">{nutritionTotals.residue.toFixed(0)} g/dia</div>
                    </CardContent>
                </Card>
            </div>

            {/* Custos */}
            <Card className="border-purple-200 bg-purple-50/30">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-purple-700">
                        <DollarSign className="h-5 w-5" />
                        Custos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <div className="text-sm text-muted-foreground">Custo Material</div>
                            <div className="text-lg font-bold">R$ {costs.materialCost.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">fórmulas + módulos + insumos</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Custos de Enfermagem
                            </div>
                            <div className="text-lg font-bold">R$ {costs.nursingCostTotal.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">
                                {costs.nursingTimeMinutes.toFixed(0)} minutos/dia
                            </div>
                        </div>
                        <div className="border-l-2 border-purple-300 pl-4">
                            <div className="text-sm text-muted-foreground">Custo Total</div>
                            <div className="text-2xl font-bold text-purple-700">
                                R$ {costs.totalCost.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Botão para texto do prontuário */}
            <Dialog>
                <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Gerar Texto para Prontuário
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Sugestão de Registro em Prontuário
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg border">
                            {generateMedicalRecordText()}
                        </pre>
                        <Button onClick={copyToClipboard} className="w-full mt-4">
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar Texto
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PrescriptionDetails;
