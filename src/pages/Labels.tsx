import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Printer, Search, Tag, Clock, Building, User } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import LabelPreview from "@/components/LabelPreview";

// Horários disponíveis das dietas
const SCHEDULE_TIMES = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00", "03:00"];

const Labels = () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [clinic, setClinic] = useState("all");
    const [patientSearch, setPatientSearch] = useState("");
    const [selectedTimes, setSelectedTimes] = useState<string[]>([...SCHEDULE_TIMES]);
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

    // Mock data - pacientes com prescrições
    const prescriptions = [
        {
            id: "1",
            patientName: "Maria Silva",
            bed: "01",
            dob: "15/03/1965",
            clinic: "uti-adulto",
            formulaName: "Nutrison Energy 1.5",
            totalVolume: 1000,
            infusionRate: "83 ml/h",
            route: "SNE",
            manipulationDate: format(new Date(), "dd/MM/yyyy"),
            validity: format(new Date(), "dd/MM/yyyy") + " 23:59",
            conservation: "Refrigerar 2-8°C",
            rtName: "Maria Santos",
            rtCrn: "1234-5",
            lot: "NE" + format(new Date(), "ddMMyyyy"),
            systemType: "open" as const,
            times: ["06:00", "09:00", "12:00", "18:00"]
        },
        {
            id: "2",
            patientName: "João Santos",
            bed: "02",
            dob: "20/05/1978",
            clinic: "uti-adulto",
            formulaName: "Fresubin HP 2.0",
            totalVolume: 1200,
            infusionRate: "100 ml/h",
            route: "GTT",
            manipulationDate: format(new Date(), "dd/MM/yyyy"),
            validity: format(new Date(), "dd/MM/yyyy") + " 23:59",
            conservation: "Refrigerar 2-8°C",
            rtName: "Maria Santos",
            rtCrn: "1234-5",
            lot: "FH" + format(new Date(), "ddMMyyyy"),
            systemType: "closed" as const,
            times: ["09:00", "15:00", "21:00"]
        },
        {
            id: "3",
            patientName: "Ana Costa",
            bed: "03",
            dob: "10/08/2020",
            clinic: "uti-pediatrica",
            formulaName: "Infatrini",
            totalVolume: 500,
            infusionRate: "42 ml/h",
            route: "SNE",
            manipulationDate: format(new Date(), "dd/MM/yyyy"),
            validity: format(new Date(), "dd/MM/yyyy") + " 23:59",
            conservation: "Refrigerar 2-8°C",
            rtName: "Maria Santos",
            rtCrn: "1234-5",
            lot: "INF" + format(new Date(), "ddMMyyyy"),
            systemType: "open" as const,
            times: ["06:00", "12:00", "18:00", "00:00"]
        }
    ];

    // Filtrar prescrições
    const filteredPrescriptions = prescriptions.filter(p => {
        const matchClinic = clinic === "all" || p.clinic === clinic;
        const matchPatient = p.patientName.toLowerCase().includes(patientSearch.toLowerCase());
        const matchTimes = p.times.some(t => selectedTimes.includes(t));
        return matchClinic && matchPatient && matchTimes;
    });

    const toggleTime = (time: string) => {
        if (selectedTimes.includes(time)) {
            setSelectedTimes(selectedTimes.filter(t => t !== time));
        } else {
            setSelectedTimes([...selectedTimes, time]);
        }
    };

    const selectAllTimes = () => setSelectedTimes([...SCHEDULE_TIMES]);
    const clearAllTimes = () => setSelectedTimes([]);

    const toggleLabel = (id: string) => {
        if (selectedLabels.includes(id)) {
            setSelectedLabels(selectedLabels.filter(l => l !== id));
        } else {
            setSelectedLabels([...selectedLabels, id]);
        }
    };

    const selectAllLabels = () => setSelectedLabels(filteredPrescriptions.map(p => p.id));
    const clearAllLabels = () => setSelectedLabels([]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />
            <div className="container py-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Tag className="h-6 w-6" />
                            Impressão de Rótulos/Etiquetas
                        </h1>
                        <p className="text-muted-foreground">Geração de etiquetas para nutrição enteral</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handlePrint}
                            disabled={selectedLabels.length === 0}
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimir Selecionados ({selectedLabels.length})
                        </Button>
                    </div>
                </div>

                {/* Filtros */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                        <CardDescription>Selecione os critérios para gerar as etiquetas</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Clínica */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Building className="h-4 w-4" />
                                    Clínica/Unidade
                                </Label>
                                <Select value={clinic} onValueChange={setClinic}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Unidades</SelectItem>
                                        <SelectItem value="uti-adulto">UTI Adulto</SelectItem>
                                        <SelectItem value="uti-pediatrica">UTI Pediátrica</SelectItem>
                                        <SelectItem value="enfermaria">Enfermaria</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Paciente */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Paciente
                                </Label>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nome..."
                                        className="pl-8"
                                        value={patientSearch}
                                        onChange={e => setPatientSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Data */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    Data
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "dd/MM/yyyy") : <span>Selecione</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Seleção de Horários */}
                        <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <Label className="font-semibold">Horários das Dietas</Label>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={selectAllTimes}>Todos</Button>
                                    <Button variant="outline" size="sm" onClick={clearAllTimes}>Limpar</Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                {SCHEDULE_TIMES.map(time => (
                                    <div
                                        key={time}
                                        onClick={() => toggleTime(time)}
                                        className={`px-3 py-2 rounded-lg text-center cursor-pointer transition-all border-2 ${selectedTimes.includes(time)
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-muted/50 border-muted hover:border-primary/50'
                                            }`}
                                    >
                                        <span className="text-sm font-medium">{time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Etiquetas */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Etiquetas Disponíveis</CardTitle>
                                <CardDescription>{filteredPrescriptions.length} etiqueta(s) encontrada(s)</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={selectAllLabels}>
                                    Selecionar Todas
                                </Button>
                                <Button variant="outline" size="sm" onClick={clearAllLabels}>
                                    Limpar Seleção
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredPrescriptions.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground">
                                Nenhuma etiqueta encontrada para os filtros selecionados
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredPrescriptions.map(prescription => (
                                    <div
                                        key={prescription.id}
                                        className={`relative cursor-pointer transition-all ${selectedLabels.includes(prescription.id)
                                                ? 'ring-2 ring-primary ring-offset-2'
                                                : ''
                                            }`}
                                        onClick={() => toggleLabel(prescription.id)}
                                    >
                                        {/* Checkbox overlay */}
                                        <div className="absolute top-2 right-2 z-10">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedLabels.includes(prescription.id)
                                                    ? 'bg-primary text-white'
                                                    : 'bg-white border-2 border-gray-300'
                                                }`}>
                                                {selectedLabels.includes(prescription.id) && (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>

                                        {/* Horários da prescrição */}
                                        <div className="absolute top-2 left-2 z-10 flex gap-1">
                                            {prescription.times.filter(t => selectedTimes.includes(t)).map(t => (
                                                <span key={t} className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-xs">{t}</span>
                                            ))}
                                        </div>

                                        <div className="transform scale-[0.85] origin-top-left">
                                            <LabelPreview data={prescription} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Área de Impressão (oculta na tela, visível apenas na impressão) */}
                <div className="print:block hidden">
                    <div className="grid grid-cols-2 gap-4">
                        {filteredPrescriptions
                            .filter(p => selectedLabels.includes(p.id))
                            .map(prescription => (
                                <div key={prescription.id} className="page-break-inside-avoid">
                                    <LabelPreview data={prescription} />
                                </div>
                            ))}
                    </div>
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default Labels;
