import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Clock, DollarSign, FileText, Printer, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { RequisitionDocument } from "@/components/billing/RequisitionDocument";
import { useFormulas, useModules, usePatients, usePrescriptions, useSupplies } from "@/hooks/useDatabase";
import { prescriptionsService, Prescription } from "@/lib/database";
import { RequisitionData } from "@/types/requisition";
import { generateRequisitionData } from "@/utils/requisitionGenerator";
import { toast } from "sonner";

const SCHEDULE_TIMES = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00", "03:00"];
const THERAPY_OPTIONS = [
    { value: "all", label: "Todas as vias" },
    { value: "enteral", label: "Enteral" },
    { value: "oral", label: "Via oral" },
    { value: "parenteral", label: "Parenteral" },
] as const;

type TherapyFilter = (typeof THERAPY_OPTIONS)[number]["value"];

const formatDate = (date: Date | string | undefined | null) => {
    if (!date) return "-";

    const parsedDate = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "-";

    return new Intl.DateTimeFormat("pt-BR").format(parsedDate);
};

const Billing = () => {
    const { patients, isLoading: patientsLoading } = usePatients();
    const { prescriptions, isLoading: prescriptionsLoading, refetch: refetchPrescriptions } = usePrescriptions();
    const { formulas } = useFormulas();
    const { modules } = useModules();
    const { supplies } = useSupplies();

    const [startDate, setStartDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    const [unit, setUnit] = useState("all");
    const [therapyFilter, setTherapyFilter] = useState<TherapyFilter>("all");
    const [selectedTimes, setSelectedTimes] = useState<string[]>([...SCHEDULE_TIMES]);
    const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
    const [requisitionData, setRequisitionData] = useState<RequisitionData | null>(null);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<Prescription | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelEffectiveDate, setCancelEffectiveDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [isCancelling, setIsCancelling] = useState(false);

    const signatureConfig = {
        signature1: "Nutricionista prescritor",
        signature2: "Tecnico responsavel",
        signature3: "Nutricionista RT ou da concessionaria",
    };

    const wards = useMemo(() => {
        const uniqueWards = new Set<string>();
        patients.forEach((patient) => {
            if (patient.ward) uniqueWards.add(patient.ward);
        });
        return Array.from(uniqueWards).sort((left, right) => left.localeCompare(right));
    }, [patients]);

    const activePrescriptions = useMemo(
        () => prescriptions.filter((prescription) => prescription.status === "active"),
        [prescriptions],
    );

    const filteredPrescriptions = useMemo(() => {
        return activePrescriptions.filter((prescription) => {
            const matchesUnit = unit === "all" || prescription.patientWard === unit;
            const matchesTherapy = therapyFilter === "all" || prescription.therapyType === therapyFilter;
            const matchesPatient = selectedPatients.length === 0 || selectedPatients.includes(prescription.patientId);
            return matchesUnit && matchesTherapy && matchesPatient;
        });
    }, [activePrescriptions, selectedPatients, therapyFilter, unit]);

    const prescriptionTypesByPatient = useMemo(() => {
        const map = new Map<string, Set<string>>();

        activePrescriptions.forEach((prescription) => {
            if (unit !== "all" && prescription.patientWard !== unit) return;
            if (therapyFilter !== "all" && prescription.therapyType !== therapyFilter) return;

            const types = map.get(prescription.patientId) || new Set<string>();
            types.add(prescription.therapyType);
            map.set(prescription.patientId, types);
        });

        return map;
    }, [activePrescriptions, therapyFilter, unit]);

    const filteredPatients = useMemo(() => {
        return patients.filter((patient) => {
            if (patient.status !== "active") return false;
            if (unit !== "all" && patient.ward !== unit) return false;
            return prescriptionTypesByPatient.has(patient.id || "");
        });
    }, [patients, prescriptionTypesByPatient, unit]);

    const summaryByUnit = useMemo(() => {
        const summary: Record<string, { patients: number; enteral: number; oral: number; parenteral: number }> = {};

        filteredPatients.forEach((patient) => {
            const unitName = patient.ward || "Sem Unidade";
            if (!summary[unitName]) {
                summary[unitName] = { patients: 0, enteral: 0, oral: 0, parenteral: 0 };
            }

            summary[unitName].patients += 1;
            const patientTypes = prescriptionTypesByPatient.get(patient.id || "") || new Set<string>();
            if (patientTypes.has("enteral")) summary[unitName].enteral += 1;
            if (patientTypes.has("oral")) summary[unitName].oral += 1;
            if (patientTypes.has("parenteral")) summary[unitName].parenteral += 1;
        });

        return summary;
    }, [filteredPatients, prescriptionTypesByPatient]);

    const totalGeneral = useMemo(() => {
        return Object.values(summaryByUnit).reduce(
            (acc, curr) => ({
                patients: acc.patients + curr.patients,
                enteral: acc.enteral + curr.enteral,
                oral: acc.oral + curr.oral,
                parenteral: acc.parenteral + curr.parenteral,
            }),
            { patients: 0, enteral: 0, oral: 0, parenteral: 0 },
        );
    }, [summaryByUnit]);

    const previewRequisitionData = useMemo(() => {
        if (!startDate || !endDate) return null;

        return generateRequisitionData({
            prescriptions: filteredPrescriptions,
            patients,
            formulas,
            modules,
            supplies,
            unitName: unit,
            therapyLabel: THERAPY_OPTIONS.find((option) => option.value === therapyFilter)?.label || "Todas as vias",
            startDate,
            endDate,
            selectedTimes,
            signatures: {
                prescriber: signatureConfig.signature1,
                technician: signatureConfig.signature2,
                manager: signatureConfig.signature3,
            },
        });
    }, [endDate, filteredPrescriptions, formulas, modules, patients, selectedTimes, startDate, supplies, unit]);

    const totalEstimated = useMemo(() => {
        if (!previewRequisitionData) return 0;
        return previewRequisitionData.consolidated.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    }, [previewRequisitionData]);

    const handleGenerateRequisition = () => {
        if (!previewRequisitionData) return;

        setRequisitionData(previewRequisitionData);
        setTimeout(() => window.print(), 100);
    };

    const openTechnicalCancelDialog = (prescription: Prescription) => {
        setCancelTarget(prescription);
        setCancelReason("");
        setCancelEffectiveDate(new Date().toISOString().split("T")[0]);
        setCancelDialogOpen(true);
    };

    const handleTechnicalCancel = async () => {
        if (!cancelTarget?.id) return;
        if (!cancelReason.trim()) {
            toast.error("Informe o motivo do cancelamento técnico.");
            return;
        }

        const changedBy = typeof window !== "undefined" ? localStorage.getItem("userName") || "Usuario do sistema" : "Usuario do sistema";

        try {
            setIsCancelling(true);
            await prescriptionsService.updateStatus(cancelTarget.id, {
                status: "suspended",
                reason: cancelReason.trim(),
                changedBy,
                effectiveDate: cancelEffectiveDate,
            });
            await refetchPrescriptions();
            toast.success("Prescricao suspensa com cancelamento tecnico registrado.");
            setCancelDialogOpen(false);
            setCancelTarget(null);
            setCancelReason("");
        } catch (error) {
            console.error("Failed to cancel prescription technically", error);
            toast.error("Nao foi possivel registrar o cancelamento tecnico.");
        } finally {
            setIsCancelling(false);
        }
    };

    const toggleTime = (time: string) => {
        setSelectedTimes((current) =>
            current.includes(time) ? current.filter((item) => item !== time) : [...current, time],
        );
    };

    const togglePatient = (patientId: string) => {
        setSelectedPatients((current) =>
            current.includes(patientId) ? current.filter((id) => id !== patientId) : [...current, patientId],
        );
    };

    const toggleAllPatients = () => {
        if (selectedPatients.length === filteredPatients.length) {
            setSelectedPatients([]);
            return;
        }

        setSelectedPatients(filteredPatients.map((patient) => patient.id || "").filter(Boolean));
    };

    const selectAllTimes = () => setSelectedTimes([...SCHEDULE_TIMES]);
    const clearAllTimes = () => setSelectedTimes([]);

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="print:hidden">
                <Header />
            </div>

            <div className="container py-6 space-y-6 print:hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Requisicao e Faturamento</h1>
                        <p className="text-muted-foreground">Controle de insumos por unidade, horario e via, com preview financeiro antes da impressao.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleGenerateRequisition} disabled={!previewRequisitionData || prescriptionsLoading}>
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimir
                        </Button>
                        <Button onClick={handleGenerateRequisition} disabled={!previewRequisitionData || prescriptionsLoading}>
                            <FileText className="h-4 w-4 mr-2" />
                            Gerar PDF
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                        <CardDescription>Monte a requisicao por setor, periodo, via e horarios.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Unidade/Clinica</Label>
                                <Select value={unit} onValueChange={setUnit}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Unidades</SelectItem>
                                        {wards.map((ward) => (
                                            <SelectItem key={ward} value={ward}>
                                                {ward}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Via/Terapia</Label>
                                <Select value={therapyFilter} onValueChange={(value) => setTherapyFilter(value as TherapyFilter)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {THERAPY_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
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
                                            {startDate ? formatDate(startDate) : <span>Selecione</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label>Data Final</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDate ? formatDate(endDate) : <span>Selecione</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <Label className="font-semibold">Horarios</Label>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={selectAllTimes}>Todos</Button>
                                    <Button variant="outline" size="sm" onClick={clearAllTimes}>Limpar</Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                {SCHEDULE_TIMES.map((time) => (
                                    <div
                                        key={time}
                                        onClick={() => toggleTime(time)}
                                        className={`px-3 py-2 rounded-lg text-center cursor-pointer transition-all border-2 ${selectedTimes.includes(time)
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-muted/50 border-muted hover:border-primary/50"
                                            }`}
                                    >
                                        <span className="text-sm font-medium">{time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle>Resumo por Unidade</CardTitle>
                        <CardDescription>
                            Periodo: {formatDate(startDate)} a {formatDate(endDate)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {patientsLoading ? (
                            <p className="text-center text-muted-foreground py-4">Carregando...</p>
                        ) : Object.keys(summaryByUnit).length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">Nenhum paciente ativo com prescricoes encontradas.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {Object.entries(summaryByUnit).map(([unitName, data]) => (
                                    <div key={unitName} className="p-4 bg-white rounded-lg border">
                                        <h4 className="font-semibold text-lg mb-2">{unitName}</h4>
                                        <div className="space-y-1 text-sm">
                                            <p><span className="text-muted-foreground">Pacientes:</span> <span className="font-medium">{data.patients}</span></p>
                                            <p><span className="text-muted-foreground">TNE:</span> <span className="font-medium">{data.enteral}</span></p>
                                            <p><span className="text-muted-foreground">VO:</span> <span className="font-medium">{data.oral}</span></p>
                                            <p><span className="text-muted-foreground">TNP:</span> <span className="font-medium">{data.parenteral}</span></p>
                                        </div>
                                    </div>
                                ))}
                                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                                    <h4 className="font-semibold text-lg mb-2 text-primary">Total Geral</h4>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="text-muted-foreground">Pacientes:</span> <span className="font-medium">{totalGeneral.patients}</span></p>
                                        <p><span className="text-muted-foreground">TNE:</span> <span className="font-medium">{totalGeneral.enteral}</span></p>
                                        <p><span className="text-muted-foreground">VO:</span> <span className="font-medium">{totalGeneral.oral}</span></p>
                                        <p><span className="text-muted-foreground">TNP:</span> <span className="font-medium">{totalGeneral.parenteral}</span></p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Pacientes com Terapia Nutricional</CardTitle>
                                    <div className="text-sm text-muted-foreground">{selectedPatients.length} selecionados</div>
                                </div>
                                {selectedTimes.length < SCHEDULE_TIMES.length && (
                                    <CardDescription className="text-orange-600">
                                        Requisicao parcial: {selectedTimes.length} de {SCHEDULE_TIMES.length} horarios selecionados
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent>
                                {patientsLoading ? (
                                    <p className="text-center py-8 text-muted-foreground">Carregando pacientes...</p>
                                ) : filteredPatients.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">Nenhum paciente com terapia nutricional encontrado.</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]">
                                                    <Checkbox
                                                        checked={selectedPatients.length === filteredPatients.length && filteredPatients.length > 0}
                                                        onCheckedChange={toggleAllPatients}
                                                    />
                                                </TableHead>
                                                <TableHead>Leito</TableHead>
                                                <TableHead>Paciente</TableHead>
                                                <TableHead>Prontuario</TableHead>
                                                <TableHead>Via</TableHead>
                                                <TableHead>Setor</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredPatients.map((patient) => {
                                                const patientTypes = Array.from(prescriptionTypesByPatient.get(patient.id || "") || []);

                                                return (
                                                    <TableRow key={patient.id}>
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={selectedPatients.includes(patient.id || "")}
                                                                onCheckedChange={() => patient.id && togglePatient(patient.id)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-medium">{patient.bed || "-"}</TableCell>
                                                        <TableCell>{patient.name}</TableCell>
                                                        <TableCell>{patient.record}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1">
                                                                {patientTypes.map((type) => (
                                                                    <span
                                                                        key={type}
                                                                        className={`px-2 py-1 rounded text-xs font-medium ${type === "enteral"
                                                                            ? "bg-purple-100 text-purple-700"
                                                                            : type === "oral"
                                                                                ? "bg-green-100 text-green-700"
                                                                                : "bg-orange-100 text-orange-700"
                                                                            }`}
                                                                    >
                                                                        {type === "enteral" ? "TNE" : type === "oral" ? "VO" : "TNP"}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{patient.ward || "-"}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
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
                                <CardDescription>Preview calculado com os filtros atuais.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {previewRequisitionData ? (
                                    <div className="space-y-4">
                                        <div className="rounded-lg border bg-background p-4 text-center">
                                            <div className="text-2xl font-bold text-primary">
                                                {totalEstimated.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Total estimado do periodo</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg border bg-background p-3 text-center">
                                                <div className="text-2xl font-bold">{previewRequisitionData.consolidated.length}</div>
                                                <div className="text-xs text-muted-foreground">Itens faturaveis</div>
                                            </div>
                                            <div className="rounded-lg border bg-background p-3 text-center">
                                                <div className="text-2xl font-bold">{new Set(previewRequisitionData.dietMap.map((item) => item.patientId)).size}</div>
                                                <div className="text-xs text-muted-foreground">Pacientes no mapa</div>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="text-muted-foreground">Linhas do mapa:</span> <span className="font-medium">{previewRequisitionData.dietMap.length}</span></p>
                                            <p><span className="text-muted-foreground">Horarios:</span> <span className="font-medium">{selectedTimes.length === 0 ? "Nenhum" : selectedTimes.join(", ")}</span></p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">Selecione um periodo valido para visualizar o faturamento.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Controle operacional das prescricoes ativas</CardTitle>
                                <CardDescription>
                                    Suspensoes tecnicas registram motivo, data efetiva e responsavel para auditoria.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {filteredPrescriptions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Nenhuma prescricao ativa encontrada com os filtros atuais.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredPrescriptions.slice(0, 8).map((prescription) => (
                                            <div key={prescription.id} className="rounded-lg border p-3 bg-background">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <p className="font-medium">{prescription.patientName || "Paciente sem nome"}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {prescription.patientBed || "-"} | {prescription.patientWard || "-"} |{" "}
                                                            {prescription.therapyType === "enteral"
                                                                ? "Enteral"
                                                                : prescription.therapyType === "oral"
                                                                    ? "Via oral"
                                                                    : "Parenteral"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Inicio: {formatDate(prescription.startDate)}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openTechnicalCancelDialog(prescription)}
                                                    >
                                                        Cancelamento tecnico
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredPrescriptions.length > 8 && (
                                            <p className="text-xs text-muted-foreground">
                                                Exibindo 8 prescricoes. Ajuste os filtros para agir em itens especificos.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <RequisitionDocument data={requisitionData} />

            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancelamento tecnico da prescricao</DialogTitle>
                        <DialogDescription>
                            Isso suspende a prescricao ativa e registra motivo, data efetiva e responsavel.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="rounded-md border bg-muted/30 p-3 text-sm">
                            <p className="font-medium">{cancelTarget?.patientName || "-"}</p>
                            <p className="text-muted-foreground">
                                {cancelTarget?.therapyType === "enteral"
                                    ? "Enteral"
                                    : cancelTarget?.therapyType === "oral"
                                        ? "Via oral"
                                        : "Parenteral"}{" "}
                                | Inicio {cancelTarget?.startDate ? formatDate(cancelTarget.startDate) : "-"}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cancel-effective-date">Data efetiva</Label>
                            <Input
                                id="cancel-effective-date"
                                type="date"
                                value={cancelEffectiveDate}
                                onChange={(event) => setCancelEffectiveDate(event.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cancel-reason">Motivo do cancelamento tecnico</Label>
                            <Textarea
                                id="cancel-reason"
                                value={cancelReason}
                                onChange={(event) => setCancelReason(event.target.value)}
                                placeholder="Ex: suspensa por procedimento, troca de conduta, impossibilidade temporaria de administracao..."
                                rows={4}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCancelDialogOpen(false)}
                            disabled={isCancelling}
                        >
                            Fechar
                        </Button>
                        <Button onClick={handleTechnicalCancel} disabled={isCancelling}>
                            {isCancelling ? "Salvando..." : "Confirmar cancelamento"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="print:hidden">
                <BottomNav />
            </div>
        </div>
    );
};

export default Billing;
