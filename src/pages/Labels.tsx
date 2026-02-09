import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Printer, Search, Tag, Clock, Building, User, Database, ShieldCheck } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import LabelPreview, { LabelData } from "@/components/LabelPreview";
import { useClinics, useFormulas, usePatients, usePrescriptions, useSettings } from "@/hooks/useDatabase";

const SCHEDULE_TIMES = ["03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00"];

const toDateOnly = (date: Date): string => format(date, "dd/MM/yyyy", { locale: ptBR });

const normalize = (value?: string | null): string => {
    if (!value) return "-";
    return value;
};

const truncate = (text: string, limit: number): string => {
    if (text.length <= limit) return text;
    return `${text.slice(0, limit - 3)}...`;
};

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
    const { formulas } = useFormulas();

    const formulaMap = useMemo(() => {
        const map = new Map<string, { type?: string; presentationForm?: string; name?: string }>();
        formulas.forEach((formula) => {
            if (formula.id) {
                map.set(formula.id, {
                    type: formula.type,
                    presentationForm: formula.presentationForm,
                    name: formula.name,
                });
            }
        });
        return map;
    }, [formulas]);

    const clinicOptions = useMemo(() => {
        const fromData = new Set<string>();
        prescriptions.forEach((p) => {
            if (p.patientWard) fromData.add(p.patientWard);
        });
        patients.forEach((p) => {
            if (p.ward) fromData.add(p.ward);
        });
        clinics.forEach((c) => {
            if (c.name) fromData.add(c.name);
        });

        return Array.from(fromData).sort((a, b) => a.localeCompare(b));
    }, [clinics, patients, prescriptions]);

    const activeDate = useMemo(() => date || new Date(), [date]);
    const activeDateText = useMemo(() => toDateOnly(activeDate), [activeDate]);

    const labels = useMemo<LabelData[]>(() => {
        const list: LabelData[] = [];

        const rtName = settings?.defaultSignatures?.rtName || "RT nao cadastrado";
        const rtCrn = settings?.defaultSignatures?.rtCrn || "CRN nao cadastrado";
        const conservationDefault = settings?.labelSettings?.defaultConservation || "Conservar conforme protocolo da unidade.";

        const getRate = (prescription: (typeof prescriptions)[number]): string | undefined => {
            if (prescription.infusionRateMlH && prescription.infusionRateMlH > 0) {
                return `${Math.round(prescription.infusionRateMlH)} ml/h`;
            }
            if (prescription.totalVolume && prescription.infusionHoursPerDay && prescription.infusionHoursPerDay > 0) {
                return `${Math.round(prescription.totalVolume / prescription.infusionHoursPerDay)} ml/h`;
            }
            if (prescription.infusionMode === "gravity" && prescription.infusionDropsMin && prescription.infusionDropsMin > 0) {
                return `${Math.round(prescription.infusionDropsMin)} gotas/min`;
            }
            return undefined;
        };

        const buildControl = (prescriptionId: string | undefined, time: string | undefined, suffix: string): string => {
            const dateKey = format(activeDate, "yyyyMMdd");
            const timeKey = (time || "0000").replace(":", "");
            const idKey = (prescriptionId || "XXXX").replace(/-/g, "").slice(0, 6).toUpperCase();
            return `${dateKey}-${timeKey}-${suffix}-${idKey}`;
        };

        prescriptions
            .filter((prescription) => prescription.status === "active")
            .forEach((prescription) => {
                const patient = patients.find((p) => p.id === prescription.patientId);

                const patientName = normalize(prescription.patientName || patient?.name);
                const bed = normalize(prescription.patientBed || patient?.bed);
                const record = normalize(prescription.patientRecord || patient?.record);
                const dob = patient?.dob ? toDateOnly(new Date(patient.dob)) : "-";
                const clinicName = normalize(prescription.patientWard || patient?.ward || "Sem setor");
                const route = normalize(prescription.feedingRoute || (prescription.therapyType === "oral" ? "Oral" : "SNE"));
                const infusionRate = getRate(prescription);

                const formulaEntries = prescription.formulas || [];
                const moduleEntries = prescription.modules || [];

                const formulaSchedules = Array.from(
                    new Set(formulaEntries.flatMap((formula) => formula.schedules || []))
                );
                const moduleSchedules = Array.from(
                    new Set(moduleEntries.flatMap((module) => module.schedules || []))
                );
                const hydrationSchedules = Array.from(new Set(prescription.hydrationSchedules || []));

                const baseSchedules =
                    formulaSchedules.length > 0
                        ? formulaSchedules
                        : moduleSchedules.length > 0
                            ? moduleSchedules
                            : hydrationSchedules.length > 0
                                ? hydrationSchedules
                                : ["06:00"];

                const formulaSummary = truncate(
                    formulaEntries
                        .map((formula) => {
                            const volumeText = formula.volume ? ` ${Math.round(formula.volume)} ml` : "";
                            return `${formula.formulaName}${volumeText}`;
                        })
                        .join("; "),
                    90
                );

                const modulesSummary = truncate(
                    moduleEntries
                        .map((module) => `${module.moduleName} ${module.amount || 0}${module.unit || "g"}`)
                        .join("; "),
                    90
                );

                const hasPowderLike = formulaEntries.some((formula) => {
                    const meta = formulaMap.get(formula.formulaId);
                    const merged = `${meta?.name || ""} ${formula.formulaName}`.toLowerCase();
                    const isInfant = meta?.type === "infant-formula" || merged.includes("infantil");
                    const isPowder = meta?.presentationForm === "po" || merged.includes(" po") || merged.includes(" em po") || merged.includes("pó");
                    return isInfant || isPowder;
                });

                const hasOralSupplement = formulaEntries.some((formula) => {
                    const meta = formulaMap.get(formula.formulaId);
                    const merged = `${meta?.name || ""} ${formula.formulaName}`.toLowerCase();
                    return meta?.type === "oral-supplement" || merged.includes("suplement");
                });

                const hasDilution = (prescription.hydrationVolume || 0) > 0;

                const pushLabel = (data: Omit<LabelData, "id">, key: string) => {
                    const scheduleKey = data.scheduleTime || "00:00";
                    list.push({
                        ...data,
                        id: `${prescription.id || "sem-id"}-${key}-${scheduleKey}`,
                    });
                };

                if (prescription.therapyType === "enteral") {
                    if (prescription.systemType === "closed") {
                        baseSchedules.forEach((time) => {
                            pushLabel(
                                {
                                    clinic: clinicName,
                                    templateTitle: "DIETA - Sistema fechado",
                                    patientName,
                                    bed,
                                    record,
                                    dob,
                                    scheduleTime: time,
                                    infusionRate,
                                    route,
                                    formulaText: formulaSummary || "Formula enteral",
                                    compositionText: formulaSummary || undefined,
                                    volumeText: prescription.totalVolume ? `${Math.round(prescription.totalVolume)} ml` : undefined,
                                    manipulationDate: activeDateText,
                                    manipulationTime: time,
                                    validityText: "Validade: 24h apos conexao com equipo, em temperatura ambiente.",
                                    conservationText: "Conservacao: em temperatura ambiente.",
                                    rtName,
                                    rtCrn,
                                },
                                "enteral-closed"
                            );
                        });
                    } else {
                        const openTitle = hasPowderLike
                            ? "DIETA - Sistema aberto po e formula infantil"
                            : hasDilution
                                ? "DIETA - Sistema aberto liquido com diluicao"
                                : "DIETA - Sistema aberto liquido";

                        baseSchedules.forEach((time) => {
                            pushLabel(
                                {
                                    clinic: clinicName,
                                    templateTitle: openTitle,
                                    patientName,
                                    bed,
                                    record,
                                    dob,
                                    scheduleTime: time,
                                    infusionRate,
                                    route,
                                    formulaText: formulaSummary || "Formula enteral",
                                    compositionText: formulaSummary || undefined,
                                    volumeText: prescription.totalVolume ? `${Math.round(prescription.totalVolume)} ml` : undefined,
                                    manipulationDate: activeDateText,
                                    manipulationTime: time,
                                    validityText: "Validade: 4h apos manipulacao, em temperatura ambiente.",
                                    controlText: `Numero sequencial: ${buildControl(prescription.id, time, "NE")}`,
                                    conservationText: "Conservacao: em temperatura ambiente.",
                                    rtName,
                                    rtCrn,
                                },
                                "enteral-open"
                            );
                        });

                        if (moduleEntries.length > 0 || (prescription.hydrationVolume || 0) > 0) {
                            const waterSchedules = hydrationSchedules.length > 0 ? hydrationSchedules : baseSchedules;
                            waterSchedules.forEach((time) => {
                                pushLabel(
                                    {
                                        clinic: clinicName,
                                        templateTitle: "AGUA COM MODULOS",
                                        patientName,
                                        bed,
                                        record,
                                        dob,
                                        scheduleTime: time,
                                        infusionRate,
                                        route,
                                        formulaText: undefined,
                                        compositionText: modulesSummary || undefined,
                                        volumeText: prescription.hydrationVolume
                                            ? `${Math.round(prescription.hydrationVolume)} ml`
                                            : undefined,
                                        manipulationDate: activeDateText,
                                        manipulationTime: time,
                                        validityText: "Validade: 4h apos manipulacao, em temperatura ambiente.",
                                        controlText: `Numero sequencial: ${buildControl(prescription.id, time, "AG")}`,
                                        conservationText: "Conservacao: em temperatura ambiente.",
                                        rtName,
                                        rtCrn,
                                    },
                                    "water-modules"
                                );
                            });
                        }
                    }
                }

                if (prescription.therapyType === "oral") {
                    if (moduleEntries.length > 0) {
                        const oralModuleSchedules = moduleSchedules.length > 0 ? moduleSchedules : ["06:00"];
                        oralModuleSchedules.forEach((time) => {
                            pushLabel(
                                {
                                    clinic: clinicName,
                                    templateTitle: "MODULOS de via oral",
                                    patientName,
                                    bed,
                                    record,
                                    dob,
                                    scheduleTime: time,
                                    route: "Oral",
                                    formulaText: undefined,
                                    compositionText: modulesSummary || undefined,
                                    manipulationDate: activeDateText,
                                    manipulationTime: time,
                                    validityText: "Validade: 4h apos manipulacao, em temperatura ambiente.",
                                    controlText: `Numero sequencial: ${buildControl(prescription.id, time, "MO")}`,
                                    conservationText: conservationDefault,
                                    rtName,
                                    rtCrn,
                                },
                                "oral-modules"
                            );
                        });
                    }

                    if (formulaEntries.length > 0) {
                        formulaEntries.forEach((formula, index) => {
                            const meta = formulaMap.get(formula.formulaId);
                            const merged = `${meta?.name || ""} ${formula.formulaName}`.toLowerCase();
                            const isPowder = meta?.presentationForm === "po" || merged.includes(" po") || merged.includes(" em po") || merged.includes("pó");
                            const isLiquidSupplement = hasOralSupplement && !isPowder;

                            const formulaSchedulesList = formula.schedules?.length ? formula.schedules : ["06:00"];
                            formulaSchedulesList.forEach((time) => {
                                pushLabel(
                                    {
                                        clinic: clinicName,
                                        templateTitle: isLiquidSupplement
                                            ? "Suplementos via oral liquidos"
                                            : isPowder
                                                ? "DIETA - Suplementos via oral em po"
                                                : "DIETA via oral",
                                        patientName,
                                        bed,
                                        record,
                                        dob,
                                        scheduleTime: time,
                                        route: "Oral",
                                        formulaText: formula.formulaName,
                                        compositionText: `${formula.formulaName}${formula.volume ? ` ${Math.round(formula.volume)} ml` : ""}`,
                                        volumeText: formula.volume ? `${Math.round(formula.volume)} ml` : undefined,
                                        manipulationDate: activeDateText,
                                        manipulationTime: time,
                                        validityText: "Validade: 4h apos manipulacao, em temperatura ambiente.",
                                        controlText: `Numero sequencial: ${buildControl(prescription.id, time, `OR${index + 1}`)}`,
                                        conservationText: conservationDefault,
                                        rtName,
                                        rtCrn,
                                    },
                                    `oral-formula-${index + 1}`
                                );
                            });
                        });
                    }
                }
            });

        return list;
    }, [activeDate, activeDateText, formulaMap, patients, prescriptions, settings]);

    const filteredLabels = useMemo(() => {
        return labels.filter((label) => {
            const matchClinic = clinic === "all" || label.clinic.toLowerCase() === clinic.toLowerCase();
            const matchPatient = label.patientName.toLowerCase().includes(patientSearch.toLowerCase());
            const matchTime = label.scheduleTime ? selectedTimes.includes(label.scheduleTime) : true;
            return matchClinic && matchPatient && matchTime;
        });
    }, [clinic, labels, patientSearch, selectedTimes]);

    useEffect(() => {
        const filteredIds = new Set(filteredLabels.map((label) => label.id));
        setSelectedLabels((prev) => prev.filter((id) => filteredIds.has(id)));
    }, [filteredLabels]);

    const toggleTime = (time: string) => {
        setSelectedTimes((current) =>
            current.includes(time) ? current.filter((item) => item !== time) : [...current, time]
        );
    };

    const selectAllTimes = () => setSelectedTimes([...SCHEDULE_TIMES]);
    const clearAllTimes = () => setSelectedTimes([]);

    const toggleLabel = (id: string) => {
        setSelectedLabels((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
        );
    };

    const selectAllLabels = () => setSelectedLabels(filteredLabels.map((label) => label.id));
    const clearAllLabels = () => setSelectedLabels([]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background pb-20">
            <Header />
            <div className="container py-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Tag className="h-6 w-6" />
                            Etiquetas clinicas de nutricao
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Impressao alinhada ao padrao operacional e itens da RDC 502/2021
                        </p>
                    </div>
                    <Button variant="outline" onClick={handlePrint} disabled={selectedLabels.length === 0}>
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir selecionadas ({selectedLabels.length})
                    </Button>
                </div>

                <Card className="border-primary/10 bg-card/90 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Campos obrigatorios da etiqueta
                        </CardTitle>
                        <CardDescription>
                            Paciente, leito, registro, composicao, velocidade, via, data/hora de manipulacao, validade, controle sequencial e RT.
                        </CardDescription>
                    </CardHeader>
                </Card>

                <Card className="border-primary/10 bg-card/90 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                        <CardDescription>Selecione os criterios para gerar as etiquetas</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Building className="h-4 w-4" />
                                    Unidade / setor
                                </Label>
                                <Select value={clinic} onValueChange={setClinic}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {clinicOptions.map((name) => (
                                            <SelectItem key={name} value={name}>{name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

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
                                        onChange={(event) => setPatientSearch(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    Data de manipulacao
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
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => toggleTime(time)}
                                        className={`px-3 py-2 rounded-lg text-center transition-all border-2 ${selectedTimes.includes(time)
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-muted/50 border-muted hover:border-primary/50"
                                            }`}
                                    >
                                        <span className="text-sm font-medium">{time}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 bg-card/90 backdrop-blur">
                    <CardHeader>
                        <div className="flex justify-between items-center gap-3">
                            <div>
                                <CardTitle>Etiquetas disponiveis</CardTitle>
                                <CardDescription>
                                    {prescriptionsLoading
                                        ? "Carregando prescricoes..."
                                        : `${filteredLabels.length} etiqueta(s) pronta(s) para impressao`
                                    }
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={selectAllLabels}>Selecionar todas</Button>
                                <Button variant="outline" size="sm" onClick={clearAllLabels}>Limpar selecao</Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {prescriptionsLoading ? (
                            <div className="text-center py-8 text-muted-foreground">Carregando prescricoes do banco...</div>
                        ) : filteredLabels.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhuma etiqueta encontrada para os filtros selecionados.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredLabels.map((label) => (
                                    <button
                                        key={label.id}
                                        type="button"
                                        className={`relative text-left rounded-xl p-2 border transition-all ${selectedLabels.includes(label.id)
                                            ? "border-primary ring-2 ring-primary/40"
                                            : "border-border hover:border-primary/50"
                                            }`}
                                        onClick={() => toggleLabel(label.id)}
                                    >
                                        <div className="absolute top-2 right-2 h-5 w-5 rounded-full border text-[10px] font-bold flex items-center justify-center bg-background">
                                            {selectedLabels.includes(label.id) ? "OK" : ""}
                                        </div>
                                        <LabelPreview data={label} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="hidden print:block">
                    <div className="print:grid print:grid-cols-3 print:gap-[3.2mm]">
                        {filteredLabels
                            .filter((label) => selectedLabels.includes(label.id))
                            .map((label) => (
                                <div key={label.id} className="break-inside-avoid mb-[3.2mm]">
                                    <LabelPreview data={label} />
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

