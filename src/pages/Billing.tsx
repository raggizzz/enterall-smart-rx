import { useEffect, useMemo, useState } from "react";
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
import { Calendar as CalendarIcon, Clock, DollarSign, FileText, Printer, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import DeliveryProtocol from "@/components/billing/DeliveryProtocol";
import { RequisitionDocument } from "@/components/billing/RequisitionDocument";
import { useFormulas, useModules, usePatients, usePrescriptions, useSettings, useSupplies, useWards } from "@/hooks/useDatabase";
import { prescriptionsService, Prescription } from "@/lib/database";
import { RequisitionData } from "@/types/requisition";
import { generateRequisitionData } from "@/utils/requisitionGenerator";
import { toast } from "sonner";
import { DEFAULT_SCHEDULE_TIMES, findWardByReference, resolveConfiguredScheduleTimes, sanitizeScheduleTimes, sortScheduleTimes } from "@/lib/scheduleTimes";
import { createPrintPopup, printElementInPopup } from "@/lib/printPopup";
import { addManualBillingAdjustment, ManualAdjustmentCategory } from "@/lib/manualAdjustments";

const SCHEDULE_TIMES = sortScheduleTimes([...DEFAULT_SCHEDULE_TIMES]);
const THERAPY_OPTIONS = [
    { value: "all", label: "Todas as vias" },
    { value: "enteral", label: "Enteral" },
    { value: "oral", label: "Via oral" },
    { value: "parenteral", label: "Parenteral" },
] as const;

type TherapyFilter = (typeof THERAPY_OPTIONS)[number]["value"];

const SIGNATURE_CONFIG = {
    signature1: "Nutricionista prescritor",
    signature2: "Tecnico responsavel",
    signature3: "Nutricionista RT ou da concessionaria",
};

const formatDate = (date: Date | string | undefined | null) => {
    if (!date) return "-";

    const parsedDate = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "-";

    return new Intl.DateTimeFormat("pt-BR").format(parsedDate);
};

const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type ManualRequestMode = "cancellation" | "extra";

const collectPrescriptionTimes = (prescription: Prescription): string[] => [
    ...prescription.formulas.flatMap((formula) => formula.schedules || []),
    ...prescription.modules.flatMap((moduleItem) => moduleItem.schedules || []),
    ...(prescription.hydrationSchedules || []),
    ...Object.keys(prescription.enteralDetails?.closedFormula?.bagQuantities || {}),
    ...(prescription.enteralDetails?.openFormulas || []).flatMap((formula) => [
        ...(formula.times || []),
        ...(formula.manipulationTimes || []),
    ]),
    ...(prescription.enteralDetails?.modules || []).flatMap((moduleItem) => moduleItem.times || []),
    ...(prescription.enteralDetails?.hydration?.times || []),
    ...(prescription.oralDetails?.thickenerTimes || []),
];

const Billing = () => {
    const { patients, isLoading: patientsLoading } = usePatients();
    const { prescriptions, isLoading: prescriptionsLoading, refetch: refetchPrescriptions } = usePrescriptions();
    const { settings } = useSettings();
    const { formulas } = useFormulas();
    const { modules } = useModules();
    const { supplies } = useSupplies();
    const { wards: wardObjects } = useWards();

    const [startDate, setStartDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    const [unit, setUnit] = useState("all");
    const [therapyFilter, setTherapyFilter] = useState<TherapyFilter>("all");
    const [selectedTimes, setSelectedTimes] = useState<string[]>([...SCHEDULE_TIMES]);
    const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
    const [requisitionData, setRequisitionData] = useState<RequisitionData | null>(null);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<Prescription | null>(null);
    const [cancelEffectiveDate, setCancelEffectiveDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [cancelSelectedTimes, setCancelSelectedTimes] = useState<string[]>([]);
    const [isCancelling, setIsCancelling] = useState(false);
    const [manualCancelOpen, setManualCancelOpen] = useState(false);
    const [manualRequestMode, setManualRequestMode] = useState<ManualRequestMode>("cancellation");
    const [manualCancelPatientId, setManualCancelPatientId] = useState("");
    const [manualCancelDate, setManualCancelDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [manualSelectedTimes, setManualSelectedTimes] = useState<string[]>([]);
    const [manualCancelSelectedItems, setManualCancelSelectedItems] = useState<string[]>([]);
    const [manualFreeItem, setManualFreeItem] = useState({
        ward: "",
        productKey: "",
        productCode: "",
        productName: "",
        category: "diet" as ManualAdjustmentCategory,
        quantity: "",
        unit: "un",
        unitPrice: "",
        subtotal: "",
        observation: "",
    });

    const wards = useMemo(() => {
        const uniqueWards = new Set<string>();
        patients.forEach((patient) => {
            if (patient.ward) uniqueWards.add(patient.ward);
        });
        return Array.from(uniqueWards).sort((left, right) => left.localeCompare(right));
    }, [patients]);

    const availableScheduleTimes = useMemo(() => {
        const wardObj = unit === "all" ? undefined : findWardByReference(wardObjects, undefined, unit);
        const configuredTimes = resolveConfiguredScheduleTimes({ settings, ward: wardObj });
        const prescriptionTimes = prescriptions
            .filter((prescription) => {
                if (prescription.status !== "active") return false;
                if (unit !== "all" && prescription.patientWard !== unit) return false;
                if (therapyFilter !== "all" && prescription.therapyType !== therapyFilter) return false;
                return true;
            })
            .flatMap(collectPrescriptionTimes);

        return sanitizeScheduleTimes([...configuredTimes, ...prescriptionTimes]);
    }, [prescriptions, settings, therapyFilter, unit, wardObjects]);

    useEffect(() => {
        setSelectedTimes([...availableScheduleTimes]);
    }, [availableScheduleTimes]);

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
                prescriber: SIGNATURE_CONFIG.signature1,
                technician: SIGNATURE_CONFIG.signature2,
                manager: SIGNATURE_CONFIG.signature3,
            },
        });
    }, [endDate, filteredPrescriptions, formulas, modules, patients, selectedTimes, startDate, supplies, therapyFilter, unit]);

    const manualPreviewRequisitionData = useMemo(() => {
        const effectiveDate = new Date(`${manualCancelDate}T00:00:00`);
        if (Number.isNaN(effectiveDate.getTime())) return null;

        return generateRequisitionData({
            prescriptions: filteredPrescriptions,
            patients,
            formulas,
            modules,
            supplies,
            unitName: unit,
            therapyLabel: THERAPY_OPTIONS.find((option) => option.value === therapyFilter)?.label || "Todas as vias",
            startDate: effectiveDate,
            endDate: effectiveDate,
            selectedTimes: manualSelectedTimes,
            signatures: {
                prescriber: SIGNATURE_CONFIG.signature1,
                technician: SIGNATURE_CONFIG.signature2,
                manager: SIGNATURE_CONFIG.signature3,
            },
        });
    }, [filteredPrescriptions, formulas, manualCancelDate, manualSelectedTimes, modules, patients, supplies, therapyFilter, unit]);

    const totalEstimated = useMemo(() => {
        if (!previewRequisitionData) return 0;
        return previewRequisitionData.consolidated.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    }, [previewRequisitionData]);

    const manualCancelCandidates = useMemo(() => {
        if (!manualPreviewRequisitionData || !manualCancelPatientId) return [];
        return manualPreviewRequisitionData.dietMap
            .filter((item) => item.patientId === manualCancelPatientId)
            .map((item, index) => ({
                key: `${item.patientId}-${item.productCode || item.productName}-${index}`,
                item,
            }));
    }, [manualCancelPatientId, manualPreviewRequisitionData]);

    const manualSelectablePatients = useMemo(() => {
        const patientIdsWithPrescriptions = new Set(filteredPrescriptions.map((prescription) => prescription.patientId));

        return patients
            .filter((patient) => patient.status === "active" && patientIdsWithPrescriptions.has(patient.id || ""))
            .map((patient) => ({
                id: patient.id || "",
                name: patient.name || "Paciente sem nome",
                bed: patient.bed || "",
                ward: patient.ward || "",
                status: patient.status || "active",
            }))
            .sort((left, right) => left.name.localeCompare(right.name));
    }, [filteredPrescriptions, patients]);

    const manualProductOptions = useMemo(() => {
        const formulaOptions = formulas
            .filter((formula) => formula.isActive !== false)
            .map((formula) => ({
                key: `formula-${formula.id || formula.code}`,
                code: formula.code,
                name: formula.name,
                category: "formula" as ManualAdjustmentCategory,
                unit: formula.billingUnit === "unit" ? "un" : formula.billingUnit || "ml",
                unitPrice: formula.billingPrice || 0,
                label: `${formula.name}${formula.code ? ` (${formula.code})` : ""}`,
            }));

        const moduleOptions = modules
            .filter((moduleItem) => moduleItem.isActive !== false)
            .map((moduleItem) => ({
                key: `module-${moduleItem.id || moduleItem.code || moduleItem.name}`,
                code: moduleItem.code || "",
                name: moduleItem.name,
                category: "module" as ManualAdjustmentCategory,
                unit: moduleItem.billingUnit === "unit" ? "un" : moduleItem.billingUnit || "g",
                unitPrice: moduleItem.billingPrice || 0,
                label: `${moduleItem.name}${moduleItem.code ? ` (${moduleItem.code})` : ""}`,
            }));

        const supplyOptions = supplies
            .filter((supply) => supply.isActive !== false)
            .map((supply) => ({
                key: `supply-${supply.id || supply.code}`,
                code: supply.code,
                name: supply.name,
                category: "supply" as ManualAdjustmentCategory,
                unit: supply.billingUnit === "unit" ? "un" : supply.billingUnit || "un",
                unitPrice: supply.unitPrice || 0,
                label: `${supply.name}${supply.code ? ` (${supply.code})` : ""}`,
            }));

        return [...formulaOptions, ...moduleOptions, ...supplyOptions].sort((left, right) => left.label.localeCompare(right.label));
    }, [formulas, modules, supplies]);

    const manualCancelTotal = useMemo(() => {
        if (!manualCancelPatientId) {
            const explicitSubtotal = Number(manualFreeItem.subtotal) || 0;
            if (explicitSubtotal > 0) return explicitSubtotal;
            return (Number(manualFreeItem.quantity) || 0) * (Number(manualFreeItem.unitPrice) || 0);
        }

        return manualCancelCandidates
            .filter(({ key }) => manualCancelSelectedItems.includes(key))
            .reduce((sum, { item }) => sum + (item.subtotal || 0), 0);
    }, [
        manualCancelCandidates,
        manualCancelPatientId,
        manualCancelSelectedItems,
        manualFreeItem.quantity,
        manualFreeItem.subtotal,
        manualFreeItem.unitPrice,
    ]);

    const openManualRequestDialog = (mode: ManualRequestMode) => {
        setManualRequestMode(mode);
        setManualCancelPatientId("");
        setManualSelectedTimes([]);
        setManualCancelSelectedItems([]);
        setManualFreeItem({ ward: unit === "all" ? "" : unit, productKey: "", productCode: "", productName: "", category: "diet", quantity: "", unit: "un", unitPrice: "", subtotal: "", observation: "" });
        setManualCancelDate(new Date().toISOString().split("T")[0]);
        setManualCancelOpen(true);
    };

    const handleGenerateRequisition = () => {
        if (!previewRequisitionData) return;

        const popup = createPrintPopup("Requisição de insumos");
        setRequisitionData({ ...previewRequisitionData, documentType: "billing" });
        setTimeout(() => printElementInPopup("requisition-print-document", "Requisição de insumos", popup), 100);
    };

    const handleGenerateManualCancellation = () => {
        if (!previewRequisitionData || !manualPreviewRequisitionData) return;

        if (manualSelectedTimes.length === 0) {
            toast.error("Selecione ao menos um horário dentro da guia manual.");
            return;
        }

        const selectedDietMap = manualCancelPatientId
            ? manualCancelCandidates
                .filter(({ key }) => manualCancelSelectedItems.includes(key))
                .map(({ item }) => item)
            : [];

        const hasManualFreeItem = !manualCancelPatientId && manualFreeItem.productName.trim() && Number(manualFreeItem.quantity) > 0;
        if (manualCancelPatientId && selectedDietMap.length === 0) {
            toast.error("Selecione ao menos um item do paciente.");
            return;
        }
        if (!manualCancelPatientId && !hasManualFreeItem) {
            toast.error("Preencha o item manual ou selecione um paciente.");
            return;
        }

        const manualSubtotal = manualCancelTotal;
        const manualUnitPrice = Number(manualFreeItem.unitPrice) || (
            Number(manualFreeItem.quantity) > 0 ? manualSubtotal / Number(manualFreeItem.quantity) : 0
        );
        const manualWard = manualFreeItem.ward || (unit === "all" ? "Ala nao informada" : unit);
        const freeDietMap = hasManualFreeItem
            ? [{
                patientId: `manual-${Date.now()}`,
                patientName: "Ajuste manual",
                patientRecord: undefined,
                bed: "-",
                ward: manualWard,
                dob: undefined,
                route: "Manual",
                type: "formula" as const,
                productCode: manualFreeItem.productCode || undefined,
                productName: manualFreeItem.productName.trim(),
                volumeOrAmount: Number(manualFreeItem.quantity) || 0,
                unit: manualFreeItem.unit || "un",
                times: manualSelectedTimes,
                observation: manualFreeItem.observation || "Lancamento manual sem vinculo com paciente",
                unitPrice: manualUnitPrice,
                subtotal: manualSubtotal,
            }]
            : [];

        const documentType: RequisitionData["documentType"] = manualRequestMode === "cancellation" ? "cancellation" : "extra";
        const popupTitle = manualRequestMode === "cancellation" ? "Requisição de cancelamento" : "Requisição extra";
        const popup = createPrintPopup(popupTitle);
        const manualConsolidated = hasManualFreeItem
            ? [{
                code: manualFreeItem.productCode || "AJUSTE-MANUAL",
                name: manualFreeItem.productName.trim(),
                billingUnit: manualFreeItem.unit || "un",
                totalQuantity: Number(manualFreeItem.quantity) || 0,
                unitPrice: manualUnitPrice,
                subtotal: manualSubtotal,
                type: manualFreeItem.category,
            }]
            : selectedDietMap.map((item) => ({
                code: item.productCode || "AJUSTE-MANUAL",
                name: item.productName,
                billingUnit: item.unit,
                totalQuantity: item.volumeOrAmount || 0,
                unitPrice: item.unitPrice || 0,
                subtotal: item.subtotal || 0,
                type: item.type === "module" ? "module" as const : "formula" as const,
            }));

        if (hasManualFreeItem) {
            addManualBillingAdjustment({
                hospitalId: typeof window !== "undefined" ? localStorage.getItem("userHospitalId") || undefined : undefined,
                ward: manualWard,
                effectiveDate: manualCancelDate,
                mode: manualRequestMode,
                productCode: manualFreeItem.productCode || undefined,
                productName: manualFreeItem.productName.trim(),
                quantity: Number(manualFreeItem.quantity) || 0,
                unit: manualFreeItem.unit || "un",
                unitPrice: manualUnitPrice,
                subtotal: manualSubtotal,
                category: manualFreeItem.category,
                observation: manualFreeItem.observation || undefined,
            });
            toast.success("Guia de ajuste registrada para os relatórios.");
        }

        setRequisitionData({
            ...previewRequisitionData,
            unitName: manualWard,
            selectedTimes: manualSelectedTimes,
            documentType,
            effectiveDate: manualCancelDate,
            dietMap: selectedDietMap.length > 0 ? selectedDietMap : freeDietMap,
            consolidated: manualConsolidated,
            signatures: previewRequisitionData.signatures,
        });

        setManualCancelOpen(false);
        setTimeout(() => printElementInPopup("requisition-print-document", popupTitle, popup), 120);
    };

    const buildCancellationRequisition = (prescription: Prescription): RequisitionData => {
        const effectiveDate = new Date(`${cancelEffectiveDate}T00:00:00`);
        const generated = generateRequisitionData({
            prescriptions: [prescription],
            patients,
            formulas,
            modules,
            supplies,
            unitName: prescription.patientWard || unit,
            therapyLabel:
                prescription.therapyType === "enteral"
                    ? "Enteral"
                    : prescription.therapyType === "oral"
                        ? "Via oral"
                        : "Parenteral",
            startDate: effectiveDate,
            endDate: effectiveDate,
            selectedTimes: cancelSelectedTimes.length > 0 ? cancelSelectedTimes : [...availableScheduleTimes],
            signatures: {
                prescriber: SIGNATURE_CONFIG.signature1,
                technician: SIGNATURE_CONFIG.signature2,
                manager: SIGNATURE_CONFIG.signature3,
            },
        });

        return {
            ...generated,
            documentType: "cancellation",
            effectiveDate: formatDate(effectiveDate),
        };
    };

    const openTechnicalCancelDialog = (prescription: Prescription) => {
        setCancelTarget(prescription);
        setCancelEffectiveDate(new Date().toISOString().split("T")[0]);
        setCancelSelectedTimes([...availableScheduleTimes]);
        setCancelDialogOpen(true);
    };

    const handleTechnicalCancel = async () => {
        if (!cancelTarget?.id) return;

        const changedBy = typeof window !== "undefined" ? localStorage.getItem("userName") || "Usuário do sistema" : "Usuário do sistema";
        const cancellationDocument = buildCancellationRequisition(cancelTarget);
        const popup = createPrintPopup("Requisição de cancelamento");

        try {
            setIsCancelling(true);
            await prescriptionsService.updateStatus(cancelTarget.id, {
                status: "suspended",
                changedBy,
                effectiveDate: cancelEffectiveDate,
            });
            await refetchPrescriptions();
            setRequisitionData(cancellationDocument);
            setCancelDialogOpen(false);
            toast.success("Prescrição suspensa e requisição de cancelamento gerada.");
            setTimeout(() => {
                printElementInPopup("requisition-print-document", "Requisição de cancelamento", popup);
                setCancelTarget(null);
            }, 350);
        } catch (error) {
            console.error("Failed to cancel prescription technically", error);
            toast.error("Não foi possível registrar o cancelamento técnico.");
        } finally {
            setIsCancelling(false);
        }
    };

    const toggleTime = (time: string) => {
        setSelectedTimes((current) =>
            current.includes(time)
                ? sortScheduleTimes(current.filter((item) => item !== time))
                : sortScheduleTimes([...current, time]),
        );
    };

    const toggleCancelTime = (time: string) => {
        setCancelSelectedTimes((current) =>
            current.includes(time)
                ? sortScheduleTimes(current.filter((item) => item !== time))
                : sortScheduleTimes([...current, time]),
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

    const selectAllTimes = () => setSelectedTimes([...availableScheduleTimes]);
    const clearAllTimes = () => setSelectedTimes([]);

    const toggleManualCancelItem = (key: string) => {
        setManualCancelSelectedItems((current) =>
            current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key],
        );
    };

    const toggleManualTime = (time: string) => {
        setManualSelectedTimes((current) =>
            current.includes(time)
                ? sortScheduleTimes(current.filter((item) => item !== time))
                : sortScheduleTimes([...current, time]),
        );
        setManualCancelSelectedItems([]);
    };

    const manualActionLabel = manualRequestMode === "cancellation" ? "cancelamento manual" : "requisicao extra";
    const manualActionButtonLabel = manualRequestMode === "cancellation" ? "Gerar cancelamento" : "Gerar requisicao extra";

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
                        <DeliveryProtocol
                            unitName={unit === "all" ? "Todas as Unidades" : unit}
                            date={startDate ? formatDate(startDate) : "-"}
                            items={(previewRequisitionData?.dietMap || [])
                                .filter((item) => item.type === "formula" || item.type === "water")
                                .flatMap((item) => {
                                    const times = item.times && item.times.length > 0 ? item.times : ["-"];
                                    return times.map((time) => ({
                                        ward: item.ward,
                                        bed: item.bed,
                                        patientName: item.patientName,
                                        systemType: item.observation?.toLowerCase().includes("fechado") ? "closed" : "open",
                                        formulaName: item.productName,
                                        volume: `${item.volumeOrAmount || 0} ${item.unit || "ml"}`,
                                        scheduleTime: time,
                                        waterVolume: item.type === "water" ? `${item.volumeOrAmount || 0} ml` : undefined,
                                    }));
                                })}
                            signatures={previewRequisitionData?.signatures}
                        />
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
                                {availableScheduleTimes.map((time) => (
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
                                {selectedTimes.length < availableScheduleTimes.length && (
                                    <CardDescription className="text-orange-600">
                                        Requisicao parcial: {selectedTimes.length} de {availableScheduleTimes.length} horarios selecionados
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
                                <CardTitle>Acoes manuais de faturamento</CardTitle>
                                <CardDescription>
                                    Gere cancelamentos ou requisicoes extras escolhendo paciente, itens e valores, sem justificativa obrigatoria.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => openManualRequestDialog("cancellation")}
                                        disabled={!previewRequisitionData}
                                    >
                                        Cancelamento manual
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => openManualRequestDialog("extra")}
                                        disabled={!previewRequisitionData}
                                    >
                                        Requisicao extra
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    As acoes manuais usam os itens reais do mapa filtrado e imprimem o documento com os valores por linha.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Controle operacional das prescricoes ativas</CardTitle>
                                <CardDescription>
                                    Se precisar suspender a prescricao ativa, o cancelamento tecnico continua disponivel abaixo.
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
                <DialogContent className="print:hidden">
                    <DialogHeader>
                        <DialogTitle>Cancelamento técnico da prescrição</DialogTitle>
                        <DialogDescription>
                            Isso suspende a prescrição ativa e gera uma requisição de cancelamento nos mesmos moldes da dieta, com os horários selecionados.
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
                                | Início {cancelTarget?.startDate ? formatDate(cancelTarget.startDate) : "-"}
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
                            <div className="flex items-center justify-between gap-2">
                                <Label>Horários a cancelar</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCancelSelectedTimes([...availableScheduleTimes])}
                                    >
                                        Todos
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCancelSelectedTimes([])}
                                    >
                                        Limpar
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                {availableScheduleTimes.map((time) => (
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => toggleCancelTime(time)}
                                        className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                                            cancelSelectedTimes.includes(time)
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-background hover:border-primary/50"
                                        }`}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Se nenhum horário for selecionado, a guia usará todos os horários configurados.
                            </p>
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
                            {isCancelling ? "Salvando..." : "Confirmar e imprimir"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={manualCancelOpen} onOpenChange={setManualCancelOpen}>
                <DialogContent className="max-w-3xl print:hidden">
                    <DialogHeader>
                        <DialogTitle>{manualRequestMode === "cancellation" ? "Cancelamento manual" : "Requisicao extra manual"}</DialogTitle>
                        <DialogDescription>
                            Selecione o paciente, marque os itens desejados e gere a {manualActionLabel} com os valores exibidos abaixo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Paciente</Label>
                                <Select
                                    value={manualCancelPatientId}
                                    onValueChange={(value) => {
                                        setManualCancelPatientId(value);
                                        setManualCancelSelectedItems([]);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o paciente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {manualSelectablePatients.map((patient) => (
                                            <SelectItem key={patient.id} value={patient.id || ""}>
                                                {[
                                                    patient.name,
                                                    patient.bed && `Leito ${patient.bed}`,
                                                    patient.ward,
                                                    patient.status !== "active" ? "inativo" : null,
                                                ].filter(Boolean).join(" | ")}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Data efetiva</Label>
                                <Input
                                    type="date"
                                    value={manualCancelDate}
                                    onChange={(event) => setManualCancelDate(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="rounded-md border p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <Label>Horários da guia manual</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Estes horários são independentes dos filtros principais da tela.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setManualSelectedTimes([...availableScheduleTimes]);
                                            setManualCancelSelectedItems([]);
                                        }}
                                    >
                                        Todos
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setManualSelectedTimes([]);
                                            setManualCancelSelectedItems([]);
                                        }}
                                    >
                                        Limpar
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                {availableScheduleTimes.map((time) => (
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => toggleManualTime(time)}
                                        className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                                            manualSelectedTimes.includes(time)
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-background hover:border-primary/50"
                                        }`}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                            {manualSelectedTimes.length === 0 && (
                                <p className="text-xs text-destructive">
                                    Selecione ao menos um horário para gerar a guia manual.
                                </p>
                            )}
                        </div>

                        <div className="rounded-md border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Itens selecionaveis do paciente</p>
                                    <p className="text-xs text-muted-foreground">
                                        Selecione itens do paciente ou, se nao houver paciente, preencha o ajuste manual abaixo.
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Total selecionado</p>
                                    <p className="text-lg font-semibold text-primary">{formatCurrency(manualCancelTotal)}</p>
                                </div>
                            </div>

                            {!manualCancelPatientId ? (
                                <p className="text-sm text-muted-foreground">Escolha um paciente para listar os itens disponiveis.</p>
                            ) : manualSelectedTimes.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Selecione os horários da guia manual para listar os itens do paciente.</p>
                            ) : manualCancelCandidates.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nenhum item disponível para o paciente nos horários selecionados.</p>
                            ) : (
                                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                                    {manualCancelCandidates.map(({ key, item }) => (
                                        <label
                                            key={key}
                                            className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:border-primary/50"
                                        >
                                            <Checkbox
                                                checked={manualCancelSelectedItems.includes(key)}
                                                onCheckedChange={() => toggleManualCancelItem(key)}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-medium">{item.productName}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {[item.ward, item.bed && `Leito ${item.bed}`, item.route].filter(Boolean).join(" | ")}
                                                        </p>
                                                    </div>
                                                    <p className="font-semibold">{formatCurrency(item.subtotal || 0)}</p>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {item.volumeOrAmount} {item.unit}
                                                    {item.stageVolume ? ` | Volume/etapa ${item.stageVolume} ${item.stageVolumeUnit || "ml"}` : ""}
                                                    {item.observation ? ` | ${item.observation}` : ""}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {!manualCancelPatientId && (
                            <div className="rounded-md border p-4 space-y-3">
                                <div>
                                    <p className="font-medium">Ajuste manual sem paciente</p>
                                    <p className="text-xs text-muted-foreground">
                                        Use para admissoes, dietas reiniciadas, extras ou cancelamentos sem vinculo direto a paciente/horario.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Ala</Label>
                                        <Select
                                            value={manualFreeItem.ward}
                                            onValueChange={(value) => setManualFreeItem((current) => ({ ...current, ward: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a ala" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(unit !== "all" ? [unit] : wards).map((ward) => (
                                                    <SelectItem key={ward} value={ward}>
                                                        {ward}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Produto cadastrado</Label>
                                        <Select
                                            value={manualFreeItem.productKey}
                                            onValueChange={(value) => {
                                                const selectedProduct = manualProductOptions.find((product) => product.key === value);
                                                setManualFreeItem((current) => ({
                                                    ...current,
                                                    productKey: value,
                                                    productCode: selectedProduct?.code || "",
                                                    productName: selectedProduct?.name || current.productName,
                                                    category: selectedProduct?.category || current.category,
                                                    unit: selectedProduct?.unit || current.unit,
                                                    unitPrice: selectedProduct?.unitPrice ? String(selectedProduct.unitPrice) : current.unitPrice,
                                                }));
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecionar produto cadastrado" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {manualProductOptions.map((product) => (
                                                    <SelectItem key={product.key} value={product.key}>
                                                        {product.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Produto / item livre</Label>
                                        <Input
                                            value={manualFreeItem.productName}
                                            onChange={(event) => setManualFreeItem((current) => ({ ...current, productKey: "", productCode: "", productName: event.target.value, category: "diet" }))}
                                            placeholder="Ex: Peptamen 1.5, frasco, equipo"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Quantidade</Label>
                                        <Input
                                            type="number"
                                            value={manualFreeItem.quantity}
                                            onChange={(event) => setManualFreeItem((current) => ({ ...current, quantity: event.target.value }))}
                                            placeholder="Ex: 1000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unidade</Label>
                                        <Input
                                            value={manualFreeItem.unit}
                                            onChange={(event) => setManualFreeItem((current) => ({ ...current, unit: event.target.value }))}
                                            placeholder="ml, g, un"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Valor unitário</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={manualFreeItem.unitPrice}
                                            onChange={(event) => setManualFreeItem((current) => ({ ...current, unitPrice: event.target.value }))}
                                            placeholder="Ex: 0.08"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Valor total (opcional)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={manualFreeItem.subtotal}
                                            onChange={(event) => setManualFreeItem((current) => ({ ...current, subtotal: event.target.value }))}
                                            placeholder="Ex: 125.50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Observação</Label>
                                        <Input
                                            value={manualFreeItem.observation}
                                            onChange={(event) => setManualFreeItem((current) => ({ ...current, observation: event.target.value }))}
                                            placeholder="Ex: admissao noturna, ajuste de estoque"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setManualCancelOpen(false)}>
                            Fechar
                        </Button>
                        <Button onClick={handleGenerateManualCancellation}>
                            {manualActionButtonLabel}
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

