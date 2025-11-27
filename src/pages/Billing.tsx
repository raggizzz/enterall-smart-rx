import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Printer, FileText, DollarSign } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";

const Billing = () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [unit, setUnit] = useState("uti-adulto");

    // Mock Data for Requisition
    const requisitionData = [
        {
            patient: "Maria Silva",
            bed: "01",
            items: [
                { code: "FNEA07", name: "Nutrison Energy", quantity: 1000, unit: "mL", time: "09:00" },
                { code: "FR20", name: "Frasco 500ml", quantity: 2, unit: "un", time: "09:00" },
                { code: "EQ01", name: "Equipo Gravitacional", quantity: 1, unit: "un", time: "09:00" },
            ]
        },
        {
            patient: "João Santos",
            bed: "02",
            items: [
                { code: "FNEA07", name: "Nutrison Energy", quantity: 1200, unit: "mL", time: "09:00" },
                { code: "FR20", name: "Frasco 500ml", quantity: 3, unit: "un", time: "09:00" },
            ]
        }
    ];

    // Mock Data for Billing Summary
    const billingSummary = [
        { code: "FNEA07", name: "Nutrison Energy", totalQty: 2200, unit: "mL", price: 0.05, total: 110.00 },
        { code: "FR20", name: "Frasco 500ml", totalQty: 5, unit: "un", price: 2.50, total: 12.50 },
        { code: "EQ01", name: "Equipo Gravitacional", totalQty: 1, unit: "un", price: 4.00, total: 4.00 },
    ];

    const totalBilling = billingSummary.reduce((acc, item) => acc + item.total, 0);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />
            <div className="container py-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Requisição e Faturamento</h1>
                        <p className="text-muted-foreground">Controle de insumos por unidade e data</p>
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

                <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Unidade</Label>
                            <Select value={unit} onValueChange={setUnit}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
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
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Requisição por Paciente</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {requisitionData.map((patient, index) => (
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
                                ))}
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

                        <Card>
                            <CardHeader>
                                <CardTitle>Assinaturas</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-6">
                                <div className="border-t border-dashed pt-2">
                                    <p className="text-sm text-center text-muted-foreground">Nutricionista (SES)</p>
                                </div>
                                <div className="border-t border-dashed pt-2">
                                    <p className="text-sm text-center text-muted-foreground">Técnico (SES)</p>
                                </div>
                                <div className="border-t border-dashed pt-2">
                                    <p className="text-sm text-center text-muted-foreground">Nutricionista (Prestadora)</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default Billing;
