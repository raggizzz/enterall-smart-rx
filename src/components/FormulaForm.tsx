import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Formula } from "@/lib/formulasDatabase";

interface FormulaFormProps {
    onSubmit: (data: Partial<Formula>) => void;
    onCancel: () => void;
}

const FormulaForm = ({ onSubmit, onCancel }: FormulaFormProps) => {
    const [formData, setFormData] = useState<Partial<Formula> & { formulaTypes: string[] }>({
        type: 'standard',
        systemType: 'closed',
        formulaTypes: [],
        composition: {
            calories: 100,
            protein: 0,
            carbohydrates: 0,
            fat: 0,
        },
        presentations: [],
        indications: [],
        contraindications: [],
        specialFeatures: []
    });

    // Helper to update nested composition state
    const updateComposition = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            composition: {
                ...prev.composition!,
                [field]: parseFloat(value) || 0
            }
        }));
    };

    // Helper to update nested residue info
    const updateResidue = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            residueInfo: {
                plastic: 0,
                paper: 0,
                metal: 0,
                glass: 0,
                ...prev.residueInfo,
                [field]: parseFloat(value) || 0
            }
        }));
    };

    // Toggle formula type (multiple selection)
    const toggleFormulaType = (type: string) => {
        setFormData(prev => ({
            ...prev,
            formulaTypes: prev.formulaTypes.includes(type)
                ? prev.formulaTypes.filter(t => t !== type)
                : [...prev.formulaTypes, type]
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto p-1">

            {/* 1. Identificação Básica */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">1. Identificação Básica</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Código</Label>
                        <Input id="code" placeholder="Ex: FNEA07" onChange={e => setFormData({ ...formData, code: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="manufacturer">Fabricante</Label>
                        <Input id="manufacturer" placeholder="Ex: Nestlé" onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Comercial</Label>
                        <Input id="name" placeholder="Ex: PROLINE" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="presentationForm">Apresentação</Label>
                        <Select onValueChange={(v) => setFormData({ ...formData, presentationForm: v as 'liquido' | 'po' })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a forma" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="liquido">Líquido</SelectItem>
                                <SelectItem value="po">Pó</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="stdPackage">Embalagem Padrão (ml ou g)</Label>
                        <Input id="stdPackage" type="number" placeholder="Ex: 1000" onChange={e => setFormData({ ...formData, presentations: [parseInt(e.target.value) || 0] })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="description">Descrição da Fórmula</Label>
                        <Textarea
                            id="description"
                            placeholder="Ex: Fórmula polimérica, hipercalórica e hiperprotéica..."
                            className="min-h-[80px]"
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Este texto será utilizado para a sugestão de registro da prescrição nutricional.</p>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Faturamento */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">2. Faturamento</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="billingUnit">Unidade de Faturamento</Label>
                        <Select onValueChange={(v) => setFormData({ ...formData, billingUnit: v as 'ml' | 'g' | 'unit' })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ml">Mililitros (ml)</SelectItem>
                                <SelectItem value="g">Gramas (g)</SelectItem>
                                <SelectItem value="unit">Unidade (unid)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {formData.billingUnit === 'unit' && (
                        <div className="space-y-2">
                            <Label htmlFor="conversion">Conversão (mL/g por unidade)</Label>
                            <Input id="conversion" type="number" placeholder="Ex: 200" onChange={e => setFormData({ ...formData, conversionFactor: parseFloat(e.target.value) })} />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="price">Valor Unitário (R$)</Label>
                        <Input id="price" type="number" step="0.01" placeholder="0.00" onChange={e => setFormData({ ...formData, billingPrice: parseFloat(e.target.value) })} />
                    </div>
                </CardContent>
            </Card>

            {/* 3. Tipo (múltipla seleção) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">3. Tipo</CardTitle>
                    <CardDescription>Selecione um ou mais tipos onde esta fórmula pode ser utilizada</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { value: 'open', label: 'Sistema Aberto' },
                            { value: 'closed', label: 'Sistema Fechado' },
                            { value: 'supplement', label: 'Suplemento Alimentar' },
                            { value: 'module', label: 'Módulo para Nutrição Enteral' }
                        ].map(option => (
                            <div
                                key={option.value}
                                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.formulaTypes.includes(option.value)
                                    ? 'border-primary bg-primary/5'
                                    : 'border-muted hover:border-muted-foreground/50'
                                    }`}
                                onClick={() => toggleFormulaType(option.value)}
                            >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${formData.formulaTypes.includes(option.value)
                                    ? 'border-primary bg-primary'
                                    : 'border-muted-foreground'
                                    }`}>
                                    {formData.formulaTypes.includes(option.value) && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <span className="font-medium">{option.label}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* 4. Características e Composição Nutricional */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">4. Características e Composição Nutricional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Densidade e Complexidade */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="density">Densidade Calórica (kcal/ml)</Label>
                            <Input id="density" type="number" step="0.1" placeholder="Ex: 1.5" onChange={e => updateComposition('density', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="complexity">Complexidade dos Macronutrientes</Label>
                            <Select onValueChange={(v) => setFormData({ ...formData, macronutrientComplexity: v as 'polymeric' | 'oligomeric' })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="polymeric">Polimérica</SelectItem>
                                    <SelectItem value="oligomeric">Oligomérica</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="classification">Classificação</Label>
                            <Input id="classification" placeholder="Ex: Hipercalórica, Hiperprotéica" onChange={e => setFormData({ ...formData, classification: e.target.value })} />
                        </div>
                    </div>

                    <Separator />

                    {/* 4.1 Macronutrientes */}
                    <div>
                        <h4 className="font-semibold text-sm mb-3 text-muted-foreground">4.1 Macronutrientes (% VET)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="protPct">Proteínas (%)</Label>
                                <Input id="protPct" type="number" placeholder="Ex: 20" onChange={e => updateComposition('proteinPct', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="carbPct">Carboidratos (%)</Label>
                                <Input id="carbPct" type="number" placeholder="Ex: 50" onChange={e => updateComposition('carbohydratesPct', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fatPct">Lipídeos (%)</Label>
                                <Input id="fatPct" type="number" placeholder="Ex: 30" onChange={e => updateComposition('fatPct', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fiber">Fibras (g/100ml)</Label>
                                <Input id="fiber" type="number" onChange={e => updateComposition('fiber', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* 4.2 Micronutrientes */}
                    <div>
                        <h4 className="font-semibold text-sm mb-3 text-muted-foreground">4.2 Micronutrientes (mg/1000ml)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sodium">Sódio (Na)</Label>
                                <Input id="sodium" type="number" onChange={e => updateComposition('sodium', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="potassium">Potássio (K)</Label>
                                <Input id="potassium" type="number" onChange={e => updateComposition('potassium', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="calcium">Cálcio (Ca)</Label>
                                <Input id="calcium" type="number" onChange={e => updateComposition('calcium', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phosphorus">Fósforo (P)</Label>
                                <Input id="phosphorus" type="number" onChange={e => updateComposition('phosphorus', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="water">Água Total (ml/1000ml)</Label>
                                <Input id="water" type="number" onChange={e => updateComposition('waterContent', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 5. Geração de Resíduos */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">5. Geração de Resíduos</CardTitle>
                    <CardDescription>Peso dos resíduos gerados por 1000ml/g de fórmula utilizada</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="plastic">Plástico (g)</Label>
                        <Input id="plastic" type="number" onChange={e => updateResidue('plastic', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="paper">Papel/Papelão (g)</Label>
                        <Input id="paper" type="number" onChange={e => updateResidue('paper', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="metal">Metal (g)</Label>
                        <Input id="metal" type="number" onChange={e => updateResidue('metal', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="glass">Vidro (g)</Label>
                        <Input id="glass" type="number" onChange={e => updateResidue('glass', e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">Salvar Fórmula</Button>
            </div>
        </form>
    );
};

export default FormulaForm;
