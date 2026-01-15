import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Download,
    Upload,
    Database,
    Trash2,
    Building2,
    Save,
    AlertTriangle,
    CheckCircle2,
    HardDrive,
    RefreshCw,
    Clock,
    DollarSign,
    Users,
    Plus,
    Edit2,
    Bed
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useSettings, useBackup, useDashboardData, useHospitals, useWards } from "@/hooks/useDatabase";
import { db, NursingCosts, IndirectCosts, Hospital, Ward } from "@/lib/database";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const Settings = () => {
    const { settings, saveSettings, isLoading: settingsLoading } = useSettings();
    const { exportBackup, importBackup, isExporting, isImporting } = useBackup();
    const dashboardData = useDashboardData();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [hospitalName, setHospitalName] = useState(settings?.hospitalName || "");
    const [rtName, setRtName] = useState(settings?.defaultSignatures?.rtName || "");
    const [rtCrn, setRtCrn] = useState(settings?.defaultSignatures?.rtCrn || "");
    const [defaultConservation, setDefaultConservation] = useState(
        settings?.labelSettings?.defaultConservation || "Refrigerar 2-8°C"
    );

    // Estados para Custos de Enfermagem
    const [nursingCosts, setNursingCosts] = useState<NursingCosts>({
        timeOpenSystemPump: settings?.nursingCosts?.timeOpenSystemPump || 0,
        timeClosedSystemPump: settings?.nursingCosts?.timeClosedSystemPump || 0,
        timeOpenSystemGravity: settings?.nursingCosts?.timeOpenSystemGravity || 0,
        timeClosedSystemGravity: settings?.nursingCosts?.timeClosedSystemGravity || 0,
        timeBolus: settings?.nursingCosts?.timeBolus || 0,
        hourlyRate: settings?.nursingCosts?.hourlyRate || 0,
    });

    // Estados para Custos Indiretos
    const [indirectCosts, setIndirectCosts] = useState<IndirectCosts>({
        laborCosts: settings?.indirectCosts?.laborCosts || 0,
    });

    // Update form when settings load
    useEffect(() => {
        if (settings) {
            setHospitalName(settings.hospitalName || "");
            setRtName(settings.defaultSignatures?.rtName || "");
            setRtCrn(settings.defaultSignatures?.rtCrn || "");
            setDefaultConservation(settings.labelSettings?.defaultConservation || "Refrigerar 2-8°C");

            // Atualizar custos de enfermagem
            setNursingCosts({
                timeOpenSystemPump: settings.nursingCosts?.timeOpenSystemPump || 0,
                timeClosedSystemPump: settings.nursingCosts?.timeClosedSystemPump || 0,
                timeOpenSystemGravity: settings.nursingCosts?.timeOpenSystemGravity || 0,
                timeClosedSystemGravity: settings.nursingCosts?.timeClosedSystemGravity || 0,
                timeBolus: settings.nursingCosts?.timeBolus || 0,
                hourlyRate: settings.nursingCosts?.hourlyRate || 0,
            });

            // Atualizar custos indiretos
            setIndirectCosts({
                laborCosts: settings.indirectCosts?.laborCosts || 0,
            });
        }
    }, [settings]);

    const handleSaveSettings = async () => {
        try {
            await saveSettings({
                hospitalName,
                defaultSignatures: {
                    rtName,
                    rtCrn
                },
                labelSettings: {
                    showConservation: true,
                    defaultConservation
                },
                nursingCosts,
                indirectCosts
            });
            toast.success("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Erro ao salvar configurações");
        }
    };

    const handleExport = async () => {
        try {
            await exportBackup();
            toast.success("Backup exportado com sucesso!");
        } catch (error) {
            console.error("Error exporting backup:", error);
            toast.error("Erro ao exportar backup");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const backup = await importBackup(file, true);
            toast.success(`Backup importado com sucesso! ${backup.data.patients?.length || 0} pacientes, ${backup.data.formulas?.length || 0} fórmulas.`);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error) {
            console.error("Error importing backup:", error);
            toast.error("Erro ao importar backup. Verifique se o arquivo é válido.");
        }
    };



    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />
            <div className="container py-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
                    <p className="text-muted-foreground">Gerencie as configurações do sistema e backup de dados</p>
                </div>

                {/* Status do Banco de Dados */}
                <Card className="border-green-200 bg-green-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700">
                            <Database className="h-5 w-5" />
                            Status do Banco de Dados Local
                        </CardTitle>
                        <CardDescription>
                            Seus dados são salvos localmente no navegador (IndexedDB)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-white rounded-lg border">
                                <div className="text-2xl font-bold text-blue-600">{dashboardData.patientsCount}</div>
                                <div className="text-sm text-gray-500">Pacientes</div>
                            </div>
                            <div className="text-center p-4 bg-white rounded-lg border">
                                <div className="text-2xl font-bold text-green-600">{dashboardData.formulasCount}</div>
                                <div className="text-sm text-gray-500">Fórmulas</div>
                            </div>
                            <div className="text-center p-4 bg-white rounded-lg border">
                                <div className="text-2xl font-bold text-purple-600">{dashboardData.activePrescriptions}</div>
                                <div className="text-sm text-gray-500">Prescrições Ativas</div>
                            </div>
                            <div className="text-center p-4 bg-white rounded-lg border">
                                <div className="text-2xl font-bold text-orange-600">{dashboardData.todayEvolutions}</div>
                                <div className="text-sm text-gray-500">Evoluções Hoje</div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Banco de dados funcionando - Modo Offline ativo</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Configurações do Hospital */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Dados do Hospital
                        </CardTitle>
                        <CardDescription>
                            Configure as informações que aparecem nos relatórios e etiquetas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome do Hospital</Label>
                            <Input
                                value={hospitalName}
                                onChange={(e) => setHospitalName(e.target.value)}
                                placeholder="Ex: Hospital Regional Norte"
                            />
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Assinatura Padrão para Etiquetas</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome do RT</Label>
                                    <Input
                                        value={rtName}
                                        onChange={(e) => setRtName(e.target.value)}
                                        placeholder="Nome do Responsável Técnico"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>CRN</Label>
                                    <Input
                                        value={rtCrn}
                                        onChange={(e) => setRtCrn(e.target.value)}
                                        placeholder="CRN-0000"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Texto de Conservação Padrão (Etiquetas)</Label>
                            <Input
                                value={defaultConservation}
                                onChange={(e) => setDefaultConservation(e.target.value)}
                                placeholder="Ex: Refrigerar 2-8°C"
                            />
                        </div>

                        <Button onClick={handleSaveSettings} className="w-full">
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Configurações
                        </Button>
                    </CardContent>
                </Card>

                {/* Custos Indiretos - Tempo de Enfermagem */}
                <Card className="border-purple-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                            <Clock className="h-5 w-5" />
                            Custos Indiretos - Tempo de Enfermagem
                        </CardTitle>
                        <CardDescription>
                            Configure os tempos de instalação e custos de enfermagem para cálculo de custos
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Tempos de instalação */}
                        <div className="space-y-4">
                            <Label className="text-sm font-semibold">Tempos de Instalação (em segundos)</Label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">
                                        Sistema Aberto em Bomba
                                    </Label>
                                    <Input
                                        type="number"
                                        value={nursingCosts.timeOpenSystemPump || ''}
                                        onChange={(e) => setNursingCosts({
                                            ...nursingCosts,
                                            timeOpenSystemPump: parseInt(e.target.value) || 0
                                        })}
                                        placeholder="Ex: 180"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">
                                        Sistema Fechado em Bomba
                                    </Label>
                                    <Input
                                        type="number"
                                        value={nursingCosts.timeClosedSystemPump || ''}
                                        onChange={(e) => setNursingCosts({
                                            ...nursingCosts,
                                            timeClosedSystemPump: parseInt(e.target.value) || 0
                                        })}
                                        placeholder="Ex: 120"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">
                                        Sistema Aberto Gravitacional
                                    </Label>
                                    <Input
                                        type="number"
                                        value={nursingCosts.timeOpenSystemGravity || ''}
                                        onChange={(e) => setNursingCosts({
                                            ...nursingCosts,
                                            timeOpenSystemGravity: parseInt(e.target.value) || 0
                                        })}
                                        placeholder="Ex: 150"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">
                                        Sistema Fechado Gravitacional
                                    </Label>
                                    <Input
                                        type="number"
                                        value={nursingCosts.timeClosedSystemGravity || ''}
                                        onChange={(e) => setNursingCosts({
                                            ...nursingCosts,
                                            timeClosedSystemGravity: parseInt(e.target.value) || 0
                                        })}
                                        placeholder="Ex: 100"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-sm text-muted-foreground">
                                        Frasco em Bolus (água ou dieta)
                                    </Label>
                                    <Input
                                        type="number"
                                        value={nursingCosts.timeBolus || ''}
                                        onChange={(e) => setNursingCosts({
                                            ...nursingCosts,
                                            timeBolus: parseInt(e.target.value) || 0
                                        })}
                                        placeholder="Ex: 60"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Custo por hora */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Custo da Hora de Trabalho de Enfermagem
                            </Label>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">R$</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={nursingCosts.hourlyRate || ''}
                                    onChange={(e) => setNursingCosts({
                                        ...nursingCosts,
                                        hourlyRate: parseFloat(e.target.value) || 0
                                    })}
                                    placeholder="Ex: 45.00"
                                    className="max-w-[200px]"
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Custos indiretos - outros */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Custos Indiretos - Outros
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Mão-de-obra de manipuladores, estoquistas e outros custos determinados pela unidade
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">R$</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={indirectCosts.laborCosts || ''}
                                    onChange={(e) => setIndirectCosts({
                                        ...indirectCosts,
                                        laborCosts: parseFloat(e.target.value) || 0
                                    })}
                                    placeholder="Ex: 25.00"
                                    className="max-w-[200px]"
                                />
                                <span className="text-xs text-muted-foreground">/dia por paciente</span>
                            </div>
                        </div>

                        <Button onClick={handleSaveSettings} className="w-full" variant="outline">
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Custos
                        </Button>
                    </CardContent>
                </Card>

                <HospitalList />

                {/* Backup e Restauração */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HardDrive className="h-5 w-5" />
                            Backup e Restauração
                        </CardTitle>
                        <CardDescription>
                            Exporte seus dados para backup ou importe de outro dispositivo
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 border rounded-lg bg-blue-50/50 space-y-3">
                                <div className="flex items-center gap-2 text-blue-700 font-semibold">
                                    <Download className="h-5 w-5" />
                                    Exportar Backup
                                </div>
                                <p className="text-sm text-gray-600">
                                    Baixe um arquivo JSON com todos os seus dados. Use para fazer backup
                                    ou transferir para outro computador.
                                </p>
                                <Button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="w-full"
                                    variant="outline"
                                >
                                    {isExporting ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Exportando...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4 mr-2" />
                                            Baixar Backup
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="p-4 border rounded-lg bg-green-50/50 space-y-3">
                                <div className="flex items-center gap-2 text-green-700 font-semibold">
                                    <Upload className="h-5 w-5" />
                                    Importar Backup
                                </div>
                                <p className="text-sm text-gray-600">
                                    Restaure dados de um arquivo de backup.
                                    <strong className="text-red-600"> Isso substituirá os dados atuais!</strong>
                                </p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImportFile}
                                    accept=".json"
                                    className="hidden"
                                />
                                <Button
                                    onClick={handleImportClick}
                                    disabled={isImporting}
                                    className="w-full"
                                    variant="outline"
                                >
                                    {isImporting ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Importando...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Selecionar Arquivo
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-amber-800">Importante sobre Backups</p>
                                    <p className="text-sm text-amber-700">
                                        Recomendamos fazer backup regularmente. Os dados são salvos apenas
                                        neste navegador/computador. Se limpar os dados do navegador ou
                                        trocar de máquina, você precisará importar o backup.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <BottomNav />
        </div>
    );
};

export default Settings;

const HospitalList = () => {
    const { hospitals, createHospital, updateHospital, deleteHospital } = useHospitals();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
    const [newHospital, setNewHospital] = useState({ name: "", cep: "", cnes: "" });
    const [selectedHospitalForWards, setSelectedHospitalForWards] = useState<Hospital | null>(null);

    const handleSave = async () => {
        if (!newHospital.name) {
            toast.error("Nome é obrigatório");
            return;
        }
        try {
            if (editingHospital?.id) {
                await updateHospital(editingHospital.id, {
                    name: newHospital.name,
                    cep: newHospital.cep,
                    cnes: newHospital.cnes
                });
                toast.success("Hospital atualizado!");
            } else {
                await createHospital({
                    name: newHospital.name,
                    cep: newHospital.cep,
                    cnes: newHospital.cnes,
                    isActive: true
                });
                toast.success("Hospital criado!");
            }
            setIsDialogOpen(false);
            setNewHospital({ name: "", cep: "", cnes: "" });
            setEditingHospital(null);
        } catch (e) {
            toast.error("Erro ao salvar hospital");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir hospital? Isso não excluirá as alas automaticamente (ainda).")) return;
        try {
            await deleteHospital(id);
            toast.success("Hospital excluído");
        } catch (e) {
            toast.error("Erro ao excluir");
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Gestão de Hospitais e Alas
                    </CardTitle>
                    <CardDescription>Cadastre hospitais e gerencie suas alas</CardDescription>
                </div>
                <Button onClick={() => { setEditingHospital(null); setIsDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Novo Hospital
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {hospitals.map(hospital => (
                        <div key={hospital.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg">{hospital.name}</h3>
                                    {hospital.cnes && <p className="text-sm text-muted-foreground">CNES: {hospital.cnes}</p>}
                                    {hospital.cep && <p className="text-sm text-muted-foreground">CEP: {hospital.cep}</p>}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => {
                                        setEditingHospital(hospital);
                                        setNewHospital({
                                            name: hospital.name,
                                            cep: hospital.cep || "",
                                            cnes: hospital.cnes || ""
                                        });
                                        setIsDialogOpen(true);
                                    }}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => hospital.id && handleDelete(hospital.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <Separator className="my-2" />

                            <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Bed className="h-4 w-4" /> Alas / Setores
                                </h4>
                                {hospital.id && <WardList hospitalId={hospital.id} />}
                            </div>
                        </div>
                    ))}
                    {hospitals.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">Nenhum hospital cadastrado.</p>
                    )}
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingHospital ? 'Editar' : 'Novo'} Hospital</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Nome do Hospital</Label>
                                <Input value={newHospital.name} onChange={e => setNewHospital({ ...newHospital, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>CNES</Label>
                                <Input value={newHospital.cnes} onChange={e => setNewHospital({ ...newHospital, cnes: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>CEP</Label>
                                <Input value={newHospital.cep} onChange={e => setNewHospital({ ...newHospital, cep: e.target.value })} placeholder="00000-000" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSave}>Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};

const WardList = ({ hospitalId }: { hospitalId: string }) => {
    const { wards, createWard, updateWard, deleteWard } = useWards(hospitalId);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingWard, setEditingWard] = useState<Ward | null>(null);
    const [newWard, setNewWard] = useState<{ name: string, type: any }>({ name: "", type: "uti-adulto" });

    const handleSave = async () => {
        if (!newWard.name) return;
        try {
            if (editingWard?.id) {
                await updateWard(editingWard.id, {
                    name: newWard.name,
                    type: newWard.type
                });
            } else {
                await createWard({
                    hospitalId,
                    name: newWard.name,
                    type: newWard.type,
                    isActive: true
                });
            }
            setIsDialogOpen(false);
            setNewWard({ name: "", type: "uti-adulto" });
            setEditingWard(null);
            toast.success("Ala salva!");
        } catch (e) { toast.error("Erro ao salvar ala"); }
    };

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {wards.map(ward => (
                    <div key={ward.id} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm group">
                        <span>{ward.name} <span className="text-xs text-muted-foreground">({ward.type})</span></span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                setEditingWard(ward);
                                setNewWard({ name: ward.name, type: ward.type });
                                setIsDialogOpen(true);
                            }}>
                                <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => ward.id && deleteWard(ward.id)}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-2 border-dashed" onClick={() => { setEditingWard(null); setIsDialogOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar Ala
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingWard ? 'Editar' : 'Nova'} Ala</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome da Ala</Label>
                            <Input value={newWard.name} onChange={e => setNewWard({ ...newWard, name: e.target.value })} placeholder="Ex: UTI 01" />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={newWard.type} onValueChange={(v: any) => setNewWard({ ...newWard, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="uti-adulto">UTI Adulto</SelectItem>
                                    <SelectItem value="uti-pediatrica">UTI Pediátrica</SelectItem>
                                    <SelectItem value="enfermaria">Enfermaria</SelectItem>
                                    <SelectItem value="ambulatorio">Ambulatório</SelectItem>
                                    <SelectItem value="other">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleSave}>Salvar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
