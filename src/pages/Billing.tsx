import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Printer, FileText, DollarSign, Clock, Building, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { usePatients, useClinics } from "@/hooks/useDatabase";

// Horários disponíveis das dietas
const SCHEDULE_TIMES = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00", "03:00"];

const Billing = () => {
    const { patients, isLoading: patientsLoading } = usePatients();
    const { clinics } = useClinics();

    const [startDate, setStartDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    const [unit, setUnit] = useState("all");
    const [selectedTimes, setSelectedTimes] = useState<string[]>([...SCHEDULE_TIMES]);

    // Configurações de assinaturas personalizáveis
    const [signatureConfig] = useState({
        signature1: "Nutricionista Prescritor",
        signature2: "Técnico em Nutrição",
        signature3: "Nutricionista Responsável Técnica"
    });

    // Obter lista única de setores/unidades
    const wards = useMemo(() => {
        const uniqueWards = new Set<string>();
        patients.forEach(p => {
            if (p.ward) uniqueWards.add(p.ward);
        });
        return Array.from(uniqueWards);
    }, [patients]);

    // Filtrar pacientes ativos com nutrição enteral ou parenteral
    const filteredPatients = useMemo(() => {
        let filtered = patients.filter(p =>
            p.status === 'active' &&
            (p.nutritionType === 'enteral' || p.nutritionType === 'parenteral')
        );

        if (unit !== "all") {
            filtered = filtered.filter(p => p.ward === unit);
        }

        return filtered;
    }, [patients, unit]);

    // Resumo por unidade
    const summaryByUnit = useMemo(() => {
        const summary: Record<string, { patients: number; enteral: number; parenteral: number }> = {};

        patients.filter(p => p.status === 'active').forEach(patient => {
            const unitName = patient.ward || 'Sem Unidade';
            if (!summary[unitName]) {
                summary[unitName] = { patients: 0, enteral: 0, parenteral: 0 };
            }
            summary[unitName].patients += 1;
            if (patient.nutritionType === 'enteral') summary[unitName].enteral += 1;
            if (patient.nutritionType === 'parenteral') summary[unitName].parenteral += 1;
        });

        return summary;
    }, [patients]);

    const handlePrint = () => {
        window.print();
    };

    const toggleTime = (time: string) => {
        if (selectedTimes.includes(time)) {
            setSelectedTimes(selectedTimes.filter(t => t !== time));
        } else {
            setSelectedTimes([...selectedTimes, time]);
        }
    };

    const selectAllTimes = () => setSelectedTimes([...SCHEDULE_TIMES]);
    const clearAllTimes = () => setSelectedTimes([]);

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />
            <div className="container py-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Requisição e Faturamento</h1>
                        <p className="text-muted-foreground">Controle de insumos por unidade, data e horário</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimir
                        </Button>
                        <Button>
                            <FileText className="h-4 w-4 mr-2" />
                            Gerar PDF
                        </Button>
                    </div>
                </div>

                {/* Filtros */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Unidade/Clínica</Label>
                                <Select value={unit} onValueChange={setUnit}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Unidades</SelectItem>
                                        {wards.map(ward => (
                                            <SelectItem key={ward} value={ward}>{ward}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Data Inicial</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={ptBR} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Data Final</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={ptBR} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Seleção de Horários */}
                        <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <Label className="font-semibold">Horários</Label>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={selectAllTimes}>Todos</Button>
                                    <Button variant="outline" size="sm" onClick={clearAllTimes}>Limpar</Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">
                                Selecione os horários para gerar requisições parciais
                            </p>
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

                {/* Resumo do Período - Todas as Alas */}
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5 text-blue-600" />
                            Resumo do Período - Todas as Alas
                        </CardTitle>
                        <CardDescription>
                            Visão geral de todas as unidades para o período: {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "-"} a {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "-"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {patientsLoading ? (
                            <p className="text-center text-muted-foreground py-4">Carregando...</p>
                        ) : Object.keys(summaryByUnit).length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">Nenhum paciente ativo encontrado</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {Object.entries(summaryByUnit).map(([unitName, data]) => (
                                    <div key={unitName} className="p-4 bg-white rounded-lg border">
                                        <h4 className="font-semibold text-lg mb-2">{unitName}</h4>
                                        <div className="space-y-1 text-sm">
                                            <p><span className="text-muted-foreground">Pacientes:</span> <span className="font-medium">{data.patients}</span></p>
                                            <p><span className="text-muted-foreground">TNE:</span> <span className="font-medium">{data.enteral}</span></p>
                                            <p><span className="text-muted-foreground">TNP:</span> <span className="font-medium">{data.parenteral}</span></p>
                                        </div>
                                    </div>
                                ))}
                                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                                    <h4 className="font-semibold text-lg mb-2 text-primary">Total Geral</h4>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="text-muted-foreground">Pacientes:</span> <span className="font-medium">{Object.values(summaryByUnit).reduce((sum, d) => sum + d.patients, 0)}</span></p>
                                        <p><span className="text-muted-foreground">TNE:</span> <span className="font-medium">{Object.values(summaryByUnit).reduce((sum, d) => sum + d.enteral, 0)}</span></p>
                                        <p><span className="text-muted-foreground">TNP:</span> <span className="font-medium">{Object.values(summaryByUnit).reduce((sum, d) => sum + d.parenteral, 0)}</span></p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pacientes com Terapia Nutricional</CardTitle>
                                {selectedTimes.length < SCHEDULE_TIMES.length && (
                                    <CardDescription className="text-orange-600">
                                        ⚠️ Requisição parcial: {selectedTimes.length} de {SCHEDULE_TIMES.length} horários selecionados
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent>
                                {patientsLoading ? (
                                    <p className="text-center py-8 text-muted-foreground">Carregando pacientes...</p>
                                ) : filteredPatients.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">
                                            Nenhum paciente com terapia nutricional encontrado
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Cadastre pacientes e prescrições na seção de Pacientes
                                        </p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Leito</TableHead>
                                                <TableHead>Paciente</TableHead>
                                                <TableHead>Prontuário</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>Setor</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredPatients.map(patient => (
                                                <TableRow key={patient.id}>
                                                    <TableCell className="font-medium">{patient.bed || '-'}</TableCell>
                                                    <TableCell>{patient.name}</TableCell>
                                                    <TableCell>{patient.record}</TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${patient.nutritionType === 'enteral'
                                                            ? 'bg-purple-100 text-purple-700'
                                                            : 'bg-orange-100 text-orange-700'
                                                            }`}>
                                                            {patient.nutritionType === 'enteral' ? 'TNE' : 'TNP'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>{patient.ward || '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="bg-primary/5 border-primary/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-primary" />
                                    Resumo Financeiro
                                </CardTitle>
                                <CardDescription>
                                    Os custos serão calculados quando houver prescrições ativas
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8">
                                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">
                                        Configure prescrições para ver o faturamento
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Seção de Assinaturas - Apenas para impressão */}
                <div className="print:block hidden mt-8">
                    <Separator className="my-8" />
                    <div className="grid grid-cols-3 gap-8 pt-16">
                        <div className="text-center">
                            <div className="border-t border-black pt-2">
                                <p className="font-medium">{signatureConfig.signature1}</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="border-t border-black pt-2">
                                <p className="font-medium">{signatureConfig.signature2}</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="border-t border-black pt-2">
                                <p className="font-medium">{signatureConfig.signature3}</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-8">
                        Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default Billing;
