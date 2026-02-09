import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
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
import { Plus, Search, UserCog, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { useProfessionals } from "@/hooks/useDatabase";
import { Professional } from "@/lib/database";
import { ROLE_OPTIONS, getRoleLabel, normalizeRole, can } from "@/lib/permissions";
import { useCurrentRole } from "@/hooks/useCurrentRole";

const Professionals = () => {
    const [hospitalId, setHospitalId] = useState("");
    const { professionals, isLoading, createProfessional, updateProfessional, deleteProfessional } = useProfessionals(hospitalId || undefined);
    const role = useCurrentRole();
    const canManageManagers = can(role, "manage_managers");
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
    const [currentProfessional, setCurrentProfessional] = useState<Partial<Professional>>({});

    useEffect(() => {
        const syncHospital = () => {
            if (typeof window === "undefined") return;
            setHospitalId(localStorage.getItem("userHospitalId") || "");
        };
        syncHospital();
        window.addEventListener("enmeta-session-updated", syncHospital);
        return () => window.removeEventListener("enmeta-session-updated", syncHospital);
    }, []);

    const roleOptions = ROLE_OPTIONS.filter((option) => {
        if ((option.value === "general_manager" || option.value === "local_manager") && !canManageManagers) {
            return false;
        }
        return true;
    });

    const resetForm = () => {
        setCurrentProfessional({});
        setEditingProfessional(null);
    };

    const handleSave = async () => {
        if (!hospitalId) {
            toast.error("Selecione uma unidade antes de cadastrar profissionais");
            return;
        }
        if (!currentProfessional.name || !currentProfessional.role || !currentProfessional.registrationNumber) {
            toast.error("Preencha os campos obrigatórios");
            return;
        }

        const normalizedRole = normalizeRole(currentProfessional.role);
        if (!canManageManagers && (normalizedRole === "general_manager" || normalizedRole === "local_manager")) {
            toast.error("Sem permissão para cadastrar gestores");
            return;
        }

        try {
            const professionalData = {
                name: currentProfessional.name!,
                role: normalizedRole,
                registrationNumber: currentProfessional.registrationNumber!,
                cpf: currentProfessional.cpf,
                crn: currentProfessional.crn,
                cpe: currentProfessional.cpe,
                managingUnit: currentProfessional.managingUnit,
                isActive: true,
            };

            if (editingProfessional?.id) {
                await updateProfessional(editingProfessional.id, professionalData);
                toast.success("Profissional atualizado com sucesso!");
            } else {
                await createProfessional(professionalData);
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
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este profissional?")) return;

        try {
            await deleteProfessional(id);
            toast.success("Profissional excluído com sucesso!");
        } catch (error) {
            console.error('Error deleting professional:', error);
            toast.error("Erro ao excluir profissional");
        }
    };

    const filteredProfessionals = professionals.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.registrationNumber.includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />
            <div className="container py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Profissionais</h1>
                        <p className="text-muted-foreground">Gerencie a equipe da unidade selecionada</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={() => resetForm()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Profissional
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingProfessional ? 'Editar' : 'Novo'} Profissional</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Nome Completo *</Label>
                                    <Input
                                        value={currentProfessional.name || ''}
                                        onChange={e => setCurrentProfessional({ ...currentProfessional, name: e.target.value })}
                                        placeholder="Nome completo"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Função *</Label>
                                        <Select
                                            value={currentProfessional.role}
                                            onValueChange={(val: 'general_manager' | 'local_manager' | 'nutritionist' | 'technician') =>
                                                setCurrentProfessional({ ...currentProfessional, role: val })
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
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Matrícula *</Label>
                                        <Input
                                            value={currentProfessional.registrationNumber || ''}
                                            onChange={e => setCurrentProfessional({ ...currentProfessional, registrationNumber: e.target.value })}
                                            placeholder="Número de matrícula"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>CPF</Label>
                                        <Input
                                            value={currentProfessional.cpf || ''}
                                            onChange={e => setCurrentProfessional({ ...currentProfessional, cpf: e.target.value })}
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>CRN (se aplicável)</Label>
                                        <Input
                                            value={currentProfessional.crn || ''}
                                            onChange={e => setCurrentProfessional({ ...currentProfessional, crn: e.target.value })}
                                            placeholder="CRN-0000"
                                        />
                                    </div>
                                </div>
                                {['general_manager', 'local_manager'].includes(normalizeRole(currentProfessional.role)) && (
                                    <div className="grid gap-2">
                                        <Label>CPE (Código do Gestor)</Label>
                                        <Input
                                            value={currentProfessional.cpe || ''}
                                            onChange={e => setCurrentProfessional({ ...currentProfessional, cpe: e.target.value })}
                                            placeholder="Código CPE"
                                        />
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <Label>Unidade de Trabalho</Label>
                                    <Input
                                        value={currentProfessional.managingUnit || ''}
                                        onChange={e => setCurrentProfessional({ ...currentProfessional, managingUnit: e.target.value })}
                                        placeholder="Ex: UTI Adulto"
                                    />
                                </div>
                                <Button onClick={handleSave} className="w-full mt-4">
                                    {editingProfessional ? 'Salvar Alterações' : 'Cadastrar Profissional'}
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
                                placeholder="Buscar por nome ou matrícula..."
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
                                    <TableHead>Função</TableHead>
                                    <TableHead>Matrícula</TableHead>
                                    <TableHead>CRN</TableHead>
                                    <TableHead>Unidade</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell>
                                    </TableRow>
                                ) : filteredProfessionals.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            Nenhum profissional encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProfessionals.map((professional) => {
                                        const normalizedRole = normalizeRole(professional.role);
                                        const isManagerRole = normalizedRole === 'general_manager' || normalizedRole === 'local_manager';
                                        const canEditManager = !isManagerRole || canManageManagers;
                                        const badgeClass = normalizedRole === 'general_manager'
                                            ? 'bg-purple-100 text-purple-800'
                                            : normalizedRole === 'local_manager'
                                                ? 'bg-indigo-100 text-indigo-800'
                                                : normalizedRole === 'nutritionist'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-blue-100 text-blue-800';
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
                                                <TableCell>{professional.crn || '-'}</TableCell>
                                                <TableCell>{professional.managingUnit || '-'}</TableCell>
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
