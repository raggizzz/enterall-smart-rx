import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Calculator, AlertTriangle, Save } from "lucide-react";

interface DailyEvolutionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientName: string;
    prescribedVolume: number; // Total volume prescribed for the day
    prescribedCalories: number;
}

export function DailyEvolutionDialog({
    open,
    onOpenChange,
    patientName,
    prescribedVolume,
    prescribedCalories
}: DailyEvolutionDialogProps) {
    const [infusedVolume, setInfusedVolume] = useState("");
    const [intercurrences, setIntercurrences] = useState<string[]>([]);
    const [notes, setNotes] = useState("");
    const [percentage, setPercentage] = useState(0);

    const intercurrenceOptions = [
        { id: "jejum_exame", label: "Jejum para Exame" },
        { id: "jejum_centro_cirurgico", label: "Jejum Centro Cirúrgico" },
        { id: "vomitos", label: "Vômitos/Regurgitação" },
        { id: "diarreia", label: "Diarreia" },
        { id: "distensao", label: "Distensão Abdominal" },
        { id: "sonda_obstruida", label: "Sonda Obstruída/Deslocada" },
        { id: "pausa_procedimento", label: "Pausa para Procedimento" },
    ];

    useEffect(() => {
        if (infusedVolume && prescribedVolume > 0) {
            const vol = parseFloat(infusedVolume);
            const pct = (vol / prescribedVolume) * 100;
            setPercentage(Math.min(pct, 100)); // Cap at 100 for display logic if needed, or allow >100
        } else {
            setPercentage(0);
        }
    }, [infusedVolume, prescribedVolume]);

    const handleSave = () => {
        if (!infusedVolume) {
            toast.error("Informe o volume infundido");
            return;
        }

        // Mock save logic
        console.log("Saving evolution:", {
            patientName,
            infusedVolume,
            percentage,
            intercurrences,
            notes,
            date: new Date().toISOString()
        });

        toast.success("Evolução registrada com sucesso!");
        onOpenChange(false);

        // Reset form
        setInfusedVolume("");
        setIntercurrences([]);
        setNotes("");
    };

    const toggleIntercurrence = (id: string) => {
        setIntercurrences(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const getStatusColor = (pct: number) => {
        if (pct >= 90) return "text-green-600";
        if (pct >= 70) return "text-yellow-600";
        return "text-red-600";
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Evolução Diária - {patientName}</DialogTitle>
                    <DialogDescription>
                        Registre o volume infundido nas últimas 24h e intercorrências.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Targets */}
                    <div className="p-3 bg-muted rounded-lg flex justify-between text-sm">
                        <div>
                            <span className="text-muted-foreground">Meta Volume:</span>
                            <p className="font-semibold">{prescribedVolume} ml</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Meta Calórica:</span>
                            <p className="font-semibold">{prescribedCalories} kcal</p>
                        </div>
                    </div>

                    {/* Volume Input */}
                    <div className="space-y-2">
                        <Label htmlFor="infused-volume">Volume Infundido (ml) *</Label>
                        <div className="flex gap-4 items-center">
                            <Input
                                id="infused-volume"
                                type="number"
                                placeholder="Ex: 1200"
                                value={infusedVolume}
                                onChange={(e) => setInfusedVolume(e.target.value)}
                                className="text-lg font-bold"
                            />
                            <div className="flex flex-col items-center min-w-[80px]">
                                <span className={`text-2xl font-bold ${getStatusColor(percentage)}`}>
                                    {percentage.toFixed(0)}%
                                </span>
                                <span className="text-xs text-muted-foreground">da meta</span>
                            </div>
                        </div>
                    </div>

                    {/* Intercurrences */}
                    <div className="space-y-2">
                        <Label>Intercorrências / Motivos de Pausa</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {intercurrenceOptions.map((option) => (
                                <div key={option.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={option.id}
                                        checked={intercurrences.includes(option.id)}
                                        onCheckedChange={() => toggleIntercurrence(option.id)}
                                    />
                                    <Label htmlFor={option.id} className="text-sm cursor-pointer font-normal">
                                        {option.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                            id="notes"
                            placeholder="Outras observações relevantes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Evolução
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
