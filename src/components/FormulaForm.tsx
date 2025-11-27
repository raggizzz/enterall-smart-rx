import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Formula } from "@/lib/formulasDatabase";

interface FormulaFormProps {
    onSubmit: (data: Partial<Formula>) => void;
    onCancel: () => void;
}

const FormulaForm = ({ onSubmit, onCancel }: FormulaFormProps) => {
    const [formData, setFormData] = useState<Partial<Formula>>({
        type: 'standard',
        systemType: 'closed',
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
                        <Label htmlFor="presentationDesc">Apresentação</Label>
                        <Input id="presentationDesc" placeholder="Ex: Frasco 1000ml" onChange={e => setFormData({ ...formData, presentationDescription: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="stdPackage">Embalagem Padrão (ml)</Label>
                        <Input id="stdPackage" type="number" placeholder="Ex: 1000" onChange={e => setFormData({ ...formData, presentations: [parseInt(e.target.value) || 0] })} />
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
                        <Select onValueChange={(v: any) => setFormData({ ...formData, billingUnit: v })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ml">mL</SelectItem>
                                <SelectItem value="g">Gramas</SelectItem>
                                <SelectItem value="unit">Unidade</SelectItem>
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

            {/* 3. Classificação e Densidade */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">3. Classificação Nutricional</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="density">Densidade Calórica (kcal/ml)</Label>
                        <Input id="density" type="number" step="0.1" placeholder="Ex: 1.5" onChange={e => updateComposition('density', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="classification">Classificação</Label>
                        <Input id="classification" placeholder="Ex: Hiperproteica" onChange={e => setFormData({ ...formData, classification: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="complexity">Complexidade</Label>
                        <Select onValueChange={(v: any) => setFormData({ ...formData, macronutrientComplexity: v })}>
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
                        <Label htmlFor="systemType">Sistema</Label>
                        <Select onValueChange={(v: any) => setFormData({ ...formData, systemType: v })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="open">Aberto</SelectItem>
                                <SelectItem value="closed">Fechado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* 4. Macronutrientes (% VET) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">4. Macronutrientes (% VET)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </CardContent>
            </Card>

            {/* 5. Micronutrientes (mg/1000ml) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">5. Micronutrientes (mg/1000ml)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </CardContent>
            </Card>

            {/* 6. Resíduos (g/1000ml) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">6. Resíduos (g/1000ml)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="plastic">Plástico</Label>
                        <Input id="plastic" type="number" onChange={e => updateResidue('plastic', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="paper">Papel</Label>
                        <Input id="paper" type="number" onChange={e => updateResidue('paper', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="metal">Metal</Label>
                        <Input id="metal" type="number" onChange={e => updateResidue('metal', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="glass">Vidro</Label>
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
