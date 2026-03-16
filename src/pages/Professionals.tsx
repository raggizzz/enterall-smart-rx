import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Plus, Search, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { useHospitals, useProfessionals } from "@/hooks/useDatabase";
import { Professional } from "@/lib/database";
import { ROLE_OPTIONS, can, getRoleLabel, normalizeRole } from "@/lib/permissions";
import { useCurrentRole } from "@/hooks/useCurrentRole";

const isManagerRole = (role?: string) => {
    const normalized = normalizeRole(role);
    return normalized === "general_manager" || normalized === "local_manager";
};

const isEightDigitPin = (value: string) => /^\d{8}$/.test(value);

const ROLE_HELPERS: Record<string, string> = {
    general_manager: "Gestor geral: acesso completo, inclusive unidades, gestores e perfis.",
    local_manager: "Gestor local: acesso completo da unidade, sem gestao global de outras unidades.",
    nutritionist: "Nutricionista: pacientes, prescricoes, relatorios, etiquetas, faturamento e ferramentas.",
    technician: "Tecnico: inicio, faturamento, etiquetas, mapa copa e cancelamento tecnico.",
};

const Professionals = () => {
    const [hospitalId, setHospitalId] = useState("");
    const { professionals, isLoading, createProfessional, updateProfessional, deleteProfessional } = useProfessionals(hospitalId || undefined);
    const { hospitals } = useHospitals();
    const role = useCurrentRole();
    const canManageManagers = can(role, "manage_managers");
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
    const [currentProfessional, setCurrentProfessional] = useState<Partial<Professional>>({});
    const [passwordPin, setPasswordPin] = useState("");
    const [confirmPasswordPin, setConfirmPasswordPin] = useState("");

    useEffect(() => {
        const syncHospital = () => {
            if (typeof window === "undefined") return;
            setHospitalId(localStorage.getItem("userHospitalId") || "");
        };
        syncHospital();
        window.addEventListener("enmeta-session-updated", syncHospital);
        return () => window.removeEventListener("enmeta-session-updated", syncHospital);
    }, []);

    const selectedHospitalName = useMemo(
        () => hospitals.find((hospital) => hospital.id === hospitalId)?.name || "",
        [hospitalId, hospitals],
    );

    const roleOptions = ROLE_OPTIONS.filter((option) => {
        if ((option.value === "general_manager" || option.value === "local_manager") && !canManageManagers) {
            return false;
        }
        return true;
    });

    const resetForm = () => {
        setCurrentProfessional({});
        setEditingProfessional(null);
        setPasswordPin("");
        setConfirmPasswordPin("");
    };

    const handleSave = async () => {
        if (!hospitalId) {
            toast.error("Selecione uma unidade antes de cadastrar profissionais");
            return;
        }
        if (!currentProfessional.name || !currentProfessional.role || !currentProfessional.registrationNumber) {
            toast.error("Preencha os campos obrigatorios");
            return;
        }

        const normalizedRole = normalizeRole(currentProfessional.role);
        if (!canManageManagers && isManagerRole(normalizedRole)) {
            toast.error("Sem permissao para cadastrar gestores");
            return;
        }

        if (!editingProfessional && !isEightDigitPin(passwordPin)) {
            toast.error("Cadastre uma senha numerica com 8 digitos.");
            return;
        }

        if (passwordPin && !isEightDigitPin(passwordPin)) {
            toast.error("A senha deve ter exatamente 8 digitos numericos.");
            return;
        }

        if (passwordPin !== confirmPasswordPin) {
            toast.error("A confirmacao da senha nao confere.");
            return;
        }

        try {
            const professionalData = {
                hospitalId,
                name: currentProfessional.name!,
                role: normalizedRole,
                registrationNumber: currentProfessional.registrationNumber!,
                cpf: currentProfessional.cpf,
                crn: currentProfessional.crn,
                cpe: isManagerRole(normalizedRole) ? currentProfessional.cpe : undefined,
                managingUnit: isManagerRole(normalizedRole) ? (selectedHospitalName || currentProfessional.managingUnit) : undefined,
                passwordPin: passwordPin || undefined,
                isActive: currentProfessional.isActive !== false,
            };

            if (editingProfessional?.id) {
                await updateProfessional(editingProfessional.id, professionalData);
                toast.success("Profissional atualizado com sucesso!");
            } else {
                await createProfessional(professionalData as Omit<Professional, "id" | "createdAt" | "updatedAt">);
                toast.success("Profissional cadastrado com sucesso!");
            }

            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            console.error("Error saving professional:", error);
            toast.error("Erro ao salvar profissional");
        }
    };

    const handleEdit = (professional: Professional) => {
        setEditingProfessional(professional);
        setCurrentProfessional({ ...professional, role: normalizeRole(professional.role) });
        setPasswordPin("");
        setConfirmPasswordPin("");
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este profissional?")) return;

        try {
            await deleteProfessional(id);
            toast.success("Profissional excluido com sucesso!");
        } catch (error) {
            console.error("Error deleting professional:", error);
            toast.error("Erro ao excluir profissional");
        }
    };

    const filteredProfessionals = professionals.filter((professional) =>
        professional.name.toLowerCase().includes(searchTerm.toLowerCase())
        || professional.registrationNumber.includes(searchTerm),
    );

    const currentRole = normalizeRole(currentProfessional.role);

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />
            <div className="container py-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Profissionais</h1>
                        <p className="text-muted-foreground">Gerencie a equipe da unidade selecionada</p>
                    </div>
                    <Dialog
                        open={isDialogOpen}
                        onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) resetForm();
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button onClick={() => resetForm()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Profissional
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingProfessional ? "Editar" : "Novo"} Profissional</DialogTitle>
                                <DialogDescription>
                                    Cadastro conforme o modelo operacional: nome completo, funcao, matricula, CPF, CRN e senha de 8 digitos.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Nome Completo *</Label>
                                    <Input
                                        value={currentProfessional.name || ""}
                                        onChange={(e) => setCurrentProfessional({ ...currentProfessional, name: e.target.value })}
                                        placeholder="Nome completo"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Funcao *</Label>
                                        <Select
                                            value={currentProfessional.role}
                                            onValueChange={(value: "general_manager" | "local_manager" | "nutritionist" | "technician") =>
                                                setCurrentProfessional({ ...currentProfessional, role: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {roleOptions.map((roleOption) => (
                                                    <SelectItem key={roleOption.value} value={roleOption.value}>
                                                        {roleOption.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {currentRole && (
                                            <p className="text-xs text-muted-foreground">
                                                {ROLE_HELPERS[currentRole]}
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Matricula *</Label>
                                        <Input
                                            value={currentProfessional.registrationNumber || ""}
                                            onChange={(e) => setCurrentProfessional({ ...currentProfessional, registrationNumber: e.target.value })}
                                            placeholder="Numero de matricula"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>CPF</Label>
                                        <Input
                                            value={currentProfessional.cpf || ""}
                                            onChange={(e) => setCurrentProfessional({ ...currentProfessional, cpf: e.target.value })}
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>CRN</Label>
                                        <Input
                                            value={currentProfessional.crn || ""}
                                            onChange={(e) => setCurrentProfessional({ ...currentProfessional, crn: e.target.value })}
                                            placeholder="CRN-0000"
                                        />
                                    </div>
                                </div>

                                {isManagerRole(currentRole) && (
                                    <>
                                        <div className="grid gap-2">
                                            <Label>Codigo do Gestor (CPE)</Label>
                                            <Input
                                                value={currentProfessional.cpe || ""}
                                                onChange={(e) => setCurrentProfessional({ ...currentProfessional, cpe: e.target.value })}
                                                placeholder="Codigo CPE"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Unidade Gestora</Label>
                                            <Select
                                                value={currentProfessional.managingUnit || selectedHospitalName}
                                                onValueChange={(value) => setCurrentProfessional({ ...currentProfessional, managingUnit: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione a unidade" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {hospitals.map((hospital) => (
                                                        <SelectItem key={hospital.id} value={hospital.name}>
                                                            {hospital.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>{editingProfessional ? "Nova senha (8 digitos)" : "Senha (8 digitos) *"}</Label>
                                        <Input
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={8}
                                            value={passwordPin}
                                            onChange={(e) => setPasswordPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                                            placeholder="12345678"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Confirmar senha</Label>
                                        <Input
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={8}
                                            value={confirmPasswordPin}
                                            onChange={(e) => setConfirmPasswordPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                                            placeholder="12345678"
                                        />
                                    </div>
                                </div>
                                {editingProfessional?.passwordConfigured && (
                                    <p className="text-xs text-muted-foreground">
                                        Este profissional ja possui senha cadastrada. Preencha os campos acima apenas se quiser redefinir a senha.
                                    </p>
                                )}

                                <Button onClick={handleSave} className="w-full mt-4">
                                    {editingProfessional ? "Salvar Alteracoes" : "Cadastrar Profissional"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou matricula..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Funcao</TableHead>
                                    <TableHead>Matricula</TableHead>
                                    <TableHead>CRN</TableHead>
                                    <TableHead>Unidade</TableHead>
                                    <TableHead>Senha</TableHead>
                                    <TableHead className="text-right">Acoes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell>
                                    </TableRow>
                                ) : filteredProfessionals.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            Nenhum profissional encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProfessionals.map((professional) => {
                                        const normalizedRole = normalizeRole(professional.role);
                                        const managerRole = isManagerRole(normalizedRole);
                                        const canEditManager = !managerRole || canManageManagers;
                                        const badgeClass = normalizedRole === "general_manager"
                                            ? "bg-purple-100 text-purple-800"
                                            : normalizedRole === "local_manager"
                                                ? "bg-indigo-100 text-indigo-800"
                                                : normalizedRole === "nutritionist"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-blue-100 text-blue-800";
                                        return (
                                            <TableRow key={professional.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <UserCog className="h-4 w-4 text-muted-foreground" />
                                                        {professional.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${badgeClass}`}>
                                                        {getRoleLabel(professional.role)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{professional.registrationNumber}</TableCell>
                                                <TableCell>{professional.crn || "-"}</TableCell>
                                                <TableCell>{professional.managingUnit || selectedHospitalName || "-"}</TableCell>
                                                <TableCell>{professional.passwordConfigured ? "Configurada" : "Pendente"}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" disabled={!canEditManager} onClick={() => handleEdit(professional)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive"
                                                            disabled={!canEditManager}
                                                            onClick={() => professional.id && handleDelete(professional.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <BottomNav />
        </div>
    );
};

export default Professionals;
