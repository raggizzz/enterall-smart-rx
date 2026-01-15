import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Printer, Search, Tag, Clock, Building, User, Database } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import LabelPreview from "@/components/LabelPreview";
import { usePrescriptions, usePatients, useClinics, useSettings } from "@/hooks/useDatabase";

// Horários disponíveis das dietas
const SCHEDULE_TIMES = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00", "03:00"];

const Labels = () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [clinic, setClinic] = useState("all");
    const [patientSearch, setPatientSearch] = useState("");
    const [selectedTimes, setSelectedTimes] = useState<string[]>([...SCHEDULE_TIMES]);
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

    const { prescriptions, isLoading: prescriptionsLoading } = usePrescriptions();
    const { patients } = usePatients();
    const { clinics } = useClinics();
    const { settings } = useSettings();

    // Transform prescriptions to label data format
    const labelData = useMemo(() => {
        return prescriptions
            .filter(p => p.status === 'active')
            .map(prescription => {
                const patient = patients.find(pt => pt.id === prescription.patientId);

                // Get all schedules from formulas
                const allSchedules = prescription.formulas?.flatMap(f => f.schedules || []) || [];
                const uniqueSchedules = [...new Set(allSchedules)];

                return {
                    id: prescription.id || '',
                    patientName: prescription.patientName || patient?.name || 'Paciente',
                    bed: prescription.patientBed || patient?.bed || '-',
                    dob: patient?.dob ? format(new Date(patient.dob), 'dd/MM/yyyy') : '-',
                    clinic: prescription.patientWard || patient?.ward || 'UTI',
                    formulaName: prescription.formulas?.[0]?.formulaName || 'Fórmula Enteral',
                    totalVolume: prescription.totalVolume || 1000,
                    infusionRate: prescription.totalVolume ? `${Math.round(prescription.totalVolume / 12)} ml/h` : '83 ml/h',
                    route: prescription.feedingRoute || 'SNE',
                    manipulationDate: format(new Date(), "dd/MM/yyyy"),
                    validity: format(new Date(), "dd/MM/yyyy") + " 23:59",
                    conservation: settings?.labelSettings?.defaultConservation || "Refrigerar 2-8°C",
                    rtName: settings?.defaultSignatures?.rtName || "RT Nutrição",
                    rtCrn: settings?.defaultSignatures?.rtCrn || "CRN-0000",
                    lot: "LOT" + format(new Date(), "ddMMyyyy"),
                    systemType: prescription.systemType as 'open' | 'closed',
                    times: uniqueSchedules.length > 0 ? uniqueSchedules : ["06:00", "12:00", "18:00"]
                };
            });
    }, [prescriptions, patients, settings]);

    // Filter prescriptions
    const filteredPrescriptions = labelData.filter(p => {
        const matchClinic = clinic === "all" || p.clinic.toLowerCase().includes(clinic.toLowerCase());
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
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Geração de etiquetas baseada em prescrições do banco local
                        </p>
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
                                        {clinics.map(c => (
                                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                        ))}
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
                                            {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={ptBR} />
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
                                <CardDescription>
                                    {prescriptionsLoading
                                        ? 'Carregando prescrições...'
                                        : `${filteredPrescriptions.length} etiqueta(s) encontrada(s)`
                                    }
                                </CardDescription>
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
                        {prescriptionsLoading ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Carregando prescrições do banco de dados...
                            </div>
                        ) : filteredPrescriptions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>Nenhuma etiqueta encontrada para os filtros selecionados</p>
                                <p className="text-sm mt-2">
                                    Crie prescrições ativas na página de Prescrições para gerar etiquetas.
                                </p>
                            </div>
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
