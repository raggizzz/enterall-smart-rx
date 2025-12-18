import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Printer, FileText, DollarSign, Clock, Building } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";

// Horários disponíveis das dietas
const SCHEDULE_TIMES = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00", "03:00"];

const Billing = () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [unit, setUnit] = useState("all");
    const [selectedTimes, setSelectedTimes] = useState<string[]>([...SCHEDULE_TIMES]); // Por padrão, todos selecionados

    // Configurações de assinaturas personalizáveis (seria salvo em configurações do sistema)
    const [signatureConfig] = useState({
        signature1: "Nutricionista Prescritor",
        signature2: "Técnico em Nutrição",
        signature3: "Nutricionista Responsável Técnica"
    });

    // Mock Data for Requisition - agora com horários
    const requisitionData = [
        {
            patient: "Maria Silva",
            bed: "01",
            unit: "uti-adulto",
            items: [
                { code: "FNEA07", name: "Nutrison Energy", quantity: 250, unit: "mL", time: "06:00" },
                { code: "FNEA07", name: "Nutrison Energy", quantity: 250, unit: "mL", time: "09:00" },
                { code: "FR20", name: "Frasco 500ml", quantity: 1, unit: "un", time: "06:00" },
                { code: "EQ01", name: "Equipo Gravitacional", quantity: 1, unit: "un", time: "06:00" },
            ]
        },
        {
            patient: "João Santos",
            bed: "02",
            unit: "uti-adulto",
            items: [
                { code: "FNEA07", name: "Nutrison Energy", quantity: 300, unit: "mL", time: "09:00" },
                { code: "FNEA07", name: "Nutrison Energy", quantity: 300, unit: "mL", time: "12:00" },
                { code: "FR20", name: "Frasco 500ml", quantity: 2, unit: "un", time: "09:00" },
            ]
        },
        {
            patient: "Ana Costa",
            bed: "03",
            unit: "uti-pediatrica",
            items: [
                { code: "FNEA07", name: "Nutrison Energy", quantity: 150, unit: "mL", time: "09:00" },
                { code: "FNEA07", name: "Nutrison Energy", quantity: 150, unit: "mL", time: "15:00" },
            ]
        }
    ];

    // Filtrar dados por unidade e horários selecionados
    const filteredData = requisitionData
        .filter(p => unit === "all" || p.unit === unit)
        .map(p => ({
            ...p,
            items: p.items.filter(item => selectedTimes.includes(item.time))
        }))
        .filter(p => p.items.length > 0);

    // Calcular resumo do dia por ala
    const summaryByUnit = requisitionData.reduce((acc, patient) => {
        const unitName = patient.unit === "uti-adulto" ? "UTI Adulto" : "UTI Pediátrica";
        if (!acc[unitName]) {
            acc[unitName] = { patients: 0, totalItems: 0, totalVolume: 0 };
        }
        acc[unitName].patients += 1;
        acc[unitName].totalItems += patient.items.length;
        acc[unitName].totalVolume += patient.items
            .filter(i => i.unit === "mL")
            .reduce((sum, i) => sum + i.quantity, 0);
        return acc;
    }, {} as Record<string, { patients: number; totalItems: number; totalVolume: number }>);

    // Mock Data for Billing Summary
    const billingSummary = [
        { code: "FNEA07", name: "Nutrison Energy", totalQty: 1400, unit: "mL", price: 0.05, total: 70.00 },
        { code: "FR20", name: "Frasco 500ml", totalQty: 3, unit: "un", price: 2.50, total: 7.50 },
        { code: "EQ01", name: "Equipo Gravitacional", totalQty: 1, unit: "un", price: 4.00, total: 4.00 },
    ];

    const totalBilling = billingSummary.reduce((acc, item) => acc + item.total, 0);

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

    const selectAllTimes = () => {
        setSelectedTimes([...SCHEDULE_TIMES]);
    };

    const clearAllTimes = () => {
        setSelectedTimes([]);
    };

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
                                        <SelectItem value="uti-adulto">UTI Adulto</SelectItem>
                                        <SelectItem value="uti-pediatrica">UTI Pediátrica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "dd/MM/yyyy") : <span>Selecione uma data</span>}
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
                                    <Label className="font-semibold">Horários</Label>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={selectAllTimes}>
                                        Todos
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={clearAllTimes}>
                                        Limpar
                                    </Button>
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

                {/* Resumo do Dia - Todas as Alas */}
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5 text-blue-600" />
                            Resumo do Dia - Todas as Alas
                        </CardTitle>
                        <CardDescription>Visão geral de todas as unidades para {date ? format(date, "dd/MM/yyyy") : "hoje"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.entries(summaryByUnit).map(([unitName, data]) => (
                                <div key={unitName} className="p-4 bg-white rounded-lg border">
                                    <h4 className="font-semibold text-lg mb-2">{unitName}</h4>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="text-muted-foreground">Pacientes:</span> <span className="font-medium">{data.patients}</span></p>
                                        <p><span className="text-muted-foreground">Total de itens:</span> <span className="font-medium">{data.totalItems}</span></p>
                                        <p><span className="text-muted-foreground">Volume total:</span> <span className="font-medium">{data.totalVolume} mL</span></p>
                                    </div>
                                </div>
                            ))}
                            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                                <h4 className="font-semibold text-lg mb-2 text-primary">Total Geral</h4>
                                <div className="space-y-1 text-sm">
                                    <p><span className="text-muted-foreground">Pacientes:</span> <span className="font-medium">{Object.values(summaryByUnit).reduce((sum, d) => sum + d.patients, 0)}</span></p>
                                    <p><span className="text-muted-foreground">Total de itens:</span> <span className="font-medium">{Object.values(summaryByUnit).reduce((sum, d) => sum + d.totalItems, 0)}</span></p>
                                    <p><span className="text-muted-foreground">Volume total:</span> <span className="font-medium">{Object.values(summaryByUnit).reduce((sum, d) => sum + d.totalVolume, 0)} mL</span></p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Requisição por Paciente</CardTitle>
                                {selectedTimes.length < SCHEDULE_TIMES.length && (
                                    <CardDescription className="text-orange-600">
                                        ⚠️ Requisição parcial: {selectedTimes.length} de {SCHEDULE_TIMES.length} horários selecionados
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent>
                                {filteredData.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">
                                        Nenhum item encontrado para os filtros selecionados
                                    </p>
                                ) : (
                                    filteredData.map((patient, index) => (
                                        <div key={index} className="mb-6 last:mb-0 border-b last:border-0 pb-4 last:pb-0">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-semibold text-lg">{patient.patient}</h3>
                                                <span className="text-sm text-muted-foreground">Leito: {patient.bed}</span>
                                            </div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Horário</TableHead>
                                                        <TableHead>Código</TableHead>
                                                        <TableHead>Produto</TableHead>
                                                        <TableHead className="text-right">Qtd</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {patient.items.map((item, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell>{item.time}</TableCell>
                                                            <TableCell className="font-mono text-xs">{item.code}</TableCell>
                                                            <TableCell>{item.name}</TableCell>
                                                            <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ))
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
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Produto</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {billingSummary.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="text-xs text-muted-foreground">{item.totalQty} {item.unit} x R$ {item.price.toFixed(2)}</div>
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    R$ {item.total.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow>
                                            <TableCell className="font-bold text-lg">Total Geral</TableCell>
                                            <TableCell className="text-right font-bold text-lg text-primary">
                                                R$ {totalBilling.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
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
                        Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default Billing;
