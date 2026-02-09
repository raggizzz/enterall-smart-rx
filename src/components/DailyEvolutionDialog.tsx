import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { useEvolutions } from "@/hooks/useDatabase";

interface DailyEvolutionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientName: string;
    patientId: string | null | undefined;
    prescriptionId?: string;
    prescribedVolume: number;
    prescribedCalories: number;
}

export function DailyEvolutionDialog({
    open,
    onOpenChange,
    patientName,
    patientId,
    prescriptionId,
    prescribedVolume,
    prescribedCalories
}: DailyEvolutionDialogProps) {
    const { createEvolution } = useEvolutions();
    const [infusedVolume, setInfusedVolume] = useState("");
    const [intercurrences, setIntercurrences] = useState<string[]>([]);
    const [notes, setNotes] = useState("");
    const [percentage, setPercentage] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const intercurrenceOptions = [
        { id: "jejum_exame", label: "Jejum para exame" },
        { id: "jejum_centro_cirurgico", label: "Jejum centro cirurgico" },
        { id: "vomitos", label: "Vomitos ou regurgitacao" },
        { id: "diarreia", label: "Diarreia" },
        { id: "distensao", label: "Distensao abdominal" },
        { id: "sonda_obstruida", label: "Sonda obstruida ou deslocada" },
        { id: "pausa_procedimento", label: "Pausa para procedimento" },
    ];

    useEffect(() => {
        if (infusedVolume && prescribedVolume > 0) {
            const vol = parseFloat(infusedVolume);
            const pct = (vol / prescribedVolume) * 100;
            setPercentage(Math.min(pct, 100));
        } else {
            setPercentage(0);
        }
    }, [infusedVolume, prescribedVolume]);

    const handleSave = async () => {
        if (!patientId) {
            toast.error("Paciente invalido para evolucao");
            return;
        }
        const sessionHospitalId = typeof window !== "undefined" ? localStorage.getItem("userHospitalId") || undefined : undefined;
        const sessionProfessionalId = typeof window !== "undefined" ? localStorage.getItem("userProfessionalId") || undefined : undefined;
        if (!sessionHospitalId) {
            toast.error("Hospital da sessao nao identificado. Refaça o login.");
            return;
        }

        if (!infusedVolume) {
            toast.error("Informe o volume infundido");
            return;
        }

        setIsSaving(true);
        try {
            const intercurrencesWithNotes = notes.trim()
                ? [...intercurrences, `OBS: ${notes.trim()}`]
                : intercurrences;

            await createEvolution({
                hospitalId: sessionHospitalId,
                professionalId: sessionProfessionalId,
                patientId,
                prescriptionId,
                date: new Date().toISOString().slice(0, 10),
                volumeInfused: parseFloat(infusedVolume),
                metaReached: Number(percentage.toFixed(2)),
                intercurrences: intercurrencesWithNotes.length > 0 ? intercurrencesWithNotes : undefined,
            });

            toast.success("Evolucao registrada com sucesso");
            onOpenChange(false);
            setInfusedVolume("");
            setIntercurrences([]);
            setNotes("");
        } catch (error) {
            console.error("Erro ao salvar evolucao:", error);
            const message =
                typeof error === "object" && error && "message" in error
                    ? String((error as { message?: string }).message)
                    : "Verifique a conexao e as migracoes do banco";
            toast.error(`Erro ao salvar evolucao: ${message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleIntercurrence = (id: string) => {
        setIntercurrences((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const getStatusColor = (pct: number) => {
        if (pct >= 90) return "text-green-600";
        if (pct >= 70) return "text-yellow-600";
        return "text-red-600";
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-card/95 backdrop-blur border-primary/10">
                <DialogHeader>
                    <DialogTitle>Evolucao diaria - {patientName}</DialogTitle>
                    <DialogDescription>
                        Registre o volume infundido nas ultimas 24h e intercorrencias.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="p-3 bg-muted rounded-lg flex justify-between text-sm">
                        <div>
                            <span className="text-muted-foreground">Meta volume:</span>
                            <p className="font-semibold">{prescribedVolume} ml</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Meta calorica:</span>
                            <p className="font-semibold">{prescribedCalories} kcal</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="infused-volume">Volume infundido (ml) *</Label>
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

                    <div className="space-y-2">
                        <Label>Intercorrencias / motivos de pausa</Label>
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

                    <div className="space-y-2">
                        <Label htmlFor="notes">Observacoes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Outras observacoes relevantes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Salvando..." : "Salvar evolucao"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
